import React, { useRef, useState, useCallback, useEffect } from 'react';

interface RotaryKnobProps {
  label: string;
  value: number; // typically -1.0 to +1.0 or 0.0 to 1.0
  min?: number;
  max?: number;
  defaultValue?: number;
  step?: number;
  centerDetent?: boolean;
  onChange: (val: number) => void;
  accentColor?: string;
  size?: number;
}

export const RotaryKnob = React.memo<RotaryKnobProps>(({
  label,
  value,
  min = -1.0,
  max = 1.0,
  defaultValue = 0.0,
  step = 0.01,
  centerDetent = true,
  onChange,
  accentColor = '#00f0ff',
  size = 36,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const startValRef = useRef(0);

  // Normalize 0.0 to 1.0
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
  // Angle: -135° (7:30 o'clock) to +135° (4:30 o'clock), 0° is 12 o'clock
  const angleDeg = -135 + normalized * 270;

  const isBipolar = min < 0 && max > 0;
  const centerNormalized = (defaultValue - min) / (max - min);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startYRef.current = e.clientY;
    startValRef.current = value;
  };

  const handleDoubleClick = () => {
    onChange(defaultValue);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const deltaY = startYRef.current - e.clientY;
    const range = max - min;
    const deltaVal = (deltaY / 140) * range;
    let newVal = startValRef.current + deltaVal;

    // Center detent snap
    if (centerDetent && Math.abs(newVal - defaultValue) < range * 0.035) {
      newVal = defaultValue;
    }

    newVal = Math.max(min, Math.min(newVal, max));
    onChange(Math.round(newVal / step) * step);
  }, [isDragging, min, max, defaultValue, centerDetent, step, onChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // SVG Arc calculation
  const svgSize = size + 8;
  const center = svgSize / 2;
  const radius = size / 2 + 2;
  const arcLength = 270; // degrees
  const circumference = 2 * Math.PI * radius;
  const totalArcDash = (arcLength / 360) * circumference;

  // Compute active dashoffset
  let activeDashArray = '0 1000';
  let activeDashOffset = 0;

  if (isBipolar) {
    const fromCenter = normalized - centerNormalized;
    const absFraction = Math.abs(fromCenter) / (1 - centerNormalized || 1);
    const strokeLen = absFraction * (totalArcDash / 2);
    activeDashArray = `${strokeLen} ${circumference}`;
    // Arc starts from 12 o'clock (-90° in standard SVG coordinates)
    if (fromCenter >= 0) {
      activeDashOffset = 0;
    } else {
      activeDashOffset = strokeLen;
    }
  } else {
    const strokeLen = normalized * totalArcDash;
    activeDashArray = `${strokeLen} ${circumference}`;
    activeDashOffset = 0;
  }

  // Display value formatting
  const displayVal = isBipolar
    ? value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1)
    : Math.round(normalized * 100) + '%';

  return (
    <div className="flex flex-col items-center select-none group relative">
      <div
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        title={`${label}: ${displayVal} (Double-click to reset)`}
        style={{ width: svgSize, height: svgSize }}
        className="relative flex items-center justify-center cursor-ns-resize"
      >
        {/* SVG Circular LED Arc Gauge */}
        <svg
          width={svgSize}
          height={svgSize}
          className="absolute inset-0 pointer-events-none transform rotate-[135deg]"
          style={{ transformOrigin: 'center' }}
        >
          {/* Background Track Arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={`${totalArcDash} ${circumference}`}
          />
          {/* Active Colored Arc */}
          {!isBipolar ? (
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={accentColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={activeDashArray}
              strokeDashoffset={activeDashOffset}
              style={{
                filter: `drop-shadow(0 0 3px ${accentColor})`,
                transition: isDragging ? 'none' : 'stroke-dasharray 0.05s ease-out',
              }}
            />
          ) : (
            /* For Bipolar, draw relative to 12 o'clock */
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={accentColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={activeDashArray}
              strokeDashoffset={activeDashOffset}
              transform={`rotate(135 ${center} ${center})`}
              style={{
                filter: `drop-shadow(0 0 3px ${accentColor})`,
                transition: isDragging ? 'none' : 'stroke-dasharray 0.05s ease-out',
              }}
            />
          )}
        </svg>

        {/* Tactile Gunmetal Knob Cap */}
        <div
          style={{ width: size, height: size }}
          className="relative rounded-full bg-gradient-to-b from-slate-700 via-slate-800 to-slate-950 border border-slate-600/60 shadow-[0_3px_8px_rgba(0,0,0,0.8)] flex items-center justify-center group-hover:border-slate-400/80 transition-colors"
        >
          {/* Rotating Notch Indicator */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              transform: `rotate(${angleDeg}deg)`,
              transition: isDragging ? 'none' : 'transform 0.05s ease-out',
            }}
          >
            {/* Illuminated Pointer Line */}
            <div
              className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-2 rounded-full"
              style={{
                backgroundColor: accentColor,
                boxShadow: `0 0 6px ${accentColor}`,
              }}
            />
          </div>

          {/* Inner Machined Spindle */}
          <div className="w-[55%] h-[55%] rounded-full bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-800 border border-slate-700/50 shadow-inner" />
        </div>
      </div>

      {/* Label */}
      <span className="text-[8.5px] font-mono font-extrabold text-slate-300 group-hover:text-cyan-300 uppercase mt-0.5 tracking-wider transition-colors">
        {label}
      </span>
    </div>
  );
});

