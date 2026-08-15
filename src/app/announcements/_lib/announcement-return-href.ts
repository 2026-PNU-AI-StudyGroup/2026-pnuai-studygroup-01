export function announcementReturnHref(value: unknown, fallback = "/announcements"): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\r\n]/.test(value)
  ) {
    return fallback;
  }
  return value;
}
