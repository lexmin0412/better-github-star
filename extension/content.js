const API_URL = 'https://api.github.com';

console.log('%c Better Star Content Script Loaded ', 'background: #222; color: #bada55; font-size: 14px;', new Date().toLocaleString());

function getOwnerRepo() {
  const p = location.pathname.split('/').filter(Boolean);
  if (p.length >= 2) return { owner: p[0], repo: p[1] };
  return null;
}

function findStarButton() {
  console.log('Better Star: Looking for star button...');

  // 策略 0: 也是最稳的，在 pagehead-actions 里面找
  const actions = document.querySelector('.pagehead-actions');
  if (actions) {
      // 遍历里面的 button，看哪个像 Star
      const btns = actions.querySelectorAll('button');
      for (let b of btns) {
          // 检查 aria-label
          const label = b.getAttribute('aria-label') || '';
          if (label.includes('Star this repository') || label.includes('Unstar this repository')) {
              console.log('Better Star: Found by pagehead-actions aria-label');
              return b;
          }
          // 检查文本
          if (b.textContent.trim() === 'Star' || b.textContent.trim() === 'Unstar') {
              console.log('Better Star: Found by pagehead-actions text');
              return b;
          }
          // 检查图标
          if (b.querySelector('.octicon-star')) {
              console.log('Better Star: Found by pagehead-actions icon');
              return b;
          }
      }
  }

  // 策略 1: 全局 aria-label (原逻辑，放宽匹配)
  let btn = document.querySelector('button[aria-label^="Star this repository"]');
  if (!btn) btn = document.querySelector('button[aria-label^="Unstar this repository"]');
  if (btn) {
      console.log('Better Star: Found by aria-label');
      return btn;
  }
  
  // 策略 2: 查找带有 star 图标的按钮
  // 这是一个很强的特征
  const starIcon = document.querySelector('.octicon-star');
  if (starIcon) {
      const b = starIcon.closest('button');
      if (b) {
           console.log('Better Star: Found by octicon-star');
           return b;
      }
  }

  // 3. 兜底：查找包含 Star/Unstar 文本的按钮，且位于页面头部区域
  if (!btn) {
    const header = document.querySelector('#repository-container-header') || document.querySelector('.pagehead');
    if (header) {
      const candidates = header.querySelectorAll('button');
      btn = Array.from(candidates).find((b) => {
          const txt = b.textContent.trim();
          return txt === 'Star' || txt === 'Unstar';
      });
      if (btn) {
          console.log('Better Star: Found by header text');
          return btn;
      }
    }
  }
  
  console.log('Better Star: Star button search failed');
  return null;
}

function ensureCss() {
  const id = 'better-star-css';
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = chrome.runtime.getURL('ui/tag-panel.css');
  document.head.appendChild(link);
}

