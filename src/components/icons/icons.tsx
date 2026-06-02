export function Icon(props: { children: React.ReactNode }) {
  return (
    <svg className="tileTypeIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {props.children}
    </svg>
  );
}

export function HomeIcon() {
  return (
    <Icon>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 10v10h14V10" />
    </Icon>
  );
}

export function GlobeIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 2.9 4 6.2 4 9s-1.5 6.1-4 9c-2.5-2.9-4-6.2-4-9s1.5-6.1 4-9Z" />
    </Icon>
  );
}

export function BellIcon() {
  return (
    <Icon>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </Icon>
  );
}

export function HashIcon() {
  return (
    <Icon>
      <path d="M4 9h16" />
      <path d="M4 15h16" />
      <path d="M10 3 8 21" />
      <path d="M16 3 14 21" />
    </Icon>
  );
}

export function SearchIcon() {
  return (
    <Icon>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </Icon>
  );
}

export function PenIcon() {
  return (
    <Icon>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </Icon>
  );
}

export function LocalIcon() {
  return (
    <Icon>
      <path d="M12 22a10 10 0 1 0-10-10" />
      <path d="M2 12h10" />
      <path d="M12 2c2.5 2.9 4 6.2 4 10" />
    </Icon>
  );
}

export function SocialIcon() {
  return (
    <Icon>
      <path d="M16 8a4 4 0 1 0-8 0" />
      <path d="M6 20a6 6 0 0 1 12 0" />
      <path d="M18.5 10.5a3 3 0 1 1 2.5 5" />
      <path d="M3 15.5a3 3 0 0 1 2.5-5" />
    </Icon>
  );
}

export function ReplyIcon() {
  return (
    <Icon>
      <path d="M9 17 4 12l5-5" />
      <path d="M4 12h10a6 6 0 0 1 6 6v2" />
    </Icon>
  );
}

export function RepeatIcon() {
  return (
    <Icon>
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </Icon>
  );
}

export function SmileIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <path d="M9 9h.01" />
      <path d="M15 9h.01" />
    </Icon>
  );
}
