import { ToolDefinition, ToolRiskLevel } from '../types/domain';

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  constructor() {
    this.registerDefaultTools();
  }

  registerTool(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  listTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  private registerDefaultTools() {
    this.registerTool({
      id: 'tool-inv-01',
      name: 'get_inventory',
      version: '1.0.0',
      description: 'Retrieve inventory level for a specified product SKU',
      input_schema: {
        type: 'object',
        properties: { sku: { type: 'string', description: 'Product Stock Keeping Unit identifier' } },
        required: ['sku'],
      },
      output_schema: {
        type: 'object',
        properties: {
          sku: { type: 'string' },
          quantity: { type: 'integer' },
          warehouse: { type: 'string' },
          safety_stock_threshold: { type: 'integer' },
        },
      },
      risk_level: ToolRiskLevel.LOW,
      requires_approval: false,
      timeout_seconds: 20,
    });

    this.registerTool({
      id: 'tool-po-01',
      name: 'create_purchase_order',
      version: '1.0.0',
      description: 'Create a purchase order for restocking inventory',
      input_schema: {
        type: 'object',
        properties: {
          sku: { type: 'string' },
          quantity: { type: 'integer' },
          amount: { type: 'number' },
          supplier: { type: 'string' },
        },
        required: ['sku', 'quantity', 'amount'],
      },
      output_schema: {
        type: 'object',
        properties: {
          po_id: { type: 'string' },
          sku: { type: 'string' },
          quantity: { type: 'integer' },
          amount: { type: 'number' },
          status: { type: 'string' },
        },
      },
      risk_level: ToolRiskLevel.HIGH,
      requires_approval: true,
      timeout_seconds: 30,
    });

    this.registerTool({
      id: 'tool-slack-01',
      name: 'send_slack_alert',
      version: '1.0.0',
      description: 'Dispatch an operational incident notification to an internal channel',
      input_schema: {
        type: 'object',
        properties: {
          channel: { type: 'string' },
          message: { type: 'string' },
          severity: { type: 'string', enum: ['info', 'warning', 'critical'] },
        },
        required: ['channel', 'message'],
      },
      output_schema: {
        type: 'object',
        properties: {
          message_ts: { type: 'string' },
          delivered: { type: 'boolean' },
        },
      },
      risk_level: ToolRiskLevel.LOW,
      requires_approval: false,
      timeout_seconds: 10,
    });

    this.registerTool({
      id: 'tool-db-01',
      name: 'query_database_record',
      version: '1.0.0',
      description: 'Read-only structured SQL inspection against primary ERP schema',
      input_schema: {
        type: 'object',
        properties: {
          table: { type: 'string' },
          query_filter: { type: 'object' },
        },
        required: ['table'],
      },
      output_schema: {
        type: 'object',
        properties: {
          rows_found: { type: 'integer' },
          data: { type: 'array' },
        },
      },
      risk_level: ToolRiskLevel.MEDIUM,
      requires_approval: false,
      timeout_seconds: 15,
    });

    this.registerTool({
      id: 'tool-cancel-01',
      name: 'cancel_open_order',
      version: '1.0.0',
      description: 'Critical irreversible cancellation of vendor purchase contracts',
      input_schema: {
        type: 'object',
        properties: {
          po_id: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['po_id', 'reason'],
      },
      output_schema: {
        type: 'object',
        properties: {
          cancelled: { type: 'boolean' },
          timestamp: { type: 'string' },
        },
      },
      risk_level: ToolRiskLevel.CRITICAL,
      requires_approval: true,
      timeout_seconds: 45,
    });
  }
}

export const toolRegistry = new ToolRegistry();

export class ToolExecutor {
  static async executeTool(toolName: string, inputArgs: Record<string, any>): Promise<Record<string, any>> {
    const tool = toolRegistry.getTool(toolName);
    if (!tool) {
      throw new Error(`Tool '${toolName}' not found in registry.`);
    }

    // Small realistic execution latency simulation (150ms - 400ms)
    await new Promise((resolve) => setTimeout(resolve, 250));

    if (toolName === 'get_inventory') {
      const sku = inputArgs.sku || 'UNKNOWN-SKU';
      return {
        sku,
        quantity: 12,
        warehouse: 'WH-NORTH-04',
        safety_stock_threshold: 50,
        status: 'DEFICIT_TRIGGERED',
      };
    }

    if (toolName === 'create_purchase_order') {
      const sku = inputArgs.sku || 'SKU-4812';
      const quantity = Number(inputArgs.quantity) || 500;
      const amount = Number(inputArgs.amount) || 4500.0;
      return {
        po_id: `PO-${sku}-${Math.floor(1000 + Math.random() * 9000)}`,
        sku,
        quantity,
        amount,
        status: 'APPROVED_AND_ISSUED',
        carrier_assignment: 'FREIGHT-EXPEDITED',
        issued_at: new Date().toISOString(),
      };
    }

    if (toolName === 'send_slack_alert') {
      return {
        channel: inputArgs.channel || '#ops-triage',
        message_ts: `${Date.now()}.000100`,
        delivered: true,
      };
    }

    if (toolName === 'query_database_record') {
      return {
        table: inputArgs.table || 'vendor_catalogs',
        rows_found: 3,
        data: [
          { vendor_id: 'V-99', reliability_score: 0.98, lead_time_days: 2 },
          { vendor_id: 'V-104', reliability_score: 0.92, lead_time_days: 4 },
        ],
      };
    }

    if (toolName === 'cancel_open_order') {
      return {
        po_id: inputArgs.po_id || 'PO-UNKNOWN',
        cancelled: true,
        timestamp: new Date().toISOString(),
        audit_tag: 'EXEC_OVERRIDE',
      };
    }

    return {
      status: 'success',
      result: `Executed ${toolName} successfully`,
      echo_input: inputArgs,
    };
  }
}
