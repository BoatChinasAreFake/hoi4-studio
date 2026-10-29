import React, { useMemo, useState } from 'react';
import { Copy, Plus, Trash2 } from 'lucide-react';

interface EventPreviewProps {
  onNotify?: (msg: string) => void;
}

interface Option {
  name: string;
  effect: string;
}

const T = String.fromCharCode(9);
const NL = String.fromCharCode(10);

export const EventPreview: React.FC<EventPreviewProps> = ({ onNotify }) => {
  const [ns, setNs] = useState('my');
  const [num, setNum] = useState(1);
  const [title, setTitle] = useState('A Letter from the Capital');
  const [desc, setDesc] = useState('A courier arrives with news that will shape the coming year.');
  const [picture, setPicture] = useState('GFX_report_event_generic_read_write');
  const [options, setOptions] = useState<Option[]>([
    { name: 'We will answer at once.', effect: 'add_political_power = 25' },
    { name: 'Let it wait.', effect: 'add_stability = 0.02' },
  ]);

  const id = `${ns}.${num}`;
  const script = useMemo(() => {
    const lines = [
      `add_namespace = ${ns}`,
      '',
      'country_event = {',
      `${T}id = ${id}`,
      `${T}title = ${id}.t`,
      `${T}desc = ${id}.d`,
      `${T}picture = ${picture}`,
      `${T}is_triggered_only = yes`,
      ...options.flatMap((o, i) => [`${T}option = {`, `${T}${T}name = ${id}.${String.fromCharCode(97 + i)}`, ...(o.effect.trim() ? [`${T}${T}${o.effect.trim()}`] : []), `${T}}`]),
      '}',
    ];
    const loc = [
      'l_english:',
      ` ${id}.t:0 "${title}"`,
      ` ${id}.d:0 "${desc}"`,
      ...options.map((o, i) => ` ${id}.${String.fromCharCode(97 + i)}:0 "${o.name}"`),
    ];
    return { event: lines.join(NL), loc: loc.join(NL) };
  }, [ns, id, picture, options, title, desc]);

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text);
    onNotify?.('Copied');
  };

  const update = (i: number, patch: Partial<Option>) => setOptions((prev) => prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));

  return (
    <div className="flex-1 flex h-full bg-[#101512] text-[#e3e5d9] overflow-hidden">
      <div className="w-1/2 border-r border-[#30392e] overflow-y-auto p-4 space-y-3 text-xs">
        <div className="flex gap-2">
          <label className="flex-1">Namespace
            <input value={ns} onChange={(e) => setNs(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))} className="w-full mt-1 bg-[#1b221a] border border-[#30392e] rounded px-2 py-1" />
          </label>
          <label className="w-24">Number
            <input type="number" min={1} value={num} onChange={(e) => setNum(Math.max(1, Number(e.target.value) || 1))} className="w-full mt-1 bg-[#1b221a] border border-[#30392e] rounded px-2 py-1" />
          </label>
        </div>
        <label className="block">Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full mt-1 bg-[#1b221a] border border-[#30392e] rounded px-2 py-1" />
        </label>
        <label className="block">Text
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} className="w-full mt-1 bg-[#1b221a] border border-[#30392e] rounded px-2 py-1" />
        </label>
        <label className="block">Picture sprite
          <input value={picture} onChange={(e) => setPicture(e.target.value)} className="w-full mt-1 bg-[#1b221a] border border-[#30392e] rounded px-2 py-1 font-mono" />
        </label>
        <div className="space-y-2">
          <div className="flex items-center justify-between font-bold">Options
            <button onClick={() => setOptions((p) => [...p, { name: 'New option', effect: '' }])} className="flex items-center gap-1 text-[#d6b878]"><Plus className="h-3 w-3" /> Add</button>
          </div>
          {options.map((o, i) => (
            <div key={i} className="bg-[#141a15] border border-[#30392e] rounded p-2 space-y-1">
              <div className="flex gap-2">
                <input value={o.name} onChange={(e) => update(i, { name: e.target.value })} className="flex-1 bg-[#1b221a] border border-[#30392e] rounded px-2 py-1" />
                <button onClick={() => setOptions((p) => p.filter((_, idx) => idx !== i))} className="text-[#d97a6c]"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
              <input value={o.effect} onChange={(e) => update(i, { effect: e.target.value })} placeholder="effect, e.g. add_political_power = 25" className="w-full bg-[#1b221a] border border-[#30392e] rounded px-2 py-1 font-mono" />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between font-bold">Event script <button onClick={() => copy(script.event)} className="flex items-center gap-1 text-[#d6b878]"><Copy className="h-3 w-3" /> Copy</button></div>
          <pre className="bg-[#0c100d] border border-[#30392e] rounded p-2 overflow-x-auto">{script.event}</pre>
          <div className="flex items-center justify-between font-bold">Localisation <button onClick={() => copy(script.loc)} className="flex items-center gap-1 text-[#d6b878]"><Copy className="h-3 w-3" /> Copy</button></div>
          <pre className="bg-[#0c100d] border border-[#30392e] rounded p-2 overflow-x-auto">{script.loc}</pre>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-[#0c100d]">
        <div className="w-[420px] bg-[#1d241c] border-2 border-[#4a5a44] shadow-xl">
          <div className="bg-[#2b3528] text-center text-[#d6b878] font-bold py-1.5 text-sm tracking-wide">{title || ' '}</div>
          <div className="h-40 bg-gradient-to-b from-[#3a4a52] to-[#202a2c] flex items-end justify-center text-[10px] text-[#8a9a9f] font-mono pb-1">{picture}</div>
          <div className="p-4 text-xs leading-relaxed text-[#d9dccf] min-h-[80px]">{desc}</div>
          <div className="p-3 space-y-1.5">
            {options.map((o, i) => (
              <div key={i} className="bg-[#2b3528] border border-[#4a5a44] hover:bg-[#364431] text-center text-xs py-1.5 px-2 text-[#e3e5d9]">{o.name}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
