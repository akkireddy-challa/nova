import { generate, resolveModel } from "./providers";
import { NoProviderConfiguredError } from "./providers/types";
import type { ProviderId } from "./providers/types";
import type {
  AgentThought,
  GenerationTelemetry,
  GenerativeArtifact,
  ModelProvider,
  SourceCitation,
} from "./types";
import { PipelineDeps, PipelineInput, runPipeline } from "./research/pipeline";

export { PipelineAbortedError, PipelineError } from "./research/pipeline";
export type { PipelineDeps, PipelineInput } from "./research/pipeline";

export interface GatewayResponse {
  content: string;
  thoughts: AgentThought[];
  artifact?: GenerativeArtifact;
  /** Web sources the answer was grounded in, numbered [1..n]; empty when none were used. */
  sources: SourceCitation[];
  provider: ProviderId;
  telemetry: GenerationTelemetry;
}

const ENHANCE_SYSTEM_PROMPT =
  "Rewrite the user's research question so it is specific, unambiguous, and states the desired output. " +
  "Keep the user's intent and language. Do not add facts or assumptions. " +
  "Return only the rewritten question, with no quotes or commentary.";

/**
 * Rewrites a prompt with the configured LLM. Returns the prompt unchanged when no
 * provider is configured or the call fails.
 */
export async function enhancePrompt(
  prompt: string,
  model?: ModelProvider,
): Promise<string> {
  const trimmed = prompt.trim();
  if (!trimmed) return prompt;
  try {
    const selection = await resolveModel(model);
    const result = await generate(selection, {
      system: ENHANCE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: trimmed }],
      maxTokens: 300,
      temperature: 0.3,
    });
    const text = result.text
      .trim()
      .replace(/^["'`]+|["'`]+$/g, "")
      .trim();
    return text || prompt;
  } catch (err) {
    if (!(err instanceof NoProviderConfiguredError)) {
      console.warn(
        "[AI Gateway] Prompt enhancement failed:",
        err instanceof Error ? err.name : "unknown error",
      );
    }
    return prompt;
  }
}

/**
 * Runs the research pipeline for one request. Throws NoProviderConfiguredError,
 * ProviderError, PipelineError (INVALID_OUTPUT / BAD_REQUEST), or PipelineAbortedError
 * when `deps.signal` fires. `deps.onThought` receives each step as it happens.
 */
export async function processAgentRequest(
  input: PipelineInput,
  deps?: PipelineDeps,
): Promise<GatewayResponse> {
  return runPipeline({ thinkingBudget: "analytical", ...input }, deps);
}
