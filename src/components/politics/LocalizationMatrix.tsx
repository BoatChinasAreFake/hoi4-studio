import React, { useState } from 'react';
import type { Hoi4Language, LocMatrixEntry } from '../../types/politics';
import {
  ALL_HOI4_LANGUAGES,
  formatLocalizationYaml,
  validateLocalizationEncoding,
} from '../../utils/politicsGenerators';
import {
  Languages,
  Plus,
  Trash2,
  Download,
  FileCheck,
  Search,
} from 'lucide-react';

const INITIAL_ENTRIES: LocMatrixEntry[] = [
  {
    key: 'FRA_charles_de_gaulle',
    translations: {
      english: 'Charles de Gaulle',
      french: 'Charles de Gaulle',
      german: 'Charles de Gaulle',
      russian: 'Шарль де Голль',
      spanish: 'Charles de Gaulle',
      polish: 'Charles de Gaulle',
      braz_por: 'Charles de Gaulle',
      japanese: 'シャルル・ド・ゴール',
      simp_chinese: '夏尔·戴高乐',
      korean: '샤를 드골',
    },
  },
  {
    key: 'RPL_a_new_republic',
    translations: {
      english: 'A New Republic',
      french: 'Une Nouvelle République',
      german: 'Eine Neue Republik',
      russian: 'Новая Республика',
      spanish: 'Una Nueva República',
      polish: 'Nowa Republika',
      braz_por: 'Uma Nova República',
      japanese: '新たな共和国',
      simp_chinese: '新共和国',
      korean: '새로운 공화국',
    },
  },
  {
    key: 'RPL_revive_our_industry',
    translations: {
      english: 'Revive Our Industry',
      french: 'Relancer Notre Industrie',
      german: 'Unsere Industrie Wiederbeleben',
      russian: 'Возродить нашу промышленность',
      spanish: 'Revivir Nuestra Industria',
      polish: 'Odbudowa Naszego Przemysłu',
      braz_por: 'Reviver Nossa Indústria',
      japanese: '', // Missing translation on purpose for demonstration
      simp_chinese: '重振工业',
      korean: '',
    },
  },
];

interface LocalizationMatrixProps {
  onNotify?: (msg: string) => void;
}

