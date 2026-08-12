import { UiText } from "@/modules/translation/ui/i18n-provider";

export type MemberContactInfo = { phone: string; kakao: string; github: string; instagram: string };

const contactIcons = {
  phone: <path d="M6.5 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3c0 .8-.7 1.5-1.5 1.5A14.5 14.5 0 0 1 5 6.5C5 5.7 5.7 5 6.5 5z" />,
  kakao: <path d="M12 5c-3.9 0-7 2.4-7 5.4 0 1.9 1.3 3.6 3.2 4.6l-.8 3 3.3-2.2c.4 0 .8.1 1.3.1 3.9 0 7-2.4 7-5.5S15.9 5 12 5z" />,
  github: <path d="M9 19c-4 1.2-4-2-5.5-2.5m11 5v-3.2c0-.9-.3-1.5-.7-1.8 2.4-.3 4.9-1.2 4.9-5.3 0-1.2-.4-2.1-1.1-2.9.1-.3.5-1.4-.1-2.9 0 0-.9-.3-3 1.1a10.4 10.4 0 0 0-5.4 0C6.9 3.2 6 3.5 6 3.5c-.6 1.5-.2 2.6-.1 2.9-.7.8-1.1 1.7-1.1 2.9 0 4.1 2.5 5 4.9 5.3-.3.3-.6.8-.7 1.5L9 19z" />,
  instagram: <><rect x="4" y="4" width="16" height="16" rx="4.5" /><circle cx="12" cy="12" r="3.5" /><circle cx="16.6" cy="7.4" r="1" fill="currentColor" stroke="none" /></>,
} as const;

const contactLabels = { phone: "전화번호", kakao: "카카오톡", github: "GitHub", instagram: "Instagram" } as const;

export function MemberContacts({ phone, kakao, github, instagram }: MemberContactInfo) {
  const entries = ([['phone', phone], ['kakao', kakao], ['github', github], ['instagram', instagram]] as const).filter(([, value]) => value);
  return (
    <div className="mt-6 border-t border-[var(--line)] pt-6">
      <h3 className="text-xs font-bold text-[var(--muted)]"><UiText>{"연락처"}</UiText></h3>
      {entries.length ? (
        <ul className="mt-3 grid gap-2.5">
          {entries.map(([kind, value]) => (
            <li key={kind} className="flex items-center gap-3 text-sm">
              <svg aria-label={contactLabels[kind]} viewBox="0 0 24 24" className="size-5 shrink-0 fill-none stroke-current stroke-[1.6] text-[var(--muted)]" strokeLinecap="round" strokeLinejoin="round">
                {contactIcons[kind]}
              </svg>
              {/^https?:\/\//.test(value) ? (
                <a href={value} target="_blank" rel="noopener noreferrer" className="min-w-0 break-all font-semibold text-[var(--primary)] hover:underline">{value}</a>
              ) : (
                <span className="min-w-0 break-all font-semibold">{value}</span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm font-semibold"><UiText>{"등록된 연락처가 없습니다"}</UiText></p>
      )}
    </div>
  );
}
