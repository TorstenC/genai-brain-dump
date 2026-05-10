// src/core/markdown.ts
import { LinearMessage } from './types';

function frontmatterValue(value: string | number | boolean | null): string {
  if (value === null) return 'null';
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}

export function generateMarkdown(
  title: string,
  messages: LinearMessage[],
  vendor: string,
  extraFrontmatter: Record<string, string | number | boolean | null> = {}
): string {
  let md = '';
  md += `---\n`;
  md += `date: ${new Date().toISOString().split('T')[0]}\n`;
  md += `source: ${vendor}\n`;

  for (const [key, value] of Object.entries(extraFrontmatter)) {
    md += `${key}: ${frontmatterValue(value)}\n`;
  }

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
