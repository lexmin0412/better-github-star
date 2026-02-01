/* global chrome, globalThis */
(function () {
  const KEYS = {
    pat: 'better_star_pat',
    gistId: 'better_star_gist_id',
    syncEnabled: 'better_star_sync_enabled',
    lastSyncAt: 'better_star_last_sync_at',
  };

  async function get(key, defaultValue = null) {
    const obj = await chrome.storage.local.get([key]);
    return obj[key] !== undefined ? obj[key] : defaultValue;
  }
  async function set(key, value) {
    await chrome.storage.local.set({ [key]: value });
    return value;
  }

  async function getPAT() {
    return get(KEYS.pat, '');
  }
  async function setPAT(pat) {
    return set(KEYS.pat, pat || '');
  }

  async function getGistId() {
    return get(KEYS.gistId, '');
  }
  async function setGistId(id) {
    return set(KEYS.gistId, id || '');
  }

  async function getSyncEnabled() {
    return !!(await get(KEYS.syncEnabled, false));
  }
  async function setSyncEnabled(enabled) {
    return set(KEYS.syncEnabled, !!enabled);
  }

  async function getLastSyncAt() {
    return get(KEYS.lastSyncAt, 0);
  }
  async function setLastSyncAt(ts) {
    return set(KEYS.lastSyncAt, ts || Date.now());
  }

  const api = {
    KEYS,
    getPAT,
    setPAT,
    getGistId,
    setGistId,
    getSyncEnabled,
    setSyncEnabled,
    getLastSyncAt,
    setLastSyncAt,
  };

  globalThis.BetterStar = globalThis.BetterStar || {};
  globalThis.BetterStar.storage = api;
})();
