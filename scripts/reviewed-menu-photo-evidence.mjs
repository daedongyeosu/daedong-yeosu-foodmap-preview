// Independent browser-test evidence, not a production photo resolver. An image
// is additional evidence only when the exact reviewed item still matches and
// the published file exists. Never accept an arbitrary local image by prefix.
export function reviewedMenuPhotoEvidence(storeId, item, inventory, assetExists) {
  const photo = inventory?.stores?.[storeId]?.items?.[item?.id];
  if (!photo || !/^[a-f0-9]{16}$/.test(storeId)) return '';
  const hash = value => {
    let result = 2166136261;
    for (const char of String(value || '').normalize('NFKC').trim()) result = Math.imul(result ^ char.codePointAt(0), 16777619);
    return (result >>> 0).toString(16);
  };
  if (photo.nameHash !== hash(item.name)) return '';
  if (photo.descriptionHash && photo.descriptionHash !== hash(item.description)) return '';
  if (item.image && item.image !== photo.source && item.image !== photo.image) return '';
  const image = String(photo.image || '');
  const sharedPhoto = inventory?.sharedAssets?.[image];
  const sharedStoreId = String(sharedPhoto?.sourceStoreId || '');
  const ownedByStore = image.startsWith(`assets/reviewed-menu-photos/${storeId}/`)
    || image.startsWith(`assets/campaigns/shared-store-menus/${storeId}/`);
  const sharedSource = sharedPhoto?.matchMethod === 'same-brand-exact-menu'
    && /^[a-f0-9]{16}$/.test(sharedStoreId)
    && image.startsWith(`assets/reviewed-menu-photos/${sharedStoreId}/`)
    && Object.values(inventory?.stores?.[sharedStoreId]?.items || {}).some(item => item.image === image);
  if (!ownedByStore && !sharedSource) return '';
  if (image.includes('..') || image.includes('\\') || !/\.(?:jpg|jpeg|png|webp)$/.test(image)) return '';
  return assetExists(image) ? image : '';
}
