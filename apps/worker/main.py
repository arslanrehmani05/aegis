import asyncio
import signal
import sys
from uuid import UUID
from datetime import datetime
from sqlalchemy.future import select

from packages.storage.config import settings
from packages.storage.database import AsyncSessionLocal
from packages.storage.db_models import RunModel, AgentVersionModel, ApprovalModel
from packages.storage.redis_client import pop_run_job
from packages.orchestration import LeaseManager, CheckpointEngine, IdempotencyManager, RunStateMachine
from packages.domain.enums import RunStatus, ToolRiskLevel, ApprovalStatus
from packages.policies import AuthorizationEngine, RetryPolicy
from packages.tools import registry, ToolExecutor
from packages.observability import setup_logging, get_logger, metrics

setup_logging(settings.LOG_LEVEL)
logger = get_logger("aegis.worker")

class AgentWorker:
    def __init__(self, worker_id: str = "worker-1"):
        self.worker_id = worker_id
        self.lease_manager = LeaseManager(worker_id=worker_id, default_ttl_seconds=settings.DEFAULT_LEASE_TTL_SECONDS)
        self.running = True

    def stop(self):
        logger.info("Stopping worker loop...", worker_id=self.worker_id)
        self.running = False

    async def run_loop(self):
        logger.info("Aegis Worker starting consumption loop...", worker_id=self.worker_id)
        while self.running:
            try:
                job = await pop_run_job(timeout=3)
                if job:
                    run_id_str = job.get("run_id")
                    if run_id_str:
                        await self.process_run(UUID(run_id_str))
                else:
                    await asyncio.sleep(0.5)
            except Exception as e:
                logger.error("Error in worker main loop", error=str(e))
                await asyncio.sleep(1.0)

    async def process_run(self, run_id: UUID):
        logger.info("Worker claiming run job", run_id=str(run_id), worker_id=self.worker_id)
        
        # 1. Acquire worker lease in Redis
        acquired = await self.lease_manager.acquire_lease(str(run_id))
        if not acquired:
            logger.warning("Could not acquire lease for run (already claimed)", run_id=str(run_id))
            return

        metrics.WORKER_LEASE_COUNT.inc()

        try:
            async with AsyncSessionLocal() as session:
                stmt = select(RunModel).where(RunModel.id == run_id)
                res = await session.execute(stmt)
                run = res.scalar_one_or_none()
                if not run:
                    logger.error("Run record not found in database", run_id=str(run_id))
                    return

                # Update status to RUNNING
                sm = RunStateMachine(RunStatus(run.status))
                run.status = sm.transition_to(RunStatus.RUNNING).value
                run.started_at = datetime.utcnow()
                await session.commit()
                metrics.RUNS_STARTED.labels(tenant_id=str(run.tenant_id)).inc()

                # Load Agent Version
                ver_stmt = select(AgentVersionModel).where(AgentVersionModel.id == run.agent_version_id)
                ver_res = await session.execute(ver_stmt)
                version = ver_res.scalar_one_or_none()

                if not version:
                    run.status = RunStatus.FAILED.value
                    run.failure_reason = "Agent version configuration missing."
                    await session.commit()
                    return

                # Check for existing checkpoint
                latest_chk = await CheckpointEngine.get_latest_checkpoint(session, run_id)
                start_step = (latest_chk.step_number + 1) if latest_chk else 1

                logger.info("Executing run steps...", run_id=str(run_id), start_step=start_step)

                # Simulated Step Execution Loop
                # Step 1: Inventory Check
                if start_step <= 1:
                    await self.lease_manager.heartbeat_lease(str(run_id))
                    tool_name = "get_inventory"
                    idempotency_key = IdempotencyManager.generate_key(run_id, "step_1", {"tool": tool_name})
                    
                    cached_exec = await IdempotencyManager.get_execution(session, idempotency_key)
                    if not cached_exec:
                        await IdempotencyManager.record_start(session, run_id, tool_name, idempotency_key, {"sku": "SKU-4812"})
                        tool_res = await ToolExecutor.execute_tool(tool_name, {"sku": "SKU-4812"})
                        await IdempotencyManager.record_completion(session, idempotency_key, tool_res)
                    else:
                        tool_res = cached_exec.output

                    await CheckpointEngine.create_checkpoint(session, run_id, 1, {"inventory": tool_res})
                    logger.info("Step 1 complete & checkpointed", run_id=str(run_id))

                # Step 2: High-Risk Purchase Order with Approval Check
                if start_step <= 2:
                    await self.lease_manager.heartbeat_lease(str(run_id))
                    tool_name = "create_purchase_order"
                    tool_def = registry.get_tool(tool_name)
                    
                    auth_res = AuthorizationEngine.evaluate_tool_permission(
                        tool_name=tool_name,
                        tool_risk_level=tool_def.risk_level if tool_def else ToolRiskLevel.HIGH,
                        agent_tool_bindings=version.tool_bindings or [tool_name],
                        policies=version.policies or {},
                    )

                    if auth_res.get("requires_approval"):
                        # Check if approval has already been granted
                        app_stmt = select(ApprovalModel).where(ApprovalModel.run_id == run_id).order_by(ApprovalModel.created_at.desc())
                        app_res = await session.execute(app_stmt)
                        existing_app = app_res.scalars().first()

                        if not existing_app:
                            # Transition run to WAITING_FOR_APPROVAL
                            run.status = RunStatus.WAITING_FOR_APPROVAL.value
                            app_model = ApprovalModel(
                                run_id=run_id,
                                status=ApprovalStatus.PENDING.value,
                                requested_action={"tool": tool_name, "args": {"sku": "SKU-4812", "quantity": 500, "amount": 4500.0}},
                            )
                            session.add(app_model)
                            await session.commit()
                            metrics.PENDING_APPROVALS.inc()
                            logger.info("Run paused waiting for human approval", run_id=str(run_id))
                            return
                        elif existing_app.status != ApprovalStatus.APPROVED.value:
                            logger.info("Approval still pending or rejected", run_id=str(run_id), status=existing_app.status)
                            return

                    # Execute purchase order upon approval
                    idempotency_key = IdempotencyManager.generate_key(run_id, "step_2", {"tool": tool_name})
                    cached_exec = await IdempotencyManager.get_execution(session, idempotency_key)
                    if not cached_exec:
                        await IdempotencyManager.record_start(session, run_id, tool_name, idempotency_key, {"sku": "SKU-4812", "quantity": 500, "amount": 4500.0})
                        po_res = await ToolExecutor.execute_tool(tool_name, {"sku": "SKU-4812", "quantity": 500, "amount": 4500.0})
                        await IdempotencyManager.record_completion(session, idempotency_key, po_res)
                    else:
                        po_res = cached_exec.output

                    await CheckpointEngine.create_checkpoint(session, run_id, 2, {"purchase_order": po_res})
                    logger.info("Step 2 complete & checkpointed", run_id=str(run_id))

                # Complete Run
                run.status = RunStatus.COMPLETED.value
                run.completed_at = datetime.utcnow()
                run.output = {"summary": "Out-of-stock investigation completed and purchase order issued."}
                await session.commit()

                metrics.RUNS_COMPLETED.labels(tenant_id=str(run.tenant_id)).inc()
                logger.info("Run completed successfully!", run_id=str(run_id))

        except Exception as err:
            logger.error("Error executing run", run_id=str(run_id), error=str(err))
            async with AsyncSessionLocal() as session:
                stmt = select(RunModel).where(RunModel.id == run_id)
                res = await session.execute(stmt)
                run = res.scalar_one_or_none()
                if run:
                    run.status = RunStatus.FAILED.value
                    run.failure_reason = str(err)
                    await session.commit()
            metrics.RUNS_FAILED.labels(tenant_id="default", reason=str(type(err).__name__)).inc()
        finally:
            await self.lease_manager.release_lease(str(run_id))
            metrics.WORKER_LEASE_COUNT.dec()

async def main():
    worker = AgentWorker(worker_id=settings.ENVIRONMENT + "-worker-1")
    
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, worker.stop)

    await worker.run_loop()

if __name__ == "__main__":
    asyncio.run(main())
