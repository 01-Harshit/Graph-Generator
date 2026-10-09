  function HeroGraph() {
    const bars = [
      { x: 80, height: 60 },
      { x: 160, height: 90 },
      { x: 240, height: 120 },
      { x: 320, height: 100 },
      { x: 400, height: 140 },
      { x: 480, height: 170 },
    ]

    const linePath = bars
      .map((bar, i) => `${i === 0 ? 'M' : 'L'} ${bar.x} ${250 - bar.height}`)
      .join(' ')

    return (
      <div className="relative w-full max-w-5xl mx-auto">
        {/* Background glow — subtle, both modes */}
        <div className="absolute inset-0 rounded-full 
                        bg-purple-500/5 dark:bg-purple-600/10 
                        blur-3xl scale-110"></div>

        <svg
          viewBox="0 0 560 280"
          className="hero-graph relative z-10"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Grid lines */}
          <g opacity="0.08" className="dark:opacity-[0.12]">
            <line x1="40" y1="80" x2="520" y2="80" stroke="currentColor" strokeWidth="1" />
            <line x1="40" y1="130" x2="520" y2="130" stroke="currentColor" strokeWidth="1" />
            <line x1="40" y1="180" x2="520" y2="180" stroke="currentColor" strokeWidth="1" />
            <line x1="40" y1="230" x2="520" y2="230" stroke="currentColor" strokeWidth="1" />
          </g>

          {/* X-axis */}
          <line
            x1="40" y1="250" x2="520" y2="250"
            stroke="currentColor"
            strokeWidth="1.5"
            opacity="0.2"
          />

          {/* Bars */}
          {bars.map((bar, i) => (
            <rect
              key={i}
              x={bar.x - 20}
              y={250 - bar.height}
              width="40"
              height={bar.height}
              rx="6"
              className={`hero-bar hero-bar-${i + 1} ${
                i % 2 === 0 ? 'fill-[var(--graph-bar-1)]' : 'fill-[var(--graph-bar-2)]'
              }`}
            />
          ))}

          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke="var(--graph-line)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="hero-line"
          />

          {/* Data points */}
          {bars.map((bar, i) => (
            <circle
              key={`dot-${i}`}
              cx={bar.x}
              cy={250 - bar.height}
              r="5"
              fill="var(--graph-line)"
              className={`hero-dot hero-dot-${i + 1}`}
            />
          ))}

          {/* Floating particles */}
          <g>
            <circle cx="120" cy="200" r="1.5" className="particle particle-1 fill-[var(--accent-secondary)]" />
            <circle cx="200" cy="180" r="2" className="particle particle-2 fill-[var(--accent-primary)]" />
            <circle cx="320" cy="160" r="1.5" className="particle particle-3 fill-[var(--accent-secondary)]" />
            <circle cx="440" cy="200" r="2" className="particle particle-4 fill-[var(--accent-primary)]" />
            <circle cx="280" cy="220" r="1.5" className="particle particle-5 fill-[var(--accent-secondary)]" />
            <circle cx="380" cy="190" r="1.5" className="particle particle-6 fill-[var(--accent-primary)]" />
          </g>
        </svg>
      </div>
    )
  }

  export default HeroGraph