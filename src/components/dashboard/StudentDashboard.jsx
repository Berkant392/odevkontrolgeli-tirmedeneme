import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, AlertCircle, Clock, BookOpen, TrendingUp, ChevronRight, Calendar, Youtube, Settings, Map, Layers } from 'lucide-react';
import StudentTrialChart from '../analytics/StudentTrialChart';
import CountdownTimer from '../ui/Countdown';
import DashboardSettingsModal from '../modals/DashboardSettingsModal';
import { getGreetingMessage } from '../../utils/greetings';

const StudentDashboard = ({ classes, currentUserRole, loggedInStudent, onOpenClass, setView, countdownConfig, selectedClass }) => {
    const isVip = currentUserRole === 'vip-student';
    const [greetingData, setGreetingData] = useState({ title: '', message: '' });
    
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [dashboardPrefs, setDashboardPrefs] = useState(() => {
        try {
            const saved = localStorage.getItem(`studentDashboardPrefs_${loggedInStudent?.id}`);
            return saved ? JSON.parse(saved) : {
                urgentHomeworks: true,
                homeworkCard: true,
                trialTrackerCard: true,
                playlistsCard: true,
                subjectStudyCard: false,
                flashcardsCard: false
            };
        } catch(e) {
            return {
                urgentHomeworks: true, homeworkCard: true, trialTrackerCard: true, playlistsCard: true, subjectStudyCard: false, flashcardsCard: false
            };
        }
    });

    const handleSavePrefs = (prefs) => {
        setDashboardPrefs(prefs);
        localStorage.setItem(`studentDashboardPrefs_${loggedInStudent?.id}`, JSON.stringify(prefs));
    };

    useEffect(() => {
        const hour = new Date().getHours();
        let timeOfDay = 'İyi Çalışmalar';
        if (hour >= 5 && hour < 12) timeOfDay = 'Günaydın';
        else if (hour >= 12 && hour < 18) timeOfDay = 'Tünaydın';
        else if (hour >= 18 && hour < 22) timeOfDay = 'İyi Akşamlar';
        else timeOfDay = 'İyi Geceler';

        setGreetingData(getGreetingMessage(loggedInStudent?.name, timeOfDay));
    }, [loggedInStudent]);

    // Sadece öğrencinin kayıtlı olduğu sınıfları filtrele
    const studentClasses = classes?.filter(cls => 
        cls.students?.some(s => s.id === loggedInStudent?.id)
    ) || [];



    // Toplam Başarı Oranını Hesapla (güvenli)
    let totalPercentage = 0;
    try {
        if (studentClasses.length > 0 && loggedInStudent) {
            let totalDone = 0, totalAll = 0;
            studentClasses.forEach(cls => {
                cls.topics?.forEach(topic => {
                    topic.subColumns?.forEach(col => {
                        totalAll++;
                        if (loggedInStudent.grades?.[col.id] === 'done') totalDone++;
                    });
                });
            });
            totalPercentage = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0;
        }
    } catch (e) { totalPercentage = 0; }

    // Toplam ödev sayısı
    let totalHomeworkCount = 0;
    try {
        studentClasses.forEach(cls => {
            cls.topics?.forEach(topic => {
                totalHomeworkCount += (topic.subColumns?.length || 0);
            });
        });
    } catch (e) { totalHomeworkCount = 0; }

    // Acil Ödevleri Bul (Son 3 gün)
    const urgentHomeworks = [];
    try {
        if (loggedInStudent && studentClasses.length > 0) {
            const now = new Date();
            studentClasses.forEach(cls => {
                cls.topics?.forEach(topic => {
                    topic.subColumns?.forEach(col => {
                        const grade = loggedInStudent.grades?.[col.id];
                        if (grade !== 'done') {
                            const deadline = col.deadline || topic.date;
                            if (deadline) {
                                const deadlineDate = new Date(deadline);
                                const diffMs = deadlineDate - now;
                                const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                                if (diffDays > 0 && diffDays <= 3) {
                                    urgentHomeworks.push({
                                        id: col.id,
                                        className: cls.className,
                                        topicTitle: topic.title,
                                        colTitle: col.title,
                                        daysLeft: diffDays,
                                        hoursLeft: Math.floor(diffMs / (1000 * 60 * 60))
                                    });
                                }
                            }
                        }
                    });
                });
            });
        }
    } catch (e) { /* silent */ }

    return (
        <motion.div 
            key="student-home"
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0, y: -20 }}
            className="space-y-5 md:space-y-8 pb-4"
        >
            {/* 🌟 KARŞILAMA PANOSU + TAKVİM (BİRLEŞİK) */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-5 md:p-8 rounded-[2rem] overflow-hidden relative border shadow-2xl ${isVip ? 'bg-slate-900 border-yellow-500/20' : 'bg-primary border-white/10 shadow-primary/25'}`}
            >
                {/* Dekoratif Işıklar */}
                {!isVip ? (
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl mix-blend-overlay pointer-events-none"></div>
                ) : (
                    <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-amber-500 opacity-5 rounded-full blur-3xl mix-blend-overlay pointer-events-none"></div>
                )}
                
                <div className="relative z-10">
                    {/* Profil ve Selamlama */}
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className={`relative w-14 h-14 md:w-20 md:h-20 shrink-0 rounded-[1rem] md:rounded-[1.4rem] p-[3px] overflow-hidden shadow-lg ${isVip ? 'shadow-[0_0_25px_rgba(245,158,11,0.3)]' : 'shadow-[0_0_25px_rgba(255,255,255,0.3)]'}`}>
                            <div className="absolute inset-[-100%] animate-[spin_4s_linear_infinite]" style={{ background: isVip ? 'conic-gradient(from 0deg, transparent 0 340deg, #f59e0b 360deg)' : 'conic-gradient(from 0deg, transparent 0 340deg, #ffffff 360deg)' }}></div>
                            <div className={`relative w-full h-full rounded-xl md:rounded-[1.1rem] flex items-center justify-center text-xl md:text-3xl font-black z-10 ${isVip ? 'bg-slate-900 text-vipGold' : 'bg-primary text-white shadow-inner'}`}>
                                {(loggedInStudent?.name || '').charAt(0).toUpperCase() || 'S'}
                            </div>
                        </div>
                        <div className="min-w-0 flex-1 relative">
                            <h1 className={`text-lg md:text-3xl font-black mb-0.5 leading-tight truncate pr-10 ${isVip ? 'real-gold-text' : 'text-white'}`}>
                                {greetingData.title}
                            </h1>
                            <button 
                                onClick={() => setShowSettingsModal(true)}
                                className={`absolute top-0 right-0 p-1.5 md:p-2 rounded-full backdrop-blur-sm transition-all ${isVip ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-white/10 text-white hover:bg-white/20'}`}
                                title="Ana Sayfayı Düzenle"
                            >
                                <Settings size={18} />
                            </button>
                            <p className={`text-[11px] md:text-sm font-medium italic line-clamp-2 ${isVip ? 'text-slate-400' : 'text-white/80'}`}>
                                "{greetingData.message}"
                            </p>
                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full border ${isVip ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-white/10 text-white border-white/20'}`}>
                                    Başarı: %{totalPercentage}
                                </span>
                                {isVip && <span className="text-[10px] md:text-xs font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-200 to-yellow-500 text-slate-900 shadow-[0_0_10px_rgba(245,158,11,0.3)]">VIP</span>}
                            </div>
                        </div>
                    </div>

                    {/* Geri Sayım (Countdown) — TAM GENİŞLİK */}
                    {countdownConfig && (
                        <div className={`mt-4 p-4 md:p-5 rounded-[1.5rem] border ${isVip ? 'bg-slate-900/90 border-amber-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]' : 'bg-gradient-to-b from-slate-800 to-slate-900 border-slate-700 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_10px_20px_-5px_rgba(0,0,0,0.3)]'} backdrop-blur-xl relative overflow-hidden`}>
                            {/* Profesyonel detaylar: üst ışık hüzmesi */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                            <div className="absolute -top-10 -left-10 w-20 h-20 bg-primary/20 blur-2xl rounded-full"></div>
                            <div className="absolute -bottom-10 -right-10 w-20 h-20 bg-amber-500/20 blur-2xl rounded-full"></div>
                            
                            <div className="relative z-10">
                                <CountdownTimer 
                                    targetDateStr={countdownConfig.targetDate} 
                                    startDateStr={countdownConfig.startDate} 
                                    targetLabel={countdownConfig.label} 
                                    minimalist={true} 
                                />
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>



            {/* 🚨 YAKLAŞAN ÖDEVLER */}
            <AnimatePresence>
                {dashboardPrefs.urgentHomeworks && urgentHomeworks.length > 0 && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`rounded-2xl p-4 md:p-5 shadow-sm overflow-hidden relative ${isVip ? 'bg-rose-900/30 border border-rose-500/20' : 'bg-rose-50 border border-rose-200'}`}
                    >
                        <div className={`absolute top-0 left-0 w-1 h-full ${isVip ? 'bg-rose-400' : 'bg-rose-500'}`}></div>
                        <h3 className={`text-xs md:text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-3 ${isVip ? 'text-rose-300' : 'text-rose-600'}`}>
                            <AlertCircle size={16} className="animate-pulse" />
                            Yaklaşan Ödevler ({urgentHomeworks.length})
                        </h3>
                        <div className="space-y-2">
                            {urgentHomeworks.slice(0, 4).map(hw => (
                                <div 
                                    key={hw.id} 
                                    onClick={() => { if(window.handleBottomNavNavigate) window.handleBottomNavNavigate('homework'); }}
                                    className={`p-2.5 rounded-xl flex items-center gap-3 cursor-pointer transition-all ${isVip ? 'bg-slate-800 border border-slate-700 hover:border-rose-500/30' : 'bg-white border border-rose-100 hover:border-rose-300 shadow-sm'}`}
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isVip ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-500'}`}>
                                        <Clock size={14} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className={`text-xs font-bold truncate ${isVip ? 'text-white' : 'text-slate-800'}`}>{hw.topicTitle}</h4>
                                        <p className={`text-[10px] mt-0.5 truncate ${isVip ? 'text-slate-400' : 'text-slate-500'}`}>{hw.colTitle} • {hw.className}</p>
                                    </div>
                                    <span className={`text-[9px] font-black px-2 py-1 rounded-lg shrink-0 ${
                                        hw.daysLeft <= 1 
                                            ? 'bg-rose-500 text-white' 
                                            : isVip ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'
                                    }`}>
                                        {hw.daysLeft <= 1 ? `${hw.hoursLeft}sa` : `${hw.daysLeft} gün`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 📦 KOMPAKT BİLGİ KARTLARI (Dinamik Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                {/* Ödevler Kartı */}
                {dashboardPrefs.homeworkCard && (
                    <motion.div 
                        whileTap={{ scale: 0.97 }} 
                        onClick={() => { if(window.handleBottomNavNavigate) window.handleBottomNavNavigate('homework'); }} 
                        className={`cursor-pointer group rounded-2xl p-4 md:p-6 flex flex-col justify-between min-h-[120px] md:min-h-[160px] relative overflow-hidden transition-all ${isVip ? 'bg-slate-800 border border-slate-700 hover:border-purple-500/30 shadow-lg' : 'bg-white border border-slate-100 hover:border-primary/30 shadow-sm hover:shadow-md'}`}
                    >
                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-all ${isVip ? 'bg-purple-500/10 text-purple-400 group-hover:bg-purple-500 group-hover:text-white' : 'bg-purple-50 text-primary group-hover:bg-primary group-hover:text-white'}`}>
                            <BookOpen size={20} className="md:w-6 md:h-6" />
                        </div>
                        <div className="mt-3">
                            <h3 className={`text-sm md:text-lg font-black ${isVip ? 'text-white' : 'text-slate-800'}`}>Ödevlerim</h3>
                            <div className="flex items-center justify-between mt-1">
                                <span className={`text-[10px] md:text-xs font-bold ${isVip ? 'text-slate-400' : 'text-slate-400'}`}>{totalHomeworkCount} kaynak</span>
                                <ChevronRight size={14} className={`${isVip ? 'text-slate-500' : 'text-slate-300'} group-hover:translate-x-0.5 transition-transform`} />
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Net Takibi Kartı */}
                {dashboardPrefs.trialTrackerCard && (
                    <motion.div 
                        whileTap={{ scale: 0.97 }} 
                        onClick={() => { if(window.handleBottomNavNavigate) window.handleBottomNavNavigate('trialTracker'); else setView('trialTracker'); }} 
                        className={`cursor-pointer group rounded-2xl p-4 md:p-6 flex flex-col justify-between min-h-[120px] md:min-h-[160px] relative overflow-hidden transition-all ${isVip ? 'bg-slate-800 border border-slate-700 hover:border-emerald-500/30 shadow-lg' : 'bg-white border border-slate-100 hover:border-emerald-300 shadow-sm hover:shadow-md'}`}
                    >
                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-all ${isVip ? 'bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white' : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white'}`}>
                            <Target size={20} className="md:w-6 md:h-6" />
                        </div>
                        <div className="mt-3">
                            <h3 className={`text-sm md:text-lg font-black ${isVip ? 'text-white' : 'text-slate-800'}`}>Net Takibi</h3>
                            <div className="flex items-center justify-between mt-1">
                                <span className={`text-[10px] md:text-xs font-bold ${isVip ? 'text-slate-400' : 'text-slate-400'}`}>Analiz & Giriş</span>
                                <ChevronRight size={14} className={`${isVip ? 'text-slate-500' : 'text-slate-300'} group-hover:translate-x-0.5 transition-transform`} />
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Playlistlerim Kartı */}
                {dashboardPrefs.playlistsCard && (
                    <motion.div 
                        whileTap={{ scale: 0.97 }} 
                        onClick={() => { if(window.handleBottomNavNavigate) window.handleBottomNavNavigate('playlists'); else setView('playlists'); }} 
                        className={`cursor-pointer group rounded-2xl p-4 md:p-6 flex flex-col justify-between min-h-[120px] md:min-h-[160px] relative overflow-hidden transition-all ${isVip ? 'bg-slate-800 border border-slate-700 hover:border-red-500/30 shadow-lg' : 'bg-white border border-slate-100 hover:border-primary/30 shadow-sm hover:shadow-md'}`}
                    >
                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-all ${isVip ? 'bg-amber-500/10 text-amber-400 group-hover:bg-amber-50 group-hover:text-white' : 'bg-red-50 text-red-500 group-hover:bg-red-600 group-hover:text-white'}`}>
                            <Youtube size={20} className="md:w-6 md:h-6" />
                        </div>
                        <div className="mt-3">
                            <h3 className={`text-sm md:text-lg font-black ${isVip ? 'text-white' : 'text-slate-800'}`}>Playlistlerim</h3>
                            <div className="flex items-center justify-between mt-1">
                                <span className={`text-[10px] md:text-xs font-bold ${isVip ? 'text-slate-400' : 'text-slate-400'}`}>Video Kitaplığı</span>
                                <ChevronRight size={14} className={`${isVip ? 'text-slate-500' : 'text-slate-300'} group-hover:translate-x-0.5 transition-transform`} />
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Konu Haritası Kartı */}
                {dashboardPrefs.subjectStudyCard && (
                    <motion.div 
                        whileTap={{ scale: 0.97 }} 
                        onClick={() => { if(window.handleBottomNavNavigate) window.handleBottomNavNavigate('subject-study'); else setView('subject-study'); }} 
                        className={`cursor-pointer group rounded-2xl p-4 md:p-6 flex flex-col justify-between min-h-[120px] md:min-h-[160px] relative overflow-hidden transition-all ${isVip ? 'bg-slate-800 border border-slate-700 hover:border-amber-500/30 shadow-lg' : 'bg-white border border-slate-100 hover:border-amber-400/30 shadow-sm hover:shadow-md'}`}
                    >
                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-all ${isVip ? 'bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-white' : 'bg-amber-50 text-amber-500 group-hover:bg-amber-500 group-hover:text-white'}`}>
                            <Map size={20} className="md:w-6 md:h-6" />
                        </div>
                        <div className="mt-3">
                            <h3 className={`text-sm md:text-lg font-black ${isVip ? 'text-white' : 'text-slate-800'}`}>Konu Haritası</h3>
                            <div className="flex items-center justify-between mt-1">
                                <span className={`text-[10px] md:text-xs font-bold ${isVip ? 'text-slate-400' : 'text-slate-400'}`}>Müfredat Takibi</span>
                                <ChevronRight size={14} className={`${isVip ? 'text-slate-500' : 'text-slate-300'} group-hover:translate-x-0.5 transition-transform`} />
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Soru Kartlarım Kartı */}
                {dashboardPrefs.flashcardsCard && (
                    <motion.div 
                        whileTap={{ scale: 0.97 }} 
                        onClick={() => { if(window.handleBottomNavNavigate) window.handleBottomNavNavigate('questions'); else setView('questions'); }} 
                        className={`cursor-pointer group rounded-2xl p-4 md:p-6 flex flex-col justify-between min-h-[120px] md:min-h-[160px] relative overflow-hidden transition-all ${isVip ? 'bg-slate-800 border border-slate-700 hover:border-sky-500/30 shadow-lg' : 'bg-white border border-slate-100 hover:border-sky-400/30 shadow-sm hover:shadow-md'}`}
                    >
                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-all ${isVip ? 'bg-sky-500/10 text-sky-400 group-hover:bg-sky-500 group-hover:text-white' : 'bg-sky-50 text-sky-500 group-hover:bg-sky-500 group-hover:text-white'}`}>
                            <Layers size={20} className="md:w-6 md:h-6" />
                        </div>
                        <div className="mt-3">
                            <h3 className={`text-sm md:text-lg font-black ${isVip ? 'text-white' : 'text-slate-800'}`}>Soru Kartlarım</h3>
                            <div className="flex items-center justify-between mt-1">
                                <span className={`text-[10px] md:text-xs font-bold ${isVip ? 'text-slate-400' : 'text-slate-400'}`}>Kütüphane</span>
                                <ChevronRight size={14} className={`${isVip ? 'text-slate-500' : 'text-slate-300'} group-hover:translate-x-0.5 transition-transform`} />
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* 📊 ANALİTİK: ÖĞRENCİ DENEME GRAFİĞİ (Her Zaman Görünür) */}
            {loggedInStudent && <StudentTrialChart studentId={loggedInStudent.id} isVip={isVip} />}

            {/* Ayarlar Modalı */}
            {showSettingsModal && (
                <DashboardSettingsModal 
                    onClose={() => setShowSettingsModal(false)}
                    preferences={dashboardPrefs}
                    onSave={handleSavePrefs}
                />
            )}
        </motion.div> 
    );
};

export default React.memo(StudentDashboard);
