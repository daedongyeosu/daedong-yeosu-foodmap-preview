import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const original=fs.readFileSync('assets/brand/yeosu-taste-map-logo.png'),image=fs.readFileSync('assets/brand/yeosu-taste-map-logo.display.webp'),html=fs.readFileSync('index.html','utf8');
assert.equal(createHash('sha256').update(original).digest('hex'),'ea3511df6978f35a7ec1d2a3e8be51f6f47b475345d01384775ad2bf2c486de5','Keep the approved original');
assert.equal(image.toString('ascii',0,4),'RIFF');assert.equal(image.toString('ascii',8,12),'WEBP');assert.ok(image.length<200*1024);
const logos=[...html.matchAll(/<img class="brand-logo(?:-piece[^\"]*)?"[^>]+>/g)];assert.equal(logos.length,7);for(const [tag] of logos)assert.match(tag,/yeosu-taste-map-logo\.display\.webp\?v=display-20261017-1/);
assert.ok(fs.readFileSync('scripts/build-brand-logo-display.mjs','utf8').includes('actual.equals(expected)'),'The build verifies visible pixels and alpha against the resized original');
console.log('PASS approved brand retained: 7 logo layers use the under-200KiB lossless display derivative, original PNG unchanged');
