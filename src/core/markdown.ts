// src/core/markdown.ts
import { LinearMessage } from './types';

export function generateMarkdown(title: string, messages: LinearMessage[], vendor: string): string {
  let md = '';
  md += `---\n`;
  md += `date: ${new Date().toISOString().split('T')[0]}\n`;
  md += `source: ${vendor}\n`;
  md += `---\n\n`;
  md += `# ${title}\n`;
  md += `<!-- markdownlint-disable MD036 -->\n`

  let counter = 1
  for (const msg of messages) {
    const roleIcon = msg.role === 'user' ? '🧑 User' : '🤖 Assistant';
    md += `## ${roleIcon} (${counter})\n\n${msg.text}\n\n---\n\n`;
    counter++;
  }

  return md;
}

export function sanitizeFilename(title: string): string {
  return title.replace(/[^a-z0-9äöüß\s-]/gi, '').trim().replace(/\s+/g, '-').toLowerCase();
}
