# Changelog

All notable changes to CloudMix Pro are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v1.7.2] - 2026-09-25

### Improved
- **Massive Vinyl Platter & Full-Canvas UI Overhaul (djay Pro Style)**:
  - **Fluid Jog Wheel Scaling**: Lifted the hard 118px jog wheel diameter ceiling. Platters now dynamically expand up to 340px (`max-w-[min(38vh,340px,100%)]`), filling empty deck space with large tactile grooved vinyl platters, needle drops, and circular progress rings.
  - **Extended Vertical Pitch Faders**: Pitch slider tracks expanded from 96–192px up to `h-28 sm:h-36 md:h-48 xl:h-56` (112–224px), matching the scaled jog wheel height and providing fine-grained pitch resolution.
  - **Expanded Performance Pad Buttons**: Hot Cue, Auto Loop, Beat Jump, and Stem pad heights increased to `h-6 sm:h-7 md:h-8 xl:h-10` for tactile, bold hardware-style controls.
  - **Full-Height Mixer Channel Faders**: Channel volume faders and dB calibration scales increased from `h-10–h-16` to `h-16 sm:h-20 md:h-24 xl:h-28` for professional vertical throw matching industry-standard DJ mixers.
  - **4-Stem Neural Quick Strip**: Vertical height expanded to `h-28 sm:h-36 md:h-44 xl:h-56` to cleanly align with the enlarged platter.

---

## [v1.7.1] - 2026-09-24

### Improved
- **Full-Width Layout — Decks Now Use All Available Screen Space**:
  - Removed `justify-center` from the deck row container — decks now stretch edge-to-edge across the full window width instead of being centered with empty margins.
  - Reduced main workspace padding from `p-1.5/p-2` to `p-1/p-1.5` and vertical spacing from `space-y-1.5/space-y-2` to `space-y-1/space-y-1.5`, giving decks more vertical room.
  - Reduced bottom drawer horizontal padding from `px-1.5/px-2` to `px-1/px-1.5` and removed excess bottom padding so the library/FX panel spans the full window width.
  - Slimmed the central Mixer panel from `w-[260px] xl:w-[360px]` to `w-[230px] xl:w-[300px]`, redistributing ~60–90px back to Deck A and Deck B on large displays.
  - Increased split-mode drawer height from `min(26vh, 230px)` to `min(28vh, 260px)` so more library tracks are visible simultaneously.
  - Reduced tab navigation strip bottom padding from `pb-1.5` to `pb-1` for tighter vertical rhythm.

---

## [v1.7.0] - 2026-09-24

### Fixed
- **YouTube IFrame API Error 153 — Playback Completely Broken**:
  - Root cause identified via debug logging added in v1.6.9: YouTube began enforcing a strict `Referer` / `Origin` header check in July 2025. Electron's renderer loads from a `file://` URL which sends no `Referer` or `Origin` header, causing YouTube to reject every IFrame embed with error code 153 ("Video player configuration error"). This is why tracks loaded but playback never started — the player was technically ready (`onReady` fired) but the video cue always failed with 153 immediately.
  - **Fix 1 — `main.cjs`**: Added a `session.webRequest.onBeforeSendHeaders` interceptor that fires for all requests to `*.youtube.com`, `*.youtube-nocookie.com`, and `*.googlevideo.com`. It injects `Referer: https://www.youtube.com/` and `Origin: https://www.youtube.com` on any request that is missing those headers. This runs at the Electron session level, so it covers all IFrame API traffic before YouTube ever sees it.
  - **Fix 2 — `YouTubeDeckBridge.ts`**: Added `origin: 'https://www.youtube.com'` to the `playerVars` object passed to `new YT.Player(...)`. This tells the IFrame API to declare the correct origin when initializing, matching the injected headers.

---

## [v1.6.9] - 2026-09-24

### Added
- **Comprehensive Debug Logging — YouTube Deck Bridge**:
  - `createPlayers()` now logs entry, per-deck `YT.Player` instantiation start, and post-construction confirmation.
  - `onReady` handler logs when each player becomes fully ready (replaces the silent no-op that made startup race conditions invisible).
  - `onStateChange` handler now logs the human-readable state name (`UNSTARTED`, `PLAYING`, `PAUSED`, `BUFFERING`, `CUED`, `ENDED`) instead of a raw integer.
  - `onError` handler decodes the numeric YouTube IFrame API error code into a descriptive string (`Invalid parameter value (2)`, `HTML5 player error (5)`, `Video not found or private (100)`, `Embedding not allowed by owner (101/150)`) — eliminates the useless `[object Object]` previously seen in the log.
  - `loadVideo()` logs deck ID, video ID, quality setting at cue time, duration resolution (with attempt count), and a clear warning when the player is not ready.
  - `play()` logs deck ID, current player state integer, and player readiness; warns explicitly when `playVideo` cannot be called due to unready player.
  - `pause()` logs deck ID and player readiness.
  - All error messages in `play()`, `pause()`, and player instantiation catch blocks now serialize `Error` objects via `.message` instead of passing raw objects to `console.warn/error`, ensuring they survive Chromium's IPC string serialization.

