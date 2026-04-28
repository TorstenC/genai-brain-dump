// src/core/extractor.ts
import { HarLog, HarEntry } from './types';

/**
 * Filtert das HAR-Objekt nach Aufrufen an die ChatGPT Conversation API
 * und gibt die unformatierten JSON-Strings der Chats zurück.
 */
export function extractChatGPTApiResponses(harData: HarLog): string[] {
  const chatResponses: string[] = [];

  const entries = harData.log?.entries || [];

  for (const entry of entries) {
    const url = entry.request.url;
    
    // Wir suchen nach dem Endpunkt, der einen spezifischen Chat lädt
    // Bsp: https://chatgpt.com/backend-api/conversation/1234-5678...
    if (url.includes('backend-api/conversation/') && entry.request.method === 'GET') {
      
      const responseText = entry.response.content.text;
      if (responseText) {
        chatResponses.push(responseText);
      }
    }
  }

  return chatResponses;
}
