import { performSearch, catchYoutubeURL, VideoItem, getSuggestions, proxify } from './api';

const state = {
    view: 'SEARCH',
    query: '',
    videos: [] as VideoItem[],
    suggestions: [] as string[],
    cursor: 0,
    isPlaying: false,
    volume: 1.0,
    brightness: 1.0,
    isSuggesting: false,
    activeOverlay: null as string | null,
    jumpInput: '',
    isMuted: false,
    isLandscape: false,
    zoomLevel: 1.0,
    menuIndex: 0,
    downloadOptions: [] as any[],
};

const els = {
    header: document.getElementById('header') as HTMLElement,
    headerTitle: document.getElementById('header-title') as HTMLElement,
    searchInput: document.getElementById('search-input') as HTMLInputElement,
    videoList: document.getElementById('video-list') as HTMLElement,
    viewSearch: document.getElementById('view-search') as HTMLElement,
    viewPlayer: document.getElementById('view-player') as HTMLElement,
    playerContainer: document.getElementById('player-container') as HTMLElement,
    playerHeader: document.getElementById('player-header') as HTMLElement,
    playerControls: document.getElementById('player-controls') as HTMLElement,
    video: document.getElementById('main-video') as HTMLVideoElement,
    softkeys: document.querySelector('.softkeys') as HTMLElement,
    skLeft: document.getElementById('sk-left') as HTMLElement,
    skCenter: document.getElementById('sk-center') as HTMLElement,
    skRight: document.getElementById('sk-right') as HTMLElement,
    playerFilename: document.getElementById('player-filename') as HTMLElement,
    playerMutedIcon: document.getElementById('player-muted-icon') as HTMLElement,
    progressFill: document.getElementById('progress-fill') as HTMLElement,
    timeCurrent: document.getElementById('time-current') as HTMLElement,
    timeDuration: document.getElementById('time-duration') as HTMLElement,
    statusText: document.getElementById('status-text') as HTMLElement,
    toast: document.getElementById('toast') as HTMLElement,
    feedback: document.getElementById('player-feedback') as HTMLElement,
    feedbackText: document.getElementById('feedback-text') as HTMLElement,
    feedbackBar: document.getElementById('feedback-bar-container') as HTMLElement,
    feedbackFill: document.getElementById('feedback-bar-fill') as HTMLElement,
    menuMain: document.getElementById('menu-main') as HTMLElement,
    menuHeader: document.getElementById('menu-header') as HTMLElement,
    listMenuMain: document.getElementById('list-menu-main') as HTMLElement,
    dialogJump: document.getElementById('dialog-jumpto') as HTMLElement,
    jumpText: document.getElementById('jumpto-text') as HTMLElement,
    dialogHelp: document.getElementById('dialog-help') as HTMLElement,
    dialogHelpBox: document.getElementById('dialog-help-box') as HTMLElement,
};

const VolumeControl = {
    volumeUp: () => {
        const vm = (navigator as any).volumeManager;
        if (vm) vm.requestUp();
        else {
            state.volume = Math.min(1, state.volume + 0.1);
            els.video.volume = state.volume;
            showFeedback('Volume', state.volume);
        }
    },
    volumeDown: () => {
        const vm = (navigator as any).volumeManager;
        if (vm) vm.requestDown();
        else {
            state.volume = Math.max(0, state.volume - 0.1);
            els.video.volume = state.volume;
            showFeedback('Volume', state.volume);
        }
    },
    setMute: (shouldMute: boolean) => {
        state.isMuted = shouldMute;
        els.video.muted = shouldMute;
        if (shouldMute) els.playerMutedIcon.classList.remove('hidden');
        else els.playerMutedIcon.classList.add('hidden');
        showFeedback(shouldMute ? 'Muted' : 'Unmuted');
    },
    observeMediaVolume: (mediaElement: HTMLMediaElement, callback: Function) => {
        if (!mediaElement) return;
        mediaElement.addEventListener('volumechange', () => {
            callback(mediaElement.volume, mediaElement.muted);
        });
    }
};

