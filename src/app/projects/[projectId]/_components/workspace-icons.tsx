import type { SVGProps } from "react";

const iconClassName = "shrink-0 fill-none stroke-current stroke-[1.75] [stroke-linecap:round] [stroke-linejoin:round]";

export function ChevronRightIcon({ className = "size-5", ...props }: SVGProps<SVGSVGElement>) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className={`${iconClassName} ${className}`} {...props}><path d="m9 6 6 6-6 6" /></svg>;
}

export function CloseIcon({ className = "size-5", ...props }: SVGProps<SVGSVGElement>) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className={`${iconClassName} ${className}`} {...props}><path d="m6 6 12 12M18 6 6 18" /></svg>;
}

export function DownloadIcon({ className = "size-5", ...props }: SVGProps<SVGSVGElement>) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className={`${iconClassName} ${className}`} {...props}><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14" /></svg>;
}

export function ExternalLinkIcon({ className = "size-5", ...props }: SVGProps<SVGSVGElement>) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className={`${iconClassName} ${className}`} {...props}><path d="M14 5h5v5M19 5l-8 8" /><path d="M18 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1 1-1V7a1 1 0 0 1 1-1h5" /></svg>;
}
