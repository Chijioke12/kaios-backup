// --- INPUT HANDLING ---

function handleKey(e) {
  var key = e.key;
  
  // Normalize Keys
  if (key === 'SoftLeft' || key === 'F1') key = 'F1';
  if (key === 'SoftRight' || key === 'F2') key = 'F2';
  if (key === 'Enter' || key === 'SoftCenter') key = 'Enter';

  // Prevent App Exit on Backspace
  if (key === 'Backspace') {
      e.preventDefault();
  }

  if (state.activeOverlay) {
    handleOverlayKey(key);
    return;
  }

  if (state.view === 'LIBRARY') {
    handleLibraryKey(key);
  } else if (state.view === 'SEARCH') {
    handleSearchKey(key);
  } else if (state.view === 'PLAYER') {
    handlePlayerKey(key, e);
  }
}

function handleLibraryKey(key) {
  switch(key) {
    case 'ArrowUp':
      if (state.index > 0) {
        state.index--;
      } else {
        // Loop to bottom
        state.index = state.filteredVideos.length - 1;
      }
      renderList(els.videoList, state.filteredVideos);
      break;
    case 'ArrowDown':
      if (state.index < state.filteredVideos.length - 1) {
        state.index++;
      } else {
        // Loop to top
        state.index = 0;
      }
      renderList(els.videoList, state.filteredVideos);
      break;
    case 'Enter':
      if (state.filteredVideos.length > 0) {
        prepareVideo(state.filteredVideos[state.index]);
      } else {
        // Fallback
        var input = document.createElement('input');
        input.type = 'file'; input.accept = 'video/*';
        input.onchange = function(e) { handleFiles(e.target.files); };
        input.click();
      }
      break;
    case 'F1': // Menu
      openOverlay('library-menu');
      break;
    case 'F2': // Search
      state.searchQuery = '';
      showView('SEARCH');
      break;
  }
}

function handleSearchKey(key) {
  // If focus is on input, Down arrow should move to list
  if (document.activeElement === els.searchInput) {
    if (key === 'ArrowDown' || key === 'Enter') {
        els.searchInput.blur(); // Remove focus so typing stops
        state.index = 0;
        renderList(els.searchResults, state.filteredVideos);
        updateSoftKeys();
        return;
    }
    // Let typing happen
    return;
  }
  
  // List Navigation
  if (document.activeElement !== els.searchInput) {
    if (key === 'ArrowUp') {
      if (state.index > 0) {
        state.index--;
      } else {
        // Wrap to bottom
        state.index = state.filteredVideos.length - 1;
      }
      renderList(els.searchResults, state.filteredVideos);
      return;
    } else if (key === 'ArrowDown') {
      if (state.index < state.filteredVideos.length - 1) {
        state.index++;
      } else {
        // Wrap to top
        state.index = 0;
      }
      renderList(els.searchResults, state.filteredVideos);
      return;
    }
  }

  switch(key) {
    case 'Enter':
      if (state.filteredVideos.length > 0) {
        prepareVideo(state.filteredVideos[state.index]);
      }
      break;
    case 'F2': // Cancel
    case 'Backspace':
      els.searchInput.blur();
      state.searchQuery = '';
      state.filteredVideos = state.videos; 
      state.index = 0;
      showView('LIBRARY');
      break;
  }
}

function handleOverlayKey(key) {
  var overlay = state.activeOverlay;
  
  if (overlay === 'resume-dialog') {
    if (key === 'F1') { // Start Over
      closeOverlay();
      startVideo(0);
    } else if (key === 'Enter') { // Resume
      closeOverlay();
      startVideo(state.resumeTime);
    } else if (key === 'Backspace' || key === 'F2') {
      closeOverlay();
      // Only go back if we haven't started playing yet
      // If prompt appeared on load, user likely wants to cancel play
      showView('LIBRARY');
    }
    return;
  }
  
  if (overlay === 'jumpto-dialog') {
    if (key === 'Backspace' || key === 'F2') {
      closeOverlay();
    } else if (key === 'Enter') {
      var sec = parseJumpTime(state.jumpInput);
      closeOverlay();
      els.video.currentTime = sec;
      showControls();
    } else if (!isNaN(parseInt(key))) {
      if (state.jumpInput.length < 6) {
        state.jumpInput += key;
        updateJumpText();
      }
    }
    return;
  }

  if (overlay === 'info-dialog' || overlay === 'shortcuts-dialog') {
    if (overlay === 'info-dialog') {
       if (key === 'ArrowDown') els.infoScroll.scrollTop += 30;
       if (key === 'ArrowUp') els.infoScroll.scrollTop -= 30;
    }
    if (key === 'Enter' || key === 'Backspace' || key === 'F2' || key === 'SoftCenter') closeOverlay();
    return;
  }
  
  // Menus
  var listId = overlay === 'library-menu' ? 'list-menu-library' : 'list-menu-options';
  var listEl = document.getElementById(listId);
  var items = listEl.querySelectorAll('li');
  
  if (key === 'ArrowUp') {
    if (state.menuIndex > 0) {
      state.menuIndex--;
    } else {
      state.menuIndex = items.length - 1; // Loop to bottom
    }
    renderMenu(listId, null, state.menuIndex);
  } else if (key === 'ArrowDown') {
    if (state.menuIndex < items.length - 1) {
      state.menuIndex++;
    } else {
      state.menuIndex = 0; // Loop to top
    }
    renderMenu(listId, null, state.menuIndex);
  } else if (key === 'Enter') {
    var action = items[state.menuIndex].dataset.action;
    closeOverlay();
    executeAction(action);
  } else if (key === 'Backspace' || key === 'F2') {
    closeOverlay();
  }
}

