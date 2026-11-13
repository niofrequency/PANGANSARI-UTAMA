// Minimal, dependency-free spreadsheet reader for the Admin's employee
// import: .xlsx (Office Open XML) and .csv. Returns every sheet as a grid of
// strings. An .xlsx file is a zip of XML parts, so this reads the zip's
// central directory, inflates the parts it needs with the browser's built-in
// DecompressionStream('deflate-raw'), and parses them with DOMParser.
//
// Deliberately not SheetJS: the npm build is outdated with known
// vulnerabilities, and a small reader is enough for a plain table. Old
// binary .xls files aren't supported — re-save them as .xlsx in Excel.

export interface Sheet {
  name: string;
  rows: string[][];
}

export async function readSpreadsheet(file: File): Promise<Sheet[]> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.csv')) return [{ name: file.name, rows: parseCsv(await file.text()) }];
  if (lower.endsWith('.xlsx')) return readXlsx(new Uint8Array(await file.arrayBuffer()));
  if (lower.endsWith('.xls')) throw new Error('old-xls');
  throw new Error('unsupported');
}

// ── CSV ────────────────────────────────────────────────────────────────
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  const sep = (text.split('\n')[0].match(/;/g)?.length || 0) > (text.split('\n')[0].match(/,/g)?.length || 0) ? ';' : ',';
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.map(r => r.map(v => v.replace(/^﻿/, '').trim()));
}

// ── XLSX ───────────────────────────────────────────────────────────────
async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function unzip(buf: Uint8Array): Promise<Map<string, () => Promise<string>>> {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  // End of central directory record: scan backwards for its signature.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('not-zip');
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const files = new Map<string, () => Promise<string>>();
  const dec = new TextDecoder();
  for (let n = 0; n < count; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) throw new Error('bad-zip');
    const method = view.getUint16(p + 10, true);
    const compSize = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const localOffset = view.getUint32(p + 42, true);
    const name = dec.decode(buf.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    files.set(name, async () => {
      const lnameLen = view.getUint16(localOffset + 26, true);
      const lextraLen = view.getUint16(localOffset + 28, true);
      const start = localOffset + 30 + lnameLen + lextraLen;
      const raw = buf.subarray(start, start + compSize);
      const bytes = method === 0 ? raw : await inflateRaw(raw);
      return dec.decode(bytes);
    });
  }
  return files;
}

function colIndex(ref: string): number {
  const letters = ref.replace(/[0-9]/g, '');
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

async function readXlsx(buf: Uint8Array): Promise<Sheet[]> {
  const files = await unzip(buf);
  const xml = async (path: string) => {
    const f = files.get(path);
    return f ? new DOMParser().parseFromString(await f(), 'application/xml') : null;
  };
  const byTag = (d: Document | Element, tag: string) => Array.from(d.getElementsByTagNameNS('*', tag));

  const shared: string[] = [];
  const sst = await xml('xl/sharedStrings.xml');
  if (sst) for (const si of byTag(sst, 'si')) shared.push(byTag(si, 't').map(t => t.textContent || '').join(''));

  const wb = await xml('xl/workbook.xml');
  const rels = await xml('xl/_rels/workbook.xml.rels');
  if (!wb) throw new Error('not-xlsx');
  const relTarget = new Map<string, string>();
  if (rels) for (const r of byTag(rels, 'Relationship')) relTarget.set(r.getAttribute('Id') || '', r.getAttribute('Target') || '');

  const sheets: Sheet[] = [];
  for (const s of byTag(wb, 'sheet')) {
    const rid = s.getAttribute('r:id') || s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') || '';
    let target = relTarget.get(rid) || '';
    target = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
    const doc = await xml(target);
    if (!doc) continue;
    const rows: string[][] = [];
    for (const r of byTag(doc, 'row')) {
      const rowIdx = Number(r.getAttribute('r') || rows.length + 1) - 1;
      const out: string[] = [];
      for (const c of byTag(r, 'c')) {
        const type = c.getAttribute('t');
        const ref = c.getAttribute('r');
        const idx = ref ? colIndex(ref) : out.length;
        let value = '';
        if (type === 'inlineStr') value = byTag(c, 't').map(t => t.textContent || '').join('');
        else {
          const v = byTag(c, 'v')[0]?.textContent ?? '';
          value = type === 's' ? shared[Number(v)] ?? '' : v;
        }
        out[idx] = value.trim();
      }
      rows[rowIdx] = Array.from(out, v => v ?? '');
    }
    sheets.push({ name: s.getAttribute('name') || `Sheet${sheets.length + 1}`, rows: Array.from(rows, r => r ?? []) });
  }
  return sheets;
}
