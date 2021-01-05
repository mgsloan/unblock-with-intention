function initialize() {
  urlInput = document.getElementById('url');
  passwordInput = document.getElementById('password');
  refreshMinutesInput = document.getElementById('refresh-minutes');

  urlInput.addEventListener('input', handleChange)
  passwordInput.addEventListener('input', handleChange)
  refreshMinutesInput.addEventListener('input', handleChange);

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
  });
}

function handleChange() {
  const options = {
    url: urlInput.value,
    password: passwordInput.value,
    refreshMinutes: refreshMinutesInput.value,
  };
  chrome.runtime.sendMessage({ type: 'SET_OPTIONS', options });
}

initialize();
