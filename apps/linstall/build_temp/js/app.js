"use strict";

(function () {
  "use strict";

  // Global error handler for the device
  window.onerror = function (msg, url, line) {
    alert('Global Error: ' + msg + '\nAt: ' + url + ':' + line);
    return false;
  };
  alert('LInstall initialized');
  var fileList = document.getElementById('file-list');
  var message = document.getElementById('message');
  var searchInput = document.getElementById('search-input');
  var appContent = document.getElementById('app-content');
  var viewDetails = document.getElementById('view-details');
  var skLeft = document.getElementById('softkey-left');
  var skCenter = document.getElementById('softkey-center');
  var skRight = document.getElementById('softkey-right');
  var files = [];
  var filteredFiles = [];
  var selectedIndex = 0;
  var currentView = 'list'; // 'list' or 'details'

  function checkSupport() {
    var unsupported = [];
    if (!navigator.getDeviceStorage && !navigator.getDeviceStorages && (!navigator.b2g || !navigator.b2g.getDeviceStorage)) {
      unsupported.push('Device Storage API');
    }
    if (!navigator.mozApps || !navigator.mozApps.installPackage) {
      unsupported.push('App Installation API (mozApps)');
    }
    if (unsupported.length > 0) {
      console.warn('Unsupported features:', unsupported);
    }
  }
  function scanFiles() {
    alert('scanFiles called');
    message.textContent = 'Scanning SD card...';
    message.classList.remove('hidden');
    fileList.innerHTML = '';
    if (typeof StorageAPI === 'undefined') {
      alert('Error: StorageAPI is undefined');
      return;
    }
    StorageAPI.enumerateFiles({
      type: 'sdcard',
      extensions: '.zip'
    }).then(function (foundFiles) {
      alert('Found ' + foundFiles.length + ' files');
      files = foundFiles;
      filterFiles();
    })["catch"](function (e) {
      alert('StorageAPI error: ' + e.message);
      message.textContent = 'Error scanning SD card';
      message.classList.remove('hidden');
    });
  }
  function filterFiles() {
    var query = searchInput.value.toLowerCase();
    filteredFiles = files.filter(function (file) {
      return file.name.toLowerCase().indexOf(query) !== -1;
    });
    alert('Filtered to ' + filteredFiles.length + ' files');
    if (filteredFiles.length === 0) {
      message.textContent = 'No ZIP files found';
      message.classList.remove('hidden');
    } else {
      message.classList.add('hidden');
    }
    selectedIndex = 0;
    renderList();
  }
  function renderList() {
    alert('Rendering list...');
    fileList.innerHTML = '';
    filteredFiles.forEach(function (file, index) {
      var card = document.createElement('div');
      card.className = 'app-card';
      card.tabIndex = 0;
      if (index === selectedIndex) card.classList.add('selected');
      var title = document.createElement('div');
      title.className = 'app-title';
      title.textContent = file.name.split('/').pop();
      var size = document.createElement('div');
      size.className = 'app-author';
      size.textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB';
      card.appendChild(title);
      card.appendChild(size);
      fileList.appendChild(card);
      if (index === selectedIndex) card.focus();
    });
    updateSoftkeys();
  }
  function updateSoftkeys() {
    if (currentView === 'list') {
      skLeft.textContent = 'Search';
      skCenter.textContent = 'Details';
      skRight.textContent = 'Refresh';
    } else {
      skLeft.textContent = 'Back';
      skCenter.textContent = 'Install';
      skRight.textContent = '';
    }
  }
  document.getElementById('install-btn').addEventListener('click', function () {
    installSelected();
  });
  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredFiles.length > 0) {
        renderList();
        var firstCard = fileList.querySelector('.app-card');
        if (firstCard) firstCard.focus();
      }
    }
  });
  function showDetails() {
    if (filteredFiles.length === 0) return;
    var file = filteredFiles[selectedIndex];
    document.getElementById('details-title').textContent = file.name.split('/').pop();
    document.getElementById('details-author').textContent = 'Size: ' + (file.size / 1024 / 1024).toFixed(2) + ' MB';
    document.getElementById('details-description').textContent = 'Path: ' + file.name;
    appContent.classList.add('hidden');
    viewDetails.classList.remove('hidden');
    currentView = 'details';
    updateSoftkeys();
  }
  function hideDetails() {
    viewDetails.classList.add('hidden');
    appContent.classList.remove('hidden');
    currentView = 'list';
    renderList();
  }
  function installSelected() {
    var file = filteredFiles[selectedIndex];
    if (!file) {
      alert('No file selected.');
      return;
    }
    console.log('Install triggered for:', file.name);
    try {
      // 1. Try navigator.mozApps.mgmt (Direct Sideloading)
      if (navigator.mozApps && navigator.mozApps.mgmt) {
        var mgmt = navigator.mozApps.mgmt;
        // Some versions use .import, others use .install
        var installFunc = mgmt["import"] || mgmt.install;
        if (typeof installFunc === 'function') {
          console.log('Using Management API...');
          var request = installFunc.call(mgmt, file);
          request.onsuccess = function () {
            alert('Success: ' + file.name.split('/').pop() + ' installed!');
          };
          request.onerror = function () {
            var errName = this.error && this.error.name ? this.error.name : 'Unknown Error';
            alert('Installation failed: ' + errName);
            console.error('Mgmt API Error:', this.error);
          };
          return;
        }
      }

      // 2. Try navigator.mozApps.installPackage (Web-based)
      if (navigator.mozApps && navigator.mozApps.installPackage) {
        console.log('Using installPackage API...');
        var zipURL = URL.createObjectURL(file);
        var appName = file.name.split('/').pop().replace('.zip', '');
        var miniManifest = {
          name: appName,
          package_path: zipURL,
          size: file.size,
          version: "1.0.0"
        };
        var manifestContent = JSON.stringify(miniManifest);
        var manifestURL = 'data:application/x-web-app-manifest+json,' + encodeURIComponent(manifestContent);
        var request = navigator.mozApps.installPackage(manifestURL);
        request.onsuccess = function () {
          alert('Installation started for ' + appName);
        };
        request.onerror = function () {
          var errName = this.error && this.error.name ? this.error.name : 'Unknown Error';
          alert('Install failed: ' + errName);
          URL.revokeObjectURL(zipURL);
        };
        return;
      }
      alert('Error: Installation APIs not found on this device.');
    } catch (e) {
      alert('Critical Installation Error: ' + e.message);
      console.error(e);
    }
  }
  window.addEventListener('keydown', function (e) {
    if (currentView === 'list') {
      switch (e.key) {
        case 'ArrowDown':
          selectedIndex = Math.min(selectedIndex + 1, filteredFiles.length - 1);
          renderList();
          break;
        case 'ArrowUp':
          selectedIndex = Math.max(selectedIndex - 1, 0);
          renderList();
          break;
        case 'Enter':
        case 'SoftCenter':
          showDetails();
          break;
        case 'SoftRight':
          scanFiles();
          break;
        case 'SoftLeft':
          searchInput.focus();
          break;
      }
    } else {
      switch (e.key) {
        case 'SoftLeft':
        case 'Backspace':
          e.preventDefault();
          hideDetails();
          break;
        case 'Enter':
        case 'SoftCenter':
          installSelected();
          break;
      }
    }
  });
  searchInput.addEventListener('input', filterFiles);
  scanFiles();
  checkSupport();
})();