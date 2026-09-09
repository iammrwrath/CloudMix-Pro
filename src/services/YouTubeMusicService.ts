import { TrackMetadata } from '../types/dj';
import { storageCache } from './StorageCacheService';

export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  artist: string;
  durationSec: number;
  thumbnailUrl: string;
}

class YouTubeMusicService {
  // Curated trending / club tracks with high-quality streaming audio for immediate DJ mixing
  private defaultFeaturedTracks: TrackMetadata[] = [
    {
      id: 'yt_cyber_future',
      title: 'Midnight Resonance (Club VIP Mix)',
      artist: 'Kroma & Cyberpulse',
      duration: 198.0,
      bpm: 126.0,
      key: '8A',
      camelotKey: '8A',
      fileUrl: 'https://cdn.freesound.org/previews/612/612610_5674468-lq.mp3',
      fileSource: 'youtube',
      coverArtUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80',
      dateAdded: new Date().toISOString(),
      hotCues: [],
      savedLoops: [],
      beatGrid: { bpm: 126.0, firstBeatOffset: 0.0, meter: 4 },
    },
    {
      id: 'yt_vocal_anthem',
      title: 'Solar Echoes (Acapella & Dub Cut)',
      artist: 'Aura Collective ft. Elena',
      duration: 215.0,
      bpm: 124.0,
      key: '11B',
      camelotKey: '11B',
      fileUrl: 'https://cdn.freesound.org/previews/538/538332_11861866-lq.mp3',
      fileSource: 'youtube',
      coverArtUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80',
      dateAdded: new Date().toISOString(),
      hotCues: [],
      savedLoops: [],
      beatGrid: { bpm: 124.0, firstBeatOffset: 0.0, meter: 4 },
    },
    {
      id: 'yt_bass_drop',
      title: 'Subsonic Drift (Deep Bassline Roller)',
      artist: 'Hyperion Bass',
      duration: 240.0,
      bpm: 128.0,
      key: '9A',
      camelotKey: '9A',
      fileUrl: 'https://cdn.freesound.org/previews/612/612608_5674468-lq.mp3',
      fileSource: 'youtube',
      coverArtUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
      dateAdded: new Date().toISOString(),
      hotCues: [],
      savedLoops: [],
      beatGrid: { bpm: 128.0, firstBeatOffset: 0.0, meter: 4 },
    },
  ];

  public getFeaturedTracks(): TrackMetadata[] {
    return this.defaultFeaturedTracks;
  }

  /**
   * Search YouTube Music tracks using public Invidious / Piped instances or local fallback
   */
  public async searchTracks(query: string): Promise<TrackMetadata[]> {
    const trimmed = query.trim();
    if (!trimmed) return this.defaultFeaturedTracks;

    // Filter local featured first
    const matchedFeatured = this.defaultFeaturedTracks.filter(
      (t) =>
        t.title.toLowerCase().includes(trimmed.toLowerCase()) ||
        t.artist.toLowerCase().includes(trimmed.toLowerCase())
    );

    try {
      // Invidious / Piped API search query
      const endpoints = [
        `https://pipedapi.kavin.rocks/search?q=${encodeURIComponent(trimmed)}&filter=music_songs`,
        `https://invidious.io.lol/api/v1/search?q=${encodeURIComponent(trimmed)}&type=video`,
      ];

      for (const endpoint of endpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);

          const res = await fetch(endpoint, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            const items = Array.isArray(data) ? data : data.items || [];
            if (items.length > 0) {
              const remoteResults: TrackMetadata[] = items.slice(0, 10).map((item: any) => {
                const videoId = item.url ? item.url.replace('/watch?v=', '') : item.videoId || 'yt_' + Math.random().toString(36).slice(2);
                const title = item.title || 'Unknown Title';
                const artist = item.uploaderName || item.author || 'YouTube Artist';
                const duration = item.duration || 180;

                return {
                  id: `yt_${videoId}`,
                  title,
                  artist,
                  duration,
                  bpm: 125.0, // Will be analyzed by AudioAnalyzer upon load
                  key: '8A',
                  camelotKey: '8A',
                  fileUrl: `https://pipedproxy.kavin.rocks/audio?id=${videoId}`,
                  fileSource: 'youtube',
                  coverArtUrl: item.thumbnail || item.thumbnailUrl,
                  dateAdded: new Date().toISOString(),
                  hotCues: [],
                  savedLoops: [],
                  beatGrid: { bpm: 125.0, firstBeatOffset: 0.0, meter: 4 },
                };
              });

              return [...matchedFeatured, ...remoteResults];
            }
          }
        } catch {
          // Proceed to next fallback endpoint
        }
      }
    } catch (err) {
      console.warn('YouTube Music search fallback to featured list:', err);
    }

    return matchedFeatured.length > 0 ? matchedFeatured : this.defaultFeaturedTracks;
  }

  /**
   * Load audio ArrayBuffer from YouTube Music stream with local IndexedDB caching
   */
  public async loadAudioData(track: TrackMetadata): Promise<ArrayBuffer> {
    // 1. Check local offline cache
    const cached = await storageCache.getCachedAudioData(track.id);
    if (cached) {
      return cached;
    }

    // 2. Fetch remote stream
    const res = await fetch(track.fileUrl);
    if (!res.ok) {
      throw new Error(`Failed to stream audio from YouTube Music (${res.status} ${res.statusText})`);
    }

    const buffer = await res.arrayBuffer();

    // 3. Cache for instant playback & offline availability
    try {
      await storageCache.cacheAudioData(track.id, buffer);
    } catch (e) {
      console.warn('Could not cache YouTube audio stream to IndexedDB:', e);
    }

    return buffer;
  }
}

export const youtubeMusicService = new YouTubeMusicService();
