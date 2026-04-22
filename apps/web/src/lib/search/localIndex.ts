/**
 * Local Search Index
 * فهرس البحث المحلي في IndexedDB
 */

interface IndexedDocument {
  id: string;
  content: string;
  characters?: string[];
  scenes?: string[];
  lastIndexed: number;
}

interface SearchResult {
  docId: string;
  matches: SearchMatch[];
  score: number;
}

interface SearchMatch {
  line: number;
  text: string;
  context: string;
}

const DB_NAME = "the-copy-search-index";
const DB_VERSION = 1;
const STORE_NAME = "documents";

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("lastIndexed", "lastIndexed", { unique: false });
      }
    };
  });
}

export async function indexDocument(
  docId: string,
  content: string
): Promise<void> {
  const db = await openDB();
  const indexedDoc: IndexedDocument = {
    id: docId,
    content,
    characters: extractCharacters(content),
    scenes: extractScenes(content),
    lastIndexed: Date.now(),
  };
  const transaction = db.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const request = store.put(indexedDoc);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function searchIndex(query: string): Promise<SearchResult[]> {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, "readonly");
  const store = transaction.objectStore(STORE_NAME);
  const allDocs = await new Promise<IndexedDocument[]>((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const results: SearchResult[] = [];
  for (const doc of allDocs) {
    const matches = findMatches(doc.content, query.toLowerCase());
    if (matches.length > 0) {
      results.push({ docId: doc.id, matches, score: matches.length });
    }
  }
  return results;
}

function findMatches(content: string, query: string): SearchMatch[] {
  const lines = content.split("\n");
  const matches: SearchMatch[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.toLowerCase().includes(query)) {
      matches.push({
        line: i + 1,
        text: line,
        context: lines
          .slice(Math.max(0, i - 1), Math.min(lines.length, i + 2))
          .join("\n"),
      });
    }
  }
  return matches;
}

function extractCharacters(content: string): string[] {
  const characters = new Set<string>();
  content.split("\n").forEach((line) => {
    const match = line.match(/^([^:]+):/);
    const characterName = match?.[1]?.trim();
    if (characterName && characterName.length < 30) {
      characters.add(characterName);
    }
  });
  return Array.from(characters);
}

function extractScenes(content: string): string[] {
  return content
    .split("\n")
    .filter((line) => line.includes("مشهد") || line.match(/^(INT\.|EXT\.)/));
}

export async function clearIndex(): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
