import { describe, expect, test } from "bun:test";
import {
  parseModelsResponse,
  pickModel,
  splitModelId,
} from "../src/lib/client/models";
import { isErrorMessage, parseAgentError } from "../src/lib/client/agent";

const body = {
  object: "list",
  data: [
    {
      id: "ollama:llama3.2:3b",
      object: "model",
      provider: "ollama",
      model: "llama3.2:3b",
      owned_by: "Ollama",
      is_default: false,
    },
    {
      id: "anthropic:claude-sonnet-5-5",
      object: "model",
      provider: "anthropic",
      model: "claude-sonnet-5-5",
      owned_by: "Anthropic",
      is_default: true,
    },
  ],
};

describe("client model helpers", () => {
  test("parses the /api/v1/models contract", () => {
    const models = parseModelsResponse(body);
    expect(models).toHaveLength(2);
    expect(models[1]).toEqual({
      id: "anthropic:claude-sonnet-5-5",
      provider: "anthropic",
      model: "claude-sonnet-5-5",
      ownedBy: "Anthropic",
      isDefault: true,
    });
  });

  test("empty data means no provider", () => {
    expect(parseModelsResponse({ object: "list", data: [] })).toEqual([]);
  });

  test("rejects malformed responses", () => {
    expect(() => parseModelsResponse({ models: [] })).toThrow();
  });

  test("keeps the saved choice only while it is still offered", () => {
    const models = parseModelsResponse(body);
    expect(pickModel(models, "ollama:llama3.2:3b")).toBe("ollama:llama3.2:3b");
    expect(pickModel(models, "gemini:gone")).toBe(
      "anthropic:claude-sonnet-5-5",
    );
    expect(pickModel(models, "")).toBe("anthropic:claude-sonnet-5-5");
    expect(pickModel([], "anything")).toBe("");
  });

  test("splits ids whose model part contains a colon", () => {
    expect(splitModelId("ollama:llama3.2:3b")).toEqual({
      provider: "ollama",
      model: "llama3.2:3b",
    });
    expect(splitModelId("nocolon")).toBeNull();
  });
});

describe("client agent error helpers", () => {
  test("uses the server message and code", () => {
    expect(
      parseAgentError(
        { error: "No LLM provider is configured.", code: "NO_PROVIDER" },
        503,
      ),
    ).toEqual({
      message: "No LLM provider is configured.",
      code: "NO_PROVIDER",
    });
  });

  test("falls back to the HTTP status for unknown bodies", () => {
    expect(parseAgentError(null, 500)).toEqual({
      message: "Request failed with HTTP 500.",
      code: "PROVIDER_ERROR",
    });
  });

  test("detects stored error messages", () => {
    const base = {
      id: "1",
      role: "assistant" as const,
      content: "x",
      timestamp: "",
    };
    expect(isErrorMessage(base)).toBe(false);
    expect(
      isErrorMessage({ ...base, errorCode: "NETWORK" } as typeof base),
    ).toBe(true);
  });
});
