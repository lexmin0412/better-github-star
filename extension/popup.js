const ST = window.BetterStar && window.BetterStar.storage;

async function load() {
  const pat = await ST.getPAT();
  const gistId = await ST.getGistId();
  const syncEnabled = await ST.getSyncEnabled();
  
  // Load hideNativeStar setting
  const { hideNativeStar } = await chrome.storage.local.get(['hideNativeStar']);
  
  document.getElementById('pat').value = pat || '';
  document.getElementById('gistId').value = gistId || '';
  document.getElementById('syncEnabled').checked = !!syncEnabled;
  document.getElementById('hideNativeStar').checked = hideNativeStar !== false; // Default true
}

async function onTestSave() {
  const pat = document.getElementById('pat').value.trim();
  const status = document.getElementById('patStatus');
  status.textContent = 'Testing...';
  chrome.runtime.sendMessage({ type: 'test_pat', pat }, async (res) => {
    if (res && res.ok) {
      await ST.setPAT(pat);
      status.textContent = 'Saved';
    } else {
      status.textContent = 'Invalid PAT';
    }
  });
}

async function onInitGist() {
  const status = document.getElementById('gistStatus');
  status.textContent = 'Creating...';
  chrome.runtime.sendMessage({ type: 'init_gist' }, async (res) => {
    if (res && res.ok) {
      document.getElementById('gistId').value = res.gistId;
      document.getElementById('syncEnabled').checked = true;
      status.textContent = 'Bound';
    } else {
      status.textContent = 'Failed';
    }
  });
}

async function onSyncEnabledChange() {
  const enabled = document.getElementById('syncEnabled').checked;
  await ST.setSyncEnabled(enabled);
}

async function onHideNativeStarChange() {
  const enabled = document.getElementById('hideNativeStar').checked;
  await chrome.storage.local.set({ hideNativeStar: enabled });
}

document.getElementById('testSave').addEventListener('click', onTestSave);
document.getElementById('initGist').addEventListener('click', onInitGist);
document.getElementById('syncEnabled').addEventListener('change', onSyncEnabledChange);
document.getElementById('hideNativeStar').addEventListener('change', onHideNativeStarChange);

const btnOptions = document.getElementById('btn-options');
if (btnOptions) {
  btnOptions.addEventListener('click', () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options.html'));
    }
  });
}

load();
