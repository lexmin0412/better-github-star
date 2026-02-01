/* global globalThis */
(function () {
  const OTHERS_FILE = 'better-star-others.json';
  const SHARDS = Array.from({ length: 26 }, (_, i) =>
    String.fromCharCode('A'.charCodeAt(0) + i)
  );

  function shardOf(repoName) {
    if (!repoName || typeof repoName !== 'string') return 'others';
    const first = repoName.trim()[0] || '';
    const upper = first.toUpperCase();
    return SHARDS.includes(upper) ? upper : 'others';
  }

  function fileNameForShard(shard) {
    if (shard === 'others') return OTHERS_FILE;
    const upper = String(shard || '').toUpperCase();
    if (!SHARDS.includes(upper)) return OTHERS_FILE;
    return `better-star-${upper}.json`;
  }

  function fileNameForRepo(repoName) {
    return fileNameForShard(shardOf(repoName));
  }

  function emptyShard() {
    return { version: 1, entries: [] };
  }

  function findEntryIndex(entries, full_name) {
    return entries.findIndex((e) => e && e.full_name === full_name);
  }

  function upsertEntry(shardJson, entry) {
    const data = shardJson && shardJson.entries ? shardJson : emptyShard();
    const idx = findEntryIndex(data.entries, entry.full_name);
    if (idx >= 0) {
      data.entries[idx] = { ...data.entries[idx], ...entry };
    } else {
      data.entries.push(entry);
    }
    return data;
  }

  function removeEntry(shardJson, full_name) {
    const data = shardJson && shardJson.entries ? shardJson : emptyShard();
    const idx = findEntryIndex(data.entries, full_name);
    if (idx >= 0) {
      data.entries.splice(idx, 1);
    }
    return data;
  }

  const api = {
    OTHERS_FILE,
    SHARDS,
    shardOf,
    fileNameForShard,
    fileNameForRepo,
    emptyShard,
    upsertEntry,
    removeEntry,
  };

  globalThis.BetterStar = globalThis.BetterStar || {};
  globalThis.BetterStar.shard = api;
})();
