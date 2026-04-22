"use client";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
} from "recharts";
import { performanceData, fabricStressTest } from "../data/mockHistoricalData";
import { useProject } from "../contexts/ProjectContext";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";

// ==========================================
// لوحة القيادة (Analytical Dashboard)
// عرض البيانات الهندسية والإحصائية
// ==========================================

const Dashboard: React.FC = () => {
  const { activeScene } = useProject();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 h-full overflow-y-auto bg-black/8">
      {/* 1. مخطط أداء الأزياء عبر المشاهد */}
      <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] p-6 backdrop-blur-xl border border-white/8 shadow-lg">
        <div className="bg-white/[0.04] p-6 rounded-[22px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">
              Costume Performance History
            </h3>
            <span className="text-[10px] font-mono text-white/55">
              DATA SOURCE: SCENE LOGS
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.08)"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.55)" }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.55)" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(0,0,0,0.8)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#fff",
                  }}
                />
                <Legend
                  wrapperStyle={{
                    fontSize: "12px",
                    paddingTop: "10px",
                    color: "rgba(255,255,255,0.85)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="durability"
                  stroke="#2563eb"
                  strokeWidth={2}
                  name="Durability"
                  activeDot={{ r: 8 }}
                />
                <Line
                  type="monotone"
                  dataKey="comfort"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Actor Comfort"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardSpotlight>

      {/* 2. رادار تحليل خصائص القماش */}
      <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] p-6 backdrop-blur-xl border border-white/8 shadow-lg">
        <div className="bg-white/[0.04] p-6 rounded-[22px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">
              Fabric Stress Test Analysis
            </h3>
            <span className="text-[10px] font-mono bg-blue-600/20 text-blue-300 px-2 py-1 rounded border border-blue-500/30">
              ACTIVE: {activeScene}
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart
                cx="50%"
                cy="50%"
                outerRadius="80%"
                data={fabricStressTest}
              >
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.55)" }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 150]}
                  tick={{ fontSize: 8, fill: "rgba(255,255,255,0.45)" }}
                />
                <Radar
                  name="Current Selection"
                  dataKey="A"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.6}
                />
                <Radar
                  name="Safety Standard"
                  dataKey="B"
                  stroke="#82ca9d"
                  fill="#82ca9d"
                  fillOpacity={0.3}
                />
                <Legend
                  wrapperStyle={{
                    fontSize: "12px",
                    color: "rgba(255,255,255,0.85)",
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(0,0,0,0.8)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardSpotlight>
    </div>
  );
};

export default Dashboard;
