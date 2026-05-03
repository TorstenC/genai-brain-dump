// src/core/extractor.ts
import { HarLog, ExtractedChat } from './types';
import { parseLinearChat as parseChatGPT } from './parsers/chatgpt';
import { parseCopilotChat } from './parsers/copilot';

/**
 * Durchsucht das HAR-File nach bekannten API-Endpunkten und routet 
 * die rohen JSON-Strings an die passenden Vendor-Parser.
 */
export function extractChatsFromHar(harData: HarLog): ExtractedChat[] {
  const extractedChats: ExtractedChat[] = [];
  const entries = harData.log?.entries || [];

  for (const entry of entries) {
    const url = entry.request.url;
    const method = entry.request.method;
    const responseText = entry.response?.content?.text;

    if (!responseText || method !== 'GET') continue;

    // --- ROUTE: ChatGPT ---
    if (url.includes('backend-api/conversation/') && !url.includes('backend-api/conversations')) {
      const parsed = parseChatGPT(responseText);
      if (parsed) {
        extractedChats.push({
          vendor: 'ChatGPT',
          title: parsed.title,
          messages: parsed.messages
        });
      }
    }

    // --- ROUTE: GitHub Copilot ---
    // Beispiel-URL: https://api.business.githubcopilot.com/github/chat/threads/.../messages
    if (url.includes('/chat/threads/') && url.endsWith('/messages')) {
      const parsed = parseCopilotChat(responseText);
      if (parsed) {
        extractedChats.push({
          vendor: 'Copilot',
          title: parsed.title,
          messages: parsed.messages
        });
      }
    }
  }

  return extractedChats;
}
