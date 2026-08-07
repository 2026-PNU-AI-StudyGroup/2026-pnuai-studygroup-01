"use client";

import { UiText } from "@/shared/i18n/i18n-provider";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useI18n } from "@/shared/i18n/i18n-provider";

type SelectOption = {
  value: string;
  label: string;
  description?: string;
};

type CustomSelectProps = {
  id?: string;
  name: string;
  ariaLabel: string;
  ariaDescribedBy?: string;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  density?: "default" | "compact";
  className?: string;
  onValueChange?: (value: string) => void;
};

export function CustomSelect({
  id,
  name,
  ariaLabel,
  ariaDescribedBy,
  options,
  value: controlledValue,
  defaultValue = "",
  placeholder = "선택하세요",
  required,
  disabled,
  searchable,
  density = "default",
  className = "",
  onValueChange,
}: CustomSelectProps) {
  const { t } = useI18n();
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [portalHost, setPortalHost] = useState<Element | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [invalid, setInvalid] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef(new Map<number, HTMLButtonElement>());
  const listboxId = useId();
  const value = controlledValue ?? uncontrolledValue;
  const controlled = controlledValue !== undefined;
  const showSearch = searchable ?? options.length > 7;
  const filteredOptions = filterOptions(options, query);
  const resolvedActiveIndex = normalizeActiveIndex(activeIndex, filteredOptions.length);
  const selected = options.find((option) => option.value === value);
  const floatingStyle = useFloatingMenu(rootRef, open);
  const showInvalid = invalid && Boolean(required && !disabled && !value);

  useDismiss([rootRef, menuRef], open, (restoreFocus) => {
    setOpen(false);
    setQuery("");
    if (restoreFocus) window.setTimeout(() => triggerRef.current?.focus(), 0);
  });

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      if (showSearch) searchRef.current?.focus();
      else if (resolvedActiveIndex >= 0) optionRefs.current.get(resolvedActiveIndex)?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, resolvedActiveIndex, showSearch]);

  function openMenu(direction: "first" | "last" = "first") {
    const selectedIndex = options.findIndex((option) => option.value === value);
    const fallbackIndex = direction === "last" ? options.length - 1 : 0;
    setQuery("");
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : fallbackIndex);
    setPortalHost(getPortalHost(triggerRef.current));
    setOpen(true);
  }

  function focusOption(index: number) {
    setActiveIndex(index);
    optionRefs.current.get(index)?.focus();
  }

  function moveFromMenu(backward: boolean) {
    setOpen(false);
    setQuery("");
    const trigger = triggerRef.current;
    if (trigger) window.setTimeout(() => focusAdjacentTabbable(trigger, backward), 0);
  }

  function choose(nextValue: string) {
    setOpen(false);
    setQuery("");
    window.setTimeout(() => triggerRef.current?.focus(), 0);
    if (nextValue === value) return;
    if (!controlled) setUncontrolledValue(nextValue);
    setInvalid(Boolean(required && !nextValue));
    onValueChange?.(nextValue);
  }

  return (
    <div ref={rootRef} className={`custom-select ${className}`} data-density={density}>
      <input type="hidden" name={name} value={value} />
      <button
        id={id}
        ref={triggerRef}
        type="button"
        role="combobox"
        className="custom-select__trigger"
        aria-haspopup="listbox"
        aria-label={t(ariaLabel)}
        aria-describedby={ariaDescribedBy}
        aria-expanded={open}
        aria-controls={listboxId}
        aria-required={required || undefined}
        aria-invalid={showInvalid || undefined}
        disabled={disabled}
        onClick={() => {
          if (open) setOpen(false);
          else openMenu();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openMenu(event.key === "ArrowUp" ? "last" : "first");
          }
        }}
      >
        <span className={selected ? "" : "text-[var(--muted)]"}>
          {t(selected?.label ?? placeholder)}
        </span>
        <Chevron open={open} />
      </button>
      <input
        type="text"
        value={value}
        required={required}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        className="custom-select__validation-proxy pointer-events-none absolute left-0 top-0 size-px overflow-hidden whitespace-nowrap border-0 p-0 opacity-0 [clip-path:inset(50%)]"
        onChange={() => undefined}
        onInvalid={(event) => {
          event.preventDefault();
          setInvalid(true);
          triggerRef.current?.focus();
          window.setTimeout(() => triggerRef.current?.focus(), 0);
        }}
      />
      {open && portalHost ? createPortal(
        <div
          ref={menuRef}
          id={showSearch ? undefined : listboxId}
          role={showSearch ? undefined : "listbox"}
          className="custom-select__menu"
          style={floatingStyle}
        >
          {showSearch ? <SelectSearch
            inputRef={searchRef}
            ariaLabel={`${ariaLabel} 검색`}
            query={query}
            onQueryChange={(nextQuery) => {
              setQuery(nextQuery);
              setActiveIndex(0);
            }}
            onArrowDown={() => focusOption(0)}
            onEscape={() => {
              setOpen(false);
              setQuery("");
              window.setTimeout(() => triggerRef.current?.focus(), 0);
            }}
            onTab={moveFromMenu}
          /> : null}
          <div id={showSearch ? listboxId : undefined} role={showSearch ? "listbox" : undefined}>
          {filteredOptions.map((option, index) => (
            <button
              key={option.value}
              ref={(node) => {
                if (node) optionRefs.current.set(index, node);
                else optionRefs.current.delete(index);
              }}
              type="button"
              role="option"
              tabIndex={resolvedActiveIndex === index ? 0 : -1}
              aria-selected={value === option.value}
              className="custom-select__option"
              onFocus={() => setActiveIndex(index)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  choose(option.value);
                  return;
                }
                handleOptionNavigation({
                  event,
                  currentIndex: index,
                  optionCount: filteredOptions.length,
                  focusOption,
                  close: () => {
                    setOpen(false);
                    setQuery("");
                    window.setTimeout(() => triggerRef.current?.focus(), 0);
                  },
                  moveFromMenu,
                });
              }}
              onClick={() => choose(option.value)}
            >
              <span>
                <strong>{t(option.label)}</strong>
                {option.description ? <small>{t(option.description)}</small> : null}
              </span>
              {value === option.value ? <Check /> : null}
            </button>
          ))}
          {filteredOptions.length === 0 ? <p className="custom-select__empty">{t("검색 결과가 없습니다.")}</p> : null}
          </div>
        </div>,
        portalHost,
      ) : null}
    </div>
  );
}

