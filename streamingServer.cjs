const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');

// In-memory cache for resolved YouTube video IDs
const videoIdCache = new Map();
const YOUTUBE_API_KEY = "AIzaSyBnnMkAZZtrlF4qCFBKilsjUu_zKeXcfKQ";

function resolveYouTubeVideoId(artist, title) {
  if (!artist && !title) return Promise.resolve(null);
  const cleanTitle = (title || '')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*\[[^\]]*\]/g, '')
    .trim();
  const cleanArtist = (artist || '').trim();
  const searchKey = `${cleanArtist} - ${cleanTitle}`.toLowerCase();

  if (videoIdCache.has(searchKey)) {
    return Promise.resolve(videoIdCache.get(searchKey));
  }

  // 1. Official YouTube Data API v3 Search
  const query = `${cleanArtist} ${cleanTitle} official music video`;
  const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=id&q=${encodeURIComponent(query)}&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`;

  return new Promise((resolve) => {
    https.get(apiUrl, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.items && parsed.items.length > 0 && parsed.items[0].id?.videoId) {
            const vidId = parsed.items[0].id.videoId;
            videoIdCache.set(searchKey, vidId);
            return resolve(vidId);
          }
        } catch {}

        // Fallback: Web Scraping if API quota is reached
        fallbackScrape(cleanArtist, cleanTitle, searchKey).then(resolve);
      });
    }).on('error', () => {
      fallbackScrape(cleanArtist, cleanTitle, searchKey).then(resolve);
    });
  });
}

function fallbackScrape(artist, title, searchKey) {
  return new Promise((resolve) => {
    const q = encodeURIComponent(`${artist} ${title} official music video`);
    const url = `https://www.youtube.com/results?search_query=${q}&sp=EgIQAQ%253D%253D`;
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const match = data.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
        const vidId = match ? match[1] : null;
        if (vidId) {
          videoIdCache.set(searchKey, vidId);
        }
        resolve(vidId);
      });
    }).on('error', () => resolve(null));
  });
}

/**
 * CloudMix Pro Broadcast & Streaming Server (Port 8088)
 * - Broadcasts to OBS Studio via transparent glassmorphic Browser Source (/obs-overlay)
 * - Two-way integration with Streamer.bot (viewer chat requests & channel point triggers)
 * - Elgato Stream Deck / Bitfocus Companion REST API & WebSocket control
 * - Real-time auto-updating classic text files for OBS (nowplaying.txt, bpm.txt, etc.)
 */

let currentBroadcastState = {
  activeDeck: 'A',
  title: 'CloudMix Pro DJ',
  artist: 'Ready for Playback',
  bpm: 126.0,
  key: '8A',
  deck: 'A',
  elapsedSec: 0,
  duration: 180,
  isPlaying: false,
  coverArtUrl: '',
  nextTrack: null,
  lyrics: null,
  overlayConfig: {
    showCurrentTrack: true,
    showNextTrack: true,
    showLyrics: true,
    showVideo: true,
  },
  youtubeVideoId: null,
  stems: {
    vocalsSolo: false,
    vocalsMuted: false,
    drumsSolo: false,
    drumsMuted: false,
    bassSolo: false,
    bassMuted: false,
    harmonicsSolo: false,
    harmonicsMuted: false,
  },
  lastDropTime: 0,
  hypeAlert: '',
};

const wsClients = new Set();

function broadcastToWsClients(msgObj) {
  const jsonStr = JSON.stringify(msgObj);
  const payload = Buffer.from(jsonStr, 'utf8');
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.from([0x81, len]);
  } else if (len <= 65535) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  const frame = Buffer.concat([header, payload]);

  for (const client of wsClients) {
    try {
      if (client.writable) {
        client.write(frame);
      }
    } catch {
      wsClients.delete(client);
    }
  }
}

