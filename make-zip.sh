#!/bin/sh -ex

# Ensure that eslint passes.
# ./eslint.sh

rm -f unblock-with-intention.zip
cd src
zip ../unblock-with-intention.zip background.js content.js manifest.json shared.js
cd ../
