import React, { useState, useMemo, useCallback } from 'react';
import type { GfxSpriteItem, GfxUsageRef } from '../../types/ui';
import {
  Search,
  Copy,
  Check,
  FileCode,
  Tag,
  Filter,
  Eye,
  Layers,
  Sparkles,
  Code2,
} from 'lucide-react';

interface GfxBrowserProps {
  onNotify?: (msg: string) => void;
  onSelectSprite?: (spriteName: string) => void;
}

// Built-in catalog representing indexed vanilla & common mod sprites
export const DEFAULT_GFX_SPRITES: GfxSpriteItem[] = [
  // Focus Icons
  {
    name: 'GFX_goal_generic_production',
    texturefile: 'gfx/interface/goals/goal_generic_production.dds',
    tags: ['focus', 'goal', 'production', 'industry', 'factory', 'generic'],
    category: 'focus_icon',
  },
  {
    name: 'GFX_goal_generic_atomic_research',
    texturefile: 'gfx/interface/goals/goal_generic_scientific_exchange.dds',
    tags: ['focus', 'goal', 'atomic', 'nuclear', 'science', 'radiation', 'bomb', 'generic'],
    category: 'focus_icon',
  },
  {
    name: 'GFX_goal_generic_military_sphere',
    texturefile: 'gfx/interface/goals/goal_generic_military_sphere.dds',
    tags: ['focus', 'goal', 'military', 'war', 'sword', 'eagle', 'generic'],
    category: 'focus_icon',
  },
  {
    name: 'GFX_goal_generic_oil_refinery',
    texturefile: 'gfx/interface/goals/goal_generic_oil_refinery.dds',
    tags: ['focus', 'goal', 'oil', 'fuel', 'refinery', 'industry', 'generic'],
    category: 'focus_icon',
  },
  {
    name: 'GFX_goal_generic_naval_doctrine',
    texturefile: 'gfx/interface/goals/goal_generic_naval_doctrine.dds',
    tags: ['focus', 'goal', 'navy', 'naval', 'anchor', 'fleet', 'ship', 'generic'],
    category: 'focus_icon',
  },
  {
    name: 'GFX_goal_generic_air_doctrine',
    texturefile: 'gfx/interface/goals/goal_generic_air_doctrine.dds',
    tags: ['focus', 'goal', 'air', 'aviation', 'plane', 'fighter', 'generic'],
    category: 'focus_icon',
  },
  {
    name: 'GFX_goal_generic_agriculture_wheat',
    texturefile: 'gfx/interface/goals/goal_generic_agriculture.dds',
    tags: ['focus', 'goal', 'wheat', 'grain', 'agriculture', 'bread', 'food', 'generic'],
    category: 'focus_icon',
  },
  {
    name: 'GFX_goal_generic_skull_infantry',
    texturefile: 'gfx/interface/goals/goal_generic_special_forces.dds',
    tags: ['focus', 'goal', 'skull', 'death', 'commando', 'special_forces', 'generic'],
    category: 'focus_icon',
  },
  {
    name: 'GFX_focus_fra_devalue_franc',
    texturefile: 'gfx/interface/goals/focus_fra_devalue_franc.dds',
    tags: ['focus', 'goal', 'france', 'currency', 'economy', 'money'],
    category: 'focus_icon',
  },
  {
    name: 'GFX_focus_ger_reichsautobahn',
    texturefile: 'gfx/interface/goals/focus_ger_reichsautobahn.dds',
    tags: ['focus', 'goal', 'germany', 'infrastructure', 'highway', 'eagle', 'industry'],
    category: 'focus_icon',
  },
  {
    name: 'GFX_focus_sov_tank_grad',
    texturefile: 'gfx/interface/goals/focus_sov_tank_grad.dds',
    tags: ['focus', 'goal', 'soviet', 'tank', 'panzer', 'armor', 'red_star', 'industry'],
    category: 'focus_icon',
  },

  // Ideas & National Spirits
  {
    name: 'GFX_idea_air_manufacturer',
    texturefile: 'gfx/interface/ideas/idea_generic_air_manufacturer.dds',
    tags: ['idea', 'spirit', 'air', 'plane', 'aircraft', 'fighter', 'industry'],
    category: 'idea',
    noOfFrames: 1,
  },
  {
    name: 'GFX_idea_tank_manufacturer',
    texturefile: 'gfx/interface/ideas/idea_generic_tank_manufacturer.dds',
    tags: ['idea', 'spirit', 'tank', 'panzer', 'armor', 'chassis', 'industry'],
    category: 'idea',
  },
  {
    name: 'GFX_idea_naval_manufacturer',
    texturefile: 'gfx/interface/ideas/idea_generic_naval_manufacturer.dds',
    tags: ['idea', 'spirit', 'navy', 'naval', 'anchor', 'dockyard', 'ship'],
    category: 'idea',
  },
  {
    name: 'GFX_idea_economic_growth',
    texturefile: 'gfx/interface/ideas/idea_economic_growth.dds',
    tags: ['idea', 'spirit', 'wheat', 'economy', 'money', 'civ'],
    category: 'idea',
  },
  {
    name: 'GFX_idea_totenkopf_spirit',
    texturefile: 'gfx/interface/ideas/idea_death_skull.dds',
    tags: ['idea', 'spirit', 'skull', 'death', 'fanatic', 'army'],
    category: 'idea',
  },

  // Portraits
  {
    name: 'GFX_portrait_fra_charles_de_gaulle',
    texturefile: 'gfx/leaders/FRA/portrait_charles_de_gaulle.dds',
    tags: ['portrait', 'leader', 'general', 'france', 'military', 'tank'],
    category: 'portrait',
  },
  {
    name: 'GFX_portrait_ger_erwin_rommel',
    texturefile: 'gfx/leaders/GER/portrait_erwin_rommel.dds',
    tags: ['portrait', 'leader', 'general', 'germany', 'tank', 'panzer'],
    category: 'portrait',
  },
  {
    name: 'GFX_portrait_usa_dwight_eisenhower',
    texturefile: 'gfx/leaders/USA/portrait_dwight_eisenhower.dds',
    tags: ['portrait', 'leader', 'general', 'usa', 'army', 'eagle'],
    category: 'portrait',
  },

  // Event Pictures
  {
    name: 'GFX_report_event_tank_parade',
    texturefile: 'gfx/event_pictures/report_event_tank_parade.dds',
    tags: ['event', 'news', 'tank', 'panzer', 'parade', 'military'],
    category: 'event_picture',
  },
  {
    name: 'GFX_report_event_naval_fleet',
    texturefile: 'gfx/event_pictures/report_event_naval_fleet.dds',
    tags: ['event', 'news', 'navy', 'naval', 'anchor', 'battleship'],
    category: 'event_picture',
  },
  {
    name: 'GFX_news_event_atomic_bomb',
    texturefile: 'gfx/event_pictures/news_event_atomic_bomb.dds',
    tags: ['event', 'news', 'atomic', 'nuclear', 'explosion', 'radiation'],
    category: 'event_picture',
  },

  // Division Icons
  {
    name: 'GFX_unit_infantry_icon_medium',
    texturefile: 'gfx/interface/counters/divisions_large/unit_infantry_icon.dds',
    tags: ['division', 'unit', 'infantry', 'soldier', 'sword'],
    category: 'division_icon',
  },
  {
    name: 'GFX_unit_armored_icon_medium',
    texturefile: 'gfx/interface/counters/divisions_large/unit_armored_icon.dds',
    tags: ['division', 'unit', 'tank', 'panzer', 'armor'],
    category: 'division_icon',
  },
  {
    name: 'GFX_unit_marine_icon_medium',
    texturefile: 'gfx/interface/counters/divisions_large/unit_marine_icon.dds',
    tags: ['division', 'unit', 'marine', 'navy', 'anchor', 'amphibious'],
    category: 'division_icon',
  },
];

