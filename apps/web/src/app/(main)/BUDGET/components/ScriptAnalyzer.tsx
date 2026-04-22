"use client";

/**
 * مكون محلل السيناريو - Script Analyzer Component
 *
 * @description
 * يعرض نتائج تحليل الذكاء الاصطناعي للسيناريو
 * بما في ذلك الملخص والتوصيات والمخاطر وفرص التوفير
 *
 * السبب: يوفر للمستخدم رؤى استراتيجية تُساعد في
 * اتخاذ قرارات مدروسة حول الميزانية والإنتاج
 */

import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Target,
  Lightbulb,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { AIAnalysis } from "../lib/types";

/**
 * خصائص مكون محلل السيناريو
 */
interface ScriptAnalyzerProps {
  /** نتيجة التحليل أو null إذا لم يتم التحليل بعد */
  analysis: AIAnalysis | null;
  /** هل جاري التحليل */
  isAnalyzing: boolean;
  /** دالة بدء التحليل */
  onAnalyze: () => void;
}

/**
 * مكون محلل السيناريو بالذكاء الاصطناعي
 *
 * @description
 * يعرض ثلاث حالات:
 * 1. حالة الانتظار: زر لبدء التحليل
 * 2. حالة التحميل: مؤشر تقدم
 * 3. حالة النتائج: عرض التحليل الكامل
 *
 * @example
 * ```tsx
 * <ScriptAnalyzer
 *   analysis={analysisData}
 *   isAnalyzing={false}
 *   onAnalyze={handleAnalyze}
 * />
 * ```
 */
export const ScriptAnalyzer: React.FC<ScriptAnalyzerProps> = ({
  analysis,
  isAnalyzing,
  onAnalyze,
}) => {
  // حالة الانتظار - عرض زر البدء
  if (!analysis && !isAnalyzing) {
    return (
      <Card className="border-2 border-dashed border-white/8 dark:border-white/8">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Sparkles className="w-16 h-16 text-white/55 mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            تحليل السيناريو بالذكاء الاصطناعي
          </h3>
          <p className="text-sm text-white/45 mb-6 text-center max-w-md">
            احصل على رؤى احترافية حول متطلبات الإنتاج، المخاطر المحتملة، وفرص
            التوفير
          </p>
          <Button
            onClick={onAnalyze}
            className="bg-gradient-to-r from-purple-600 to-indigo-600"
          >
            <Sparkles className="w-4 h-4 ml-2" />
            ابدأ التحليل المتقدم
          </Button>
        </CardContent>
      </Card>
    );
  }

  // حالة التحميل - عرض مؤشر التقدم
  if (isAnalyzing) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-purple-200 dark:border-purple-900 rounded-full"></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h3 className="text-lg font-semibold">جاري تحليل السيناريو...</h3>
            <p className="text-sm text-white/45">
              يتم تحليل المتطلبات الإنتاجية والتقنية
            </p>
            <Progress value={66} className="w-64" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // التحقق من وجود التحليل
  if (!analysis) return null;

  // عرض نتائج التحليل
  return (
    <div className="space-y-6">
      {/* بطاقة الملخص */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-indigo-200 dark:border-indigo-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                ملخص الإنتاج
              </CardTitle>
              <Badge
                variant="secondary"
                className="bg-indigo-100 text-indigo-700"
              >
                تحليل متقدم
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-right leading-relaxed text-white/68 dark:text-white/68">
              {analysis.summary}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* الجدول الزمني */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              الجدول الزمني المقترح
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-[22px] text-center">
                <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {analysis.shootingSchedule.phases.preProduction}
                </div>
                <div className="text-sm text-white/55 dark:text-white/55">
                  يوم ما قبل الإنتاج
                </div>
              </div>
              <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-[22px] text-center">
                <Target className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {analysis.shootingSchedule.phases.production}
                </div>
                <div className="text-sm text-white/55 dark:text-white/55">
                  يوم تصوير
                </div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-950/30 p-4 rounded-[22px] text-center">
                <Sparkles className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                  {analysis.shootingSchedule.phases.postProduction}
                </div>
                <div className="text-sm text-white/55 dark:text-white/55">
                  يوم ما بعد الإنتاج
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-white/[0.04] dark:bg-black/14 rounded-[22px] text-center">
              <span className="text-sm text-white/55 dark:text-white/55">
                إجمالي المدة:{" "}
              </span>
              <span className="font-bold text-lg text-white dark:text-white">
                {analysis.shootingSchedule.totalDays} يوم
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* التوصيات */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                التوصيات الرئيسية
              </CardTitle>
              <CardDescription>نصائح احترافية لإنتاج ناجح</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {analysis.recommendations.map((rec, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-[22px]"
                  >
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-right text-white/68 dark:text-white/68">
                      {rec}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        {/* عوامل المخاطرة */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                عوامل المخاطرة
              </CardTitle>
              <CardDescription>تحديات محتملة والحلول المقترحة</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {analysis.riskFactors.map((risk, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-[22px]"
                  >
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-right text-white/68 dark:text-white/68">
                      {risk}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* فرص توفير التكاليف */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card className="border-2 border-emerald-200 dark:border-emerald-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              فرص توفير التكاليف
            </CardTitle>
            <CardDescription>
              استراتيجيات ذكية لتحسين الميزانية دون التأثير على الجودة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysis.costOptimization.map((opt, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="flex items-start gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-[22px] border border-emerald-200 dark:border-emerald-900"
                >
                  <Lightbulb className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-right text-white/68 dark:text-white/68">
                    {opt}
                  </span>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
