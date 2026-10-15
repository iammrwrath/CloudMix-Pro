import React, { useState, useEffect } from 'react';
import { updateService, UpdateStatus } from '../services/UpdateService';
import {
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  GitBranch,
  ExternalLink,
  X,
  Sparkles,
  Zap,
  Maximize2,
  Minimize2,
  FileText,
  ChevronRight,
} from 'lucide-react';

interface PatchUpdateModalProps {
  onClose: () => void;
}

export const PatchUpdateModal: React.FC<PatchUpdateModalProps> = ({ onClose }) => {
  const [status, setStatus] = useState<UpdateStatus>(updateService.getStatus());
  const [releaseNotes, setReleaseNotes] = useState<string>('');
  const [releaseName, setReleaseName] = useState<string>('');
  const [releaseTag, setReleaseTag] = useState<string>('');
  const [publishedAt, setPublishedAt] = useState<string>('');
  const [assetSize, setAssetSize] = useState<string>('');
  const [loadingNotes, setLoadingNotes] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  useEffect(() => {
    const unsub = updateService.subscribe((s) => {
      setStatus(s);
    });

    // Fetch rich release details from GitHub API
    fetchGitHubReleaseInfo();

    return () => unsub();
  }, []);

  const extractVersionChangelog = (changelogText: string, targetTag: string): string | null => {
    if (!changelogText) return null;
    const normTag = targetTag.replace(/^v/i, '').trim();
    const lines = changelogText.split(/\r?\n/);
    const captured: string[] = [];
    let capturing = false;

    for (const line of lines) {
      if (line.match(new RegExp(`^##\\s*v?${normTag.replace(/\\./g, '\\.')}\\b`))) {
        capturing = true;
        continue;
      }
      if (capturing) {
        if (line.match(/^##\s*v?\d/) || line.match(/^#\s*Changelog/)) {
          break;
        }
        captured.push(line);
      }
    }
    const result = captured.join('\n').trim();
    return result.length > 0 ? result : null;
  };

  const fetchGitHubReleaseInfo = async () => {
    setLoadingNotes(true);
    try {
      const resp = await fetch('https://api.github.com/repos/iammrwrath/CloudMix-Pro/releases?per_page=10');
      if (resp.ok) {
        const releases = await resp.json();
        const data = Array.isArray(releases)
          ? releases.find((r: any) => /^v\d+\.\d+\.\d+/.test(r.tag_name || '') && !r.tag_name?.includes('mixcortex')) || releases[0]
          : releases;
        if (data) {
          const tag = data.tag_name || '';
          setReleaseTag(tag);
          setReleaseName(data.name || data.tag_name || 'Latest Release');
          
          let notes = (data.body || '').trim();
          // If GitHub body is just the generic compare link or blank, fetch detailed notes from CHANGELOG.md
          if (!notes || notes.startsWith('**Full Changelog**:') || notes.length < 50) {
            try {
              const clResp = await fetch('https://raw.githubusercontent.com/iammrwrath/CloudMix-Pro/main/CHANGELOG.md');
              if (clResp.ok) {
                const clText = await clResp.text();
                const parsed = extractVersionChangelog(clText, tag || 'v2.0.5');
                if (parsed) {
                  notes = parsed;
                }
              }
            } catch {
              // fallback to raw notes
            }
          }

          setReleaseNotes(notes || 'No release notes provided for this release.');
          if (data.published_at) {
            setPublishedAt(new Date(data.published_at).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            }));
          }
          const exeAsset = data.assets?.find((a: any) => a.name.toLowerCase().includes('cloudmix') && a.name.toLowerCase().includes('setup') && a.name.endsWith('.exe')) ||
                           data.assets?.find((a: any) => a.name.toLowerCase().includes('cloudmix') && a.name.endsWith('.exe')) ||
                           data.assets?.find((a: any) => a.name.toLowerCase().includes('setup') && a.name.endsWith('.exe'));
          if (exeAsset) {
            if (exeAsset.size) {
              const mb = (exeAsset.size / (1024 * 1024)).toFixed(1);
              setAssetSize(`${mb} MB`);
            }
            if (exeAsset.browser_download_url) {
              setDownloadUrl(exeAsset.browser_download_url);
            }
          }
        }
      }
    } catch {
      // Fallback
    } finally {
      setLoadingNotes(false);
    }
  };

