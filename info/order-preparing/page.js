'use strict';
(() => {
  const storeId = new URLSearchParams(location.search).get('store') || '';
  if (/^[a-f0-9]{16}$/.test(storeId)) {
    document.getElementById('store-order-methods').href = '/?store=' + storeId;
  }
})();
