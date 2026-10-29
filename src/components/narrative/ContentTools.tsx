import React, { useMemo, useState } from 'react';
import { Copy } from 'lucide-react';
import {
  countryNameEntries,
  countryHistoryExtras,
  generateOobFile,
  generateDivisionNameGroups,
  generateDynamicModifiers,
  generateOnActions,
  generateScriptedLocalisation,
} from '../../utils/contentGenerators';

interface ContentToolsProps {
  onNotify?: (msg: string) => void;
}

type Tab = 'country' | 'oob' | 'dynamic';

const NL = String.fromCharCode(10);
const BS = String.fromCharCode(92);
const esc = (v: string) => v.split(BS).join(BS + BS).split('"').join(BS + '"');
const lines = (s: string) => s.split(NL).map((l) => l.trim()).filter(Boolean);

const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void; multiline?: boolean; mono?: boolean }> = ({ label, value, onChange, multiline, mono }) => (
  <label className="block text-xs text-[#909b88]">
    {label}
    {multiline ? (
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} className={`w-full mt-1 bg-[#1b221a] border border-[#30392e] rounded px-2 py-1 text-[#e3e5d9] ${mono ? 'font-mono' : ''}`} />
    ) : (
      <input value={value} onChange={(e) => onChange(e.target.value)} className={`w-full mt-1 bg-[#1b221a] border border-[#30392e] rounded px-2 py-1 text-[#e3e5d9] ${mono ? 'font-mono' : ''}`} />
    )}
  </label>
);

const Output: React.FC<{ title: string; text: string; onCopy: (t: string) => void }> = ({ title, text, onCopy }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-xs font-bold">
      {title}
      <button onClick={() => onCopy(text)} className="flex items-center gap-1 text-[#d6b878]"><Copy className="h-3 w-3" /> Copy</button>
    </div>
    <pre className="bg-[#0c100d] border border-[#30392e] rounded p-2 text-xs overflow-x-auto max-h-64">{text}</pre>
  </div>
);

