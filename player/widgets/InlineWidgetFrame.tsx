import type { InlineWidgetFrameProps } from "./types";

export function InlineWidgetFrame({
  id,
  label,
  description,
  disabled,
  inline,
  className,
  children,
  valueText,
}: InlineWidgetFrameProps) {
  const classes = [
    "iw-control",
    inline ? "iw-control--inline" : "",
    disabled ? "iw-control--disabled" : "",
    className ?? "",
  ].filter(Boolean).join(" ");

  const Root = inline ? "span" : "div";

  return (
    <Root
      id={id}
      className={classes}
      role="group"
      aria-label={label}
      aria-disabled={disabled || undefined}
      title={inline ? label : undefined}
    >
      {!inline && <span className="iw-control__label">{label}</span>}
      <span className="iw-control__body">{children}</span>
      {valueText !== undefined && (
        <output className="iw-control__value">{valueText}</output>
      )}
      {description && !inline && (
        <span className="iw-control__description">{description}</span>
      )}
    </Root>
  );
}
