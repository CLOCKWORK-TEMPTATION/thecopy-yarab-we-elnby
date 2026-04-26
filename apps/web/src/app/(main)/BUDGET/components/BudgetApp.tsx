
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Calculator,
  Loader2,
  AlertCircle,
  Download,
  Save,
  Trash2,
  Film,
  DollarSign,
  BarChart3,
  Moon,
  Sun,
  Search,
  Plus,
  Copy,
  TrendingUp,
  X,
  Menu,
  Zap,
  Star,
  Award,
  Target,
} from "lucide-react";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import toast, { Toaster } from "react-hot-toast";

import { logger } from "@/lib/ai/utils/logger";

import { INITIAL_BUDGET_TEMPLATE, BUDGET_TEMPLATES } from "../lib/constants";
import {
  Budget,
  LineItem,
  SecurityRisk,
  ProcessingStatus,
  SavedBudget,
  AIAnalysis,
  UserPreferences,
} from "../lib/types";

// geminiService نُقل إلى API routes لأسباب أمنية — لا يُستدعى مباشرة من العميل
import { BudgetAnalytics } from "./BudgetAnalytics";
import { DetailView } from "./DetailView";
import { EnhancedChart } from "./EnhancedChart";
import { ExportModal } from "./ExportModal";
import { TemplateSelector } from "./TemplateSelector";
import { TopSheet } from "./TopSheet";

// Utility functions
const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

// Enhanced budget calculation with real-time updates
const recalculateBudget = (budget: Budget): Budget => {
  const newSections = budget.sections.map((section) => {
    const newCategories = section.categories.map((category) => {
      const newItems = category.items.map((item) => ({
        ...item,
        total: item.amount * item.rate,
        lastModified: item.lastModified ?? new Date().toISOString(),
      }));

      const catTotal = newItems.reduce((sum, item) => sum + item.total, 0);
      return { ...category, items: newItems, total: catTotal };
    });

    const sectionTotal = newCategories.reduce((sum, cat) => sum + cat.total, 0);
    return { ...section, categories: newCategories, total: sectionTotal };
  });

  const grandTotal = newSections.reduce((sum, sec) => sum + sec.total, 0);

  return { ...budget, sections: newSections, grandTotal };
};

interface BudgetAppProps {
  initialBudget?: Budget;
  initialScript?: string;
}

