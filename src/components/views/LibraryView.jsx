import React from 'react';
import { motion } from 'framer-motion';
import { Library, Calendar, Trash2 } from 'lucide-react';
import { LIBRARY_TYPES } from '../../utils/constants';

const LibraryView = ({
    libraryCategory, setLibraryCategory,
    libraryInput, setLibraryInput,
    libraryDate, setLibraryDate,
    libraryItems, addLibraryItem, deleteLibraryItem
}) => {
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-4 md:p-8">
            <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-float border border-slate-100 flex flex-col overflow-hidden h-[80vh]">
                <div className="p-5 md:p-6 border-b border-slate-100 flex items-center bg-slate-50 gap-4">
                    <div className="bg-purple-100 p-3 rounded-xl">
                        <Library size={24} className="text-primary"/>
                    </div> 
                    <div>
                        <h2 className="text-xl font-black text-slate-800">Kütüphane Yönetimi</h2>
                        <p className="text-sm font-medium text-slate-500">Ödevleri, kaynakları ve notları kategorize ederek saklayın.</p>
                    </div>
                </div>
                
                <div className="p-4 bg-white border-b border-slate-100">
                    <div className="flex bg-slate-100 p-1.5 rounded-xl">
                        <button onClick={() => setLibraryCategory(LIBRARY_TYPES.TOPIC)} className={`flex-1 py-3 rounded-xl text-xs md:text-sm font-bold transition-all hover-lift ${libraryCategory === LIBRARY_TYPES.TOPIC ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Ödevler</button>
                        <button onClick={() => setLibraryCategory(LIBRARY_TYPES.SOURCE)} className={`flex-1 py-3 rounded-xl text-xs md:text-sm font-bold transition-all hover-lift ${libraryCategory === LIBRARY_TYPES.SOURCE ? 'bg-white text-successGreen shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Kaynaklar</button>
                        <button onClick={() => setLibraryCategory(LIBRARY_TYPES.EXCUSE)} className={`flex-1 py-3 rounded-xl text-xs md:text-sm font-bold transition-all hover-lift ${libraryCategory === LIBRARY_TYPES.EXCUSE ? 'bg-white text-yellow-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Notlar</button>
                        <button onClick={() => setLibraryCategory(LIBRARY_TYPES.CURRICULUM)} className={`flex-1 py-3 rounded-xl text-xs md:text-sm font-bold transition-all hover-lift ${libraryCategory === LIBRARY_TYPES.CURRICULUM ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Müfredat</button>
                    </div>
                </div>
                
                <div className="p-5 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row gap-3 items-center">
                    <input 
                        type="text" 
                        className="flex-1 w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:border-primary outline-none shadow-sm transition-colors" 
                        placeholder={libraryCategory === LIBRARY_TYPES.CURRICULUM ? "Ana Konu, Alt 1, Alt 2 (Virgülle ayırın)" : "Yeni içerik yazın..."} 
                        value={libraryInput} 
                        onChange={(e) => setLibraryInput(e.target.value)} 
                        onKeyDown={(e) => { if(e.key === 'Enter') {addLibraryItem(libraryInput); setLibraryInput('');} }} 
                    />
                    {libraryCategory === LIBRARY_TYPES.TOPIC && (
                        <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm w-full md:w-auto">
                            <Calendar size={18} className="text-slate-400"/>
                            <input type="date" className="bg-transparent text-sm font-bold text-slate-600 outline-none" value={libraryDate} onChange={(e) => setLibraryDate(e.target.value)}/>
                        </div>
                    )}
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { addLibraryItem(libraryInput); setLibraryInput(''); }} className="bg-primary text-white px-8 py-4 rounded-2xl shadow-glow font-black w-full md:w-auto hover:bg-purple-700 transition-colors">
                        Ekle
                    </motion.button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-4">
                    {libraryItems.filter(i => i.type === libraryCategory).map(item => (
                        <div key={item.id} className="flex justify-between items-start p-5 bg-white border border-slate-100 shadow-sm rounded-2xl group hover:border-purple-200 hover:shadow-md transition-all">
                            <div className="flex flex-col">
                                <span className="text-base font-black text-slate-700">{item.text}</span>
                                {item.date && <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-2"><Calendar size={14}/> {item.date}</span>}
                                {item.type === LIBRARY_TYPES.CURRICULUM && item.subTopics && item.subTopics.length > 0 && (
                                    <div className="flex flex-col gap-1.5 mt-3 pl-4 border-l-2 border-primary/30">
                                        {item.subTopics.map((st, idx) => (
                                            <span key={idx} className="text-xs text-slate-500 font-medium">• {st.title || st}</span>
                                        ))}
                                    </div>
                                )}
                                {item.type === LIBRARY_TYPES.CURRICULUM && (!item.subTopics || item.subTopics.length === 0) && (
                                    <span className="text-xs text-slate-400 mt-2 italic">Alt başlık içermiyor</span>
                                )}
                            </div>
                            <button onClick={() => deleteLibraryItem(item.id)} className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition-colors shrink-0">
                                <Trash2 size={20}/>
                            </button>
                        </div>
                    ))}
                    {libraryItems.filter(i => i.type === libraryCategory).length === 0 && (
                        <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                            <Library size={48} className="mb-4 opacity-30"/>
                            <span className="text-base font-bold text-slate-500">Bu kategori boş.</span>
                            <span className="text-sm font-medium text-slate-400 mt-1">Yukarıdan yeni içerik ekleyebilirsiniz.</span>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default LibraryView;
