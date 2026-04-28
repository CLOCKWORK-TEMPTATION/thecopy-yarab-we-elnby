"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { logger } from "@/lib/ai/utils/logger";
import {
  arrayBufferToBase64,
  deriveAuthVerifier,
  deriveKEK,
  encryptData,
  generateIV,
  generateRecoveryKey,
  generateSalt,
  getKeyManager,
  uint8ArrayToBase64,
} from "@/lib/crypto";

/**
 * نموذج تسجيل Zero-Knowledge
 * Zero-Knowledge Signup Form
 *
 * المبادئ:
 * 1. اشتقاق KEK و authVerifier من كلمة المرور
 * 2. إرسال authVerifier فقط إلى السيرفر
 * 3. KEK يبقى في الذاكرة فقط
 * 4. توليد وعرض Recovery Key
 */

export function ZKSignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"signup" | "recovery">("signup");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // التحقق من تطابق كلمات المرور
    if (password !== confirmPassword) {
      setError("كلمات المرور غير متطابقة");
      return;
    }

    // التحقق من قوة كلمة المرور
    if (password.length < 12) {
      setError("كلمة المرور يجب أن تكون 12 حرفاً على الأقل");
      return;
    }

    setIsLoading(true);

    try {
      // 1. توليد Salt عشوائي
      const kdfSalt = generateSalt();
      const kdfSaltBase64 = uint8ArrayToBase64(kdfSalt);

      // 2. اشتقاق authVerifier (للمصادقة)
      const authVerifierBytes = await deriveAuthVerifier(password, kdfSalt);
      const authVerifier = uint8ArrayToBase64(authVerifierBytes);

      // 3. اشتقاق KEK (للتشفير - يبقى في الذاكرة)
      const kek = await deriveKEK(password, kdfSalt);

      // 4. توليد Recovery Key
      const recoveryKeyStr = generateRecoveryKey();
      setRecoveryKey(recoveryKeyStr);

      // 5. إنشاء Recovery Artifact (مشفر بواسطة Recovery Key)
      const recoveryArtifact = await createRecoveryArtifact(
        recoveryKeyStr,
        kdfSaltBase64
      );

      // 6. إرسال البيانات إلى السيرفر (بدون KEK!)
      const response = await fetch("/api/auth/zk-signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          authVerifier,
          kdfSalt: kdfSaltBase64,
          recoveryArtifact: recoveryArtifact.ciphertext,
          recoveryIv: recoveryArtifact.iv,
        }),
      });

      const json: unknown = await response.json();
      const data = json as { success?: boolean; error?: string };

      if (!data.success) {
        setError(data.error ?? "فشل التسجيل");
        return;
      }

      // 7. حفظ KEK في الذاكرة
      const keyManager = getKeyManager();
      keyManager.setKEK(kek);

      // 8. الانتقال إلى عرض Recovery Key
      setStep("recovery");
    } catch (err) {
      logger.error("خطأ في التسجيل:", err);
      setError("حدث خطأ أثناء التسجيل");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoveryKeySaved = () => {
    router.push("/dashboard");
  };

  if (step === "recovery") {
    return (
      <div
        className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md"
        dir="rtl"
      >
        <h2 className="text-2xl font-bold mb-4 text-red-600">
          ⚠️ مفتاح الاسترداد - احفظه الآن!
        </h2>
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded p-4 mb-4">
          <p className="text-sm mb-2">
            هذا هو مفتاح الاسترداد الوحيد. إذا فقدت كلمة المرور، ستحتاج هذا
            المفتاح لاستعادة الوصول.
          </p>
          <div className="bg-white p-4 rounded border border-gray-300 font-mono text-lg text-center select-all">
            {recoveryKey}
          </div>
        </div>
        <div className="bg-red-50 border border-red-300 rounded p-3 mb-4">
          <ul className="text-sm list-disc list-inside space-y-1">
            <li>احفظ هذا المفتاح في مكان آمن</li>
            <li>لن يتم عرضه مرة أخرى</li>
            <li>بدونه، لا يمكن استعادة البيانات إذا فقدت كلمة المرور</li>
          </ul>
        </div>
        <button
          onClick={handleRecoveryKeySaved}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
        >
          لقد حفظت المفتاح، المتابعة
        </button>
      </div>
    );
  }

  return (
    <div
      className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md"
      dir="rtl"
    >
      <h2 className="text-2xl font-bold mb-6">إنشاء حساب Zero-Knowledge</h2>

      <div className="bg-blue-50 border border-blue-300 rounded p-3 mb-4 text-sm">
        <p className="font-semibold mb-1">🔒 تشفير من طرف إلى طرف</p>
        <p className="text-xs">
          كلمة المرور لا تُرسل إلى السيرفر. جميع بياناتك مشفرة على جهازك.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 rounded p-3 mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label
            htmlFor="field-zksignupform-1"
            className="block text-sm font-medium mb-1"
          >
            البريد الإلكتروني
          </label>
          <input
            id="field-zksignupform-1"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            dir="ltr"
          />
        </div>

        <div>
          <label
            htmlFor="field-zksignupform-2"
            className="block text-sm font-medium mb-1"
          >
            كلمة المرور (12 حرفاً على الأقل)
          </label>
          <input
            id="field-zksignupform-2"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={12}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="field-zksignupform-3"
            className="block text-sm font-medium mb-1"
          >
            تأكيد كلمة المرور
          </label>
          <input
            id="field-zksignupform-3"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={12}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? "جارٍ التسجيل..." : "إنشاء حساب"}
        </button>
      </form>
    </div>
  );
}

/**
 * إنشاء Recovery Artifact
 */
async function createRecoveryArtifact(
  recoveryKey: string,
  kdfSalt: string
): Promise<{ ciphertext: string; iv: string }> {
  const encoder = new TextEncoder();
  const recoveryKeyBytes = encoder.encode(recoveryKey.replace(/-/g, ""));

  const recoveryKek = await crypto.subtle.importKey(
    "raw",
    recoveryKeyBytes.slice(0, 32),
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  const iv = generateIV();
  const aad = encoder.encode("recovery-artifact");

  const { ciphertext } = await encryptData(kdfSalt, recoveryKek, aad);

  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: uint8ArrayToBase64(iv),
  };
}
