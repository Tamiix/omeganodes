import React from 'react';

interface WizScoreGaugeProps {
  score: number; // 0-100 raw score from API
  size?: number;
}

const WizScoreGauge: React.FC<WizScoreGaugeProps> = ({ score, size = 120 }) => {
  const normalizedScore = Math.min(Math.max(score / 10, 0), 10); // 0-10
  const percentage = (normalizedScore / 10) * 100;

  // Arc params
  const cx = size / 2;
  const cy = size / 2 + 8;
  const r = size / 2 - 12;
  const startAngle = 210; // degrees
  const endAngle = 330;
  const totalArc = endAngle - startAngle; // 120 degrees — we want ~240 degree arc
  
  // Actually use a 240 degree arc (from 150 to 390 i.e. 30 past top)
  const arcStart = 150;
  const arcEnd = 390;
  const arcSpan = arcEnd - arcStart; // 240 degrees

  const polarToCartesian = (angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  const describeArc = (start: number, end: number) => {
    const s = polarToCartesian(start);
    const e = polarToCartesian(end);
    const largeArc = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  };

  const filledEnd = arcStart + (percentage / 100) * arcSpan;

  // Color: green for high, yellow for mid, red for low
  const getColor = (pct: number) => {
    if (pct >= 70) return 'hsl(142, 71%, 45%)';
    if (pct >= 40) return 'hsl(48, 96%, 53%)';
    return 'hsl(0, 84%, 60%)';
  };

  const strokeWidth = 8;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size * 0.75} viewBox={`0 0 ${size} ${size * 0.75 + 8}`}>
        {/* Background arc */}
        <path
          d={describeArc(arcStart, arcEnd)}
          fill="none"
          stroke="hsl(var(--muted) / 0.3)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Colored arc */}
        {percentage > 0 && (
          <path
            d={describeArc(arcStart, filledEnd)}
            fill="none"
            stroke={getColor(percentage)}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 6px ${getColor(percentage)})`,
            }}
          />
        )}
        {/* Red tick at start */}
        {(() => {
          const p = polarToCartesian(arcStart);
          return <circle cx={p.x} cy={p.y} r={2} fill="hsl(0, 84%, 60%)" />;
        })()}
        {/* Green tick at end */}
        {(() => {
          const p = polarToCartesian(arcEnd);
          return <circle cx={p.x} cy={p.y} r={2} fill="hsl(142, 71%, 45%)" />;
        })()}
        {/* Score text */}
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          className="fill-foreground"
          style={{ fontSize: size * 0.28, fontWeight: 700, fontFamily: 'monospace' }}
        >
          {normalizedScore.toFixed(1)}
        </text>
        {/* Label */}
        <text
          x={cx}
          y={cy + size * 0.16}
          textAnchor="middle"
          className="fill-muted-foreground"
          style={{ fontSize: size * 0.11, fontWeight: 500 }}
        >
          Wiz Score
        </text>
      </svg>
    </div>
  );
};

export default WizScoreGauge;
