// src/core/markdown.ts
import { LinearMessage } from './types';

export function generateMarkdown(title: string, messages: LinearMessage[]): string {
  let md = `# ${title}\n\n`;

  // Optional: Metadaten für Obsidian/Logseq hinzufügen
  md += `---\n`;
  md += `date: ${new Date().toISOString().split('T')[0]}\n`;
  md += `source: ChatGPT\n`;
  md += `---\n\n`;

  for (const msg of messages) {
    if (msg.role === 'user') {
      md += `## 🧑 User\n\n${msg.text}\n\n---\n\n`;
    } else if (msg.role === 'assistant') {
      md += `## 🤖 Assistant\n\n${msg.text}\n\n---\n\n`;
    }
  }

  return md;
}

/**
 * Hilfsfunktion: Bereinigt den Titel für sichere Dateinamen
 */
export function sanitizeFilename(title: string): string {
  return title
    .replace(/[^a-z0-9äöüß\s-]/gi, '') // Entferne Sonderzeichen
    .trim()
    .replace(/\s+/g, '-') // Ersetze Leerzeichen durch Bindestriche
    .toLowerCase();
}
