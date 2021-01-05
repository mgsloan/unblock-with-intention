var state = { baseDomainMap: {} };
const storageArea = chrome.storage.sync;

storageArea.get('state', items => {
  const stateJson = items['state'];
  if (stateJson) {
    try {
        const storedState = JSON.parse(items['state'], stateReviver);
        if (storedState) {
        console.log('Restoring state from storage', storedState);
        state = storedState;
        }
    } catch (e) {
        console.error('Error parsing stored state', e, '\nstate = ', stateJson);
    }
  }
  addBeforeRequestListener();
  // TODO: Does this means there's a race where messages might get
  // dropped?
  addMessageListener();
  addCommandListener();
});

function stateReviver(key, value) {
  if (key === 'expiry' && typeof value === 'string') {
    return new Date(value);
  }
  return value;
}

function getBaseDomainInfo(baseDomain) {
  return state.baseDomainMap[baseDomain];
}

function setBaseDomainInfo(baseDomain, info) {
  if (info) {
    state.baseDomainMap[baseDomain] = info;
  } else {
    delete state.baseDomainMap[baseDomain];
  }
  const stateString = JSON.stringify(state);
  console.log('Setting state to', stateString);
  storageArea.set({ state: stateString });
}

function pauseBlocking(baseDomain, intention, minutes, expiry) {
  const oldInfo = getBaseDomainInfo(baseDomain);
  var blockReasons = [];
  if (oldInfo && oldInfo['blockReasons']) {
    blockReasons = oldInfo.blockReasons;
  } else {
    blockReasons.push({ intention, minutes });
  }
  setBaseDomainInfo(baseDomain, { intention, expiry, blockReasons });
}

function addStorageChangeListener() {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'sync') {
      log.error('Unexpected areaName:', areaName);
    }
    for (key in changes) {
      const change = changes[key];
      if (key === 'state' && change.newValue) {
        if (change.newValue) {
          state = change.newValue;
        } else {
          log.error('newValue for state change not set?!');
        }
      } else {
        log.warn('Unrecognized storage change for key:', key);
      }
    }
  });
}

// Rather imprecise regex to determine if it's an oauth
// request. Modeled after Facebook's oauth url.
const OAUTH_REGEX = /\/oauth/;

function addBeforeRequestListener() {
  chrome.webRequest.onBeforeRequest.addListener(
    req => {
      if (req.method === 'GET') {
        if (OAUTH_REGEX.exec(req.url)) {
          console.log('allowing GET request that seems to involve oauth.');
          return {};
        }
        const baseDomain = removeSubdomain(new URL(req.url).hostname);
        const info = getBaseDomainInfo(baseDomain);
        if (info) {
          if (new Date() < info.expiry) {
            // console.log('blocking paused for', baseDomain, 'so allowing request.');
            return {};
          }
          console.log('deleting expired domain info');
          setBaseDomainInfo(baseDomain, null);
        }
        console.log('page blocked - ' + req.method + ' ' + req.url);
        return { redirectUrl: buildRedirectUrl(req.url) };
      } else {
        console.log('non GET request to blocked page allowed - ' + req.method + ' ' + req.url);
        return {};
      }
    },
    {
      urls: [
        '*://*.reddit.com/*',
        '*://facebook.com/*',
        '*://*.facebook.com/*',
        '*://netflix.com/*',
        // Somehow blocking the above sites dredged up slashdot muscle
        // memory of yore.
        '*://slashdot.org/*',
      ]
    },
    ['blocking']
  );
}

const redirectPrefix =
  'chrome-extension://' + chrome.runtime.id + '/blocked.html?blocked=';

function buildRedirectUrl(url) {
  return redirectPrefix + encodeURI(url);
}

function addMessageListener() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received', request);
    switch (request.type) {
      case 'GET_PAUSE_INFO': {
        console.log('baseDomainMap =', state.baseDomainMap);
        const info = getBaseDomainInfo(removeSubdomain(request.host));
        if (info) {
          const response = {
            intention: info.intention,
            expiry: info.expiry,
            redirectPrefix,
          };
          console.log('Sending GET_PAUSE_INFO for', request.host, ':', response);
          sendResponse(response);
        } else {
          sendResponse(null);
        }
        break;
      }
      case 'GET_BLOCK_INFO': {
        sendResponse(getBaseDomainInfo(urlToBaseDomain(request.blockedUrl)));
        break;
      }
      case 'PAUSE_BLOCKING': {
        const baseDomain = urlToBaseDomain(request.blockedUrl);
        const intention = request.intention;
        const now = new Date();
        const minutes = parseInt(request.time);
        const expiry = new Date(now.getTime() + 60000 * minutes);
        pauseBlocking(baseDomain, intention, minutes, expiry);
        sendResponse('REDIRECT');
        break;
      }
      case 'UNPAUSE_BLOCKING': {
        unpauseBlocking(request.hostname);
        break;
      }
      default: {
        console.error('Unexpected request: ', request);
      }
    }
  });
}

function addCommandListener() {
  chrome.commands.onCommand.addListener(function(command) {
    console.log('Received command:', command);
    switch (command) {
      case 'reblock': {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
          if (tabs.length === 0) {
            console.error('On command execution there were no active tabs');
            return;
          } if (tabs.length > 1) {
            console.error('On command execution there was more than one active tab');
          }
          const tab = tabs[0];
          unpauseBlocking(new URL(tab.url).hostname);
        });
      }
      default: {
        console.error('Unexpected command: ', command);
      }
    }
  });
}

function unpauseBlocking(hostname) {
  const baseDomain = removeSubdomain(hostname);
  setBaseDomainInfo(baseDomain, null);
  const message = { type: 'UNPAUSE_BLOCKING', baseDomain, redirectPrefix };
  // TODO: would be better to be more selective.
  chrome.tabs.query({}, function(tabs) {
      for (var i=0; i<tabs.length; ++i) {
          chrome.tabs.sendMessage(tabs[i].id, message);
      }
  });
}
