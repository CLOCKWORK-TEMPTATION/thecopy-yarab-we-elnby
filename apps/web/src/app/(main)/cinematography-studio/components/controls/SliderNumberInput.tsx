"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  clampToStep,
  getStepPrecision,
  parseNumericInput,
} from "../../lib/control-utils";

interface SliderNumberInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  icon?: LucideIcon;
  unit?: string;
  description?: string;
  disabled?: boolean;
  disabledReason?: string | null;
  formatValue?: (value: number) => string;
  sliderLabel?: string;
  inputLabel?: string;
}

export function SliderNumberInput({
  label,
  value,
  min,
  max,
  step,
  onChange,
  icon: Icon,
  unit,
  description,
  disabled = false,
  disabledReason,
  formatValue,
  sliderLabel,
  inputLabel,
}: SliderNumberInputProps) {
  const precision = React.useMemo(() => getStepPrecision(step), [step]);
  const valueFormatter = React.useCallback(
    (nextValue: number) => {
      if (formatValue) {
        return formatValue(nextValue);
      }

      return nextValue.toFixed(precision);
    },
    [formatValue, precision]
  );
  const [draft, setDraft] = React.useState(() => valueFormatter(value));

  React.useEffect(() => {
    setDraft(valueFormatter(value));
  }, [value, valueFormatter]);

  const commitValue = React.useCallback(
    (raw: string) => {
      if (disabled) {
        setDraft(valueFormatter(value));
        return;
      }

      const parsed = parseNumericInput(raw);
      if (parsed === null) {
        setDraft(valueFormatter(value));
        return;
      }

      const nextValue = clampToStep(parsed, min, max, step);
      setDraft(valueFormatter(nextValue));
      if (nextValue !== value) {
        onChange(nextValue);
      }
    },
    [disabled, max, min, onChange, step, value, valueFormatter]
  );

  const handleInputKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled) {
        return;
      }

      if (event.key === "Enter") {
        commitValue(draft);
        return;
      }

      if (
        event.key === "ArrowUp" ||
        event.key === "ArrowRight" ||
        event.key === "ArrowDown" ||
        event.key === "ArrowLeft"
      ) {
        event.preventDefault();
        const direction =
          event.key === "ArrowUp" || event.key === "ArrowRight" ? 1 : -1;
        const nextValue = clampToStep(value + direction * step, min, max, step);
        setDraft(valueFormatter(nextValue));
        if (nextValue !== value) {
          onChange(nextValue);
        }
      }
    },
    [
      commitValue,
      disabled,
      draft,
      max,
      min,
      onChange,
      step,
      value,
      valueFormatter,
    ]
  );

  const handleSliderChange = React.useCallback(
    (values: number[]) => {
      const nextValue = values[0];
      if (disabled || nextValue === undefined) {
        return;
      }

      const clampedValue = clampToStep(nextValue, min, max, step);
      setDraft(valueFormatter(clampedValue));
      if (clampedValue !== value) {
        onChange(clampedValue);
      }
    },
    [disabled, max, min, onChange, step, value, valueFormatter]
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <Label className="text-sm text-zinc-300 flex items-center gap-2">
          {Icon ? <Icon className="h-4 w-4 text-amber-500" /> : null}
          {label}
        </Label>
        <div className="flex items-center gap-2">
          <Input
            aria-label={inputLabel ?? `${label} input`}
            type="number"
            value={draft}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => commitValue(draft)}
            onKeyDown={handleInputKeyDown}
            className="w-24 h-8 bg-zinc-950 border-zinc-800 text-center text-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
          />
          {unit ? <span className="text-xs text-zinc-500">{unit}</span> : null}
        </div>
      </div>
      <Slider
        aria-label={sliderLabel ?? label}
        value={[value]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={handleSliderChange}
        className={
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
        }
      />
      <div className="flex items-center justify-between gap-4 text-xs text-zinc-600">
        <span>{valueFormatter(min)}</span>
        <span className="text-amber-500 font-mono">
          {valueFormatter(value)}
        </span>
        <span>{valueFormatter(max)}</span>
      </div>
      {description ? (
        <p className="text-xs text-zinc-500">{description}</p>
      ) : null}
      {disabledReason ? (
        <p className="text-xs text-amber-400/90">{disabledReason}</p>
      ) : null}
    </div>
  );
}

export default SliderNumberInput;
