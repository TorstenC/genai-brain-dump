// src/core/parser.ts
import { ChatGPTData, ChatNode, LinearMessage } from '../types';

export function parseLinearChat(rawJsonString: string): { title: string, messages: LinearMessage[] } | null {
  let data: ChatGPTData;
  
  try {
    // Versuch, den inneren API-String zu parsen
    data = JSON.parse(rawJsonString) as ChatGPTData;
  } catch (error) {
    // Wenn das fehlschlägt (z.B. wegen 1MB Limit), geben wir null zurück
    console.warn("⚠️ Überspringe einen Chat: JSON unvollständig (vermutlich vom Browser bei 1MB abgeschnitten).");
    return null; 
  }

  const mapping = data.mapping;
  let currentNodeId = data.current_node;

  const linearPath: ChatNode[] = [];

  // 1. Rückwärts durch den Baum wandern
  while (currentNodeId && mapping[currentNodeId]) {
    linearPath.push(mapping[currentNodeId]);
    currentNodeId = mapping[currentNodeId].parent || '';
  }

  // 2. Chronologische Reihenfolge herstellen
  linearPath.reverse();

  // 3. Nachrichten extrahieren und bereinigen
  const messages: LinearMessage[] = [];

  for (const node of linearPath) {
    const msg = node.message;
    if (!msg || !msg.content || !msg.content.parts) continue;
    if (msg.author.role === 'system' || msg.author.role === 'tool') continue;

    const textParts = msg.content.parts
      .filter(part => typeof part === 'string')
      .join('\n');

    if (textParts.trim().length > 0) {
      messages.push({
        role: msg.author.role,
        text: textParts.trim()
      });
    }
  }

  return {
    title: data.title || 'Ohne Titel',
    messages
  };
}
