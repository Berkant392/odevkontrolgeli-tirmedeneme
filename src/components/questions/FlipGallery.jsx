import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCcw, RotateCcw, ZoomIn } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Virtual } from 'swiper/modules';

import 'swiper/css';

export default function FlipGallery({ questions, initialIndex = 0, onClose }) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isFlipped, setIsFlipped] = useState(false);
    const [imageUrls, setImageUrls] = useState({});
    const [fullscreenImage, setFullscreenImage] = useState(null);

    useEffect(() => {
        const loadImagesForCurrent = async () => {
            const indicesToLoad = [currentIndex - 2, currentIndex - 1, currentIndex, currentIndex + 1, currentIndex + 2];
            
            let updated = false;
            const newUrls = { ...imageUrls };

            for (const idx of indicesToLoad) {
                if (idx < 0 || idx >= questions.length) continue;
                const q = questions[idx];
                
                if (q.questionImageId && !newUrls[q.questionImageId]) {
                    newUrls[q.questionImageId] = `/.netlify/functions/telegramFetch?file_id=${q.questionImageId}`;
                    updated = true;
                }
                if (q.answerImageId && !newUrls[q.answerImageId]) {
                    newUrls[q.answerImageId] = `/.netlify/functions/telegramFetch?file_id=${q.answerImageId}`;
                    updated = true;
                }
            }

            if (updated) {
                setImageUrls(newUrls);
            }
        };
        loadImagesForCurrent();
    }, [currentIndex, questions, imageUrls]);

    const handleClose = (e) => {
        if(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        onClose();
    };

    if (!questions || questions.length === 0) {
        return createPortal(
            <div className="fixed inset-0 bg-slate-900/95 z-[99999] flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-3xl text-center max-w-sm w-full">
                    <p className="text-slate-500 font-bold mb-6">Bu klasörde henüz soru yok.</p>
                    <button onClick={handleClose} className="w-full bg-primary text-white py-3 rounded-xl font-black shadow-lg">Kapat</button>
                </div>
            </div>,
            document.body
        );
    }

    const modalContent = (
        <div 
            className="fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden touch-none select-none"
            style={{
                background: `
                    radial-gradient(circle at 20% 0%, rgba(255,63,79,.15), transparent 30%),
                    radial-gradient(circle at 90% 100%, rgba(37,99,235,.18), transparent 34%),
                    linear-gradient(180deg,#0b1120,#111827)
                `
            }}
        >
            {/* Topbar */}
            <div className="absolute top-0 left-0 w-full p-4 pt-[calc(max(env(safe-area-inset-top),16px)+16px)] md:p-6 md:pt-6 flex items-start justify-between z-[60]">
                <div className="w-12 h-12"></div>
                <div className="text-center mt-2 flex-1">
                    <h2 className="text-white font-black text-xl md:text-2xl tracking-wide m-0 drop-shadow-md">Soru Kartları</h2>
                    <p className="text-slate-300/80 text-[10px] md:text-xs font-bold mt-1.5 mb-3">Soru ve Cevap arasında geçiş yapmak için karta dokun</p>
                    <div className="inline-flex items-center justify-center bg-white/10 px-4 py-1.5 rounded-full text-white text-xs font-bold shadow-inner border border-white/10 backdrop-blur-md">
                        {currentIndex + 1} / {questions.length}
                    </div>
                </div>
                <button 
                    onClick={handleClose}
                    className="group relative w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 text-white/90 flex items-center justify-center shadow-md backdrop-blur-xl hover:bg-rose-500/80 hover:text-white transition-all duration-300 cursor-pointer border border-white/20 shrink-0 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-full"></div>
                    <X size={22} strokeWidth={3} className="relative z-10 transition-transform group-hover:rotate-90 group-active:rotate-90" />
                </button>
            </div>

            {/* Swiper Container */}
            <div className="relative w-full max-w-[380px] mt-16 md:mt-10 z-[50]">
                <Swiper
                    grabCursor={true}
                    spaceBetween={20}
                    modules={[Virtual]}
                    virtual={{ enabled: true, addSlidesBefore: 2, addSlidesAfter: 2 }}
                    initialSlide={initialIndex}
                    onSlideChange={(swiper) => {
                        setCurrentIndex(swiper.activeIndex);
                        setIsFlipped(false); // Reset flip on slide change
                    }}
                    className="w-full aspect-[3/4.2]"
                >
                    {questions.map((q, idx) => {
                        const isActiveSlide = idx === currentIndex;
                        const currentlyFlipped = isActiveSlide && isFlipped;

                        return (
                            <SwiperSlide key={q.id || idx} virtualIndex={idx} className="rounded-[36px] overflow-visible">
                                <div 
                                    className="w-full h-full cursor-pointer relative"
                                    style={{ 
                                        perspective: '1500px',
                                        willChange: 'transform' // Force GPU acceleration for the whole slide container
                                    }}
                                    onClick={() => {
                                        if (isActiveSlide) {
                                            setIsFlipped(!isFlipped);
                                        }
                                    }}
                                >
                                    <div 
                                        className="w-full h-full absolute top-0 left-0 transition-transform duration-500 ease-out"
                                        style={{ 
                                            transformStyle: 'preserve-3d',
                                            transform: currentlyFlipped ? 'rotateY(180deg) scale(1.02)' : 'rotateY(0deg) scale(1)',
                                            willChange: 'transform'
                                        }}
                                    >
                                        {/* FRONT (Soru) */}
                                        <div 
                                            className="absolute inset-0 bg-white rounded-[36px] shadow-xl flex flex-col overflow-hidden" 
                                            style={{ 
                                                backfaceVisibility: 'hidden',
                                                WebkitBackfaceVisibility: 'hidden',
                                                background: 'linear-gradient(#fff,#fff) padding-box, linear-gradient(135deg,rgba(255,255,255,.95),rgba(255,63,79,.36),rgba(37,99,235,.22)) border-box',
                                                border: '2px solid transparent'
                                            }}
                                        >
                                            <div className="flex-1 w-full relative p-2 bg-slate-50">
                                                {imageUrls[q.questionImageId] ? (
                                                    <>
                                                        <img src={imageUrls[q.questionImageId]} className="w-full h-full object-contain pointer-events-none rounded-[28px]" alt="Soru" />
                                                        <button 
                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFullscreenImage(imageUrls[q.questionImageId]); }}
                                                            className="absolute bottom-4 left-4 bg-black/60 text-white p-2.5 rounded-2xl hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all z-20 shadow-md border border-white/20"
                                                        >
                                                            <ZoomIn size={18} strokeWidth={2.5} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center text-primary animate-pulse bg-slate-50/50 rounded-[28px]">
                                                        <RefreshCcw size={48} className="animate-spin mb-4" />
                                                        <span className="font-bold text-lg">Soru Yükleniyor...</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="absolute bottom-5 right-5 bg-white text-slate-800 px-5 py-2.5 rounded-full text-[11px] md:text-xs font-black flex items-center gap-2 shadow-md border border-slate-100">
                                                <RotateCcw size={16} /> Çevir
                                            </div>
                                            <div className="absolute top-5 left-5 bg-white text-primary px-4 py-2 rounded-full text-[10px] md:text-[11px] font-black flex items-center gap-2 shadow-md border border-slate-100">
                                                <div className="w-2.5 h-2.5 rounded-full bg-primary"></div> Soru
                                            </div>
                                        </div>

                                        {/* BACK (Cevap) */}
                                        <div 
                                            className="absolute inset-0 bg-white rounded-[36px] shadow-xl flex flex-col overflow-hidden" 
                                            style={{ 
                                                backfaceVisibility: 'hidden', 
                                                WebkitBackfaceVisibility: 'hidden',
                                                transform: 'rotateY(180deg)',
                                                background: 'linear-gradient(#ffffff,#f8fafc) padding-box, linear-gradient(135deg,rgba(255,255,255,.95),rgba(16,185,129,.42),rgba(37,99,235,.18)) border-box',
                                                border: '2px solid transparent'
                                            }}
                                        >
                                            <div className="flex-1 w-full relative p-2 bg-slate-50/50">
                                                {q.answerImageId && imageUrls[q.answerImageId] ? (
                                                    <>
                                                        <img src={imageUrls[q.answerImageId]} className="w-full h-full object-contain pointer-events-none rounded-[28px]" alt="Cevap" />
                                                        <button 
                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFullscreenImage(imageUrls[q.answerImageId]); }}
                                                            className="absolute bottom-4 left-4 bg-black/60 text-white p-2.5 rounded-2xl hover:bg-emerald-500/90 hover:scale-105 active:scale-95 transition-all z-20 shadow-md border border-white/20"
                                                        >
                                                            <ZoomIn size={18} strokeWidth={2.5} />
                                                        </button>
                                                    </>
                                                ) : q.answerImageId ? (
                                                    <div className="w-full h-full flex flex-col items-center justify-center text-emerald-500 animate-pulse bg-slate-50/50 rounded-[28px]">
                                                        <RefreshCcw size={48} className="animate-spin mb-4" />
                                                        <span className="font-bold text-lg">Cevap Yükleniyor...</span>
                                                    </div>
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-slate-50 rounded-[28px]">
                                                        <div className="w-20 h-20 bg-white shadow-sm rounded-full flex items-center justify-center mb-6">
                                                            <X size={32} className="text-slate-300"/>
                                                        </div>
                                                        <span className="font-black text-slate-500 text-xl">Cevap Yok</span>
                                                        <p className="text-sm font-bold text-slate-400 mt-3 leading-relaxed max-w-[200px]">Bu soru için henüz bir cevap görseli yüklenmemiş.</p>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="absolute bottom-5 right-5 bg-emerald-500 text-white px-5 py-2.5 rounded-full text-[11px] md:text-xs font-black flex items-center gap-2 shadow-md border border-emerald-400">
                                                <RotateCcw size={16} /> Soruya Dön
                                            </div>
                                            <div className="absolute top-5 left-5 bg-white text-emerald-500 px-4 py-2 rounded-full text-[10px] md:text-[11px] font-black flex items-center gap-2 shadow-md border border-slate-100">
                                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Cevap
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </SwiperSlide>
                        );
                    })}
                </Swiper>
            </div>
            
            {/* Dots indicator */}
            <div className="mt-10 flex gap-2 z-20 overflow-hidden px-4">
                {questions.map((_, idx) => (
                    <div 
                        key={idx} 
                        className={`transition-all duration-500 rounded-full ${idx === currentIndex ? 'w-8 bg-white shadow-md' : 'w-2 bg-white/20'} h-2`}
                    />
                ))}
            </div>

            {/* Fullscreen Zoom Viewer */}
            <AnimatePresence>
                {fullscreenImage && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1000000] bg-black/98 flex flex-col items-center justify-center touch-none backdrop-blur-lg"
                    >
                        <button 
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFullscreenImage(null); }}
                            className="absolute top-6 right-6 z-[1000001] w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white border border-white/20 hover:bg-rose-500/80 hover:text-white transition-all shadow-xl"
                        >
                            <X size={24} strokeWidth={2.5} />
                        </button>
                        <div className="absolute top-6 left-6 z-[1000001] bg-black/50 text-white/70 px-4 py-2 rounded-full text-xs font-bold border border-white/10">
                            Yakınlaştırmak için çimdikleyin
                        </div>
                        <TransformWrapper
                            initialScale={1}
                            minScale={0.5}
                            maxScale={6}
                            centerOnInit={true}
                            wheel={{ step: 0.1 }}
                        >
                            <TransformComponent wrapperClass="w-full h-full" contentClass="w-full h-full flex items-center justify-center cursor-zoom-in">
                                <img src={fullscreenImage} className="max-w-full max-h-full object-contain select-none pointer-events-none" alt="Büyük Görsel" />
                            </TransformComponent>
                        </TransformWrapper>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );

    return createPortal(modalContent, document.body);
}
