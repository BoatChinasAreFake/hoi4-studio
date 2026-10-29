import React, { useRef, useState } from 'react';
import { Download, FileUp } from 'lucide-react';
import { addResearchFolder, researchFolderLocEntries } from '../../utils/researchFolders';
import { createZip, textFile, type ModFiles } from '../../utils/modProject';
import { formatLocalizationYaml } from '../../utils/politicsGenerators';
import { downloadBytes } from '../../utils/download';

interface Props {
  onNotify?: (msg: string) => void;
}

const FOLDERS = ['electronics_folder', 'industry_folder', 'infantry_folder', 'support_folder', 'artillery_folder', 'armour_folder'];

export const ResearchFolderTool: React.FC<Props> = ({ onNotify }) => {
  const [gui, setGui] = useState<string | null>(null);
  const [gfx, setGfx] = useState<string | null>(null);
  const [id, setId] = useState('my_folder');
  const [name, setName] = useState('My Research');
  const [cloneFrom, setCloneFrom] = useState('electronics_folder');
  const [notes, setNotes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);

  const load = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      const text = await f.text();
      if (f.name === 'countrytechtreeview.gui') setGui(text);
      else if (f.name === 'countrytechtreeview.gfx') setGfx(text);
    }
  };

  const build = () => {
    setError('');
    if (!gui || !gfx) return setError('Load countrytechtreeview.gui and countrytechtreeview.gfx first.');
    try {
      const r = addResearchFolder(gui, gfx, { id, cloneFrom });
      const files: ModFiles = new Map();
      files.set('interface/countrytechtreeview.gui', textFile(r.gui));
      if (r.gfx) files.set(`interface/${id}_sprites.gfx`, textFile(r.gfx));
      files.set(`localisation/english/${id}_l_english.yml`, formatLocalizationYaml('english', researchFolderLocEntries(id, name)));
      files.set(
        `common/technologies/${id}_example.txt`,
        textFile(['technologies = {', `\t${id}_first = {`, '\t\tresearch_cost = 1.0', '\t\tstart_year = 1936', '\t\tfolder = {', `\t\t\tname = ${id}`, '\t\t\tposition = { x = 0 y = 0 }', '\t\t}', '\t\tcategories = { industry }', '\t}', '}', ''].join(String.fromCharCode(10)))
      );
      downloadBytes(`${id}_research_folder.zip`, createZip(files), 'application/zip');
      setNotes(r.notes);
      onNotify?.(`Exported research folder "${id}"`);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#101512] text-[#e3e5d9] overflow-y-auto p-4 gap-4 text-xs">
      <p className="text-[#909b88] max-w-2xl">
        A new research folder needs a modified copy of the game's whole <code>countrytechtreeview.gui</code>, which the game replaces as one file.
        Load your own copies from <code>interface/</code> (they stay in your browser), pick an existing folder to copy the layout from, and export the
        result into your mod. Redo this after a game patch changes the vanilla file.
      </p>
      <input ref={input} type="file" accept=".gui,.gfx" multiple className="hidden" onChange={(e) => load(e.target.files)} />
      <button onClick={() => input.current?.click()} className="self-start flex items-center gap-1 px-3 py-1.5 rounded bg-[#242d23] border border-[#3b4936] text-[#d6b878]">
        <FileUp className="h-3.5 w-3.5" /> Load countrytechtreeview.gui and .gfx
      </button>
      <div className="text-[#909b88]">{gui ? 'gui loaded' : 'gui missing'}, {gfx ? 'gfx loaded' : 'gfx missing'}</div>
      <div className="flex flex-wrap gap-3 items-end">
        <label>Folder id
          <input value={id} onChange={(e) => setId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} className="block mt-1 bg-[#1b221a] border border-[#30392e] rounded px-2 py-1 font-mono" />
        </label>
        <label>Display name
          <input value={name} onChange={(e) => setName(e.target.value)} className="block mt-1 bg-[#1b221a] border border-[#30392e] rounded px-2 py-1" />
        </label>
        <label>Copy layout from
          <select value={cloneFrom} onChange={(e) => setCloneFrom(e.target.value)} className="block mt-1 bg-[#1b221a] border border-[#30392e] rounded px-2 py-1">
            {FOLDERS.map((f) => <option key={f}>{f}</option>)}
          </select>
        </label>
        <button onClick={build} className="flex items-center gap-1 px-3 py-1.5 rounded bg-[#d6b878] text-[#1c2119] font-bold"><Download className="h-3.5 w-3.5" /> Export ZIP</button>
      </div>
      {error && <div className="text-[#d97a6c]">{error}</div>}
      {notes.map((n) => <div key={n} className="text-[#909b88]">{n}</div>)}
    </div>
  );
};
