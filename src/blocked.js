const PICSUM_URL = 'https://picsum.photos/1920/1080?random';

const urlParams = new URLSearchParams(window.location.search);
const blockedUrl = urlParams.get('blocked');

const blockedDiv = document.getElementById('blocked');

const unblockDiv = document.getElementById('unblock');
const unblockIntention = document.getElementById('unblock-intention');
const unblockTime = document.getElementById('unblock-time');
const unblockReasonHistory = document.getElementById('unblock-reason-history');

const confirmDiv = document.getElementById('unblock-confirm');
const confirmIntentionText = document.getElementById('confirm-intention');

const externalContentDiv = document.getElementById('external-content');

const typingContainer = document.getElementById('unblock-typing');
const typingPrompt = document.getElementById('typing-prompt');
const typingInput = document.getElementById('typing-input');
const editDistanceSpan = document.getElementById('edit-distance');
const unblockKeySpan = document.getElementById('unblock-key');

let state = { tag: 'initial' };
let options;

function initialize() {
  if (blockedUrl) {
    populatePage();
    changeState({ tag: 'initial' });
    setKeyPressHandlers();
  }
  getExternalContent();
  updateBackground();
}

function populatePage() {
  document.title = blockedUrl;
  const blockedLink = document.createElement('a');
  blockedLink.href = blockedUrl;
  blockedLink.textContent = blockedUrl;
  blockedDiv.textContent = 'Blocked ';
  blockedDiv.appendChild(blockedLink);
  document.onkeyup = keyHandler;
  const blockInfoRequest = { type: 'GET_BLOCK_INFO', blockedUrl };
  chrome.runtime.sendMessage(blockInfoRequest, renderBlockInfo);
  chrome.runtime.sendMessage({ type: 'GET_OPTIONS'}, response => {
    options = response;
  });
}

function changeState(newState) {
  blockedDiv.style.display = 'none';
  unblockDiv.style.display = 'none';
  confirmDiv.style.display = 'none';
  typingContainer.style.display = 'none';
  unblockIntention.blur();
  unblockTime.blur();
  typingInput.blur();
  switch (newState.tag) {
  case 'initial':
    blockedDiv.style.display = 'inline-block';
    unblockIntention.value = '';
    unblockTime.value = '5';
    typingInput.value = '';
    break;
  case 'intention':
    unblockDiv.style.display = 'inline-block';
    const intentionInput = document.getElementById('unblock-intention');
    intentionInput.focus();
    break;
  case 'typing':
    typingContainer.style.display = 'inline-block';
    typingInput.focus();
    break;
  case 'confirm':
    confirmDiv.style.display = 'inline-block';
    break;
  }
  state = newState;
}


function renderBlockInfo(info) {
  if (!info) {
    console.log('No block info for url', blockedUrl);
    return;
  }
  const table = document.createElement('table');
  if (info.blockReasons) {
    for (reason in info.blockReasons) {
      row = document.createElement('tr');
      intentionCol = document.createElement('td');
      timeCol = document.createElement('td');

      intentionCol.textContent = reason.intention;
      timeCol.textContent = reason.time;

      row.appendChild(intentionCol);
      row.appendChild(timeCol);
      table.appendChild(row);
    }
  }
  unblockReasonHistory.appendChild(table);
}

function keyHandler(ev) {
  const someModifier = ev.altKey || ev.ctrlKey || ev.metaKey;
  if (ev.key === 'Escape') {
    changeState({ tag: 'initial' });
  }
  switch (state.tag) {
  case 'initial':
    if (ev.key === 'u') {
      changeState({ tag: 'intention' });
    }
    return;
  case 'confirm':
    if (ev.key === state.unblockKey) {
      pauseBlocking(state.intention, state.time);
      return;
    } else if (ev.key === 'n') {
      changeState({ tag: 'initial' });
      return;
    }
  }
}

function setKeyPressHandlers() {
  unblockIntention.onkeypress = handleKeyPress;
  unblockTime.onkeypress = handleKeyPress;
}

function handleKeyPress(ev) {
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
      askUserToTypePriority();
    }
  }
}

function askUserToTypePriority() {
  const priorities = getPrioritiesList();
  if (priorities.length === 0) {
    confirmLegitimate();
  } else {
    const priorityIndex = Math.floor(Math.random() * priorities.length);
    const priorityText = priorities[priorityIndex];
    typingPrompt.innerText = priorityText;
    typingInput.onkeypress = handleTypingKeyPress(priorityText);
    changeState({ tag: 'typing' });
  }
}

function handleTypingKeyPress(expectedText) {
  return (ev) => {
    const editDistance = getEditDistance(expectedText.toLowerCase(), typingInput.value.toLowerCase());
    editDistanceSpan.innerText = editDistance;
    editDistanceSpan.style.color = editDistance < 6 ? 'lime' : 'red';
    const someModifier = ev.altKey || ev.ctrlKey || ev.metaKey;
    if (ev.key === 'Enter' && !someModifier) {
      if (editDistance < 6) {
        confirmLegitimate();
      }
    }
  };
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

function confirmLegitimate() {
  const intention = unblockIntention.value;
  const time = parseInt(unblockTime.value);
  if (confirmDiv && confirmIntentionText) {
    confirmIntentionText.innerText = intention;
    var unblockKey = String.fromCharCode(97 + Math.floor(Math.random() * 26));
    if (unblockKey === 'n') {
      unblockKey = 'y';
    }
    unblockKeySpan.innerText = unblockKey;
    changeState({ tag: 'confirm', intention, time, unblockKey });
  } else {
    pauseBlocking(intention, time);
  }
}

function getExternalContent() {
  chrome.runtime.sendMessage({ type: 'GET_EXTERNAL_CONTENT' }, (content) => {
    if (content) {
      externalContentDiv.innerHTML = content;
    }
  });
}

function getPrioritiesList() {
  const priorities = externalContentDiv.getElementsByTagName('li');
  const result = [];
  for (const priority of priorities) {
    result.push(priority.innerText);
  }
  if (options && options.typingChallenges) {
    for (const challenge of options.typingChallenges.split('\n')) {
      if (challenge.trim().length != 0) {
        result.push(challenge);
      }
    }
  }
  return result;
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
    url = PICSUM_URL;
  }
  document.body.style.backgroundImage = 'url("' + url + '")';
}

// https://gist.github.com/andrei-m/982927
function getEditDistance(a, b){
  if(a.length == 0) return b.length;
  if(b.length == 0) return a.length;

  var matrix = [];

  // increment along the first column of each row
  var i;
  for(i = 0; i <= b.length; i++){
    matrix[i] = [i];
  }

  // increment each column in the first row
  var j;
  for(j = 0; j <= a.length; j++){
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for(i = 1; i <= b.length; i++){
    for(j = 1; j <= a.length; j++){
      if(b.charAt(i-1) == a.charAt(j-1)){
        matrix[i][j] = matrix[i-1][j-1];
      } else {
        matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, // substitution
                                Math.min(matrix[i][j-1] + 1, // insertion
                                         matrix[i-1][j] + 1)); // deletion
      }
    }
  }

  return matrix[b.length][a.length];
};

initialize();
