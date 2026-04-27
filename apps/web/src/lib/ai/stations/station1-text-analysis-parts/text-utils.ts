export const CHUNK_SIZE = 25000;
export const MAX_PARALLEL_REQUESTS = 3;

export function chunkText(text: string): string[] {
  if (text.length <= CHUNK_SIZE) {
    return [text];
  }

  const chunks: string[] = [];
  let position = 0;

  while (position < text.length) {
    const chunkEnd = Math.min(position + CHUNK_SIZE, text.length);
    let actualEnd = chunkEnd;

    if (chunkEnd < text.length) {
      const lastPeriod = text.lastIndexOf(".", chunkEnd);
      const lastNewline = text.lastIndexOf("\n", chunkEnd);
      const breakPoint = Math.max(lastPeriod, lastNewline);

      if (breakPoint > position && breakPoint > chunkEnd - 1000) {
        actualEnd = breakPoint + 1;
      }
    }

    chunks.push(text.slice(position, actualEnd));
    position = actualEnd;
  }

  return chunks;
}

export function calculateTextStatistics(text: string): {
  totalWords: number;
  totalCharacters: number;
  avgSentenceLength: number;
  dialoguePercentage: number;
  narrativePercentage: number;
} {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

  const dialogueMatches = text.match(/["“”«»].*?["“”«»]/g) ?? [];
  const dialogueText = dialogueMatches.join(" ");
  const dialogueWords = dialogueText.split(/\s+/).filter((w) => w.length > 0);

  const totalWords = words.length;
  const dialoguePercentage =
    totalWords > 0 ? (dialogueWords.length / totalWords) * 100 : 0;

  return {
    totalWords,
    totalCharacters: text.length,
    avgSentenceLength: sentences.length > 0 ? totalWords / sentences.length : 0,
    dialoguePercentage: Math.round(dialoguePercentage * 10) / 10,
    narrativePercentage: Math.round((100 - dialoguePercentage) * 10) / 10,
  };
}

export async function processInBatches<T, R>(
  items: T[],
  batchSize: number,
  processor: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
  }

  return results;
}
