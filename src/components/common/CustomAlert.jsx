import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

const CustomAlert = ({ dialogData, closeAlert }) => {
    return (
        <AnimatePresence>
            {dialogData.isOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 15 }} className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl">
                        <div className="p-5 text-center">
                            <div className="flex justify-center mb-3">
                                {dialogData.type === 'warning' && <div className="w-14 h-14 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center"><AlertTriangle size={28} /></div>}
                                {dialogData.type === 'error' && <div className="w-14 h-14 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center"><AlertTriangle size={28} /></div>}
                                {dialogData.type === 'success' && <div className="w-14 h-14 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center"><CheckCircle size={28} /></div>}
                                {dialogData.type === 'info' && <div className="w-14 h-14 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center"><Info size={28} /></div>}
                            </div>
                            <h3 className="text-lg font-black text-slate-800 mb-1.5">{dialogData.title}</h3>
                            <p className="text-slate-500 font-medium text-xs whitespace-pre-wrap">{dialogData.message}</p>
                        </div>
                        <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2.5">
                            {dialogData.onConfirm ? (
                                <>
                                    <button onClick={closeAlert} className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-100 transition-colors">İptal</button>
                                    <button onClick={() => { dialogData.onConfirm(); closeAlert(); }} className={`flex-1 py-2.5 rounded-xl font-bold text-xs text-white transition-colors shadow-sm ${dialogData.type === 'warning' || dialogData.type === 'error' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-brandPurple hover:bg-purple-600'}`}>Onaylıyorum</button>
                                </>
                            ) : (
                                <button onClick={closeAlert} className="w-full py-2.5 bg-brandPurple text-white rounded-xl font-bold text-xs shadow-glow hover:bg-purple-600 transition-colors">Tamam</button>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default CustomAlert;
