// --- SCROLL MANAGEMENT ---
function scrollToCenter(container, index) {
  var items = container.children;
  if (!items || !items[index]) return;
  
  var item = items[index];
  var containerH = container.clientHeight;
  var itemH = item.clientHeight || 58;
  var itemTop = item.offsetTop;
  
  // Calculate centering position
  container.scrollTop = itemTop - (containerH / 2) + (itemH / 2);
}

// --- RENDERING ---

function updateSoftKeys() {
  var l = '', c = '', r = '';
  
  if (state.activeOverlay === 'library-menu' || state.activeOverlay === 'options-menu') {
    c = 'SELECT'; r = 'Back';
  } else if (state.activeOverlay === 'resume-dialog') {
    l = 'Start Over'; c = 'RESUME'; r = 'Back';
  } else if (state.activeOverlay === 'jumpto-dialog') {
    c = 'GO'; r = 'Cancel';
  } else if (state.activeOverlay === 'info-dialog' || state.activeOverlay === 'shortcuts-dialog') {
    c = 'OK'; r = 'Close';
  } else if (state.view === 'LIBRARY') {
    l = 'Menu'; c = state.filteredVideos.length ? 'PLAY' : ''; r = 'Search';
  } else if (state.view === 'SEARCH') {
    // If input focused
    if (document.activeElement === els.searchInput) {
        c = ''; r = 'Cancel';
    } else {
        c = 'OPEN'; r = 'Cancel';
    }
  } else if (state.view === 'PLAYER') {
    l = 'Rotate'; c = state.isPlaying ? 'PAUSE' : 'PLAY'; r = 'Options';
  }
  
  els.skLeft.textContent = l;
  els.skCenter.textContent = c;
  els.skRight.textContent = r;
}

function showView(viewName) {
  state.view = viewName;
  els.viewLibrary.classList.add('hidden');
  els.viewSearch.classList.add('hidden');
  els.viewPlayer.classList.add('hidden');
  
  // Clean up previous states from body
  document.body.classList.remove('view-player');
  document.body.classList.remove('is-landscape');
  
  // Show header by default
  els.header.classList.remove('hidden');

  if (viewName === 'LIBRARY') {
    els.viewLibrary.classList.remove('hidden');
    els.headerTitle.textContent = "KaiVideo Library";
    renderList(els.videoList, state.filteredVideos);
  } else if (viewName === 'SEARCH') {
    els.viewSearch.classList.remove('hidden');
    els.headerTitle.textContent = "Search";
    els.searchInput.value = state.searchQuery;
    els.searchInput.focus();
    renderList(els.searchResults, state.filteredVideos);
  } else if (viewName === 'PLAYER') {
    els.viewPlayer.classList.remove('hidden');
    document.body.classList.add('view-player'); // Activates CSS to hide header
    
    // Explicitly hide header in JS to prevent any visual glitches
    els.header.classList.add('hidden');
    
    // If returning to player in landscape mode, re-apply classes
    if (state.isLandscape) {
        document.body.classList.add('is-landscape'); // Activates CSS to hide softkeys
        els.playerContainer.classList.add('landscape-mode');
    }
  }
  updateSoftKeys();
}

// Optimized Render: Does not wipe innerHTML on every call
function renderList(container, items) {
  if (items.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No results</p></div>';
    return;
  }
  
  // If list size mismatch, rebuild (filtering/sorting changed)
  // Or if it's empty state currently
  if (container.children.length !== items.length || container.querySelector('.empty-state')) {
      container.innerHTML = '';
      
      items.forEach(function(vid, i) {
        var div = document.createElement('div');
        div.className = 'list-item';
        // Store ID for checking
        div.dataset.id = vid.id;
        
        var cleanId = vid.id.replace(/[^a-zA-Z0-9]/g, '');
        var imgId = 'img-' + cleanId;
        var durId = 'dur-' + cleanId;
        
        var savedPos = getProgress(vid.id);
        var savedHtml = savedPos > 5 ? '<div class="resume-dot"></div>' : '';
        
        var timeText = '';
        if (vid.duration) timeText = formatTime(vid.duration);
        else if (savedPos > 0) timeText = formatTime(savedPos);

        div.innerHTML = 
          '<div class="thumb">' +
            '<img id="'+imgId+'" style="display:none">' +
            '<span class="thumb-icon">▶</span>' +
            savedHtml +
          '</div>' +
          '<div class="item-info">' +
            '<span class="item-name">'+vid.name+'</span>' +
            '<div class="item-meta">' +
              '<span>'+(vid.type.split('/')[1]||'video')+'</span>' +
              '<span id="'+durId+'">'+timeText+'</span>' +
            '</div>' +
          '</div>';
          
        container.appendChild(div);
        ThumbQueue.add(vid);
      });
  }
  
  // Just update active class
  var children = container.children;
  for (var i = 0; i < children.length; i++) {
      if (i === state.index) children[i].classList.add('active');
      else children[i].classList.remove('active');
  }
  
  scrollToCenter(container, state.index);
}

function renderMenu(listId, items, activeIdx) {
  var ul = document.getElementById(listId);
  var lis = ul.querySelectorAll('li');
  for (var i = 0; i < lis.length; i++) {
    if (i === activeIdx) lis[i].classList.add('active');
    else lis[i].classList.remove('active');
  }
  scrollToCenter(ul, activeIdx);
}
