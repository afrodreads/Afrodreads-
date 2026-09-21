type IconProps = { className?: string };

export function WhatsAppIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm0 1.8a8.2 8.2 0 0 1 6.9 12.6l-.2.4.7 2.5-2.6-.7-.4.2A8.2 8.2 0 1 1 12 3.8Zm-3.4 4a1 1 0 0 0-.7.3c-.3.3-1 1-1 2.3s1 2.7 1.1 2.9c.1.1 2 3.1 4.8 4.3 2.4 1 2.8.8 3.4.7.5-.1 1.6-.6 1.8-1.3.2-.6.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3l-2-1c-.3-.1-.5-.2-.7.2l-.5.6c-.1.2-.3.2-.5.1-.3-.1-1.1-.4-2.1-1.4-.8-.7-1.3-1.6-1.5-1.9-.1-.3 0-.4.1-.6l.4-.5c.1-.2.2-.3.2-.5.1-.2 0-.4 0-.5l-.9-2.1c-.2-.5-.4-.4-.6-.4h-.5Z" />
    </svg>
  );
}

export function InstagramIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TikTokIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M14.5 2h2.6c.2 1.6 1.2 3.2 3.4 3.6v2.6c-1.3 0-2.5-.4-3.4-1v6.6a5.9 5.9 0 1 1-5.9-5.9c.3 0 .6 0 .9.1v2.7a3.2 3.2 0 1 0 2.4 3.1V2Z" />
    </svg>
  );
}

export function YouTubeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10 8.5v7l6-3.5-6-3.5Z" />
    </svg>
  );
}
