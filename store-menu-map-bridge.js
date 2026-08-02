'use strict';

(() => {
  const generatedMenus = window.DAEDONG_DDANGYO_MENU_STORES || {};
  if (!Object.keys(generatedMenus).length) return;

  const originalFreeze = Object.freeze;
  const legacyMenuIds = [
    'a089d1d54720b48e',
    '2f4c3cfb0866c4a4',
    'dc638b23f8cf3c5b',
    '7bc7239e6b509c44'
  ];

  Object.freeze = function bridgeMenuStoreFreeze(value) {
    const isLegacyMenuStoreMap = value
      && typeof value === 'object'
      && legacyMenuIds.every(storeId => Object.prototype.hasOwnProperty.call(value, storeId));

    if (!isLegacyMenuStoreMap) return originalFreeze(value);

    Object.freeze = originalFreeze;
    return originalFreeze({
      ...generatedMenus,
      ...value
    });
  };
})();
