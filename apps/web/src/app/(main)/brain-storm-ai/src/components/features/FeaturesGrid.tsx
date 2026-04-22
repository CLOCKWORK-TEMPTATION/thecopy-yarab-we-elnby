"use client";

/**
 * الصفحة: brain-storm-ai / FeaturesGrid
 * الهوية: شبكة مزايا داخلية بطابع شبكي تحليلي متسق مع القشرة الداكنة الجديدة
 * المتغيرات الخاصة المضافة: تعتمد على متغيرات الصفحة المحقونة أعلى الشجرة
 * مكونات Aceternity المستخدمة: CardSpotlight
 */

import { Brain, Layers, Zap, Shield } from "lucide-react";
import type { BrainstormAgentStats } from "../../types";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";

interface FeaturesGridProps {
  agentStats: BrainstormAgentStats;
}

export default function FeaturesGrid({ agentStats }: FeaturesGridProps) {
  const features = [
    {
      icon: <Brain className="w-6 h-6" />,
      title: "ذكاء اصطناعي متقدم",
      desc: `${agentStats.total} وكيل متخصص`,
    },
    {
      icon: <Layers className="w-6 h-6" />,
      title: "5 فئات متنوعة",
      desc: "أساسي، تحليل، إبداع، تنبؤ، متقدم",
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "نظام نقاش ذكي",
      desc: "تعاون حقيقي بين الوكلاء",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "جودة مضمونة",
      desc: `${agentStats.withSelfReflection} وكيل بتأمل ذاتي`,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
      {features.map((feature, index) => (
        <CardSpotlight
          key={index}
          className="overflow-hidden rounded-[24px] border border-white/8 bg-black/22 p-6 backdrop-blur-xl"
        >
          <div className="space-y-4 text-right">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/8 text-[var(--page-accent,#3b5bdb)]">
              {feature.icon}
            </div>
            <div>
              <h3 className="font-bold mb-2 text-white">{feature.title}</h3>
              <p className="text-sm text-white/58 leading-7">{feature.desc}</p>
            </div>
          </div>
        </CardSpotlight>
      ))}
    </div>
  );
}
