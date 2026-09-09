# ⚡ CloudMix Pro

> **Next-Gen Cloud-Native Professional DJ Workstation with Real-Time Neural Mix Stem Separation, Google Drive Cloud Sync, and High-Performance Hardware-Grade Cyberpunk UI.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform: Windows](https://img.shields.io/badge/Platform-Windows%2011%20%7C%2010-informational.svg)](https://github.com/iammrwrath/CloudMix-Pro/releases)
[![Electron](https://img.shields.io/badge/Electron-44.2.0-47848F?logo=electron&logoColor=white)](https://electronjs.org)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8.2-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)

---

## 🌟 Highlights & Features

- 🎧 **Motorized Holographic Jog Wheels**: Authentic vinyl platter spinning at 33.3 RPM with anisotropic radial sheen, 360° circular progress needle arc, and center LCD HUD with live warning pulses for remaining track time.
- 🧬 **Neural Mix Real-Time Stems**: Isolate **Vocals**, **Bass**, **Harmonies**, and **Drums** on the fly with live multi-band frequency filtering and Neural FX transition algorithms (Bass Swap, Vocal Swap, Harmonic Crossfade).
- ☁️ **Cloud-Native Music Sync**: Direct streaming and sync support for **Google Drive** libraries and **AuraMusic / YouTube Music** integration without redownloading local copies.
- 📊 **High-Definition Tri-Band Waveforms**: Multi-layer frequency separation (Sub/Bass, Mid/Vocals, Treble/Hi-Hats) with mirrored baseline reflection, downbeat beatgrid flags, and illuminated Hot Cue pins.
- 🎛️ **Studio-Grade Rotary Dials**: Perimeter circular SVG LED arc with dual unipolar and bipolar modes, tactile 0 dB center detent snapping, and double-click instant reset.
- 🟩 **Tactile 3D RGB Performance Pads**: Authentic Pioneer DDJ and Akai MPC style silicone pads with Hot Cues (1–8), Auto Loop, Beat Jump, and Stem Mute/Solo modes.
- 📡 **StreamerBot & Broadcast Integration**: Automatically broadcasts real-time `nowplaying.txt` and beat triggers for OBS overlays and stream automation.
- ⚡ **Lightning-Fast Windows Installer**: Rapid multi-threaded decompression installer (`CloudMix Pro Setup.exe`), registered under Windows Settings / Control Panel with clean install, repair, and uninstall lifecycles.
- 🔄 **Automated In-App GitHub Patching**: Pulls updates and patches directly from GitHub Releases with a single click.

---

## ⌨️ Global DJ Keyboard Controls

| Key | Target | Function |
| :---: | :---: | :--- |
| **`W`** | **Deck A** | Play / Pause |
| **`Q`** | **Deck A** | Cue / Return to Cue |
| **`E`** | **Deck A** | Beatgrid Sync |
| **`1` – `4`** | **Deck A** | Trigger Hot Cues 1–4 |
| **`I`** | **Deck B** | Play / Pause |
| **`U`** | **Deck B** | Cue / Return to Cue |
| **`O`** | **Deck B** | Beatgrid Sync |
| **`7` – `0`** | **Deck B** | Trigger Hot Cues 1–4 |
| **`Z`** | **Crossfader** | Snap to Deck A (-1.0) |
| **`X`** | **Crossfader** | Center Crossfader (0.0) |
| **`C`** | **Crossfader** | Snap to Deck B (+1.0) |
| **`L`** | **Library** | Toggle Full-Width Library Drawer |

---

## 🚀 Installation & Getting Started

### Windows Desktop Installation
1. Download the latest release executable:
   - **[CloudMix Pro Setup.exe](https://github.com/iammrwrath/CloudMix-Pro/releases/latest)** (Standard Windows Installer)
   - **[CloudMix Pro.exe](https://github.com/iammrwrath/CloudMix-Pro/releases/latest)** (Portable Standalone)
2. Run `CloudMix Pro Setup.exe`. It extracts and installs in under 10 seconds without requiring admin UAC elevation.
3. Launch from your Desktop or Start Menu.

### Development Setup
```bash
# Clone the repository
git clone https://github.com/iammrwrath/CloudMix-Pro.git
cd CloudMix-Pro

# Install dependencies
npm install

# Run Vite development server
npm run dev

# Launch Electron desktop client
npm run start

# Compile production bundle and Windows installers
npm run build
npm run dist
```

---

## 🛠️ Tech Stack & Architecture

- **Runtime**: [Electron](https://www.electronjs.org/) + Node.js (with secure Context Isolation and custom audio IPC bridges)
- **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/)
- **Bundler**: [Vite 8](https://vitejs.dev/)
- **Audio DSP**: Web Audio API with multi-node BiquadFilter networks, real-time AnalyserNodes, dynamic compressor lookaheads, and IndexedDB caching
- **Packaging & Updates**: [electron-builder](https://www.electron.build/) + [electron-updater](https://www.electron.build/auto-update)

---

## 📄 License

Distributed under the MIT License. Copyright © 2026 CloudMix Audio Labs / @iammrwrath.
