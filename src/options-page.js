{

  const urlInput = document.getElementById('url');
  const passwordInput = document.getElementById('password');
  const refreshMinutesInput = document.getElementById('refresh-minutes');
  const typingChallengesInput = document.getElementById('typing-challenges');
  const allowExtendInput = document.getElementById('allow-extend');
  const permissionsInput = document.getElementById('permissions');
  const permissionsButton = document.getElementById('permissions-button');

  function initialize() {
    urlInput.addEventListener('input', handleChange);
    passwordInput.addEventListener('input', handleChange);
    refreshMinutesInput.addEventListener('input', handleChange);
    typingChallengesInput.addEventListener('input', handleChange);
    allowExtendInput.addEventListener('change', handleChange);

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
      if (options.typingChallenges) {
        typingChallengesInput.value = options.typingChallenges;
      }
      if (options.allowExtend) {
        allowExtendInput.checked = true;
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
      allowExtend: allowExtendInput.checked,
      blockPatterns: currentBlockPatterns,
    };
    chrome.runtime.sendMessage({ type: 'SET_OPTIONS', options });
  }

  initialize();

}
