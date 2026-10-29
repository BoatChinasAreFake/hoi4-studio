import React, { useState, useMemo } from 'react';
import type { MusicStation, MusicTrack } from '../../types/ui';
import {
  Radio,
  Play,
  Pause,
  Volume2,
  Plus,
  Trash2,
  Copy,
  Sparkles,
  Disc,
  Sliders,
} from 'lucide-react';

interface MusicStationStudioProps {
  onNotify?: (msg: string) => void;
}

export const DEFAULT_STATION: MusicStation = {
  id: 'radio_libertalia',
  name: 'Radio Libertalia — Voice of Freedom',
  coverGfx: 'GFX_radio_station_libertalia',
  tracks: [
    {
      id: 'track_1',
      song: 'hymn_of_the_republic',
      title: 'Hymn of the Republic',
      assetFile: 'music/hymn_of_the_republic.ogg',
      chanceFactor: 1.0,
      modifiers: [
        {
          factor: 2.0,
          conditions: { tag: 'RPL', has_war: 'yes' },
        },
        {
          factor: 1.5,
          conditions: { has_government: 'democratic' },
        },
      ],
    },
    {
      id: 'track_2',
      song: 'march_of_the_iron_legions',
      title: 'March of the Iron Legions',
      assetFile: 'music/march_of_the_iron_legions.ogg',
      chanceFactor: 1.0,
      modifiers: [
        {
          factor: 2.5,
          conditions: { tag: 'GER', has_war: 'yes' },
        },
      ],
    },
    {
      id: 'track_3',
      song: 'serenade_of_the_peaceful_fields',
      title: 'Serenade of the Peaceful Fields',
      assetFile: 'music/serenade_of_the_peaceful_fields.ogg',
      chanceFactor: 1.0,
      modifiers: [
        {
          factor: 3.0,
          conditions: { has_war: 'no', stability: '> 0.70' },
        },
      ],
    },
  ],
};