---

## [v1.6.8] - 2026-09-24

### Fixed
- **YouTube Music Playlists Resolution**:
  - Fixed account playlists not showing for users whose Google accounts lack a public YouTube channel: now queries `/channels?part=id,snippet,contentDetails&mine=true` first to retrieve channel identity, default uploads, and the user's "Liked Music & Videos" (`LL`) playlist.
  - Added dual query fallback using `channelId=${channelId}` alongside `mine=true` to guarantee complete playlist recovery.
  - Automatically unshifts the user's personal "Liked Music & Videos" playlist to the top of the collection.
- **Library Auto-Mount & Background Refresh**:
  - Fixed Library skipping playlist load on initial application launch: `handleLoadYtPlaylists()` is now invoked on component mount.
  - Switched crate selection so clicking **YouTube Music** always refreshes playlists in the background.
  - Added a dedicated 1-click **Refresh** button (`<RefreshCw />`) right next to the "PLAYLISTS" header in the library sidebar with live spinning status indicator.
- **Settings Modal Connection Synchronization**:
  - Corrected false "Connected" status display: now cleanses both `yt_oauth_token` and `yt_email` synchronously when a 401 Unauthorized status is returned.
- **Waveform & Playhead Rendering**:
  - Ensured the center laser playhead renders dynamically across the scrolling canvas even before waveform peaks finish generating.
- **Interaction Test Suite Expansion**:
  - Expanded automated test coverage from 27 to 36 assertions verifying channel resolution fallback, Liked Music handling, library auto-mount, refresh button presence, and YouTube deck transport triggers.

---

## [v1.6.7] - 2026-09-24

### Fixed
- **YouTube Deck Audio Playback & Transport**:
  - Eliminated playback stall on YouTube tracks (where track stayed paused at `00:00.0` when pressing Play).
  - Resolved Chromium iframe throttling by repositioning the bridge element into active DOM space rather than deep offscreen coordinates (`-9999px`).
  - Switched player embed host to `https://www.youtube-nocookie.com` and removed invalid `file://` origin parameter under Electron.
  - Added programmatic un-muting and volume enforcement on `play()`.
  - Added bidirectional `getPlayerState` synchronization in the 100ms time polling loop.
  - Connected `WaveformDisplay` hardware rendering loop directly to `youtubeDeckBridge.getCurrentTime(deckId)` for high-precision live playhead and scrolling waveform animation.
- **Auto-Updater & Patch Relaunching**:
  - Fixed patch installation failing to relaunch the app after applying an update.
  - Added a self-cleaning Windows batch relay script (`cloudmix_patch_relaunch.bat`) in `main.cjs` that executes the downloaded NSIS setup installer silently (`/S`), waits for completion, and automatically relaunches the installed executable (`process.execPath`).

---

## [v1.6.6] - 2026-09-24

### Fixed
- **OBS Overlay YouTube Video Playback**: Eliminated origin restrictions (error 150/153) in OBS Browser Source by embedding via `youtube-nocookie.com` with clean playback query flags (`autoplay=1&mute=1&controls=0&loop=1&playsinline=1&modestbranding=1`).
- **OBS Browser Source Permissions**: Enabled full feature allowances (`autoplay *; encrypted-media *; picture-in-picture *; accelerometer *; clipboard-write *; gyroscope *`) on the video feed iframe.
- **Synced Lyrics WebSocket Dispatch**: Extracted `sendDesktopBroadcast()` in `BroadcastService.ts` to push lyrics over IPC to Port 8088 immediately when `.lrc` lyrics load.
- **Lyrics Display Fallback**: When timed lyrics are not found, the OBS overlay renders a clean stream banner (`♪ Artist - Title`) rather than hiding the lyrics HUD container.
- **YouTube Playlists & OAuth 401**: Handled token expiration by clearing stale OAuth tokens and querying YouTube Data API v3 directly using `YOUTUBE_DATA_API_KEY`.

---

## [v1.6.5] - 2026-09-24

