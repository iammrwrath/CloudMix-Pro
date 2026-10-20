# 🎧 CloudMix Pro — Official User Guide & Technical Manual

> **Version:** 2.0.29  
> **Repository:** [https://github.com/iammrwrath/CloudMix-Pro](https://github.com/iammrwrath/CloudMix-Pro)  
> **Platform:** Windows, macOS, Linux (Electron 44 + Web Audio DSP)

Welcome to **CloudMix Pro**, the next-generation cloud-native DJ workstation featuring neural 4-stem separation, autonomous MixCortex AI co-pilot, native YouTube Music & Google Drive streaming, real-time synchronized lyrics, and professional broadcasting integration.

---

## 📑 Table of Contents
1. [Quick Start & Interface Overview](#1-quick-start--interface-overview)
2. [Dual Decks & Mixer Architecture](#2-dual-decks--mixer-architecture)
3. [4-Stem Neural Separation Engine](#3-4-stem-neural-separation-engine)
4. [YouTube Music & Cloud Streaming](#4-youtube-music--cloud-streaming)
5. [Genius & LRC Real-Time Lyrics Engine](#5-genius--lrc-real-time-lyrics-engine)
6. [MixCortex AI Co-Pilot & Autonomous Mixing](#6-mixcortex-ai-co-pilot--autonomous-mixing)
7. [Hardware MIDI Controllers & DVS Vinyl Scratch](#7-hardware-midi-controllers--dvs-vinyl-scratch)
8. [Broadcasting, OBS Overlays & Streamer.bot](#8-broadcasting-obs-overlays--streamerbot)
9. [Library Migration (djay Pro, Rekordbox, Serato)](#9-library-migration-djay-pro-rekordbox-serato)
10. [Keyboard Shortcuts Cheat Sheet](#10-keyboard-shortcuts-cheat-sheet)
11. [GitHub Integration & Auto-Updates](#11-github-integration--auto-updates)

---

## 1. Quick Start & Interface Overview

### The Three Layout Modes
CloudMix Pro supports three adaptive workstation views located in the top navigation bar:
* **Classic Decks:** Traditional dual CDJ / turntable view with horizontal spinning platters, full pitch faders, and tactile transport controls.
* **Vertical Waveforms:** Side-by-side high-refresh vertical spectrum waveforms ideal for beat-matching drops and surgical phrase alignment.
* **Studio FX Rack:** Dedicated multi-effect rack view providing direct control over Echo, Reverb, Flanger, Bitcrusher, and Isolator Filters.

### Master Clock & Transport
* **BPM Controls:** Click `+` or `-` to adjust master clock tempo, or tap the **TAP** button repeatedly in rhythm to detect tempo automatically.
* **Sync & Quantize:** When **Quantize** is active (default), cue drops, loop rolls, and sample triggers automatically snap to the nearest 1/16th beatgrid division.
* **Drawer Modes:** Toggle between `Split` (decks + library), `Expanded` (full-screen crate library), or `Collapsed` (pure performance mode).

---

## 2. Dual Decks & Mixer Architecture

### Transport & Turntable Platters
* **Play / Pause:** Click the green Play button or press `Space` (Deck A) / `Enter` (Deck B).
* **Cue Points:** Press the orange **CUE** button to return the playhead to the initial marker. Hold to preview audio; release to return to cue.
* **Jog Wheels & Scratching:** Drag horizontally across the center vinyl platter to scratch audio forwards and backwards in real time with authentic mechanical vinyl drag physics.
* **Pitch & Tempo Fader:** Smooth slider with `±8%`, `±16%`, or `±50%` ranges. Toggle **Key Lock (Master Tempo)** to adjust speed without altering harmonic pitch.

### 3-Band Equalizer & Crossfader
* **High, Mid, Low Isolators:** Studio-grade biquad crossover filters providing standard `+6dB` boost down to full `-∞dB` frequency kill.
* **Gain & Trim:** Individual channel pre-gain adjustment with responsive LED peak metering.
* **Crossfader & Curve Control:** Smooth crossfading between Deck A and Deck B with selectable linear, exponential, or sharp scratch cut curves.
* **Headphone Cue (PFL):** Click the headphone icon on either deck to route audio exclusively to your cue monitor channel.

---

## 3. 4-Stem Neural Separation Engine

CloudMix Pro features state-of-the-art **HTDemucs / ONNX Neural Stem Separation**, dividing any local audio track or streaming song into 4 discrete real-time channels:

1. 🎤 **Vocals:** Clean, isolated acapella lead and backing vocal stems.
2. 🥁 **Drums:** Punchy percussive transient separation (kicks, snares, claps, hats).
3. 🎸 **Bass:** Sub-bass, 808s, and acoustic basslines isolated from mid harmonics.
4. 🎹 **Instruments / Other:** Synths, guitars, pianos, and harmonic musical accompaniment.

### How to Use Stems:
* Click the **STEMS** button on either deck to expand the 4-channel stem fader rack.
* Pull down any slider to attenuate that element, or click the **Mute** button to eliminate it instantly.
* Click **SOLO** on the Vocals slider for an instant live acapella cut over the other deck's beat.

---

## 4. YouTube Music & Cloud Streaming

CloudMix Pro seamlessly integrates with YouTube Music without embedded iframe workarounds or synthetic fallbacks:

* **High-Fidelity Audio Ingestion:** CloudMix Pro uses native direct stream extraction at studio-quality Opus 160 kbps (`yt-dlp` audio format 251/140), piping genuine audio into the Web Audio DSP pipeline.
* **1-Click Google Sign-In with PKCE:** Go to **Settings (`⚙`) → Library & Cloud Sources → YouTube Music** and click **Sign In with Google**. Uses RFC 7636 PKCE loopback authentication on port `42813`.
* **Permanent Offline Refresh Tokens:** Your Google login issues a permanent refresh token stored in `%APPDATA%\CloudMix Pro\cloudmix_persistent_settings.json`. Tokens renew silently in the background, ensuring you **never** have to re-authenticate after updates or app relaunches.
* **Playlist Refresh:** Click the dedicated circular refresh icon next to **PLAYLISTS** in the sidebar to perform an instant live sync of your Google playlists and Liked Music collection.

---

## 5. Genius & LRC Real-Time Lyrics Engine

CloudMix Pro includes a multi-tier hybrid lyrics architecture designed for live performers and streamers:

### Dual-Layer Retrieval Pipeline
1. **LRCLIB Synchronized LRC:** First attempts millisecond-accurate synchronized lyrics for real-time scrolling.
2. **Genius.com Native Fallback:** If a newly released song or club remix is missing from synchronized databases, CloudMix Pro automatically falls back to Genius.com via background extraction. Lyrics are parsed, timed to track duration, and displayed in the live HUD.

### Built-in Shared Engine + Custom Token Override
* **Zero Configuration:** A shared default Genius engine is pre-configured and active out of the box for all users.
* **Persistent Disk Caching:** Once lyrics are retrieved for a track, they are permanently cached to local disk storage (`storageCache`). Subsequent plays load instantly in **0 ms** with zero network requests.
* **Dedicated Custom Token (Optional):** Streamers and heavy users can enter their own Genius Client Access Token in **Settings → Library & Cloud Sources → Genius.com Lyrics Engine** for dedicated, unshared rate-limit quotas.

---

## 6. MixCortex AI Co-Pilot & Autonomous Mixing

MixCortex AI is your intelligent pairing co-pilot that analyzes harmonic compatibility, energy curves, and track structure:

* **Camelot Wheel Harmonic Mixing:** Color-coded Camelot keys (e.g., `8A`, `9A`, `8B`) ensure perfectly harmonic transitions with zero dissonance.
* **Automix Engine:** Click **AUTOMIX** in the top bar to enable hands-free intelligent auto-mixing. MixCortex calculates 16-bar intro/outro cue points and executes smooth EQ-swapped transitions.
* **AI Recommendation Engine:** Click the **CORTEX** drawer tab at the bottom to view real-time transition advice, energy ratings, and suggestions for the optimal next track.

---

## 7. Hardware MIDI Controllers & DVS Vinyl Scratch

### MIDI Controller Setup
* Connect any USB/Bluetooth MIDI DJ controller (Pioneer DDJ, Numark, Hercules, Denon, Traktor Kontrol).
* Click the **MIDI** icon in the top header or press `Ctrl + M` to open the **MIDI Controller Mapping Studio**.
* Select a pre-configured profile or use **MIDI Learn** to map platters, knobs, faders, and performance pads.

### DVS Timecode Vinyl
* Navigate to **Settings → DVS Timecode** to calibrate external turntables using standard Serato NoiseMap or Traktor Scratch 2.5kHz timecode records.

---

## 8. Broadcasting, OBS Overlays & Streamer.bot

CloudMix Pro includes a built-in background HTTP server running on port `8088`:

### OBS Transparent Overlay
* In OBS Studio, add a **Browser Source**.
* Set the URL to: `http://127.0.0.1:8088/obs-overlay`
* Recommended Resolution: `1920 x 250` with `Shutdown source when not visible` disabled.
* Displays real-time album artwork, animated soundwaves, live synchronized lyrics, and Camelot key readouts.

### Streamer.bot Channel Points Integration
* **Song Requests:** Viewer song requests sent via POST to `http://127.0.0.1:8088/api/streamerbot/request` automatically queue in the Automix Crate.
* **Soundboard Remote Triggers:** Viewers can trigger sampler pads 1–8 (Airhorn, Dub Siren, 808 Boom) by posting to `http://127.0.0.1:8088/api/streamerbot/sample`.

---

## 9. Library Migration (djay Pro, Rekordbox, Serato)

Migrate your existing crates, cue points, and beatgrids without losing preparation:

* Click **Universal DJ Migration** at the bottom of the Library sidebar.
* **Algoriddim djay Pro:** Directly parses `MediaLibrary.db` from `%LOCALAPPDATA%\Packages\Algoriddim.djayPro*`.
* **Rekordbox & Serato:** Import standard `rekordbox.xml` or Serato crate folders with full cue color mappings.

---

## 10. Keyboard Shortcuts Cheat Sheet

| Key | Deck A Action | Deck B Action |
| :--- | :--- | :--- |
| **Play / Pause** | `Space` | `Enter` |
| **Cue Marker** | `C` | `Shift + C` |
| **Sync Tempo** | `S` | `Shift + S` |
| **Pitch Bend -** | `Left Arrow` | `Down Arrow` |
| **Pitch Bend +** | `Right Arrow` | `Up Arrow` |
| **Hot Cues 1–4** | `1`, `2`, `3`, `4` | `5`, `6`, `7`, `8` |
| **Beat Loop (4-Bar)** | `L` | `Shift + L` |
| **Crossfader Left** | `[` | — |
| **Crossfader Right** | `]` | — |
| **User Guide (Manual)** | `F1` | `F1` |
| **Keyboard Cheat Sheet**| `?` or `Shift + /` | `?` or `Shift + /` |
| **Toggle Fullscreen** | `F11` | `F11` |
| **Developer Console** | `F12` or `Ctrl + Shift + I` | `F12` or `Ctrl + Shift + I` |

---

## 11. GitHub Integration & Auto-Updates

* **Official Repository:** [https://github.com/iammrwrath/CloudMix-Pro](https://github.com/iammrwrath/CloudMix-Pro)
* **Check for Updates:** Click the version pill (`v2.0.29`) in the top right header. CloudMix Pro queries GitHub Releases via `electron-updater`.
* **Silent Background Patching:** When an update is ready, click **Apply** to automatically install the patch and relaunch via native watchdog with zero downtime.
* **Report Issues & Feature Requests:** Visit the [CloudMix Pro GitHub Issues](https://github.com/iammrwrath/CloudMix-Pro/issues) page to report bugs, suggest MIDI mappings, or contribute.

---

*CloudMix Pro is crafted with ❤️ for DJs, streamers, and audio artists worldwide.*
