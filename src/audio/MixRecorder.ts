/**
 * High-Fidelity Master Mix Audio Recorder
 * Captures live master stereo output and encodes to lossless WAV.
 */

/**
 * High-Fidelity Master Mix Audio Recorder
 * Captures live master stereo output directly and encodes to standard lossless 16-bit PCM WAV (.wav).
 */

export class MixRecorder {
  private ctx: AudioContext | null = null;
  private sourceNode: AudioNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private leftChunks: Float32Array[] = [];
  private rightChunks: Float32Array[] = [];
  private totalSamplesRecorded: number = 0;
  private startTime: number = 0;
  private recordingInterval: number | null = null;
  private isRecording: boolean = false;
  private onStateChange: ((state: { isRecording: boolean; duration: number; fileSizeBytes: number }) => void) | null = null;

  constructor() {}

  public init(ctx: AudioContext, sourceNode: AudioNode) {
    this.ctx = ctx;
    this.sourceNode = sourceNode;
  }

  public setListener(cb: (state: { isRecording: boolean; duration: number; fileSizeBytes: number }) => void) {
    this.onStateChange = cb;
  }

  public start(): boolean {
    if (!this.ctx || !this.sourceNode || this.isRecording) return false;

    try {
      this.leftChunks = [];
      this.rightChunks = [];
      this.totalSamplesRecorded = 0;

      // 4096 buffer size gives ~93ms chunks at 44.1kHz - robust & low latency
      const bufferSize = 4096;
      this.processorNode = this.ctx.createScriptProcessor(bufferSize, 2, 2);

      this.processorNode.onaudioprocess = (e: AudioProcessingEvent) => {
        if (!this.isRecording) return;
        const leftInput = e.inputBuffer.getChannelData(0);
        const rightInput = e.inputBuffer.numberOfChannels > 1 ? e.inputBuffer.getChannelData(1) : leftInput;

        // Copy chunk arrays
        this.leftChunks.push(new Float32Array(leftInput));
        this.rightChunks.push(new Float32Array(rightInput));
        this.totalSamplesRecorded += leftInput.length;
      };

      // Connect source to processor, and processor to destination (silent through-flow)
      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.ctx.destination);

      this.isRecording = true;
      this.startTime = Date.now();

      this.recordingInterval = window.setInterval(() => {
        if (this.onStateChange && this.ctx) {
          const duration = (Date.now() - this.startTime) / 1000;
          // 16-bit stereo PCM = 4 bytes per sample frame + 44 bytes RIFF header
          const fileSizeBytes = 44 + (this.totalSamplesRecorded * 4);
          this.onStateChange({
            isRecording: true,
            duration,
            fileSizeBytes,
          });
        }
      }, 500);

      return true;
    } catch (err) {
      console.error('Failed to start lossless WAV recording:', err);
      return false;
    }
  }

  public stop(): Promise<{ blob: Blob; url: string; duration: number } | null> {
    return new Promise((resolve) => {
      if (!this.isRecording || !this.ctx) {
        resolve(null);
        return;
      }

      if (this.recordingInterval) {
        clearInterval(this.recordingInterval);
        this.recordingInterval = null;
      }

      this.isRecording = false;
      const totalDuration = (Date.now() - this.startTime) / 1000;

      if (this.processorNode && this.sourceNode) {
        try {
          this.sourceNode.disconnect(this.processorNode);
          this.processorNode.disconnect();
        } catch {}
        this.processorNode.onaudioprocess = null;
        this.processorNode = null;
      }

      // Encode stereo PCM chunks to standard 16-bit RIFF/WAVE file
      const sampleRate = this.ctx.sampleRate || 44100;
      const wavBlob = this.encodeWAV(this.leftChunks, this.rightChunks, this.totalSamplesRecorded, sampleRate);
      const url = URL.createObjectURL(wavBlob);

      if (this.onStateChange) {
        this.onStateChange({
          isRecording: false,
          duration: totalDuration,
          fileSizeBytes: wavBlob.size,
        });
      }

      // Clear memory buffers
      this.leftChunks = [];
      this.rightChunks = [];
      this.totalSamplesRecorded = 0;

      resolve({ blob: wavBlob, url, duration: totalDuration });
    });
  }

  /**
   * Encoders raw 32-bit Float PCM channels into standard 16-bit Stereo PCM WAV Blob
   */
  private encodeWAV(leftChunks: Float32Array[], rightChunks: Float32Array[], totalSamples: number, sampleRate: number): Blob {
    const numChannels = 2;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = totalSamples * blockAlign;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    // RIFF identifier 'RIFF'
    writeString(0, 'RIFF');
    // File length minus 8 bytes
    view.setUint32(4, 36 + dataSize, true);
    // RIFF type 'WAVE'
    writeString(8, 'WAVE');
    // Format chunk identifier 'fmt '
    writeString(12, 'fmt ');
    // Format chunk length (16 for PCM)
    view.setUint32(16, 16, true);
    // Sample format (1 is linear PCM)
    view.setUint16(20, 1, true);
    // Channels
    view.setUint16(22, numChannels, true);
    // Sample rate
    view.setUint32(24, sampleRate, true);
    // Byte rate
    view.setUint32(28, byteRate, true);
    // Block align
    view.setUint16(32, blockAlign, true);
    // Bits per sample
    view.setUint16(34, bitsPerSample, true);
    // Data chunk identifier 'data'
    writeString(36, 'data');
    // Data chunk length
    view.setUint32(40, dataSize, true);

    // Interleave left and right channels & convert Float32 [-1.0, 1.0] to 16-bit signed PCM
    let offset = 44;
    for (let c = 0; c < leftChunks.length; c++) {
      const left = leftChunks[c];
      const right = rightChunks[c] || left;
      const len = left.length;
      for (let i = 0; i < len; i++) {
        // Clamp & scale left channel
        let sL = Math.max(-1, Math.min(1, left[i]));
        const sampleL = sL < 0 ? sL * 0x8000 : sL * 0x7FFF;
        view.setInt16(offset, sampleL, true);
        offset += 2;

        // Clamp & scale right channel
        let sR = Math.max(-1, Math.min(1, right[i]));
        const sampleR = sR < 0 ? sR * 0x8000 : sR * 0x7FFF;
        view.setInt16(offset, sampleR, true);
        offset += 2;
      }
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  public downloadRecording(blob: Blob, filename?: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const name = filename || `CloudMix-LiveSet-${timestamp}.wav`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  public getStatus() {
    return {
      isRecording: this.isRecording,
      duration: this.isRecording ? (Date.now() - this.startTime) / 1000 : 0,
    };
  }
}

export const mixRecorder = new MixRecorder();
