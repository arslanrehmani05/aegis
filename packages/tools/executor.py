from typing import Dict, Any
import asyncio
from packages.tools.registry import registry
from packages.domain.models import ToolDefinition

class ToolExecutionError(Exception):
    pass

class ToolExecutor:
    @staticmethod
    async def execute_tool(tool_name: str, input_args: Dict[str, Any]) -> Dict[str, Any]:
        tool: ToolDefinition = registry.get_tool(tool_name)
        if not tool:
            raise ToolExecutionError(f"Tool '{tool_name}' not found in registry.")

        # Simulate execution based on tool_name
        if tool_name == "get_inventory":
            sku = input_args.get("sku", "UNKNOWN")
            return {"sku": sku, "quantity": 150, "warehouse": "WH-NORTH"}
        
        elif tool_name == "create_purchase_order":
            sku = input_args.get("sku", "UNKNOWN")
            quantity = input_args.get("quantity", 0)
            amount = input_args.get("amount", 0.0)
            return {
                "po_id": f"PO-{sku}-9918",
                "sku": sku,
                "quantity": quantity,
                "amount": amount,
                "status": "APPROVED_AND_ISSUED",
            }
        
        else:
            # Fallback execution simulation
            return {"status": "success", "result": f"Executed {tool_name} with args {input_args}"}
