import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { X, RefreshCcw, RotateCcw, ZoomIn } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

const SWIPE_THRESHOLD = 50;

export default function FlipGallery({ questions, initialIndex = 0, onClose }) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [direction, setDirection] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [imageUrls, setImageUrls] = useState({});
    const [fullscreenImage, setFullscreenImage] = useState(null);

    // Fiziksel Sürükleme (Tactile Physics) Hook'ları
    const dragX = useMotionValue(0);
    const dragRotateZ = useTransform(dragX, [-300, 300], [-12, 12]);

    useEffect(() => {
        const loadImagesForCurrent = async () => {
            const indicesToLoad = [currentIndex - 1, currentIndex, currentIndex + 1];
            
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

    // Acil durum temizliği: Framer Motion bazen swipe sonrasında pointer-events kilidini kaldırmayı unutuyor.
    const cleanupFramerMotionLocks = () => {
        document.body.style.pointerEvents = '';
        document.body.style.touchAction = '';
        document.body.style.userSelect = '';
        
        // Sadece küçük (Framer Motion'a ait) style etiketlerini temizle.
        // Tailwind CSS (çok büyük) dosyasını silmemek için karakter sayısını kontrol ediyoruz!
        document.querySelectorAll('style').forEach(s => {
            if (s.innerHTML.length < 500 && (s.innerHTML.includes('pointer-events: none') || s.innerHTML.includes('touch-action: none'))) {
                s.remove();
            }
        });
    };

    useEffect(() => {
        return () => {
            cleanupFramerMotionLocks();
        };
    }, []);

    const handleDragEnd = (event, info) => {
        const x = info.offset.x;
        const velocity = info.velocity.x;

        if ((x < -SWIPE_THRESHOLD || velocity < -500) && currentIndex < questions.length - 1) {
            setIsFlipped(false);
            setDirection(1);
            setCurrentIndex(prev => prev + 1);
            dragX.set(0); 
        } else if ((x > SWIPE_THRESHOLD || velocity > 500) && currentIndex > 0) {
            setIsFlipped(false);
            setDirection(-1);
            setCurrentIndex(prev => prev - 1);
            dragX.set(0); 
        }
    };

    const handleClose = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        cleanupFramerMotionLocks();
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
            className="fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden touch-none"
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
                    className="group relative w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 text-white/90 flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)] backdrop-blur-xl hover:bg-rose-500/80 hover:text-white hover:shadow-rose-500/30 active:scale-90 transition-all duration-300 cursor-pointer border border-white/20 shrink-0 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-full"></div>
                    <X size={22} strokeWidth={3} className="relative z-10 transition-transform group-hover:rotate-90 group-active:rotate-90" />
                </button>
            </div>

            <div className="relative w-full max-w-[380px] aspect-[3/4.2] flex items-center justify-center perspective-[1600px] mt-16 md:mt-10 z-[50]">
                <AnimatePresence initial={false} custom={direction}>
                    {questions.length > 0 && questions[currentIndex] && (
                        <motion.div
                            key={currentIndex}
                            custom={direction}
                            variants={{
                                enter: (dir) => ({
                                    x: dir > 0 ? '100%' : '-100%',
                                    opacity: 0,
                                    scale: 0.95
                                }),
                                center: {
                                    zIndex: 1,
                                    x: 0,
                                    opacity: 1,
                                    scale: 1,
                                    rotateZ: 0
                                },
                                exit: (dir) => ({
                                    zIndex: 0,
                                    x: dir < 0 ? '100%' : '-100%',
                                    opacity: 0,
                                    scale: 0.95
                                })
                            }}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{
                                x: { type: "spring", stiffness: 300, damping: 30 },
                                opacity: { duration: 0.2 }
                            }}
                            className="absolute w-[85%] md:w-full h-full touch-none cursor-grab active:cursor-grabbing"
                            style={{ 
                                rotateZ: dragRotateZ,
                                transformStyle: 'preserve-3d' 
                            }}
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0.9}
                            whileDrag={{ scale: 0.98, cursor: "grabbing" }}
                            onDrag={(e, info) => dragX.set(info.offset.x)}
                            onDragEnd={handleDragEnd}
                            onClick={(e) => {
                                if (!e.defaultPrevented) setIsFlipped(!isFlipped);
                            }}
                        >
                            <motion.div 
                                className="absolute w-full h-full"
                                style={{ transformStyle: 'preserve-3d' }}
                                animate={{ 
                                    rotateY: isFlipped ? 180 : 0,
                                    z: isFlipped ? 50 : 0, 
                                    scale: isFlipped ? [1, 1.05, 1] : [1, 1.05, 1] 
                                }}
                                transition={{ duration: 0.6, type: "spring", stiffness: 220, damping: 22 }}
                            >
                                {/* FRONT (Soru) */}
                                <div 
                                    className="absolute inset-0 bg-white rounded-[36px] shadow-[0_34px_74px_rgba(0,0,0,0.40),inset_0_1px_0_rgba(255,255,255,0.95)] flex flex-col overflow-hidden" 
                                    style={{ 
                                        backfaceVisibility: 'hidden',
                                        background: 'linear-gradient(#fff,#fff) padding-box, linear-gradient(135deg,rgba(255,255,255,.95),rgba(255,63,79,.36),rgba(37,99,235,.22)) border-box',
                                        border: '2px solid transparent'
                                    }}
                                >
                                    <div className="flex-1 w-full relative p-2 bg-slate-50">
                                        {imageUrls[questions[currentIndex].questionImageId] ? (
                                            <>
                                                <img src={imageUrls[questions[currentIndex].questionImageId]} className="w-full h-full object-contain pointer-events-none rounded-[28px]" alt="Soru" />
                                                <button 
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFullscreenImage(imageUrls[questions[currentIndex].questionImageId]); }}
                                                    className="absolute bottom-4 left-4 bg-black/60 text-white p-2.5 rounded-2xl backdrop-blur-md hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all z-20 shadow-lg border border-white/20"
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
                                    <div className="absolute bottom-5 right-5 bg-white text-slate-800 px-5 py-2.5 rounded-full text-[11px] md:text-xs font-black flex items-center gap-2 shadow-[0_16px_32px_rgba(23,32,51,.2)] border border-slate-100">
                                        <RotateCcw size={16} /> Çevir
                                    </div>
                                    <div className="absolute top-5 left-5 bg-white text-primary px-4 py-2 rounded-full text-[10px] md:text-[11px] font-black flex items-center gap-2 shadow-[0_12px_26px_rgba(23,32,51,.1)] border border-slate-100">
                                        <div className="w-2.5 h-2.5 rounded-full bg-primary"></div> Soru
                                    </div>
                                </div>

                                {/* BACK (Cevap) */}
                                <div 
                                    className="absolute inset-0 bg-white rounded-[36px] shadow-[0_34px_74px_rgba(0,0,0,0.40),inset_0_1px_0_rgba(255,255,255,0.95)] flex flex-col overflow-hidden" 
                                    style={{ 
                                        backfaceVisibility: 'hidden', 
                                        transform: 'rotateY(180deg)',
                                        background: 'linear-gradient(#ffffff,#f8fafc) padding-box, linear-gradient(135deg,rgba(255,255,255,.95),rgba(16,185,129,.42),rgba(37,99,235,.18)) border-box',
                                        border: '2px solid transparent'
                                    }}
                                >
                                    <div className="flex-1 w-full relative p-2 bg-slate-50/50">
                                        {questions[currentIndex].answerImageId && imageUrls[questions[currentIndex].answerImageId] ? (
                                            <>
                                                <img src={imageUrls[questions[currentIndex].answerImageId]} className="w-full h-full object-contain pointer-events-none rounded-[28px]" alt="Cevap" />
                                                <button 
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFullscreenImage(imageUrls[questions[currentIndex].answerImageId]); }}
                                                    className="absolute bottom-4 left-4 bg-black/60 text-white p-2.5 rounded-2xl backdrop-blur-md hover:bg-emerald-500/90 hover:scale-105 active:scale-95 transition-all z-20 shadow-lg border border-white/20"
                                                >
                                                    <ZoomIn size={18} strokeWidth={2.5} />
                                                </button>
                                            </>
                                        ) : questions[currentIndex].answerImageId ? (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-emerald-500 animate-pulse bg-slate-50/50 rounded-[28px]">
                                                <RefreshCcw size={48} className="animate-spin mb-4" />
                                                <span className="font-bold text-lg">Cevap Yükleniyor...</span>
                                            </div>
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-slate-50 rounded-[28px]">
                                                <div className="w-20 h-20 bg-white shadow-md rounded-full flex items-center justify-center mb-6">
                                                    <X size={32} className="text-slate-300"/>
                                                </div>
                                                <span className="font-black text-slate-500 text-xl">Cevap Yok</span>
                                                <p className="text-sm font-bold text-slate-400 mt-3 leading-relaxed max-w-[200px]">Bu soru için henüz bir cevap görseli yüklenmemiş.</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute bottom-5 right-5 bg-emerald-500 text-white px-5 py-2.5 rounded-full text-[11px] md:text-xs font-black flex items-center gap-2 shadow-[0_18px_36px_rgba(16,185,129,.35)] border border-emerald-400">
                                        <RotateCcw size={16} /> Soruya Dön
                                    </div>
                                    <div className="absolute top-5 left-5 bg-white text-emerald-500 px-4 py-2 rounded-full text-[10px] md:text-[11px] font-black flex items-center gap-2 shadow-[0_12px_26px_rgba(23,32,51,.1)] border border-slate-100">
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Cevap
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            
            {/* Dots indicator */}
            <div className="mt-10 flex gap-2 z-20 overflow-hidden px-4">
                {questions.map((_, idx) => (
                    <div 
                        key={idx} 
                        className={`transition-all duration-500 rounded-full ${idx === currentIndex ? 'w-8 bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)]' : 'w-2 bg-white/20'} h-2`}
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
