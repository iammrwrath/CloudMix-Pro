import { TrackMetadata, LyricsLine, DeckState } from '../types/dj';

export interface OverlayConfig {
  showCurrentTrack: boolean;
  showNextTrack: boolean;
  showLyrics: boolean;
  showVideo: boolean;
}

export interface NowPlayingState {
  activeDeck: 'A' | 'B' | null;
  trackA: TrackMetadata | null;
  trackB: TrackMetadata | null;
  nextTrack: TrackMetadata | null;
  elapsedSecA: number;
  elapsedSecB: number;
  isPlayingA: boolean;
  isPlayingB: boolean;
  currentLyrics: LyricsLine | null;
  overlayConfig?: OverlayConfig;
  youtubeVideoId?: string | null;
}

export class BroadcastService {
  private listeners: Set<(state: NowPlayingState) => void> = new Set();
  private currentState: NowPlayingState = {
    activeDeck: null,
    trackA: null,
    trackB: null,
    nextTrack: null,
    elapsedSecA: 0,
    elapsedSecB: 0,
    isPlayingA: false,
    isPlayingB: false,
    currentLyrics: null,
    overlayConfig: {
      showCurrentTrack: true,
      showNextTrack: true,
      showLyrics: true,
      showVideo: true,
    },
    youtubeVideoId: null,
  };

  private lastBroadcastSig: string = '';

  public update(stateUpdates: Partial<NowPlayingState>) {
    this.currentState = { ...this.currentState, ...stateUpdates };
    this.listeners.forEach((cb) => cb(this.currentState));

    // Native Desktop StreamerBot / OBS writer
    if (typeof window !== 'undefined' && (window as any).desktopAPI) {
      const activeTrack = this.currentState.activeDeck === 'B' ? this.currentState.trackB : this.currentState.trackA;
      const isPlaying = this.currentState.activeDeck === 'B' ? this.currentState.isPlayingB : this.currentState.isPlayingA;
      const elapsedSec = Math.floor(this.currentState.activeDeck === 'B' ? this.currentState.elapsedSecB : this.currentState.elapsedSecA);
      const nextTrack = this.currentState.nextTrack;
      const overlayConfig = this.currentState.overlayConfig;
      const lyrics = this.currentState.currentLyrics;

      // Extract YouTube Video ID if track is from YouTube or has YouTube ID
      let youtubeVideoId = this.currentState.youtubeVideoId || null;
      if (!youtubeVideoId && activeTrack) {
        if (activeTrack.fileSource === 'youtube' && activeTrack.id.startsWith('yt_')) {
          youtubeVideoId = activeTrack.id.replace('yt_', '');
        } else if (activeTrack.fileUrl && activeTrack.fileUrl.includes('id=')) {
          const match = activeTrack.fileUrl.match(/id=([a-zA-Z0-9_-]{11})/);
          if (match) youtubeVideoId = match[1];
        }
      }

      if (activeTrack) {
        // Debounce IPC calls so we don't bombard Electron with repetitive payload
        const sig = `${activeTrack.id}-${this.currentState.activeDeck}-${isPlaying}-${elapsedSec}-${nextTrack?.id}-${lyrics?.text}-${JSON.stringify(overlayConfig)}`;
        if (sig === this.lastBroadcastSig) return;
        this.lastBroadcastSig = sig;

        if ((window as any).desktopAPI.writeNowPlayingBroadcast) {
          (window as any).desktopAPI.writeNowPlayingBroadcast({
            title: activeTrack.title,
            artist: activeTrack.artist,
            bpm: activeTrack.bpm,
            key: activeTrack.camelotKey || activeTrack.key,
            deck: this.currentState.activeDeck || 'A',
          });
        }
        if ((window as any).desktopAPI.updateStreamingBroadcast) {
          (window as any).desktopAPI.updateStreamingBroadcast({
            activeDeck: this.currentState.activeDeck || 'A',
            title: activeTrack.title,
            artist: activeTrack.artist,
            bpm: activeTrack.bpm,
            key: activeTrack.camelotKey || activeTrack.key,
            deck: this.currentState.activeDeck || 'A',
            elapsedSec,
            duration: activeTrack.duration || 180,
            isPlaying,
            coverArtUrl: activeTrack.coverArtUrl || '',
            nextTrack: nextTrack ? {
              title: nextTrack.title,
              artist: nextTrack.artist,
              bpm: nextTrack.bpm,
              key: nextTrack.camelotKey || nextTrack.key,
              coverArtUrl: nextTrack.coverArtUrl || '',
            } : null,
            lyrics: lyrics ? {
              text: lyrics.text,
              translation: lyrics.translation || '',
            } : null,
            overlayConfig,
            youtubeVideoId,
          });
        }
      }
    }
  }

  public subscribe(cb: (state: NowPlayingState) => void): () => void {
    this.listeners.add(cb);
    cb(this.currentState);
    return () => {
      this.listeners.delete(cb);
    };
  }

  public getState(): NowPlayingState {
    return this.currentState;
  }

  /**
   * Parse LRC lyrics format with timestamps like [01:23.45] Lyric text
   */
  public static parseLRC(lrcText: string): LyricsLine[] {
    const lines = lrcText.split('\n');
    const result: LyricsLine[] = [];
    const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      if (!trimmed) continue;

      let match;
      const timestamps: number[] = [];
      while ((match = timeRegex.exec(trimmed)) !== null) {
        const min = parseInt(match[1], 10);
        const sec = parseInt(match[2], 10);
        const ms = match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3), 10) : 0;
        timestamps.push((min * 60 + sec) * 1000 + ms);
      }

      const text = trimmed.replace(/\[\d{2}:\d{2}(?:\.\d{2,3})?\]/g, '').trim();
      if (text) {
        for (const ts of timestamps) {
          result.push({ timestampMs: ts, text });
        }
      }
    }

    result.sort((a, b) => a.timestampMs - b.timestampMs);
    return result;
  }
}

export const broadcastService = new BroadcastService();
