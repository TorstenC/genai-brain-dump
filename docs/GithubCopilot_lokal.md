# Parser für lokale Chats mit GitHub Copilot

Anhand eines Beispiel-Strings haben wir gefunden:

```bash
$ cd ~/.config/Code/User/workspaceStorage/
$ grep -rl 'Next-Flight-Inline-Payload' . 2> dev/null
./bf27dc39d8eef6ff14622ff4889e5c6f/chatSessions/de24d3d5-4552-462d-a3de-a127c6a07ad0.jsonl
./bf27dc39d8eef6ff14622ff4889e5c6f/GitHub.copilot-chat/transcripts/de24d3d5-4552-462d-a3de-a127c6a07ad0.jsonl
```

## Struktur der .jsonl-Dateien (Analyse)

Es gibt zwei relevante JSONL-Formate:

1. `GitHub.copilot-chat/transcripts/*.jsonl` (Event-Stream)
2. `chatSessions/*.jsonl` (konsolidierte Session-Daten)

### 1) Event-Stream (`transcripts`)

Jede Zeile ist ein eigenstaendiges JSON-Event mit gemeinsamen Feldern wie:

- `type` (z. B. `session.start`, `user.message`, `assistant.message`)
- `data` (event-spezifischer Payload)
- `id` (UUID)
- `timestamp` (ISO-8601)
- `parentId` (Verkettung im Event-Baum)

Beispielhafte Rollen-/Inhaltszuordnung:

- `type = user.message` -> `data.content` ist User-Text
- `type = assistant.message` -> `data.content` ist Assistant-Text

Metadaten:

- `session.start` enthaelt u. a. `data.startTime`, `data.sessionId`, Versionsinfos

### 2) Konsolidiert (`chatSessions`)

Die Datei ist patch-basiert und nutzt `kind`:

- `kind = 0`: Basis-Metadaten (`v.version`, `v.creationDate`, `v.sessionId`, ggf. `v.customTitle`)
- `kind = 1`: Feld-Updates (`k` = Feldpfad, `v` = Wert), z. B. `customTitle`
- `kind = 2`: Array-Updates, hier insbesondere `k[0] = requests`

Die eigentlichen Chat-Inhalte liegen typischerweise in den `requests`-Eintraegen.

### Beobachtungen

- Beide Formate koennen dieselbe Session-ID enthalten (doppelte Quelle pro Chat moeglich).
- Zeitinformationen sind konsistent nutzbar (`timestamp` oder `creationDate`).
- Titel sind nicht immer vorhanden; Fallback ueber erste User-Nachricht ist sinnvoll.
- Einzelne Zeilen koennen unvollstaendig/ungueltig sein; parser-seitiges `skip` ist erforderlich.

### Umsetzungsentscheidung fuer den Parser

- Format-Erkennung ueber erste parsebare Zeile:
	- `kind` vorhanden -> `consolidated`
	- `type` oder `parentId` vorhanden -> `event-stream`
- Event-Stream wird zeilenweise gefiltert auf `user.message` und `assistant.message`.
- Konsolidiertes Format wird patch-sequenziell gelesen, danach werden `requests` extrahiert.
