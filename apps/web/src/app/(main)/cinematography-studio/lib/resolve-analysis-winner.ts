export type AnalysisWinnerSource = "remote" | "local-fallback";

export interface AnalysisWinner<T> {
  source: AnalysisWinnerSource;
  value: T;
}

interface ResolveAnalysisWinnerOptions<T> {
  remote: Promise<T | null>;
  local: Promise<T | null>;
}

/**
 * يحسم أول نتيجة صالحة بين المسار البعيد والبديل المحلي.
 * النتيجة غير الصالحة لا تُنهي السباق، بل تترك الفرصة للمسار الآخر.
 */
export async function resolveAnalysisWinner<T>({
  remote,
  local,
}: ResolveAnalysisWinnerOptions<T>): Promise<AnalysisWinner<T> | null> {
  return new Promise((resolve) => {
    let settled = false;
    let remaining = 2;

    const handleResult = (
      source: AnalysisWinnerSource,
      value: T | null
    ): void => {
      if (settled) {
        return;
      }

      if (value) {
        settled = true;
        resolve({ source, value });
        return;
      }

      remaining -= 1;
      if (remaining === 0) {
        settled = true;
        resolve(null);
      }
    };

    void remote
      .then((value) => {
        handleResult("remote", value);
      })
      .catch(() => {
        handleResult("remote", null);
      });

    void local
      .then((value) => {
        handleResult("local-fallback", value);
      })
      .catch(() => {
        handleResult("local-fallback", null);
      });
  });
}
