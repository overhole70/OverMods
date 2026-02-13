
// IDs provided by the user
const AD_CONFIG = {
  APP_ID: 'ca-app-pub-8123364973641464~9715733447',
  BANNER_ID: 'ca-app-pub-8123364973641464/6184516698',
  INTERSTITIAL_ID: 'ca-app-pub-8123364973641464/1359565423',
  REWARDED_ID: 'ca-app-pub-8123364973641464/1690737912'
};

export const AdService = {
  async initialize() {
    console.log("AdMob: Initializing with App ID:", AD_CONFIG.APP_ID);
    // In real Capacitor: await AdMob.initialize({ appId: AD_CONFIG.APP_ID });
  },

  async showBanner() {
    console.log("AdMob: Showing Banner:", AD_CONFIG.BANNER_ID);
    // AdMob.showBanner({ adId: AD_CONFIG.BANNER_ID, position: BannerAdPosition.BOTTOM_CENTER });
  },

  async hideBanner() {
    console.log("AdMob: Hiding Banner");
    // AdMob.removeBanner();
  },

  async showInterstitial() {
    console.log("AdMob: Preparing Interstitial:", AD_CONFIG.INTERSTITIAL_ID);
    // await AdMob.prepareInterstitial({ adId: AD_CONFIG.INTERSTITIAL_ID });
    // await AdMob.showInterstitial();
    alert(" [AdMob Simulation] Interstitial Ad Shown");
  },

  async showRewarded(onReward: (reward: any) => void) {
    console.log("AdMob: Preparing Rewarded Ad:", AD_CONFIG.REWARDED_ID);
    const confirmed = window.confirm("Watch a short video to support the platform?");
    if (confirmed) {
       // await AdMob.prepareRewardVideoAd({ adId: AD_CONFIG.REWARDED_ID });
       // const reward = await AdMob.showRewardVideoAd();
       alert(" [AdMob Simulation] Rewarded Ad Completed!");
       onReward({ type: 'support', amount: 1 });
    }
  }
};
