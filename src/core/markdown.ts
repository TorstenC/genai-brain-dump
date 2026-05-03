// src/core/markdown.ts
import { LinearMessage } from './types';

export function generateMarkdown(title: string, messages: LinearMessage[]): string {
  let md = '';
  md += `---\n`;
  md += `date: ${new Date().toISOString().split('T')[0]}\n`;
  md += `source: ChatGPT\n`;
  md += `---\n\n`;
  md += `# ${title}\n`;
  md += `<!-- markdownlint-disable MD036 -->\n`

  let counter = 1
  for (const msg of messages) {
    if (msg.role === 'user') {
      md += `## 🧑 User (${counter})\n\n${msg.text}\n\n---\n\n`;
    } else if (msg.role === 'assistant') {
      md += `## 🤖 Assistant (${counter})\n\n${msg.text}\n\n---\n\n`;
    }
    counter += 1;
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