export const ContentTools: React.FC<ContentToolsProps> = ({ onNotify }) => {
  const [tab, setTab] = useState<Tab>('country');
  const copy = (t: string) => {
    navigator.clipboard?.writeText(t);
    onNotify?.('Copied');
  };

  // Country extras
  const [tag, setTag] = useState('GDX');
  const [baseName, setBaseName] = useState('Free Duchy');
  const [baseAdj, setBaseAdj] = useState('Ducal');
  const [ideoNames, setIdeoNames] = useState('fascism=Ducal Reich|Ducal' + NL + 'communism=Ducal Republic|Ducal');
  const [techs, setTechs] = useState('infantry_weapons' + NL + 'infantry_weapons1');
  const [characters, setCharacters] = useState('GDX_leader');
  const [ideas, setIdeas] = useState('GDX_national_spirit');

  const country = useMemo(() => {
    const byIdeology: Record<string, { name: string; adjective: string }> = {};
    for (const l of lines(ideoNames)) {
      const m = l.match(/^([a-z_]+)=([^|]+)\|(.+)$/);
      if (m) byIdeology[m[1]] = { name: m[2].trim(), adjective: m[3].trim() };
    }
    const entries = countryNameEntries({ tag, base: { name: baseName, adjective: baseAdj }, byIdeology });
    return {
      loc: ['l_english:', ...entries.map((e) => ` ${e.key}:0 "${esc(e.value)}"`)].join(NL),
      history: countryHistoryExtras({ technologies: lines(techs), characters: lines(characters), ideas: lines(ideas) }),
    };
  }, [tag, baseName, baseAdj, ideoNames, techs, characters, ideas]);

  // OOB
  const [oobTemplate, setOobTemplate] = useState('Infantry Division');
  const [oobLocation, setOobLocation] = useState('3838');
  const [oobCount, setOobCount] = useState('3');
  const [airState, setAirState] = useState('8');
  const [airEquip, setAirEquip] = useState('fighter_equipment_1');
  const [airAmount, setAirAmount] = useState('20');
  const [groupId, setGroupId] = useState('GDX_INF_01');
  const [groupNames, setGroupNames] = useState('1st Guards' + NL + '2nd Guards' + NL + '3rd Guards');
  const oob = useMemo(() => {
    const units = generateOobFile({
      deployments: [{ template: oobTemplate, location: Number(oobLocation) || 1, count: Number(oobCount) || 1 }],
      air: [{ baseState: Number(airState) || 1, wings: [{ equipment: airEquip, owner: tag, amount: Number(airAmount) || 1 }] }],
    });
    const names: Record<number, string> = {};
    lines(groupNames).forEach((n, i) => (names[i + 1] = n));
    const nameGroup = generateDivisionNameGroups([{ id: groupId, name: 'Custom names', countries: [tag], divisionTypes: ['infantry'], fallback: '%d Division', ordered: names }]);
    return { units, nameGroup };
  }, [oobTemplate, oobLocation, oobCount, airState, airEquip, airAmount, tag, groupId, groupNames]);

  // Dynamic content
  const [dmId, setDmId] = useState('MY_dynamic_modifier');
  const [dmStats, setDmStats] = useState('stability_factor = 0.05' + NL + 'army_attack_factor = my_var');
  const [hook, setHook] = useState('on_startup');
  const [hookLimit, setHookLimit] = useState('country_exists = GDX');
  const [hookEffect, setHookEffect] = useState('GDX = { set_variable = { my_var = 0 } }');
  const [slocName, setSlocName] = useState('MY_GetName');
  const [slocDem, setSlocDem] = useState('MY_NAME_DEM');
  const [slocDefault, setSlocDefault] = useState('MY_NAME_DEFAULT');
  const dynamic = useMemo(() => {
    const modifier: Record<string, string | number> = {};
    for (const l of lines(dmStats)) {
      const m = l.match(/^([a-z_0-9]+)\s*=\s*(\S+)$/);
      if (m) modifier[m[1]] = Number.isNaN(Number(m[2])) ? m[2] : Number(m[2]);
    }
    return {
      dm: generateDynamicModifiers([{ id: dmId, enable: 'always = yes', modifier }]),
      oa: generateOnActions([{ hook, limit: hookLimit || undefined, effect: hookEffect }]),
      sloc: generateScriptedLocalisation([{ name: slocName, options: [{ trigger: 'has_government = democratic', key: slocDem }, { key: slocDefault }] }]),
    };
  }, [dmId, dmStats, hook, hookLimit, hookEffect, slocName, slocDem, slocDefault]);

  const tabs: [Tab, string][] = [['country', 'Country extras'], ['oob', 'Order of battle'], ['dynamic', 'Dynamic content']];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#101512] text-[#e3e5d9] overflow-hidden">
      <div className="h-9 border-b border-[#30392e] px-4 flex items-center gap-1 shrink-0">
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`px-3 py-1 rounded text-xs font-semibold ${tab === id ? 'bg-[#d6b878] text-[#1c2119]' : 'text-[#909b88] hover:bg-[#1e271c]'}`}>{label}</button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 grid md:grid-cols-2 gap-4 content-start">
        {tab === 'country' && (
          <>
            <div className="space-y-2">
              <Field label="Tag" value={tag} onChange={(v) => setTag(v.toUpperCase().slice(0, 3))} />
              <Field label="Name" value={baseName} onChange={setBaseName} />
              <Field label="Adjective" value={baseAdj} onChange={setBaseAdj} />
              <Field label="Names per ideology (ideology=Name|Adjective per line)" value={ideoNames} onChange={setIdeoNames} multiline mono />
              <Field label="Starting technologies (one per line)" value={techs} onChange={setTechs} multiline mono />
              <Field label="Recruited characters" value={characters} onChange={setCharacters} multiline mono />
              <Field label="National spirits" value={ideas} onChange={setIdeas} multiline mono />
            </div>
            <div className="space-y-3">
              <Output title="localisation/english/names (UTF-8 with BOM when saved)" text={country.loc} onCopy={copy} />
              <Output title="history/countries additions" text={country.history} onCopy={copy} />
            </div>
          </>
        )}
        {tab === 'oob' && (
          <>
            <div className="space-y-2">
              <Field label="Division template name" value={oobTemplate} onChange={setOobTemplate} />
              <Field label="Province id" value={oobLocation} onChange={setOobLocation} />
              <Field label="Number of divisions" value={oobCount} onChange={setOobCount} />
              <Field label="Air base state id" value={airState} onChange={setAirState} />
              <Field label="Air wing equipment" value={airEquip} onChange={setAirEquip} mono />
              <Field label="Planes" value={airAmount} onChange={setAirAmount} />
              <Field label="Division name group id" value={groupId} onChange={setGroupId} mono />
              <Field label="Division names (one per line, numbered in order)" value={groupNames} onChange={setGroupNames} multiline />
            </div>
            <div className="space-y-3">
              <Output title={`history/units/${tag}_1936.txt`} text={oob.units} onCopy={copy} />
              <Output title={`common/units/names_divisions/${tag}_names_divisions.txt`} text={oob.nameGroup} onCopy={copy} />
            </div>
          </>
        )}
        {tab === 'dynamic' && (
          <>
            <div className="space-y-2">
              <Field label="Dynamic modifier id" value={dmId} onChange={setDmId} mono />
              <Field label="Modifier stats (stat = number or variable)" value={dmStats} onChange={setDmStats} multiline mono />
              <Field label="on_actions hook" value={hook} onChange={setHook} mono />
              <Field label="Only if (trigger, optional)" value={hookLimit} onChange={setHookLimit} mono />
              <Field label="Effect" value={hookEffect} onChange={setHookEffect} mono />
              <Field label="Scripted localisation name" value={slocName} onChange={setSlocName} mono />
              <Field label="Key when democratic" value={slocDem} onChange={setSlocDem} mono />
              <Field label="Default key" value={slocDefault} onChange={setSlocDefault} mono />
            </div>
            <div className="space-y-3">
              <Output title="common/dynamic_modifiers" text={dynamic.dm} onCopy={copy} />
              <Output title="common/on_actions" text={dynamic.oa} onCopy={copy} />
              <Output title="common/scripted_localisation" text={dynamic.sloc} onCopy={copy} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
