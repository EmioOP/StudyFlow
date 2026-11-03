import type { SVGProps } from "react";

const PATHS = {
  home: <><path d="M4 11.2 12 4l8 7.2" /><path d="M6 10v9a1 1 0 0 0 1 1h3.5v-5.5h3V20H17a1 1 0 0 0 1-1v-9" /></>,
  calendar: <><rect x="4" y="5.5" width="16" height="14.5" rx="3" /><path d="M4 10.5h16M8.5 3.5v4M15.5 3.5v4" /><path d="m9.5 15 1.8 1.8 3.4-3.6" /></>,
  book: <><path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5v-15Z" /><path d="M5 20.5A2.5 2.5 0 0 0 7.5 23H19v-5" transform="translate(0 -2.5)" /><path d="M9 8h6M9 11.5h4" /></>,
  timer: <><circle cx="12" cy="13.5" r="7.5" /><path d="M12 9.5v4l2.5 1.5M9.5 3h5" /></>,
  library: <><rect x="3.5" y="4" width="4.5" height="16" rx="1.2" /><rect x="9.5" y="4" width="4.5" height="16" rx="1.2" /><path d="m16.2 6.2 3.9-1 2.1 13.2-3.9 1z" transform="translate(-1.2 0)" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  trash: <><path d="M4.5 7h15M9.5 7V4.5h5V7" /><path d="M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12" /></>,
  share: <><circle cx="6.5" cy="12" r="2.2" /><circle cx="17.5" cy="6" r="2.2" /><circle cx="17.5" cy="18" r="2.2" /><path d="m8.5 10.9 7-3.8M8.5 13.1l7 3.8" /></>,
  upload: <><path d="M12 15.5V4M7.5 8.5 12 4l4.5 4.5" /><path d="M4.5 15v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  logout: <><path d="M9.5 4.5h-3a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h3" /><path d="M14 8l4 4-4 4M18 12H9.5" /></>,
  download: <><path d="M12 4v11.5M7.5 11 12 15.5 16.5 11" /><path d="M4.5 18v.5a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5V18" /></>,
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, ...rest }: { name: IconName; size?: number } & Omit<SVGProps<SVGSVGElement>, "name">) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {PATHS[name]}
    </svg>
  );
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true">
      <rect width="512" height="512" rx="120" fill="#6366f1" />
      <path d="M150 270l70 70 150-170" fill="none" stroke="#fff" strokeWidth="46" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
