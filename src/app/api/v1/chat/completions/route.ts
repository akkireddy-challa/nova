import { NextRequest, NextResponse } from 'next/server';
import { sanitizeInput } from '@/lib/sanitizer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const model = body.model || 'gemini-2.5-flash';
    const messages = body.messages || [];
    const stream = Boolean(body.stream);
    const temperature = typeof body.temperature === 'number' ? body.temperature : 0.7;
    const maxTokens = body.max_tokens || 2048;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        {
          error: {
            message: "Missing or invalid 'messages' array in request body.",
            type: 'invalid_request_error',
            param: 'messages',
            code: null,
          },
        },
        { status: 400 }
      );
    }

    // Extract user query and system prompt
    let systemPrompt = 'You are Nova, an open-source, local-first research assistant.';
    const promptParts: string[] = [];

    for (const msg of messages) {
      const cleanContent = sanitizeInput(msg.content || '');
      if (msg.role === 'system') {
        systemPrompt += `\n${cleanContent}`;
      } else if (msg.role === 'user') {
        promptParts.push(`User: ${cleanContent}`);
      } else if (msg.role === 'assistant') {
        promptParts.push(`Assistant: ${cleanContent}`);
      }
    }

    const combinedPrompt = `${systemPrompt}\n\n${promptParts.join('\n')}\n\nAssistant:`;

    // Attempt provider API call
    let generatedText = '';
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const estimatedPromptTokens = Math.max(1, Math.round(combinedPrompt.split(/\s+/).length * 1.3));

    if (geminiApiKey) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: combinedPrompt }] }],
            generationConfig: {
              temperature,
              maxOutputTokens: maxTokens,
            },
          }),
          signal: AbortSignal.timeout(15000),
        });

        if (res.ok) {
          const data = await res.json();
          const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidate) {
            generatedText = candidate;
          }
        }
      } catch (err) {
        console.warn('API v1 Gemini completion failed:', err);
      }
    }

    if (!generatedText) {
      return NextResponse.json(
        {
          error: {
            message: 'No LLM provider configured or provider request failed. Please configure GEMINI_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY.',
            type: 'authentication_error',
            param: null,
            code: 401,
          },
        },
        { status: 401 }
      );
    }

    const completionId = `chatcmpl-${Date.now().toString(36)}`;
    const created = Math.floor(Date.now() / 1000);
    const estimatedCompletionTokens = Math.max(1, Math.round(generatedText.split(/\s+/).length * 1.3));

    // Handle Streaming (Server-Sent Events)
    if (stream) {
      const words = generatedText.split(' ');
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          for (let i = 0; i < words.length; i++) {
            const chunkText = (i === 0 ? '' : ' ') + words[i];
            const payload = {
              id: completionId,
              object: 'chat.completion.chunk',
              created,
              model,
              choices: [
                {
                  index: 0,
                  delta: i === 0 ? { role: 'assistant', content: chunkText } : { content: chunkText },
                  finish_reason: null,
                },
              ],
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
            await new Promise(r => setTimeout(r, 15));
          }

          const stopPayload = {
            id: completionId,
            object: 'chat.completion.chunk',
            created,
            model,
            choices: [
              {
                index: 0,
                delta: {},
                finish_reason: 'stop',
              },
            ],
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(stopPayload)}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
    }

    // Non-streaming JSON response
    return NextResponse.json({
      id: completionId,
      object: 'chat.completion',
      created,
      model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: generatedText,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: estimatedPromptTokens,
        completion_tokens: estimatedCompletionTokens,
        total_tokens: estimatedPromptTokens + estimatedCompletionTokens,
      },
    });
  } catch (error) {
    console.error('API v1 Chat Completions error:', error);
    return NextResponse.json(
      {
        error: {
          message: 'Internal server error in Nova Chat Gateway.',
          type: 'api_error',
          param: null,
          code: 500,
        },
      },
      { status: 500 }
    );
  }
}
