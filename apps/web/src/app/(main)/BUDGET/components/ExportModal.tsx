import { motion, AnimatePresence } from "framer-motion";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  X,
  Download,
  FileSpreadsheet,
  FileJson,
  FileImage,
} from "lucide-react";
import React, { useState, useMemo } from "react";

import { logger } from "@/lib/ai/utils/logger";


import { Budget, ExportOptions } from "../lib/types";


interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  budget: Budget;
  budgetName: string;
  theme: "light" | "dark";
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  budget,
  budgetName,
  theme,
}) => {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: "csv",
    includeZeroValues: false,
    includeDetails: true,
    includeCharts: false,
  });
  const [exporting, setExporting] = useState(false);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

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

    return { totalItems, activeItems };
  }, [budget]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const modalVariants = {
    hidden: { scale: 0.9, opacity: 0 },
    visible: { scale: 1, opacity: 1 },
    exit: { scale: 0.9, opacity: 0 },
  };

  const exportToCSV = () => {
    const headers = [
      "Section",
      "Category",
      "Code",
      "Description",
      "Amount",
      "Unit",
      "Rate",
      "Total",
    ];
    const rows: any[][] = [];

    budget.sections.forEach((section) => {
      section.categories.forEach((category) => {
        category.items.forEach((item) => {
          if (!exportOptions.includeZeroValues && item.total === 0) return;
          rows.push([
            section.name,
            category.name,
            item.code,
            item.description,
            item.amount,
            item.unit,
            item.rate,
            item.total,
          ]);
        });
      });
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    downloadFile(csvContent, `${budgetName}_budget.csv`, "text/csv");
  };

  const exportToExcel = async () => {
    try {
      setExporting(true);
      // Use the API endpoint which uses exceljs (safer than xlsx)
      const response = await fetch("/api/budget/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          budget: budget,
          format: "excel",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to export budget");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${budgetName}_budget.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      logger.error("Export error:", error);
      alert("فشل تصدير الميزانية. الرجاء المحاولة مرة أخرى.");
    } finally {
      setExporting(false);
    }
  };

  const exportToJSON = () => {
    const jsonData = {
      budgetName,
      exportDate: new Date().toISOString(),
      total: budget.grandTotal,
      sections: budget.sections.map((section) => ({
        name: section.name,
        total: section.total,
        categories: section.categories.map((category) => ({
          name: category.name,
          code: category.code,
          total: category.total,
          items: category.items.filter(
            (item) => exportOptions.includeZeroValues || item.total > 0
          ),
        })),
      })),
    };

    downloadFile(
      JSON.stringify(jsonData, null, 2),
      `${budgetName}_budget.json`,
      "application/json"
    );
  };

  const exportToPDF = async () => {
    setExporting(true);
    try {
      const element = document.getElementById("budget-content");
      if (element) {
        const canvas = await html2canvas(element, {
          backgroundColor:
            theme === "dark" ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.04)",
          scale: 2,
        });

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");

        const imgWidth = 210;
        const pageHeight = 295;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;

        let position = 0;

        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        pdf.save(`${budgetName}_budget.pdf`);
      }
    } catch (error) {
      logger.error("PDF export failed:", error);
    } finally {
      setExporting(false);
    }
  };

  const downloadFile = (
    content: string,
    filename: string,
    mimeType: string
  ) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    switch (exportOptions.format) {
      case "csv":
        exportToCSV();
        break;
      case "excel":
        exportToExcel();
        break;
      case "json":
        exportToJSON();
        break;
      case "pdf":
        exportToPDF();
        break;
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ type: "spring", damping: 25 }}
          className={`max-w-2xl w-full rounded-xl shadow-2xl overflow-hidden ${
            theme === "dark"
              ? "bg-black/18 border border-white/8"
              : "bg-white/[0.04]"
          }`}
          onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center p-6 border-b border-white/8 dark:border-white/8">
            <h2
              className={`text-2xl font-bold ${
                theme === "dark" ? "text-white" : "text-white"
              }`}
            >
              Export Budget
            </h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                theme === "dark"
                  ? "text-white/55 hover:text-white hover:bg-black/22"
                  : "text-white/55 hover:text-white hover:bg-white/8/6"
              }`}
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6">
            {/* Format Selection */}
            <div className="mb-6">
              <h3
                className={`text-lg font-semibold mb-3 ${
                  theme === "dark" ? "text-white" : "text-white"
                }`}
              >
                Export Format
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  onClick={() =>
                    setExportOptions({ ...exportOptions, format: "csv" })
                  }
                  className={`p-4 rounded-lg border transition-all flex flex-col items-center gap-2 ${
                    exportOptions.format === "csv"
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : theme === "dark"
                        ? "border-white/8 bg-black/22 text-white/68 hover:bg-black/28"
                        : "border-white/8 bg-white/[0.04] text-white/55 hover:bg-white/8/6"
                  }`}
                >
                  <FileSpreadsheet size={24} />
                  <span className="text-sm font-medium">CSV</span>
                </button>

                <button
                  onClick={() =>
                    setExportOptions({ ...exportOptions, format: "excel" })
                  }
                  className={`p-4 rounded-lg border transition-all flex flex-col items-center gap-2 ${
                    exportOptions.format === "excel"
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : theme === "dark"
                        ? "border-white/8 bg-black/22 text-white/68 hover:bg-black/28"
                        : "border-white/8 bg-white/[0.04] text-white/55 hover:bg-white/8/6"
                  }`}
                >
                  <FileSpreadsheet size={24} />
                  <span className="text-sm font-medium">Excel</span>
                </button>

                <button
                  onClick={() =>
                    setExportOptions({ ...exportOptions, format: "json" })
                  }
                  className={`p-4 rounded-lg border transition-all flex flex-col items-center gap-2 ${
                    exportOptions.format === "json"
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : theme === "dark"
                        ? "border-white/8 bg-black/22 text-white/68 hover:bg-black/28"
                        : "border-white/8 bg-white/[0.04] text-white/55 hover:bg-white/8/6"
                  }`}
                >
                  <FileJson size={24} />
                  <span className="text-sm font-medium">JSON</span>
                </button>

                <button
                  onClick={() =>
                    setExportOptions({ ...exportOptions, format: "pdf" })
                  }
                  className={`p-4 rounded-lg border transition-all flex flex-col items-center gap-2 ${
                    exportOptions.format === "pdf"
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : theme === "dark"
                        ? "border-white/8 bg-black/22 text-white/68 hover:bg-black/28"
                        : "border-white/8 bg-white/[0.04] text-white/55 hover:bg-white/8/6"
                  }`}
                >
                  <FileImage size={24} />
                  <span className="text-sm font-medium">PDF</span>
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="mb-6">
              <h3
                className={`text-lg font-semibold mb-3 ${
                  theme === "dark" ? "text-white" : "text-white"
                }`}
              >
                Export Options
              </h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeZeroValues}
                    onChange={(e) =>
                      setExportOptions({
                        ...exportOptions,
                        includeZeroValues: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span
                    className={`text-sm ${
                      theme === "dark" ? "text-white/68" : "text-white/68"
                    }`}
                  >
                    Include items with zero values
                  </span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeDetails}
                    onChange={(e) =>
                      setExportOptions({
                        ...exportOptions,
                        includeDetails: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span
                    className={`text-sm ${
                      theme === "dark" ? "text-white/68" : "text-white/68"
                    }`}
                  >
                    Include detailed breakdown
                  </span>
                </label>

                {exportOptions.format === "excel" && (
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeCharts}
                      onChange={(e) =>
                        setExportOptions({
                          ...exportOptions,
                          includeCharts: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span
                      className={`text-sm ${
                        theme === "dark" ? "text-white/68" : "text-white/68"
                      }`}
                    >
                      Include charts and visualizations
                    </span>
                  </label>
                )}
              </div>
            </div>

            {/* Preview */}
            <div className="mb-6">
              <h3
                className={`text-lg font-semibold mb-3 ${
                  theme === "dark" ? "text-white" : "text-white"
                }`}
              >
                Export Preview
              </h3>
              <div
                className={`p-4 rounded-[22px] border ${
                  theme === "dark"
                    ? "bg-black/22 border-white/8"
                    : "bg-white/[0.04] border-white/8"
                }`}
              >
                <div className="text-sm space-y-1">
                  <div>
                    <strong>File name:</strong> {budgetName}_budget.
                    {exportOptions.format}
                  </div>
                  <div>
                    <strong>Total items:</strong>{" "}
                    {exportOptions.includeZeroValues
                      ? stats.totalItems
                      : stats.activeItems}
                  </div>
                  <div>
                    <strong>Total budget:</strong>{" "}
                    {formatCurrency(budget.grandTotal)}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  theme === "dark"
                    ? "border-white/8 text-white/68 hover:bg-black/22"
                    : "border-white/8 text-white/68 hover:bg-white/[0.04]"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {exporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Export
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
