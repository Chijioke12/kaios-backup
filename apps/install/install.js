/*global Promise, alert*/
(function () {
"use strict";

function installFromUrl (url, type) {
	return new Promise(function (resolve, reject) {
		if (!url) {
			reject('No URL provided');
			return;
		}
		var request = navigator.mozApps[type === 'hosted' ? 'install' : 'installPackage'](url);
		request.onsuccess = resolve;
		request.onerror = function () {
			reject('Installing failed: ' + this.error.name);
		};
	});
}

function showMessagesFor (promise, success) {
	promise.then(function () {
		if (success) {
			alert(success);
		}
	}, function (error) {
		alert(error);
	});
}

function onInstallHostedClick () {
	var url = document.getElementById('hosted-url-input').value;
	showMessagesFor(installFromUrl(url, 'hosted'));
}

function onInstallPackedUrlClick () {
	var url = document.getElementById('packaged-url-input').value;
	showMessagesFor(installFromUrl(url, 'packaged'));
}

document.getElementById('hosted-url-button').addEventListener('click', onInstallHostedClick);
document.getElementById('packaged-url-button').addEventListener('click', onInstallPackedUrlClick);

})();