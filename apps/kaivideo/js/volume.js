/**
 * Volume Control API for KaiOS / B2G
 * Wraps navigator.volumeManager for easier access
 */

var VolumeControl = {
  /**
   * Increase system volume
   */
  volumeUp: function() {
    if (navigator.volumeManager) {
      navigator.volumeManager.requestUp();
    } else {
      console.warn('VolumeManager not available');
    }
  },

  /**
   * Decrease system volume
   */
  volumeDown: function() {
    if (navigator.volumeManager) {
      navigator.volumeManager.requestDown();
    } else {
      console.warn('VolumeManager not available');
    }
  },

  /**
   * Listen for volume changes on a specific media element
   * @param mediaElement - The HTML audio or video element
   * @param callback - Function called when volume changes
   */
  observeMediaVolume: function(mediaElement, callback) {
    if (!mediaElement) return;
    mediaElement.addEventListener('volumechange', function() {
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

if (typeof window !== 'undefined') {
  window.VolumeControl = VolumeControl;
}
