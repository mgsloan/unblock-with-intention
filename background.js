const filter = {
  urls: [
    '*://*.reddit.com/*',
    '*://facebook.com/*',
    '*://*.facebook.com/*',
    '*://netflix.com/*',
  ],
};

const opt = ['blocking'];

const blockInfo = {};

chrome.webRequest.onBeforeRequest.addListener(
  req => {
    if (req.method === 'GET') {
      const baseDomain = removeSubdomain(new URL(req.url).hostname);
      const info = blockInfo[baseDomain];
      console.log('block info = ', info);
      if (info) {
        if (new Date() < info.expiry) {
          console.log('blocking paused for', baseDomain, 'so allowing request.');
          return {}
        }
        console.log('deleting expired blockinfo');
        delete blockInfo[baseDomain];
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
  filter,
  opt
);

chrome.runtime.onMessage.addListener(
  (request, sender, sendResponse) => {
    console.log('Received', request);
    switch (request.type) {
      case 'GET_PAUSE_INFO': {
        sendResponse(blockInfo[removeSubdomain(request.host)]);
        break;
      }
      case 'PAUSE_BLOCKING': {
        const baseDomain = removeSubdomain(new URL(request.blockedUrl).hostname);
        const intention = request.intention;
        const now = new Date();
        const expiry = new Date(now.getTime() + 60000 * parseInt(request.time));
        blockInfo[baseDomain] = { intention, expiry };
        sendResponse('REDIRECT');
        break;
      }
      case 'UNPAUSE_BLOCKING': {
        const baseDomain = removeSubdomain(request.hostname);
        delete blockInfo[baseDomain];
        const message = { type: 'UNPAUSE_BLOCKING', baseDomain };
        // TODO: would be better to be more selective.
        chrome.tabs.query({}, function(tabs) {
            for (var i=0; i<tabs.length; ++i) {
                chrome.tabs.sendMessage(tabs[i].id, message);
            }
        });
        break;
      }
      default: {
        console.error('Unexpected request: ', request);
      }
    }
  });
