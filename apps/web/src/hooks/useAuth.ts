import { useState, useEffect } from "react";

import { getCurrentUser } from "@/lib/api";

export function useAuth() {
  const [user, setUser] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchUser() {
      try {
        const userData = await getCurrentUser();
        if (mounted) {
          setUser(userData);
        }
      } catch {
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchUser().catch(() => {
      if (mounted) {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  return { user, loading };
}
