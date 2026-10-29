import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { SuperEventDef, SuperEventFrameSkin } from '../../types/politics';
import { generateSuperEventFiles, validateSuperEventPayload } from '../../utils/politicsGenerators';
import {
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Copy,
  Check,
  FileCode,
  Image as ImageIcon,
  Music,
  AlertCircle,
  Eye,
} from 'lucide-react';

const PRESET_SUPER_EVENTS: SuperEventDef[] = [
  {
    id: 'super_event_fall_of_paris',
    titleLocKey: 'SUPER_EVENT_FALL_OF_PARIS_TITLE',
    titleText: 'THE FALL OF PARIS',
    quoteLocKey: 'SUPER_EVENT_FALL_OF_PARIS_QUOTE',
    quoteText:
      '"The city of light has surrendered to shadow. The old continent bends its knee before the inexorable iron march of destiny."',
    quoteAuthor: 'General Charles de Gaulle, Broadcast to the Free French',
    buttonLocKey: 'SUPER_EVENT_FALL_OF_PARIS_BTN',
    buttonText: 'The lights have gone out across Europe...',
    bannerSprite: 'GFX_super_event_fall_of_paris',
    soundEffect: 'fall_of_paris_cue',
    frameSkin: 'tno',
    fireOnlyOnce: true,
    effect: 'news_event = { id = news.101 hours = 6 }',
  },
  {
    id: 'super_event_second_weltkrieg',
    titleLocKey: 'SUPER_EVENT_SECOND_WELTKRIEG_TITLE',
    titleText: 'THE SECOND WELTKRIEG',
    quoteLocKey: 'SUPER_EVENT_SECOND_WELTKRIEG_QUOTE',
    quoteText:
      '"Once more the guns of August thunder across the Rhine. The crowns of empires hang in the balance of cold steel."',
    quoteAuthor: 'Kaiser Wilhelm III, Imperial Address',
    buttonLocKey: 'SUPER_EVENT_SECOND_WELTKRIEG_BTN',
    buttonText: 'Gott mit uns.',
    bannerSprite: 'GFX_super_event_second_weltkrieg',
    soundEffect: 'weltkrieg_anthem',
    frameSkin: 'kaiserreich',
    fireOnlyOnce: true,
    effect: 'add_war_support = 0.20',
  },
  {
    id: 'super_event_atomic_dawn',
    titleLocKey: 'SUPER_EVENT_ATOMIC_DAWN_TITLE',
    titleText: 'THE ATOMIC DAWN',
    quoteLocKey: 'SUPER_EVENT_ATOMIC_DAWN_QUOTE',
    quoteText:
      '"Now I am become Death, the destroyer of worlds. The fire brought down from heaven shall never be quenched."',
    quoteAuthor: 'J. Robert Oppenheimer, Los Alamos',
    buttonLocKey: 'SUPER_EVENT_ATOMIC_DAWN_BTN',
    buttonText: 'May God have mercy upon mankind.',
    bannerSprite: 'GFX_super_event_atomic_dawn',
    soundEffect: 'nuclear_siren_cue',
    frameSkin: 'red_flood',
    fireOnlyOnce: true,
    effect: 'set_global_flag = nuclear_war_active',
  },
];

interface SuperEventStudioProps {
  onNotify?: (msg: string) => void;
}

