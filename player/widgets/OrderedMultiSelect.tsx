import { useState } from "react";
import { InlineWidgetFrame } from "./InlineWidgetFrame";
import type {
  InlineWidgetControlBaseProps,
  InlineWidgetOption,
  OptionEquality,
} from "./types";
import {
  defaultOptionEquality,
  optionForValue,
} from "./valueUtils";

export type OrderedMultiSelectProps<T = unknown> = InlineWidgetControlBaseProps & {
  options: readonly InlineWidgetOption<T>[];
  value: readonly T[];
  isOptionEqual?: OptionEquality<T>;
  onChange: (value: T[]) => void;
};

export function OrderedMultiSelect<T>({
  options,
  value,
  isOptionEqual = defaultOptionEquality,
  onChange,
  ...baseProps
}: OrderedMultiSelectProps<T>) {
  const [draggedId, setDraggedId] = useState<string>();
  const usedIds = new Set<string>();
  const orderedOptions = value.flatMap((item) => {
    const option = optionForValue(options, item, isOptionEqual, usedIds);
    if (!option) return [];
    usedIds.add(option.id);
    return [option];
  });

  function move(fromId: string, toIndex: number) {
    if (baseProps.disabled) return;
    const fromIndex = orderedOptions.findIndex((option) => option.id === fromId);
    if (fromIndex < 0 || toIndex < 0 || toIndex >= orderedOptions.length) return;
    const next = [...orderedOptions];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    onChange(next.map((option) => option.value));
  }

  return (
    <InlineWidgetFrame
      {...baseProps}
      className={`iw-ordered-select ${baseProps.className ?? ""}`.trim()}
      valueText={`${orderedOptions.length} ordered`}
    >
      <ol className="iw-order-list">
        {orderedOptions.map((option, index) => (
          <li
            key={option.id}
            draggable={!baseProps.disabled && !option.disabled}
            className={draggedId === option.id ? "iw-order-list__item--dragging" : ""}
            onDragStart={(event) => {
              setDraggedId(option.id);
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", option.id);
            }}
            onDragEnd={() => setDraggedId(undefined)}
            onDragOver={(event) => {
              if (!baseProps.disabled) {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              const sourceId = draggedId || event.dataTransfer.getData("text/plain");
              move(sourceId, index);
              setDraggedId(undefined);
            }}
          >
            <span className="iw-order-list__handle" aria-hidden="true">⠿</span>
            <span className="iw-order-list__label">{option.label}</span>
            <span className="iw-order-list__actions">
              <button
                type="button"
                aria-label={`Move ${option.label} up`}
                disabled={baseProps.disabled || option.disabled || index === 0}
                onClick={() => move(option.id, index - 1)}
              >
                ↑
              </button>
              <button
                type="button"
                aria-label={`Move ${option.label} down`}
                disabled={
                  baseProps.disabled ||
                  option.disabled ||
                  index === orderedOptions.length - 1
                }
                onClick={() => move(option.id, index + 1)}
              >
                ↓
              </button>
            </span>
          </li>
        ))}
      </ol>
    </InlineWidgetFrame>
  );
}
