import asyncio
from packages.storage.database import AsyncSessionLocal, engine, Base
from packages.storage.db_models import TenantModel, ProjectModel, AgentModel, AgentVersionModel
from packages.domain.enums import TenantStatus

async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # Create Tenant
        tenant = TenantModel(name="Acme Corp Enterprise", status=TenantStatus.ACTIVE.value)
        session.add(tenant)
        await session.flush()

        # Create Project
        project = ProjectModel(tenant_id=tenant.id, name="Supply Chain Automation", description="Autonomous inventory and order management")
        session.add(project)
        await session.flush()

        # Create Agent
        agent = AgentModel(project_id=project.id, name="SKU Investigator Agent", description="Investigates out-of-stock SKUs and reorders inventory")
        session.add(agent)
        await session.flush()

        # Create Agent Version
        version = AgentVersionModel(
            agent_id=agent.id,
            version=1,
            model_config_data={"provider": "google", "model": "gemini-1.5-pro", "temperature": 0.2},
            system_instructions="You are an autonomous supply chain agent. Inspect out-of-stock SKUs and request purchase orders when needed.",
            tool_bindings=["get_inventory", "create_purchase_order"],
            policies={"max_risk_level": "HIGH", "require_approval_over_amount": 1000.0},
            context_strategy={"token_budget": 4096},
        )
        session.add(version)
        await session.flush()

        agent.active_version_id = version.id
        await session.commit()

        print("Successfully seeded Aegis database!")
        print(f"Tenant ID: {tenant.id}")
        print(f"Project ID: {project.id}")
        print(f"Agent ID: {agent.id}")
        print(f"Version ID: {version.id}")

if __name__ == "__main__":
    asyncio.run(seed())
