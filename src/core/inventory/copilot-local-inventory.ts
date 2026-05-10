import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  CopilotLocalFormat,
  CopilotLocalInventoryItem,
  CopilotLocalInventorySource,
  CopilotLocalStatus,
} from '../types';

export const COPILOT_WORKSPACE_STORAGE = '~/.config/Code/User/workspaceStorage';

export function resolveCopilotWorkspaceStoragePath(): string {
  return path.join(os.homedir(), '.config', 'Code', 'User', 'workspaceStorage');
}

function toIsoDate(input: unknown): string | null {
  if (typeof input === 'string' && input.trim().length > 0) {
    const date = new Date(input);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (typeof input === 'number' && Number.isFinite(input)) {
    const ms = input > 10_000_000_000 ? input : input * 1000;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  return null;
}

function normalizeTitle(input: unknown, fallback: string): string {
  if (typeof input !== 'string') return fallback;
  const oneLine = input.replace(/\s+/g, ' ').trim();
  return oneLine.length > 0 ? oneLine : fallback;
}

function readJsonlLines(filePath: string): any[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  const parsed: any[] = [];
  for (const line of lines) {
    try {
      parsed.push(JSON.parse(line));
    } catch {
      // Ignore malformed lines in inventory mode.
    }
  }
  return parsed;
}

function detectFormatFromFirstLine(parsedLines: any[]): CopilotLocalFormat | null {
  const first = parsedLines[0];
  if (!first || typeof first !== 'object') return null;

  if ('kind' in first) return 'consolidated';
  if ('type' in first || 'parentId' in first) return 'event-stream';
  return null;
}

function pickMetadataFromEventStream(parsedLines: any[], fallbackTitle: string): {
  title: string;
  creationDate: string | null;
} {
  let title = fallbackTitle;
  let creationDate: string | null = null;

  for (const line of parsedLines) {
    if (!creationDate && line?.timestamp) {
      creationDate = toIsoDate(line.timestamp);
    }

    if (line?.type === 'session.start') {
      creationDate = creationDate || toIsoDate(line?.data?.startTime);
    }

    if (line?.type === 'user.message' && typeof line?.data?.content === 'string') {
      const firstUser = normalizeTitle(line.data.content.slice(0, 80), fallbackTitle);
      if (firstUser !== fallbackTitle) {
        title = firstUser;
        break;
      }
    }
  }

  return { title, creationDate };
}

function pickMetadataFromConsolidated(parsedLines: any[], fallbackTitle: string): {
  title: string;
  creationDate: string | null;
} {
  let title = fallbackTitle;
  let creationDate: string | null = null;

  for (const line of parsedLines) {
    if (line?.kind === 0 && line?.v) {
      creationDate = creationDate || toIsoDate(line.v.creationDate);
      title = normalizeTitle(line.v.customTitle, title);
    }

    if (line?.kind === 1 && Array.isArray(line.k) && line.k[0] === 'customTitle') {
      title = normalizeTitle(line.v, title);
    }
  }

  return { title, creationDate };
}

function scanFolderForJsonl(folderPath: string): string[] {
  if (!fs.existsSync(folderPath)) return [];

  const entries = fs.readdirSync(folderPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.jsonl'))
    .map((entry) => path.join(folderPath, entry.name));
}

function defaultStatus(): CopilotLocalStatus {
  return 'neu';
}

function buildItem(filePath: string): CopilotLocalInventoryItem | null {
  const sessionId = path.basename(filePath, '.jsonl');
  const parsedLines = readJsonlLines(filePath);

  if (parsedLines.length === 0) return null;

  const format = detectFormatFromFirstLine(parsedLines);
  if (!format) return null;

  const fallbackTitle = `Copilot Local Chat ${sessionId}`;
  const metadata = format === 'event-stream'
    ? pickMetadataFromEventStream(parsedLines, fallbackTitle)
    : pickMetadataFromConsolidated(parsedLines, fallbackTitle);

  return {
    sessionId,
    title: metadata.title,
    creationDate: metadata.creationDate,
    format,
    filePath,
    status: defaultStatus(),
    lastProcessed: null,
    sources: [
      {
        format,
        filePath,
        creationDate: metadata.creationDate,
        title: metadata.title,
      },
    ],
  };
}

function isFallbackTitle(title: string): boolean {
  return title.startsWith('Copilot Local Chat ');
}

function preferItem(a: CopilotLocalInventoryItem, b: CopilotLocalInventoryItem): CopilotLocalInventoryItem {
  if (a.format === 'consolidated' && b.format !== 'consolidated') return a;
  if (b.format === 'consolidated' && a.format !== 'consolidated') return b;

  const aIsFallback = isFallbackTitle(a.title);
  const bIsFallback = isFallbackTitle(b.title);

  if (!aIsFallback && bIsFallback) return a;
  if (!bIsFallback && aIsFallback) return b;

  if (a.creationDate && b.creationDate) {
    return a.creationDate <= b.creationDate ? a : b;
  }

  if (a.creationDate && !b.creationDate) return a;
  if (b.creationDate && !a.creationDate) return b;

  return a;
}

function collapseDuplicateSessions(items: CopilotLocalInventoryItem[]): CopilotLocalInventoryItem[] {
  const bySession = new Map<string, CopilotLocalInventoryItem[]>();

  for (const item of items) {
    const list = bySession.get(item.sessionId) || [];
    list.push(item);
    bySession.set(item.sessionId, list);
  }

  const collapsed: CopilotLocalInventoryItem[] = [];

  for (const group of bySession.values()) {
    let selected = group[0];
    for (let i = 1; i < group.length; i++) {
      selected = preferItem(selected, group[i]);
    }

    // Keep the earliest known date in the merged view.
    const earliestDate = group
      .map((item) => item.creationDate)
      .filter((value): value is string => typeof value === 'string')
      .sort()[0] || null;

    const sourceMap = new Map<string, CopilotLocalInventorySource>();
    for (const entry of group) {
      const source = entry.sources[0] || {
        format: entry.format,
        filePath: entry.filePath,
        creationDate: entry.creationDate,
        title: entry.title,
      };
      const key = `${source.format}::${source.filePath}`;
      sourceMap.set(key, source);
    }

    const sources = Array.from(sourceMap.values()).sort((a, b) => {
      if (a.format === b.format) {
        return a.filePath.localeCompare(b.filePath);
      }
      return a.format === 'consolidated' ? -1 : 1;
    });

    collapsed.push({
      ...selected,
      creationDate: earliestDate || selected.creationDate,
      sources,
    });
  }

  return collapsed;
}

export function scanCopilotChatStorage(basePath = resolveCopilotWorkspaceStoragePath()): CopilotLocalInventoryItem[] {
  if (!fs.existsSync(basePath)) {
    return [];
  }

  const workspaceEntries = fs.readdirSync(basePath, { withFileTypes: true }).filter((entry) => entry.isDirectory());

  const found: CopilotLocalInventoryItem[] = [];

  for (const workspaceEntry of workspaceEntries) {
    const workspaceDir = path.join(basePath, workspaceEntry.name);

    const transcriptDir = path.join(workspaceDir, 'GitHub.copilot-chat', 'transcripts');
    const chatSessionsDir = path.join(workspaceDir, 'chatSessions');

    const candidateFiles = [
      ...scanFolderForJsonl(transcriptDir),
      ...scanFolderForJsonl(chatSessionsDir),
    ];

    for (const filePath of candidateFiles) {
      const item = buildItem(filePath);
      if (item) found.push(item);
    }
  }

  const deduplicated = collapseDuplicateSessions(found);

  deduplicated.sort((a, b) => {
    const aDate = a.creationDate || '';
    const bDate = b.creationDate || '';
    return aDate.localeCompare(bDate) || a.sessionId.localeCompare(b.sessionId);
  });

  return deduplicated;
}
