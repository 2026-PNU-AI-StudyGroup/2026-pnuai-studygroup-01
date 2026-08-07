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

export function SearchIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <circle cx="10.75" cy="10.75" r="6.25" />
      <path d="m15.5 15.5 4 4" />
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

export function ExternalLinkIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M13 5h6v6M19 5l-9 9" />
      <path d="M17 14.5v4H5.5v-11h4" />
    </svg>
  );
}
