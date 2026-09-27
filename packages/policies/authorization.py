from typing import Dict, Any, List
from packages.domain.enums import ToolRiskLevel

class PermissionDeniedError(Exception):
    pass

class AuthorizationEngine:
    @staticmethod
    def evaluate_tool_permission(
        tool_name: str,
        tool_risk_level: ToolRiskLevel,
        agent_tool_bindings: List[str],
        policies: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Evaluates whether a tool invocation is allowed, prohibited, or requires human approval.
        Returns a dict: {"allowed": bool, "requires_approval": bool, "reason": str}
        """
        if tool_name not in agent_tool_bindings:
            return {
                "allowed": False,
                "requires_approval": False,
                "reason": f"Tool '{tool_name}' is not bound to this agent version.",
            }

        # Check policy thresholds
        max_allowed_risk = policies.get("max_risk_level", ToolRiskLevel.HIGH.value)
        if tool_risk_level == ToolRiskLevel.CRITICAL and max_allowed_risk != ToolRiskLevel.CRITICAL.value:
            return {
                "allowed": False,
                "requires_approval": False,
                "reason": f"Tool '{tool_name}' exceeds maximum allowed risk level.",
            }

        # Approval required if high risk or explicitly flagged by policy
        requires_approval = (
            tool_risk_level in [ToolRiskLevel.HIGH, ToolRiskLevel.CRITICAL]
            or policies.get("require_all_approvals", False)
        )

        return {
            "allowed": True,
            "requires_approval": requires_approval,
            "reason": "Execution authorized." if not requires_approval else "Human approval required before execution.",
        }
