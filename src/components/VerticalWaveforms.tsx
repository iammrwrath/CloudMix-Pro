import React, { useRef, useEffect } from 'react';
import { DeckState, WaveformData } from '../types/dj';
import { audioEngine } from '../audio/AudioEngine';

interface VerticalWaveformsProps {
  deckA: DeckState;
  deckB: DeckState;
  waveformA: WaveformData | null;
  waveformB: WaveformData | null;
  masterBpm: number;
}

export const VerticalWaveforms: React.FC<VerticalWaveformsProps> = React.memo(({
  deckA,
  deckB,
  waveformA,
  waveformB,
  masterBpm,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const deckARef = useRef(deckA);
  const deckBRef = useRef(deckB);
  deckARef.current = deckA;
  deckBRef.current = deckB;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const curA = deckARef.current;
      const curB = deckBRef.current;
      const liveTimeA = curA.isPlaying ? audioEngine.getCurrentTime('A') : curA.currentTime;
      const liveTimeB = curB.isPlaying ? audioEngine.getCurrentTime('B') : curB.currentTime;

      const w = canvas.width;
      const h = canvas.height;
      const centerY = h / 2;
      const colWidth = (w - 24) / 2; // Split width with center phase meter gutter

      // Clear background
      ctx.fillStyle = '#06080e';
      ctx.fillRect(0, 0, w, h);

      // Draw subtle grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Render Vertical Deck A (Left)
      renderVerticalLane(
        ctx,
        curA,
        waveformA,
        0,
        centerY,
        colWidth,
        h,
        '#00f0ff',
        'rgba(0, 240, 255, 0.4)',
        liveTimeA
      );

      // Render Vertical Deck B (Right)
      renderVerticalLane(
        ctx,
        curB,
        waveformB,
        colWidth + 24,
        centerY,
        colWidth,
        h,
        '#ff2e88',
        'rgba(255, 46, 136, 0.4)',
        liveTimeB
      );

      // Render Center Phase Meter (Between the two columns)
      renderPhaseMeter(ctx, colWidth, centerY, 24, h, curA, curB, liveTimeA, liveTimeB);

      // Center Laser Playhead (Horizontal Red/White Laser Bar)
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 8;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(w, centerY);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Playhead Badge Deck Labels
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#00f0ff';
      ctx.fillText('DECK A', 10, centerY - 6);
      ctx.fillStyle = '#ff2e88';
      ctx.fillText('DECK B', w - 54, centerY - 6);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [waveformA, waveformB, masterBpm]);

  const renderVerticalLane = (
    ctx: CanvasRenderingContext2D,
    deck: DeckState,
    waveform: WaveformData | null,
    xOffset: number,
    centerY: number,
    width: number,
    height: number,
    accentColor: string,
    glowColor: string,
    liveTime: number
  ) => {
    const laneCenterX = xOffset + width / 2;
    const pixelsPerSecond = 80; // Vertical scroll speed

    if (waveform && waveform.lowPeaks && waveform.lowPeaks.length > 0) {
      const samplesPerSec = waveform.lowPeaks.length / waveform.duration;
      const currentSample = liveTime * samplesPerSec;
      const halfWidth = (width / 2) * 0.9;

      ctx.save();
      // Pass 1: Bass / Lows
      ctx.fillStyle = glowColor;
      for (let y = 0; y < height; y += 2) {
        const timeOffsetSec = (centerY - y) / pixelsPerSecond;
        const sampleIdx = Math.floor(currentSample + timeOffsetSec * samplesPerSec);
        if (sampleIdx >= 0 && sampleIdx < waveform.lowPeaks.length) {
          const low = waveform.lowPeaks[sampleIdx] || 0;
          const lowW = low * halfWidth;
          ctx.fillRect(laneCenterX - lowW, y, lowW * 2, 2);
        }
      }

      // Pass 2: Mid / Vocals
      ctx.fillStyle = accentColor;
      for (let y = 0; y < height; y += 2) {
        const timeOffsetSec = (centerY - y) / pixelsPerSecond;
        const sampleIdx = Math.floor(currentSample + timeOffsetSec * samplesPerSec);
        if (sampleIdx >= 0 && sampleIdx < waveform.lowPeaks.length) {
          const mid = waveform.midPeaks ? waveform.midPeaks[sampleIdx] || 0 : 0;
          const midW = mid * halfWidth * 0.75;
          ctx.fillRect(laneCenterX - midW, y, midW * 2, 1.5);
        }
      }

      // Pass 3: High / Transients
      ctx.fillStyle = '#ffffff';
      for (let y = 0; y < height; y += 2) {
        const timeOffsetSec = (centerY - y) / pixelsPerSecond;
        const sampleIdx = Math.floor(currentSample + timeOffsetSec * samplesPerSec);
        if (sampleIdx >= 0 && sampleIdx < waveform.lowPeaks.length) {
          const high = waveform.highPeaks ? waveform.highPeaks[sampleIdx] || 0 : 0;
          const highW = high * halfWidth * 0.45;
          ctx.fillRect(laneCenterX - highW, y, highW * 2, 1);
        }
      }
      ctx.restore();
    } else {
      // Empty waveform placeholder line
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath();
      ctx.moveTo(laneCenterX, 0);
      ctx.lineTo(laneCenterX, height);
      ctx.stroke();

      ctx.font = '11px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.textAlign = 'center';
      ctx.fillText(
        deck.track ? 'Analyzing Waveform...' : 'Load Track to Deck',
        laneCenterX,
        centerY + 40
      );
    }

    // Beatgrid lines
    if (deck.track && deck.track.bpm > 0) {
      const secPerBeat = 60 / deck.track.bpm;
      const beatPixels = secPerBeat * pixelsPerSecond;
      const beatOffset = (liveTime % secPerBeat) * pixelsPerSecond;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      for (let y = centerY - beatOffset; y >= 0; y -= beatPixels) {
        ctx.beginPath();
        ctx.moveTo(xOffset + 4, y);
        ctx.lineTo(xOffset + width - 4, y);
        ctx.stroke();
      }
      for (let y = centerY - beatOffset; y <= height; y += beatPixels) {
        ctx.beginPath();
        ctx.moveTo(xOffset + 4, y);
        ctx.lineTo(xOffset + width - 4, y);
        ctx.stroke();
      }
    }
  };

  const renderPhaseMeter = (
    ctx: CanvasRenderingContext2D,
    x: number,
    centerY: number,
    width: number,
    height: number,
    deckA: DeckState,
    deckB: DeckState,
    liveTimeA: number,
    liveTimeB: number
  ) => {
    // Center phase channel strip
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x, 0, width, height);

    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.strokeRect(x, 0, width, height);

    // Calculate relative phase difference if both playing
    if (deckA.isPlaying && deckB.isPlaying && deckA.track && deckB.track) {
      const beatSecA = 60 / deckA.track.bpm;
      const beatSecB = 60 / deckB.track.bpm;
      const phaseA = (liveTimeA % beatSecA) / beatSecA;
      const phaseB = (liveTimeB % beatSecB) / beatSecB;
      let phaseDiff = phaseA - phaseB;
      if (phaseDiff > 0.5) phaseDiff -= 1.0;
      if (phaseDiff < -0.5) phaseDiff += 1.0;

      // Phase indicator pip
      const pipY = centerY + phaseDiff * 120;
      const isSynced = Math.abs(phaseDiff) < 0.04;

      ctx.fillStyle = isSynced ? '#10b981' : '#f59e0b';
      ctx.shadowColor = isSynced ? 'rgba(16,185,129,0.8)' : 'rgba(245,158,11,0.8)';
      ctx.shadowBlur = 8;
      ctx.fillRect(x + 2, pipY - 4, width - 4, 8);
      ctx.shadowBlur = 0;
    }

    // Center lock ticks
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + width / 2 - 1, centerY - 8, 2, 16);
  };

  return (
    <div className="relative w-full h-[360px] bg-slate-950 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
      <canvas
        ref={canvasRef}
        width={960}
        height={360}
        className="w-full h-full block"
      />
      {/* Top Header Badge */}
      <div className="absolute top-2 left-3 flex items-center space-x-2 pointer-events-none">
        <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-slate-900/90 text-cyan-400 border border-cyan-500/30">
          PRO REKORDBOX STACKED WAVEFORMS (120 FPS)
        </span>
      </div>
    </div>
  );
});
