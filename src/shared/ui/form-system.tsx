import { forwardRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";

import { UiText } from "@/shared/i18n/i18n-provider";
import styles from "@/shared/ui/form-system.module.css";
export { DateTimeInput } from "@/shared/ui/date-time-input";

function classNames(...classNames: Array<string | false | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

type FormFieldProps = {
  id?: string;
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  optional?: boolean;
  className?: string;
  children: ReactNode;
};

export function FormField({ id, label, description, error, required, optional, className = "", children }: FormFieldProps) {
  const labelContent = (
    <>
      <span><UiText>{label}</UiText></span>
      {required ? <span className={styles.required}><UiText>{"필수"}</UiText></span> : null}
      {optional ? <span className={styles.optional}><UiText>{"선택"}</UiText></span> : null}
    </>
  );

  return (
    <div className={classNames(styles.field, className)}>
      <div className={styles.heading}>
        {id ? <label className={styles.label} htmlFor={id}>{labelContent}</label> : <span className={styles.label}>{labelContent}</span>}
        {description ? <p className={styles.description}><UiText>{description}</UiText></p> : null}
      </div>
      {children}
      {error ? <p role="alert" className={styles.error}><UiText>{error}</UiText></p> : null}
    </div>
  );
}

type FormSectionProps = {
  number?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  id?: string;
  appearance?: "card" | "plain" | "embedded";
  density?: "default" | "compact";
  sectionMarker?: string;
  hidden?: boolean;
};

export function FormSection({ number, title, description, actions, children, className = "", contentClassName = "", id, appearance = "card", density = "default", sectionMarker, hidden }: FormSectionProps) {
  return (
    <section id={id} hidden={hidden} data-form-section={sectionMarker} data-form-section-appearance={appearance} data-form-section-density={density} className={classNames(styles.section, appearance === "plain" && styles.sectionPlain, appearance === "embedded" && styles.sectionEmbedded, density === "compact" && styles.sectionCompact, className)}>
      <header className={styles.header}>
        {number ? <span className={styles.number}>{number}</span> : null}
        <div className={styles.headerContent}>
          <h2 className={styles.title}><UiText>{title}</UiText></h2>
          {description ? <p className={styles.sectionDescription}><UiText>{description}</UiText></p> : null}
        </div>
        {actions ? <div className={styles.headerActions}>{actions}</div> : null}
      </header>
      <div className={classNames(styles.content, contentClassName)}>{children}</div>
    </section>
  );
}

export function FormLegend({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <legend className={classNames(styles.label, className)}>{children}</legend>;
}

export function FormStaticValue({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={classNames(styles.staticValue, className)}>{children}</span>;
}

type ChoiceCardProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "children"> & {
  label: string;
  description?: string;
  visual?: ReactNode;
  className?: string;
  variant?: "default" | "icon" | "inline";
  density?: "default" | "compact";
};

export function ChoiceCard({ label, description, visual, className = "", variant = "default", density = "default", type = "radio", ...inputProps }: ChoiceCardProps) {
  return (
    <label className={classNames(styles.choice, variant === "icon" && styles.choiceIcon, variant === "inline" && styles.choiceInline, density === "compact" && styles.choiceCompact, className)}>
      <input type={type} {...inputProps} />
      {visual ? <span className={styles.visual} aria-hidden="true">{visual}</span> : <span className={styles.indicator} aria-hidden="true" />}
      <span className="min-w-0">
        <strong className={styles.choiceLabel}><UiText>{label}</UiText></strong>
        {description ? <span className={styles.choiceDescription}><UiText>{description}</UiText></span> : null}
      </span>
    </label>
  );
}

function withFormControl(className = "") {
  return ["form-control", className].filter(Boolean).join(" ");
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={withFormControl(className)} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={withFormControl(className)} />;
}

type FileInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export const FileInput = forwardRef<HTMLInputElement, FileInputProps>(function FileInput({ className, ...props }, ref) {
  return <input ref={ref} {...props} type="file" className={withFormControl(`form-control--file ${className ?? ""}`)} />;
});

type ToggleProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className"> & {
  label: string;
  description?: string;
  className?: string;
};

export function Toggle({ label, description, className = "", ...inputProps }: ToggleProps) {
  return (
    <label className={classNames(styles.toggle, className)}>
      <input className={styles.toggleInput} type="checkbox" {...inputProps} />
      <span className={styles.toggleTrack} aria-hidden="true"><span className={styles.toggleThumb} /></span>
      <span className="min-w-0">
        <strong className={styles.toggleLabel}><UiText>{label}</UiText></strong>
        {description ? <span className={styles.toggleDescription}><UiText>{description}</UiText></span> : null}
      </span>
    </label>
  );
}
