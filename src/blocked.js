const PICSUM_URL = 'https://picsum.photos/1920/1080?random';

const urlParams = new URLSearchParams(window.location.search);
const blockedUrl = urlParams.get('blocked');

const blockedDiv = document.getElementById('blocked');
const unblockIntention = document.getElementById('unblock-intention');
const unblockTime = document.getElementById('unblock-time');

var state = { tag: 'initial' };

function initialize() {
  if (blockedUrl) {
    populatePage();
    setKeyPressHandlers();
  }
  updateBackground();
}

function populatePage() {
  document.title = blockedUrl;
  const blockedLink = document.createElement('a');
  blockedLink.href = blockedUrl;
  blockedLink.textContent = blockedUrl;
  blockedDiv.style.display = 'inline-block';
  blockedDiv.textContent = 'Blocked ';
  blockedDiv.appendChild(blockedLink);
  document.onkeyup = keyHandler;
}

function keyHandler(ev) {
  const unblockDiv = document.getElementById('unblock');
  const someModifier = ev.altKey || ev.ctrlKey || ev.metaKey;
  switch (state.tag + ' ' + ev.key) {
  case 'initial u':
    blockedDiv.style.display = 'none';
    unblockDiv.style.display = 'inline-block';
    const intentionInput = document.getElementById('unblock-intention');
    intentionInput.focus();
    state = { tag: 'input' };
    break;
  case 'confirm y':
    pauseBlocking(state.intention, state.time);
    break;
  case 'confirm n':
    const confirmDiv = document.getElementById('unblock-confirm');
    const reminderDiv = document.getElementById('unblock-reminder');
    if (unblockDiv) {
      unblockDiv.style.display = 'none';
    }
    if (reminderDiv) {
      reminderDiv.style.display = 'none';
    }
    document.getElementById('blocked').style.display = 'inline-block';
    confirmDiv.style.display = 'none';
    unblockIntention.value = '';
    state = { tag: 'initial' };
    break;
  }
}

function setKeyPressHandlers() {
  unblockIntention.onkeypress = handleEnterKeyPress;
  unblockTime.onkeypress = handleEnterKeyPress;
}

function handleEnterKeyPress(ev) {
  const someModifier = ev.altKey || ev.ctrlKey || ev.metaKey;
  if (ev.key === 'Enter' && !someModifier) {
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
    } else if (intention.length < 10) {
      alert('Unblock intention must be at least 10 characters.');
    } else {
      const prioritiesDiv = document.getElementById('priorities');
      const unblockDiv = document.getElementById('unblock');
      const reminderDiv = document.getElementById('unblock-reminder');
      const reminderText = document.getElementById('unblock-reminder-text');
      const reminderCounter = document.getElementById('unblock-reminder-counter');
      if (prioritiesDiv && unblockDiv && reminderDiv && reminderText) {
        const priorities = prioritiesDiv.getElementsByTagName('li');
        if (priorities.length > 0) {
          const priority = priorities[getRandomInt(priorities.length)];
          reminderText.innerText = priority.innerText;
          unblockDiv.style.display = 'none';
          reminderDiv.style.display = 'inline-block';
          var tick;
          tick = (count) => () => {
            reminderCounter.innerText = count.toString();
            if (count > 0) {
              const newCount = document.hasFocus() ? count - 1 : count;
              setTimeout(tick(newCount), 1000);
            } else {
              confirmLegitimate(intention, time);
            }
          };
          tick(5)();
          return;
        }
      }
      confirmLegitimate(intention, time);
    }
  }
}

function pauseBlocking(intention, time) {
  chrome.runtime.sendMessage({ type: 'PAUSE_BLOCKING', blockedUrl, intention, time }, response => {
    if (response === 'REDIRECT') {
      window.location.replace(blockedUrl);
    } else {
      throw ('Unexpected response from background page: ' + response);
    }
  });
}

function confirmLegitimate(intention, time) {
  const confirmDiv = document.getElementById('unblock-confirm');
  const confirmIntentionText = document.getElementById('confirm-intention');
  if (confirmDiv && confirmIntentionText) {
    unblockIntention.blur();
    unblockTime.blur();
    confirmIntentionText.innerText = intention;
    confirmDiv.style.display = 'inline-block';
    state = { tag: 'confirm', intention, time };
  } else {
    pauseBlocking(intention, time);
  }
}

async function getApodUrl() {
  const today = new Date();
  today.setHours(0,0,0,0);
  // May as well be friendly to nasa's servers and try to only query apod once a day :)
  const apodDayRaw = localStorage.getItem('apodDayRaw');
  if (apodDayRaw) {
    const apodDay = new Date(apodDayRaw);
    apodDay.setHours(0,0,0,0);
    if (apodDay.getTime() == today.getTime()) {
      console.log('Date match - attempting to use cached apod url');
      const apodUrl = localStorage.getItem('apodUrl');
      if (apodUrl) {
        console.log('Successfully used cached apod url');
        return apodUrl;
      }
    }
  }
  const response = await fetch('https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY');
  const json = await response.json();
  const url = json.hdurl;
  localStorage.setItem('apodDayRaw', today.toString());
  localStorage.setItem('apodUrl', url);
  return url;
}

async function updateBackground() {
  // let url = Math.random() > 0.5 ? await getApodUrl() : PICSUM_URL;
  let url = await getApodUrl();
  if (url === undefined || url === 'undefined') {
    url = picsumUrl;
  }
  document.body.style.backgroundImage = 'url("' + url + '")';
}

initialize();
