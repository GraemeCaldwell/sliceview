// SliceView — Image Segmentation Tool

const MAX_DIMENSION = 1568;
const OVERLAP = 50;
const STRIDE = MAX_DIMENSION - OVERLAP;

// DOM Elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const chooseFileBtn = document.getElementById('choose-file-btn');
const uploadSection = document.getElementById('upload-section');
const resultsSection = document.getElementById('results-section');
const originalDimensions = document.getElementById('original-dimensions');
const segmentsSummary = document.getElementById('segments-summary');
const thumbnailsGrid = document.getElementById('thumbnails-grid');
const downloadAllBtn = document.getElementById('download-all-btn');
const resetBtn = document.getElementById('reset-btn');

// State
let segments = [];
let originalFileName = '';

// Event Listeners
chooseFileBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);

dropZone.addEventListener('dragover', handleDragOver);
dropZone.addEventListener('dragleave', handleDragLeave);
dropZone.addEventListener('drop', handleDrop);

downloadAllBtn.addEventListener('click', downloadAllAsZip);
resetBtn.addEventListener('click', reset);

// Drag & Drop Handlers
function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.add('drag-over');
}

function handleDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.remove('drag-over');

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    processFile(files[0]);
  }
}

function handleFileSelect(e) {
  const files = e.target.files;
  if (files.length > 0) {
    processFile(files[0]);
  }
}

// File Processing
function processFile(file) {
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file.');
    return;
  }

  originalFileName = file.name.replace(/\.[^/.]+$/, '');

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => processImage(img);
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function processImage(img) {
  const originalWidth = img.width;
  const originalHeight = img.height;

  // Calculate scaled dimensions
  let scaledWidth = originalWidth;
  let scaledHeight = originalHeight;

  if (originalWidth > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / originalWidth;
    scaledWidth = MAX_DIMENSION;
    scaledHeight = Math.round(originalHeight * scale);
  }

  // Create scaled canvas
  const scaledCanvas = document.createElement('canvas');
  scaledCanvas.width = scaledWidth;
  scaledCanvas.height = scaledHeight;
  const scaledCtx = scaledCanvas.getContext('2d');
  scaledCtx.drawImage(img, 0, 0, scaledWidth, scaledHeight);

  // Calculate segments
  segments = [];

  if (scaledHeight <= MAX_DIMENSION) {
    // No slicing needed
    const blob = canvasToBlob(scaledCanvas);
    segments.push({
      canvas: scaledCanvas,
      blob: blob,
      width: scaledWidth,
      height: scaledHeight,
      index: 1
    });
  } else {
    // Slice into segments
    let y = 0;
    let index = 1;

    while (y < scaledHeight) {
      const segmentHeight = Math.min(MAX_DIMENSION, scaledHeight - y);

      const segmentCanvas = document.createElement('canvas');
      segmentCanvas.width = scaledWidth;
      segmentCanvas.height = segmentHeight;

      const segmentCtx = segmentCanvas.getContext('2d');
      segmentCtx.drawImage(
        scaledCanvas,
        0, y, scaledWidth, segmentHeight,
        0, 0, scaledWidth, segmentHeight
      );

      const blob = canvasToBlob(segmentCanvas);
      segments.push({
        canvas: segmentCanvas,
        blob: blob,
        width: scaledWidth,
        height: segmentHeight,
        index: index
      });

      y += STRIDE;
      index++;

      // Prevent infinite loop for edge cases
      if (y >= scaledHeight - OVERLAP && y < scaledHeight) {
        break;
      }
    }
  }

  // Resolve all blobs then display
  Promise.all(segments.map(s => s.blob)).then(blobs => {
    segments.forEach((s, i) => {
      s.blob = blobs[i];
    });
    displayResults(originalWidth, originalHeight, scaledWidth, scaledHeight);
  });
}

function canvasToBlob(canvas) {
  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob), 'image/png');
  });
}

// Display Results
function displayResults(origW, origH, scaledW, scaledH) {
  // Show original info
  let infoText = `${origW} × ${origH} px`;
  if (origW !== scaledW || origH !== scaledH) {
    infoText += ` → scaled to ${scaledW} × ${scaledH} px`;
  }
  originalDimensions.textContent = infoText;

  // Show segments summary
  segmentsSummary.textContent = `${segments.length} segment${segments.length !== 1 ? 's' : ''} created`;

  // Hide download all if only one segment
  if (segments.length === 1) {
    downloadAllBtn.hidden = true;
  } else {
    downloadAllBtn.hidden = false;
  }

  // Clear and populate thumbnails grid
  thumbnailsGrid.innerHTML = '';

  segments.forEach(segment => {
    const card = document.createElement('div');
    card.className = 'thumbnail-card';

    const img = document.createElement('img');
    img.src = URL.createObjectURL(segment.blob);
    img.alt = `Segment ${segment.index}`;

    const info = document.createElement('div');
    info.className = 'info';
    const sizeKB = (segment.blob.size / 1024).toFixed(1);
    info.textContent = `${segment.width} × ${segment.height} px · ${sizeKB} KB`;

    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = 'Download';
    downloadBtn.addEventListener('click', () => downloadSegment(segment));

    card.appendChild(img);
    card.appendChild(info);
    card.appendChild(downloadBtn);
    thumbnailsGrid.appendChild(card);
  });

  // Show results section
  uploadSection.hidden = true;
  resultsSection.hidden = false;
}

// Download Functions
function downloadSegment(segment) {
  const url = URL.createObjectURL(segment.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${originalFileName}_segment_${segment.index}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function downloadAllAsZip() {
  const zip = new JSZip();

  segments.forEach(segment => {
    const filename = `${originalFileName}_segment_${segment.index}.png`;
    zip.file(filename, segment.blob);
  });

  const content = await zip.generateAsync({ type: 'blob' });

  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${originalFileName}_segments.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Reset
function reset() {
  // Clean up object URLs
  segments.forEach(segment => {
    const imgs = thumbnailsGrid.querySelectorAll('img');
    imgs.forEach(img => URL.revokeObjectURL(img.src));
  });

  segments = [];
  originalFileName = '';
  thumbnailsGrid.innerHTML = '';
  fileInput.value = '';

  resultsSection.hidden = true;
  uploadSection.hidden = false;
}
