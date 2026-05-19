import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

const UpdatePrompt = ({ needRefresh, updateServiceWorker, handleLogout, setNeedRefresh }) => {
    return (
        <AnimatePresence>
            {needRefresh && (
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[99998] flex items-center justify-center p-4 select-none"
                >
                    <motion.div 
                        initial={{ scale: 0.95, y: 20 }} 
                        animate={{ scale: 1, y: 0 }}
                        className="bg-slate-900 border-2 border-brandPurple/40 p-5 md:p-8 rounded-[2rem] w-full max-w-sm text-center shadow-[0_0_60px_rgba(147,51,234,0.2)] relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-brandPurple/10 blur-3xl pointer-events-none"></div>

                        <div className="w-14 h-14 bg-purple-500/10 border border-purple-500/30 text-brandPurple rounded-full flex items-center justify-center mx-auto mb-4 shadow-glow">
                            <RefreshCw size={24} className="animate-spin text-brandPurple" style={{ animationDuration: '4s' }} />
                        </div>

                        <h3 className="text-lg font-black text-white tracking-wide uppercase">Sistem Güncellendi</h3>
                        <p className="text-slate-300 text-xs font-semibold mt-3 leading-relaxed px-1">
                            Kesintisiz ve hatasız bir deneyim için lütfen bir kaç dakika sonra yeniden giriş yapmayı deneyiniz.
                        </p>

                        <motion.button 
                            whileHover={{ scale: 1.02 }} 
                            whileTap={{ scale: 0.98 }} 
                            onClick={() => {
                                handleLogout();
                                setNeedRefresh(false);
                            }}
                            className="w-full mt-6 bg-brandPurple hover:bg-purple-600 text-white font-black py-3.5 rounded-xl shadow-glow tracking-widest text-xs transition-all uppercase"
                        >
                            GİRİŞ EKRANINA DÖN
                        </motion.button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default UpdatePrompt;
