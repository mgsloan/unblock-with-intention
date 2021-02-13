# Unblock with Intention

This is a simple browser extension which redirects away from
distracting sites. It prompts you to provide an unblock
justification and time interval.  This way, you can briefly unblock as
long as you have a constructive intention.

![](./images/unblock.png)

While blocking is paused, your intention is displayed at the bottom of
the page:

![](./images/while-unblocked.png)

The inspiration for this was using a site blocker and finding that I
would disable it to do something constructive, but then neglect to
re-enable it.

## Distinguishing Features

* Intended to work with our psychology to avoid valueless distraction.

    - Requires that you set an intention before unblocking, and
      defaults to a short time interval.

    - Can require you to type a reminder, to add friction and remind
      you of some priority / wisdom / quote / value / etc.

    - It then asks you to confirm that the intention is legitimate.
      The key-press to confirm is randomized to reduce muscle memory
      of reflexive confirmation, whereas the key-press to deny (`n` or
      `escape`) is constant.

* Blocking is always on - unblocking is just for exceptional cases
  where you have a legitimate / constrained use for the site

* Very efficient site blocking via request redirects. The extension's
  code won't be executed at all for sites that are not blocked. I got
  this idea from
  [a blog post](https://ops.tips/blog/extension-to-block-websites/) by
  [cirocosta](https://github.com/cirocosta/).

## Usage

I have not yet polished this extension enough to upload it as an
official browser extension. Here's how to use it:

1. Clone this repository

```
$ git clone https://github.com/mgsloan/unblock-with-intention
```

2. Load the extension

  - Open chrome
  - Go to chrome://extensions
  - Enable the `Developer mode` toggle in the upper right corner
  - Press `load unpacked extension` and then select this repo

3. Right click extension icon and click options (or from extension
   details page).

You can then specify sites to block like this:

```
*://*.facebook.com/*
*://*.reddit.com/*
*://*.youtube.com/*
*://*.netflix.com/*
```

You must then press "Set block sites", and it will then ask for
permissions on these sites.
