import { TrackMetadata, LyricsLine, DeckState } from '../types/dj';
import { lyricsService } from './LyricsService';
import { streamerbotService } from './StreamerbotService';

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
  private loadedLyricsTrackKey: string = '';
  private activeLyricsLines: LyricsLine[] = [];
  private currentVideoSearchKey: string = '';

  public update(stateUpdates: Partial<NowPlayingState>) {
    this.currentState = { ...this.currentState, ...stateUpdates };

    let activeDeck: 'A' | 'B' = this.currentState.activeDeck || 'A';
    if (this.currentState.isPlayingB && !this.currentState.isPlayingA) {
      activeDeck = 'B';
    } else if (this.currentState.isPlayingA && !this.currentState.isPlayingB) {
      activeDeck = 'A';
    } else if (!this.currentState.trackA && this.currentState.trackB) {
      activeDeck = 'B';
    }
    this.currentState.activeDeck = activeDeck;

    const activeTrack = activeDeck === 'B' ? this.currentState.trackB : this.currentState.trackA;
    const elapsedSec = Math.floor(activeDeck === 'B' ? this.currentState.elapsedSecB : this.currentState.elapsedSecA);
    const isPlaying = activeDeck === 'B' ? this.currentState.isPlayingB : this.currentState.isPlayingA;

    // 1. Auto-Fetch Synchronized LRC Lyrics when active track loads/changes
    if (activeTrack && activeTrack.title) {
      const trackKey = `${activeTrack.artist || ''} - ${activeTrack.title}`;
      if (this.loadedLyricsTrackKey !== trackKey) {
        this.loadedLyricsTrackKey = trackKey;
        this.activeLyricsLines = [];
        this.currentState.currentLyrics = null;

        lyricsService.fetchLyrics(activeTrack.artist, activeTrack.title, activeTrack.duration).then((lines) => {
          if (this.loadedLyricsTrackKey === trackKey) {
            this.activeLyricsLines = lines;
            const line = lyricsService.getLineAtTime(lines, elapsedSec);
            if (line) {
              this.currentState.currentLyrics = line;
              this.notify();
            }
          }
        });
      } else if (this.activeLyricsLines.length > 0) {
        // Sync active lyric line with elapsed audio playback seconds
        const line = lyricsService.getLineAtTime(this.activeLyricsLines, elapsedSec);
        if (line && (!this.currentState.currentLyrics || this.currentState.currentLyrics.text !== line.text)) {
          this.currentState.currentLyrics = line;
        }
      }
    }

    // 2. Extract or Resolve YouTube Video ID
    let youtubeVideoId = this.currentState.youtubeVideoId || null;
    if (activeTrack) {
      if (activeTrack.fileSource === 'youtube' && activeTrack.id.startsWith('yt_')) {
        youtubeVideoId = activeTrack.id.replace('yt_', '');
      } else if (activeTrack.fileUrl && activeTrack.fileUrl.includes('id=')) {
        const match = activeTrack.fileUrl.match(/id=([a-zA-Z0-9_-]{11})/);
        if (match) youtubeVideoId = match[1];
      }
    }

    if (youtubeVideoId && youtubeVideoId !== this.currentState.youtubeVideoId) {
      this.currentState.youtubeVideoId = youtubeVideoId;
    }

    this.notify();

    // Native Desktop StreamerBot / OBS writer
    if (typeof window !== 'undefined' && (window as any).desktopAPI) {
      const nextTrack = this.currentState.nextTrack;
      const overlayConfig = this.currentState.overlayConfig;
      const lyrics = this.currentState.currentLyrics;
      const activeVid = this.currentState.youtubeVideoId;

      if (activeTrack) {
        // Debounce IPC calls so we don't bombard Electron with repetitive payload
        const sig = `${activeTrack.id}-${activeDeck}-${isPlaying}-${elapsedSec}-${nextTrack?.id}-${lyrics?.text}-${activeVid}-${JSON.stringify(overlayConfig)}`;
        if (sig === this.lastBroadcastSig) return;
        this.lastBroadcastSig = sig;

        // Universal Streamer.bot event trigger
        if (isPlaying) {
          streamerbotService.onTrackChange(activeTrack, activeDeck);
        }

        if ((window as any).desktopAPI.writeNowPlayingBroadcast) {
          (window as any).desktopAPI.writeNowPlayingBroadcast({
            title: activeTrack.title,
            artist: activeTrack.artist,
            bpm: activeTrack.bpm,
            key: activeTrack.camelotKey || activeTrack.key,
            deck: activeDeck,
          });
        }
        if ((window as any).desktopAPI.updateStreamingBroadcast) {
          (window as any).desktopAPI.updateStreamingBroadcast({
            activeDeck: activeDeck,
            title: activeTrack.title,
            artist: activeTrack.artist,
            bpm: activeTrack.bpm,
            key: activeTrack.camelotKey || activeTrack.key,
            deck: activeDeck,
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
            youtubeVideoId: activeVid,
          });
        }
      }
    }
  }

  private notify() {
    this.listeners.forEach((cb) => cb(this.currentState));
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