VolumeControl.observeMediaVolume(els.video, (volume: number, muted: boolean) => {
    state.volume = volume;
    state.isMuted = muted;
    if (muted) els.playerMutedIcon.classList.remove('hidden');
    else els.playerMutedIcon.classList.add('hidden');
});

let feedbackTimeout: any = null;
function showFeedback(text: string, val?: number) {
    els.feedback.classList.remove('hidden');
    els.feedbackText.textContent = text;
    if (val !== undefined) {
        els.feedbackBar.classList.remove('hidden');
        els.feedbackFill.style.width = (val * 100) + '%';
    } else {
        els.feedbackBar.classList.add('hidden');
    }
    if (feedbackTimeout) clearTimeout(feedbackTimeout);
    feedbackTimeout = setTimeout(() => els.feedback.classList.add('hidden'), 1500);
}

let controlsTimeout: any = null;
function showControls() {
    document.body.classList.add('controls-visible');
    els.playerHeader.classList.remove('hidden');
    els.playerControls.classList.remove('hidden');
    els.softkeys.classList.add('visible');
    if (controlsTimeout) clearTimeout(controlsTimeout);
    controlsTimeout = setTimeout(() => {
        if (!els.video.paused && !state.activeOverlay) {
            hideControls();
        }
    }, 4000);
}

function hideControls() {
    document.body.classList.remove('controls-visible');
    els.playerHeader.classList.add('hidden');
    els.playerControls.classList.add('hidden');
    els.softkeys.classList.remove('visible');
}

function updateJumpText() {
    const p = state.jumpInput.padStart(6, '0');
    els.jumpText.textContent = p.slice(0, 2) + ':' + p.slice(2, 4) + ':' + p.slice(4, 6);
}

function parseJumpTime(str: string): number {
    const p = str.padStart(6, '0');
    const h = parseInt(p.slice(0, 2));
    const m = parseInt(p.slice(2, 4));
    const s = parseInt(p.slice(4, 6));
    return (h * 3600) + (m * 60) + s;
}

function openOverlay(name: string) {
    state.activeOverlay = name;
    if (name === 'menu-main' || name === 'menu-quality') {
        els.menuMain.classList.remove('hidden');
        state.menuIndex = 0;
        renderMenu();
    }
 else if (name === 'dialog-jumpto') {
        state.jumpInput = '';
        updateJumpText();
        els.dialogJump.classList.remove('hidden');
    } else if (name === 'dialog-help') {
        els.dialogHelp.classList.remove('hidden');
        els.dialogHelpBox.scrollTop = 0;
        els.dialogHelpBox.setAttribute('tabindex', '0');
        els.dialogHelpBox.focus();
    }
    showControls(); // Keep controls visible when overlay is open
    updateSoftKeys();
}

function applyZoom(level: number) {
    state.zoomLevel = Math.max(0.5, Math.min(3.0, level));
    els.video.style.transform = `scale(${state.zoomLevel})`;
    showFeedback(`Zoom: ${Math.round(state.zoomLevel * 100)}%`);
}

function applyLandscape(isLandscape: boolean) {
    state.isLandscape = isLandscape;
    if (isLandscape) {
        document.body.classList.add('is-landscape');
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape-primary').catch(err => {
                console.error("Orientation lock failed:", err);
            });
        }
    } else {
        document.body.classList.remove('is-landscape');
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('portrait-primary').catch(() => {});
        }
    }
    updateSoftKeys();
}

function setFullscreen(isFullscreen: boolean) {
    const docEl = document.documentElement as any;
    const doc = document as any;
    
    if (isFullscreen) {
        const requestFS = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
        if (requestFS) {
            requestFS.call(docEl);
        }
        updateThemeColor(''); // Blends with background
    } else {
        const exitFS = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;
        if (exitFS) {
            exitFS.call(doc);
        }
        updateThemeColor('#f00'); // YouTube Red
    }
}