type CustomMultiSelectProps = {
  id?: string;
  name: string;
  ariaLabel?: string;
  options: SelectOption[];
  values?: string[];
  defaultValues?: string[];
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  density?: "default" | "compact";
  className?: string;
  onValuesChange?: (values: string[]) => void;
};

export function CustomMultiSelect({
  id,
  name,
  ariaLabel,
  options,
  values: controlledValues,
  defaultValues = [],
  placeholder = "담당자를 선택하세요",
  disabled,
  searchable,
  density = "default",
  className = "",
  onValuesChange,
}: CustomMultiSelectProps) {
  const { t } = useI18n();
  const [uncontrolledValues, setUncontrolledValues] = useState(() => [...new Set(defaultValues)]);
  const [open, setOpen] = useState(false);
  const [portalHost, setPortalHost] = useState<Element | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef(new Map<number, HTMLButtonElement>());
  const listboxId = useId();
  const controlled = controlledValues !== undefined;
  const values = controlled ? [...new Set(controlledValues)] : uncontrolledValues;
  const showSearch = searchable ?? options.length > 7;
  const filteredOptions = filterOptions(options, query);
  const resolvedActiveIndex = normalizeActiveIndex(activeIndex, filteredOptions.length);
  const selectedOptions = options.filter((option) => values.includes(option.value));
  const floatingStyle = useFloatingMenu(rootRef, open);

  useDismiss([rootRef, menuRef], open, (restoreFocus) => {
    setOpen(false);
    setQuery("");
    if (restoreFocus) window.setTimeout(() => triggerRef.current?.focus(), 0);
  });

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      if (showSearch) searchRef.current?.focus();
      else if (resolvedActiveIndex >= 0) optionRefs.current.get(resolvedActiveIndex)?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, resolvedActiveIndex, showSearch]);

  function openMenu(direction: "first" | "last" = "first") {
    const selectedIndex = options.findIndex((option) => values.includes(option.value));
    const fallbackIndex = direction === "last" ? options.length - 1 : 0;
    setQuery("");
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : fallbackIndex);
    setPortalHost(getPortalHost(triggerRef.current));
    setOpen(true);
  }

  function focusOption(index: number) {
    setActiveIndex(index);
    optionRefs.current.get(index)?.focus();
  }

  function moveFromMenu(backward: boolean) {
    setOpen(false);
    setQuery("");
    const trigger = triggerRef.current;
    if (trigger) window.setTimeout(() => focusAdjacentTabbable(trigger, backward), 0);
  }

  function toggle(value: string) {
    const nextValues = values.includes(value)
      ? values.filter((candidate) => candidate !== value)
      : [...values, value];
    if (!controlled) setUncontrolledValues(nextValues);
    onValuesChange?.(nextValues);
  }

  return (
    <div ref={rootRef} className={`custom-select custom-multi-select ${className}`} data-density={density}>
      {values.map((value) => <input key={value} type="hidden" name={name} value={value} />)}
      <button
        id={id}
        ref={triggerRef}
        type="button"
        role={ariaLabel ? "combobox" : undefined}
        className="custom-select__trigger"
        aria-haspopup="listbox"
        aria-label={ariaLabel ? t(ariaLabel) : undefined}
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => {
          if (open) setOpen(false);
          else openMenu();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openMenu(event.key === "ArrowUp" ? "last" : "first");
          }
        }}
      >
        <span className={selectedOptions.length ? "custom-multi-select__summary" : "text-[var(--muted)]"}>
          {selectedOptions.length ? (
            <>
              {selectedOptions.slice(0, 2).map((option) => (
                <span key={option.value} className="custom-multi-select__chip">{t(option.label)}</span>
              ))}
              {selectedOptions.length > 2 ? <span className="custom-multi-select__count">+{selectedOptions.length - 2}</span> : null}
            </>
          ) : t(placeholder)}
        </span>
        <Chevron open={open} />
      </button>
      {open && portalHost ? createPortal(
        <div
          ref={menuRef}
          id={showSearch ? undefined : listboxId}
          role={showSearch ? undefined : "listbox"}
          aria-multiselectable={showSearch ? undefined : "true"}
          className="custom-select__menu"
          style={floatingStyle}
        >
          <div className="custom-select__menu-heading">
            <span>{t("담당자 선택")}</span>
            <span>{values.length}<UiText>{"명"}</UiText></span>
          </div>
          {showSearch ? <SelectSearch
            inputRef={searchRef}
            ariaLabel="담당자 검색"
            query={query}
            onQueryChange={(nextQuery) => {
              setQuery(nextQuery);
              setActiveIndex(0);
            }}
            onArrowDown={() => focusOption(0)}
            onEscape={() => {
              setOpen(false);
              setQuery("");
              window.setTimeout(() => triggerRef.current?.focus(), 0);
            }}
            onTab={moveFromMenu}
          /> : null}
          <div id={showSearch ? listboxId : undefined} role={showSearch ? "listbox" : undefined} aria-multiselectable={showSearch ? "true" : undefined}>
          {filteredOptions.map((option, index) => {
            const checked = values.includes(option.value);
            return (
              <button
                key={option.value}
                ref={(node) => {
                  if (node) optionRefs.current.set(index, node);
                  else optionRefs.current.delete(index);
                }}
                type="button"
                role="option"
                tabIndex={resolvedActiveIndex === index ? 0 : -1}
                aria-selected={checked}
                className="custom-select__option"
                onFocus={() => setActiveIndex(index)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggle(option.value);
                    return;
                  }
                  handleOptionNavigation({
                    event,
                    currentIndex: index,
                    optionCount: filteredOptions.length,
                    focusOption,
                    close: () => {
                      setOpen(false);
                      setQuery("");
                      window.setTimeout(() => triggerRef.current?.focus(), 0);
                    },
                    moveFromMenu,
                  });
                }}
                onClick={() => toggle(option.value)}
              >
                <span className="min-w-0 flex-1">
                  <strong>{t(option.label)}</strong>
                  {option.description ? <small>{t(option.description)}</small> : null}
                </span>
                <span className="custom-multi-select__checkbox" aria-hidden="true">{checked ? <Check /> : null}</span>
              </button>
            );
          })}
          {filteredOptions.length === 0 ? <p className="custom-select__empty">{t(query ? "검색 결과가 없습니다." : "선택할 수 있는 팀원이 없습니다.")}</p> : null}
          </div>
        </div>,
        portalHost,
      ) : null}
    </div>
  );
}

