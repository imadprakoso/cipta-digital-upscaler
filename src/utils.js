// src/utils.js

/**
 * Mengubah Image Element menjadi Tensor (Angka)
 * Input: HTMLImageElement
 * Output: Float32Array (Format: 1, 3, Height, Width)
 */
export async function imageToTensor(image) {
    const { width, height } = image;
    
    // 1. Gambar ke Canvas untuk ambil data pixel
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, width, height).data;
    
    // 2. Siapkan array untuk Tensor (Batch=1, Channel=3 (RGB), H, W)
    // Kita buang Alpha channel karena model Real-ESRGAN biasanya hanya butuh RGB
    const float32Data = new Float32Array(3 * width * height);
  
    // 3. Loop pixel dan normalisasi (0-255 menjadi 0.0-1.0)
    // Format data ONNX biasanya planar: RRRRR... GGGGG... BBBBB...
    for (let i = 0; i < width * height; i++) {
        // Data canvas urutannya: R, G, B, A, R, G, B, A...
        let r = imageData[i * 4] / 255.0;
        let g = imageData[i * 4 + 1] / 255.0;
        let b = imageData[i * 4 + 2] / 255.0;
  
        // Masukkan ke array planar
        float32Data[i] = r; // Red channel di sepertiga pertama
        float32Data[i + (width * height)] = g; // Green channel di tengah
        float32Data[i + (2 * width * height)] = b; // Blue channel di akhir
    }
  
    return float32Data;
}

/**
 * Mengubah Tensor (Output AI) kembali menjadi Gambar
 */
export function tensorToImage(tensorData, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(width, height);
    
    // Total pixels per channel
    const totalPixels = width * height;
    
    for (let i = 0; i < totalPixels; i++) {
        // Ambil data dari format planar (RRR...GGG...BBB)
        // Kadang output AI nilainya bisa sedikit di atas 1.0 atau di bawah 0.0, jadi kita clamp.
        let r = tensorData[i];
        let g = tensorData[i + totalPixels];
        let b = tensorData[i + (2 * totalPixels)];
        
        // Kembalikan ke format Canvas (RGBA berurutan) dan skala 0-255
        imageData.data[i * 4] = Math.min(Math.max(r * 255, 0), 255);     // R
        imageData.data[i * 4 + 1] = Math.min(Math.max(g * 255, 0), 255); // G
        imageData.data[i * 4 + 2] = Math.min(Math.max(b * 255, 0), 255); // B
        imageData.data[i * 4 + 3] = 255; // Alpha (Full Opaque)
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
}