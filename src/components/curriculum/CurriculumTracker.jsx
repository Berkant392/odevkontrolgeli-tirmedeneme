import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, CheckCircle, Circle, Bookmark, Sparkles, BookOpen } from 'lucide-react';

const CurriculumTracker = ({ cls, updateClassInDb, isTeacherMode, libraryItems, saveToLibrary }) => {
    const [expandedSubject, setExpandedSubject] = useState(null);

    // Güvenli müfredat dizisi okuyucu kalkanı
    const curriculumList = cls?.curriculum || [];

    const toggleSubject = (index) => {
        setExpandedSubject(expandedSubject === index ? null : index);
    };

    return (
        <div className="w-full space-y-3 select-none">
            {/* Üst Küçük Bilgilendirme Kartı */}
            <div className="p-3 bg-gradient-to-r from-purple-500/5 to-indigo-500/5 border border-purple-500/10 rounded-xl flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-brandPurple/10 text-brandPurple shrink-0">
                    <BookOpen size={14} />
                </div>
                <div className="flex flex-col text-left">
                    <span className="text-[11px] font-black text-slate-700 tracking-wide uppercase">Müfredat ve Konu İlerlemesi</span>
                    <span className="text-[9px] font-bold text-slate-400 mt-0.5">Dönem boyunca tamamlamanız gereken akademik konu başlıkları listesi</span>
                </div>
            </div>

            {/* Müfredat Başlık Döngüsü */}
            <div className="space-y-2">
                {curriculumList.map((subject, idx) => {
                    const isExpanded = expandedSubject === idx;
                    const subTopicsCount = subject.subTopics?.length || 0;
                    const completedCount = subject.subTopics?.filter(st => st.completed).length || 0;
                    const progressPercent = subTopicsCount > 0 ? Math.round((completedCount / subTopicsCount) * 100) : 0;

                    return (
                        <motion.div 
                            key={idx} 
                            layout
                            className="bg-slate-50/60 border border-slate-200/60 rounded-xl overflow-hidden shadow-sm"
                        >
                            {/* Konu Ana Başlık Satırı - Mobilde Tamamen Küçültüldü */}
                            <div 
                                onClick={() => toggleSubject(idx)}
                                className="p-3 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-100/50 transition-colors"
                            >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <div className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 shrink-0">
                                        <Bookmark size={12} className={progressPercent === 100 ? "text-emerald-500" : "text-brandPurple"} />
                                    </div>
                                    <div className="flex flex-col text-left min-w-0 flex-1">
                                        {/* Metin boyutu text-sm md:text-base olarak responsive daraltıldı */}
                                        <span className="text-xs md:text-sm font-black text-slate-800 uppercase tracking-wide truncate">{subject.title}</span>
                                        <div className="flex items-center gap-2 mt-1">
                                            {/* Mini ilerleme çubuğu */}
                                            <div className="w-12 h-1 bg-slate-200 rounded-full overflow-hidden">
                                                <div className="h-full bg-brandPurple" style={{ width: `${progressPercent}%` }}></div>
                                            </div>
                                            <span className="text-[9px] font-extrabold text-brandPurple">%{progressPercent}</span>
                                            <span className="text-[8px] font-bold text-slate-400">({completedCount}/{subTopicsCount})</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-slate-400 p-1 shrink-0">
                                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </div>
                            </div>

                            {/* Alt Başlıklar / Alt Konular İçerik Alanı */}
                            <AnimatePresence initial={false}>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="border-t border-slate-200/50 bg-white px-2.5 py-1"
                                    >
                                        <div className="divide-y divide-slate-100">
                                            {subject.subTopics?.map((sub, sIdx) => (
                                                <div 
                                                    key={sIdx} 
                                                    className="py-2 flex items-center justify-between gap-2 text-left"
                                                >
                                                    {/* Alt başlık fontu text-xs olarak narinleştirildi */}
                                                    <span className={`text-[11px] md:text-xs font-semibold leading-tight flex-1 ${sub.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                                        {sub.title}
                                                    </span>

                                                    {/* Durum Simge Göstergeleri */}
                                                    <div className="shrink-0 p-1">
                                                        {sub.completed ? (
                                                            <CheckCircle size={15} className="text-emerald-500 shadow-sm" />
                                                        ) : (
                                                            <Circle size={15} className="text-slate-300" />
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {subTopicsCount === 0 && (
                                            <div className="text-[10px] text-slate-400 italic py-2">Bu ana başlığa ait alt konu girilmemiş.</div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}

                {curriculumList.length === 0 && (
                    <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                        <Sparkles className="w-5 h-5 text-slate-300 mx-auto mb-1.5 animate-pulse" />
                        <span className="text-[11px] font-bold text-slate-400 block">Akademik müfredat henüz tanımlanmamış.</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CurriculumTracker;