const BudgetApp: React.FC<BudgetAppProps> = ({
  initialBudget,
  initialScript,
}) => {
  const [scriptText, setScriptText] = useState(initialScript ?? "");
  const [budget, setBudget] = useState<Budget>(
    initialBudget ?? INITIAL_BUDGET_TEMPLATE
  );
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [showChart, setShowChart] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [savedBudgets, setSavedBudgets] = useState<SavedBudget[]>([]);
  const [budgetName, setBudgetName] = useState(
    initialBudget?.metadata?.title ?? ""
  );
  const [, setSelectedTemplate] = useState<string>("independent-feature");
  const [showExportModal, setShowExportModal] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>({
    language: "en",
    theme: "light",
    currency: "USD",
    dateFormat: "MM/dd/yyyy",
    notifications: true,
    autoSave: false,
  });

  // Risk and security fund state
  const [risk, setRisk] = useState<SecurityRisk>({
    bondFee: { percent: 0.02, total: 0 },
    contingency: { percent: 0.1, total: 0 },
    credits: { percent: 0.25, total: 0 },
  });

  // AI Analysis state
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);

  // Load saved data on mount
  useEffect(() => {
    loadSavedData();
    loadPreferences();
  }, []);

  // Sync props if they change and are non-empty (e.g. after generation)
  useEffect(() => {
    if (initialBudget) {
      setBudget(recalculateBudget(initialBudget));
      setBudgetName(initialBudget.metadata?.title ?? "");
      setStatus("complete");
    }
    if (initialScript) {
      setScriptText(initialScript);
    }
  }, [initialBudget, initialScript]);

  // Auto-save functionality
  useEffect(() => {
    if (preferences.autoSave && budgetName && budget.grandTotal > 0) {
      const timeout = setTimeout(() => {
        saveBudget(true);
      }, 5000);
      return () => {
        clearTimeout(timeout);
      };
    }
    return undefined;
  }, [budget, budgetName, preferences.autoSave]);

  // Calculate risk totals
  useEffect(() => {
    const baseTotal = budget.grandTotal;
    setRisk((prev) => ({
      bondFee: { ...prev.bondFee, total: baseTotal * prev.bondFee.percent },
      contingency: {
        ...prev.contingency,
        total: baseTotal * prev.contingency.percent,
      },
      credits: { ...prev.credits, total: -(baseTotal * prev.credits.percent) },
    }));
  }, [budget.grandTotal]);

  const loadSavedData = () => {
    try {
      const saved = localStorage.getItem("filmbudgetai-saved-v3");
      if (saved) {
        setSavedBudgets(JSON.parse(saved));
      }
    } catch (e) {
      logger.error("Failed to load saved budgets:", e);
    }
  };

  const loadPreferences = () => {
    try {
      const saved = localStorage.getItem("filmbudgetai-preferences");
      if (saved) {
        setPreferences((prev) => ({ ...prev, ...JSON.parse(saved) }));
      }
    } catch (e) {
      logger.error("Failed to load preferences:", e);
    }
  };

  const savePreferences = (newPrefs: Partial<UserPreferences>) => {
    const updated = { ...preferences, ...newPrefs };
    setPreferences(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("filmbudgetai-preferences", JSON.stringify(updated));
    }
  };

  const handleGenerate = async () => {
    if (!scriptText.trim()) {
      setError("Please enter a script or scene description");
      return;
    }

    setStatus("analyzing");
    setError(null);

    try {
      // Show progress
      toast.promise(
        (async () => {
          // توليد الميزانية عبر API route آمن
          setStatus("analyzing");
          const genResponse = await fetch("/api/budget/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scenario: scriptText, title: budgetName }),
          });
          const genData = await genResponse.json();
          if (!genResponse.ok) {
            throw new Error(genData.error ?? "فشل في توليد الميزانية");
          }
          const aiResponse = genData.data?.budget ?? genData.budget;

          setStatus("calculating");
          const cleanBudget = recalculateBudget(aiResponse);

          setBudget(cleanBudget);

          // تحليل السيناريو عبر API route آمن
          const analyzeResponse = await fetch("/api/budget/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scenario: scriptText }),
          });
          const analyzeData = await analyzeResponse.json();
          if (analyzeResponse.ok) {
            const analysisResult =
              analyzeData.data?.analysis ?? analyzeData.analysis;
            if (analysisResult) {
              setAiAnalysis(analysisResult);
            }
          }

          // Auto-generate budget name
          const firstLine = (scriptText.split("\n")[0] ?? "").substring(0, 50);
          setBudgetName(firstLine || "Untitled Project");

          setStatus("complete");
          return "Budget generated successfully!";
        })(),
        {
          loading: "Analyzing script...",
          success: (msg) => msg,
          error: (err) => `Error: ${err.message}`,
        }
      );
    } catch (e: any) {
      logger.error("Budget generation failed", { error: e });
      setError(e.message ?? "Failed to generate budget. Please try again.");
      setStatus("error");
      toast.error(e.message ?? "Failed to generate budget");
    }
  };

  const handleRiskUpdate = (
    key: keyof SecurityRisk,
    _field: "percent",
    value: number
  ) => {
    setRisk((prev) => ({
      ...prev,
      [key]: { ...prev[key], percent: value },
    }));
  };

  const handleLineItemUpdate = useCallback(
    (
      sectionId: string,
      categoryCode: string,
      itemCode: string,
      field: keyof LineItem,
      value: string | number
    ) => {
      setBudget((prevBudget) => {
        const newSections = prevBudget.sections.map((section) => {
          if (section.id !== sectionId) return section;

          const newCategories = section.categories.map((category) => {
            if (category.code !== categoryCode) return category;

            const newItems = category.items.map((item) => {
              if (item.code !== itemCode) return item;

              const updatedItem = {
                ...item,
                [field]: value,
                lastModified: new Date().toISOString(),
              };

              if (field === "amount" || field === "rate") {
                updatedItem.total =
                  Number(updatedItem.amount) * Number(updatedItem.rate);
              }

              return updatedItem;
            });

            const catTotal = newItems.reduce((sum, i) => sum + i.total, 0);
            return { ...category, items: newItems, total: catTotal };
          });

          const secTotal = newCategories.reduce((sum, c) => sum + c.total, 0);
          return { ...section, categories: newCategories, total: secTotal };
        });

        const grandTotal = newSections.reduce((sum, s) => sum + s.total, 0);

        return { ...prevBudget, sections: newSections, grandTotal };
      });
    },
    []
  );

  const loadExample = () => {
    setScriptText(`SCENE 1: EXT. DESERT HIGHWAY - DAY

A red 1969 Mustang convertible speeds down Route 66.
JACK (30s, rugged) drives. He looks tired. 

Suddenly, a HELICOPTER rises from the canyon floor behind him.
Machine gun fire erupts, kicking up dust around the Mustang.

JACK
Not today.

He punches the gas. The car engine ROARS.
The chase is on. 

EXT. LAS VEGAS STRIP - NIGHT

The Mustang weaves through traffic.
Police sirens wail. 10 Cop cars are in pursuit.

Jack drifts around a corner, crashing into a fruit stand.
Stunt Driver needed here.
Major explosion as the cop car hits a tanker.

SCENE 2: INT. ABANDONED WAREHOUSE - NIGHT

SARAH (28) waits in the shadows. She's dressed in tactical gear.
The warehouse is filled with shipping containers.

SARAH
(into radio)
Target is approaching. Get ready.

This is a high-stakes action sequence with multiple locations,
stunt work, visual effects, and a large cast.`);
    toast.success("Example script loaded!");
  };

  const saveBudget = (isAutoSave = false) => {
    if (!budgetName.trim()) {
      if (!isAutoSave) {
        setError("Please enter a budget name before saving");
        toast.error("Please enter a budget name");
      }
      return;
    }

    const newSaved: SavedBudget = {
      id: Date.now().toString(),
      name: budgetName,
      budget: JSON.parse(JSON.stringify(budget)), // Deep copy
      script: scriptText,
      date: new Date().toISOString(),
      tags: ["manual-save"],
    };

    const updatedSaved = [
      ...savedBudgets.filter((b) => b.name !== budgetName),
      newSaved,
    ];
    setSavedBudgets(updatedSaved);
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "filmbudgetai-saved-v3",
        JSON.stringify(updatedSaved)
      );
    }

    if (!isAutoSave) {
      toast.success("Budget saved successfully!");
    }
  };

  const loadSavedBudget = (saved: SavedBudget) => {
    setBudget(saved.budget);
    setScriptText(saved.script);
    setBudgetName(saved.name);
    setStatus("complete");
    toast.success(`Loaded: ${saved.name}`);
  };

  const deleteSavedBudget = (id: string) => {
    const updatedSaved = savedBudgets.filter((b) => b.id !== id);
    setSavedBudgets(updatedSaved);
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "filmbudgetai-saved-v3",
        JSON.stringify(updatedSaved)
      );
    }
    toast.success("Budget deleted");
  };

  const duplicateBudget = () => {
    const newName = `${budgetName} (Copy)`;
    const newSaved: SavedBudget = {
      id: Date.now().toString(),
      name: newName,
      budget: JSON.parse(JSON.stringify(budget)),
      script: scriptText,
      date: new Date().toISOString(),
      tags: ["duplicate"],
    };

    const updatedSaved = [...savedBudgets, newSaved];
    setSavedBudgets(updatedSaved);
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "filmbudgetai-saved-v3",
        JSON.stringify(updatedSaved)
      );
    }
    toast.success("Budget duplicated!");
  };

  const loadTemplate = (templateId: string) => {
    const template = BUDGET_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setBudget(template.budget);
      setSelectedTemplate(templateId);
      setShowTemplateSelector(false);
      toast.success(`Loaded template: ${template.name}`);
    }
  };

  const filteredBudgets = useMemo(() => {
    return savedBudgets
      .filter(
        (budget) =>
          budget.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          budget.script.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [savedBudgets, searchTerm]);

  const finalTotal =
    budget.grandTotal +
    risk.bondFee.total +
    risk.contingency.total +
    risk.credits.total;

  const stats = useMemo(() => {
    const totalItems = budget.sections.reduce(
      (sum, section) =>
        sum +
        section.categories.reduce(
          (catSum, cat) => catSum + cat.items.length,
          0
        ),
      0
    );

    const activeItems = budget.sections.reduce(
      (sum, section) =>
        sum +
        section.categories.reduce(
          (catSum, cat) =>
            catSum + cat.items.filter((item) => item.total > 0).length,
          0
        ),
      0
    );

    return {
      totalItems,
      activeItems,
      totalCategories: budget.sections.reduce(
        (sum, section) => sum + section.categories.length,
        0
      ),
      efficiency:
        totalItems > 0 ? Math.round((activeItems / totalItems) * 100) : 0,
    };
  }, [budget]);

  const resolvedTheme: "light" | "dark" =
    preferences.theme === "auto"
      ? typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : preferences.theme;

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        preferences.theme === "dark"
          ? "dark bg-black/14"
          : "bg-gradient-to-br from-white/[0.04] to-white/6"
      }`}
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

      {/* Header */}
      <header
        className={`sticky top-0 z-50 border-b ${
          preferences.theme === "dark"
            ? "bg-black/18 border-white/8"
            : "bg-white/[0.04] border-white/8"
        } shadow-sm backdrop-blur-sm bg-black/95`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              className="bg-gradient-to-r from-indigo-600 to-purple-600 p-2 rounded-lg text-white shadow-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Film size={20} />
            </motion.div>
            <h1
              className={`text-xl font-bold ${
                preferences.theme === "dark" ? "text-white" : "text-white"
              }`}
            >
              FilmBudget
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Pro
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                savePreferences({
                  theme: preferences.theme === "dark" ? "light" : "dark",
                })
              }
              className={`p-2 rounded-lg transition-colors ${
                preferences.theme === "dark"
                  ? "text-white/55 hover:text-white hover:bg-black/22"
                  : "text-white/55 hover:text-white hover:bg-white/8/6"
              }`}
            >
              {preferences.theme === "dark" ? (
                <Sun size={18} />
              ) : (
                <Moon size={18} />
              )}
            </button>

            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Download size={16} />
              Export
            </button>

            <button
              onClick={() => setSidebarOpen(true)}
              className={`p-2 rounded-lg transition-colors ${
                preferences.theme === "dark"
                  ? "text-white/55 hover:text-white hover:bg-black/22"
                  : "text-white/55 hover:text-white hover:bg-white/8/6"
              }`}
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-center mb-12 ${
            status === "complete" ? "hidden" : ""
          }`}
        >
          <h2
            className={`text-4xl font-bold mb-4 ${
              preferences.theme === "dark" ? "text-white" : "text-white"
            }`}
          >
            Create Professional Film Budgets with AI
          </h2>
          <p
            className={`text-xl ${
              preferences.theme === "dark" ? "text-white/68" : "text-white/55"
            }`}
          >
            Transform your script into a detailed, industry-standard budget in
            minutes
          </p>
        </motion.div>

        {/* Input Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`rounded-xl shadow-lg border ${
            preferences.theme === "dark"
              ? "bg-black/18 border-white/8"
              : "bg-white/[0.04] border-white/8"
          } p-6 mb-8`}
        >
          <div className="flex justify-between items-center mb-6">
            <h2
              className={`text-xl font-semibold flex items-center gap-2 ${
                preferences.theme === "dark" ? "text-white" : "text-white"
              }`}
            >
              <FileText size={24} className="text-indigo-500" />
              Script Input & Analysis
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowTemplateSelector(true)}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium px-3 py-1 rounded-md hover:bg-indigo-50 transition-colors flex items-center gap-1"
              >
                <Plus size={14} />
                Template
              </button>
              <button
                onClick={loadExample}
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
            className={`w-full h-64 p-4 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-mono resize-none ${
              preferences.theme === "dark"
                ? "bg-black/14 border-white/8 text-white placeholder-white/45"
                : "border-white/8 text-white placeholder-white/45"
            }`}
          />

          <div className="mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              <input
                type="text"
                value={budgetName}
                onChange={(e) => setBudgetName(e.target.value)}
                placeholder="Project name (optional)"
                className={`px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-indigo-500 ${
                  preferences.theme === "dark"
                    ? "bg-black/22 border-white/8 text-white"
                    : "border-white/8"
                }`}
              />
              {status === "complete" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => saveBudget()}
                    className="flex items-center gap-2 px-4 py-2 bg-black/28 hover:bg-black/22 text-white rounded-md font-medium transition-colors"
                  >
                    <Save size={16} />
                    Save
                  </button>
                  <button
                    onClick={duplicateBudget}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
                  >
                    <Copy size={16} />
                    Duplicate
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleGenerate}
              disabled={!scriptText || status === "analyzing"}
              className={`
                flex items-center gap-2 px-8 py-3 rounded-lg text-white font-semibold transition-all shadow-lg transform hover:scale-105
                ${
                  !scriptText || status === "analyzing"
                    ? "bg-white/8 cursor-not-allowed"
                    : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl"
                }
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

        {/* Results Section */}
        <AnimatePresence>
          {(status === "complete" || budget.grandTotal > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className={`p-6 rounded-xl shadow-md border ${
                    preferences.theme === "dark"
                      ? "bg-black/18 border-white/8"
                      : "bg-white/[0.04] border-white/8"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-sm ${
                        preferences.theme === "dark"
                          ? "text-white/55"
                          : "text-white/55"
                      }`}
                    >
                      Subtotal
                    </span>
                    <DollarSign size={16} className="text-blue-500" />
                  </div>
                  <div
                    className={`text-2xl font-bold ${
                      preferences.theme === "dark" ? "text-white" : "text-white"
                    }`}
                  >
                    {formatCurrency(budget.grandTotal)}
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className={`p-6 rounded-xl shadow-md border ${
                    preferences.theme === "dark"
                      ? "bg-black/18 border-white/8"
                      : "bg-white/[0.04] border-white/8"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-sm ${
                        preferences.theme === "dark"
                          ? "text-white/55"
                          : "text-white/55"
                      }`}
                    >
                      Contingency
                    </span>
                    <Target size={16} className="text-orange-500" />
                  </div>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatCurrency(risk.contingency.total)}
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className={`p-6 rounded-xl shadow-md border ${
                    preferences.theme === "dark"
                      ? "bg-black/18 border-white/8"
                      : "bg-white/[0.04] border-white/8"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-sm ${
                        preferences.theme === "dark"
                          ? "text-white/55"
                          : "text-white/55"
                      }`}
                    >
                      Bond Fee
                    </span>
                    <Award size={16} className="text-blue-500" />
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(risk.bondFee.total)}
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className={`p-6 rounded-xl shadow-md border ${
                    preferences.theme === "dark"
                      ? "bg-black/18 border-white/8"
                      : "bg-white/[0.04] border-white/8"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-sm ${
                        preferences.theme === "dark"
                          ? "text-white/55"
                          : "text-white/55"
                      }`}
                    >
                      Tax Credits
                    </span>
                    <TrendingUp size={16} className="text-green-500" />
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(Math.abs(risk.credits.total))}
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className={`p-6 rounded-xl shadow-md border bg-gradient-to-r from-green-500 to-emerald-500 text-white`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm opacity-90">Grand Total</span>
                    <Star size={16} />
                  </div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(finalTotal)}
                  </div>
                </motion.div>
              </div>

              {/* Action Bar */}
              <div
                className={`p-4 rounded-xl border ${
                  preferences.theme === "dark"
                    ? "bg-black/18 border-white/8"
                    : "bg-white/[0.04] border-white/8"
                } shadow-md`}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setShowChart(!showChart)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                        showChart
                          ? "bg-indigo-600 text-white"
                          : preferences.theme === "dark"
                            ? "bg-black/22 text-white/68 hover:bg-black/28"
                            : "bg-white/6 text-white/68 hover:bg-white/8/8"
                      }`}
                    >
                      <BarChart3 size={16} />
                      {showChart ? "Hide Charts" : "Show Charts"}
                    </button>
                    <button
                      onClick={() => setShowAnalytics(!showAnalytics)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                        showAnalytics
                          ? "bg-purple-600 text-white"
                          : preferences.theme === "dark"
                            ? "bg-black/22 text-white/68 hover:bg-black/28"
                            : "bg-white/6 text-white/68 hover:bg-white/8/8"
                      }`}
                    >
                      <TrendingUp size={16} />
                      {showAnalytics ? "Hide Analytics" : "Analytics"}
                    </button>
                  </div>
                  <div
                    className={`text-sm ${
                      preferences.theme === "dark"
                        ? "text-white/55"
                        : "text-white/45"
                    }`}
                  >
                    Last updated: {new Date().toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Charts */}
              {showChart && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`rounded-xl shadow-lg border overflow-hidden ${
                    preferences.theme === "dark"
                      ? "bg-black/18 border-white/8"
                      : "bg-white/[0.04] border-white/8"
                  }`}
                >
                  <EnhancedChart budget={budget} theme={resolvedTheme} />
                </motion.div>
              )}

              {/* Analytics */}
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

              {/* Budget Views */}
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

      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25 }}
            className={`fixed inset-y-0 right-0 w-96 shadow-2xl z-50 ${
              preferences.theme === "dark"
                ? "bg-black/18 border-l border-white/8"
                : "bg-white/[0.04] border-l border-white/8"
            }`}
          >
            <div className="p-6 h-full overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3
                  className={`text-lg font-semibold ${
                    preferences.theme === "dark" ? "text-white" : "text-white"
                  }`}
                >
                  Saved Budgets
                </h3>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className={`p-1 rounded-lg transition-colors ${
                    preferences.theme === "dark"
                      ? "text-white/55 hover:text-white hover:bg-black/22"
                      : "text-white/55 hover:text-white hover:bg-white/8/6"
                  }`}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mb-4">
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/55"
                  />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search budgets..."
                    className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                      preferences.theme === "dark"
                        ? "bg-black/22 border-white/8 text-white"
                        : "border-white/8"
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-3">
                {filteredBudgets.length === 0 ? (
                  <div
                    className={`text-center py-8 ${
                      preferences.theme === "dark"
                        ? "text-white/55"
                        : "text-white/45"
                    }`}
                  >
                    <Save size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No saved budgets yet</p>
                    <p className="text-sm">
                      Create and save your first budget!
                    </p>
                  </div>
                ) : (
                  filteredBudgets.map((saved) => (
                    <motion.div
                      key={saved.id}
                      whileHover={{ scale: 1.02 }}
                      className={`p-4 rounded-[22px] border cursor-pointer transition-colors ${
                        preferences.theme === "dark"
                          ? "bg-black/22 border-white/8 hover:bg-black/28"
                          : "bg-white/[0.04]/[0.04] border-white/8 hover:bg-white/8/6"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4
                          className={`font-medium truncate flex-1 ${
                            preferences.theme === "dark"
                              ? "text-white"
                              : "text-white"
                          }`}
                        >
                          {saved.name}
                        </h4>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSavedBudget(saved.id);
                          }}
                          className={`ml-2 p-1 rounded transition-colors ${
                            preferences.theme === "dark"
                              ? "text-white/55 hover:text-red-400 hover:bg-black/28"
                              : "text-white/55 hover:text-red-500 hover:bg-white/8/6"
                          }`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <p
                        className={`text-sm mb-2 line-clamp-2 ${
                          preferences.theme === "dark"
                            ? "text-white/68"
                            : "text-white/55"
                        }`}
                      >
                        {saved.script.substring(0, 100)}...
                      </p>
                      <div className="flex justify-between items-center">
                        <span
                          className={`text-xs ${
                            preferences.theme === "dark"
                              ? "text-white/55"
                              : "text-white/45"
                          }`}
                        >
                          {new Date(saved.date).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => loadSavedBudget(saved)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          Load
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
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
