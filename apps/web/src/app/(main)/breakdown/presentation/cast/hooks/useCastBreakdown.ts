"use client";

import { useState, useMemo } from "react";

import { logError } from "../../../domain/errors";
import {
  exportCastToCSV,
  exportCastToJSON,
  generateCastingCall,
  downloadFile,
} from "../utils/cast-export";

import type {
  CastMember,
  ExtendedCastMember,
  CastAnalysisResult,
  CastCardData,
  SortField,
  FilterRole,
  FilterGender,
} from "../types";

interface UseCastBreakdownProps {
  cast: CastMember[] | ExtendedCastMember[];
  sceneContent: string;
  onAnalyze?: (content: string) => Promise<CastAnalysisResult>;
}

export function useCastBreakdown({
  cast,
  sceneContent,
  onAnalyze,
}: UseCastBreakdownProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filterRole, setFilterRole] = useState<FilterRole>("all");
  const [filterGender, setFilterGender] = useState<FilterGender>("all");
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [showNetwork, setShowNetwork] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] =
    useState<CastAnalysisResult | null>(null);

  const enhancedCast = useMemo<CastCardData[]>(() => {
    return cast.map((member) => {
      const extended = member;
      return {
        ...member,
        dialogueCount: extended.scenePresence?.dialogueLines ?? 0,
        firstScene: extended.scenePresence?.sceneNumbers?.[0] ?? 1,
        lastScene:
          extended.scenePresence?.sceneNumbers?.[
            (extended.scenePresence.sceneNumbers.length ?? 1) - 1
          ] ?? 1,
        totalScenes: 10,
        sceneAppearances: extended.scenePresence?.sceneNumbers ?? [],
      } as CastCardData;
    });
  }, [cast]);

  const filteredCast = useMemo(() => {
    return enhancedCast.filter((member) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchName = member.name.toLowerCase().includes(query);
        const matchArabic = member.nameArabic?.toLowerCase().includes(query);
        const matchDesc = (member.visualDescription || member.description || "")
          .toLowerCase()
          .includes(query);
        if (!matchName && !matchArabic && !matchDesc) return false;
      }
      if (
        filterRole !== "all" &&
        member.roleCategory !== filterRole &&
        member.role !== filterRole
      ) {
        return false;
      }
      if (filterGender !== "all" && member.gender !== filterGender)
        return false;
      return true;
    });
  }, [enhancedCast, searchQuery, filterRole, filterGender]);

  const sortedCast = useMemo(() => {
    return [...filteredCast].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "role":
          comparison = (a.roleCategory || a.role || "").localeCompare(
            b.roleCategory || b.role || ""
          );
          break;
        case "age":
          comparison = (a.ageRange || a.age || "").localeCompare(
            b.ageRange || b.age || ""
          );
          break;
        case "gender":
          comparison = a.gender.localeCompare(b.gender);
          break;
        case "dialogueCount":
          comparison = (a.dialogueCount ?? 0) - (b.dialogueCount ?? 0);
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [filteredCast, sortBy, sortOrder]);

  const handleAnalyze = async () => {
    if (!sceneContent || !onAnalyze) return;
    setAnalyzing(true);
    try {
      const result = await onAnalyze(sceneContent);
      setAnalysisResult(result);
    } catch (error) {
      logError("CastBreakdownView.handleAnalyze", error);
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleCard = (index: number) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  const handleExportCSV = () =>
    downloadFile(exportCastToCSV(sortedCast), "cast-breakdown.csv", "text/csv");

  const handleExportJSON = () => {
    const data = analysisResult ?? {
      members: sortedCast,
      summary: {},
      insights: [],
      warnings: [],
    };
    downloadFile(
      exportCastToJSON(data as CastAnalysisResult),
      "cast-breakdown.json",
      "application/json"
    );
  };

  const handleExportCastingCall = () =>
    downloadFile(
      generateCastingCall(sortedCast),
      "casting-call.txt",
      "text/plain"
    );

  const clearFilters = () => {
    setSearchQuery("");
    setFilterRole("all");
    setFilterGender("all");
  };

  return {
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    filterRole,
    setFilterRole,
    filterGender,
    setFilterGender,
    expandedCards,
    showNetwork,
    setShowNetwork,
    showStats,
    setShowStats,
    analyzing,
    analysisResult,
    enhancedCast,
    filteredCast,
    sortedCast,
    handleAnalyze,
    toggleCard,
    handleExportCSV,
    handleExportJSON,
    handleExportCastingCall,
    clearFilters,
  };
}
