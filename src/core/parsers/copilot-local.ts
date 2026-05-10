import fs from 'fs';
import {
  CopilotLocalConsolidatedLine,
  CopilotLocalEventLine,
  CopilotLocalFormat,
  LinearMessage,
} from '../types';

function readJsonlLines(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function safeParseJson(line: string): any | null {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function extractTextCandidate(value: any): string | null {
  if (typeof value === 'string') {
    const text = value.trim();
    return text.length > 0 ? text : null;
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  const directCandidates = [
    value.text,
    value.content,
    value.message,
    value.prompt,
    value.response,
    value.body,
  ];

  for (const candidate of directCandidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return null;
}

function extractResponseText(value: any): string | null {
  if (typeof value === 'string') {
    const text = value.trim();
    return text.length > 0 ? text : null;
  }

  if (Array.isArray(value)) {
    const chunks: string[] = [];
    for (const item of value) {
      if (!item || typeof item !== 'object') continue;
      if (typeof item.value === 'string' && item.value.trim().length > 0) {
        chunks.push(item.value);
      }
      if (typeof item.text === 'string' && item.text.trim().length > 0) {
        chunks.push(item.text);
      }
      if (typeof item.content === 'string' && item.content.trim().length > 0) {
        chunks.push(item.content);
      }
    }

    if (chunks.length > 0) {
      const joined = chunks.join('');
      const text = joined.trim();
      return text.length > 0 ? text : null;
    }
  }

  return extractTextCandidate(value);
}

function titleFromFirstUser(messages: LinearMessage[], fallback: string): string {
  const firstUser = messages.find((msg) => msg.role === 'user');
  if (!firstUser) return fallback;
  const title = firstUser.text.replace(/\s+/g, ' ').trim().slice(0, 80);
  return title.length > 0 ? title : fallback;
}

export function detectCopilotFormatType(filePath: string): CopilotLocalFormat | null {
  const lines = readJsonlLines(filePath);
  if (lines.length === 0) return null;

  const first = safeParseJson(lines[0]);
  if (!first || typeof first !== 'object') return null;

  if ('kind' in first) return 'consolidated';
  if ('type' in first || 'parentId' in first) return 'event-stream';
  return null;
}

export function parseEventStreamFormat(filePath: string): { title: string; messages: LinearMessage[] } | null {
  const lines = readJsonlLines(filePath);
  const events: Array<{ role: 'user' | 'assistant'; text: string; ts: string }> = [];

  for (const line of lines) {
    const parsed = safeParseJson(line) as CopilotLocalEventLine | null;
    if (!parsed) continue;

    const type = parsed.type;
    const content = parsed.data?.content;
    const timestamp = parsed.timestamp || '';

    if ((type === 'user.message' || type === 'assistant.message') && typeof content === 'string') {
      const text = content.trim();
      if (text.length > 0) {
        events.push({
          role: type === 'user.message' ? 'user' : 'assistant',
          text,
          ts: timestamp,
        });
      }
    }
  }

  if (events.length === 0) return null;

  events.sort((a, b) => a.ts.localeCompare(b.ts));

  const messages: LinearMessage[] = events.map((event) => ({
    role: event.role,
    text: event.text,
  }));

  return {
    title: titleFromFirstUser(messages, 'Copilot Local Chat'),
    messages,
  };
}

function extractConsolidatedMessages(requests: any[]): LinearMessage[] {
  const messages: LinearMessage[] = [];

  for (const request of requests) {
    const userCandidates = [
      request?.message,
      request?.request,
      request?.request?.message,
      request?.request?.prompt,
      request?.request?.text,
      request?.prompt,
      request?.text,
      request?.query,
    ];

    for (const candidate of userCandidates) {
      const text = extractTextCandidate(candidate);
      if (text) {
        messages.push({ role: 'user', text });
        break;
      }
    }

    const assistantCandidates = [
      request?.response,
      request?.response?.message,
      request?.response?.text,
      request?.responseMessage,
      request?.result,
      request?.answer,
    ];

    for (const candidate of assistantCandidates) {
      const text = extractResponseText(candidate);
      if (text) {
        messages.push({ role: 'assistant', text });
        break;
      }
    }
  }

  return messages;
}

export function parseConsolidatedFormat(filePath: string): { title: string; messages: LinearMessage[] } | null {
  const lines = readJsonlLines(filePath);

  let title = 'Copilot Local Chat';
  const requests: any[] = [];

  for (const line of lines) {
    const parsed = safeParseJson(line) as CopilotLocalConsolidatedLine | null;
    if (!parsed) continue;

    if (parsed.kind === 0 && parsed.v) {
      if (typeof parsed.v.customTitle === 'string' && parsed.v.customTitle.trim().length > 0) {
        title = parsed.v.customTitle.trim();
      }
      if (Array.isArray(parsed.v.requests)) {
        requests.push(...parsed.v.requests);
      }
      continue;
    }

    if (parsed.kind === 1 && Array.isArray(parsed.k) && parsed.k[0] === 'customTitle') {
      if (typeof parsed.v === 'string' && parsed.v.trim().length > 0) {
        title = parsed.v.trim();
      }
      continue;
    }

    if (parsed.kind === 2 && Array.isArray(parsed.k) && parsed.k[0] === 'requests' && Array.isArray(parsed.v)) {
      requests.push(...parsed.v);
    }
  }

  const messages = extractConsolidatedMessages(requests);
  if (messages.length === 0) return null;

  return {
    title: titleFromFirstUser(messages, title),
    messages,
  };
}

export function parseCopilotLocalFile(filePath: string): { title: string; messages: LinearMessage[] } | null {
  const format = detectCopilotFormatType(filePath);
  if (!format) return null;

  if (format === 'event-stream') {
    return parseEventStreamFormat(filePath);
  }

  return parseConsolidatedFormat(filePath);
}
