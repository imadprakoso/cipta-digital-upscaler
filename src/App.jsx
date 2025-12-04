import React, { useState, useEffect, useCallback } from 'react';
import { Upload, Image as ImageIcon, Sun, Moon, Zap, Download, AlertTriangle, FileUp } from 'lucide-react';

// Helper tetap sama
import { imageToTensor, tensorToImage } from './utils';

function App() {
  // --- STATE ---
  const [darkMode, setDarkMode] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [upscaledImage, setUpscaledImage] = useState(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState('Idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Setup Theme
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  const toggleTheme = () => setDarkMode(!darkMode);

  // Setup ONNX
  useEffect(() => {
    if (!window.ort) {
        const script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.19.0/dist/ort.all.min.js";
        script.async = true;
        document.body.appendChild(script);
    }
  }, []);

  // --- LOGIC UTAMA (SAMA SEPERTI SEBELUMNYA) ---
  const processFile = useCallback((file) => {
      if (!file) return;
      if (!file.type.startsWith('image/')) {
          setErrorMsg("Mohon upload file gambar valid.");
          return;
      }
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
         if (img.width > 1000 || img.height > 1000) {
             setErrorMsg("⚠️ Gambar > 1000px. Resiko lambat/crash di HP.");
         } else {
             setErrorMsg("");
         }
      };
      img.src = objectUrl;
      setSelectedImage(file);
      setPreviewUrl(objectUrl);
      setUpscaledImage(null);
      setSliderPosition(50);
      setIsDragging(false);
  }, []);

  const handleFileInputChange = (e) => { processFile(e.target.files[0]); };
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0]; processFile(file); };

  const handleUpscale = async () => {
    if (!selectedImage) return;
    setIsProcessing(true);
    setProgress('Initializing...');

    try {
        const ort = window.ort; 
        if (!ort) throw new Error("Library AI belum siap.");

        const session = await ort.InferenceSession.create('/models/realesrgan.onnx', { executionProviders: ['wasm'] });

        setProgress('Preparing...');
        const img = new Image();
        img.src = previewUrl;
        await new Promise(r => img.onload = r);

        if (img.width * img.height > 1000 * 1000) throw new Error("Gambar terlalu besar! Max 1000px.");

        const tensorInput = await imageToTensor(img);
        const inputTensor = new ort.Tensor('float32', tensorInput, [1, 3, img.height, img.width]);
        
        setProgress('Upscaling...');
        const results = await session.run({ [session.inputNames[0]]: inputTensor });
        const outputTensor = results[session.outputNames[0]];
        
        setProgress('Rendering...');
        const finalImage = tensorToImage(outputTensor.data, img.width * 4, img.height * 4);
        
        setUpscaledImage(finalImage);
        setIsProcessing(false);
        setProgress('Done!');

    } catch (err) {
        console.error("AI Error:", err);
        setErrorMsg(err.message || "Gagal memproses.");
        setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (upscaledImage) {
        const link = document.createElement('a');
        link.download = `HD-${selectedImage.name}`;
        link.href = upscaledImage;
        link.click();
    }
  };

  const handleSliderChange = (e) => setSliderPosition(e.target.value);

  return (
    // LAYOUT RESPONSIVE: flex-col (HP) -> md:flex-row (PC)
    // h-[100dvh] agar pas di layar browser HP modern
    <div className={`flex flex-col md:flex-row h-[100dvh] w-full transition-colors duration-300 ${darkMode ? 'dark' : ''}`}>
      
      {/* 1. PANEL KANVAS (PREVIEW) 
          Di HP: Order 1 (Tampil Duluan di Atas)
          Di PC: Order 2 (Tampil di Kanan)
      */}
      <div className="flex-1 bg-gray-50 dark:bg-dark order-1 md:order-2 p-4 md:p-8 flex items-center justify-center relative overflow-hidden min-h-[40vh]">
        
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5 dark:opacity-20 pointer-events-none" style={{backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)', backgroundSize: '30px 30px'}}></div>
        
        {upscaledImage ? (
             <div className="relative w-full h-full max-w-5xl flex items-center justify-center select-none">
                <div className="relative h-full w-auto aspect-auto max-h-[50vh] md:max-h-[80vh] rounded-xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700">
                    <img src={previewUrl} alt="Original" className="h-full w-auto object-contain pointer-events-none"/>
                    <div className="absolute inset-0 w-full h-full" style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}>
                        <img src={upscaledImage} alt="Upscaled" className="h-full w-full object-contain pointer-events-none"/>
                    </div>
                    {/* Slider Line */}
                    <div className="absolute inset-y-0 w-1 bg-white cursor-ew-resize z-20 shadow-[0_0_10px_rgba(0,0,0,0.5)]" style={{ left: `${sliderPosition}%` }}>
                        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg text-purple-600"><MoveHorizontal size={16} /></div>
                    </div>
                    <input type="range" min="0" max="100" value={sliderPosition} onChange={handleSliderChange} className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"/>
                </div>
             </div>
        ) : previewUrl ? (
            <div className="relative w-full h-full flex flex-col items-center justify-center">
                 <div className="relative group w-full flex justify-center">
                    <img src={previewUrl} alt="Preview" className="max-h-[40vh] md:max-h-[75vh] object-contain rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 bg-white/5 backdrop-blur-sm" />
                    <button onClick={() => { setSelectedImage(null); setPreviewUrl(null); }} className="absolute top-2 right-2 md:top-4 md:right-4 bg-white dark:bg-gray-800 text-red-500 p-2 md:p-3 rounded-full shadow-lg hover:scale-110 transition-transform">x</button>
                 </div>
            </div>
        ) : (
            // Upload Area Responsive
            <label 
                className={`cursor-pointer group relative z-10 w-full max-w-[500px] h-[300px] md:h-[400px] rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center backdrop-blur-sm shadow-xl mx-4
                ${isDragging ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-900/20 scale-105' : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/30'}`}
                onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
            >
                <input type="file" className="hidden" accept="image/*" onChange={handleFileInputChange} />
                <div className={`w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center mb-4 md:mb-6 transition-all duration-300 ${isDragging ? 'bg-purple-100 dark:bg-purple-800 scale-110' : 'bg-purple-50 dark:bg-gray-800 group-hover:scale-110'}`}>
                    {isDragging ? <FileUp className="w-8 h-8 md:w-12 md:h-12 text-purple-600 dark:text-purple-300 animate-bounce" /> : <ImageIcon className="w-8 h-8 md:w-12 md:h-12 text-purple-400 dark:text-gray-500 group-hover:text-purple-600" />}
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white mb-2">Upload Image</h3>
                <p className="text-gray-500 dark:text-gray-400 px-4 text-center text-sm md:text-base">
                    Tap to browse or drag file here.<br/><span className="text-xs text-orange-500 font-bold">(Max 1000px)</span>
                </p>
            </label>
        )}
      </div>

      {/* 2. PANEL KONTROL (SIDEBAR/BOTTOM BAR)
          Di HP: Order 2 (Tampil di Bawah)
          Di PC: Order 1 (Tampil di Kiri, lebar fix 320px)
      */}
      <div className="w-full md:w-80 bg-white dark:bg-darker border-t md:border-t-0 md:border-r border-gray-200 dark:border-gray-800 p-6 flex flex-col justify-between shrink-0 z-20 order-2 md:order-1 overflow-y-auto max-h-[50vh] md:max-h-full shadow-[0_-10px_40px_rgba(0,0,0,0.1)] md:shadow-none">
        <div>
          {/* Logo Hidden on Mobile if needed, but let's keep it small */}
          <div className="flex items-center justify-between mb-6">
             <div className="flex flex-col">
                <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                    Cipta Digital
                </h1>
                <p className="text-[10px] md:text-xs text-gray-400">Client-Side Processor</p>
             </div>
             {/* Theme Toggle Mobile Friendly */}
             <button onClick={toggleTheme} className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 md:hidden">
                {darkMode ? <Moon size={18}/> : <Sun size={18}/>}
             </button>
          </div>

          <div className="space-y-4 md:space-y-6">
            
            {/* Status Panel */}
            {errorMsg && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-lg text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0"/><span>{errorMsg}</span>
                </div>
            )}

            {/* Info Box */}
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 flex justify-between items-center md:block">
                <div className="text-sm">
                    <span className="text-gray-500 block">Engine:</span>
                    <span className="font-bold text-gray-700 dark:text-gray-200">ONNX Web</span>
                </div>
                <div className="text-sm text-right md:text-left md:mt-2">
                    <span className="text-gray-500 block">Status:</span>
                    <span className="font-bold text-green-500">Ready</span>
                </div>
            </div>

            {/* BUTTONS (Large Touch Targets) */}
            {upscaledImage ? (
                <div className="space-y-3">
                    <button onClick={handleDownload} className="w-full bg-green-500 hover:bg-green-600 text-white py-3 md:py-4 rounded-xl font-bold text-base md:text-lg shadow-lg shadow-green-500/20 transition-all flex items-center justify-center gap-2 active:scale-95">
                      <Download size={20} /> DOWNLOAD HD
                    </button>
                    <button onClick={() => { setUpscaledImage(null); setSliderPosition(50); }} className="w-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 py-3 rounded-xl font-bold text-sm">
                      New Image
                    </button>
                </div>
            ) : (
                <button onClick={handleUpscale} disabled={!selectedImage || isProcessing} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 md:py-4 rounded-xl font-bold text-base md:text-lg shadow-lg shadow-purple-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95">
                  {isProcessing ? (
                    <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div><span className="text-sm">{progress}</span></>
                  ) : (
                    <><Zap size={20} fill="currentColor" /> START UPSCALE</>
                  )}
                </button>
            )}
          </div>
        </div>

        {/* Footer PC Only */}
        <div className="hidden md:block">
            <div className="flex items-center justify-between mb-6 px-1">
                <span className="text-xs font-medium text-gray-400">Theme</span>
                <button onClick={toggleTheme} className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    {darkMode ? <Moon size={18}/> : <Sun size={18}/>}
                </button>
            </div>
            <div className="flex items-center gap-3 border-t border-gray-200 dark:border-gray-800 pt-5">
                <img src="/logo.png" alt="CD" className="w-9 h-9 object-contain opacity-90 brightness-0 dark:brightness-100" />
                <div className="flex flex-col"><span className="text-sm font-bold text-gray-800 dark:text-gray-200">Cipta Digital</span><span className="text-[10px] text-gray-400">Mobile Responsive v1.0</span></div>
            </div>
        </div>
      </div>
    </div>
  );
}

export default App;