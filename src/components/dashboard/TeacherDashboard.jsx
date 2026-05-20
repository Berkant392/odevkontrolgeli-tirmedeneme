import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FolderPlus, Users, Search, ChevronRight, GraduationCap, Crown, Bell, Send } from 'lucide-react';
import ClassProgressChart from '../analytics/ClassProgressChart';
import { db } from '../../config/firebase';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { NOTIFICATIONS_COLLECTION } from '../../utils/constants';

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

    // Bildirim Modal State'leri
    const [showNotifModal, setShowNotifModal] = useState(false);
    const [notifTitle, setNotifTitle] = useState("");
    const [notifText, setNotifText] = useState("");
    const [notifTarget, setNotifTarget] = useState("all");

    const handleSendNotification = async () => {
        if (!notifTitle.trim() || !notifText.trim()) return;

        try {
            const newNotif = {
                title: notifTitle.trim(),
                text: notifText.trim(),
                timestamp: new Date().toISOString(),
                targetClasses: notifTarget === 'all' || notifTarget === 'vip' ? [] : [notifTarget],
                targetVipStudents: notifTarget === 'vip' ? ['all'] : (notifTarget === 'all' ? ['all'] : [])
            };
            if (notifTarget === 'all') newNotif.targetClasses = ['all'];

            const notifRef = collection(db, NOTIFICATIONS_COLLECTION);
            await addDoc(notifRef, newNotif);

            // Kotayı korumak için 10'dan sonrakileri sil
            const q = query(notifRef, orderBy('timestamp', 'desc'));
            const snap = await getDocs(q);
            if (snap.size > 10) {
                const docsToDelete = snap.docs.slice(10);
                for (let d of docsToDelete) {
                    await deleteDoc(doc(db, NOTIFICATIONS_COLLECTION, d.id));
                }
            }

            setShowNotifModal(false);
            setNotifTitle("");
            setNotifText("");
            setNotifTarget("all");
            alert("Bildirim başarıyla gönderildi!");
        } catch (e) {
            console.error("Bildirim gönderilirken hata:", e);
            alert("Hata oluştu.");
        }
    };

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
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowNotifModal(true)} className="flex-1 md:flex-none bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-5 py-3.5 rounded-2xl font-black text-xs sm:text-sm tracking-wide shadow-sm flex items-center justify-center gap-2 border border-emerald-100 transition-all">
                        <Bell size={18} strokeWidth={2.5}/> BİLDİRİM GÖNDER
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

            {/* BİLDİRİM GÖNDERME MODALI */}
            <AnimatePresence>
                {showNotifModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl p-5 w-full max-w-md shadow-2xl">
                            <h3 className="font-bold text-base mb-4 text-slate-800 flex items-center gap-2">
                                <Bell size={18} className="text-emerald-500"/> Bildirim Gönder
                            </h3>
                            
                            <div className="mb-3">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Bildirim Başlığı</label>
                                <input type="text" className="w-full border-2 border-slate-200 rounded-xl p-2.5 font-bold text-xs outline-none focus:border-emerald-500" value={notifTitle} onChange={e => setNotifTitle(e.target.value)} placeholder="Örn: Hafta Sonu Sınavı" />
                            </div>

                            <div className="mb-3">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Bildirim İçeriği</label>
                                <textarea rows="3" className="w-full border-2 border-slate-200 rounded-xl p-2.5 font-medium text-xs outline-none focus:border-emerald-500" value={notifText} onChange={e => setNotifText(e.target.value)} placeholder="Öğrencilere iletmek istediğiniz mesaj..."></textarea>
                            </div>

                            <div className="mb-4">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Hedef Kitle</label>
                                <select className="w-full border-2 border-slate-200 rounded-xl p-2.5 font-bold text-xs outline-none focus:border-emerald-500" value={notifTarget} onChange={e => setNotifTarget(e.target.value)}>
                                    <option value="all">Tüm Öğrenciler (VIP + Grup)</option>
                                    <option value="vip">Sadece VIP Öğrenciler</option>
                                    {regularClasses.map(c => (
                                        <option key={c.id} value={c.id}>{c.className} Sınıfı</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-2 justify-end">
                                <button onClick={() => setShowNotifModal(false)} className="px-4 py-2 font-bold text-xs text-slate-500 hover:bg-slate-100 rounded-xl">İptal</button>
                                <button onClick={handleSendNotification} className="px-5 py-2 bg-emerald-500 text-white font-bold text-xs rounded-xl hover:bg-emerald-600 shadow-md flex items-center gap-1.5"><Send size={14}/> Gönder</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default React.memo(TeacherDashboard);
