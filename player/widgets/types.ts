import type { ReactNode } from "react";

export type InlineWidgetControlBaseProps = {
  id?: string;
  label: string;
  description?: string;
  disabled?: boolean;
  inline?: boolean;
  className?: string;
};

export type InlineWidgetOption<T = unknown> = {
  id: string;
  label: string;
  value: T;
  disabled?: boolean;
};

export type OptionEquality<T> = (left: T, right: T) => boolean;

export type InlineWidgetFrameProps = InlineWidgetControlBaseProps & {
  children: ReactNode;
  valueText?: string;
};

export type NumericControlProps = InlineWidgetControlBaseProps & {
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
};

export type NumericRangeValue = readonly [lower: number, upper: number];
