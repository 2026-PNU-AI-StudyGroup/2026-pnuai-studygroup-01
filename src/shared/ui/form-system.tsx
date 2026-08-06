import type { InputHTMLAttributes, ReactNode } from "react";

import { UiText } from "@/shared/i18n/i18n-provider";

type FormFieldProps = {
  id?: string;
  label: string;
  description?: string;
  optional?: boolean;
  className?: string;
  children: ReactNode;
};

export function FormField({ id, label, description, optional, className = "", children }: FormFieldProps) {
  const labelContent = (
    <>
      <span><UiText>{label}</UiText></span>
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
};

export function FormSection({ number, title, description, children, className = "", contentClassName = "", id }: FormSectionProps) {
  return (
    <section id={id} className={`form-section ${className}`}>
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
  className?: string;
};

export function ChoiceCard({ label, description, className = "", type = "radio", ...inputProps }: ChoiceCardProps) {
  return (
    <label className={`choice-card ${className}`}>
      <input type={type} {...inputProps} />
      <span className="choice-card__indicator" aria-hidden="true" />
      <span className="min-w-0">
        <strong className="choice-card__label"><UiText>{label}</UiText></strong>
        {description ? <span className="choice-card__description"><UiText>{description}</UiText></span> : null}
      </span>
    </label>
  );
}
