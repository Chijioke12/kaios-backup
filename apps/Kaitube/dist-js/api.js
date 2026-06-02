"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.proxify = proxify;
exports.getSuggestions = getSuggestions;
exports.performSearch = performSearch;
exports.catchYoutubeURL = catchYoutubeURL;
var isKaiOS = navigator.userAgent.toLowerCase().includes('kaios') || ('mozApps' in navigator);
function proxify(url) {
    if (isKaiOS)
        return url;
    return "/api/proxy?url=".concat(encodeURIComponent(url));
}
function getSuggestions(query, onResult) {
    var xhr = new window.XMLHttpRequest({ mozSystem: true });
    xhr.open('GET', proxify("https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=" + encodeURIComponent(query)), true);
    xhr.onload = function () {
        try {
            var data = JSON.parse(xhr.responseText);
            onResult(data[1] || []);
        }
        catch (e) {
            onResult([]);
        }
    };
    xhr.onerror = function () { return onResult([]); };
    xhr.send();
}
function performSearch(query, onResult, onError) {
    var body = JSON.stringify({
        "context": { "client": { "hl": "en", "gl": "US", "clientName": "WEB", "clientVersion": "2.20230920.00.00" } },
        "query": query
    });
    var xhr = new window.XMLHttpRequest({ mozSystem: true });
    xhr.open('POST', proxify("https://www.youtube.com/youtubei/v1/search?prettyPrint=false"), true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("X-YouTube-Client-Name", "1");
    xhr.setRequestHeader("X-YouTube-Client-Version", "2.20230920.00.00");
    xhr.onload = function () {
        try {
            var data = JSON.parse(xhr.responseText);
            var itemsFound = [];
            var scan = function (obj) {
                if (obj && obj.videoRenderer)
                    itemsFound.push(obj.videoRenderer);
                if (typeof obj === 'object') {
                    for (var k in obj) {
                        if (Object.prototype.hasOwnProperty.call(obj, k))
                            scan(obj[k]);
                    }
                }
            };
            scan(data);
            var videos = itemsFound.map(function (vid) {
                var title = vid.title.runs ? vid.title.runs[0].text : (vid.title.simpleText || "No Title");
                var id = vid.videoId;
                var thumb = vid.thumbnail.thumbnails[0].url;
                var time = vid.lengthText ? vid.lengthText.simpleText : "";
                var channel = "YouTube";
                if (vid.shortBylineText && vid.shortBylineText.runs)
                    channel = vid.shortBylineText.runs[0].text;
                return { id: id, title: title, thumb: thumb, time: time, channel: channel };
            });
            onResult(videos);
        }
        catch (err) {
            onError();
        }
    };
    xhr.onerror = onError;
    xhr.send(body);
}
function catchYoutubeURL(url, onResult, onError) {
    var xhr = new window.XMLHttpRequest({ mozSystem: true });
    xhr.open('GET', proxify(url), true);
    xhr.responseType = 'text';
    xhr.onload = function () {
        try {
            var resp = xhr.responseText;
            var match = /"VISITOR_DATA":\s*"([^"]+)"/.exec(resp);
            var vgtor = match ? match[1] : "";
            catchYoutubeURI(vgtor, url, onResult, onError);
        }
        catch (err) {
            catchYoutubeURI("", url, onResult, onError);
        }
    };
    xhr.onerror = function () { return onError("Connection Failed"); };
    xhr.send();
}
function catchYoutubeURI(vgtor, uri, onResult, onError) {
    var vdoId = "";
    try {
        var urlObj = new URL(uri);
        if (urlObj.hostname.includes('youtu.be'))
            vdoId = urlObj.pathname.substring(1);
        else if (urlObj.pathname.includes('/shorts/'))
            vdoId = urlObj.pathname.split('/shorts/')[1].split('/')[0];
        else if (urlObj.searchParams && urlObj.searchParams.has('v'))
            vdoId = urlObj.searchParams.get('v') || "";
    }
    catch (e) { }
    if (!vdoId) {
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
    var xhr = new window.XMLHttpRequest({ mozSystem: true });
    xhr.open('POST', proxify("https://www.youtube.com/youtubei/v1/player?prettyPrint=false"), true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("X-YouTube-Client-Name", "1");
    xhr.setRequestHeader("X-YouTube-Client-Version", "2.20230920.00.00");
    xhr.responseType = 'json';
    xhr.onload = function () {
        var data = xhr.response;
        if (!data || !data.streamingData) {
            onError("Restricted");
            return;
        }
        onResult(data);
    };
    xhr.onerror = function () { return onError("Network Error"); };
    xhr.send(body);
}
