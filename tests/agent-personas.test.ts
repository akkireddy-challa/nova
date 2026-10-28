import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import {
  getDefaultPersonas,
  loadPersonasFromStorage,
  savePersonaToStorage,
  deletePersonaFromStorage,
  exportPersonasBundle,
  importPersonasBundle,
  getActivePersonaId,
  setActivePersonaId,
  getActivePersona,
  resolvePersonaSystemPrompt,
  validatePersona,
  downloadPersonasBundle,
  DEFAULT_PERSONAS,
  STORAGE_KEY_CUSTOM_PERSONAS,
  STORAGE_KEY_ACTIVE_PERSONA,
  type AgentPersona,
} from "../src/lib/agent-personas";

describe("Agent Persona Studio", () => {
  // LocalStorage Mock
  let store: Record<string, string> = {};

  const mockLocalStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };

  const originalWindow = globalThis.window;

  beforeEach(() => {
    store = {};
    // Setup mock window with localStorage
    globalThis.window = {
      localStorage: mockLocalStorage,
      document: {
        createElement: () => ({
          href: "",
          download: "",
          click: () => {},
        }),
        body: {
          appendChild: () => {},
          removeChild: () => {},
        },
      },
    } as unknown as Window & typeof globalThis;
  });

  afterEach(() => {
    globalThis.window = originalWindow as unknown as Window & typeof globalThis;
    store = {};
  });

  describe("Built-in Specialist Personas", () => {
    test("returns all 4 official built-in specialist templates", () => {
      const personas = getDefaultPersonas();
      expect(personas.length).toBe(4);

      const ids = personas.map((p) => p.id);
      expect(ids).toContain("market-analyst");
      expect(ids).toContain("tech-architect");
      expect(ids).toContain("academic-critic");
      expect(ids).toContain("financial-analyst");
    });

    test("built-ins contain all mandatory fields and high-rigor directives", () => {
      const personas = getDefaultPersonas();

      for (const persona of personas) {
        expect(persona.id.length).toBeGreaterThan(0);
        expect(persona.name.length).toBeGreaterThan(0);
        expect(persona.icon.length).toBeGreaterThan(0);
        expect(persona.roleTitle.length).toBeGreaterThan(0);
        expect(persona.description.length).toBeGreaterThan(15);
        expect(persona.systemPrompt.length).toBeGreaterThan(200);
        expect(["quick", "analytical", "deep"]).toContain(
          persona.defaultBudget,
        );
        expect(persona.verificationThreshold).toBeGreaterThanOrEqual(50);
        expect(persona.verificationThreshold).toBeLessThanOrEqual(100);
        expect(persona.isCustom).toBe(false);
      }
    });

    test("specific domain directives are included for each persona", () => {
      const personas = getDefaultPersonas();
      const market = personas.find((p) => p.id === "market-analyst");
      const tech = personas.find((p) => p.id === "tech-architect");
      const academic = personas.find((p) => p.id === "academic-critic");
      const financial = personas.find((p) => p.id === "financial-analyst");

      expect(market?.systemPrompt).toContain("TAM (Total Addressable Market)");
      expect(market?.systemPrompt).toContain("Competitive Feature Matrices");
      expect(market?.defaultBudget).toBe("analytical");

      expect(tech?.systemPrompt).toContain("Distributed Infrastructure");
      expect(tech?.systemPrompt).toContain("Scalability & Latency");
      expect(tech?.defaultBudget).toBe("deep");

      expect(academic?.systemPrompt).toContain("Methodology Auditing");
      expect(academic?.systemPrompt).toContain("Statistical Rigor");
      expect(academic?.verificationThreshold).toBe(95);

      expect(financial?.systemPrompt).toContain("Unit Economics");
      expect(financial?.systemPrompt).toContain("CAC/LTV");
      expect(financial?.systemPrompt).toContain("Burn & Runway");
    });

    test("getDefaultPersonas returns independent cloned objects", () => {
      const first = getDefaultPersonas();
      first[0].name = "Mutated Name";
      const second = getDefaultPersonas();
      expect(second[0].name).not.toBe("Mutated Name");
      expect(DEFAULT_PERSONAS[0].name).not.toBe("Mutated Name");
    });
  });

  describe("validatePersona", () => {
    test("validates a compliant custom persona", () => {
      const input: AgentPersona = {
        id: "growth-hacker",
        name: "Growth Hacker",
        icon: "Rocket",
        roleTitle: "Viral Loops & Funnel Architect",
        description: "Optimizes conversion funnels and viral referral loops.",
        systemPrompt: "Focus on rapid experimentation and North Star metrics.",
        defaultBudget: "quick",
        verificationThreshold: 75,
        isCustom: true,
      };

      const result = validatePersona(input);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.persona.id).toBe("growth-hacker");
        expect(result.persona.verificationThreshold).toBe(75);
      }
    });

    test("rejects non-object or null input", () => {
      expect(validatePersona(null).valid).toBe(false);
      expect(validatePersona("string").valid).toBe(false);
      expect(validatePersona(42).valid).toBe(false);
    });

    test("rejects missing or empty required fields", () => {
      expect(
        validatePersona({
          id: "",
          name: "Test",
          description: "Desc",
          systemPrompt: "Prompt",
        }).valid,
      ).toBe(false);

      expect(
        validatePersona({
          id: "test",
          name: "",
          description: "Desc",
          systemPrompt: "Prompt",
        }).valid,
      ).toBe(false);

      expect(
        validatePersona({
          id: "test",
          name: "Test",
          description: "",
          systemPrompt: "Prompt",
        }).valid,
      ).toBe(false);

      expect(
        validatePersona({
          id: "test",
          name: "Test",
          description: "Desc",
          systemPrompt: "",
        }).valid,
      ).toBe(false);
    });

    test("rejects invalid characters in id", () => {
      expect(
        validatePersona({
          id: "invalid id with spaces",
          name: "Test",
          description: "Desc",
          systemPrompt: "Prompt",
        }).valid,
      ).toBe(false);

      expect(
        validatePersona({
          id: "invalid@id#special!",
          name: "Test",
          description: "Desc",
          systemPrompt: "Prompt",
        }).valid,
      ).toBe(false);
    });

    test("clamps verificationThreshold between 50 and 100", () => {
      const low = validatePersona({
        id: "low-threshold",
        name: "Low",
        description: "Desc",
        systemPrompt: "Prompt",
        verificationThreshold: 20,
      });
      expect(low.valid).toBe(true);
      if (low.valid) expect(low.persona.verificationThreshold).toBe(50);

      const high = validatePersona({
        id: "high-threshold",
        name: "High",
        description: "Desc",
        systemPrompt: "Prompt",
        verificationThreshold: 150,
      });
      expect(high.valid).toBe(true);
      if (high.valid) expect(high.persona.verificationThreshold).toBe(100);
    });

    test("defends against prototype pollution in persona object", () => {
      const malicious = JSON.parse(
        '{"id": "hack", "name": "Hack", "description": "Desc", "systemPrompt": "P", "__proto__": {"admin": true}}',
      );
      const res = validatePersona(malicious);
      expect(res.valid).toBe(false);
      if (!res.valid) {
        expect(res.error).toContain("forbidden prototype keys");
      }
    });
  });

  describe("LocalStorage Persistence (Save, Load, Delete)", () => {
    test("loadPersonasFromStorage returns default personas when empty", () => {
      const personas = loadPersonasFromStorage();
      expect(personas.length).toBe(4);
    });

    test("savePersonaToStorage stores custom persona and load retrieves it", () => {
      const custom: AgentPersona = {
        id: "security-auditor",
        name: "Security Auditor",
        icon: "ShieldAlert",
        roleTitle: "Penetration Tester & AppSec Lead",
        description: "Performs SAST/DAST reviews and threat modeling.",
        systemPrompt: "Audit all input boundaries and dependencies for CVEs.",
        defaultBudget: "deep",
        verificationThreshold: 90,
      };

      savePersonaToStorage(custom);

      const loaded = loadPersonasFromStorage();
      expect(loaded.length).toBe(5);

      const found = loaded.find((p) => p.id === "security-auditor");
      expect(found).toBeDefined();
      expect(found?.name).toBe("Security Auditor");
      expect(found?.isCustom).toBe(true);
    });

    test("savePersonaToStorage updates existing custom persona", () => {
      const custom: AgentPersona = {
        id: "ux-researcher",
        name: "UX Researcher",
        icon: "Eye",
        roleTitle: "Usability Specialist",
        description: "Initial description.",
        systemPrompt: "Evaluate heuristic usability.",
        defaultBudget: "quick",
        verificationThreshold: 70,
      };

      savePersonaToStorage(custom);
      expect(
        loadPersonasFromStorage().find((p) => p.id === "ux-researcher")
          ?.description,
      ).toBe("Initial description.");

      savePersonaToStorage({
        ...custom,
        description: "Updated refined description.",
        verificationThreshold: 80,
      });

      const updated = loadPersonasFromStorage().find(
        (p) => p.id === "ux-researcher",
      );
      expect(updated?.description).toBe("Updated refined description.");
      expect(updated?.verificationThreshold).toBe(80);
      expect(loadPersonasFromStorage().length).toBe(5);
    });

    test("savePersonaToStorage prevents overwriting built-in persona IDs", () => {
      const overwriteAttempt: AgentPersona = {
        id: "market-analyst",
        name: "Fake Market Analyst",
        icon: "Bot",
        roleTitle: "Fake",
        description: "Attempting to hijack market analyst.",
        systemPrompt: "Compromised prompt.",
        defaultBudget: "quick",
        verificationThreshold: 50,
      };

      expect(() => savePersonaToStorage(overwriteAttempt)).toThrow(
        /Cannot overwrite built-in specialist persona/i,
      );
    });

    test("deletePersonaFromStorage removes custom persona", () => {
      const custom: AgentPersona = {
        id: "temp-agent",
        name: "Temporary Agent",
        icon: "Zap",
        roleTitle: "Short-lived Worker",
        description: "Temporary helper.",
        systemPrompt: "Help with immediate task.",
        defaultBudget: "quick",
        verificationThreshold: 60,
      };

      savePersonaToStorage(custom);
      expect(loadPersonasFromStorage().some((p) => p.id === "temp-agent")).toBe(
        true,
      );

      deletePersonaFromStorage("temp-agent");
      expect(loadPersonasFromStorage().some((p) => p.id === "temp-agent")).toBe(
        false,
      );
      expect(loadPersonasFromStorage().length).toBe(4);
    });

    test("deletePersonaFromStorage protects built-in personas from deletion", () => {
      deletePersonaFromStorage("market-analyst");
      const list = loadPersonasFromStorage();
      expect(list.some((p) => p.id === "market-analyst")).toBe(true);
      expect(list.length).toBe(4);
    });

    test("handles corrupted localStorage JSON gracefully without throwing", () => {
      store[STORAGE_KEY_CUSTOM_PERSONAS] = "{{corrupted invalid json!";
      const list = loadPersonasFromStorage();
      expect(list.length).toBe(4);
    });
  });

  describe("JSON Bundle Export & Import", () => {
    test("exportPersonasBundle creates valid bundle JSON with metadata", () => {
      const personas = getDefaultPersonas();
      const bundleJson = exportPersonasBundle(personas);

      const parsed = JSON.parse(bundleJson);
      expect(parsed.version).toBe("1.0.0");
      expect(parsed.type).toBe("nova-agent-personas");
      expect(Array.isArray(parsed.personas)).toBe(true);
      expect(parsed.personas.length).toBe(4);
    });

    test("importPersonasBundle successfully imports valid bundle", () => {
      const personas = getDefaultPersonas();
      const exported = exportPersonasBundle(personas);

      const result = importPersonasBundle(exported);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.personas.length).toBe(4);
        expect(result.personas[0].id).toBe("market-analyst");
      }
    });

    test("importPersonasBundle accepts raw array format", () => {
      const rawArray = [
        {
          id: "custom-bot",
          name: "Custom Bot",
          icon: "Bot",
          roleTitle: "Assistant",
          description: "A custom assistant.",
          systemPrompt: "Be helpful.",
          defaultBudget: "quick",
          verificationThreshold: 75,
        },
      ];

      const result = importPersonasBundle(JSON.stringify(rawArray));
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.personas.length).toBe(1);
        expect(result.personas[0].id).toBe("custom-bot");
      }
    });

    test("importPersonasBundle rejects empty or malformed JSON string", () => {
      expect(importPersonasBundle("").valid).toBe(false);
      expect(importPersonasBundle("   ").valid).toBe(false);
      expect(importPersonasBundle("{not valid json}").valid).toBe(false);
    });

    test("importPersonasBundle rejects empty personas collection", () => {
      const result = importPersonasBundle(
        JSON.stringify({ type: "nova-agent-personas", personas: [] }),
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain("contains no personas");
      }
    });

    test("importPersonasBundle rejects duplicate IDs in bundle", () => {
      const duplicates = [
        {
          id: "dupe-id",
          name: "Agent 1",
          icon: "Bot",
          roleTitle: "Title",
          description: "Desc",
          systemPrompt: "Prompt",
          defaultBudget: "quick",
          verificationThreshold: 70,
        },
        {
          id: "dupe-id",
          name: "Agent 2",
          icon: "Bot",
          roleTitle: "Title",
          description: "Desc",
          systemPrompt: "Prompt",
          defaultBudget: "quick",
          verificationThreshold: 70,
        },
      ];

      const res = importPersonasBundle(JSON.stringify(duplicates));
      expect(res.valid).toBe(false);
      if (!res.valid) {
        expect(res.error).toContain("Duplicate persona id");
      }
    });

    test("importPersonasBundle rejects prototype pollution payloads", () => {
      const payload1 = '{"personas": [], "__proto__": {"polluted": true}}';
      expect(importPersonasBundle(payload1).valid).toBe(false);

      const payload2 =
        '{"type": "nova-agent-personas", "personas": [{"id": "bad", "constructor": {}}]}';
      expect(importPersonasBundle(payload2).valid).toBe(false);
    });

    test("importPersonasBundle sanitizes XSS script tags in fields", () => {
      const dirty = [
        {
          id: "xss-test",
          name: 'Evil Agent <script>alert("xss")</script>',
          icon: "Bot",
          roleTitle: "Hacker <script>evil()</script>",
          description:
            "Safe description <script src='evil.js'></script> preserved text.",
          systemPrompt: "Prompt text <script>evil()</script>",
          defaultBudget: "quick",
          verificationThreshold: 80,
        },
      ];

      const result = importPersonasBundle(JSON.stringify(dirty));
      expect(result.valid).toBe(true);
      if (result.valid) {
        const item = result.personas[0];
        expect(item.name).not.toContain("<script>");
        expect(item.name).toBe("Evil Agent");
        expect(item.roleTitle).toBe("Hacker");
        expect(item.description).toBe("Safe description  preserved text.");
        expect(item.systemPrompt).toBe("Prompt text");
      }
    });
  });

  describe("Persona Activation & System Prompt Resolution", () => {
    test("getActivePersonaId defaults to market-analyst when unset", () => {
      expect(getActivePersonaId()).toBe("market-analyst");
    });

    test("setActivePersonaId sets and updates active persona", () => {
      setActivePersonaId("tech-architect");
      expect(getActivePersonaId()).toBe("tech-architect");
      expect(store[STORAGE_KEY_ACTIVE_PERSONA]).toBe("tech-architect");
    });

    test("getActivePersona returns the corresponding active persona object", () => {
      setActivePersonaId("academic-critic");
      const active = getActivePersona();
      expect(active.id).toBe("academic-critic");
      expect(active.name).toBe("Academic Peer Reviewer");
    });

    test("getActivePersona falls back gracefully if active id not found", () => {
      setActivePersonaId("non-existent-persona");
      const active = getActivePersona();
      expect(active.id).toBe("market-analyst");
    });

    test("resolvePersonaSystemPrompt returns persona prompt when base prompt is empty", () => {
      const persona = getDefaultPersonas()[0];
      const resolved = resolvePersonaSystemPrompt(persona);
      expect(resolved).toBe(persona.systemPrompt.trim());

      const resolvedEmpty = resolvePersonaSystemPrompt(persona, "   ");
      expect(resolvedEmpty).toBe(persona.systemPrompt.trim());
    });

    test("resolvePersonaSystemPrompt appends base system directives cleanly", () => {
      const persona = getDefaultPersonas()[1]; // tech-architect
      const base =
        "Always format responses in GitHub Flavored Markdown with mermaid diagrams.";
      const resolved = resolvePersonaSystemPrompt(persona, base);

      expect(resolved).toContain(persona.systemPrompt.trim());
      expect(resolved).toContain("Additional System Directives:");
      expect(resolved).toContain(base);
    });
  });

  describe("Non-browser resilience", () => {
    test("downloadPersonasBundle does not crash when window is undefined", () => {
      // @ts-expect-error simulating SSR
      globalThis.window = undefined;
      expect(() => downloadPersonasBundle(getDefaultPersonas())).not.toThrow();
    });

    test("loadPersonasFromStorage returns defaults when window is undefined", () => {
      // @ts-expect-error simulating SSR
      globalThis.window = undefined;
      const list = loadPersonasFromStorage();
      expect(list.length).toBe(4);
    });
  });
});