function isNewer(latest: string, current: string): boolean {
  if (!latest || !current) return false;
  const pLatest = latest.replace(/^v/i, '').trim().split('.').map(n => parseInt(n, 10) || 0);
  const pCurrent = current.replace(/^v/i, '').trim().split('.').map(n => parseInt(n, 10) || 0);
  const maxLen = Math.max(pLatest.length, pCurrent.length, 3);
  for (let i = 0; i < maxLen; i++) {
    const l = pLatest[i] || 0;
    const c = pCurrent[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }
  return false;
}

  const handleDownload = () => {
    updateService.startDownload();
  };

  const handleApply = () => {
    updateService.restartAndApply();
  };

  const handleCheck = () => {
    updateService.checkForUpdates();
    fetchGitHubReleaseInfo();
  };

  const installedVersion = (status.version || '1.4.5').replace(/^v/i, '');
  const rawTag = releaseTag || releaseName;
  const latestVersion = (rawTag.match(/v?([0-9]+\.[0-9]+\.[0-9]+)/)?.[1] || rawTag.match(/v?[0-9.]+/)?.[0] || '1.4.5').replace(/^v/i, '');
  const hasNewerVersion = isNewer(latestVersion, installedVersion);

  const isDownloading = status.status === 'downloading';
  const isDownloaded = status.status === 'downloaded';
  const isAvailable = (status.status === 'available' || hasNewerVersion) && hasNewerVersion && !isDownloading && !isDownloaded;
  const isChecking = status.status === 'checking';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className={`bg-[#0b0e17] border border-slate-800 rounded-2xl w-full shadow-2xl overflow-hidden flex flex-col select-none font-sans transition-all duration-300 ${
        isExpanded ? 'max-w-3xl max-h-[94vh]' : 'max-w-xl max-h-[88vh]'
      }`}>
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 via-pink-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Download className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-white text-sm sm:text-base font-mono">
                  CloudMix Pro Patch Downloader
                </h3>
                <span className="px-1.5 py-0.2 rounded text-[9.5px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  GITHUB SYNC
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Direct in-app release delivery and hot-patch updates
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors"
              title={isExpanded ? 'Collapse Modal' : 'Expand Modal'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Version Comparison Card */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex flex-col">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
                Installed Version
              </span>
              <span className="font-mono text-base font-bold text-slate-200 mt-0.5">
                v{installedVersion}
              </span>
              <span className="text-[10.5px] text-slate-500 mt-0.5">Current workstation build</span>
            </div>

            <div className="flex flex-col border-l border-slate-800 pl-3">
              <span className="text-[10px] font-mono uppercase text-purple-400 font-semibold tracking-wider flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span>GitHub Latest</span>
              </span>
              <span className="font-mono text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-300 mt-0.5">
                v{latestVersion}
              </span>
              <span className="text-[10.5px] text-slate-500 mt-0.5">
                {publishedAt ? `Published ${publishedAt}` : 'Available on GitHub'}
              </span>
            </div>
          </div>

          {/* Status Alert Banner */}
          {isDownloaded ? (
            <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-xs text-emerald-200 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="flex-1">
                <span className="font-bold">Patch downloaded and verified!</span>
                <p className="text-[11px] text-emerald-300/80 mt-0.5">
                  Click "Restart & Apply" below to install the patch and relaunch CloudMix Pro.
                </p>
              </div>
            </div>
          ) : isDownloading ? (
            <div className="space-y-2 p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/40 shadow-sm">
              <div className="flex items-center justify-between text-xs text-purple-200 font-mono">
                <span className="flex items-center space-x-2 font-bold">
                  <RefreshCw className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                  <span>Downloading patch...</span>
                </span>
                <span className="text-purple-300 font-bold">{status.percent || 0}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-200"
                  style={{ width: `${status.percent || 0}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-purple-400 font-mono">
                <span>Streaming from GitHub Releases</span>
                {assetSize && <span>Asset size: ~{assetSize}</span>}
              </div>
            </div>
          ) : isAvailable ? (
            <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-purple-950/40 border border-purple-500/50 text-xs text-purple-200">
              <Zap className="w-4 h-4 text-purple-400 shrink-0" />
              <div className="flex-1">
                <span className="font-bold">New update available on GitHub!</span>
                <p className="text-[11px] text-purple-300/80 mt-0.5">
                  A new patch is ready to download. You can download and install it directly without leaving the app.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <div className="flex-1">
                <span className="font-semibold text-slate-200">
                  {status.message || 'CloudMix Pro is currently up to date.'}
                </span>
              </div>
              <button
                onClick={handleCheck}
                disabled={isChecking}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-mono transition-colors cursor-pointer disabled:opacity-50"
              >
                {isChecking ? 'Checking...' : 'Check Again'}
              </button>
            </div>
          )}

          {/* Release Notes Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                  Release Notes / Changelog
                </span>
              </div>
              <div className="flex items-center space-x-2.5">
                {assetSize && (
                  <span className="text-[10px] font-mono text-slate-500">
                    Installer: {assetSize}
                  </span>
                )}
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex items-center space-x-1 text-[11px] font-mono text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
                >
                  {isExpanded ? (
                    <>
                      <Minimize2 className="w-3 h-3" />
                      <span>Compact</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3 h-3" />
                      <span>Expand</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className={`p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 text-xs text-slate-300 font-mono overflow-y-auto leading-relaxed transition-all duration-300 ${
              isExpanded ? 'max-h-96 min-h-[220px]' : 'max-h-56'
            }`}>
              {loadingNotes ? (
                <div className="flex items-center justify-center py-8 text-slate-500">
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  <span>Loading changelog details...</span>
                </div>
              ) : releaseNotes ? (
                <div className="space-y-2">
                  {releaseNotes.split(/\r?\n/).map((line, idx) => {
                    const trimmed = line.trim();
                    if (!trimmed) return null;

                    // Markdown header / category
                    if (trimmed.startsWith('##')) {
                      return (
                        <div key={idx} className="text-xs font-bold text-cyan-400 pt-1 pb-0.5 border-b border-slate-800/70">
                          {trimmed.replace(/^#+\s*/, '')}
                        </div>
                      );
                    }

                    // Bullet points
                    if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
                      const cleanText = trimmed.replace(/^[-*]\s+/, '');
                      const isSubBullet = line.startsWith('  ') || line.startsWith('\t');
                      return (
                        <div
                          key={idx}
                          className={`flex items-start space-x-2 ${isSubBullet ? 'pl-4 text-slate-400 text-[11px]' : 'text-slate-200 text-xs font-medium'}`}
                        >
                          <span className="text-purple-400 mt-1 shrink-0">•</span>
                          <span className="break-words leading-relaxed">
                            {cleanText.split('**').map((part, pIdx) =>
                              pIdx % 2 === 1 ? (
                                <strong key={pIdx} className="text-white font-semibold">
                                  {part}
                                </strong>
                              ) : (
                                part
                              )
                            )}
                          </span>
                        </div>
                      );
                    }

                    // Compare diff URL
                    if (trimmed.includes('github.com') && trimmed.includes('/compare/')) {
                      const diffUrl = trimmed.replace(/^\*\*Full Changelog\*\*:\s*/, '').trim();
                      return (
                        <div key={idx} className="pt-2 text-[11px] text-slate-400 border-t border-slate-900 flex items-center justify-between">
                          <span>Compare Diff:</span>
                          <a
                            href={diffUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-purple-400 hover:text-purple-300 underline inline-flex items-center space-x-1"
                          >
                            <span>View Full Git Diff</span>
                            <ExternalLink className="w-3 h-3 ml-0.5" />
                          </a>
                        </div>
                      );
                    }

                    return (
                      <p key={idx} className="text-slate-300 leading-relaxed">
                        {trimmed}
                      </p>
                    );
                  })}
                </div>
              ) : (
                <span className="text-slate-500">No release notes available.</span>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-3.5 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
          <a
            href="https://github.com/iammrwrath/CloudMix-Pro/releases"
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-cyan-400 font-mono transition-colors"
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>GitHub Releases</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
            >
              Dismiss
            </button>

            {isDownloaded ? (
              <button
                onClick={handleApply}
                className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold shadow-[0_0_14px_rgba(16,185,129,0.5)] cursor-pointer transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Restart & Apply</span>
              </button>
            ) : isDownloading ? (
              <button
                disabled
                className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-purple-900/60 text-purple-300 font-mono text-xs font-semibold cursor-not-allowed border border-purple-500/40"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
                <span>Patching {status.percent || 0}%...</span>
              </button>
            ) : isAvailable ? (
              <button
                onClick={handleDownload}
                className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-mono text-xs font-bold shadow-[0_0_14px_rgba(236,72,153,0.5)] cursor-pointer transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download & Apply Patch</span>
              </button>
            ) : (
              <button
                onClick={handleCheck}
                disabled={isChecking}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                <span>Check for Updates</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
