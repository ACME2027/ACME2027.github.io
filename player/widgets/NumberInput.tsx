import { InlineWidgetFrame } from "./InlineWidgetFrame";
import { NumberInputPrimitive } from "./InputPrimitives";
import type { InlineWidgetControlBaseProps } from "./types";

export type NumberInputProps = InlineWidgetControlBaseProps & {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
};

export function NumberInput({
  value,
  min,
  max,
  step,
  unit,
  onChange,
  ...baseProps
}: NumberInputProps) {
  return (
    <InlineWidgetFrame
      {...baseProps}
      className={`iw-number-input ${baseProps.className ?? ""}`.trim()}
      valueText={unit ? unit : undefined}
    >
      <NumberInputPrimitive
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={baseProps.disabled}
        ariaLabel={baseProps.label}
        onChange={onChange}
      />
    </InlineWidgetFrame>
  );
}
