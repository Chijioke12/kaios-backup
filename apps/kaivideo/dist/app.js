(() => {
  var state = {
    view: "LIBRARY",
    videos: [],
    filteredVideos: [],
    index: 0,
    menuIndex: 0,
    searchQuery: "",
    // Player
    isPlaying: false,
    isMuted: false,
    isLandscape: false,
    volume: 1,
    zoom: 1,
    speed: 1,
    brightness: 1,
    // 0.1 to 1.0
    loop: false,
    duration: 0,
    currentTime: 0,
    jumpInput: "",
    // Overlays
    activeOverlay: null,
    resumeTime: 0,
    videoToResume: null
  };
  var els = {
    app: document.getElementById("app-container"),
    header: document.getElementById("header"),
    headerTitle: document.getElementById("header-title"),
    viewLibrary: document.getElementById("view-library"),
    viewSearch: document.getElementById("view-search"),
    viewPlayer: document.getElementById("view-player"),
    videoList: document.getElementById("video-list"),
    searchResults: document.getElementById("search-results"),
    searchInput: document.getElementById("search-input"),
    video: document.getElementById("main-video"),
    playerContainer: document.getElementById("player-container"),
    playerControls: document.getElementById("player-controls"),
    playerHeader: document.getElementById("player-header"),
    brightOverlay: document.getElementById("brightness-overlay"),
    toast: document.getElementById("toast"),
    softkeys: document.querySelector(".softkeys"),
    skLeft: document.getElementById("sk-left"),
    skCenter: document.getElementById("sk-center"),
    skRight: document.getElementById("sk-right"),
    // Player UI
    pFilename: document.getElementById("player-filename"),
    pMuted: document.getElementById("player-muted-icon"),
    pTimeCur: document.getElementById("time-current"),
    pTimeDur: document.getElementById("time-duration"),
    pProgress: document.getElementById("progress-fill"),
    pStatus: document.getElementById("status-text"),
    pFeedback: document.getElementById("player-feedback"),
    pFbText: document.getElementById("feedback-text"),
    pFbBar: document.getElementById("feedback-bar-container"),
    pFbFill: document.getElementById("feedback-bar-fill"),
    // Overlays
    menuLib: document.getElementById("menu-library"),
    listMenuLib: document.getElementById("list-menu-library"),
    menuOpt: document.getElementById("menu-options"),
    listMenuOpt: document.getElementById("list-menu-options"),
    dialogResume: document.getElementById("dialog-resume"),
    resumeTimeText: document.getElementById("resume-time"),
    dialogJump: document.getElementById("dialog-jumpto"),
    jumpText: document.getElementById("jumpto-text"),
    dialogInfo: document.getElementById("dialog-info"),
    infoScroll: document.getElementById("info-scroll-area"),
    infoName: document.getElementById("info-name"),
    infoDuration: document.getElementById("info-duration"),
    infoRes: document.getElementById("info-res"),
    dialogShortcuts: document.getElementById("dialog-shortcuts")
  };
  var TIMEOUTS = { controls: null, feedback: null, toast: null };
  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.remove("hidden");
    if (TIMEOUTS.toast) clearTimeout(TIMEOUTS.toast);
    TIMEOUTS.toast = setTimeout(function() {
      els.toast.classList.add("hidden");
    }, 3e3);
  }
  function formatTime(s) {
    if (!s || isNaN(s)) return "00:00:00";
    s = Math.floor(s);
    var h = Math.floor(s / 3600);
    var m = Math.floor(s % 3600 / 60);
    var sc = s % 60;
    return pad(h) + ":" + pad(m) + ":" + pad(sc);
  }
  function pad(n) {
    return n < 10 ? "0" + n : n;
  }
  function getProgress(id) {
    var v = localStorage.getItem("kv_" + id);
    return v ? parseFloat(v) : 0;
  }
  function saveProgress(id, time) {
    localStorage.setItem("kv_" + id, time);
  }
  function parseJumpTime(str) {
    var p = str.padStart(6, "0");
    var h = parseInt(p.slice(0, 2));
    var m = parseInt(p.slice(2, 4));
    var s = parseInt(p.slice(4, 6));
    return h * 3600 + m * 60 + s;
  }
  function updateJumpText() {
    var p = state.jumpInput.padStart(6, "0");
    els.jumpText.textContent = p.slice(0, 2) + ":" + p.slice(2, 4) + ":" + p.slice(4, 6);
  }
  function populateInfo() {
    var v = state.videoToResume || state.filteredVideos[state.index];
    if (!v) return;
    els.infoName.textContent = v.name;
    els.infoDuration.textContent = formatTime(state.duration || v.duration || 0);
    els.infoRes.textContent = els.video.videoWidth + " x " + els.video.videoHeight;
  }
  var ThumbQueue = {
    queue: [],
    isProcessing: false,
    videoEl: null,
    add: function(videoFile) {
      var exists = this.queue.some(function(v) {
        return v.id === videoFile.id;
      });
      if (!exists) {
        this.queue.push(videoFile);
        this.process();
      }
    },
    process: function() {
      if (this.isProcessing || this.queue.length === 0) return;
      this.isProcessing = true;
      var file = this.queue.shift();
      var self = this;
      if (!this.videoEl) {
        this.videoEl = document.createElement("video");
        this.videoEl.muted = true;
        this.videoEl.preload = "auto";
        this.videoEl.playsInline = true;
      }
      var v = this.videoEl;
      var cleanId = file.id.replace(/[^a-zA-Z0-9]/g, "");
      var imgId = "img-" + cleanId;
      var durId = "dur-" + cleanId;
      var imgEl = document.getElementById(imgId);
      var durEl = document.getElementById(durId);
      var cleanup = function() {
        v.removeAttribute("src");
        v.load();
        self.isProcessing = false;
        setTimeout(function() {
          self.process();
        }, 50);
      };
      if (!imgEl) {
        cleanup();
        return;
      }
      if (imgEl.src && imgEl.style.display !== "none") {
        cleanup();
        return;
      }
      v.onloadedmetadata = function() {
        if (v.duration && v.duration !== Infinity && !isNaN(v.duration)) {
          file.duration = v.duration;
          if (durEl) durEl.textContent = formatTime(v.duration);
        }
      };
      var onSeeked = function() {
        try {
          var canvas = document.createElement("canvas");
          canvas.width = 160;
          canvas.height = 90;
          var ctx = canvas.getContext("2d");
          ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
          var dataUrl = canvas.toDataURL("image/jpeg", 0.6);
          if (imgEl) {
            imgEl.src = dataUrl;
            imgEl.style.display = "block";
          }
        } catch (e) {
        }
        v.removeEventListener("seeked", onSeeked);
        cleanup();
      };
      v.onloadeddata = function() {
        var t = 5;
        if (v.duration && v.duration < 10) t = v.duration / 2;
        v.currentTime = t;
      };
      v.addEventListener("seeked", onSeeked);
      v.onerror = function() {
        cleanup();
      };
      v.src = file.url;
      v.load();
      setTimeout(function() {
        if (self.isProcessing) {
          v.removeEventListener("seeked", onSeeked);
          cleanup();
        }
      }, 3e3);
    }
  };
  function scrollToCenter(container, index) {
    var items = container.children;
    if (!items || !items[index]) return;
    var item = items[index];
    var containerH = container.clientHeight;
    var itemH = item.clientHeight || 58;
    var itemTop = item.offsetTop;
    container.scrollTop = itemTop - containerH / 2 + itemH / 2;
  }
  function updateSoftKeys() {
    var l = "", c = "", r = "";
    if (state.activeOverlay === "library-menu" || state.activeOverlay === "options-menu") {
      c = "SELECT";
      r = "Back";
    } else if (state.activeOverlay === "resume-dialog") {
      l = "Start Over";
      c = "RESUME";
      r = "Back";
    } else if (state.activeOverlay === "jumpto-dialog") {
      c = "GO";
      r = "Cancel";
    } else if (state.activeOverlay === "info-dialog" || state.activeOverlay === "shortcuts-dialog") {
      c = "OK";
      r = "Close";
    } else if (state.view === "LIBRARY") {
      l = "Menu";
      c = state.filteredVideos.length ? "PLAY" : "";
      r = "Search";
    } else if (state.view === "SEARCH") {
      if (document.activeElement === els.searchInput) {
        c = "";
        r = "Cancel";
      } else {
        c = "OPEN";
        r = "Cancel";
      }
    } else if (state.view === "PLAYER") {
      l = "Rotate";
      c = state.isPlaying ? "PAUSE" : "PLAY";
      r = "Options";
    }
    els.skLeft.textContent = l;
    els.skCenter.textContent = c;
    els.skRight.textContent = r;
  }
  function showView(viewName) {
    state.view = viewName;
    els.viewLibrary.classList.add("hidden");
    els.viewSearch.classList.add("hidden");
    els.viewPlayer.classList.add("hidden");
    document.body.classList.remove("view-player");
    document.body.classList.remove("is-landscape");
    els.header.classList.remove("hidden");
    if (viewName === "LIBRARY") {
      els.viewLibrary.classList.remove("hidden");
      els.headerTitle.textContent = "KaiVideo Library";
      renderList(els.videoList, state.filteredVideos);
    } else if (viewName === "SEARCH") {
      els.viewSearch.classList.remove("hidden");
      els.headerTitle.textContent = "Search";
      els.searchInput.value = state.searchQuery;
      els.searchInput.focus();
      renderList(els.searchResults, state.filteredVideos);
    } else if (viewName === "PLAYER") {
      els.viewPlayer.classList.remove("hidden");
      document.body.classList.add("view-player");
      els.header.classList.add("hidden");
      if (state.isLandscape) {
        document.body.classList.add("is-landscape");
        els.playerContainer.classList.add("landscape-mode");
      }
    }
    updateSoftKeys();
  }
  function renderList(container, items) {
    if (items.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No results</p></div>';
      return;
    }
    if (container.children.length !== items.length || container.querySelector(".empty-state")) {
      container.innerHTML = "";
      items.forEach(function(vid, i2) {
        var div = document.createElement("div");
        div.className = "list-item";
        div.dataset.id = vid.id;
        var cleanId = vid.id.replace(/[^a-zA-Z0-9]/g, "");
        var imgId = "img-" + cleanId;
        var durId = "dur-" + cleanId;
        var savedPos = getProgress(vid.id);
        var savedHtml = savedPos > 5 ? '<div class="resume-dot"></div>' : "";
        var timeText = "";
        if (vid.duration) timeText = formatTime(vid.duration);
        else if (savedPos > 0) timeText = formatTime(savedPos);
        div.innerHTML = '<div class="thumb"><img id="' + imgId + '" style="display:none"><span class="thumb-icon">\u25B6</span>' + savedHtml + '</div><div class="item-info"><span class="item-name">' + vid.name + '</span><div class="item-meta"><span>' + (vid.type.split("/")[1] || "video") + '</span><span id="' + durId + '">' + timeText + "</span></div></div>";
        container.appendChild(div);
        ThumbQueue.add(vid);
      });
    }
    var children = container.children;
    for (var i = 0; i < children.length; i++) {
      if (i === state.index) children[i].classList.add("active");
      else children[i].classList.remove("active");
    }
    scrollToCenter(container, state.index);
  }
  function renderMenu(listId, items, activeIdx) {
    var ul = document.getElementById(listId);
    var lis = ul.querySelectorAll("li");
    for (var i = 0; i < lis.length; i++) {
      if (i === activeIdx) lis[i].classList.add("active");
      else lis[i].classList.remove("active");
    }
    scrollToCenter(ul, activeIdx);
  }
  var VolumeControl = {
    /**
     * Increase system volume
     */
    volumeUp: function() {
      if (navigator.volumeManager) {
        navigator.volumeManager.requestUp();
      } else {
        console.warn("VolumeManager not available");
      }
    },
    /**
     * Decrease system volume
     */
    volumeDown: function() {
      if (navigator.volumeManager) {
        navigator.volumeManager.requestDown();
      } else {
        console.warn("VolumeManager not available");
      }
    },
    /**
     * Listen for volume changes on a specific media element
     * @param mediaElement - The HTML audio or video element
     * @param callback - Function called when volume changes
     */
    observeMediaVolume: function(mediaElement, callback) {
      if (!mediaElement) return;
      mediaElement.addEventListener("volumechange", function() {
        if (callback) callback(mediaElement.volume, mediaElement.muted);
      });
    },
    /**
     * Mute or Unmute a media element
     * @param mediaElement - The HTML audio or video element
     * @param shouldMute - Boolean to mute or unmute
     */
    setMute: function(mediaElement, shouldMute) {
      if (mediaElement) {
        mediaElement.muted = shouldMute;
      }
    }
  };
  if (typeof window !== "undefined") {
    window.VolumeControl = VolumeControl;
  }
  function prepareVideo(videoObj) {
    state.videoToResume = videoObj;
    var saved = getProgress(videoObj.id);
    if (saved && saved > 5) {
      state.resumeTime = saved;
      openOverlay("resume-dialog");
    } else {
      startVideo(0);
    }
  }
  function startVideo(startTime) {
    var v = state.videoToResume;
    state.currentTime = startTime;
    state.duration = 0;
    state.isPlaying = true;
    state.speed = 1;
    state.zoom = 1;
    state.brightness = 1;
    state.isLandscape = false;
    state.loop = false;
    if (els.video.mozAudioChannelType) {
      els.video.mozAudioChannelType = "content";
    }
    els.pFilename.textContent = v.name;
    els.video.src = v.url;
    els.video.playbackRate = 1;
    els.video.style.transform = "scale(1)";
    setBrightness(1);
    els.playerContainer.classList.remove("landscape-mode");
    showView("PLAYER");
    els.video.currentTime = startTime;
    var promise = els.video.play();
    if (promise !== void 0) {
      promise.then(function() {
        state.isPlaying = true;
        showControls();
      }).catch(function(error) {
        console.error("Play error", error);
      });
    }
  }
  function seek(amt) {
    els.video.currentTime += amt;
    showFeedback(amt > 0 ? "+5s" : "-5s");
  }
  function toggleMute() {
    state.isMuted = !state.isMuted;
    VolumeControl.setMute(els.video, state.isMuted);
  }
  VolumeControl.observeMediaVolume(els.video, function(volume, muted) {
    state.volume = volume;
    state.isMuted = muted;
    if (muted) {
      els.pMuted.classList.remove("hidden");
      showFeedback("MUTED");
    } else {
      els.pMuted.classList.add("hidden");
      showFeedback("Volume: " + Math.round(volume * 100) + "%", true);
    }
  });
  function setZoom(delta) {
    if (delta === 0) state.zoom = 1;
    else state.zoom = Math.max(0.5, Math.min(3, state.zoom + delta));
    els.video.style.transform = "scale(" + state.zoom + ")";
    showFeedback("Zoom: " + Math.round(state.zoom * 100) + "%");
  }
  function setBrightness(val) {
    state.brightness = Math.max(0.1, Math.min(1, val));
    var opacity = 1 - state.brightness;
    els.brightOverlay.style.opacity = opacity;
    showFeedback("Brightness: " + Math.round(state.brightness * 10) * 10 + "%", true);
  }
  function showControls() {
    els.playerHeader.classList.remove("hidden");
    els.playerControls.classList.remove("hidden");
    if (TIMEOUTS.controls) clearTimeout(TIMEOUTS.controls);
    TIMEOUTS.controls = setTimeout(function() {
      if (!els.video.paused && !state.activeOverlay) {
        els.playerHeader.classList.add("hidden");
        els.playerControls.classList.add("hidden");
      }
    }, 4e3);
  }
  function showFeedback(text, showBar) {
    els.pFbText.textContent = text;
    els.pFeedback.classList.remove("hidden");
    if (showBar) {
      els.pFbBar.classList.remove("hidden");
      var pct = parseFloat(text.replace(/[^0-9.]/g, ""));
      if (!isNaN(pct)) els.pFbFill.style.width = pct + "%";
    } else {
      els.pFbBar.classList.add("hidden");
    }
    if (TIMEOUTS.feedback) clearTimeout(TIMEOUTS.feedback);
    TIMEOUTS.feedback = setTimeout(function() {
      els.pFeedback.classList.add("hidden");
    }, 1e3);
  }
  els.video.ontimeupdate = function() {
    var cur = els.video.currentTime;
    var dur = els.video.duration;
    state.currentTime = cur;
    state.duration = dur;
    els.pTimeCur.textContent = formatTime(cur);
    if (!isNaN(dur) && dur > 0) {
      els.pTimeDur.textContent = formatTime(dur);
      els.pProgress.style.width = cur / dur * 100 + "%";
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
  var StorageAPI = {
    /**
     * Get all storage instances for a specific type
     * @param {string} type - 'sdcard', 'pictures', 'videos', 'music'
     * @returns {DeviceStorage[]}
     */
    getStorages: function(type) {
      type = type || "sdcard";
      try {
        console.log("Requesting all storages for type: " + type);
        var results = [];
        if (navigator.getDeviceStorages) {
          var storages = navigator.getDeviceStorages(type);
          if (storages && storages.length > 0) {
            for (var i = 0; i < storages.length; i++) {
              results.push(storages[i]);
            }
          }
        }
        if (navigator.getDeviceStorage) {
          var storage = navigator.getDeviceStorage(type);
          if (storage) {
            var exists = false;
            for (var j = 0; j < results.length; j++) {
              if (results[j] === storage) {
                exists = true;
                break;
              }
            }
            if (!exists) results.push(storage);
          }
        }
        if (navigator.b2g) {
          if (navigator.b2g.getDeviceStorages) {
            var b2gStorages = navigator.b2g.getDeviceStorages(type);
            if (b2gStorages && b2gStorages.length > 0) {
              for (var k = 0; k < b2gStorages.length; k++) {
                var s = b2gStorages[k];
                var sExists = false;
                for (var l = 0; l < results.length; l++) {
                  if (results[l] === s) {
                    sExists = true;
                    break;
                  }
                }
                if (!sExists) results.push(s);
              }
            }
          }
          if (navigator.b2g.getDeviceStorage) {
            var b2gStorage = navigator.b2g.getDeviceStorage(type);
            if (b2gStorage) {
              var b2gExists = false;
              for (var m = 0; m < results.length; m++) {
                if (results[m] === b2gStorage) {
                  b2gExists = true;
                  break;
                }
              }
              if (!b2gExists) results.push(b2gStorage);
            }
          }
        }
        console.log("Found " + results.length + " storage(s) for type: " + type);
        return results;
      } catch (e) {
        console.error("StorageAPI Error in getStorages:", e);
        return [];
      }
    },
    /**
     * Get the storage instance for a specific type (default 'sdcard')
     * @param {string} type - 'sdcard', 'pictures', 'videos', 'music'
     * @returns {DeviceStorage|null}
     */
    getStorage: function(type) {
      var storages = this.getStorages(type || "sdcard");
      return storages.length > 0 ? storages[0] : null;
    },
    /**
     * Enumerate files in the storage
     * @param {Object} options - { type, extensions, path }
     * @returns {Promise<File[]>}
     */
    enumerateFiles: function(options) {
      options = options || {};
      var type = options.type || "sdcard";
      var extensions = options.extensions || "*";
      var path = options.path || "";
      var storages = this.getStorages(type);
      if (storages.length === 0) {
        return Promise.resolve([]);
      }
      var self = this;
      var allFilesPromises = storages.map(function(storage) {
        return new Promise(function(resolve) {
          var files = [];
          var cursor = storage.enumerate(path);
          cursor.onsuccess = function() {
            var file = this.result;
            if (file) {
              var fileName = file.name.toLowerCase();
              var isMatch = extensions === "*" || Array.isArray(extensions) && extensions.some(function(ext) {
                return fileName.endsWith(ext.toLowerCase());
              }) || typeof extensions === "string" && fileName.endsWith(extensions.toLowerCase());
              if (isMatch) {
                files.push(file);
              }
              if (!this.done) {
                this.continue();
              } else {
                resolve(files);
              }
            } else {
              resolve(files);
            }
          };
          cursor.onerror = function() {
            console.error("Cursor error for storage " + type + ":", this.error);
            resolve(files);
          };
        });
      });
      return Promise.all(allFilesPromises).then(function(results) {
        var flattened = [];
        results.forEach(function(resList) {
          flattened = flattened.concat(resList);
        });
        var uniqueFiles = [];
        var seenPaths = {};
        flattened.forEach(function(f) {
          if (!seenPaths[f.name]) {
            seenPaths[f.name] = true;
            uniqueFiles.push(f);
          }
        });
        return uniqueFiles;
      });
    },
    /**
     * Get a specific file by name
     * @param {string} name 
     * @param {string} type 
     * @returns {Promise<File>}
     */
    getFile: function(name, type) {
      var storage = this.getStorage(type || "sdcard");
      return new Promise(function(resolve, reject) {
        if (!storage) return reject(new Error("Storage not found"));
        var request = storage.get(name);
        request.onsuccess = function() {
          resolve(request.result);
        };
        request.onerror = function() {
          reject(request.error);
        };
      });
    },
    /**
     * Add a file to storage
     * @param {Blob} blob 
     * @param {string} name 
     * @param {string} type 
     * @returns {Promise<File>}
     */
    addFile: function(blob, name, type) {
      var storage = this.getStorage(type || "sdcard");
      return new Promise(function(resolve, reject) {
        if (!storage) return reject(new Error("Storage not found"));
        var request = storage.addNamed(blob, name);
        request.onsuccess = function() {
          resolve(request.result);
        };
        request.onerror = function() {
          reject(request.error);
        };
      });
    },
    /**
     * Delete a file from storage
     * @param {string} name 
     * @param {string} type 
     * @returns {Promise<void>}
     */
    deleteFile: function(name, type) {
      var storage = this.getStorage(type || "sdcard");
      return new Promise(function(resolve, reject) {
        if (!storage) return reject(new Error("Storage not found"));
        var request = storage.delete(name);
        request.onsuccess = function() {
          resolve();
        };
        request.onerror = function() {
          reject(request.error);
        };
      });
    },
    /**
     * Get free space in bytes
     * @param {string} type 
     * @returns {Promise<number>}
     */
    getFreeSpace: function(type) {
      var storage = this.getStorage(type || "sdcard");
      return new Promise(function(resolve, reject) {
        if (!storage) return reject(new Error("Storage not found"));
        var request = storage.freeSpace();
        request.onsuccess = function() {
          resolve(request.result);
        };
        request.onerror = function() {
          reject(request.error);
        };
      });
    }
  };
  if (typeof window !== "undefined") {
    window.StorageAPI = StorageAPI;
  }
  function scanStorage() {
    showToast("Scanning...");
    StorageAPI.enumerateFiles({
      type: "videos",
      extensions: [".mp4", ".mkv", ".webm", ".3gp", ".avi"]
    }).then(function(files) {
      var found = [];
      files.forEach(function(file) {
        var cleanName = file.name.split("/").pop();
        found.push({
          id: file.name + "_" + file.size,
          name: cleanName,
          path: file.name,
          url: URL.createObjectURL(file),
          type: file.type || "video/unknown",
          size: file.size,
          duration: 0
          // Will be updated by ThumbQueue
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
      console.error("Scan error:", err);
      showToast("Scan error");
      updateSoftKeys();
    });
  }
  function handleFiles(files) {
    var count = files.length;
    for (var i = 0; i < count; i++) {
      var f = files[i];
      state.videos.push({
        id: f.name + "_" + f.size,
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
      StorageAPI.deleteFile(vid.path, "videos").then(function() {
        state.videos = state.videos.filter(function(v) {
          return v.id !== vid.id;
        });
        state.filteredVideos = state.videos;
        state.index = 0;
        renderList(els.videoList, state.filteredVideos);
        showToast("Deleted");
      }).catch(function(err) {
        console.error("Delete error:", err);
        showToast("Delete failed");
      });
    }
  }
  function sortVideos(criteria) {
    var sortFn = function(a, b) {
      if (criteria === "name") return a.name.localeCompare(b.name);
      return b.size - a.size;
    };
    state.videos.sort(sortFn);
    state.filteredVideos.sort(sortFn);
    els.videoList.innerHTML = "";
    renderList(els.videoList, state.filteredVideos);
    showToast("Sorted by " + (criteria === "name" ? "Name" : "Size"));
  }
  function executeAction(action) {
    if (action === "scan") scanStorage();
    if (action === "sort-name") sortVideos("name");
    if (action === "sort-size") sortVideos("size");
    if (action === "delete") deleteCurrentVideo();
    if (action === "exit") window.close();
    if (action === "shortcuts") openOverlay("shortcuts-dialog");
    if (action === "jumpto") openOverlay("jumpto-dialog");
    if (action === "speed") {
      var speeds = [0.5, 1, 1.25, 1.5, 2];
      var idx = speeds.indexOf(state.speed);
      state.speed = speeds[(idx + 1) % speeds.length];
      els.video.playbackRate = state.speed;
      showFeedback("Speed: " + state.speed + "x");
    }
    if (action === "loop") {
      state.loop = !state.loop;
      showFeedback(state.loop ? "Loop: ON" : "Loop: OFF");
    }
    if (action === "info") openOverlay("info-dialog");
  }
  function handleKey(e) {
    var key = e.key;
    if (key === "SoftLeft" || key === "F1") key = "F1";
    if (key === "SoftRight" || key === "F2") key = "F2";
    if (key === "Enter" || key === "SoftCenter") key = "Enter";
    if (key === "Backspace") {
      e.preventDefault();
    }
    if (state.activeOverlay) {
      handleOverlayKey(key);
      return;
    }
    if (state.view === "LIBRARY") {
      handleLibraryKey(key);
    } else if (state.view === "SEARCH") {
      handleSearchKey(key);
    } else if (state.view === "PLAYER") {
      handlePlayerKey(key, e);
    }
  }
  function handleLibraryKey(key) {
    switch (key) {
      case "ArrowUp":
        if (state.index > 0) {
          state.index--;
        } else {
          state.index = state.filteredVideos.length - 1;
        }
        renderList(els.videoList, state.filteredVideos);
        break;
      case "ArrowDown":
        if (state.index < state.filteredVideos.length - 1) {
          state.index++;
        } else {
          state.index = 0;
        }
        renderList(els.videoList, state.filteredVideos);
        break;
      case "Enter":
        if (state.filteredVideos.length > 0) {
          prepareVideo(state.filteredVideos[state.index]);
        } else {
          var input = document.createElement("input");
          input.type = "file";
          input.accept = "video/*";
          input.onchange = function(e) {
            handleFiles(e.target.files);
          };
          input.click();
        }
        break;
      case "F1":
        openOverlay("library-menu");
        break;
      case "F2":
        state.searchQuery = "";
        showView("SEARCH");
        break;
    }
  }
  function handleSearchKey(key) {
    if (document.activeElement === els.searchInput) {
      if (key === "ArrowDown" || key === "Enter") {
        els.searchInput.blur();
        state.index = 0;
        renderList(els.searchResults, state.filteredVideos);
        updateSoftKeys();
        return;
      }
      return;
    }
    if (document.activeElement !== els.searchInput) {
      if (key === "ArrowUp") {
        if (state.index > 0) {
          state.index--;
        } else {
          state.index = state.filteredVideos.length - 1;
        }
        renderList(els.searchResults, state.filteredVideos);
        return;
      } else if (key === "ArrowDown") {
        if (state.index < state.filteredVideos.length - 1) {
          state.index++;
        } else {
          state.index = 0;
        }
        renderList(els.searchResults, state.filteredVideos);
        return;
      }
    }
    switch (key) {
      case "Enter":
        if (state.filteredVideos.length > 0) {
          prepareVideo(state.filteredVideos[state.index]);
        }
        break;
      case "F2":
      // Cancel
      case "Backspace":
        els.searchInput.blur();
        state.searchQuery = "";
        state.filteredVideos = state.videos;
        state.index = 0;
        showView("LIBRARY");
        break;
    }
  }
  function handleOverlayKey(key) {
    var overlay = state.activeOverlay;
    if (overlay === "resume-dialog") {
      if (key === "F1") {
        closeOverlay();
        startVideo(0);
      } else if (key === "Enter") {
        closeOverlay();
        startVideo(state.resumeTime);
      } else if (key === "Backspace" || key === "F2") {
        closeOverlay();
        showView("LIBRARY");
      }
      return;
    }
    if (overlay === "jumpto-dialog") {
      if (key === "Backspace" || key === "F2") {
        closeOverlay();
      } else if (key === "Enter") {
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
    if (overlay === "info-dialog" || overlay === "shortcuts-dialog") {
      if (overlay === "info-dialog") {
        if (key === "ArrowDown") els.infoScroll.scrollTop += 30;
        if (key === "ArrowUp") els.infoScroll.scrollTop -= 30;
      }
      if (key === "Enter" || key === "Backspace" || key === "F2" || key === "SoftCenter") closeOverlay();
      return;
    }
    var listId = overlay === "library-menu" ? "list-menu-library" : "list-menu-options";
    var listEl = document.getElementById(listId);
    var items = listEl.querySelectorAll("li");
    if (key === "ArrowUp") {
      if (state.menuIndex > 0) {
        state.menuIndex--;
      } else {
        state.menuIndex = items.length - 1;
      }
      renderMenu(listId, null, state.menuIndex);
    } else if (key === "ArrowDown") {
      if (state.menuIndex < items.length - 1) {
        state.menuIndex++;
      } else {
        state.menuIndex = 0;
      }
      renderMenu(listId, null, state.menuIndex);
    } else if (key === "Enter") {
      var action = items[state.menuIndex].dataset.action;
      closeOverlay();
      executeAction(action);
    } else if (key === "Backspace" || key === "F2") {
      closeOverlay();
    }
  }
  function handlePlayerKey(key, e) {
    if (key === "Backspace") {
      if (els.video.currentTime > 0) {
        saveProgress(state.videoToResume.id, els.video.currentTime);
      }
      els.video.pause();
      state.isPlaying = false;
      showView("LIBRARY");
      return;
    }
    if (key === "F2") {
      els.video.pause();
      state.isPlaying = false;
      showControls();
      openOverlay("options-menu");
      return;
    }
    if (key === "F1") {
      state.isLandscape = !state.isLandscape;
      if (state.isLandscape) {
        document.body.classList.add("is-landscape");
        els.playerContainer.classList.add("landscape-mode");
      } else {
        document.body.classList.remove("is-landscape");
        els.playerContainer.classList.remove("landscape-mode");
      }
      return;
    }
    if (key === "Enter") {
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
    if (key === "VolumeUp") {
      VolumeControl.volumeUp();
      return;
    }
    if (key === "VolumeDown") {
      VolumeControl.volumeDown();
      return;
    }
    if (key === "ArrowUp") {
      VolumeControl.volumeUp();
      return;
    }
    if (key === "ArrowDown") {
      VolumeControl.volumeDown();
      return;
    }
    if (key === "ArrowLeft") seek(-5);
    if (key === "ArrowRight") seek(5);
    if (key === "4") setBrightness(state.brightness - 0.1);
    if (key === "6") setBrightness(state.brightness + 0.1);
    if (key === "0") toggleMute();
    if (key === "1") setZoom(-0.25);
    if (key === "3") setZoom(0.25);
    if (key === "5") setZoom(0);
    showControls();
  }
  function openOverlay(name) {
    state.activeOverlay = name;
    state.menuIndex = 0;
    if (name === "library-menu") {
      els.menuLib.classList.remove("hidden");
      renderMenu("list-menu-library", null, 0);
    } else if (name === "options-menu") {
      els.menuOpt.classList.remove("hidden");
      document.getElementById("opt-speed").textContent = "Speed: " + state.speed + "x";
      document.getElementById("opt-loop").textContent = "Loop: " + (state.loop ? "On" : "Off");
      renderMenu("list-menu-options", null, 0);
    } else if (name === "resume-dialog") {
      els.dialogResume.classList.remove("hidden");
      els.resumeTimeText.textContent = formatTime(state.resumeTime);
    } else if (name === "jumpto-dialog") {
      state.jumpInput = "";
      updateJumpText();
      els.dialogJump.classList.remove("hidden");
    } else if (name === "info-dialog") {
      populateInfo();
      els.dialogInfo.classList.remove("hidden");
    } else if (name === "shortcuts-dialog") {
      els.dialogShortcuts.classList.remove("hidden");
    }
    updateSoftKeys();
  }
  function closeOverlay() {
    state.activeOverlay = null;
    var overlays = document.querySelectorAll(".menu-overlay, .dialog-overlay");
    for (var i = 0; i < overlays.length; i++) {
      overlays[i].classList.add("hidden");
    }
    updateSoftKeys();
  }
  window.addEventListener("load", function() {
    document.addEventListener("keydown", handleKey);
    els.searchInput.addEventListener("input", function(e) {
      var val = e.target.value;
      state.searchQuery = val;
      if (val.trim() === "") {
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
      updateSoftKeys();
      showToast("Press Menu > Scan (Simulator)");
    }
  });
})();
