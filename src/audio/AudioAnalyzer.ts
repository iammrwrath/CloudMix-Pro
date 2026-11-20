import { WaveformData } from '../types/dj';

export class AudioAnalyzer {
  /**
   * Generates tri-band waveform peak arrays for ultra-fast GPU / Canvas rendering.
   * Splits audio into:
   * - lowPeaks (Bass energy: <250 Hz) -> Displayed in Red / Coral
   * - midPeaks (Mid energy: 250-2500 Hz) -> Displayed in Green / Cyan
   * - highPeaks (High energy: >2500 Hz) -> Displayed in Blue / White
   * - overviewPeaks (Subsampled overall amplitude for the mini-overview trackbar)
   */
  public static extractWaveformData(audioBuffer: AudioBuffer, pointsPerSecond: number = 80): WaveformData {
    const duration = audioBuffer.duration;
    const sampleRate = audioBuffer.sampleRate;
    const totalPoints = Math.floor(duration * pointsPerSecond);
    const channelData = audioBuffer.getChannelData(0); // Mono analysis
    const samplesPerPoint = Math.floor(channelData.length / totalPoints);

    const overviewPeaks = new Float32Array(totalPoints);
    const lowPeaks = new Float32Array(totalPoints);
    const midPeaks = new Float32Array(totalPoints);
    const highPeaks = new Float32Array(totalPoints);

    // Simple 1st-order IIR filters for fast energy estimation per band
    // RC filters for split:
    const dt = 1 / sampleRate;
    const rcLow = 1 / (2 * Math.PI * 250);
    const alphaLow = dt / (rcLow + dt);

    const rcHigh = 1 / (2 * Math.PI * 2500);
    const alphaHigh = rcHigh / (rcHigh + dt);

    let lowPrev = 0;
    let highPrevIn = 0;
    let highPrevOut = 0;

    for (let p = 0; p < totalPoints; p++) {
      const start = p * samplesPerPoint;
      const end = Math.min(start + samplesPerPoint, channelData.length);

      let maxRaw = 0;
      let maxLow = 0;
      let maxMid = 0;
      let maxHigh = 0;

      for (let i = start; i < end; i += 4) { // Subsample 4x for extreme speed
        const s = channelData[i];
        const absS = Math.abs(s);
        if (absS > maxRaw) maxRaw = absS;

        // Low-pass filter approximation (<250Hz)
        lowPrev = lowPrev + alphaLow * (s - lowPrev);
        const absLow = Math.abs(lowPrev);
        if (absLow > maxLow) maxLow = absLow;

        // High-pass filter approximation (>2500Hz)
        highPrevOut = alphaHigh * (highPrevOut + s - highPrevIn);
        highPrevIn = s;
        const absHigh = Math.abs(highPrevOut);
        if (absHigh > maxHigh) maxHigh = absHigh;

        // Mid energy is residual
        const midEnergy = Math.max(0, absS - (absLow * 0.7 + absHigh * 0.7));
        if (midEnergy > maxMid) maxMid = midEnergy;
      }

      overviewPeaks[p] = Math.min(1.0, maxRaw);
      lowPeaks[p] = Math.min(1.0, maxLow * 1.4);
      midPeaks[p] = Math.min(1.0, maxMid * 1.3);
      highPeaks[p] = Math.min(1.0, maxHigh * 1.8);
    }

    // Near-silent placeholder buffers (streaming decks): normalize so the waveform/beat grid is visible
    let globalMax = 0;
    for (let i = 0; i < totalPoints; i++) globalMax = Math.max(globalMax, overviewPeaks[i]);
    if (globalMax > 0 && globalMax < 0.01) {
      const gain = 0.85 / globalMax;
      for (let i = 0; i < totalPoints; i++) {
        overviewPeaks[i] = Math.min(1, overviewPeaks[i] * gain);
        lowPeaks[i] = Math.min(1, lowPeaks[i] * gain * 0.9);
        midPeaks[i] = Math.min(1, midPeaks[i] * gain * 0.6);
        highPeaks[i] = Math.min(1, highPeaks[i] * gain * 0.4);
      }
    }

    return {
      overviewPeaks,
      lowPeaks,
      midPeaks,
      highPeaks,
      duration,
      samplesPerPixel: samplesPerPoint,
    };
  }

