// src/core/test.ts
import fs from 'fs';
import path from 'path';
import { extractChatGPTApiResponses } from './extractor';
import { parseLinearChat } from './parser';
import { generateMarkdown, sanitizeFilename } from './markdown';
import { HarLog } from './types';

// 0. Setup Output-Ordner
const outputDir = path.join(process.cwd(), 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// 1. HAR einlesen
const filePath = path.join(process.cwd(), 'test-data.json'); 
const fileContent = fs.readFileSync(filePath, 'utf-8');
const harData = JSON.parse(fileContent) as HarLog;

// 2. Extrahieren
const rawChats = extractChatGPTApiResponses(harData);
console.log(`Es wurden ${rawChats.length} API-Antworten gefunden!\n`);

let successCount = 0;

for (const rawChat of rawChats) {
  const parsedChat = parseLinearChat(rawChat);
  
  if (parsedChat) {
    successCount++;
    console.log(`Verarbeite: "${parsedChat.title}"...`);
    
    // 3. Markdown generieren
    const mdContent = generateMarkdown(parsedChat.title, parsedChat.messages);
    
    // 4. Datei schreiben
    const safeName = sanitizeFilename(parsedChat.title || 'chat');
    const outPath = path.join(outputDir, `${safeName}.md`);
    
    fs.writeFileSync(outPath, mdContent, 'utf-8');
    console.log(`✅ Gespeichert unter: output/${safeName}.md\n`);
  }
}

console.log(`🎉 Fertig! ${successCount} Chats als Markdown exportiert.`);
