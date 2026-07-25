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

export function ProfileIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M6.25 3.75h8.5l3 3v13.5H6.25z" />
      <path d="M14.75 3.75v3h3M9 11h6M9 15h4" />
    </svg>
  );
}

export function CompassIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <circle cx="12" cy="12" r="8.25" />
      <path d="m14.75 9.25-1.55 3.95-3.95 1.55 1.55-3.95z" />
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

export function PeopleIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <circle cx="9" cy="9" r="2.5" />
      <circle cx="16.5" cy="10" r="2" />
      <path d="M4.5 18c.45-3 1.93-4.5 4.5-4.5s4.05 1.5 4.5 4.5M14.5 14c2.85-.34 4.52 1 5 4" />
    </svg>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.25 13.75v-3.5l-2-.7-.55-1.3.9-1.9-2.45-2.45-1.9.9-1.3-.55-.7-2h-3.5l-.7 2-1.3.55-1.9-.9L1.4 6.35l.9 1.9-.55 1.3-2 .7v3.5l2 .7.55 1.3-.9 1.9 2.45 2.45 1.9-.9 1.3.55.7 2h3.5l.7-2 1.3-.55 1.9.9 2.45-2.45-.9-1.9.55-1.3z" transform="translate(2)" />
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