  /**
   * Fast client-side BPM estimation using energy onset envelope autocorrelation.
   */
  public static estimateBPM(audioBuffer: AudioBuffer): { bpm: number; confidence: number } {
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    // Analyze central 60 seconds (or full track if shorter)
    const startSec = Math.max(0, (audioBuffer.duration / 2) - 30);
    const startSample = Math.floor(startSec * sampleRate);
    const lengthSamples = Math.min(channelData.length - startSample, Math.floor(60 * sampleRate));

    if (lengthSamples <= 0) return { bpm: 120.0, confidence: 0.5 };

    // Compute energy envelope downsampled to ~200Hz
    const envelopeRate = 200;
    const hopSize = Math.floor(sampleRate / envelopeRate);
    const envLen = Math.floor(lengthSamples / hopSize);
    const envelope = new Float32Array(envLen);

    for (let e = 0; e < envLen; e++) {
      let sum = 0;
      const idx = startSample + e * hopSize;
      for (let j = 0; j < hopSize; j += 4) {
        const val = channelData[idx + j];
        sum += val * val;
      }
      envelope[e] = Math.sqrt(sum / (hopSize / 4));
    }

    // First difference (spectral flux onset detector)
    const onsets = new Float32Array(envLen);
    for (let i = 1; i < envLen; i++) {
      const diff = envelope[i] - envelope[i - 1];
      onsets[i] = diff > 0 ? diff : 0;
    }

    // Autocorrelation over BPM lag range [70..180 BPM]
    const minBpm = 75;
    const maxBpm = 175;
    const minLag = Math.floor((60 * envelopeRate) / maxBpm);
    const maxLag = Math.floor((60 * envelopeRate) / minBpm);

    let bestLag = 0;
    let maxCorr = -1;

    for (let lag = minLag; lag <= maxLag; lag++) {
      let corr = 0;
      for (let i = 0; i < envLen - lag; i++) {
        corr += onsets[i] * onsets[i + lag];
      }
      if (corr > maxCorr) {
        maxCorr = corr;
        bestLag = lag;
      }
    }

    if (bestLag <= 0) return { bpm: 124.0, confidence: 0.5 };

    let detectedBpm = (60 * envelopeRate) / bestLag;

    // Standardize to common DJ range (85 - 170)
    while (detectedBpm < 85) detectedBpm *= 2;
    while (detectedBpm > 170) detectedBpm /= 2;

    return {
      bpm: Math.round(detectedBpm * 100) / 100,
      confidence: 0.85,
    };
  }

