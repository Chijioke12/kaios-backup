// --- INITIALIZATION ---

window.addEventListener('load', function() {
  document.addEventListener('keydown', handleKey);
  
  // Real-time search listener
  els.searchInput.addEventListener('input', function(e) {
      var val = e.target.value;
      state.searchQuery = val;
      if (val.trim() === '') {
          state.filteredVideos = state.videos;
      } else {
          state.filteredVideos = state.videos.filter(function(v) {
             return v.name.toLowerCase().indexOf(val.toLowerCase()) > -1;
          });
      }
      state.index = 0;
      renderList(els.searchResults, state.filteredVideos);
  });
  
  if (navigator.getDeviceStorage) {
    scanStorage();
  } else {
    // Browser fallback / Simulator
    updateSoftKeys();
    showToast("Press Menu > Scan (Simulator)");
  }
});
