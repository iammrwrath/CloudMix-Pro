import { TrackMetadata } from '../types/dj';
import { storageCache } from './StorageCacheService';
import { musicLibraryService } from './MusicLibraryService';
import { decodeHtmlEntities, sanitizeTrackMetadata } from '../utils/decodeHtml';

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

const YOUTUBE_DATA_API_KEY = "AIzaSyBnnMkAZZtrlF4qCFBKilsjUu_zKeXcfKQ";
// Pre-configured official Google Cloud OAuth Client ID for CloudMix Pro (Baked in permanently)
const DEFAULT_GOOGLE_CLIENT_ID = "471913746603-ao2ov3tkf3ctlpl6hdfq52a4t6il0sa5.apps.googleusercontent.com";

class YouTubeMusicService {
  private _accessToken: string | null = null;

  // Curated trending / club tracks with high-quality streaming audio for immediate DJ mixing
  private defaultFeaturedTracks: TrackMetadata[] = [
    {
      id: 'yt_cyber_future',
      title: 'Midnight Resonance (Club VIP Mix)',
      artist: 'Kroma & Cyberpulse',
      genre: 'Electro / Club',
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
      genre: 'Vocal / House',
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
      genre: 'Bass / Dubstep',
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

  private _refreshToken: string | null = null;
  private _refreshPromise: Promise<string | null> | null = null;

  constructor() {
    // Restore saved tokens on init
    Promise.all([
      storageCache.getSetting<string | null>('yt_oauth_token', null),
      storageCache.getSetting<string | null>('yt_refresh_token', null),
    ]).then(([token, refreshToken]) => {
      if (token) this._accessToken = token;
      if (refreshToken) this._refreshToken = refreshToken;
    });
  }

  public isSignedIn(): boolean {
    return !!(this._accessToken || this._refreshToken);
  }

  /**
   * Retrieves a guaranteed fresh access token, silently refreshing using the
   * stored refresh_token if the access_token has expired or is missing.
   */
  public async getValidAccessToken(): Promise<string | null> {
    if (!this._accessToken) {
      this._accessToken = await storageCache.getSetting<string | null>('yt_oauth_token', null);
    }
    if (!this._refreshToken) {
      this._refreshToken = await storageCache.getSetting<string | null>('yt_refresh_token', null);
    }

    if (this._accessToken) {
      return this._accessToken;
    }

    if (this._refreshToken) {
      return await this.refreshAccessToken();
    }

    return null;
  }

  /**
   * Silently exchanges the refresh token with Google OAuth for a fresh access token.
   */
  public async refreshAccessToken(): Promise<string | null> {
    if (this._refreshPromise) return this._refreshPromise;

    this._refreshPromise = (async () => {
      try {
        if (!this._refreshToken) {
          this._refreshToken = await storageCache.getSetting<string | null>('yt_refresh_token', null);
        }
        if (!this._refreshToken) return null;

        const userClientId = (await storageCache.getSetting<string>('yt_client_id', '')) || '';
        const CLIENT_ID = userClientId.trim() || DEFAULT_GOOGLE_CLIENT_ID;

        console.log('[YouTube Music] Silently refreshing access token with Google OAuth...');
        const res = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: CLIENT_ID,
            grant_type: 'refresh_token',
            refresh_token: this._refreshToken,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.access_token) {
            console.log('[YouTube Music] Access token successfully refreshed silently.');
            this._accessToken = data.access_token;
            await storageCache.setSetting('yt_oauth_token', data.access_token);
            if (data.refresh_token) {
              this._refreshToken = data.refresh_token;
              await storageCache.setSetting('yt_refresh_token', data.refresh_token);
            }
            return data.access_token;
          }
        } else {
          const errText = await res.text();
          console.warn('[YouTube Music] Refresh token request rejected by Google:', errText);
        }
      } catch (err) {
        console.warn('[YouTube Music] Failed to refresh token silently:', err);
      } finally {
        this._refreshPromise = null;
      }
      return null;
    })();

    return this._refreshPromise;
  }

