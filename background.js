const filter = {
  urls: [
    '*://*.reddit.com/*',
    '*://facebook.com/*',
    '*://*.facebook.com/*',
  ],
};

const opt = ['blocking'];

chrome.webRequest.onBeforeRequest.addListener(
  req => {
    if (req.method === 'GET') {
      console.log('page blocked - ' + req.method + ' ' + req.url);
      return {
        // startPagePassword is defined in password.js
        redirectUrl: 'https://mgsloan.com/start-page/index.html?pass=' + startPagePassword + '&personal=t&blocked=' + encodeURI(req.url)
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
    switch (request.type) {
      case 'GET_PAUSE_INFO': {
        sendResponse({'unblock-time': 1000});
        break;
      }
      case 'PAUSE_BLOCKING': {
        break;
      }
      default: {
        console.error('Unexpected request: ', request);
      }
    }
  });
