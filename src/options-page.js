{

let urlInput;
let passwordInput;
let refreshMinutesInput;
let typingChallengesInput;
let currentBlockPatterns = [];

function initialize() {
  urlInput = document.getElementById('url');
  passwordInput = document.getElementById('password');
  refreshMinutesInput = document.getElementById('refresh-minutes');
  typingChallengesInput = document.getElementById('typing-challenges');
  const permissionsInput = document.getElementById('permissions');
  const permissionsButton = document.getElementById('permissions-button');

  urlInput.addEventListener('input', handleChange)
  passwordInput.addEventListener('input', handleChange)
  refreshMinutesInput.addEventListener('input', handleChange);
  typingChallengesInput.addEventListener('input', handleChange);

  chrome.runtime.sendMessage({ type: 'GET_OPTIONS' }, (options) => {
    if (options.url) {
      urlInput.value = options.url;
    }
    if (options.password) {
      passwordInput.value = options.password;
    }
    if (options.refreshMinutes) {
      refreshMinutesInput.value = options.refreshMinutes;
    }
    if (options.blockPatterns) {
      currentBlockPatterns = options.blockPatterns;
      permissionsInput.value = currentBlockPatterns.join('\n');
    }
  });

  permissionsButton.addEventListener('click', () => {
    const blockPatterns =
          permissionsInput.value.split('\n')
          .filter((ln) => ln.trim().length != 0);
    const permissions = { origins: blockPatterns };
    chrome.permissions.request(permissions, (granted) => {
      if (granted) {
        currentBlockPatterns = blockPatterns;
        handleChange();
      }
    });
  });
}

function handleChange() {
  const options = {
    url: urlInput.value,
    password: passwordInput.value,
    refreshMinutes: refreshMinutesInput.value,
    typingChallenges: typingChallengesInput.value,
    blockPatterns: currentBlockPatterns,
  };
  chrome.runtime.sendMessage({ type: 'SET_OPTIONS', options });
}

initialize();

}
