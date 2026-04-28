// src/core/test.ts
import fs from 'fs';
import path from 'path';
import { extractChatGPTApiResponses } from './extractor';
import { HarLog } from './types';

// 1. Datei einlesen (Node.js spezifisch)
const filePath = path.join(process.cwd(), 'test-data.json');
const fileContent = fs.readFileSync(filePath, 'utf-8');

// 2. Parsen
const harData = JSON.parse(fileContent) as HarLog;

// 3. Unsere reine TS-Logik aufrufen
const rawChats = extractChatGPTApiResponses(harData);

console.log(`Es wurden ${rawChats.length} Chat-Verläufe in der HAR-Datei gefunden!`);

if (rawChats.length > 0) {
    console.log("Erster Chat-JSON-Auszug (erste 200 Zeichen):");
    console.log(rawChats[0].substring(0, 200) + "...");
}
