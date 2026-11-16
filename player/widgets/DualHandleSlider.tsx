import { useRef, type PointerEvent, type KeyboardEvent } from "react";
import { InlineWidgetFrame } from "./InlineWidgetFrame";
import { RangeInputPrimitive } from "./InputPrimitives";
import type { InlineWidgetControlBaseProps, NumericRangeValue } from "./types";
import { clampNumber, formatWidgetNumber, snapToStep, validStep } from "./valueUtils";

export type DualHandleSliderProps = InlineWidgetControlBaseProps & {
  value: NumericRangeValue;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: [number, number]) => void;
};

type Drag = {
  pointerId: number;
  side: "lower" | "upper" | null;
  original: [number, number];
  startX: number;
  left: number;
  width: number;
  grabOffset: number;
};

const THUMB_RADIUS = 7;

export function DualHandleSlider({ value, min, max, step, unit, onChange, ...baseProps }: DualHandleSliderProps) {
  const safeStep = validStep(step);
  const lower = clampNumber(Math.min(value[0], value[1]), min, max);
  const upper = clampNumber(Math.max(value[0], value[1]), min, max);
  const suffix = unit ? ` ${unit}` : "";
  const trackRef = useRef<HTMLSpanElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const span = max - min;
  const percent = (number: number) => span > 0 ? (number - min) / span * 100 : 0;

  function focusSide(side: "lower" | "upper") {
    trackRef.current?.querySelector<HTMLInputElement>(`.iw-dual-slider__${side}`)?.focus({ preventScroll: true });
  }

  function moveTo(clientX: number) {
    const drag = dragRef.current;
    if (!drag) return;
    if (drag.side === null) {
      if (Math.abs(clientX - drag.startX) < 1) return;
      drag.side = clientX < drag.startX ? "lower" : "upper";
      focusSide(drag.side);
    }
    const ratio = (clientX - drag.grabOffset - drag.left) / drag.width;
    const next = snapToStep(min + ratio * span, min, max, safeStep);
    const [startLower, startUpper] = drag.original;
    onChange(drag.side === "lower"
      ? [Math.min(next, startUpper), startUpper]
      : [startLower, Math.max(next, startLower)]);
  }

  function onPointerDown(event: PointerEvent<HTMLSpanElement>) {
    if (baseProps.disabled || event.button !== 0 || dragRef.current || !(span > 0)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const width = rect.width - THUMB_RADIUS * 2;
    if (!(width > 0)) return;
    const left = rect.left + THUMB_RADIUS;
    const lowerX = left + percent(lower) / 100 * width;
    const upperX = left + percent(upper) / 100 * width;
    const lowerDistance = Math.abs(event.clientX - lowerX);
    const upperDistance = Math.abs(event.clientX - upperX);
    const together = lower === upper && lowerDistance <= THUMB_RADIUS + 3;
    const side = together ? null : lowerDistance <= upperDistance ? "lower" : "upper";
    const center = side === "upper" ? upperX : lowerX;
    const onThumb = Math.abs(event.clientX - center) <= THUMB_RADIUS + 3;
    dragRef.current = {
      pointerId: event.pointerId, side, original: [lower, upper], startX: event.clientX,
      left, width, grabOffset: onThumb ? event.clientX - center : 0,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    if (side) focusSide(side);
    if (!onThumb) moveTo(event.clientX);
  }

  function onPointerMove(event: PointerEvent<HTMLSpanElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    moveTo(event.clientX);
    event.preventDefault();
  }

  function endPointer(event: PointerEvent<HTMLSpanElement>, cancelled = false) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (cancelled) onChange(drag.original);
    else moveTo(event.clientX);
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function onKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    if (event.key !== "Escape" || !dragRef.current) return;
    const drag = dragRef.current;
    dragRef.current = null;
    onChange(drag.original);
    if (event.currentTarget.hasPointerCapture(drag.pointerId)) event.currentTarget.releasePointerCapture(drag.pointerId);
    event.preventDefault();
  }

  return (
    <InlineWidgetFrame {...baseProps} className={`iw-dual-slider ${baseProps.className ?? ""}`.trim()}
      valueText={`${formatWidgetNumber(lower)}${suffix} – ${formatWidgetNumber(upper)}${suffix}`}>
      <span className="iw-dual-slider__track" ref={trackRef} data-disabled={baseProps.disabled || undefined}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove}
        onPointerUp={(event) => endPointer(event)} onPointerCancel={(event) => endPointer(event, true)}
        onLostPointerCapture={() => { dragRef.current = null; }} onKeyDown={onKeyDown}>
        <span className="iw-dual-slider__rail" aria-hidden="true">
          <span className="iw-dual-slider__selection" style={{ left: `${percent(lower)}%`, right: `${100 - percent(upper)}%` }} />
        </span>
        <RangeInputPrimitive value={lower} min={min} max={max} step={safeStep} disabled={baseProps.disabled}
          ariaLabel={`${baseProps.label} lower bound`} className="iw-dual-slider__lower"
          onChange={(next) => onChange([Math.min(snapToStep(next, min, max, safeStep), upper), upper])} />
        <RangeInputPrimitive value={upper} min={min} max={max} step={safeStep} disabled={baseProps.disabled}
          ariaLabel={`${baseProps.label} upper bound`} className="iw-dual-slider__upper"
          onChange={(next) => onChange([lower, Math.max(snapToStep(next, min, max, safeStep), lower)])} />
      </span>
    </InlineWidgetFrame>
  );
}