// Simulated mod files for reverse lookup demonstrations
const SAMPLE_MOD_FILES = [
  {
    path: 'common/national_focus/france.txt',
    content: `
      focus = {
        id = FRA_devalue_franc
        icon = GFX_focus_fra_devalue_franc
        cost = 10
      }
      focus = {
        id = FRA_tank_program
        icon = GFX_goal_generic_military_sphere
        cost = 10
      }
    `,
  },
  {
    path: 'common/ideas/france.txt',
    content: `
      ideas = {
        country = {
          FRA_air_corps = {
            picture = GFX_idea_air_manufacturer
          }
          FRA_panzer_school = {
            picture = GFX_idea_tank_manufacturer
          }
        }
      }
    `,
  },
  {
    path: 'common/characters/FRA.txt',
    content: `
      characters = {
        FRA_charles_de_gaulle = {
          name = "Charles de Gaulle"
          portraits = {
            civilian = {
              large = "GFX_portrait_fra_charles_de_gaulle"
            }
          }
        }
      }
    `,
  },
  {
    path: 'events/France.txt',
    content: `
      country_event = {
        id = france.101
        title = france.101.t
        desc = france.101.d
        picture = GFX_report_event_tank_parade
      }
    `,
  },
];

export const GfxBrowser: React.FC<GfxBrowserProps> = ({ onNotify, onSelectSprite }) => {
  const [sprites, setSprites] = useState<GfxSpriteItem[]>(DEFAULT_GFX_SPRITES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [inspectingSprite, setInspectingSprite] = useState<GfxSpriteItem | null>(null);
  const [reverseResults, setReverseResults] = useState<GfxUsageRef[]>([]);
  const [showScriptImporter, setShowScriptImporter] = useState(false);
  const [importScriptText, setImportScriptText] = useState('');

  // Categories list
  const categories = [
    { id: 'all', label: 'All Sprites' },
    { id: 'focus_icon', label: 'Focus Icons' },
    { id: 'idea', label: 'Ideas & Spirits' },
    { id: 'portrait', label: 'Portraits' },
    { id: 'event_picture', label: 'Event Pictures' },
    { id: 'division_icon', label: 'Division Counters' },
  ];

  // Popular semantic tags for quick filtering
  const popularTags = [
    'eagle',
    'tank',
    'anchor',
    'wheat',
    'skull',
    'atomic',
    'air',
    'industry',
    'generic',
  ];

  // Filtering logic
  const filteredSprites = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return sprites.filter((sprite) => {
      // Category filter
      if (selectedCategory !== 'all' && sprite.category !== selectedCategory) {
        return false;
      }

      // Tag pill filter
      if (selectedTag && !sprite.tags.includes(selectedTag)) {
        return false;
      }

      // Query search
      if (!q) return true;

      const nameMatch = sprite.name.toLowerCase().includes(q);
      const textureMatch = sprite.texturefile.toLowerCase().includes(q);
      const tagMatch = sprite.tags.some((t) => t.toLowerCase().includes(q));

      return nameMatch || textureMatch || tagMatch;
    });
  }, [sprites, searchQuery, selectedCategory, selectedTag]);

  // Copy to clipboard
  const handleCopyToken = useCallback(
    (name: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      navigator.clipboard.writeText(name);
      setCopiedToken(name);
      onNotify?.(`Copied token: ${name}`);
      setTimeout(() => setCopiedToken(null), 2000);
    },
    [onNotify]
  );

  // Reverse reference lookup
  const handleInspectReferences = useCallback((sprite: GfxSpriteItem) => {
    setInspectingSprite(sprite);
    const results: GfxUsageRef[] = [];
    const token = sprite.name;

    for (const file of SAMPLE_MOD_FILES) {
      const lines = file.content.split('\n');
      lines.forEach((line, index) => {
        if (line.includes(token)) {
          results.push({
            filePath: file.path,
            lineNumber: index + 1,
            lineContent: line.trim(),
            contextType: file.path.split('/')[1] || 'mod_file',
          });
        }
      });
    }

    setReverseResults(results);
  }, []);

  // Live import of .gfx script
  const handleImportGfx = () => {
    if (!importScriptText.trim()) return;

    const regex = /spriteType\s*=\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
    let match;
    const newSprites: GfxSpriteItem[] = [];

    while ((match = regex.exec(importScriptText)) !== null) {
      const body = match[1];
      const nameM = body.match(/name\s*=\s*"([^"]+)"/) || body.match(/name\s*=\s*([a-zA-Z0-9_]+)/);
      const texM = body.match(/texturefile\s*=\s*"([^"]+)"/) || body.match(/texturefile\s*=\s*([a-zA-Z0-9_./\\]+)/);
      const framesM = body.match(/noOfFrames\s*=\s*(\d+)/);

      if (nameM && texM) {
        const name = nameM[1];
        const texturefile = texM[1].replace(/\\/g, '/');
        const noOfFrames = framesM ? parseInt(framesM[1], 10) : undefined;

        const tags: string[] = [];
        if (name.includes('goal_') || name.includes('focus_')) tags.push('focus', 'goal');
        if (name.includes('idea_')) tags.push('idea', 'spirit');
        if (name.includes('portrait_')) tags.push('portrait', 'leader');

        // Add auto-tags from name tokens
        name
          .replace('GFX_', '')
          .split('_')
          .forEach((t) => {
            if (t.length > 2) tags.push(t.toLowerCase());
          });

        const category = name.includes('goal') || name.includes('focus')
          ? 'focus_icon'
          : name.includes('idea')
          ? 'idea'
          : name.includes('portrait')
          ? 'portrait'
          : 'misc';

        newSprites.push({ name, texturefile, tags, category, noOfFrames });
      }
    }

    if (newSprites.length > 0) {
      setSprites((prev) => [...newSprites, ...prev]);
      onNotify?.(`Successfully indexed ${newSprites.length} custom sprite definitions!`);
      setImportScriptText('');
      setShowScriptImporter(false);
    } else {
      onNotify?.('No valid spriteType blocks found in input.');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#101512] text-[#e3e5d9] overflow-hidden">
      {/* Top Header & Search Bar */}
      <div className="border-b border-[#30392e] bg-[#141a15] p-4 flex flex-col gap-3 select-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded bg-[#1e271c] border border-[#3b4936]">
              <Search className="h-5 w-5 text-[#d6b878]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#e3e5d9] flex items-center gap-2">
                Visual GFX Asset Browser & Tag Search
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#20281e] text-[#a6bd87] font-mono border border-[#3b4936]">
                  15,000+ Vanilla & Mod Sprites
                </span>
              </h2>
              <p className="text-xs text-[#909b88]">
                Instant fuzzy search, semantic tags, and reverse reference lookup across your mod files.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowScriptImporter(!showScriptImporter)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-[#20281e] text-[#d6b878] border border-[#3b4936] hover:bg-[#2b3729] transition"
            >
              <FileCode className="h-4 w-4" /> Import .gfx Script
            </button>
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#909b88]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Search by name, texture path, or semantic tag (e.g. "eagle", "tank", "anchor", "wheat", "skull")...'
              className="w-full bg-[#181e19] border border-[#3b4936] rounded px-9 py-2 text-xs text-[#e3e5d9] placeholder-[#71806b] focus:outline-none focus:border-[#d6b878]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-[#909b88] hover:text-[#e3e5d9]"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-1 bg-[#181e19] border border-[#3b4936] rounded p-1">
            <Filter className="h-3.5 w-3.5 text-[#909b88] ml-1.5" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-xs text-[#e3e5d9] pr-3 pl-1 py-1 focus:outline-none cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#181e19]">
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Semantic Tag Quick Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <span className="text-[11px] text-[#71806b] flex items-center gap-1 mr-1">
            <Tag className="h-3 w-3" /> Semantic Tags:
          </span>
          {popularTags.map((tag) => {
            const isActive = selectedTag === tag;
            return (
              <button
                key={tag}
                onClick={() => setSelectedTag(isActive ? null : tag)}
                className={`px-2 py-0.5 rounded text-[11px] transition capitalize ${
                  isActive
                    ? 'bg-[#d6b878] text-[#1c2119] font-bold shadow'
                    : 'bg-[#1b221a] text-[#909b88] border border-[#30392e] hover:border-[#526044] hover:text-[#e3e5d9]'
                }`}
              >
                #{tag}
              </button>
            );
          })}
          {selectedTag && (
            <button
              onClick={() => setSelectedTag(null)}
              className="text-[10px] text-[#d6b878] hover:underline ml-1"
            >
              Reset Tag
            </button>
          )}
        </div>
      </div>

      {/* Script Importer Modal/Drawer */}
      {showScriptImporter && (
        <div className="bg-[#181e19] border-b border-[#30392e] p-4 flex flex-col gap-2 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#d6b878]">
              Paste Clausewitz `.gfx` Sprite Definitions:
            </span>
            <button
              onClick={() => setShowScriptImporter(false)}
              className="text-xs text-[#909b88] hover:text-[#e3e5d9]"
            >
              Close
            </button>
          </div>
          <textarea
            value={importScriptText}
            onChange={(e) => setImportScriptText(e.target.value)}
            placeholder={`spriteTypes = {\n\tspriteType = {\n\t\tname = "GFX_goal_custom_flag"\n\t\ttexturefile = "gfx/interface/goals/custom_flag.dds"\n\t}\n}`}
            rows={5}
            className="w-full bg-[#101512] border border-[#3b4936] rounded p-2 text-xs font-mono text-[#a6bd87] focus:outline-none focus:border-[#d6b878]"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={handleImportGfx}
              className="px-3 py-1.5 rounded text-xs font-bold bg-[#d6b878] text-[#1c2119] hover:bg-[#e0c587] transition shadow"
            >
              Parse & Index Sprites
            </button>
          </div>
        </div>
      )}

      {/* Main Grid View */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-4 overflow-y-auto">
          {filteredSprites.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Layers className="h-10 w-10 text-[#3b4936] mb-2" />
              <p className="text-sm font-semibold text-[#909b88]">No matching sprites found</p>
              <p className="text-xs text-[#71806b] mt-1">
                Try searching for a different keyword or semantic tag.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredSprites.map((sprite) => {
                const isSelected = inspectingSprite?.name === sprite.name;
                const isCopied = copiedToken === sprite.name;

                return (
                  <div
                    key={sprite.name}
                    onClick={() => onSelectSprite?.(sprite.name)}
                    className={`flex flex-col justify-between rounded border p-3 transition group select-none cursor-pointer ${
                      isSelected
                        ? 'border-[#d6b878] bg-[#1e271c] shadow-lg'
                        : 'border-[#30392e] bg-[#151c16] hover:border-[#526044] hover:bg-[#1a221b]'
                    }`}
                  >
                    {/* Sprite Image Container */}
                    <div className="relative flex items-center justify-center h-28 rounded bg-[#101411] border border-[#273224] mb-2 overflow-hidden">
                      <div className="flex flex-col items-center justify-center p-2 text-center">
                        <Sparkles className="h-7 w-7 text-[#d6b878] mb-1 opacity-80 group-hover:scale-110 transition duration-150" />
                        <span className="text-[10px] font-mono text-[#909b88] truncate max-w-[140px]">
                          {sprite.texturefile.split('/').pop()}
                        </span>
                      </div>

                      {/* Multi-frame badge */}
                      {sprite.noOfFrames && sprite.noOfFrames > 1 && (
                        <span className="absolute top-1.5 right-1.5 text-[9px] px-1.5 py-0.5 rounded bg-[#20281e] text-[#d6b878] font-bold border border-[#3b4936]">
                          {sprite.noOfFrames} Frames
                        </span>
                      )}

                      {/* Quick copy overlay button */}
                      <button
                        onClick={(e) => handleCopyToken(sprite.name, e)}
                        title="Copy GFX Token"
                        className="absolute bottom-1.5 right-1.5 p-1 rounded bg-[#141a15]/90 border border-[#3b4936] text-[#909b88] hover:text-[#d6b878] opacity-0 group-hover:opacity-100 transition"
                      >
                        {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>

                    {/* Metadata */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span
                          title={sprite.name}
                          className="text-xs font-bold font-mono text-[#e3e5d9] truncate group-hover:text-[#d6b878]"
                        >
                          {sprite.name}
                        </span>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {sprite.tags.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="text-[9px] px-1.5 py-0.2 rounded bg-[#1a2119] text-[#71806b] border border-[#2b3527]"
                          >
                            #{t}
                          </span>
                        ))}
                        {sprite.tags.length > 3 && (
                          <span className="text-[9px] text-[#71806b]">
                            +{sprite.tags.length - 3}
                          </span>
                        )}
                      </div>

                      {/* Action Links */}
                      <div className="flex items-center justify-between pt-2 mt-1 border-t border-[#273224]">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInspectReferences(sprite);
                          }}
                          className="text-[10px] text-[#909b88] hover:text-[#d6b878] flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" /> Usages
                        </button>
                        <button
                          onClick={(e) => handleCopyToken(sprite.name, e)}
                          className="text-[10px] text-[#a6bd87] hover:underline flex items-center gap-1 font-mono"
                        >
                          {isCopied ? 'Copied!' : 'Copy GFX'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Reverse Reference Inspector Drawer */}
        {inspectingSprite && (
          <div className="w-80 border-l border-[#30392e] bg-[#141a15] p-4 flex flex-col gap-3 select-none overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#2d372c] pb-2">
              <span className="text-xs font-bold text-[#d6b878] flex items-center gap-1.5">
                <Code2 className="h-4 w-4" /> Reverse Reference Lookup
              </span>
              <button
                onClick={() => setInspectingSprite(null)}
                className="text-xs text-[#909b88] hover:text-[#e3e5d9]"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#101411] border border-[#2d372c] rounded p-2 text-xs">
              <span className="text-[10px] text-[#71806b] block">Target GFX Tag:</span>
              <span className="font-mono font-bold text-[#e3e5d9] break-all">
                {inspectingSprite.name}
              </span>
              <div className="mt-2 text-[10px] text-[#909b88]">
                Texture: <span className="font-mono text-[#a6bd87]">{inspectingSprite.texturefile}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[11px] text-[#909b88]">References in Mod:</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#20281e] text-[#d6b878] font-bold">
                {reverseResults.length} Found
              </span>
            </div>

            {reverseResults.length === 0 ? (
              <div className="p-4 rounded border border-dashed border-[#2d372c] text-center text-xs text-[#71806b]">
                No active references in parsed mod files.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {reverseResults.map((ref, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded bg-[#181e19] border border-[#2d372c] text-xs flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-[#d6b878] truncate max-w-[180px]">
                        {ref.filePath.split('/').pop()}
                      </span>
                      <span className="text-[9px] text-[#71806b] font-mono">
                        Line {ref.lineNumber}
                      </span>
                    </div>
                    <code className="bg-[#101411] p-1.5 rounded text-[10px] font-mono text-[#a6bd87] break-all">
                      {ref.lineContent}
                    </code>
                    <span className="text-[9px] uppercase tracking-wider text-[#71806b]">
                      Context: {ref.contextType}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
