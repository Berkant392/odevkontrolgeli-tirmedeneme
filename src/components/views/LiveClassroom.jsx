import React, { useEffect, useState, useRef, useCallback } from 'react';
import { LiveKitRoom, VideoConference, RoomAudioRenderer, useLocalParticipant, TrackToggle, usePreviewTracks } from '@livekit/components-react';
import { Track, createLocalTracks } from 'livekit-client';
import '@livekit/components-styles';
import { Loader2, X, Maximize, Minimize, Settings2, ChevronDown, ChevronUp, Video, VideoOff, Mic, MicOff, LogIn, Shield } from 'lucide-react';
import { db } from '../../config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';

/* ─────────────────────────────────────────────
   Yüzen Kontrol Paneli (Oda içinde)
   ───────────────────────────────────────────── */
const FloatingControls = () => {
    const [isMinimized, setIsMinimized] = useState(false);

    return (
        <div className="absolute bottom-4 right-4 z-[100] flex flex-col items-end gap-2 md:bottom-6 md:right-6">
            <AnimatePresence>
                {!isMinimized && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-3 shadow-2xl shadow-black/50 w-44"
                    >
                        <div className="flex items-center justify-between mb-2.5 border-b border-slate-700/50 pb-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Settings2 size={11} className="text-purple-400" /> Kontroller
                            </span>
                        </div>
                        <div className="flex justify-around items-center gap-2">
                            <div className="flex flex-col items-center gap-1">
                                <TrackToggle
                                    source={Track.Source.Microphone}
                                    className="lk-button-custom"
                                />
                                <span className="text-[8px] font-bold text-slate-500">Mikrofon</span>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <TrackToggle
                                    source={Track.Source.Camera}
                                    className="lk-button-custom"
                                />
                                <span className="text-[8px] font-bold text-slate-500">Kamera</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="bg-purple-600 hover:bg-purple-500 text-white p-2.5 rounded-full shadow-lg shadow-purple-600/30 transition-all"
                title={isMinimized ? "Kontrolleri Aç" : "Kontrolleri Gizle"}
            >
                {isMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
        </div>
    );
};

/* ─────────────────────────────────────────────
   Çıkış Onay Diyaloğu
   ───────────────────────────────────────────── */
const ExitConfirmDialog = ({ isOpen, onConfirm, onCancel, isTeacher }) => (
    <AnimatePresence>
        {isOpen && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[99999] flex items-center justify-center p-4"
                onClick={onCancel}
            >
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-xs overflow-hidden shadow-2xl"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="p-6 text-center">
                        <div className="w-14 h-14 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto mb-4">
                            <LogIn size={28} />
                        </div>
                        <h3 className="text-lg font-black text-white mb-2">
                            {isTeacher ? "Dersi Bitirmek İstiyorsunuz?" : "Dersten Ayrılmak İstiyorsunuz?"}
                        </h3>
                        <p className="text-slate-400 text-sm">
                            {isTeacher
                                ? "Dersi bitirdiğinizde tüm öğrencilerin bağlantısı kesilecektir."
                                : "Canlı dersten ayrılacaksınız. Tekrar katılabilirsiniz."}
                        </p>
                    </div>
                    <div className="flex border-t border-slate-700">
                        <button
                            onClick={onCancel}
                            className="flex-1 py-3.5 text-sm font-bold text-slate-300 hover:bg-slate-700 transition-colors"
                        >
                            Hayır, Kal
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-1 py-3.5 text-sm font-black text-rose-400 hover:bg-rose-500/10 border-l border-slate-700 transition-colors"
                        >
                            Evet, Çık
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
);

/* ─────────────────────────────────────────────
   Pre-Join (Giriş Öncesi Kontrol) Ekranı
   ───────────────────────────────────────────── */
const PreJoinScreen = ({ onJoin, onCancel, participantName, className }) => {
    const [camEnabled, setCamEnabled] = useState(true);
    const [micEnabled, setMicEnabled] = useState(true);
    const videoRef = useRef(null);
    const [localStream, setLocalStream] = useState(null);

    useEffect(() => {
        let stream = null;
        const initPreview = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: camEnabled,
                    audio: micEnabled
                });
                setLocalStream(stream);
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.log("Kamera/Mikrofon erişimi alınamadı:", err);
            }
        };
        initPreview();
        return () => {
            if (stream) {
                stream.getTracks().forEach(t => t.stop());
            }
        };
    }, [camEnabled, micEnabled]);

    return (
        <div className="fixed inset-0 bg-slate-950 z-[9999] flex items-center justify-center p-4">
            {/* Arka plan efekti */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[20%] left-[30%] w-72 h-72 bg-purple-600/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[20%] right-[20%] w-60 h-60 bg-blue-600/10 rounded-full blur-[100px]"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="relative z-10 w-full max-w-md"
            >
                {/* Geri butonu */}
                <button
                    onClick={onCancel}
                    className="absolute -top-12 left-0 text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1.5 text-sm font-bold"
                >
                    <X size={16} /> Vazgeç
                </button>

                {/* Başlık */}
                <div className="text-center mb-6">
                    <h2 className="text-xl md:text-2xl font-black text-white mb-1">{className || "Canlı Sınıf"}</h2>
                    <p className="text-slate-500 text-xs font-bold flex items-center justify-center gap-1.5">
                        <Shield size={12} className="text-emerald-500" /> Uçtan Uca Şifreli Bağlantı
                    </p>
                </div>

                {/* Kamera Önizleme */}
                <div className="relative w-full aspect-video bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 mb-5 shadow-2xl">
                    {camEnabled ? (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover mirror"
                            style={{ transform: 'scaleX(-1)' }}
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
                            <VideoOff size={48} strokeWidth={1.5} />
                            <span className="text-xs font-bold mt-2">Kamera Kapalı</span>
                        </div>
                    )}

                    {/* İsim etiketi */}
                    <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                        {participantName}
                    </div>
                </div>

                {/* Kontrol butonları */}
                <div className="flex justify-center gap-4 mb-6">
                    <button
                        onClick={() => setMicEnabled(!micEnabled)}
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg ${
                            micEnabled
                                ? 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-700'
                                : 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30'
                        }`}
                    >
                        {micEnabled ? <Mic size={22} /> : <MicOff size={22} />}
                    </button>
                    <button
                        onClick={() => setCamEnabled(!camEnabled)}
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg ${
                            camEnabled
                                ? 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-700'
                                : 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30'
                        }`}
                    >
                        {camEnabled ? <Video size={22} /> : <VideoOff size={22} />}
                    </button>
                </div>

                {/* Katıl butonu */}
                <button
                    onClick={() => {
                        if (localStream) {
                            localStream.getTracks().forEach(t => t.stop());
                        }
                        onJoin({ cam: camEnabled, mic: micEnabled });
                    }}
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black text-sm rounded-2xl shadow-lg shadow-purple-600/20 hover:shadow-purple-600/40 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    <LogIn size={18} /> DERSE KATIL
                </button>
            </motion.div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   ANA BİLEŞEN
   ───────────────────────────────────────────── */
const LiveClassroom = ({
    session: initialSession,
    isTeacherMode: initialTeacherMode,
    onEndSession,
    onClose,
    classes = [],
    sessionId = null,
    role = null,
    isStandalone = false,
    loggedInStudent = null,
    showAlert
}) => {
    const [session, setSession] = useState(initialSession);
    const [isTeacherMode] = useState(initialTeacherMode || role === 'teacher');
    const [token, setToken] = useState("");
    const [error, setError] = useState("");
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showExitDialog, setShowExitDialog] = useState(false);
    const [phase, setPhase] = useState('loading'); // 'loading' | 'prejoin' | 'connected'
    const [initialMediaState, setInitialMediaState] = useState({ cam: true, mic: true });
    const containerRef = useRef(null);

    const participantName = isTeacherMode ? "Öğretmen (Sen)" : (loggedInStudent?.name || "Öğrenci");
    const roomName = session?.roomId || sessionId || "demo-room";

    // Firestore session listener
    useEffect(() => {
        if (!initialSession && sessionId) {
            const unsub = onSnapshot(doc(db, "liveSessions", sessionId), (docSnap) => {
                if (docSnap.exists()) {
                    setSession({ id: docSnap.id, ...docSnap.data() });
                } else {
                    onClose();
                }
            });
            return () => unsub();
        }
    }, [initialSession, sessionId, onClose]);

    // Token al
    useEffect(() => {
        const getToken = async () => {
            try {
                const response = await fetch(`/.netlify/functions/livekit-token?roomName=${roomName}&participantName=${encodeURIComponent(participantName)}&isTeacher=${isTeacherMode}`);
                if (!response.ok) {
                    throw new Error("Sunucudan LiveKit token'i alınamadı.");
                }
                const data = await response.json();
                setToken(data.token);
                setPhase('prejoin'); // Token alındı → Pre-Join ekranına geç
            } catch (e) {
                console.error(e);
                setError(e.message || "Bağlantı tokeni oluşturulamadı.");
            }
        };
        if (roomName && participantName) {
            getToken();
        }
    }, [roomName, participantName, isTeacherMode]);

    // Fullscreen event listener
    useEffect(() => {
        const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, []);

    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    }, []);

    const handleLeave = useCallback(() => {
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
        }
        if (isTeacherMode) {
            onEndSession(session?.id);
        } else {
            onClose();
        }
    }, [isTeacherMode, onEndSession, onClose, session]);

    const handleJoinRoom = useCallback(({ cam, mic }) => {
        setInitialMediaState({ cam, mic });
        setPhase('connected');
        // Otomatik tam ekran denemesi
        setTimeout(() => {
            containerRef.current?.requestFullscreen().catch(() => {});
        }, 300);
    }, []);

    const serverUrl = import.meta.env.VITE_LIVEKIT_URL;

    // ── HATA EKRANI ──
    if (error) {
        return (
            <div className="fixed inset-0 bg-slate-950 z-[9999] flex flex-col items-center justify-center text-white p-6">
                <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mb-4">
                    <X size={32} />
                </div>
                <h3 className="text-xl font-black mb-2 text-center">Bağlantı Hatası</h3>
                <p className="text-slate-400 text-sm text-center max-w-sm">{error}</p>
                <button onClick={onClose} className="mt-6 px-6 py-2.5 bg-white text-slate-900 font-bold rounded-xl">Geri Dön</button>
            </div>
        );
    }

    // ── SUNUCU URL EKSİK ──
    if (!serverUrl) {
        return (
            <div className="fixed inset-0 bg-slate-950 z-[9999] flex flex-col items-center justify-center text-white p-6">
                <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mb-4">
                    <X size={32} />
                </div>
                <h3 className="text-xl font-black mb-2 text-center text-amber-400">LiveKit URL Eksik</h3>
                <p className="text-slate-400 text-sm text-center max-w-sm mb-6">
                    Ortam değişkenlerinde VITE_LIVEKIT_URL tanımlanmamış.
                </p>
                <button onClick={onClose} className="px-6 py-2.5 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700">Geri Dön</button>
            </div>
        );
    }

    // ── YÜKLEME EKRANI ──
    if (phase === 'loading') {
        return (
            <div className="fixed inset-0 bg-slate-950 z-[9999] flex flex-col items-center justify-center text-white">
                <Loader2 size={48} className="animate-spin text-purple-500 mb-4" />
                <p className="font-bold">Güvenli Odaya Bağlanılıyor...</p>
                <p className="text-xs text-slate-500 mt-2">Şifrelenmiş oturum hazırlanıyor.</p>
            </div>
        );
    }

    // ── PRE-JOIN EKRANI ──
    if (phase === 'prejoin') {
        return (
            <PreJoinScreen
                onJoin={handleJoinRoom}
                onCancel={onClose}
                participantName={participantName}
                className={session?.className}
            />
        );
    }

    // ── BAĞLI EKRAN (Video Konferans) ──
    return (
        <div ref={containerRef} className="fixed inset-0 bg-black z-[9999] flex flex-col lk-classroom-root">
            {/* Çıkış Onay Diyaloğu */}
            <ExitConfirmDialog
                isOpen={showExitDialog}
                onConfirm={handleLeave}
                onCancel={() => setShowExitDialog(false)}
                isTeacher={isTeacherMode}
            />

            {/* Sağ üst: Minimal X ve Fullscreen butonları */}
            <div className="absolute top-3 right-3 z-[100] flex items-center gap-2 md:top-4 md:right-4">
                <button
                    onClick={toggleFullscreen}
                    className="p-2 bg-black/40 backdrop-blur-sm text-white/70 hover:text-white rounded-lg transition-all hover:bg-black/60"
                    title="Tam Ekran"
                >
                    {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                </button>
                <button
                    onClick={() => setShowExitDialog(true)}
                    className="p-2 bg-black/40 backdrop-blur-sm text-white/70 hover:text-rose-400 rounded-lg transition-all hover:bg-black/60"
                    title="Dersten Ayrıl"
                >
                    <X size={16} />
                </button>
            </div>

            {/* LiveKit Video Konferans Alanı */}
            <div className="flex-1 w-full h-full relative">
                <LiveKitRoom
                    video={initialMediaState.cam}
                    audio={initialMediaState.mic}
                    token={token}
                    serverUrl={serverUrl}
                    data-lk-theme="default"
                    style={{ height: '100%', width: '100%' }}
                    onDisconnected={() => {
                        if (document.fullscreenElement) {
                            document.exitFullscreen().catch(() => {});
                        }
                        onClose();
                    }}
                >
                    <VideoConference />
                    <RoomAudioRenderer />
                    <FloatingControls />
                </LiveKitRoom>
            </div>
        </div>
    );
};

export default LiveClassroom;