export const LocalizationMatrix: React.FC<LocalizationMatrixProps> = ({ onNotify }) => {
  const [entries, setEntries] = useState<LocMatrixEntry[]>(INITIAL_ENTRIES);
  const [activeLang, setActiveLang] = useState<Hoi4Language>('english');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyMissing, setOnlyMissing] = useState<boolean>(false);
  const [newKey, setNewKey] = useState<string>('');

  const handleUpdateTranslation = (key: string, lang: Hoi4Language, text: string) => {
    setEntries((prev) =>
      prev.map((item) =>
        item.key === key
          ? { ...item, translations: { ...item.translations, [lang]: text } }
          : item
      )
    );
  };

  const handleAddKey = () => {
    const k = newKey.trim();
    if (!k || entries.some((e) => e.key === k)) return;
    const blankTranslations: Record<Hoi4Language, string> = {
      english: '',
      french: '',
      german: '',
      russian: '',
      spanish: '',
      polish: '',
      braz_por: '',
      japanese: '',
      simp_chinese: '',
      korean: '',
    };
    setEntries([...entries, { key: k, translations: blankTranslations }]);
    setNewKey('');
    onNotify?.(`Added localization key: ${k}`);
  };

  const handleDeleteKey = (key: string) => {
    setEntries((prev) => prev.filter((e) => e.key !== key));
  };

  // Export with strictly enforced UTF-8 BOM byte sequence [0xEF, 0xBB, 0xBF]
  const handleExportYaml = () => {
    const list = entries.map((e) => ({
      key: e.key,
      value: e.translations[activeLang] || '',
    }));
    const bytes = formatLocalizationYaml(activeLang, list);

    // Verify BOM
    const validation = validateLocalizationEncoding(bytes);
    if (!validation.valid) {
      onNotify?.(`BOM Error: ${validation.error}`);
      return;
    }

    const blob = new Blob([bytes as unknown as BlobPart], { type: 'text/yaml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mod_l_${activeLang}.yml`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify?.(
      `Exported mod_l_${activeLang}.yml with strictly verified UTF-8 BOM [0xEF, 0xBB, 0xBF]!`
    );
  };

  const filteredEntries = entries.filter((e) => {
    const matchQuery =
      e.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      Object.values(e.translations).some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchQuery) return false;
    if (onlyMissing) {
      return Object.values(e.translations).some((t) => !t.trim());
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#101512] text-[#e3e5d9] overflow-hidden select-none">
      {/* Top Header */}
      <div className="h-12 border-b border-[#30392e] bg-[#181e19] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Languages className="h-4 w-4 text-[#d6b878]" />
          <span className="font-serif font-bold text-sm tracking-wide text-[#e3e5d9]">
            MULTI-LANGUAGE LOCALIZATION MATRIX
          </span>
          <span className="text-[#3b4936]">|</span>
          <span className="text-xs text-emerald-400 font-mono font-bold flex items-center gap-1">
            <FileCheck className="h-3.5 w-3.5" /> UTF-8 BOM [0xEF, 0xBB, 0xBF] Enforced
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Language Selector for Export */}
          <select
            value={activeLang}
            onChange={(e) => setActiveLang(e.target.value as Hoi4Language)}
            className="bg-[#242d23] border border-[#3b4936] rounded px-2.5 py-1 text-xs text-[#e3e5d9]"
          >
            {ALL_HOI4_LANGUAGES.map((l) => (
              <option key={l.key} value={l.key}>
                Export as l_{l.key}
              </option>
            ))}
          </select>

          <button
            onClick={handleExportYaml}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#d6b878] hover:bg-[#e0c587] text-[#1c2119] rounded text-xs font-bold transition shadow"
          >
            <Download className="h-3.5 w-3.5" /> Export YAML (with BOM)
          </button>
        </div>
      </div>

      {/* Filter and Add Key Toolbar */}
      <div className="h-12 border-b border-[#30392e] bg-[#141a15] px-4 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2 text-[#909b88]" />
            <input
              type="text"
              placeholder="Search keys or translations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1c241d] border border-[#30392e] rounded pl-8 pr-2.5 py-1 text-xs text-[#e3e5d9] focus:outline-none focus:border-[#d6b878]"
            />
          </div>

          <label className="flex items-center gap-1.5 text-xs text-[#909b88] cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={onlyMissing}
              onChange={(e) => setOnlyMissing(e.target.checked)}
              className="accent-[#d6b878] h-3.5 w-3.5 rounded"
            />
            <span>Show Missing Only</span>
          </label>
        </div>

        {/* Add New Key */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="NEW_LOCALIZATION_KEY"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value.toUpperCase())}
            className="bg-[#1c241d] border border-[#30392e] rounded px-2.5 py-1 text-xs font-mono text-[#e3e5d9] w-56"
          />
          <button
            onClick={handleAddKey}
            className="flex items-center gap-1 px-3 py-1 bg-[#242d23] hover:bg-[#354130] text-[#d6b878] border border-[#3b4936] rounded text-xs font-semibold"
          >
            <Plus className="h-3.5 w-3.5" /> Add Key
          </button>
        </div>
      </div>

      {/* Spreadsheet Matrix Table */}
      <div className="flex-1 overflow-auto bg-[#0d120e]">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#161d17] border-b border-[#30392e] sticky top-0 z-20">
            <tr>
              <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-[#909b88] w-64 border-r border-[#30392e]">
                Localization Key
              </th>
              {ALL_HOI4_LANGUAGES.map((lang) => (
                <th
                  key={lang.key}
                  className="p-3 text-[10px] font-bold uppercase tracking-wider text-[#d6b878] min-w-56 border-r border-[#2c3729]"
                >
                  {lang.label} ({lang.key})
                </th>
              ))}
              <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-[#909b88] w-12 text-center">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e271c] font-sans text-xs">
            {filteredEntries.map((entry) => (
              <tr key={entry.key} className="hover:bg-[#131b14] transition">
                <td className="p-2.5 font-mono text-xs text-[#a6bd87] font-semibold border-r border-[#2c3729] bg-[#101611]/60">
                  {entry.key}
                </td>
                {ALL_HOI4_LANGUAGES.map((lang) => {
                  const val = entry.translations[lang.key] || '';
                  const isMissing = !val.trim();
                  return (
                    <td
                      key={lang.key}
                      className={`p-1.5 border-r border-[#222d20] ${
                        isMissing ? 'bg-amber-950/20' : ''
                      }`}
                    >
                      <input
                        type="text"
                        value={val}
                        placeholder={isMissing ? '[Missing translation]' : ''}
                        onChange={(e) =>
                          handleUpdateTranslation(entry.key, lang.key, e.target.value)
                        }
                        className={`w-full bg-transparent p-1.5 rounded text-xs focus:outline-none focus:bg-[#1a231b] ${
                          isMissing
                            ? 'text-amber-400 placeholder:text-amber-500/50 italic'
                            : 'text-[#e3e5d9]'
                        }`}
                      />
                    </td>
                  );
                })}
                <td className="p-2 text-center">
                  <button
                    onClick={() => handleDeleteKey(entry.key)}
                    className="p-1 hover:text-red-400 text-[#909b88]"
                  >
                    <Trash2 className="h-3.5 w-3.5 mx-auto" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
