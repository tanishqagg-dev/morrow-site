export function AestrumMark({ className = "" }: { className?: string }) {
  return (
    <svg className={`aestrum-site-mark ${className}`.trim()} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M8.2 29.5C4.8 20.2 8.1 9.2 17.4 5.1c8.2-3.6 18.1.7 21.9 9.6 4 9.4 1.2 20.7-7.7 26-8.8 5.3-19.6 1.4-23.4-11.2Z" />
      <rect className="aestrum-site-eye" x="16" y="15" width="5.2" height="13.4" rx="2.6" transform="rotate(-7 18.6 21.7)" />
      <rect className="aestrum-site-eye" x="27.6" y="17.2" width="4.8" height="9.2" rx="2.4" transform="rotate(5 30 21.8)" />
      <circle className="aestrum-site-signal" cx="36.2" cy="35.2" r="3.2" />
    </svg>
  );
}
