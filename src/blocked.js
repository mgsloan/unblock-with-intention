var urlParams = new URLSearchParams(window.location.search);
var hasBlocked = urlParams.has('blocked');
var hasPersonal = urlParams.has('personal');

// Show site unblocking stuff
if (hasBlocked) {
  document.title = 'Blocked site';
  const blockedUrl = urlParams.get('blocked');
  const blockedDiv = document.getElementById('blocked');
  const blockedLink = document.createElement('a');
  blockedLink.href = blockedUrl;
  blockedLink.textContent = blockedUrl;
  blockedDiv.style.display = 'inline-block';
  blockedDiv.textContent = 'Blocked ';
  blockedDiv.appendChild(blockedLink);
  document.onkeyup = ev => {
    if (ev.key === 'u' && blockedDiv.style.display === 'inline-block') {
      document.onkeyup = null;
      blockedDiv.style.display = 'none';
      const unblockDiv = document.getElementById('unblock');
      unblockDiv.style.display = 'inline-block';
      const intentionInput = document.getElementById('unblock-intention');
      intentionInput.focus();
    }
  };
}

const picsumUrl = 'https://picsum.photos/1920/1080?random';
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
  // let url = Math.random() > 0.5 ? await getApodUrl() : picsumUrl;
  let url = await getApodUrl();
  if (url === undefined || url === 'undefined') {
    url = picsumUrl;
  }
  document.body.style.backgroundImage = 'url("' + url + '")';
}
updateBackground();
