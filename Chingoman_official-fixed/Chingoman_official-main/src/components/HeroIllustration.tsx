// A brand-original line-art illustration of a car-carrier ship sailing from
// China to Ghana, drawn to match the app's Lucide-icon stroke style. Replaces
// the earlier stock photo of a real Mercedes-Benz, which risked implying a
// brand endorsement Chin-go-man doesn't have (and was barely visible at low
// opacity anyway).
export function HeroIllustration({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1600 700"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Faint map dot-grid */}
      <g fill="currentColor" opacity="0.35">
        {Array.from({ length: 17 }).flatMap((_, row) =>
          Array.from({ length: 34 }).map((_, col) => (
            (row + col) % 2 === 0 ? (
              <circle key={`${row}-${col}`} cx={col * 48 + 10} cy={row * 44 + 10} r="1.6" />
            ) : null
          ))
        )}
      </g>

      {/* Sailing route, China to Ghana */}
      <path
        d="M 110 560 Q 780 40 1440 380"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeDasharray="2 14"
        strokeLinecap="round"
        opacity="0.55"
      />
      <circle cx="110" cy="560" r="7" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.6" />
      <circle cx="110" cy="560" r="2.5" fill="currentColor" opacity="0.6" />

      {/* Waterline */}
      <path
        d="M 0 545 Q 100 525 200 545 T 400 545 T 600 545 T 800 545 T 1000 545 T 1200 545 T 1400 545 T 1600 545"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.3"
      />
      <path
        d="M 0 575 Q 110 558 220 575 T 440 575 T 660 575 T 880 575 T 1100 575 T 1320 575 T 1540 575"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.22"
      />

      {/* Ship hull */}
      <path
        d="M 760 430
           L 760 468
           Q 762 486 782 492
           L 1440 492
           Q 1466 492 1478 470
           L 1500 428
           Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        opacity="0.75"
      />

      {/* Bridge / superstructure tower at stern */}
      <path
        d="M 790 250 L 790 190 Q 790 178 802 178 L 850 178 Q 862 178 862 190 L 862 250"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        opacity="0.75"
      />
      <line x1="826" y1="178" x2="826" y2="155" stroke="currentColor" strokeWidth="2.5" opacity="0.75" />

      {/* Deck superstructure outline */}
      <path
        d="M 760 250 L 760 430 L 1500 430 L 1500 270 Q 1500 250 1478 250 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        opacity="0.75"
      />

      {/* Deck level lines */}
      <line x1="762" y1="295" x2="1498" y2="295" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      <line x1="762" y1="340" x2="1498" y2="340" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      <line x1="762" y1="385" x2="1498" y2="385" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />

      {/* Cars stowed on each deck */}
      <g>
        <g transform="translate(837.3,266.6)" opacity="0.9">
      <path d="M2 8.5 L4 2.5 Q6 0 8.5 0 L10.2 0 Q13.6 0 15.3 2.5 L17.0 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="0" y1="8.5" x2="18.7" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="4.2" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="14.4" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
    </g>
      <g transform="translate(910.6,266.6)" opacity="0.9">
      <path d="M2 8.5 L4 2.5 Q6 0 8.5 0 L10.2 0 Q13.6 0 15.3 2.5 L17.0 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="0" y1="8.5" x2="18.7" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="4.2" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="14.4" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
    </g>
      <g transform="translate(984.0,266.6)" opacity="0.9">
      <path d="M2 8.5 L4 2.5 Q6 0 8.5 0 L10.2 0 Q13.6 0 15.3 2.5 L17.0 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="0" y1="8.5" x2="18.7" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="4.2" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="14.4" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
    </g>
      <g transform="translate(1057.3,266.6)" opacity="0.9">
      <path d="M2 8.5 L4 2.5 Q6 0 8.5 0 L10.2 0 Q13.6 0 15.3 2.5 L17.0 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="0" y1="8.5" x2="18.7" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="4.2" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="14.4" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
    </g>
      <g transform="translate(1130.7,266.6)" opacity="0.9">
      <path d="M2 8.5 L4 2.5 Q6 0 8.5 0 L10.2 0 Q13.6 0 15.3 2.5 L17.0 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="0" y1="8.5" x2="18.7" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="4.2" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="14.4" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
    </g>
      <g transform="translate(1204.0,266.6)" opacity="0.9">
      <path d="M2 8.5 L4 2.5 Q6 0 8.5 0 L10.2 0 Q13.6 0 15.3 2.5 L17.0 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="0" y1="8.5" x2="18.7" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="4.2" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="14.4" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
    </g>
      <g transform="translate(1277.3,266.6)" opacity="0.9">
      <path d="M2 8.5 L4 2.5 Q6 0 8.5 0 L10.2 0 Q13.6 0 15.3 2.5 L17.0 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="0" y1="8.5" x2="18.7" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="4.2" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="14.4" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
    </g>
      <g transform="translate(1350.7,266.6)" opacity="0.9">
      <path d="M2 8.5 L4 2.5 Q6 0 8.5 0 L10.2 0 Q13.6 0 15.3 2.5 L17.0 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="0" y1="8.5" x2="18.7" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="4.2" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="14.4" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
    </g>
      <g transform="translate(1424.0,266.6)" opacity="0.9">
      <path d="M2 8.5 L4 2.5 Q6 0 8.5 0 L10.2 0 Q13.6 0 15.3 2.5 L17.0 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="0" y1="8.5" x2="18.7" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="4.2" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="14.4" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
    </g>
      <g transform="translate(837.3,311.6)" opacity="0.9">
      <path d="M2 8.5 L4 2.5 Q6 0 8.5 0 L10.2 0 Q13.6 0 15.3 2.5 L17.0 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="0" y1="8.5" x2="18.7" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="4.2" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="14.4" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
    </g>
      <g transform="translate(910.6,311.6)" opacity="0.9">
      <path d="M2 8.5 L4 2.5 Q6 0 8.5 0 L10.2 0 Q13.6 0 15.3 2.5 L17.0 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="0" y1="8.5" x2="18.7" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="4.2" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="14.4" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
    </g>
      <g transform="translate(984.0,311.6)" opacity="0.9">
      <path d="M2 8.5 L4 2.5 Q6 0 8.5 0 L10.2 0 Q13.6 0 15.3 2.5 L17.0 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="0" y1="8.5" x2="18.7" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="4.2" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="14.4" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
    </g>
      <g transform="translate(1057.3,311.6)" opacity="0.9">
      <path d="M2 8.5 L4 2.5 Q6 0 8.5 0 L10.2 0 Q13.6 0 15.3 2.5 L17.0 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="0" y1="8.5" x2="18.7" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="4.2" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="14.4" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
    </g>
      <g transform="translate(1130.7,311.6)" opacity="0.9">
      <path d="M2 8.5 L4 2.5 Q6 0 8.5 0 L10.2 0 Q13.6 0 15.3 2.5 L17.0 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="0" y1="8.5" x2="18.7" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="4.2" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="14.4" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
    </g>
      <g transform="translate(1204.0,311.6)" opacity="0.9">
      <path d="M2 8.5 L4 2.5 Q6 0 8.5 0 L10.2 0 Q13.6 0 15.3 2.5 L17.0 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="0" y1="8.5" x2="18.7" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="4.2" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="14.4" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
    </g>
      <g transform="translate(1277.3,311.6)" opacity="0.9">
      <path d="M2 8.5 L4 2.5 Q6 0 8.5 0 L10.2 0 Q13.6 0 15.3 2.5 L17.0 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="0" y1="8.5" x2="18.7" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="4.2" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="14.4" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
    </g>
      <g transform="translate(1350.7,311.6)" opacity="0.9">
      <path d="M2 8.5 L4 2.5 Q6 0 8.5 0 L10.2 0 Q13.6 0 15.3 2.5 L17.0 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="0" y1="8.5" x2="18.7" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="4.2" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="14.4" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
    </g>
      <g transform="translate(1424.0,311.6)" opacity="0.9">
      <path d="M2 8.5 L4 2.5 Q6 0 8.5 0 L10.2 0 Q13.6 0 15.3 2.5 L17.0 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="0" y1="8.5" x2="18.7" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="4.2" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="14.4" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
    </g>
      <g transform="translate(837.3,356.6)" opacity="0.9">
      <path d="M2 8.5 L4 2.5 Q6 0 8.5 0 L10.2 0 Q13.6 0 15.3 2.5 L17.0 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="0" y1="8.5" x2="18.7" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="4.2" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="14.4" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
    </g>
      <g transform="translate(910.6,356.6)" opacity="0.9">
      <path d="M2 8.5 L4 2.5 Q6 0 8.5 0 L10.2 0 Q13.6 0 15.3 2.5 L17.0 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="0" y1="8.5" x2="18.7" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="4.2" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="14.4" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
    </g>
      <g transform="translate(984.0,356.6)" opacity="0.9">
      <path d="M2 8.5 L4 2.5 Q6 0 8.5 0 L10.2 0 Q13.6 0 15.3 2.5 L17.0 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="0" y1="8.5" x2="18.7" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="4.2" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="14.4" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
    </g>
      <g transform="translate(1057.3,356.6)" opacity="0.9">
      <path d="M2 8.5 L4 2.5 Q6 0 8.5 0 L10.2 0 Q13.6 0 15.3 2.5 L17.0 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="0" y1="8.5" x2="18.7" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="4.2" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="14.4" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
    </g>
      <g transform="translate(1130.7,356.6)" opacity="0.9">
      <path d="M2 8.5 L4 2.5 Q6 0 8.5 0 L10.2 0 Q13.6 0 15.3 2.5 L17.0 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="0" y1="8.5" x2="18.7" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="4.2" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="14.4" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
    </g>
      <g transform="translate(1204.0,356.6)" opacity="0.9">
      <path d="M2 8.5 L4 2.5 Q6 0 8.5 0 L10.2 0 Q13.6 0 15.3 2.5 L17.0 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="0" y1="8.5" x2="18.7" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="4.2" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="14.4" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
    </g>
      <g transform="translate(1277.3,356.6)" opacity="0.9">
      <path d="M2 8.5 L4 2.5 Q6 0 8.5 0 L10.2 0 Q13.6 0 15.3 2.5 L17.0 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="0" y1="8.5" x2="18.7" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="4.2" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="14.4" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
    </g>
      <g transform="translate(1350.7,356.6)" opacity="0.9">
      <path d="M2 8.5 L4 2.5 Q6 0 8.5 0 L10.2 0 Q13.6 0 15.3 2.5 L17.0 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="0" y1="8.5" x2="18.7" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="4.2" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="14.4" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
    </g>
      <g transform="translate(1424.0,356.6)" opacity="0.9">
      <path d="M2 8.5 L4 2.5 Q6 0 8.5 0 L10.2 0 Q13.6 0 15.3 2.5 L17.0 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="0" y1="8.5" x2="18.7" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="4.2" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="14.4" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
    </g>
      <g transform="translate(837.3,401.6)" opacity="0.9">
      <path d="M2 8.5 L4 2.5 Q6 0 8.5 0 L10.2 0 Q13.6 0 15.3 2.5 L17.0 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="0" y1="8.5" x2="18.7" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="4.2" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="14.4" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
    </g>
      <g transform="translate(910.6,401.6)" opacity="0.9">
      <path d="M2 8.5 L4 2.5 Q6 0 8.5 0 L10.2 0 Q13.6 0 15.3 2.5 L17.0 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="0" y1="8.5" x2="18.7" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="4.2" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="14.4" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
    </g>
      <g transform="translate(984.0,401.6)" opacity="0.9">
      <path d="M2 8.5 L4 2.5 Q6 0 8.5 0 L10.2 0 Q13.6 0 15.3 2.5 L17.0 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="0" y1="8.5" x2="18.7" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="4.2" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="14.4" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
    </g>
      <g transform="translate(1057.3,401.6)" opacity="0.9">
      <path d="M2 8.5 L4 2.5 Q6 0 8.5 0 L10.2 0 Q13.6 0 15.3 2.5 L17.0 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="0" y1="8.5" x2="18.7" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="4.2" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="14.4" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
    </g>
      <g transform="translate(1130.7,401.6)" opacity="0.9">
      <path d="M2 8.5 L4 2.5 Q6 0 8.5 0 L10.2 0 Q13.6 0 15.3 2.5 L17.0 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="0" y1="8.5" x2="18.7" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="4.2" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="14.4" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
    </g>
      <g transform="translate(1204.0,401.6)" opacity="0.9">
      <path d="M2 8.5 L4 2.5 Q6 0 8.5 0 L10.2 0 Q13.6 0 15.3 2.5 L17.0 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="0" y1="8.5" x2="18.7" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="4.2" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="14.4" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
    </g>
      <g transform="translate(1277.3,401.6)" opacity="0.9">
      <path d="M2 8.5 L4 2.5 Q6 0 8.5 0 L10.2 0 Q13.6 0 15.3 2.5 L17.0 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="0" y1="8.5" x2="18.7" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="4.2" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="14.4" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
    </g>
      <g transform="translate(1350.7,401.6)" opacity="0.9">
      <path d="M2 8.5 L4 2.5 Q6 0 8.5 0 L10.2 0 Q13.6 0 15.3 2.5 L17.0 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="0" y1="8.5" x2="18.7" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="4.2" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="14.4" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
    </g>
      <g transform="translate(1424.0,401.6)" opacity="0.9">
      <path d="M2 8.5 L4 2.5 Q6 0 8.5 0 L10.2 0 Q13.6 0 15.3 2.5 L17.0 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="0" y1="8.5" x2="18.7" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="4.2" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="14.4" cy="8.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.4"/>
    </g>
      </g>
    </svg>
  );
}
