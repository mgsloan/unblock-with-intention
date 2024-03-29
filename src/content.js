(function () {
  const GLOBAL_TO_PREVENT_REINTRY = 'UNBLOCK_WITH_INTENTION_ENTERED';
  if (window[GLOBAL_TO_PREVENT_REINTRY]) {
    console.warn('Unblock with intention content script already entered - skipping redundant entry.');
    return;
  } else {
    window[GLOBAL_TO_PREVENT_REINTRY] = true;
  }

  var expiry;
  var startTime;

  const browser = window.browser || window.chrome;

  function addStylesheet(extensionCssPath) {
    const linkEl = document.createElement('link');
    linkEl.setAttribute('rel', 'stylesheet');
    linkEl.setAttribute('href', browser.runtime.getURL(extensionCssPath));
    document.getElementsByTagName('head')[0].appendChild(linkEl);
  }

  addStylesheet('shared.css');

  // TODO: really should allow renewal of time instead of hard
  // redirect, this could suck if in the middle of something.
  function redirectToBlockPage(redirectPrefix) {
    window.location.replace(redirectPrefix + window.location.href);
  }

  function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
  }

  function secondsToTimestamp(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    let seconds = '' + (totalSeconds % 60);
    if (seconds.length === 1) {
      seconds = '0' + seconds;
    }
    return minutes + ':' + seconds;
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
            startTime = new Date(request.info.startTime);
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
      startTime = new Date(response.startTime);
      const intention = response.intention;

      const shadowDiv = document.createElement('div');
      const intentionContainerDiv = document.createElement('div');
      const intentionDiv = document.createElement('div');
      const spacerSpan = document.createElement('span');
      const doneButtonDiv = document.createElement('div');
      const extendButtonDiv = document.createElement('div');
      const timerSpan = document.createElement('span');
      const clockDiv = document.createElement('div');

      intentionContainerDiv.style['z-index'] = 2147483647;
      intentionContainerDiv.style.position = 'fixed';
      intentionContainerDiv.style.bottom = '32px';
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

      spacerSpan.style.width = '1em';

      doneButtonDiv.style.display = 'inline-block';
      doneButtonDiv.style.position = 'relative';
      doneButtonDiv.style.top = '5px';
      doneButtonDiv.style.left = '5px';
      doneButtonDiv.style.border = '1px solid white';
      doneButtonDiv.style.marginRight = '1em';
      doneButtonDiv.style.borderRadius = '0.5em';
      doneButtonDiv.style.margin = '0 0.5em';
      doneButtonDiv.style.padding = '0 0.5em';
      doneButtonDiv.style.boxShadow = '-5px -5px #ddd';
      doneButtonDiv.style.userSelect = 'none';
      doneButtonDiv.style.pointerEvents = 'all';
      doneButtonDiv.style.cursor = 'pointer';
      doneButtonDiv.textContent = 'Done';

      extendButtonDiv.style.display = 'inline-block';
      extendButtonDiv.style.position = 'relative';
      extendButtonDiv.style.top = '5px';
      extendButtonDiv.style.left = '5px';
      extendButtonDiv.style.border = '1px solid white';
      extendButtonDiv.style.borderRadius = '0.5em';
      extendButtonDiv.style.margin = '0 0.5em';
      extendButtonDiv.style.padding = '0 0.5em';
      extendButtonDiv.style.boxShadow = '-5px -5px #ddd';
      extendButtonDiv.style.userSelect = 'none';
      extendButtonDiv.style.pointerEvents = 'all';
      extendButtonDiv.style.cursor = 'pointer';
      extendButtonDiv.textContent = 'Extend';

      clockDiv.setAttribute('id', 'clock');
      clockDiv.setAttribute('class', 'block');
      clockDiv.style['z-index'] = 2147483647;
      clockDiv.style.pointerEvents = 'none';

      chrome.runtime.sendMessage({ type: 'GET_OPTIONS' }, (options) => {
        if (!options.allowExtend) {
          extendButtonDiv.style.display = 'none';
        }
      });

      for (const button of [doneButtonDiv, extendButtonDiv]) {
        const downHandler = ev => {
          if (ev.button !== 0) return;
          button.style.boxShadow = '-1px -1px #fff';
          button.style.top = '1px';
          button.style.left = '1px';
        };

        const upHandler = ev => {
          if (ev.button !== 0) return;
          button.style.boxShadow = '-5px -5px #ddd';
          button.style.top = '5px';
          button.style.left = '5px';
        };

        button.onmousedown = downHandler;
        button.onmouseup = upHandler;
        button.onmouseleave = upHandler;
      }

      doneButtonDiv.onclick = ev => {
        if (ev.button !== 0) return;
        chrome.runtime.sendMessage({ type: 'UNPAUSE_BLOCKING' });
      };

      extendButtonDiv.onclick = ev => {
        if (ev.button !== 0) return;
        chrome.runtime.sendMessage({ type: 'EXTEND_UNBLOCK' });
      };

      timerSpan.style.fontFamily = 'monospace';
      timerSpan.style.margin = '0 1em';

      intentionDiv.appendChild(timerSpan);
      intentionDiv.appendChild(document.createTextNode("Intention: " + intention));
      intentionDiv.appendChild(spacerSpan);
      if (response.allowExtension) {
        intentionDiv.appendChild(extendButtonDiv);
      }
      intentionDiv.appendChild(doneButtonDiv);
      intentionContainerDiv.appendChild(intentionDiv);

      shadowRoot = shadowDiv.attachShadow({mode: 'closed'});
      shadowRoot.appendChild(intentionContainerDiv);
      shadowRoot.appendChild(clockDiv);
      document.body.appendChild(shadowRoot);

      periodicallyUpdateClock(clockDiv);

      let timer = null;
      const tick = () => {
        const now = new Date();
        const totalExpirySeconds = Math.ceil((expiry.getTime() - now.getTime()) / 1000);
        if (totalExpirySeconds < 0) {
          clearInterval(timer);
          redirectToBlockPage(response.redirectPrefix);
          return;
        }
        const totalUnblockSeconds = Math.ceil((expiry.getTime() - startTime.getTime()) / 1000);
        timerSpan.textContent =
          secondsToTimestamp(totalExpirySeconds)
          + ' / '
          + secondsToTimestamp(totalUnblockSeconds);
      };
      tick();
      timer = setInterval(tick, 1000);
    });
  }
})();
