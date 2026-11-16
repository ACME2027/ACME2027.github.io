import { useEffect, useRef, useState } from "react";
import { InlineWidgetFrame } from "./InlineWidgetFrame";
import type {
  InlineWidgetControlBaseProps,
  InlineWidgetOption,
  OptionEquality,
} from "./types";
import {
  defaultOptionEquality,
  selectedOptionIds,
} from "./valueUtils";

export type MultiSelectProps<T = unknown> = InlineWidgetControlBaseProps & {
  options: readonly InlineWidgetOption<T>[];
  value: readonly T[];
  isOptionEqual?: OptionEquality<T>;
  onChange: (value: T[]) => void;
};

export function MultiSelect<T>({
  options,
  value,
  isOptionEqual = defaultOptionEquality,
  onChange,
  ...baseProps
}: MultiSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLSpanElement>(null);
  const selectedIds = selectedOptionIds(options, value, isOptionEqual);
  const selectedLabels = options
    .filter((option) => selectedIds.has(option.id))
    .map((option) => option.label);
  const summary = selectedLabels.length === 0
    ? "Select options"
    : selectedLabels.length <= 2
      ? selectedLabels.join(", ")
      : `${selectedLabels.length} selected`;

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function toggle(optionId: string, checked: boolean) {
    if (baseProps.disabled) return;
    const nextIds = new Set(selectedIds);
    if (checked) nextIds.add(optionId);
    else nextIds.delete(optionId);
    onChange(
      options
        .filter((option) => nextIds.has(option.id))
        .map((option) => option.value),
    );
  }

  return (
    <InlineWidgetFrame
      {...baseProps}
      className={`iw-multi-select ${baseProps.className ?? ""}`.trim()}
      valueText={baseProps.inline ? undefined : `${selectedIds.size} selected`}
    >
      <span
        ref={dropdownRef}
        className="iw-multi-select__dropdown"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
        }}
      >
        <button
          type="button"
          className="iw-multi-select__trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          disabled={baseProps.disabled}
          onClick={() => setOpen((current) => !current)}
        >
          <span>{summary}</span>
          <span className="iw-multi-select__chevron" aria-hidden="true">⌄</span>
        </button>
        {open && (
          <span
            className="iw-multi-select__menu"
            role="listbox"
            aria-multiselectable="true"
          >
            {options.map((option) => (
              <label
                className="iw-multi-select__option"
                role="option"
                aria-selected={selectedIds.has(option.id)}
                key={option.id}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(option.id)}
                  disabled={baseProps.disabled || option.disabled}
                  onChange={(event) => toggle(option.id, event.target.checked)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </span>
        )}
      </span>
    </InlineWidgetFrame>
  );
}
