import { UiText } from "@/shared/i18n/i18n-provider";

export function SuccessToast({ message }: { message: string }) {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="toast fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md border border-[var(--primary)] bg-white px-5 py-4 text-sm font-bold text-[var(--ink)] sm:bottom-6"
    >
      <UiText>{message}</UiText>
    </div>
  );
}
