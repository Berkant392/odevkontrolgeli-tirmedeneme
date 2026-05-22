import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderPlus, Crown, Search, ChevronRight } from 'lucide-react';
import ClassProgressChart from '../analytics/ClassProgressChart';

const turkishNormalize = (text) => {
    if (!text) return '';
    return text
        .replace(/İ/g, 'i').replace(/I/g, 'i')
        .toLocaleLowerCase('tr-TR')
        .trim()
        .replace(/â/g, 'a').replace(/ê/g, 'e').replace(/î/g, 'i')
        .replace(/ô/g, 'o').replace(/û/g, 'u')
        .replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g')
        .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ı/g, 'i');
};

const VipDashboard = ({ vipClasses, onOpenClass, onNewVipClass }) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [showResults, setShowResults] = useState(false);
    const [vipName, setVipName] = useState('');

    const allVipStudents = vipClasses.flatMap(c => (c.students || []).map(s => ({ ...s, classId: c.id, className: c.className, isVip: true, classObj: c })));

    const filteredStudents = searchQuery.trim().length > 0
        ? allVipStudents.filter(s => {
            const studentNameNorm = turkishNormalize(s.name);
            const queryNorm = turkishNormalize(searchQuery);
            return studentNameNorm.includes(queryNorm);
        })
        : [];

    const handleAddVipSubmit = (e) => {
        e.preventDefault();
        if (vipName.trim()) {
            onNewVipClass(vipName.trim());
            setVipName('');
        }
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            
            <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between bg-slate-900 p-6 rounded-[2rem] shadow-vip-glow border border-slate-800 relative overflow-hidden">
                <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-amber-500 rounded-full mix-blend-screen filter blur-[80px] opacity-20 pointer-events-none"></div>
                
                {/* 🔍 ARAMA PANELİ */}
                <div className="flex-1 w-full relative z-10">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500">
                        <Search size={18} />
                    </div>
                    <input
                        type="text"
                        placeholder="Özel ders öğrencisi ara..."
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold text-slate-200 outline-none focus:border-amber-500 focus:bg-slate-800 transition-all placeholder:text-slate-500"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setShowResults(true); }}
                        onFocus={() => setShowResults(true)}
                    />

                    <AnimatePresence>
                        {showResults && filteredStudents.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute left-0 w-full mt-2 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-64 overflow-y-auto p-2 space-y-1"
                            >
                                {filteredStudents.map(student => (
                                    <button
                                        key={student.id}
                                        onClick={() => {
                                            setShowResults(false);
                                            setSearchQuery("");
                                            onOpenClass(student.classObj);
                                        }}
                                        className="w-full text-left p-2.5 hover:bg-slate-700 rounded-xl transition-all flex items-center justify-between group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs bg-amber-500/20 text-amber-400">
                                                {student.name.charAt(0)}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-200 group-hover:text-amber-400 transition-colors flex items-center gap-1">
                                                    {student.name} <Crown size={12} className="text-amber-500" />
                                                </span>
                                                <span className="text-[10px] font-medium text-slate-500">{student.className}</span>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="text-slate-500 group-hover:text-amber-400 transition-transform group-hover:translate-x-1" />
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* YENİ VIP EKLEME FORMU */}
                <form onSubmit={handleAddVipSubmit} className="flex-1 w-full flex gap-3 relative z-10">
                    <input
                        type="text"
                        placeholder="Yeni Özel Ders (Örn: VIP Ayşe)"
                        className="flex-1 bg-slate-800/50 border border-slate-700 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-200 outline-none focus:border-amber-500 transition-all placeholder:text-slate-500"
                        value={vipName}
                        onChange={(e) => setVipName(e.target.value)}
                    />
                    <button
                        type="submit"
                        disabled={!vipName.trim()}
                        className="real-gold-bg hover:opacity-90 text-slate-900 px-6 py-3.5 rounded-2xl font-black text-sm tracking-wide shadow-vip-glow flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                        <FolderPlus size={18} strokeWidth={2.5} /> EKLE
                    </button>
                </form>
            </div>

            {/* 📊 ANALİTİK */}
            {vipClasses.length > 0 && (
                <ClassProgressChart classes={vipClasses} title="VIP Başarı Oranları" color="vip" />
            )}

            {/* VIP KARTLARI */}
            <div className="space-y-4 mt-6">
                <h3 className="text-sm font-black text-amber-600 uppercase tracking-widest flex items-center gap-2 ml-2">
                    <Crown size={18} className="text-amber-500" /> Özel Derslerim ({vipClasses.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {vipClasses.map(cls => (
                        <motion.div key={cls.id} whileHover={{ y: -4, scale: 1.01 }} onClick={() => onOpenClass(cls)} className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-md hover:shadow-vip-glow transition-all cursor-pointer flex flex-col justify-between min-h-[160px] group relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-50 pointer-events-none"></div>
                            <div className="flex justify-between items-start relative z-10">
                                <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl group-hover:real-gold-bg group-hover:text-slate-900 transition-colors">
                                    <Crown size={24} />
                                </div>
                                <span className="text-xs font-black text-amber-400 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                                    VIP PORTAL
                                </span>
                            </div>
                            <div className="mt-5 relative z-10">
                                <h4 className="font-black text-slate-100 text-xl group-hover:text-vipGold transition-colors truncate">
                                    {cls.className}
                                </h4>
                                <p className="text-[11px] font-bold text-slate-500 mt-1.5 uppercase tracking-wider flex items-center gap-2">
                                    <span>{cls.topics?.length || 0} Görev</span>
                                    <span>•</span>
                                    <span>{cls.students?.length || 0} Öğrenci</span>
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
                {vipClasses.length === 0 && (
                    <div className="text-sm font-bold text-slate-500 bg-slate-900/40 p-8 rounded-3xl border border-dashed border-slate-800 text-center flex flex-col items-center justify-center gap-3">
                        <Crown size={32} className="opacity-20" />
                        Henüz özel ders öğrenciniz bulunmuyor.
                    </div>
                )}
            </div>
        </div>
    );
};

export default VipDashboard;
