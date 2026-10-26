import imageCompression from 'browser-image-compression';

export const compressImage = async (file: File, targetMaxSizeMB = 0.8): Promise<File> => {
  if (!file || !file.type || !file.type.startsWith('image/') || file.type.includes('svg')) {
    return file;
  }

  const options = {
    maxSizeMB: targetMaxSizeMB,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.8,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    console.log(`[imageService] Compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
    
    // If output file is still larger than 1MB, run a second aggressive pass
    if (compressedFile.size > 1024 * 1024) {
      const secondPassOptions = {
        maxSizeMB: 0.4,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
        fileType: 'image/jpeg',
        initialQuality: 0.7,
      };
      const twiceCompressed = await imageCompression(compressedFile, secondPassOptions);
      console.log(`[imageService] Second pass compressed: ${(twiceCompressed.size / 1024 / 1024).toFixed(2)}MB`);
      return twiceCompressed;
    }

    return compressedFile;
  } catch (error) {
    console.warn('[imageService] browser-image-compression failed, using canvas fallback:', error);
    try {
      return await compressWithCanvas(file, 1400, 0.75);
    } catch (canvasErr) {
      console.error('[imageService] Canvas fallback failed, returning original file:', canvasErr);
      return file;
    }
  }
};

/**
 * Fallback canvas compressor if web worker / browser-image-compression fails
 */
function compressWithCanvas(file: File, maxWidth = 1400, quality = 0.75): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxWidth) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxWidth) / height);
          height = maxWidth;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Canvas context unavailable'));
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Canvas blob conversion failed'));
          const newName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
          const newFile = new File([blob], newName, { type: 'image/jpeg', lastModified: Date.now() });
          resolve(newFile);
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

