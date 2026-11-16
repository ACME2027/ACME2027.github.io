import { useEffect, useState } from "react";
import { clampNumber, formatWidgetNumber, validStep } from "./valueUtils";

type NumberInputPrimitiveProps = {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  ariaLabel: string;
  className?: string;
  onChange: (value: number) => void;
};

export function NumberInputPrimitive({
  value,
  min,
  max,
  step,
  disabled,
  ariaLabel,
  className,
  onChange,
}: NumberInputPrimitiveProps) {
  const [draft, setDraft] = useState(() => formatWidgetNumber(value));

  useEffect(() => {
    setDraft(formatWidgetNumber(value));
  }, [value]);

  function isInBounds(next: number): boolean {
    return (
      (min === undefined || next >= min) &&
      (max === undefined || next <= max)
    );
  }

  function resetOrCommitBoundary() {
    if (disabled) return;
    const parsed = Number(draft);
    if (draft.trim() === "" || !Number.isFinite(parsed)) {
      setDraft(formatWidgetNumber(value));
      return;
    }

    const lower = min ?? Number.NEGATIVE_INFINITY;
    const upper = max ?? Number.POSITIVE_INFINITY;
    const bounded = clampNumber(parsed, lower, upper);
    setDraft(formatWidgetNumber(bounded));
    if (!Object.is(bounded, value)) onChange(bounded);
  }

  return (
    <input
      type="number"
      aria-label={ariaLabel}
      className={className}
      disabled={disabled}
      value={draft}
      min={min}
      max={max}
      step={validStep(step)}
      onChange={(event) => {
        if (disabled) return;
        const nextDraft = event.target.value;
        setDraft(nextDraft);
        if (nextDraft.trim() === "") return;
        const next = event.target.valueAsNumber;
        if (Number.isFinite(next) && isInBounds(next)) onChange(next);
      }}
      onBlur={resetOrCommitBoundary}
    />
  );
}

type RangeInputPrimitiveProps = {
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  ariaLabel: string;
  className?: string;
  onChange: (value: number) => void;
};

export function RangeInputPrimitive({
  value,
  min,
  max,
  step,
  disabled,
  ariaLabel,
  className,
  onChange,
}: RangeInputPrimitiveProps) {
  return (
    <input
      type="range"
      aria-label={ariaLabel}
      className={className}
      disabled={disabled}
      value={clampNumber(value, min, max)}
      min={min}
      max={max}
      step={validStep(step)}
      onChange={(event) => {
        if (disabled) return;
        const next = event.target.valueAsNumber;
        if (Number.isFinite(next)) onChange(clampNumber(next, min, max));
      }}
    />
  );
}

type TextInputPrimitiveProps = {
  value: string;
  disabled?: boolean;
  ariaLabel: string;
  placeholder?: string;
  className?: string;
  onChange: (value: string) => void;
};

export function TextInputPrimitive({
  value,
  disabled,
  ariaLabel,
  placeholder,
  className,
  onChange,
}: TextInputPrimitiveProps) {
  return (
    <input
      type="text"
      aria-label={ariaLabel}
      className={className}
      disabled={disabled}
      value={value}
      placeholder={placeholder}
      onChange={(event) => {
        if (!disabled) onChange(event.target.value);
      }}
    />
  );
}
