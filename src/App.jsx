import React, { useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, Sun, Moon, Zap, Download, MoveHorizontal, AlertTriangle } from 'lucide-react';

// HAPUS baris 'import * as ort...' karena kita sudah load di index.html
// Import Helper tetap dipakai
import { imageToTensor, tensorToImage } from './utils';

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [upscaledImage, setUpscaledImage] = useState(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState('Idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Setup Theme
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  const toggleTheme = () => setDarkMode(!darkMode);

  // --- IMAGE UPLOAD ---
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setSelectedImage(file);
      setPreviewUrl(objectUrl);
      setUpscaledImage(null);
      setErrorMsg('');
      setSliderPosition(50);
    }
  };

  // --- LOGIC UTAMA: AI UPSCALE ---
  const handleUpscale = async () => {
    if (!selectedImage) return;
    setIsProcessing(true);
    setErrorMsg('');
    setProgress('Initializing AI Engine...');

    try {
        // AKSES LIBRARY DARI GLOBAL WINDOW
        const ort = window.ort; 

        if (!ort) {
            throw new Error("Library ONNX gagal dimuat. Cek koneksi internet Anda.");
        }

        // 1. Load Model (Pastikan file .onnx ada di public/models/)
        // Kita gunakan 'wasm' (CPU Accelerated) yang paling kompatibel
        const session = await ort.InferenceSession.create('/models/realesrgan.onnx', { 
            executionProviders: ['wasm'] 
        });

        setProgress('Preparing Image...');
        
        const img = new Image();
        img.src = previewUrl;
        await new Promise(r => img.onload = r);

        if (img.width * img.height > 1000 * 1000) {
             throw new Error("Gambar terlalu besar! Gunakan gambar < 1000px untuk demo.");
        }

        // 2. Pre-processing
        const tensorInput = await imageToTensor(img);
        const inputTensor = new ort.Tensor('float32', tensorInput, [1, 3, img.height, img.width]);
        const feeds = { [session.inputNames[0]]: inputTensor };

        setProgress('Upscaling... (Processing on Browser)');
        
        // 3. Inference
        const results = await session.run(feeds);
        const outputTensor = results[session.outputNames[0]];
        
        setProgress('Rendering...');
        
        // 4. Post-processing
        const finalImage = tensorToImage(outputTensor.data, img.width * 4, img.height * 4);
        
        setUpscaledImage(finalImage);
        setIsProcessing(false);
        setProgress('Done!');

    } catch (err) {
        console.error("AI Error:", err);
        setErrorMsg(err.message || "Terjadi kesalahan pada proses AI.");
        setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (upscaledImage) {
        const link = document.createElement('a');
        link.download = `CiptaDigital-HD-${selectedImage.name.split('.')[0]}.png`;
        link.href = upscaledImage;
        link.click();
    }
  };

  const handleSliderChange = (e) => setSliderPosition(e.target.value);

  return (
    <div className={`flex h-screen w-full transition-colors duration-300 ${darkMode ? 'dark' : ''}`}>
      
      {/* SIDEBAR */}
      <div className="w-80 bg-white dark:bg-darker border-r border-gray-200 dark:border-gray-800 p-6 flex flex-col justify-between shrink-0 z-20 overflow-y-auto">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent mb-2">
            Cipta Digital
          </h1>
          <p className="text-xs text-gray-400 mb-8">Client-Side AI Processor</p>

          <div className="space-y-6">
            
            {/* Status Panel */}
            {errorMsg && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-lg text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0"/>
                    <span>{errorMsg}</span>
                </div>
            )}

            {/* Info Box */}
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Engine:</span>
                    <span className="font-bold text-gray-700 dark:text-gray-200">ONNX Runtime Web</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Status:</span>
                    <span className="font-bold text-green-500">Ready (CDN Mode)</span>
                </div>
            </div>

            {/* BUTTONS */}
            {upscaledImage ? (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <button onClick={handleDownload} className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-green-500/20 transition-all flex items-center justify-center gap-2">
                      <Download size={20} /> DOWNLOAD HD
                    </button>
                    <button onClick={() => { setUpscaledImage(null); setSliderPosition(50); }} className="w-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 py-3 rounded-xl font-bold text-sm">
                      New Image
                    </button>
                </div>
            ) : (
                <button onClick={handleUpscale} disabled={!selectedImage || isProcessing} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-purple-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  {isProcessing ? (
                    <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div><span className="text-sm">{progress}</span></>
                  ) : (
                    <><Zap size={20} fill="currentColor" /> START UPSCALE</>
                  )}
                </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div>
            <div className="flex items-center justify-between mb-6 px-1">
                <span className="text-xs font-medium text-gray-400">Theme</span>
                <button onClick={toggleTheme} className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    {darkMode ? <Moon size={18}/> : <Sun size={18}/>}
                </button>
            </div>
            <div className="flex items-center gap-3 border-t border-gray-200 dark:border-gray-800 pt-5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-xs shadow-md">CD</div>
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200">Cipta Digital</span>
                    <span className="text-[10px] text-gray-400">Owner Access • AI Core</span>
                </div>
            </div>
        </div>
      </div>

      {/* MAIN CANVAS */}
      <div className="flex-1 bg-gray-50 dark:bg-dark p-8 flex items-center justify-center relative transition-colors duration-300 overflow-hidden">
        <div className="absolute inset-0 opacity-5 dark:opacity-20 pointer-events-none" style={{backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)', backgroundSize: '30px 30px'}}></div>
        
        {/* PREVIEW & SLIDER LOGIC SAMA SEPERTI SEBELUMNYA */}
        {upscaledImage ? (
             <div className="relative max-w-5xl w-full h-[80vh] flex items-center justify-center animate-in fade-in zoom-in duration-500">
                <div className="relative w-full h-full max-h-[75vh] flex items-center justify-center select-none">
                    <div className="relative h-full w-auto aspect-auto rounded-xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700">
                        <img src={previewUrl} alt="Original" className="h-full w-auto object-contain pointer-events-none"/>
                        <div className="absolute inset-0 w-full h-full" style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}>
                            <img src={upscaledImage} alt="Upscaled" className="h-full w-full object-contain pointer-events-none"/>
                        </div>
                        <div className="absolute inset-y-0 w-1 bg-white cursor-ew-resize z-20 shadow-[0_0_10px_rgba(0,0,0,0.5)]" style={{ left: `${sliderPosition}%` }}>
                            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg text-purple-600"><MoveHorizontal size={16} /></div>
                        </div>
                        <input type="range" min="0" max="100" value={sliderPosition} onChange={handleSliderChange} className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"/>
                    </div>
                </div>
             </div>
        ) : previewUrl ? (
            <div className="relative max-w-4xl w-full h-full flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
                 <div className="relative group">
                    <img src={previewUrl} alt="Preview" className="max-h-[75vh] object-contain rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 bg-white/5 backdrop-blur-sm" />
                    <button onClick={() => { setSelectedImage(null); setPreviewUrl(null); }} className="absolute top-4 right-4 bg-white dark:bg-gray-800 text-red-500 p-3 rounded-full shadow-lg hover:scale-110 transition-transform">x</button>
                 </div>
            </div>
        ) : (
            <label className="cursor-pointer group relative z-10">
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                <div className="flex flex-col items-center justify-center w-[500px] h-[400px] border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-3xl hover:border-purple-500 dark:hover:border-purple-500 transition-all bg-white dark:bg-gray-800/30 backdrop-blur-sm shadow-xl">
                    <div className="w-24 h-24 bg-purple-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-all"><ImageIcon size={48} className="text-purple-400 dark:text-gray-500 group-hover:text-purple-600" /></div>
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Upload Image</h3>
                    <p className="text-gray-500 dark:text-gray-400 px-10">Use Small Image for Test (e.g. 300x300px)</p>
                </div>
            </label>
        )}
      </div>
    </div>
  );
}

export default App;