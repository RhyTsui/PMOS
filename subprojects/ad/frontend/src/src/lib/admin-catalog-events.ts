export const ADMIN_CATALOG_CHANGE_EVENT = 'xiaoqiao-admin-catalog-changed';
export const ADMIN_CATALOG_CHANGE_STORAGE_KEY = 'xiaoqiao-admin-catalog-changed-at';

export function broadcastAdminCatalogChange(source: string): void {
  if (typeof window === 'undefined') return;
  const payload = {
    source,
    at: Date.now(),
  };
  try {
    window.localStorage.setItem(ADMIN_CATALOG_CHANGE_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures; same-tab custom event still works.
  }
  window.dispatchEvent(new CustomEvent(ADMIN_CATALOG_CHANGE_EVENT, {
    detail: payload,
  }));
}
