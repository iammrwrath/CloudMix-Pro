import React, { useRef, useState, useEffect, useCallback } from 'react';
import { DeckId } from '../types/dj';
import { audioEngine } from '../audio/AudioEngine';

interface JogWheelProps {
  deckId: DeckId;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  playbackRate: number;
  onNudge: (factor: number) => void;
  onReleaseNudge: () => void;
  onScratch: (deltaSec: number) => void;
  accentColor?: string;
  coverArtUrl?: string;
}

export const JogWheel: React.FC<JogWheelProps> = ({
  deckId,
  currentTime,
  duration,
  isPlaying,
  playbackRate,
  onNudge,
  onReleaseNudge,
  onScratch,
  accentColor = '#00e5ff',
  coverArtUrl,
}) => {
  const wheelRef = useRef<HTMLDivElement | null>(null);
  const [rotationDeg, setRotationDeg] = useState(0);
  const [isScratching, setIsScratching] = useState(false);
  const [lastAngle, setLastAngle] = useState(0);

  // Rotate platter while playing (33.3 RPM vinyl emulation)
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const updateRotation = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (isPlaying && !isScratching) {
        // 33.3 RPM = 0.555 revolutions/sec = ~200 deg/sec
        const degPerSec = 200 * playbackRate;
        setRotationDeg((prev) => (prev + degPerSec * dt) % 360);
      }

      animId = requestAnimationFrame(updateRotation);
    };

    animId = requestAnimationFrame(updateRotation);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, playbackRate, isScratching]);

  const getAngle = (e: React.MouseEvent | MouseEvent): number => {
    if (!wheelRef.current) return 0;
    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const rad = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    let deg = rad * (180 / Math.PI);
    if (deg < 0) deg += 360;
    return deg;
  };

  const handleMouseDownPlatter = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsScratching(true);
    const angle = getAngle(e);
    setLastAngle(angle);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isScratching) return;
    const currentAngle = getAngle(e);
    let delta = currentAngle - lastAngle;

    // Handle 0/360 wrap-around
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    setRotationDeg((prev) => (prev + delta) % 360);
    setLastAngle(currentAngle);

    // Map degrees to seconds: 360 deg = ~1.8 seconds of audio
    const deltaSec = (delta / 360) * 1.8;
    onScratch(deltaSec);
  }, [isScratching, lastAngle, onScratch]);

  const handleMouseUp = useCallback(() => {
    if (isScratching) {
      setIsScratching(false);
      onReleaseNudge();
    }
  }, [isScratching, onReleaseNudge]);

  useEffect(() => {
    if (isScratching) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isScratching, handleMouseMove, handleMouseUp]);

  // Format seconds to mm:ss.ms
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  const remainingTime = Math.max(0, duration - currentTime);
  const isNearEnd = isPlaying && remainingTime < 30 && duration > 30;
  const progressRatio = duration > 0 ? currentTime / duration : 0;
  const liveRpm = (33.33 * playbackRate).toFixed(1);

  return (
    <div className="relative flex items-center justify-center p-1 select-none group">
      {/* Ambient Platter Glow */}
      <div
        className="absolute inset-2 rounded-full opacity-20 blur-xl pointer-events-none transition-opacity duration-300 group-hover:opacity-40"
        style={{ backgroundColor: accentColor }}
      />

      {/* Outer Pitch Bend Rim (Machined Aluminum Strobe Bezel) */}
      <div
        ref={wheelRef}
        className="relative w-44 h-44 sm:w-52 sm:h-52 md:w-60 md:h-60 lg:w-68 lg:h-68 xl:w-76 xl:h-76 2xl:w-80 2xl:h-80 max-h-[min(36vh,320px)] aspect-square rounded-full bg-gradient-to-tr from-slate-900 via-slate-700 to-slate-800 p-2 shadow-[0_12px_32px_rgba(0,0,0,0.9)] border-2 border-slate-700/80 cursor-grab active:cursor-grabbing hover:border-cyan-500/40 transition-all active:scale-[0.99] flex items-center justify-center"
      >
        {/* Outer Strobe Dot Ring (Pioneer CDJ / Technics Style) */}
        <div className="absolute inset-0 rounded-full border border-dashed border-slate-400/25 pointer-events-none" />
        <div className="absolute inset-1.5 rounded-full border border-slate-600/30 pointer-events-none" />

        {/* Inner Touch Platter (Grooved Vinyl with Anisotropic Sheen) */}
        <div
          onMouseDown={handleMouseDownPlatter}
          className="relative w-full h-full rounded-full bg-[#07090e] flex items-center justify-center shadow-inner overflow-hidden"
          style={{
            backgroundImage: `radial-gradient(circle, #101624 0%, #080b12 55%, #030407 100%)`,
          }}
        >
          {/* Vinyl Microgroove Rings */}
          <div className="absolute inset-2 rounded-full border border-slate-700/15 pointer-events-none" />
          <div className="absolute inset-4 rounded-full border border-slate-700/25 pointer-events-none" />
          <div className="absolute inset-7 rounded-full border border-slate-700/15 pointer-events-none" />
          <div className="absolute inset-10 rounded-full border border-slate-700/20 pointer-events-none" />

          {/* Anisotropic Light Sheen (Cross flare reflection) */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              background: `conic-gradient(from ${rotationDeg * 0.5}deg, transparent 0deg, rgba(255,255,255,0.15) 45deg, transparent 90deg, rgba(255,255,255,0.15) 135deg, transparent 180deg, rgba(255,255,255,0.15) 225deg, transparent 270deg, rgba(255,255,255,0.15) 315deg, transparent 360deg)`,
            }}
          />

          {/* Rotating Platter Marker / Needle Indicator */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ transform: `rotate(${rotationDeg}deg)` }}
          >
            {/* Illuminated Needle Position Marker with Comet Glow */}
            <div
              className="absolute top-1 w-1.5 h-4 sm:h-5 rounded-full"
              style={{
                backgroundColor: accentColor,
                boxShadow: `0 0 10px ${accentColor}, 0 0 20px ${accentColor}`,
              }}
            />
            {/* Subtle rotating slipmat line */}
            <div className="w-full h-[1px] bg-white/10" />
            <div className="h-full w-[1px] bg-white/5" />
          </div>

      {/* Mechanical Vinyl Tonearm Assembly (djay Pro / Technics turntable emulation) */}
      <div className="absolute -top-2 -right-1 pointer-events-none z-20">
        {/* Tonearm Base & Gimbal Bearing */}
        <div className="relative w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-tr from-slate-900 via-slate-700 to-slate-500 border border-slate-600 shadow-[0_4px_10px_rgba(0,0,0,0.9)] flex items-center justify-center">
          {/* Gimbal Center Pivot Screw */}
          <div className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-500" />
          {/* Counterweight cylinder */}
          <div className="absolute -top-2.5 w-3.5 h-2.5 rounded-sm bg-gradient-to-r from-slate-700 to-slate-900 border border-slate-600 shadow-sm" />

          {/* Pivoting Tonearm Rod & Headshell */}
          <div
            className="absolute top-3 left-2.5 origin-top transition-transform duration-300 ease-out"
            style={{
              transform: `rotate(${isPlaying ? 14 + progressRatio * 24 : 6}deg)`,
            }}
          >
            {/* Curved Aluminum Tonearm Wand */}
            <div className="w-1 h-36 sm:h-44 md:h-52 xl:h-60 bg-gradient-to-r from-slate-300 via-slate-100 to-slate-400 rounded-full shadow-[2px_4px_10px_rgba(0,0,0,0.7)]" />

            {/* Headshell & DJ Stylus Cartridge */}
            <div className="absolute -bottom-5 -left-1.5 w-4 h-5 bg-gradient-to-b from-slate-800 to-slate-950 border border-slate-600 rounded-b flex flex-col items-center justify-end pb-0.5 shadow-md">
              {/* Illuminated Stylus / Needle Indicator */}
              <div
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{
                  backgroundColor: accentColor,
                  boxShadow: `0 0 6px ${accentColor}`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Center Jog LCD Display HUD */}
      <div className="relative z-10 w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 xl:w-36 xl:h-36 rounded-full bg-slate-950/95 border-2 border-slate-800 flex flex-col items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.95)] text-center px-1 overflow-hidden">
        {coverArtUrl && (
          <div className="absolute inset-0 opacity-30 rounded-full overflow-hidden pointer-events-none">
            <img src={coverArtUrl} alt="Cover Art" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
          </div>
        )}
            {/* Circular SVG Track Progress Arc with viewBox for perfect fluid scaling */}
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none -rotate-90 p-1">
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth="2.5"
              />
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke={isNearEnd ? '#ef4444' : accentColor}
                strokeWidth="3"
                strokeDasharray={`${progressRatio * 289} 289`}
                style={{
                  filter: `drop-shadow(0 0 4px ${isNearEnd ? '#ef4444' : accentColor})`,
                  transition: 'stroke-dasharray 0.1s linear',
                }}
              />
            </svg>

            {/* Status Pill */}
            <span
              className={`text-[8px] sm:text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full ${
                isScratching
                  ? 'bg-amber-500 text-black shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                  : isPlaying
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {isScratching ? 'SCRATCH' : isPlaying ? 'PLAY' : 'CUE'}
            </span>

            {/* Time Elapsed Readout */}
            <span className="text-[12px] sm:text-[14px] font-mono font-extrabold text-white tracking-tight mt-0.5 leading-none">
              {formatTime(currentTime)}
            </span>

            {/* Remaining Time (Pulsing warning when track is ending) */}
            <span
              className={`text-[9px] sm:text-[10px] font-mono font-bold leading-tight mt-0.5 ${
                isNearEnd
                  ? 'text-rose-400 animate-pulse drop-shadow-[0_0_4px_rgba(244,63,94,0.8)]'
                  : 'text-slate-400'
              }`}
            >
              -{formatTime(remainingTime)}
            </span>

            {/* Live Virtual RPM */}
            <span className="text-[7.5px] sm:text-[8px] font-mono text-slate-500 tracking-wider mt-0.5">
              {liveRpm} RPM
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
