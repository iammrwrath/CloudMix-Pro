import React, { useRef, useEffect, useState, useCallback } from 'react';
import { DeckId, HotCue, TrackMetadata, WaveformData } from '../types/dj';
import { audioEngine } from '../audio/AudioEngine';

interface WaveformDisplayProps {
  deckId: DeckId;
  track: TrackMetadata | null;
  waveformData: WaveformData | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  hotCues: HotCue[];
  activeLoop: { start: number; end: number } | null;
  onSeek: (seconds: number) => void;
  accentColor?: string;
}

export const WaveformDisplay: React.FC<WaveformDisplayProps> = ({
  deckId,
  track,
  waveformData,
  currentTime,
  duration,
  isPlaying,
  hotCues,
  activeLoop,
  onSeek,
  accentColor = '#00e5ff',
}) => {
  const scrollingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overviewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [zoomSeconds, setZoomSeconds] = useState(5.5);

  // 1. Draw Overview Waveform (Full track summary with cues & loop)
  useEffect(() => {
    const canvas = overviewCanvasRef.current;
    if (!canvas || !waveformData || duration <= 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.clientWidth || 800;
    const displayHeight = canvas.clientHeight || 24;

    if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    const width = displayWidth;
    const height = displayHeight;
    ctx.clearRect(0, 0, width, height);

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#0f1420');
    bgGrad.addColorStop(1, '#080b12');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Draw full overview peaks
    const peaks = waveformData.overviewPeaks;
    const centerY = height / 2;
    const totalPoints = peaks.length;

    // Center divider
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Tri-band overview draw
    for (let x = 0; x < width; x++) {
      const pointIndex = Math.floor((x / width) * totalPoints);
      const lowVal = waveformData.lowPeaks[pointIndex] || 0;
      const midVal = waveformData.midPeaks[pointIndex] || 0;
      const highVal = waveformData.highPeaks[pointIndex] || 0;

      const totalH = Math.max(2, (lowVal + midVal + highVal) * 0.45 * (height / 2));

      // Low / Bass frequency (Red / Coral)
      ctx.fillStyle = '#ff3366';
      ctx.fillRect(x, centerY - totalH * 0.5, 1, totalH);

      // Mid frequency (Cyan / Green)
      ctx.fillStyle = '#00e5ff';
      ctx.fillRect(x, centerY - totalH * 0.35, 1, totalH * 0.7);

      // High frequency (White / Bright)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, centerY - totalH * 0.15, 1, totalH * 0.3);
    }

    // Draw active loop region if any
    if (activeLoop && duration > 0) {
      const loopStartX = (activeLoop.start / duration) * width;
      const loopEndX = (activeLoop.end / duration) * width;
      ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
      ctx.fillRect(loopStartX, 0, Math.max(2, loopEndX - loopStartX), height);
      ctx.strokeStyle = '#10b981';
      ctx.strokeRect(loopStartX, 0, Math.max(2, loopEndX - loopStartX), height);
    }

    // Draw Hot Cue markers
    hotCues.forEach((cue) => {
      if (!cue.active) return;
      const cueX = (cue.position / duration) * width;
      ctx.fillStyle = cue.color || '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(cueX - 4, 0);
      ctx.lineTo(cueX + 4, 0);
      ctx.lineTo(cueX, 7);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = cue.color || '#f59e0b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cueX, 0);
      ctx.lineTo(cueX, height);
      ctx.stroke();
    });

    // Draw Playhead progress bar
    const progressX = (currentTime / duration) * width;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(0, 0, progressX, height);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(progressX, 0);
    ctx.lineTo(progressX, height);
    ctx.stroke();

    ctx.restore();
  }, [waveformData, currentTime, duration, hotCues, activeLoop]);

  // 2. Draw Dynamic Scrolling Tri-Band Waveform (60-120 FPS)
  useEffect(() => {
    let animId: number;

    const renderScrolling = () => {
      const canvas = scrollingCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const displayWidth = canvas.clientWidth || 800;
      const displayHeight = canvas.clientHeight || 64;

      if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      const width = displayWidth;
      const height = displayHeight;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Background
      // 1. Crisp dark background with subtle center guide
      ctx.fillStyle = '#06080e';
      ctx.fillRect(0, 0, width, height);

      // Subtle horizontal center line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();

      if (!waveformData || duration <= 0) {
        ctx.restore();
        return;
      }

      // Scrolling parameters
      const pixelsPerSecond = width / zoomSeconds;
      const totalPoints = waveformData.lowPeaks.length;
      const pointsPerSecond = totalPoints / duration;

      // Draw Beatgrid lines (BPM based) with neon downbeats
      const bpm = track?.bpm || 120;
      if (bpm > 0) {
        const beatIntervalSec = 60.0 / bpm;
        const visibleStartSec = currentTime - zoomSeconds / 2;
        const visibleEndSec = currentTime + zoomSeconds / 2;

        const firstBeatNum = Math.floor(visibleStartSec / beatIntervalSec);
        const lastBeatNum = Math.ceil(visibleEndSec / beatIntervalSec);

        for (let b = firstBeatNum; b <= lastBeatNum; b++) {
          const beatTime = b * beatIntervalSec;
          const beatX = centerX + (beatTime - currentTime) * pixelsPerSecond;
          if (beatX < 0 || beatX > width) continue;

          const isDownbeat = b % 4 === 0;
          ctx.strokeStyle = isDownbeat ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.12)';
          ctx.lineWidth = isDownbeat ? 1.5 : 1;

          ctx.beginPath();
          ctx.moveTo(beatX, 0);
          ctx.lineTo(beatX, height);
          ctx.stroke();

          if (isDownbeat) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.font = 'bold 8.5px JetBrains Mono, ui-monospace, monospace';
            ctx.fillText(`${(b % 16) + 1}`, beatX + 3, 10);
          }
        }
      }

      // Draw Tri-band waveform slices with vertical gradient & mirrored reflection
      for (let x = 0; x < width; x += 2) {
        const timeAtX = currentTime + (x - centerX) / pixelsPerSecond;
        if (timeAtX < 0 || timeAtX > duration) continue;

        const pIdx = Math.floor(timeAtX * pointsPerSecond);
        if (pIdx < 0 || pIdx >= totalPoints) continue;

        const lowVal = waveformData.lowPeaks[pIdx] || 0;
        const midVal = waveformData.midPeaks[pIdx] || 0;
        const highVal = waveformData.highPeaks[pIdx] || 0;

        const maxH = (height / 2) * 0.94;

        // 1. Low Freq (Bass) - Hot Coral / Pink Glow
        const hLow = lowVal * maxH;
        ctx.fillStyle = '#ff2e88';
        ctx.fillRect(x, centerY - hLow, 1.6, hLow * 1.6);

        // 2. Mid Freq (Vocals/Mids) - Electric Cyan Glow
        const hMid = midVal * maxH * 0.72;
        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(x, centerY - hMid, 1.6, hMid * 1.6);

        // 3. High Freq (Treble/Hi-hats) - Brilliant Crisp White
        const hHigh = highVal * maxH * 0.42;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, centerY - hHigh, 1.6, hHigh * 1.6);

        // 4. Subtle mirrored reflection below baseline
        ctx.fillStyle = 'rgba(0, 240, 255, 0.18)';
        ctx.fillRect(x, centerY + 2, 1.6, hMid * 0.4);
      }

      // Draw active loop shading with candy-stripe glow
      if (activeLoop) {
        const loopStartX = centerX + (activeLoop.start - currentTime) * pixelsPerSecond;
        const loopEndX = centerX + (activeLoop.end - currentTime) * pixelsPerSecond;
        ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
        ctx.fillRect(loopStartX, 0, loopEndX - loopStartX, height);
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.strokeRect(loopStartX, 0, loopEndX - loopStartX, height);
      }

      // Draw Hot Cues on scrolling waveform with illuminated flag pins
      hotCues.forEach((cue) => {
        if (!cue.active) return;
        const cueX = centerX + (cue.position - currentTime) * pixelsPerSecond;
        if (cueX >= -20 && cueX <= width + 20) {
          ctx.fillStyle = cue.color || '#f59e0b';
          ctx.beginPath();
          ctx.moveTo(cueX - 6, 0);
          ctx.lineTo(cueX + 6, 0);
          ctx.lineTo(cueX, 10);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = cue.color || '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cueX, 0);
          ctx.lineTo(cueX, height);
          ctx.stroke();

          // Cue badge with 3D drop shadow
          ctx.fillStyle = '#0a0e17';
          ctx.fillRect(cueX - 8, height - 16, 16, 14);
          ctx.strokeStyle = cue.color || '#f59e0b';
          ctx.lineWidth = 1;
          ctx.strokeRect(cueX - 8, height - 16, 16, 14);
          ctx.fillStyle = cue.color || '#f59e0b';
          ctx.font = 'bold 9.5px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`${cue.id + 1}`, cueX, height - 6);
        }
      });

      // Center Laser Playhead with ambient bloom effect
      ctx.shadowColor = accentColor;
      ctx.shadowBlur = 10;
      ctx.fillStyle = `${accentColor}44`;
      ctx.fillRect(centerX - 3, 0, 6, height);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX, 0);
      ctx.lineTo(centerX, height);
      ctx.stroke();

      // Triangular laser indicators at top and bottom
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.moveTo(centerX - 5, 0);
      ctx.lineTo(centerX + 5, 0);
      ctx.lineTo(centerX, 7);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(centerX - 5, height);
      ctx.lineTo(centerX + 5, height);
      ctx.lineTo(centerX, height - 7);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0; // Reset shadow

      ctx.restore();

      if (isPlaying) {
        animId = requestAnimationFrame(renderScrolling);
      }
    };

    renderScrolling();
    return () => cancelAnimationFrame(animId);
  }, [waveformData, currentTime, duration, isPlaying, track, hotCues, activeLoop, accentColor, zoomSeconds]);

  // Handle overview click seeking
  const handleOverviewClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = overviewCanvasRef.current;
    if (!canvas || duration <= 0) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const targetSec = (clickX / rect.width) * duration;
    onSeek(targetSec);
  };

  // Zoom on mouse wheel over scrolling waveform
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoomSeconds((prev) => {
      const factor = e.deltaY > 0 ? 1.2 : 0.83;
      return Math.max(1.5, Math.min(18.0, prev * factor));
    });
  };

  // Handle waveform scrub drag
  const handleWaveformMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
  };

  const handleWaveformMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || duration <= 0) return;
    const canvas = scrollingCanvasRef.current;
    if (!canvas) return;

    const deltaX = e.movementX;
    const pixelsPerSecond = canvas.clientWidth / zoomSeconds;
    const deltaSec = -(deltaX / pixelsPerSecond);
    const newTime = Math.max(0, Math.min(duration, currentTime + deltaSec));
    onSeek(newTime);
  };

  const handleWaveformMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="flex flex-col w-full bg-dj-surface rounded-lg overflow-hidden border border-dj-border shadow-inner">
      {/* 1. Dynamic Scrolling Waveform (Tri-Band RGB) */}
      <div className="relative h-20 sm:h-24 md:h-28 xl:h-32 w-full cursor-ew-resize">
        <canvas
          ref={scrollingCanvasRef}
          width={800}
          height={100}
          className="w-full h-full block"
          onWheel={handleWheel}
          onMouseDown={handleWaveformMouseDown}
          onMouseMove={handleWaveformMouseMove}
          onMouseUp={handleWaveformMouseUp}
          onMouseLeave={handleWaveformMouseUp}
        />
        {/* Frequency color legend */}
        <div className="absolute top-1 right-2 flex items-center space-x-2 text-[9px] font-mono text-slate-400 pointer-events-none bg-black/50 px-1.5 py-0.5 rounded">
          <span className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-[#ff3366] mr-1"></span>Bass</span>
          <span className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] mr-1"></span>Mid</span>
          <span className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-white mr-1"></span>Hi</span>
        </div>
      </div>

      {/* 2. Overview Waveform (Full track seeker) */}
      <div className="relative h-6 sm:h-7 xl:h-8 w-full cursor-pointer border-t border-dj-border/60">
        <canvas
          ref={overviewCanvasRef}
          width={800}
          height={32}
          className="w-full h-full block"
          onClick={handleOverviewClick}
        />
      </div>
    </div>
  );
};
