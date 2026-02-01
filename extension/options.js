const ST = window.BetterStar && window.BetterStar.storage;

// --- Settings Logic ---

async function loadSettings() {
  const pat = await ST.getPAT();
  const gistId = await ST.getGistId();
  const syncEnabled = await ST.getSyncEnabled();
  document.getElementById('pat').value = pat || '';
  document.getElementById('gistId').value = gistId || '';
  document.getElementById('syncEnabled').checked = !!syncEnabled;
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

async function onExport() {
  const status = document.getElementById('ioStatus');
  status.textContent = 'Exporting...';
  chrome.runtime.sendMessage({ type: 'export_data' }, (res) => {
    if (res && res.ok) {
      document.getElementById('io').value = JSON.stringify(res.map, null, 2);
      status.textContent = 'Exported';
    } else {
      status.textContent = 'Failed';
    }
  });
}

async function onImport() {
  const status = document.getElementById('ioStatus');
  const txt = document.getElementById('io').value;
  let map = null;
  try { map = JSON.parse(txt || '{}'); } catch (_) {}
  if (!map) { status.textContent = 'Invalid JSON'; return; }
  status.textContent = 'Importing...';
  chrome.runtime.sendMessage({ type: 'import_data', map }, (res) => {
    status.textContent = res && res.ok ? 'Imported' : 'Failed';
    if (res && res.ok) {
        // Reload list after import
        initList(); 
    }
  });
}

document.getElementById('testSave').addEventListener('click', onTestSave);
document.getElementById('initGist').addEventListener('click', onInitGist);
document.getElementById('syncEnabled').addEventListener('change', onSyncEnabledChange);
document.getElementById('export').addEventListener('click', onExport);
document.getElementById('import').addEventListener('click', onImport);

// --- List Logic (Migrated from popup.js) ---

let allEntries = [];
let activeTag = '';
let q = '';

function renderTags(tags) {
  const wrap = document.getElementById('tags');
  if (!wrap) return;
  wrap.innerHTML = '';
  const allChip = document.createElement('span');
  allChip.className = 'chip' + (activeTag ? '' : ' active');
  allChip.textContent = 'All';
  allChip.addEventListener('click', () => {
    activeTag = '';
    render();
  });
  wrap.appendChild(allChip);
  tags.forEach((t) => {
    const chip = document.createElement('span');
    chip.className = 'chip' + (activeTag === t ? ' active' : '');
    chip.textContent = t;
    chip.addEventListener('click', () => {
      activeTag = activeTag === t ? '' : t;
      render();
    });
    wrap.appendChild(chip);
  });
}

function renderList(entries) {
  const list = document.getElementById('list');
  if (!list) return;
  list.innerHTML = '';

  if (entries.length === 0) {
    list.innerHTML = `<div class="empty-state">No repositories found.</div>`;
    return;
  }

  entries.forEach((e) => {
    const item = document.createElement('div');
    item.className = 'item';
    const meta = document.createElement('div');
    meta.className = 'meta';
    
    const title = document.createElement('a');
    title.className = 'repo-link';
    title.href = e.url;
    title.target = '_blank';
    title.textContent = e.full_name;
    title.title = e.full_name; // tooltip

    const tagsRow = document.createElement('div');
    tagsRow.className = 'tags-row';
    (e.tags || []).forEach((t) => {
      const chip = document.createElement('span');
      chip.className = 'tag-badge';
      chip.textContent = t;
      chip.title = t;
      
      const closeBtn = document.createElement('span');
      closeBtn.className = 'tag-remove';
      closeBtn.innerHTML = '&times;';
      closeBtn.title = 'Remove tag';
      closeBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        createPopover({
          target: closeBtn,
          type: 'confirm',
          title: 'Remove Tag?',
          message: `Remove tag "${t}" from this repository?`,
          confirmLabel: 'Remove',
          isDanger: true,
          onConfirm: () => {
            const newTags = (e.tags || []).filter(x => x !== t);
            updateRepoTags(e, newTags);
          }
        });
      });
      
      chip.appendChild(closeBtn);
      tagsRow.appendChild(chip);
    });

    // Add + button
    const addBtn = document.createElement('button');
    addBtn.className = 'tag-add-btn';
    addBtn.innerHTML = '+';
    addBtn.title = 'Add tags';
    addBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const allTags = getAllTags();
        createPopover({
            target: addBtn,
            type: 'tag-selector',
            title: 'Add Tags',
            allTags: allTags,
            currentTags: e.tags || [],
            onConfirm: (newTags) => {
                updateRepoTags(e, newTags);
            }
        });
    });
    tagsRow.appendChild(addBtn);

    meta.appendChild(title);
    meta.appendChild(tagsRow);
    
    const actions = document.createElement('div');
    actions.className = 'actions';
    
    const del = document.createElement('button');
    del.className = 'action-btn delete';
    del.title = 'Unstar & Remove';
    del.innerHTML = `
      <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" class="octicon octicon-trash">
          <path d="M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75ZM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.75 1.75 0 0 1 10.595 15h-5.19a1.75 1.75 0 0 1-1.741-1.575l-.66-6.6a.75.75 0 1 1 1.492-.15ZM6.5 1.75V3h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Z"></path>
      </svg>
    `;

    actions.appendChild(del);
    item.appendChild(meta);
    item.appendChild(actions);
    list.appendChild(item);
    
    del.addEventListener('click', (ev) => {
      ev.stopPropagation();
      createPopover({
        target: del,
        type: 'confirm',
        title: 'Unstar & Remove?',
        message: `Are you sure you want to unstar and remove ${e.full_name}?`,
        confirmLabel: 'Unstar',
        isDanger: true,
        onConfirm: () => {
          const [owner, repo] = e.full_name.split('/');
          chrome.runtime.sendMessage({ type: 'unstar_and_remove', owner, repo }, (res) => {
            if (res && res.ok) {
              allEntries = allEntries.filter((x) => x.full_name !== e.full_name);
              render();
            } else {
              alert('Remove failed');
            }
          });
        }
      });
    });
  });
}