function createMyButtonGroup(baseBtn, owner, repo) {
  // 创建一个容器 div，模仿 GitHub 的按钮组样式
  const group = document.createElement('div');
  group.className = 'float-left btn-group react-user-list-group';
  group.style.marginLeft = '8px';
  group.style.display = 'flex';
  
  // 1. 创建左侧的主按钮：点击直接收藏（Star + 默认逻辑）
  const mainBtn = document.createElement('button');
  // 复用 GitHub 按钮的基本类名
  mainBtn.className = 'btn btn-sm';
  mainBtn.style.borderTopRightRadius = '0';
  mainBtn.style.borderBottomRightRadius = '0';
  mainBtn.style.marginRight = '-1px'; // 消除双边框
  mainBtn.style.display = 'inline-flex';
  mainBtn.style.alignItems = 'center';
  
  // Try to find the star count
  let starCount = '';
  let starCountNum = null; // Use null to indicate not parsed

  const getStarCount = () => {
      const counter = document.getElementById('repo-stars-counter-star') || 
                      document.getElementById('repo-stars-counter-unstar') ||
                      document.querySelector('.social-count.js-social-count');
      
      if (!counter) return '';
      
      // Try to get exact number from title attribute first
      const titleVal = counter.getAttribute('title');
      if (titleVal) {
          const num = parseInt(titleVal.replace(/,/g, ''), 10);
          if (!isNaN(num)) {
              starCountNum = num;
              return titleVal; 
          }
      }
      
      // Fallback to text content
      const txt = counter.textContent.trim();
      const cleanTxt = txt.replace(/,/g, '').toLowerCase();
      
      if (/^\d+$/.test(cleanTxt)) {
          const num = parseInt(cleanTxt, 10);
          if (!isNaN(num)) starCountNum = num;
      } else if (cleanTxt.endsWith('k')) {
          const num = parseFloat(cleanTxt) * 1000;
          if (!isNaN(num)) starCountNum = num;
      }
      
      // If still not parsed, try aria-label
      if (starCountNum === null) {
          const ariaLabel = counter.getAttribute('aria-label');
          if (ariaLabel) {
             // Extract number from start of string "3 users starred..."
             const match = ariaLabel.match(/^(\d+(?:,\d+)*)/);
             if (match) {
                 const numStr = match[1];
                 const num = parseInt(numStr.replace(/,/g, ''), 10);
                 if (!isNaN(num)) {
                     starCountNum = num;
                     return numStr;
                 }
             }
          }
      }

      return txt;
  };
  
  starCount = getStarCount();

  // 判断是否已收藏
  let isStarred = false;
  const baseLabel = (baseBtn.getAttribute('aria-label') || '').toLowerCase();
  const baseText = baseBtn.textContent.trim().toLowerCase();
  
  // Helper to check visibility
  const isVisible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);

  if ((baseLabel.includes('unstar') || baseText === 'unstar') && isVisible(baseBtn)) {
      isStarred = true;
  } else {
      // 尝试在附近找找有没有 visible 的 Unstar 按钮 (针对 Star 按钮隐藏 Unstar 按钮显示的情况)
      const parent = baseBtn.closest('.pagehead-actions') || baseBtn.parentElement;
      if (parent) {
          const unstarBtn = Array.from(parent.querySelectorAll('button')).find(b => {
             const l = (b.getAttribute('aria-label') || '').toLowerCase();
             const t = b.textContent.trim().toLowerCase();
             return (l.includes('unstar') || t === 'unstar') && isVisible(b);
          });
          if (unstarBtn) isStarred = true;
      }
  }

  // Record initial state
  const initialStarred = isStarred;

  // Helper to update button state with icons
  const updateMainBtnState = (btn, starred) => {
      btn.innerHTML = '';
      
      // Update star count logic
      let displayCount = starCount;
      if (starCountNum !== null) {
          // Calculate baseline (count without me)
          // If initially starred, baseline = starCountNum - 1
          // If initially not starred, baseline = starCountNum
          const baseline = initialStarred ? starCountNum - 1 : starCountNum;
          
          // New count
          const newCount = starred ? baseline + 1 : baseline;
          displayCount = newCount.toLocaleString();
      }
      
      const countHtml = displayCount ? `<span class="Counter ml-1" style="color: inherit;">${displayCount}</span>` : '';
      
      if (starred) {
          // Filled Star
          btn.innerHTML = `
            <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" class="octicon octicon-star-fill mr-2">
                <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"></path>
            </svg>
            <span>Starred</span>
            ${countHtml}
          `;
          const svg = btn.querySelector('svg');
          if (svg) svg.style.color = 'var(--color-starred-icon, #e3b341)';
      } else {
          // Outline Star
          btn.innerHTML = `
            <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" class="octicon octicon-star mr-2">
                <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Zm0 2.445L6.615 5.5a.75.75 0 0 1-.564.41l-3.097.45 2.24 2.184a.75.75 0 0 1 .216.664l-.528 3.084 2.769-1.456a.75.75 0 0 1 .698 0l2.77 1.456-.53-3.084a.75.75 0 0 1 .216-.664l2.24-2.183-3.096-.45a.75.75 0 0 1-.564-.41L8 2.694Z"></path>
            </svg>
            <span>Star</span>
            ${countHtml}
          `;
          const svg = btn.querySelector('svg');
          if (svg) svg.style.color = 'var(--color-fg-muted, currentColor)';
      }
  };

  updateMainBtnState(mainBtn, isStarred);
  
  // 2. 创建右侧的下拉按钮
  const dropdownBtn = document.createElement('button');
  dropdownBtn.className = 'btn btn-sm px-2';
  dropdownBtn.style.borderTopLeftRadius = '0';
  dropdownBtn.style.borderBottomLeftRadius = '0';
  dropdownBtn.setAttribute('aria-label', 'Better Star options');
  
  // 插入倒三角图标
  dropdownBtn.innerHTML = `
    <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" class="octicon octicon-triangle-down">
        <path d="m4.427 7.427 3.396 3.396a.25.25 0 0 0 .354 0l3.396-3.396A.25.25 0 0 0 11.396 7H4.604a.25.25 0 0 0-.177.427Z"></path>
    </svg>
  `;

  // 绑定事件
  mainBtn.addEventListener('click', async () => {
      // 防止重复点击
      if (mainBtn.disabled) return;
      mainBtn.disabled = true;

      try {
          if (isStarred) {
              // Unstar
              const res = await new Promise(resolve => {
                  chrome.runtime.sendMessage({ type: 'unstar_and_remove', owner, repo }, resolve);
              });
              
              if (res && res.ok) {
                  isStarred = false;
                  updateMainBtnState(mainBtn, isStarred);
              } else {
                  console.error('Unstar failed', res);
                  alert('取消收藏失败: ' + (res && res.error ? res.error : '未知错误'));
              }
          } else {
              // Star
              const res = await new Promise(resolve => {
                  chrome.runtime.sendMessage({ type: 'star_with_tags', owner, repo, tags: [] }, resolve);
              });
              
              if (res && res.ok) {
                  isStarred = true;
                  updateMainBtnState(mainBtn, isStarred);
              } else {
                  console.error('Star failed', res);
                  alert('收藏失败: ' + (res && res.error ? res.error : '未知错误'));
              }
          }
      } catch (err) {
          console.error(err);
          alert('操作发生错误');
      } finally {
          mainBtn.disabled = false;
      }
  });

  dropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openTagPanel(dropdownBtn, owner, repo);
  });
  
  group.appendChild(mainBtn);
  group.appendChild(dropdownBtn);
  
  return group;
}

