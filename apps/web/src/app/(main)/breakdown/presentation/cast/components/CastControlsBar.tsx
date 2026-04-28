"use client";

import {
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";
import React from "react";

import type { SortField, FilterRole, FilterGender } from "../types";

interface CastControlsBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filterRole: FilterRole;
  onFilterRoleChange: (r: FilterRole) => void;
  filterGender: FilterGender;
  onFilterGenderChange: (g: FilterGender) => void;
  sortBy: SortField;
  onSortByChange: (s: SortField) => void;
  sortOrder: "asc" | "desc";
  onToggleSortOrder: () => void;
  showStats: boolean;
  onToggleStats: () => void;
  showNetwork: boolean;
  onToggleNetwork: () => void;
  onExportCSV: () => void;
  onExportJSON: () => void;
  onExportCastingCall: () => void;
}

export const CastControlsBar: React.FC<CastControlsBarProps> = ({
  searchQuery,
  onSearchChange,
  filterRole,
  onFilterRoleChange,
  filterGender,
  onFilterGenderChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onToggleSortOrder,
  showStats,
  onToggleStats,
  showNetwork,
  onToggleNetwork,
  onExportCSV,
  onExportJSON,
  onExportCastingCall,
}) => {
  return (
    <div className="space-y-3 mb-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/45" />
          <input
            type="text"
            placeholder="Search cast..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-4 py-2 bg-white/6 border border-white/8 rounded-[22px] text-sm text-white placeholder-white/45 focus:outline-none focus:border-indigo-500 w-48"
          />
        </div>

        <select
          value={filterRole}
          onChange={(e) => onFilterRoleChange(e.target.value as FilterRole)}
          className="px-3 py-2 bg-white/6 border border-white/8 rounded-[22px] text-sm text-white focus:outline-none focus:border-indigo-500"
        >
          <option value="all">All Roles</option>
          <option value="Lead">Lead</option>
          <option value="Supporting">Supporting</option>
          <option value="Bit Part">Bit Part</option>
          <option value="Silent">Silent</option>
          <option value="Group">Group</option>
          <option value="Mystery">Mystery</option>
        </select>

        <select
          value={filterGender}
          onChange={(e) => onFilterGenderChange(e.target.value as FilterGender)}
          className="px-3 py-2 bg-white/6 border border-white/8 rounded-[22px] text-sm text-white focus:outline-none focus:border-indigo-500"
        >
          <option value="all">All Genders</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Non-binary">Non-binary</option>
          <option value="Unknown">Unknown</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value as SortField)}
          className="px-3 py-2 bg-white/6 border border-white/8 rounded-[22px] text-sm text-white focus:outline-none focus:border-indigo-500"
        >
          <option value="name">Sort by Name</option>
          <option value="role">Sort by Role</option>
          <option value="age">Sort by Age</option>
          <option value="gender">Sort by Gender</option>
          <option value="dialogueCount">Sort by Lines</option>
        </select>

        <button
          onClick={onToggleSortOrder}
          className="p-2 bg-white/6 border border-white/8 rounded-[22px] hover:bg-white/8 transition-colors"
          aria-label="Toggle sort order"
        >
          {sortOrder === "asc" ? (
            <ChevronUp className="w-4 h-4 text-white/55" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/55" />
          )}
        </button>

        <div className="flex-1" />

        <button
          onClick={onExportCSV}
          className="flex items-center gap-2 px-3 py-2 bg-white/6 border border-white/8 rounded-[22px] hover:bg-white/8 transition-colors text-sm text-white/68"
        >
          <Download className="w-4 h-4" />
          CSV
        </button>
        <button
          onClick={onExportJSON}
          className="flex items-center gap-2 px-3 py-2 bg-white/6 border border-white/8 rounded-[22px] hover:bg-white/8 transition-colors text-sm text-white/68"
        >
          <Download className="w-4 h-4" />
          JSON
        </button>
        <button
          onClick={onExportCastingCall}
          className="flex items-center gap-2 px-3 py-2 bg-emerald-700 border border-emerald-600 rounded-[22px] hover:bg-emerald-600 transition-colors text-sm text-white"
        >
          <FileText className="w-4 h-4" />
          Casting Call
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onToggleStats}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-[22px] text-xs font-medium transition-colors ${showStats ? "bg-indigo-600 text-white" : "bg-white/6 text-white/55 hover:bg-white/8"}`}
        >
          <Filter className="w-3 h-3" />
          Statistics
        </button>
        <button
          onClick={onToggleNetwork}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-[22px] text-xs font-medium transition-colors ${showNetwork ? "bg-indigo-600 text-white" : "bg-white/6 text-white/55 hover:bg-white/8"}`}
        >
          Statistics Network
        </button>
      </div>
    </div>
  );
};
