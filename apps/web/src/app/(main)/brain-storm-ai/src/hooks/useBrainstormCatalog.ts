"use client";

import { useEffect, useState } from "react";

import { fetchBrainstormCatalog } from "../lib/catalog";

import type { BrainstormCatalog } from "../types";

export function useBrainstormCatalog() {
  const [catalog, setCatalog] = useState<BrainstormCatalog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetchBrainstormCatalog()
      .then((result) => {
        if (!cancelled) {
          setCatalog(result);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "فشل تحميل كتالوج Brain Storm AI"
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    catalog,
    isLoading,
    error,
  };
}
