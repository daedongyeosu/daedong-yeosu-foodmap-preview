import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const manifestPath = path.join(root, 'data', 'photo-manifest.json');
const brandPoolPath = path.join(root, 'data', 'brand-photo-pools.json');
const brandMappingPath = path.join(root, 'data', 'brand-app-mapping.json');
const brandSupplementPath = path.join(root, 'data', 'brand-app-missing-nine-supplement.json');
const happyOrderPath = path.join(root, 'data', 'happyorder-channel-research.json');
const suffix = '.mobile.webp';

async function loadSharp() {
  try {
    return (await import('sharp')).default;
  } catch (firstError) {
    const modules = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
    if (!modules) throw firstError;
    return (await import(pathToFileURL(path.join(modules, 'sharp', 'dist', 'index.mjs')).href)).default;
  }
}

function collectNamedValues(value, name, output = []) {
  if (Array.isArray(value)) value.forEach(item => collectNamedValues(item, name, output));
  else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (key === name && typeof item === 'string') output.push(item);
      collectNamedValues(item, name, output);
    }
  }
  return output;
}

function localPhotoPaths(manifest, brandPool, ...brandSources) {
  const storeValues = [];
  for (const entry of manifest.entries || []) {
    storeValues.push(entry.src, ...(entry.additionalSrcs || []), ...(entry.gallery || []));
  }
  storeValues.push(...Object.values(brandPool.assignments || {}));
  const iconValues = brandSources.flatMap(source => [
    ...collectNamedValues(source, 'icon'),
    ...collectNamedValues(source, 'brandSelectionImage')
  ]);
  iconValues.push(
    'images/momstouch.jpg', 'images/ajukeo.jpg', 'images/burgerking.png',
    'images/lotteria.jpg', 'images/mcdonalds.jpg', 'images/nobrandburger.png',
    'images/frankburger.png', 'images/gyedong.jpg', 'images/doozzim.jpg',
    'assets/ondongne.png', 'assets/mukkebi-v7.png', 'assets/ddangyo-v7.png'
  );
  const sources = new Map();
  for (const [values, width] of [[storeValues, 720], [iconValues, 256]]) {
    for (const input of values) {
      const value = String(input || '').trim();
      if (!value || /^(?:data:|https?:)/i.test(value) || !/\.(?:png|jpe?g|gif)$/i.test(value)) continue;
      sources.set(value, Math.min(sources.get(value) || width, width));
    }
  }
  return sources;
}

function derivativePath(source) {
  return source.replace(/\.(?:png|jpe?g|gif)$/i, suffix);
}

const sharp = await loadSharp();
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const brandPool = JSON.parse(await fs.readFile(brandPoolPath, 'utf8'));
const brandMapping = JSON.parse(await fs.readFile(brandMappingPath, 'utf8'));
const brandSupplement = JSON.parse(await fs.readFile(brandSupplementPath, 'utf8'));
const happyOrder = JSON.parse(await fs.readFile(happyOrderPath, 'utf8'));
const sources = localPhotoPaths(manifest, brandPool, brandMapping, brandSupplement, happyOrder);
let created = 0;
let reused = 0;
let sourceBytes = 0;
let outputBytes = 0;

for (const [relativeSource, maxWidth] of sources) {
  const source = path.join(root, relativeSource);
  const relativeOutput = derivativePath(relativeSource);
  const output = path.join(root, relativeOutput);
  const sourceStat = await fs.stat(source);
  sourceBytes += sourceStat.size;
  let outputStat = null;
  try { outputStat = await fs.stat(output); } catch {}
  if (outputStat && outputStat.mtimeMs >= sourceStat.mtimeMs) {
    reused += 1;
    outputBytes += outputStat.size;
    continue;
  }
  await sharp(source, {animated: false, failOn: 'none'})
    .rotate()
    .resize({width: maxWidth, height: maxWidth, fit: 'inside', withoutEnlargement: true})
    .webp({quality: 72, effort: 4, smartSubsample: true})
    .toFile(output);
  outputStat = await fs.stat(output);
  created += 1;
  outputBytes += outputStat.size;
}

const reduction = sourceBytes ? Math.round((1 - outputBytes / sourceBytes) * 1000) / 10 : 0;
console.log(JSON.stringify({sources: sources.size, created, reused, sourceBytes, outputBytes, reductionPercent: reduction}, null, 2));