  /**
   * Off-Thread Background Web Worker Runner (inspired by djay Pro Audio/Waveform Worker thread).
   * Transfers mono Float32Array PCM buffers to an inline Worker so main-thread waveform FPS never stutters.
   */
  private static runAudioWorker<T>(
    task: 'waveform' | 'bpm',
    channelData: Float32Array,
    sampleRate: number,
    duration: number,
    pointsPerSecond: number = 80
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (
        typeof Worker === 'undefined' ||
        typeof Blob === 'undefined' ||
        typeof URL === 'undefined' ||
        typeof URL.createObjectURL !== 'function'
      ) {
        reject(new Error('Web Worker API unavailable'));
        return;
      }

      const workerSource = [
        'self.onmessage = function(e) {',
        '  var d = e.data;',
        '  var channelData = d.channelData;',
        '  var sampleRate = d.sampleRate;',
        '  var duration = d.duration;',
        '  if (d.task === "waveform") {',
        '    var pointsPerSecond = d.pointsPerSecond || 80;',
        '    var totalPoints = Math.max(1, Math.floor(duration * pointsPerSecond));',
        '    var samplesPerPoint = Math.max(1, Math.floor(channelData.length / totalPoints));',
        '    var overviewPeaks = new Float32Array(totalPoints);',
        '    var lowPeaks = new Float32Array(totalPoints);',
        '    var midPeaks = new Float32Array(totalPoints);',
        '    var highPeaks = new Float32Array(totalPoints);',
        '    var dt = 1 / sampleRate;',
        '    var rcLow = 1 / (2 * Math.PI * 250);',
        '    var alphaLow = dt / (rcLow + dt);',
        '    var rcHigh = 1 / (2 * Math.PI * 2500);',
        '    var alphaHigh = rcHigh / (rcHigh + dt);',
        '    var lowPrev = 0, highPrevIn = 0, highPrevOut = 0;',
        '    for (var p = 0; p < totalPoints; p++) {',
        '      var start = p * samplesPerPoint;',
        '      var end = Math.min(start + samplesPerPoint, channelData.length);',
        '      var maxRaw = 0, maxLow = 0, maxMid = 0, maxHigh = 0;',
        '      for (var i = start; i < end; i += 4) {',
        '        var s = channelData[i];',
        '        var absS = Math.abs(s);',
        '        if (absS > maxRaw) maxRaw = absS;',
        '        lowPrev = lowPrev + alphaLow * (s - lowPrev);',
        '        var absLow = Math.abs(lowPrev);',
        '        if (absLow > maxLow) maxLow = absLow;',
        '        highPrevOut = alphaHigh * (highPrevOut + s - highPrevIn);',
        '        highPrevIn = s;',
        '        var absHigh = Math.abs(highPrevOut);',
        '        if (absHigh > maxHigh) maxHigh = absHigh;',
        '        var midEnergy = Math.max(0, absS - (absLow * 0.7 + absHigh * 0.7));',
        '        if (midEnergy > maxMid) maxMid = midEnergy;',
        '      }',
        '      overviewPeaks[p] = Math.min(1.0, maxRaw);',
        '      lowPeaks[p] = Math.min(1.0, maxLow * 1.4);',
        '      midPeaks[p] = Math.min(1.0, maxMid * 1.3);',
        '      highPeaks[p] = Math.min(1.0, maxHigh * 1.8);',
        '    }',
        '    var globalMax = 0;',
        '    for (var g = 0; g < totalPoints; g++) if (overviewPeaks[g] > globalMax) globalMax = overviewPeaks[g];',
        '    if (globalMax > 0 && globalMax < 0.01) {',
        '      var gain = 0.85 / globalMax;',
        '      for (var k = 0; k < totalPoints; k++) {',
        '        overviewPeaks[k] = Math.min(1, overviewPeaks[k] * gain);',
        '        lowPeaks[k] = Math.min(1, lowPeaks[k] * gain * 0.9);',
        '        midPeaks[k] = Math.min(1, midPeaks[k] * gain * 0.6);',
        '        highPeaks[k] = Math.min(1, highPeaks[k] * gain * 0.4);',
        '      }',
        '    }',
        '    self.postMessage({ ok: true, result: { overviewPeaks: overviewPeaks, lowPeaks: lowPeaks, midPeaks: midPeaks, highPeaks: highPeaks, duration: duration, samplesPerPixel: samplesPerPoint } }, [overviewPeaks.buffer, lowPeaks.buffer, midPeaks.buffer, highPeaks.buffer]);',
        '  } else {',
        '    var startSec = Math.max(0, (duration / 2) - 30);',
        '    var startSample = Math.floor(startSec * sampleRate);',
        '    var lengthSamples = Math.min(channelData.length - startSample, Math.floor(60 * sampleRate));',
        '    if (lengthSamples <= 0) { self.postMessage({ ok: true, result: { bpm: 120.0, confidence: 0.5 } }); return; }',
        '    var envelopeRate = 200;',
        '    var hopSize = Math.max(1, Math.floor(sampleRate / envelopeRate));',
        '    var envLen = Math.floor(lengthSamples / hopSize);',
        '    var envelope = new Float32Array(envLen);',
        '    for (var e = 0; e < envLen; e++) {',
        '      var sum = 0, idx = startSample + e * hopSize;',
        '      for (var j = 0; j < hopSize; j += 4) { var val = channelData[idx + j]; sum += val * val; }',
        '      envelope[e] = Math.sqrt(sum / Math.max(1, hopSize / 4));',
        '    }',
        '    var onsets = new Float32Array(envLen);',
        '    for (var m = 1; m < envLen; m++) { var diff = envelope[m] - envelope[m - 1]; onsets[m] = diff > 0 ? diff : 0; }',
        '    var minLag = Math.floor((60 * envelopeRate) / 175);',
        '    var maxLag = Math.floor((60 * envelopeRate) / 75);',
        '    var bestLag = 0, maxCorr = -1;',
        '    for (var lag = minLag; lag <= maxLag; lag++) {',
        '      var corr = 0;',
        '      for (var n = 0; n < envLen - lag; n++) corr += onsets[n] * onsets[n + lag];',
        '      if (corr > maxCorr) { maxCorr = corr; bestLag = lag; }',
        '    }',
        '    if (bestLag <= 0) { self.postMessage({ ok: true, result: { bpm: 124.0, confidence: 0.5 } }); return; }',
        '    var detectedBpm = (60 * envelopeRate) / bestLag;',
        '    while (detectedBpm < 85) detectedBpm *= 2;',
        '    while (detectedBpm > 170) detectedBpm /= 2;',
        '    self.postMessage({ ok: true, result: { bpm: Math.round(detectedBpm * 100) / 100, confidence: 0.85 } });',
        '  }',
        '};',
      ].join('\n');

      const blob = new Blob([workerSource], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      const worker = new Worker(workerUrl);

      const cleanup = () => {
        try {
          worker.terminate();
        } catch {}
        try {
          URL.revokeObjectURL(workerUrl);
        } catch {}
      };

      worker.onmessage = (event: MessageEvent) => {
        cleanup();
        if (event.data && event.data.ok) {
          resolve(event.data.result as T);
        } else {
          reject(new Error('Audio worker execution failed'));
        }
      };

      worker.onerror = (err) => {
        cleanup();
        reject(err instanceof Error ? err : new Error('Audio worker error'));
      };

      const pcmCopy = new Float32Array(channelData);
      worker.postMessage(
        {
          task,
          channelData: pcmCopy,
          sampleRate,
          duration,
          pointsPerSecond,
        },
        [pcmCopy.buffer]
      );
    });
  }

  /**
   * Async Web Worker version of extractWaveformData (zero main-thread blocking).
   */
  public static async extractWaveformDataAsync(
    audioBuffer: AudioBuffer,
    pointsPerSecond: number = 80
  ): Promise<WaveformData> {
    try {
      return await AudioAnalyzer.runAudioWorker<WaveformData>(
        'waveform',
        audioBuffer.getChannelData(0),
        audioBuffer.sampleRate,
        audioBuffer.duration,
        pointsPerSecond
      );
    } catch {
      return AudioAnalyzer.extractWaveformData(audioBuffer, pointsPerSecond);
    }
  }

  /**
   * Async Web Worker version of estimateBPM (zero main-thread blocking).
   */
  public static async estimateBPMAsync(
    audioBuffer: AudioBuffer
  ): Promise<{ bpm: number; confidence: number }> {
    try {
      return await AudioAnalyzer.runAudioWorker<{ bpm: number; confidence: number }>(
        'bpm',
        audioBuffer.getChannelData(0),
        audioBuffer.sampleRate,
        audioBuffer.duration
      );
    } catch {
      return AudioAnalyzer.estimateBPM(audioBuffer);
    }
  }

  /**
   * Camelot Key wheel mapping (e.g., 8A = Am, 11B = A)
   */
  public static mapToCamelot(keyName: string): string {
    const camelotMap: Record<string, string> = {
      'C': '8B', 'Am': '8A',
      'G': '9B', 'Em': '9A',
      'D': '10B', 'Bm': '10A',
      'A': '11B', 'F#m': '11A', 'Gbm': '11A',
      'E': '12B', 'C#m': '12A', 'Dbm': '12A',
      'B': '1B', 'G#m': '1A', 'Abm': '1A',
      'F#': '2B', 'Gb': '2B', 'D#m': '2A', 'Ebm': '2A',
      'Db': '3B', 'C#': '3B', 'Bbm': '3A', 'A#m': '3A',
      'Ab': '4B', 'G#': '4B', 'Fm': '4A',
      'Eb': '5B', 'D#': '5B', 'Cm': '5A',
      'Bb': '6B', 'A#': '6B', 'Gm': '6A',
      'F': '7B', 'Dm': '7A'
    };
    return camelotMap[keyName] || keyName;
  }
}
