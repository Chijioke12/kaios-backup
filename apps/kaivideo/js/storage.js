/**
 * Storage API for KaiOS / B2G
 * Provides a Promise-based wrapper around navigator.getDeviceStorages
 */

var StorageAPI = {
  /**
   * Get all storage instances for a specific type
   * @param {string} type - 'sdcard', 'pictures', 'videos', 'music'
   * @returns {DeviceStorage[]}
   */
  getStorages: function(type) {
    type = type || 'sdcard';
    try {
      console.log('Requesting all storages for type: ' + type);
      var results = [];

      // Try plural first (KaiOS 2.5+)
      if (navigator.getDeviceStorages) {
        var storages = navigator.getDeviceStorages(type);
        if (storages && storages.length > 0) {
          for (var i = 0; i < storages.length; i++) {
            results.push(storages[i]);
          }
        }
      }
      
      // Try singular (Standard B2G/KaiOS)
      if (navigator.getDeviceStorage) {
        var storage = navigator.getDeviceStorage(type);
        if (storage) {
          var exists = false;
          for (var j = 0; j < results.length; j++) {
            if (results[j] === storage) { exists = true; break; }
          }
          if (!exists) results.push(storage);
        }
      }

      // Try B2G namespace
      if (navigator.b2g) {
        if (navigator.b2g.getDeviceStorages) {
          var b2gStorages = navigator.b2g.getDeviceStorages(type);
          if (b2gStorages && b2gStorages.length > 0) {
            for (var k = 0; k < b2gStorages.length; k++) {
              var s = b2gStorages[k];
              var sExists = false;
              for (var l = 0; l < results.length; l++) {
                if (results[l] === s) { sExists = true; break; }
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
              if (results[m] === b2gStorage) { b2gExists = true; break; }
            }
            if (!b2gExists) results.push(b2gStorage);
          }
        }
      }

      console.log('Found ' + results.length + ' storage(s) for type: ' + type);
      return results;
    } catch (e) {
      console.error('StorageAPI Error in getStorages:', e);
      return [];
    }
  },

  /**
   * Get the storage instance for a specific type (default 'sdcard')
   * @param {string} type - 'sdcard', 'pictures', 'videos', 'music'
   * @returns {DeviceStorage|null}
   */
  getStorage: function(type) {
    var storages = this.getStorages(type || 'sdcard');
    return storages.length > 0 ? storages[0] : null;
  },

  /**
   * Enumerate files in the storage
   * @param {Object} options - { type, extensions, path }
   * @returns {Promise<File[]>}
   */
  enumerateFiles: function(options) {
    options = options || {};
    var type = options.type || 'sdcard';
    var extensions = options.extensions || '*';
    var path = options.path || '';
    
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
            var isMatch = extensions === '*' || 
              (Array.isArray(extensions) && extensions.some(function(ext) { return fileName.endsWith(ext.toLowerCase()); })) ||
              (typeof extensions === 'string' && fileName.endsWith(extensions.toLowerCase()));

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
          console.error('Cursor error for storage ' + type + ':', this.error);
          resolve(files); // Resolve with what we have
        };
      });
    });

    return Promise.all(allFilesPromises).then(function(results) {
      // Flatten and deduplicate by name (path)
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
    var storage = this.getStorage(type || 'sdcard');
    return new Promise(function(resolve, reject) {
      if (!storage) return reject(new Error('Storage not found'));
      var request = storage.get(name);
      request.onsuccess = function() { resolve(request.result); };
      request.onerror = function() { reject(request.error); };
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
    var storage = this.getStorage(type || 'sdcard');
    return new Promise(function(resolve, reject) {
      if (!storage) return reject(new Error('Storage not found'));
      var request = storage.addNamed(blob, name);
      request.onsuccess = function() { resolve(request.result); };
      request.onerror = function() { reject(request.error); };
    });
  },

  /**
   * Delete a file from storage
   * @param {string} name 
   * @param {string} type 
   * @returns {Promise<void>}
   */
  deleteFile: function(name, type) {
    var storage = this.getStorage(type || 'sdcard');
    return new Promise(function(resolve, reject) {
      if (!storage) return reject(new Error('Storage not found'));
      var request = storage.delete(name);
      request.onsuccess = function() { resolve(); };
      request.onerror = function() { reject(request.error); };
    });
  },

  /**
   * Get free space in bytes
   * @param {string} type 
   * @returns {Promise<number>}
   */
  getFreeSpace: function(type) {
    var storage = this.getStorage(type || 'sdcard');
    return new Promise(function(resolve, reject) {
      if (!storage) return reject(new Error('Storage not found'));
      var request = storage.freeSpace();
      request.onsuccess = function() { resolve(request.result); };
      request.onerror = function() { reject(request.error); };
    });
  }
};

if (typeof window !== 'undefined') {
  window.StorageAPI = StorageAPI;
}
