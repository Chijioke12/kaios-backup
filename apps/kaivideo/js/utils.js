// --- HELPERS ---

function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.remove('hidden');
  if (TIMEOUTS.toast) clearTimeout(TIMEOUTS.toast);
  TIMEOUTS.toast = setTimeout(function() {
    els.toast.classList.add('hidden');
  }, 3000);
}

function formatTime(s) {
  if (!s || isNaN(s)) return "00:00:00";
  s = Math.floor(s);
  var h = Math.floor(s/3600);
  var m = Math.floor((s%3600)/60);
  var sc = s%60;
  return pad(h) + ':' + pad(m) + ':' + pad(sc);
}

function pad(n) { return n < 10 ? '0'+n : n; }

function getProgress(id) {
  var v = localStorage.getItem('kv_' + id);
  return v ? parseFloat(v) : 0;
}

function saveProgress(id, time) {
  localStorage.setItem('kv_' + id, time);
}

function parseJumpTime(str) {
  var p = str.padStart(6, '0');
  var h = parseInt(p.slice(0,2));
  var m = parseInt(p.slice(2,4));
  var s = parseInt(p.slice(4,6));
  return (h*3600) + (m*60) + s;
}

function updateJumpText() {
  var p = state.jumpInput.padStart(6, '0');
  els.jumpText.textContent = p.slice(0,2)+':'+p.slice(2,4)+':'+p.slice(4,6);
}

function populateInfo() {
  var v = state.videoToResume || state.filteredVideos[state.index];
  if (!v) return;
  els.infoName.textContent = v.name;
  els.infoDuration.textContent = formatTime(state.duration || v.duration || 0);
  els.infoRes.textContent = els.video.videoWidth + ' x ' + els.video.videoHeight;
}
