import { NextRequest, NextResponse } from 'next/server';
import { mcpRegistry } from '@/lib/mcp-registry';

export async function GET() {
  try {
    const plugins = mcpRegistry.getAllPlugins();
    const tools = mcpRegistry.getAvailableTools();

    return NextResponse.json({
      plugins,
      tools,
      totalPlugins: plugins.length,
      activePlugins: plugins.filter(p => p.enabled).length,
      totalTools: tools.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to list MCP tools' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tool, arguments: args, action, pluginId, enabled } = body;

    // Handle plugin toggle
    if (action === 'toggle_plugin' && pluginId !== undefined && enabled !== undefined) {
      const success = mcpRegistry.togglePlugin(pluginId, Boolean(enabled));
      return NextResponse.json({ success, pluginId, enabled });
    }

    // Handle tool execution
    if (!tool) {
      return NextResponse.json(
        { error: "Missing required parameter 'tool'." },
        { status: 400 }
      );
    }

    const result = await mcpRegistry.executeTool(tool, args || {});
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error executing MCP tool' },
      { status: 500 }
    );
  }
}
