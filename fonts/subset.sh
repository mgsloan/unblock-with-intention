#!/bin/bash
DEST="../src/major-mono"
mkdir -p "$DEST"

rm -f "$DEST/OFL.txt"
cp major-mono/OFL.txt "$DEST/OFL.txt"

rm -f "$DEST/clock-subset.woff"
pyftsubset \
    major-mono/font.ttf \
    --output-file="$DEST/clock-subset.woff" \
    --flavor=woff2 \
    --layout-features="" \
    --unicodes="U+0030-003B"