function openTagPanel(anchor, owner, repo) {
  ensureCss();
  
  // 如果已存在则关闭
  const existing = document.querySelector('.better-star-panel');
  if (existing) {
    existing.remove();
    return;
  }

  const panel = document.createElement('div');
  panel.className = 'better-star-panel';
  
  // View state: 'list' or 'create'
  let currentView = 'list';
  
  // Header
  const header = document.createElement('div');
  header.className = 'better-star-panel-header';
  
  const title = document.createElement('span');
  title.textContent = 'Edit lists';
  header.appendChild(title);
  
  // Header 上的关闭按钮
  const closeIconBtn = document.createElement('button');
  closeIconBtn.className = 'better-star-icon-btn';
  closeIconBtn.title = 'Close';
  closeIconBtn.innerHTML = `
    <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" class="octicon octicon-x">
        <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"></path>
    </svg>
  `;
  closeIconBtn.addEventListener('click', close);
  header.appendChild(closeIconBtn);
  panel.appendChild(header);
  
  // Main Content Container
  const contentContainer = document.createElement('div');
  contentContainer.style.display = 'flex';
  contentContainer.style.flexDirection = 'column';
  contentContainer.style.flex = '1';
  contentContainer.style.overflow = 'hidden';
  panel.appendChild(contentContainer);

  // --- List View Components ---
  const tagsWrap = document.createElement('div');
  tagsWrap.className = 'better-star-tags-wrap';
  
  const input = document.createElement('input');
  input.className = 'better-star-input';
  input.placeholder = 'Filter lists'; // Modified: Filter purpose
  tagsWrap.appendChild(input);
  
  const listWrap = document.createElement('div');
  listWrap.className = 'better-star-list';
  listWrap.innerHTML = `
    <div class="better-star-loading">
       <span>Loading...</span>
    </div>
  `;

  const actions = document.createElement('div');
  actions.className = 'better-star-actions';

  const createListBtn = document.createElement('button');
  createListBtn.className = 'better-star-create-btn';
  createListBtn.innerHTML = `
    <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" class="octicon octicon-plus">
        <path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z"></path>
    </svg>
    Create list
  `;
  createListBtn.addEventListener('click', () => {
    switchView('create');
  });
  
  // 设置按钮
  const settingsBtn = document.createElement('button');
  settingsBtn.className = 'better-star-icon-btn';
  settingsBtn.title = 'Settings';
  settingsBtn.style.marginLeft = 'auto'; // Right align
  settingsBtn.innerHTML = `
    <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" class="octicon octicon-gear">
        <path d="M8 0a8.2 8.2 0 0 1 .701.031C9.444.095 9.99.645 10.16 1.29l.288 1.107c.018.066.079.158.212.224.231.114.454.243.668.386.123.082.233.09.299.071l1.103-.303c.644-.176 1.392.021 1.82.63.27.385.506.792.704 1.218.315.675.111 1.422-.364 1.891l-.814.806c-.05.048-.098.147-.088.294.016.257.016.515 0 .772-.01.147.038.246.088.294l.814.806c.475.469.679 1.216.364 1.891a7.977 7.977 0 0 1-.704 1.217c-.428.61-1.176.807-1.82.63l-1.102-.302c-.067-.019-.177-.011-.3.071a5.909 5.909 0 0 1-.668.386c-.133.066-.194.158-.211.224l-.29 1.106c-.17.646-.716 1.196-1.458 1.26a8.006 8.006 0 0 1-1.402 0c-.742-.064-1.289-.614-1.458-1.26l-.289-1.106c-.017-.066-.079-.158-.211-.224a5.938 5.938 0 0 1-.668-.386c-.123-.082-.233-.09-.3-.071l-1.102.302c-.644.177-1.392-.02-1.82-.63a8.12 8.12 0 0 1-.704-1.218c-.315-.675-.111-1.422.363-1.891l.815-.806c.05-.048.098-.147.088-.294a6.214 6.214 0 0 1 0-.772c.01-.147-.038-.246-.088-.294l-.815-.806C.635 6.045.431 5.298.746 4.623a7.92 7.92 0 0 1 .704-1.218c.428-.61 1.176-.807 1.82-.63l1.102.302c.067.019.177.011.3-.071.214-.143.437-.272.668-.386.133-.066.194-.158.211-.224l.29-1.106C6.009.645 6.556.095 7.299.03 7.53.01 7.765 0 8 0Zm-.571 1.525c-.036.003-.108.036-.137.146l-.289 1.105c-.147.561-.549.967-.998 1.189-.173.086-.34.183-.5.29-.417.278-.97.423-1.529.27l-1.103-.303c-.109-.03-.175.016-.195.045-.22.312-.412.644-.573.99-.015.031-.004.09.103.196l.815.806c.411.406.562.957.53 1.456a4.709 4.709 0 0 0 0 .582c.032.499-.119 1.05-.53 1.456l-.815.806c-.107.105-.118.165-.103.196.161.346.353.678.573.99.02.029.086.075.195.045l1.103-.303c.559-.153 1.112-.008 1.529.27.16.107.327.204.5.29.449.222.851.628.998 1.189l.289 1.105c.029.109.101.143.137.146a6.6 6.6 0 0 0 1.142 0c.036-.003.108-.036.137-.146l.289-1.105c.147-.561.549-.967.998-1.189.173-.086.34-.183.5-.29.417-.278.97-.423 1.529-.27l1.103.303c.109.03.175-.016.195-.045.22-.312.412-.644.573-.99.015-.031.004-.09-.103-.196l-.815-.806c-.411-.406-.562-.957-.53-1.456a4.709 4.709 0 0 0 0-.582c-.032-.499.119-1.05.53-1.456l.815-.806c.107-.105.118-.165.103-.196a6.57 6.57 0 0 0-.573-.99c-.02-.029-.086-.075-.195-.045l-1.103.303c-.559.153-1.112.008-1.529-.27-.16-.107-.327-.204-.5-.29-.449-.222-.851-.628-.998-1.189l-.289-1.105c-.029-.109-.101-.143-.137-.146a6.6 6.6 0 0 0-1.142 0ZM8 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z"></path>
    </svg>
  `;
  settingsBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'open_options' });
  });

  actions.appendChild(createListBtn);
  actions.appendChild(settingsBtn);

  // --- Create View Components ---
  const createForm = document.createElement('div');
  createForm.className = 'better-star-create-form';
  createForm.style.display = 'none';

  // Name
  const nameGroup = document.createElement('div');
  nameGroup.className = 'better-star-form-group';
  const nameLabel = document.createElement('span');
  nameLabel.className = 'better-star-form-label';
  nameLabel.textContent = 'Name';
  const nameInput = document.createElement('input');
  nameInput.className = 'better-star-input';
  nameInput.placeholder = 'Name of the list';
  nameGroup.appendChild(nameLabel);
  nameGroup.appendChild(nameInput);
  
  // Description
  const descGroup = document.createElement('div');
  descGroup.className = 'better-star-form-group';
  const descLabel = document.createElement('span');
  descLabel.className = 'better-star-form-label';
  descLabel.textContent = 'Description';
  const descInput = document.createElement('textarea');
  descInput.className = 'better-star-textarea';
  descInput.placeholder = 'Description of the list';
  descGroup.appendChild(descLabel);
  descGroup.appendChild(descInput);

  // Private Checkbox (Optional style)
  const privateGroup = document.createElement('div');
  privateGroup.className = 'better-star-form-group';
  const privateRow = document.createElement('label');
  privateRow.style.display = 'flex';
  privateRow.style.alignItems = 'center';
  privateRow.style.cursor = 'pointer';
  const privateCheck = document.createElement('input');
  privateCheck.type = 'checkbox';
  privateCheck.style.marginRight = '8px';
  const privateText = document.createElement('span');
  privateText.className = 'better-star-form-label';
  privateText.textContent = 'Make this list private';
  privateRow.appendChild(privateCheck);
  privateRow.appendChild(privateText);
  privateGroup.appendChild(privateRow);

  // Form Actions
  const formActions = document.createElement('div');
  formActions.className = 'better-star-form-actions';
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn-secondary';
  cancelBtn.textContent = 'Cancel';
  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn-primary';
  saveBtn.textContent = 'Create list';

  formActions.appendChild(cancelBtn);
  formActions.appendChild(saveBtn);

  createForm.appendChild(nameGroup);
  createForm.appendChild(descGroup);
  createForm.appendChild(privateGroup);
  createForm.appendChild(formActions);

  // Append everything
  contentContainer.appendChild(tagsWrap);
  contentContainer.appendChild(listWrap);
  contentContainer.appendChild(actions);
  contentContainer.appendChild(createForm);
  
  document.body.appendChild(panel);
  
  // Logic
  let currentTags = new Set();
  let allTagsSet = new Set();

  function switchView(view) {
    currentView = view;
    if (view === 'list') {
      title.textContent = 'Edit lists';
      tagsWrap.style.display = 'block';
      listWrap.style.display = 'flex';
      actions.style.display = 'flex';
      createForm.style.display = 'none';
      input.focus();
    } else {
      title.textContent = 'Create a new list';
      tagsWrap.style.display = 'none';
      listWrap.style.display = 'none';
      actions.style.display = 'none';
      createForm.style.display = 'flex';
      nameInput.value = '';
      descInput.value = '';
      privateCheck.checked = false;
      nameInput.focus();
    }
  }

  cancelBtn.addEventListener('click', () => {
    switchView('list');
  });

  saveBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) return;
    
    // Optimistic UI update
    currentTags.add(name);
    allTagsSet.add(name);
    
    // Save to background
    chrome.runtime.sendMessage({ 
      type: 'create_list', 
      name, 
      description: descInput.value.trim(), 
      private: privateCheck.checked 
    }, (res) => {
       // After creation, also select it for this repo
       saveTags();
    });
    
    renderList();
    switchView('list');
    input.value = ''; // Clear filter
  });

  function renderList() {
    listWrap.innerHTML = '';
    const filter = input.value.trim().toLowerCase();
    
    const sortedTags = Array.from(allTagsSet).sort();
    let visibleCount = 0;

    sortedTags.forEach((t) => {
      if (filter && !t.toLowerCase().includes(filter)) return;
      visibleCount++;
      
      const row = document.createElement('div');
      row.className = 'better-star-list-item';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = currentTags.has(t);
      
      const label = document.createElement('span');
      label.textContent = t;
      label.title = t;
      
      row.addEventListener('click', (e) => {
        if (e.target !== checkbox) {
           checkbox.checked = !checkbox.checked;
        }
        
        if (checkbox.checked) {
          currentTags.add(t);
        } else {
          currentTags.delete(t);
        }
        saveTags();
      });
      
      row.appendChild(checkbox);
      row.appendChild(label);
      listWrap.appendChild(row);
    });

    if (visibleCount === 0) {
        const empty = document.createElement('div');
        empty.className = 'better-star-loading';
        empty.textContent = filter ? 'No matching lists' : 'No lists yet';
        listWrap.appendChild(empty);
    }
  }

  function saveTags() {
    const tags = Array.from(currentTags);
    chrome.runtime.sendMessage({ type: 'star_with_tags', owner, repo, tags }, (res) => {
      if (!res || !res.ok) {
        console.error('Save failed');
      }
    });
  }
  
  // Initialize
  Promise.all([
    new Promise(resolve => chrome.runtime.sendMessage({ type: 'list_tags' }, resolve)),
    new Promise(resolve => chrome.runtime.sendMessage({ type: 'get_repo_tags', owner, repo }, resolve))
  ]).then(([listRes, repoRes]) => {
     allTagsSet = new Set((listRes && listRes.tags) || []);
     const repoTags = (repoRes && repoRes.tags) || [];
     repoTags.forEach(t => {
         currentTags.add(t);
         allTagsSet.add(t);
     });
     renderList();
  });

  // Filter Event
  input.addEventListener('input', () => {
    renderList();
  });

  // Positioning
  const r = anchor.getBoundingClientRect();
  panel.style.top = `${r.bottom + 6 + window.scrollY}px`;
  panel.style.left = `${r.right - 300 + window.scrollX}px`;
  if (parseInt(panel.style.left) < 0) panel.style.left = '10px';

  function close() {
    panel.remove();
    document.removeEventListener('click', onClickOutside);
  }
  
  function onClickOutside(e) {
    if (!panel.contains(e.target) && !anchor.contains(e.target)) {
      close();
    }
  }
  
  setTimeout(() => {
      document.addEventListener('click', onClickOutside);
  }, 0);
}

