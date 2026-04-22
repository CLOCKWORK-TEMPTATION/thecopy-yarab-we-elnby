"use client";

import React from "react";

/**
 * خلفية الغلاف البصري لصفحة المحرر.
 *
 * هذه طبقة ديكور فقط — لا تؤثر على أي سلوك للمحرر.
 * تستبدل الشبكة الداكنة الحالية بسطح ورقي دافئ مع توهّجات ناعمة
 * تعطي إحساس "مكتب تحرير هادئ" بدلًا من لوحة تحكم تقنية.
 * جميع القيم البصرية مأخوذة من ثيم `.editor-modern-floating`
 * المعرّف في `styles/modern-floating.css`.
 */
export const BackgroundGrid = (): React.JSX.Element => (
  <div
    className="app-bg-grid pointer-events-none fixed inset-0 z-0 overflow-hidden"
    aria-hidden="true"
  >
    {/* سطح ورقي أساسي */}
    <div
      className="absolute inset-0"
      style={{ backgroundColor: "var(--mf-canvas, #f5f1ea)" }}
    />

    {/* بقعة دافئة في أعلى اليمين (RTL: جهة العين) */}
    <div
      className="absolute -top-32 -right-32 h-[520px] w-[520px] rounded-full opacity-70 blur-[120px]"
      style={{
        background:
          "radial-gradient(circle at center, rgba(220, 180, 140, 0.55), rgba(220, 180, 140, 0) 70%)",
      }}
    />

    {/* بقعة هادئة في أسفل اليسار */}
    <div
      className="absolute -bottom-40 -left-40 h-[560px] w-[560px] rounded-full opacity-60 blur-[140px]"
      style={{
        background:
          "radial-gradient(circle at center, rgba(201, 116, 74, 0.22), rgba(201, 116, 74, 0) 72%)",
      }}
    />

    {/* لمسة خضراء شفيفة في المنتصف-أعلى */}
    <div
      className="absolute top-1/3 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full opacity-45 blur-[130px]"
      style={{
        background:
          "radial-gradient(circle at center, rgba(47, 146, 102, 0.18), rgba(47, 146, 102, 0) 70%)",
      }}
    />

    {/* texture نقطية خفيفة جدًا لإعطاء إحساس الورق */}
    <div
      className="absolute inset-0 opacity-[0.035]"
      style={{
        backgroundImage:
          "radial-gradient(rgba(31,29,26,0.65) 1px, transparent 1px)",
        backgroundSize: "18px 18px",
      }}
    />
  </div>
);
