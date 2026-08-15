export type ProgramSectionNavIconName = "basic" | "operation" | "schedule" | "voting" | "rubric" | "reports";

export function ProgramSectionNavIcon({ section }: { section: ProgramSectionNavIconName }) {
  if (section === "basic") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m8 7 4-3 4 3v4l-4 3-4-3Z" /><path d="m8 11-3 2v4l3 2 4-3m4-5 3 2v4l-3 2-4-3" /></svg>;
  }
  if (section === "schedule") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="4" y="5.5" width="16" height="14" rx="2" /><path d="M8 3.5v4M16 3.5v4M4 9.5h16" /></svg>;
  }
  if (section === "operation") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M9.5 4.5h5l.6 2.1 2 .8 1.9-1.1 2.5 4.3-1.6 1.5.3 2.1 1.7 1.4-2.5 4.3-2-.9-1.7 1.3-.4 2.2h-5l-.5-2.2-1.7-1.2-2 .8-2.5-4.3 1.7-1.4.2-2.1-1.6-1.5 2.5-4.3 2 1.1 2-.8Z" /><circle cx="12" cy="13" r="2.5" /></svg>;
  }
  if (section === "rubric") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M7 4h10v16H7zM9.5 8h5M9.5 12h5M9.5 16h3" /><path d="m4 8 1 1 2-2" /></svg>;
  }
  if (section === "reports") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 3.5h8l4 4V20H6zM14 3.5V8h4M9 12h6M9 15.5h6" /></svg>;
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M8 4h8v6H8zM6 10h12l1.5 3.5V20h-15v-6.5Z" /><path d="M9 14h6M10 7l1.2 1.2L14 5.5" /></svg>;
}
