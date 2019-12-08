{
  const host = window.location.hostname;
  if (host === 'mgsloan.com') {
    if (urlParams.has('blocked')) {
        const blockedUrl = urlParams.get('blocked');
      const blockedDiv = document.getElementById('unblock-form');
    }
  } else {
    chrome.runtime.sendMessage({ type: 'GET_PAUSE_INFO', host }, response => {
        if (response) {
        } else {
        console.error('did not receive response from background page');
        }
    });
  }
}
