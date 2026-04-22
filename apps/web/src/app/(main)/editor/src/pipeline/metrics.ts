export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0)
  );

  for (let i = 0; i <= m; i++) {
    const row = dp[i];
    if (row) {
      row[0] = i;
    }
  }
  const firstRow = dp[0];
  if (firstRow) {
    for (let j = 0; j <= n; j++) {
      firstRow[j] = j;
    }
  }

  for (let i = 1; i <= m; i++) {
    const row = dp[i];
    const prevRow = dp[i - 1];
    if (!row || !prevRow) {
      continue;
    }
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const up = prevRow[j];
      const left = row[j - 1];
      const diag = prevRow[j - 1];
      if (up === undefined || left === undefined || diag === undefined) {
        continue;
      }
      const cb = b.charCodeAt(j - 1);
      const cost = ca === cb ? 0 : 1;
      row[j] = Math.min(up + 1, left + 1, diag + cost);
    }
  }
  const lastRow = dp[m];
  return lastRow?.[n] ?? 0;
}

export function editDistanceRatio(a: string, b: string): number {
  if (!a.length && !b.length) return 0;
  return levenshtein(a, b) / Math.max(a.length, b.length, 1);
}
