const host = window.location.hostname;
if (host === 'mgsloan.com') {
  var urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('blocked')) {
    const blockedUrl = urlParams.get('blocked');
    const unblockIntention = document.getElementById('unblock-intention');
    const unblockTime = document.getElementById('unblock-time');
    const enterSubmit = ev => {
      if (ev.key === 'Enter') {
        const intention = unblockIntention.value;
        const time = parseInt(unblockTime.value);
        const wordCount = intention.split(' ').filter(x => x.length > 0).length;
        if (isNaN(time)) {
          alert('Unblock duration must be specified.');
        } else if (time < 0) {
          alert('Unblock duration cannot be negative.');
        } else if (time > 60) {
          alert('Unblock duration cannot be greater than 60 minutes.');
        } else if (wordCount < 3) {
          alert('Unblock intention must be at least 3 words.');
        } else {
          chrome.runtime.sendMessage({ type: 'PAUSE_BLOCKING', blockedUrl, intention, time }, response => {
            if (response === 'REDIRECT') {
              window.location.replace(blockedUrl);
            } else {
              throw ('Unexpected response from background page: ' + response);
            }
          });
        }
      }
    };
    unblockIntention.onkeypress = enterSubmit;
    unblockTime.onkeypress = enterSubmit;
  }
} else {
  // Omit banner / redirect on iframes.
  if (window.location === window.parent.location) {
    chrome.runtime.sendMessage({ type: 'GET_PAUSE_INFO', host }, response => {
        const expiry = new Date(response.expiry);
        const intention = response.intention;

        const shadowDiv = document.createElement('div');
        const intentionContainerDiv = document.createElement('div');
        const intentionDiv = document.createElement('div');
        const timerSpan = document.createElement('span');

        intentionContainerDiv.style['z-index'] = 2147483647
        intentionContainerDiv.style.position = 'fixed';
        intentionContainerDiv.style.top = 0;
        intentionContainerDiv.style.width = '100%';
        intentionContainerDiv.style['pointer-events'] = 'none';

        intentionDiv.style.display = 'table'; // for some reason this makes the centering work.
        intentionDiv.style.margin = 'auto';
        intentionDiv.style.background = 'rgba(0,0,0,0.5)';
        intentionDiv.style.color = 'white';
        intentionDiv.style.borderRadius = '16px';
        intentionDiv.style.padding = '8px';
        intentionDiv.style.fontSize = '30px';
        intentionDiv.style.fontFamily = 'sans';

        timerSpan.style.fontFamily = 'monospace';
        timerSpan.style.marginRight = '1em';

        intentionDiv.appendChild(timerSpan);
        intentionDiv.appendChild(document.createTextNode("Intention: " + intention));
        intentionContainerDiv.appendChild(intentionDiv);

        shadowRoot = shadowDiv.attachShadow({mode: 'closed'});
        shadowRoot.appendChild(intentionContainerDiv);
        document.body.appendChild(shadowRoot);

        let timer = null;
        const tick = () => {
        const now = new Date();
        const totalExpirySeconds = Math.floor((expiry.getTime() - now.getTime()) / 1000);
        if (totalExpirySeconds < 0) {
            clearInterval(timer);
            // TODO: really should allow renewal of time instead of hard
            // redirect, this could suck if in the middle of something.
            window.location.replace('https://mgsloan.com/start-page.html?blocked=' + encodeURI(window.location));
            return;
        }
        const expiryMinutes = Math.floor(totalExpirySeconds / 60);
        let expirySeconds = '' + (totalExpirySeconds % 60);
        if (expirySeconds.length === 1) {
            expirySeconds = '0' + expirySeconds;
        }
        timerSpan.textContent = expiryMinutes + ':' + expirySeconds;
        };
        tick();
        timer = setInterval(tick, 1000);
    });
  }
}
