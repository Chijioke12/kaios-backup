self.importScripts('./dist/hawk.js');
self.importScripts('./assets/pushCampaignIcon.js');

const PUSH_ACTION_SW_FORCE_UPDATE = 'swForceUpdate';
const PUSH_ACTION_INSTALL = 'install';
const PUSH_ACTION_LAUNCH = 'launch';
const PUSH_ACTION_LAUNCH_CATEGORY = 'launch-category';
const PUSH_ACTION_OPEN_URL = 'openURL';
const PUSH_ACTION_DISMISS = 'dismiss';
const PUSH_ACTION_DISMISS_SW_FORCE_UPDATE = 'dismiss-swForceUpdate';
const PUSH_ACTION_DISMISS_INSTALL = 'dismiss-install';
const PUSH_ACTION_DISMISS_LAUNCH = 'dismiss-launch';
const PUSH_ACTION_DISMISS_OPEN_URL = 'dismiss-openURL';

const STORAGE_KEY = {
  deviceInfos: 'cached-device-info',
  simInfo: 'cached-sim-Info',
  imei: 'cached-imei',
  l10nMapping: 'l10nMapping',
  subscriptionRecord: 'subscriptionRecord'
};

function putRecordToAppIndexDB(manifestURL, value, db) {
  const STORENAME = 'keyvaluepairs';
  const OPERATOR = 'readwrite';
  return new Promise((resolve, reject) => {
    if (db.objectStoreNames.contains(STORENAME)) {
      const transaction = db.transaction(STORENAME, OPERATOR);
      const objectStore = transaction.objectStore(STORENAME);
      const request = objectStore.put(value, manifestURL);
      request.onerror = () => {
        reject(request.error);
      };
      request.onsuccess = () => {
        resolve(request.result);
      };
    }
  });
}

function getRecordFromAppIndexDB(manifestURL, db) {
  const STORENAME = 'keyvaluepairs';
  const OPERATOR = 'readonly';
  return new Promise((resolve, reject) => {
    if (db.objectStoreNames.contains(STORENAME)) {
      const transaction = db.transaction(STORENAME, OPERATOR);
      const objectStore = transaction.objectStore(STORENAME);
      const request = objectStore.get(manifestURL);
      request.onerror = () => {
        reject();
      };
      request.onsuccess = () => {
        // Do something with the request.result!
        resolve(request.result);
      };
    }
  });
}

function getAppIndexDB() {
  const DBNAME = 'asyncStorage';
  const DBVERSION = 1;
  return new Promise((resolve, reject) => {
    let openRequest = indexedDB.open(DBNAME, DBVERSION);
    openRequest.onsuccess = function withStoreOnSuccess() {
      let db = openRequest.result;
      resolve(db);
    };

    openRequest.onerror = function withStoreOnSuccess() {
      reject();
    };
  });
}

function formatRequest(url, token) {
  return new Promise((resolve, reject) => {
    getAppIndexDB()
      .then(db => {
        return Promise.all([
          getRecordFromAppIndexDB(STORAGE_KEY.deviceInfos, db),
          getRecordFromAppIndexDB(STORAGE_KEY.imei, db),
          getRecordFromAppIndexDB(STORAGE_KEY.simInfo, db)
        ]);
      })
      .then(results => {
        const cachedDeviceInfo = results[0];
        const imeis = results[1];
        const simInfo = results[2];

        const imei = imeis[0];
        const curef = cachedDeviceInfo.get('deviceinfo.cu');
        const mnc = simInfo.simMNC || simInfo.simMNC2 || 0;
        const mcc = simInfo.simMCC || simInfo.simMCC2 || 0;
        const netMnc = simInfo.currentMNC || simInfo.currentMNC2 || 0;
        const netMcc = simInfo.currentMCC || simInfo.currentMCC2 || 0;

        const requester = new HawkRequester();
        requester.setHawkCredentials(token.kid, token.mac_key);
        const authHeader = requester.getHawkHeader(null, url, 'GET');

        // TODO: Do we need ct, rt, utc, utc_off in Kai-Request-Info? e.g.
        // 'Kai-Request-Info': `ct="wifi", rt="auto", utc="1548371866", utc_off="8", mnc="34", mcc="2", net_mnc="34", net_mcc="2"`
        const request = new Request(url, {
          method: 'GET',
          mode: 'cors',
          headers: new Headers({
            Authorization: authHeader.field,
            'Kai-Device-Info': `imei=${imei}, curef=${curef}`,
            'Kai-Request-Info': `mnc=${mnc}, mcc=${mcc}, net_mnc=${netMnc}, net_mcc=${netMcc}`
          })
        });

        resolve(request);
      })
      .catch(err => {
        reject(err);
      });
  });
}

