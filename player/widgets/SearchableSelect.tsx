import { useEffect, useId, useMemo, useState } from "react";
import { InlineWidgetFrame } from "./InlineWidgetFrame";
import type {
  InlineWidgetControlBaseProps,
  InlineWidgetOption,
  OptionEquality,
} from "./types";
import { defaultOptionEquality, optionForValue } from "./valueUtils";

export type SearchableSelectProps<T = unknown> = InlineWidgetControlBaseProps & {
  options: readonly InlineWidgetOption<T>[];
  value: T | null;
  placeholder?: string;
  noResultsText?: string;
  isOptionEqual?: OptionEquality<T>;
  onChange: (value: T) => void;
};

export function SearchableSelect<T>({
  options,
  value,
  placeholder = "Search options…",
  noResultsText = "No matching options",
  isOptionEqual = defaultOptionEquality,
  onChange,
  ...baseProps
}: SearchableSelectProps<T>) {
  const generatedId = useId();
  const listboxId = `${baseProps.id ?? generatedId}-listbox`;
  const selected = value === null
    ? undefined
    : optionForValue(options, value, isOptionEqual);
  const [query, setQuery] = useState(selected?.label ?? "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setQuery(selected?.label ?? "");
  }, [selected?.id, selected?.label]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized || normalized === selected?.label.toLocaleLowerCase()) {
      return options;
    }
    return options.filter((option) =>
      option.label.toLocaleLowerCase().includes(normalized),
    );
  }, [options, query, selected?.label]);

  useEffect(() => {
    setActiveIndex((current) =>
      filtered.length === 0 ? 0 : Math.min(current, filtered.length - 1),
    );
  }, [filtered.length]);

  function choose(option: InlineWidgetOption<T>) {
    if (baseProps.disabled || option.disabled) return;
    onChange(option.value);
    setQuery(option.label);
    setOpen(false);
  }

  return (
    <InlineWidgetFrame
      {...baseProps}
      className={`iw-searchable-select ${baseProps.className ?? ""}`.trim()}
      valueText={baseProps.inline ? undefined : selected?.label ?? "None"}
    >
      <span
        className="iw-combobox"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setOpen(false);
            setQuery(selected?.label ?? "");
          }
        }}
      >
        <input
          type="search"
          role="combobox"
          aria-label={baseProps.label}
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={
            open && filtered[activeIndex]
              ? `${listboxId}-${filtered[activeIndex].id}`
              : undefined
          }
          autoComplete="off"
          disabled={baseProps.disabled}
          placeholder={placeholder}
          value={query}
          onFocus={(event) => {
            setOpen(true);
            event.currentTarget.select();
          }}
          onChange={(event) => {
            if (baseProps.disabled) return;
            setQuery(event.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (baseProps.disabled) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((current) =>
                filtered.length === 0 ? 0 : (current + 1) % filtered.length,
              );
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((current) =>
                filtered.length === 0
                  ? 0
                  : (current - 1 + filtered.length) % filtered.length,
              );
            } else if (event.key === "Enter" && open && filtered[activeIndex]) {
              event.preventDefault();
              choose(filtered[activeIndex]);
            } else if (event.key === "Escape") {
              setOpen(false);
              setQuery(selected?.label ?? "");
            }
          }}
        />
        {open && (
          <span className="iw-listbox" role="listbox" id={listboxId}>
            {filtered.length === 0 ? (
              <span className="iw-listbox__empty">{noResultsText}</span>
            ) : (
              filtered.map((option, index) => (
                <button
                  id={`${listboxId}-${option.id}`}
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={option.id === selected?.id}
                  className={index === activeIndex ? "iw-listbox__option--active" : ""}
                  disabled={baseProps.disabled || option.disabled}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => choose(option)}
                >
                  {option.label}
                </button>
              ))
            )}
          </span>
        )}
      </span>
    </InlineWidgetFrame>
  );
}
