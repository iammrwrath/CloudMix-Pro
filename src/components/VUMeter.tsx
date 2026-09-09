import React from 'react';

interface VUMeterProps {
  level: number; // 0.0 to 1.0
  height?: number;
  segments?: number;
}

export const VUMeter: React.FC<VUMeterProps> = ({ level, height = 140, segments = 16 }) => {
  const activeCount = Math.round(Math.min(1.0, Math.max(0, level)) * segments);

  return (
    <div
      style={{ height }}
      className="w-3 bg-slate-950 rounded p-0.5 flex flex-col-reverse justify-between border border-slate-800 shadow-inner"
    >
      {Array.from({ length: segments }).map((_, i) => {
        const isActive = i < activeCount;
        // Color mapping: bottom 65% green, next 25% amber/orange, top 10% red
        const isRed = i >= segments - 2;
        const isOrange = i >= segments - 5 && i < segments - 2;

        let activeColor = '#10b981'; // Emerald
        if (isOrange) activeColor = '#f59e0b'; // Amber
        if (isRed) activeColor = '#ef4444'; // Red

        return (
          <div
            key={i}
            className="w-full h-1 rounded-[1px] transition-opacity duration-75"
            style={{
              backgroundColor: isActive ? activeColor : '#1e293b',
              boxShadow: isActive ? `0 0 4px ${activeColor}` : 'none',
              opacity: isActive ? 1 : 0.35,
            }}
          />
        );
      })}
    </div>
  );
};
