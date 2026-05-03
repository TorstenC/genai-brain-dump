# 🧠 GenAI Brain Dump

> *"Das Denkarium für deine KI-Gespräche. Extrahiert ChatGPT & Co. Threads anhand von .har-Files und speichert sie als durchsuchbare Datenbasis."*

## 🎯 Das Problem: Die GenAI-Demenz

Wer intensiv mit Large Language Models (LLMs) wie ChatGPT, Claude oder Gemini arbeitet, kennt das Problem: Man führt brillante, komplexe Diskussionen, erarbeitet Architektur-Konzepte oder generiert wertvollen Code – und ein paar Wochen später weiß man nicht mehr, in welchem Thread (oder bei welchem Vendor) das besprochen wurde. Die plattformeigenen Suchfunktionen sind oft unzureichend oder gar nicht vorhanden.

**Die Lösung:** `genai-brain-dump` ist ein Open-Source-Tool, das deine Chat-Historien vendor-übergreifend extrahiert, lokal persistiert und vollständig durchsuchbar macht. 100% Privacy, keine Cloud, deine Daten gehören dir.

## 🚀 Evolutionsstufen & Architektur

Um schnell Ergebnisse zu erzielen und gleichzeitig flexibel für ein optimales UX-Erlebnis zu bleiben, entwickeln wir dieses Projekt in zwei Phasen. Der Kern beider Phasen ist in **TypeScript** geschrieben, um die Extraktionslogik wiederverwenden zu können.

### Phase 1: Der isolierte Core-Extraktor (CLI)

In der ersten Phase bauen wir die grundlegende Parsing-Logik.

* **Input:** Exportierte `.har`-Dateien (HTTP Archive) aus dem Browser.
* **Prozess:** Ein lokales Node.js-Skript filtert die relevanten API-Responses aus dem Netzwerk-Dump heraus und rekonstruiert die Chat-Verläufe (z. B. das Abflachen der komplexen ChatGPT-JSON-Bäume).
* **Output:** Standardisierte JSON-Objekte und Markdown-Dateien (`.md`), die man bereits in Tools wie Obsidian oder VS Code durchsuchen kann.

### Phase 2: Die "Zero-Install" Web UI & Datenbasis

Sobald die Kernlogik stabil ist, gießen wir den Code in ein lokales Frontend (Client-side Web App).

* **UX:** Der Nutzer zieht sein `.har`-File per Drag & Drop einfach in den Browser.
* **Speicher:** Die extrahierten Chats werden lokal in der `IndexedDB` des Browsers abgelegt (kein Backend, keine Daten verlassen den Rechner).
* **Features:** Eine pfeilschnelle Volltextsuche über alle historischen Chats aller Vendoren.
* **Datenhoheit:** Eine Export-Funktion (Disketten-Icon), um die gesamte Datenbasis als `.zip` (Markdown-Archiv) oder JSON-Dump herunterzuladen, um sie vor flüchtigem Browser-Cache zu schützen.

## 🛠️ Tech Stack

<!-- markdownlint-disable MD049 -->
* **Sprache:** TypeScript (für maximale Wiederverwendbarkeit in CLI und Web-Frontend).
* _(Weitere Frameworks für Phase 2 folgen nach Evaluierung, z.B. Vite, React/Vue)._

## 🤝 Mitmachen
<!-- markdownlint-disable MD036 -->
_(Hinweis: Dieses Projekt ist aktuell in der frühen Aufbauphase. Die primäre Sprache im Repository ist vorerst Deutsch. Ein Issue zur späteren Internationalisierung (Englisch) ist eingeplant.)_

---
_Initial commit: Denkarium aufgestellt. Erste Erinnerungsfäden sicher extrahiert._ 🧪

<!-- <https://gemini.google.com/app/3a1a36696fd9f9de> -->