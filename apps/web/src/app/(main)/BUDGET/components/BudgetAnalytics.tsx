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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const formatCurrencyValue = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

interface ThemeProps {
  theme: "light" | "dark";
}

interface CardSectionProps extends ThemeProps {
  children: React.ReactNode;
  className?: string;
}

const SectionCard: React.FC<CardSectionProps> = ({
  theme,
  children,
  className = "",
}) => (
  <motion.div
    variants={itemVariants}
    className={`p-6 rounded-[22px] border ${theme === "dark" ? "bg-black/22 border-white/8" : "bg-white/[0.04] border-white/8"} ${className}`}
  >
    {children}
  </motion.div>
);

interface SectionHeadingProps extends ThemeProps {
  icon: React.ReactNode;
  children: React.ReactNode;
}

const SectionHeading: React.FC<SectionHeadingProps> = ({
  theme,
  icon,
  children,
}) => (
  <h4
    className={`text-lg font-semibold mb-4 flex items-center gap-2 ${theme === "dark" ? "text-white" : "text-white"}`}
  >
    {icon}
    {children}
  </h4>
);

interface MetricCardProps extends ThemeProps {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  theme,
  icon,
  value,
  label,
}) => (
  <motion.div
    variants={itemVariants}
    className={`p-4 rounded-[22px] border text-center ${theme === "dark" ? "bg-black/22 border-white/8" : "bg-white/[0.04] border-white/8"}`}
  >
    <div className="flex justify-center mb-2">{icon}</div>
    <div
      className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-white"}`}
    >
      {value}
    </div>
    <div
      className={`text-sm ${theme === "dark" ? "text-white/55" : "text-white/55"}`}
    >
      {label}
    </div>
  </motion.div>
);

interface ListItemProps extends ThemeProps {
  text: string;
  dotColor: string;
  bgColor: string;
}

const AnalyticListItem: React.FC<ListItemProps> = ({
  theme,
  text,
  dotColor,
  bgColor,
}) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    className={`flex items-start gap-2 p-3 rounded-[22px] ${bgColor}`}
  >
    <div
      className={`w-2 h-2 ${dotColor} rounded-full mt-2 flex-shrink-0`}
    ></div>
    <p
      className={`text-sm ${theme === "dark" ? "text-white/68" : "text-white/68"}`}
    >
      {text}
    </p>
  </motion.div>
);

interface KeyMetricsSectionProps extends ThemeProps {
  analysis: AIAnalysis;
  stats: BudgetAnalyticsProps["stats"];
  costPerDay: number;
}

const KeyMetricsSection: React.FC<KeyMetricsSectionProps> = ({
  theme,
  analysis,
  stats,
  costPerDay,
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    <MetricCard
      theme={theme}
      icon={<Calendar className="text-blue-500" size={24} />}
      value={analysis.shootingSchedule?.totalDays || 0}
      label="Total Shooting Days"
    />
    <MetricCard
      theme={theme}
      icon={<DollarSign className="text-green-500" size={24} />}
      value={formatCurrencyValue(costPerDay)}
      label="Cost per Day"
    />
    <MetricCard
      theme={theme}
      icon={<Target className="text-purple-500" size={24} />}
      value={`${stats.efficiency}%`}
      label="Budget Efficiency"
    />
    <MetricCard
      theme={theme}
      icon={<Award className="text-yellow-500" size={24} />}
      value={`${stats.activeItems}/${stats.totalItems}`}
      label="Active Items"
    />
  </div>
);

interface RecommendationsSectionProps extends ThemeProps {
  recommendations: string[];
  riskFactors: string[];
}

const RecommendationsSection: React.FC<RecommendationsSectionProps> = ({
  theme,
  recommendations,
  riskFactors,
}) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <SectionCard theme={theme}>
      <SectionHeading
        theme={theme}
        icon={<Lightbulb size={18} className="text-green-500" />}
      >
        AI Recommendations
      </SectionHeading>
      <div className="space-y-3">
        {recommendations.map((rec, index) => (
          <AnalyticListItem
            key={index}
            theme={theme}
            text={rec}
            dotColor="bg-green-500"
            bgColor={theme === "dark" ? "bg-black/28" : "bg-white/[0.04]"}
          />
        ))}
      </div>
    </SectionCard>

    <SectionCard theme={theme}>
      <SectionHeading
        theme={theme}
        icon={<AlertTriangle size={18} className="text-orange-500" />}
      >
        Risk Factors
      </SectionHeading>
      <div className="space-y-3">
        {riskFactors.map((risk, index) => (
          <AnalyticListItem
            key={index}
            theme={theme}
            text={risk}
            dotColor="bg-orange-500"
            bgColor={theme === "dark" ? "bg-black/28" : "bg-orange-50"}
          />
        ))}
      </div>
    </SectionCard>
  </div>
);