function updateRepoTags(entry, newTags) {
    const [owner, repo] = entry.full_name.split('/');
    chrome.runtime.sendMessage({ type: 'update_tags', owner, repo, tags: newTags }, (res) => {
        if (res && res.ok) {
            entry.tags = newTags;
            render();
        } else {
            alert('Update failed');
        }
    });
}

function getAllTags() {
    const tagsSet = new Set();
    allEntries.forEach((e) => (e.tags || []).forEach((t) => tagsSet.add(t)));
    return Array.from(tagsSet).sort();
}

let activePopover = null;

function createPopover({ target, type, title, message, initialValue, allTags, currentTags, confirmLabel = 'Save', isDanger = false, onConfirm }) {
  if (activePopover) {
    activePopover.remove();
    activePopover = null;
  }

  const popover = document.createElement('div');
  popover.className = 'bs-popover';
  
  const titleEl = document.createElement('div');
  titleEl.className = 'bs-popover-title';
  titleEl.textContent = title;
  popover.appendChild(titleEl);

  let input = null;
  let listContainer = null;
  let selectedTags = new Set(currentTags || []);

  if (type === 'edit') {
    input = document.createElement('input');
    input.className = 'bs-popover-input';
    input.value = initialValue || '';
    input.placeholder = 'Tags (comma separated)';
    popover.appendChild(input);
  } else if (type === 'tag-selector') {
    input = document.createElement('input');
    input.className = 'bs-popover-input';
    input.placeholder = 'Search or create tag...';
    popover.appendChild(input);

    listContainer = document.createElement('div');
    listContainer.className = 'bs-popover-list';
    popover.appendChild(listContainer);

    const renderTagList = (filter = '') => {
        listContainer.innerHTML = '';
        const filterLower = filter.toLowerCase();
        const matches = (allTags || []).filter(t => t.toLowerCase().includes(filterLower));
        const exactMatch = matches.some(t => t.toLowerCase() === filterLower);
        
        matches.forEach(tag => {
            const item = document.createElement('label');
            item.className = 'bs-popover-list-item';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = selectedTags.has(tag);
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) selectedTags.add(tag);
                else selectedTags.delete(tag);
            });
            item.appendChild(checkbox);
            item.appendChild(document.createTextNode(tag));
            listContainer.appendChild(item);
        });

        if (filter && !exactMatch) {
             const item = document.createElement('label');
             item.className = 'bs-popover-list-item';
             item.style.color = '#0969da';
             const checkbox = document.createElement('input');
             checkbox.type = 'checkbox';
             checkbox.checked = selectedTags.has(filter);
             checkbox.addEventListener('change', () => {
                if (checkbox.checked) selectedTags.add(filter);
                else selectedTags.delete(filter);
             });
             item.appendChild(checkbox);
             item.appendChild(document.createTextNode(`Create "${filter}"`));
             listContainer.appendChild(item);
        }
        
        if (matches.length === 0 && !filter) {
            const empty = document.createElement('div');
            empty.style.padding = '8px';
            empty.style.color = '#57606a';
            empty.style.textAlign = 'center';
            empty.textContent = 'No tags found';
            listContainer.appendChild(empty);
        }

        if (popover.classList.contains('bs-popover-top')) {
             const rect = target.getBoundingClientRect();
             const popRect = popover.getBoundingClientRect();
             const newTop = rect.top - popRect.height - 8 + window.scrollY;
             popover.style.top = `${newTop}px`;
        }
    };

    renderTagList();
    input.addEventListener('input', () => {
        renderTagList(input.value.trim());
    });

  } else if (message) {
    const msgEl = document.createElement('div');
    msgEl.textContent = message;
    popover.appendChild(msgEl);
  }

  const actions = document.createElement('div');
  actions.className = 'bs-popover-actions';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'bs-btn';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => {
    popover.remove();
    activePopover = null;
  });

  const confirmBtn = document.createElement('button');
  confirmBtn.className = `bs-btn ${isDanger ? 'bs-btn-danger' : 'bs-btn-primary'}`;
  confirmBtn.textContent = confirmLabel;
  confirmBtn.addEventListener('click', () => {
    if (onConfirm) {
      if (type === 'tag-selector') {
          onConfirm(Array.from(selectedTags));
      } else {
          onConfirm(input ? input.value : undefined);
      }
    }
    popover.remove();
    activePopover = null;
  });

  actions.appendChild(cancelBtn);
  actions.appendChild(confirmBtn);
  popover.appendChild(actions);

  document.body.appendChild(popover);
  activePopover = popover;
  
  popover.style.visibility = 'hidden';

  const rect = target.getBoundingClientRect();
  const popRect = popover.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const spaceBelow = viewportHeight - rect.bottom;
  const spaceAbove = rect.top;

  let top, left;
  let isTopPosition = false;

  if (spaceBelow < popRect.height + 20 && spaceAbove > popRect.height + 20) {
      top = rect.top - popRect.height - 8 + window.scrollY;
      isTopPosition = true;
      popover.classList.add('bs-popover-top');
  } else {
      top = rect.bottom + 8 + window.scrollY;
  }

  left = rect.right - popRect.width + window.scrollX + 10;
  if (left < 10) left = 10;
  if (left + popRect.width > window.innerWidth - 10) {
      left = window.innerWidth - popRect.width - 10;
  }

  if (!isTopPosition && (top - window.scrollY + popRect.height > viewportHeight)) {
      const availableHeight = viewportHeight - (top - window.scrollY) - 20;
      popover.style.maxHeight = `${Math.max(100, availableHeight)}px`;
  }
  
  popover.style.top = `${top}px`;
  popover.style.left = `${left}px`;
  popover.style.visibility = 'visible';

  if (input) {
    input.focus();
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            confirmBtn.click();
        }
    });
  }

  setTimeout(() => {
    const closeHandler = (e) => {
      if (activePopover && !activePopover.contains(e.target) && !target.contains(e.target)) {
        activePopover.remove();
        activePopover = null;
        document.removeEventListener('click', closeHandler);
      }
    };
    document.addEventListener('click', closeHandler);
  }, 0);
}


function render() {
  const tagsSet = new Set();
  allEntries.forEach((e) => (e.tags || []).forEach((t) => tagsSet.add(t)));
  renderTags(Array.from(tagsSet).sort());
  const entries = allEntries.filter((e) => {
    const hitTag = activeTag ? (e.tags || []).includes(activeTag) : true;
    const hitQ = q
      ? (e.full_name || '').toLowerCase().includes(q) ||
        (e.tags || []).some((t) => t.toLowerCase().includes(q))
      : true;
    return hitTag && hitQ;
  });
  renderList(entries);
}

function initList() {
  const list = document.getElementById('list');
  if (!list) return;
  list.innerHTML = `<div class="loading-state"><span class="loading-spinner"></span>Loading...</div>`;

  chrome.runtime.sendMessage({ type: 'get_entries_by_shards', shards: 'all' }, (res) => {
    allEntries = (res && res.entries) || [];
    render();
  });
  const input = document.getElementById('search');
  if (input) {
      input.addEventListener('input', () => {
        q = input.value.trim().toLowerCase();
        render();
      });
  }
}

// Initial load
loadSettings();
initList();