function handlePlayerKey(key, e) {
  if (key === 'Backspace') {
    if (els.video.currentTime > 0) {
      saveProgress(state.videoToResume.id, els.video.currentTime);
    }
    els.video.pause();
    state.isPlaying = false;
    showView('LIBRARY');
    return;
  }
  
  if (key === 'F2') { // Options
    els.video.pause();
    state.isPlaying = false;
    showControls();
    openOverlay('options-menu');
    return;
  }
  
  if (key === 'F1') { // Rotate
    state.isLandscape = !state.isLandscape;
    if (state.isLandscape) {
      document.body.classList.add('is-landscape');
      els.playerContainer.classList.add('landscape-mode');
    } else {
      document.body.classList.remove('is-landscape');
      els.playerContainer.classList.remove('landscape-mode');
    }
    return;
  }
  
  if (key === 'Enter') {
    if (els.video.paused) {
      els.video.play();
      state.isPlaying = true;
    } else {
      els.video.pause();
      state.isPlaying = false;
    }
    showControls();
    return;
  }
  
  // SYSTEM VOLUME KEYS
  if (key === 'VolumeUp') {
    VolumeControl.volumeUp();
    return;
  }
  if (key === 'VolumeDown') {
    VolumeControl.volumeDown();
    return;
  }

  // D-PAD VOLUME CONTROLS (App Level)
  if (key === 'ArrowUp') {
    VolumeControl.volumeUp();
    return;
  }
  if (key === 'ArrowDown') {
    VolumeControl.volumeDown();
    return;
  }
  
  if (key === 'ArrowLeft') seek(-5);
  if (key === 'ArrowRight') seek(5);
  
  // Brightness Controls
  if (key === '4') setBrightness(state.brightness - 0.1);
  if (key === '6') setBrightness(state.brightness + 0.1);

  if (key === '0') toggleMute(); // Mute App-level only
  
  if (key === '1') setZoom(-0.25);
  if (key === '3') setZoom(0.25);
  if (key === '5') setZoom(0);
  
  showControls();
}

function openOverlay(name) {
  state.activeOverlay = name;
  state.menuIndex = 0;
  
  if (name === 'library-menu') {
    els.menuLib.classList.remove('hidden');
    renderMenu('list-menu-library', null, 0);
  } else if (name === 'options-menu') {
    els.menuOpt.classList.remove('hidden');
    document.getElementById('opt-speed').textContent = 'Speed: ' + state.speed + 'x';
    document.getElementById('opt-loop').textContent = 'Loop: ' + (state.loop ? 'On' : 'Off');
    renderMenu('list-menu-options', null, 0);
  } else if (name === 'resume-dialog') {
    els.dialogResume.classList.remove('hidden');
    els.resumeTimeText.textContent = formatTime(state.resumeTime);
  } else if (name === 'jumpto-dialog') {
    state.jumpInput = '';
    updateJumpText();
    els.dialogJump.classList.remove('hidden');
  } else if (name === 'info-dialog') {
    populateInfo();
    els.dialogInfo.classList.remove('hidden');
  } else if (name === 'shortcuts-dialog') {
    els.dialogShortcuts.classList.remove('hidden');
  }
  updateSoftKeys();
}

function closeOverlay() {
  state.activeOverlay = null;
  var overlays = document.querySelectorAll('.menu-overlay, .dialog-overlay');
  for (var i=0; i<overlays.length; i++) {
    overlays[i].classList.add('hidden');
  }
  updateSoftKeys();
}
