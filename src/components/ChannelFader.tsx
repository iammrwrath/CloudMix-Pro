import React, { useRef, useState, useCallback } from 'react';

interface ChannelFaderProps {
  volume: number;
  onChange: (val: number) => void;
  accentColor?: string;
  channelName: string;
}

export const ChannelFader: React.FC<ChannelFaderProps> = ({
  volume,
  onChange,
  accentColor = '#00e5ff',
  channelName,
}) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  const updateFromPointer = useCallback(
    (clientY: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const height = rect.height;
      if (height <= 0) return;

      const offsetY = rect.bottom - clientY;
      const newVol = clamp(offsetY / height, 0, 1);
      onChange(Math.round(newVol * 1000) / 1000);
    },
    [onChange]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    updateFromPointer(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    updateFromPointer(e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {}
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(clamp(volume + 0.05, 0, 1));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(clamp(volume - 0.05, 0, 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(1);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(0);
    }
  };

  const percent = clamp(volume, 0, 1) * 100;

  return (
    <div
      ref={trackRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="slider"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${channelName} Volume`}
      title={`${channelName} Volume: ${Math.round(percent)}%`}
      className="relative flex items-center justify-center h-full w-8 py-0.5 cursor-pointer select-none outline-none group touch-none"
    >
      <div className="absolute top-1 bottom-1 w-2 rounded-full bg-slate-950 border border-slate-800/90 shadow-inner flex items-center justify-center">
        <div className="w-[1px] h-full bg-slate-800" />
      </div>

      <div
        className="absolute bottom-1 w-1.5 rounded-full transition-all duration-75 pointer-events-none"
        style={{
          height: `calc(${percent}% * (100% - 8px) / 100)`,
          background: `linear-gradient(to top, ${accentColor}80, ${accentColor}33)`,
          boxShadow: isDragging ? `0 0 8px ${accentColor}66` : 'none',
        }}
      />

      <div
        className={`absolute left-1/2 -translate-x-1/2 w-6 h-3.5 rounded-sm border shadow-lg transition-transform duration-75 pointer-events-none flex flex-col items-center justify-center ${
          isDragging
            ? 'scale-105 border-white bg-gradient-to-b from-slate-200 via-slate-400 to-slate-600 shadow-black/80'
            : 'border-slate-400/80 bg-gradient-to-b from-slate-300 via-slate-400 to-slate-500 shadow-black/60 group-hover:border-slate-300'
        }`}
        style={{
          bottom: `calc(4px + (100% - 8px) * ${volume} - 7px)`,
        }}
      >
        <div className="w-4 h-[1px] bg-slate-950 rounded-full shadow-sm" />
        <div className="flex justify-between w-4 mt-0.5 opacity-40">
          <div className="w-1 h-[1px] bg-slate-900" />
          <div className="w-1 h-[1px] bg-slate-900" />
        </div>
      </div>
    </div>
  );
};