async function init() {
  console.log('Better Star: init called');
  const ctx = getOwnerRepo();
  if (!ctx) {
    console.log('Better Star: Not a repo page');
    return;
  }
  
  // Fast check to prevent double injection risk during async await
  let starBtn = findStarButton();
  if (starBtn && starBtn.dataset.betterStarInjected) {
      console.log('Better Star: Already injected (fast check)');
      return;
  }

  // Check if we should hide native star button
  // Move this to the end to ensure we have read the state from native button before hiding it
  const settings = await new Promise(resolve => {
      chrome.runtime.sendMessage({ type: 'get_hide_native_star' }, resolve);
  });
  
  // Re-find in case DOM changed
  starBtn = findStarButton();
  if (!starBtn) {
    console.log('Better Star: Star button not found');
    return;
  }
  
  // 如果已经注入过，跳过
  if (starBtn.dataset.betterStarInjected) {
    console.log('Better Star: Already injected');
    return;
  }
  
  console.log('Better Star: Found star button', starBtn);

  // 1. 优先尝试：作为 pagehead-actions 的兄弟 li 插入
  // 这是最符合 DOM 结构并列要求的方式
  const starLi = starBtn.closest('li');
  if (starLi && starLi.parentElement && starLi.parentElement.classList.contains('pagehead-actions')) {
      const myLi = document.createElement('li');
      // 如果是为了保持间距，可能需要一点 margin，但通常 pagehead-actions 会处理
      // 为了保险，我们可以给 li 加个 class
      myLi.className = 'd-inline-block'; // 模仿 GitHub 的 li 行为
      myLi.style.marginLeft = '8px'; // 保持一点间距
      
      const myGroup = createMyButtonGroup(starBtn, ctx.owner, ctx.repo);
      // 移除 myGroup 原本的 margin，交给 li 控制
      myGroup.style.marginLeft = '0';
      
      myLi.appendChild(myGroup);
      
      starLi.insertAdjacentElement('afterend', myLi);
      console.log('Better Star: Injected as new li in pagehead-actions');
      starBtn.dataset.betterStarInjected = '1';
      
      // Now safe to hide native button
      if (settings && settings.hideNativeStar) {
          // Method 1: Hide the main container .starring-container
          // This is the most reliable way as it wraps both Star and Unstar states
          const starContainer = document.querySelector('.starring-container');
          if (starContainer) {
               starContainer.style.setProperty('display', 'none', 'important');
          }

          // Method 2: Find buttons by aria-label and hide their containers
          // This is a fallback if .starring-container is not found or structure is different
          const buttons = Array.from(document.querySelectorAll('button'));
          const nativeButtons = buttons.filter(btn => {
               const label = (btn.getAttribute('aria-label') || '').toLowerCase();
               return label.includes('star this repository') || label.includes('unstar this repository');
          });
          
          nativeButtons.forEach(btn => {
              // Avoid hiding OUR button or already hidden buttons
              if (btn.closest('.react-user-list-group')) return;
              
              const container = btn.closest('.starring-container') || 
                                btn.closest('.js-toggler-container') ||
                                btn.closest('.BtnGroup');
              
              if (container) {
                  container.style.setProperty('display', 'none', 'important');
              }
          });
      }
      
      return;
  }

  // 以下是兜底逻辑，用于非标准页面结构

  // 查找原生的下拉按钮（仅用于定位，不操作它）
  // 实际上我们只需要找到整个 Star 按钮组的末尾
  
  // 策略：找到 Star 按钮的父容器，通常是一个 form 或 div.btn-group
  // 然后插在这个容器的后面
  
  let targetNode = null;
  
  // 1. 尝试找 js-toggler-container (Star 组件的最外层容器，包含 Starred 和 Unstarred 两个状态)
  // 这是最准确的，因为它包含了整个 Star 组件
  const toggler = starBtn.closest('.js-toggler-container');
  if (toggler) {
      targetNode = toggler;
      console.log('Better Star: Target node is js-toggler-container', targetNode);
  }

  // 2. 如果没找到，尝试找 BtnGroup (通常包裹 button 和 details)
  if (!targetNode) {
      const btnGroup = starBtn.closest('.BtnGroup');
      if (btnGroup) {
          targetNode = btnGroup;
          console.log('Better Star: Target node is BtnGroup', targetNode);
      }
  }

  // 3. 兜底：如果还是没找到，尝试找 li (pagehead-actions 的项)
  if (!targetNode) {
      const li = starBtn.closest('li');
      if (li && li.parentElement.classList.contains('pagehead-actions')) {
          targetNode = li;
          // 注意：如果是插在 li 后面，那就是一个新的 li，但这可能破坏 ul 结构
          // 所以这里我们应该插在 li 内部的最后
          console.log('Better Star: Target node is li (will append inside)', targetNode);
          
          // 特殊处理：如果是 li，我们创建一个新的 li 包裹我们的按钮组，或者直接 append 到 li 里面
          // 为了保持一致性，我们这里暂定 targetNode 为 li 的最后一个子元素
          targetNode = li.lastElementChild;
      }
  }
  
  // 4. 最后的兜底：直接用 starBtn 的父元素（form）
  if (!targetNode) {
       targetNode = starBtn.parentElement;
       console.log('Better Star: Target node is parentElement', targetNode);
  }

  // 创建我们的按钮组
  const myGroup = createMyButtonGroup(starBtn, ctx.owner, ctx.repo);
  
  // 插入
  if (targetNode) {
      targetNode.insertAdjacentElement('afterend', myGroup);
      console.log('Better Star: Injected successfully');
      // 标记
      starBtn.dataset.betterStarInjected = '1';

      // Hide native button if settings allow (Fallback path)
      if (settings && settings.hideNativeStar) {
          const starContainer = document.querySelector('.starring-container');
          if (starContainer) {
               starContainer.style.setProperty('display', 'none', 'important');
          }
          
          // Fallback logic for finding native buttons
          const buttons = Array.from(document.querySelectorAll('button'));
          const nativeButtons = buttons.filter(btn => {
               const label = (btn.getAttribute('aria-label') || '').toLowerCase();
               return label.includes('star this repository') || label.includes('unstar this repository');
          });
          
          nativeButtons.forEach(btn => {
              if (btn.closest('.react-user-list-group')) return;
              const container = btn.closest('.starring-container') || 
                                btn.closest('.js-toggler-container') ||
                                btn.closest('.BtnGroup');
              if (container) {
                  container.style.setProperty('display', 'none', 'important');
              }
          });
      }
  } else {
      console.error('Better Star: Could not find parent to insert');
  }
}

const observer = new MutationObserver(() => init());
observer.observe(document.documentElement, { childList: true, subtree: true });
init();
