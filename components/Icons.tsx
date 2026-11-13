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
  more: <><circle cx="5.5" cy="12" r="1.3" fill="currentColor" /><circle cx="12" cy="12" r="1.3" fill="currentColor" /><circle cx="18.5" cy="12" r="1.3" fill="currentColor" /></>,
  chevron: <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />,
  sparkle: <path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9L12 3.5ZM18.5 16l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />,
  grid: <><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></>,
  trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 6H5.5A1.5 1.5 0 0 0 4 7.5C4 9.5 5.5 11 8 11M16 6h2.5A1.5 1.5 0 0 1 20 7.5c0 2-1.500 3.500-4 3.500M12 13v4M8.500 20h7M10 17h4" /></>,
  flame: <path d="M12 3c.5 3-1.500 4.500-3 6.500C7.500 11.500 7 13 7 14.500a5 5 0 0 0 10 0c0-1.800-.8-3.200-1.800-4.300-.4 1-1 1.600-1.700 1.800.6-3-.2-6-1.500-9Z" />,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 3.500v2M12 18.500v2M3.500 12h2M18.500 12h2M6 6l1.400 1.400M16.600 16.600 18 18M6 18l1.400-1.400M16.600 7.400 18 6" /></>,
  lock: <><rect x="5.500" y="10.500" width="13" height="9.500" rx="2.500" /><path d="M8.500 10.500V8a3.500 3.500 0 0 1 7 0v2.500" /></>,
  star: <path d="m12 3.800 2.600 5.300 5.800.8-4.200 4.100 1 5.800L12 17l-5.200 2.800 1-5.800L3.600 9.900l5.800-.8L12 3.800Z" />,
  bolt: <path d="M13 3 5.500 13.500H11L10 21l7.500-10.500H12L13 3Z" />,
  left: <path d="m14.500 6-6 6 6 6" />,
  right: <path d="m9.500 6 6 6-6 6" />,
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
