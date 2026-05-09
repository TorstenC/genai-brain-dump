// src/core/parsers/gemini.ts
import { LinearMessage } from '../types';

/**
 * Parses a Gemini batchexecute RPC response string.
 * Gemini uses Google's internal RPC protocol with this structure:
 * )]}'
 * <chunk_size>
 * [["wrb.fr","<RPC_ID>","<inner_json_string>",null,...],...]
 * <chunk_size>
 * [["e",4,...]]
 */
export function parseGeminiRpcResponse(responseText: string): { rpcId: string; innerData: any } | null {
  try {
    const lines = responseText.split('\n');
    if (lines.length < 4) return null;

    // Line 0: )]} security prefix
    // Line 1: empty
    // Line 2: chunk size
    // Line 3: actual RPC frame
    const rpcFrame = JSON.parse(lines[3]);

    // rpcFrame should be an array with one element: ["wrb.fr", RPC_ID, inner_json_string, ...]
    if (!Array.isArray(rpcFrame) || rpcFrame.length === 0) return null;

    const firstElem = rpcFrame[0];
    if (!Array.isArray(firstElem) || firstElem.length < 3) return null;

    const rpcId = firstElem[1];
    const innerJsonStr = firstElem[2];

    if (typeof innerJsonStr !== 'string') return null;

    const innerData = JSON.parse(innerJsonStr);
    return { rpcId, innerData };
  } catch (error) {
    console.warn('⚠️ Failed to parse Gemini RPC response:', error);
    return null;
  }
}

function getStringAtPath(obj: any, path: number[]): string | null {
  let current = obj;
  for (const index of path) {
    if (!Array.isArray(current) || current.length <= index) {
      return null;
    }
    current = current[index];
  }

  if (typeof current !== 'string') {
    return null;
  }

  const text = current.trim();
  return text.length > 0 ? text : null;
}

function looksLikeInternalThought(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.startsWith('analyzing ') ||
    lower.startsWith("i've begun") ||
    lower.startsWith("i've clarified") ||
    lower.startsWith('i am ') ||
    lower.includes('reasoning') ||
    lower.includes('internal')
  );
}

function toTitleFromFirstUserMessage(text: string): string {
  const firstLine = text.split('\n').map((line) => line.trim()).find((line) => line.length > 0) || 'Gemini Chat';
  return firstLine.slice(0, 80);
}

/**
 * Parses Gemini conversation from the inner RPC data.
 * Expected conversation turn shape inside innerData:
 * innerData[0] = turns[]
 * turn[2][0][0] = user message text
 * turn[3][0][1][0] = assistant final response text
 *
 * Turns are observed in reverse-chronological order in HAR responses,
 * therefore we reverse them to get a proper chat flow.
 */
export function parseGeminiConversation(
  innerData: any
): { title: string; messages: LinearMessage[] } | null {
  if (!innerData || !Array.isArray(innerData) || !Array.isArray(innerData[0])) {
    return null;
  }

  const turns = innerData[0];
  const orderedTurns = [...turns].reverse();
  const messages: LinearMessage[] = [];

  for (const turn of orderedTurns) {
    if (!Array.isArray(turn)) {
      continue;
    }

    const userText = getStringAtPath(turn, [2, 0, 0]);
    if (userText && !looksLikeInternalThought(userText)) {
      messages.push({ role: 'user', text: userText });
    }

    const assistantText = getStringAtPath(turn, [3, 0, 0, 1, 0]);
    if (assistantText && !looksLikeInternalThought(assistantText)) {
      messages.push({ role: 'assistant', text: assistantText });
    }
  }

  if (messages.length === 0) {
    return null;
  }

  const firstUser = messages.find((msg) => msg.role === 'user');
  const title = firstUser ? toTitleFromFirstUserMessage(firstUser.text) : 'Gemini Chat';

  return { title, messages };
}

/**
 * Main entry point: Parse a Gemini batchexecute response.
 */
export function parseGemini(rawJsonString: string): { title: string; messages: LinearMessage[] } | null {
  const parsed = parseGeminiRpcResponse(rawJsonString);
  if (!parsed) return null;

  return parseGeminiConversation(parsed.innerData);
}
