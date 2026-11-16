import type { InlineWidgetOption, OptionEquality } from "./types";

export const MAX_VISIBLE_FRACTION_DIGITS = 3;

export function formatWidgetNumber(
  value: unknown,
  maximumFractionDigits = MAX_VISIBLE_FRACTION_DIGITS,
): string {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return "";
  const rounded = Number(numeric.toFixed(maximumFractionDigits));
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function validStep(step: number | undefined, fallback = 1): number {
  return typeof step === "number" && Number.isFinite(step) && step > 0
    ? step
    : fallback;
}

export function snapToStep(
  value: number,
  min: number,
  max: number,
  step: number,
): number {
  const safeStep = validStep(step);
  const snapped = min + Math.round((clampNumber(value, min, max) - min) / safeStep) * safeStep;
  return clampNumber(Number(snapped.toPrecision(14)), min, max);
}

export function defaultOptionEquality<T>(left: T, right: T): boolean {
  return Object.is(left, right);
}

export function optionForValue<T>(
  options: readonly InlineWidgetOption<T>[],
  value: T,
  isEqual: OptionEquality<T> = defaultOptionEquality,
  excludedIds: ReadonlySet<string> = new Set(),
): InlineWidgetOption<T> | undefined {
  return options.find(
    (option) => !excludedIds.has(option.id) && isEqual(option.value, value),
  );
}

export function selectedOptionIds<T>(
  options: readonly InlineWidgetOption<T>[],
  values: readonly T[],
  isEqual: OptionEquality<T> = defaultOptionEquality,
): Set<string> {
  const ids = new Set<string>();
  for (const value of values) {
    const option = optionForValue(options, value, isEqual, ids);
    if (option) ids.add(option.id);
  }
  return ids;
}

export function uniqueFiniteSteps(
  values: readonly number[],
  min?: number,
  max?: number,
): number[] {
  return [...new Set(values)]
    .filter((value) => Number.isFinite(value))
    .filter((value) => min === undefined || value >= min)
    .filter((value) => max === undefined || value <= max)
    .sort((left, right) => left - right);
}
