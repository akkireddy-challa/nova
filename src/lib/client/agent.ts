import type { ChatMessage } from '@/lib/types';

/** Error codes returned by POST /api/agent (see docs/team/SPRINT2.md). */
export type AgentErrorCode = 'NO_PROVIDER' | 'PROVIDER_ERROR' | 'INVALID_OUTPUT' | 'BAD_REQUEST' | 'NETWORK';

/** A chat message that records a failed request instead of an answer. Stored alongside normal messages. */
export interface ErrorChatMessage extends ChatMessage {
  errorCode: AgentErrorCode;
}

export function isErrorMessage(msg: ChatMessage): msg is ErrorChatMessage {
  return typeof (msg as Partial<ErrorChatMessage>).errorCode === 'string';
}

const KNOWN_CODES: AgentErrorCode[] = ['NO_PROVIDER', 'PROVIDER_ERROR', 'INVALID_OUTPUT', 'BAD_REQUEST'];

/** Extracts `{error, code}` from a failed response body; falls back to the HTTP status. */
export function parseAgentError(body: unknown, status: number): { message: string; code: AgentErrorCode } {
  const rec = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  const rawCode = typeof rec.code === 'string' ? rec.code : '';
  const code = (KNOWN_CODES as string[]).includes(rawCode) ? (rawCode as AgentErrorCode) : 'PROVIDER_ERROR';
  const message =
    typeof rec.error === 'string' && rec.error.trim() ? rec.error : `Request failed with HTTP ${status}.`;
  return { message, code };
}
