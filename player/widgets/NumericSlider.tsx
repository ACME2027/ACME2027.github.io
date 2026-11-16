import { InlineWidgetFrame } from "./InlineWidgetFrame";
import { RangeInputPrimitive } from "./InputPrimitives";
import type {
  InlineWidgetControlBaseProps,
  NumericControlProps,
} from "./types";
import {
  clampNumber,
  formatWidgetNumber,
  snapToStep,
  uniqueFiniteSteps,
  validStep,
} from "./valueUtils";

type NumericSliderBaseProps = NumericControlProps & {
  mode: "continuous" | "step";
  steps?: readonly number[];
};

export function NumericSlider({
  value,
  min,
  max,
  step,
  unit,
  onChange,
  mode,
  steps,
  ...baseProps
}: NumericSliderBaseProps) {
  const explicitSteps = mode === "step"
    ? uniqueFiniteSteps(steps ?? [], min, max)
    : [];
  const usesExplicitSteps = explicitSteps.length > 0;
  const currentStepIndex = usesExplicitSteps
    ? explicitSteps.reduce((bestIndex, candidate, index) =>
        Math.abs(candidate - value) < Math.abs(explicitSteps[bestIndex] - value)
          ? index
          : bestIndex,
      0)
    : 0;

  const renderedValue = usesExplicitSteps
    ? currentStepIndex
    : clampNumber(value, min, max);
  const renderedMin = usesExplicitSteps ? 0 : min;
  const renderedMax = usesExplicitSteps ? explicitSteps.length - 1 : max;
  const renderedStep = usesExplicitSteps ? 1 : validStep(step, mode === "continuous" ? 0.01 : 1);
  const displayValue = usesExplicitSteps
    ? explicitSteps[currentStepIndex]
    : value;

  return (
    <InlineWidgetFrame
      {...baseProps}
      className={`iw-slider iw-slider--${mode} ${baseProps.className ?? ""}`.trim()}
      valueText={`${formatWidgetNumber(displayValue)}${unit ? ` ${unit}` : ""}`}
    >
      <RangeInputPrimitive
        value={renderedValue}
        min={renderedMin}
        max={renderedMax}
        step={renderedStep}
        disabled={baseProps.disabled}
        ariaLabel={baseProps.label}
        onChange={(next) => {
          if (usesExplicitSteps) {
            const index = Math.round(clampNumber(next, 0, explicitSteps.length - 1));
            onChange(explicitSteps[index]);
          } else if (mode === "step") {
            onChange(snapToStep(next, min, max, renderedStep));
          } else {
            onChange(clampNumber(next, min, max));
          }
        }}
      />
    </InlineWidgetFrame>
  );
}

export type ContinuousSliderProps = Omit<NumericControlProps, "step"> & {
  step?: number;
};

export function ContinuousSlider(props: ContinuousSliderProps) {
  return (
    <NumericSlider
      {...props}
      mode="continuous"
      step={validStep(props.step, 0.01)}
    />
  );
}

export type StepSliderProps = Omit<NumericControlProps, "step"> & {
  step?: number;
  steps?: readonly number[];
};

export function StepSlider(props: StepSliderProps) {
  return (
    <NumericSlider
      {...props}
      mode="step"
      step={validStep(props.step)}
    />
  );
}

export type { InlineWidgetControlBaseProps };