function useDismiss(
  refs: Array<React.RefObject<HTMLDivElement | null>>,
  open: boolean,
  dismiss: (restoreFocus: boolean) => void,
) {
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (!refs.some((ref) => ref.current?.contains(event.target as Node))) dismiss(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") dismiss(true);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dismiss, open, refs]);
}

function SelectSearch({
  inputRef,
  ariaLabel,
  query,
  onQueryChange,
  onArrowDown,
  onEscape,
  onTab,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  ariaLabel: string;
  query: string;
  onQueryChange: (query: string) => void;
  onArrowDown: () => void;
  onEscape: () => void;
  onTab: (backward: boolean) => void;
}) {
  const { t } = useI18n();
  return (
    <label className="custom-select__search">
      <SearchIcon />
      <input
        ref={inputRef}
        type="search"
        aria-label={t(ariaLabel)}
        value={query}
        placeholder={t("목록 검색")}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            onArrowDown();
          } else if (event.key === "Escape") {
            event.preventDefault();
            onEscape();
          } else if (event.key === "Tab") {
            event.preventDefault();
            onTab(event.shiftKey);
          }
        }}
      />
    </label>
  );
}

function filterOptions(options: SelectOption[], query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return options;
  return options.filter((option) => `${option.label} ${option.description ?? ""}`.toLocaleLowerCase().includes(normalizedQuery));
}

