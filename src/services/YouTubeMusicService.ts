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
  private static readonly TOKEN_STORAGE_KEY = 'cloudmix_yt_oauth_token';
  private _accessToken: string | null = null;
  private _restorePromise: Promise<void>;
  private readonly _authListeners = new Set<(signedIn: boolean) => void>();

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
    this._restorePromise = storageCache.getSetting<string | null>('yt_oauth_token', null).then(async (token) => {
      const browserToken = this.readBrowserToken();
      this._accessToken = token || browserToken || null;
      if (this._accessToken && this._accessToken !== token) {
        await storageCache.setSetting('yt_oauth_token', this._accessToken);
      }
    });
  }

  private readBrowserToken(): string | null {
    try {
      return window.localStorage.getItem(YouTubeMusicService.TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private persistToken(token: string): void {
    try {
      window.localStorage.setItem(YouTubeMusicService.TOKEN_STORAGE_KEY, token);
    } catch {
      // IndexedDB remains the primary persistence store.
    }
  }

  private clearPersistedToken(): void {
    try {
      window.localStorage.removeItem(YouTubeMusicService.TOKEN_STORAGE_KEY);
    } catch {}
  }

  public async isSignedIn(): Promise<boolean> {
    await this._restorePromise;
    return !!this._accessToken;
  }

  public subscribeAuth(listener: (signedIn: boolean) => void): () => void {
    this._authListeners.add(listener);
    return () => this._authListeners.delete(listener);
  }

  private notifyAuthListeners(): void {
    const signedIn = Boolean(this._accessToken);
    this._authListeners.forEach((listener) => listener(signedIn));
  }

  /**
   * Opens a Google OAuth 2.0 popup to sign the user into YouTube Music.
   * Uses implicit grant (token in hash fragment).
   * In Electron, opens a modal BrowserWindow via IPC that intercepts the
   * http://localhost redirect and returns the token directly.
   */
  public async signIn(): Promise<void> {
    await this._restorePromise;
    const storedClientId = (await storageCache.getSetting<string>('yt_client_id', '')) || '';
    const CLIENT_ID = storedClientId.trim() || localStorage.getItem('cloudmix_yt_client_id')?.trim() || '';
    if (!CLIENT_ID) {
      throw new Error(
        'No Client ID set. Paste your Google OAuth Client ID in Settings ? YouTube Music first.'
      );
    }
    const desktopAPI = (window as any).desktopAPI;
    const isElectron = Boolean(desktopAPI?.openOAuthWindow);
    const REDIRECT_URI = isElectron
      ? 'http://127.0.0.1:42813/callback'
      : `${window.location.origin}/oauth-callback`;
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

    // Use Electron's IPC-backed OAuth window (intercepts redirect, no 404).
    if (isElectron) {
      const token: string | null = await desktopAPI.openOAuthWindow(authUrl);
      if (token) {
        this._accessToken = token;
        await storageCache.setSetting('yt_oauth_token', token);
        this.persistToken(token);
        this.notifyAuthListeners();
        this._fetchUserEmail(token);
      }
      return;
    }

    // Browser fallback: the OAuth response is returned in the popup hash.
    // The client ID and token remain in this origin's local IndexedDB.
    const popup = window.open(authUrl, 'cloudmix-google-oauth', 'popup,width=520,height=700');
    if (!popup) {
      throw new Error('Google sign-in was blocked. Allow popups for this CloudMix address and try again.');
    }

    const token = await new Promise<string | null>((resolve) => {
      const startedAt = Date.now();
      const poll = window.setInterval(() => {
        if (popup.closed || Date.now() - startedAt > 120000) {
          window.clearInterval(poll);
          if (!popup.closed) popup.close();
          resolve(null);
          return;
        }

        try {
          const hash = popup.location.hash;
          if (!hash) return;
          const params = new URLSearchParams(hash.slice(1));
          const error = params.get('error');
          const accessToken = params.get('access_token');
          if (error || accessToken) {
            window.clearInterval(poll);
            popup.close();
            resolve(accessToken);
          }
        } catch {
          // The popup remains cross-origin until Google redirects back.
        }
      }, 250);
    });

    if (!token) {
      throw new Error('Google sign-in was cancelled or timed out.');
    }
    this._accessToken = token;
    await storageCache.setSetting('yt_oauth_token', token);
    this.persistToken(token);
    this.notifyAuthListeners();
    this._fetchUserEmail(token);
  }

  public signOut(): void {
    this._accessToken = null;
    storageCache.setSetting('yt_oauth_token', null);
    storageCache.setSetting('yt_email', null);
    this.clearPersistedToken();
    this.notifyAuthListeners();
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
    await this._restorePromise;
    if (!this._accessToken) {
      throw new Error('YouTube Music is not signed in in this browser. Open Settings ? YouTube Music and connect an account.');
    }
    try {
      const playlists: YouTubePlaylist[] = [];
      let pageToken = '';
      do {
        const params = new URLSearchParams({
          part: 'snippet,contentDetails',
          mine: 'true',
          maxResults: '50',
        });
        if (pageToken) params.set('pageToken', pageToken);
        const res = await fetch(`https://www.googleapis.com/youtube/v3/playlists?${params}`, {
          headers: { Authorization: `Bearer ${this._accessToken}` },
        });
        if (!res.ok) {
          if (res.status === 401) await this.invalidateExpiredToken();
          const detail = await this.readApiError(res);
          throw new Error(`YouTube playlists request failed (${res.status}): ${detail}`);
        }
        const data = await res.json();
        playlists.push(...(data.items || []).map((item: any) => ({
          id: item.id,
          title: item.snippet?.title || 'Untitled Playlist',
          description: item.snippet?.description,
          trackCount: item.contentDetails?.itemCount,
          thumbnailUrl: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url,
        })));
        pageToken = data.nextPageToken || '';
      } while (pageToken);
      return playlists;
    } catch (error) {
      console.error('Failed to load YouTube playlists:', error);
      throw error;
    }
  }

  /**
   * Fetch tracks from a specific YouTube playlist.
   */
  public async getPlaylistTracks(playlistId: string): Promise<TrackMetadata[]> {
    await this._restorePromise;
    if (!this._accessToken) {
      throw new Error('YouTube Music is not signed in in this browser. Open Settings ? YouTube Music and connect an account.');
    }
    try {
      const items: any[] = [];
      let pageToken = '';
      do {
        const params = new URLSearchParams({
          part: 'snippet,contentDetails',
          playlistId,
          maxResults: '50',
        });
        if (pageToken) params.set('pageToken', pageToken);
        const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params}`, {
          headers: { Authorization: `Bearer ${this._accessToken}` },
        });
        if (!res.ok) {
          if (res.status === 401) await this.invalidateExpiredToken();
          const detail = await this.readApiError(res);
          throw new Error(`YouTube playlist request failed (${res.status}): ${detail}`);
        }
        const data = await res.json();
        items.push(...(data.items || []));
        pageToken = data.nextPageToken || '';
      } while (pageToken);

      return items.filter((item) => item.snippet?.resourceId?.videoId).map((item: any) => {
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
    } catch (error) {
      console.error(`Failed to load YouTube playlist ${playlistId}:`, error);
      throw error;
    }
  }

  public getFeaturedTracks(): TrackMetadata[] {
    return this.defaultFeaturedTracks;
  }

  /**
   * Search YouTube Music tracks using public Invidious / Piped instances or local fallback
   */
  public async searchTracks(query: string): Promise<TrackMetadata[]> {
    await this._restorePromise;
    const trimmed = query.trim();
    if (!trimmed) return this.defaultFeaturedTracks;

    // Filter local featured first
    const matchedFeatured = this.defaultFeaturedTracks.filter(
      (t) =>
        t.title.toLowerCase().includes(trimmed.toLowerCase()) ||
        t.artist.toLowerCase().includes(trimmed.toLowerCase())
    );

    if (this._accessToken) {
      try {
        const searchParams = new URLSearchParams({
          part: 'snippet',
          q: trimmed,
          type: 'video',
          videoCategoryId: '10',
          maxResults: '25',
        });
        const searchRes = await fetch(`https://www.googleapis.com/youtube/v3/search?${searchParams}`, {
          headers: { Authorization: `Bearer ${this._accessToken}` },
        });
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          const items = (searchData.items || []).filter((item: any) => item.id?.videoId);
          const ids = items.map((item: any) => item.id.videoId).join(',');
          const detailsRes = ids
            ? await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${encodeURIComponent(ids)}`, {
              headers: { Authorization: `Bearer ${this._accessToken}` },
            })
            : null;
          const details = detailsRes?.ok ? await detailsRes.json() : { items: [] };
          const durations = new Map<string, number>(
            (details.items || []).map((item: any) => [item.id, this.parseDuration(item.contentDetails?.duration)])
          );
          return items.map((item: any) => {
            const videoId = item.id.videoId;
            return this.createYouTubeTrack(
              videoId,
              item.snippet?.title || 'Unknown Title',
              item.snippet?.channelTitle || 'YouTube Music',
              durations.get(videoId) || 180,
              item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url
            );
          });
        }
      } catch (error) {
        console.warn('Authenticated YouTube search failed; trying public search:', error);
      }
    }

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

                return this.createYouTubeTrack(videoId, title, artist, duration, item.thumbnail || item.thumbnailUrl);
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

  private async invalidateExpiredToken(): Promise<void> {
    this._accessToken = null;
    await storageCache.setSetting('yt_oauth_token', null);
    this.clearPersistedToken();
    this.notifyAuthListeners();
  }

  private async readApiError(response: Response): Promise<string> {
    try {
      const data = await response.json();
      return data.error?.message || data.error?.errors?.[0]?.reason || response.statusText || 'Unknown Google API error';
    } catch {
      return response.statusText || 'Unknown Google API error';
    }
  }

  private createYouTubeTrack(
    videoId: string,
    title: string,
    artist: string,
    duration: number,
    coverArtUrl?: string
  ): TrackMetadata {
    return {
      id: `yt_${videoId}`,
      title,
      artist,
      duration,
      bpm: 125.0,
      key: '8A',
      camelotKey: '8A',
      fileUrl: `https://pipedproxy.kavin.rocks/audio?id=${videoId}`,
      fileSource: 'youtube',
      coverArtUrl,
      dateAdded: new Date().toISOString(),
      hotCues: [],
      savedLoops: [],
      beatGrid: { bpm: 125.0, firstBeatOffset: 0.0, meter: 4 },
    };
  }

  private parseDuration(value?: string): number {
    if (!value) return 180;
    const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
    if (!match) return 180;
    return (Number(match[1] || 0) * 3600) + (Number(match[2] || 0) * 60) + Number(match[3] || 0);
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

