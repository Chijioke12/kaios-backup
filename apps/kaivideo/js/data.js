// --- DATA ---

function scanStorage() {
  showToast("Scanning...");
  
  StorageAPI.enumerateFiles({
    type: 'videos',
    extensions: ['.mp4', '.mkv', '.webm', '.3gp', '.avi']
  }).then(function(files) {
    var found = [];
    files.forEach(function(file) {
      var cleanName = file.name.split('/').pop(); // Remove paths
      found.push({
        id: file.name + '_' + file.size,
        name: cleanName,
        path: file.name,
        url: URL.createObjectURL(file),
        type: file.type || 'video/unknown',
        size: file.size,
        duration: 0 // Will be updated by ThumbQueue
      });
    });

    if (found.length > 0) {
      state.videos = found;
      state.filteredVideos = found;
      renderList(els.videoList, found);
      showToast("Found " + found.length + " videos");
    } else {
      showToast("No videos found");
    }
    updateSoftKeys();
  }).catch(function(err) {
    console.error('Scan error:', err);
    showToast("Scan error");
    updateSoftKeys();
  });
}

function handleFiles(files) {
  var count = files.length;
  for (var i = 0; i < count; i++) {
    var f = files[i];
    state.videos.push({
      id: f.name + '_' + f.size,
      name: f.name,
      url: URL.createObjectURL(f),
      type: f.type,
      size: f.size,
      duration: 0
    });
  }
  state.filteredVideos = state.videos;
  renderList(els.videoList, state.filteredVideos);
}

function deleteCurrentVideo() {
  if (state.filteredVideos.length === 0) return;
  var vid = state.filteredVideos[state.index];
  if (confirm("Delete " + vid.name + "?")) {
    StorageAPI.deleteFile(vid.path, 'videos').then(function() {
      state.videos = state.videos.filter(function(v){ return v.id !== vid.id; });
      state.filteredVideos = state.videos; 
      state.index = 0;
      renderList(els.videoList, state.filteredVideos);
      showToast("Deleted");
    }).catch(function(err) {
      console.error('Delete error:', err);
      showToast("Delete failed");
    });
  }
}

function sortVideos(criteria) {
  var sortFn = function(a, b) {
    if (criteria === 'name') return a.name.localeCompare(b.name);
    return b.size - a.size; 
  };
  
  // Sort both master list and filtered list to ensure persistence
  state.videos.sort(sortFn);
  state.filteredVideos.sort(sortFn);
  
  // Re-render
  // Force clear to ensure DOM updates in renderList
  els.videoList.innerHTML = ''; 
  renderList(els.videoList, state.filteredVideos);
  showToast("Sorted by " + (criteria === 'name' ? 'Name' : 'Size'));
}

function executeAction(action) {
  if (action === 'scan') scanStorage();
  if (action === 'sort-name') sortVideos('name');
  if (action === 'sort-size') sortVideos('size');
  if (action === 'delete') deleteCurrentVideo();
  if (action === 'exit') window.close();
  if (action === 'shortcuts') openOverlay('shortcuts-dialog');
  
  // Player
  if (action === 'jumpto') openOverlay('jumpto-dialog');
  if (action === 'speed') {
    var speeds = [0.5, 1.0, 1.25, 1.5, 2.0];
    var idx = speeds.indexOf(state.speed);
    state.speed = speeds[(idx + 1) % speeds.length];
    els.video.playbackRate = state.speed;
    showFeedback('Speed: ' + state.speed + 'x');
  }
  if (action === 'loop') {
    state.loop = !state.loop;
    showFeedback(state.loop ? 'Loop: ON' : 'Loop: OFF');
  }
  if (action === 'info') openOverlay('info-dialog');
}
