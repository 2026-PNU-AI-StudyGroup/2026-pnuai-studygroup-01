export const PROGRAM_ICON_KEYS = [
  "FOLDER", "GRADUATION_CAP", "TROPHY", "CODE", "FLASK", "PALETTE",
  "ROCKET", "BRIEFCASE", "GLOBE", "USERS", "BOOK_OPEN", "HANDSHAKE",
] as const;

export type ProgramIconKey = (typeof PROGRAM_ICON_KEYS)[number];

export const PROGRAM_ICON_LABEL: Record<ProgramIconKey, string> = {
  FOLDER: "일반", GRADUATION_CAP: "캡스톤", TROPHY: "경진대회", CODE: "소프트웨어",
  FLASK: "연구", PALETTE: "디자인", ROCKET: "창업", BRIEFCASE: "산학",
  GLOBE: "국제", USERS: "협업", BOOK_OPEN: "교육", HANDSHAKE: "봉사",
};

export function isProgramIconKey(value: unknown): value is ProgramIconKey {
  return typeof value === "string" && PROGRAM_ICON_KEYS.includes(value as ProgramIconKey);
}
