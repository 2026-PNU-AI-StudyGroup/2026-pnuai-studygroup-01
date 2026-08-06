import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { ReactNode } from "react";

export function ProjectDetailShell({
  cover,
  marker,
  heading,
  headerAside,
  children,
  rail,
  railLabelledBy,
}: {
  cover?: ReactNode;
  marker?: ReactNode;
  heading: ReactNode;
  headerAside?: ReactNode;
  children: ReactNode;
  rail: ReactNode;
  railLabelledBy: string;
}) {
  return (
    <article className="min-w-0">
      {cover ? (
        <div className="overflow-hidden border-y border-[var(--line)]">
          {cover}
        </div>
      ) : null}

      <div className={`relative ${cover ? "pt-9" : ""}`}>
        {cover && marker ? (
          <div
            aria-hidden="true"
            className="absolute -top-7 left-0 grid size-14 place-items-center rounded-full border-4 border-[var(--workspace)] bg-[var(--ink)] text-white"
          >
            {marker}
          </div>
        ) : null}

        <header
          className={`grid gap-8 border-b border-[var(--line)] pb-9 ${cover ? "pt-5" : "pt-1"} ${
            headerAside
              ? "lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end"
              : ""
          }`}
        >
          <UiText>{heading}</UiText>
          {headerAside ? (
            <div className="border-t border-[var(--line)] pt-5 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
              {headerAside}
            </div>
          ) : null}
        </header>

        <div className="grid gap-12 pt-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
          <div className="min-w-0"><UiText>{children}</UiText></div>
          <aside
            aria-labelledby={railLabelledBy}
            className="border-t border-[var(--line)] pt-7 lg:border-l lg:border-t-0 lg:pl-9 lg:pt-0"
          >
            {rail}
          </aside>
        </div>
      </div>
    </article>
  );
}
