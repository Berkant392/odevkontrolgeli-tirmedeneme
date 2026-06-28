import React, { useState, useRef, useEffect } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { X, Check, Camera, RefreshCw } from 'lucide-react';

export default function ScannerModal({ imageFile, onClose, onApply }) {
    const [upImg, setUpImg] = useState();
    const imgRef = useRef(null);
    const [crop, setCrop] = useState({ unit: '%', width: 80, height: 80, x: 10, y: 10 });
    const [completedCrop, setCompletedCrop] = useState(null);
    const [applyFilter, setApplyFilter] = useState(false);

    useEffect(() => {
        if (imageFile) {
            const reader = new FileReader();
            reader.addEventListener('load', () => setUpImg(reader.result));
            reader.readAsDataURL(imageFile);
        }
    }, [imageFile]);

    const onLoad = (img) => {
        imgRef.current = img.target;
    };

    const getCroppedImg = (image, crop, filter) => {
        const canvas = document.createElement('canvas');
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;
        
        let outputWidth = crop.width * scaleX;
        let outputHeight = crop.height * scaleY;
        
        // Telegram sınırı (w+h <= 10000) ve performans için maksimum boyutu sınırla
        const MAX_DIMENSION = 2048;
        if (outputWidth > MAX_DIMENSION || outputHeight > MAX_DIMENSION) {
            if (outputWidth > outputHeight) {
                outputHeight = Math.round((outputHeight * MAX_DIMENSION) / outputWidth);
                outputWidth = MAX_DIMENSION;
            } else {
                outputWidth = Math.round((outputWidth * MAX_DIMENSION) / outputHeight);
                outputHeight = MAX_DIMENSION;
            }
        }

        canvas.width = outputWidth;
        canvas.height = outputHeight;
        const ctx = canvas.getContext('2d');

        if (filter) {
            ctx.filter = 'grayscale(100%) contrast(150%) brightness(120%)';
        }

        ctx.drawImage(
            image,
            crop.x * scaleX,
            crop.y * scaleY,
            crop.width * scaleX,
            crop.height * scaleY,
            0,
            0,
            outputWidth,
            outputHeight
        );

        return canvas.toDataURL('image/jpeg', 0.9);
    };

    const handleApply = () => {
        if (!completedCrop || completedCrop.width === 0 || completedCrop.height === 0 || !imgRef.current) {
            // Eğer crop yapılmadıysa veya 0x0 tıklandıysa tüm resmi al
            const fullCrop = { x: 0, y: 0, width: imgRef.current.width, height: imgRef.current.height };
            const base64 = getCroppedImg(imgRef.current, fullCrop, applyFilter);
            onApply(base64);
            return;
        }
        const base64 = getCroppedImg(imgRef.current, completedCrop, applyFilter);
        onApply(base64);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/95 z-[9999] flex flex-col items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <h3 className="font-black text-slate-800 flex items-center gap-2">
                        <Camera size={20} className="text-brandPurple" /> Soru Tarayıcı (Kırp)
                    </h3>
                    <button onClick={onClose} className="p-2 bg-slate-200 rounded-full hover:bg-slate-300 transition-colors">
                        <X size={16} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-auto p-4 bg-slate-100 flex items-center justify-center">
                    {upImg ? (
                        <ReactCrop
                            crop={crop}
                            onChange={(c) => setCrop(c)}
                            onComplete={(c) => setCompletedCrop(c)}
                            className="max-h-[60vh] rounded-lg shadow-lg"
                        >
                            <img 
                                src={upImg} 
                                onLoad={onLoad} 
                                alt="Soru görseli"
                                style={applyFilter ? { filter: 'grayscale(100%) contrast(150%) brightness(120%)' } : {}}
                            />
                        </ReactCrop>
                    ) : (
                        <div className="animate-spin text-brandPurple"><RefreshCw /></div>
                    )}
                </div>

                <div className="p-4 border-t bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-700 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                        <input 
                            type="checkbox" 
                            checked={applyFilter} 
                            onChange={(e) => setApplyFilter(e.target.checked)} 
                            className="w-4 h-4 rounded text-brandPurple focus:ring-brandPurple"
                        />
                        Siyah-Beyaz Tarayıcı Filtresi
                    </label>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-slate-500 bg-slate-200 hover:bg-slate-300 w-full sm:w-auto">
                            İptal
                        </button>
                        <button onClick={handleApply} className="px-6 py-2.5 rounded-xl font-black text-white bg-brandPurple shadow-md hover:bg-purple-700 flex items-center gap-2 justify-center w-full sm:w-auto">
                            <Check size={18} /> Kırp ve Onayla
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
