import { NextResponse } from 'next/server';

export async function GET() {
  const models: Array<{
    id: string;
    object: string;
    created: number;
    owned_by: string;
    description: string;
    configured: boolean;
  }> = [];

  const hasGemini = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  const hasClaude = Boolean(process.env.ANTHROPIC_API_KEY);
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const hasOllama = Boolean(process.env.OLLAMA_BASE_URL);

  if (hasGemini) {
    models.push({
      id: 'gemini-2.5-flash',
      object: 'model',
      created: 1740000000,
      owned_by: 'google',
      description: 'Google Gemini 2.5 Flash for high-speed grounded research',
      configured: true,
    });
  }

  if (hasClaude) {
    models.push({
      id: 'claude-3-5-sonnet',
      object: 'model',
      created: 1740000000,
      owned_by: 'anthropic',
      description: 'Anthropic Claude 3.5 Sonnet for deep analytical research and planning',
      configured: true,
    });
  }

  if (hasOpenAI) {
    models.push({
      id: 'gpt-4o',
      object: 'model',
      created: 1740000000,
      owned_by: 'openai',
      description: 'OpenAI GPT-4o frontier model',
      configured: true,
    });
  }

  if (hasOllama || !hasGemini && !hasClaude && !hasOpenAI) {
    models.push({
      id: 'ollama-local',
      object: 'model',
      created: 1740000000,
      owned_by: 'ollama',
      description: 'Local open-weight model running on Ollama',
      configured: hasOllama,
    });
  }

  return NextResponse.json({
    object: 'list',
    data: models,
  });
}
