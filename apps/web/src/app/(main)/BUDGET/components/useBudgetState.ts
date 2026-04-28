"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast";

import { logger } from "@/lib/ai/utils/logger";
import { stringifyUnknown } from "@/lib/utils/unknown-values";

import { INITIAL_BUDGET_TEMPLATE, BUDGET_TEMPLATES } from "../lib/constants";

import {
  formatCurrency,
  recalculateBudget,
  parseSavedBudgets,
  parsePreferences,
  isSavedBudget,
} from "./budget-utils";

import type {
  Budget,
  LineItem,
  SecurityRisk,
  ProcessingStatus,
  SavedBudget,
  AIAnalysis,
  UserPreferences,
} from "../lib/types";

export interface BudgetStateReturn {
  // حالة المحرر الأساسية
  scriptText: string;
  setScriptText: (v: string) => void;
  budget: Budget;
  status: ProcessingStatus;
  error: string | null;
  budgetName: string;
  setBudgetName: (v: string) => void;
  // حالة واجهة العرض
  showChart: boolean;
  setShowChart: (v: boolean) => void;
  showAnalytics: boolean;
  setShowAnalytics: (v: boolean) => void;
  showExportModal: boolean;
  setShowExportModal: (v: boolean) => void;
  showTemplateSelector: boolean;
  setShowTemplateSelector: (v: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  // تفضيلات المستخدم والمخاطر
  preferences: UserPreferences;
  risk: SecurityRisk;
  aiAnalysis: AIAnalysis | null;
  // قيم مشتقة
  finalTotal: number;
  filteredBudgets: SavedBudget[];
  resolvedTheme: "light" | "dark";
  stats: {
    totalItems: number;
    activeItems: number;
    totalCategories: number;
    efficiency: number;
  };
  // دوال المعالجة
  handleGenerate: () => void;
  handleRiskUpdate: (
    key: keyof SecurityRisk,
    _field: "percent",
    value: number
  ) => void;
  handleLineItemUpdate: (
    sectionId: string,
    categoryCode: string,
    itemCode: string,
    field: keyof LineItem,
    value: string | number
  ) => void;
  loadExample: () => void;
  saveBudget: (isAutoSave?: boolean) => void;
  loadSavedBudget: (saved: SavedBudget) => void;
  deleteSavedBudget: (id: string) => void;
  duplicateBudget: () => void;
  loadTemplate: (templateId: string) => void;
  savePreferences: (newPrefs: Partial<UserPreferences>) => void;
  formatCurrency: (value: number) => string;
}

interface BudgetAppProps {
  initialBudget?: Budget;
  initialScript?: string;
}

export function useBudgetState({
  initialBudget,
  initialScript,
}: BudgetAppProps): BudgetStateReturn {
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
  const [riskConfig, setRisk] = useState<SecurityRisk>({
    bondFee: { percent: 0.02, total: 0 },
    contingency: { percent: 0.1, total: 0 },
    credits: { percent: 0.25, total: 0 },
  });
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);