function toggleFullscreen() {
    const nextLandscape = !state.isLandscape;
    applyLandscape(nextLandscape);
    setFullscreen(true); // Always use fullscreen in player
    showToast(nextLandscape ? "Landscape Fullscreen" : "Portrait Fullscreen");
}

function updateOrientation(video: HTMLVideoElement) {
    const aspect = video.videoWidth / video.videoHeight;
    const isWidescreen = aspect > 1.1;
    applyLandscape(isWidescreen);
    setFullscreen(true); // Always use fullscreen in player regardless of orientation
}

function renderMenu() {
    els.listMenuMain.innerHTML = '';
    const items: { label: string, action: string }[] = [];
    
    if (state.activeOverlay === 'menu-quality') {
        els.menuHeader.textContent = 'Select Quality';
        state.downloadOptions.forEach((opt, idx) => {
            const sizeStr = formatBytes(opt.size);
            items.push({ 
                label: `${opt.type} - ${opt.q} (${sizeStr})`, 
                action: `select-quality-${idx}` 
            });
        });
    } else {
        els.menuHeader.textContent = 'Menu';
        if (state.view === 'SEARCH') {
            items.push({ label: 'Download as Video', action: 'dl-video' });
            items.push({ label: 'Download as MP3', action: 'dl-mp3' });
        } else if (state.view === 'PLAYER') {
            items.push({ label: 'Jump to Time', action: 'jumpto' });
            items.push({ label: 'Rotate Screen', action: 'fullscreen' });
        }
        
        items.push({ label: 'Controls Help', action: 'help' });
        items.push({ label: 'About Kaitube', action: 'about' });
        items.push({ label: 'Exit', action: 'exit' });
    }
    
    items.forEach((item, idx) => {
        const li = document.createElement('li');
        li.textContent = item.label;
        li.dataset.action = item.action;
        if (idx === state.menuIndex) li.classList.add('active');
        li.onclick = () => {
            closeOverlay();
            executeAction(item.action);
        };
        els.listMenuMain.appendChild(li);
    });

    updateMenuSelection();
}

function closeOverlay() {
    state.activeOverlay = null;
    els.menuMain.classList.add('hidden');
    els.dialogJump.classList.add('hidden');
    els.dialogHelp.classList.add('hidden');
    updateSoftKeys();
}

function updateMenuSelection() {
    const items = els.listMenuMain.querySelectorAll('li');
    items.forEach((item, idx) => {
        if (idx === state.menuIndex) {
            item.classList.add('active');
            scrollToCenter(item as HTMLElement, els.listMenuMain);
        } else {
            item.classList.remove('active');
        }
    });
}

function triggerSystemDownload(url: string, filename: string) {
    const safeName = filename.replace(/[^a-z0-9\.]/gi, '_');
    try {
        showToast("Requesting Download...");
        const iframe = document.createElement('iframe');
        // @ts-ignore - mozbrowser and remote are KaiOS specific
        iframe.setAttribute('mozbrowser', 'true');
        // @ts-ignore
        iframe.setAttribute('remote', 'true');
        iframe.src = 'about:blank';
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        
        setTimeout(() => {
            try {
                // @ts-ignore - .download() is a KaiOS mozbrowser extension
                const req = (iframe as any).download(url, { filename: safeName });
                req.onsuccess = () => { 
                    showToast("Started!"); 
                    setTimeout(() => iframe.remove(), 2000); 
                };
                req.onerror = () => { 
                    showToast("Error. Opening Browser"); 
                    window.open(url, '_blank'); 
                    setTimeout(() => iframe.remove(), 2000);
                };
            } catch (e: any) {
                alert("Download setup failed: " + e.message);
                window.open(url, '_blank');
                iframe.remove();
            }
        }, 500);
    } catch (e: any) { 
        showToast("Download Error");
        console.error(e);
    }
}

