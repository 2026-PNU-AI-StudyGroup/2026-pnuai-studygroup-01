import type { ComponentProps, ReactNode } from "react";

import type { ProgramIconKey } from "@/shared/ui/program-icon-options";

type Props = ComponentProps<"svg"> & { icon: ProgramIconKey };

export function ProgramIcon({ icon, ...props }: Props) {
  const paths: Record<ProgramIconKey, ReactNode> = {
    FOLDER: <><path d="M4.5 7h5l1.6 2h8.4v9.5H4.5z" /><path d="M4.5 9h15" /></>,
    GRADUATION_CAP: <><path d="m3 9 9-4.5L21 9l-9 4.5z" /><path d="M6.5 11v4.1c2.8 2.1 8.2 2.1 11 0V11M21 9v5" /></>,
    TROPHY: <><path d="M8 5h8v3.5c0 3-1.6 5.2-4 5.2S8 11.5 8 8.5V5Z" /><path d="M8 7H5.5v1.3c0 2 1.2 3.2 3 3.2M16 7h2.5v1.3c0 2-1.2 3.2-3 3.2M12 14v3m-3 2h6" /></>,
    CODE: <><path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" /></>,
    FLASK: <><path d="M9 3h6M10 3v6l-5.2 8.1A2.5 2.5 0 0 0 6.9 21h10.2a2.5 2.5 0 0 0 2.1-3.9L14 9V3" /><path d="M8.2 15h7.6" /></>,
    PALETTE: <><path d="M12 4a8 8 0 1 0 0 16h1.2a1.8 1.8 0 0 0 0-3.6h-.9a1.5 1.5 0 0 1 0-3h1.8A3.9 3.9 0 0 0 18 9.5 5.5 5.5 0 0 0 12 4Z" /><path d="M7.5 10h.01M9.5 7.5h.01M13 7h.01M16 10h.01" /></>,
    ROCKET: <><path d="M13 5c2.8-2.1 5.5-2 6-2-.1.6.1 3.2-2 6L11 15l-4-4z" /><path d="m11 15-3 3-2-2 3-3M8.5 11.5 5 12l-1 3 4-1M15 8.5h.01" /></>,
    BRIEFCASE: <><path d="M5 8h14v11H5z" /><path d="M9 8V5h6v3M5 13h14M10 13v2h4v-2" /></>,
    GLOBE: <><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4c2.1 2.2 3.2 4.8 3.2 8s-1.1 5.8-3.2 8c-2.1-2.2-3.2-4.8-3.2-8S9.9 6.2 12 4Z" /></>,
    USERS: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-4 2-6 6-6s6 2 6 6M16 5c3 0 4 2 4 4s-1 3-3 3M17 14c3 0 4 2 4 5" /></>,
    BOOK_OPEN: <><path d="M4.5 5.5c2.5-1 5-.7 7.5 1v12c-2.5-1.7-5-2-7.5-1zM19.5 5.5c-2.5-1-5-.7-7.5 1v12c2.5-1.7 5-2 7.5-1z" /></>,
    HANDSHAKE: <><path d="m4 8 3-3 4 3 2-1.5L17 10l3-2 2 2-5 5-2-2-2 2-4-4-2 2-3-3z" /><path d="m10 14 2 2m1-3 2 2" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>{paths[icon]}</svg>;
}
