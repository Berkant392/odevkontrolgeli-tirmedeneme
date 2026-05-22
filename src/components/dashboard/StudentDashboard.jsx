import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Target, AlertCircle, Clock, BookOpen } from 'lucide-react';
import StudentTrialChart from '../analytics/StudentTrialChart';
import CountdownTimer from '../ui/Countdown';
import { getGreetingMessage } from '../../utils/greetings';
import { calculateStats, getDeadlineStatus } from '../../utils/helpers';

const StudentDashboard = ({ classes, currentUserRole, loggedInStudent, onOpenClass, setView, countdownConfig }) => {
    const isVip = currentUserRole === 'vip-student';
    const [greetingData, setGreetingData] = useState({ title: '', message: '' });

    useEffect(() => {
        const hour = new Date().getHours();
        let timeOfDay = 'İyi Çalışmalar';
        if (hour >= 5 && hour < 12) timeOfDay = 'Günaydın';
        else if (hour >= 12 && hour < 18) timeOfDay = 'Tünaydın';
        else if (hour >= 18 && hour < 22) timeOfDay = 'İyi Akşamlar';
        else timeOfDay = 'İyi Geceler';

        setGreetingData(getGreetingMessage(loggedInStudent?.name, timeOfDay));
    }, [loggedInStudent]);

    // Toplam Başarı Oranını Hesapla (Tüm sınıfları baz alarak veya ilk sınıfı)
    let totalPercentage = 0;
    if (classes && classes.length > 0 && loggedInStudent) {
        // En önemli/ilk sınıfın istatistiğini al
        const stats = calculateStats([loggedInStudent], classes[0].topics);
        totalPercentage = stats.percentage || 0;
    }

    // Acil Ödevleri Bul (Son 3 gün)
    const urgentHomeworks = [];
    if (loggedInStudent && classes) {
        classes.forEach(cls => {
            cls.topics?.forEach(topic => {
                topic.subColumns?.forEach(col => {
                    const grade = loggedInStudent.grades?.[col.id];
                    if (grade !== 'done') {
                        const deadline = col.deadline || topic.date;
                        if (deadline) {
                            const status = getDeadlineStatus(deadline);
                            if (status.status === 'urgent' && status.diffObj.days <= 3) {
                                urgentHomeworks.push({
                                    id: col.id,
                                    className: cls.className,
                                    topicTitle: topic.title,
                                    colTitle: col.title,
                                    text: status.text
                                });
                            }
                        }
                    }
                });
            });
        });
    }

    return (
        <motion.div 
            key="student-home"
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1, transition: { staggerChildren: 0.1 } }} 
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6 md:space-y-8"
        >
            {/* 🌟 AKILLI KARŞILAMA PANOSU & PROFİL (BİRLEŞİK) */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-5 md:p-8 rounded-[2rem] overflow-hidden relative border shadow-2xl ${isVip ? 'bg-slate-900 border-yellow-500/20' : 'bg-gradient-to-br from-brandPurple to-blue-600 border-purple-400/30'}`}
            >
                {/* Dekoratif Işıklar */}
                {!isVip ? (
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl mix-blend-overlay pointer-events-none"></div>
                ) : (
                    <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-amber-500 opacity-5 rounded-full blur-3xl mix-blend-overlay pointer-events-none"></div>
                )}
                
                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    
                    {/* Profil ve Selamlama */}
                    <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 md:w-20 md:h-20 shrink-0 rounded-2xl flex items-center justify-center text-2xl md:text-3xl font-black shadow-lg border-2 ${isVip ? 'bg-slate-800 text-vipGold border-yellow-500/30' : 'bg-white text-brandPurple border-white/20'}`}>
                            {loggedInStudent?.name?.charAt(0).toUpperCase() || 'S'}
                        </div>
                        <div>
                            <h1 className={`text-xl md:text-3xl font-black mb-1 leading-tight ${isVip ? 'real-gold-text' : 'text-white'}`}>
                                {greetingData.title}
                            </h1>
                            <p className={`text-xs md:text-sm font-medium italic ${isVip ? 'text-slate-400' : 'text-white/80'}`}>
                                "{greetingData.message}"
                            </p>
                            <div className="mt-2.5 flex items-center gap-2">
                                <span className={`text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full border ${isVip ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-white/10 text-white border-white/20'}`}>
                                    Genel Başarı: %{totalPercentage}
                                </span>
                                {isVip && <span className="text-[10px] md:text-xs font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-200 to-yellow-500 text-slate-900 shadow-[0_0_10px_rgba(245,158,11,0.3)]">VIP Öğrenci</span>}
                            </div>
                        </div>
                    </div>

                    {/* Minimalist Geri Sayım (Countdown) */}
                    {countdownConfig && (
                        <div className={`shrink-0 p-4 rounded-2xl border ${isVip ? 'bg-slate-800/80 border-slate-700' : 'bg-black/10 border-white/10'} backdrop-blur-md`}>
                            <CountdownTimer 
                                targetDateStr={countdownConfig.targetDate} 
                                startDateStr={countdownConfig.startDate} 
                                targetLabel={countdownConfig.label} 
                                minimalist={true} 
                            />
                        </div>
                    )}
                </div>
            </motion.div>

            {/* 🚨 DİKKAT MODÜLÜ (Sadece acil ödev varsa görünür) */}
            <AnimatePresence>
                {urgentHomeworks.length > 0 && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-rose-50 border border-rose-200 rounded-3xl p-5 md:p-6 shadow-sm overflow-hidden relative"
                    >
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500"></div>
                        <h3 className="text-sm md:text-base font-black text-rose-600 uppercase tracking-widest flex items-center gap-2 mb-3">
                            <AlertCircle size={20} className="animate-pulse" />
                            Yaklaşan Ödevler
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {urgentHomeworks.map(hw => (
                                <div key={hw.id} className="bg-white p-3 rounded-2xl border border-rose-100 flex items-start gap-3 shadow-sm">
                                    <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-500 flex items-center justify-center shrink-0">
                                        <Clock size={16} />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{hw.topicTitle}</h4>
                                        <p className="text-[10px] text-slate-500 mt-0.5">{hw.colTitle} • {hw.className}</p>
                                        <span className="inline-block mt-1.5 text-[9px] font-black px-2 py-0.5 bg-rose-500 text-white rounded-md">Son {hw.text}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div>
                <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 ml-2 mb-4">
                    Araçlar & Modüller
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {/* Sınıfına Git Modülü (Eski Sınıflarım yerine) */}
                    {classes.map((cls) => ( 
                        <motion.div 
                            key={cls.id} 
                            whileHover={{ scale: 1.02, y: -3 }} 
                            whileTap={{ scale: 0.98 }} 
                            onClick={() => {
                                // Home sayfasından sınıf/ödev detayına gitmek için
                                if(window.handleBottomNavNavigate) window.handleBottomNavNavigate('homework');
                            }} 
                            className={`cursor-pointer group rounded-2xl md:rounded-3xl p-5 md:p-8 flex flex-col items-center justify-center text-center ${isVip ? 'bg-slate-800 border border-slate-700 shadow-xl' : 'bg-white border-slate-100 shadow-float'}`}
                        >
                            <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center mb-3.5 md:mb-5 transition-all duration-300 shadow-sm ${isVip ? 'bg-slate-700 text-vipGold group-hover:bg-vipGold group-hover:text-slate-900 shadow-sm' : 'bg-purple-50 text-brandPurple group-hover:bg-brandPurple group-hover:text-white'}`}>
                                <BookOpen className="w-6 h-6 md:w-8 md:h-8" />
                            </div>
                            <h2 className={`text-lg md:text-2xl font-black tracking-tight transition-colors ${isVip ? 'text-white group-hover:real-gold-text' : 'text-slate-800 group-hover:text-brandPurple'}`}>Ödevlerim</h2>
                            <p className={`text-[10px] md:text-xs mt-2.5 md:mt-3 font-bold uppercase tracking-widest px-3 py-1 md:px-4 md:py-1.5 rounded-full ${isVip ? 'bg-slate-700 text-vipGold border border-slate-600' : 'bg-slate-50 text-slate-400'}`}>Tüm Ödevleri Gör</p>
                        </motion.div> 
                    ))}

                    <motion.div 
                        whileHover={{ scale: 1.02, y: -3 }} 
                        whileTap={{ scale: 0.98 }} 
                        onClick={() => { if(window.handleBottomNavNavigate) window.handleBottomNavNavigate('trialTracker'); else setView('trialTracker'); }} 
                        className={`cursor-pointer group rounded-2xl md:rounded-3xl p-5 md:p-8 flex flex-col items-center justify-center text-center ${isVip ? 'bg-slate-800 border border-slate-700 shadow-xl' : 'bg-white border-slate-100 shadow-float'}`}
                    >
                        <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center mb-3.5 md:mb-5 transition-all duration-300 shadow-sm ${isVip ? 'bg-slate-700 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white shadow-sm' : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white'}`}>
                            <Target className="w-6 h-6 md:w-8 md:h-8" />
                        </div>
                        
                        <h2 className={`text-lg md:text-2xl font-black tracking-tight transition-colors ${isVip ? 'text-white group-hover:text-emerald-400' : 'text-slate-800 group-hover:text-emerald-600'}`}>Deneme Takibi</h2>
                        
                        <p className={`text-[10px] md:text-xs mt-2.5 md:mt-3 font-bold uppercase tracking-widest px-3 py-1 md:px-4 md:py-1.5 rounded-full ${isVip ? 'bg-slate-700 text-emerald-400 border border-slate-600' : 'bg-slate-50 text-slate-400'}`}>Netlerini Gir & Analiz Et</p>
                    </motion.div>
                </div>
            </div>

            {/* 📊 ANALİTİK: ÖĞRENCİ DENEME GRAFİĞİ (Ana Ekranda) */}
            {loggedInStudent && <StudentTrialChart studentId={loggedInStudent.id} isVip={isVip} />}
        </motion.div> 
    );
};

export default React.memo(StudentDashboard);
