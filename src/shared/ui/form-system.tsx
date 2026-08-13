import { forwardRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";

import { UiText } from "@/shared/i18n/i18n-provider";
export { DateTimeInput } from "@/shared/ui/date-time-input";

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
      {required ? <span className="form-field__required"><UiText>{"필수"}</UiText></span> : null}
      {optional ? <span className="form-field__optional"><UiText>{"선택"}</UiText></span> : null}
    </>
  );

  return (
    <div className={`form-field ${className}`}>
      <div className="form-field__heading">
        {id ? <label className="form-field__label" htmlFor={id}>{labelContent}</label> : <span className="form-field__label">{labelContent}</span>}
        {description ? <p className="form-field__description"><UiText>{description}</UiText></p> : null}
      </div>
      {children}
      {error ? <p role="alert" className="form-field__error"><UiText>{error}</UiText></p> : null}
    </div>
  );
}

type FormSectionProps = {
  number?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  id?: string;
  plain?: boolean;
  hidden?: boolean;
};

export function FormSection({ number, title, description, children, className = "", contentClassName = "", id, plain = false, hidden }: FormSectionProps) {
  return (
    <section id={id} hidden={hidden} className={`form-section ${plain ? "form-section--plain" : ""} ${className}`}>
      <header className="form-section__header">
        {number ? <span className="form-section__number">{number}</span> : null}
        <div>
          <h2 className="form-section__title"><UiText>{title}</UiText></h2>
          {description ? <p className="form-section__description"><UiText>{description}</UiText></p> : null}
        </div>
      </header>
      <div className={`form-section__content ${contentClassName}`}>{children}</div>
    </section>
  );
}

type ChoiceCardProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "children"> & {
  label: string;
  description?: string;
  visual?: ReactNode;
  className?: string;
};

export function ChoiceCard({ label, description, visual, className = "", type = "radio", ...inputProps }: ChoiceCardProps) {
  return (
    <label className={`choice-card ${className}`}>
      <input type={type} {...inputProps} />
      {visual ? <span className="choice-card__visual" aria-hidden="true">{visual}</span> : <span className="choice-card__indicator" aria-hidden="true" />}
      <span className="min-w-0">
        <strong className="choice-card__label"><UiText>{label}</UiText></strong>
        {description ? <span className="choice-card__description"><UiText>{description}</UiText></span> : null}
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
    <label className={`form-toggle ${className}`}>
      <input className="form-toggle__input" type="checkbox" {...inputProps} />
      <span className="form-toggle__track" aria-hidden="true"><span className="form-toggle__thumb" /></span>
      <span className="min-w-0">
        <strong className="form-toggle__label"><UiText>{label}</UiText></strong>
        {description ? <span className="form-toggle__description"><UiText>{description}</UiText></span> : null}
      </span>
    </label>
  );
}
