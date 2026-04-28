import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, Edit2, Save, Search, X } from "lucide-react";
import React, { useMemo, useState } from "react";

import type { Budget, Category, LineItem, Section } from "../lib/types";

type DetailTheme = "light" | "dark";

interface DetailViewProps {
  budget: Budget;
  onUpdateLineItem: (
    sectionId: string,
    categoryCode: string,
    itemCode: string,
    field: keyof LineItem,
    value: string | number
  ) => void;
  theme: DetailTheme;
}

interface EditingState {
  sectionId: string;
  categoryCode: string;
  itemCode: string;
  field: keyof LineItem;
}

interface SearchResult {
  section: string;
  category: string;
  item: LineItem;
}

const CONTAINER_VARIANTS = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const SECTION_VARIANTS = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function findBudgetItems(budget: Budget, searchTerm: string): SearchResult[] {
  const needle = searchTerm.trim().toLowerCase();
  if (!needle) return [];

  const results: SearchResult[] = [];
  for (const section of budget.sections) {
    for (const category of section.categories) {
      for (const item of category.items) {
        const searchable = [item.description, item.code, category.name].map(
          (value) => value.toLowerCase()
        );

        if (searchable.some((value) => value.includes(needle))) {
          results.push({
            section: section.name,
            category: category.name,
            item,
          });
        }
      }
    }
  }

  return results;
}

function getPanelClass(theme: DetailTheme) {
  return theme === "dark"
    ? "bg-black/18 border-white/8"
    : "bg-white/[0.04] border-white/8";
}

function BudgetTitle() {
  return (
    <div className="bg-gradient-to-r from-indigo-800 to-purple-800 text-white p-6">
      <h2 className="text-xl font-bold uppercase tracking-wide flex items-center gap-2">
        <span className="w-1 h-6 bg-white/[0.04] rounded" />
        Detailed Budget Breakdown
      </h2>
      <p className="text-sm text-indigo-200 mt-1">
        Complete line-item budget with editing capabilities
      </p>
    </div>
  );
}

