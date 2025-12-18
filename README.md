# SliceView

**[Use it here →](https://graemecaldwell.github.io/sliceview/)**

Segment large screenshots for AI vision APIs.

## Why?

AI vision APIs perform best with images under 1568px on the longest edge. Larger images get automatically resized, adding latency without improving accuracy. Full-page screenshots often exceed this—SliceView chops them into optimally-sized tiles.

## How it works

1. Drop an image (or click to select)
2. Images wider than 1568px are scaled down
3. Tall images are split into segments with 50px overlap
4. Download individually or as a ZIP

All processing happens in-browser. Nothing is uploaded.
