{
  const host = window.location.hostname;
  if (host === 'mgsloan.com') {
    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('blocked')) {
      const blockedUrl = urlParams.get('blocked');
      const unblockReason = document.getElementById('unblock-reason');
      const unblockTime = document.getElementById('unblock-time');
      const enterSubmit = ev => {
        if (ev.key === 'Enter') {
          chrome.runtime.sendMessage({ type: 'PAUSE_BLOCKING', blockedUrl }, response => {
            if (response === 'REDIRECT') {
              window.location.replace(blockedUrl);
            } else {
              throw ('Unexpected response from background page: ' + response);
            }
          });
        }
      };
      unblockReason.onkeypress = enterSubmit;
      unblockTime.onkeypress = enterSubmit;
    }
  } else {
    chrome.runtime.sendMessage({ type: 'GET_PAUSE_INFO', host }, response => {
      if (response) {
      } else {
        throw 'Did not receive response from background page';
      }
    });
  }
}