function SearchBar({
  searchTerm,
  setSearchTerm,
  theme,
}: {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  theme: DetailTheme;
}) {
  return (
    <div className="p-4 border-b border-white/8 dark:border-white/8">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/55"
        />
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search line items..."
          className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
            theme === "dark"
              ? "bg-black/22 border-white/8 text-white"
              : "border-white/8"
          }`}
        />
      </div>
    </div>
  );
}

function SearchResults({
  searchTerm,
  filteredItems,
  theme,
}: {
  searchTerm: string;
  filteredItems: SearchResult[];
  theme: DetailTheme;
}) {
  if (!searchTerm || filteredItems.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className={`p-4 border-b ${
        theme === "dark"
          ? "border-white/8 bg-black/14"
          : "border-white/8 bg-white/[0.04]"
      }`}
    >
      <h3 className="font-semibold mb-3">
        Search Results ({filteredItems.length})
      </h3>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {filteredItems.map((result) => (
          <SearchResultCard
            key={result.item.code}
            result={result}
            theme={theme}
          />
        ))}
      </div>
    </motion.div>
  );
}

function SearchResultCard({
  result,
  theme,
}: {
  result: SearchResult;
  theme: DetailTheme;
}) {
  return (
    <div className={`p-3 rounded-[22px] border ${getPanelClass(theme)}`}>
      <div className="flex justify-between items-start">
        <div>
          <div className="font-medium">{result.item.description}</div>
          <div className="text-sm text-white/45">
            {result.section} - {result.category} - {result.item.code}
          </div>
        </div>
        <div className="text-right">
          <div className="font-semibold">
            {formatCurrency(result.item.total)}
          </div>
          <div className="text-sm text-white/45">
            {result.item.amount} x {formatCurrency(result.item.rate)}
          </div>
        </div>
      </div>
    </div>
  );
}

function BudgetTableHeader({ theme }: { theme: DetailTheme }) {
  const headerClass = `px-6 py-3 ${theme === "dark" ? "text-white/68" : "text-white/55"}`;

  return (
    <thead
      className={`${
        theme === "dark" ? "bg-black/22" : "bg-white/[0.04]"
      } text-white/55 uppercase text-xs`}
    >
      <tr>
        <th className={`${headerClass} text-left`}>Code</th>
        <th className={`${headerClass} text-left`}>Description</th>
        <th className={`${headerClass} text-right`}>Amount</th>
        <th className={`${headerClass} text-left`}>Unit</th>
        <th className={`${headerClass} text-right`}>Rate</th>
        <th className={`${headerClass} text-right`}>Total</th>
      </tr>
    </thead>
  );
}

function EditActions({
  saveEdit,
  cancelEdit,
}: {
  saveEdit: () => void;
  cancelEdit: () => void;
}) {
  return (
    <>
      <button type="button" onClick={saveEdit} className="text-green-600">
        <Save size={14} />
      </button>
      <button type="button" onClick={cancelEdit} className="text-red-600">
        <X size={14} />
      </button>
    </>
  );
}

function EditableNumberCell({
  displayValue,
  isEditing,
  editValue,
  setEditValue,
  startEditing,
  saveEdit,
  cancelEdit,
  theme,
}: {
  displayValue: string;
  isEditing: boolean;
  editValue: string;
  setEditValue: (value: string) => void;
  startEditing: () => void;
  saveEdit: () => void;
  cancelEdit: () => void;
  theme: DetailTheme;
}) {
  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={editValue}
          onChange={(event) => setEditValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") saveEdit();
          }}
          className={`w-24 p-1 border rounded text-right ${
            theme === "dark"
              ? "bg-black/22 border-white/8 text-white"
              : "border-white/8"
          }`}
        />
        <EditActions saveEdit={saveEdit} cancelEdit={cancelEdit} />
      </div>
    );
  }

  return (
    <button
      type="button"
      className="hover:bg-white/8 dark:hover:bg-black/28 p-1 rounded flex items-center justify-end gap-1 w-full text-right"
      onClick={startEditing}
    >
      {displayValue}
      <Edit2 size={12} className="opacity-50" />
    </button>
  );
}

function LineItemRow({
  item,
  isDark,
  editing,
  editValue,
  setEditValue,
  startEditing,
  saveEdit,
  cancelEdit,
}: {
  item: LineItem;
  isDark: boolean;
  editing: EditingState | null;
  editValue: string;
  setEditValue: (value: string) => void;
  startEditing: (field: keyof LineItem, value: string | number) => void;
  saveEdit: () => void;
  cancelEdit: () => void;
}) {
  const theme = isDark ? "dark" : "light";

  return (
    <div
      className={`grid grid-cols-6 gap-4 px-6 py-2 hover:${
        isDark ? "bg-black/22" : "bg-white/[0.04]"
      } transition-colors border-b border-white/8`}
    >
      <div className="font-medium text-white/45">{item.code}</div>
      <div className="text-white/68 dark:text-white/68">{item.description}</div>
      <div className="text-right">
        <EditableNumberCell
          displayValue={item.amount.toLocaleString()}
          isEditing={
            editing?.itemCode === item.code && editing.field === "amount"
          }
          editValue={editValue}
          setEditValue={setEditValue}
          startEditing={() => startEditing("amount", item.amount)}
          saveEdit={saveEdit}
          cancelEdit={cancelEdit}
          theme={theme}
        />
      </div>
      <div className="text-white/55 dark:text-white/55">{item.unit}</div>
      <div className="text-right">
        <EditableNumberCell
          displayValue={formatCurrency(item.rate)}
          isEditing={
            editing?.itemCode === item.code && editing.field === "rate"
          }
          editValue={editValue}
          setEditValue={setEditValue}
          startEditing={() => startEditing("rate", item.rate)}
          saveEdit={saveEdit}
          cancelEdit={cancelEdit}
          theme={theme}
        />
      </div>
      <div className="text-right font-semibold">
        {formatCurrency(item.total)}
      </div>
    </div>
  );
}

function CategoryBlock({
  section,
  category,
  theme,
  editing,
  editValue,
  setEditValue,
  startEditing,
  saveEdit,
  cancelEdit,
}: {
  section: Section;
  category: Category;
  theme: DetailTheme;
  editing: EditingState | null;
  editValue: string;
  setEditValue: (value: string) => void;
  startEditing: (
    sectionId: string,
    categoryCode: string,
    itemCode: string,
    field: keyof LineItem,
    value: string | number
  ) => void;
  saveEdit: () => void;
  cancelEdit: () => void;
}) {
  const isDark = theme === "dark";

  return (
    <div>
      <div
        className={`px-6 py-2 font-medium ${
          isDark
            ? "bg-black/28 text-indigo-300"
            : "bg-indigo-50 text-indigo-700"
        }`}
      >
        {category.code} - {category.name}
        <span className="float-right">{formatCurrency(category.total)}</span>
      </div>
      {category.items.map((item) => (
        <LineItemRow
          key={item.code}
          item={item}
          isDark={isDark}
          editing={editing}
          editValue={editValue}
          setEditValue={setEditValue}
          startEditing={(field, value) =>
            startEditing(section.id, category.code, item.code, field, value)
          }
          saveEdit={saveEdit}
          cancelEdit={cancelEdit}
        />
      ))}
    </div>
  );
}

function SectionRows({
  section,
  isExpanded,
  toggleSection,
  theme,
  editing,
  editValue,
  setEditValue,
  startEditing,
  saveEdit,
  cancelEdit,
}: {
  section: Section;
  isExpanded: boolean;
  toggleSection: (sectionId: string) => void;
  theme: DetailTheme;
  editing: EditingState | null;
  editValue: string;
  setEditValue: (value: string) => void;
  startEditing: CategoryBlockProps["startEditing"];
  saveEdit: () => void;
  cancelEdit: () => void;
}) {
  const isDark = theme === "dark";

  return (
    <React.Fragment>
      <motion.tr
        variants={SECTION_VARIANTS}
        onClick={() => toggleSection(section.id)}
        className={`${
          isDark ? "bg-black/22" : "bg-white/6"
        } font-semibold cursor-pointer hover:${
          isDark ? "bg-black/28" : "bg-white/8"
        } transition-colors`}
      >
        <td className="px-6 py-3 text-indigo-600" colSpan={6}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1 h-4 bg-indigo-600 rounded" />
              {section.name}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-normal text-white/45">
                {formatCurrency(section.total)}
              </span>
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>
        </td>
      </motion.tr>
      <AnimatePresence>
        {isExpanded && (
          <motion.tr
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <td colSpan={6} className="p-0">
              {section.categories.map((category) => (
                <CategoryBlock
                  key={category.code}
                  section={section}
                  category={category}
                  theme={theme}
                  editing={editing}
                  editValue={editValue}
                  setEditValue={setEditValue}
                  startEditing={startEditing}
                  saveEdit={saveEdit}
                  cancelEdit={cancelEdit}
                />
              ))}
            </td>
          </motion.tr>
        )}
      </AnimatePresence>
    </React.Fragment>
  );
}

type CategoryBlockProps = Parameters<typeof CategoryBlock>[0];

export const DetailView: React.FC<DetailViewProps> = ({
  budget,
  onUpdateLineItem,
  theme,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["atl", "production", "post", "other"])
  );
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [editValue, setEditValue] = useState("");
  const filteredItems = useMemo(
    () => findBudgetItems(budget, searchTerm),
    [budget, searchTerm]
  );

  const toggleSection = (sectionId: string) => {
    setExpandedSections((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const startEditing = (
    sectionId: string,
    categoryCode: string,
    itemCode: string,
    field: keyof LineItem,
    currentValue: string | number
  ) => {
    setEditing({ sectionId, categoryCode, itemCode, field });
    setEditValue(currentValue.toString());
  };

  const saveEdit = () => {
    if (!editing) return;
    const { sectionId, categoryCode, itemCode, field } = editing;
    const value =
      field === "amount" || field === "rate"
        ? Number.parseFloat(editValue) || 0
        : editValue;
    onUpdateLineItem(sectionId, categoryCode, itemCode, field, value);
    setEditing(null);
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditValue("");
  };

  return (
    <motion.div
      variants={CONTAINER_VARIANTS}
      initial="hidden"
      animate="visible"
      className={`rounded-xl shadow-lg border overflow-hidden ${getPanelClass(theme)}`}
    >
      <BudgetTitle />
      <SearchBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        theme={theme}
      />
      <AnimatePresence>
        <SearchResults
          searchTerm={searchTerm}
          filteredItems={filteredItems}
          theme={theme}
        />
      </AnimatePresence>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <BudgetTableHeader theme={theme} />
          <tbody>
            {budget.sections.map((section) => (
              <SectionRows
                key={section.id}
                section={section}
                isExpanded={expandedSections.has(section.id)}
                toggleSection={toggleSection}
                theme={theme}
                editing={editing}
                editValue={editValue}
                setEditValue={setEditValue}
                startEditing={startEditing}
                saveEdit={saveEdit}
                cancelEdit={cancelEdit}
              />
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};
