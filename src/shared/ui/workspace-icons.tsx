import type { ComponentProps } from "react";

type IconProps = ComponentProps<"svg">;

const iconProps = {
  fill: "none",
  viewBox: "0 0 24 24",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

export function AccountIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.75 19.25c.65-3.38 2.73-5.25 6.25-5.25s5.6 1.87 6.25 5.25" />
    </svg>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M7 10.25a5 5 0 0 1 10 0c0 5 2 5 2 6.5H5c0-1.5 2-1.5 2-6.5Z" />
      <path d="M10 20h4" />
    </svg>
  );
}

export function PinIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M9 4h6l-.75 5L17 12v1H7v-1l2.75-3L9 4Z" />
      <path d="M12 13v7" />
    </svg>
  );
}

export function ProfileIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M6.25 3.75h8.5l3 3v13.5H6.25z" />
      <path d="M14.75 3.75v3h3M9 11h6M9 15h4" />
    </svg>
  );
}

export function ProjectIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M4.5 6.75h5l1.5 2h8.5v9.5H4.5z" />
      <path d="M4.5 8.75h15" />
    </svg>
  );
}

export function ChevronIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <path d="m5 12.5 4.25 4.25L19 7" />
    </svg>
  );
}

export function AddIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function ArrowUpIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <path d="m6 10 6-6 6 6M12 4v16" />
    </svg>
  );
}

export function ArrowDownIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <path d="m6 14 6 6 6-6M12 20V4" />
    </svg>
  );
}

export function UndoIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M9 7 5 11l4 4" />
      <path d="M5.5 11H14a5 5 0 0 1 5 5v1" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function EditIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <path d="m5 19 3.75-.75L18 9l-3-3-9.25 9.25L5 19Z" />
      <path d="m13.5 7.5 3 3M5 20h14" />
    </svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M4.5 7.5h15M9.5 4.5h5M7 7.5l.75 12h8.5l.75-12M10 11v5M14 11v5" />
    </svg>
  );
}

export function ArchiveIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M4.5 6.5h15v13h-15zM3.5 4h17v4h-17zM9 12h6" />
    </svg>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M19 8a7.5 7.5 0 0 0-12.75-2L4 8" />
      <path d="M4 4v4h4M5 16a7.5 7.5 0 0 0 12.75 2L20 16" />
      <path d="M20 20v-4h-4" />
    </svg>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <circle cx="10.75" cy="10.75" r="6.25" />
      <path d="m15.5 15.5 4 4" />
    </svg>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function DocumentIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M6.25 3.75h8.5l3 3v13.5H6.25z" />
      <path d="M14.75 3.75v3h3M9 11h6M9 15h4" />
    </svg>
  );
}

export function VideoIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <rect x="4" y="6.25" width="12.5" height="11.5" rx="1.75" />
      <path d="m16.5 10 3.5-2v8l-3.5-2" />
      <path d="m9.5 10.25 3 1.75-3 1.75z" />
    </svg>
  );
}

export function BarChartIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M5 19V11M12 19V5M19 19v-6" />
      <path d="M3.5 19.5h17" />
    </svg>
  );
}

export function BallotBoxIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M8 4.25h8v6H8z" />
      <path d="m10 7 1.35 1.35L14 5.75" />
      <path d="M6 10.25h12l1.25 3v6.5H4.75v-6.5l1.25-3Z" />
      <path d="M8.5 14h7" />
    </svg>
  );
}

export function ExternalLinkIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M13 5h6v6M19 5l-9 9" />
      <path d="M17 14.5v4H5.5v-11h4" />
    </svg>
  );
}
