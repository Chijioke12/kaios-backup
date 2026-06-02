// Extracted from script tag 1
// --- CONSTANTS (ICONS) ---
        const ICON_PLAY = '<svg viewBox="0 0 24 24" width="60" height="60" fill="rgba(255,255,255,0.8)"><path d="M8 5v14l11-7z"/></svg>';
        const ICON_PAUSE = '<svg viewBox="0 0 24 24" width="60" height="60" fill="rgba(255,255,255,0.8)"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
        
        // Icons for file types
        const SVG_VIDEO = '<svg viewBox="0 0 24 24" width="60" height="60" fill="#E91E63"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/></svg>';
        const SVG_AUDIO = '<svg viewBox="0 0 24 24" width="60" height="60" fill="#00B0FF"><path d="M12 3v9.28c-.47-.17-.97-.28-1.5-.28C8.01 12 6 14.01 6 16.5S8.01 21 10.5 21c2.31 0 4.2-1.75 4.45-4H15V6h4V3h-7z"/></svg>';
        const SVG_FILE = '<svg viewBox="0 0 24 24" width="60" height="60" fill="#999"><path d="M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6H6zm7 7V3.5L18.5 9H13z"/></svg>';

        // --- GLOBALS ---
        var currentView = 'HOME';
        var items = [];
        var currentIndex = 0;
        var savedIndex = 0;
        var listContainer = document.getElementById('list');
        var savedQuery = '';
        var lastSearchResults = [];
        var searchTimeout = null;

        // --- INIT ---
        window.addEventListener('DOMContentLoaded', function() {
            
            // 1. FORCE VOLUME CHANNEL TO 'CONTENT'
            if (navigator.mozAudioChannelManager) {
                navigator.mozAudioChannelManager.volumeControlChannel = 'content';
            }

            // Render Home
            renderHome(false);

            // Key Listener
            window.addEventListener('keydown', function(e) {
                if (currentView === 'PLAYER') {
                    if(e.key === 'VolumeUp' || e.key === 'VolumeDown') {
                        return; 
                    }
                    e.preventDefault();
                    handlePlayerKeys(e.key);
                    return;
                }

                switch(e.key) {
                    case 'ArrowDown': case 'Down': move(1); e.preventDefault(); break;
                    case 'ArrowUp': case 'Up': move(-1); e.preventDefault(); break;
                    case 'Enter': case 'Accept': handleEnter(); break;
                    case 'SoftLeft': handleLeft(); break;
                    case 'SoftRight': handleRight(); break;
                    case 'Backspace': case 'EndCall':
                        if(document.activeElement.tagName !== 'INPUT') {
                            e.preventDefault();
                            handleBack();
                        }
                        break;
                }
            });

            // Share Handler
            if (navigator.mozSetMessageHandler) {
                navigator.mozSetMessageHandler('activity', function (req) {
                    if (req.source.name === 'share') {
                        var url = req.source.data.url;
                        if(url) {
                            renderHome(false);
                            document.getElementById('searchInput').value = url;
                            processInput(url);
                        }
                    }
                });
            }
        });

        // --- NAV ---
        function refreshNav() {
            items = document.querySelectorAll('.item');
            if (currentIndex >= items.length) currentIndex = items.length - 1;
            if (currentIndex < 0) currentIndex = 0;
            updateSelection(currentIndex);
        }

        function move(dir) {
            if (items.length === 0) return;
            var activeEl = document.activeElement;
            if (activeEl.tagName === 'INPUT') activeEl.blur(); 
            currentIndex += dir;
            if (currentIndex >= items.length) currentIndex = 0;
            else if (currentIndex < 0) currentIndex = items.length - 1;
            updateSelection(currentIndex);
        }

        function updateSelection(index) {
            if (items.length === 0) return;
            for (var i = 0; i < items.length; i++) items[i].classList.remove('active');
            var curr = items[index];
            if(curr) {
                curr.classList.add('active');
                scrollToCenter(curr, listContainer);
            }
        }

        function scrollToCenter(el, container) {
            var elTop = el.offsetTop;
            var elH = el.offsetHeight;
            var conH = container.clientHeight;
            container.scrollTop = elTop - (conH / 2) + (elH / 2);
        }

        function handleEnter() {
            var el = items[currentIndex];
            if(!el) return;
            var input = el.querySelector('input');
            if(input) { input.focus(); return; }
            if(el.classList.contains('video-card')) savedIndex = currentIndex; 
            el.click();
        }

        function handleBack() {
            if (currentView === 'DOWNLOAD' || currentView === 'HELP') {
                renderHome(true); 
            } else {
                if(lastSearchResults.length > 0) {
                    lastSearchResults = [];
                    renderHome(false);
                } else {
                    window.close();
                }
            }
        }

        function handleLeft() {
            if(currentView === 'HOME') handleBack();
        }
        
        function handleRight() {
            if(currentView === 'HOME') renderHelp();
        }

        function updateSoftkeys(l, c, r) {
            document.getElementById('sk-left').innerText = l;
            document.getElementById('sk-center').innerText = c;
            document.getElementById('sk-right').innerText = r;
        }

        // --- RENDERERS ---
        function renderHome(restore) {
            currentView = 'HOME';
            listContainer.innerHTML = '';
            
            var div1 = document.createElement('div');
            div1.className = 'item search-wrapper';
            div1.innerHTML = `<input type="text" id="searchInput" placeholder="Search or Enter URL" value="${savedQuery}">`;
            listContainer.appendChild(div1);

            var div2 = document.createElement('div');
            div2.className = 'item';
            div2.style.textAlign = 'center';
            div2.innerHTML = '<b>GO / SEARCH</b>';
            div2.onclick = function() { 
                var val = document.getElementById('searchInput').value;
                processInput(val); 
            };
            listContainer.appendChild(div2);

            var sugDiv = document.createElement('div');
            sugDiv.id = 'sug-container';
            listContainer.appendChild(sugDiv);

            var resDiv = document.createElement('div');
            resDiv.id = 'res-container';
            listContainer.appendChild(resDiv);

            setTimeout(() => {
                var inp = document.getElementById('searchInput');
                if(!inp) return;
                inp.addEventListener('input', (e) => handleInput(e.target.value));
                inp.addEventListener('keydown', (e) => {
                    if(e.key === 'Enter') { inp.blur(); processInput(inp.value); }
                });
            }, 100);

            if (restore && lastSearchResults.length > 0) {
                renderVideoList(lastSearchResults);
                currentIndex = savedIndex; 
            } else {
                currentIndex = 0;
            }
            updateSoftkeys("Exit", "SELECT", "Help");
            refreshNav();
        }

        function renderHelp() {
            currentView = 'HELP';
            listContainer.innerHTML = `
                <div class="item detail-header"><b>Help & Controls</b></div>
                <div class="help-text">
                    <b>Search:</b> Type query and press GO.<br>
                    <b>Player Controls:</b><br>
                    - Center: Play/Pause<br>
                    - Left/Right: Seek 10s<br>
                    - Up/Down: Volume Control<br>
                    - Soft Left: Rotate Screen<br>
                    - Soft Right: Mute<br>
                    - Key '1': Jump to Time<br>
                </div>
                <div class="item" style="text-align:center" onclick="handleBack()"><b>Close</b></div>
            `;
            updateSoftkeys("Back", "SELECT", "");
            currentIndex = 2; 
            refreshNav();
        }

        function handleInput(val) {
            savedQuery = val;
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(function() {
                if(val.length < 2) {
                    document.getElementById('sug-container').innerHTML = '';
                    refreshNav(); return;
                }
                if(val.startsWith("http")) return;

                var xhr = new XMLHttpRequest({ mozSystem: true });
                xhr.open('GET', "https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=" + encodeURIComponent(val), true);
                xhr.onload = function() {
                    try {
                        var data = JSON.parse(xhr.responseText);
                        var list = data[1];
                        var cont = document.getElementById('sug-container');
                        cont.innerHTML = "";
                        list.slice(0, 3).forEach(function(txt) {
                            var d = document.createElement('div');
                            d.className = 'item suggestion-item';
                            d.innerText = txt;
                            d.onclick = function() {
                                document.getElementById('searchInput').value = txt;
                                cont.innerHTML = ""; processInput(txt);
                            };
                            cont.appendChild(d);
                        });
                        refreshNav();
                    } catch(e) {}
                };
                xhr.send();
            }, 500);
        }

        function processInput(val) {
            if(!val) return;
            savedQuery = val;
            var s = document.getElementById('sug-container');
            if(s) s.innerHTML = ''; 

            if(val.includes('youtu.be') || val.includes('youtube.com')) {
                catchYoutubeURL(val);
                return;
            }

            if(/^https?:\/\/[^\s]+$/.test(val)) {
                processDirectLink(val);
                return;
            }
            
            performSearch(val);
        }

        function performSearch(query) {
            var cont = document.getElementById('res-container');
            cont.innerHTML = '<div class="item">Searching...</div>';
            refreshNav();

            var body = JSON.stringify({
                "context": { "client": { "hl": "en", "gl": "US", "clientName": "WEB", "clientVersion": "2.20230920.00.00" } },
                "query": query
            });

            var xhr = new XMLHttpRequest({ mozSystem: true });
            xhr.open('POST', "https://www.youtube.com/youtubei/v1/search?prettyPrint=false", true);
            xhr.setRequestHeader("content-type", "application/json");
            
            xhr.onload = (e) => {
                var data = JSON.parse(e.currentTarget.response);
                var itemsFound = [];
                function scan(obj) {
                    if (obj && obj.videoRenderer) itemsFound.push(obj.videoRenderer);
                    if (typeof obj === 'object') for (var k in obj) scan(obj[k]);
                }
                scan(data);
                lastSearchResults = itemsFound;
                renderVideoList(itemsFound);
            };
            xhr.onerror = () => { cont.innerHTML = '<div class="item">Network Error</div>'; refreshNav(); };
            xhr.send(body);
        }

        function renderVideoList(videos) {
            var cont = document.getElementById('res-container');
            cont.innerHTML = "";
            if (videos.length === 0) {
                cont.innerHTML = '<div class="item">No results.</div>';
            } else {
                videos.forEach((vid) => {
                    var title = vid.title.runs ? vid.title.runs[0].text : vid.title.simpleText;
                    var id = vid.videoId;
                    var thumb = vid.thumbnail.thumbnails[0].url;
                    var time = vid.lengthText ? vid.lengthText.simpleText : "";
                    var channel = "YouTube";
                    if(vid.shortBylineText && vid.shortBylineText.runs) channel = vid.shortBylineText.runs[0].text;
                    
                    var d = document.createElement('div');
                    d.className = 'item video-card';
                    d.innerHTML = `
                         <div class="thumb-box">
                            <img src="${thumb}" class="video-thumb">
                            ${time ? `<div class="vid-time">${time}</div>` : ''}
                         </div>
                         <div class="video-info">
                             <div class="video-title">${title}</div>
                             <div class="video-meta">${channel}</div>
                         </div>
                    `;
                    d.onclick = function() { catchYoutubeURL("https://www.youtube.com/watch?v=" + id); };
                    cont.appendChild(d);
                });
            }
            refreshNav();
        }

        // --- DIRECT LINK LOGIC ---
        function processDirectLink(url) {
            listContainer.innerHTML = '<div class="item">Checking Link Info...</div>';
            
            var xhr = new XMLHttpRequest({ mozSystem: true });
            xhr.open('HEAD', url, true);
            xhr.onload = function() {
                var type = xhr.getResponseHeader('Content-Type') || 'application/octet-stream';
                var size = xhr.getResponseHeader('Content-Length') || 0;
                
                var category = 'FILE';
                if(type.startsWith('video/')) category = 'VIDEO';
                if(type.startsWith('audio/')) category = 'AUDIO';
                if(type.startsWith('image/')) category = 'IMAGE';

                if(category === 'FILE') {
                    if(url.match(/\.(mp4|mkv|mov|avi|webm)$/i)) category = 'VIDEO';
                    else if(url.match(/\.(mp3|wav|ogg|m4a|aac)$/i)) category = 'AUDIO';
                    else if(url.match(/\.(jpg|png|gif|jpeg|webp)$/i)) category = 'IMAGE';
                }

                renderDirectItem(url, category, size, type);
            };
            xhr.onerror = function() {
                renderDirectItem(url, 'UNKNOWN', 0, 'Unknown');
            };
            xhr.send();
        }

        function renderDirectItem(url, category, size, mime) {
            currentView = 'DOWNLOAD';
            listContainer.innerHTML = '';
            
            var filename = url.split('/').pop().split('?')[0];
            if(!filename) filename = "downloaded_file";
            var sizeStr = size > 0 ? formatBytes(size) : "Unknown Size";
            
            var visualHtml = "";
            if (category === 'IMAGE') {
                visualHtml = `<img src="${url}" class="big-thumb">`;
            } else if (category === 'VIDEO') {
                visualHtml = `<div class="icon-thumb">${SVG_VIDEO}</div>`;
            } else if (category === 'AUDIO') {
                visualHtml = `<div class="icon-thumb">${SVG_AUDIO}</div>`;
            } else {
                visualHtml = `<div class="icon-thumb">${SVG_FILE}</div>`;
            }

            var header = document.createElement('div');
            header.className = 'item detail-header';
            header.innerHTML = `
                ${visualHtml}<br>
                <div style="word-wrap:break-word; font-size:12px;"><b>${filename}</b></div>
                <small style="color:#bbb">${category} &bull; ${sizeStr}</small><br>
                <small style="color:#666">${mime}</small>
            `;
            listContainer.appendChild(header);

            if(category === 'VIDEO' || category === 'AUDIO' || category === 'UNKNOWN') {
                var btnStream = document.createElement('div');
                btnStream.className = 'item dl-row';
                btnStream.innerHTML = `<b style="color:#00B0FF">STREAM</b> <span>Play Now</span>`;
                btnStream.onclick = function() { startPlayer(url); };
                listContainer.appendChild(btnStream);
            }

            var btnDl = document.createElement('div');
            btnDl.className = 'item dl-row';
            btnDl.innerHTML = `<b style="color:#4CAF50">DOWNLOAD</b> <span>Save to Device</span>`;
            btnDl.onclick = function() { triggerSystemDownload(url, filename); };
            listContainer.appendChild(btnDl);

            updateSoftkeys("Back", "SELECT", "");
            currentIndex = 1; 
            refreshNav();
        }

        // --- YOUTUBE LOGIC ---
        function catchYoutubeURL(url) {
            var xhr = new XMLHttpRequest({ mozSystem: true });
            xhr.open('GET', url, true);
            xhr.responseType = 'text';
            xhr.onload = (e) => {
                try {
                    var resp = e.currentTarget.response;
                    var match = /"VISITOR_DATA":\s*"([^"]+)"/.exec(resp);
                    var vgtor = match ? match[1] : ""; 
                    catchYoutubeURI(vgtor, url);
                } catch(err) { catchYoutubeURI("", url); }
            };
            xhr.onerror = () => { showToast("Connection Failed"); renderHome(true); };
            xhr.send();
        }

        function catchYoutubeURI(vgtor, uri) {
            var vdoId = "";
            try {
                var urlObj = new URL(uri);
                if (urlObj.hostname.includes('youtu.be')) vdoId = urlObj.pathname.substring(1);
                else if (urlObj.pathname.includes('/shorts/')) vdoId = urlObj.pathname.split('/shorts/')[1].split('/')[0];
                else if (urlObj.searchParams && urlObj.searchParams.has('v')) vdoId = urlObj.searchParams.get('v');
            } catch(e) {}

            if(!vdoId) { showToast("Invalid Link"); renderHome(true); return; }

            var body = JSON.stringify({
                "playbackContext": { "contentPlaybackContext": { "html5Preference": "HTML5_PREF_WANTS" } },
                "context": {
                    "client": {
                        "hl": "en", "clientName": "ANDROID_VR", "clientVersion": "1.60.19",
                        "deviceMake": "Oculus", "deviceModel": "Quest 3", "osName": "Android", "osVersion": "12L",
                        "visitorData": vgtor
                    }
                },
                "videoId": vdoId
            });

            var xhr = new XMLHttpRequest({ mozSystem: true });
            xhr.open('POST', "https://www.youtube.com/youtubei/v1/player?prettyPrint=false", true);
            xhr.setRequestHeader("content-type", "application/json");
            xhr.responseType = 'json';
            xhr.onload = (e) => {
                var data = e.currentTarget.response;
                if(!data || !data.streamingData) {
                     showToast("Restricted"); renderHome(true); return;
                }
                currentView = 'DOWNLOAD';
                renderDownloads(data);
            };
            xhr.onerror = () => { showToast("Network Error"); renderHome(true); };
            xhr.send(body);
        }

        function renderDownloads(data) {
            listContainer.innerHTML = '';
            var details = data.videoDetails;
            var title = details.title;
            var thumb = details.thumbnail.thumbnails.pop().url;
            var time = formatDuration(details.lengthSeconds);

            var header = document.createElement('div');
            header.className = 'item detail-header';
            header.innerHTML = `
                <img src="${thumb}" class="big-thumb"><br>
                <b>${title}</b><br>
                <small>${details.author} &bull; ${time}</small>
            `;
            listContainer.appendChild(header);

            var options = [];
            if(data.streamingData.formats) {
                data.streamingData.formats.forEach(f => {
                    options.push({ type:'VIDEO', q:f.qualityLabel, size: f.contentLength, url:f.url, ext:'mp4' });
                });
            }
            if(data.streamingData.adaptiveFormats) {
                data.streamingData.adaptiveFormats.forEach(f => {
                    if(f.mimeType && f.mimeType.startsWith('audio/mp4')) {
                        var br = f.bitrate ? Math.round(f.bitrate/1000)+'k' : 'HQ';
                        options.push({ type:'AUDIO', q:br, size: f.contentLength, url:f.url, ext:'m4a' });
                    }
                });
            }

            options.forEach(opt => {
                var btn = document.createElement('div');
                btn.className = 'item dl-row';
                var col = opt.type === 'VIDEO' ? '#4CAF50' : '#2196F3';
                var sizeStr = formatBytes(opt.size);
                btn.innerHTML = `<b style="color:${col}">${opt.type}</b> <span>${opt.q}</span> <span>${sizeStr}</span>`;
                btn.onclick = function() {
                    var choice = confirm("Press OK to Download.\nPress Cancel to Stream.");
                    if(choice) triggerSystemDownload(opt.url, title + "." + opt.ext);
                    else startPlayer(opt.url);
                };
                listContainer.appendChild(btn);
            });

            updateSoftkeys("Back", "SELECT", "");
            currentIndex = 0;
            refreshNav();
        }

        // --- PLAYER LOGIC ---
        function startPlayer(url) {
            currentView = 'PLAYER';
            var overlay = document.getElementById('player-overlay');
            var v = document.getElementById('main-video');
            var spinner = document.getElementById('buffering-spinner'); // GET SPINNER
            
            document.getElementById('list').style.display = 'none';
            document.getElementById('app-header').style.display = 'none';
            document.getElementById('app-footer').style.display = 'none';
            
            v.onloadedmetadata = function() {
                var aspect = v.videoWidth / v.videoHeight;
                if (screen.mozLockOrientation) {
                    if(aspect < 1) screen.mozLockOrientation('portrait-primary');
                    else screen.mozLockOrientation('landscape-primary');
                }
            };

            // --- BUFFERING EVENTS ---
            v.onwaiting = function() { spinner.style.display = 'block'; };
            v.onseeking = function() { spinner.style.display = 'block'; };
            v.onplaying = function() { spinner.style.display = 'none'; };
            v.onpause = function() { 
                if(!v.seeking) spinner.style.display = 'none'; 
            };
            // ------------------------

            overlay.style.display = 'flex';
            v.src = url;
            spinner.style.display = 'block'; // Show initially
            
            v.play();
            flashIcon("play");
            updatePlayerUI();
            v.ontimeupdate = updatePlayerUI;
            
            updateSoftkeys("Rotate", "PAUSE", "Mute"); 
        }

        function closePlayer() {
            var overlay = document.getElementById('player-overlay');
            var v = document.getElementById('main-video');
            var spinner = document.getElementById('buffering-spinner');

            v.pause(); v.src = "";
            spinner.style.display = 'none'; // Ensure spinner is hidden
            overlay.style.display = 'none';
            
            if (screen.mozUnlockOrientation) screen.mozUnlockOrientation();
            
            document.getElementById('list').style.display = 'block';
            document.getElementById('app-header').style.display = 'block';
            document.getElementById('app-footer').style.display = 'flex';
            
            currentView = 'DOWNLOAD';
            refreshNav();
        }

        function handlePlayerKeys(key) {
            var v = document.getElementById('main-video');
            switch(key) {
                case 'Enter': case 'Accept':
                    if(v.paused) { v.play(); flashIcon("play"); } 
                    else { v.pause(); flashIcon("pause"); }
                    break;
                case 'ArrowLeft': case 'Left': v.currentTime -= 10; break;
                case 'ArrowRight': case 'Right': v.currentTime += 10; break;
                case 'ArrowUp': case 'Up': adjustVolume(1); break;
                case 'ArrowDown': case 'Down': adjustVolume(-1); break;
                case '1':
                    var t = prompt("Jump to (MM:SS or Sec):");
                    if(t) {
                        var time = 0;
                        if(t.includes(':')) {
                            var parts = t.split(':');
                            time = (parseInt(parts[0]) * 60) + parseInt(parts[1]);
                        } else { time = parseInt(t); }
                        if(!isNaN(time)) v.currentTime = time;
                    }
                    break;
                case 'SoftLeft':
                    if(screen.mozLockOrientation) {
                        if(window.innerWidth > window.innerHeight) screen.mozLockOrientation('portrait-primary');
                        else screen.mozLockOrientation('landscape-primary');
                    }
                    showToast("Rotating...");
                    break;
                case 'SoftRight':
                    v.muted = !v.muted;
                    document.getElementById('mute-indicator').style.display = v.muted ? 'block' : 'none';
                    break;
                case 'Backspace': case 'EndCall':
                    closePlayer();
                    break;
            }
            updatePlayerUI();
        }

        function adjustVolume(direction) {
            if (navigator.volumeManager) {
                if (direction > 0) navigator.volumeManager.requestUp();
                else navigator.volumeManager.requestDown();
                navigator.volumeManager.requestShow();
            } else {
                var v = document.getElementById('main-video');
                var current = v.volume;
                if (direction > 0) v.volume = Math.min(1, current + 0.1);
                else v.volume = Math.max(0, current - 0.1);
                showToast("Vol: " + Math.round(v.volume * 100) + "%");
            }
        }

        function flashIcon(type) {
            var icn = document.getElementById('center-icon');
            if(type === 'play') icn.innerHTML = ICON_PLAY;
            else if(type === 'pause') icn.innerHTML = ICON_PAUSE;
            
            icn.style.display = 'block';
            setTimeout(() => icn.style.display = 'none', 600);
        }

        function updatePlayerUI() {
            var v = document.getElementById('main-video');
            var currSpan = document.getElementById('p-curr');
            var durSpan = document.getElementById('p-dur');
            var fill = document.getElementById('progress-fill');
            
            var cur = v.currentTime;
            var dur = v.duration || 1;
            
            currSpan.innerText = formatDuration(Math.floor(cur));
            durSpan.innerText = formatDuration(Math.floor(dur));
            
            var pct = (cur / dur) * 100;
            fill.style.width = pct + "%";
        }

        function triggerSystemDownload(url, filename) {
            var safeName = filename.replace(/[^a-z0-9\.]/gi, '_');
            try {
                showToast("Requesting Download...");
                var iframe = document.createElement('iframe');
                iframe.setAttribute('mozbrowser', 'true');
                iframe.setAttribute('remote', 'true');
                iframe.src = 'about:blank';
                iframe.style.display = 'none';
                document.body.appendChild(iframe);
                setTimeout(function() {
                    var req = iframe.download(url, { filename: safeName });
                    req.onsuccess = () => { showToast("Started!"); setTimeout(()=>iframe.remove(), 2000); };
                    req.onerror = () => { showToast("Error. Opening Browser"); window.open(url,'_blank'); iframe.remove(); };
                }, 500);
            } catch(e) { alert(e.message); }
        }

        function formatBytes(bytes) {
            if(!+bytes) return 'N/A';
            var i = Math.floor(Math.log(bytes)/Math.log(1024));
            return parseFloat((bytes/Math.pow(1024,i)).toFixed(1)) + ['B','KB','MB'][i];
        }
        
        function formatDuration(seconds) {
            if(!seconds || isNaN(seconds)) return "0:00";
            var m = Math.floor(seconds / 60);
            var s = Math.floor(seconds % 60);
            return m + ":" + (s < 10 ? "0" : "") + s;
        }

        function showToast(msg) {
            var t = document.createElement('div');
            t.className = 'toasttext';
            t.innerText = msg;
            document.body.appendChild(t);
            setTimeout(() => t.remove(), 3000);
        }
