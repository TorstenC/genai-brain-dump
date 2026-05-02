// src/core/extractor.ts

export function extractChatGPTApiResponses(harData: HarLog): string[] {
  const chatResponses: string[] = [];
  const entries = harData.log?.entries || [];

  for (const entry of entries) {
    const url = entry.request.url;
    
    // Strenger Filter: Muss /conversation/ enthalten, darf aber NICHT /conversations enthalten
    const isSingleChatEndpoint = url.includes('backend-api/conversation/') && !url.includes('backend-api/conversations');

    if (isSingleChatEndpoint && entry.request.method === 'GET') {
      const responseText = entry.response.content.text;
      if (responseText) {
        chatResponses.push(responseText);
      }
    }
  }

  return chatResponses;
}
