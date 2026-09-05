import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const ui = fs.readFileSync('store-menu-preview.js', 'utf8');
const search = fs.readFileSync('store-service-info.js', 'utf8');
const css = fs.readFileSync('store-menu-preview.css', 'utf8');
assert(html.indexOf('menu-family-model.js') < html.indexOf('store-service-info.js'));
assert(html.indexOf('menu-family-model.js') < html.indexOf('store-menu-preview.js?v='));
assert.match(ui, /daedongMenuFamilies\.project\(menu/);
assert.match(search, /daedongMenuFamilies\.groupSearchRows\(matches\)/);
assert.match(ui, /__variants: \(item\.__variants \|\| \[\]\)\.map\(publicMenuItem\)/, 'variant photos use existing quarantine and price guards');
assert.match(ui, /function menuVariantsMarkup/);
assert.match(ui, /data-menu-variants/);
assert.match(ui, /event\.target\.closest\('\[data-menu-variants\]'\)\) return/);
assert.match(ui, /__sourceIds \|\| \[item\.id\]/, 'old search IDs still resolve to a family card');
assert.match(ui, /item\.__searchText \|\| ''/, 'original wording remains searchable');
assert.doesNotMatch(ui, /__compact|__foldExtras|__extraCount|menuExtrasExpanded|extrasExpanded|data-menu-extras-toggle/,
  'drinks, alcohol and options stay in the complete menu without a hidden extras state or toggle');
const orderedMenuBody = ui.match(/function orderedMenu\(menu\) \{([\s\S]*?)\n  \}/)?.[1] || '';
assert.match(orderedMenuBody, /priority: menuDisplayPriority\(item\)/,
  'every menu uses the existing category display priority, without a separate extras priority');
assert.match(orderedMenuBody, /\.sort\(\(a, b\) => a\.priority - b\.priority \|\| a\.index - b\.index\)/,
  'menu ordering remains stable within the original category priority');
assert.match(ui, /openMenuOrderSheet\(card, requestedMenuId\)/, 'search preserves the exact original variant');
assert.match(ui, /selectedVariantId: orderSheet/, 'return state preserves the exact original variant');
assert.match(ui, /const item = variant \|\| family/, 'variant photo is not replaced with another quantity photo');
assert.match(ui, /Object\.entries\(variant\)/, 'future structured options are not silently deduplicated');
assert.doesNotMatch(ui + css, /is-compact-extra|store-menu-extras-toggle/,
  'drink and alcohol cards use the same full-size layout as food cards');
const variantsMarkup = ui.match(/function menuVariantsMarkup\(item\) \{([\s\S]*?)\n  \}/)?.[1] || '';
assert.match(variantsMarkup, /<img[^>]*width="720" height="546"[^>]*loading="lazy"/,
  'expanded original variant photos retain full-size dimensions and lazy loading');
const variantPhotoRule = css.match(/\.store-menu-variants li img\s*\{([^}]+)\}/)?.[1] || '';
assert.match(variantPhotoRule, /width:\s*100%\s*;/, 'expanded variant photos fill the available card width');
assert.match(variantPhotoRule, /height:\s*auto\s*;/, 'expanded variant photos preserve their original aspect ratio');
assert.match(css, /@media \(max-width: 560px\)\s*\{\s*\.store-menu-grid\s*\{\s*grid-template-columns:\s*1fr\s*;/,
  'all menu kinds retain the full-width mobile card grid');
assert.match(html, /store-menu-preview\.js\?v=[^"\n]*family-cards-1/);
assert.match(html, /store-menu-preview\.js\?v=[^"\n]*all-menus-original-photos-1/);
assert.match(html, /store-menu-preview\.css\?v=[^"\n]*all-menus-original-photos-1/);
assert.match(html, /store-service-info\.js\?v=[^"\n]*family-cards-1/);
console.log('PASS menu family UI contracts (shared grouping, all variants, search, all menu kinds visible, full-size photos, cached assets)');
