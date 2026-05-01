"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { loginUser } from "@/lib/api";

export function resolveSafeLoginRedirect(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await loginUser(email, password);
      const currentSearch =
        typeof window === "undefined" ? "" : window.location.search;
      const redirectValue = new URLSearchParams(currentSearch).get("redirect");

      router.push(resolveSafeLoginRedirect(redirectValue));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "فشل تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 p-8">
        <h1 className="text-2xl font-bold text-center">تسجيل الدخول</h1>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded">{error}</div>
        )}

        <input
          type="email"
          name="email"
          autoComplete="email"
          placeholder="البريد الإلكتروني"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 border rounded"
          required
        />

        <input
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="كلمة المرور"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 border rounded"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "جاري التحميل..." : "دخول"}
        </button>

        <p className="text-center text-sm text-slate-600">
          ليس لديك حساب بعد؟{" "}
          <Link
            href="/register"
            className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
          >
            أنشئ حسابًا جديدًا
          </Link>
        </p>
      </form>
    </div>
  );
}
