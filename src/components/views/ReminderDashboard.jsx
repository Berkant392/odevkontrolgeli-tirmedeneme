import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Plus, Trash2, Clock, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';

const ReminderDashboard = ({ reminders, setReminders }) => {
    const [newText, setNewText] = useState("");
    const [newTargetTime, setNewTargetTime] = useState("");

    const handleAdd = () => {
        if (!newText.trim()) return;
        
        const newReminder = {
            id: Date.now().toString(),
            text: newText,
            targetTime: newTargetTime || null,
            isTriggered: false
        };

        setReminders(prev => [...prev, newReminder]);
        setNewText("");
        setNewTargetTime("");
    };

    const handleDelete = (id) => {
        setReminders(prev => prev.filter(r => r.id !== id));
    };

    const handleToggleTriggered = (id) => {
        setReminders(prev => prev.map(r => r.id === id ? { ...r, isTriggered: !r.isTriggered } : r));
    };

    const sortedReminders = [...reminders].sort((a, b) => {
        if (!a.targetTime && !b.targetTime) return 0;
        if (!a.targetTime) return 1;
        if (!b.targetTime) return -1;
        return new Date(a.targetTime) - new Date(b.targetTime);
    });

    const activeReminders = sortedReminders.filter(r => !r.isTriggered);
    const pastReminders = sortedReminders.filter(r => r.isTriggered);

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0 }} 
            className="p-4 md:p-8 max-w-5xl mx-auto min-h-screen"
        >
            {/* BAŞLIK & EKLEME KISMI */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 mb-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-purple-100 text-brandPurple rounded-2xl flex items-center justify-center">
                        <Bell size={24} className="animate-bounce" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800">Bildirimlerim & Hatırlatıcılar</h1>
                        <p className="text-sm font-bold text-slate-500">Sizin ve Jarvis'in oluşturduğu alarmları yönetin.</p>
                    </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl flex flex-col md:flex-row gap-4 border border-slate-100 items-end">
                    <div className="flex-1 w-full">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Hatırlatılacak Konu</label>
                        <input 
                            type="text" 
                            className="w-full border-2 border-slate-200 rounded-xl p-3 font-bold text-sm outline-none focus:border-brandPurple bg-white"
                            placeholder="Örn: 11-A sınıfının Fizik ödevlerini kontrol et"
                            value={newText}
                            onChange={(e) => setNewText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAdd()}
                        />
                    </div>
                    <div className="w-full md:w-64">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Tarih & Saat</label>
                        <input 
                            type="datetime-local" 
                            className="w-full border-2 border-slate-200 rounded-xl p-3 font-bold text-sm outline-none focus:border-brandPurple bg-white"
                            value={newTargetTime}
                            onChange={(e) => setNewTargetTime(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAdd()}
                        />
                    </div>
                    <button 
                        onClick={handleAdd}
                        disabled={!newText.trim()}
                        className="w-full md:w-auto px-6 py-3.5 bg-brandPurple text-white rounded-xl font-black hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <Plus size={18} />
                        EKLE
                    </button>
                </div>
            </div>

            {/* LİSTELER */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* AKTİF OLANLAR */}
                <div>
                    <div className="flex items-center gap-2 mb-4 px-2">
                        <Clock size={18} className="text-amber-500" />
                        <h2 className="text-lg font-black text-slate-800">Bekleyen Alarmlar</h2>
                        <span className="ml-auto bg-amber-100 text-amber-700 text-xs font-black px-2 py-0.5 rounded-md">{activeReminders.length}</span>
                    </div>

                    <div className="space-y-3">
                        <AnimatePresence>
                            {activeReminders.length === 0 && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center p-8 bg-slate-50 rounded-3xl border border-dashed border-slate-300">
                                    <p className="text-slate-500 font-bold text-sm">Şu an için bekleyen bir alarmınız yok.</p>
                                </motion.div>
                            )}
                            {activeReminders.map(r => (
                                <motion.div 
                                    key={r.id}
                                    layout
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="bg-white p-4 rounded-2xl shadow-sm border border-l-4 border-amber-400 flex items-start gap-4 group"
                                >
                                    <button 
                                        onClick={() => handleToggleTriggered(r.id)}
                                        className="w-6 h-6 rounded-full border-2 border-slate-200 flex items-center justify-center text-transparent hover:border-emerald-500 hover:text-emerald-500 transition-colors shrink-0 mt-0.5"
                                        title="Tamamlandı olarak işaretle"
                                    >
                                        <CheckCircle2 size={16} />
                                    </button>
                                    <div className="flex-1">
                                        <p className="font-bold text-slate-800 text-sm">{r.text}</p>
                                        <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-slate-500">
                                            <Calendar size={12} />
                                            {r.targetTime ? new Date(r.targetTime).toLocaleString('tr-TR') : 'Süresiz/Sürekli Hatırlatıcı'}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleDelete(r.id)}
                                        className="text-slate-300 hover:text-rose-500 transition-colors p-2 opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                {/* GEÇMİŞ / TAMAMLANANLAR */}
                <div>
                    <div className="flex items-center gap-2 mb-4 px-2 opacity-70">
                        <CheckCircle2 size={18} className="text-emerald-500" />
                        <h2 className="text-lg font-black text-slate-800">Geçmiş Bildirimler</h2>
                        <span className="ml-auto bg-emerald-100 text-emerald-700 text-xs font-black px-2 py-0.5 rounded-md">{pastReminders.length}</span>
                    </div>

                    <div className="space-y-3 opacity-70">
                        <AnimatePresence>
                            {pastReminders.length === 0 && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center p-8 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                    <p className="text-slate-400 font-bold text-sm">Geçmiş bir alarmınız bulunmuyor.</p>
                                </motion.div>
                            )}
                            {pastReminders.map(r => (
                                <motion.div 
                                    key={r.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-start gap-4 group"
                                >
                                    <AlertCircle size={20} className="text-emerald-500 shrink-0 mt-0.5" />
                                    <div className="flex-1 line-through text-slate-500">
                                        <p className="font-bold text-sm">{r.text}</p>
                                        <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-bold">
                                            <Calendar size={12} />
                                            {r.targetTime ? new Date(r.targetTime).toLocaleString('tr-TR') : 'Süresiz'}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleDelete(r.id)}
                                        className="text-slate-300 hover:text-rose-500 transition-colors p-2 opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

            </div>
        </motion.div>
    );
};

export default ReminderDashboard;
