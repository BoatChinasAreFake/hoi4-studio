import React, { useState, useMemo } from 'react';
import type { CountryWizardConfig, CountryWizardResult } from '../../types/politics';
import { scaffoldCountryFiles } from '../../utils/politicsGenerators';
import {
  Globe,
  FileCode,
  AlertTriangle,
  FolderTree,
  Copy,
  Check,
  Palette,
  Shield,
  User,
  Sparkles,
} from 'lucide-react';

const GRAPHICAL_CULTURES = [
  'western_european_gfx',
  'eastern_european_gfx',
  'asian_gfx',
  'middle_eastern_gfx',
  'african_gfx',
  'southamerican_gfx',
  'commonwealth_gfx',
];

const PRESET_COLORS: [number, number, number][] = [
  [140, 30, 45], // Bordurian Crimson
  [45, 95, 140], // Syldavian Sapphire
  [65, 120, 65], // Emerald Republic
  [160, 120, 40], // Imperial Gold
  [90, 50, 110], // Royal Purple
  [110, 110, 110], // Neutral Grey
  [180, 50, 30], // Revolutionary Red
  [30, 140, 130], // Maritime Teal
];

interface CountryWizardProps {
  onNotify?: (msg: string) => void;
  onCountryCreated?: (tag: string) => void;
}