export const MusicStationStudio: React.FC<MusicStationStudioProps> = ({ onNotify }) => {
  const [station, setStation] = useState<MusicStation>(DEFAULT_STATION);
  const [selectedTrackId, setSelectedTrackId] = useState<string>('track_1');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.8);
  const [isDuckingActive, setIsDuckingActive] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'tracks' | 'scripts'>('tracks');

  const selectedTrack = useMemo(
    () => station.tracks.find((t) => t.id === selectedTrackId) || station.tracks[0],
    [station.tracks, selectedTrackId]
  );

  // Effective volume accounting for combat volume ducking (-40% when artillery/combat occurs)
  const effectiveVolume = isDuckingActive ? volume * 0.6 : volume;

  // Add new track
  const handleAddTrack = () => {
    const id = `track_${Date.now().toString().slice(-4)}`;
    const newTrack: MusicTrack = {
      id,
      song: `custom_track_${id}`,
      title: 'New Radio Track',
      assetFile: `music/custom_track_${id}.ogg`,
      chanceFactor: 1.0,
      modifiers: [
        {
          factor: 1.5,
          conditions: { tag: 'RPL' },
        },
      ],
    };

    setStation((prev) => ({ ...prev, tracks: [...prev.tracks, newTrack] }));
    setSelectedTrackId(id);
    onNotify?.('Added new music track');
  };

  // Delete track
  const handleDeleteTrack = (id: string) => {
    if (station.tracks.length <= 1) {
      onNotify?.('A station must contain at least one track.');
      return;
    }
    setStation((prev) => ({
      ...prev,
      tracks: prev.tracks.filter((t) => t.id !== id),
    }));
    setSelectedTrackId(station.tracks[0].id);
    onNotify?.('Deleted track');
  };

  // Update track property
  const handleUpdateTrack = (id: string, updates: Partial<MusicTrack>) => {
    setStation((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  };

  // Add modifier to track
  const handleAddModifier = (trackId: string) => {
    setStation((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => {
        if (t.id !== trackId) return t;
        return {
          ...t,
          modifiers: [...t.modifiers, { factor: 1.5, conditions: { has_war: 'yes' } }],
        };
      }),
    }));
    onNotify?.('Added modifier rule');
  };

  // Generate Clausewitz music.txt
  const generatedMusicTxt = useMemo(() => {
    let out = `# CLAUSEWITZ MUSIC PLAYBACK SCRIPTS (music/music.txt)\n\n`;
    for (const track of station.tracks) {
      out += `music = {\n`;
      out += `\tsong = "${track.song}"\n`;
      out += `\tchance = {\n`;
      out += `\t\tfactor = ${track.chanceFactor.toFixed(1)}\n`;

      for (const mod of track.modifiers) {
        out += `\t\tmodifier = {\n`;
        out += `\t\t\tfactor = ${mod.factor.toFixed(1)}\n`;
        for (const [cond, val] of Object.entries(mod.conditions)) {
          out += `\t\t\t${cond} = ${val}\n`;
        }
        out += `\t\t}\n`;
      }

      out += `\t}\n`;
      out += `}\n\n`;
    }
    return out;
  }, [station]);

  // Generate Clausewitz music.asset
  const generatedMusicAsset = useMemo(() => {
    let out = `# CLAUSEWITZ MUSIC ASSET DEFINITIONS (music/music.asset)\n\n`;
    for (const track of station.tracks) {
      out += `music = {\n`;
      out += `\tname = "${track.song}"\n`;
      out += `\tfile = "${track.assetFile.split('/').pop()}"\n`;
      out += `\tvolume = 0.65\n`;
      out += `}\n\n`;
    }
    return out;
  }, [station]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#101512] text-[#e3e5d9] overflow-hidden select-none">
      {/* Top Header */}
      <div className="border-b border-[#30392e] bg-[#141a15] p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-[#1e271c] border border-[#3b4936]">
            <Radio className="h-5 w-5 text-[#d6b878]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#e3e5d9] flex items-center gap-2">
              Music Station & Radio Studio
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#20281e] text-[#d6b878] font-mono border border-[#3b4936]">
                .OGG Audio Engine
              </span>
            </h2>
            <p className="text-xs text-[#909b88]">
              Configure radio stations, playback chance scripts with conditional modifiers, and volume ducking preview.
            </p>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#181e19] p-1 rounded border border-[#30392e]">
            <button
              onClick={() => setActiveTab('tracks')}
              className={`px-3 py-1 rounded text-xs font-semibold transition ${
                activeTab === 'tracks'
                  ? 'bg-[#d6b878] text-[#1c2119] font-bold shadow'
                  : 'text-[#909b88] hover:text-[#e3e5d9]'
              }`}
            >
              Tracks & Chance Scripts
            </button>
            <button
              onClick={() => setActiveTab('scripts')}
              className={`px-3 py-1 rounded text-xs font-semibold transition ${
                activeTab === 'scripts'
                  ? 'bg-[#d6b878] text-[#1c2119] font-bold shadow'
                  : 'text-[#909b88] hover:text-[#e3e5d9]'
              }`}
            >
              Scaffolded .txt & .asset Code
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio View */}
      {activeTab === 'tracks' ? (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 divide-x divide-[#30392e] overflow-hidden">
          {/* Left Column: Track Playlist */}
          <div className="p-4 flex flex-col gap-3 overflow-y-auto bg-[#141a15]/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#909b88] uppercase tracking-wider">
                Station Playlist ({station.tracks.length})
              </span>
              <button
                onClick={handleAddTrack}
                className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-[#242d23] text-[#d6b878] border border-[#3b4936] hover:bg-[#354130] transition"
              >
                <Plus className="h-3.5 w-3.5" /> Add Track
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              {station.tracks.map((track) => {
                const isSelected = track.id === selectedTrackId;
                return (
                  <div
                    key={track.id}
                    onClick={() => setSelectedTrackId(track.id)}
                    className={`p-3 rounded border transition cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-[#d6b878] bg-[#1e271c] shadow'
                        : 'border-[#273224] bg-[#131914] text-[#909b88] hover:text-[#e3e5d9] hover:bg-[#182019]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Disc className={`h-4 w-4 ${isSelected && isPlaying ? 'animate-spin text-[#d6b878]' : 'text-[#71806b]'}`} />
                      <div>
                        <span className="text-xs font-bold text-[#e3e5d9] block">
                          {track.title}
                        </span>
                        <span className="text-[10px] font-mono text-[#71806b]">
                          {track.song}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#101411] text-[#a6bd87] font-mono font-bold">
                      x{track.chanceFactor}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center Column: Audio Player & Volume Ducking Preview */}
          <div className="p-8 flex flex-col items-center justify-center gap-6 bg-[#101411]">
            <span className="text-xs font-bold uppercase tracking-wider text-[#d6b878]">
              Audio Playback Preview
            </span>

            {/* Simulated Player Card */}
            <div className="w-full max-w-sm bg-[#181e19] border border-[#3b4936] rounded-xl p-6 flex flex-col items-center gap-4 shadow-2xl">
              <div className="w-24 h-24 rounded-lg bg-[#141a15] border border-[#3b4936] flex items-center justify-center shadow-inner">
                <Disc className={`h-12 w-12 text-[#d6b878] ${isPlaying ? 'animate-spin' : 'opacity-70'}`} />
              </div>

              <div className="text-center">
                <h3 className="text-sm font-bold text-[#e3e5d9]">{selectedTrack.title}</h3>
                <span className="text-xs font-mono text-[#909b88]">{selectedTrack.assetFile}</span>
              </div>

              {/* Progress bar */}
              <div className="w-full flex flex-col gap-1">
                <div className="h-1.5 w-full bg-[#101411] rounded-full overflow-hidden">
                  <div className={`h-full bg-[#d6b878] transition-all duration-300 ${isPlaying ? 'w-2/3' : 'w-1/4'}`} />
                </div>
                <div className="flex justify-between text-[10px] text-[#71806b] font-mono">
                  <span>{isPlaying ? '01:42' : '00:00'}</span>
                  <span>03:28</span>
                </div>
              </div>

              {/* Play / Pause Controls */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-3 rounded-full bg-[#d6b878] text-[#1c2119] font-black shadow-lg hover:scale-105 transition"
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                </button>
              </div>

              {/* Volume Slider & Ducking Simulation */}
              <div className="w-full pt-3 border-t border-[#273224] flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#909b88] flex items-center gap-1.5">
                    <Volume2 className="h-3.5 w-3.5" /> Volume:
                  </span>
                  <span className="font-mono text-[#a6bd87] font-bold">
                    {Math.round(effectiveVolume * 100)}%
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.05"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full accent-[#d6b878] cursor-pointer"
                />

                {/* Combat Volume Ducking Test Toggle */}
                <button
                  onClick={() => setIsDuckingActive(!isDuckingActive)}
                  className={`w-full py-1.5 rounded text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    isDuckingActive
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-[#1e271c] text-[#909b88] border border-[#3b4936] hover:text-[#e3e5d9]'
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#d6b878]" />
                  {isDuckingActive ? 'Combat Ducking Active (-40%)' : 'Test Combat Sound Ducking'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Playback Chance Script Rules */}
          <div className="p-6 flex flex-col gap-4 overflow-y-auto bg-[#141a15]/50 select-none">
            <div className="flex items-center justify-between border-b border-[#2d372c] pb-2">
              <span className="text-xs font-bold text-[#d6b878] flex items-center gap-1.5">
                <Sliders className="h-4 w-4" /> Playback Chance Configuration
              </span>
              <button
                onClick={() => handleDeleteTrack(selectedTrack.id)}
                title="Delete track"
                className="text-xs text-rose-400 hover:text-rose-300"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-1 text-xs">
              <span className="text-[11px] text-[#909b88]">Song Identifier:</span>
              <input
                type="text"
                value={selectedTrack.song}
                onChange={(e) => handleUpdateTrack(selectedTrack.id, { song: e.target.value })}
                className="bg-[#101411] border border-[#3b4936] rounded px-2.5 py-1.5 font-mono text-xs text-[#e3e5d9]"
              />
            </div>

            <div className="flex flex-col gap-1 text-xs">
              <span className="text-[11px] text-[#909b88]">Base Chance Factor:</span>
              <input
                type="number"
                step="0.1"
                value={selectedTrack.chanceFactor}
                onChange={(e) => handleUpdateTrack(selectedTrack.id, { chanceFactor: parseFloat(e.target.value) || 1.0 })}
                className="bg-[#101411] border border-[#3b4936] rounded px-2.5 py-1.5 font-mono text-xs text-[#e3e5d9]"
              />
            </div>

            {/* Modifiers List */}
            <div className="flex flex-col gap-2 pt-2 border-t border-[#273224]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#909b88]">Conditional Modifiers</span>
                <button
                  onClick={() => handleAddModifier(selectedTrack.id)}
                  className="text-[11px] text-[#d6b878] hover:underline"
                >
                  + Add Condition
                </button>
              </div>

              {selectedTrack.modifiers.map((mod, idx) => (
                <div key={idx} className="p-2.5 rounded bg-[#181e19] border border-[#273224] text-xs flex flex-col gap-1.5">
                  <div className="flex justify-between font-bold text-[#d6b878]">
                    <span>Factor Multiplier: x{mod.factor}</span>
                  </div>
                  <div className="bg-[#101411] p-1.5 rounded font-mono text-[10px] text-[#a6bd87]">
                    {Object.entries(mod.conditions)
                      .map(([k, v]) => `${k} = ${v}`)
                      .join(' · ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Scaffolding Code View */
        <div className="flex-1 grid grid-cols-2 divide-x divide-[#30392e] bg-[#101411] overflow-hidden">
          <div className="flex flex-col h-full overflow-hidden">
            <div className="p-3 border-b border-[#30392e] bg-[#141a15] flex items-center justify-between text-xs">
              <span className="font-bold text-[#d6b878]">music/music.txt (Playback Chances)</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedMusicTxt);
                  onNotify?.('Copied music.txt');
                }}
                className="text-[10px] text-[#a6bd87] hover:underline flex items-center gap-1 font-mono"
              >
                <Copy className="h-3 w-3" /> Copy
              </button>
            </div>
            <pre className="p-4 flex-1 overflow-auto font-mono text-xs text-[#a6bd87] leading-relaxed">
              {generatedMusicTxt}
            </pre>
          </div>

          <div className="flex flex-col h-full overflow-hidden">
            <div className="p-3 border-b border-[#30392e] bg-[#141a15] flex items-center justify-between text-xs">
              <span className="font-bold text-sky-400">music/music.asset (Asset Pointers)</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedMusicAsset);
                  onNotify?.('Copied music.asset');
                }}
                className="text-[10px] text-[#a6bd87] hover:underline flex items-center gap-1 font-mono"
              >
                <Copy className="h-3 w-3" /> Copy
              </button>
            </div>
            <pre className="p-4 flex-1 overflow-auto font-mono text-xs text-sky-300 leading-relaxed">
              {generatedMusicAsset}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
