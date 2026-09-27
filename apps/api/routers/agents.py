from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel

from packages.storage.database import get_db
from packages.storage.db_models import AgentModel, AgentVersionModel
from packages.domain.models import Agent, AgentVersion

router = APIRouter(prefix="/v1/agents", tags=["Agents"])

class CreateAgentRequest(BaseModel):
    project_id: UUID
    name: str
    description: Optional[str] = None

class CreateAgentVersionRequest(BaseModel):
    model_config_data: dict
    system_instructions: str
    tool_bindings: List[str] = []
    policies: dict = {}
    context_strategy: dict = {}

@router.post("", response_model=Agent, status_code=status.HTTP_201_CREATED)
async def create_agent(payload: CreateAgentRequest, db: AsyncSession = Depends(get_db)):
    agent = AgentModel(
        project_id=payload.project_id,
        name=payload.name,
        description=payload.description,
    )
    db.add(agent)
    await db.commit()
    await db.refresh(agent)
    return Agent.model_validate(agent)

@router.get("", response_model=List[Agent])
async def list_agents(db: AsyncSession = Depends(get_db)):
    stmt = select(AgentModel)
    result = await db.execute(stmt)
    agents = result.scalars().all()
    return [Agent.model_validate(a) for a in agents]

@router.get("/{agent_id}", response_model=Agent)
async def get_agent(agent_id: UUID, db: AsyncSession = Depends(get_db)):
    stmt = select(AgentModel).where(AgentModel.id == agent_id)
    result = await db.execute(stmt)
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return Agent.model_validate(agent)

@router.post("/{agent_id}/versions", response_model=AgentVersion, status_code=status.HTTP_201_CREATED)
async def create_agent_version(
    agent_id: UUID, payload: CreateAgentVersionRequest, db: AsyncSession = Depends(get_db)
):
    # Determine latest version number
    stmt = select(AgentVersionModel).where(AgentVersionModel.agent_id == agent_id).order_by(AgentVersionModel.version.desc())
    result = await db.execute(stmt)
    latest_ver = result.scalars().first()
    next_ver_num = (latest_ver.version + 1) if latest_ver else 1

    version_model = AgentVersionModel(
        agent_id=agent_id,
        version=next_ver_num,
        model_config_data=payload.model_config_data,
        system_instructions=payload.system_instructions,
        tool_bindings=payload.tool_bindings,
        policies=payload.policies,
        context_strategy=payload.context_strategy,
    )
    db.add(version_model)
    await db.commit()
    await db.refresh(version_model)

    # Update active version on agent
    stmt_agent = select(AgentModel).where(AgentModel.id == agent_id)
    agent_res = await db.execute(stmt_agent)
    agent_obj = agent_res.scalar_one_or_none()
    if agent_obj:
        agent_obj.active_version_id = version_model.id
        await db.commit()

    return AgentVersion.model_validate(version_model)
