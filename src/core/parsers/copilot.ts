// src/core/parsers/copilot.ts
import { LinearMessage } from '../types';

export function parseCopilotChat(rawJsonString: string): { title: string, messages: LinearMessage[] } | null {
  try {
    const data = JSON.parse(rawJsonString);
    
    // Prüfen, ob die Struktur passt
    if (!data.thread || !data.messages || !Array.isArray(data.messages)) {
      return null;
    }

    const title = data.thread.name || 'Copilot Chat';
    const messages: LinearMessage[] = [];

    for (const msg of data.messages) {
      if (msg.content && (msg.role === 'user' || msg.role === 'assistant')) {
        messages.push({
          role: msg.role,
          text: msg.content.trim()
        });
      }
    }

    return { title, messages };
  } catch (error) {
    console.warn("⚠️ Überspringe einen Copilot-Chat: JSON konnte nicht geparst werden.");
    return null;
  }
}
