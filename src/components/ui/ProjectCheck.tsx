import React, { useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FolderOpen, FileArchive, Download, Info, XCircle } from 'lucide-react';
import {
  validateModProject,
  summarizeProblems,
  describeImport,
  createZip,
  readZip,
  stripCommonRoot,
  filesFromFileList,
  type ModFiles,
  type ModProblem,
} from '../../utils/modProject';
import { downloadBytes } from '../../utils/download';

interface ProjectCheckProps {
  onNotify?: (msg: string) => void;
}

const ICON = {
  error: <XCircle className="h-3.5 w-3.5 text-[#d97a6c]" />,
  warning: <AlertTriangle className="h-3.5 w-3.5 text-[#d6b878]" />,
  info: <Info className="h-3.5 w-3.5 text-[#7fa6c9]" />,
} as const;

export const ProjectCheck: React.FC<ProjectCheckProps> = ({ onNotify }) => {
  const [files, setFiles] = useState<ModFiles | null>(null);
  const [name, setName] = useState('my_mod');
  const [languages, setLanguages] = useState('');
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all');
  const folderInput = useRef<HTMLInputElement>(null);
  const zipInput = useRef<HTMLInputElement>(null);

  const problems: ModProblem[] = useMemo(
    () =>
      files
        ? validateModProject(files, { requiredLanguages: languages.split(/[\s,]+/).filter(Boolean) })
        : [],
    [files, languages]
  );
  const summary = summarizeProblems(problems);
  const notes = useMemo(() => (files ? describeImport(files) : []), [files]);
  const shown = problems.filter((p) => filter === 'all' || p.severity === filter);

  const loadFolder = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const map = await filesFromFileList(list);
    setFiles(map);
    const first = Array.from(list)[0] as File & { webkitRelativePath?: string };
    setName((first.webkitRelativePath || '').split('/')[0] || 'my_mod');
    onNotify?.(`Imported ${map.size} files`);
  };

  const loadZip = async (file: File | undefined) => {
    if (!file) return;
    try {
      const map = stripCommonRoot(await readZip(new Uint8Array(await file.arrayBuffer())));
      setFiles(map);
      setName(file.name.replace(/\.zip$/i, ''));
      onNotify?.(`Imported ${map.size} files from ${file.name}`);
    } catch (err) {
      onNotify?.(`Could not read ZIP: ${(err as Error).message}`);
    }
  };

  const exportZip = () => {
    if (!files) return;
    downloadBytes(`${name}.zip`, createZip(files, name), 'application/zip');
    onNotify?.('Exported ZIP');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#101512] text-[#e3e5d9] overflow-hidden">
      <div className="border-b border-[#30392e] bg-[#141a15] p-3 flex flex-wrap items-center gap-2 text-xs">
        <input
          ref={folderInput}
          type="file"
          className="hidden"
          // @ts-expect-error webkitdirectory is a non-standard but widely supported attribute
          webkitdirectory=""
          multiple
          onChange={(e) => loadFolder(e.target.files)}
        />
        <input ref={zipInput} type="file" accept=".zip" className="hidden" onChange={(e) => loadZip(e.target.files?.[0])} />
        <button onClick={() => folderInput.current?.click()} className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#242d23] border border-[#3b4936] text-[#d6b878] hover:bg-[#323d2f]">
          <FolderOpen className="h-3.5 w-3.5" /> Import mod folder
        </button>
        <button onClick={() => zipInput.current?.click()} className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#242d23] border border-[#3b4936] text-[#d6b878] hover:bg-[#323d2f]">
          <FileArchive className="h-3.5 w-3.5" /> Import ZIP
        </button>
        <button
          onClick={exportZip}
          disabled={!files}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#d6b878] text-[#1c2119] font-bold disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" /> Export ZIP
        </button>
        <label className="flex items-center gap-1 text-[#909b88]">
          Mod name
          <input value={name} onChange={(e) => setName(e.target.value)} className="bg-[#1b221a] border border-[#30392e] rounded px-1.5 py-0.5 w-40 text-[#e3e5d9]" />
        </label>
        <label className="flex items-center gap-1 text-[#909b88]">
          Required languages
          <input value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="german french" className="bg-[#1b221a] border border-[#30392e] rounded px-1.5 py-0.5 w-40 text-[#e3e5d9]" />
        </label>
      </div>

      {!files ? (
        <div className="flex-1 flex items-center justify-center text-sm text-[#909b88] p-8 text-center">
          Import a mod folder or ZIP to check it. Nothing leaves your browser; the check covers braces, localisation,
          references, sprites, flags and files that would replace a vanilla file wholesale.
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          <div className="w-72 border-r border-[#30392e] p-3 overflow-y-auto text-xs space-y-3 shrink-0">
            <div className="flex items-center gap-2 text-sm font-bold">
              {summary.errors === 0 ? <CheckCircle2 className="h-4 w-4 text-[#8cc08c]" /> : <XCircle className="h-4 w-4 text-[#d97a6c]" />}
              {summary.errors === 0 ? 'No errors' : `${summary.errors} error(s)`}
            </div>
            <div className="text-[#909b88]">
              {summary.warnings} warning(s), {summary.infos} note(s)
            </div>
            <div className="flex gap-1 flex-wrap">
              {(['all', 'error', 'warning', 'info'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2 py-0.5 rounded ${filter === f ? 'bg-[#d6b878] text-[#1c2119] font-bold' : 'bg-[#1b221a] text-[#909b88]'}`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="space-y-1 text-[#909b88]">
              {notes.map((n) => (
                <p key={n}>{n}</p>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {shown.length === 0 && <p className="text-xs text-[#909b88]">Nothing to show for this filter.</p>}
            {shown.map((p, i) => (
              <div key={i} className="flex gap-2 items-start text-xs bg-[#141a15] border border-[#30392e] rounded px-2 py-1.5">
                <span className="mt-0.5">{ICON[p.severity]}</span>
                <div className="min-w-0">
                  <div className="font-mono text-[#d6b878] truncate">{p.file}</div>
                  <div>{p.message}</div>
                  <div className="text-[10px] text-[#71806b]">{p.code}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
