import { motion } from "framer-motion";
import React, { useState, useEffect } from "react";

import { Budget, SecurityRisk } from "../lib/types";

interface TopSheetProps {
  budget: Budget;
  risk: SecurityRisk;
  onUpdateRisk: (
    key: keyof SecurityRisk,
    field: "percent",
    value: number
  ) => void;
  theme: "light" | "dark";
}

interface PercentageInputProps {
  value: number;
  onChange: (val: number) => void;
  theme: "light" | "dark";
}

const PercentageInput: React.FC<PercentageInputProps> = ({
  value,
  onChange,
  theme,
}) => {
  const [localVal, setLocalVal] = useState<string>((value * 100).toString());

  useEffect(() => {
    const currentNum = parseFloat(localVal);
    if (Math.abs(currentNum - value * 100) > 0.001) {
      setTimeout(() => {}, 0);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setLocalVal(newVal);

    const parsed = parseFloat(newVal);
    if (!isNaN(parsed)) {
      onChange(parsed / 100);
    } else if (newVal === "") {
      onChange(0);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        min="0"
        max="100"
        step="0.1"
        className={`w-16 p-1 border rounded text-right focus:ring-2 focus:ring-indigo-500 outline-none text-sm ${
          theme === "dark"
            ? "bg-black/22 border-white/8 text-white"
            : "border-white/8"
        }`}
        value={localVal}
        onChange={handleChange}
      />
      <span
        className={`text-xs ${
          theme === "dark" ? "text-white/55" : "text-white/45"
        }`}
      >
        %
      </span>
    </div>
  );
};

export const TopSheet: React.FC<TopSheetProps> = ({
  budget,
  risk,
  onUpdateRisk,
  theme,
}) => {
  const subTotal = budget.sections.reduce(
    (sum, section) => sum + section.total,
    0
  );
  const finalTotal =
    subTotal + risk.bondFee.total + risk.contingency.total + risk.credits.total;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`rounded-xl shadow-lg overflow-hidden border ${
        theme === "dark"
          ? "bg-black/18 border-white/8"
          : "bg-white/[0.04] border-white/8"
      }`}
    >
      <div className="bg-gradient-to-r from-black/18 to-black/22 text-white p-6">
        <h2 className="text-xl font-bold uppercase tracking-wide flex items-center gap-2">
          <div className="w-1 h-6 bg-white/[0.04] rounded"></div>
          Top Sheet Summary
        </h2>
        <p className="text-sm text-white/68 mt-1">
          Executive budget overview with risk adjustments
        </p>
      </div>

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
                Account
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
                Total
              </th>
            </tr>
          </thead>
          <tbody
            className={`divide-y ${
              theme === "dark" ? "divide-white/8" : "divide-white/8"
            }`}
          >
            {budget.sections.map((section) => (
              <React.Fragment key={section.id}>
                <motion.tr
                  variants={itemVariants}
                  className={`${
                    theme === "dark" ? "bg-black/22" : "bg-white/[0.04]"
                  } font-semibold`}
                >
                  <td className="px-6 py-3 text-indigo-400" colSpan={3}>
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-4 bg-indigo-500 rounded"></div>
                      {section.name}
                      <span className="text-xs text-white/45 font-normal">
                        ({formatCurrency(section.total)})
                      </span>
                    </div>
                  </td>
                </motion.tr>
                {section.categories.map((cat) => (
                  <motion.tr
                    key={cat.code}
                    variants={itemVariants}
                    whileHover={{
                      backgroundColor:
                        theme === "dark"
                          ? "rgba(0,0,0,0.22)"
                          : "rgba(255,255,255,0.04)",
                    }}
                    className="transition-colors cursor-pointer"
                  >
                    <td
                      className={`px-6 py-2 font-medium ${
                        theme === "dark" ? "text-white/55" : "text-white/45"
                      }`}
                    >
                      {cat.code}
                    </td>
                    <td
                      className={`px-6 py-2 ${
                        theme === "dark" ? "text-white/68" : "text-white/68"
                      }`}
                    >
                      {cat.name}
                    </td>
                    <td
                      className={`px-6 py-2 text-right font-medium ${
                        theme === "dark" ? "text-white" : "text-white"
                      }`}
                    >
                      {formatCurrency(cat.total)}
                    </td>
                  </motion.tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
          <tfoot>
            {/* Subtotal */}
            <motion.tr
              variants={itemVariants}
              className={`${
                theme === "dark" ? "bg-blue-900/20" : "bg-blue-50"
              } border-t-2 ${
                theme === "dark" ? "border-blue-500" : "border-blue-300"
              }`}
            >
              <td
                className={`px-6 py-3 font-bold ${
                  theme === "dark" ? "text-blue-300" : "text-blue-800"
                }`}
                colSpan={2}
              >
                SUBTOTAL
              </td>
              <td
                className={`px-6 py-3 text-right font-bold ${
                  theme === "dark" ? "text-blue-300" : "text-blue-800"
                }`}
              >
                {formatCurrency(subTotal)}
              </td>
            </motion.tr>

            {/* Risk & Security Section */}
            <motion.tr
              variants={itemVariants}
              className={`${
                theme === "dark" ? "bg-orange-900/20" : "bg-orange-50"
              }`}
            >
              <td
                className={`px-6 py-3 font-bold ${
                  theme === "dark" ? "text-orange-300" : "text-orange-700"
                }`}
                colSpan={3}
              >
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-orange-500 rounded"></div>
                  SECURITY & RISK FUND
                </div>
              </td>
            </motion.tr>

            <motion.tr
              variants={itemVariants}
              whileHover={{
                backgroundColor:
                  theme === "dark"
                    ? "rgba(0,0,0,0.22)"
                    : "rgba(255,255,255,0.04)",
              }}
              className="transition-colors"
            >
              <td
                className={`px-6 py-2 ${
                  theme === "dark" ? "text-white/68" : "text-white/68"
                }`}
              >
                Bond Fee
              </td>
              <td
                className={`px-6 py-2 ${
                  theme === "dark" ? "text-white/55" : "text-white/45"
                } text-xs`}
              >
                <PercentageInput
                  value={risk.bondFee.percent}
                  onChange={(val) => onUpdateRisk("bondFee", "percent", val)}
                  theme={theme}
                />
              </td>
              <td
                className={`px-6 py-2 text-right font-medium ${
                  theme === "dark" ? "text-white" : "text-white"
                }`}
              >
                {formatCurrency(risk.bondFee.total)}
              </td>
            </motion.tr>

            <motion.tr
              variants={itemVariants}
              whileHover={{
                backgroundColor:
                  theme === "dark"
                    ? "rgba(0,0,0,0.22)"
                    : "rgba(255,255,255,0.04)",
              }}
              className="transition-colors"
            >
              <td
                className={`px-6 py-2 ${
                  theme === "dark" ? "text-white/68" : "text-white/68"
                }`}
              >
                Contingency
              </td>
              <td
                className={`px-6 py-2 ${
                  theme === "dark" ? "text-white/55" : "text-white/45"
                } text-xs`}
              >
                <PercentageInput
                  value={risk.contingency.percent}
                  onChange={(val) =>
                    onUpdateRisk("contingency", "percent", val)
                  }
                  theme={theme}
                />
              </td>
              <td
                className={`px-6 py-2 text-right font-medium ${
                  theme === "dark" ? "text-white" : "text-white"
                }`}
              >
                {formatCurrency(risk.contingency.total)}
              </td>
            </motion.tr>

            <motion.tr
              variants={itemVariants}
              whileHover={{
                backgroundColor:
                  theme === "dark"
                    ? "rgba(0,0,0,0.22)"
                    : "rgba(255,255,255,0.04)",
              }}
              className="transition-colors"
            >
              <td
                className={`px-6 py-2 ${
                  theme === "dark" ? "text-green-400" : "text-green-700"
                } font-medium`}
              >
                Credits / Rebates
              </td>
              <td
                className={`px-6 py-2 ${
                  theme === "dark" ? "text-white/55" : "text-white/45"
                } text-xs`}
              >
                <div className="flex items-center gap-1">
                  <PercentageInput
                    value={risk.credits.percent}
                    onChange={(val) => onUpdateRisk("credits", "percent", val)}
                    theme={theme}
                  />
                  <span
                    className={`text-xs ${
                      theme === "dark" ? "text-white/55" : "text-white/45"
                    }`}
                  >
                    Credit
                  </span>
                </div>
              </td>
              <td
                className={`px-6 py-2 text-right font-medium ${
                  theme === "dark" ? "text-green-400" : "text-green-700"
                }`}
              >
                {formatCurrency(risk.credits.total)}
              </td>
            </motion.tr>

            <motion.tr
              variants={itemVariants}
              className="bg-gradient-to-r from-black/18 to-black/22 text-white text-lg"
            >
              <td className="px-6 py-4 font-bold" colSpan={2}>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-white/[0.04] rounded"></div>
                  GRAND TOTAL
                </div>
              </td>
              <td className="px-6 py-4 text-right font-bold">
                {formatCurrency(finalTotal)}
              </td>
            </motion.tr>
          </tfoot>
        </table>
      </div>
    </motion.div>
  );
};
