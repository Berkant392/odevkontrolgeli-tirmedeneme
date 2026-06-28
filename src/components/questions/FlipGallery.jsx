import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCcw, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

export default function FlipGallery({ questions, initialIndex = 0, onClose }) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isFlipped, setIsFlipped] = useState(false);
    
    // Telegram'dan önbelleğe alınmış görseller (tekrar tekrar fetch atmamak için)
    const [imageUrls, setImageUrls] = useState({});

    useEffect(() => {
        const loadImagesForCurrent = async () => {
            const q = questions[currentIndex];
            if (!q) return;

            const newUrls = { ...imageUrls };
            let updated = false;

            if (q.questionImageId && !newUrls[q.questionImageId]) {
                newUrls[q.questionImageId] = `/.netlify/functions/telegramFetch?file_id=${q.questionImageId}`;
                updated = true;
            }
            if (q.answerImageId && !newUrls[q.answerImageId]) {
                newUrls[q.answerImageId] = `/.netlify/functions/telegramFetch?file_id=${q.answerImageId}`;
                updated = true;
            }

            if (updated) {
                setImageUrls(newUrls);
            }
        };

        loadImagesForCurrent();
    }, [currentIndex, questions, imageUrls]);

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setIsFlipped(false);
            setCurrentIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setIsFlipped(false);
            setCurrentIndex(prev => prev - 1);
        }
    };

    if (!questions || questions.length === 0) {
        return (
            <div className="fixed inset-0 bg-slate-900/95 z-[9999] flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-3xl text-center max-w-sm w-full">
                    <p className="text-slate-500 font-bold mb-6">Bu klasörde henüz soru yok.</p>
                    <button onClick={onClose} className="w-full bg-brandPurple text-white py-3 rounded-xl font-black shadow-lg">Kapat</button>
                </div>
            </div>
        );
    }

    const currentQ = questions[currentIndex];
    const frontImg = imageUrls[currentQ?.questionImageId];
    const backImg = currentQ?.answerImageId ? imageUrls[currentQ?.answerImageId] : null;

    return (
        <div className="fixed inset-0 bg-slate-900/95 z-[9999] flex flex-col items-center justify-center overflow-hidden">
            <div className="absolute top-6 right-6 z-10">
                <button onClick={onClose} className="p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors">
                    <X size={24} />
                </button>
            </div>
            
            <div className="text-center mb-8 z-10">
                <h2 className="text-white font-black text-2xl tracking-wide">Soru Kartları</h2>
                <p className="text-slate-400 text-sm font-bold mt-1">Soru ve Cevap arasında geçiş yapmak için karta dokun</p>
                <p className="text-brandPurple-light text-xs font-bold mt-2">{currentIndex + 1} / {questions.length}</p>
            </div>

            <div className="relative w-full max-w-md aspect-[3/4] flex items-center justify-center perspective-[1000px] px-4">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        className="relative w-full h-full cursor-pointer"
                        style={{ transformStyle: 'preserve-3d' }}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.3 }}
                        onClick={() => setIsFlipped(!isFlipped)}
                    >
                        <motion.div 
                            className="absolute w-full h-full"
                            style={{ transformStyle: 'preserve-3d' }}
                            animate={{ rotateY: isFlipped ? 180 : 0 }}
                            transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                        >
                            {/* FRONT (Soru) */}
                            <div className="absolute w-full h-full bg-white rounded-3xl shadow-2xl border-4 border-white flex flex-col overflow-hidden" style={{ backfaceVisibility: 'hidden' }}>
                                {frontImg ? (
                                    <img src={frontImg} className="w-full h-full object-contain bg-slate-100 pointer-events-none" alt="Soru" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-brandPurple animate-pulse">
                                        <RefreshCcw size={40} className="animate-spin mb-4" />
                                        <span className="font-bold">Soru Yükleniyor...</span>
                                    </div>
                                )}
                                <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 backdrop-blur-sm">
                                    <RotateCcw size={12} /> Çevir
                                </div>
                            </div>

                            {/* BACK (Cevap) */}
                            <div className="absolute w-full h-full bg-white rounded-3xl shadow-2xl border-4 border-brandPurple-light flex flex-col overflow-hidden" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                                {backImg ? (
                                    <img src={backImg} className="w-full h-full object-contain bg-slate-100 pointer-events-none" alt="Cevap" />
                                ) : currentQ?.answerImageId ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-brandPurple animate-pulse">
                                        <RefreshCcw size={40} className="animate-spin mb-4" />
                                        <span className="font-bold">Cevap Yükleniyor...</span>
                                    </div>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-400">
                                        <span className="font-bold">Bu soru için cevap eklenmemiş.</span>
                                    </div>
                                )}
                                <div className="absolute bottom-4 right-4 bg-brandPurple text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                                    <RotateCcw size={12} /> Soruya Dön
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="flex gap-6 mt-10 z-10">
                <button 
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    className={`w-16 h-16 rounded-full shadow-xl flex items-center justify-center transition-transform border-4 ${currentIndex === 0 ? 'bg-slate-800 text-slate-600 border-slate-700' : 'bg-white text-slate-800 border-slate-100 hover:scale-110'}`}
                >
                    <ChevronLeft size={32} strokeWidth={3} />
                </button>
                <button 
                    onClick={handleNext}
                    disabled={currentIndex === questions.length - 1}
                    className={`w-16 h-16 rounded-full shadow-xl flex items-center justify-center transition-transform border-4 ${currentIndex === questions.length - 1 ? 'bg-slate-800 text-slate-600 border-slate-700' : 'bg-white text-slate-800 border-slate-100 hover:scale-110'}`}
                >
                    <ChevronRight size={32} strokeWidth={3} />
                </button>
            </div>
        </div>
    );
}
