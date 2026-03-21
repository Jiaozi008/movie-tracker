/**
 * Image processing utilities
 * Extracted from MovieForm for reusability and testability
 */

const MAX_WIDTH = 300;
const QUALITY = 0.6;

/**
 * Resize and compress an image (Blob or data URL), returning a base64 data URL.
 * - Scales down to maxWidth if wider
 * - Compresses to WebP (default) at lower quality for storage efficiency
 */
export function resizeImage(
    source: Blob | string,
    maxWidth: number = MAX_WIDTH,
    quality: number = QUALITY
): Promise<string> {
    return new Promise((resolve, reject) => {
        const processImage = (src: string) => {
            const img = new Image();
            img.src = src;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const scaleSize = maxWidth / img.width;

                if (scaleSize < 1) {
                    canvas.width = maxWidth;
                    canvas.height = img.height * scaleSize;
                } else {
                    canvas.width = img.width;
                    canvas.height = img.height;
                }

                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

                // Use WebP for better compression
                const outputType = 'image/webp';
                resolve(canvas.toDataURL(outputType, quality));
            };
            img.onerror = (err) => reject(err);
        };

        if (source instanceof Blob) {
            const reader = new FileReader();
            reader.readAsDataURL(source);
            reader.onload = (event) => processImage(event.target?.result as string);
            reader.onerror = (err) => reject(err);
        } else {
            processImage(source);
        }
    });
}