function getManifest(manifestURL, token) {
  return new Promise((resolve, reject) => {
    console.log('[sw] getManifest ', manifestURL, JSON.stringify(token));
    formatRequest(manifestURL, token).then(request => {
      fetch(request)
        .then(response => {
          return response.json();
        })
        .then(json => {
          console.log('[sw] fetch manifest result ', JSON.stringify(json));
          resolve({ manifestData: json });
        })
        .catch(e => {
          console.error('[sw] fetch fail ' + e);
          reject(e);
        });
    });
  });
}

function getAsset(url, token, key) {
  return new Promise((resolve, reject) => {
    formatRequest(url, token).then(request => {
      fetch(request)
        .then(response => {
          return response.blob();
        })
        .then(blob => {
          let reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = function() {
            base64data = reader.result;
            resolve({ [key]: base64data });
          };
        })
        .catch(e => {
          console.error('[sw] fetch asset fail ' + e);
          reject(e);
        });
    });
  });
}

function getLocaleData(manifestResult, pushMessageDefaultLang) {
  const manifestDefaultLang = manifestResult.default_locale;
  if (manifestResult.locales[pushMessageDefaultLang]) {
    return manifestResult.locales[pushMessageDefaultLang];
  } else if (
    manifestDefaultLang &&
    manifestResult.locales[manifestDefaultLang]
  ) {
    return manifestResult.locales[manifestDefaultLang];
  } else {
    const firstLocaleKey = Object.keys(manifestResult.locales)[0];
    return manifestResult.locales[firstLocaleKey];
  }
}

function pushCampaignAck(token, action = null) {
  console.warn('pushCampaignAck, action', action);
  const ackEndpoint = '/pushcampaign_be/v1.0/campaigns/ack';

  return new Promise((resolve, reject) => {
    getAppIndexDB()
      .then(db => {
        return Promise.all([
          getRecordFromAppIndexDB(STORAGE_KEY.deviceInfos, db),
          getRecordFromAppIndexDB(STORAGE_KEY.imei, db)
        ]);
      })
      .then(results => {
        const cachedDeviceInfo = results[0];
        const imeis = results[1];
        const url = `${cachedDeviceInfo.get(
          'identity.kaiaccounts.api.uri'
        )}${ackEndpoint}`;
        const imei = imeis[0];
        const curef = cachedDeviceInfo.get('deviceinfo.cu');

        const data = (() => {
          switch (action) {
            case PUSH_ACTION_SW_FORCE_UPDATE:
              return { action: 'store_push_notification_sw_force_update' };
            case PUSH_ACTION_INSTALL:
              return { action: 'store_push_notification_install' };
            case PUSH_ACTION_LAUNCH:
              return { action: 'store_push_notification_launch' };
            case PUSH_ACTION_LAUNCH_CATEGORY:
              return { action: 'store_push_notification_launch_category' };
            case PUSH_ACTION_OPEN_URL:
              return { action: 'store_push_notification_open_url' };
            case PUSH_ACTION_DISMISS:
              return { action: 'store_push_notification_dismiss' };
            case PUSH_ACTION_DISMISS_SW_FORCE_UPDATE:
              return {
                action: 'store_push_notification_dismiss_sw_force_update'
              };
            case PUSH_ACTION_DISMISS_INSTALL:
              return { action: 'store_push_notification_dismiss_install' };
            case PUSH_ACTION_DISMISS_LAUNCH:
              return { action: 'store_push_notification_dismiss_launch' };
            case PUSH_ACTION_DISMISS_OPEN_URL:
              return { action: 'store_push_notification_dismiss_open_url' };
            default:
              return null;
          }
        })();
        console.log('ack body', JSON.stringify(data));

        const requester = new HawkRequester();
        requester.setHawkCredentials(token.kid, token.mac_key);

        const authHeader = requester.getHawkHeader(
          data ? JSON.stringify(data) : null,
          url,
          'POST'
        );

        const headers = new Headers({
          Authorization: authHeader.field,
          'Kai-Device-Info': `imei=${imei}, curef=${curef}`,
          'Content-Type': 'application/json'
        });

        const request = new Request(url, {
          method: 'POST',
          mode: 'cors',
          body: data ? JSON.stringify(data) : null,
          headers
        });

        return fetch(request);
      })
      .then(response => {
        console.warn('[sw] successfully send push campaign ack');
        resolve(response);
      })
      .catch(err => {
        console.error('[sw] fail to send push campaign ack:', err);
        reject(err);
      });
  });
}

