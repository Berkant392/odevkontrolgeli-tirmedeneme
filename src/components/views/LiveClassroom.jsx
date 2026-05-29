import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Video, 
    Calendar, 
    Clock, 
    Shield, 
    Sliders, 
    UserCheck, 
    Mic, 
    Camera, 
    Plus, 
    Trash2, 
    ExternalLink, 
    AlertCircle, 
    Sparkles, 
    Check, 
    X,
    Lock
} from 'lucide-react';
import { db } from '../../config/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';

const LiveSessionManager = ({ classes = [], isTeacherMode = false, showAlert, loggedInStudent = null, startLiveSession, joinLiveSession }) => {
    const [liveSessions, setLiveSessions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Form States (Teacher Only)
    const [selectedClassId, setSelectedClassId] = useState('');
    const [startTime, setStartTime] = useState('');
    const [duration, setDuration] = useState(40); // Default: 40 minutes
    const [allowCamera, setAllowCamera] = useState(true);
    const [allowMic, setAllowMic] = useState(true);
    const [requireApproval, setRequireApproval] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filtered Classes for Teacher Dropdown (combines VIP & Regular)
    const allTeacherClasses = classes || [];

    // Real-Time Firestore Listener for Live Sessions
    useEffect(() => {
        setIsLoading(true);
        const q = query(collection(db, "liveSessions"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const sessions = [];
            snapshot.forEach((doc) => {
                sessions.push({ id: doc.id, ...doc.data() });
            });
            setLiveSessions(sessions);
            setIsLoading(false);
        }, (err) => {
            console.error("Firestore Canlı Ders Okuma Hatası:", err);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Filter sessions for Student
    const studentClasses = classes?.filter(cls => 
        cls.students?.some(s => s.id === loggedInStudent?.id)
    ) || [];

    const visibleSessions = isTeacherMode 
        ? liveSessions 
        : liveSessions.filter(s => studentClasses.some(cls => String(cls.id) === String(s.classId)));

    // Handle Create/Schedule Live Session (Teacher Only)
    const handleScheduleSession = async (e) => {
        e.preventDefault();
        if (!selectedClassId || !startTime) {
            showAlert('warning', 'Eksik Bilgi', 'Lütfen sınıfı ve başlangıç saatini seçin.');
            return;
        }

        const selectedClass = allTeacherClasses.find(c => String(c.id) === String(selectedClassId));
        if (!selectedClass) return;

        setIsSubmitting(true);
        try {
            const roomId = `berkant-${selectedClass.type === 'vip' ? 'vip' : 'grup'}-${selectedClass.id}-${Math.random().toString(36).substring(2, 9)}`;
            
            const newSession = {
                classId: selectedClass.id,
                className: selectedClass.className,
                isVip: selectedClass.type === 'vip',
                roomId: roomId,
                teacherId: 'berkant-hoca',
                createdAt: new Date().toISOString(),
                startTime: startTime, // ISO or localized string from input
                duration: Number(duration),
                allowCamera: allowCamera,
                allowMic: allowMic,
                requireApproval: requireApproval,
                status: 'planned' // 'planned' -> 'active' -> 'ended'
            };

            await addDoc(collection(db, "liveSessions"), newSession);
            
            showAlert('success', 'Planlama Başarılı', `${selectedClass.className} sınıfı için canlı ders planlandı.`);
            
            // Form Reset
            setSelectedClassId('');
            setStartTime('');
            setDuration(40);
            setAllowCamera(true);
            setAllowMic(true);
            setRequireApproval(false);
        } catch (err) {
            console.error("Ders planlama hatası:", err);
            showAlert('error', 'Hata', 'Canlı ders planlanırken veritabanı hatası oluştu. Firebase kurallarınızı kontrol edin.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Start/Activate a Planned Session (Teacher Only)
    const handleStartSession = async (session) => {
        try {
            const sessionRef = doc(db, "liveSessions", session.id);
            await updateDoc(sessionRef, { status: 'active' });
            
            // Odaya doğrudan uygulama içinde bağlan!
            if (joinLiveSession) {
                joinLiveSession(session);
            }
        } catch (err) {
            console.error("Ders başlatma hatası:", err);
            showAlert('error', 'Hata', 'Canlı ders başlatılamadı.');
        }
    };

    // End/Delete Session
    const handleDeleteSession = async (sessionId, isPlanned = true) => {
        const title = isPlanned ? 'Planı Sil' : 'Dersi Bitir';
        const msg = isPlanned 
            ? 'Bu planlanan canlı dersi silmek istediğinize emin misiniz?' 
            : 'Bu aktif canlı dersi sonlandırmak istiyor musunuz? Öğrencilerin bağlantısı kesilecektir.';

        showAlert('warning', title, msg, async () => {
            try {
                await deleteDoc(doc(db, "liveSessions", sessionId));
            } catch (err) {
                console.error("Ders silme hatası:", err);
            }
        });
    };

    // Toggle Permission in Real Time (Teacher Only, updates Firestore)
    const handleTogglePermission = async (session, field, currentValue) => {
        try {
            const sessionRef = doc(db, "liveSessions", session.id);
            await updateDoc(sessionRef, { [field]: !currentValue });
        } catch (err) {
            console.error("İzin güncelleme hatası:", err);
        }
    };

    // Student Join Action
    const handleStudentJoin = (session) => {
        const now = new Date();
        const start = new Date(session.startTime || "");
        const diffMs = isNaN(start.getTime()) ? -1 : start.getTime() - now.getTime();

        if (session.status === 'planned') {
            let dateStr = "Belirtilmemiş";
            try {
                if (session.startTime) {
                    dateStr = start.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
                }
            } catch (e) {
                console.error(e);
            }
            if (diffMs > 0) {
                showAlert('info', 'Ders Henüz Başlamadı', `Bu ders henüz başlamamıştır.\nBaşlangıç Zamanı: ${dateStr}`);
                return;
            } else {
                showAlert('info', 'Giriş Bekleniyor', 'Ders saati geldi! Ancak öğretmeninizin derse girişi aktifleştirmesi bekleniyor. Lütfen sayfayı yenilemeden bekleyin.');
                return;
            }
        }

        // Odaya doğrudan uygulama içinde bağlan!
        if (joinLiveSession) {
            joinLiveSession(session);
        }
    };

    // Helpers
    const getStatusLabel = (status) => {
        switch (status) {
            case 'planned': return { text: 'Planlandı', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
            case 'active': return { text: 'Yayında', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse' };
            default: return { text: 'Bitti', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
        }
    };

    const isClassTimeReached = (startTimeStr) => {
        return new Date(startTimeStr) <= new Date();
    };

    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in-up pb-8">
            {/* Header Area */}
            <div className="flex items-center gap-3 bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100">
                <div className="p-3 bg-gradient-to-tr from-brandPurple to-blue-600 rounded-2xl text-white shadow-lg">
                    <Video size={24} />
                </div>
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-800">
                        {isTeacherMode ? 'Canlı Ders Planlama & Yönetim Paneli' : 'Canlı Sınıf Odalarım'}
                    </h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        {isTeacherMode ? 'Ders planlayın, süreleri belirleyin ve kamera yetkilerini yönetin' : 'Yaklaşan ve aktif olan canlı derslerinizi takip edin'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Left Side: Create Session Form (Teacher Only) */}
                {isTeacherMode && (
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-5 md:p-6 space-y-5 lg:col-span-1"
                    >
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                            <Plus size={18} className="text-brandPurple" /> Canlı Ders Planla
                        </h3>

                        <form onSubmit={handleScheduleSession} className="space-y-4">
                            {/* Class Selection */}
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Ders Verilecek Sınıf / VIP Öğrenci</label>
                                <select 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-brandPurple focus:bg-white transition-all shadow-inner"
                                    value={selectedClassId}
                                    onChange={e => setSelectedClassId(e.target.value)}
                                >
                                    <option value="">Sınıf Seçin...</option>
                                    {allTeacherClasses.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.className} {c.type === 'vip' ? '(VIP Özel Ders)' : '(Grup Sınıfı)'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Date & Time */}
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Başlangıç Zamanı</label>
                                <input 
                                    type="datetime-local" 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-brandPurple focus:bg-white transition-all shadow-inner"
                                    value={startTime}
                                    onChange={e => setStartTime(e.target.value)}
                                />
                            </div>

                            {/* Duration */}
                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Ders Süresi</label>
                                    <span className="text-xs font-black text-brandPurple bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">{duration} Dakika</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="15" 
                                    max="180" 
                                    step="5"
                                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brandPurple"
                                    value={duration}
                                    onChange={e => setDuration(e.target.value)}
                                />
                                <div className="flex justify-between text-[10px] text-slate-400 font-bold px-1 mt-1">
                                    <span>15 dk</span>
                                    <span>60 dk</span>
                                    <span>120 dk</span>
                                    <span>180 dk</span>
                                </div>
                            </div>

                            {/* Permissions Control Card */}
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3.5">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
                                    <Shield size={14} className="text-brandPurple" /> İzin Yönetimi (Varsayılan)
                                </h4>

                                {/* Camera Toggle */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-lg border ${allowCamera ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-slate-200 text-slate-400 border-slate-300'}`}>
                                            <Camera size={14} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-700">Kameralar Açık</p>
                                            <p className="text-[9px] font-bold text-slate-400">Öğrenciler kamera açabilir</p>
                                        </div>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => setAllowCamera(!allowCamera)}
                                        className={`w-10 h-6 flex items-center rounded-full p-1 transition-all ${allowCamera ? 'bg-brandPurple justify-end' : 'bg-slate-300 justify-start'}`}
                                    >
                                        <motion.div layout className="w-4 h-4 bg-white rounded-full shadow" />
                                    </button>
                                </div>

                                {/* Mic Toggle */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-lg border ${allowMic ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-slate-200 text-slate-400 border-slate-300'}`}>
                                            <Mic size={14} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-700">Mikrofonlar Açık</p>
                                            <p className="text-[9px] font-bold text-slate-400">Öğrenciler ses açabilir</p>
                                        </div>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => setAllowMic(!allowMic)}
                                        className={`w-10 h-6 flex items-center rounded-full p-1 transition-all ${allowMic ? 'bg-brandPurple justify-end' : 'bg-slate-300 justify-start'}`}
                                    >
                                        <motion.div layout className="w-4 h-4 bg-white rounded-full shadow" />
                                    </button>
                                </div>

                                {/* Require Approval Toggle */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-lg border ${requireApproval ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' : 'bg-slate-200 text-slate-400 border-slate-300'}`}>
                                            <UserCheck size={14} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-700">Bekleme Odası (Lobi)</p>
                                            <p className="text-[9px] font-bold text-slate-400">Katılım için hoca onayı gerekir</p>
                                        </div>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => setRequireApproval(!requireApproval)}
                                        className={`w-10 h-6 flex items-center rounded-full p-1 transition-all ${requireApproval ? 'bg-brandPurple justify-end' : 'bg-slate-300 justify-start'}`}
                                    >
                                        <motion.div layout className="w-4 h-4 bg-white rounded-full shadow" />
                                    </button>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-brandPurple hover:bg-purple-700 text-white font-black py-3 rounded-2xl shadow-lg shadow-brandPurple/20 hover:shadow-brandPurple/30 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Sparkles size={16} className="animate-pulse" /> PLANLA VE OLUŞTUR
                            </button>
                        </form>
                    </motion.div>
                )}

                {/* Right Side: List of Scheduled / Active Classes */}
                <div className={`bg-white rounded-[2rem] border border-slate-200 shadow-sm p-5 md:p-6 space-y-5 ${isTeacherMode ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                        <Calendar size={18} className="text-brandPurple" /> Canlı Ders Listesi ({visibleSessions.length})
                    </h3>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                            <motion.div 
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                className="mb-3 text-brandPurple"
                            >
                                <Clock size={32} />
                            </motion.div>
                            <p className="text-xs font-bold uppercase tracking-wider">Veriler Yükleniyor...</p>
                        </div>
                    ) : visibleSessions.length === 0 ? (
                        <div className="text-center p-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 text-slate-400">
                            <Video size={40} className="opacity-30" />
                            <p className="text-sm font-black">Planlanmış Ders Bulunmuyor</p>
                            <p className="text-xs leading-relaxed max-w-xs">
                                {isTeacherMode 
                                    ? 'Henüz bir ders tanımlanmamış. Sol taraftaki paneli kullanarak yeni bir ders oluşturabilirsiniz.' 
                                    : 'Adınıza tanımlanmış aktif veya planlı bir canlı ders bulunmuyor.'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {visibleSessions.map(session => {
                                const status = getStatusLabel(session.status);
                                let formattedTime = "Belirtilmemiş";
                                let isTimeReached = false;
                                try {
                                    if (session.startTime) {
                                        const start = new Date(session.startTime);
                                        isTimeReached = isClassTimeReached(session.startTime);
                                        formattedTime = start.toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
                                    }
                                } catch (e) {
                                    console.error("Tarih ayrıştırma hatası:", e);
                                }

                                return (
                                    <motion.div 
                                        key={session.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className={`rounded-2xl border p-4 flex flex-col justify-between gap-4 transition-all relative overflow-hidden ${
                                            session.status === 'active' 
                                                ? 'bg-emerald-50/20 border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]' 
                                                : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                                        }`}
                                    >
                                        {/* Status Badge & Vip Tag */}
                                        <div className="flex justify-between items-center">
                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${status.color}`}>
                                                {status.text}
                                            </span>
                                            {session.isVip && (
                                                <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-widest">
                                                    VIP
                                                </span>
                                            )}
                                        </div>

                                        {/* Class Title & Details */}
                                        <div>
                                            <h4 className="font-black text-slate-800 text-base leading-snug">{session.className} Canlı Sınıfı</h4>
                                            
                                            <div className="mt-2.5 space-y-1.5 text-xs text-slate-500 font-medium">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar size={14} className="text-slate-400" />
                                                    <span>{formattedTime}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Clock size={14} className="text-slate-400" />
                                                    <span>{session.duration} Dakika Süre</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Live Permission Control inside Card (Teacher Only) */}
                                        {isTeacherMode && (
                                            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/50 flex items-center justify-around gap-1">
                                                {/* Camera Permission Button */}
                                                <button 
                                                    onClick={() => handleTogglePermission(session, 'allowCamera', session.allowCamera)}
                                                    className={`p-2 rounded-lg flex-1 flex flex-col items-center justify-center gap-1 transition-all ${
                                                        session.allowCamera 
                                                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                                                            : 'bg-slate-200 text-slate-400 border border-slate-300'
                                                    }`}
                                                    title="Öğrenci kamerasını anlık yetkilendir"
                                                >
                                                    <Camera size={14} />
                                                    <span className="text-[8px] font-black uppercase">Kamera: {session.allowCamera ? 'AÇIK' : 'KAPALI'}</span>
                                                </button>

                                                {/* Mic Permission Button */}
                                                <button 
                                                    onClick={() => handleTogglePermission(session, 'allowMic', session.allowMic)}
                                                    className={`p-2 rounded-lg flex-1 flex flex-col items-center justify-center gap-1 transition-all ${
                                                        session.allowMic 
                                                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                                                            : 'bg-slate-200 text-slate-400 border border-slate-300'
                                                    }`}
                                                    title="Öğrenci mikrofonunu anlık yetkilendir"
                                                >
                                                    <Mic size={14} />
                                                    <span className="text-[8px] font-black uppercase">Ses: {session.allowMic ? 'AÇIK' : 'KAPALI'}</span>
                                                </button>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex gap-2 items-center border-t border-slate-100 pt-3">
                                            {isTeacherMode ? (
                                                <>
                                                    {session.status === 'planned' && (
                                                        <button 
                                                            onClick={() => handleStartSession(session)}
                                                            className={`flex-1 text-xs py-2 bg-brandPurple hover:bg-purple-700 text-white font-black rounded-xl shadow-md hover:shadow-brandPurple/10 flex items-center justify-center gap-1.5 transition-all`}
                                                        >
                                                            <ExternalLink size={14} /> DERSİ BAŞLAT
                                                        </button>
                                                    )}

                                                    {session.status === 'active' && (
                                                        <button 
                                                            onClick={() => {
                                                                if (joinLiveSession) joinLiveSession(session);
                                                            }}
                                                            className="flex-1 text-xs py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all"
                                                        >
                                                            <ExternalLink size={14} /> ODAYA GİR
                                                        </button>
                                                    )}

                                                    <button 
                                                        onClick={() => handleDeleteSession(session.id, session.status === 'planned')}
                                                        className="p-2 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-xl transition-colors"
                                                        title="Sınıfı sil veya dersi kapat"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            ) : (
                                                /* Student Mode Actions */
                                                <>
                                                    {session.status === 'planned' && !isTimeReached && (
                                                        <button 
                                                            onClick={() => handleStudentJoin(session)}
                                                            className="w-full text-xs py-2 bg-slate-100 text-slate-400 font-black rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 cursor-not-allowed"
                                                        >
                                                            <Lock size={14} /> DERS SAATİ BEKLENİYOR
                                                        </button>
                                                    )}

                                                    {session.status === 'planned' && isTimeReached && (
                                                        <button 
                                                            onClick={() => handleStudentJoin(session)}
                                                            className="w-full text-xs py-2 bg-amber-500 text-white font-black rounded-xl hover:bg-amber-600 shadow-md flex items-center justify-center gap-1.5 transition-all animate-pulse"
                                                        >
                                                            <Clock size={14} /> BAŞLATILMASI BEKLENİYOR
                                                        </button>
                                                    )}

                                                    {session.status === 'active' && (
                                                        <button 
                                                            onClick={() => handleStudentJoin(session)}
                                                            className="w-full text-xs py-2 bg-gradient-to-r from-emerald-400 to-teal-500 text-white font-black rounded-xl hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-[1.01] flex items-center justify-center gap-1.5 transition-all"
                                                        >
                                                            <ExternalLink size={14} /> CANLI DERSE KATIL
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default React.memo(LiveSessionManager);
