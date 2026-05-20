import React from 'react';
import { motion } from 'framer-motion';
import { Library, X, Calendar, Trash2 } from 'lucide-react';
import { LIBRARY_TYPES } from '../../utils/constants';

const LibraryModal = ({
    libraryCategory, setLibraryCategory,
    libraryInput, setLibraryInput,
    libraryDate, setLibraryDate,
    libraryItems, addLibraryItem, deleteLibraryItem, onClose
}) => {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg flex flex-col max-h-[85vh] shadow-float overflow-hidden"
            >
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex gap-3 items-center">
                        <div className="bg-purple-100 p-2 rounded-lg"><Library size={20} className="text-brandPurple"/></div> 
                        Kütüphane Yönetimi
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-rose-600 bg-white p-1.5 rounded-full shadow-sm transition-colors hover-lift"><X size={20}/></button>
                </div>
                
                <div className="p-4 bg-white">
                    <div className="flex bg-slate-100 p-1.5 rounded-xl">
                        <button onClick={() => setLibraryCategory(LIBRARY_TYPES.TOPIC)} className={`flex-1 py-2 rounded-lg text-xs md:text-sm font-bold transition-all hover-lift ${libraryCategory === LIBRARY_TYPES.TOPIC ? 'bg-white text-brandPurple shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Ödevler</button>
                        <button onClick={() => setLibraryCategory(LIBRARY_TYPES.SOURCE)} className={`flex-1 py-2 rounded-lg text-xs md:text-sm font-bold transition-all hover-lift ${libraryCategory === LIBRARY_TYPES.SOURCE ? 'bg-white text-successGreen shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Kaynaklar</button>
                        <button onClick={() => setLibraryCategory(LIBRARY_TYPES.EXCUSE)} className={`flex-1 py-2 rounded-lg text-xs md:text-sm font-bold transition-all hover-lift ${libraryCategory === LIBRARY_TYPES.EXCUSE ? 'bg-white text-yellow-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Notlar</button>
                        <button onClick={() => setLibraryCategory(LIBRARY_TYPES.CURRICULUM)} className={`flex-1 py-2 rounded-lg text-xs md:text-sm font-bold transition-all hover-lift ${libraryCategory === LIBRARY_TYPES.CURRICULUM ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Müfredat</button>
                    </div>
                </div>
                
                <div className="p-5 bg-slate-50 border-b border-slate-100 flex flex-col gap-3">
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            className="flex-1 p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:border-brandPurple outline-none shadow-sm hover-lift" 
                            placeholder={libraryCategory === LIBRARY_TYPES.CURRICULUM ? "Ana Konu, Alt 1, Alt 2 (Virgülle ayırın)" : "Yeni içerik yazın..."} 
                            value={libraryInput} 
                            onChange={(e) => setLibraryInput(e.target.value)} 
                            onKeyDown={(e) => { if(e.key === 'Enter') {addLibraryItem(libraryInput); setLibraryInput('');} }} 
                        />
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { addLibraryItem(libraryInput); setLibraryInput(''); }} className="bg-brandPurple text-white px-5 rounded-xl hover:bg-purple-700 shadow-glow font-bold">Ekle</motion.button>
                    </div>
                    {libraryCategory === LIBRARY_TYPES.TOPIC && (
                        <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200">
                            <Calendar size={16} className="text-slate-400 ml-2"/>
                            <input type="date" className="flex-1 bg-transparent text-sm font-bold text-slate-600 outline-none" value={libraryDate} onChange={(e) => setLibraryDate(e.target.value)}/>
                        </div>
                    )}
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 space-y-3">
                    {libraryItems.filter(i => i.type === libraryCategory).map(item => (
                        <div key={item.id} className="flex justify-between items-start p-4 bg-white border border-slate-100 shadow-sm rounded-2xl group hover:border-purple-200 transition-colors hover-lift">
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-700">{item.text}</span>
                                {item.date && <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-1"><Calendar size={12}/> {item.date}</span>}
                                {item.type === LIBRARY_TYPES.CURRICULUM && item.subTopics && item.subTopics.length > 0 && (
                                    <div className="flex flex-col gap-1 mt-2 pl-3 border-l-2 border-brandPurple/30">
                                        {item.subTopics.map((st, idx) => (
                                            <span key={idx} className="text-[11px] text-slate-500 font-medium">• {st.title || st}</span>
                                        ))}
                                    </div>
                                )}
                                {item.type === LIBRARY_TYPES.CURRICULUM && (!item.subTopics || item.subTopics.length === 0) && (
                                    <span className="text-[10px] text-slate-400 mt-1 italic">Alt başlık içermiyor</span>
                                )}
                            </div>
                            <button onClick={() => deleteLibraryItem(item.id)} className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-colors shrink-0"><Trash2 size={18}/></button>
                        </div>
                    ))}
                    {libraryItems.filter(i => i.type === libraryCategory).length === 0 && (
                        <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                            <Library size={32} className="mb-2 opacity-50"/>
                            <span className="text-sm font-medium">Bu kategori boş.</span>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default LibraryModal;
