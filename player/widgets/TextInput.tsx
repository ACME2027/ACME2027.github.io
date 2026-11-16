import { InlineWidgetFrame } from "./InlineWidgetFrame";
import { TextInputPrimitive } from "./InputPrimitives";
import type { InlineWidgetControlBaseProps } from "./types";

export type TextInputProps = InlineWidgetControlBaseProps & {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
};

export function TextInput({
  value,
  placeholder,
  onChange,
  ...baseProps
}: TextInputProps) {
  return (
    <InlineWidgetFrame
      {...baseProps}
      className={`iw-text-input ${baseProps.className ?? ""}`.trim()}
    >
      <TextInputPrimitive
        value={value}
        placeholder={placeholder}
        disabled={baseProps.disabled}
        ariaLabel={baseProps.label}
        onChange={onChange}
      />
    </InlineWidgetFrame>
  );
}
