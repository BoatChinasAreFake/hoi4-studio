/** Save bytes or text as a file download (browser only). */
export function downloadBytes(filename: string, data: Uint8Array | string, mime = 'application/octet-stream'): void {
  const part = (typeof data === 'string' ? data : data.slice().buffer) as BlobPart;
  const url = URL.createObjectURL(new Blob([part], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
