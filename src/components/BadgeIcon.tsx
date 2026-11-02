import { BadgeEmblem } from '../types/game';

interface BadgeIconProps {
  emblem: BadgeEmblem;
  size?: number;
  locked?: boolean;
}

export function BadgeIcon({ emblem, size = 56, locked = false }: BadgeIconProps) {
  const palette: Record<BadgeEmblem, { bg: string; rim: string; accent: string }> = {
    ihram: { bg: '#065F46', rim: '#34D399', accent: '#ECFDF5' },
    kaaba: { bg: '#1E293B', rim: '#FBBF24', accent: '#FEF08A' },
    sai: { bg: '#155E75', rim: '#22D3EE', accent: '#ECFEFF' },
    dam: { bg: '#4C1D95', rim: '#C084FC', accent: '#F5F3FF' },
    arafah: { bg: '#9A3412', rim: '#FB923C', accent: '#FFF7ED' },
    jumrah: { bg: '#991B1B', rim: '#F87171', accent: '#FEF2F2' },
    crown: { bg: '#854D0E', rim: '#FDE047', accent: '#FEFCE8' },
  };

  const c = locked
    ? { bg: '#1E293B', rim: '#475569', accent: '#64748B' }
    : palette[emblem];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      aria-hidden="true"
    >
      {/* Roblox Hexagonal Achievement Shield */}
      <polygon
        points="32,4 57,18 57,46 32,60 7,46 7,18"
        fill={c.bg}
        stroke={c.rim}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <polygon
        points="32,9 52,20.5 52,43.5 32,55 12,43.5 12,20.5"
        fill="none"
        stroke={c.rim}
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />

      {emblem === 'ihram' && (
        <g>
          <rect x="22" y="21" width="20" height="24" rx="3" fill={c.accent} />
          <path d="M22 28L42 21V29L22 36V28Z" fill={c.rim} />
          <circle cx="32" cy="17" r="4" fill={c.rim} />
        </g>
      )}

      {emblem === 'kaaba' && (
        <g>
          <rect x="20" y="19" width="24" height="26" rx="2" fill="#0F172A" stroke={c.rim} strokeWidth="2" />
          <rect x="20" y="25" width="24" height="4.5" fill={c.rim} />
          <rect x="34" y="33" width="5" height="9" rx="1" fill={c.rim} />
        </g>
      )}

      {emblem === 'sai' && (
        <g>
          <path d="M14 43L23 28L31 43H14Z" fill={c.rim} />
          <path d="M33 43L42 25L50 43H33Z" fill={c.accent} />
          <path d="M22 21H42" stroke={c.accent} strokeWidth="3" strokeLinecap="round" strokeDasharray="3 3" />
        </g>
      )}

      {emblem === 'dam' && (
        <g>
          <rect x="21" y="26" width="18" height="13" rx="6" fill={c.accent} />
          <circle cx="40" cy="28" r="5" fill={c.rim} />
          <line x1="25" y1="39" x2="25" y2="45" stroke={c.accent} strokeWidth="3" strokeLinecap="round" />
          <line x1="35" y1="39" x2="35" y2="45" stroke={c.accent} strokeWidth="3" strokeLinecap="round" />
        </g>
      )}

      {emblem === 'arafah' && (
        <g>
          <circle cx="32" cy="21" r="6" fill={c.rim} />
          <path d="M16 45L32 28L48 45H16Z" fill={c.accent} />
          <rect x="30" y="21" width="4" height="11" rx="1" fill="#FFFFFF" />
        </g>
      )}

      {emblem === 'jumrah' && (
        <g>
          <rect x="28" y="18" width="8" height="26" rx="2" fill={c.accent} />
          <ellipse cx="32" cy="44" rx="14" ry="4" fill={c.rim} />
          <circle cx="20" cy="24" r="3" fill={c.rim} />
          <circle cx="44" cy="27" r="2.5" fill={c.rim} />
        </g>
      )}

      {emblem === 'crown' && (
        <g>
          <path
            d="M17 42L20 24L28 32L32 20L36 32L44 24L47 42H17Z"
            fill={c.rim}
            stroke={c.accent}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="32" cy="36" r="2.5" fill="#10B981" />
        </g>
      )}
    </svg>
  );
}
