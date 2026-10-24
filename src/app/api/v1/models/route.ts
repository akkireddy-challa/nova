import { connection } from "next/server";
import { listAvailableModels } from "@/lib/providers";

export async function GET() {
  // Provider configuration is runtime state (env vars, local Ollama); never prerender this.
  await connection();

  try {
    const models = await listAvailableModels();
    return Response.json(
      {
        object: "list",
        data: models.map((model) => ({
          id: model.id,
          object: "model",
          provider: model.provider,
          model: model.model,
          owned_by: model.providerLabel,
          is_default: model.isDefault,
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(
      "[api/v1/models] failed to list models:",
      error instanceof Error ? error.name : "unknown",
    );
    return Response.json(
      {
        error: {
          message: "Failed to list models.",
          type: "api_error",
          param: null,
          code: null,
        },
      },
      { status: 500 },
    );
  }
}
