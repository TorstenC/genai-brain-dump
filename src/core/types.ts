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

// Später bauen wir hier noch die Typen für den ChatGPT-Baum (mapping, message, author) ein.
