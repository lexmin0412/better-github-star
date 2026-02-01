self.importScripts('lib/shard.js', 'lib/storage.js', 'lib/github.js');

const S = self.BetterStar.shard;
const ST = self.BetterStar.storage;
const GH = self.BetterStar.github;

const META_FILE = 'meta-tags.json';
const LOCAL_PREFIX = 'better_star_file_';

async function readLocalFile(name) {
  const key = LOCAL_PREFIX + name;
  const obj = await chrome.storage.local.get([key]);
  return obj[key] || '';
}
async function writeLocalFile(name, content) {
  const key = LOCAL_PREFIX + name;
  await chrome.storage.local.set({ [key]: content });
}

async function readFile(name) {
  const sync = await ST.getSyncEnabled();
  if (!sync) return readLocalFile(name);
  const pat = await ST.getPAT();
  const gistId = await ST.getGistId();
  if (!pat || !gistId) return '';
  return await GH.readGistFileContent(pat, gistId, name) || '';
}

async function writeFile(name, content) {
  const sync = await ST.getSyncEnabled();
  if (!sync) {
    await writeLocalFile(name, content);
    return;
  }
  const pat = await ST.getPAT();
  const gistId = await ST.getGistId();
  if (!pat || !gistId) {
    await writeLocalFile(name, content);
    return;
  }
  const files = {};
  files[name] = { content };
  await GH.patchGistFiles(pat, gistId, files);
  await writeLocalFile(name, content);
}

async function ensureMeta() {
  let txt = await readFile(META_FILE);
  if (!txt) {
    const meta = { version: 1, tags: [], preferences: { othersFile: S.OTHERS_FILE } };
    txt = JSON.stringify(meta);
    await writeFile(META_FILE, txt);
  }
  return JSON.parse(txt);
}

async function listTags() {
  const meta = await ensureMeta();
  return Array.from(new Set(meta.tags || [])).sort();
}

async function addTags(newTags) {
  const meta = await ensureMeta();
  const set = new Set([...(meta.tags || []), ...(newTags || [])].map((t) => String(t || '').trim()).filter(Boolean));
  meta.tags = Array.from(set).sort();
  await writeFile(META_FILE, JSON.stringify(meta));
  return meta.tags;
}

function parseShardJson(txt) {
  if (!txt) return S.emptyShard();
  try {
    const obj = JSON.parse(txt);
    return obj && obj.entries ? obj : S.emptyShard();
  } catch (_) {
    return S.emptyShard();
  }
}

async function loadShardByRepo(repo) {
  const file = S.fileNameForRepo(repo);
  const txt = await readFile(file);
  return { file, data: parseShardJson(txt) };
}

async function saveShard(file, data) {
  await writeFile(file, JSON.stringify(data));
}

async function starWithTags(owner, repo, tags) {
  const pat = await ST.getPAT();
  if (!pat) throw new Error('no_pat');
  await GH.starRepo(owner, repo, pat);
  const fullName = `${owner}/${repo}`;
  const url = `https://github.com/${fullName}`;
  const { file, data } = await loadShardByRepo(repo);
  const entry = { full_name: fullName, url, tags: (tags || []).map((t) => String(t).trim()).filter(Boolean), starredAt: Date.now() };
  const updated = S.upsertEntry(data, entry);
  await saveShard(file, updated);
  await addTags(entry.tags);
  return { ok: true, file };
}

async function unstarAndRemove(owner, repo) {
  const pat = await ST.getPAT();
  if (pat) await GH.unstarRepo(owner, repo, pat);
  const fullName = `${owner}/${repo}`;
  const { file, data } = await loadShardByRepo(repo);
  const updated = S.removeEntry(data, fullName);
  await saveShard(file, updated);
  return { ok: true, file };
}

async function updateTags(owner, repo, tags) {
  const { file, data } = await loadShardByRepo(repo);
  const fullName = `${owner}/${repo}`;
  const entry = { full_name: fullName, tags: (tags || []).map((t) => String(t).trim()).filter(Boolean) };
  const updated = S.upsertEntry(data, entry);
  await saveShard(file, updated);
  await addTags(entry.tags);
  return { ok: true, file };
}

