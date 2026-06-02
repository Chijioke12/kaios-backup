// --- PLAYER LOGIC ---

function prepareVideo(videoObj) {
  state.videoToResume = videoObj;
  var saved = getProgress(videoObj.id);
  
  if (saved && saved > 5) {
    state.resumeTime = saved;
    openOverlay('resume-dialog');
  } else {
    startVideo(0);
  }
}

function startVideo(startTime) {
  var v = state.videoToResume;
  state.currentTime = startTime;
  state.duration = 0;
  state.isPlaying = true;
  state.speed = 1.0;
  state.zoom = 1.0;
  state.brightness = 1.0;
  state.isLandscape = false;
  state.loop = false;
  
  // Set Audio Channel to Content so Volume Keys work on Media Volume
  if (els.video.mozAudioChannelType) {
      els.video.mozAudioChannelType = 'content';
  }
  
  // Reset DOM
  els.pFilename.textContent = v.name;
  els.video.src = v.url;
  els.video.playbackRate = 1.0;
  els.video.style.transform = 'scale(1)';
  setBrightness(1.0);
  
  // Reset Classes handled by showView/body class logic
  els.playerContainer.classList.remove('landscape-mode');

  showView('PLAYER');
  
  els.video.currentTime = startTime;
  
  var promise = els.video.play();
  if (promise !== undefined) {
      promise.then(function() {
          state.isPlaying = true;
          showControls();
      }).catch(function(error) {
          console.error('Play error', error);
      });
  }
}

function seek(amt) {
  els.video.currentTime += amt;
  showFeedback(amt > 0 ? '+5s' : '-5s');
}

function adjustVolume(delta) {
  if (delta > 0) VolumeControl.volumeUp();
  else VolumeControl.volumeDown();
}

function toggleMute() {
  state.isMuted = !state.isMuted;
  VolumeControl.setMute(els.video, state.isMuted);
}

// Observe volume changes (including system-level) to update UI
VolumeControl.observeMediaVolume(els.video, function(volume, muted) {
  state.volume = volume;
  state.isMuted = muted;
  
  if (muted) {
    els.pMuted.classList.remove('hidden');
    showFeedback('MUTED');
  } else {
    els.pMuted.classList.add('hidden');
    showFeedback('Volume: ' + Math.round(volume * 100) + '%', true);
  }
});

function setZoom(delta) {
  if (delta === 0) state.zoom = 1;
  else state.zoom = Math.max(0.5, Math.min(3.0, state.zoom + delta));
  
  els.video.style.transform = 'scale(' + state.zoom + ')';
  showFeedback('Zoom: ' + Math.round(state.zoom*100) + '%');
}

function setBrightness(val) {
    state.brightness = Math.max(0.1, Math.min(1.0, val));
    // Opacity is inverse of brightness: Br 1.0 = Op 0.0, Br 0.0 = Op 1.0
    // We limit max darkness to 0.9 (so 0.1 brightness) to avoid total black screen
    var opacity = 1 - state.brightness;
    els.brightOverlay.style.opacity = opacity;
    showFeedback('Brightness: ' + Math.round(state.brightness * 10) * 10 + '%', true);
}

function showControls() {
  els.playerHeader.classList.remove('hidden');
  els.playerControls.classList.remove('hidden');
  if (TIMEOUTS.controls) clearTimeout(TIMEOUTS.controls);
  TIMEOUTS.controls = setTimeout(function() {
    if (!els.video.paused && !state.activeOverlay) {
      els.playerHeader.classList.add('hidden');
      els.playerControls.classList.add('hidden');
    }
  }, 4000);
}

function showFeedback(text, showBar) {
  els.pFbText.textContent = text;
  els.pFeedback.classList.remove('hidden');
  if (showBar) {
    els.pFbBar.classList.remove('hidden');
    // If text is percentage, parse it
    var pct = parseFloat(text.replace(/[^0-9.]/g, ''));
    if (!isNaN(pct)) els.pFbFill.style.width = pct + '%';
  } else {
    els.pFbBar.classList.add('hidden');
  }
  
  if (TIMEOUTS.feedback) clearTimeout(TIMEOUTS.feedback);
  TIMEOUTS.feedback = setTimeout(function() {
    els.pFeedback.classList.add('hidden');
  }, 1000);
}

// Events
els.video.ontimeupdate = function() {
  var cur = els.video.currentTime;
  var dur = els.video.duration;
  state.currentTime = cur;
  state.duration = dur;
  
  els.pTimeCur.textContent = formatTime(cur);
  if (!isNaN(dur) && dur > 0) {
    els.pTimeDur.textContent = formatTime(dur);
    els.pProgress.style.width = ((cur/dur)*100) + '%';
  }
};

els.video.onended = function() {
  if (state.loop) {
    els.video.currentTime = 0;
    els.video.play();
  } else {
    var nextIdx = state.index + 1;
    if (nextIdx < state.filteredVideos.length) {
      state.index = nextIdx;
      showToast("Playing next...");
      prepareVideo(state.filteredVideos[nextIdx]);
    } else {
      state.isPlaying = false;
      els.pStatus.textContent = "ENDED";
      showControls();
    }
  }
};

els.video.onplay = function() { 
  els.pStatus.textContent = "PLAYING"; 
  state.isPlaying = true;
  updateSoftKeys(); 
};
els.video.onpause = function() { 
  els.pStatus.textContent = "PAUSED"; 
  state.isPlaying = false;
  updateSoftKeys(); 
};