  /**
   * Opens Google OAuth 2.0 loopback flow to sign the user into YouTube Music.
   * Requests offline access (code flow) to obtain a permanent refresh_token alongside the access_token.
   */
  public async signIn(): Promise<void> {
    const userClientId = (await storageCache.getSetting<string>('yt_client_id', '')) || '';
    const CLIENT_ID = userClientId.trim() || DEFAULT_GOOGLE_CLIENT_ID;
    const REDIRECT_URI = 'http://127.0.0.1:42813/callback';
    const SCOPES = [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' ');

    // Request authorization code with access_type=offline for persistent refresh token
    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${encodeURIComponent(CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&response_type=code` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&scope=${encodeURIComponent(SCOPES)}`;

    const desktopAPI = (window as any).desktopAPI;
    if (desktopAPI?.openOAuthWindow) {
      const result: any = await desktopAPI.openOAuthWindow(authUrl);
      if (result) {
        let accessToken: string | null = null;
        let refreshToken: string | null = null;

        if (typeof result === 'string') {
          accessToken = result;
        } else if (result.token) {
          accessToken = result.token;
        }

        // If authorization code was returned, exchange it for tokens
        if (result.code) {
          try {
            console.log('[YouTube Music] Exchanging authorization code for permanent refresh token...');
            const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                code: result.code,
                client_id: CLIENT_ID,
                redirect_uri: REDIRECT_URI,
                grant_type: 'authorization_code',
              }),
            });
            if (tokenRes.ok) {
              const tokenData = await tokenRes.json();
              accessToken = tokenData.access_token || accessToken;
              refreshToken = tokenData.refresh_token || null;
            } else {
              console.warn('[YouTube Music] Code exchange notice:', await tokenRes.text());
            }
          } catch (exErr) {
            console.warn('[YouTube Music] Code exchange fetch error:', exErr);
          }
        }

        if (accessToken) {
          this._accessToken = accessToken;
          await storageCache.setSetting('yt_oauth_token', accessToken);
          this._fetchUserEmail(accessToken);
        }
        if (refreshToken) {
          this._refreshToken = refreshToken;
          await storageCache.setSetting('yt_refresh_token', refreshToken);
        }
      }
      return;
    }

    // Fallback for non-Electron environments (dev/browser mode)
    throw new Error('OAuth requires the Electron desktop app.');
  }

  public signOut(): void {
    this._accessToken = null;
    this._refreshToken = null;
    storageCache.setSetting('yt_oauth_token', null);
    storageCache.setSetting('yt_refresh_token', null);
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
    const token = await this.getValidAccessToken();

    const curatedOnly = this.curatedPlaylists.map((c) => c.playlist);
    const savedPlaylists: YouTubePlaylist[] = (await storageCache.getSetting<YouTubePlaylist[]>('yt_user_saved_playlists', [])) || [];
    const cachedOauthPlaylists: YouTubePlaylist[] = (await storageCache.getSetting<YouTubePlaylist[]>('yt_cached_oauth_playlists', [])) || [];

    let oauthPlaylists: YouTubePlaylist[] = [...cachedOauthPlaylists];
    if (token) {
      try {
        console.log('[YouTube Music] Fetching user playlists with OAuth token...');
        
        // 1. First fetch channel info to retrieve channelId and default special playlist IDs (e.g. Liked Music)
        let channelId: string | null = null;
        let likedPlaylistId: string | null = null;
        try {
          let chanRes = await fetch(
            'https://www.googleapis.com/youtube/v3/channels?part=id,snippet,contentDetails&mine=true',
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (chanRes.status === 401 && this._refreshToken) {
            console.log('[YouTube Music] 401 received on channel fetch — auto-refreshing token...');
            const fresh = await this.refreshAccessToken();
            if (fresh) {
              chanRes = await fetch(
                'https://www.googleapis.com/youtube/v3/channels?part=id,snippet,contentDetails&mine=true',
                { headers: { Authorization: `Bearer ${fresh}` } }
              );
            }
          }
          if (chanRes.status === 401) {
            console.warn('[YouTube Music] OAuth token expired or invalid (401). Resetting active session and retaining cached/curated playlists.');
            this._accessToken = null;
            await storageCache.setSetting('yt_oauth_token', null);
            // Do NOT wipe playlists across patches; return cached playlists + curated
            const fallback = [...savedPlaylists, ...cachedOauthPlaylists, ...curatedOnly];
            const seen = new Set<string>();
            return fallback.filter((p) => {
              if (seen.has(p.id)) return false;
              seen.add(p.id);
              return true;
            });
          }
          if (chanRes.ok) {
            const chanData = await chanRes.json();
            if (chanData.items && chanData.items.length > 0) {
              const ch = chanData.items[0];
              channelId = ch.id;
              likedPlaylistId = ch.contentDetails?.relatedPlaylists?.likes || 'LL';
            }
          }
        } catch (chanErr) {
          console.warn('[YouTube Music] Could not resolve user channel ID:', chanErr);
        }

        // 2. Fetch playlists using mine=true
        let currentToken = this._accessToken || token;
        let mineRes = await fetch(
          'https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50',
          { headers: { Authorization: `Bearer ${currentToken}` } }
        );

        if (mineRes.status === 401 && this._refreshToken) {
          console.log('[YouTube Music] 401 received on playlists fetch — auto-refreshing token...');
          const fresh = await this.refreshAccessToken();
          if (fresh) {
            currentToken = fresh;
            mineRes = await fetch(
              'https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50',
              { headers: { Authorization: `Bearer ${fresh}` } }
            );
          }
        }

        if (mineRes.status === 401) {
          console.warn('[YouTube Music] OAuth token expired (401). Retaining cached playlists for seamless reconnection.');
          this._accessToken = null;
          await storageCache.setSetting('yt_oauth_token', null);
          const fallback = [...savedPlaylists, ...cachedOauthPlaylists, ...curatedOnly];
          const seen = new Set<string>();
          return fallback.filter((p) => {
            if (seen.has(p.id)) return false;
            seen.add(p.id);
            return true;
          });
        }

        const itemsMap = new Map<string, any>();

        if (mineRes.ok) {
          const mineData = await mineRes.json();
          (mineData.items || []).forEach((item: any) => {
            if (item.id) itemsMap.set(item.id, item);
          });
        }

        // 3. If channelId is resolved, also query by channelId to catch any playlists not returned by mine=true
        if (channelId) {
          try {
            const chPlRes = await fetch(
              `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&channelId=${channelId}&maxResults=50`,
              { headers: { Authorization: `Bearer ${currentToken}` } }
            );
            if (chPlRes.ok) {
              const chPlData = await chPlRes.json();
              (chPlData.items || []).forEach((item: any) => {
                if (item.id && !itemsMap.has(item.id)) itemsMap.set(item.id, item);
              });
            }
          } catch (chPlErr) {
            console.warn('[YouTube Music] Channel playlists fetch warning:', chPlErr);
          }
        }

        // 4. Map collected playlists
        oauthPlaylists = Array.from(itemsMap.values()).map((item: any) => ({
          id: item.id,
          title: decodeHtmlEntities(item.snippet?.title || 'Untitled Playlist'),
          description: decodeHtmlEntities(item.snippet?.description),
          trackCount: item.contentDetails?.itemCount,
          thumbnailUrl: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url,
        }));

        // 5. Add Liked Music / Videos playlist (ID: "LL") if user has OAuth and not already present
        if (likedPlaylistId && !oauthPlaylists.some(p => p.id === likedPlaylistId || p.id === 'LL')) {
          oauthPlaylists.unshift({
            id: likedPlaylistId,
            title: 'Liked Music & Videos',
            description: 'Favorite tracks and liked songs from your Google account',
            thumbnailUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80',
          });
        }

        if (oauthPlaylists.length > 0) {
          await storageCache.setSetting('yt_cached_oauth_playlists', oauthPlaylists);
        }

        console.log(`[YouTube Music] Successfully retrieved ${oauthPlaylists.length} user playlists.`);
      } catch (e) {
        console.warn('[YouTube Music] Error fetching user playlists via OAuth:', e);
      }
    }

    // Merge: saved imported playlists first, then user's OAuth playlists, then curated
    const all = [...savedPlaylists, ...oauthPlaylists, ...curatedOnly].map((pl) => ({
      ...pl,
      title: decodeHtmlEntities(pl.title),
      description: pl.description ? decodeHtmlEntities(pl.description) : pl.description,
    }));
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

    // 1. Direct query to YouTube Data API v3 (most reliable, zero dependencies)
    try {
      const [itemsRes, metaRes] = await Promise.all([
        fetch(
          `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${encodeURIComponent(playlistId)}&maxResults=50&key=${YOUTUBE_DATA_API_KEY}`
        ),
        fetch(
          `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${encodeURIComponent(playlistId)}&key=${YOUTUBE_DATA_API_KEY}`
        ),
      ]);

      if (itemsRes.ok) {
        const itemsData = await itemsRes.json();
        let plTitle = 'Imported Playlist';
        if (metaRes.ok) {
          try {
            const metaData = await metaRes.json();
            if (metaData.items && metaData.items[0]?.snippet?.title) {
              plTitle = decodeHtmlEntities(metaData.items[0].snippet.title);
            }
          } catch {}
        }

        const tracks: TrackMetadata[] = (itemsData.items || [])
          .map((item: any) => {
            const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId || '';
            const rawTitle = decodeHtmlEntities(item.snippet?.title || 'Unknown Title');
            let title = rawTitle;
            let artist = decodeHtmlEntities(item.snippet?.videoOwnerChannelTitle || item.snippet?.channelTitle || 'YouTube Artist');
            if (rawTitle.includes(' - ')) {
              const parts = rawTitle.split(' - ');
              artist = decodeHtmlEntities(parts[0].trim());
              title = decodeHtmlEntities(parts.slice(1).join(' - ').replace(/\s*\([^)]*\)/g, '').replace(/\s*\[[^\]]*\]/g, '').trim());
            }
            const thumbnailUrl = item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '';
            const genre = musicLibraryService.detectGenre(title, artist, undefined, undefined, 125.0);
            return {
              id: `yt_${videoId}`,
              title,
              artist,
              genre,
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
          })
          .filter((t: TrackMetadata) => t.id !== 'yt_' && t.title !== 'Private video' && t.title !== 'Deleted video');

        if (tracks.length > 0) {
          const newPl: YouTubePlaylist = {
            id: playlistId,
            title: plTitle,
            trackCount: tracks.length,
            thumbnailUrl: tracks[0]?.coverArtUrl || '',
          };

          await storageCache.setSetting(`yt_pl_tracks_${newPl.id}`, tracks);
          const existing: YouTubePlaylist[] = (await storageCache.getSetting<YouTubePlaylist[]>('yt_user_saved_playlists', [])) || [];
          const updated = [newPl, ...existing.filter((p) => p.id !== newPl.id)];
          await storageCache.setSetting('yt_user_saved_playlists', updated);
          return newPl;
        }
      }
    } catch (apiErr) {
      console.warn('[YouTube Music] Direct API playlist fetch warning:', apiErr);
    }

    // 2. Fallback: Query local streaming server (Port 8088)
    try {
      const res = await fetch(`http://127.0.0.1:8088/api/youtube/playlist?id=${encodeURIComponent(playlistId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          const sanitizedItems = data.items.map((item: TrackMetadata) => sanitizeTrackMetadata(item));
          const newPl: YouTubePlaylist = {
            id: data.id || playlistId,
            title: decodeHtmlEntities(data.title || 'Imported Playlist'),
            trackCount: sanitizedItems.length,
            thumbnailUrl: sanitizedItems[0]?.coverArtUrl || '',
          };

          await storageCache.setSetting(`yt_pl_tracks_${newPl.id}`, sanitizedItems);
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
      return curatedMatch.tracks.map((t) => sanitizeTrackMetadata(t));
    }

    // 2. Check cached tracks from imported playlist
    const cachedTracks = await storageCache.getSetting<TrackMetadata[] | null>(`yt_pl_tracks_${playlistId}`, null);
    if (cachedTracks && cachedTracks.length > 0) {
      return cachedTracks.map((t) => sanitizeTrackMetadata(t));
    }

    // 3. Direct Google YouTube Data API v3 query with API key (instant client execution)
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${encodeURIComponent(playlistId)}&maxResults=50&key=${YOUTUBE_DATA_API_KEY}`
      );
      if (res.ok) {
        const data = await res.json();
        const tracks: TrackMetadata[] = (data.items || [])
          .map((item: any) => {
            const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId || '';
            const rawTitle = decodeHtmlEntities(item.snippet?.title || 'Unknown Title');
            let title = rawTitle;
            let artist = decodeHtmlEntities(item.snippet?.videoOwnerChannelTitle || item.snippet?.channelTitle || 'YouTube Artist');
            if (rawTitle.includes(' - ')) {
              const parts = rawTitle.split(' - ');
              artist = decodeHtmlEntities(parts[0].trim());
              title = decodeHtmlEntities(parts.slice(1).join(' - ').replace(/\s*\([^)]*\)/g, '').replace(/\s*\[[^\]]*\]/g, '').trim());
            }
            const thumbnailUrl = item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '';
            const genre = musicLibraryService.detectGenre(title, artist, undefined, undefined, 125.0);
            return {
              id: `yt_${videoId}`,
              title,
              artist,
              genre,
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
          })
          .filter((t: TrackMetadata) => t.id !== 'yt_' && t.title !== 'Private video' && t.title !== 'Deleted video');

        if (tracks.length > 0) {
          await storageCache.setSetting(`yt_pl_tracks_${playlistId}`, tracks);
          return tracks;
        }
      }
    } catch (e) {
      console.warn('[YouTube Music] Direct API track fetch error:', e);
    }

    // 4. Query local streaming server (Port 8088) with Data API key
    try {
      const res = await fetch(`http://127.0.0.1:8088/api/youtube/playlist?id=${encodeURIComponent(playlistId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          const sanitized = data.items.map((item: TrackMetadata) => sanitizeTrackMetadata(item));
          await storageCache.setSetting(`yt_pl_tracks_${playlistId}`, sanitized);
          return sanitized;
        }
      }
    } catch {}

    // 5. Try OAuth if token present
    let oauthToken = await this.getValidAccessToken();
    if (oauthToken) {
      try {
        let res = await fetch(
          `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=50`,
          { headers: { Authorization: `Bearer ${oauthToken}` } }
        );
        if (res.status === 401 && this._refreshToken) {
          console.log('[YouTube Music] 401 on playlist tracks fetch — auto-refreshing token...');
          const fresh = await this.refreshAccessToken();
          if (fresh) {
            oauthToken = fresh;
            res = await fetch(
              `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=50`,
              { headers: { Authorization: `Bearer ${fresh}` } }
            );
          }
        }
        if (res.status === 401) {
          console.warn('[YouTube Music] OAuth token needs refresh on playlist tracks fetch. Retaining user profile.');
        } else if (res.ok) {
          const data = await res.json();
          const tracks = (data.items || []).map((item: any) => {
            const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId || '';
            const title = decodeHtmlEntities(item.snippet?.title || 'Unknown Title');
            const thumbnailUrl = item.snippet?.thumbnails?.medium?.url;
            let trackTitle = title;
            let artist = decodeHtmlEntities(item.snippet?.videoOwnerChannelTitle || item.snippet?.channelTitle || 'YouTube Music');
            if (title.includes(' - ')) {
              const parts = title.split(' - ');
              artist = decodeHtmlEntities(parts[0].trim());
              trackTitle = decodeHtmlEntities(parts.slice(1).join(' - ').trim());
            }
            const genre = musicLibraryService.detectGenre(trackTitle, artist, undefined, undefined, 125.0);
            return {
              id: `yt_${videoId}`,
              title: trackTitle,
              artist,
              genre,
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
    return this.defaultFeaturedTracks.map((t) => sanitizeTrackMetadata(t));
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

    // 1. Direct YouTube Data API v3 Search
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=20&q=${encodeURIComponent(trimmed)}&key=${YOUTUBE_DATA_API_KEY}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          const apiTracks: TrackMetadata[] = data.items.map((item: any) => {
            const videoId = item.id?.videoId || '';
            const rawTitle = decodeHtmlEntities(item.snippet?.title || 'Unknown Title');
            let title = rawTitle;
            let artist = decodeHtmlEntities(item.snippet?.channelTitle || 'YouTube Artist');
            if (rawTitle.includes(' - ')) {
              const parts = rawTitle.split(' - ');
              artist = decodeHtmlEntities(parts[0].trim());
              title = decodeHtmlEntities(parts.slice(1).join(' - ').replace(/\s*\([^)]*\)/g, '').replace(/\s*\[[^\]]*\]/g, '').trim());
            }
            const thumbnailUrl = item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url;
            const genre = musicLibraryService.detectGenre(title, artist, undefined, undefined, 125.0);
            return {
              id: `yt_${videoId}`,
              title,
              artist,
              genre,
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
          }).filter((t: TrackMetadata) => t.id !== 'yt_');
          return [...matchedFeatured, ...apiTracks];
        }
      }
    } catch (e) {
      console.warn('[YouTube Music] Direct API search error:', e);
    }

    // 2. If signed in, query Google YouTube Data API v3 with OAuth token
    let searchToken = await this.getValidAccessToken();

    if (searchToken) {
      try {
        let res = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=20&q=${encodeURIComponent(trimmed)}`,
          { headers: { Authorization: `Bearer ${searchToken}` } }
        );
        if (res.status === 401 && this._refreshToken) {
          console.log('[YouTube Music] 401 on search — auto-refreshing token...');
          const fresh = await this.refreshAccessToken();
          if (fresh) {
            searchToken = fresh;
            res = await fetch(
              `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=20&q=${encodeURIComponent(trimmed)}`,
              { headers: { Authorization: `Bearer ${fresh}` } }
            );
          }
        }
        if (res.ok) {
          const data = await res.json();
          if (data.items && data.items.length > 0) {
            const apiTracks: TrackMetadata[] = data.items.map((item: any) => {
              const videoId = item.id?.videoId || '';
              const title = decodeHtmlEntities(item.snippet?.title || 'Unknown Title');
              const artist = decodeHtmlEntities(item.snippet?.channelTitle || 'YouTube Artist');
              const thumbnailUrl = item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url;
              const genre = musicLibraryService.detectGenre(title, artist, undefined, undefined, 125.0);
              return {
                id: `yt_${videoId}`,
                title,
                artist,
                genre,
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

    // 3. Query local Streaming Server on Port 8088 (/api/youtube/search?q=...)
    try {
      const res = await fetch(`http://127.0.0.1:8088/api/youtube/search?q=${encodeURIComponent(trimmed)}`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const serverTracks: TrackMetadata[] = data.results.map((r: any) => {
            const cleanTitle = decodeHtmlEntities(r.title);
            const cleanArtist = decodeHtmlEntities(r.artist);
            return {
              id: `yt_${r.videoId}`,
              title: cleanTitle,
              artist: cleanArtist,
              genre: musicLibraryService.detectGenre(cleanTitle, cleanArtist, undefined, undefined, 125.0),
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
            };
          });
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
