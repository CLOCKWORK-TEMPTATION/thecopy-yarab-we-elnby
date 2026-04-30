"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { formatCurrency } from "../../lib/budget-page-utils";

import type { BudgetItemsEditorApi } from "../../hooks/useBudgetItemsEditor";
import type { BudgetDocument, BudgetLineItem } from "../../types";

interface BudgetItemsTableProps {
  budget: BudgetDocument;
  editor: BudgetItemsEditorApi;
}

export function BudgetItemsTable({ budget, editor }: BudgetItemsTableProps) {
  const totalLineItems = budget.sections.reduce(
    (sum, s) => sum + s.categories.reduce((cs, c) => cs + c.items.length, 0),
    0,
  );

  return (
    <div
      data-testid="budget-items-table"
      className="space-y-4"
      dir="rtl"
    >
      {/* Grand total header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4">
        <div>
          <p className="text-xs text-emerald-200">الإجمالي الكلي</p>
          <p
            data-testid="budget-items-grand-total"
            className="mt-1 text-2xl font-bold text-white"
          >
            {formatCurrency(budget.grandTotal, budget.currency)}
          </p>
        </div>
        <p className="text-sm text-white/52">
          {totalLineItems} بند في {budget.sections.length} قسم
        </p>
      </div>

      {/* Sections */}
      {budget.sections.map((section) => (
        <SectionBlock
          key={section.id}
          section={section}
          currency={budget.currency}
          editor={editor}
        />
      ))}
    </div>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

function SectionBlock({
  section,
  currency,
  editor,
}: {
  section: BudgetDocument["sections"][number];
  currency: string;
  editor: BudgetItemsEditorApi;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      {/* Section header */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between gap-3 bg-white/[0.06] px-5 py-3 text-left transition-colors hover:bg-white/[0.09]"
      >
        <span className="font-semibold text-white">{section.name}</span>
        <span className="flex items-center gap-2 text-sm text-white/52">
          {formatCurrency(section.total, currency)}
          {collapsed ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </span>
      </button>

      {!collapsed &&
        section.categories.map((category) => (
          <CategoryBlock
            key={category.code}
            category={category}
            currency={currency}
            editor={editor}
          />
        ))}
    </div>
  );
}

// ─── Category ─────────────────────────────────────────────────────────────────

function CategoryBlock({
  category,
  currency,
  editor,
}: {
  category: BudgetDocument["sections"][number]["categories"][number];
  currency: string;
  editor: BudgetItemsEditorApi;
}) {
  return (
    <div className="border-t border-white/5">
      {/* Category sub-header */}
      <div className="flex items-center justify-between gap-3 bg-white/[0.03] px-5 py-2">
        <span className="text-sm font-medium text-white/80">
          {category.name}
        </span>
        <span className="text-xs text-white/42">
          {formatCurrency(category.total, currency)}
        </span>
      </div>

      {/* Items table */}
      <div className="overflow-x-auto">
        <table
          className="min-w-full text-sm"
          aria-label={`بنود ${category.name}`}
        >
          <thead>
            <tr className="border-b border-white/5 text-xs text-white/35">
              <th className="px-3 py-2 text-right font-normal">الكود</th>
              <th className="px-3 py-2 text-right font-normal">الوصف</th>
              <th className="px-3 py-2 text-right font-normal">الكمية</th>
              <th className="px-3 py-2 text-right font-normal">الوحدة</th>
              <th className="px-3 py-2 text-right font-normal">السعر</th>
              <th className="px-3 py-2 text-right font-normal">الإجمالي</th>
              <th className="w-8 px-2" />
            </tr>
          </thead>
          <tbody>
            {category.items.map((item) => (
              <ItemRow
                key={item.code}
                item={item}
                currency={currency}
                onUpdate={editor.updateItemField}
                onRemove={editor.removeItem}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Add item button */}
      <div className="px-3 pb-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.addItem(category.code)}
          className="h-7 gap-1.5 text-xs text-white/45 hover:text-white/80"
          data-testid={`add-item-${category.code}`}
        >
          <Plus className="h-3.5 w-3.5" />
          إضافة بند
        </Button>
      </div>
    </div>
  );
}

// ─── Item row ─────────────────────────────────────────────────────────────────

interface ItemRowProps {
  item: BudgetLineItem;
  currency: string;
  onUpdate: BudgetItemsEditorApi["updateItemField"];
  onRemove: BudgetItemsEditorApi["removeItem"];
}

function ItemRow({ item, currency, onUpdate, onRemove }: ItemRowProps) {
  return (
    <tr className="border-b border-white/5 transition-colors hover:bg-white/[0.03]">
      <td className="whitespace-nowrap px-3 py-1.5 font-mono text-xs text-white/38">
        {item.code}
      </td>
      <td className="px-2 py-1">
        <Input
          value={item.description}
          onChange={(e) => onUpdate(item.code, "description", e.target.value)}
          className="h-7 min-w-[12rem] border-transparent bg-transparent px-2 text-sm text-white focus:border-white/20 focus:bg-white/5"
          dir="rtl"
          aria-label={`وصف البند ${item.code}`}
        />
      </td>
      <td className="px-2 py-1">
        <NumericCell
          value={item.amount}
          onChange={(v) => onUpdate(item.code, "amount", v)}
          label={`كمية ${item.code}`}
          min={0}
        />
      </td>
      <td className="px-2 py-1">
        <Input
          value={item.unit}
          onChange={(e) => onUpdate(item.code, "unit", e.target.value)}
          className="h-7 w-20 border-transparent bg-transparent px-2 text-sm text-white focus:border-white/20 focus:bg-white/5"
          dir="rtl"
          aria-label={`وحدة ${item.code}`}
        />
      </td>
      <td className="px-2 py-1">
        <NumericCell
          value={item.rate}
          onChange={(v) => onUpdate(item.code, "rate", v)}
          label={`سعر ${item.code}`}
          min={0}
        />
      </td>
      <td className="whitespace-nowrap px-3 py-1.5 text-left text-sm font-medium text-white/80">
        {formatCurrency(item.total, currency)}
      </td>
      <td className="px-2 py-1">
        <button
          type="button"
          onClick={() => onRemove(item.code)}
          className="rounded p-1 text-white/25 transition-colors hover:text-red-400"
          aria-label={`حذف البند ${item.code}`}
          data-testid={`remove-item-${item.code}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
}

// ─── Numeric cell ─────────────────────────────────────────────────────────────

function NumericCell({
  value,
  onChange,
  label,
  min,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  min?: number;
}) {
  return (
    <Input
      type="number"
      value={value}
      min={min}
      onChange={(e) => {
        const parsed = parseFloat(e.target.value);
        if (!isNaN(parsed) && (min === undefined || parsed >= min)) {
          onChange(parsed);
        } else if (e.target.value === "") {
          onChange(0);
        }
      }}
      className="h-7 w-24 border-transparent bg-transparent px-2 text-sm text-white focus:border-white/20 focus:bg-white/5"
      aria-label={label}
    />
  );
}
