import React, { useState } from 'react';
import { Copy, Download, Check, AlertTriangle, X, FolderSync } from 'lucide-react';
import type { FocusProject } from '../types/focus';
import { ClausewitzFocusParser } from '../utils/clausewitzParser';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: FocusProject;
  mode: 'export' | 'validate';
  onNotify: (msg: string) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  project,
  mode,
  onNotify,
}) => {
  const [tab, setTab] = useState<'script' | 'loc' | 'guide'>('script');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const scriptText = ClausewitzFocusParser.generateScript(project);
  const locText = ClausewitzFocusParser.generateLocalization(project);
  const guideText = ClausewitzFocusParser.generateGuide(project);
  const validationErrors = ClausewitzFocusParser.validateTree(project);

  const activeContent =
    mode === 'validate'
      ? validationErrors.length
        ? validationErrors.map((e) => `⚠ ${e}`).join('\n')
        : '✓ No structural issues found.\n\nTree structure, unique IDs, coordinate grid, brace balance, and prerequisite graphs are all valid.\nGame-specific effects and sprites can now be tested in HOI4.'
      : tab === 'script'
      ? scriptText
      : tab === 'loc'
      ? locText
      : guideText;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onNotify('Copied to clipboard');
    } catch {
      onNotify('Clipboard access blocked. Please copy manually.');
    }
  };

  const downloadFile = (name: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const handleDownloadActive = () => {
    if (tab === 'script') {
      downloadFile(`${project.treeId}.txt`, scriptText, 'text/plain;charset=utf-8');
    } else if (tab === 'loc') {
      downloadFile(`${project.treeId}_l_english.yml`, locText, 'text/yaml;charset=utf-8');
    } else {
      downloadFile('INSTALL.txt', guideText, 'text/plain;charset=utf-8');
    }
    onNotify('Downloaded file');
  };

  const handleDownloadBundle = () => {
    downloadFile(`${project.treeId}.txt`, scriptText, 'text/plain;charset=utf-8');
    setTimeout(() => {
      downloadFile(`${project.treeId}_l_english.yml`, locText, 'text/yaml;charset=utf-8');
      onNotify(`Downloaded ${project.treeId}.txt and ${project.treeId}_l_english.yml`);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 select-none">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg border border-[#526044] bg-[#181e19] text-[#e3e5d9] shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#30392e] px-6 py-4 bg-[#1a211a]">
          <div>
            <h3 className="brand-serif text-xl font-bold text-[#e3e5d9]">
              {mode === 'validate' ? 'Tree Validation' : 'Export Mod Files'}
            </h3>
            <p className="text-xs text-[#909b88] mt-0.5">
              {mode === 'validate'
                ? 'Automated scan of focus IDs, coordinate overlaps, prerequisite cycles, and brace balance.'
                : 'Ready for your mod folder. Download the focus tree script and English UTF-8 BOM localization.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-[#909b88] hover:bg-[#253023] hover:text-[#e3e5d9]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs (Export Mode Only) */}
        {mode === 'export' && (
          <div className="flex border-b border-[#30392e] bg-[#141a15] px-6 pt-2 text-xs">
            <button
              onClick={() => setTab('script')}
              className={`pb-2.5 px-3 font-medium transition ${
                tab === 'script'
                  ? 'border-b-2 border-[#d6b878] text-[#d6b878]'
                  : 'text-[#909b88] hover:text-[#e3e5d9]'
              }`}
            >
              Focus tree .txt
            </button>
            <button
              onClick={() => setTab('loc')}
              className={`pb-2.5 px-3 font-medium transition ${
                tab === 'loc'
                  ? 'border-b-2 border-[#d6b878] text-[#d6b878]'
                  : 'text-[#909b88] hover:text-[#e3e5d9]'
              }`}
            >
              English .yml (UTF-8 BOM)
            </button>
            <button
              onClick={() => setTab('guide')}
              className={`pb-2.5 px-3 font-medium transition ${
                tab === 'guide'
                  ? 'border-b-2 border-[#d6b878] text-[#d6b878]'
                  : 'text-[#909b88] hover:text-[#e3e5d9]'
              }`}
            >
              Installation Guide
            </button>
          </div>
        )}

        {/* Body Preview */}
        <div className="flex-1 overflow-auto p-6">
          {mode === 'validate' && validationErrors.length > 0 && (
            <div className="mb-4 flex items-center gap-2 rounded border border-[#bd785c]/40 bg-[#bd785c]/10 p-3 text-xs text-[#e0a18d]">
              <AlertTriangle className="h-4 w-4 shrink-0 text-[#bd785c]" />
              <span>Found {validationErrors.length} issue(s) that need correction:</span>
            </div>
          )}

          <pre className="max-h-[50vh] overflow-auto rounded border border-[#30392e] bg-[#0d130e] p-4 font-mono text-xs leading-relaxed text-[#c4d3af] select-text">
            {activeContent}
          </pre>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-[#30392e] bg-[#1a211a] px-6 py-4">
          <div className="text-[11px] text-[#909b88]">
            {mode === 'validate'
              ? `${validationErrors.length} errors found`
              : `${project.nodes.length} focuses · UTF-8 with BOM standard`}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded border border-[#3b4936] bg-[#242d23] px-3 py-1.5 text-xs font-medium text-[#e3e5d9] hover:bg-[#354130] transition"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-[#a6bd87]" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied!' : 'Copy Preview'}
            </button>

            {mode === 'export' && (
              <>
                <button
                  onClick={handleDownloadActive}
                  className="flex items-center gap-1.5 rounded border border-[#3b4936] bg-[#242d23] px-3 py-1.5 text-xs font-medium text-[#e3e5d9] hover:bg-[#354130] transition"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download File
                </button>
                <button
                  onClick={handleDownloadBundle}
                  className="flex items-center gap-1.5 rounded bg-[#d6b878] px-4 py-1.5 text-xs font-bold text-[#1c2119] hover:bg-[#e0c587] transition shadow"
                >
                  <FolderSync className="h-3.5 w-3.5" />
                  Download Both Files
                </button>
              </>
            )}

            {mode === 'validate' && (
              <button
                onClick={onClose}
                className="rounded bg-[#d6b878] px-4 py-1.5 text-xs font-bold text-[#1c2119] hover:bg-[#e0c587] transition shadow"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