function handleOptionNavigation({
  event,
  currentIndex,
  optionCount,
  focusOption,
  close,
  moveFromMenu,
}: {
  event: React.KeyboardEvent<HTMLButtonElement>;
  currentIndex: number;
  optionCount: number;
  focusOption: (index: number) => void;
  close: () => void;
  moveFromMenu: (backward: boolean) => void;
}) {
  const lastIndex = optionCount - 1;
  let nextIndex: number | undefined;
  if (event.key === "ArrowDown") nextIndex = currentIndex >= lastIndex ? 0 : currentIndex + 1;
  if (event.key === "ArrowUp") nextIndex = currentIndex <= 0 ? lastIndex : currentIndex - 1;
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = lastIndex;
  if (event.key === "Tab") {
    event.preventDefault();
    event.stopPropagation();
    moveFromMenu(event.shiftKey);
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    close();
    return;
  }
  if (nextIndex === undefined || nextIndex < 0) return;
  event.preventDefault();
  focusOption(nextIndex);
}

function normalizeActiveIndex(activeIndex: number, optionCount: number) {
  if (optionCount === 0) return -1;
  return Math.min(Math.max(activeIndex, 0), optionCount - 1);
}

function getPortalHost(trigger: HTMLButtonElement | null): Element {
  return trigger?.closest("dialog") ?? document.body;
}

function focusAdjacentTabbable(trigger: HTMLButtonElement, backward: boolean) {
  const dialog = trigger.closest("dialog");
  const scope: Document | HTMLDialogElement = dialog ?? trigger.ownerDocument;
  const tabbables = getTabbableElements(scope);
  const triggerIndex = tabbables.indexOf(trigger);
  const targetIndex = triggerIndex + (backward ? -1 : 1);
  const target = tabbables[targetIndex]
    ?? (dialog && tabbables.length ? tabbables[backward ? tabbables.length - 1 : 0] : undefined);
  if (target) target.focus();
  else trigger.blur();
}

function getTabbableElements(scope: Document | HTMLDialogElement) {
  const elements = [...scope.querySelectorAll<HTMLElement>("*")]
    .filter((element) => isActuallyTabbable(element, scope));
  return elements
    .map((element, domIndex) => ({ element, domIndex }))
    .sort((left, right) => {
      const leftOrder = left.element.tabIndex === 0 ? Number.POSITIVE_INFINITY : left.element.tabIndex;
      const rightOrder = right.element.tabIndex === 0 ? Number.POSITIVE_INFINITY : right.element.tabIndex;
      return leftOrder - rightOrder || left.domIndex - right.domIndex;
    })
    .map(({ element }) => element);
}

function isActuallyTabbable(element: HTMLElement, scope: Document | HTMLDialogElement) {
  if (element.tabIndex < 0 || element.matches(":disabled") || element.closest(".custom-select__menu")) return false;
  if (element instanceof HTMLInputElement && element.type === "hidden") return false;
  const boundary = scope instanceof HTMLDialogElement ? scope : null;
  for (let current: HTMLElement | null = element; current; current = current.parentElement) {
    if (current.hidden || current.hasAttribute("inert")) return false;
    const style = current.ownerDocument.defaultView?.getComputedStyle(current);
    if (style?.display === "none" || style?.visibility === "hidden" || style?.visibility === "collapse") return false;
    if (current === boundary) break;
  }
  return true;
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
      const dialog = rootRef.current?.closest("dialog");
      const dialogRect = dialog?.getBoundingClientRect();
      const gutter = 8;
      const width = Math.max(rect.width, 224);
      const left = Math.min(rect.left, window.innerWidth - width - gutter);
      const spaceBelow = window.innerHeight - rect.bottom - gutter;
      const spaceAbove = rect.top - gutter;
      const openAbove = spaceBelow < 180 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(120, Math.min(352, openAbove ? spaceAbove : spaceBelow));
      const top = openAbove ? Math.max(gutter, rect.top - maxHeight - gutter) : rect.bottom + gutter;
      setStyle({
        // Modal dialogs establish a top-layer containing block in Chromium.
        // Convert viewport coordinates before rendering into the dialog portal.
        left: Math.max(gutter, left) - (dialogRect?.left ?? 0) + (dialog?.scrollLeft ?? 0),
        top: top - (dialogRect?.top ?? 0) + (dialog?.scrollTop ?? 0),
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

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <circle cx="8.75" cy="8.75" r="5.25" />
      <path d="m12.6 12.6 3.9 3.9" />
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
