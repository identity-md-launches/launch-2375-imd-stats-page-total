export type IconName = 'arrow' | 'download' | 'chevron' | 'calendar' | 'bars' | 'line' | 'info' | 'check' | 'refresh' | 'globe' | 'trend';

export function Icon({ name, size = 18, className = '' }: { name: IconName; size?: number; className?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    arrow: <><path d="M5 19 19 5M5 5h14v14" /></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4" /></>,
    chevron: <path d="m9 5 7 7-7 7" />,
    calendar: <><rect x="4" y="5" width="16" height="16" rx="3" /><path d="M8 3v4m8-4v4M4 11h16" /></>,
    bars: <><path d="M5 20V11m7 9V4m7 16v-13" /></>,
    line: <><path d="M3 17 8 12l4 3 8-10M3 21h18" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10v.1" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z" /></>,
    trend: <><path d="m3 17 6-6 4 4 8-10m-7 0h7v7" /></>,
  };
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function BrandMark() {
  return <svg className="brand-mark" width="29" height="29" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><rect x="2" y="16" width="7" height="13" rx="1.5" /><rect x="12" y="9" width="7" height="20" rx="1.5" /><rect x="22" y="2" width="7" height="27" rx="1.5" /></svg>;
}
