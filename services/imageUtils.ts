
// --- Image Processing Utility Service ---
// Focuses purely on Canvas manipulation and Blob conversions.

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
    };
    reader.onerror = error => reject(error);
  });
};

export const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

// Optimizes image size before sending to API to save bandwidth and reduce timeouts
// Max dimension set to 1536px (good balance for Gemini 2.5)
export const optimizeImage = async (file: File, maxDimension: number = 1536): Promise<string> => {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    let { width, height } = img;

    if (width <= maxDimension && height <= maxDimension) {
      // If image is small enough, return original base64 to save CPU
      return await fileToBase64(file);
    }

    // Calculate aspect ratio
    if (width > height) {
      if (width > maxDimension) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      }
    } else {
      if (height > maxDimension) {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Canvas context failed");

    ctx.drawImage(img, 0, 0, width, height);
    
    // Return optimized JPEG to reduce payload size
    return canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
  } finally {
    URL.revokeObjectURL(url);
  }
};

export const createCompositeVisualPrompt = async (originalFile: File, maskBlob: Blob): Promise<string> => {
  const originalUrl = URL.createObjectURL(originalFile);
  const maskUrl = URL.createObjectURL(maskBlob);

  try {
    const [img, mask] = await Promise.all([loadImage(originalUrl), loadImage(maskUrl)]);
    
    // Resize Logic matches the optimize function to ensure alignment
    const MAX_DIM = 1536; 
    let width = img.naturalWidth;
    let height = img.naturalHeight;

    if (width > MAX_DIM || height > MAX_DIM) {
      const ratio = width / height;
      if (width > height) {
        width = MAX_DIM;
        height = Math.round(MAX_DIM / ratio);
      } else {
        height = MAX_DIM;
        width = Math.round(MAX_DIM * ratio);
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Canvas context failed");

    // 1. Draw base image
    ctx.drawImage(img, 0, 0, width, height);

    // 2. Prepare Mask Overlay
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = width;
    maskCanvas.height = height;
    const mCtx = maskCanvas.getContext('2d');
    if (!mCtx) throw new Error("Mask canvas context failed");

    mCtx.drawImage(mask, 0, 0, width, height);
    const maskData = mCtx.getImageData(0, 0, width, height);
    const data = maskData.data;

    // 3. Convert mask to Gemini-friendly Magenta (#FF00FF)
    // Threshold check ensures we catch semi-transparent brush strokes
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 50) { // If red channel has content
        data[i] = 255;     // R
        data[i + 1] = 0;   // G
        data[i + 2] = 255; // B
        data[i + 3] = 255; // Alpha
      } else {
        data[i + 3] = 0;   // Transparent
      }
    }
    mCtx.putImageData(maskData, 0, 0);
    
    // 4. Composite
    ctx.drawImage(maskCanvas, 0, 0);

    return canvas.toDataURL('image/png').split(',')[1];

  } finally {
    URL.revokeObjectURL(originalUrl);
    URL.revokeObjectURL(maskUrl);
  }
};
