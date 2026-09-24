import React, { useRef, useEffect, useState, useCallback } from 'react';
import { DeckId, HotCue, StemState, TrackMetadata, WaveformData } from '../types/dj';
import { audioEngine } from '../audio/AudioEngine';
import { youtubeDeckBridge } from '../services/YouTubeDeckBridge';

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
  stems?: StemState;
  accentColor?: string;
}

export const WaveformDisplay: React.FC<WaveformDisplayProps> = React.memo(({
  deckId,
  track,
  waveformData,
  currentTime,
  duration,
  isPlaying,
  hotCues,
  activeLoop,
  onSeek,
  stems,
  accentColor = '#00e5ff',
}) => {
  const scrollingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overviewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overviewBgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentTimeRef = useRef<number>(currentTime);
  currentTimeRef.current = currentTime;

  const [isDragging, setIsDragging] = useState(false);
  const [zoomSeconds, setZoomSeconds] = useState(5.5);

  // 1. Pre-render & Cache Static Overview Peaks onto Offscreen Canvas
  useEffect(() => {
    if (!waveformData || duration <= 0) {
      overviewBgCanvasRef.current = null;
      return;
    }

    const canvas = overviewCanvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas?.clientWidth || 800;
    const displayHeight = canvas?.clientHeight || 24;

    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = displayWidth * dpr;
    bgCanvas.height = displayHeight * dpr;
    const bgCtx = bgCanvas.getContext('2d');
    if (!bgCtx) return;

    bgCtx.scale(dpr, dpr);
    const width = displayWidth;
    const height = displayHeight;

    // Background gradient
    const bgGrad = bgCtx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#0f1420');
    bgGrad.addColorStop(1, '#080b12');
    bgCtx.fillStyle = bgGrad;
    bgCtx.fillRect(0, 0, width, height);

    // Center divider
    bgCtx.strokeStyle = '#1e293b';
    bgCtx.lineWidth = 1;
    bgCtx.beginPath();
    bgCtx.moveTo(0, height / 2);
    bgCtx.lineTo(width, height / 2);
    bgCtx.stroke();

    // Tri-band overview draw (done ONCE per track / size change)
    const centerY = height / 2;
    const totalPoints = waveformData.overviewPeaks.length;

    // Pass 1: Low / Bass frequency (Coral Red)
    bgCtx.fillStyle = '#ff3366';
    for (let x = 0; x < width; x++) {
      const pointIndex = Math.floor((x / width) * totalPoints);
      const lowVal = waveformData.lowPeaks[pointIndex] || 0;
      const midVal = waveformData.midPeaks[pointIndex] || 0;
      const highVal = waveformData.highPeaks[pointIndex] || 0;
      const totalH = Math.max(2, (lowVal + midVal + highVal) * 0.45 * (height / 2));
      bgCtx.fillRect(x, centerY - totalH * 0.5, 1, totalH);
    }

    // Pass 2: Mid frequency (Cyan)
    bgCtx.fillStyle = '#00e5ff';
    for (let x = 0; x < width; x++) {
      const pointIndex = Math.floor((x / width) * totalPoints);
      const lowVal = waveformData.lowPeaks[pointIndex] || 0;
      const midVal = waveformData.midPeaks[pointIndex] || 0;
      const highVal = waveformData.highPeaks[pointIndex] || 0;
      const totalH = Math.max(2, (lowVal + midVal + highVal) * 0.45 * (height / 2));
      bgCtx.fillRect(x, centerY - totalH * 0.35, 1, totalH * 0.7);
    }

    // Pass 3: High frequency (Bright White)
    bgCtx.fillStyle = '#ffffff';
    for (let x = 0; x < width; x++) {
      const pointIndex = Math.floor((x / width) * totalPoints);
      const lowVal = waveformData.lowPeaks[pointIndex] || 0;
      const midVal = waveformData.midPeaks[pointIndex] || 0;
      const highVal = waveformData.highPeaks[pointIndex] || 0;
      const totalH = Math.max(2, (lowVal + midVal + highVal) * 0.45 * (height / 2));
      bgCtx.fillRect(x, centerY - totalH * 0.15, 1, totalH * 0.3);
    }

    overviewBgCanvasRef.current = bgCanvas;
  }, [waveformData, duration]);

  // Fast Overview Render (Blits pre-rendered background in 1 draw call + playhead/cues)
  const drawOverview = useCallback((liveTime: number) => {
    const canvas = overviewCanvasRef.current;
    if (!canvas || duration <= 0) return;
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

    const bgCanvas = overviewBgCanvasRef.current;
    if (bgCanvas) {
      ctx.drawImage(bgCanvas, 0, 0, width, height);
    } else {
      ctx.fillStyle = '#080b12';
      ctx.fillRect(0, 0, width, height);
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
    const progressX = (liveTime / duration) * width;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(0, 0, progressX, height);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(progressX, 0);
    ctx.lineTo(progressX, height);
    ctx.stroke();

    ctx.restore();
  }, [duration, hotCues, activeLoop]);

  // Update overview when paused or on seek
  useEffect(() => {
    if (!isPlaying) {
      drawOverview(currentTime);
    }
  }, [currentTime, isPlaying, drawOverview]);

  // 2. Dynamic Scrolling Tri-Band Waveform Loop (60-144 FPS Hardware-Accelerated)
  useEffect(() => {
    let animId: number;

    const renderScrolling = () => {
      const canvas = scrollingCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const liveTime = isPlaying
        ? (youtubeDeckBridge.isYouTubeDeck(deckId)
            ? youtubeDeckBridge.getCurrentTime(deckId)
            : audioEngine.getCurrentTime(deckId))
        : currentTimeRef.current;

      // Update overview playhead in the same rAF tick
      if (isPlaying) {
        drawOverview(liveTime);
      }

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

      // 1. Dark background with subtle center guide
      ctx.fillStyle = '#06080e';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();

      // Center Laser Playhead (always visible even if waveformData is generating)
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
      ctx.shadowBlur = 0;

      if (!waveformData || duration <= 0) {
        ctx.restore();
        if (isPlaying) animId = requestAnimationFrame(renderScrolling);
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
        const visibleStartSec = liveTime - zoomSeconds / 2;
        const visibleEndSec = liveTime + zoomSeconds / 2;

        const firstBeatNum = Math.floor(visibleStartSec / beatIntervalSec);
        const lastBeatNum = Math.ceil(visibleEndSec / beatIntervalSec);

        for (let b = firstBeatNum; b <= lastBeatNum; b++) {
          const beatTime = b * beatIntervalSec;
          const beatX = centerX + (beatTime - liveTime) * pixelsPerSecond;
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

      const maxH = (height / 2) * 0.94;

      // Stem-Aware Visual Feedback (Serato / VirtualDJ style)
      const isSoloActive = stems && (stems.vocalsSolo || stems.drumsSolo || stems.bassSolo || stems.harmonicsSolo);
      const bassAlpha = stems?.bassMuted
        ? 0.08
        : stems?.bassSolo
        ? 1.0
        : isSoloActive
        ? 0.12
        : Math.max(0.1, Math.min(1.0, stems?.bass ?? 1.0));

      const vocalsAlpha = stems?.vocalsMuted
        ? 0.08
        : stems?.vocalsSolo
        ? 1.0
        : isSoloActive
        ? 0.12
        : Math.max(0.1, Math.min(1.0, stems?.vocals ?? 1.0));

      const trebleAlpha = stems?.harmonicsMuted
        ? 0.08
        : stems?.harmonicsSolo
        ? 1.0
        : isSoloActive
        ? 0.12
        : Math.max(0.1, Math.min(1.0, stems?.harmonics ?? 1.0));

      // Batch Pass 1: Low Freq (Bass) - Hot Coral / Pink Glow
      ctx.fillStyle = `rgba(255, 46, 136, ${bassAlpha})`;
      for (let x = 0; x < width; x += 2) {
        const timeAtX = liveTime + (x - centerX) / pixelsPerSecond;
        if (timeAtX < 0 || timeAtX > duration) continue;
        const pIdx = Math.floor(timeAtX * pointsPerSecond);
        if (pIdx < 0 || pIdx >= totalPoints) continue;
        const lowVal = waveformData.lowPeaks[pIdx] || 0;
        const hLow = lowVal * maxH;
        ctx.fillRect(x, centerY - hLow, 1.6, hLow * 1.6);
      }

      // Batch Pass 2: Mid Freq (Vocals/Mids) - Electric Cyan Glow
      ctx.fillStyle = `rgba(0, 240, 255, ${vocalsAlpha})`;
      for (let x = 0; x < width; x += 2) {
        const timeAtX = liveTime + (x - centerX) / pixelsPerSecond;
        if (timeAtX < 0 || timeAtX > duration) continue;
        const pIdx = Math.floor(timeAtX * pointsPerSecond);
        if (pIdx < 0 || pIdx >= totalPoints) continue;
        const midVal = waveformData.midPeaks[pIdx] || 0;
        const hMid = midVal * maxH * 0.72;
        ctx.fillRect(x, centerY - hMid, 1.6, hMid * 1.6);
      }

      // Batch Pass 3: High Freq (Treble/Hi-hats) - Brilliant Crisp White
      ctx.fillStyle = `rgba(255, 255, 255, ${trebleAlpha})`;
      for (let x = 0; x < width; x += 2) {
        const timeAtX = liveTime + (x - centerX) / pixelsPerSecond;
        if (timeAtX < 0 || timeAtX > duration) continue;
        const pIdx = Math.floor(timeAtX * pointsPerSecond);
        if (pIdx < 0 || pIdx >= totalPoints) continue;
        const highVal = waveformData.highPeaks[pIdx] || 0;
        const hHigh = highVal * maxH * 0.42;
        ctx.fillRect(x, centerY - hHigh, 1.6, hHigh * 1.6);
      }

      // Batch Pass 4: Subtle mirrored reflection below baseline
      ctx.fillStyle = `rgba(0, 240, 255, ${vocalsAlpha * 0.2})`;
      for (let x = 0; x < width; x += 2) {
        const timeAtX = liveTime + (x - centerX) / pixelsPerSecond;
        if (timeAtX < 0 || timeAtX > duration) continue;
        const pIdx = Math.floor(timeAtX * pointsPerSecond);
        if (pIdx < 0 || pIdx >= totalPoints) continue;
        const midVal = waveformData.midPeaks[pIdx] || 0;
        const hMid = midVal * maxH * 0.72;
        ctx.fillRect(x, centerY + 2, 1.6, hMid * 0.4);
      }

      // Draw active loop shading with candy-stripe glow
      if (activeLoop) {
        const loopStartX = centerX + (activeLoop.start - liveTime) * pixelsPerSecond;
        const loopEndX = centerX + (activeLoop.end - liveTime) * pixelsPerSecond;
        ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
        ctx.fillRect(loopStartX, 0, loopEndX - loopStartX, height);
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.strokeRect(loopStartX, 0, loopEndX - loopStartX, height);
      }

      // Draw Hot Cues on scrolling waveform with illuminated flag pins
      hotCues.forEach((cue) => {
        if (!cue.active) return;
        const cueX = centerX + (cue.position - liveTime) * pixelsPerSecond;
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
  }, [deckId, waveformData, duration, isPlaying, track, hotCues, activeLoop, accentColor, zoomSeconds, drawOverview]);

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
      <div className="relative h-14 sm:h-18 md:h-22 xl:h-28 w-full cursor-ew-resize">
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
      <div className="relative h-5 sm:h-6 xl:h-7 w-full cursor-pointer border-t border-dj-border/60">
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
});
