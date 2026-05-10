// src/core/types.ts

export interface HarEntry {
  request: {
    method: string;
    url: string;
  };
  response: {
    status: number;
    content: {
      mimeType: string;
      text?: string; // Hier liegt das wertvolle JSON der API-Antwort
    };
  };
}

export interface HarLog {
  log: {
    entries: HarEntry[];
  };
}

// src/core/types.ts (Ergänzung)

export interface ChatAuthor {
  role: 'user' | 'assistant' | 'system' | 'tool' | string;
}

export interface ChatContent {
  content_type: string;
  parts?: any[]; // Kann Strings oder Objekte (bei Bildern) enthalten
}

export interface ChatMessage {
  id: string;
  author: ChatAuthor;
  create_time: number | null;
  content: ChatContent;
}

export interface ChatNode {
  id: string;
  message?: ChatMessage | null;
  parent: string | null;
  children: string[];
}

export interface ChatGPTData {
  title: string;
  current_node: string;
  mapping: { [key: string]: ChatNode };
}

export interface LinearMessage {
  role: string;
  text: string;
}

// in src/core/types.ts ergänzen:
export interface ExtractedChat {
  vendor: 'ChatGPT' | 'Copilot' | 'Gemini';
  title: string;
  messages: LinearMessage[];
}

export type CopilotLocalStatus = 'neu' | 'archiviert' | 'verworfen' | 'todo';

export type CopilotLocalFormat = 'event-stream' | 'consolidated';

export interface CopilotLocalEventLine {
  type: string;
  data?: {
    content?: string;
    startTime?: string;
    sessionId?: string;
    [key: string]: any;
  };
  id?: string;
  timestamp?: string;
  parentId?: string | null;
}

export interface CopilotLocalConsolidatedLine {
  kind: number;
  k?: string[];
  v?: any;
}

export interface CopilotLocalInventorySource {
  format: CopilotLocalFormat;
  filePath: string;
  creationDate: string | null;
  title: string;
}

export interface CopilotLocalInventoryItem {
  sessionId: string;
  title: string;
  creationDate: string | null;
  format: CopilotLocalFormat;
  filePath: string;
  status: CopilotLocalStatus;
  lastProcessed: string | null;
  sources: CopilotLocalInventorySource[];
}

export interface CopilotLocalInventory {
  generatedAt: string;
  sourcePath: string;
  items: CopilotLocalInventoryItem[];
}

// Später bauen wir hier noch die Typen für den ChatGPT-Baum (mapping, message, author) ein.
