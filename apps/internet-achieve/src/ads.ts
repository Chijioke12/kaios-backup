// KaiAds Integration
// Documentation: https://www.kaiostech.com/developers/monetize/

declare var getKaiAd: any;

// === USER INSTRUCTIONS ===
// 1. Go to https://publisher.kaiostech.com/ to sign up and get your Publisher ID
// 2. Replace the string below with your actual Publisher ID
export const PUBLISHER_ID = '0f4504a0-e1a7-4f68-a424-099863c97a05'; 

export function showInterstitial(onAdClosedOrFailed: () => void) {
  if (typeof getKaiAd !== 'function') {
    console.warn('KaiAds SDK not loaded or offline.');
    onAdClosedOrFailed();
    return;
  }

  try {
    getKaiAd({
      publisher: PUBLISHER_ID,
      app: 'Internet Archive Search',
      slot: 'fullscreen',
      test: 0, // Production mode (set to 1 temporarily if you need to test later)
      onerror: (err: any) => {
        console.error('KaiAds error:', err);
        onAdClosedOrFailed();
      },
      onready: (ad: any) => {
        ad.on('close', () => {
          console.log('Ad closed by user.');
          onAdClosedOrFailed();
        });
        ad.on('display', () => {
          console.log('Ad displayed successfully.');
        });
        ad.call('display'); // Display the ad
      }
    });
  } catch (e) {
    console.error('Exception calling KaiAds:', e);
    onAdClosedOrFailed();
  }
}
