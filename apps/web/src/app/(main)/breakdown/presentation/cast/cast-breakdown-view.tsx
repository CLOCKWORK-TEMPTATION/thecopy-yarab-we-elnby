/**
 * @fileoverview مكون عرض تفريغ طاقم التمثيل
 */

import {
  UserCircle,
  Eye,
  AlertTriangle,
  RefreshCw,
  Filter,
} from "lucide-react";
import React from "react";

import CastCard from "./components/CastCard";
import { CastControlsBar } from "./components/CastControlsBar";
import NetworkVisualization from "./components/NetworkVisualization";
import StatisticsPanel from "./components/StatisticsPanel";
import { useCastBreakdown } from "./hooks/useCastBreakdown";

import type {
  CastAnalysisResult,
  CastBreakdownViewProps,
  CastCardData,
} from "./types";

interface CastLoadingStateProps {
  analyzing: boolean;
}

function CastLoadingState({ analyzing }: CastLoadingStateProps) {
  return (
    <div className="bg-white/6/50 border border-white/8 rounded-[22px] p-6 mb-6">
      <div className="flex items-center justify-center gap-4">
        <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
        <span className="text-white/68">
          {analyzing
            ? "Analyzing cast with AI..."
            : "Processing cast breakdown..."}
        </span>
      </div>
    </div>
  );
}

interface CastEmptyStateProps {
  analyzing: boolean;
  sceneContent: string;
  onAnalyze?: (content: string) => Promise<CastAnalysisResult>;
  onAnalyzeClick: () => void;
}

function CastEmptyState({
  analyzing,
  sceneContent,
  onAnalyze,
  onAnalyzeClick,
}: CastEmptyStateProps) {
  return (
    <div className="bg-white/6/50 border border-white/8 rounded-[22px] p-8 mb-6 text-center">
      <UserCircle className="w-12 h-12 text-white/55 mx-auto mb-4" />
      <h3 className="text-lg font-bold text-white/68 mb-2">No Cast Data</h3>
      <p className="text-sm text-white/45 mb-4">
        {sceneContent
          ? 'Click "Analyze" to extract cast information from the scene.'
          : "Load a scene to begin cast breakdown."}
      </p>
      {sceneContent && onAnalyze && (
        <button
          onClick={onAnalyzeClick}
          disabled={analyzing}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-black/28 text-white rounded-[22px] text-sm font-medium transition-colors"
        >
          Analyze
        </button>
      )}
    </div>
  );
}

interface CastHeaderProps {
  count: number;
  hasAnalysis: boolean;
}

function CastHeader({ count, hasAnalysis }: CastHeaderProps) {
  return (
    <div className="p-4 border-b border-white/8 flex flex-wrap items-center justify-between gap-4 bg-black/14/80">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-600 rounded-[22px] text-white shadow-lg shadow-indigo-600/20">
          <UserCircle className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-lg text-white">
            طاقم التمثيل (Casting Sheet)
          </h3>
          <p className="text-xs text-white/45 font-mono">
            INDEPENDENT CAST AGENT REPORT
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs bg-indigo-900/30 text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/30">
          {count} شخصيات
        </span>
        {hasAnalysis && (
          <span className="text-xs bg-emerald-900/30 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30">
            AI Analyzed
          </span>
        )}
      </div>
    </div>
  );
}

interface AnalysisSummaryProps {
  analysisResult: CastAnalysisResult | null;
}

