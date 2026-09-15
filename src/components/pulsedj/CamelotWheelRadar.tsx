import React, { useState } from 'react';
import { pulseAiService } from '../../services/PulseAiService';

interface CamelotWheelRadarProps {
  currentKey: string;
  selectedKeyFilter?: string | null;
  onSelectKey: (key: string | null) => void;
  compact?: boolean;
}

// Chords corresponding to Camelot positions
const CHORD_NAMES: Record<string, string> = {
  '1A': 'G#m', '2A': 'D#m', '3A': 'A#m', '4A': 'Fm',
  '5A': 'Cm',  '6A': 'Gm',  '7A': 'Dm',  '8A': 'Am',
  '9A': 'Em',  '10A': 'Bm', '11A': 'F#m', '12A': 'C#m',
  '1B': 'B',   '2B': 'F#',  '3B': 'C#',  '4B': 'G#',
  '5B': 'D#',  '6B': 'A#',  '7B': 'F',   '8B': 'C',
  '9B': 'G',   '10B': 'D',  '11B': 'A',  '12B': 'E',
};

// Standard Camelot Colors
const CAMELOT_HUES: Record<number, string> = {
  1: '#14b8a6', // teal
  2: '#10b981', // emerald
  3: '#22c55e', // green
  4: '#84cc16', // lime
  5: '#eab308', // yellow
  6: '#f59e0b', // amber
  7: '#f97316', // orange
  8: '#ef4444', // red
  9: '#f43f5e', // rose
  10: '#a855f7', // purple
  11: '#6366f1', // indigo
  12: '#06b6d4', // cyan
};