### Added
- **Native YouTube Audio Playback Bridge**: Created `YouTubeDeckBridge.ts` enabling YouTube audio streaming directly into Deck A and Deck B.
- **Streaming Audio Quality Presets**: Selectable bitrates in Settings (Ultra 320 kbps, High 256 kbps, Normal 160 kbps, Eco 128 kbps).
- **Direct YouTube Playlist Importer**: Import public or unlisted YouTube playlists via URL or ID, resolving and caching track metadata in local storage.
- **Port 8088 YouTube API Proxy**: Added local REST endpoints (`/api/youtube/search` and `/api/youtube/playlist`) to eliminate client CORS restrictions.

### Changed
- Integrated YouTube deck playback indicators into mixer and deck headers.

---

## [v1.6.4] - 2026-09-24

### Added
- **Universal Streamer.bot WebSocket Bridge**: Connects directly to `ws://127.0.0.1:8080/` without requiring hardcoded local filesystem trigger paths.
- **Configurable Streamer.bot Action Triggers**: Automatically fires actions on Track Changes, Drops, Acapella Solos, Drum Breaks, and Crossfader movements.
- **Viewer Song Requests API**: Inbound REST webhook (`/api/streamerbot/request`) allowing live stream viewers to request songs via chat.
- **Elgato Stream Deck & Bitfocus Companion REST Hub**: Added `/api/streamdeck/action` supporting remote hardware control of decks, pads, and mixer.
- **Modular OBS Overlay Layer Controls**: Added UI checkboxes to toggle Current Track, Up Next, Synced Lyrics, and Video components independently.

---

## [v1.6.3] - 2026-09-24

### Fixed
- **HiDPI Laptop Responsive Scaling**: Factored `devicePixelRatio` into `getAutoZoom` to prevent layout clipping on 1080p and 1200p laptop displays running 125% or 150% Windows scaling.
- **Dynamic Resize Evaluation**: Added a resize listener to recompute optimal zoom whenever the application window changes dimensions.
- **Fluid Central Mixer & Decks**: Replaced fixed pixel widths with proportional column widths (`w-[260px]`, `w-[290px]`, `w-[360px]`) and fluid `flex-1` decks.

---

## [v1.6.2] - 2026-09-24

### Fixed
- **Strict Release Scoping**: Scoped automated GitHub release uploads strictly to official CloudMix Pro binaries (`CloudMix-Pro-Setup.exe`, `CloudMix-Pro-Portable.exe`, and `latest.yml`).
- Cleaned up external sub-application binaries from release tags.

---

## [v1.6.1] - 2026-09-24

### Added
- **Ultra-Compact 1024x600 Support**: Added compact scaling enabling full dual-deck mixing on small portable displays without interface clipping.
- **Direct YouTube Playlists & Search**: Built client-side YouTube search and playlist listing with automatic caching for instant reload.

### Fixed
- GitHub Actions release pipeline automation for dual NSIS installer and standalone portable executables.

---

## [v1.6.0] - 2026-09-24

### Added
- **djay Pro-Class 9-Category Settings Experience**:
  - *General*: Auto-sync on track load, quantize hot cues & loops, playhead safety lock.
  - *Audio Devices*: Independent Master speaker PA routing, Headphones pre-cue monitor selection, audio buffer latency hints (Ultra-Low ~5ms, Balanced ~12ms, Safe ~25ms), and hardware sample rate reporting.
  - *DVS (Digital Vinyl System)*: Absolute & Relative timecode vinyl modes with needle-drop lead-in margin.
  - *Sound / EQ*: 3-Band Isolator (-70dB kill) vs Classic (-24dB cut) slopes, mix headroom margin (-6dB, -9dB, -12dB), and transparent master peak limiter.
  - *Automix*: Configurable transition durations (2-24s), automatic tempo sync, and smooth equal-power crossfader blending.
  - *Library*: Local disk music folder scanning, Google Drive cloud streaming, and YouTube Music OAuth.
  - *Appearance*: Workstation UI scaling (90%, 100%, 115%, 130%) and high-contrast color themes.
  - *Advanced*: Neural Mix AI separation quality, WebGL 2.0 GPU hardware acceleration, and audio buffer/waveform cache purger.
  - *MIDI Devices*: WebMIDI controller discovery, Pioneer DDJ-400 / FLX4 mapping, and jog wheel touch sensitivity calibration.
- **Authentic Bi-Directional Vinyl Scratch Physics**: True bi-directional reverse & forward vinyl scratching with analog turntable inertia droop and pre-cached reverse audio buffers.
- **Authentic Jamaican Dancehall Airhorn DSP**: Multi-layered 5-blast staccato brass synthesis engine with acoustic throat turbulence and 116Hz sub-bass punch.
- **Modular Fluid Workspace**: Eliminated dead space across decks, central mixer strips, and performance pads; scaled jog wheels up to 46vh / 420px.

---

