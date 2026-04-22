import React, { useMemo } from "react";
import { motion } from "framer-motion";
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
import { Budget } from "../lib/types";
import { COLOR_PALETTE } from "../lib/constants";

interface EnhancedChartProps {
  budget: Budget;
  theme: "light" | "dark";
}

export const EnhancedChart: React.FC<EnhancedChartProps> = ({
  budget,
  theme,
}) => {
  const chartData = useMemo(() => {
    // Section data for pie chart
    const sectionData = budget.sections
      .map((section) => ({
        name: section.name,
        value: section.total,
        percentage:
          budget.grandTotal > 0
            ? ((section.total / budget.grandTotal) * 100).toFixed(1)
            : "0",
        color: section.color || "#3B82F6",
      }))
      .filter((item) => item.value > 0);

    // Top categories data
    const allCategories = budget.sections
      .flatMap((section) =>
        section.categories.map((cat) => ({
          name: cat.name,
          section: section.name,
          value: cat.total,
          code: cat.code,
          color: section.color || "#3B82F6",
        }))
      )
      .filter((cat) => cat.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);

    // Section comparison over time (simulated historical data)
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
        atl: budget.sections.find((s) => s.id === "atl")?.total || 0,
        production:
          budget.sections.find((s) => s.id === "production")?.total || 0,
        post: budget.sections.find((s) => s.id === "post")?.total || 0,
        other: budget.sections.find((s) => s.id === "other")?.total || 0,
      },
    ];

    return { sectionData, allCategories, historicalData };
  }, [budget]);

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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          className={`p-3 rounded-[22px] shadow-lg border ${
            theme === "dark"
              ? "bg-black/18 border-white/8 text-white"
              : "bg-white/[0.04] border-white/8"
          }`}
        >
          <p className="font-semibold">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const chartVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-6"
    >
      <h3
        className={`text-lg font-bold mb-6 ${
          theme === "dark" ? "text-white" : "text-white"
        }`}
      >
        Budget Visualization & Analytics
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Pie Chart */}
        <motion.div
          variants={chartVariants}
          className={`p-6 rounded-xl border ${
            theme === "dark"
              ? "bg-black/18 border-white/8"
              : "bg-white/[0.04] border-white/8"
          } shadow-md`}
        >
          <h4
            className={`text-lg font-semibold mb-4 ${
              theme === "dark" ? "text-white" : "text-white"
            }`}
          >
            Budget Distribution by Section
          </h4>
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
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Bar Chart - Top Categories */}
        <motion.div
          variants={chartVariants}
          className={`p-6 rounded-xl border ${
            theme === "dark"
              ? "bg-black/18 border-white/8"
              : "bg-white/[0.04] border-white/8"
          } shadow-md`}
        >
          <h4
            className={`text-lg font-semibold mb-4 ${
              theme === "dark" ? "text-white" : "text-white"
            }`}
          >
            Top 15 Categories by Cost
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.allCategories} layout="vertical">
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={theme === "dark" ? "#374151" : "#E5E7EB"}
              />
              <XAxis
                type="number"
                tickFormatter={formatShort}
                stroke={theme === "dark" ? "#9CA3AF" : "#6B7280"}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fontSize: 10 }}
                stroke={theme === "dark" ? "#9CA3AF" : "#6B7280"}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Historical Comparison */}
      <motion.div
        variants={chartVariants}
        className={`p-6 rounded-xl border mb-8 ${
          theme === "dark"
            ? "bg-black/18 border-white/8"
            : "bg-white/[0.04] border-white/8"
        } shadow-md`}
      >
        <h4
          className={`text-lg font-semibold mb-4 ${
            theme === "dark" ? "text-white" : "text-white"
          }`}
        >
          Budget Evolution by Phase
        </h4>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData.historicalData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={theme === "dark" ? "#374151" : "#E5E7EB"}
            />
            <XAxis
              dataKey="name"
              stroke={theme === "dark" ? "#9CA3AF" : "#6B7280"}
            />
            <YAxis
              tickFormatter={formatShort}
              stroke={theme === "dark" ? "#9CA3AF" : "#6B7280"}
            />
            <Tooltip content={<CustomTooltip />} />
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
      </motion.div>

      {/* Summary Stats */}
      <motion.div
        variants={chartVariants}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <div
          className={`p-4 rounded-xl border text-center ${
            theme === "dark"
              ? "bg-black/18 border-white/8"
              : "bg-white/[0.04] border-white/8"
          }`}
        >
          <div
            className={`text-2xl font-bold ${
              theme === "dark" ? "text-white" : "text-white"
            }`}
          >
            {formatCurrency(budget.grandTotal)}
          </div>
          <div
            className={`text-sm ${
              theme === "dark" ? "text-white/55" : "text-white/55"
            }`}
          >
            Total Budget
          </div>
        </div>
        <div
          className={`p-4 rounded-xl border text-center ${
            theme === "dark"
              ? "bg-black/18 border-white/8"
              : "bg-white/[0.04] border-white/8"
          }`}
        >
          <div className={`text-2xl font-bold text-indigo-600`}>
            {budget.sections.length}
          </div>
          <div
            className={`text-sm ${
              theme === "dark" ? "text-white/55" : "text-white/55"
            }`}
          >
            Sections
          </div>
        </div>
        <div
          className={`p-4 rounded-xl border text-center ${
            theme === "dark"
              ? "bg-black/18 border-white/8"
              : "bg-white/[0.04] border-white/8"
          }`}
        >
          <div className={`text-2xl font-bold text-purple-600`}>
            {budget.sections.reduce(
              (sum, section) => sum + section.categories.length,
              0
            )}
          </div>
          <div
            className={`text-sm ${
              theme === "dark" ? "text-white/55" : "text-white/55"
            }`}
          >
            Categories
          </div>
        </div>
        <div
          className={`p-4 rounded-xl border text-center ${
            theme === "dark"
              ? "bg-black/18 border-white/8"
              : "bg-white/[0.04] border-white/8"
          }`}
        >
          <div className={`text-2xl font-bold text-green-600`}>
            {budget.sections.reduce(
              (sum, section) =>
                sum +
                section.categories.reduce(
                  (catSum, cat) =>
                    catSum + cat.items.filter((item) => item.total > 0).length,
                  0
                ),
              0
            )}
          </div>
          <div
            className={`text-sm ${
              theme === "dark" ? "text-white/55" : "text-white/55"
            }`}
          >
            Active Items
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