export const SuperEventStudio: React.FC<SuperEventStudioProps> = ({ onNotify }) => {
  const [selectedEvent, setSelectedEvent] = useState<SuperEventDef>(PRESET_SUPER_EVENTS[0]);
  const [activeFrameSkin, setActiveFrameSkin] = useState<SuperEventFrameSkin>(selectedEvent.frameSkin);

  // Audio Playback Preview State (HTML5 Web Audio Simulation)
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [musicDucking, setMusicDucking] = useState<number>(100); // 100% ducked during playback
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const audioIntervalRef = useRef<number | null>(null);

  // Scaffolding & Code Export View
  const [activeTab, setActiveTab] = useState<'preview' | 'scaffold'>('preview');
  const scaffoldFiles = useMemo(() => {
    return generateSuperEventFiles({ ...selectedEvent, frameSkin: activeFrameSkin });
  }, [selectedEvent, activeFrameSkin]);
  const [activeScaffoldFile, setActiveScaffoldFile] = useState<string>('interface/superevents_fall_of_paris.gui');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Audio Simulation ticker
  useEffect(() => {
    if (isPlaying) {
      setMusicDucking(10); // Duck background music to 10%
      audioIntervalRef.current = window.setInterval(() => {
        setAudioProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            setMusicDucking(100);
            return 0;
          }
          return prev + 2;
        });
      }, 100);
    } else {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
      setMusicDucking(100);
    }
    return () => {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    };
  }, [isPlaying]);

  const handlePlayToggle = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      setAudioProgress(0);
      setIsPlaying(true);
      onNotify?.(`Simulating playback of '${selectedEvent.soundEffect}.ogg' with music ducking`);
    }
  };

  const handleCopyCode = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    onNotify?.(`Copied ${key} to clipboard`);
  };

  const validation = validateSuperEventPayload(selectedEvent);

  // Frame Styles
  const getFrameContainerClass = () => {
    switch (activeFrameSkin) {
      case 'tno':
        return 'border-4 border-[#1f2820] bg-black text-[#c8d4bf] shadow-[0_0_40px_rgba(0,0,0,0.9)]';
      case 'kaiserreich':
        return 'border-4 border-[#bfa255] bg-[#14120f] text-[#f2e6cb] shadow-[0_0_30px_rgba(191,162,85,0.3)]';
      case 'red_flood':
        return 'border-4 border-[#b32b2b] bg-[#1a0a0a] text-[#eedcdc] shadow-[0_0_35px_rgba(179,43,43,0.4)]';
      case 'vanilla':
      default:
        return 'border-2 border-[#3b4936] bg-[#1a211a] text-[#e3e5d9] shadow-2xl';
    }
  };

  const getFrameHeaderClass = () => {
    switch (activeFrameSkin) {
      case 'tno':
        return 'font-mono tracking-[4px] text-lg text-emerald-400 font-black uppercase text-center border-b border-[#2b3a2c] py-2';
      case 'kaiserreich':
        return 'font-serif tracking-[3px] text-xl text-[#d6b878] font-bold uppercase text-center border-b border-[#5c4a24] py-2';
      case 'red_flood':
        return 'font-sans italic tracking-[2px] text-xl text-red-400 font-extrabold uppercase text-center border-b border-[#631919] py-2';
      case 'vanilla':
      default:
        return 'font-serif tracking-wider text-base text-[#d6b878] font-bold uppercase text-center border-b border-[#3b4936] py-2';
    }
  };

  const getButtonClass = () => {
    switch (activeFrameSkin) {
      case 'tno':
        return 'w-full py-2.5 px-4 bg-[#142016] border border-[#2e4732] hover:bg-[#1e3323] text-emerald-300 font-mono text-xs uppercase tracking-widest font-bold transition shadow';
      case 'kaiserreich':
        return 'w-full py-2.5 px-4 bg-[#2b2214] border border-[#786133] hover:bg-[#3d301c] text-[#d6b878] font-serif text-sm font-semibold tracking-wider transition shadow';
      case 'red_flood':
        return 'w-full py-2.5 px-4 bg-[#290e0e] border border-[#802222] hover:bg-[#3d1414] text-red-200 font-sans italic text-sm font-bold tracking-wider transition shadow';
      case 'vanilla':
      default:
        return 'w-full py-2 px-4 bg-[#242d23] border border-[#3b4936] hover:bg-[#354130] text-[#e3e5d9] text-xs font-semibold tracking-wide transition';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#101512] text-[#e3e5d9] overflow-hidden select-none">
      {/* Top Header Toolbar */}
      <div className="h-12 border-b border-[#30392e] bg-[#181e19] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#d6b878]" />
            <span className="font-serif font-bold text-sm tracking-wide text-[#e3e5d9]">
              SUPER EVENT STUDIO
            </span>
          </div>
          <span className="text-[#3b4936]">|</span>

          {/* Preset Selector */}
          <select
            value={selectedEvent.id}
            onChange={(e) => {
              const found = PRESET_SUPER_EVENTS.find((p) => p.id === e.target.value);
              if (found) {
                setSelectedEvent(found);
                setActiveFrameSkin(found.frameSkin);
                setIsPlaying(false);
                setAudioProgress(0);
              }
            }}
            className="bg-[#242d23] border border-[#3b4936] rounded px-2.5 py-1 text-xs text-[#e3e5d9] focus:outline-none focus:border-[#d6b878]"
          >
            {PRESET_SUPER_EVENTS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.titleText} ({p.frameSkin.toUpperCase()})
              </option>
            ))}
          </select>

          {/* Frame Skin Selector */}
          <div className="flex items-center gap-1 bg-[#121613] p-1 rounded border border-[#2b3628]">
            {(['tno', 'kaiserreich', 'vanilla', 'red_flood'] as SuperEventFrameSkin[]).map((skin) => (
              <button
                key={skin}
                onClick={() => setActiveFrameSkin(skin)}
                className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded transition ${
                  activeFrameSkin === skin
                    ? 'bg-[#d6b878] text-[#1c2119]'
                    : 'text-[#909b88] hover:text-[#e3e5d9]'
                }`}
              >
                {skin}
              </button>
            ))}
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-2">
          <div className="flex rounded border border-[#3b4936] overflow-hidden">
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold transition ${
                activeTab === 'preview'
                  ? 'bg-[#d6b878] text-[#1c2119]'
                  : 'bg-[#242d23] text-[#909b88] hover:text-[#e3e5d9]'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              Visual Canvas
            </button>
            <button
              onClick={() => setActiveTab('scaffold')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold transition ${
                activeTab === 'scaffold'
                  ? 'bg-[#d6b878] text-[#1c2119]'
                  : 'bg-[#242d23] text-[#909b88] hover:text-[#e3e5d9]'
              }`}
            >
              <FileCode className="h-3.5 w-3.5" />
              Scaffold Code ({Object.keys(scaffoldFiles).length} files)
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'preview' ? (
          <>
            {/* Left Control Panel */}
            <div className="w-84 border-r border-[#30392e] bg-[#141a15] p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
              <h3 className="text-xs font-bold tracking-wider uppercase text-[#d6b878] flex items-center gap-1.5 border-b border-[#242d23] pb-2">
                <FileCode className="h-3.5 w-3.5" /> Super Event Parameters
              </h3>

              {/* Event ID */}
              <div>
                <label className="text-[11px] font-semibold text-[#909b88] block mb-1">
                  Event Identifier
                </label>
                <input
                  type="text"
                  value={selectedEvent.id}
                  onChange={(e) => setSelectedEvent({ ...selectedEvent, id: e.target.value })}
                  className="w-full bg-[#1c241d] border border-[#30392e] rounded px-2.5 py-1 text-xs text-[#e3e5d9] font-mono focus:outline-none focus:border-[#d6b878]"
                />
              </div>

              {/* Title Text */}
              <div>
                <label className="text-[11px] font-semibold text-[#909b88] block mb-1">
                  Title Text
                </label>
                <input
                  type="text"
                  value={selectedEvent.titleText}
                  onChange={(e) => setSelectedEvent({ ...selectedEvent, titleText: e.target.value })}
                  className="w-full bg-[#1c241d] border border-[#30392e] rounded px-2.5 py-1 text-xs text-[#e3e5d9] font-semibold focus:outline-none focus:border-[#d6b878]"
                />
              </div>

              {/* Quote Text */}
              <div>
                <label className="text-[11px] font-semibold text-[#909b88] block mb-1">
                  Dramatic Quote
                </label>
                <textarea
                  rows={3}
                  value={selectedEvent.quoteText}
                  onChange={(e) => setSelectedEvent({ ...selectedEvent, quoteText: e.target.value })}
                  className="w-full bg-[#1c241d] border border-[#30392e] rounded p-2 text-xs text-[#e3e5d9] leading-relaxed focus:outline-none focus:border-[#d6b878]"
                />
              </div>

              {/* Quote Author */}
              <div>
                <label className="text-[11px] font-semibold text-[#909b88] block mb-1">
                  Author / Attribution
                </label>
                <input
                  type="text"
                  value={selectedEvent.quoteAuthor}
                  onChange={(e) =>
                    setSelectedEvent({ ...selectedEvent, quoteAuthor: e.target.value })
                  }
                  className="w-full bg-[#1c241d] border border-[#30392e] rounded px-2.5 py-1 text-xs text-[#e3e5d9] focus:outline-none focus:border-[#d6b878]"
                />
              </div>

              {/* Button Text */}
              <div>
                <label className="text-[11px] font-semibold text-[#909b88] block mb-1">
                  Dismiss Button Text
                </label>
                <input
                  type="text"
                  value={selectedEvent.buttonText}
                  onChange={(e) =>
                    setSelectedEvent({ ...selectedEvent, buttonText: e.target.value })
                  }
                  className="w-full bg-[#1c241d] border border-[#30392e] rounded px-2.5 py-1 text-xs text-[#e3e5d9] focus:outline-none focus:border-[#d6b878]"
                />
              </div>

              {/* Sound Cue Identifier */}
              <div>
                <label className="text-[11px] font-semibold text-[#909b88] block mb-1">
                  Audio Cue Asset Token (.ogg)
                </label>
                <input
                  type="text"
                  value={selectedEvent.soundEffect}
                  onChange={(e) =>
                    setSelectedEvent({ ...selectedEvent, soundEffect: e.target.value })
                  }
                  className="w-full bg-[#1c241d] border border-[#30392e] rounded px-2.5 py-1 text-xs text-[#e3e5d9] font-mono focus:outline-none focus:border-[#d6b878]"
                />
              </div>

              {/* Audio Playback Controls & Music Ducking */}
              <div className="bg-[#1a211a] border border-[#2b3628] rounded p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#d6b878] flex items-center gap-1.5">
                    <Music className="h-3.5 w-3.5" /> Audio Simulator
                  </span>
                  <span className="text-[10px] text-[#909b88] font-mono">{audioProgress}%</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-[#121613] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#d6b878] h-full transition-all duration-100"
                    style={{ width: `${audioProgress}%` }}
                  />
                </div>

                {/* Audio Buttons */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={handlePlayToggle}
                    className="flex items-center gap-1.5 px-3 py-1 bg-[#d6b878] hover:bg-[#e0c587] text-[#1c2119] rounded text-xs font-bold transition shadow"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="h-3.5 w-3.5" /> Pause Cue
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5" /> Play Cue (.ogg)
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setAudioProgress(0);
                    }}
                    title="Reset Audio"
                    className="p-1 rounded bg-[#242d23] hover:bg-[#354130] text-[#e3e5d9]"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Simulated Game Music Ducking Status */}
                <div className="pt-2 border-t border-[#2b3628] flex items-center justify-between text-[11px]">
                  <span className="text-[#909b88]">Simulated Game Music Volume:</span>
                  <span
                    className={`font-mono font-bold ${
                      isPlaying ? 'text-amber-400 animate-pulse' : 'text-emerald-400'
                    }`}
                  >
                    {musicDucking}% {isPlaying ? '(Ducked)' : '(Normal)'}
                  </span>
                </div>
              </div>

              {!validation.valid && (
                <div className="p-2.5 rounded bg-red-950/40 border border-red-700/50 text-red-300 text-xs flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                  <div>
                    {validation.errors.map((err, idx) => (
                      <div key={idx}>• {err}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Interactive Canvas Preview */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0b0f0c] overflow-auto relative">
              <div
                className={`w-[480px] rounded p-6 flex flex-col items-center transition-all duration-300 ${getFrameContainerClass()}`}
              >
                {/* Frame Header */}
                <div className={`w-full mb-4 ${getFrameHeaderClass()}`}>
                  {selectedEvent.titleText || 'SUPER EVENT TITLE'}
                </div>

                {/* Event Image Banner (500x320 ratio) */}
                <div className="w-full h-52 bg-[#121613] rounded border border-[#2c3629] overflow-hidden relative flex flex-col items-center justify-center mb-5 group">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 z-10 pointer-events-none" />
                  <div className="text-center p-4 z-20">
                    <ImageIcon className="h-10 w-10 text-[#d6b878]/60 mx-auto mb-2" />
                    <span className="text-xs text-[#909b88] font-mono block">
                      {selectedEvent.bannerSprite || 'GFX_super_event_image'}
                    </span>
                    <span className="text-[10px] text-[#556350] block mt-1">
                      500 × 320 px Event Art
                    </span>
                  </div>
                </div>

                {/* Quote Box */}
                <div className="w-full bg-black/40 rounded p-4 mb-6 border border-white/5">
                  <p className="text-xs italic leading-relaxed text-center font-serif text-[#dcded4]">
                    {selectedEvent.quoteText}
                  </p>
                  {selectedEvent.quoteAuthor && (
                    <p className="text-[10px] uppercase tracking-wider text-right text-[#d6b878]/80 font-mono mt-2">
                      — {selectedEvent.quoteAuthor}
                    </p>
                  )}
                </div>

                {/* Response Button */}
                <button
                  onClick={() => {
                    setIsPlaying(false);
                    onNotify?.('Super Event dismissed');
                  }}
                  className={getButtonClass()}
                >
                  {selectedEvent.buttonText || 'Dismiss Super Event'}
                </button>
              </div>

              {/* Canvas Watermark Badge */}
              <div className="absolute bottom-4 right-4 text-[10px] text-[#556350] font-mono">
                Frame Style: {activeFrameSkin.toUpperCase()} · Audio Ducking Active
              </div>
            </div>
          </>
        ) : (
          /* Scaffolding Code View */
          <div className="flex-1 flex overflow-hidden">
            {/* File Sidebar */}
            <div className="w-64 border-r border-[#30392e] bg-[#141a15] p-3 flex flex-col gap-1 overflow-y-auto shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#909b88] px-2 py-1">
                Generated Paradox Files (4)
              </span>
              {Object.keys(scaffoldFiles).map((filePath) => (
                <button
                  key={filePath}
                  onClick={() => setActiveScaffoldFile(filePath)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-mono text-left transition ${
                    activeScaffoldFile === filePath
                      ? 'bg-[#d6b878] text-[#1c2119] font-bold'
                      : 'text-[#e3e5d9] hover:bg-[#1e271c]'
                  }`}
                >
                  <FileCode className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{filePath.split('/').pop()}</span>
                </button>
              ))}
            </div>

            {/* Code Content */}
            <div className="flex-1 flex flex-col bg-[#101512] overflow-hidden">
              <div className="h-10 border-b border-[#30392e] bg-[#181e19] px-4 flex items-center justify-between shrink-0">
                <span className="text-xs font-mono text-[#d6b878]">{activeScaffoldFile}</span>
                <button
                  onClick={() =>
                    handleCopyCode(scaffoldFiles[activeScaffoldFile] || '', activeScaffoldFile)
                  }
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-[#242d23] hover:bg-[#354130] text-[#e3e5d9] rounded text-xs font-semibold transition"
                >
                  {copiedKey === activeScaffoldFile ? (
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

              <pre className="flex-1 p-4 font-mono text-xs text-[#a6bd87] leading-relaxed overflow-auto bg-[#0d120e]">
                {scaffoldFiles[activeScaffoldFile] || '// Select a file to inspect'}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
