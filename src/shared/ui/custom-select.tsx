"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type SelectOption = {
  value: string;
  label: string;
  description?: string;
};

type CustomSelectProps = {
  name: string;
  options: SelectOption[];
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  onValueChange?: (value: string) => void;
};

export function CustomSelect({
  name,
  options,
  defaultValue = "",
  placeholder = "선택하세요",
  required,
  disabled,
  className = "",
  onValueChange,
}: CustomSelectProps) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selected = options.find((option) => option.value === value);
  const floatingStyle = useFloatingMenu(rootRef, open);

  useDismiss([rootRef, menuRef], open, () => setOpen(false));
  function choose(nextValue: string) {
    setValue(nextValue);
    setOpen(false);
    onValueChange?.(nextValue);
  }

  return (
    <div ref={rootRef} className={`custom-select ${className}`}>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        className="custom-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        data-required={required || undefined}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className={selected ? "" : "text-[var(--muted)]"}>
          {selected?.label ?? placeholder}
        </span>
        <Chevron open={open} />
      </button>
      {open ? createPortal(
        <div ref={menuRef} id={listboxId} role="listbox" className="custom-select__menu" style={floatingStyle}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={value === option.value}
              className="custom-select__option"
              onClick={() => choose(option.value)}
            >
              <span>
                <strong>{option.label}</strong>
                {option.description ? <small>{option.description}</small> : null}
              </span>
              {value === option.value ? <Check /> : null}
            </button>
          ))}
        </div>,
        document.body,
      ) : null}
    </div>
  );
}

type CustomMultiSelectProps = {
  name: string;
  options: SelectOption[];
  defaultValues?: string[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onValuesChange?: (values: string[]) => void;
};

export function CustomMultiSelect({
  name,
  options,
  defaultValues = [],
  placeholder = "담당자를 선택하세요",
  disabled,
  className = "",
  onValuesChange,
}: CustomMultiSelectProps) {
  const [values, setValues] = useState(() => [...new Set(defaultValues)]);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selectedOptions = options.filter((option) => values.includes(option.value));
  const floatingStyle = useFloatingMenu(rootRef, open);

  useDismiss([rootRef, menuRef], open, () => setOpen(false));

  function toggle(value: string) {
    const nextValues = values.includes(value)
      ? values.filter((candidate) => candidate !== value)
      : [...values, value];
    setValues(nextValues);
    onValuesChange?.(nextValues);
  }

  return (
    <div ref={rootRef} className={`custom-select custom-multi-select ${className}`}>
      {values.map((value) => <input key={value} type="hidden" name={name} value={value} />)}
      <button
        type="button"
        className="custom-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={selectedOptions.length ? "custom-multi-select__summary" : "text-[var(--muted)]"}>
          {selectedOptions.length ? (
            <>
              {selectedOptions.slice(0, 2).map((option) => (
                <span key={option.value} className="custom-multi-select__chip">{option.label}</span>
              ))}
              {selectedOptions.length > 2 ? <span className="custom-multi-select__count">+{selectedOptions.length - 2}</span> : null}
            </>
          ) : placeholder}
        </span>
        <Chevron open={open} />
      </button>
      {open ? createPortal(
        <div ref={menuRef} id={listboxId} role="listbox" aria-multiselectable="true" className="custom-select__menu" style={floatingStyle}>
          <div className="custom-select__menu-heading">
            <span>담당자 선택</span>
            <span>{values.length}명</span>
          </div>
          {options.map((option) => {
            const checked = values.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={checked}
                className="custom-select__option"
                onClick={() => toggle(option.value)}
              >
                <span className="custom-multi-select__avatar" aria-hidden="true">{option.label.slice(0, 1)}</span>
                <span className="min-w-0 flex-1">
                  <strong>{option.label}</strong>
                  {option.description ? <small>{option.description}</small> : null}
                </span>
                <span className="custom-multi-select__checkbox" aria-hidden="true">{checked ? <Check /> : null}</span>
              </button>
            );
          })}
          {options.length === 0 ? <p className="custom-select__empty">선택할 수 있는 팀원이 없습니다.</p> : null}
        </div>,
        document.body,
      ) : null}
    </div>
  );
}

function useDismiss(
  refs: Array<React.RefObject<HTMLDivElement | null>>,
  open: boolean,
  dismiss: () => void,
) {
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (!refs.some((ref) => ref.current?.contains(event.target as Node))) dismiss();
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") dismiss();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dismiss, open, refs]);
}

function useFloatingMenu(
  rootRef: React.RefObject<HTMLDivElement | null>,
  open: boolean,
): React.CSSProperties {
  const [style, setStyle] = useState<React.CSSProperties>({});

  useLayoutEffect(() => {
    if (!open) return;
    function position() {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const gutter = 8;
      const width = Math.max(rect.width, 224);
      const left = Math.min(rect.left, window.innerWidth - width - gutter);
      const spaceBelow = window.innerHeight - rect.bottom - gutter;
      const spaceAbove = rect.top - gutter;
      const openAbove = spaceBelow < 180 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(120, Math.min(352, openAbove ? spaceAbove : spaceBelow));
      setStyle({
        left: Math.max(gutter, left),
        top: openAbove ? Math.max(gutter, rect.top - maxHeight - gutter) : rect.bottom + gutter,
        width,
        maxHeight,
      });
    }
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [open, rootRef]);

  return style;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className={`custom-select__chevron ${open ? "rotate-180" : ""}`}>
      <path d="m6 8 4 4 4-4" />
    </svg>
  );
}

function Check() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="custom-select__check">
      <path d="m4.5 10.5 3.4 3.4 7.6-7.8" />
    </svg>
  );
}
