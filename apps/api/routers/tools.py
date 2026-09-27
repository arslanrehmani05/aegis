from typing import List
from fastapi import APIRouter, HTTPException, status
from packages.tools.registry import registry
from packages.domain.models import ToolDefinition

router = APIRouter(prefix="/v1/tools", tags=["Tools"])

@router.get("", response_model=List[ToolDefinition])
async def list_tools():
    tools_dict = registry.list_tools()
    return list(tools_dict.values())

@router.post("", response_model=ToolDefinition, status_code=status.HTTP_201_CREATED)
async def register_tool(payload: ToolDefinition):
    registry.register_tool(payload)
    return payload
