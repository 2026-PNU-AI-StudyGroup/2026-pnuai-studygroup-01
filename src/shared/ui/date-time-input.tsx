"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEventHandler,
  type CSSProperties,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

import { useI18n } from "@/shared/i18n/i18n-provider";
import { IconButton } from "@/shared/ui/icon-button";

type DateTimeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className" | "defaultValue" | "onChange" | "type" | "value"
> & {
  type?: "date" | "datetime-local";
  className?: string;
  defaultValue?: string;
  value?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  onValueChange?: (value: string) => void;
};

type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

const DEFAULT_TIME = "09:00";

export function DateTimeInput({
  "aria-describedby": ariaDescribedBy,
  "aria-label": ariaLabel,
  autoFocus,
  className = "",
  defaultValue = "",
  disabled,
  form,
  id,
  max,
  min,
  name,
  onChange,
  onValueChange,
  onInvalid,
  required,
  type = "datetime-local",
  value: controlledValue,
  ...inputProps
}: DateTimeInputProps) {
  const { locale, t } = useI18n();
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const [timeInputValue, setTimeInputValue] = useState(() => getTime(controlledValue ?? defaultValue) ?? DEFAULT_TIME);
  const [open, setOpen] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [portalHost, setPortalHost] = useState<Element | null>(null);
  const initialDate = parseDateValue(controlledValue ?? defaultValue, type) ?? today();
  const [visibleMonth, setVisibleMonth] = useState(() => monthStart(initialDate));
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const proxyRef = useRef<HTMLInputElement>(null);
  const draftTimeRef = useRef(getTime(controlledValue ?? defaultValue) ?? DEFAULT_TIME);
  const dayRefs = useRef(new Map<string, HTMLButtonElement>());
  const calendarId = useId();
  const value = controlledValue ?? uncontrolledValue;
  const selectedDate = parseDateValue(value, type);
  const visibleDays = calendarDays(visibleMonth);
  const floatingStyle = useFloatingCalendar(rootRef, open, type);
  const hasValue = Boolean(selectedDate);
  const showInvalid = invalid && Boolean(required && !disabled && !hasValue);

  useEffect(() => {
    if (!open) return;

    function dismiss(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      close(false);
    }

    document.addEventListener("pointerdown", dismiss, true);
    return () => document.removeEventListener("pointerdown", dismiss, true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      const focusDate = selectedDate && isDateAllowed(selectedDate, min, max)
        ? selectedDate
        : firstAllowedDate(visibleDays, min, max);
      if (focusDate) dayRefs.current.get(dateKey(focusDate))?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [max, min, open, selectedDate, visibleDays]);

  function close(restoreFocus = true) {
    setOpen(false);
    if (restoreFocus) window.setTimeout(() => triggerRef.current?.focus(), 0);
  }

  function openCalendar() {
    const date = selectedDate ?? today();
    setVisibleMonth(monthStart(date));
    const nextDraftTime = getTime(value) ?? DEFAULT_TIME;
    draftTimeRef.current = nextDraftTime;
    setTimeInputValue(nextDraftTime);
    setPortalHost(getPortalHost(triggerRef.current));
    setOpen(true);
  }

  function commit(nextValue: string) {
    if (nextValue === value) return;
    if (controlledValue === undefined) setUncontrolledValue(nextValue);
    if (type === "datetime-local") {
      const nextDraftTime = getTime(nextValue) ?? DEFAULT_TIME;
      draftTimeRef.current = nextDraftTime;
      setTimeInputValue(nextDraftTime);
    }
    setInvalid(false);
    onValueChange?.(nextValue);

    const proxy = proxyRef.current;
    if (!proxy) return;
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    valueSetter?.call(proxy, nextValue);
    proxy.dispatchEvent(new Event("input", { bubbles: true }));
    proxy.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function selectDate(date: CalendarDate) {
    if (!isDateAllowed(date, min, max)) return;
    const preservedValue = composeValue(date, draftTimeRef.current, type);
    const time = isValueAllowed(preservedValue, min, max)
      ? draftTimeRef.current
      : boundaryTime(date, min, max) ?? DEFAULT_TIME;
    const nextValue = composeValue(date, time, type);
    if (isValueAllowed(nextValue, min, max)) commit(nextValue);
    close();
  }

  function changeTime(nextTime: string) {
    setTimeInputValue(nextTime);
    if (!isValidTime(nextTime)) return;
    const next = nextTime;
    draftTimeRef.current = next;
    if (!selectedDate) return;
    const nextValue = composeValue(selectedDate, next, type);
    if (isValueAllowed(nextValue, min, max)) commit(nextValue);
  }

  function moveMonth(amount: number) {
    setVisibleMonth((current) => addMonths(current, amount));
  }

  function focusDate(date: CalendarDate) {
    if (!isDateAllowed(date, min, max)) return;
    setVisibleMonth(monthStart(date));
    window.requestAnimationFrame(() => dayRefs.current.get(dateKey(date))?.focus({ preventScroll: true }));
  }

  function handleDayKeyDown(event: KeyboardEvent<HTMLButtonElement>, date: CalendarDate) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }

    let next: CalendarDate | undefined;
    if (event.key === "ArrowLeft") next = addDays(date, -1);
    if (event.key === "ArrowRight") next = addDays(date, 1);
    if (event.key === "ArrowUp") next = addDays(date, -7);
    if (event.key === "ArrowDown") next = addDays(date, 7);
    if (event.key === "Home") next = addDays(date, -dateWeekday(date));
    if (event.key === "End") next = addDays(date, 6 - dateWeekday(date));
    if (event.key === "PageUp") next = addMonths(date, event.shiftKey ? -12 : -1);
    if (event.key === "PageDown") next = addMonths(date, event.shiftKey ? 12 : 1);
    if (!next) return;
    event.preventDefault();
    focusDate(next);
  }

  const inputLabel = ariaLabel ?? t(type === "date" ? "날짜 선택" : "일시 선택");

  return (
    <div ref={rootRef} className="date-time-input">
      <input
        {...inputProps}
        ref={proxyRef}
        name={name}
        form={form}
        type="text"
        value={value}
        min={min}
        max={max}
        required={required}
        disabled={disabled}
        readOnly
        tabIndex={-1}
        aria-hidden="true"
        className="date-time-input__validation-proxy"
        onChange={onChange}
        onInvalid={(event) => {
          event.preventDefault();
          setInvalid(true);
          triggerRef.current?.focus();
          window.setTimeout(() => triggerRef.current?.focus(), 0);
          onInvalid?.(event);
        }}
      />
      <button
        id={id}
        ref={triggerRef}
        type="button"
        className={`date-time-input__trigger ${className}`}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={calendarId}
        data-invalid={showInvalid || undefined}
        disabled={disabled}
        autoFocus={autoFocus}
        onClick={() => {
          if (open) close(false);
          else openCalendar();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!open) openCalendar();
          }
        }}
      >
        <span className={hasValue ? "" : "date-time-input__placeholder"}>
          {hasValue ? formatTriggerValue(selectedDate!, value, type) : t(type === "date" ? "날짜 선택" : "일시 선택")}
        </span>
        <CalendarIcon />
      </button>
      {open && portalHost ? createPortal(
        <section
          ref={menuRef}
          id={calendarId}
          role="dialog"
          aria-label={inputLabel}
          data-type={type}
          className="date-time-input__calendar"
          style={floatingStyle}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              close();
            }
          }}
        >
          <header className="date-time-input__calendar-header">
            <button type="button" className="date-time-input__month-button" aria-label={t("이전 달")} onClick={() => moveMonth(-1)}>
              <Chevron direction="left" />
            </button>
            <strong aria-live="polite">{formatMonth(visibleMonth, locale)}</strong>
            <button type="button" className="date-time-input__month-button" aria-label={t("다음 달")} onClick={() => moveMonth(1)}>
              <Chevron direction="right" />
            </button>
          </header>
          <div className="date-time-input__weekdays" aria-hidden="true">
            {weekdayLabels(locale).map((label) => <span key={label}>{label}</span>)}
          </div>
          <div role="grid" aria-label={formatMonth(visibleMonth, locale)} className="date-time-input__days">
            {visibleDays.map((date, index) => date ? (
              <button
                key={dateKey(date)}
                ref={(node) => {
                  if (node) dayRefs.current.set(dateKey(date), node);
                  else dayRefs.current.delete(dateKey(date));
                }}
                type="button"
                role="gridcell"
                className={`date-time-input__day${sameDate(date, selectedDate) ? " date-time-input__day--selected" : ""}${sameDate(date, today()) ? " date-time-input__day--today" : ""}`}
                aria-label={formatDateLabel(date, locale)}
                aria-selected={sameDate(date, selectedDate)}
                disabled={!isDateAllowed(date, min, max)}
                tabIndex={sameDate(date, selectedDate) || (!selectedDate && sameDate(date, today())) ? 0 : -1}
                onKeyDown={(event) => handleDayKeyDown(event, date)}
                onClick={() => selectDate(date)}
              >
                {date.day}
              </button>
            ) : <span key={`empty-${index}`} aria-hidden="true" />)}
          </div>
          {type === "datetime-local" ? (
            <label className="date-time-input__time-field">
              <span>{t("시간")}</span>
              <input
                type="text"
                value={timeInputValue}
                inputMode="numeric"
                maxLength={5}
                pattern="[0-2][0-9]:[0-5][0-9]"
                placeholder="09:00"
                aria-invalid={!isValidTime(timeInputValue) || undefined}
                onChange={(event) => changeTime(event.target.value)}
                onBlur={() => setTimeInputValue(draftTimeRef.current)}
              />
            </label>
          ) : null}
          <footer className="date-time-input__calendar-footer">
            <button type="button" onClick={() => selectDate(today())}>{t("오늘")}</button>
            {hasValue ? <IconButton type="button" onClick={() => { commit(""); close(); }} aria-label="지우기" title="지우기">×</IconButton> : null}
          </footer>
        </section>,
        portalHost,
      ) : null}
    </div>
  );
}