export const CamelotWheelRadar: React.FC<CamelotWheelRadarProps> = ({
  currentKey,
  selectedKeyFilter,
  onSelectKey,
  compact = false,
}) => {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const normKey = pulseAiService.normalizeCamelotKey(currentKey);
  const activeNum = parseInt(normKey.replace(/[^0-9]/g, ''), 10) || 8;
  const activeMode = normKey.slice(-1) as 'A' | 'B';

  const size = compact ? 180 : 230;
  const center = size / 2;
  const rOuter = size * 0.44; // Outer ring (B Major)
  const rInner = size * 0.28; // Inner ring (A Minor)

  // Calculate coordinates on circular wheel for hour 1..12
  const getCoordinates = (hour: number, radius: number) => {
    // 12 o'clock is -90 deg, each hour is 30 deg (360/12)
    const angleRad = ((hour * 30 - 90) * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(angleRad),
      y: center + radius * Math.sin(angleRad),
    };
  };

  // Compatible harmonic keys for connection lines
  const plus1 = activeNum === 12 ? 1 : activeNum + 1;
  const minus1 = activeNum === 1 ? 12 : activeNum - 1;
  const plus2 = ((activeNum + 1) % 12) + 1;
  const relMode = activeMode === 'A' ? 'B' : 'A';

  const compatibleKeys = new Set([
    normKey,
    `${activeNum}${relMode}`,
    `${plus1}${activeMode}`,
    `${minus1}${activeMode}`,
    `${plus2}${activeMode}`,
  ]);

  const activeCoord = getCoordinates(
    activeNum,
    activeMode === 'B' ? rOuter : rInner
  );

  return (
    <div className="flex flex-col items-center select-none">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="overflow-visible">
          {/* Radar background glow */}
          <circle
            cx={center}
            cy={center}
            r={rOuter + 8}
            fill="#0b0e14"
            stroke="#27272a"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <circle
            cx={center}
            cy={center}
            r={rInner + 6}
            fill="#07090e"
            stroke="#1f2937"
            strokeWidth="1"
          />

          {/* Harmonic Connection Lines from Active Key */}
          {[
            { key: `${activeNum}${relMode}`, color: '#a855f7', strokeW: 2 },
            { key: `${plus1}${activeMode}`, color: '#06b6d4', strokeW: 2.5 },
            { key: `${minus1}${activeMode}`, color: '#10b981', strokeW: 2 },
            { key: `${plus2}${activeMode}`, color: '#f59e0b', strokeW: 1.5 },
          ].map((item, i) => {
            const num = parseInt(item.key.replace(/[^0-9]/g, ''), 10);
            const mode = item.key.slice(-1) as 'A' | 'B';
            const targetCoord = getCoordinates(num, mode === 'B' ? rOuter : rInner);
            return (
              <line
                key={i}
                x1={activeCoord.x}
                y1={activeCoord.y}
                x2={targetCoord.x}
                y2={targetCoord.y}
                stroke={item.color}
                strokeWidth={item.strokeW}
                strokeDasharray="3 3"
                opacity="0.85"
                className="animate-pulse"
              />
            );
          })}

          {/* Render 12 B (Major) Keys on Outer Circle */}
          {Array.from({ length: 12 }, (_, idx) => {
            const hour = idx + 1;
            const keyStr = `${hour}B`;
            const coord = getCoordinates(hour, rOuter);
            const isActive = keyStr === normKey;
            const isSelected = keyStr === selectedKeyFilter;
            const isCompatible = compatibleKeys.has(keyStr);
            const color = CAMELOT_HUES[hour] || '#06b6d4';

            return (
              <g
                key={keyStr}
                onClick={() => onSelectKey(selectedKeyFilter === keyStr ? null : keyStr)}
                onMouseEnter={() => setHoveredKey(keyStr)}
                onMouseLeave={() => setHoveredKey(null)}
                className="cursor-pointer transition-all duration-200"
              >
                {/* Active pulse ring */}
                {isActive && (
                  <circle
                    cx={coord.x}
                    cy={coord.y}
                    r={compact ? 12 : 14}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    className="animate-ping opacity-60"
                  />
                )}
                {/* Key background dot */}
                <circle
                  cx={coord.x}
                  cy={coord.y}
                  r={compact ? 9 : 11}
                  fill={isActive ? color : isSelected ? color : '#18181b'}
                  stroke={isCompatible ? color : '#3f3f46'}
                  strokeWidth={isActive || isSelected ? 2.5 : isCompatible ? 1.5 : 0.8}
                  className="transition-all hover:scale-125"
                />
                <text
                  x={coord.x}
                  y={coord.y + (compact ? 3 : 3.5)}
                  textAnchor="middle"
                  fill={isActive || isSelected ? '#000' : isCompatible ? '#fff' : '#a1a1aa'}
                  fontSize={compact ? 8 : 9.5}
                  fontWeight="bold"
                  pointerEvents="none"
                >
                  {keyStr}
                </text>
              </g>
            );
          })}

          {/* Render 12 A (Minor) Keys on Inner Circle */}
          {Array.from({ length: 12 }, (_, idx) => {
            const hour = idx + 1;
            const keyStr = `${hour}A`;
            const coord = getCoordinates(hour, rInner);
            const isActive = keyStr === normKey;
            const isSelected = keyStr === selectedKeyFilter;
            const isCompatible = compatibleKeys.has(keyStr);
            const color = CAMELOT_HUES[hour] || '#06b6d4';

            return (
              <g
                key={keyStr}
                onClick={() => onSelectKey(selectedKeyFilter === keyStr ? null : keyStr)}
                onMouseEnter={() => setHoveredKey(keyStr)}
                onMouseLeave={() => setHoveredKey(null)}
                className="cursor-pointer transition-all duration-200"
              >
                {isActive && (
                  <circle
                    cx={coord.x}
                    cy={coord.y}
                    r={compact ? 10 : 12}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    className="animate-ping opacity-60"
                  />
                )}
                <circle
                  cx={coord.x}
                  cy={coord.y}
                  r={compact ? 7.5 : 9.5}
                  fill={isActive ? color : isSelected ? color : '#121215'}
                  stroke={isCompatible ? color : '#3f3f46'}
                  strokeWidth={isActive || isSelected ? 2.5 : isCompatible ? 1.5 : 0.8}
                  className="transition-all hover:scale-125"
                />
                <text
                  x={coord.x}
                  y={coord.y + (compact ? 2.5 : 3)}
                  textAnchor="middle"
                  fill={isActive || isSelected ? '#000' : isCompatible ? '#fff' : '#a1a1aa'}
                  fontSize={compact ? 7 : 8.5}
                  fontWeight="bold"
                  pointerEvents="none"
                >
                  {keyStr}
                </text>
              </g>
            );
          })}

          {/* Center Hub */}
          <circle cx={center} cy={center} r={size * 0.14} fill="#090b10" stroke="#27272a" strokeWidth="1.5" />
          <text
            x={center}
            y={center - 3}
            textAnchor="middle"
            fill={CAMELOT_HUES[activeNum] || '#06b6d4'}
            fontSize={compact ? 11 : 13}
            fontWeight="900"
          >
            {normKey}
          </text>
          <text
            x={center}
            y={center + 10}
            textAnchor="middle"
            fill="#71717a"
            fontSize={compact ? 7 : 8.5}
            fontWeight="bold"
          >
            {CHORD_NAMES[normKey] || 'KEY'}
          </text>
        </svg>

        {/* Selected or Hovered Key Tooltip Card */}
        {(hoveredKey || selectedKeyFilter) && (
          <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 bg-zinc-900/95 border border-zinc-700 px-2 py-0.5 rounded-md text-[10px] text-center shadow-lg pointer-events-none whitespace-nowrap z-20">
            <span className="font-bold text-cyan-300">
              {hoveredKey || selectedKeyFilter} ({CHORD_NAMES[hoveredKey || selectedKeyFilter || '']})
            </span>
            {selectedKeyFilter && (
              <span className="text-zinc-400 ml-1">
                • {selectedKeyFilter === normKey ? 'Current' : 'Filtered'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 1-Click Clear Filter button if a key is filtered */}
      {selectedKeyFilter && (
        <button
          onClick={() => onSelectKey(null)}
          className="mt-4 text-[10px] text-cyan-400 hover:text-cyan-300 underline font-semibold cursor-pointer"
        >
          Clear Key Filter ({selectedKeyFilter})
        </button>
      )}
    </div>
  );
};