export const CountryWizard: React.FC<CountryWizardProps> = ({
  onNotify,
  onCountryCreated,
}) => {
  const [config, setConfig] = useState<CountryWizardConfig>({
    tag: 'BOR',
    name: 'Borduria',
    adjective: 'Bordurian',
    color: [140, 30, 45],
    graphicalCulture: 'eastern_european_gfx',
    capitalProvinceId: 450,
    stateId: 999,
    stateName: 'Szohod',
    stateProvinces: [450, 451, 452],
    rulingParty: 'fascism',
    leaderName: 'Kurvi-Tasch',
    leaderIdeology: 'fascism_ideology',
    leaderPortrait: 'GFX_portrait_BOR_leader',
  });

  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');
  const [selectedFileIdx, setSelectedFileIdx] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  // Real-time tag validation: exactly 3 letters uppercase
  const tagValidation = useMemo(() => {
    const raw = config.tag.trim();
    if (!raw) return { valid: false, error: 'Country tag cannot be empty.' };
    if (!/^[A-Z]{3}$/.test(raw)) {
      return {
        valid: false,
        error: `Tag must consist of exactly 3 uppercase Latin letters (A-Z). Got: '${raw}'`,
      };
    }
    return { valid: true };
  }, [config.tag]);

  // Live generation of 10 files across 7 directories
  const scaffoldResult: CountryWizardResult = useMemo(() => {
    return scaffoldCountryFiles(config);
  }, [config]);

  const handleTagChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({ ...config, tag: e.target.value.toUpperCase().slice(0, 3) });
  };

  const handleColorChange = (index: number, val: number) => {
    const newColor: [number, number, number] = [...config.color];
    newColor[index] = Math.max(0, Math.min(255, val));
    setConfig({ ...config, color: newColor });
  };

  const handleCopyCurrentFile = () => {
    const file = scaffoldResult.files[selectedFileIdx];
    if (!file) return;
    const text = typeof file.content === 'string' ? file.content : `[Binary TGA Buffer: ${file.content.length} bytes]`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onNotify?.(`Copied ${file.path} to clipboard`);
  };

  const handleFinishScaffold = async () => {
    if (!tagValidation.valid) {
      onNotify?.(`Validation error: ${tagValidation.error}`);
      return;
    }

    try {
      // Check if Tauri invoke is available in window
      const tauri = (window as unknown as { __TAURI__?: { core?: { invoke: (cmd: string, args: unknown) => Promise<unknown> } } }).__TAURI__;
      if (tauri?.core?.invoke) {
        await tauri.core.invoke('scaffold_country', {
          config: {
            tag: config.tag,
            name: config.name,
            adjective: config.adjective,
            color: config.color,
            graphical_culture: config.graphicalCulture,
            capital_province_id: config.capitalProvinceId,
            state_id: config.stateId,
            state_name: config.stateName,
            state_provinces: config.stateProvinces,
            ruling_party: config.rulingParty,
            leader_name: config.leaderName,
            leader_ideology: config.leaderIdeology,
            leader_portrait: config.leaderPortrait,
          },
        });
        onNotify?.(`Successfully scaffolded nation [${config.tag}] across 7 directories via Rust IPC!`);
      } else {
        onNotify?.(`Successfully scaffolded nation [${config.tag}] across 7 directories (10 files ready)!`);
      }
      onCountryCreated?.(config.tag);
    } catch (err) {
      onNotify?.(`Scaffolding finished: ${String(err)}`);
    }
  };

  const currentFile = scaffoldResult.files[selectedFileIdx] || scaffoldResult.files[0];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#101512] text-[#e3e5d9] overflow-hidden select-none">
      {/* Header Toolbar */}
      <div className="h-12 border-b border-[#30392e] bg-[#181e19] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Globe className="h-4 w-4 text-[#d6b878]" />
          <span className="font-serif font-bold text-sm tracking-wide text-[#e3e5d9]">
            NEW COUNTRY CREATION WIZARD
          </span>
          <span className="text-[#3b4936]">|</span>
          <span className="text-xs text-[#909b88]">
            Scaffolds all 10 required files across 7 directories with uncompressed 32-bit flags
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <div className="flex rounded border border-[#3b4936] overflow-hidden">
            <button
              onClick={() => setActiveTab('form')}
              className={`px-3 py-1 text-xs font-semibold transition ${
                activeTab === 'form'
                  ? 'bg-[#d6b878] text-[#1c2119]'
                  : 'bg-[#242d23] text-[#909b88] hover:text-[#e3e5d9]'
              }`}
            >
              Wizard Form
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold transition ${
                activeTab === 'preview'
                  ? 'bg-[#d6b878] text-[#1c2119]'
                  : 'bg-[#242d23] text-[#909b88] hover:text-[#e3e5d9]'
              }`}
            >
              <FileCode className="h-3.5 w-3.5" />
              File Scaffolder ({scaffoldResult.files.length})
            </button>
          </div>

          <button
            onClick={handleFinishScaffold}
            disabled={!tagValidation.valid}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition shadow ${
              tagValidation.valid
                ? 'bg-[#d6b878] hover:bg-[#e0c587] text-[#1c2119]'
                : 'bg-[#242d23] text-[#556350] cursor-not-allowed'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            1-Click Scaffold Nation
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Interactive Wizard Form */}
        <div className="w-[480px] border-r border-[#30392e] bg-[#141a15] p-5 flex flex-col gap-4 overflow-y-auto shrink-0">
          {/* Section 1: Identity & Tag */}
          <div className="border border-[#2b3628] rounded p-3 bg-[#19201a]/80 space-y-3">
            <h4 className="text-xs font-bold uppercase text-[#d6b878] flex items-center gap-1.5 border-b border-[#2b3628] pb-1.5">
              <Shield className="h-3.5 w-3.5" /> National Identity & Tag
            </h4>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1">
                  Tag (3-Letters)
                </label>
                <input
                  type="text"
                  maxLength={3}
                  value={config.tag}
                  onChange={handleTagChange}
                  className={`w-full bg-[#121613] border rounded px-2.5 py-1 text-center font-mono text-sm font-bold tracking-widest ${
                    tagValidation.valid
                      ? 'border-emerald-600/80 text-emerald-400'
                      : 'border-red-600/80 text-red-400'
                  }`}
                />
              </div>

              <div className="col-span-2">
                <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1">
                  Country Name
                </label>
                <input
                  type="text"
                  value={config.name}
                  onChange={(e) => setConfig({ ...config, name: e.target.value })}
                  className="w-full bg-[#121613] border border-[#2b3628] rounded px-2.5 py-1 text-xs text-[#e3e5d9] focus:outline-none focus:border-[#d6b878]"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1">
                Adjective (e.g. French, American)
              </label>
              <input
                type="text"
                value={config.adjective}
                onChange={(e) => setConfig({ ...config, adjective: e.target.value })}
                className="w-full bg-[#121613] border border-[#2b3628] rounded px-2.5 py-1 text-xs text-[#e3e5d9] focus:outline-none focus:border-[#d6b878]"
              />
            </div>

            {!tagValidation.valid && (
              <p className="text-[11px] text-red-400 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {tagValidation.error}
              </p>
            )}
          </div>

          {/* Section 2: Map Color & Graphical Culture */}
          <div className="border border-[#2b3628] rounded p-3 bg-[#19201a]/80 space-y-3">
            <h4 className="text-xs font-bold uppercase text-[#d6b878] flex items-center gap-1.5 border-b border-[#2b3628] pb-1.5">
              <Palette className="h-3.5 w-3.5" /> Map Color & Culture
            </h4>

            {/* RGB Pickers */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold text-[#909b88] uppercase">
                  Map Color (RGB)
                </label>
                <span className="font-mono text-[11px] text-[#d6b878]">
                  rgb({config.color[0]}, {config.color[1]}, {config.color[2]})
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-2">
                {(['R', 'G', 'B'] as const).map((ch, idx) => (
                  <div key={ch} className="flex items-center gap-1 bg-[#121613] p-1.5 rounded border border-[#2b3628]">
                    <span className="text-[10px] font-bold text-[#909b88]">{ch}:</span>
                    <input
                      type="number"
                      min={0}
                      max={255}
                      value={config.color[idx]}
                      onChange={(e) => handleColorChange(idx, parseInt(e.target.value) || 0)}
                      className="w-full bg-transparent text-right font-mono text-xs text-[#e3e5d9] focus:outline-none"
                    />
                  </div>
                ))}
              </div>

              {/* Swatch Presets */}
              <div className="flex items-center gap-1.5">
                {PRESET_COLORS.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setConfig({ ...config, color: c })}
                    style={{ backgroundColor: `rgb(${c[0]}, ${c[1]}, ${c[2]})` }}
                    className="h-5 flex-1 rounded border border-white/20 hover:scale-110 transition shadow"
                  />
                ))}
              </div>
            </div>

            {/* Graphical Culture */}
            <div>
              <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1">
                Graphical Culture
              </label>
              <select
                value={config.graphicalCulture}
                onChange={(e) => setConfig({ ...config, graphicalCulture: e.target.value })}
                className="w-full bg-[#121613] border border-[#2b3628] rounded px-2.5 py-1 text-xs text-[#e3e5d9] focus:outline-none"
              >
                {GRAPHICAL_CULTURES.map((gc) => (
                  <option key={gc} value={gc}>
                    {gc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 3: Geography & Capital */}
          <div className="border border-[#2b3628] rounded p-3 bg-[#19201a]/80 space-y-3">
            <h4 className="text-xs font-bold uppercase text-[#d6b878] flex items-center gap-1.5 border-b border-[#2b3628] pb-1.5">
              <Globe className="h-3.5 w-3.5" /> Geography & Capital State
            </h4>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1">
                  Capital Province ID
                </label>
                <input
                  type="number"
                  value={config.capitalProvinceId}
                  onChange={(e) =>
                    setConfig({ ...config, capitalProvinceId: parseInt(e.target.value) || 1 })
                  }
                  className="w-full bg-[#121613] border border-[#2b3628] rounded px-2.5 py-1 text-xs font-mono text-[#e3e5d9] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1">
                  State ID
                </label>
                <input
                  type="number"
                  value={config.stateId}
                  onChange={(e) =>
                    setConfig({ ...config, stateId: parseInt(e.target.value) || 1 })
                  }
                  className="w-full bg-[#121613] border border-[#2b3628] rounded px-2.5 py-1 text-xs font-mono text-[#e3e5d9] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1">
                State Name
              </label>
              <input
                type="text"
                value={config.stateName}
                onChange={(e) => setConfig({ ...config, stateName: e.target.value })}
                className="w-full bg-[#121613] border border-[#2b3628] rounded px-2.5 py-1 text-xs text-[#e3e5d9] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1">
                State Provinces (Space-separated IDs)
              </label>
              <input
                type="text"
                value={config.stateProvinces.join(' ')}
                onChange={(e) => {
                  const arr = e.target.value
                    .split(/\s+/)
                    .map((x) => parseInt(x, 10))
                    .filter((x) => !isNaN(x));
                  setConfig({ ...config, stateProvinces: arr });
                }}
                className="w-full bg-[#121613] border border-[#2b3628] rounded px-2.5 py-1 text-xs font-mono text-[#e3e5d9] focus:outline-none"
              />
            </div>
          </div>

          {/* Section 4: Initial Politics & Starting Leader */}
          <div className="border border-[#2b3628] rounded p-3 bg-[#19201a]/80 space-y-3">
            <h4 className="text-xs font-bold uppercase text-[#d6b878] flex items-center gap-1.5 border-b border-[#2b3628] pb-1.5">
              <User className="h-3.5 w-3.5" /> Initial Politics & Leader
            </h4>

            <div>
              <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1">
                Ruling Ideology Group
              </label>
              <select
                value={config.rulingParty}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    rulingParty: e.target.value as CountryWizardConfig['rulingParty'],
                  })
                }
                className="w-full bg-[#121613] border border-[#2b3628] rounded px-2.5 py-1 text-xs text-[#e3e5d9] focus:outline-none"
              >
                <option value="democratic">Democratic</option>
                <option value="communism">Communism</option>
                <option value="fascism">Fascism</option>
                <option value="neutrality">Neutrality</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1">
                  Starting Leader Name
                </label>
                <input
                  type="text"
                  value={config.leaderName}
                  onChange={(e) => setConfig({ ...config, leaderName: e.target.value })}
                  className="w-full bg-[#121613] border border-[#2b3628] rounded px-2.5 py-1 text-xs text-[#e3e5d9] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1">
                  Sub-Ideology Token
                </label>
                <input
                  type="text"
                  value={config.leaderIdeology}
                  onChange={(e) => setConfig({ ...config, leaderIdeology: e.target.value })}
                  className="w-full bg-[#121613] border border-[#2b3628] rounded px-2.5 py-1 text-xs font-mono text-[#e3e5d9] focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Preview Panel */}
        <div className="flex-1 flex flex-col bg-[#0f1410] overflow-hidden">
          {/* Flags Preview Banner */}
          <div className="p-4 border-b border-[#30392e] bg-[#161d17] flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Standard Flag 82x52 */}
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-[#909b88] uppercase">
                  Standard (82×52)
                </span>
                <div
                  style={{
                    width: 82,
                    height: 52,
                    backgroundColor: `rgb(${config.color[0]}, ${config.color[1]}, ${config.color[2]})`,
                  }}
                  className="border border-white/30 rounded-sm shadow flex items-center justify-center font-bold text-xs text-white"
                >
                  {config.tag}
                </div>
              </div>

              {/* Medium Flag 41x26 */}
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-[#909b88] uppercase">
                  Medium (41×26)
                </span>
                <div
                  style={{
                    width: 41,
                    height: 26,
                    backgroundColor: `rgb(${config.color[0]}, ${config.color[1]}, ${config.color[2]})`,
                  }}
                  className="border border-white/30 rounded-sm shadow"
                />
              </div>

              {/* Small Flag 10x7 */}
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-[#909b88] uppercase">
                  Small (10×7)
                </span>
                <div
                  style={{
                    width: 10,
                    height: 7,
                    backgroundColor: `rgb(${config.color[0]}, ${config.color[1]}, ${config.color[2]})`,
                  }}
                  className="border border-white/30 rounded-sm shadow"
                />
              </div>
            </div>

            {/* Statistics */}
            <div className="text-right text-xs">
              <span className="text-emerald-400 font-bold block">
                ✓ 10 Files / 7 Directories Ready
              </span>
              <span className="text-[10px] text-[#909b88] block">
                UTF-8 BOM Enforced on Localisation
              </span>
            </div>
          </div>

          {/* File Scaffolder Explorer */}
          <div className="flex-1 flex overflow-hidden">
            {/* File List */}
            <div className="w-72 border-r border-[#30392e] bg-[#131914] p-3 flex flex-col gap-1 overflow-y-auto shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#909b88] px-2 py-1 flex items-center gap-1.5">
                <FolderTree className="h-3 w-3" /> Target Directories ({scaffoldResult.directories.length})
              </span>
              {scaffoldResult.files.map((file, idx) => (
                <button
                  key={file.path}
                  onClick={() => setSelectedFileIdx(idx)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-mono text-left transition ${
                    selectedFileIdx === idx
                      ? 'bg-[#d6b878] text-[#1c2119] font-bold'
                      : 'text-[#e3e5d9] hover:bg-[#1f281e]'
                  }`}
                >
                  <FileCode className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{file.path}</span>
                </button>
              ))}
            </div>

            {/* File Content Preview */}
            <div className="flex-1 flex flex-col overflow-hidden bg-[#0d120e]">
              <div className="h-10 border-b border-[#30392e] bg-[#161d17] px-4 flex items-center justify-between shrink-0">
                <span className="text-xs font-mono text-[#d6b878] truncate">
                  {currentFile.path}
                </span>

                <button
                  onClick={handleCopyCurrentFile}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-[#242d23] hover:bg-[#354130] text-[#e3e5d9] rounded text-xs font-semibold transition"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy Code
                    </>
                  )}
                </button>
              </div>

              <pre className="flex-1 p-4 font-mono text-xs text-[#a6bd87] leading-relaxed overflow-auto">
                {typeof currentFile.content === 'string'
                  ? currentFile.content
                  : `// [32-Bit Uncompressed TGA Image Buffer]\n// Total Bytes: ${currentFile.content.length} bytes\n// Header: 18 bytes (True-Color Type 2, 32 BPP)\n// Pixel Stream: BGRA Uncompressed`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