## [v1.5.9] - 2026-09-24

### Added
- **Autonomous YouTube Video Resolver**: Built-in video search resolving official music videos for OBS Studio using YouTube Data API v3 and automated fallback scraping.
- **Studio-Grade 8-Pad Sampler DSP**: Added 808 sub drops, dub laser sirens, 2-stroke vinyl scratch chirps, and tight 909 kicks/claps.
- **Turntable Vinyl Scratch Engine**: Continuous velocity & pitch-modulated playback rate physics for jog wheels.

---

## [v1.5.8] - 2026-09-24

### Added
- **Automated YouTube Music Video Resolver**: Active tracks automatically search and stream their official YouTube music video in the OBS HUD overlay.
- **Real-Time Synced LRC Lyrics**: Fast lyric retrieval via `lrclib.net` with sub-millisecond timeline tracking for OBS and in-app HUD.
- **OBS Autoplay & Permissions**: Configured iframe security parameters for seamless OBS Studio rendering.

---

## [v1.5.7] - 2026-09-24

### Added
- **1-Click Copy OBS URL**: Direct clipboard copy button in the Streamer HUD for instant OBS Browser Source insertion (`http://127.0.0.1:8088/overlay`).
- **Customizable Overlay Modules**: Checkboxes to toggle Current Track Info, Up Next, Synced Lyrics, and YouTube Video Feed.
- **Audio Output Routing Tab**: Separate physical soundcards for Master Output and Headphones cue monitoring.
- **MiniDeckHeader Drag & Drop**: Drop tracks into Mini Deck A and Mini Deck B headers directly while in djay Pro Expanded Library View.

---

## [v1.5.6] - 2026-09-24

### Fixed
- **Packaging Error Fix**: Bundled `streamingServer.cjs` inside the build bundle and added safe recovery in `main.cjs`.
- **djay Pro Playlists Extraction**: Native direct SQLite extraction from `MediaLibrary.db` with complete track mapping.
- **Context Menu & Drag-Drop Reliability**: Resolved event collisions for right-click context menu and deck drag-and-drop.
- **Virtualized Library**: Progressive windowing rendering 6,000+ tracks at full 60 FPS without memory bloat.

---

## [v1.5.5] - 2026-09-24

### Fixed
- Native direct SQLite extraction from `MediaLibrary.db` for custom playlists and folders.
- Fixed event propagation and viewport positioning for right-click context menus.
- Enabled direct drag-and-drop to Deck A and Deck B.

---

## [v1.5.4] - 2026-09-24

### Added
- Production release bundling both `CloudMix-Pro-Setup.exe` and `CloudMix-Pro-Portable.exe` with `latest.yml`.
- Library windowing and virtualization for 6,000+ tracks.
- Stem looping lock across all 4 discrete stem buffers.

---

## [v1.5.3] - 2026-09-23

### Added
- Memoized `TrackRow` component with `React.memo` for ultra-fast library scrolling.
- Click-to-load and right-click context menu for deck selection.
- Draggable track rows with animated drop zone feedback.

---

## [v1.5.2] - 2026-09-21

### Added
- Automated GitHub Actions CI/CD to build and publish release binaries directly from repository tags.
- Discrete 4-stem separation buffering and playback synchronization.

---

## [v1.5.1] - 2026-09-18

### Added
- Auto-fit viewport engine optimized for 1280x800 and 1280x752 laptop screens.
- Discrete 4-stem separation engine (Vocals, Drums, Bass, Harmonics).
- Initial foundation for OBS Studio text exports and external DJ library migration.

---

## [v1.4.8] - 2026-09-18

### Added
- Silent background in-app updater executing NSIS setup installer without opening external browser windows.
- Corrected asset resolution to ensure silent installer patches cleanly.

---

## [v1.4.7] - 2026-09-17

### Added
- Enlarged vinyl disc and platter diameter from 260px to 380px for tactile mouse and touch scratching.
- Proportioned curved aluminum tonearm assembly and illuminated needle tracking indicator.
- Refined central LCD status hub with circular progress SVG.

---

## [v1.4.6] - 2026-09-17

### Added
- Global UI zoom controller with toolbar presets (100%, 110%, 120%, 130%) and hotkeys (`Ctrl +` / `Ctrl -` / `Ctrl 0`).
- Typography overhaul boosting readability and contrast across all mixer and deck readouts.

---

## [v1.4.5] - 2026-09-17

### Fixed
- Enforced 1:1 symmetrical circular geometry for jog wheels across all viewport scales.
- Recursive music directory scanning traversing up to 10 subdirectories deep.
- RFC 8252 loopback system browser OAuth (127.0.0.1:42813) for YouTube Music sign-in.
