/**
 * High-Fidelity Master Mix Audio Recorder
 * Captures live master stereo output directly via MediaStreamAudioDestinationNode
 * and records using the modern standard MediaRecorder API (audio/webm;codecs=opus).
 */

export class MixRecorder {
  private ctx: AudioContext | null = null;
  private sourceNode: AudioNode | null = null;
  private mediaStreamDest: MediaStreamAudioDestinationNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private totalBytesRecorded: number = 0;
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
      this.recordedChunks = [];
      this.totalBytesRecorded = 0;

      // 1. Create MediaStreamAudioDestinationNode (Standard Web Audio to MediaStream bridge)
      this.mediaStreamDest = this.ctx.createMediaStreamDestination();
      this.sourceNode.connect(this.mediaStreamDest);

      // 2. Determine best supported MIME type
      const preferredMime = 'audio/webm;codecs=opus';
      const mimeType = (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(preferredMime))
        ? preferredMime
        : (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '');

      const options: MediaRecorderOptions = mimeType ? { mimeType, audioBitsPerSecond: 256000 } : { audioBitsPerSecond: 256000 };
      this.mediaRecorder = new MediaRecorder(this.mediaStreamDest.stream, options);

      this.mediaRecorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
          this.totalBytesRecorded += e.data.size;
        }
      };

      // Slice recording every 1000ms for continuous buffering
      this.mediaRecorder.start(1000);
      this.isRecording = true;
      this.startTime = Date.now();

      this.recordingInterval = window.setInterval(() => {
        if (this.onStateChange && this.isRecording) {
          const duration = (Date.now() - this.startTime) / 1000;
          this.onStateChange({
            isRecording: true,
            duration,
            fileSizeBytes: this.totalBytesRecorded,
          });
        }
      }, 500);

      return true;
    } catch (err) {
      console.error('Failed to start MediaRecorder master mix capture:', err);
      return false;
    }
  }

  public stop(): Promise<{ blob: Blob; url: string; duration: number } | null> {
    return new Promise((resolve) => {
      if (!this.isRecording || !this.mediaRecorder) {
        resolve(null);
        return;
      }

      if (this.recordingInterval) {
        clearInterval(this.recordingInterval);
        this.recordingInterval = null;
      }

      this.isRecording = false;
      const totalDuration = (Date.now() - this.startTime) / 1000;

      const recorder = this.mediaRecorder;
      const mediaStream = this.mediaStreamDest;
      const source = this.sourceNode;

      recorder.onstop = () => {
        try {
          if (mediaStream && source) {
            source.disconnect(mediaStream);
          }
          if (mediaStream?.stream) {
            mediaStream.stream.getTracks().forEach((t) => t.stop());
          }
        } catch {}

        const mime = recorder.mimeType || 'audio/webm;codecs=opus';
        const finalBlob = new Blob(this.recordedChunks, { type: mime });
        const url = URL.createObjectURL(finalBlob);

        if (this.onStateChange) {
          this.onStateChange({
            isRecording: false,
            duration: totalDuration,
            fileSizeBytes: finalBlob.size,
          });
        }

        this.recordedChunks = [];
        this.totalBytesRecorded = 0;
        this.mediaRecorder = null;
        this.mediaStreamDest = null;

        resolve({ blob: finalBlob, url, duration: totalDuration });
      };

      try {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        } else {
          recorder.onstop?.(new Event('stop'));
        }
      } catch {
        recorder.onstop?.(new Event('stop'));
      }
    });
  }

  public downloadRecording(blob: Blob, filename?: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const isWav = blob.type.includes('wav');
    const ext = isWav ? 'wav' : 'webm';
    const name = filename || `CloudMix-LiveSet-${timestamp}.${ext}`;
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