function downloadMedia(type: 'VIDEO' | 'AUDIO') {
    const vid = state.videos[state.cursor];
    if (!vid) return;
    
    showToast("Getting download links...");
    const youtubeUrl = `https://www.youtube.com/watch?v=${vid.id}`;
    
    catchYoutubeURL(youtubeUrl, (data) => {
        const streamingData = data.streamingData;
        const options: any[] = [];
        
        if (type === 'VIDEO') {
            if (streamingData.formats) {
                streamingData.formats.forEach((f: any) => {
                    options.push({ 
                        type: 'VIDEO', 
                        q: f.qualityLabel, 
                        size: parseInt(f.contentLength || '0', 10), 
                        url: f.url, 
                        ext: 'mp4' 
                    });
                });
            }
        } else {
            if (streamingData.adaptiveFormats) {
                streamingData.adaptiveFormats.forEach((f: any) => {
                    if (f.mimeType && f.mimeType.startsWith('audio/mp4')) {
                        const br = f.bitrate ? Math.round(f.bitrate/1000)+'k' : 'HQ';
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

    }, (msg) => {
        showToast(msg);
    });
}

function executeAction(action: string) {
    if (action === 'jumpto') {
        openOverlay('dialog-jumpto');
    } else if (action === 'help') {
        openOverlay('dialog-help');
    } else if (action === 'fullscreen') {
        toggleFullscreen();
    } else if (action === 'dl-video') {
        downloadMedia('VIDEO');
    } else if (action === 'dl-mp3') {
        downloadMedia('AUDIO');
    } else if (action.startsWith('select-quality-')) {
        const idx = parseInt(action.replace('select-quality-', ''), 10);
        const opt = state.downloadOptions[idx];
        const vid = state.videos[state.cursor];
        const fileName = vid.title.replace(/[/\\?%*:|"<>]/g, '-') + '.' + opt.ext;
        triggerSystemDownload(opt.url, fileName);
    } else if (action === 'about') {
        showToast("Kaitube v1.0");
    } else if (action === 'exit') {
        window.close();
    }
}

function showToast(msg: string) {
    els.toast.textContent = msg;
    els.toast.classList.remove('hidden');
    setTimeout(() => els.toast.classList.add('hidden'), 2000);
}

function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatTime(seconds: number): string {
    if (isNaN(seconds)) return "00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return (h > 0 ? h + ":" : "") + (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
}

function showView(viewName: string) {
    state.view = viewName;
    document.body.className = 'view-' + viewName.toLowerCase();
    els.viewSearch.classList.add('hidden');
    els.viewPlayer.classList.add('hidden');
    
    // Explicitly handle header visibility like kaivideo
    els.header.classList.remove('hidden');

    if (viewName === 'SEARCH') {
        els.viewSearch.classList.remove('hidden');
        applyLandscape(false);
        setFullscreen(false);
        updateThemeColor('#f00');
        applyZoom(1.0); // Reset zoom
    } else if (viewName === 'PLAYER') {
        els.viewSearch.classList.add('hidden');
        els.viewPlayer.classList.remove('hidden');
        els.header.classList.add('hidden');
        els.searchInput.blur();
        
        // Always enter fullscreen in player to avoid status bar overlap
        setFullscreen(true);

        // Re-apply landscape if needed
        if (state.isLandscape) {
            applyLandscape(true);
        } else {
            updateThemeColor(''); 
        }
        
        updateSoftKeys();
    }
}

function updateSoftKeys() {
    if (state.view === 'SEARCH') {
        els.skLeft.textContent = 'Options';
        if (state.isSuggesting) {
            els.skCenter.textContent = 'SELECT';
        } else {
            els.skCenter.textContent = document.activeElement === els.searchInput ? 'SEARCH' : 'PLAY';
        }
        els.skRight.textContent = 'Exit';
    } else if (state.view === 'PLAYER') {
        els.skLeft.textContent = state.isLandscape ? 'Portrait' : 'Fullscreen';
        els.skCenter.textContent = state.isPlaying ? 'PAUSE' : 'RESUME';
        els.skRight.textContent = 'Options';
    }
}

function scrollToCenter(el: HTMLElement, container: HTMLElement) {
    const elTop = el.offsetTop;
    const elH = el.offsetHeight;
    const conH = container.clientHeight;
    container.scrollTop = elTop - (conH / 2) + (elH / 2);
}

function updateActiveItem() {
    const items = els.videoList.querySelectorAll('.list-item');
    items.forEach((item, idx) => {
        if (idx === state.cursor) {
            item.classList.add('active');
            scrollToCenter(item as HTMLElement, els.videoList);
        } else {
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
        if (state.videos.length > 0) renderVideos();
        else els.videoList.innerHTML = '<div class="empty-state">Enter a search query</div>';
        return;
    }
    state.suggestions.forEach((sug, idx) => {
        const item = document.createElement('div');
        item.className = 'list-item' + (idx === state.cursor ? ' active' : '');
        item.innerHTML = `<div class="item-info"><span class="item-name">${sug}</span></div>`;
        els.videoList.appendChild(item);
        if (idx === state.cursor) scrollToCenter(item, els.videoList);
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
    state.videos.forEach((vid, idx) => {
        const item = document.createElement('div');
        item.className = 'list-item' + (idx === state.cursor ? ' active' : '');
        item.innerHTML = `
            <div class="thumb"><img src="${proxify(vid.thumb)}"></div>
            <div class="item-info">
                <span class="item-name">${vid.title}</span>
                <div class="item-meta">
                    <span>${vid.channel}</span>
                    <span>${vid.time}</span>
                </div>
            </div>
        `;
        els.videoList.appendChild(item);
        if (idx === state.cursor) {
            scrollToCenter(item, els.videoList);
        }
    });
    updateSoftKeys();
}

function handleSearch(q?: string) {
    const query = q || els.searchInput.value.trim();
    if (!query) return;
    if (q) els.searchInput.value = q;
    
    state.query = query;
    state.suggestions = []; // Clear suggestions after search
    els.searchInput.blur();
    showToast("Searching...");
    performSearch(query, (videos) => {
        state.videos = videos;
        state.cursor = 0;
        renderVideos();
    }, () => {
        showToast("Search failed");
    });
}

let suggestionTimeout: any = null;
els.searchInput.oninput = () => {
    const q = els.searchInput.value.trim();
    if (suggestionTimeout) clearTimeout(suggestionTimeout);

    if (q.length > 1) {
        suggestionTimeout = setTimeout(() => {
            getSuggestions(q, (sugs) => {
                // Limit to 3 suggestions as in script.js
                state.suggestions = sugs.slice(0, 3);
                if (document.activeElement === els.searchInput && q.length > 1) {
                    state.cursor = 0;
                    renderSuggestions();
                }
            });
        }, 500); // 500ms delay as in script.js
    } else {
        state.suggestions = [];
        if (document.activeElement === els.searchInput) {
            if (state.videos.length > 0) {
                state.cursor = 0;
                renderVideos();
            } else {
                els.videoList.innerHTML = '<div class="empty-state">Enter a search query</div>';
            }
        }
    }
};

function playVideo(vid: VideoItem) {
    showToast("Loading...");
    const youtubeUrl = `https://www.youtube.com/watch?v=${vid.id}`;
    catchYoutubeURL(youtubeUrl, (data) => {
        const streamingData = data.streamingData;
        let url = '';
        if (streamingData.formats && streamingData.formats.length > 0) {
            const format = streamingData.formats.find((f: any) => f.qualityLabel === '360p') || streamingData.formats[0];
            url = format.url;
        }

        if (!url) {
            showToast("No playable format");
            return;
        }

        els.playerFilename.textContent = vid.title;
        els.video.src = proxify(url);
        showView('PLAYER');
        els.video.play();
        showControls();
    }, (msg) => {
        showToast(msg);
    });
}

els.video.onloadedmetadata = () => {
    updateOrientation(els.video);
};

els.video.onplay = () => {
    state.isPlaying = true;
    els.statusText.textContent = "PLAYING";
    updateSoftKeys();
    showControls();
};

els.video.onpause = () => {
    state.isPlaying = false;
    els.statusText.textContent = "PAUSED";
    updateSoftKeys();
};

els.video.ontimeupdate = () => {
    const cur = els.video.currentTime;
    const dur = els.video.duration;
    els.timeCurrent.textContent = formatTime(cur);
    if (!isNaN(dur)) {
        els.timeDuration.textContent = formatTime(dur);
        els.progressFill.style.width = (cur / dur * 100) + '%';
    }
};

window.addEventListener('keydown', (e) => {
    const isBackKey = e.key === 'Backspace' || e.key === 'BrowserBack' || e.key === 'Back' || e.key === 'Escape';

    if (state.activeOverlay) {
        if (e.key === 'ArrowUp') {
            if (state.activeOverlay.startsWith('menu-')) {
                const max = els.listMenuMain.querySelectorAll('li').length;
                if (state.menuIndex > 0) state.menuIndex--;
                else if (max > 0) state.menuIndex = max - 1;
                updateMenuSelection();
            } else if (state.activeOverlay === 'dialog-help') {
                els.dialogHelpBox.scrollTop -= 40;
                e.preventDefault();
            }
        } else if (e.key === 'ArrowDown') {
            if (state.activeOverlay.startsWith('menu-')) {
                const max = els.listMenuMain.querySelectorAll('li').length;
                if (state.menuIndex < max - 1) state.menuIndex++;
                else if (max > 0) state.menuIndex = 0;
                updateMenuSelection();
            } else if (state.activeOverlay === 'dialog-help') {
                els.dialogHelpBox.scrollTop += 40;
                e.preventDefault();
            }
        } else if (e.key === 'Enter') {
            if (state.activeOverlay.startsWith('menu-')) {
                const items = els.listMenuMain.querySelectorAll('li');
                const action = (items[state.menuIndex] as HTMLElement).dataset.action;
                if (action) {
                    closeOverlay();
                    executeAction(action);
                }
            } else if (state.activeOverlay === 'dialog-jumpto') {
                const sec = parseJumpTime(state.jumpInput);
                els.video.currentTime = sec;
                closeOverlay();
            }
        } else if (e.key === 'SoftRight' || isBackKey) {
            closeOverlay();
            e.preventDefault();
            e.stopPropagation();
        } else if (!isNaN(parseInt(e.key)) && state.activeOverlay === 'dialog-jumpto') {
            if (state.jumpInput.length < 6) {
                state.jumpInput += e.key;
                updateJumpText();
            }
        }
        return;
    }

    if (state.view === 'PLAYER' && isBackKey) {
        e.preventDefault();
        e.stopPropagation();
        els.video.pause();
        els.video.src = "";
        // Lock to portrait before going back to match Gaiavideo behavior
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('portrait-primary').catch(() => {});
        }
        showView('SEARCH');
        return;
    }

    if (state.view === 'SEARCH') {
        if (document.activeElement === els.searchInput) {
            if (e.key === 'Enter') {
                handleSearch();
            } else if (e.key === 'ArrowDown') {
                // Check if there are any items we can scroll to
                const hasItems = els.videoList.querySelectorAll('.list-item').length > 0;
                if (hasItems) {
                    els.searchInput.blur();
                    state.cursor = 0;
                    updateActiveItem();
                    e.preventDefault();
                }
            } else if (e.key === 'ArrowUp') {
                const max = state.isSuggesting ? state.suggestions.length : state.videos.length;
                if (max > 0) {
                    els.searchInput.blur();
                    state.cursor = max - 1;
                    updateActiveItem();
                    e.preventDefault();
                }
            } else if (e.key === 'SoftLeft') {
                openOverlay('menu-main');
            } else if (e.key === 'SoftRight' || e.key === 'EndCall') {
                window.close();
            } else if (isBackKey) {
                if (els.searchInput.value.length === 0) {
                    els.searchInput.blur();
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        } else {
            if (e.key === 'ArrowUp') {
                if (state.cursor > 0) {
                    state.cursor--;
                    updateActiveItem();
                } else {
                    els.searchInput.focus();
                    state.cursor = -1; // Reset cursor when going back to input
                    // Remove active state from all items
                    els.videoList.querySelectorAll('.list-item').forEach(i => i.classList.remove('active'));
                    updateSoftKeys();
                }
                e.preventDefault();
            } else if (e.key === 'ArrowDown') {
                const max = state.isSuggesting ? state.suggestions.length : state.videos.length;
                if (state.cursor < max - 1) {
                    state.cursor++;
                    updateActiveItem();
                } else {
                    // Circular: Go back to search input
                    els.searchInput.focus();
                    state.cursor = -1;
                    els.videoList.querySelectorAll('.list-item').forEach(i => i.classList.remove('active'));
                    updateSoftKeys();
                }
                e.preventDefault();
            } else if (e.key === 'Enter') {
                if (state.isSuggesting) {
                    handleSearch(state.suggestions[state.cursor]);
                } else if (state.videos[state.cursor]) {
                    playVideo(state.videos[state.cursor]);
                }
                e.preventDefault();
            } else if (e.key === 'SoftLeft') {
                openOverlay('menu-main');
            } else if (e.key === 'SoftRight' || e.key === 'EndCall') {
                 window.close();
            } else if (isBackKey) {
                els.searchInput.focus();
                e.preventDefault();
                e.stopPropagation();
            }
        }
    } else if (state.view === 'PLAYER') {
        showControls();
        if (e.key === 'Enter') {
            if (els.video.paused) els.video.play();
            else els.video.pause();
            e.preventDefault();
        } else if (e.key === 'ArrowLeft') {
            els.video.currentTime -= 10;
            showFeedback('-10s');
            e.preventDefault();
        } else if (e.key === 'ArrowRight') {
            els.video.currentTime += 10;
            showFeedback('+10s');
            e.preventDefault();
        } else if (e.key === 'ArrowUp') {
            VolumeControl.volumeUp();
            e.preventDefault();
        } else if (e.key === 'ArrowDown') {
            VolumeControl.volumeDown();
            e.preventDefault();
        } else if (e.key === '1') {
            applyZoom(state.zoomLevel - 0.1);
            e.preventDefault();
        } else if (e.key === '3') {
            applyZoom(state.zoomLevel + 0.1);
            e.preventDefault();
        } else if (e.key === '0') {
            VolumeControl.setMute(!state.isMuted);
            e.preventDefault();
        } else if (e.key === 'SoftLeft') {
            toggleFullscreen();
            e.preventDefault();
        } else if (e.key === 'SoftRight') {
            openOverlay('menu-main');
            e.preventDefault();
        } else if (e.key === 'VolumeUp') {
            VolumeControl.volumeUp();
            e.preventDefault();
        } else if (e.key === 'VolumeDown') {
            VolumeControl.volumeDown();
            e.preventDefault();
        }
    }
});

document.addEventListener('fullscreenchange', () => {
    const isFullscreen = !!document.fullscreenElement;
    if (!isFullscreen && state.view === 'PLAYER' && state.isLandscape) {
        // If user exited fullscreen manually but we think we are in landscape, sync back
        applyLandscape(false);
    }
});

window.addEventListener('keyup', (e) => {
    const isBackKey = e.key === 'Backspace' || e.key === 'BrowserBack' || e.key === 'Back' || e.key === 'Escape';
    if (isBackKey && (state.view === 'PLAYER' || state.activeOverlay)) {
        e.preventDefault();
        e.stopPropagation();
    }
});

updateThemeColor('#f00');
els.searchInput.focus();
updateSoftKeys();
