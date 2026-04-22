"use client";

/**
 * @module FinalResult
 * @description عرض النتيجة النهائية لجلسة العصف الذهني
 *
 * يعرض ملخصاً شاملاً للنتائج والتوصيات والقرارات النهائية
 */

import { useMemo } from "react";
import { CheckCircle, AlertCircle, Lightbulb, Target } from "lucide-react";
import type { Session, DebateMessage } from "../../types";

interface FinalResultProps {
  session: Session;
  messages: DebateMessage[];
  progressPercent: string;
}

interface SummaryItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: string;
}

export function FinalResult({
  session,
  messages,
  progressPercent,
}: FinalResultProps) {
  const summaryItems = useMemo((): SummaryItem[] => {
    // استخدام الأنواع الصحيحة لـ DebateMessage: agentId وtype وmessage
    const uniqueAgents = new Set(messages.map((m) => m.agentId)).size;
    const totalDecisions = messages.filter((m) =>
      m.message.includes("قرار")
    ).length;
    const recommendations = messages.filter((m) =>
      m.message.includes("توصية")
    ).length;

    return [
      {
        icon: CheckCircle,
        label: "الوكلاء المكتملين",
        value: uniqueAgents,
        color: "text-green-400",
      },
      {
        icon: Target,
        label: "القرارات المتخذة",
        value: totalDecisions,
        color: "text-blue-400",
      },
      {
        icon: Lightbulb,
        label: "التوصيات",
        value: recommendations,
        color: "text-yellow-400",
      },
      {
        icon: AlertCircle,
        label: "نسبة الإنجاز",
        value: `${progressPercent}%`,
        color: "text-purple-400",
      },
    ];
  }, [messages, progressPercent]);

  const finalConclusions = useMemo(() => {
    // استخراج الاستنتاجات النهائية من الرسائل
    // استخراج آخر الرسائل من جميع الوكلاء (DebateMessage لا يملك role، نستخدم agentId وmessage)
    const conclusions = messages
      .slice(-3) // آخر 3 رسائل
      .map((m) => m.message)
      .filter((content) => content.length > 50); // رسائل ذات محتوى

    return conclusions.length > 0
      ? conclusions
      : [
          "تم إكمال جلسة العصف الذهني بنجاح",
          "تم جمع آراء متعددة من الوكلاء المختلفين",
          "النتائج جاهزة للتنفيذ والمتابعة",
        ];
  }, [messages]);

  return (
    <div className="space-y-6">
      {/* رأس النتائج النهائية */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-white font-cairo">
          النتائج النهائية
        </h2>
        <p className="text-white/70 font-cairo">
          تم إكمال جلسة العصف الذهني بنجاح بنسبة {progressPercent}%
        </p>
      </div>

      {/* ملخص إحصائي */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryItems.map((item, index) => (
          <div
            key={index}
            className="bg-white/5 rounded-lg p-4 border border-white/10"
          >
            <div className="flex items-center gap-3">
              <item.icon className={`w-5 h-5 ${item.color}`} />
              <div>
                <p className="text-xs text-white/60 font-cairo">{item.label}</p>
                <p className={`text-lg font-bold ${item.color} font-cairo`}>
                  {item.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* الاستنتاجات النهائية */}
      <div className="bg-white/5 rounded-lg p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4 font-cairo">
          الاستنتاجات النهائية
        </h3>
        <div className="space-y-3">
          {finalConclusions.map((conclusion, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 bg-white/5 rounded-md"
            >
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
              <p className="text-white/80 font-cairo text-sm leading-relaxed">
                {conclusion}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* معلومات الجلسة */}
      <div className="bg-white/5 rounded-lg p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4 font-cairo">
          معلومات الجلسة
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-white/60 font-cairo">الموضوع: </span>
            <span className="text-white font-cairo">{session.brief}</span>
          </div>
          <div>
            <span className="text-white/60 font-cairo">المرحلة النهائية: </span>
            <span className="text-white font-cairo">
              المرحلة {session.phase}
            </span>
          </div>
          <div>
            <span className="text-white/60 font-cairo">إجمالي الرسائل: </span>
            <span className="text-white font-cairo">{messages.length}</span>
          </div>
          <div>
            <span className="text-white/60 font-cairo">تاريخ الانتهاء: </span>
            <span className="text-white font-cairo">
              {new Date().toLocaleDateString("ar-EG")}
            </span>
          </div>
        </div>
      </div>

      {/* رسالة تشجيعية */}
      <div className="text-center py-6">
        <p className="text-white/70 font-cairo">
          🎉 تم إكمال جلسة العصف الذهني بنجاح!
        </p>
        <p className="text-white/50 text-sm mt-2 font-cairo">
          يمكنك الآن تصدير النتائج أو بدء جلسة جديدة
        </p>
      </div>
    </div>
  );
}
