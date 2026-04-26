import { motion } from "framer-motion";
import {
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Target,
  Clock,
  DollarSign,
  Award,
  Zap,
  Calendar,
} from "lucide-react";
import React from "react";

import { Budget, AIAnalysis } from "../lib/types";


interface BudgetAnalyticsProps {
  analysis: AIAnalysis;
  stats: {
    totalItems: number;
    activeItems: number;
    totalCategories: number;
    efficiency: number;
  };
  budget: Budget;
  theme: "light" | "dark";
}

export const BudgetAnalytics: React.FC<BudgetAnalyticsProps> = ({
  analysis,
  stats,
  budget,
  theme,
}) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const costPerDay =
    budget.grandTotal / (analysis.shootingSchedule?.totalDays || 1);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`p-6 rounded-xl shadow-lg border mb-8 ${
        theme === "dark"
          ? "bg-black/18 border-white/8"
          : "bg-white/[0.04] border-white/8"
      }`}
    >
      <h3
        className={`text-lg font-bold mb-6 flex items-center gap-2 ${
          theme === "dark" ? "text-white" : "text-white"
        }`}
      >
        <TrendingUp size={20} className="text-indigo-500" />
        AI-Powered Budget Analysis
      </h3>

      {/* Production Summary */}
      <motion.div
        variants={itemVariants}
        className={`mb-8 p-6 rounded-[22px] border ${
          theme === "dark"
            ? "bg-black/22 border-white/8"
            : "bg-white/[0.04] border-white/8"
        }`}
      >
        <h4
          className={`text-lg font-semibold mb-3 flex items-center gap-2 ${
            theme === "dark" ? "text-white" : "text-white"
          }`}
        >
          <Zap size={18} className="text-yellow-500" />
          Production Summary
        </h4>
        <p
          className={`leading-relaxed ${
            theme === "dark" ? "text-white/68" : "text-white/68"
          }`}
        >
          {analysis.summary}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Key Metrics */}
        <motion.div
          variants={itemVariants}
          className={`p-4 rounded-[22px] border text-center ${
            theme === "dark"
              ? "bg-black/22 border-white/8"
              : "bg-white/[0.04] border-white/8"
          }`}
        >
          <Calendar className="mx-auto mb-2 text-blue-500" size={24} />
          <div
            className={`text-2xl font-bold ${
              theme === "dark" ? "text-white" : "text-white"
            }`}
          >
            {analysis.shootingSchedule?.totalDays || 0}
          </div>
          <div
            className={`text-sm ${
              theme === "dark" ? "text-white/55" : "text-white/55"
            }`}
          >
            Total Shooting Days
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className={`p-4 rounded-[22px] border text-center ${
            theme === "dark"
              ? "bg-black/22 border-white/8"
              : "bg-white/[0.04] border-white/8"
          }`}
        >
          <DollarSign className="mx-auto mb-2 text-green-500" size={24} />
          <div
            className={`text-2xl font-bold ${
              theme === "dark" ? "text-white" : "text-white"
            }`}
          >
            {formatCurrency(costPerDay)}
          </div>
          <div
            className={`text-sm ${
              theme === "dark" ? "text-white/55" : "text-white/55"
            }`}
          >
            Cost per Day
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className={`p-4 rounded-[22px] border text-center ${
            theme === "dark"
              ? "bg-black/22 border-white/8"
              : "bg-white/[0.04] border-white/8"
          }`}
        >
          <Target className="mx-auto mb-2 text-purple-500" size={24} />
          <div
            className={`text-2xl font-bold ${
              theme === "dark" ? "text-white" : "text-white"
            }`}
          >
            {stats.efficiency}%
          </div>
          <div
            className={`text-sm ${
              theme === "dark" ? "text-white/55" : "text-white/55"
            }`}
          >
            Budget Efficiency
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className={`p-4 rounded-[22px] border text-center ${
            theme === "dark"
              ? "bg-black/22 border-white/8"
              : "bg-white/[0.04] border-white/8"
          }`}
        >
          <Award className="mx-auto mb-2 text-yellow-500" size={24} />
          <div
            className={`text-2xl font-bold ${
              theme === "dark" ? "text-white" : "text-white"
            }`}
          >
            {stats.activeItems}/{stats.totalItems}
          </div>
          <div
            className={`text-sm ${
              theme === "dark" ? "text-white/55" : "text-white/55"
            }`}
          >
            Active Items
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recommendations */}
        <motion.div
          variants={itemVariants}
          className={`p-6 rounded-[22px] border ${
            theme === "dark"
              ? "bg-black/22 border-white/8"
              : "bg-white/[0.04] border-white/8"
          }`}
        >
          <h4
            className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
              theme === "dark" ? "text-white" : "text-white"
            }`}
          >
            <Lightbulb size={18} className="text-green-500" />
            AI Recommendations
          </h4>
          <div className="space-y-3">
            {analysis.recommendations.map((rec, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-start gap-2 p-3 rounded-[22px] ${
                  theme === "dark" ? "bg-black/28" : "bg-white/[0.04]"
                }`}
              >
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <p
                  className={`text-sm ${
                    theme === "dark" ? "text-white/68" : "text-white/68"
                  }`}
                >
                  {rec}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Risk Factors */}
        <motion.div
          variants={itemVariants}
          className={`p-6 rounded-[22px] border ${
            theme === "dark"
              ? "bg-black/22 border-white/8"
              : "bg-white/[0.04] border-white/8"
          }`}
        >
          <h4
            className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
              theme === "dark" ? "text-white" : "text-white"
            }`}
          >
            <AlertTriangle size={18} className="text-orange-500" />
            Risk Factors
          </h4>
          <div className="space-y-3">
            {analysis.riskFactors.map((risk, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-start gap-2 p-3 rounded-[22px] ${
                  theme === "dark" ? "bg-black/28" : "bg-orange-50"
                }`}
              >
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                <p
                  className={`text-sm ${
                    theme === "dark" ? "text-white/68" : "text-white/68"
                  }`}
                >
                  {risk}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Cost Optimization */}
      <motion.div
        variants={itemVariants}
        className={`mt-8 p-6 rounded-[22px] border ${
          theme === "dark"
            ? "bg-black/22 border-white/8"
            : "bg-white/[0.04] border-white/8"
        }`}
      >
        <h4
          className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
            theme === "dark" ? "text-white" : "text-white"
          }`}
        >
          <Target size={18} className="text-blue-500" />
          Cost Optimization Opportunities
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analysis.costOptimization.map((opt, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-[22px] border ${
                theme === "dark"
                  ? "bg-black/28 border-white/8"
                  : "bg-blue-50 border-blue-200"
              }`}
            >
              <p
                className={`text-sm ${
                  theme === "dark" ? "text-white/68" : "text-white/68"
                }`}
              >
                {opt}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Shooting Schedule */}
      {analysis.shootingSchedule && (
        <motion.div
          variants={itemVariants}
          className={`mt-8 p-6 rounded-[22px] border ${
            theme === "dark"
              ? "bg-black/22 border-white/8"
              : "bg-white/[0.04] border-white/8"
          }`}
        >
          <h4
            className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
              theme === "dark" ? "text-white" : "text-white"
            }`}
          >
            <Clock size={18} className="text-purple-500" />
            Estimated Shooting Schedule
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              className={`p-4 rounded-lg text-center ${
                theme === "dark" ? "bg-black/28" : "bg-white/6"
              }`}
            >
              <div
                className={`text-2xl font-bold ${
                  theme === "dark" ? "text-white" : "text-white"
                }`}
              >
                {analysis.shootingSchedule.phases.preProduction}
              </div>
              <div
                className={`text-sm ${
                  theme === "dark" ? "text-white/55" : "text-white/55"
                }`}
              >
                Pre-Production Days
              </div>
            </div>
            <div
              className={`p-4 rounded-lg text-center ${
                theme === "dark" ? "bg-black/28" : "bg-white/6"
              }`}
            >
              <div
                className={`text-2xl font-bold ${
                  theme === "dark" ? "text-white" : "text-white"
                }`}
              >
                {analysis.shootingSchedule.phases.production}
              </div>
              <div
                className={`text-sm ${
                  theme === "dark" ? "text-white/55" : "text-white/55"
                }`}
              >
                Production Days
              </div>
            </div>
            <div
              className={`p-4 rounded-lg text-center ${
                theme === "dark" ? "bg-black/28" : "bg-white/6"
              }`}
            >
              <div
                className={`text-2xl font-bold ${
                  theme === "dark" ? "text-white" : "text-white"
                }`}
              >
                {analysis.shootingSchedule.phases.postProduction}
              </div>
              <div
                className={`text-sm ${
                  theme === "dark" ? "text-white/55" : "text-white/55"
                }`}
              >
                Post-Production Days
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};
