"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("core-js/stable");
var api_1 = require("./api");
var state = {
    view: 'SEARCH',
    query: '',
    videos: [],
    suggestions: [],
    cursor: 0,
    isPlaying: false,
    volume: 1.0,
    brightness: 1.0,
    isSuggesting: false,
    activeOverlay: null,
    jumpInput: '',
    isMuted: false,
    menuIndex: 0,
    downloadOptions: [],
};
var els = {
    headerTitle: document.getElementById('header-title'),
    searchInput: document.getElementById('search-input'),
    videoList: document.getElementById('video-list'),
    viewSearch: document.getElementById('view-search'),
    viewPlayer: document.getElementById('view-player'),
    video: document.getElementById('main-video'),
    skLeft: document.getElementById('sk-left'),
    skCenter: document.getElementById('sk-center'),
    skRight: document.getElementById('sk-right'),
    playerFilename: document.getElementById('player-filename'),
    playerMutedIcon: document.getElementById('player-muted-icon'),
    progressFill: document.getElementById('progress-fill'),
    timeCurrent: document.getElementById('time-current'),
    timeDuration: document.getElementById('time-duration'),
    statusText: document.getElementById('status-text'),
    toast: document.getElementById('toast'),
    feedback: document.getElementById('player-feedback'),
    feedbackText: document.getElementById('feedback-text'),
    feedbackBar: document.getElementById('feedback-bar-container'),
    feedbackFill: document.getElementById('feedback-bar-fill'),
    menuMain: document.getElementById('menu-main'),
    menuHeader: document.getElementById('menu-header'),
    listMenuMain: document.getElementById('list-menu-main'),
    dialogJump: document.getElementById('dialog-jumpto'),
    jumpText: document.getElementById('jumpto-text'),
};
var VolumeControl = {
    volumeUp: function () {
        var vm = navigator.volumeManager;
        if (vm)
            vm.requestUp();
        else {
            state.volume = Math.min(1, state.volume + 0.1);
            els.video.volume = state.volume;
            showFeedback('Volume', state.volume);
        }
    },
    volumeDown: function () {
        var vm = navigator.volumeManager;
        if (vm)
            vm.requestDown();
        else {
            state.volume = Math.max(0, state.volume - 0.1);
            els.video.volume = state.volume;
            showFeedback('Volume', state.volume);
        }
    },
    setMute: function (shouldMute) {
        state.isMuted = shouldMute;
        els.video.muted = shouldMute;
        if (shouldMute)
            els.playerMutedIcon.classList.remove('hidden');
        else
            els.playerMutedIcon.classList.add('hidden');
        showFeedback(shouldMute ? 'Muted' : 'Unmuted');
    },
    observeMediaVolume: function (mediaElement, callback) {
        if (!mediaElement)
            return;
        mediaElement.addEventListener('volumechange', function () {
            callback(mediaElement.volume, mediaElement.muted);
        });
    }
};
VolumeControl.observeMediaVolume(els.video, function (volume, muted) {
    state.volume = volume;
    state.isMuted = muted;
    if (muted)
        els.playerMutedIcon.classList.remove('hidden');
    else
        els.playerMutedIcon.classList.add('hidden');
});
var feedbackTimeout = null;
function showFeedback(text, val) {
    els.feedback.classList.remove('hidden');
    els.feedbackText.textContent = text;
    if (val !== undefined) {
        els.feedbackBar.classList.remove('hidden');
        els.feedbackFill.style.width = (val * 100) + '%';
    }
    else {
        els.feedbackBar.classList.add('hidden');
    }
    if (feedbackTimeout)
        clearTimeout(feedbackTimeout);
    feedbackTimeout = setTimeout(function () { return els.feedback.classList.add('hidden'); }, 1500);
}
function updateJumpText() {
    var p = state.jumpInput.padStart(6, '0');
    els.jumpText.textContent = p.slice(0, 2) + ':' + p.slice(2, 4) + ':' + p.slice(4, 6);
}
function parseJumpTime(str) {
    var p = str.padStart(6, '0');
    var h = parseInt(p.slice(0, 2));
    var m = parseInt(p.slice(2, 4));
    var s = parseInt(p.slice(4, 6));
    return (h * 3600) + (m * 60) + s;
}
function openOverlay(name) {
    state.activeOverlay = name;
    if (name === 'menu-main') {
        els.menuMain.classList.remove('hidden');
        state.menuIndex = 0;
        renderMenu();
    }
    else if (name === 'dialog-jumpto') {
        state.jumpInput = '';
        updateJumpText();
        els.dialogJump.classList.remove('hidden');
    }
    updateSoftKeys();
}
function toggleFullscreen() {
    var doc = document;
    var container = document.documentElement;
    var isFull = doc.fullscreenElement || doc.mozFullScreenElement || doc.webkitFullscreenElement;
    if (!isFull) {
        if (container.requestFullscreen)
            container.requestFullscreen();
        else if (doc.mozRequestFullScreen)
            doc.mozRequestFullScreen();
        else if (container.mozRequestFullScreen)
            container.mozRequestFullScreen();
    }
    else {
        if (doc.exitFullscreen)
            doc.exitFullscreen();
        else if (doc.mozCancelFullScreen)
            doc.mozCancelFullScreen();
    }
}
function updateOrientation(video) {
    var screenObj = window.screen;
    if (screenObj.mozLockOrientation) {
        var aspect = video.videoWidth / video.videoHeight;
        if (aspect > 1.1) {
            screenObj.mozLockOrientation('landscape-primary');
        }
        else {
            screenObj.mozLockOrientation('portrait-primary');
        }
    }
}
function renderMenu() {
    els.listMenuMain.innerHTML = '';
    var items = [];
    if (state.activeOverlay === 'menu-quality') {
        els.menuHeader.textContent = 'Select Quality';
        state.downloadOptions.forEach(function (opt, idx) {
            var sizeStr = formatBytes(opt.size);
            items.push({
                label: "".concat(opt.type, " - ").concat(opt.q, " (").concat(sizeStr, ")"),
                action: "select-quality-".concat(idx)
            });
        });
    }
    else {
        els.menuHeader.textContent = 'Menu';
        if (state.view === 'SEARCH') {
            items.push({ label: 'Download as Video', action: 'dl-video' });
            items.push({ label: 'Download as MP3', action: 'dl-mp3' });
        }
        else if (state.view === 'PLAYER') {
            items.push({ label: 'Toggle Full Screen', action: 'fullscreen' });
            items.push({ label: 'Jump to Time', action: 'jumpto' });
        }
        items.push({ label: 'About Kaitube', action: 'about' });
        items.push({ label: 'Exit', action: 'exit' });
    }
    items.forEach(function (item, idx) {
        var li = document.createElement('li');
        li.textContent = item.label;
        li.dataset.action = item.action;
        if (idx === state.menuIndex)
            li.classList.add('active');
        els.listMenuMain.appendChild(li);
    });
}
function closeOverlay() {
    state.activeOverlay = null;
    els.menuMain.classList.add('hidden');
    els.dialogJump.classList.add('hidden');
    updateSoftKeys();
}
function updateMenuSelection() {
    var items = els.listMenuMain.querySelectorAll('li');
    items.forEach(function (item, idx) {
        if (idx === state.menuIndex) {
            item.classList.add('active');
            scrollToCenter(item, els.listMenuMain);
        }
        else {
            item.classList.remove('active');
        }
    });
}
function triggerSystemDownload(url, filename) {
    var safeName = filename.replace(/[^a-z0-9\.]/gi, '_');
    try {
        showToast("Requesting Download...");
        var iframe_1 = document.createElement('iframe');
        // @ts-ignore - mozbrowser and remote are KaiOS specific
        iframe_1.setAttribute('mozbrowser', 'true');
        // @ts-ignore
        iframe_1.setAttribute('remote', 'true');
        iframe_1.src = 'about:blank';
        iframe_1.style.display = 'none';
        document.body.appendChild(iframe_1);
        setTimeout(function () {
            try {
                // @ts-ignore - .download() is a KaiOS mozbrowser extension
                var req = iframe_1.download(url, { filename: safeName });
                req.onsuccess = function () {
                    showToast("Started!");
                    setTimeout(function () { return iframe_1.remove(); }, 2000);
                };
                req.onerror = function () {
                    showToast("Error. Opening Browser");
                    window.open(url, '_blank');
                    iframe_1.remove();
                };
            }
            catch (e) {
                showToast("Direct download failed");
                window.open(url, '_blank');
                iframe_1.remove();
            }
        }, 500);
    }
    catch (e) {
        showToast("Download Error");
        console.error(e);
    }
}
function downloadMedia(type) {
    var vid = state.videos[state.cursor];
    if (!vid)
        return;
    showToast("Getting download links...");
    var youtubeUrl = "https://www.youtube.com/watch?v=".concat(vid.id);
    (0, api_1.catchYoutubeURL)(youtubeUrl, function (data) {
        var streamingData = data.streamingData;
        var options = [];
        if (type === 'VIDEO') {
            if (streamingData.formats) {
                streamingData.formats.forEach(function (f) {
                    options.push({
                        type: 'VIDEO',
                        q: f.qualityLabel,
                        size: parseInt(f.contentLength || '0', 10),
                        url: f.url,
                        ext: 'mp4'
                    });
                });
            }
        }
        else {
            if (streamingData.adaptiveFormats) {
                streamingData.adaptiveFormats.forEach(function (f) {
                    if (f.mimeType && f.mimeType.startsWith('audio/mp4')) {
                        var br = f.bitrate ? Math.round(f.bitrate / 1000) + 'k' : 'HQ';
                        options.push({
                            type: 'AUDIO',
                            q: br,
                            size: parseInt(f.contentLength || '0', 10),
                            url: f.url,
                            ext: 'm4a'
                        });
                    }
                });
            }
        }
        if (options.length === 0) {
            showToast("No download link found");
            return;
        }
        state.downloadOptions = options;
        openOverlay('menu-quality');
    }, function (msg) {
        showToast(msg);
    });
}
function executeAction(action) {
    if (action === 'jumpto') {
        openOverlay('dialog-jumpto');
    }
    else if (action === 'fullscreen') {
        toggleFullscreen();
    }
    else if (action === 'dl-video') {
        downloadMedia('VIDEO');
    }
    else if (action === 'dl-mp3') {
        downloadMedia('AUDIO');
    }
    else if (action.startsWith('select-quality-')) {
        var idx = parseInt(action.replace('select-quality-', ''), 10);
        var opt = state.downloadOptions[idx];
        var vid = state.videos[state.cursor];
        var fileName = vid.title.replace(/[/\\?%*:|"<>]/g, '-') + '.' + opt.ext;
        triggerSystemDownload(opt.url, fileName);
    }
    else if (action === 'about') {
        showToast("Kaitube v1.0");
    }
    else if (action === 'exit') {
        window.close();
    }
}
function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.remove('hidden');
    setTimeout(function () { return els.toast.classList.add('hidden'); }, 2000);
}
function formatBytes(bytes, decimals) {
    if (decimals === void 0) { decimals = 2; }
    if (bytes === 0)
        return '0 B';
    var k = 1024;
    var dm = decimals < 0 ? 0 : decimals;
    var sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
function formatTime(seconds) {
    if (isNaN(seconds))
        return "00:00";
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    var s = Math.floor(seconds % 60);
    return (h > 0 ? h + ":" : "") + (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
}
function showView(viewName) {
    state.view = viewName;
    document.body.className = 'view-' + viewName.toLowerCase();
    els.viewSearch.classList.add('hidden');
    els.viewPlayer.classList.add('hidden');
    if (viewName === 'SEARCH') {
        els.viewSearch.classList.remove('hidden');
        updateSoftKeys();
    }
    else if (viewName === 'PLAYER') {
        els.viewPlayer.classList.remove('hidden');
        updateSoftKeys();
    }
}
function updateSoftKeys() {
    if (state.view === 'SEARCH') {
        els.skLeft.textContent = 'Options';
        if (state.isSuggesting) {
            els.skCenter.textContent = 'SELECT';
        }
        else {
            els.skCenter.textContent = document.activeElement === els.searchInput ? 'SEARCH' : 'PLAY';
        }
        els.skRight.textContent = 'Exit';
    }
    else if (state.view === 'PLAYER') {
        els.skLeft.textContent = 'Options';
        els.skCenter.textContent = state.isPlaying ? 'PAUSE' : 'RESUME';
        els.skRight.textContent = 'Back';
    }
}
function scrollToCenter(el, container) {
    var elTop = el.offsetTop;
    var elH = el.offsetHeight;
    var conH = container.clientHeight;
    container.scrollTop = elTop - (conH / 2) + (elH / 2);
}
function updateActiveItem() {
    var items = els.videoList.querySelectorAll('.list-item');
    items.forEach(function (item, idx) {
        if (idx === state.cursor) {
            item.classList.add('active');
            scrollToCenter(item, els.videoList);
        }
        else {
            item.classList.remove('active');
        }
    });
    updateSoftKeys();
}
function renderSuggestions() {
    state.isSuggesting = true;
    els.videoList.innerHTML = '';
    if (state.suggestions.length === 0) {
        state.isSuggesting = false;
        if (state.videos.length > 0)
            renderVideos();
        else
            els.videoList.innerHTML = '<div class="empty-state">Enter a search query</div>';
        return;
    }
    state.suggestions.forEach(function (sug, idx) {
        var item = document.createElement('div');
        item.className = 'list-item' + (idx === state.cursor ? ' active' : '');
        item.innerHTML = "<div class=\"item-info\"><span class=\"item-name\">".concat(sug, "</span></div>");
        els.videoList.appendChild(item);
        if (idx === state.cursor)
            item.scrollIntoView({ block: 'center' });
    });
    updateSoftKeys();
}
function renderVideos() {
    state.isSuggesting = false;
    if (state.videos.length === 0) {
        els.videoList.innerHTML = '<div class="empty-state">No results found</div>';
        return;
    }
    els.videoList.innerHTML = '';
    state.videos.forEach(function (vid, idx) {
        var item = document.createElement('div');
        item.className = 'list-item' + (idx === state.cursor ? ' active' : '');
        item.innerHTML = "\n            <div class=\"thumb\"><img src=\"".concat(vid.thumb, "\"></div>\n            <div class=\"item-info\">\n                <span class=\"item-name\">").concat(vid.title, "</span>\n                <div class=\"item-meta\">\n                    <span>").concat(vid.channel, "</span>\n                    <span>").concat(vid.time, "</span>\n                </div>\n            </div>\n        ");
        els.videoList.appendChild(item);
        if (idx === state.cursor) {
            item.scrollIntoView({ block: 'center' });
        }
    });
    updateSoftKeys();
}
function handleSearch(q) {
    var query = q || els.searchInput.value.trim();
    if (!query)
        return;
    if (q)
        els.searchInput.value = q;
    state.query = query;
    state.suggestions = []; // Clear suggestions after search
    els.searchInput.blur();
    showToast("Searching...");
    (0, api_1.performSearch)(query, function (videos) {
        state.videos = videos;
        state.cursor = 0;
        renderVideos();
    }, function () {
        showToast("Search failed");
    });
}
var suggestionTimeout = null;
els.searchInput.oninput = function () {
    var q = els.searchInput.value.trim();
    if (suggestionTimeout)
        clearTimeout(suggestionTimeout);
    if (q.length > 1) {
        suggestionTimeout = setTimeout(function () {
            (0, api_1.getSuggestions)(q, function (sugs) {
                // Limit to 3 suggestions as in script.js
                state.suggestions = sugs.slice(0, 3);
                if (document.activeElement === els.searchInput && q.length > 1) {
                    state.cursor = 0;
                    renderSuggestions();
                }
            });
        }, 500); // 500ms delay as in script.js
    }
    else {
        state.suggestions = [];
        if (document.activeElement === els.searchInput) {
            if (state.videos.length > 0) {
                state.cursor = 0;
                renderVideos();
            }
            else {
                els.videoList.innerHTML = '<div class="empty-state">Enter a search query</div>';
            }
        }
    }
};
function playVideo(vid) {
    showToast("Loading...");
    var youtubeUrl = "https://www.youtube.com/watch?v=".concat(vid.id);
    (0, api_1.catchYoutubeURL)(youtubeUrl, function (data) {
        var streamingData = data.streamingData;
        var url = '';
        if (streamingData.formats && streamingData.formats.length > 0) {
            var format = streamingData.formats.find(function (f) { return f.qualityLabel === '360p'; }) || streamingData.formats[0];
            url = format.url;
        }
        if (!url) {
            showToast("No playable format");
            return;
        }
        els.playerFilename.textContent = vid.title;
        els.video.src = url;
        showView('PLAYER');
        els.video.play();
    }, function (msg) {
        showToast(msg);
    });
}
els.video.onloadedmetadata = function () {
    updateOrientation(els.video);
};
els.video.onplay = function () {
    state.isPlaying = true;
    els.statusText.textContent = "PLAYING";
    updateSoftKeys();
};
els.video.onpause = function () {
    state.isPlaying = false;
    els.statusText.textContent = "PAUSED";
    updateSoftKeys();
};
els.video.ontimeupdate = function () {
    var cur = els.video.currentTime;
    var dur = els.video.duration;
    els.timeCurrent.textContent = formatTime(cur);
    if (!isNaN(dur)) {
        els.timeDuration.textContent = formatTime(dur);
        els.progressFill.style.width = (cur / dur * 100) + '%';
    }
};
window.addEventListener('keydown', function (e) {
    if (state.activeOverlay) {
        if (e.key === 'ArrowUp') {
            if (state.activeOverlay === 'menu-main') {
                if (state.menuIndex > 0)
                    state.menuIndex--;
                updateMenuSelection();
            }
        }
        else if (e.key === 'ArrowDown') {
            if (state.activeOverlay === 'menu-main') {
                var max = els.listMenuMain.querySelectorAll('li').length;
                if (state.menuIndex < max - 1)
                    state.menuIndex++;
                updateMenuSelection();
            }
        }
        else if (e.key === 'Enter') {
            if (state.activeOverlay === 'menu-main') {
                var items = els.listMenuMain.querySelectorAll('li');
                var action = items[state.menuIndex].dataset.action;
                if (action) {
                    closeOverlay();
                    executeAction(action);
                }
            }
            else if (state.activeOverlay === 'dialog-jumpto') {
                var sec = parseJumpTime(state.jumpInput);
                els.video.currentTime = sec;
                closeOverlay();
            }
        }
        else if (e.key === 'SoftRight' || e.key === 'Backspace') {
            closeOverlay();
            e.preventDefault();
        }
        else if (!isNaN(parseInt(e.key)) && state.activeOverlay === 'dialog-jumpto') {
            if (state.jumpInput.length < 6) {
                state.jumpInput += e.key;
                updateJumpText();
            }
        }
        return;
    }
    if (state.view === 'SEARCH') {
        if (document.activeElement === els.searchInput) {
            if (e.key === 'Enter') {
                handleSearch();
            }
            else if (e.key === 'ArrowDown') {
                // Check if there are any items we can scroll to
                var hasItems = els.videoList.querySelectorAll('.list-item').length > 0;
                if (hasItems) {
                    els.searchInput.blur();
                    state.cursor = 0;
                    updateActiveItem();
                    e.preventDefault();
                }
            }
            else if (e.key === 'SoftLeft') {
                openOverlay('menu-main');
            }
            else if (e.key === 'SoftRight' || e.key === 'EndCall') {
                window.close();
            }
        }
        else {
            if (e.key === 'ArrowUp') {
                if (state.cursor > 0) {
                    state.cursor--;
                    updateActiveItem();
                }
                else {
                    els.searchInput.focus();
                    state.cursor = -1; // Reset cursor when going back to input
                    // Remove active state from all items
                    els.videoList.querySelectorAll('.list-item').forEach(function (i) { return i.classList.remove('active'); });
                    updateSoftKeys();
                }
                e.preventDefault();
            }
            else if (e.key === 'ArrowDown') {
                var max = state.isSuggesting ? state.suggestions.length : state.videos.length;
                if (state.cursor < max - 1) {
                    state.cursor++;
                    updateActiveItem();
                }
                e.preventDefault();
            }
            else if (e.key === 'Enter') {
                if (state.isSuggesting) {
                    handleSearch(state.suggestions[state.cursor]);
                }
                else if (state.videos[state.cursor]) {
                    playVideo(state.videos[state.cursor]);
                }
                e.preventDefault();
            }
            else if (e.key === 'SoftLeft') {
                openOverlay('menu-main');
            }
            else if (e.key === 'SoftRight' || e.key === 'EndCall') {
                window.close();
            }
            else if (e.key === 'Backspace') {
                els.searchInput.focus();
                e.preventDefault();
            }
        }
    }
    else if (state.view === 'PLAYER') {
        if (e.key === 'Enter') {
            if (els.video.paused)
                els.video.play();
            else
                els.video.pause();
        }
        else if (e.key === 'ArrowLeft') {
            els.video.currentTime -= 10;
            showFeedback('-10s');
        }
        else if (e.key === 'ArrowRight') {
            els.video.currentTime += 10;
            showFeedback('+10s');
        }
        else if (e.key === 'ArrowUp') {
            VolumeControl.volumeUp();
        }
        else if (e.key === 'ArrowDown') {
            VolumeControl.volumeDown();
        }
        else if (e.key === '0') {
            VolumeControl.setMute(!state.isMuted);
        }
        else if (e.key === 'SoftLeft') {
            openOverlay('menu-main');
        }
        else if (e.key === 'Backspace') {
            els.video.pause();
            els.video.src = "";
            showView('SEARCH');
            e.preventDefault();
        }
        else if (e.key === 'SoftRight') {
            els.video.pause();
            els.video.src = "";
            showView('SEARCH');
        }
        else if (e.key === 'VolumeUp') {
            VolumeControl.volumeUp();
        }
        else if (e.key === 'VolumeDown') {
            VolumeControl.volumeDown();
        }
    }
});
els.searchInput.focus();
updateSoftKeys();
