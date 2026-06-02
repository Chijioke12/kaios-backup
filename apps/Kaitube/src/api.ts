
export function proxify(url: string) {
    if (typeof window !== 'undefined' && window.location.protocol === 'app:') {
        return url;
    }
    return `/api/proxy?url=${encodeURIComponent(url)}`;
}

export interface VideoItem {
    id: string;
    title: string;
    thumb: string;
    time: string;
    channel: string;
}

export interface DownloadOption {
    type: string;
    q: string;
    size: number;
    url: string;
    ext: string;
}

export function getSuggestions(query: string, onResult: (suggestions: string[]) => void) {
    var xhr = new (window as any).XMLHttpRequest({ mozSystem: true });
    xhr.open('GET', proxify("https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=" + encodeURIComponent(query)), true);
    xhr.onload = function() {
        try {
            var data = JSON.parse(xhr.responseText);
            onResult(data[1] || []);
        } catch(e) {
            onResult([]);
        }
    };
    xhr.onerror = () => onResult([]);
    xhr.send();
}

export function performSearch(query: string, onResult: (videos: VideoItem[]) => void, onError: () => void) {
    var body = JSON.stringify({
        "context": { "client": { "hl": "en", "gl": "US", "clientName": "WEB", "clientVersion": "2.20230920.00.00" } },
        "query": query
    });

    var xhr = new (window as any).XMLHttpRequest({ mozSystem: true });
    xhr.open('POST', proxify("https://www.youtube.com/youtubei/v1/search?prettyPrint=false"), true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("X-YouTube-Client-Name", "1");
    xhr.setRequestHeader("X-YouTube-Client-Version", "2.20230920.00.00");
    
    xhr.onload = () => {
        try {
            var data = JSON.parse(xhr.responseText);
            var itemsFound: any[] = [];
            var scan = (obj: any) => {
                if (obj && obj.videoRenderer) itemsFound.push(obj.videoRenderer);
                if (typeof obj === 'object') {
                    for (var k in obj) {
                        if (Object.prototype.hasOwnProperty.call(obj, k)) scan(obj[k]);
                    }
                }
            };
            scan(data);
            
            var videos: VideoItem[] = itemsFound.map(vid => {
                var title = vid.title.runs ? vid.title.runs[0].text : (vid.title.simpleText || "No Title");
                var id = vid.videoId;
                var thumb = vid.thumbnail.thumbnails[0].url;
                var time = vid.lengthText ? vid.lengthText.simpleText : "";
                var channel = "YouTube";
                if(vid.shortBylineText && vid.shortBylineText.runs) channel = vid.shortBylineText.runs[0].text;
                
                return { id, title, thumb, time, channel };
            });
            onResult(videos);
        } catch (err) {
            onError();
        }
    };
    xhr.onerror = onError;
    xhr.send(body);
}

export function catchYoutubeURL(url: string, onResult: (data: any) => void, onError: (msg: string) => void) {
    var xhr = new (window as any).XMLHttpRequest({ mozSystem: true });
    xhr.open('GET', proxify(url), true);
    xhr.responseType = 'text';
    xhr.onload = () => {
        try {
            var resp = xhr.responseText;
            var match = /"VISITOR_DATA":\s*"([^"]+)"/.exec(resp);
            var vgtor = match ? match[1] : ""; 
            catchYoutubeURI(vgtor, url, onResult, onError);
        } catch(err) { 
            catchYoutubeURI("", url, onResult, onError); 
        }
    };
    xhr.onerror = () => onError("Connection Failed");
    xhr.send();
}

function catchYoutubeURI(vgtor: string, uri: string, onResult: (data: any) => void, onError: (msg: string) => void) {
    var vdoId = "";
    try {
        var urlObj = new URL(uri);
        if (urlObj.hostname.includes('youtu.be')) vdoId = urlObj.pathname.substring(1);
        else if (urlObj.pathname.includes('/shorts/')) vdoId = urlObj.pathname.split('/shorts/')[1].split('/')[0];
        else if (urlObj.searchParams && urlObj.searchParams.has('v')) vdoId = urlObj.searchParams.get('v') || "";
    } catch(e) {}

    if(!vdoId) { 
        onError("Invalid Link"); 
        return; 
    }

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

    var xhr = new (window as any).XMLHttpRequest({ mozSystem: true });
    xhr.open('POST', proxify("https://www.youtube.com/youtubei/v1/player?prettyPrint=false"), true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("X-YouTube-Client-Name", "1");
    xhr.setRequestHeader("X-YouTube-Client-Version", "2.20230920.00.00");
    xhr.responseType = 'json';
    xhr.onload = () => {
        var data = xhr.response;
        if(!data || !data.streamingData) {
             onError("Restricted"); 
             return;
        }
        onResult(data);
    };
    xhr.onerror = () => onError("Network Error");
    xhr.send(body);
}
