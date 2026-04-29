"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  BarChart3,
  Calculator,
  Copy,
  FileText,
  Loader2,
  Plus,
  Save,
  TrendingUp,
  Zap,
} from "lucide-react";
import React from "react";
import { Toaster } from "react-hot-toast";

import { BudgetAnalytics } from "./BudgetAnalytics";
import { BudgetHeader } from "./BudgetHeader";
import { BudgetQuickStats } from "./BudgetQuickStats";
import { BudgetSidebar } from "./BudgetSidebar";
import { DetailView } from "./DetailView";
import { EnhancedChart } from "./EnhancedChart";
import { ExportModal } from "./ExportModal";
import { TemplateSelector } from "./TemplateSelector";
import { TopSheet } from "./TopSheet";
import { useBudgetState } from "./useBudgetState";

import type { Budget } from "../lib/types";

interface BudgetAppProps {
  initialBudget?: Budget;
  initialScript?: string;
}

interface GenerateButtonProps {
  status: string;
  scriptText: string;
  onClick: () => void;
}

const GenerateButton: React.FC<GenerateButtonProps> = ({
  status,
  scriptText,
  onClick,
}) => {
  const isDisabled = !scriptText || status === "analyzing";
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`
        flex items-center gap-2 px-8 py-3 rounded-lg text-white font-semibold transition-all shadow-lg transform hover:scale-105
        ${isDisabled ? "bg-white/8 cursor-not-allowed" : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl"}
      `}
    >
      {status === "analyzing" ? (
        <>
          <Loader2 className="animate-spin" size={20} />
          Analyzing...
        </>
      ) : status === "calculating" ? (
        <>
          <Calculator size={20} className="animate-pulse" />
          Calculating...
        </>
      ) : (
        <>
          <Zap size={20} />
          Generate Budget
        </>
      )}
    </button>
  );
};

interface InputSectionProps {
  scriptText: string;
  setScriptText: (v: string) => void;
  budgetName: string;
  setBudgetName: (v: string) => void;
  status: string;
  error: string | null;
  theme: string;
  onLoadExample: () => void;
  onShowTemplateSelector: () => void;
  onSave: () => void;
  onDuplicate: () => void;
  onGenerate: () => void;
}

const InputSection: React.FC<InputSectionProps> = ({
  scriptText,
  setScriptText,
  budgetName,
  setBudgetName,
  status,
  error,
  theme,
  onLoadExample,
  onShowTemplateSelector,
  onSave,
  onDuplicate,
  onGenerate,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1 }}
    className={`rounded-xl shadow-lg border ${theme === "dark" ? "bg-black/18 border-white/8" : "bg-white/[0.04] border-white/8"} p-6 mb-8`}
  >
    <div className="flex justify-between items-center mb-6">
      <h2
        className={`text-xl font-semibold flex items-center gap-2 ${theme === "dark" ? "text-white" : "text-white"}`}
      >
        <FileText size={24} className="text-indigo-500" />
        Script Input &amp; Analysis
      </h2>
      <div className="flex gap-2">
        <button
          onClick={onShowTemplateSelector}
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium px-3 py-1 rounded-md hover:bg-indigo-50 transition-colors flex items-center gap-1"
        >
          <Plus size={14} />
          Template
        </button>
        <button
          onClick={onLoadExample}
          className="text-sm text-white/55 hover:text-white/85 font-medium px-3 py-1 rounded-md hover:bg-white/8/[0.04]/[0.04] transition-colors"
        >
          Load Example
        </button>
      </div>
    </div>

    <textarea
      value={scriptText}
      onChange={(e) => setScriptText(e.target.value)}
      placeholder="Paste your movie script, scene description, or project outline here. Include details about locations, cast size, stunts, VFX, shooting schedule, etc. for more accurate estimates..."
      className={`w-full h-64 p-4 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-mono resize-none ${theme === "dark" ? "bg-black/14 border-white/8 text-white placeholder-white/45" : "border-white/8 text-white placeholder-white/45"}`}
    />

    <div className="mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="flex flex-col sm:flex-row gap-2 flex-1">
        <input
          type="text"
          value={budgetName}
          onChange={(e) => setBudgetName(e.target.value)}
          placeholder="Project name (optional)"
          className={`px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-indigo-500 ${theme === "dark" ? "bg-black/22 border-white/8 text-white" : "border-white/8"}`}
        />
        {status === "complete" && (
          <div className="flex gap-2">
            <button
              onClick={onSave}
              className="flex items-center gap-2 px-4 py-2 bg-black/28 hover:bg-black/22 text-white rounded-md font-medium transition-colors"
            >
              <Save size={16} />
              Save
            </button>
            <button
              onClick={onDuplicate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
            >
              <Copy size={16} />
              Duplicate
            </button>
          </div>
        )}
      </div>

      <GenerateButton
        status={status}
        scriptText={scriptText}
        onClick={onGenerate}
      />
    </div>

    {error && (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 p-4 bg-red-50 border border-red-200 rounded-[22px] flex items-start gap-3 text-red-700"
      >
        <AlertCircle size={20} className="mt-0.5 shrink-0" />
        <div>
          <h4 className="font-semibold">Error</h4>
          <p className="text-sm">{error}</p>
        </div>
      </motion.div>
    )}
  </motion.div>
);

interface ActionBarProps {
  theme: string;
  showChart: boolean;
  showAnalytics: boolean;
  onToggleChart: () => void;
  onToggleAnalytics: () => void;
}

