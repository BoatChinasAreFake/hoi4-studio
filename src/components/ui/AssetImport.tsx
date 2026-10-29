import React, { useRef, useState } from 'react';
import { ImagePlus, Download } from 'lucide-react';
import { decodeImageFile, flagFilesFromImage, focusIconFiles, resizeRgba, FLAG_SIZES, FOCUS_ICON_SIZE, type Rgba } from '../../utils/imageAssets';
import { createZip, type ModFiles } from '../../utils/modProject';
import { downloadBytes } from '../../utils/download';

interface AssetImportProps {
  onNotify?: (msg: string) => void;
}

function toDataUrl(img: Rgba, scale = 1): string {
  const canvas = document.createElement('canvas');
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  const ctx = canvas.getContext('2d')!;
  const small = document.createElement('canvas');
  small.width = img.width;
  small.height = img.height;
  small.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(img.data), img.width, img.height), 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL();
}

export const AssetImport: React.FC<AssetImportProps> = ({ onNotify }) => {
  const [image, setImage] = useState<Rgba | null>(null);
  const [tag, setTag] = useState('MYC');
  const [iconId, setIconId] = useState('my_icon');
  const [prefix, setPrefix] = useState('mymod');
  const input = useRef<HTMLInputElement>(null);

  const load = async (file: File | undefined) => {
    if (!file) return;
    try {
      setImage(await decodeImageFile(file));
      setIconId(file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9_]+/g, '_'));
    } catch (err) {
      onNotify?.(`Could not read image: ${(err as Error).message}`);
    }
  };

  const toMap = (files: Record<string, Uint8Array | string>): ModFiles =>
    new Map(Object.entries(files).map(([k, v]) => [k, typeof v === 'string' ? new TextEncoder().encode(v) : v]));

  const exportFlags = () => {
    if (!image) return;
    downloadBytes(`${tag}_flags.zip`, createZip(toMap(flagFilesFromImage(tag.toUpperCase(), image))), 'application/zip');
    onNotify?.('Exported 15 flag TGAs');
  };

  const exportIcon = () => {
    if (!image) return;
    downloadBytes(`${prefix}_${iconId}_focus_icon.zip`, createZip(toMap(focusIconFiles(prefix, [{ id: iconId, image }]))), 'application/zip');
    onNotify?.(`Exported GFX_goal_${prefix}_${iconId}`);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#101512] text-[#e3e5d9] overflow-y-auto p-4 gap-4">
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => load(e.target.files?.[0])} />
      <div className="flex items-center gap-3">
        <button onClick={() => input.current?.click()} className="flex items-center gap-1 px-3 py-1.5 rounded bg-[#242d23] border border-[#3b4936] text-xs text-[#d6b878] hover:bg-[#323d2f]">
          <ImagePlus className="h-4 w-4" /> Choose image
        </button>
        <span className="text-xs text-[#909b88]">Any PNG/JPG/WebP. It is resized in your browser and converted to the 32-bit TGA HOI4 expects.</span>
      </div>

      {image && (
        <div className="grid md:grid-cols-2 gap-4">
          <section className="bg-[#141a15] border border-[#30392e] rounded p-3 space-y-3">
            <h3 className="text-sm font-bold">Country flags (3 sizes x 5 ideologies)</h3>
            <div className="flex items-end gap-3">
              {FLAG_SIZES.map((s) => (
                <div key={s.folder} className="text-center">
                  <img src={toDataUrl(resizeRgba(image, s.width, s.height), 3)} alt={`${s.width}x${s.height}`} className="border border-[#30392e]" />
                  <div className="text-[10px] text-[#71806b] mt-1">{s.width}x{s.height}</div>
                </div>
              ))}
            </div>
            <label className="text-xs text-[#909b88] flex items-center gap-2">
              Country tag
              <input value={tag} maxLength={3} onChange={(e) => setTag(e.target.value.toUpperCase())} className="bg-[#1b221a] border border-[#30392e] rounded px-1.5 py-0.5 w-16 text-[#e3e5d9]" />
            </label>
            <button onClick={exportFlags} className="flex items-center gap-1 px-3 py-1.5 rounded bg-[#d6b878] text-[#1c2119] text-xs font-bold">
              <Download className="h-3.5 w-3.5" /> Download flag set (ZIP)
            </button>
          </section>

          <section className="bg-[#141a15] border border-[#30392e] rounded p-3 space-y-3">
            <h3 className="text-sm font-bold">Focus icon ({FOCUS_ICON_SIZE.width}x{FOCUS_ICON_SIZE.height}) with .gfx</h3>
            <img src={toDataUrl(resizeRgba(image, FOCUS_ICON_SIZE.width, FOCUS_ICON_SIZE.height), 1)} alt="focus icon" className="border border-[#30392e]" />
            <div className="flex gap-2 text-xs text-[#909b88]">
              <label className="flex items-center gap-1">
                Mod prefix
                <input value={prefix} onChange={(e) => setPrefix(e.target.value)} className="bg-[#1b221a] border border-[#30392e] rounded px-1.5 py-0.5 w-24 text-[#e3e5d9]" />
              </label>
              <label className="flex items-center gap-1">
                Icon id
                <input value={iconId} onChange={(e) => setIconId(e.target.value)} className="bg-[#1b221a] border border-[#30392e] rounded px-1.5 py-0.5 w-32 text-[#e3e5d9]" />
              </label>
            </div>
            <p className="text-[11px] text-[#71806b]">Use it in a focus as <code>icon = GFX_goal_{prefix}_{iconId}</code>.</p>
            <button onClick={exportIcon} className="flex items-center gap-1 px-3 py-1.5 rounded bg-[#d6b878] text-[#1c2119] text-xs font-bold">
              <Download className="h-3.5 w-3.5" /> Download icon + .gfx (ZIP)
            </button>
          </section>
        </div>
      )}
    </div>
  );
};
