// --- THUMBNAIL GENERATOR (Queue System) ---
var ThumbQueue = {
  queue: [],
  isProcessing: false,
  videoEl: null,
  
  add: function(videoFile) {
    // Check if we already have this in queue to avoid duplicates
    var exists = this.queue.some(function(v) { return v.id === videoFile.id; });
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
      this.videoEl = document.createElement('video');
      this.videoEl.muted = true;
      this.videoEl.preload = 'auto'; // Force load
      this.videoEl.playsInline = true;
    }
    
    var v = this.videoEl;
    var cleanId = file.id.replace(/[^a-zA-Z0-9]/g, '');
    var imgId = 'img-' + cleanId;
    var durId = 'dur-' + cleanId;
    var imgEl = document.getElementById(imgId);
    var durEl = document.getElementById(durId);

    var cleanup = function() {
      v.removeAttribute('src');
      v.load();
      self.isProcessing = false;
      setTimeout(function() { self.process(); }, 50);
    };

    // If DOM element missing (scrolled out/view changed), skip
    if (!imgEl) {
      cleanup();
      return;
    }
    
    // If already has src (loaded previously), skip
    if (imgEl.src && imgEl.style.display !== 'none') {
        cleanup();
        return;
    }

    // Event: Metadata Loaded (Get Duration)
    v.onloadedmetadata = function() {
      if (v.duration && v.duration !== Infinity && !isNaN(v.duration)) {
         file.duration = v.duration;
         if (durEl) durEl.textContent = formatTime(v.duration);
      }
    };

    // Event: Seek Complete (Capture Image)
    var onSeeked = function() {
      try {
        var canvas = document.createElement('canvas');
        canvas.width = 160; 
        canvas.height = 90;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        
        var dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        if (imgEl) {
            imgEl.src = dataUrl;
            imgEl.style.display = 'block'; 
        }
      } catch(e) {
        // console.error('Thumb draw error', e);
      }
      // Remove listener to prevent double fire
      v.removeEventListener('seeked', onSeeked);
      cleanup();
    };

    // Event: Data Loaded (Start Seek)
    v.onloadeddata = function() {
      var t = 5;
      if (v.duration && v.duration < 10) t = v.duration / 2;
      v.currentTime = t;
    };

    v.addEventListener('seeked', onSeeked);
    
    v.onerror = function() {
      cleanup();
    };
    
    // Start Load
    v.src = file.url;
    v.load();
    
    // Safety timeout
    setTimeout(function() {
      if (self.isProcessing) {
        v.removeEventListener('seeked', onSeeked);
        cleanup();
      }
    }, 3000);
  }
};
