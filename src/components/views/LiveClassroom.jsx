import React, { useEffect, useState, useRef } from 'react';
import { LiveKitRoom, VideoConference, RoomAudioRenderer, useLocalParticipant, TrackToggle } from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';
import { Loader2, LogOut, Video, X, Maximize, Minimize, Settings2, ChevronDown, ChevronUp } from 'lucide-react';
import { db } from '../../config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

// Yüzen Öz-Görünüm ve Kontrol Paneli
const FloatingSelfControl = () => {
    const { localParticipant, isCameraEnabled, isMicrophoneEnabled } = useLocalParticipant();
    const [isMinimized, setIsMinimized] = useState(false);

    return (
        <div className="absolute bottom-6 right-6 z-[99999] flex flex-col items-end gap-2">
            {!isMinimized && (
                <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-2xl p-3 shadow-2xl shadow-black/50 w-48 animate-fade-in-up">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-700/50 pb-2">
                        <span className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Settings2 size={12} className="text-brandPurple" /> Cihazlarım
                        </span>
                    </div>
                    
                    <div className="flex justify-around items-center gap-2">
                        <div className="flex flex-col items-center gap-1">
                            <TrackToggle 
                                source={Track.Source.Microphone} 
                                className="!w-10 !h-10 !rounded-xl !bg-slate-800 hover:!bg-slate-700 data-[state=on]:!bg-emerald-500/20 data-[state=on]:!text-emerald-500 data-[state=off]:!bg-rose-500/20 data-[state=off]:!text-rose-500 transition-colors"
                            />
                            <span className="text-[9px] font-bold text-slate-400">Mikrofon</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <TrackToggle 
                                source={Track.Source.Camera} 
                                className="!w-10 !h-10 !rounded-xl !bg-slate-800 hover:!bg-slate-700 data-[state=on]:!bg-amber-500/20 data-[state=on]:!text-amber-500 data-[state=off]:!bg-rose-500/20 data-[state=off]:!text-rose-500 transition-colors"
                            />
                            <span className="text-[9px] font-bold text-slate-400">Kamera</span>
                        </div>
                    </div>
                </div>
            )}
            
            <button 
                onClick={() => setIsMinimized(!isMinimized)}
                className="bg-brandPurple hover:bg-purple-600 text-white p-2 rounded-full shadow-lg shadow-brandPurple/30 transition-all flex items-center justify-center"
                title={isMinimized ? "Kontrolleri Aç" : "Kontrolleri Gizle"}
            >
                {isMinimized ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
        </div>
    );
};

const LiveClassroom = ({ 
    session: initialSession, 
    isTeacherMode: initialTeacherMode, 
    onEndSession, 
    onClose, 
    classes = [], 
    sessionId = null, 
    role = null,
    isStandalone = false,
    loggedInStudent = null
}) => {
    const [session, setSession] = useState(initialSession);
    const [isTeacherMode] = useState(initialTeacherMode || role === 'teacher');
    const [token, setToken] = useState("");
    const [error, setError] = useState("");
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef(null);

    // Dinamik isim belirleme
    const participantName = isTeacherMode ? "Öğretmen (Sen)" : (loggedInStudent?.name || "Öğrenci");
    const roomName = session?.roomId || sessionId || "demo-room";

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

    useEffect(() => {
        const getToken = async () => {
            try {
                const response = await fetch(`/.netlify/functions/livekit-token?roomName=${roomName}&participantName=${encodeURIComponent(participantName)}&isTeacher=${isTeacherMode}`);
                if (!response.ok) {
                    throw new Error("Sunucudan LiveKit token'i alınamadı. (API Key ayarlarınızı kontrol edin)");
                }
                const data = await response.json();
                setToken(data.token);
            } catch (e) {
                console.error(e);
                setError(e.message || "Bağlantı tokeni oluşturulamadı. Lütfen tekrar deneyin.");
            }
        };
        
        if (roomName && participantName) {
            getToken();
        }
    }, [roomName, participantName, isTeacherMode]);

    // Otomatik Tam Ekran Denemesi (Kullanıcı etkileşimi olmadan tarayıcı engelleyebilir ama deniyoruz)
    useEffect(() => {
        const elem = containerRef.current;
        if (elem && elem.requestFullscreen) {
            elem.requestFullscreen().catch(err => {
                console.log("Tarayıcı otomatik tam ekranı engelledi, kullanıcı butona basmalı.", err);
            });
        }
        
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch(err => console.log(err));
        } else {
            document.exitFullscreen();
        }
    };

    if (error) {
        return (
            <div className="fixed inset-0 bg-slate-900 z-[9999] flex flex-col items-center justify-center text-white">
                <div className="w-16 h-16 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mb-4">
                    <X size={32} />
                </div>
                <h3 className="text-xl font-black mb-2 text-center px-4">Bağlantı Hatası</h3>
                <p className="text-slate-400 text-sm text-center max-w-sm">{error}</p>
                <button onClick={onClose} className="mt-6 px-6 py-2.5 bg-white text-slate-900 font-bold rounded-xl">Geri Dön</button>
            </div>
        );
    }

    if (token === "") {
        return (
            <div className="fixed inset-0 bg-slate-900 z-[9999] flex flex-col items-center justify-center text-white">
                <Loader2 size={48} className="animate-spin text-brandPurple mb-4" />
                <p className="font-bold">Güvenli Odaya Bağlanılıyor...</p>
                <p className="text-xs text-slate-400 mt-2">LiveKit Cloud üzerinden şifrelenmiş oturum hazırlanıyor.</p>
            </div>
        );
    }

    const serverUrl = import.meta.env.VITE_LIVEKIT_URL;

    if (!serverUrl) {
        return (
            <div className="fixed inset-0 bg-slate-900 z-[9999] flex flex-col items-center justify-center text-white p-4">
                <div className="w-16 h-16 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mb-4">
                    <X size={32} />
                </div>
                <h3 className="text-xl font-black mb-2 text-center text-amber-500">LiveKit URL Eksik</h3>
                <p className="text-slate-400 text-sm text-center max-w-sm mb-6">
                    Netlify (veya `.env.local`) ortam değişkenlerinde `VITE_LIVEKIT_URL` tanımlanmamış. Lütfen ekleyin.
                </p>
                <button onClick={onClose} className="px-6 py-2.5 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700">Geri Dön</button>
            </div>
        );
    }

    const handleLeave = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(err => console.log(err));
        }
        if (isTeacherMode) {
            onEndSession(session?.id);
        } else {
            onClose();
        }
    };

    return (
        <div ref={containerRef} className="fixed inset-0 bg-black z-[9999] flex flex-col">
            {/* Üst Bar */}
            <div className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 flex items-center justify-between shrink-0 absolute top-0 left-0 right-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brandPurple/20 text-brandPurple rounded-xl flex items-center justify-center">
                        <Video size={20} />
                    </div>
                    <div>
                        <h2 className="text-white font-bold text-sm md:text-base">{session?.className || "Canlı Sınıf"}</h2>
                        <p className="text-slate-400 text-[10px] md:text-xs">Uçtan Uca Şifreli • LiveKit Cloud</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 md:gap-4">
                    <button 
                        onClick={toggleFullscreen}
                        className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        title="Tam Ekran"
                    >
                        {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                    </button>
                    <button 
                        onClick={handleLeave} 
                        className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-colors font-black text-xs md:text-sm shadow-lg shadow-rose-500/20"
                    >
                        <LogOut size={16} />
                        {isTeacherMode ? "Dersi Bitir" : "Ayrıl"}
                    </button>
                </div>
            </div>

            {/* LiveKit Alanı */}
            <div className="flex-1 w-full h-full pt-16 relative">
                <LiveKitRoom
                    video={true}
                    audio={true}
                    token={token}
                    serverUrl={serverUrl}
                    data-lk-theme="default"
                    style={{ height: '100%', width: '100%' }}
                    onDisconnected={() => {
                        console.log("Oda bağlantısı kesildi.");
                        handleLeave();
                    }}
                >
                    {/* LiveKit Cloud Standart Konferans Bileşeni */}
                    <VideoConference />
                    {/* Sesleri render etmek için zorunlu bileşen */}
                    <RoomAudioRenderer />
                    
                    {/* Yüzen Özel Kontrol Paneli */}
                    <FloatingSelfControl />
                </LiveKitRoom>
            </div>
        </div>
    );
};

export default LiveClassroom;