async function getEntries(shards) {
  const files = [];
  if (shards === 'all') {
    for (const c of S.SHARDS) files.push(`better-star-${c}.json`);
    files.push(S.OTHERS_FILE);
  } else if (Array.isArray(shards)) {
    for (const s of shards) files.push(S.fileNameForShard(s));
  }
  const entries = [];
  for (const f of files) {
    const txt = await readFile(f);
    const data = parseShardJson(txt);
    for (const e of data.entries) entries.push(e);
  }
  return entries;
}

async function initGist(description) {
  const pat = await ST.getPAT();
  if (!pat) throw new Error('no_pat');
  const files = {};
  files[META_FILE] = { content: JSON.stringify({ version: 1, tags: [], preferences: { othersFile: S.OTHERS_FILE } }) };
  const id = await GH.createPrivateGist(pat, description || 'better-star data', files);
  await ST.setGistId(id);
  await ST.setSyncEnabled(true);
  return { ok: true, gistId: id };
}

async function exportData() {
  const obj = {};
  for (const c of S.SHARDS) {
    const f = `better-star-${c}.json`;
    obj[f] = await readFile(f);
  }
  obj[S.OTHERS_FILE] = await readFile(S.OTHERS_FILE);
  obj[META_FILE] = await readFile(META_FILE);
  return obj;
}

async function importData(map) {
  if (!map || typeof map !== 'object') return { ok: false };
  const keys = Object.keys(map);
  for (const k of keys) {
    const v = map[k];
    if (typeof v === 'string') await writeFile(k, v);
  }
  return { ok: true };
}

async function getRepoTags(owner, repo) {
  const { data } = await loadShardByRepo(repo);
  const fullName = `${owner}/${repo}`;
  const entry = (data.entries || []).find((e) => e.full_name === fullName);
  return (entry && entry.tags) || [];
}

async function createList(name) {
  await addTags([name]);
  return { ok: true };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg.type === 'star_with_tags') {
        const r = await starWithTags(msg.owner, msg.repo, msg.tags);
        sendResponse(r);
      } else if (msg.type === 'unstar_and_remove') {
        const r = await unstarAndRemove(msg.owner, msg.repo);
        sendResponse(r);
      } else if (msg.type === 'update_tags') {
        const r = await updateTags(msg.owner, msg.repo, msg.tags);
        sendResponse(r);
      } else if (msg.type === 'get_repo_tags') {
        const r = await getRepoTags(msg.owner, msg.repo);
        sendResponse({ ok: true, tags: r });
      } else if (msg.type === 'create_list') {
        const r = await createList(msg.name);
        sendResponse(r);
      } else if (msg.type === 'open_options') {
        if (chrome.runtime.openOptionsPage) {
          chrome.runtime.openOptionsPage();
        } else {
          chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
        }
        sendResponse({ ok: true });
      } else if (msg.type === 'get_hide_native_star') {
        const { hideNativeStar } = await chrome.storage.local.get(['hideNativeStar']);
        sendResponse({ hideNativeStar: hideNativeStar !== false });
      } else if (msg.type === 'get_entries_by_shards') {
        const r = await getEntries(msg.shards || 'all');
        sendResponse({ ok: true, entries: r });
      } else if (msg.type === 'list_tags') {
        const r = await listTags();
        sendResponse({ ok: true, tags: r });
      } else if (msg.type === 'init_gist') {
        const r = await initGist(msg.description || 'better-star data');
        sendResponse(r);
      } else if (msg.type === 'export_data') {
        const r = await exportData();
        sendResponse({ ok: true, map: r });
      } else if (msg.type === 'import_data') {
        const r = await importData(msg.map);
        sendResponse(r);
      } else if (msg.type === 'test_pat') {
        const ok = await GH.testPAT(msg.pat);
        sendResponse({ ok });
      } else {
        sendResponse({ ok: false, error: 'unknown' });
      }
    } catch (e) {
      sendResponse({ ok: false, error: String(e && e.message ? e.message : e) });
    }
  })();
  return true;
});
