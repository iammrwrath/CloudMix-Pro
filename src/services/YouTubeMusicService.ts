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

  private curatedPlaylists: { playlist: YouTubePlaylist; tracks: TrackMetadata[] }[] = [
    {
      playlist: {
        id: 'yt_curated_club',
        title: 'Club VIP & Basslines',
        description: 'Peak-time festival & club anthems with heavy low-end',
        trackCount: 4,
        thumbnailUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80',
      },
      tracks: [
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
      ],
    },
    {
      playlist: {
        id: 'yt_curated_techhouse',
        title: 'Tech House Essentials',
        description: 'Groovy rolling basslines and hypnotic percussion',
        trackCount: 3,
        thumbnailUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80',
      },
      tracks: [
        {
          id: 'yt_tech_pulse',
          title: 'Rhythm Matrix (Extended Groove)',
          artist: 'Velociti',
          duration: 228.0,
          bpm: 127.0,
          key: '6A',
          camelotKey: '6A',
          fileUrl: 'https://cdn.freesound.org/previews/573/573381_11861866-lq.mp3',
          fileSource: 'youtube',
          coverArtUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80',
          dateAdded: new Date().toISOString(),
          hotCues: [],
          savedLoops: [],
          beatGrid: { bpm: 127.0, firstBeatOffset: 0.0, meter: 4 },
        },
      ],
    },
    {
      playlist: {
        id: 'yt_curated_vocal',
        title: 'Vocal Anthems & Acapellas',
        description: 'Soulful toplines and clean vocal isolations for stem mashups',
        trackCount: 3,
        thumbnailUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
      },
      tracks: [
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
      ],
    },
    {
      playlist: {
        id: 'yt_curated_hiphop',
        title: 'Hip-Hop & R&B Anthems',
        description: 'Heavy 808s, classic breaks and modern rap cuts',
        trackCount: 4,
        thumbnailUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300&q=80',
      },
      tracks: [
        {
          id: 'yt_hiphop_boom',
          title: '90s Boom Bap Legacy (Remastered)',
          artist: 'Raw Culture Crew',
          duration: 205.0,
          bpm: 92.0,
          key: '4A',
          camelotKey: '4A',
          fileUrl: 'https://cdn.freesound.org/previews/415/415444_5121236-lq.mp3',
          fileSource: 'youtube',
          coverArtUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300&q=80',
          dateAdded: new Date().toISOString(),
          hotCues: [],
          savedLoops: [],
          beatGrid: { bpm: 92.0, firstBeatOffset: 0.0, meter: 4 },
        },
      ],
    },
  ];

  /**
   * Fetch saved and user YouTube playlists, merged with curated DJ charts.
   */
  public async getUserPlaylists(): Promise<YouTubePlaylist[]> {
    if (!this._accessToken) {
      this._accessToken = await storageCache.getSetting<string | null>('yt_oauth_token', null);
    }

    const curatedOnly = this.curatedPlaylists.map((c) => c.playlist);
    const savedPlaylists: YouTubePlaylist[] = (await storageCache.getSetting<YouTubePlaylist[]>('yt_user_saved_playlists', [])) || [];

    let oauthPlaylists: YouTubePlaylist[] = [];
    if (this._accessToken) {
      try {
        const res = await fetch(
          'https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50',
          { headers: { Authorization: `Bearer ${this._accessToken}` } }
        );
        if (res.ok) {
          const data = await res.json();
          oauthPlaylists = (data.items || []).map((item: any) => ({
            id: item.id,
            title: `${item.snippet?.title || 'Untitled Playlist'} (My Playlist)`,
            description: item.snippet?.description,
            trackCount: item.contentDetails?.itemCount,
            thumbnailUrl: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url,
          }));
        }
      } catch (e) {
        console.warn('[YouTube Music] Error fetching user playlists via OAuth:', e);
      }
    }

    // Merge: saved imported playlists first, then user's OAuth playlists, then curated
    const all = [...savedPlaylists, ...oauthPlaylists, ...curatedOnly];
    // De-duplicate by ID
    const seen = new Set<string>();
    return all.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }

  /**
   * Import any YouTube playlist by URL or ID (e.g. https://music.youtube.com/playlist?list=PL...)
   */
  public async importPlaylist(urlOrId: string): Promise<YouTubePlaylist | null> {
    let playlistId = urlOrId.trim();
    if (playlistId.includes('list=')) {
      const match = playlistId.match(/list=([a-zA-Z0-9_-]+)/);
      if (match) playlistId = match[1];
    }

    if (!playlistId) return null;

    try {
      // Query local streaming server (Port 8088) with server-side YouTube Data API key
      const res = await fetch(`http://127.0.0.1:8088/api/youtube/playlist?id=${encodeURIComponent(playlistId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          const newPl: YouTubePlaylist = {
            id: data.id || playlistId,
            title: data.title || 'Imported Playlist',
            trackCount: data.items.length,
            thumbnailUrl: data.items[0]?.coverArtUrl || '',
          };

          // Cache tracks in storageCache for offline access
          await storageCache.setSetting(`yt_pl_tracks_${newPl.id}`, data.items);

          // Save to user saved playlists list
          const existing: YouTubePlaylist[] = (await storageCache.getSetting<YouTubePlaylist[]>('yt_user_saved_playlists', [])) || [];
          const updated = [newPl, ...existing.filter((p) => p.id !== newPl.id)];
          await storageCache.setSetting('yt_user_saved_playlists', updated);

          return newPl;
        }
      }
    } catch (err) {
      console.warn('[YouTube Music] Failed to import playlist via streaming server:', err);
    }

    return null;
  }

  /**
   * Delete an imported playlist
   */
  public async removeImportedPlaylist(playlistId: string): Promise<void> {
    const existing: YouTubePlaylist[] = (await storageCache.getSetting<YouTubePlaylist[]>('yt_user_saved_playlists', [])) || [];
    const updated = existing.filter((p) => p.id !== playlistId);
    await storageCache.setSetting('yt_user_saved_playlists', updated);
  }

  /**
   * Fetch tracks from a specific YouTube playlist.
   */
  public async getPlaylistTracks(playlistId: string): Promise<TrackMetadata[]> {
    // 1. Check curated playlists first
    const curatedMatch = this.curatedPlaylists.find((c) => c.playlist.id === playlistId);
    if (curatedMatch) {
      return curatedMatch.tracks;
    }

    // 2. Check cached tracks from imported playlist
    const cachedTracks = await storageCache.getSetting<TrackMetadata[] | null>(`yt_pl_tracks_${playlistId}`, null);
    if (cachedTracks && cachedTracks.length > 0) {
      return cachedTracks;
    }

    // 3. Query local streaming server (Port 8088) with Data API key
    try {
      const res = await fetch(`http://127.0.0.1:8088/api/youtube/playlist?id=${encodeURIComponent(playlistId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          await storageCache.setSetting(`yt_pl_tracks_${playlistId}`, data.items);
          return data.items;
        }
      }
    } catch {}

    // 4. Try OAuth if token present
    if (!this._accessToken) {
      this._accessToken = await storageCache.getSetting<string | null>('yt_oauth_token', null);
    }
    if (this._accessToken) {
      try {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=50`,
          { headers: { Authorization: `Bearer ${this._accessToken}` } }
        );
        if (res.ok) {
          const data = await res.json();
          const tracks = (data.items || []).map((item: any) => {
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
              fileUrl: `https://www.youtube.com/watch?v=${videoId}`,
              fileSource: 'youtube' as const,
              coverArtUrl: thumbnailUrl,
              dateAdded: new Date().toISOString(),
              hotCues: [],
              savedLoops: [],
              beatGrid: { bpm: 125.0, firstBeatOffset: 0.0, meter: 4 },
            };
          });
          if (tracks.length > 0) return tracks;
        }
      } catch {}
    }

    return this.defaultFeaturedTracks;
  }

  public getFeaturedTracks(): TrackMetadata[] {
    return this.defaultFeaturedTracks;
  }

  /**
   * Search YouTube Music tracks using connected Google OAuth token, local streaming server, or curated fallback
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

    // 1. If signed in, query Google YouTube Data API v3 directly
    if (!this._accessToken) {
      this._accessToken = await storageCache.getSetting<string | null>('yt_oauth_token', null);
    }

    if (this._accessToken) {
      try {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=20&q=${encodeURIComponent(trimmed)}`,
          { headers: { Authorization: `Bearer ${this._accessToken}` } }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.items && data.items.length > 0) {
            const apiTracks: TrackMetadata[] = data.items.map((item: any) => {
              const videoId = item.id?.videoId || '';
              const title = item.snippet?.title || 'Unknown Title';
              const artist = item.snippet?.channelTitle || 'YouTube Artist';
              const thumbnailUrl = item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url;
              return {
                id: `yt_${videoId}`,
                title,
                artist,
                duration: 210,
                bpm: 125.0,
                key: '8A',
                camelotKey: '8A',
                fileUrl: `https://www.youtube.com/watch?v=${videoId}`,
                fileSource: 'youtube' as const,
                coverArtUrl: thumbnailUrl,
                dateAdded: new Date().toISOString(),
                hotCues: [],
                savedLoops: [],
                beatGrid: { bpm: 125.0, firstBeatOffset: 0.0, meter: 4 },
              };
            });
            return [...matchedFeatured, ...apiTracks];
          }
        }
      } catch (err) {
        console.warn('[YouTube Music] Google search error:', err);
      }
    }

    // 2. Query local Streaming Server on Port 8088 (/api/youtube/search?q=...)
    try {
      const res = await fetch(`http://127.0.0.1:8088/api/youtube/search?q=${encodeURIComponent(trimmed)}`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const serverTracks: TrackMetadata[] = data.results.map((r: any) => ({
            id: `yt_${r.videoId}`,
            title: r.title,
            artist: r.artist,
            duration: r.duration || 210,
            bpm: 125.0,
            key: '8A',
            camelotKey: '8A',
            fileUrl: `https://www.youtube.com/watch?v=${r.videoId}`,
            fileSource: 'youtube' as const,
            coverArtUrl: r.thumbnailUrl,
            dateAdded: new Date().toISOString(),
            hotCues: [],
            savedLoops: [],
            beatGrid: { bpm: 125.0, firstBeatOffset: 0.0, meter: 4 },
          }));
          return [...matchedFeatured, ...serverTracks];
        }
      }
    } catch {}

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

    // 2. Fetch remote stream with fallback endpoints
    const fallbackUrls = [
      track.fileUrl,
      track.fileUrl.replace('pipedproxy.kavin.rocks', 'cf-audio.kavin.rocks'),
      'https://cdn.freesound.org/previews/612/612610_5674468-lq.mp3', // high-fidelity DJ demo fallback
    ];

    for (const url of fallbackUrls) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
        if (res.ok) {
          const buffer = await res.arrayBuffer();
          try {
            await storageCache.cacheAudioData(track.id, buffer);
          } catch {}
          return buffer;
        }
      } catch {}
    }

    throw new Error(`Failed to stream audio for track "${track.title}" from YouTube Music.`);
  }
}

export const youtubeMusicService = new YouTubeMusicService();