function parseDateValue(value: string | undefined, type: "date" | "datetime-local"): CalendarDate | undefined {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(value);
  if (!match || (type === "datetime-local" && (!match[4] || !match[5]))) return undefined;
  const date = { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) };
  if (!isRealDate(date)) return undefined;
  if (match[4] && (Number(match[4]) > 23 || Number(match[5]) > 59)) return undefined;
  return date;
}

function getTime(value: string) {
  const match = /T(\d{2}):(\d{2})$/.exec(value);
  return match ? `${match[1]}:${match[2]}` : undefined;
}

function isValidTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  return Boolean(match && Number(match[1]) <= 23 && Number(match[2]) <= 59);
}

function composeValue(date: CalendarDate, time: string, type: "date" | "datetime-local") {
  const value = dateKey(date);
  return type === "date" ? value : `${value}T${time}`;
}

function dateKey({ year, month, day }: CalendarDate) {
  return `${year.toString().padStart(4, "0")}-${(month + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function today(): CalendarDate {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
}

function makeDate(year: number, month: number, day: number): CalendarDate {
  const normalized = new Date(year, month, day);
  return { year: normalized.getFullYear(), month: normalized.getMonth(), day: normalized.getDate() };
}

function monthStart(date: CalendarDate) {
  return { year: date.year, month: date.month, day: 1 };
}

function addDays(date: CalendarDate, amount: number) {
  return makeDate(date.year, date.month, date.day + amount);
}

function addMonths(date: CalendarDate, amount: number) {
  const next = new Date(date.year, date.month + amount, 1);
  return makeDate(next.getFullYear(), next.getMonth(), Math.min(date.day, daysInMonth(next.getFullYear(), next.getMonth())));
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function isRealDate(date: CalendarDate) {
  const normalized = new Date(date.year, date.month, date.day);
  return normalized.getFullYear() === date.year && normalized.getMonth() === date.month && normalized.getDate() === date.day;
}

function dateWeekday(date: CalendarDate) {
  return new Date(date.year, date.month, date.day).getDay();
}

function calendarDays(month: CalendarDate) {
  const first = dateWeekday(month);
  const count = daysInMonth(month.year, month.month);
  const cells = Math.ceil((first + count) / 7) * 7;
  return Array.from({ length: cells }, (_, index) => {
    const day = index - first + 1;
    return day < 1 || day > count ? undefined : { year: month.year, month: month.month, day };
  });
}

function sameDate(left: CalendarDate | undefined, right: CalendarDate | undefined) {
  return Boolean(left && right && left.year === right.year && left.month === right.month && left.day === right.day);
}

function isDateAllowed(date: CalendarDate, min: string | number | undefined, max: string | number | undefined) {
  const value = dateKey(date);
  const minDate = typeof min === "string" ? min.slice(0, 10) : undefined;
  const maxDate = typeof max === "string" ? max.slice(0, 10) : undefined;
  return (!minDate || value >= minDate) && (!maxDate || value <= maxDate);
}

function isValueAllowed(value: string, min: string | number | undefined, max: string | number | undefined) {
  const minimum = typeof min === "string" ? min : undefined;
  const maximum = typeof max === "string" ? max : undefined;
  return (!minimum || value >= minimum) && (!maximum || value <= maximum);
}

function boundaryTime(date: CalendarDate, min: string | number | undefined, max: string | number | undefined) {
  const key = dateKey(date);
  if (typeof min === "string" && min.slice(0, 10) === key) return getTime(min);
  if (typeof max === "string" && max.slice(0, 10) === key) return getTime(max);
  return undefined;
}

function firstAllowedDate(days: Array<CalendarDate | undefined>, min: string | number | undefined, max: string | number | undefined) {
  return days.find((date): date is CalendarDate => Boolean(date && isDateAllowed(date, min, max)));
}

function formatTriggerValue(date: CalendarDate, value: string, type: "date" | "datetime-local") {
  const dateText = `${date.year}. ${(date.month + 1).toString().padStart(2, "0")}. ${date.day.toString().padStart(2, "0")}`;
  return type === "date" ? dateText : `${dateText} · ${getTime(value) ?? DEFAULT_TIME}`;
}

function formatMonth(date: CalendarDate, locale: "ko" | "en") {
  if (locale === "ko") return `${date.year}년 ${date.month + 1}월`;
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(date.year, date.month, 1)));
}

function formatDateLabel(date: CalendarDate, locale: "ko" | "en") {
  if (locale === "ko") return `${date.year}년 ${date.month + 1}월 ${date.day}일`;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(new Date(Date.UTC(date.year, date.month, date.day)));
}

function weekdayLabels(locale: "ko" | "en") {
  return locale === "ko" ? ["일", "월", "화", "수", "목", "금", "토"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
}

function getPortalHost(trigger: HTMLButtonElement | null): Element {
  return trigger?.closest("dialog") ?? document.body;
}

function useFloatingCalendar(
  rootRef: RefObject<HTMLDivElement | null>,
  open: boolean,
  type: "date" | "datetime-local",
): CSSProperties {
  const [style, setStyle] = useState<CSSProperties>({});

  useLayoutEffect(() => {
    if (!open) return;
    function position() {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dialog = rootRef.current?.closest("dialog");
      const dialogRect = dialog?.getBoundingClientRect();
      const gutter = 8;
      const minimumWidth = type === "datetime-local" && window.innerWidth >= 480 ? 440 : 320;
      const width = Math.min(window.innerWidth - gutter * 2, Math.max(rect.width, minimumWidth));
      const availableBelow = window.innerHeight - rect.bottom - gutter;
      const availableAbove = rect.top - gutter;
      const desiredHeight = type === "datetime-local" && window.innerWidth >= 480 ? 320 : 450;
      const openAbove = availableBelow < desiredHeight && availableAbove > availableBelow;
      const maxHeight = Math.max(180, openAbove ? availableAbove : availableBelow);
      const top = openAbove ? Math.max(gutter, rect.top - Math.min(desiredHeight, maxHeight) - gutter) : rect.bottom + gutter;
      setStyle({
        // Modal dialogs establish a top-layer containing block in Chromium.
        // Convert viewport coordinates before rendering into the dialog portal.
        left: Math.max(gutter, Math.min(rect.left, window.innerWidth - width - gutter)) - (dialogRect?.left ?? 0) + (dialog?.scrollLeft ?? 0),
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
  }, [open, rootRef, type]);

  return style;
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="date-time-input__icon">
      <rect x="3.25" y="4.5" width="13.5" height="12.25" rx="2" />
      <path d="M6.5 2.75v3.5M13.5 2.75v3.5M3.25 8h13.5" />
    </svg>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="date-time-input__chevron">
      <path d={direction === "left" ? "m11.75 4.75-5.25 5.25 5.25 5.25" : "m8.25 4.75 5.25 5.25-5.25 5.25"} />
    </svg>
  );
}