const ActionBar: React.FC<ActionBarProps> = ({
  theme,
  showChart,
  showAnalytics,
  onToggleChart,
  onToggleAnalytics,
}) => (
  <div
    className={`p-4 rounded-xl border ${theme === "dark" ? "bg-black/18 border-white/8" : "bg-white/[0.04] border-white/8"} shadow-md`}
  >
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onToggleChart}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${showChart ? "bg-indigo-600 text-white" : theme === "dark" ? "bg-black/22 text-white/68 hover:bg-black/28" : "bg-white/6 text-white/68 hover:bg-white/8/8"}`}
        >
          <BarChart3 size={16} />
          {showChart ? "Hide Charts" : "Show Charts"}
        </button>
        <button
          onClick={onToggleAnalytics}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${showAnalytics ? "bg-purple-600 text-white" : theme === "dark" ? "bg-black/22 text-white/68 hover:bg-black/28" : "bg-white/6 text-white/68 hover:bg-white/8/8"}`}
        >
          <TrendingUp size={16} />
          {showAnalytics ? "Hide Analytics" : "Analytics"}
        </button>
      </div>
      <div
        className={`text-sm ${theme === "dark" ? "text-white/55" : "text-white/45"}`}
      >
        Last updated: {new Date().toLocaleString()}
      </div>
    </div>
  </div>
);

const BudgetApp: React.FC<BudgetAppProps> = ({
  initialBudget,
  initialScript,
}) => {
  const {
    scriptText,
    setScriptText,
    budget,
    status,
    error,
    budgetName,
    setBudgetName,
    showChart,
    setShowChart,
    showAnalytics,
    setShowAnalytics,
    showExportModal,
    setShowExportModal,
    showTemplateSelector,
    setShowTemplateSelector,
    sidebarOpen,
    setSidebarOpen,
    searchTerm,
    setSearchTerm,
    preferences,
    risk,
    aiAnalysis,
    finalTotal,
    filteredBudgets,
    resolvedTheme,
    stats,
    handleGenerate,
    handleRiskUpdate,
    handleLineItemUpdate,
    loadExample,
    saveBudget,
    loadSavedBudget,
    deleteSavedBudget,
    duplicateBudget,
    loadTemplate,
    savePreferences,
    formatCurrency,
  } = useBudgetState({ initialBudget, initialScript });

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${preferences.theme === "dark" ? "dark bg-black/14" : "bg-gradient-to-br from-white/[0.04] to-white/6"}`}
    >
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background:
              preferences.theme === "dark"
                ? "rgba(0,0,0,0.18)"
                : "rgba(255,255,255,0.04)",
            color: preferences.theme === "dark" ? "#F9FAFB" : "#111827",
          },
        }}
      />

      <BudgetHeader
        preferences={preferences}
        onToggleTheme={() =>
          savePreferences({
            theme: preferences.theme === "dark" ? "light" : "dark",
          })
        }
        onOpenExport={() => setShowExportModal(true)}
        onOpenSidebar={() => setSidebarOpen(true)}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-center mb-12 ${status === "complete" ? "hidden" : ""}`}
        >
          <h2
            className={`text-4xl font-bold mb-4 ${preferences.theme === "dark" ? "text-white" : "text-white"}`}
          >
            Create Professional Film Budgets with AI
          </h2>
          <p
            className={`text-xl ${preferences.theme === "dark" ? "text-white/68" : "text-white/55"}`}
          >
            Transform your script into a detailed, industry-standard budget in
            minutes
          </p>
        </motion.div>

        <InputSection
          scriptText={scriptText}
          setScriptText={setScriptText}
          budgetName={budgetName}
          setBudgetName={setBudgetName}
          status={status}
          error={error}
          theme={preferences.theme}
          onLoadExample={loadExample}
          onShowTemplateSelector={() => setShowTemplateSelector(true)}
          onSave={() => saveBudget()}
          onDuplicate={duplicateBudget}
          onGenerate={handleGenerate}
        />

        <AnimatePresence>
          {(status === "complete" || budget.grandTotal > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <BudgetQuickStats
                grandTotal={budget.grandTotal}
                finalTotal={finalTotal}
                risk={risk}
                preferences={preferences}
                formatCurrency={formatCurrency}
              />

              <ActionBar
                theme={preferences.theme}
                showChart={showChart}
                showAnalytics={showAnalytics}
                onToggleChart={() => setShowChart(!showChart)}
                onToggleAnalytics={() => setShowAnalytics(!showAnalytics)}
              />

              {showChart && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`rounded-xl shadow-lg border overflow-hidden ${preferences.theme === "dark" ? "bg-black/18 border-white/8" : "bg-white/[0.04] border-white/8"}`}
                >
                  <EnhancedChart budget={budget} theme={resolvedTheme} />
                </motion.div>
              )}

              {showAnalytics && aiAnalysis && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <BudgetAnalytics
                    analysis={aiAnalysis}
                    stats={stats}
                    budget={budget}
                    theme={resolvedTheme}
                  />
                </motion.div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-1">
                  <TopSheet
                    budget={budget}
                    risk={risk}
                    onUpdateRisk={handleRiskUpdate}
                    theme={resolvedTheme}
                  />
                </div>
                <div className="xl:col-span-2">
                  <DetailView
                    budget={budget}
                    onUpdateLineItem={handleLineItemUpdate}
                    theme={resolvedTheme}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BudgetSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        filteredBudgets={filteredBudgets}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onLoad={loadSavedBudget}
        onDelete={deleteSavedBudget}
        preferences={preferences}
      />

      <TemplateSelector
        isOpen={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        onSelect={loadTemplate}
        theme={resolvedTheme}
      />

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        budget={budget}
        budgetName={budgetName}
        theme={resolvedTheme}
      />
    </div>
  );
};

export default BudgetApp;