self.addEventListener('push', event => {
  let content = JSON.parse(event.data.text());
  let token = JSON.parse(content.token);
  let isGhost = (() => {
    try {
      return !!JSON.parse(content.is_ghost);
    } catch (e) {
      return false;
    }
  })();
  console.log('[sw] push notification received ', JSON.stringify(content));

  pushCampaignAck(JSON.parse(content.token));

  if (!isGhost) {
    let assets = {
      manifestData: null,
      soundData: null,
      iconData: null
    };

    let promises = [];
    if (content.manifest_url) {
      promises.push(getManifest(content.manifest_url, token));
    }
    if (content.sound) {
      promises.push(getAsset(content.sound, token, 'soundData'));
    }
    if (content.image) {
      promises.push(getAsset(content.image, token, 'iconData'));
    }

    Promise.all(promises)
      .then(values => {
        for (let i = 0; i < values.length; i++) {
          const value = values[i];
          const key = Object.keys(value)[0];
          assets[key] = value[key];
        }
        handlePush(content, event, assets);
      })
      .catch(error => {
        console.error('[sw] fail to fetch remote assets', error);
      });
  }
});

self.addEventListener('notificationclick', event => {
  if (
    event &&
    event.notification &&
    event.notification.data &&
    event.notification.data.token
  ) {
    pushCampaignAck(JSON.parse(event.notification.data.token), event.action);
  }

  event.notification.close();

  let openAppEvent = null;
  if (event.action === PUSH_ACTION_INSTALL) {
    console.log(
      '[sw] going to launch app with manifest ',
      event.notification.data.manifestURL
    );
    openAppEvent = {
      msg: JSON.stringify({
        manifestURL: event.notification.data.manifestURL,
        csId: event.notification.data.csId,
        token: event.notification.data.token,
        isNeedByStream: true
      })
    };
  } else if (event.action === PUSH_ACTION_OPEN_URL) {
    console.log(
      '[sw] going to launch app with openURL ',
      event.notification.data.url
    );
    openAppEvent = {
      msg: JSON.stringify({
        url: event.notification.data.url,
        csId: event.notification.data.csId,
        token: event.notification.data.token,
        isNeedByStream: true
      })
    };
  } else if (event.action === PUSH_ACTION_SW_FORCE_UPDATE) {
    openAppEvent = {
      msg: JSON.stringify({
        swForceUpdate: true
      })
    };
  } else if (event.action === PUSH_ACTION_LAUNCH) {
    console.log(
      '[sw] going to launch app or redirect',
      event.notification.data.manifestURL,
      event.notification.data.csId,
      event.notification.data.token
    );
    openAppEvent = {
      msg: JSON.stringify({
        manifestURL: event.notification.data.manifestURL,
        csId: event.notification.data.csId,
        token: event.notification.data.token,
        launch: true,
        isNeedByStream: true
      })
    };
  } else if (event.action === PUSH_ACTION_LAUNCH_CATEGORY) {
    console.log(
      '[sw] going to launch store, categoryCode',
      event.notification.data.categoryCode,
      event.notification.data.csId,
      event.notification.data.token
    );
    openAppEvent = {
      msg: JSON.stringify({
        categoryCode: event.notification.data.categoryCode,
        csId: event.notification.data.csId,
        token: event.notification.data.token,
        launch: true,
        isNeedByStream: true
      })
    };
  } else {
    console.warn('[sw] action:', event.action);
    return;
  }

  if ('openApp' in clients && openAppEvent !== null) {
    clients.openApp(openAppEvent);
  } else {
    console.error('[sw] launch app failed.', JSON.stringify(openAppEvent));
  }
});

self.addEventListener('pushsubscriptionchange', event => {
  console.log('[sw] pushsubscriptionchange recieved');
  const swEvent = event;
  getAppIndexDB()
    .then(db => {
      putRecordToAppIndexDB(STORAGE_KEY.subscriptionRecord, '{}', db);
      return getRecordFromAppIndexDB(STORAGE_KEY.l10nMapping, db);
    })
    .then(l10nResult => {
      const l10nMapping = JSON.parse(l10nResult);
      const options = {
        requireInteraction: true,
        actions: [
          {
            action: PUSH_ACTION_DISMISS_SW_FORCE_UPDATE,
            title: l10nMapping.dismiss ? l10nMapping.dismiss : 'Dismiss'
          },
          {
            action: PUSH_ACTION_SW_FORCE_UPDATE,
            title: l10nMapping.ok ? l10nMapping.ok : 'OK'
          }
        ],
        body: l10nMapping['store-update-and-launch']
      };
      const title = l10nMapping['update-available']
        ? l10nMapping['update-available']
        : 'Update available';
      swEvent.waitUntil(self.registration.showNotification(title, options));
    });
});

