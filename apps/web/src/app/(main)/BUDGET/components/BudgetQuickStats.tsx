"use client";

import { motion } from "framer-motion";
import { Award, DollarSign, Star, Target, TrendingUp } from "lucide-react";

import type { SecurityRisk, UserPreferences } from "../lib/types";

interface BudgetQuickStatsProps {
  grandTotal: number;
  finalTotal: number;
  risk: SecurityRisk;
  preferences: UserPreferences;
  formatCurrency: (value: number) => string;
}

/**
 * @description شبكة بطاقات الإحصاء السريع للميزانية:
 * المجموع الفرعي + الاحتياطي + رسوم الضمان + الإعفاءات الضريبية + الإجمالي الكلي.
 */
export const BudgetQuickStats: React.FC<BudgetQuickStatsProps> = ({
  grandTotal,
  finalTotal,
  risk,
  preferences,
  formatCurrency,
}) => {
  const cardBase = `p-6 rounded-xl shadow-md border ${
    preferences.theme === "dark"
      ? "bg-black/18 border-white/8"
      : "bg-white/[0.04] border-white/8"
  }`;

  const labelClass = `text-sm ${
    preferences.theme === "dark" ? "text-white/55" : "text-white/55"
  }`;

  const valueClass = `text-2xl font-bold ${
    preferences.theme === "dark" ? "text-white" : "text-white"
  }`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <motion.div whileHover={{ scale: 1.02 }} className={cardBase}>
        <div className="flex items-center justify-between mb-2">
          <span className={labelClass}>Subtotal</span>
          <DollarSign size={16} className="text-blue-500" />
        </div>
        <div className={valueClass}>{formatCurrency(grandTotal)}</div>
      </motion.div>

      <motion.div whileHover={{ scale: 1.02 }} className={cardBase}>
        <div className="flex items-center justify-between mb-2">
          <span className={labelClass}>Contingency</span>
          <Target size={16} className="text-orange-500" />
        </div>
        <div className="text-2xl font-bold text-orange-600">
          {formatCurrency(risk.contingency.total)}
        </div>
      </motion.div>

      <motion.div whileHover={{ scale: 1.02 }} className={cardBase}>
        <div className="flex items-center justify-between mb-2">
          <span className={labelClass}>Bond Fee</span>
          <Award size={16} className="text-blue-500" />
        </div>
        <div className="text-2xl font-bold text-blue-600">
          {formatCurrency(risk.bondFee.total)}
        </div>
      </motion.div>

      <motion.div whileHover={{ scale: 1.02 }} className={cardBase}>
        <div className="flex items-center justify-between mb-2">
          <span className={labelClass}>Tax Credits</span>
          <TrendingUp size={16} className="text-green-500" />
        </div>
        <div className="text-2xl font-bold text-green-600">
          {formatCurrency(Math.abs(risk.credits.total))}
        </div>
      </motion.div>

      <motion.div
        whileHover={{ scale: 1.02 }}
        className="p-6 rounded-xl shadow-md border bg-gradient-to-r from-green-500 to-emerald-500 text-white"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm opacity-90">Grand Total</span>
          <Star size={16} />
        </div>
        <div className="text-2xl font-bold">{formatCurrency(finalTotal)}</div>
      </motion.div>
    </div>
  );
};
