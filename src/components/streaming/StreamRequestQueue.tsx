import React, { useState } from 'react';
import { Radio, Tv, MessageSquare, Music, Plus, Check, Trash2, X, ExternalLink, Copy, Sparkles } from 'lucide-react';
import { TrackMetadata } from '../../types/dj';

export interface StreamSongRequest {
  id: string;
  viewer: string;
  song: string;
  artist?: string;
  tip?: number | string;
  source?: 'twitch' | 'youtube' | 'kick' | 'streamerbot';
  timestamp: string;
  status: 'pending' | 'accepted' | 'loaded';
}

interface StreamRequestQueueProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadTrackToDeck: (deckId: 'A' | 'B', request: StreamSongRequest) => void;
  requests: StreamSongRequest[];
  onDismissRequest: (id: string) => void;
  onClearAllRequests: () => void;
}

export const StreamRequestQueue: React.FC<StreamRequestQueueProps> = ({
  isOpen,
  onClose,
  onLoadTrackToDeck,
  requests,
  onDismissRequest,
  onClearAllRequests,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const obsUrl = 'http://127.0.0.1:8088/obs-overlay';

  if (!isOpen) return null;

  const handleCopyObsUrl = () => {
    navigator.clipboard.writeText(obsUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-dj-panel border border-dj-border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dj-border bg-dj-surface/90">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center shadow-md">
              <Radio className="w-4 h-4 text-black" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base text-white">Live Stream & Request Hub</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-bold">
                  PORT 8088 LIVE
                </span>
              </div>
              <p className="text-xs text-slate-400">Streamer.bot & OBS Studio Interactive Control Center</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* OBS Browser Source Link Box */}
        <div className="p-4 bg-slate-900/60 border-b border-dj-border/80">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
              <Tv className="w-3.5 h-3.5 text-cyan-400" />
              <span>OBS STUDIO BROWSER SOURCE URL</span>
            </span>
            <span className="text-[10px] text-slate-400">Transparent Glassmorphic HUD</span>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={obsUrl}
              className="flex-1 bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs font-mono text-cyan-300 select-all"
            />
            <button
              onClick={handleCopyObsUrl}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-xs flex items-center space-x-1 transition-all cursor-pointer shadow-md active:scale-95"
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedUrl ? 'Copied!' : 'Copy URL'}</span>
            </button>
            <a
              href={obsUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Preview in Browser"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Requests List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[220px]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
              <span>Viewer Song Requests ({requests.length})</span>
            </span>
            {requests.length > 0 && (
              <button
                onClick={onClearAllRequests}
                className="text-[10px] font-mono text-rose-400 hover:text-rose-300 flex items-center space-x-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear All</span>
              </button>
            )}
          </div>

          {requests.length === 0 ? (
            <div className="text-center py-10 px-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/40">
              <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-400">No Song Requests Yet</p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-1">
                Viewers in your Twitch or YouTube chat can type <code className="text-cyan-400">!request &lt;song&gt;</code> to send requests directly into this live queue.
              </p>
            </div>
          ) : (
            requests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all shadow-sm"
              >
                <div className="flex items-center space-x-3 overflow-hidden mr-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-950/80 border border-purple-800 flex items-center justify-center shrink-0">
                    <Music className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-white truncate">{req.song}</span>
                      {req.tip && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/80">
                          {req.tip}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                      <span className="text-purple-300 font-semibold">@{req.viewer}</span>
                      <span>•</span>
                      <span>{req.timestamp}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0">
                  <button
                    onClick={() => onLoadTrackToDeck('A', req)}
                    className="px-2 py-1 rounded-lg bg-cyan-950/80 border border-cyan-700/80 text-cyan-300 text-[10px] font-mono font-bold hover:bg-cyan-900 transition-colors cursor-pointer"
                  >
                    Load Deck A
                  </button>
                  <button
                    onClick={() => onLoadTrackToDeck('B', req)}
                    className="px-2 py-1 rounded-lg bg-pink-950/80 border border-pink-700/80 text-pink-300 text-[10px] font-mono font-bold hover:bg-pink-900 transition-colors cursor-pointer"
                  >
                    Load Deck B
                  </button>
                  <button
                    onClick={() => onDismissRequest(req.id)}
                    className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-dj-border bg-dj-surface/90 flex justify-between items-center text-[11px] text-slate-400">
          <span>Streamer.bot Webhook: <code className="text-slate-300">/api/streamerbot/request</code></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