function handlePush(content, event, assets) {
  const isAppPush = content.manifest_url ? true : false;
  let l10nMapping = null;
  let database = null;
  getAppIndexDB()
    .then(db => {
      database = db;
      return getRecordFromAppIndexDB(STORAGE_KEY.l10nMapping, db);
    })
    .then(l10nResult => {
      l10nMapping = JSON.parse(l10nResult);
      if (isAppPush) {
        return getRecordFromAppIndexDB(content.manifest_url, database);
      }
      return false;
    })
    .then(isInstalled => {
      const optionFormatter = new OptionFormatter(
        content,
        assets,
        l10nMapping,
        isInstalled
      );

      let swEvent = event;
      if (isAppPush) {
        console.log(`[sw] the app install state is ${isInstalled}`);
        const localeData = getLocaleData(assets.manifestData, content.lang);
        const title = content.name || localeData.name;
        swEvent.waitUntil(
          self.registration.showNotification(title, optionFormatter.options)
        );
      } else {
        const title = content.name ? content.name : '';
        self.registration.showNotification(title, optionFormatter.options);
      }
    });
}

class OptionFormatter {
  constructor(content, assets, l10nMapping, isInstalled = false) {
    this.content = content;
    this.assets = assets;
    this.l10nMapping = l10nMapping;
    this.isAppPush = content.manifest_url ? true : false;
    this.isInstalled = isInstalled;
    this.isURLPush = content.url ? true : false;
    this.isCategoryPush = !!content.categoryCode;
    this.iconDefaultSize = '56';
  }

  get actions() {
    const l10nMapping = this.l10nMapping;
    const isAppPush = this.isAppPush;
    const isURLPush = this.isURLPush;
    const isCategoryPush = this.isCategoryPush;
    const isInstalled = this.isInstalled;
    let actions = null;
    if (isAppPush && isInstalled) {
      actions = [
        {
          action: PUSH_ACTION_DISMISS_LAUNCH,
          title: l10nMapping.dismiss ? l10nMapping.dismiss : 'Dismiss'
        },
        {
          action: PUSH_ACTION_LAUNCH,
          title: l10nMapping['app-push-launch-action'] || 'Go'
        }
      ];
    } else if (isAppPush && !isInstalled) {
      actions = [
        {
          action: PUSH_ACTION_DISMISS_INSTALL,
          title: l10nMapping.dismiss ? l10nMapping.dismiss : 'Dismiss'
        },
        {
          action: PUSH_ACTION_INSTALL,
          title: l10nMapping.install || 'Install'
        }
      ];
    } else if (isURLPush) {
      actions = [
        {
          action: PUSH_ACTION_DISMISS_OPEN_URL,
          title: l10nMapping.dismiss ? l10nMapping.dismiss : 'Dismiss'
        },
        {
          action: PUSH_ACTION_OPEN_URL,
          title: l10nMapping['open-url'] || 'Open URL'
        }
      ];
    } else if (isCategoryPush) {
      actions = [
        {
          action: PUSH_ACTION_DISMISS_LAUNCH,
          title: l10nMapping.dismiss ? l10nMapping.dismiss : 'Dismiss'
        },
        {
          action: PUSH_ACTION_LAUNCH_CATEGORY,
          title: l10nMapping['app-push-launch-action'] || 'Go'
        }
      ];
    } else {
      actions = [
        {
          action: PUSH_ACTION_DISMISS,
          title: l10nMapping.dismiss ? l10nMapping.dismiss : 'Dismiss'
        }
      ];
    }

    return actions;
  }

  get icon() {
    const iconDefaultSize = this.iconDefaultSize;
    const isAppPush = this.isAppPush;
    const assets = this.assets;
    let icon = null;
    if (isAppPush) {
      if (assets.iconData) {
        icon = assets.iconData;
      } else {
        const firstIconKey = Object.keys(assets.manifestData.icons)[0];
        icon = assets.manifestData.icons[iconDefaultSize]
          ? assets.manifestData.icons[iconDefaultSize]
          : assets.manifestData.icons[firstIconKey];
      }
    } else {
      icon = assets.iconData ? assets.iconData : pushCampaignIcon;
    }
    return icon;
  }

  get body() {
    const isAppPush = this.isAppPush;
    const l10nMapping = this.l10nMapping;
    const content = this.content;
    const installed = this.installed;
    const assets = this.assets;
    let message = '';

    if (content.message) {
      message = content.message;
    } else if (isAppPush && installed) {
      const localeData = getLocaleData(assets.manifestData, content.lang);
      message = l10nMapping['app-push-launch-content']
        ? l10nMapping['app-push-launch-content'].replace(
            '{{appName}}',
            localeData.name
          )
        : '';
    } else if (isAppPush && !installed) {
      message = l10nMapping['new-app-recommended'] || '';
    }

    return message;
  }

  get options() {
    const content = this.content;
    const assets = this.assets;
    return {
      mozbehavior: {
        showOnlyOnce: true,
        soundFile: assets.soundData
      },
      requireInteraction: true,
      actions: this.actions,
      data: {
        manifestURL: content.manifest_url,
        url: content.url,
        categoryCode: content.categoryCode,
        csId: content.cs_id,
        token: content.token
      },
      icon: this.icon,
      body: this.body
    };
  }
}