  // — مزامنة الـ props عند تغيّرها من الخارج
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (initialBudget) {
        setBudget(recalculateBudget(initialBudget));
        setBudgetName(initialBudget.metadata?.title ?? "");
        setStatus("complete");
      }
      if (initialScript) setScriptText(initialScript);
    }, 0);
    return () => {
      clearTimeout(timeout);
    };
  }, [initialBudget, initialScript]);

  // — تحميل البيانات المحفوظة عند التحميل الأول
  useEffect(() => {
    const timeout = setTimeout(() => {
      try {
        const saved = localStorage.getItem("filmbudgetai-saved-v3");
        if (saved) setSavedBudgets(parseSavedBudgets(saved));
      } catch (e) {
        logger.error("Failed to load saved budgets:", e);
      }
      try {
        const savedPrefs = localStorage.getItem("filmbudgetai-preferences");
        if (savedPrefs) {
          setPreferences((prev) => ({
            ...prev,
            ...parsePreferences(savedPrefs),
          }));
        }
      } catch (e) {
        logger.error("Failed to load preferences:", e);
      }
    }, 0);
    return () => {
      clearTimeout(timeout);
    };
  }, []);

  // — الحفظ التلقائي عند تفعيل الخيار
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budget, budgetName, preferences.autoSave]);

  // — حساب المخاطر المشتقة من مجموع الميزانية
  const risk = useMemo<SecurityRisk>(() => {
    const baseTotal = budget.grandTotal;
    return {
      bondFee: {
        ...riskConfig.bondFee,
        total: baseTotal * riskConfig.bondFee.percent,
      },
      contingency: {
        ...riskConfig.contingency,
        total: baseTotal * riskConfig.contingency.percent,
      },
      credits: {
        ...riskConfig.credits,
        total: -(baseTotal * riskConfig.credits.percent),
      },
    };
  }, [budget.grandTotal, riskConfig]);

  const filteredBudgets = useMemo(() => {
    return savedBudgets
      .filter(
        (b) =>
          b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          b.script.toLowerCase().includes(searchTerm.toLowerCase())
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
        (sum, s) => sum + s.categories.length,
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

  // — حفظ التفضيلات في localStorage وتحديث الحالة
  const savePreferences = (newPrefs: Partial<UserPreferences>): void => {
    const updated = { ...preferences, ...newPrefs };
    setPreferences(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("filmbudgetai-preferences", JSON.stringify(updated));
    }
  };

  // — توليد الميزانية عبر API routes
  const handleGenerate = (): void => {
    if (!scriptText.trim()) {
      setError("Please enter a script or scene description");
      return;
    }
    setStatus("analyzing");
    setError(null);

    const generationPromise = (async () => {
      setStatus("analyzing");
      const genResponse = await fetch("/api/budget/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: scriptText, title: budgetName }),
      });
      const genData = (await genResponse.json()) as {
        error?: string;
        data?: { budget?: unknown };
        budget?: unknown;
      };
      if (!genResponse.ok)
        throw new Error(genData.error ?? "فشل في توليد الميزانية");
      const aiResponse = (genData.data?.budget ?? genData.budget) as Budget;

      setStatus("calculating");
      const cleanBudget = recalculateBudget(aiResponse);
      setBudget(cleanBudget);

      const analyzeResponse = await fetch("/api/budget/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: scriptText }),
      });
      const analyzeData = (await analyzeResponse.json()) as {
        data?: { analysis?: unknown };
        analysis?: unknown;
      };
      if (analyzeResponse.ok) {
        const analysisResult =
          analyzeData.data?.analysis ?? analyzeData.analysis;
        if (analysisResult) setAiAnalysis(analysisResult as AIAnalysis);
      }

      const firstLine = (scriptText.split("\n")[0] ?? "").substring(0, 50);
      setBudgetName(firstLine || "Untitled Project");
      setStatus("complete");
      return "Budget generated successfully!";
    })();

    toast
      .promise(generationPromise, {
        loading: "Analyzing script...",
        success: (msg) => msg,
        error: (err: unknown) => `Error: ${stringifyUnknown(err)}`,
      })
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : stringifyUnknown(e);
        logger.error("Budget generation failed", { error: e });
        setError(message || "Failed to generate budget. Please try again.");
        setStatus("error");
        toast.error(message || "Failed to generate budget");
      });
  };

  const handleRiskUpdate = (
    key: keyof SecurityRisk,
    _field: "percent",
    value: number
  ): void => {
    setRisk((prev) => ({ ...prev, [key]: { ...prev[key], percent: value } }));
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

  const loadExample = (): void => {
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

  function saveBudget(isAutoSave = false): void {
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
      budget: JSON.parse(JSON.stringify(budget)),
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
    if (!isAutoSave) toast.success("Budget saved successfully!");
  }

  const loadSavedBudget = (saved: SavedBudget): void => {
    if (!isSavedBudget(saved)) return;
    setBudget(saved.budget);
    setScriptText(saved.script);
    setBudgetName(saved.name);
    setStatus("complete");
    toast.success(`Loaded: ${saved.name}`);
  };

  const deleteSavedBudget = (id: string): void => {
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

  const duplicateBudget = (): void => {
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

  const loadTemplate = (templateId: string): void => {
    const template = BUDGET_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setBudget(template.budget);
      setSelectedTemplate(templateId);
      setShowTemplateSelector(false);
      toast.success(`Loaded template: ${template.name}`);
    }
  };

  return {
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
  };
}
