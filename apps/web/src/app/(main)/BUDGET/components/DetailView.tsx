import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, ChevronUp, Edit2, Save, X } from "lucide-react";
import React, { useState, useMemo } from "react";

import { Budget, LineItem } from "../lib/types";

interface DetailViewProps {
  budget: Budget;
  onUpdateLineItem: (
    sectionId: string,
    categoryCode: string,
    itemCode: string,
    field: keyof LineItem,
    value: string | number
  ) => void;
  theme: "light" | "dark";
}

interface EditingState {
  sectionId: string;
  categoryCode: string;
  itemCode: string;
  field: keyof LineItem;
}

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
  const [editValue, setEditValue] = useState<string>("");

  const filteredItems = useMemo(() => {
    if (!searchTerm) return null;

    const results: {
      section: string;
      category: string;
      item: LineItem;
    }[] = [];
    budget.sections.forEach((section) => {
      section.categories.forEach((category) => {
        category.items.forEach((item) => {
          if (
            item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            category.name.toLowerCase().includes(searchTerm.toLowerCase())
          ) {
            results.push({
              section: section.name,
              category: category.name,
              item,
            });
          }
        });
      });
    });
    return results;
  }, [budget, searchTerm]);

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
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
    if (editing) {
      const { sectionId, categoryCode, itemCode, field } = editing;
      const value =
        field === "amount" || field === "rate"
          ? parseFloat(editValue) || 0
          : editValue;
      onUpdateLineItem(sectionId, categoryCode, itemCode, field, value);
      setEditing(null);
    }
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditValue("");
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`rounded-xl shadow-lg border overflow-hidden ${
        theme === "dark"
          ? "bg-black/18 border-white/8"
          : "bg-white/[0.04] border-white/8"
      }`}
    >
      <div className="bg-gradient-to-r from-indigo-800 to-purple-800 text-white p-6">
        <h2 className="text-xl font-bold uppercase tracking-wide flex items-center gap-2">
          <div className="w-1 h-6 bg-white/[0.04] rounded"></div>
          Detailed Budget Breakdown
        </h2>
        <p className="text-sm text-indigo-200 mt-1">
          Complete line-item budget with editing capabilities
        </p>
      </div>

      {/* Search Bar */}
      <div className="p-4 border-b border-white/8 dark:border-white/8">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/55"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search line items..."
            className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
              theme === "dark"
                ? "bg-black/22 border-white/8 text-white"
                : "border-white/8"
            }`}
          />
        </div>
      </div>

      {/* Search Results */}
      <AnimatePresence>
        {searchTerm && filteredItems && (
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
                <div
                  key={`${result.section}-${result.category}-${result.item.code}`}
                  className={`p-3 rounded-[22px] border ${
                    theme === "dark"
                      ? "bg-black/18 border-white/8"
                      : "bg-white/[0.04] border-white/8"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">
                        {result.item.description}
                      </div>
                      <div className="text-sm text-white/45">
                        {result.section} • {result.category} •{" "}
                        {result.item.code}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatCurrency(result.item.total)}
                      </div>
                      <div className="text-sm text-white/45">
                        {result.item.amount} ×{" "}
                        {formatCurrency(result.item.rate)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Budget Sections */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead
            className={`${
              theme === "dark" ? "bg-black/22" : "bg-white/[0.04]"
            } text-white/55 uppercase text-xs`}
          >
            <tr>
              <th
                className={`px-6 py-3 text-left ${
                  theme === "dark" ? "text-white/68" : "text-white/55"
                }`}
              >
                Code
              </th>
              <th
                className={`px-6 py-3 text-left ${
                  theme === "dark" ? "text-white/68" : "text-white/55"
                }`}
              >
                Description
              </th>
              <th
                className={`px-6 py-3 text-right ${
                  theme === "dark" ? "text-white/68" : "text-white/55"
                }`}
              >
                Amount
              </th>
              <th
                className={`px-6 py-3 text-left ${
                  theme === "dark" ? "text-white/68" : "text-white/55"
                }`}
              >
                Unit
              </th>
              <th
                className={`px-6 py-3 text-right ${
                  theme === "dark" ? "text-white/68" : "text-white/55"
                }`}
              >
                Rate
              </th>
              <th
                className={`px-6 py-3 text-right ${
                  theme === "dark" ? "text-white/68" : "text-white/55"
                }`}
              >
                Total
              </th>
            </tr>
          </thead>

          <tbody>
            {budget.sections.map((section) => (
              <React.Fragment key={section.id}>
                {/* Section Header */}
                <motion.tr
                  variants={sectionVariants}
                  onClick={() => toggleSection(section.id)}
                  className={`${
                    theme === "dark" ? "bg-black/22" : "bg-white/6"
                  } font-semibold cursor-pointer hover:${
                    theme === "dark" ? "bg-black/28" : "bg-white/8"
                  } transition-colors`}
                >
                  <td className="px-6 py-3 text-indigo-600" colSpan={6}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-indigo-600 rounded"></div>
                        {section.name}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-normal text-white/45">
                          {formatCurrency(section.total)}
                        </span>
                        {expandedSections.has(section.id) ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </div>
                    </div>
                  </td>
                </motion.tr>

                {/* Categories and Items */}
                <AnimatePresence>
                  {expandedSections.has(section.id) && (
                    <motion.tr
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <td colSpan={6} className="p-0">
                        {section.categories.map((category) => (
                          <div key={category.code}>
                            {/* Category Header */}
                            <div
                              className={`px-6 py-2 font-medium ${
                                theme === "dark"
                                  ? "bg-black/28 text-indigo-300"
                                  : "bg-indigo-50 text-indigo-700"
                              }`}
                            >
                              {category.code} - {category.name}
                              <span className="float-right">
                                {formatCurrency(category.total)}
                              </span>
                            </div>

                            {/* Line Items */}
                            {category.items.map((item) => (
                              <div
                                key={item.code}
                                className={`grid grid-cols-6 gap-4 px-6 py-2 hover:${
                                  theme === "dark"
                                    ? "bg-black/22"
                                    : "bg-white/[0.04]"
                                } transition-colors border-b ${
                                  theme === "dark"
                                    ? "border-white/8"
                                    : "border-white/8"
                                }`}
                              >
                                <div className="font-medium text-white/45">
                                  {item.code}
                                </div>
                                <div className="text-white/68 dark:text-white/68">
                                  {item.description}
                                </div>
                                <div className="text-right">
                                  {editing?.itemCode === item.code &&
                                  editing?.field === "amount" ? (
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number"
                                        value={editValue}
                                        onChange={(e) =>
                                          setEditValue(e.target.value)
                                        }
                                        onKeyPress={(e) =>
                                          e.key === "Enter" && saveEdit()
                                        }
                                        className={`w-20 p-1 border rounded text-right ${
                                          theme === "dark"
                                            ? "bg-black/22 border-white/8 text-white"
                                            : "border-white/8"
                                        }`}
                                        autoFocus
                                      />
                                      <button
                                        onClick={saveEdit}
                                        className="text-green-600"
                                      >
                                        <Save size={14} />
                                      </button>
                                      <button
                                        onClick={cancelEdit}
                                        className="text-red-600"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  ) : (
                                    <div
                                      className="cursor-pointer hover:bg-white/8 dark:hover:bg-black/28 p-1 rounded flex items-center justify-end gap-1"
                                      onClick={() =>
                                        startEditing(
                                          section.id,
                                          category.code,
                                          item.code,
                                          "amount",
                                          item.amount
                                        )
                                      }
                                    >
                                      {item.amount.toLocaleString()}
                                      <Edit2 size={12} className="opacity-50" />
                                    </div>
                                  )}
                                </div>
                                <div className="text-white/55 dark:text-white/55">
                                  {item.unit}
                                </div>
                                <div className="text-right">
                                  {editing?.itemCode === item.code &&
                                  editing?.field === "rate" ? (
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number"
                                        value={editValue}
                                        onChange={(e) =>
                                          setEditValue(e.target.value)
                                        }
                                        onKeyPress={(e) =>
                                          e.key === "Enter" && saveEdit()
                                        }
                                        className={`w-24 p-1 border rounded text-right ${
                                          theme === "dark"
                                            ? "bg-black/22 border-white/8 text-white"
                                            : "border-white/8"
                                        }`}
                                        autoFocus
                                      />
                                      <button
                                        onClick={saveEdit}
                                        className="text-green-600"
                                      >
                                        <Save size={14} />
                                      </button>
                                      <button
                                        onClick={cancelEdit}
                                        className="text-red-600"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  ) : (
                                    <div
                                      className="cursor-pointer hover:bg-white/8 dark:hover:bg-black/28 p-1 rounded flex items-center justify-end gap-1"
                                      onClick={() =>
                                        startEditing(
                                          section.id,
                                          category.code,
                                          item.code,
                                          "rate",
                                          item.rate
                                        )
                                      }
                                    >
                                      {formatCurrency(item.rate)}
                                      <Edit2 size={12} className="opacity-50" />
                                    </div>
                                  )}
                                </div>
                                <div className="text-right font-semibold">
                                  {formatCurrency(item.total)}
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </td>
                    </motion.tr>
                  )}
                </AnimatePresence>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};
