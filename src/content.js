// TODO: really should allow renewal of time instead of hard
// redirect, this could suck if in the middle of something.
function redirectToBlockPage(redirectUrl) {
  // FIXME: plumb this from background.js
  window.location.replace('https://mgsloan.com/start-page.html?blocked=' + encodeURI(window.location));
}

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

const host = window.location.hostname;
// Omit banner / redirect on iframes.
if (window.location === window.parent.location) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.type) {
      case 'UNPAUSE_BLOCKING': {
        if (removeSubdomain(window.location.hostname) === request.baseDomain) {
          redirectToBlockPage();
        }
      }
    }
  });
  chrome.runtime.sendMessage({ type: 'GET_PAUSE_INFO', host }, response => {
    const expiry = new Date(response.expiry);
    const intention = response.intention;

    // FIXME: use utils from todois-shortcuts.

    const shadowDiv = document.createElement('div');
    const intentionContainerDiv = document.createElement('div');
    const intentionDiv = document.createElement('div');
    const doneButtonDiv = document.createElement('div');
    const timerSpan = document.createElement('span');

    intentionContainerDiv.style['z-index'] = 2147483647;
    intentionContainerDiv.style.position = 'fixed';
    intentionContainerDiv.style.top = '0';
    intentionContainerDiv.style.width = '100%';
    intentionContainerDiv.style.pointerEvents = 'none';

    intentionDiv.style.display = 'table'; // for some reason this makes the centering work.
    intentionDiv.style.margin = 'auto';
    intentionDiv.style.background = 'rgba(0,0,0,0.5)';
    intentionDiv.style.color = 'white';
    intentionDiv.style.borderRadius = '16px';
    intentionDiv.style.padding = '8px';
    intentionDiv.style.fontSize = '30px';
    intentionDiv.style.fontFamily = 'sans';

    doneButtonDiv.style.display = 'inline-block';
    doneButtonDiv.style.position = 'relative';
    doneButtonDiv.style.top = '5px';
    doneButtonDiv.style.left = '5px';
    doneButtonDiv.style.border = '1px solid white';
    doneButtonDiv.style.margin = '0 1em';
    doneButtonDiv.style.borderRadius = '0.5em';
    doneButtonDiv.style.padding = '0 0.5em';
    doneButtonDiv.style.boxShadow = '-5px -5px #f99';
    doneButtonDiv.style.userSelect = 'none';
    doneButtonDiv.style.pointerEvents = 'all';
    doneButtonDiv.style.cursor = 'pointer';
    doneButtonDiv.textContent = 'Done';

    doneButtonDiv.onmousedown = ev => {
      if (ev.button !== 0) return;
      doneButtonDiv.style.boxShadow = '-1px -1px #f99';
      doneButtonDiv.style.top = '1px';
      doneButtonDiv.style.left = '1px';
    };

    doneButtonDiv.onmouseup = ev => {
      if (ev.button !== 0) return;
      doneButtonDiv.style.boxShadow = '-5px -5px #f99';
      doneButtonDiv.style.top = '5px';
      doneButtonDiv.style.left = '5px';
    };

    doneButtonDiv.onclick = ev => {
      if (ev.button !== 0) return;
      chrome.runtime.sendMessage({ type: 'UNPAUSE_BLOCKING', hostname: window.location.hostname });
    };

    timerSpan.style.fontFamily = 'monospace';
    timerSpan.style.margin = '0 1em';

    intentionDiv.appendChild(timerSpan);
    intentionDiv.appendChild(document.createTextNode("Intention: " + intention));
    intentionDiv.appendChild(doneButtonDiv);
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
        redirectToBlockPage(redirectUrl);
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
