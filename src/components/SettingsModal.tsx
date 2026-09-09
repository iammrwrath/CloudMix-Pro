import React, { useState } from 'react';
import { Cloud, HardDrive, Wifi, Check, X, Shield } from 'lucide-react';
import { googleDriveService } from '../services/GoogleDriveService';
import { cloudProgression } from '../services/CloudProgressionService';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const currentConfig = googleDriveService.getConfig();
  const [apiKey, setApiKey] = useState(currentConfig.apiKey || '');
  const [clientId, setClientId] = useState(currentConfig.clientId || '');
  const [folderId, setFolderId] = useState(currentConfig.folderId || '');
  const [localDrivePath, setLocalDrivePath] = useState('G:\\My Drive\\Music');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    googleDriveService.setConfig({
      apiKey,
      clientId,
      folderId,
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-dj-panel border border-dj-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dj-border bg-dj-surface/90">
          <div className="flex items-center space-x-2">
            <Cloud className="w-5 h-5 text-blue-400" />
            <span className="font-bold text-base text-white">Google Drive & Cloud Sync Settings</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4">
          <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-3 text-xs text-blue-200 flex items-start space-x-2">
            <Shield className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <span>
              CloudMix Pro streams your music directly from Google Drive using high-speed chunked
              range requests and caches tracks locally for flawless offline gig safety.
            </span>
          </div>

          {/* Local Mirrored Drive Path */}
          <div className="bg-dj-surface rounded-xl p-3 border border-dj-border">
            <label className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1">
              LOCAL GOOGLE DRIVE MIRRORED PATH
            </label>
            <div className="flex items-center space-x-2">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <input
                type="text"
                value={localDrivePath}
                onChange={(e) => setLocalDrivePath(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Direct access from your local Google Drive folder gives 0ms load times with cloud sync.
            </span>
          </div>

          {/* API Key */}
          <div className="bg-dj-surface rounded-xl p-3 border border-dj-border">
            <label className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1">
              GOOGLE DRIVE API KEY (OPTIONAL FOR DIRECT CLOUD STREAMING)
            </label>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Target Folder ID */}
          <div className="bg-dj-surface rounded-xl p-3 border border-dj-border">
            <label className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1">
              GOOGLE DRIVE MUSIC FOLDER ID
            </label>
            <input
              type="text"
              placeholder="e.g. 1a2b3c4d5e6f7g8h9..."
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end space-x-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center space-x-1.5"
            >
              {saved ? <Check className="w-3.5 h-3.5" /> : null}
              <span>{saved ? 'Saved!' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