function writeObsFiles(state) {
  try {
    const streamerDir = 'C:\\StreamerBot';
    const appObsDir = path.join(os.homedir(), 'AppData', 'Roaming', 'CloudMixPro', 'obs');

    [streamerDir, appObsDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        try { fs.mkdirSync(dir, { recursive: true }); } catch {}
      }
    });

    const nowPlayingLine = `${state.artist} - ${state.title} [${state.bpm} BPM | ${state.key}] (Deck ${state.deck})`;
    
    // Write to C:\StreamerBot
    try {
      fs.writeFileSync(path.join(streamerDir, 'nowplaying.txt'), nowPlayingLine, 'utf8');
      fs.writeFileSync(path.join(streamerDir, 'trigger.txt'), Date.now().toString(), 'utf8');
    } catch {}

    // Write dedicated granular files to AppData OBS directory
    try {
      fs.writeFileSync(path.join(appObsDir, 'nowplaying.txt'), nowPlayingLine, 'utf8');
      fs.writeFileSync(path.join(appObsDir, 'title.txt'), state.title || '', 'utf8');
      fs.writeFileSync(path.join(appObsDir, 'artist.txt'), state.artist || '', 'utf8');
      fs.writeFileSync(path.join(appObsDir, 'bpm.txt'), `${state.bpm || 124} BPM`, 'utf8');
      fs.writeFileSync(path.join(appObsDir, 'key.txt'), state.key || '8A', 'utf8');
      fs.writeFileSync(path.join(appObsDir, 'deck.txt'), `Deck ${state.deck || 'A'}`, 'utf8');
    } catch {}
  } catch (err) {
    console.error('[STREAM SERVER] Failed writing OBS text files:', err.message);
  }
}

function getObsOverlayHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CloudMix Pro — OBS Studio Live Stream HUD</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@700;800&family=Outfit:wght@400;600;800;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #00e5ff;
      --secondary: #ff3366;
      --accent: #f59e0b;
      --bg: rgba(9, 12, 18, 0.90);
      --border: rgba(255, 255, 255, 0.12);
      --text: #f8fafc;
      --subtext: #94a3b8;
    }

    body[data-theme="cyberpunk"] {
      --primary: #00f0ff;
      --secondary: #ff0055;
      --accent: #ffe600;
      --bg: rgba(5, 5, 12, 0.94);
      --border: rgba(0, 240, 255, 0.35);
    }

    body[data-theme="neon"] {
      --primary: #a855f7;
      --secondary: #10b981;
      --accent: #ec4899;
      --bg: rgba(12, 8, 24, 0.92);
      --border: rgba(168, 85, 247, 0.35);
    }

    body[data-theme="minimal"] {
      --primary: #ffffff;
      --secondary: #94a3b8;
      --accent: #38bdf8;
      --bg: rgba(15, 23, 42, 0.95);
      --border: rgba(255, 255, 255, 0.08);
    }

    body[data-theme="retro"] {
      --primary: #f59e0b;
      --secondary: #ea580c;
      --accent: #10b981;
      --bg: rgba(26, 18, 11, 0.94);
      --border: rgba(245, 158, 11, 0.3);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: transparent;
      overflow: hidden;
      font-family: 'Outfit', -apple-system, sans-serif;
      color: var(--text);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100vw;
      height: 100vh;
    }

    .obs-wrapper {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 660px;
    }

    .widget-container {
      display: flex;
      align-items: center;
      background: var(--bg);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 14px 20px;
      box-shadow: 0 12px 36px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.1);
      width: 100%;
      position: relative;
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    /* Animated Vinyl Platter Thumbnail */
    .vinyl-container {
      position: relative;
      width: 68px;
      height: 68px;
      border-radius: 50%;
      background: #020617;
      border: 2px solid rgba(255,255,255,0.15);
      box-shadow: 0 0 16px rgba(0,0,0,0.8);
      flex-shrink: 0;
      margin-right: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .vinyl-grooves {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: repeating-radial-gradient(
        circle at 50% 50%,
        #050508,
        #050508 2px,
        #151824 3px,
        #050508 4px
      );
    }

    .vinyl-label {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: inset 0 0 4px rgba(0,0,0,0.6);
      background-size: cover;
      background-position: center;
    }

    .spinning {
      animation: spin 3.5s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Track Metadata */
    .meta-content {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    .badges-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }

    .deck-badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      font-weight: 800;
      padding: 2px 7px;
      border-radius: 6px;
      background: rgba(0, 229, 255, 0.15);
      border: 1px solid var(--primary);
      color: var(--primary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .deck-badge.deck-b {
      background: rgba(255, 51, 102, 0.15);
      border-color: var(--secondary);
      color: var(--secondary);
    }

    .bpm-badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 700;
      color: var(--accent);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .track-title {
      font-size: 18px;
      font-weight: 900;
      color: #ffffff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      letter-spacing: -0.3px;
      line-height: 1.2;
    }

    .track-artist {
      font-size: 13px;
      font-weight: 600;
      color: var(--subtext);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 2px;
    }

    /* Progress bar */
    .progress-bar-wrap {
      margin-top: 8px;
      height: 4px;
      background: rgba(255,255,255,0.1);
      border-radius: 4px;
      overflow: hidden;
      position: relative;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--primary), var(--secondary));
      width: 0%;
      border-radius: 4px;
      transition: width 0.25s linear;
    }

    /* Hype / Stem Solo Alert */
    .hype-banner {
      position: absolute;
      top: 0;
      right: 0;
      background: linear-gradient(135deg, #ff0055, #a855f7);
      color: white;
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      font-weight: 800;
      padding: 3px 12px;
      border-bottom-left-radius: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: none;
      animation: pulse 1s infinite alternate;
    }

    @keyframes pulse {
      from { opacity: 0.8; transform: scale(0.98); }
      to { opacity: 1; transform: scale(1.02); }
    }

    /* Live Equalizer Bars */
    .eq-bars {
      display: flex;
      align-items: flex-end;
      gap: 2.5px;
      height: 24px;
      margin-left: 12px;
    }

    .eq-bar {
      width: 3.5px;
      background: var(--primary);
      border-radius: 2px;
      height: 4px;
      animation: eqBounce 0.5s ease-in-out infinite alternate;
    }

    .eq-bar:nth-child(2) { animation-duration: 0.35s; background: var(--secondary); }
    .eq-bar:nth-child(3) { animation-duration: 0.45s; }
    .eq-bar:nth-child(4) { animation-duration: 0.3s; background: var(--accent); }
    .eq-bar:nth-child(5) { animation-duration: 0.55s; }

    @keyframes eqBounce {
      0% { height: 4px; }
      100% { height: 22px; }
    }

    /* Next Track / Up Next Widget */
    .next-track-container {
      display: flex;
      align-items: center;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 14px;
      padding: 8px 14px;
      gap: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      animation: fadeIn 0.4s ease;
    }

    .next-badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 5px;
      background: rgba(168, 85, 247, 0.2);
      border: 1px solid #a855f7;
      color: #c084fc;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }

    .next-info {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .next-title {
      font-size: 13px;
      font-weight: 800;
      color: #ffffff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .next-artist {
      font-size: 11.5px;
      color: var(--subtext);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .next-bpm {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      font-weight: 700;
      color: #38bdf8;
      white-space: nowrap;
    }

    /* Synced Lyrics Widget */
    .lyrics-container {
      background: rgba(10, 15, 29, 0.88);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 14px;
      padding: 10px 16px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      animation: fadeIn 0.4s ease;
    }

    .lyrics-text {
      font-size: 14px;
      font-weight: 800;
      color: #00f0ff;
      text-shadow: 0 0 12px rgba(0,240,255,0.4);
      line-height: 1.3;
    }

    .lyrics-trans {
      font-size: 11.5px;
      font-weight: 500;
      color: #94a3b8;
      font-style: italic;
      margin-top: 3px;
    }

    /* YouTube Music Video / Visualizer Feed */
    .video-container {
      position: relative;
      width: 100%;
      height: 200px;
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.15);
      background: #000;
      box-shadow: 0 12px 32px rgba(0,0,0,0.7);
    }

    .video-container iframe {
      width: 100%;
      height: 100%;
      border: 0;
      pointer-events: none;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body>
  <div class="obs-wrapper">
    <!-- 1. Current Track Live HUD -->
    <div class="widget-container" id="currentTrackWidget">
      <div class="hype-banner" id="hypeBanner">⚡ ACAPELLA DROP</div>

      <div class="vinyl-container" id="vinyl">
        <div class="vinyl-grooves"></div>
        <div class="vinyl-label" id="vinylLabel"></div>
      </div>

      <div class="meta-content">
        <div class="badges-row">
          <span class="deck-badge" id="deckBadge">DECK A</span>
          <span class="bpm-badge" id="bpmBadge">126.0 BPM • 8A</span>
        </div>
        <div class="track-title" id="trackTitle">Loading CloudMix Pro...</div>
        <div class="track-artist" id="trackArtist">CloudMix Pro Broadcast Engine</div>

        <div class="progress-bar-wrap">
          <div class="progress-fill" id="progressFill"></div>
        </div>
      </div>

      <div class="eq-bars" id="eqBars">
        <div class="eq-bar"></div>
        <div class="eq-bar"></div>
        <div class="eq-bar"></div>
        <div class="eq-bar"></div>
        <div class="eq-bar"></div>
      </div>
    </div>

    <!-- 2. Next Track / Up Next Widget -->
    <div class="next-track-container" id="nextTrackWidget" style="display: none;">
      <span class="next-badge">UP NEXT</span>
      <div class="next-info">
        <span class="next-title" id="nextTitle">Queued Track</span>
        <span class="next-artist" id="nextArtist">• Artist</span>
      </div>
      <span class="next-bpm" id="nextBpm">126.0 BPM • 8A</span>
    </div>

    <!-- 3. Synced Lyrics & Live Translation Widget -->
    <div class="lyrics-container" id="lyricsWidget" style="display: none;">
      <div class="lyrics-text" id="lyricsText">♪ Synchronized Lyrics Ready</div>
      <div class="lyrics-trans" id="lyricsTrans" style="display: none;"></div>
    </div>

    <!-- 4. YouTube Music Video Feed -->
    <div class="video-container" id="videoWidget" style="display: none;">
      <iframe id="videoIframe" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen src=""></iframe>
    </div>
  </div>

  <script>
    const params = new URLSearchParams(window.location.search);
    const theme = params.get('theme') || 'default';
    if (theme !== 'default') {
      document.body.setAttribute('data-theme', theme);
    }

    // Query param overrides (can explicitly force ?showCurrentTrack=0 etc.)
    const qShowCurrent = params.get('current') !== '0' && params.get('showCurrentTrack') !== '0';
    const qShowNext = params.get('next') !== '0' && params.get('showNextTrack') !== '0';
    const qShowLyrics = params.get('lyrics') !== '0' && params.get('showLyrics') !== '0';
    const qShowVideo = params.get('video') !== '0' && params.get('showVideo') !== '0';

    const currentTrackWidget = document.getElementById('currentTrackWidget');
    const nextTrackWidget = document.getElementById('nextTrackWidget');
    const lyricsWidget = document.getElementById('lyricsWidget');
    const videoWidget = document.getElementById('videoWidget');

    const titleEl = document.getElementById('trackTitle');
    const artistEl = document.getElementById('trackArtist');
    const deckBadgeEl = document.getElementById('deckBadge');
    const bpmBadgeEl = document.getElementById('bpmBadge');
    const progressFillEl = document.getElementById('progressFill');
    const vinylEl = document.getElementById('vinyl');
    const vinylLabelEl = document.getElementById('vinylLabel');
    const hypeBannerEl = document.getElementById('hypeBanner');
    const eqBarsEl = document.getElementById('eqBars');

    const nextTitleEl = document.getElementById('nextTitle');
    const nextArtistEl = document.getElementById('nextArtist');
    const nextBpmEl = document.getElementById('nextBpm');

    const lyricsTextEl = document.getElementById('lyricsText');
    const lyricsTransEl = document.getElementById('lyricsTrans');
    const videoIframeEl = document.getElementById('videoIframe');

    let currentVideoId = '';

    function updateHUD(data) {
      if (!data) return;

      // 1. Config visibility toggles (combines app-synced overlayConfig + URL query params)
      const cfg = data.overlayConfig || {
        showCurrentTrack: true,
        showNextTrack: true,
        showLyrics: true,
        showVideo: true,
      };

      const allowCurrent = qShowCurrent && cfg.showCurrentTrack !== false;
      const allowNext = qShowNext && cfg.showNextTrack !== false;
      const allowLyrics = qShowLyrics && cfg.showLyrics !== false;
      const allowVideo = qShowVideo && cfg.showVideo !== false;

      currentTrackWidget.style.display = allowCurrent ? 'flex' : 'none';

      // Current Track Info
      if (allowCurrent) {
        titleEl.innerText = data.title || 'Playing...';
        artistEl.innerText = data.artist || 'CloudMix Pro DJ';

        const deck = (data.deck || data.activeDeck || 'A').toUpperCase();
        deckBadgeEl.innerText = 'DECK ' + deck;
        if (deck === 'B') {
          deckBadgeEl.classList.add('deck-b');
        } else {
          deckBadgeEl.classList.remove('deck-b');
        }

        bpmBadgeEl.innerText = (data.bpm ? parseFloat(data.bpm).toFixed(1) : '126.0') + ' BPM • ' + (data.key || '8A');

        if (data.duration && data.duration > 0) {
          const pct = Math.min(100, Math.max(0, ((data.elapsedSec || 0) / data.duration) * 100));
          progressFillEl.style.width = pct + '%';
        }

        if (data.coverArtUrl) {
          vinylLabelEl.style.backgroundImage = 'url(' + data.coverArtUrl + ')';
        } else {
          vinylLabelEl.style.backgroundImage = 'none';
        }

        if (data.isPlaying) {
          vinylEl.classList.add('spinning');
          eqBarsEl.style.opacity = '1';
        } else {
          vinylEl.classList.remove('spinning');
          eqBarsEl.style.opacity = '0.3';
        }

        // Stem isolation or drop alert
        if (data.stems && data.stems.vocalsSolo && !data.stems.vocalsMuted) {
          hypeBannerEl.innerText = '⚡ VOCAL ACAPELLA DROP';
          hypeBannerEl.style.display = 'block';
        } else if (data.stems && data.stems.drumsSolo && !data.stems.drumsMuted) {
          hypeBannerEl.innerText = '🥁 DRUM BREAK SOLO';
          hypeBannerEl.style.display = 'block';
        } else if (data.hypeAlert) {
          hypeBannerEl.innerText = data.hypeAlert;
          hypeBannerEl.style.display = 'block';
        } else {
          hypeBannerEl.style.display = 'none';
        }
      }

      // 2. Next Track / Up Next
      if (allowNext && data.nextTrack && data.nextTrack.title) {
        nextTrackWidget.style.display = 'flex';
        nextTitleEl.innerText = data.nextTrack.title;
        nextArtistEl.innerText = data.nextTrack.artist ? '• ' + data.nextTrack.artist : '';
        nextBpmEl.innerText = (data.nextTrack.bpm ? parseFloat(data.nextTrack.bpm).toFixed(1) : '126.0') + ' BPM • ' + (data.nextTrack.key || '8A');
      } else {
        nextTrackWidget.style.display = 'none';
      }

      // 3. Synced Lyrics
      if (allowLyrics && data.lyrics && data.lyrics.text) {
        lyricsWidget.style.display = 'block';
        lyricsTextEl.innerText = data.lyrics.text;
        if (data.lyrics.translation) {
          lyricsTransEl.innerText = data.lyrics.translation;
          lyricsTransEl.style.display = 'block';
        } else {
          lyricsTransEl.style.display = 'none';
        }
      } else {
        lyricsWidget.style.display = 'none';
      }

      // 4. YouTube Music Video Feed
      if (allowVideo && data.youtubeVideoId) {
        videoWidget.style.display = 'block';
        if (currentVideoId !== data.youtubeVideoId) {
          currentVideoId = data.youtubeVideoId;
          videoIframeEl.src = 'https://www.youtube.com/embed/' + data.youtubeVideoId + '?autoplay=1&mute=1&controls=0&loop=1&playlist=' + data.youtubeVideoId + '&enablejsapi=1&origin=' + encodeURIComponent(window.location.origin);
        }
      } else {
        videoWidget.style.display = 'none';
      }
    }

    // Connect to WebSocket on port 8088
    function connectWs() {
      const wsUrl = 'ws://' + window.location.host + '/ws';
      const ws = new WebSocket(wsUrl);

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          updateHUD(data);
        } catch {}
      };

      ws.onclose = () => {
        setTimeout(connectWs, 1500);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connectWs();

    // Fallback polling
    setInterval(async () => {
      try {
        const res = await fetch('/api/nowplaying');
        if (res.ok) {
          const data = await res.json();
          updateHUD(data);
        }
      } catch {}
    }, 1000);
  </script>
</body>
</html>`;
}

function startStreamingServer(port = 8088, callbacks = {}) {
  const server = http.createServer(async (req, res) => {
    // CORS headers for Stream Deck & local automation
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url, `http://localhost:${port}`);
    const pathname = parsedUrl.pathname;

    // 1. OBS Overlay Transparent Browser Source
    if (pathname === '/obs-overlay' || pathname === '/overlay') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(getObsOverlayHtml());
      return;
    }

    // 2. REST NowPlaying API
    if (pathname === '/api/nowplaying') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(currentBroadcastState));
      return;
    }

    // 3. Streamer.bot Inbound Song Request (e.g. !request <song> from Twitch/YouTube chat)
    if (pathname === '/api/streamerbot/request' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        try {
          const data = JSON.parse(body || '{}');
          if (callbacks.onStreamerbotRequest) {
            callbacks.onStreamerbotRequest(data);
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Request queued successfully' }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
      });
      return;
    }

    // 4. Streamer.bot Soundboard Trigger (Channel points redeem -> Sampler pad 1-8)
    if (pathname === '/api/streamerbot/sample' || pathname === '/api/sampler/trigger') {
      const pad = parseInt(parsedUrl.searchParams.get('pad') || '1', 10);
      if (callbacks.onSamplerPadTrigger) {
        callbacks.onSamplerPadTrigger(pad);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, padTriggered: pad }));
      return;
    }

    // 5. Streamer.bot Chat Command Query (!song)
    if (pathname === '/api/streamerbot/song') {
      const st = currentBroadcastState;
      const resp = `Currently playing on CloudMix Pro: ${st.artist} - ${st.title} [${st.bpm} BPM | ${st.key}] on Deck ${st.deck}`;
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(resp);
      return;
    }

    // 6. Elgato Stream Deck / Companion Control API
    if (pathname.startsWith('/api/streamdeck/')) {
      let action = pathname.replace('/api/streamdeck/', '');
      let deck = parsedUrl.searchParams.get('deck') || 'A';
      let stem = parsedUrl.searchParams.get('stem');
      let cue = parsedUrl.searchParams.get('cue');
      let bars = parsedUrl.searchParams.get('bars');
      let pad = parsedUrl.searchParams.get('pad');

      const handlePayload = (bodyObj) => {
        if (bodyObj) {
          if (bodyObj.action) action = bodyObj.action;
          if (bodyObj.deckId || bodyObj.deck) deck = bodyObj.deckId || bodyObj.deck;
          if (bodyObj.stem) stem = bodyObj.stem;
          if (bodyObj.cue !== undefined) cue = bodyObj.cue;
          if (bodyObj.bars !== undefined) bars = bodyObj.bars;
          if (bodyObj.pad !== undefined) pad = bodyObj.pad;
        }

        const actionPayload = {
          action,
          deck,
          stem,
          cue: cue !== undefined && cue !== null ? parseInt(cue, 10) : undefined,
          bars: bars !== undefined && bars !== null ? parseFloat(bars) : undefined,
          pad: pad !== undefined && pad !== null ? parseInt(pad, 10) : undefined,
        };

        if (action === 'status') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, state: currentBroadcastState }));
          return;
        }

        if (callbacks.onStreamdeckAction) {
          callbacks.onStreamdeckAction(actionPayload);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, executed: actionPayload }));
      };

      if (req.method === 'POST') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          let parsedBody = null;
          try {
            parsedBody = JSON.parse(body);
          } catch {}
          handlePayload(parsedBody);
        });
        return;
      }

      handlePayload(null);
      return;
    }

    // Default 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('CloudMix Pro Streaming Hub — Endpoint not found');
  });

  // RFC 6455 WebSocket Upgrade Server
  server.on('upgrade', (req, socket, head) => {
    const key = req.headers['sec-websocket-key'];
    if (!key) {
      socket.destroy();
      return;
    }
    const acceptKey = crypto
      .createHash('sha1')
      .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
      .digest('base64');

    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${acceptKey}\r\n\r\n`
    );

    wsClients.add(socket);

    socket.on('close', () => wsClients.delete(socket));
    socket.on('error', () => wsClients.delete(socket));

    // Send initial snapshot immediately
    try {
      const payload = Buffer.from(JSON.stringify(currentBroadcastState), 'utf8');
      const len = payload.length;
      let header = len < 126 ? Buffer.from([0x81, len]) : Buffer.alloc(4);
      if (len >= 126) {
        header[0] = 0x81;
        header[1] = 126;
        header.writeUInt16BE(len, 2);
      }
      socket.write(Buffer.concat([header, payload]));
    } catch {}
  });

  server.on('error', (err) => {
    console.error(`[STREAM SERVER ERROR on port ${port}]:`, err.message);
    if (err.code === 'EADDRINUSE') {
      console.log(`[STREAM SERVER] Port ${port} in use, trying port ${port + 1}...`);
      server.listen(port + 1);
    }
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`[STREAM SERVER] CloudMix Pro Broadcast Hub running on http://127.0.0.1:${port}`);
    console.log(`[STREAM SERVER] OBS Browser Source URL: http://127.0.0.1:${port}/obs-overlay`);
    console.log(`[STREAM SERVER] Streamer.bot Webhook URL: http://127.0.0.1:${port}/api/streamerbot/request`);
    console.log(`[STREAM SERVER] Stream Deck Control URL: http://127.0.0.1:${port}/api/streamdeck/action`);
  });

  return server;
}

function updateBroadcastState(newState) {
  currentBroadcastState = { ...currentBroadcastState, ...newState };

  // If youtubeVideoId is not yet present, resolve it in the background
  if (!currentBroadcastState.youtubeVideoId && currentBroadcastState.artist && currentBroadcastState.title && currentBroadcastState.title !== 'Ready for Playback') {
    const searchArtist = currentBroadcastState.artist;
    const searchTitle = currentBroadcastState.title;
    resolveYouTubeVideoId(searchArtist, searchTitle).then((vidId) => {
      if (vidId && currentBroadcastState.artist === searchArtist && currentBroadcastState.title === searchTitle) {
        currentBroadcastState.youtubeVideoId = vidId;
        broadcastToWsClients(currentBroadcastState);
      }
    }).catch(() => {});
  }

  broadcastToWsClients(currentBroadcastState);
  writeObsFiles(currentBroadcastState);
}

function getBroadcastState() {
  return currentBroadcastState;
}

module.exports = {
  startStreamingServer,
  updateBroadcastState,
  getBroadcastState,
};
