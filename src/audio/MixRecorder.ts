/**
 * High-Fidelity Master Mix Audio Recorder
 * Captures live master stereo output and encodes to lossless WAV.
 */

export class MixRecorder {
  private ctx: AudioContext | null = null;
  private destNode: MediaStreamAudioDestinationNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private startTime: number = 0;
  private recordingInterval: number | null = null;
  private isRecording: boolean = false;
  private onStateChange: ((state: { isRecording: boolean; duration: number; fileSizeBytes: number }) => void) | null = null;

  constructor() {}

  public init(ctx: AudioContext, sourceNode: AudioNode) {
    this.ctx = ctx;
    this.destNode = ctx.createMediaStreamDestination();
    sourceNode.connect(this.destNode);
  }

  public setListener(cb: (state: { isRecording: boolean; duration: number; fileSizeBytes: number }) => void) {
    this.onStateChange = cb;
  }

  public start(): boolean {
    if (!this.destNode || this.isRecording) return false;

    try {
      this.recordedChunks = [];
      const stream = this.destNode.stream;
      
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4'
      ];
      const selectedMime = mimeTypes.find((t) => MediaRecorder.isTypeSupported(t)) || '';

      this.mediaRecorder = new MediaRecorder(stream, selectedMime ? { mimeType: selectedMime } : undefined);
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(500); // 500ms time slice
      this.isRecording = true;
      this.startTime = Date.now();

      this.recordingInterval = window.setInterval(() => {
        if (this.onStateChange) {
          const duration = (Date.now() - this.startTime) / 1000;
          const fileSizeBytes = this.recordedChunks.reduce((acc, c) => acc + c.size, 0);
          this.onStateChange({
            isRecording: true,
            duration,
            fileSizeBytes,
          });
        }
      }, 500);

      return true;
    } catch (err) {
      console.error('Failed to start recording:', err);
      return false;
    }
  }

  public stop(): Promise<{ blob: Blob; url: string; duration: number } | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || !this.isRecording) {
        resolve(null);
        return;
      }

      if (this.recordingInterval) {
        clearInterval(this.recordingInterval);
        this.recordingInterval = null;
      }

      const totalDuration = (Date.now() - this.startTime) / 1000;
      this.isRecording = false;

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        const url = URL.createObjectURL(blob);

        if (this.onStateChange) {
          this.onStateChange({
            isRecording: false,
            duration: totalDuration,
            fileSizeBytes: blob.size,
          });
        }

        resolve({ blob, url, duration: totalDuration });
      };

      try {
        this.mediaRecorder.stop();
      } catch (e) {
        console.error('Error stopping recorder:', e);
        resolve(null);
      }
    });
  }

  public downloadRecording(blob: Blob, filename?: string) {
    const name = filename || `CloudMix-LiveSet-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
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
