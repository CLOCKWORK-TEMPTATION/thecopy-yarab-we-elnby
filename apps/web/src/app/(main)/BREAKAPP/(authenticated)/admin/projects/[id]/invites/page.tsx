"use client";

/**
 * توليد رموز QR للدعوة — Project Invites
 *
 * @description
 * يسمح لمدير النظام بتوليد رمز QR جديد لدور محدد داخل
 * مشروع بعينه، مع عرض الصورة والنص ووقت الانتهاء وإتاحة النسخ.
 *
 * السبب: نظام المصادقة يعتمد على رموز QR قصيرة العمر،
 * ويحتاج المسؤول أداة سريعة لتوليدها وتوزيعها على الفريق.
 */

import { api } from "@the-copy/breakapp";
import { AxiosError } from "axios";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { toast } from "@/hooks/use-toast";

type InviteRole = "director" | "crew" | "runner" | "vendor";

interface InviteResponse {
  qr_token: string;
  expiresAt: string;
}

const ROLE_OPTIONS: readonly { value: InviteRole; label: string }[] = [
  { value: "director", label: "المخرج" },
  { value: "crew", label: "عضو الطاقم" },
  { value: "runner", label: "عامل التوصيل" },
  { value: "vendor", label: "المورد" },
];

export default function AdminProjectInvitesPage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id ?? "";

  const [role, setRole] = useState<InviteRole>("crew");
  const [expiresInMinutes, setExpiresInMinutes] = useState<number>(15);
  const [invite, setInvite] = useState<InviteResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleRoleChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>): void => {
      setRole(event.target.value as InviteRole);
    },
    []
  );

  const handleExpiryChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const next = Number.parseInt(event.target.value, 10);
      setExpiresInMinutes(Number.isFinite(next) && next > 0 ? next : 15);
    },
    []
  );

  const handleGenerate = useCallback(async (): Promise<void> => {
    if (!projectId) {
      toast({
        title: "معرّف المشروع مفقود",
        description: "تعذّر استخراج معرّف المشروع من الرابط",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post<InviteResponse>(
        `/admin/projects/${projectId}/invites`,
        {
          role,
          expiresInMinutes,
        }
      );
      setInvite(response.data);
      toast({
        title: "تم توليد الرمز",
        description: "يمكنك نسخه أو عرضه مباشرة",
      });
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      toast({
        title: "فشل توليد الرمز",
        description: axiosError.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, role, expiresInMinutes]);

  const handleCopy = useCallback(async (): Promise<void> => {
    if (!invite) {
      return;
    }
    try {
      await navigator.clipboard.writeText(invite.qr_token);
      toast({
        title: "تم النسخ",
        description: "رمز QR في الحافظة",
      });
    } catch {
      toast({
        title: "تعذّر النسخ",
        description: "المتصفح رفض الوصول إلى الحافظة",
        variant: "destructive",
      });
    }
  }, [invite]);

  const qrImageUrl = useMemo<string | null>(() => {
    if (!invite) {
      return null;
    }
    return `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(
      invite.qr_token
    )}`;
  }, [invite]);

  return (
    <div dir="rtl" className="min-h-screen bg-black/8 p-8 backdrop-blur-xl">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 font-cairo">
              رموز الدعوة
            </h1>
            <p className="text-white/55 font-cairo">
              توليد رمز QR لعضو جديد في المشروع {projectId || "—"}
            </p>
          </div>
          <Link
            href="/BREAKAPP/admin/projects"
            className="px-4 py-2 text-sm bg-white/6 text-white hover:bg-white/8 transition font-cairo rounded-[22px]"
          >
            العودة
          </Link>
        </div>

        <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2 font-cairo">
                الدور
              </label>
              <select
                value={role}
                onChange={handleRoleChange}
                disabled={loading}
                className="w-full px-4 py-2 border border-white/8 rounded-[22px] bg-white/4 text-white focus:ring-2 focus:ring-white/20 focus:border-transparent font-cairo disabled:opacity-50"
              >
                {ROLE_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    className="bg-black text-white"
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2 font-cairo">
                مدة الصلاحية (بالدقائق)
              </label>
              <input
                type="number"
                min={1}
                max={1440}
                value={expiresInMinutes}
                onChange={handleExpiryChange}
                disabled={loading}
                className="w-full px-4 py-2 border border-white/8 rounded-[22px] bg-white/4 text-white focus:ring-2 focus:ring-white/20 focus:border-transparent font-cairo disabled:opacity-50"
              />
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !projectId}
            className="mt-4 px-6 py-2 bg-white/8 text-white rounded-[22px] hover:bg-white/12 disabled:bg-white/4 disabled:cursor-not-allowed font-cairo transition"
          >
            {loading ? "جارٍ التوليد..." : "توليد QR"}
          </button>
        </CardSpotlight>

        {invite && qrImageUrl && (
          <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6">
            <h2 className="text-xl font-semibold mb-4 text-white font-cairo">
              رمز QR جاهز
            </h2>

            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="bg-white rounded-[22px] p-4 flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrImageUrl}
                  alt="رمز QR للدعوة"
                  width={300}
                  height={300}
                  className="block"
                />
              </div>

              <div className="flex-1 w-full">
                <p className="text-sm text-white/55 font-cairo mb-2">
                  الرمز النصي
                </p>
                <textarea
                  readOnly
                  value={invite.qr_token}
                  rows={4}
                  className="w-full px-4 py-2 border border-white/8 rounded-[22px] bg-white/4 text-white font-mono text-sm mb-3"
                />
                <p className="text-sm text-white/55 font-cairo mb-4">
                  ينتهي في:{" "}
                  <span className="text-white">
                    {new Date(invite.expiresAt).toLocaleString("ar-SA")}
                  </span>
                </p>
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 bg-white/8 text-white rounded-[22px] hover:bg-white/12 font-cairo transition"
                >
                  نسخ الرمز
                </button>
              </div>
            </div>
          </CardSpotlight>
        )}
      </div>
    </div>
  );
}
