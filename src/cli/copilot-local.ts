import fs from 'fs';
import path from 'path';
import { generateMarkdown, sanitizeFilename } from '../core/markdown';
import { parseCopilotLocalFile } from '../core/parsers/copilot-local';
import { CopilotLocalInventory, CopilotLocalInventoryItem, CopilotLocalStatus } from '../core/types';
import {
  scanCopilotChatStorage,
  resolveCopilotWorkspaceStoragePath,
  COPILOT_WORKSPACE_STORAGE,
} from '../core/inventory/copilot-local-inventory';
import {
  DEFAULT_INVENTORY_FILE,
  loadInventoryIndex,
  mergeInventory,
  saveInventoryIndex,
} from '../core/inventory/inventory-store';

interface CliOptions {
  sessionId?: string;
  status?: CopilotLocalStatus | 'all';
  first?: number;
}

function buildShortOutputName(title: string, sessionId: string): string {
  const fullSlug = sanitizeFilename(title || 'copilot-local-chat') || 'copilot-local-chat';
  const shortSlug = fullSlug.length > 45 ? `${fullSlug.slice(0, 45)}...` : fullSlug;
  const shortId = sessionId.slice(0, 8);
  return `${shortSlug}-${shortId}`;
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--sessionId' && args[i + 1]) {
      options.sessionId = args[i + 1];
      i++;
      continue;
    }

    if (arg === '--status' && args[i + 1]) {
      const status = args[i + 1] as CliOptions['status'];
      if (status === 'neu' || status === 'archiviert' || status === 'verworfen' || status === 'todo' || status === 'all') {
        options.status = status;
      }
      i++;
      continue;
    }

    if (arg === '--first' && args[i + 1]) {
      const parsed = Number(args[i + 1]);
      if (Number.isInteger(parsed) && parsed > 0) {
        options.first = parsed;
      }
      i++;
    }
  }

  return options;
}

function buildInventory(scanned: CopilotLocalInventoryItem[]): CopilotLocalInventory {
  const existing = loadInventoryIndex(DEFAULT_INVENTORY_FILE);
  const merged = mergeInventory(existing.items, scanned);

  return {
    generatedAt: new Date().toISOString(),
    sourcePath: resolveCopilotWorkspaceStoragePath(),
    items: merged,
  };
}

function printStatusSummary(items: CopilotLocalInventoryItem[]): void {
  const counts = {
    neu: 0,
    archiviert: 0,
    verworfen: 0,
    todo: 0,
  };

  for (const item of items) {
    counts[item.status] += 1;
  }

  console.log('\nStatus-Uebersicht:');
  console.log(`- neu: ${counts.neu}`);
  console.log(`- todo: ${counts.todo}`);
  console.log(`- archiviert: ${counts.archiviert}`);
  console.log(`- verworfen: ${counts.verworfen}`);
}

function scanCommand(): number {
  const scanned = scanCopilotChatStorage();
  const inventory = buildInventory(scanned);
  saveInventoryIndex(inventory, DEFAULT_INVENTORY_FILE);

  console.log(`Pfad (konstant): ${COPILOT_WORKSPACE_STORAGE}`);
  console.log(`Aufgeloest nach: ${inventory.sourcePath}`);
  console.log(`Gefundene Chat-Dateien: ${inventory.items.length}`);

  printStatusSummary(inventory.items);

  const preview = inventory.items.slice(0, 10);
  if (preview.length > 0) {
    console.log('\nVorschau (max 10):');
    for (const item of preview) {
      const date = item.creationDate || '-';
      console.log(`- [${item.status}] ${item.sessionId} | ${item.format} | src:${item.sources.length} | ${date} | ${item.title}`);
    }
  }

  console.log(`\nIndex gespeichert: ${DEFAULT_INVENTORY_FILE}`);
  return 0;
}

function filterTargets(items: CopilotLocalInventoryItem[], options: CliOptions): CopilotLocalInventoryItem[] {
  let selected = items;

  if (options.sessionId) {
    selected = selected.filter((item) => item.sessionId === options.sessionId);
  }

  if (options.status && options.status !== 'all') {
    selected = selected.filter((item) => item.status === options.status);
  }

  if (options.first) {
    selected = selected.slice(0, options.first);
  }

  return selected;
}

function getCandidateSourcePaths(item: CopilotLocalInventoryItem): string[] {
  const ordered = [item.filePath, ...item.sources.map((source) => source.filePath)];
  const unique: string[] = [];
  const seen = new Set<string>();

  for (const candidate of ordered) {
    if (!candidate || seen.has(candidate)) continue;
    seen.add(candidate);
    unique.push(candidate);
  }

  return unique;
}

function extractCommand(options: CliOptions): number {
  const inventory = loadInventoryIndex(DEFAULT_INVENTORY_FILE);

  if (inventory.items.length === 0) {
    console.error('Keine Inventory-Eintraege gefunden. Bitte zuerst scan ausfuehren.');
    return 1;
  }

  const targets = filterTargets(inventory.items, options);
  if (targets.length === 0) {
    console.error('Keine passenden Chats fuer die Filter gefunden.');
    return 1;
  }

  const outputDir = path.join(process.cwd(), 'output', 'copilot-local');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let success = 0;

  for (const item of targets) {
    let parsed = null;
    let parsedFrom = item.filePath;

    for (const candidatePath of getCandidateSourcePaths(item)) {
      const candidateParsed = parseCopilotLocalFile(candidatePath);
      if (candidateParsed) {
        parsed = candidateParsed;
        parsedFrom = candidatePath;
        break;
      }
    }

    if (!parsed) {
      console.warn(`Uebersprungen (nicht parsebar): ${item.filePath}`);
      continue;
    }

    const vendor = 'Copilot Local';
    const md = generateMarkdown(parsed.title, parsed.messages, vendor, {
      sessionId: item.sessionId,
      sourceFile: parsedFrom,
    });
    const safeName = buildShortOutputName(parsed.title, item.sessionId);
    const outPath = path.join(outputDir, `${safeName}.md`);

    fs.writeFileSync(outPath, md, 'utf-8');

    item.lastProcessed = new Date().toISOString();
    item.status = 'archiviert';
    success++;

    console.log(`Exportiert: ${outPath}`);
  }

  inventory.generatedAt = new Date().toISOString();
  saveInventoryIndex(inventory, DEFAULT_INVENTORY_FILE);

  console.log(`\nFertig: ${success} Chat(s) exportiert.`);
  return 0;
}

function printUsage(): void {
  console.log('Usage: ts-node src/cli/copilot-local.ts <scan|extract> [options]');
  console.log('');
  console.log('Commands:');
  console.log('  scan');
  console.log('  extract --sessionId <uuid>');
  console.log('  extract --status todo --first 1');
  console.log('');
  console.log('Status-Filter: neu | todo | archiviert | verworfen | all');
}

function main(): number {
  const [command, ...args] = process.argv.slice(2);
  const options = parseArgs(args);

  if (command === 'scan') {
    return scanCommand();
  }

  if (command === 'extract') {
    return extractCommand(options);
  }

  printUsage();
  return 1;
}

const exitCode = main();
if (exitCode !== 0) {
  process.exitCode = exitCode;
}
