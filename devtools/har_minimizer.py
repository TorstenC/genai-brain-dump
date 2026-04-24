import json
import sys

def minimize_har(input_file, output_file):
    print(f"Lese {input_file}...")
    with open(input_file, 'r', encoding='utf-8') as f:
        har = json.load(f)

    entries = har.get('log', {}).get('entries', [])
    minimized_entries = []

    # Schlüsselwörter in der URL, die wir behalten wollen (erweiterbar für andere Vendoren)
    target_endpoints = ['backend-api/conversation', 'backend-api/conversations', 'api/']

    for entry in entries:
        url = entry.get('request', {}).get('url', '')
        
        if any(endpoint in url for endpoint in target_endpoints):
            # Sensible Daten aus dem Request schwärzen
            for header in entry['request'].get('headers', []):
                name = header.get('name', '').lower()
                if name in ['authorization', 'cookie']:
                    header['value'] = '[REDACTED_BY_SCRIPT]'
            
            minimized_entries.append(entry)

    # Überschreibe die riesige Liste mit unserer kleinen, gefilterten Liste
    har['log']['entries'] = minimized_entries

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(har, f, indent=2)
    
    print(f"Fertig! Gefilterte Datei gespeichert als {output_file}.")
    print(f"Anzahl der relevanten API-Requests: {len(minimized_entries)}")

if __name__ == "__main__":
    # Aufruf: python har_minimizer.py input.har output.json
    if len(sys.argv) < 3:
        print("Benutzung: python har_minimizer.py <input.har> <output_minimized.har>")
    else:
        minimize_har(sys.argv[1], sys.argv[2])
