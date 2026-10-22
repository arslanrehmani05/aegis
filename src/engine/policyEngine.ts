import { ToolRiskLevel } from '../types/domain';

export interface PolicyEvaluationResult {
  allowed: boolean;
  requires_approval: boolean;
  reason: string;
}

export class AuthorizationEngine {
  static evaluateToolPermission(
    toolName: string,
    toolRiskLevel: ToolRiskLevel,
    agentToolBindings: string[],
    policies: Record<string, any>
  ): PolicyEvaluationResult {
    if (!agentToolBindings.includes(toolName)) {
      return {
        allowed: false,
        requires_approval: false,
        reason: `Tool '${toolName}' is not bound to this agent version.`,
      };
    }

    // Check policy thresholds
    const maxAllowedRisk = policies.max_risk_level || ToolRiskLevel.HIGH;
    if (toolRiskLevel === ToolRiskLevel.CRITICAL && maxAllowedRisk !== ToolRiskLevel.CRITICAL) {
      return {
        allowed: false,
        requires_approval: false,
        reason: `Tool '${toolName}' exceeds maximum allowed risk level (${maxAllowedRisk}).`,
      };
    }

    // Approval required if high risk or explicitly flagged by policy
    const requiresApproval =
      toolRiskLevel === ToolRiskLevel.HIGH ||
      toolRiskLevel === ToolRiskLevel.CRITICAL ||
      Boolean(policies.require_all_approvals);

    return {
      allowed: true,
      requires_approval: requiresApproval,
      reason: requiresApproval
        ? 'Human approval required before execution.'
        : 'Execution authorized.',
    };
  }
}
