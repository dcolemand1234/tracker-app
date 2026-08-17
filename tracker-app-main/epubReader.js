import JSZip from 'jszip';
import * as FileSystem from 'expo-file-system';

// An EPUB is a ZIP with a defined structure:
//   META-INF/container.xml  -> points at the .opf package file
//   <name>.opf              -> manifest (all files) + spine (reading order)
//   *.xhtml                 -> the actual chapters
//
// So parsing is: unzip, find the OPF, resolve the spine into an ordered
// list of chapter files, then strip the XHTML down to readable text.
// All pure JS — no native module, nothing to rebuild for.

function stripTags(html) {
  let t = html;
  // Drop anything that isn't prose before touching the rest.
  t = t.replace(/<head[\s\S]*?<\/head>/gi, ' ');
  t = t.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  t = t.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  // Turn block-level tags into line breaks so paragraphs survive.
  t = t.replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, '\n\n');
  t = t.replace(/<br\s*\/?>/gi, '\n');
  t = t.replace(/<[^>]+>/g, '');
  // Common entities. Numeric ones handled generically after.
  t = t
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/&hellip;/gi, '…')
    .replace(/&rsquo;/gi, '’')
    .replace(/&lsquo;/gi, '‘')
    .replace(/&rdquo;/gi, '”')
    .replace(/&ldquo;/gi, '“');
  t = t.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
  // Collapse the whitespace the markup left behind.
  t = t.replace(/[ \t]+/g, ' ');
  t = t.replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

// Resolve a path referenced from inside the OPF, which is relative to
// the OPF's own directory rather than the archive root.
function resolvePath(baseDir, href) {
  if (!baseDir) return href;
  const joined = `${baseDir}/${href}`;
  const parts = [];
  joined.split('/').forEach((seg) => {
    if (!seg || seg === '.') return;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  });
  return parts.join('/');
}

export async function parseEpub(uri) {
  const b64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const zip = await JSZip.loadAsync(b64, { base64: true });

  // 1. container.xml tells us where the package file lives.
  const containerFile = zip.file('META-INF/container.xml');
  if (!containerFile) throw new Error('Not a valid EPUB (no container.xml).');
  const containerXml = await containerFile.async('string');
  const opfMatch = containerXml.match(/full-path="([^"]+)"/i);
  if (!opfMatch) throw new Error('Could not find the EPUB package file.');
  const opfPath = opfMatch[1];
  const opfDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/')) : '';

  const opfFile = zip.file(opfPath);
  if (!opfFile) throw new Error('EPUB package file is missing.');
  const opf = await opfFile.async('string');

  // 2. Manifest maps ids to file paths.
  const manifest = {};
  const itemRe = /<item\b[^>]*>/gi;
  let m;
  while ((m = itemRe.exec(opf))) {
    const tag = m[0];
    const id = (tag.match(/\bid="([^"]+)"/i) || [])[1];
    const href = (tag.match(/\bhref="([^"]+)"/i) || [])[1];
    const type = (tag.match(/\bmedia-type="([^"]+)"/i) || [])[1] || '';
    if (id && href) manifest[id] = { href, type };
  }

  // 3. Spine gives the reading order — this is why chapters come out in
  // the right sequence rather than alphabetically by filename.
  const spineIds = [];
  const spineSection = (opf.match(/<spine[\s\S]*?<\/spine>/i) || [''])[0];
  const refRe = /<itemref\b[^>]*idref="([^"]+)"[^>]*>/gi;
  while ((m = refRe.exec(spineSection))) spineIds.push(m[1]);

  const title = (opf.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i) || [])[1];

  // 4. Pull each chapter's text in spine order.
  const chapters = [];
  for (const id of spineIds) {
    const entry = manifest[id];
    if (!entry) continue;
    if (entry.type && !/xhtml|html/i.test(entry.type)) continue;
    const path = resolvePath(opfDir, entry.href.split('#')[0]);
    const file = zip.file(path);
    if (!file) continue;
    const html = await file.async('string');
    const text = stripTags(html);
    // Skip near-empty entries: covers and nav pages produce almost
    // nothing and would otherwise show up as blank pages.
    if (text.length > 40) chapters.push(text);
  }

  if (!chapters.length) throw new Error('No readable text found in this EPUB.');

  return {
    title: title ? stripTags(title) : null,
    text: chapters.join('\n\n'),
    chapterCount: chapters.length,
  };
}

