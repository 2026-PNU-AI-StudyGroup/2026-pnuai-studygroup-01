export type ApplicationKind = "INDIVIDUAL" | "TEAM";

export function ApplicationKindField({ kind, onChange }: { kind: ApplicationKind; onChange: (kind: ApplicationKind) => void }) {
  return (
    <fieldset className="grid gap-3 sm:col-span-2">
      <legend className="font-semibold">지원 방식</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <ApplicationKindOption kind="INDIVIDUAL" selected={kind === "INDIVIDUAL"} onChange={onChange} title="개인 지원" description="혼자 지원서를 제출합니다." />
        <ApplicationKindOption kind="TEAM" selected={kind === "TEAM"} onChange={onChange} title="팀 지원" description="팀원 전원 수락 후 접수됩니다." />
      </div>
    </fieldset>
  );
}

function ApplicationKindOption({ kind, selected, onChange, title, description }: {
  kind: ApplicationKind;
  selected: boolean;
  onChange: (kind: ApplicationKind) => void;
  title: string;
  description: string;
}) {
  return (
    <label className="flex min-h-16 cursor-pointer items-center gap-3 rounded-[var(--radius-control)] border border-[var(--line)] p-4 has-[:checked]:border-[var(--primary)] has-[:checked]:bg-[var(--primary-subtle)]">
      <input type="radio" name="kind" value={kind} checked={selected} onChange={() => onChange(kind)} />
      <span><strong className="block">{title}</strong><span className="muted text-xs">{description}</span></span>
    </label>
  );
}
