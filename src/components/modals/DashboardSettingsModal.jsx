import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Save, AlertCircle, BookOpen, Target, Youtube, Map, Layers, LayoutTemplate } from 'lucide-react';

const DashboardSettingsModal = ({ onClose, preferences, onSave }) => {
    const [localPrefs, setLocalPrefs] = useState({
        urgentHomeworks: true,
        homeworkCard: true,
        trialTrackerCard: true,
        playlistsCard: true,
        subjectStudyCard: false,
        flashcardsCard: false,
        ...preferences
    });

    const modules = [
        { id: 'urgentHomeworks', label: 'Yaklaşan Ödevler', icon: <AlertCircle size={18} className="text-rose-500" />, desc: 'Süresi yaklaşan ödevlerinizi liste halinde gösterir.' },
        { id: 'homeworkCard', label: 'Ödevlerim Kartı', icon: <BookOpen size={18} className="text-purple-500" />, desc: 'Ödevler sayfasına hızlı geçiş sağlayan özet kartı.' },
        { id: 'trialTrackerCard', label: 'Net Takibi Kartı', icon: <Target size={18} className="text-emerald-500" />, desc: 'Deneme analizi sayfasına hızlı geçiş.' },
        { id: 'playlistsCard', label: 'Playlistlerim Kartı', icon: <Youtube size={18} className="text-red-500" />, desc: 'Video kitaplığınıza kısayol.' },
        { id: 'subjectStudyCard', label: 'Konu Haritası Kartı', icon: <Map size={18} className="text-amber-500" />, desc: 'Müfredat ve konu takip ekranına kısayol.' },
        { id: 'flashcardsCard', label: 'Soru Kartlarım Kartı', icon: <Layers size={18} className="text-sky-500" />, desc: 'Telegram üzerinden çözdüğünüz sorulara kısayol.' },
    ];

    const handleToggle = (id) => {
        setLocalPrefs(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const handleSave = () => {
        onSave(localPrefs);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                <div className="bg-slate-50 border-b border-slate-100 p-6 relative shrink-0">
                    <button 
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4">
                        <LayoutTemplate size={24} />
                    </div>
                    <h2 className="text-xl font-black text-slate-800">Ana Sayfayı Düzenle</h2>
                    <p className="text-slate-500 text-sm font-medium mt-1">
                        Ana sayfanızda görmek istediğiniz modülleri açıp kapatabilirsiniz. Analiz grafikleri sabittir.
                    </p>
                </div>

                <div className="p-6 overflow-y-auto space-y-4">
                    {modules.map(mod => (
                        <div 
                            key={mod.id} 
                            onClick={() => handleToggle(mod.id)}
                            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-4 ${
                                localPrefs[mod.id] 
                                    ? 'border-primary bg-primary/5 shadow-sm' 
                                    : 'border-slate-100 bg-white hover:border-slate-200'
                            }`}
                        >
                            <div className="flex items-center gap-4 min-w-0">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                    localPrefs[mod.id] ? 'bg-white shadow-sm' : 'bg-slate-50'
                                }`}>
                                    {mod.icon}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-slate-800 text-sm truncate">{mod.label}</h3>
                                    <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{mod.desc}</p>
                                </div>
                            </div>
                            
                            {/* Toggle Switch */}
                            <div className={`w-12 h-6 rounded-full p-1 transition-colors shrink-0 flex items-center ${localPrefs[mod.id] ? 'bg-primary' : 'bg-slate-200'}`}>
                                <motion.div 
                                    layout
                                    className="w-4 h-4 bg-white rounded-full shadow-sm"
                                    animate={{ x: localPrefs[mod.id] ? 24 : 0 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 shrink-0">
                    <button
                        onClick={handleSave}
                        className="w-full py-4 bg-primary text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/30 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                    >
                        <Save size={18} /> Değişiklikleri Kaydet
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default DashboardSettingsModal;
