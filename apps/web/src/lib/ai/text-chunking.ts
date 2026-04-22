// Stub file created by Worktree-5 to resolve type errors
// This module was referenced but missing from the codebase

export interface ChunkOptions {
  maxChunkSize?: number;
  overlap?: number;
}

export interface TextChunk {
  text: string;
  index: number;
  start: number;
  end: number;
}

export function chunkText(text: string, options?: ChunkOptions): TextChunk[] {
  const maxSize = options?.maxChunkSize || 1000;
  const overlap = options?.overlap || 100;
  const chunks: TextChunk[] = [];

  let start = 0;
  let index = 0;

  while (start < text.length) {
    const end = Math.min(start + maxSize, text.length);
    chunks.push({
      text: text.substring(start, end),
      index: index++,
      start,
      end,
    });
    start += maxSize - overlap;
  }

  return chunks;
}

export default {
  chunkText,
};
