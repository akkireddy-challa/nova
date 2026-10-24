import { NextRequest, NextResponse } from "next/server";
import { mcpRegistry } from "@/lib/mcp-registry";
import { McpToolDefinition } from "@/lib/types";

export async function GET() {
  try {
    const plugins = mcpRegistry.getAllPlugins();
    const tools = mcpRegistry.getAvailableTools();

    return NextResponse.json({
      plugins,
      tools,
      totalPlugins: plugins.length,
      activePlugins: plugins.filter((p) => p.enabled).length,
      totalTools: tools.length,
    });
  } catch (error) {
    console.error("API v1 Tools list error:", error);
    return NextResponse.json(
      { error: "Failed to list MCP tools" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tool, arguments: args, action, pluginId, enabled } = body;

    // Handle plugin toggle
    if (
      action === "toggle_plugin" &&
      pluginId !== undefined &&
      enabled !== undefined
    ) {
      const success = mcpRegistry.togglePlugin(pluginId, Boolean(enabled));
      return NextResponse.json({ success, pluginId, enabled });
    }

    // Handle plugin registration
    if (action === "register_plugin") {
      const pluginPayload =
        body.plugin && typeof body.plugin === "object" ? body.plugin : body;
      const name =
        typeof pluginPayload?.name === "string"
          ? pluginPayload.name.trim()
          : "";
      const endpoint =
        typeof pluginPayload?.endpoint === "string"
          ? pluginPayload.endpoint.trim()
          : "";
      const tools = pluginPayload?.tools;

      if (!name) {
        return NextResponse.json(
          {
            success: false,
            error: "Missing or invalid required field 'name'.",
          },
          { status: 400 },
        );
      }

      if (!endpoint) {
        return NextResponse.json(
          {
            success: false,
            error: "Missing or invalid required field 'endpoint'.",
          },
          { status: 400 },
        );
      }

      if (!Array.isArray(tools) || tools.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Missing or empty required field 'tools'. At least one tool is required.",
          },
          { status: 400 },
        );
      }

      for (const t of tools) {
        if (
          !t ||
          typeof t !== "object" ||
          typeof t.name !== "string" ||
          !t.name.trim() ||
          typeof t.description !== "string" ||
          !t.description.trim()
        ) {
          return NextResponse.json(
            {
              success: false,
              error:
                "Each tool in 'tools' must have a non-empty 'name' and 'description'.",
            },
            { status: 400 },
          );
        }
      }

      const id =
        typeof pluginPayload.id === "string" && pluginPayload.id.trim()
          ? pluginPayload.id.trim()
          : name
              .toLowerCase()
              .replace(/\s+/g, "-")
              .replace(/[^a-z0-9_-]/g, "") || `custom-${Date.now()}`;

      const pluginToRegister = {
        id,
        name,
        description:
          typeof pluginPayload.description === "string" &&
          pluginPayload.description.trim()
            ? pluginPayload.description.trim()
            : `Custom MCP plugin: ${name}`,
        category: "custom" as const,
        version:
          typeof pluginPayload.version === "string"
            ? pluginPayload.version
            : "1.0.0",
        author:
          typeof pluginPayload.author === "string"
            ? pluginPayload.author
            : "Custom User",
        icon:
          typeof pluginPayload.icon === "string"
            ? pluginPayload.icon
            : "Server",
        enabled:
          pluginPayload.enabled !== undefined
            ? Boolean(pluginPayload.enabled)
            : true,
        isCustom: true,
        endpoint,
        tools: tools.map(
          (t: {
            name: string;
            description: string;
            inputSchema?: McpToolDefinition["inputSchema"];
          }) => ({
            name: t.name.trim(),
            description: t.description.trim(),
            inputSchema: t.inputSchema || {
              type: "object",
              properties: {
                payload: { type: "string", description: "Arguments payload" },
              },
            },
          }),
        ),
      };

      const regResult =
        await mcpRegistry.registerCustomPlugin(pluginToRegister);
      if (!regResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: regResult.error || "SSRF validation failed",
          },
          { status: 400 },
        );
      }

      const registeredPlugin =
        mcpRegistry.getPlugin(pluginToRegister.id) || pluginToRegister;
      return NextResponse.json({ success: true, plugin: registeredPlugin });
    }

    // Handle tool execution
    if (!tool) {
      return NextResponse.json(
        { error: "Missing required parameter 'tool'." },
        { status: 400 },
      );
    }

    const result = await mcpRegistry.executeTool(tool, args || {});
    return NextResponse.json(result);
  } catch (error) {
    console.error("API v1 Tools execute error:", error);
    return NextResponse.json(
      { success: false, error: "Error executing MCP tool" },
      { status: 500 },
    );
  }
}
