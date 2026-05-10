import fs from 'fs';
import path from 'path';
import {
  CopilotLocalInventory,
  CopilotLocalInventoryItem,
  CopilotLocalInventorySource,
} from '../types';
import { resolveCopilotWorkspaceStoragePath } from './copilot-local-inventory';

export const DEFAULT_INVENTORY_FILE = path.join(process.cwd(), 'output', 'copilot-local-inventory.yaml');

function ensureParentDirectory(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function yamlQuote(value: string): string {
  return JSON.stringify(value);
}

function parseYamlScalar(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === 'null') return null;

  if (trimmed.startsWith('"')) {
    try {
      const parsed = JSON.parse(trimmed);
      return typeof parsed === 'string' ? parsed : null;
    } catch {
      return null;
    }
  }

  return trimmed.length > 0 ? trimmed : null;
}

export function serializeInventoryToYaml(inventory: CopilotLocalInventory): string {
  const lines: string[] = [];

  lines.push(`generatedAt: ${yamlQuote(inventory.generatedAt)}`);
  lines.push(`sourcePath: ${yamlQuote(inventory.sourcePath)}`);
  lines.push('items:');

  for (const item of inventory.items) {
    lines.push(`  - sessionId: ${yamlQuote(item.sessionId)}`);
    lines.push(`    title: ${yamlQuote(item.title)}`);
    lines.push(`    creationDate: ${item.creationDate ? yamlQuote(item.creationDate) : 'null'}`);
    lines.push(`    format: ${yamlQuote(item.format)}`);
    lines.push(`    filePath: ${yamlQuote(item.filePath)}`);
    lines.push(`    status: ${yamlQuote(item.status)}`);
    lines.push(`    lastProcessed: ${item.lastProcessed ? yamlQuote(item.lastProcessed) : 'null'}`);
    lines.push('    sources:');

    for (const source of item.sources) {
      lines.push(`      - format: ${yamlQuote(source.format)}`);
      lines.push(`        filePath: ${yamlQuote(source.filePath)}`);
      lines.push(`        creationDate: ${source.creationDate ? yamlQuote(source.creationDate) : 'null'}`);
      lines.push(`        title: ${yamlQuote(source.title)}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

export function loadInventoryIndex(filePath = DEFAULT_INVENTORY_FILE): CopilotLocalInventory {
  if (!fs.existsSync(filePath)) {
    return {
      generatedAt: new Date(0).toISOString(),
      sourcePath: resolveCopilotWorkspaceStoragePath(),
      items: [],
    };
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);

  let generatedAt = new Date(0).toISOString();
  let sourcePath = resolveCopilotWorkspaceStoragePath();
  const items: CopilotLocalInventoryItem[] = [];

  let current: CopilotLocalInventoryItem | null = null;
  let currentSource: CopilotLocalInventorySource | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.startsWith('generatedAt:')) {
      const parsed = parseYamlScalar(line.slice('generatedAt:'.length));
      if (parsed) generatedAt = parsed;
      continue;
    }

    if (line.startsWith('sourcePath:')) {
      const parsed = parseYamlScalar(line.slice('sourcePath:'.length));
      if (parsed) sourcePath = parsed;
      continue;
    }

    if (line.startsWith('  - sessionId:')) {
      if (current && currentSource) {
        current.sources.push(currentSource);
        currentSource = null;
      }
      if (current) items.push(current);
      const parsed = parseYamlScalar(line.slice('  - sessionId:'.length)) || 'unknown-session';
      current = {
        sessionId: parsed,
        title: 'Copilot Local Chat',
        creationDate: null,
        format: 'event-stream',
        filePath: '',
        status: 'neu',
        lastProcessed: null,
        sources: [],
      };
      continue;
    }

    if (!current) continue;

    if (line.startsWith('    sources:')) {
      continue;
    }

    if (line.startsWith('      - format:')) {
      if (currentSource) {
        current.sources.push(currentSource);
      }

      const parsed = parseYamlScalar(line.slice('      - format:'.length));
      currentSource = {
        format: parsed === 'consolidated' ? 'consolidated' : 'event-stream',
        filePath: '',
        creationDate: null,
        title: current.title,
      };
      continue;
    }

    if (line.startsWith('        filePath:')) {
      if (currentSource) {
        currentSource.filePath = parseYamlScalar(line.slice('        filePath:'.length)) || '';
      }
      continue;
    }

    if (line.startsWith('        creationDate:')) {
      if (currentSource) {
        currentSource.creationDate = parseYamlScalar(line.slice('        creationDate:'.length));
      }
      continue;
    }

    if (line.startsWith('        title:')) {
      if (currentSource) {
        currentSource.title = parseYamlScalar(line.slice('        title:'.length)) || currentSource.title;
      }
      continue;
    }

    if (line.startsWith('    title:')) {
      current.title = parseYamlScalar(line.slice('    title:'.length)) || current.title;
      continue;
    }

    if (line.startsWith('    creationDate:')) {
      current.creationDate = parseYamlScalar(line.slice('    creationDate:'.length));
      continue;
    }

    if (line.startsWith('    format:')) {
      const parsed = parseYamlScalar(line.slice('    format:'.length));
      if (parsed === 'event-stream' || parsed === 'consolidated') {
        current.format = parsed;
      }
      continue;
    }

    if (line.startsWith('    filePath:')) {
      current.filePath = parseYamlScalar(line.slice('    filePath:'.length)) || current.filePath;
      continue;
    }

    if (line.startsWith('    status:')) {
      const parsed = parseYamlScalar(line.slice('    status:'.length));
      if (parsed === 'neu' || parsed === 'archiviert' || parsed === 'verworfen' || parsed === 'todo') {
        current.status = parsed;
      }
      continue;
    }

    if (line.startsWith('    lastProcessed:')) {
      current.lastProcessed = parseYamlScalar(line.slice('    lastProcessed:'.length));
      continue;
    }
  }

  if (current && currentSource) {
    current.sources.push(currentSource);
    currentSource = null;
  }

  if (current) items.push(current);

  // Backward compatibility for older inventory files without sources section.
  for (const item of items) {
    if (!item.sources || item.sources.length === 0) {
      item.sources = [
        {
          format: item.format,
          filePath: item.filePath,
          creationDate: item.creationDate,
          title: item.title,
        },
      ];
    }
  }

  return { generatedAt, sourcePath, items };
}

export function saveInventoryIndex(inventory: CopilotLocalInventory, filePath = DEFAULT_INVENTORY_FILE): void {
  ensureParentDirectory(filePath);
  fs.writeFileSync(filePath, serializeInventoryToYaml(inventory), 'utf-8');
}

function makeItemKey(item: CopilotLocalInventoryItem): string {
  return `${item.sessionId}::${item.format}::${item.filePath}`;
}

export function mergeInventory(
  existingItems: CopilotLocalInventoryItem[],
  scannedItems: CopilotLocalInventoryItem[]
): CopilotLocalInventoryItem[] {
  const existingByKey = new Map(existingItems.map((item) => [makeItemKey(item), item]));
  const existingBySessionId = new Map<string, CopilotLocalInventoryItem[]>();

  for (const item of existingItems) {
    const list = existingBySessionId.get(item.sessionId) || [];
    list.push(item);
    existingBySessionId.set(item.sessionId, list);
  }

  return scannedItems.map((scanned) => {
    const key = makeItemKey(scanned);
    let prev = existingByKey.get(key);

    if (!prev) {
      const sameSession = existingBySessionId.get(scanned.sessionId) || [];
      const preferred = sameSession.find((item) => item.format === scanned.format) || sameSession[0];
      prev = preferred;
    }

    if (!prev) return scanned;

    return {
      ...scanned,
      status: prev.status,
      lastProcessed: prev.lastProcessed,
      title: prev.title || scanned.title,
      sources: scanned.sources,
    };
  });
}
