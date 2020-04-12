const storageArea = chrome.storage.sync;

const baseDomainMap = {};

function baseDomainToKey(baseDomain) {
  return 'domain:' + baseDomain;
}

function baseDomainFromKey(key) {
  return stripPrefix('domain:', key);
}

function setBaseDomainInfo(baseDomain, info) {
  const key = baseDomainToKey(baseDomain);
  if (info) {
    const items = {};
    baseDomainMap[baseDomain] = info;
    storageArea.set(items);
  } else {
    delete baseDomainMap[baseDomain];
    storageArea.remove(key);
  }
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'sync') {
    throw 'Unexpected areaName:' + areaName;
  }
  for (key in changes) {
    const change = changes[key];
    const baseDomain = baseDomainForKey(key);
    if (baseDomain) {
      if (change.newValue) {
        baseDomainMap[baseDomain] = change.newValue;
      } else {
        delete baseDomainMap[baseDomain];
      }
    }
  }
});

chrome.webRequest.onBeforeRequest.addListener(
  req => {
    if (req.method === 'GET') {
      const baseDomain = removeSubdomain(new URL(req.url).hostname);
      const info = baseDomainMap[baseDomain];
      console.log('block info = ', info);
      if (info) {
        if (new Date() < info.expiry) {
          console.log('blocking paused for', baseDomain, 'so allowing request.');
          return {};
        }
        console.log('deleting expired domain info');
        setBaseDomainInfo(baseDomain, null);
      }
      console.log('page blocked - ' + req.method + ' ' + req.url);
      passwordParam = "";
      if (startPagePassword) {
        passwordParam = "&personal=t&pass=" + encodeURI(startPagePassword);
      }
      return {
        redirectUrl: 'https://mgsloan.com/start-page.html?blocked=' + encodeURI(req.url) + passwordParam
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
    ]
  },
  ['blocking']
);

chrome.runtime.onMessage.addListener(
  (request, sender, sendResponse) => {
    console.log('Received', request);
    switch (request.type) {
      case 'GET_PAUSE_INFO': {
        sendResponse(baseDomainMap[removeSubdomain(request.host)]);
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