interface CostOptimizationSectionProps extends ThemeProps {
  costOptimization: string[];
}

const CostOptimizationSection: React.FC<CostOptimizationSectionProps> = ({
  theme,
  costOptimization,
}) => (
  <SectionCard theme={theme} className="mt-8">
    <SectionHeading
      theme={theme}
      icon={<Target size={18} className="text-blue-500" />}
    >
      Cost Optimization Opportunities
    </SectionHeading>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {costOptimization.map((opt, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
          className={`p-4 rounded-[22px] border ${theme === "dark" ? "bg-black/28 border-white/8" : "bg-blue-50 border-blue-200"}`}
        >
          <p
            className={`text-sm ${theme === "dark" ? "text-white/68" : "text-white/68"}`}
          >
            {opt}
          </p>
        </motion.div>
      ))}
    </div>
  </SectionCard>
);

interface ShootingScheduleSectionProps extends ThemeProps {
  shootingSchedule: NonNullable<AIAnalysis["shootingSchedule"]>;
}

const ShootingScheduleSection: React.FC<ShootingScheduleSectionProps> = ({
  theme,
  shootingSchedule,
}) => (
  <SectionCard theme={theme} className="mt-8">
    <SectionHeading
      theme={theme}
      icon={<Clock size={18} className="text-purple-500" />}
    >
      Estimated Shooting Schedule
    </SectionHeading>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[
        {
          value: shootingSchedule.phases.preProduction,
          label: "Pre-Production Days",
        },
        { value: shootingSchedule.phases.production, label: "Production Days" },
        {
          value: shootingSchedule.phases.postProduction,
          label: "Post-Production Days",
        },
      ].map(({ value, label }) => (
        <div
          key={label}
          className={`p-4 rounded-lg text-center ${theme === "dark" ? "bg-black/28" : "bg-white/6"}`}
        >
          <div
            className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-white"}`}
          >
            {value}
          </div>
          <div
            className={`text-sm ${theme === "dark" ? "text-white/55" : "text-white/55"}`}
          >
            {label}
          </div>
        </div>
      ))}
    </div>
  </SectionCard>
);

export const BudgetAnalytics: React.FC<BudgetAnalyticsProps> = ({
  analysis,
  stats,
  budget,
  theme,
}) => {
  const costPerDay =
    budget.grandTotal / (analysis.shootingSchedule?.totalDays || 1);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`p-6 rounded-xl shadow-lg border mb-8 ${theme === "dark" ? "bg-black/18 border-white/8" : "bg-white/[0.04] border-white/8"}`}
    >
      <h3
        className={`text-lg font-bold mb-6 flex items-center gap-2 ${theme === "dark" ? "text-white" : "text-white"}`}
      >
        <TrendingUp size={20} className="text-indigo-500" />
        AI-Powered Budget Analysis
      </h3>

      <SectionCard theme={theme} className="mb-8">
        <SectionHeading
          theme={theme}
          icon={<Zap size={18} className="text-yellow-500" />}
        >
          Production Summary
        </SectionHeading>
        <p
          className={`leading-relaxed ${theme === "dark" ? "text-white/68" : "text-white/68"}`}
        >
          {analysis.summary}
        </p>
      </SectionCard>

      <KeyMetricsSection
        theme={theme}
        analysis={analysis}
        stats={stats}
        costPerDay={costPerDay}
      />

      <RecommendationsSection
        theme={theme}
        recommendations={analysis.recommendations}
        riskFactors={analysis.riskFactors}
      />

      <CostOptimizationSection
        theme={theme}
        costOptimization={analysis.costOptimization}
      />

      {analysis.shootingSchedule && (
        <ShootingScheduleSection
          theme={theme}
          shootingSchedule={analysis.shootingSchedule}
        />
      )}
    </motion.div>
  );
};
