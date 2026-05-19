import React from 'react';
import { motion } from 'framer-motion';
import { WifiOff } from 'lucide-react';

const OfflineScreen = () => {
    return (
        <div className="fixed inset-0 bg-slate-950 z-[99999] flex flex-col items-center justify-center p-6 text-center select-none">
            <motion.div 
                animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                className="w-24 h-24 bg-rose-500/10 border border-rose-500/30 rounded-full flex items-center justify-center text-rose-500 mb-6 shadow-[0_0_50px_rgba(239,68,68,0.2)]"
            >
                <WifiOff size={44} />
            </motion.div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-wide uppercase">Ağ Bağlantısı Yok</h2>
            <p className="text-slate-400 text-sm md:text-base mt-3 max-w-sm font-medium leading-relaxed">
                Berkant Hoca Eğitim Platformu aktif bir internet bağlantısı gerektirir. Lütfen internet/ağ bağlantınızı kontrol ediniz.
            </p>
        </div>
    );
};

export default OfflineScreen;
