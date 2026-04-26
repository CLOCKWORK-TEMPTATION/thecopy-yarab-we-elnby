"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { registerUser } from "@/lib/api";

const PASSWORD_REQUIREMENTS_MESSAGE =
  "كلمة المرور يجب أن تكون 12 حرفًا على الأقل، وتحتوي على حرف كبير وحرف صغير ورقم ورمز خاص.";
const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!PASSWORD_PATTERN.test(password)) {
      setError(PASSWORD_REQUIREMENTS_MESSAGE);
      return;
    }

    setLoading(true);

    try {
      await registerUser(email, password);
      router.push("/");
    } catch (err: any) {
      setError(err.message ?? "فشل إنشاء الحساب");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 p-8">
        <h1 className="text-2xl font-bold text-center">إنشاء حساب</h1>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded">{error}</div>
        )}

        <input
          type="email"
          placeholder="البريد الإلكتروني"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 border rounded"
          required
        />

        <input
          type="password"
          placeholder="كلمة المرور القوية"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 border rounded"
          minLength={12}
          required
        />

        <p className="text-sm leading-6 text-slate-600">
          {PASSWORD_REQUIREMENTS_MESSAGE}
        </p>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "جاري التحميل..." : "إنشاء حساب"}
        </button>

        <p className="text-center text-sm text-slate-600">
          لديك حساب بالفعل؟{" "}
          <Link
            href="/login"
            className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
          >
            ارجع إلى تسجيل الدخول
          </Link>
        </p>
      </form>
    </div>
  );
}
