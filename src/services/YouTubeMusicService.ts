import { TrackMetadata } from '../types/dj';
import { storageCache } from './StorageCacheService';

export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  artist: string;
  durationSec: number;
  thumbnailUrl: string;
}

export interface YouTubePlaylist {
  id: string;
  title: string;
  description?: string;
  trackCount?: number;
  thumbnailUrl?: string;
}

class YouTubeMusicService {
  private _accessToken: string | null = null;

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

  constructor() {
    // Restore saved token on init
    storageCache.getSetting<string | null>('yt_oauth_token', null).then((token) => {
      if (token) this._accessToken = token;
    });
  }

  public isSignedIn(): boolean {
    return !!this._accessToken;
  }

  /**
   * Opens a Google OAuth 2.0 popup to sign the user into YouTube Music.
   * Uses implicit grant (token in hash fragment).
   * In Electron, opens a modal BrowserWindow via IPC that intercepts the
   * http://localhost redirect and returns the token directly.
   */
  public async signIn(): Promise<void> {
    const CLIENT_ID = (await storageCache.getSetting<string>('yt_client_id', '')) || '';
    if (!CLIENT_ID) {
      throw new Error(
        'No Client ID set. Paste your Google OAuth Client ID in Settings → YouTube Music first.'
      );
    }
    const REDIRECT_URI = 'http://127.0.0.1:42813/callback';
    const SCOPES = [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' ');

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${encodeURIComponent(CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&response_type=token` +
      `&scope=${encodeURIComponent(SCOPES)}` +
      `&prompt=select_account`;

    // Use Electron's IPC-backed OAuth window (intercepts redirect, no 404)
    const desktopAPI = (window as any).desktopAPI;
    if (desktopAPI?.openOAuthWindow) {
      const token: string | null = await desktopAPI.openOAuthWindow(authUrl);
      if (token) {
        this._accessToken = token;
        await storageCache.setSetting('yt_oauth_token', token);
        this._fetchUserEmail(token);
      }
      return;
    }

    // Fallback for non-Electron environments (dev/browser mode)
    throw new Error('OAuth requires the Electron desktop app.');
  }

  public signOut(): void {
    this._accessToken = null;
    storageCache.setSetting('yt_oauth_token', null);
    storageCache.setSetting('yt_email', null);
  }

  private async _fetchUserEmail(token: string): Promise<void> {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.email) {
          await storageCache.setSetting('yt_email', data.email);
        }
      }
    } catch {}
  }

  /**
   * Fetch the signed-in user's YouTube Music playlists.
   */
  public async getUserPlaylists(): Promise<YouTubePlaylist[]> {
    if (!this._accessToken) {
      this._accessToken = await storageCache.getSetting<string | null>('yt_oauth_token', null);
    }
    if (!this._accessToken) return [];
    try {
      const res = await fetch(
        'https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50',
        { headers: { Authorization: `Bearer ${this._accessToken}` } }
      );
      if (!res.ok) {
        console.warn(`[YouTube Music] Failed to fetch playlists: ${res.status} ${res.statusText}`);
        return [];
      }
      const data = await res.json();
      return (data.items || []).map((item: any) => ({
        id: item.id,
        title: item.snippet?.title || 'Untitled Playlist',
        description: item.snippet?.description,
        trackCount: item.contentDetails?.itemCount,
        thumbnailUrl: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url,
      }));
    } catch (e) {
      console.warn('[YouTube Music] Error fetching playlists:', e);
      return [];
    }
  }

  /**
   * Fetch tracks from a specific YouTube playlist.
   */
  public async getPlaylistTracks(playlistId: string): Promise<TrackMetadata[]> {
    if (!this._accessToken) {
      this._accessToken = await storageCache.getSetting<string | null>('yt_oauth_token', null);
    }
    if (!this._accessToken) return [];
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=50`,
        { headers: { Authorization: `Bearer ${this._accessToken}` } }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data.items || []).map((item: any) => {
        const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId || '';
        const title = item.snippet?.title || 'Unknown Title';
        const thumbnailUrl = item.snippet?.thumbnails?.medium?.url;
        let trackTitle = title;
        let artist = 'YouTube Music';
        if (title.includes(' - ')) {
          const parts = title.split(' - ');
          artist = parts[0].trim();
          trackTitle = parts.slice(1).join(' - ').trim();
        }
        return {
          id: `yt_${videoId}`,
          title: trackTitle,
          artist,
          duration: 210,
          bpm: 125.0,
          key: '8A',
          camelotKey: '8A',
          fileUrl: `https://pipedproxy.kavin.rocks/audio?id=${videoId}`,
          fileSource: 'youtube' as const,
          coverArtUrl: thumbnailUrl,
          dateAdded: new Date().toISOString(),
          hotCues: [],
          savedLoops: [],
          beatGrid: { bpm: 125.0, firstBeatOffset: 0.0, meter: 4 },
        };
      });
    } catch {
      return [];
    }
  }

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
                  bpm: 125.0,
                  key: '8A',
                  camelotKey: '8A',
                  fileUrl: `https://pipedproxy.kavin.rocks/audio?id=${videoId}`,
                  fileSource: 'youtube' as const,
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
    const res = await fetch(track.fileUrl, { signal: AbortSignal.timeout(4000) });
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
