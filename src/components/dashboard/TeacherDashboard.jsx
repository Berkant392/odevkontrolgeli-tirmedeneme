import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FolderPlus, Users, Search, ChevronRight, GraduationCap, Crown } from 'lucide-react';
import ClassProgressChart from '../analytics/ClassProgressChart';

// 🔥 YENİ: %100 TÜRKÇE KARAKTER VE BÜYÜK/KÜÇÜK HARF UYUMU SAĞLAYAN MOTOR
const turkishNormalize = (text) => {
    if (!text) return '';
    return text.toLocaleLowerCase('tr-TR')
        .trim()
        .replace(/â/g, 'a').replace(/ê/g, 'e').replace(/î/g, 'i')
        .replace(/ô/g, 'o').replace(/û/g, 'u')
        .replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g')
        .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ı/g, 'i');
};

const TeacherDashboard = ({ regularClasses, vipClasses, onOpenClass, onNewClass, onNewVipClass }) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [showResults, setShowResults] = useState(false);

    // Tüm öğrencileri tek havuzda toplama
    const allStudents = [
        ...regularClasses.flatMap(c => (c.students || []).map(s => ({ ...s, classId: c.id, className: c.className, isVip: false, classObj: c }))),
        ...vipClasses.flatMap(c => (c.students || []).map(s => ({ ...s, classId: c.id, className: c.className, isVip: true, classObj: c })))
    ];

    // 🔥 GÜNCELLEME: Geliştirilmiş akıllı Türkçe arama filtresi
    const filteredStudents = searchQuery.trim().length > 0
        ? allStudents.filter(s => {
            const studentNameNorm = turkishNormalize(s.name);
            const queryNorm = turkishNormalize(searchQuery);
            return studentNameNorm.includes(queryNorm);
          })
        : [];

    return (
        <div className="space-y-8 animate-fade-in-up">
            
            {/* ÜST BUTON BAR BAR VE MANUEL ARAMA ALANI */}
            <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between bg-white p-5 rounded-[2rem] shadow-float border border-slate-100">
                
                {/* 🔍 HARMANLANMIŞ AKILLI ARAMA PANELİ */}
                <div className="flex-1 relative max-w-xl">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
                        <Search size={18} />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Öğrenci ismi yazın (Örn: Merve)..." 
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold text-slate-700 outline-none focus:border-brandPurple focus:bg-white transition-all shadow-inner"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setShowResults(true); }}
                        onFocus={() => setShowResults(true)}
                    />
                    
                    {/* ARAMA SONUÇ POPUP KUTUSU */}
                    <AnimatePresence>
                        {showResults && filteredStudents.length > 0 && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute left-0 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-64 overflow-y-auto p-2 space-y-1"
                            >
                                {filteredStudents.map(student => (
                                    <button 
                                        key={student.id}
                                        onClick={() => {
                                            setShowResults(false);
                                            setSearchQuery("");
                                            onOpenClass(student.classObj);
                                        }}
                                        className="w-full text-left p-2.5 hover:bg-purple-50 rounded-xl transition-all flex items-center justify-between group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${student.isVip ? 'bg-amber-100 text-amber-600' : 'bg-purple-100 text-brandPurple'}`}>
                                                {student.name.charAt(0)}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-700 group-hover:text-brandPurple transition-colors flex items-center gap-1">
                                                    {student.name} {student.isVip && <Crown size={12} className="text-amber-500"/>}
                                                </span>
                                                <span className="text-[10px] font-medium text-slate-400">{student.className}</span>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="text-slate-300 group-hover:text-brandPurple transition-transform group-hover:translate-x-1" />
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* SINIF EKLEME BUTONLARI */}
                <div className="flex flex-wrap gap-2.5">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onNewClass} className="flex-1 md:flex-none bg-purple-50 hover:bg-purple-100 text-brandPurple px-5 py-3.5 rounded-2xl font-black text-xs sm:text-sm tracking-wide shadow-sm flex items-center justify-center gap-2 border border-purple-100 transition-all">
                        <Plus size={18} strokeWidth={2.5}/> GRUP SINIFI EKLE
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onNewVipClass} className="flex-1 md:flex-none real-gold-bg hover:opacity-90 text-slate-900 px-5 py-3.5 rounded-2xl font-black text-xs sm:text-sm tracking-wide shadow-vip-glow flex items-center justify-center gap-2 transition-all">
                        <FolderPlus size={18} strokeWidth={2.5}/> ÖZEL DERS (VIP) EKLE
                    </motion.button>
                </div>
            </div>

            {/* 📊 ANALİTİK: SINIF BAŞARI GRAFİĞİ */}
            {(regularClasses.length > 0 || vipClasses.length > 0) && (
                <ClassProgressChart classes={[...regularClasses, ...vipClasses]} />
            )}

            {/* MEVCUT SINIF LİSTELEME KARTLARI GRUBU */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
                {/* 🏫 GRUP SINIFLARI KUTUSU */}
                <div className="space-y-4">
                    <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 ml-2">
                        <Users size={18} className="text-brandPurple"/> Grup Sınıfları ({regularClasses.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {regularClasses.map(cls => (
                            <motion.div key={cls.id} whileHover={{ y: -4, scale: 1.01 }} onClick={() => onOpenClass(cls)} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-float transition-all cursor-pointer flex flex-col justify-between min-h-[140px] group">
                                <div className="flex justify-between items-start">
                                    <div className="p-3 bg-purple-50 text-brandPurple rounded-xl group-hover:bg-brandPurple group-hover:text-white transition-colors">
                                        <GraduationCap size={20}/>
                                    </div>
                                    <span className="text-xs font-black text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                                        {cls.students?.length || 0} Öğrenci
                                    </span>
                                </div>
                                <div className="mt-4">
                                    <h4 className="font-black text-slate-800 text-lg group-hover:text-brandPurple transition-colors truncate">
                                        {cls.className}
                                    </h4>
                                    <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                                        {cls.topics?.length || 0} Aktif Ödev Sütunu
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                    {regularClasses.length === 0 && <div className="text-sm font-bold text-slate-400 bg-white p-6 rounded-3xl border border-dashed text-center">Henüz grup sınıfı eklenmemiş.</div>}
                </div>

                {/* 👑 ÖZEL DERS / VIP KUTUSU */}
                <div className="space-y-4">
                    <h3 className="text-sm font-black text-amber-600 uppercase tracking-widest flex items-center gap-2 ml-2">
                        <Crown size={18} className="text-amber-500"/> Bireysel Özel Dersler ({vipClasses.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {vipClasses.map(cls => (
                            <motion.div key={cls.id} whileHover={{ y: -4, scale: 1.01 }} onClick={() => onOpenClass(cls)} className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-md hover:shadow-vip-glow transition-all cursor-pointer flex flex-col justify-between min-h-[140px] group relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-50 pointer-events-none"></div>
                                <div className="flex justify-between items-start relative z-10">
                                    <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl group-hover:real-gold-bg group-hover:text-slate-900 transition-colors">
                                        <Crown size={20}/>
                                    </div>
                                    <span className="text-xs font-black text-amber-400 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                                        VIP PORTAL
                                    </span>
                                </div>
                                <div className="mt-4 relative z-10">
                                    <h4 className="font-black text-slate-100 text-lg group-hover:text-vipGold transition-colors truncate">
                                        {cls.className}
                                    </h4>
                                    <p className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-wider">
                                        {cls.topics?.length || 0} Görev Takibi
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                    {vipClasses.length === 0 && <div className="text-sm font-bold text-slate-500 bg-slate-900/40 p-6 rounded-3xl border border-dashed border-slate-800 text-center">Henüz özel ders öğrencisi eklenmemiş.</div>}
                </div>

            </div>
        </div>
    );
};

export default React.memo(TeacherDashboard);
