import { motion } from "framer-motion";
import React, { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from "recharts";

import { COLOR_PALETTE } from "../lib/constants";
import { Budget } from "../lib/types";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const formatShort = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
};

interface TooltipEntry {
  name?: string | number;
  value?: number;
  color?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  theme?: "light" | "dark";
}

const CustomTooltip = ({
  active,
  payload,
  label,
  theme,
}: CustomTooltipProps) => {
  if (active && payload?.length) {
    return (
      <div
        className={`p-3 rounded-[22px] shadow-lg border ${theme === "dark" ? "bg-black/18 border-white/8 text-white" : "bg-white/[0.04] border-white/8"}`}
      >
        <p className="font-semibold">{label}</p>
        {payload.map((entry: TooltipEntry, index: number) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value ?? 0)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

interface EnhancedChartProps {
  budget: Budget;
  theme: "light" | "dark";
}

const chartVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 },
  },
};

interface ChartCardProps {
  theme: "light" | "dark";
  title: string;
  children: React.ReactNode;
  className?: string;
}

const ChartCard: React.FC<ChartCardProps> = ({
  theme,
  title,
  children,
  className = "",
}) => (
  <motion.div
    variants={chartVariants}
    className={`p-6 rounded-xl border ${theme === "dark" ? "bg-black/18 border-white/8" : "bg-white/[0.04] border-white/8"} shadow-md ${className}`}
  >
    <h4
      className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-white" : "text-white"}`}
    >
      {title}
    </h4>
    {children}
  </motion.div>
);

interface SummaryStatProps {
  theme: "light" | "dark";
  value: React.ReactNode;
  label: string;
  valueClassName?: string;
}

const SummaryStat: React.FC<SummaryStatProps> = ({
  theme,
  value,
  label,
  valueClassName,
}) => (
  <div
    className={`p-4 rounded-xl border text-center ${theme === "dark" ? "bg-black/18 border-white/8" : "bg-white/[0.04] border-white/8"}`}
  >
    <div
      className={`text-2xl font-bold ${valueClassName ?? (theme === "dark" ? "text-white" : "text-white")}`}
    >
      {value}
    </div>
    <div
      className={`text-sm ${theme === "dark" ? "text-white/55" : "text-white/55"}`}
    >
      {label}
    </div>
  </div>
);

function buildChartData(budget: Budget) {
  const sectionData = budget.sections
    .map((section) => ({
      name: section.name,
      value: section.total,
      percentage:
        budget.grandTotal > 0
          ? ((section.total / budget.grandTotal) * 100).toFixed(1)
          : "0",
      color: section.color ?? "#3B82F6",
    }))
    .filter((item) => item.value > 0);

  const allCategories = budget.sections
    .flatMap((section) =>
      section.categories.map((cat) => ({
        name: cat.name,
        section: section.name,
        value: cat.total,
        code: cat.code,
        color: section.color ?? "#3B82F6",
      }))
    )
    .filter((cat) => cat.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 15);

  const historicalData = [
    {
      name: "Pre-Production",
      atl: 120000,
      production: 45000,
      post: 25000,
      other: 15000,
    },
    {
      name: "Production",
      atl: 120000,
      production: 650000,
      post: 45000,
      other: 35000,
    },
    {
      name: "Post-Production",
      atl: 120000,
      production: 650000,
      post: 180000,
      other: 50000,
    },
    {
      name: "Final",
      atl: budget.sections.find((s) => s.id === "atl")?.total ?? 0,
      production:
        budget.sections.find((s) => s.id === "production")?.total ?? 0,
      post: budget.sections.find((s) => s.id === "post")?.total ?? 0,
      other: budget.sections.find((s) => s.id === "other")?.total ?? 0,
    },
  ];

  return { sectionData, allCategories, historicalData };
}

function countActiveItems(budget: Budget): number {
  return budget.sections.reduce(
    (sum, section) =>
      sum +
      section.categories.reduce(
        (catSum, cat) =>
          catSum + cat.items.filter((item) => item.total > 0).length,
        0
      ),
    0
  );
}

function countTotalCategories(budget: Budget): number {
  return budget.sections.reduce(
    (sum, section) => sum + section.categories.length,
    0
  );
}

export const EnhancedChart: React.FC<EnhancedChartProps> = ({
  budget,
  theme,
}) => {
  const chartData = useMemo(() => buildChartData(budget), [budget]);
  const totalCategories = useMemo(() => countTotalCategories(budget), [budget]);
  const activeItems = useMemo(() => countActiveItems(budget), [budget]);

  const gridStroke = theme === "dark" ? "#374151" : "#E5E7EB";
  const axisStroke = theme === "dark" ? "#9CA3AF" : "#6B7280";

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-6"
    >
      <h3
        className={`text-lg font-bold mb-6 ${theme === "dark" ? "text-white" : "text-white"}`}
      >
        Budget Visualization & Analytics
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <ChartCard theme={theme} title="Budget Distribution by Section">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData.sectionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({
                  name,
                  percent,
                }: {
                  name?: string;
                  percent?: number;
                }) => `${name ?? ""}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.sectionData.map((_entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      COLOR_PALETTE.charts[
                        index % COLOR_PALETTE.charts.length
                      ] ?? "#3B82F6"
                    }
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip theme={theme} />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard theme={theme} title="Top 15 Categories by Cost">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.allCategories} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis
                type="number"
                tickFormatter={formatShort}
                stroke={axisStroke}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fontSize: 10 }}
                stroke={axisStroke}
              />
              <Tooltip content={<CustomTooltip theme={theme} />} />
              <Bar dataKey="value" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard
        theme={theme}
        title="Budget Evolution by Phase"
        className="mb-8"
      >
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData.historicalData}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis dataKey="name" stroke={axisStroke} />
            <YAxis tickFormatter={formatShort} stroke={axisStroke} />
            <Tooltip content={<CustomTooltip theme={theme} />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="atl"
              stackId="1"
              stroke="#3B82F6"
              fill="#3B82F6"
              fillOpacity={0.6}
              name="Above The Line"
            />
            <Area
              type="monotone"
              dataKey="production"
              stackId="1"
              stroke="#8B5CF6"
              fill="#8B5CF6"
              fillOpacity={0.6}
              name="Production"
            />
            <Area
              type="monotone"
              dataKey="post"
              stackId="1"
              stroke="#EC4899"
              fill="#EC4899"
              fillOpacity={0.6}
              name="Post Production"
            />
            <Area
              type="monotone"
              dataKey="other"
              stackId="1"
              stroke="#F59E0B"
              fill="#F59E0B"
              fillOpacity={0.6}
              name="Other"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <motion.div
        variants={chartVariants}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <SummaryStat
          theme={theme}
          value={formatCurrency(budget.grandTotal)}
          label="Total Budget"
        />
        <SummaryStat
          theme={theme}
          value={budget.sections.length}
          label="Sections"
          valueClassName="text-2xl font-bold text-indigo-600"
        />
        <SummaryStat
          theme={theme}
          value={totalCategories}
          label="Categories"
          valueClassName="text-2xl font-bold text-purple-600"
        />
        <SummaryStat
          theme={theme}
          value={activeItems}
          label="Active Items"
          valueClassName="text-2xl font-bold text-green-600"
        />
      </motion.div>
    </motion.div>
  );
};
