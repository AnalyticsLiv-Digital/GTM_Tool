"use client";

/**
 * GTM Tools brand mark.
 *   - rounded-square = the container
 *   - inner ring     = the lens / aperture
 *   - vertical hair  = the scan line
 *   - mint dot       = the live signal
 *
 * Pair with the wordmark via <Brand /> below.
 */
export function LogoMark({
  size = 24,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={`logo-mark ${className}`}
    >
      {/* container */}
      <rect
        x="2.5"
        y="2.5"
        width="19"
        height="19"
        rx="5"
        stroke="currentColor"
        strokeWidth="1.4"
        className="logo-rect"
      />
      {/* aperture */}
      <circle
        cx="12"
        cy="12"
        r="4.6"
        stroke="currentColor"
        strokeWidth="1.4"
        className="logo-ring"
      />
      {/* scan line */}
      <path
        d="M12 5.6 L12 18.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.35"
        className="logo-scan"
      />
      {/* signal dot */}
      <circle
        cx="12"
        cy="12"
        r="1.5"
        fill="var(--accent, #5dffb4)"
        className="logo-dot"
      />
    </svg>
  );
}

export function Brand({
  className = "",
  size = 24,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <span className={`brand-lockup inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <span className="text-[15px] font-semibold tracking-[-0.012em]">GTM Tools</span>
    </span>
  );
}
