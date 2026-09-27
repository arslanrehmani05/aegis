from typing import Dict, Any, Optional
from packages.domain.models import ToolDefinition
from packages.domain.enums import ToolRiskLevel

class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, ToolDefinition] = {}

    def register_tool(self, tool: ToolDefinition) -> None:
        self._tools[tool.name] = tool

    def get_tool(self, name: str) -> Optional[ToolDefinition]:
        return self._tools.get(name)

    def list_tools(self) -> Dict[str, ToolDefinition]:
        return self._tools.copy()

# Global default tool registry
registry = ToolRegistry()

# Register built-in low-risk demo tools
registry.register_tool(
    ToolDefinition(
        id="tool-inv-01",
        name="get_inventory",
        version="1.0.0",
        description="Retrieve inventory level for a specified product SKU",
        input_schema={
            "type": "object",
            "properties": {"sku": {"type": "string"}},
            "required": ["sku"],
        },
        output_schema={
            "type": "object",
            "properties": {"sku": {"type": "string"}, "quantity": {"type": "integer"}},
        },
        risk_level=ToolRiskLevel.LOW,
        requires_approval=False,
    )
)

registry.register_tool(
    ToolDefinition(
        id="tool-po-01",
        name="create_purchase_order",
        version="1.0.0",
        description="Create a purchase order for restocking inventory",
        input_schema={
            "type": "object",
            "properties": {"sku": {"type": "string"}, "quantity": {"type": "integer"}, "amount": {"type": "number"}},
            "required": ["sku", "quantity", "amount"],
        },
        output_schema={
            "type": "object",
            "properties": {"po_id": {"type": "string"}, "status": {"type": "string"}},
        },
        risk_level=ToolRiskLevel.HIGH,
        requires_approval=True,
    )
)
