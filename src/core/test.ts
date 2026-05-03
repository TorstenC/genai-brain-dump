// src/core/test.ts
import fs from 'fs';
import path from 'path';
import { extractChatsFromHar } from './extractor';
import { generateMarkdown, sanitizeFilename } from './markdown';
import { HarLog } from './types';

const outputDir = path.join(process.cwd(), 'output');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

const filePath = path.join(process.cwd(), 'test-data.json'); // Achte darauf, dass hier dein Copilot-HAR liegt!
const fileContent = fs.readFileSync(filePath, 'utf-8');
const harData = JSON.parse(fileContent) as HarLog;

// Router aufrufen
const chats = extractChatsFromHar(harData);
console.log(`Es wurden ${chats.length} Chats gefunden!\n`);

let successCount = 0;

for (const chat of chats) {
  successCount++;
  console.log(`Verarbeite [${chat.vendor}]: "${chat.title}"...`);
  
  const mdContent = generateMarkdown(chat.title, chat.messages, chat.vendor);
  
  // Wir packen den Vendor zur Sicherheit mit in den Dateinamen
  const safeName = `${chat.vendor.toLowerCase()}_${sanitizeFilename(chat.title || 'chat')}`;
  const outPath = path.join(outputDir, `${safeName}.md`);
  
  fs.writeFileSync(outPath, mdContent, 'utf-8');
  console.log(`✅ Gespeichert unter: output/${safeName}.md\n`);
}

console.log(`🎉 Fertig! ${successCount} Chats als Markdown exportiert.`);