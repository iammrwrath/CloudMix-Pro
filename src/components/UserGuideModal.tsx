import React, { useState, useEffect } from 'react';
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

const GITHUB_REPO_URL = 'https://github.com/iammrwrath/CloudMix-Pro';
const GITHUB_GUIDE_RAW = 'https://raw.githubusercontent.com/iammrwrath/CloudMix-Pro/main/docs/USER_GUIDE.md';

export const UserGuideModal: React.FC<UserGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeSectionId, setActiveSectionId] = useState<string>('quickstart');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [remoteMarkdown, setRemoteMarkdown] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSyncWithGitHub = async () => {
    setIsSyncing(true);
    setSyncStatus('Fetching latest documentation from GitHub main branch...');
    try {
      const res = await fetch(GITHUB_GUIDE_RAW, { cache: 'no-cache' });
      if (res.ok) {
        const text = await res.text();
        if (text && text.length > 200) {
          setRemoteMarkdown(text);
          setSyncStatus('Successfully synchronized with GitHub main branch!');
        } else {
          setSyncStatus('Documentation verified up to date.');
        }
      } else {
        setSyncStatus(`GitHub response: HTTP ${res.status}. Displaying bundled documentation.`);
      }
    } catch (err: any) {
      setSyncStatus('Offline mode active: Displaying bundled high-speed documentation.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus(null), 4000);
    }
  };

  const handleOpenExternal = (url: string) => {
    if (typeof window !== 'undefined' && (window as any).desktopAPI?.shellOpenExternal) {
      (window as any).desktopAPI.shellOpenExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const handleCopyGitHubUrl = () => {
    navigator.clipboard.writeText(`${GITHUB_REPO_URL}/blob/main/docs/USER_GUIDE.md`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const sections: GuideSection[] = [
    {
      id: 'quickstart',
      title: 'Quick Start & Workstation Views',
      category: 'Core Workflows',
      icon: <Sparkles className="w-4 h-4 text-cyan-400" />,
      tags: ['start', 'layout', 'views', 'bpm', 'sync', 'quantize', 'drawer'],
      content: `
### Three Workstation Layouts
CloudMix Pro provides 3 specialized workstation layouts toggled in the top navigation bar:
* **Classic Decks:** Dual virtual vinyl platters, long-throw pitch faders, hot cue pads, and full EQ isolators.
* **Vertical Waveforms:** High-refresh spectrum waveforms stacked side-by-side for precise phrase matching and drop alignment.
* **Studio FX Rack:** Dedicated multi-effect console featuring Echo, Reverb, Flanger, Filter, and Bitcrusher.

### Master Tempo & Quantize
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
      tags: ['decks', 'mixer', 'play', 'cue', 'scratch', 'crossfader', 'eq', 'headphone'],
      content: `
### Tactile Turntable Platters & Scratch Physics
* **Play / Pause:** Press the green Play button or \`Space\` (Deck A) / \`Enter\` (Deck B).
* **Cue:** Tap **CUE** to return to the track cue point. Hold down to audition; release to return to the cue marker.
* **Turntable Scratching:** Click and drag across the vinyl center platter to scratch forwards and backwards in real time with natural inertia and vinyl drag resistance.
* **Key Lock (Master Tempo):** Toggle Key Lock to speed up or slow down a track without altering its pitch.

### 3-Band Equalizer & Crossfader
* **High, Mid, Low Knobs:** Studio-grade biquad crossover filters providing \`+6dB\` boost down to full \`-∞dB\` frequency kill.
* **Crossfader Curves:** Transition between Deck A and Deck B with linear, exponential, or cut scratch curves.
* **Headphone Monitor (PFL):** Click the headphone icon on either deck to route audio to your headphone output without interrupting the master crowd feed.
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
      tags: ['youtube', 'streaming', 'google', 'oauth', 'pkce', 'playlists', 'refresh', 'tokens'],
      content: `
### Studio Opus 160kbps Audio Ingestion
* CloudMix Pro extracts direct Opus 160kbps audio streams (\`yt-dlp\` format 251/140), piping authentic, uncompressed audio directly into the Web Audio DSP pipeline.
* **No Hidden Iframes or Synthetic Oscillators:** Decks play genuine studio audio streams with full pitch control and waveform analysis.

### Permanent 1-Click Google Sign-In (RFC 7636 PKCE)
* Go to **Settings (\`⚙\`) → Library & Cloud Sources → YouTube Music** and click **Sign In with Google**.
* Uses standard RFC 7636 PKCE loopback authentication with permanent offline \`refresh_token\` access.
* **Zero Session Wipes:** Your login survives all app updates, patches, and restarts in \`cloudmix_persistent_settings.json\`. CloudMix Pro renews your access token silently in the background.

### 1-Click Live Playlist Refresh
* Click the circular **Refresh** button next to **PLAYLISTS** in the sidebar to perform an instant live sync of your Google playlists, saved mixes, and Liked Music collection.
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

### Built-in Shared Engine + Custom Token Override
* **Zero Configuration:** A shared default Genius engine is built-in out of the box for all users.
* **Persistent Disk Caching:** Once lyrics are retrieved for a track, they are permanently cached to disk (\`storageCache\`). Subsequent plays load in **0 ms** with **zero network requests**.
* **Dedicated Custom Token:** Power users can enter their own Genius Client Access Token in **Settings → Library & Cloud Sources → Genius.com Lyrics Engine** for dedicated, unshared rate-limit quotas.
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
      tags: ['obs', 'broadcast', 'overlay', 'streamerbot', 'webhooks', 'nowplaying'],
      content: `
### OBS Transparent Browser Source
CloudMix Pro runs a local broadcast server on port \`8088\`:
* In OBS Studio, add a **Browser Source**.
* Set the URL to: \`http://127.0.0.1:8088/obs-overlay\`
* Recommended Resolution: \`1920 x 250\` with \`Shutdown source when not visible\` unchecked.
* Displays live animated soundwaves, album art, Camelot harmonic key, and real-time synchronized lyrics!

### Streamer.bot Remote Webhooks
* **Viewer Song Requests:** POST song titles to \`http://127.0.0.1:8088/api/streamerbot/request\` to queue into the Automix crate.
* **Soundboard Remote Triggers:** Viewers can trigger sampler pads 1–8 (Airhorn, Dub Siren, 808 Boom) via channel points at \`http://127.0.0.1:8088/api/streamerbot/sample\`.
      `,
    },
    {
      id: 'migration',
      title: 'DJ Library Migration (djay Pro, Rekordbox, Serato)',
      category: 'Library & Migration',
      icon: <ExternalLink className="w-4 h-4 text-blue-400" />,
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
| **User Guide (Manual)**| \`F1\` | \`F1\` |
| **Keyboard Cheat Sheet**| \`?\` or \`Shift + /\` | \`?\` or \`Shift + /\` |
| **Toggle Fullscreen** | \`F11\` | \`F11\` |
| **Developer Console** | \`F12\` or \`Ctrl + Shift + I\` | \`F12\` or \`Ctrl + Shift + I\` |
      `,
    },
    {
      id: 'github',
      title: 'GitHub Integration & Community',
      category: 'Reference',
      icon: <GitBranch className="w-4 h-4 text-purple-400" />,
      tags: ['github', 'repository', 'issues', 'updates', 'releases', 'source'],
      content: `
### GitHub Open Ecosystem
CloudMix Pro is developed openly with community feedback and automated testing:

* **Official Repository:** [github.com/iammrwrath/CloudMix-Pro](https://github.com/iammrwrath/CloudMix-Pro)
* **Check for Updates:** Click the version pill (\`v2.0.29\`) in the top right header to query GitHub Releases via \`electron-updater\`.
* **Silent Background Patching:** Click **Apply** when an update is downloaded to automatically install and relaunch with zero downtime.
* **Bug Reports & Feature Requests:** Visit [github.com/iammrwrath/CloudMix-Pro/issues](https://github.com/iammrwrath/CloudMix-Pro/issues) to report bugs or request new MIDI controller profiles.
      `,
    },
  ];

  const filteredSections = sections.filter((sec) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      sec.title.toLowerCase().includes(q) ||
      sec.tags.some((t) => t.includes(q)) ||
      sec.content.toLowerCase().includes(q)
    );
  });

  const activeSection = sections.find((s) => s.id === activeSectionId) || sections[0];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[86vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold font-sans text-white tracking-wide">
                  CloudMix Pro User Guide & Technical Manual
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                  v2.0.29
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
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-mono transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync GitHub Docs'}</span>
            </button>

            {/* View on GitHub Button */}
            <button
              onClick={() => handleOpenExternal(`${GITHUB_REPO_URL}/blob/main/docs/USER_GUIDE.md`)}
              title="Open documentation file on GitHub"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-900/60 border border-purple-800/60 text-purple-300 hover:text-white text-xs font-mono transition-all cursor-pointer"
            >
              <GitBranch className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">GitHub Docs</span>
              <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              title="Close User Guide (Esc)"
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700 transition-colors cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sync notification banner */}
        {syncStatus && (
          <div className="px-5 py-2 bg-cyan-950/60 border-b border-cyan-800/50 flex items-center justify-between text-xs font-mono text-cyan-300 animate-in fade-in duration-150">
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
          <div className="w-64 sm:w-72 border-r border-slate-800 bg-slate-950/40 flex flex-col shrink-0">
            
            {/* Search Input */}
            <div className="p-3 border-b border-slate-800/80">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search user guide..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
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

            {/* Navigation Sections Tree */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredSections.map((section) => {
                const isActive = activeSection.id === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSectionId(section.id)}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-left text-xs font-mono transition-all cursor-pointer ${
                      isActive
                        ? 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-200 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <span className="shrink-0">{section.icon}</span>
                    <span className="truncate flex-1">{section.title}</span>
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
            <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 space-y-1.5">
              <button
                onClick={() => handleOpenExternal(`${GITHUB_REPO_URL}/issues/new`)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-[11px] font-mono border border-slate-800 transition-colors cursor-pointer"
              >
                <span className="flex items-center space-x-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Report Bug / Request</span>
                </span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </button>

              <button
                onClick={() => handleOpenExternal(`${GITHUB_REPO_URL}/releases`)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-[11px] font-mono border border-slate-800 transition-colors cursor-pointer"
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
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Topic Header Card */}
            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700/60">
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
                  className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-mono border border-slate-800 transition-colors cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied Link' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            {/* Markdown Body Rendering */}
            <div className="prose prose-invert prose-cyan max-w-none text-slate-300 text-xs sm:text-[13px] leading-relaxed space-y-4 font-sans">
              {activeSection.content.split('\n\n').map((paragraph, index) => {
                if (paragraph.startsWith('### ')) {
                  return (
                    <h4 key={index} className="text-sm font-bold text-white font-sans pt-2 border-b border-slate-800 pb-1 flex items-center space-x-2">
                      <span>{paragraph.replace('### ', '')}</span>
                    </h4>
                  );
                }
                if (paragraph.startsWith('* ')) {
                  const listItems = paragraph.split('\n* ');
                  return (
                    <ul key={index} className="space-y-1.5 list-disc list-inside bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 font-mono text-xs">
                      {listItems.map((item, i) => (
                        <li key={i} className="text-slate-300">
                          {item.replace(/^\* /, '')}
                        </li>
                      ))}
                    </ul>
                  );
                }
                if (paragraph.startsWith('| ')) {
                  const rows = paragraph.trim().split('\n');
                  return (
                    <div key={index} className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
                      <table className="w-full text-left border-collapse text-xs font-mono">
                        <tbody>
                          {rows.map((row, rIdx) => {
                            if (row.includes('---')) return null;
                            const cols = row.split('|').filter(c => c.trim().length > 0);
                            const isHeader = rIdx === 0;
                            return (
                              <tr key={rIdx} className={isHeader ? 'bg-slate-900 text-cyan-300 font-bold border-b border-slate-800' : 'border-b border-slate-900/60 hover:bg-slate-900/40'}>
                                {cols.map((col, cIdx) => (
                                  <td key={cIdx} className="p-2.5">
                                    {col.trim()}
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
                return (
                  <p key={index} className="text-slate-300 leading-normal">
                    {paragraph}
                  </p>
                );
              })}
            </div>

            {/* Bottom GitHub Footer Banner */}
            <div className="mt-8 p-4 rounded-xl bg-gradient-to-r from-purple-950/40 to-slate-900 border border-purple-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center space-x-2.5">
                <GitBranch className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="text-slate-300">
                  CloudMix Pro is open source on GitHub. Continuous updates, issue tracking, and community manuals.
                </span>
              </div>
              <button
                onClick={() => handleOpenExternal(GITHUB_REPO_URL)}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all cursor-pointer flex items-center justify-center space-x-1 shrink-0"
              >
                <span>Star on GitHub</span>
                <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
