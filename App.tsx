
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, Download, RefreshCw, Layers, Image as ImageIcon, Trash2, CheckCircle, Palette, XCircle } from 'lucide-react';
import { AppState, ImageFile, BgSettings } from './types';
import { removeBackground } from './services/geminiService';
import Button from './components/Button';

const PRESET_COLORS = [
  '#FFFFFF', '#000000', '#F3F4F6', '#EF4444', '#F59E0B', 
  '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899'
];

const PRESET_BGS = [
  'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=60'
];

const App: React.FC = () => {
  const [state, setState] = useState<AppState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<ImageFile | null>(null);
  const [settings, setSettings] = useState<BgSettings>({ mode: 'transparent', color: '#FFFFFF' });
  const [isBefore, setIsBefore] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError("File is too large. Max size is 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setImage({
        original: result,
        name: file.name
      });
      setState('uploading');
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleProcess = async () => {
    if (!image) return;
    setState('processing');
    setError(null);

    try {
      const processed = await removeBackground(image.original);
      setImage(prev => prev ? ({ ...prev, processed }) : null);
      setState('ready');
    } catch (err: any) {
      console.error(err);
      setError("Background removal failed. Please try again.");
      setState('idle');
    }
  };

  const reset = () => {
    setImage(null);
    setState('idle');
    setError(null);
    setSettings({ mode: 'transparent', color: '#FFFFFF' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownload = () => {
    if (!image?.processed || !canvasRef.current) return;
    
    const link = document.createElement('a');
    link.download = `removed-bg-${image.name.split('.')[0]}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setSettings({
        mode: 'image',
        imageUrl: event.target?.result as string,
        color: settings.color
      });
    };
    reader.readAsDataURL(file);
  };

  // Sync canvas for composite image
  useEffect(() => {
    if (state === 'ready' && image?.processed && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const mainImg = new Image();
      mainImg.src = image.processed;
      mainImg.onload = () => {
        canvas.width = mainImg.width;
        canvas.height = mainImg.height;

        // Draw background
        if (settings.mode === 'color') {
          ctx.fillStyle = settings.color;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (settings.mode === 'image' && settings.imageUrl) {
          const bgImg = new Image();
          bgImg.src = settings.imageUrl;
          bgImg.onload = () => {
            // Draw background image scaling to cover
            const scale = Math.max(canvas.width / bgImg.width, canvas.height / bgImg.height);
            const x = (canvas.width - bgImg.width * scale) / 2;
            const y = (canvas.height - bgImg.height * scale) / 2;
            ctx.drawImage(bgImg, x, y, bgImg.width * scale, bgImg.height * scale);
            ctx.drawImage(mainImg, 0, 0);
          };
          return; // wait for bgImg onload
        }

        // Draw subject
        ctx.drawImage(mainImg, 0, 0);
      };
    }
  }, [state, image, settings]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Layers className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">MagicEraser AI</span>
          </div>
          <div className="hidden md:flex space-x-6 text-sm font-medium text-gray-500">
            <a href="#" className="hover:text-indigo-600">How it works</a>
            <a href="#" className="hover:text-indigo-600">Pricing</a>
            <a href="#" className="hover:text-indigo-600">API</a>
          </div>
          <Button variant="outline" size="sm">Log In</Button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {state === 'idle' && (
          <div className="max-w-3xl mx-auto text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight">
                Remove backgrounds <br />
                <span className="text-indigo-600">in seconds.</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto">
                Automatic, professional-grade background removal using advanced AI. 
                Perfect for products, portraits, and more.
              </p>
            </div>

            <div 
              onClick={() => fileInputRef.current?.click()}
              className="group relative border-2 border-dashed border-gray-300 rounded-3xl p-12 bg-white hover:border-indigo-500 hover:bg-indigo-50 transition-all cursor-pointer overflow-hidden"
            >
              <div className="flex flex-col items-center space-y-4">
                <div className="bg-indigo-100 p-6 rounded-full group-hover:scale-110 transition-transform">
                  <Upload className="w-10 h-10 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xl font-semibold text-gray-900">Upload an image</p>
                  <p className="text-gray-500">or drag and drop a file</p>
                </div>
                <div className="text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
                  JPG, PNG, WEBP up to 10MB
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange} 
              />
            </div>

            {error && (
              <div className="flex items-center justify-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg animate-in fade-in zoom-in-95">
                <XCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-8 pt-8">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 overflow-hidden mb-2">
                  <img src="https://picsum.photos/200/200?random=1" className="w-full h-full object-cover" alt="Example" />
                </div>
                <span className="text-xs text-gray-400">Portraits</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 overflow-hidden mb-2">
                  <img src="https://picsum.photos/200/200?random=2" className="w-full h-full object-cover" alt="Example" />
                </div>
                <span className="text-xs text-gray-400">Products</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 overflow-hidden mb-2">
                  <img src="https://picsum.photos/200/200?random=3" className="w-full h-full object-cover" alt="Example" />
                </div>
                <span className="text-xs text-gray-400">Pets</span>
              </div>
            </div>
          </div>
        )}

        {state === 'uploading' && image && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
            <div className="bg-white p-6 rounded-2xl border shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Ready to process?</h3>
                <Button variant="secondary" size="sm" onClick={reset}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Discard
                </Button>
              </div>
              <div className="aspect-video relative rounded-xl overflow-hidden bg-gray-100 border flex items-center justify-center">
                <img src={image.original} className="max-w-full max-h-full object-contain" alt="Original" />
              </div>
              <div className="mt-6 flex justify-center">
                <Button size="lg" className="px-12 py-6 rounded-2xl shadow-xl" onClick={handleProcess}>
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Remove Background Now
                </Button>
              </div>
            </div>
          </div>
        )}

        {state === 'processing' && (
          <div className="max-w-xl mx-auto py-20 text-center space-y-8 animate-pulse">
            <div className="relative inline-block">
              <div className="w-32 h-32 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
                <RefreshCw className="w-16 h-16 text-indigo-600 animate-spin" />
              </div>
              <div className="absolute top-0 right-0">
                <span className="flex h-6 w-6 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-6 w-6 bg-indigo-500"></span>
                </span>
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-gray-900">AI is magic-erasing...</h2>
              <div className="flex justify-center space-x-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className={`w-2 h-2 rounded-full bg-indigo-600 animate-bounce delay-${i * 150}`}></div>
                ))}
              </div>
              <p className="text-gray-500">Detecting subjects and cleaning up edges. Usually takes 3-5s.</p>
            </div>
          </div>
        )}

        {state === 'ready' && image && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Editor Area */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white p-2 rounded-2xl border shadow-lg overflow-hidden relative">
                <div className="absolute top-4 left-4 z-10 flex space-x-2">
                   <button 
                    onClick={() => setIsBefore(false)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${!isBefore ? 'bg-indigo-600 text-white shadow-md' : 'bg-white/80 backdrop-blur text-gray-700 hover:bg-white'}`}
                  >
                    After
                  </button>
                  <button 
                    onClick={() => setIsBefore(true)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${isBefore ? 'bg-indigo-600 text-white shadow-md' : 'bg-white/80 backdrop-blur text-gray-700 hover:bg-white'}`}
                  >
                    Before
                  </button>
                </div>

                <div className="aspect-square md:aspect-video bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center relative">
                  {/* Checkerboard Background for Transparency Preview */}
                  {settings.mode === 'transparent' && !isBefore && (
                    <div className="absolute inset-0 checkerboard"></div>
                  )}

                  {/* Render based on mode */}
                  {!isBefore && (
                    <div 
                      className="absolute inset-0 transition-colors duration-300" 
                      style={{ 
                        backgroundColor: settings.mode === 'color' ? settings.color : 'transparent',
                        backgroundImage: settings.mode === 'image' ? `url(${settings.imageUrl})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    ></div>
                  )}

                  <img 
                    src={isBefore ? image.original : (image.processed || image.original)} 
                    className="max-w-full max-h-full object-contain relative z-10 animate-in zoom-in-95 duration-300" 
                    alt="Processed result" 
                  />
                  
                  {/* Invisible Canvas for Downloading */}
                  <canvas ref={canvasRef} className="hidden" />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-green-600 bg-green-50 px-3 py-1.5 rounded-full text-sm font-medium">
                  <CheckCircle className="w-4 h-4" />
                  <span>Success! Background removed.</span>
                </div>
                <div className="flex space-x-2">
                  <Button variant="secondary" size="sm" onClick={reset}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Start Over
                  </Button>
                </div>
              </div>
            </div>

            {/* Sidebar Controls */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </h3>
                  <Button onClick={handleDownload} className="w-full py-4 rounded-xl shadow-lg shadow-indigo-200">
                    <Download className="w-5 h-5 mr-2" />
                    Download HD PNG
                  </Button>
                  <p className="text-center text-xs text-gray-400 mt-2">Free export includes high-resolution subject</p>
                </div>

                <div className="h-px bg-gray-100"></div>

                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
                    <Palette className="w-4 h-4 mr-2" />
                    Background
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      onClick={() => setSettings({ ...settings, mode: 'transparent' })}
                      className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center ${settings.mode === 'transparent' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-100 hover:border-gray-200'}`}
                    >
                      <div className="w-6 h-6 checkerboard border rounded-md mb-1"></div>
                      <span className="text-[10px] font-bold">Clear</span>
                    </button>
                    <button 
                      onClick={() => setSettings({ ...settings, mode: 'color' })}
                      className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center ${settings.mode === 'color' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-100 hover:border-gray-200'}`}
                    >
                      <div className="w-6 h-6 rounded-md mb-1 shadow-sm" style={{ backgroundColor: settings.color }}></div>
                      <span className="text-[10px] font-bold">Color</span>
                    </button>
                    <button 
                      onClick={() => setSettings({ ...settings, mode: 'image' })}
                      className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center ${settings.mode === 'image' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-100 hover:border-gray-200'}`}
                    >
                      <ImageIcon className="w-6 h-6 text-gray-600 mb-1" />
                      <span className="text-[10px] font-bold">Photo</span>
                    </button>
                  </div>
                </div>

                {settings.mode === 'color' && (
                  <div className="space-y-4 animate-in slide-in-from-top-2">
                    <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.map(c => (
                        <button 
                          key={c}
                          onClick={() => setSettings({ ...settings, color: c })}
                          className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${settings.color === c ? 'border-indigo-600 ring-2 ring-indigo-200' : 'border-transparent'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center space-x-3">
                      <input 
                        type="color" 
                        value={settings.color}
                        onChange={(e) => setSettings({ ...settings, color: e.target.value })}
                        className="w-10 h-10 p-0.5 border rounded cursor-pointer" 
                      />
                      <span className="text-sm font-mono text-gray-500 uppercase">{settings.color}</span>
                    </div>
                  </div>
                )}

                {settings.mode === 'image' && (
                  <div className="space-y-4 animate-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 gap-2">
                      {PRESET_BGS.map((url, i) => (
                        <button 
                          key={i}
                          onClick={() => setSettings({ ...settings, imageUrl: url })}
                          className={`aspect-video rounded-lg overflow-hidden border-2 transition-all ${settings.imageUrl === url ? 'border-indigo-600' : 'border-transparent opacity-70 hover:opacity-100'}`}
                        >
                          <img src={url} className="w-full h-full object-cover" alt={`BG ${i}`} />
                        </button>
                      ))}
                      <button 
                        onClick={() => bgInputRef.current?.click()}
                        className="aspect-video rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-indigo-500 hover:text-indigo-500 transition-all"
                      >
                        <Upload className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-bold">Upload</span>
                      </button>
                      <input type="file" ref={bgInputRef} className="hidden" accept="image/*" onChange={handleBgUpload} />
                    </div>
                  </div>
                )}
              </div>

              {/* Tips Card */}
              <div className="bg-indigo-900 text-indigo-100 p-6 rounded-2xl">
                <h4 className="font-bold mb-2 flex items-center">
                  <span className="bg-indigo-500/30 p-1 rounded mr-2">✨</span>
                  Pro Tip
                </h4>
                <p className="text-sm opacity-90">
                  Switch backgrounds to create professional social media posts or product listings instantly.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="flex justify-center space-x-2">
             <div className="bg-indigo-600 p-1 rounded-md">
              <Layers className="text-white w-5 h-5" />
            </div>
            <span className="text-lg font-bold text-gray-900">MagicEraser AI</span>
          </div>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            The world's easiest background removal tool. Powered by state-of-the-art vision models.
          </p>
          <div className="flex justify-center space-x-6 text-xs font-semibold text-gray-400 uppercase tracking-widest">
            <a href="#" className="hover:text-indigo-600">Privacy</a>
            <a href="#" className="hover:text-indigo-600">Terms</a>
            <a href="#" className="hover:text-indigo-600">Contact</a>
          </div>
          <div className="text-xs text-gray-400 pt-4">
            &copy; {new Date().getFullYear()} MagicEraser AI Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
