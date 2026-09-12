import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const rc3 = fs.readFileSync('rc3-fixes.js', 'utf8');
const start = rc3.indexOf('function rc3Digits(');
const end = rc3.indexOf('function rc3FormatPhone(', start);
assert.ok(start >= 0 && end > start);
const runtime = JSON.parse(fs.readFileSync('data/phone-order-runtime.json', 'utf8'));
const context = vm.createContext({rc3InternalPhoneByStore: new Map(runtime.stores.map(row => [row.store_id,row]))});
vm.runInContext(rc3.slice(start, end), context);
const phone = store => { context.store = store; return vm.runInContext('rc3VerifiedPhone(store)', context); };

// Reviewed official branch listing, same store and current road address.
// The UI's static index must agree with the approved private API phone patch.
const id = '4289ad6217815b70';
assert.equal(phone({id, phone:'01096800539', __secureDetailReady:true}), '01096800539');
assert.equal(phone({id, phone:''}), '01096800539');
assert.equal(phone({id, phone:'050362274998'}), '01096800539');
// API loading alone must not downgrade existing Mukkebi/Ddangyo priority.
context.rc3InternalPhoneByStore.set('existing-priority', {phone:'0611234567'});
assert.equal(phone({id:'existing-priority',phone:'050712345678',__secureDetailReady:true}), '0611234567');
assert.equal(phone({id:'existing-priority',phone:'01012345678',__secureDetailReady:true}), '0611234567');
assert.equal(phone({id:'unmapped',phone:'07012345678',__secureDetailReady:true}), '07012345678');
assert.equal(phone({id:'unmapped',phone:'01312345678',__secureDetailReady:true}), '');
assert.equal(phone({id:'unmapped',phone:'',__secureDetailReady:true}), '');
assert.equal(phone({id:'unmapped',phone:'050712345678',__secureDetailReady:true}), '050712345678');
assert.match(rc3, /phone-order-runtime\.json\?v=[^'"\n]*current-contact-phone-1/);
assert.match(rc3, /phone, url:/);
assert.match(fs.readFileSync('final-experience.js','utf8'), /rc3-fixes\.js\?v=[^'"\n]*current-contact-phone-1/);
assert.match(fs.readFileSync('index.html','utf8'), /final-experience\.js\?v=[^'"\n]*current-contact-phone-1/);
console.log('Current reviewed phone index and established source priority: PASS');
