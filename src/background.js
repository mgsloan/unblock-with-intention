var state = { baseDomainMap: {} };
const storageArea = chrome.storage.sync;

storageArea.get('state', items => {
  try {
    const storedState = JSON.parse(items['state'], stateReviver);
    if (storedState) {
      console.log('Restoring state from storage', storedState);
      state = storedState;
    }
  } catch (e) {
    console.error('Error parsing stored state', e);
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

function addBeforeRequestListener() {
  chrome.webRequest.onBeforeRequest.addListener(
    req => {
      if (req.method === 'GET') {
        const baseDomain = removeSubdomain(new URL(req.url).hostname);
        const info = getBaseDomainInfo(baseDomain);
        // console.log('block info = ', info);
        if (info) {
          if (new Date() < info.expiry) {
            // console.log('blocking paused for', baseDomain, 'so allowing request.');
            return {};
          }
          console.log('deleting expired domain info');
          setBaseDomainInfo(baseDomain, null);
        }
        console.log('page blocked - ' + req.method + ' ' + req.url);
        passwordParam = "";
        if (window['unblockPassword']) {
          passwordParam = "&personal=t&pass=" + encodeURI(unblockPassword);
        }
        return {
          redirectUrl: 'chrome-extension://' + chrome.runtime.id + '/blocked.html?blocked=' + encodeURI(req.url) + passwordParam
        };
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

function addMessageListener() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received', request);
    switch (request.type) {
      case 'GET_PAUSE_INFO': {
        sendResponse(getBaseDomainInfo(removeSubdomain(request.host)));
        break;
      }
      case 'PAUSE_BLOCKING': {
        const baseDomain = removeSubdomain(new URL(request.blockedUrl).hostname);
        const intention = request.intention;
        const now = new Date();
        const expiry = new Date(now.getTime() + 60000 * parseInt(request.time));
        setBaseDomainInfo(baseDomain, { intention, expiry });
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
  });
}

function unpauseBlocking(hostname) {
  const baseDomain = removeSubdomain(hostname);
  setBaseDomainInfo(baseDomain, null);
  const message = { type: 'UNPAUSE_BLOCKING', baseDomain };
  // TODO: would be better to be more selective.
  chrome.tabs.query({}, function(tabs) {
      for (var i=0; i<tabs.length; ++i) {
          chrome.tabs.sendMessage(tabs[i].id, message);
      }
  });
}