function AnalysisSummary({ analysisResult }: AnalysisSummaryProps) {
  if (!analysisResult) {
    return null;
  }

  return (
    <div className="lg:col-span-2 space-y-3">
      {analysisResult.insights.length > 0 && (
        <div className="bg-white/6/30 border border-white/8 rounded-[22px] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase text-white/55">
              Insights
            </span>
          </div>
          <ul className="space-y-1">
            {analysisResult.insights.map((insight) => (
              <li
                key={insight}
                className="text-xs text-white/68 flex items-start gap-2"
              >
                <span className="text-emerald-400 mt-0.5">•</span>
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}
      {analysisResult.warnings.length > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-[22px] p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-bold uppercase text-yellow-400">
              Warnings
            </span>
          </div>
          <ul className="space-y-1">
            {analysisResult.warnings.map((warning) => (
              <li
                key={warning}
                className="text-xs text-yellow-200 flex items-start gap-2"
              >
                <span className="text-yellow-400 mt-0.5">•</span>
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface CastGridProps {
  enhancedCast: CastCardData[];
  expandedCards: Set<number>;
  filteredCast: CastCardData[];
  sortedCast: CastCardData[];
  onClearFilters: () => void;
  onToggleCard: (index: number) => void;
}

function CastGrid({
  enhancedCast,
  expandedCards,
  filteredCast,
  sortedCast,
  onClearFilters,
  onToggleCard,
}: CastGridProps) {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        {sortedCast.map((member) => {
          const originalIndex = enhancedCast.indexOf(member);
          return (
            <CastCard
              key={member.id}
              member={member}
              showDetails={expandedCards.has(originalIndex)}
              onToggleDetails={() => onToggleCard(originalIndex)}
            />
          );
        })}
      </div>

      {sortedCast.length === 0 &&
        filteredCast.length !== enhancedCast.length && (
          <div className="text-center py-8">
            <Filter className="w-12 h-12 text-white/55 mx-auto mb-4" />
            <p className="text-white/55">No cast members match your filters.</p>
            <button
              onClick={onClearFilters}
              className="mt-2 text-indigo-400 hover:text-indigo-300 text-sm"
            >
              Clear all filters
            </button>
          </div>
        )}
    </>
  );
}

const CastBreakdownView: React.FC<CastBreakdownViewProps> = ({
  cast = [],
  isProcessing = false,
  sceneContent = "",
  onAnalyze,
}) => {
  const {
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
  } = useCastBreakdown({
    cast,
    sceneContent,
    ...(onAnalyze ? { onAnalyze } : {}),
  });

  if (isProcessing || analyzing) {
    return <CastLoadingState analyzing={analyzing} />;
  }

  if (!cast || cast.length === 0) {
    return (
      <CastEmptyState
        analyzing={analyzing}
        sceneContent={sceneContent}
        onAnalyzeClick={handleAnalyze}
        {...(onAnalyze ? { onAnalyze } : {})}
      />
    );
  }

  return (
    <div className="bg-gradient-to-br from-black/14 to-[var(--background,#09090b)] border border-white/8/50 rounded-[22px] overflow-hidden mb-8 shadow-2xl shadow-blue-900/10">
      <CastHeader
        count={sortedCast.length}
        hasAnalysis={Boolean(analysisResult)}
      />

      <div className="p-6">
        <CastControlsBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterRole={filterRole}
          onFilterRoleChange={setFilterRole}
          filterGender={filterGender}
          onFilterGenderChange={setFilterGender}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          sortOrder={sortOrder}
          onToggleSortOrder={() =>
            setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
          }
          showStats={showStats}
          onToggleStats={() => setShowStats(!showStats)}
          showNetwork={showNetwork}
          onToggleNetwork={() => setShowNetwork(!showNetwork)}
          onExportCSV={handleExportCSV}
          onExportJSON={handleExportJSON}
          onExportCastingCall={handleExportCastingCall}
        />

        {showStats && <StatisticsPanel cast={sortedCast} />}

        {showNetwork && (
          <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <NetworkVisualization cast={sortedCast} />
            <AnalysisSummary analysisResult={analysisResult} />
          </div>
        )}

        <CastGrid
          enhancedCast={enhancedCast}
          expandedCards={expandedCards}
          filteredCast={filteredCast}
          sortedCast={sortedCast}
          onClearFilters={clearFilters}
          onToggleCard={toggleCard}
        />
      </div>
    </div>
  );
};

export default CastBreakdownView;
