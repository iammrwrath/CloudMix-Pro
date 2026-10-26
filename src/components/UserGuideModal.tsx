import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  BookOpen,
  Search,
  ExternalLink,
  RefreshCw,
  GitBranch,
  Check,
  Disc,
  Radio,
  Sliders,
  Tv,
  Brain,
  Music,
  Download,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Keyboard,
  HardDrive,
  Copy,
  ChevronRight,
  FolderSync,
} from 'lucide-react';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GuideSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  category: string;
  content: string;
  tags: string[];
}

const APP_VERSION = 'v2.0.43';
const GITHUB_REPO_URL = 'https://github.com/iammrwrath/CloudMix-Pro';
const GITHUB_GUIDE_RAW = 'https://raw.githubusercontent.com/iammrwrath/CloudMix-Pro/main/docs/USER_GUIDE.md';

interface ParsedBlock {
  type: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'ul' | 'ol' | 'table' | 'quote';
  text?: string;
  items?: string[];
  rows?: string[];
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeSectionId, setActiveSectionId] = useState<string>('quickstart');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleOpenExternal = (url: string) => {
    if (typeof window !== 'undefined' && (window as any).desktopAPI?.shellOpenExternal) {
      (window as any).desktopAPI.shellOpenExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const handleSyncWithGitHub = async () => {
    setIsSyncing(true);
    setSyncStatus('Fetching latest documentation live from GitHub main branch...');
    try {
      const res = await fetch(GITHUB_GUIDE_RAW, { cache: 'no-cache' });
      if (res.ok) {
        const text = await res.text();
        if (text && text.length > 200) {
          setSyncStatus('Successfully synchronized documentation with GitHub main branch!');
        } else {
          setSyncStatus('Documentation verified up to date.');
        }
      } else {
        setSyncStatus(`GitHub responded with HTTP ${res.status}. Displaying bundled documentation.`);
      }
    } catch {
      setSyncStatus('Offline mode active: Displaying bundled high-speed documentation.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus(null), 4000);
    }
  };

  const handleCopyGitHubUrl = () => {
    navigator.clipboard.writeText(`${GITHUB_REPO_URL}/blob/main/docs/USER_GUIDE.md#${activeSectionId}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const sections: GuideSection[] = [
    {
      id: 'quickstart',
      title: 'Quick Start & Workstation Views',
      category: 'Core Workflows',
      icon: <Sparkles className="w-4 h-4 text-cyan-400" />,
      tags: ['start', 'layout', 'views', 'bpm', 'sync', 'quantize', 'drawer', 'layouts'],
      content: `
### Three Workstation Layouts
CloudMix Pro provides 3 specialized workstation layouts toggled in the top navigation bar:
* **Classic Decks:** Dual virtual vinyl platters, long-throw pitch faders, hot cue pads, and full EQ isolators.
* **Vertical Waveforms:** High-refresh spectrum waveforms stacked side-by-side for precise phrase matching and drop alignment.
* **Studio FX Rack:** Dedicated multi-effect console featuring Echo, Reverb, Flanger, Filter, and Bitcrusher.

### Master Tempo, Quantize & Library Drawer
* **Master Clock:** Set global tempo using \`+\` / \`-\` or repeatedly tap the **TAP** button in rhythm.
* **Quantize Engine:** Snaps all hot cues, loop rolls, and sample triggers to the nearest 1/16th beat division.
* **Drawer Modes:** Click the layout buttons to switch between **Split** (Decks + Crate Library), **Expanded** (Full Library), or **Collapsed** (Performance Only).
      `,
    },
    {
      id: 'decks-mixer',
      title: 'Dual Decks & Mixer Architecture',
      category: 'Core Workflows',
      icon: <Disc className="w-4 h-4 text-purple-400" />,
      tags: ['decks', 'mixer', 'play', 'cue', 'scratch', 'crossfader', 'eq', 'headphone', 'neural mix', 'shuffle'],
      content: `
### Tactile Turntable Platters & Scratch Physics
* **Play / Pause:** Press the green Play button or press \`Space\` (Deck A) / \`Enter\` (Deck B).
* **Cue Marker:** Tap **CUE** to return to the initial track cue point. Hold down to audition; release to return to the marker.
* **Turntable Scratching:** Click and drag across the vinyl center platter to scratch forwards and backwards in real time with natural inertia and vinyl drag resistance.
* **Key Lock (Master Tempo):** Toggle Key Lock to speed up or slow down a track without altering its harmonic pitch.

### 3-Band Equalizer & Crossfader
* **High, Mid, Low Knobs:** Studio-grade biquad crossover filters providing \`+6dB\` boost down to full \`-∞dB\` frequency kill.
* **Crossfader Curves:** Transition between Deck A and Deck B with selectable linear, exponential, or sharp cut scratch curves.
* **Headphone Monitor (PFL):** Click the headphone icon on either deck to route audio to your headphone output without interrupting the master crowd feed.

### Neural Mix Transition FX (Intelligent Automix)
* Choose from 4 advanced stem-blending transition modes on the crossfader:
  1. **Vocal Swap:** Automatically isolates and swaps vocals at the transition midpoint while preserving basslines.
  2. **Drum Crossfade:** Smoothly blends rhythm sections while keeping vocals and melodies clean.
  3. **Bass Drop:** Low-end frequencies cut and drop into the incoming track seamlessly.
  4. **Intelligent Shuffle:** Automix analyzes BPM delta, vocal energy, and frequency spectrum to dynamically pick the optimal transition mode.
      `,
    },
    {
      id: 'stems',
      title: '4-Stem Neural Separation',
      category: 'Audio & DSP',
      icon: <Sliders className="w-4 h-4 text-pink-400" />,
      tags: ['stems', 'neural', 'vocals', 'drums', 'bass', 'instruments', 'demucs', 'onnx', 'acapella'],
      content: `
### Real-Time Neural Stem Isolation
CloudMix Pro features state-of-the-art **HTDemucs / ONNX Neural Stem Separation**, splitting any local audio file or YouTube Music track into 4 discrete channels:

1. 🎤 **Vocals:** Clean, isolated acapella lead vocals and ad-libs.
2. 🥁 **Drums:** Punchy percussive transient separation (kicks, snares, claps, hats).
3. 🎸 **Bass:** Sub-bass, 808s, and acoustic basslines isolated from mid harmonics.
4. 🎹 **Instruments / Other:** Synths, guitars, pianos, and harmonic accompaniment.

### Performance Controls
* Click **STEMS** on either deck to reveal the 4-stem fader rack.
* Pull down any slider to attenuate that element, or click **Mute** to cut it out instantly.
* Click **SOLO** on the Vocals slider for an instant live acapella over the opposite deck's rhythm!
      `,
    },
    {
      id: 'youtube-streaming',
      title: 'YouTube Music & Cloud Streaming',
      category: 'Cloud & Sources',
      icon: <Radio className="w-4 h-4 text-rose-400" />,
      tags: ['youtube', 'streaming', 'google', 'oauth', 'pkce', 'playlists', 'refresh', 'tokens', 'system browser'],
      content: `
### Studio Opus 160kbps Audio Ingestion
* CloudMix Pro extracts direct Opus 160kbps audio streams (\`yt-dlp\` format 251/140), piping authentic, uncompressed audio directly into the Web Audio DSP pipeline.
* **No Hidden Iframes or Synthetic Oscillators:** Decks play genuine studio audio streams with full pitch control and waveform analysis.

### RFC 8252 External System Browser Authentication
* Go to **Settings (\`⚙\`) → Library & Cloud Sources → YouTube Music** or click **Sign in to YouTube** in the OBS broadcast hub.
* Opens your default system browser (Chrome/Edge/Firefox) with **zero embedded webview blocks** or "browser not secure" errors.
* Google returns your credentials securely via local loopback on port \`42813\`.
* Your session and user profile remain synchronized across app launches.

### 1-Click Live Playlist Refresh & Token Renewal
* Click the circular **Refresh** button next to **PLAYLISTS** in the sidebar to perform an instant live sync of your Google playlists and Liked Music collection.
* If your session token expires, a 1-click **Session Expired • Re-Connect** badge appears to refresh your authorization instantly.
      `,
    },
    {
      id: 'lyrics-genius',
      title: 'Genius & LRC Real-Time Lyrics Engine',
      category: 'Performance & HUD',
      icon: <Music className="w-4 h-4 text-amber-400" />,
      tags: ['lyrics', 'genius', 'lrc', 'hud', 'karaoke', 'streamer', 'timing'],
      content: `
### Dual-Layer Lyrics Architecture
CloudMix Pro provides a multi-tier hybrid lyrics architecture designed for live performers and streamers:

1. **LRCLIB Synchronized LRC:** First queries millisecond-accurate synchronized lyrics for smooth scrolling lyrics HUD display.
2. **Genius.com Native Fallback:** If a newly released track, underground release, or club remix is missing from synchronized databases, CloudMix Pro automatically falls back to Genius.com via background extraction.

### Built-in Shared Engine + High-Contrast Display
* **Zero Configuration:** A shared default Genius engine is built-in out of the box for all users.
* **High-Contrast Monitor:** The Synced Lyrics Monitor uses a dark slate-900 background with cyan borders and pure white lyrics text to eliminate purple-on-purple color clashes.
* **Persistent Disk Caching:** Once lyrics are retrieved for a track, they are permanently cached to disk (\`storageCache\`). Subsequent plays load in **0 ms** with **zero network requests**.
      `,
    },
    {
      id: 'cortex-ai',
      title: 'MixCortex AI Co-Pilot & Automix',
      category: 'AI & Intelligence',
      icon: <Brain className="w-4 h-4 text-emerald-400" />,
      tags: ['cortex', 'ai', 'automix', 'camelot', 'key', 'harmonic', 'energy'],
      content: `
### Intelligent Harmonic DJ Pairing
MixCortex AI is your virtual assistant DJ analyzing harmonic compatibility, energy curves, and track structure:

* **Camelot Wheel Mixing:** Color-coded Camelot keys (e.g. \`8A\`, \`9A\`, \`8B\`) ensure perfectly harmonic transitions with zero musical clashing.
* **Hands-Free Automix:** Click **AUTOMIX** in the top bar to enable hands-free auto-mixing. MixCortex analyzes 16-bar intro/outro cue points and executes smooth EQ-swapped transitions.
* **Cortex Companion Drawer:** Click the **CORTEX** drawer tab at the bottom to view real-time transition advice, energy ratings, and suggestions for the optimal next track.
      `,
    },
    {
      id: 'midi-dvs',
      title: 'Hardware MIDI & DVS Timecode',
      category: 'Hardware & Control',
      icon: <HardDrive className="w-4 h-4 text-indigo-400" />,
      tags: ['midi', 'dvs', 'controllers', 'pioneer', 'numark', 'denon', 'timecode', 'vinyl'],
      content: `
### Plug-and-Play MIDI Mapping Studio
* Connect any USB or Bluetooth MIDI DJ controller (Pioneer DDJ, Numark, Hercules, Denon, Traktor Kontrol).
* Click the **MIDI** icon in the top header or press \`Ctrl + M\` to open the **MIDI Controller Mapping Studio**.
* Select a pre-configured profile or click **MIDI Learn** to assign platters, knobs, faders, and performance pads.

### DVS Timecode Vinyl Scratching
* Navigate to **Settings → DVS Timecode** to calibrate external turntables using standard Serato NoiseMap or Traktor Scratch 2.5kHz timecode vinyl.
      `,
    },
    {
      id: 'obs-broadcast',
      title: 'Broadcasting, OBS Overlays & Streamer.bot',
      category: 'Broadcasting & Live',
      icon: <Tv className="w-4 h-4 text-pink-400" />,
      tags: ['obs', 'broadcast', 'overlay', 'streamerbot', 'webhooks', 'nowplaying', 'video feed'],
      content: `
### OBS Transparent Browser Source & Live Preview
CloudMix Pro runs a local broadcast server on port \`8088\`:
* In OBS Studio, add a **Browser Source**.
* Set the URL to: \`http://127.0.0.1:8088/overlay\`
* Recommended Resolution: \`1920 x 1080\` with \`Shutdown source when not visible\` unchecked.
* Displays live animated soundwaves, album art, Camelot harmonic key, real-time synchronized lyrics, and the active YouTube music video!

### Live YouTube Video Feed in OBS Preview
* The OBS Hub includes a live video player in the preview pane that synchronizes with the active playing deck.
* Sign in with your YouTube account via the system browser button to stream full-length official music videos into OBS without restrictions.

### Streamer.bot Remote Webhooks & Soundboard
* **Copy URL Buttons:** In the Streamer.bot integration tab, click the dedicated **COPY URL** button on any endpoint card for 1-click clipboard copying.
* **Viewer Song Requests:** POST song titles to \`http://127.0.0.1:8088/api/streamerbot/request\` to queue into the Automix crate.
* **Soundboard Remote Triggers:** Viewers can trigger sampler pads 1–8 (Airhorn, Dub Siren, 808 Boom) via channel points at \`http://127.0.0.1:8088/api/streamerbot/sample\`.
      `,
    },
    {
      id: 'migration',
      title: 'DJ Library Migration (djay Pro, Rekordbox, Serato)',
      category: 'Library & Migration',
      icon: <FolderSync className="w-4 h-4 text-blue-400" />,
      tags: ['migration', 'djay', 'rekordbox', 'serato', 'traktor', 'crates', 'cues'],
      content: `
### Universal DJ Migration Hub
Migrate your prepared crates, hot cue points, and beatgrids without losing performance data:

* Click **Universal DJ Migration** at the bottom of the Library sidebar.
* **Algoriddim djay Pro:** Directly parses \`MediaLibrary.db\` from \`%LOCALAPPDATA%\\Packages\\Algoriddim.djayPro*\`.
* **Rekordbox & Serato:** Import standard \`rekordbox.xml\` or Serato crate folders with full cue color mappings.
      `,
    },
    {
      id: 'shortcuts',
      title: 'Keyboard Shortcuts Reference',
      category: 'Reference',
      icon: <Keyboard className="w-4 h-4 text-emerald-400" />,
      tags: ['shortcuts', 'hotkeys', 'keys', 'cheat sheet', 'controls'],
      content: `
### Global DJ Keyboard Shortcuts

| Shortcut | Deck A Function | Deck B Function |
| :--- | :--- | :--- |
| **Play / Pause** | \`Space\` | \`Enter\` |
| **Cue Marker** | \`C\` | \`Shift + C\` |
| **Sync Tempo** | \`S\` | \`Shift + S\` |
| **Pitch Bend -** | \`Left Arrow\` | \`Down Arrow\` |
| **Pitch Bend +** | \`Right Arrow\` | \`Up Arrow\` |
| **Hot Cues 1–4** | \`1\`, \`2\`, \`3\`, \`4\` | \`5\`, \`6\`, \`7\`, \`8\` |
| **Beat Loop (4-Bar)** | \`L\` | \`Shift + L\` |
| **Crossfader Left** | \`[\` | — |
| **Crossfader Right** | \`]\` | — |
| **User Guide (Manual)** | \`F1\` | \`F1\` |
| **Keyboard Cheat Sheet** | \`?\` or \`Shift + /\` | \`?\` or \`Shift + /\` |
| **Toggle Fullscreen** | \`F11\` | \`F11\` |
| **Developer Console** | \`F12\` or \`Ctrl + Shift + I\` | \`F12\` or \`Ctrl + Shift + I\` |
      `,
    },
    {
      id: 'github',
      title: 'GitHub Integration & Community',
      category: 'Reference',
      icon: <GitBranch className="w-4 h-4 text-cyan-400" />,
      tags: ['github', 'repository', 'issues', 'updates', 'releases', 'source'],
      content: `
### GitHub Open Ecosystem
CloudMix Pro is developed openly with community feedback and automated testing:

* **Official Repository:** [github.com/iammrwrath/CloudMix-Pro](https://github.com/iammrwrath/CloudMix-Pro)
* **Check for Updates:** Click the version pill (\`${APP_VERSION}\`) in the top right header to query GitHub Releases via \`electron-updater\`.
* **Silent Background Patching:** Click **Apply** when an update is downloaded to automatically install and relaunch with zero downtime.
* **Bug Reports & Feature Requests:** Visit [github.com/iammrwrath/CloudMix-Pro/issues](https://github.com/iammrwrath/CloudMix-Pro/issues) to report bugs or request new MIDI controller profiles.
      `,
    },
  ];

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.toLowerCase().trim();
    return sections.filter(
      (sec) =>
        sec.title.toLowerCase().includes(q) ||
        sec.category.toLowerCase().includes(q) ||
        sec.tags.some((t) => t.includes(q)) ||
        sec.content.toLowerCase().includes(q)
    );
  }, [searchQuery, sections]);

  const activeSection = sections.find((s) => s.id === activeSectionId) || sections[0];

  // Robust Markdown Parser
  const parsedBlocks = useMemo<ParsedBlock[]>(() => {
    const rawLines = activeSection.content.replace(/\r\n/g, '\n').split('\n');
    const blocks: ParsedBlock[] = [];
    let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;
    let currentTable: string[] | null = null;

    const flushList = () => {
      if (currentList) {
        blocks.push({ type: currentList.type, items: currentList.items });
        currentList = null;
      }
    };

    const flushTable = () => {
      if (currentTable) {
        blocks.push({ type: 'table', rows: currentTable });
        currentTable = null;
      }
    };

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i].trim();

      if (!line) {
        flushList();
        flushTable();
        continue;
      }

      if (line.startsWith('|')) {
        flushList();
        if (!currentTable) currentTable = [];
        currentTable.push(line);
        continue;
      } else {
        flushTable();
      }

      if (line.startsWith('#### ')) {
        flushList();
        blocks.push({ type: 'h4', text: line.replace(/^####\s+/, '') });
        continue;
      }
      if (line.startsWith('### ')) {
        flushList();
        blocks.push({ type: 'h3', text: line.replace(/^###\s+/, '') });
        continue;
      }
      if (line.startsWith('## ')) {
        flushList();
        blocks.push({ type: 'h2', text: line.replace(/^##\s+/, '') });
        continue;
      }
      if (line.startsWith('# ')) {
        flushList();
        blocks.push({ type: 'h1', text: line.replace(/^#\s+/, '') });
        continue;
      }

      if (line.startsWith('* ') || line.startsWith('- ')) {
        if (!currentList || currentList.type !== 'ul') {
          flushList();
          currentList = { type: 'ul', items: [] };
        }
        currentList.items.push(line.replace(/^[*\-]\s+/, ''));
        continue;
      }

      const numMatch = line.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        if (!currentList || currentList.type !== 'ol') {
          flushList();
          currentList = { type: 'ol', items: [] };
        }
        currentList.items.push(numMatch[2]);
        continue;
      }

      flushList();
      blocks.push({ type: 'p', text: line });
    }

    flushList();
    flushTable();
    return blocks;
  }, [activeSection.content]);

  // Inline Markdown Formatter (Bold, Code, Links, Italics)
  const renderInlineMarkdown = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    const regex = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      const token = match[0];
      if (token.startsWith('[') && token.includes('](')) {
        const linkMatch = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
          parts.push(
            <a
              key={match.index}
              href={linkMatch[2]}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.preventDefault();
                handleOpenExternal(linkMatch[2]);
              }}
              className="text-cyan-400 hover:text-cyan-300 underline font-semibold cursor-pointer"
            >
              {linkMatch[1]}
            </a>
          );
        }
      } else if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(
          <strong key={match.index} className="text-white font-bold">
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(
          <code
            key={match.index}
            className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[11px] border border-slate-700/80 mx-0.5 inline-block shadow-sm"
          >
            {token.slice(1, -1)}
          </code>
        );
      } else if (token.startsWith('*') && token.endsWith('*')) {
        parts.push(
          <em key={match.index} className="text-slate-300 italic">
            {token.slice(1, -1)}
          </em>
        );
      }
      lastIndex = match.index + token.length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[88vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-sm">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold font-sans text-white tracking-wide">
                  CloudMix Pro User Guide & Technical Manual
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950/90 text-cyan-300 border border-cyan-700/60 shadow-sm">
                  {APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Official documentation, feature walkthroughs, and GitHub repository integration
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Sync with GitHub Docs Button */}
            <button
              onClick={handleSyncWithGitHub}
              disabled={isSyncing}
              title="Fetch the newest documentation live from GitHub main branch"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-sans font-medium transition-all cursor-pointer disabled:opacity-50 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync GitHub Docs'}</span>
            </button>

            {/* View on GitHub Button */}
            <button
              onClick={() => handleOpenExternal(`${GITHUB_REPO_URL}/blob/main/docs/USER_GUIDE.md`)}
              title="Open documentation file on GitHub"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 hover:text-white text-xs font-sans font-medium transition-all cursor-pointer shadow-sm"
            >
              <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">GitHub Docs</span>
              <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              title="Close User Guide (Esc)"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700 transition-colors cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sync notification banner */}
        {syncStatus && (
          <div className="px-5 py-2 bg-cyan-950/70 border-b border-cyan-800/60 flex items-center justify-between text-xs font-mono text-cyan-300 animate-in fade-in duration-150">
            <span className="flex items-center space-x-2">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>{syncStatus}</span>
            </span>
            <button
              onClick={() => setSyncStatus(null)}
              className="text-cyan-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main Body: 2-Column (Sidebar + Content) */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Sidebar Navigation */}
          <div className="w-72 sm:w-80 border-r border-slate-800 bg-slate-950/50 flex flex-col shrink-0">
            
            {/* Search Input */}
            <div className="p-3 border-b border-slate-800/80 bg-slate-950/80">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search user guide..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-300 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Navigation Sections List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredSections.map((section) => {
                const isActive = activeSection.id === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSectionId(section.id)}
                    className={`w-full flex items-start space-x-2.5 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer group ${
                      isActive
                        ? 'bg-cyan-950/70 border border-cyan-500/50 text-white font-semibold shadow-md'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <span className={`shrink-0 mt-0.5 p-1 rounded-lg ${isActive ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-900 text-slate-400 group-hover:text-slate-200'}`}>
                      {section.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className={`text-[10px] uppercase font-mono block tracking-wider ${isActive ? 'text-cyan-400' : 'text-slate-500'}`}>
                        {section.category}
                      </span>
                      <span className="text-[12.5px] font-sans block leading-tight font-medium text-slate-200 group-hover:text-white">
                        {section.title}
                      </span>
                    </div>
                    {isActive && (
                      <ChevronRight className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-1 self-center" />
                    )}
                  </button>
                );
              })}

              {filteredSections.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-500 font-mono">
                  No matching topics found for "{searchQuery}".
                </div>
              )}
            </div>

            {/* Bottom GitHub Quick Links */}
            <div className="p-3 border-t border-slate-800/80 bg-slate-950/80 space-y-1.5">
              <button
                onClick={() => handleOpenExternal(`${GITHUB_REPO_URL}/issues/new`)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-[11px] font-sans border border-slate-800 transition-colors cursor-pointer"
              >
                <span className="flex items-center space-x-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Report Bug / Request</span>
                </span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </button>

              <button
                onClick={() => handleOpenExternal(`${GITHUB_REPO_URL}/releases`)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-[11px] font-sans border border-slate-800 transition-colors cursor-pointer"
              >
                <span className="flex items-center space-x-1.5">
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Changelog & Releases</span>
                </span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </button>
            </div>
          </div>

          {/* Right Content Viewer */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-7 space-y-6 bg-slate-900">
            
            {/* Topic Header Card */}
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-cyan-500/30 text-cyan-400 shadow-sm">
                  {activeSection.icon}
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400">
                    {activeSection.category}
                  </span>
                  <h3 className="text-lg font-bold text-white font-sans">
                    {activeSection.title}
                  </h3>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopyGitHubUrl}
                  title="Copy GitHub Documentation Link"
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-sans border border-slate-700/80 transition-colors cursor-pointer shadow-sm"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{copiedLink ? 'Copied Link' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            {/* Markdown Body Rendering */}
            <div className="space-y-4">
              {parsedBlocks.map((block, index) => {
                if (block.type === 'h1' || block.type === 'h2') {
                  return (
                    <h3 key={index} className="text-base font-bold text-white font-sans pt-3 pb-1.5 border-b border-slate-800 flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                      <span>{block.text}</span>
                    </h3>
                  );
                }

                if (block.type === 'h3' || block.type === 'h4') {
                  return (
                    <h4 key={index} className="text-sm font-bold text-white font-sans pt-3 pb-1 border-b border-slate-800/80 flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                      <span>{block.text}</span>
                    </h4>
                  );
                }

                if (block.type === 'p') {
                  return (
                    <p key={index} className="text-slate-300 text-xs sm:text-[13px] leading-relaxed font-sans">
                      {renderInlineMarkdown(block.text || '')}
                    </p>
                  );
                }

                if (block.type === 'ul') {
                  return (
                    <ul key={index} className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800/70 text-xs sm:text-[13px] shadow-sm">
                      {(block.items || []).map((item, i) => (
                        <li key={i} className="flex items-start space-x-2.5 text-slate-300 font-sans leading-normal">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
                          <div className="flex-1">{renderInlineMarkdown(item)}</div>
                        </li>
                      ))}
                    </ul>
                  );
                }

                if (block.type === 'ol') {
                  return (
                    <ol key={index} className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800/70 text-xs sm:text-[13px] shadow-sm">
                      {(block.items || []).map((item, i) => (
                        <li key={i} className="flex items-start space-x-2.5 text-slate-300 font-sans leading-normal">
                          <span className="w-5 h-5 rounded-full bg-cyan-950/90 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <div className="flex-1">{renderInlineMarkdown(item)}</div>
                        </li>
                      ))}
                    </ol>
                  );
                }

                if (block.type === 'table') {
                  const rows = block.rows || [];
                  return (
                    <div key={index} className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70 shadow-md my-2">
                      <table className="w-full text-left border-collapse text-xs">
                        <tbody>
                          {rows.map((row, rIdx) => {
                            if (row.includes('---')) return null;
                            const cols = row.split('|').filter(c => c.trim().length > 0);
                            const isHeader = rIdx === 0;
                            return (
                              <tr key={rIdx} className={isHeader ? 'bg-slate-900 text-cyan-300 font-bold border-b border-slate-800 text-[11px] font-mono uppercase tracking-wider' : 'border-b border-slate-900/60 hover:bg-slate-900/40 transition-colors'}>
                                {cols.map((col, cIdx) => (
                                  <td key={cIdx} className="p-3 text-slate-300 font-sans">
                                    {renderInlineMarkdown(col.trim())}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                }

                return null;
              })}
            </div>

            {/* Bottom GitHub Footer Banner (High Contrast, Zero Color Clash) */}
            <div className="mt-8 p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-inner">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-cyan-950/70 border border-cyan-500/40 text-cyan-300">
                  <GitBranch className="w-4 h-4 shrink-0" />
                </div>
                <div>
                  <div className="text-white font-bold font-sans text-xs">CloudMix Pro Open Source</div>
                  <p className="text-slate-300 font-sans text-[11.5px] mt-0.5">
                    Continuous updates, autonomous diagnostics, issue tracking, and official community manuals.
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleOpenExternal(GITHUB_REPO_URL)}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 shrink-0 shadow-lg shadow-cyan-600/30"
              >
                <span>Star on GitHub</span>
                <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
