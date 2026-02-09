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

// --- Tabs & List Logic ---

const tabs = document.querySelectorAll('.tab-btn');
tabs.forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        const tabId = btn.dataset.tab;
        document.getElementById(`tab-${tabId}`).classList.add('active');
    });
});

async function loadTags() {
    const listEl = document.getElementById('tag-list');
    if (!listEl) return;
    listEl.innerHTML = '<div style="padding:16px; color:var(--color-fg-muted);">Loading...</div>';
    
    const tags = await new Promise(resolve => {
        chrome.runtime.sendMessage({ type: 'list_tags' }, res => resolve((res && res.tags) || []));
    });

    listEl.innerHTML = '';
    
    if (tags.length === 0) {
        listEl.innerHTML = '<div style="padding:16px; color:var(--color-fg-muted);">No tags found.</div>';
        return;
    }

    tags.forEach(tag => {
        const item = document.createElement('div');
        item.className = 'tag-item';
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = tag;
        
        item.appendChild(nameSpan);
        
        item.addEventListener('click', () => {
            const url = chrome.runtime.getURL(`options.html?tag=${encodeURIComponent(tag)}`);
            chrome.tabs.create({ url });
        });
        
        listEl.appendChild(item);
    });
}

loadTags();
load();
