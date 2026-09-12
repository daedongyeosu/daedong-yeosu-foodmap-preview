import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const rc3 = fs.readFileSync('rc3-fixes.js', 'utf8');
const start = rc3.indexOf('function rc3Digits(');
const end = rc3.indexOf('function rc3FormatPhone(', start);
assert.ok(start >= 0 && end > start);
const context = vm.createContext({rc3InternalPhoneByStore: new Map()});
vm.runInContext(rc3.slice(start, end), context);
const phone = store => { context.store = store; return vm.runInContext('rc3VerifiedPhone(store)', context); };

// The archived phone index must not hide a newer, identity-verified API number.
context.rc3InternalPhoneByStore.set('same-store', {phone: '0503-1234-5678'});
assert.equal(phone({id: 'same-store', phone: '010-1234-5678', __secureDetailReady: true}), '01012345678');
assert.equal(phone({id: 'same-store', phone: '061-123-4567', __secureDetailReady: true}), '0611234567');
assert.equal(phone({id: 'same-store', phone: '070-1234-5678', __secureDetailReady: true}), '07012345678');
// Before verified detail hydration, preserve the established source priority.
assert.equal(phone({id: 'same-store', phone: '061-123-4567'}), '050312345678');
assert.equal(phone({id: 'same-store', phone: '', __secureDetailReady: true}), '050312345678');
assert.equal(phone({id: 'unmapped', phone: '061-123-4567', __secureDetailReady: true}), '0611234567');
assert.equal(phone({id: 'unmapped', phone: '01312345678', __secureDetailReady: true}), '');
assert.equal(phone({id: 'same-store', phone: '01312345678', __secureDetailReady: true}), '');
assert.equal(phone({id: 'unmapped', phone: '', __secureDetailReady: true}), '');
// Existing verified relay routes are not removed by this precedence correction.
assert.equal(phone({id: 'unmapped', phone: '0507-1234-5678', __secureDetailReady: true}), '050712345678');
assert.match(rc3, /phone, url: `tel:\$\{phone\}`/);
assert.match(fs.readFileSync('final-experience.js', 'utf8'), /rc3-fixes\.js\?v=[^'"\n]*current-contact-phone-1/);
assert.match(fs.readFileSync('index.html', 'utf8'), /final-experience\.js\?v=[^'"\n]*current-contact-phone-1/);
console.log('Current verified contact phone precedence: PASS');
