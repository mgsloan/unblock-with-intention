var expiry;

// TODO: really should allow renewal of time instead of hard
// redirect, this could suck if in the middle of something.
function redirectToBlockPage(redirectPrefix) {
  window.location.replace(redirectPrefix + window.location.href);
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
          redirectToBlockPage(request.redirectPrefix);
        }
        break;
      }
      case 'UPDATE_BLOCK_INFO': {
        if (removeSubdomain(window.location.hostname) === request.baseDomain) {
          expiry = new Date(request.info.expiry);
        }
        break;
      }
    }
  });
  chrome.runtime.sendMessage({ type: 'GET_PAUSE_INFO' }, response => {
    if (!response) {
      console.warn('unblock-with-intention: null response to GET_PAUSE_INFO');
      return;
    }

    expiry = new Date(response.expiry);
    const intention = response.intention;

    const shadowDiv = document.createElement('div');
    const intentionContainerDiv = document.createElement('div');
    const intentionDiv = document.createElement('div');
    const doneButtonDiv = document.createElement('div');
    const extendButtonDiv = document.createElement('div');
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
    doneButtonDiv.style.marginRight = '1em';
    doneButtonDiv.style.borderRadius = '0.5em';
    doneButtonDiv.style.padding = '0 0.5em';
    doneButtonDiv.style.boxShadow = '-5px -5px #f99';
    doneButtonDiv.style.userSelect = 'none';
    doneButtonDiv.style.pointerEvents = 'all';
    doneButtonDiv.style.cursor = 'pointer';
    doneButtonDiv.textContent = 'Done';

    extendButtonDiv.style.display = 'inline-block';
    extendButtonDiv.style.position = 'relative';
    extendButtonDiv.style.top = '5px';
    extendButtonDiv.style.left = '5px';
    extendButtonDiv.style.border = '1px solid white';
    extendButtonDiv.style.margin = '0 1em';
    extendButtonDiv.style.borderRadius = '0.5em';
    extendButtonDiv.style.padding = '0 0.5em';
    extendButtonDiv.style.boxShadow = '-5px -5px #f99';
    extendButtonDiv.style.userSelect = 'none';
    extendButtonDiv.style.pointerEvents = 'all';
    extendButtonDiv.style.cursor = 'pointer';
    extendButtonDiv.textContent = 'Extend'

    for (var buttonYar of [doneButtonDiv, extendButtonDiv]) {
      const button = buttonYar;
      button.onmousedown = ev => {
        if (ev.button !== 0) return;
        button.style.boxShadow = '-1px -1px #f99';
        button.style.top = '1px';
        button.style.left = '1px';
      };

      button.onmouseup = ev => {
        if (ev.button !== 0) return;
        button.style.boxShadow = '-5px -5px #f99';
        button.style.top = '5px';
        button.style.left = '5px';
      };
    }

    doneButtonDiv.onclick = ev => {
      if (ev.button !== 0) return;
      chrome.runtime.sendMessage({ type: 'UNPAUSE_BLOCKING' });
    };

    extendButtonDiv.onclick = ev => {
      if (ev.button !== 0) return;
      chrome.runtime.sendMessage({ type: 'EXTEND_UNBLOCK' });
    }

    timerSpan.style.fontFamily = 'monospace';
    timerSpan.style.margin = '0 1em';

    intentionDiv.appendChild(timerSpan);
    intentionDiv.appendChild(document.createTextNode("Intention: " + intention));
    intentionDiv.appendChild(extendButtonDiv);
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
        redirectToBlockPage(response.redirectPrefix);
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
