import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Video, 
    VideoOff, 
    Mic, 
    MicOff, 
    Tv, 
    ShieldAlert, 
    CheckCircle, 
    LogOut, 
    Loader2, 
    Sparkles, 
    HelpCircle, 
    Camera, 
    Shield,
    Volume2,
    Users,
    Maximize2,
    Minimize2,
    X
} from 'lucide-react';
import { db } from '../../config/firebase';
import { doc, onSnapshot, deleteDoc, updateDoc } from 'firebase/firestore';

const LiveClassroom = ({ 
    session: initialSession, 
    isTeacherMode: initialTeacherMode, 
    onEndSession, 
    onClose, 
    classes = [], 
    sessionId = null, 
    role = null,
    isStandalone = false 
}) => {
    const containerRef = useRef(null);
    const apiRef = useRef(null);
    
    // States
    const [session, setSession] = useState(initialSession);
    const [isTeacherMode, setIsTeacherMode] = useState(initialTeacherMode || role === 'teacher');
    const [isLoading, setIsLoading] = useState(true);
    const [isMicMuted, setIsMicMuted] = useState(false);
    const [isVideoMuted, setIsVideoMuted] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isJitsiLoaded, setIsJitsiLoaded] = useState(false);
    const [alertMessage, setAlertMessage] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // 🔒 PWA & Mobile Native Permission States & Flow
    const [permissionFlowState, setPermissionFlowState] = useState('checking'); // 'checking' | 'need_prompt' | 'denied' | 'ready'
    const [permissionStatus, setPermissionStatus] = useState({ camera: 'prompt', microphone: 'prompt' });

    // Robust Permission Query Helper
    const checkPermissions = async () => {
        try {
            if (!navigator.permissions || !navigator.permissions.query) {
                return { camera: 'prompt', microphone: 'prompt' };
            }
            
            // Query state of both media devices safely
            const [camStatus, micStatus] = await Promise.all([
                navigator.permissions.query({ name: 'camera' }).catch(() => null),
                navigator.permissions.query({ name: 'microphone' }).catch(() => null)
            ]);
            
            return {
                camera: camStatus ? camStatus.state : 'prompt',
                microphone: micStatus ? micStatus.state : 'prompt'
            };
        } catch (e) {
            console.error("İzin sorgulama hatası:", e);
            return { camera: 'prompt', microphone: 'prompt' };
        }
    };

    // Pre-flight permission loader on mount
    useEffect(() => {
        const initPermissions = async () => {
            const perms = await checkPermissions();
            setPermissionStatus(perms);
            
            // If already fully granted, launch Jitsi instantly (one-time grant behavior!)
            if (perms.camera === 'granted' && perms.microphone === 'granted') {
                setPermissionFlowState('ready');
            } else if (perms.camera === 'denied' || perms.microphone === 'denied') {
                setPermissionFlowState('denied');
            } else {
                setPermissionFlowState('need_prompt');
            }
        };
        
        initPermissions();
    }, []);

    // Interactive permission requester for gold action buttons
    const handleRequestPermissions = async (requestType) => {
        setIsLoading(true);
        try {
            const constraints = {};
            if (requestType === 'both') {
                constraints.audio = true;
                constraints.video = true;
            } else if (requestType === 'audio') {
                constraints.audio = true;
            } else if (requestType === 'video') {
                constraints.video = true;
            }
            
            // Force browser popup prompt
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            stream.getTracks().forEach(t => t.stop()); // release lock immediately
            
            // Sync status
            const perms = await checkPermissions();
            setPermissionStatus(perms);
            setPermissionFlowState('ready');
        } catch (e) {
            console.warn("İzin alma hatası, alternatif deneniyor:", e);
            
            // Attempt graceful downgrade if requested 'both' but client lacks camera/webcam
            if (requestType === 'both') {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    stream.getTracks().forEach(t => t.stop());
                    
                    const perms = await checkPermissions();
                    setPermissionStatus(perms);
                    setPermissionFlowState('ready');
                    return;
                } catch (err2) {
                    console.error("Ses izni de alınamadı:", err2);
                }
            }
            
            // Set to blocked flow state so instructions are shown
            setPermissionFlowState('denied');
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoinWithoutPermissions = () => {
        setPermissionFlowState('ready');
    };

    // 1. Standalone / Query Param Yüklemesi için Firestore Dinleyicisi
    useEffect(() => {
        if (!sessionId) return;

        const docRef = doc(db, "liveSessions", sessionId);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setSession({ id: docSnap.id, ...data });
                setIsTeacherMode(role === 'teacher');
            } else {
                // Ders Sonlandırıldı
                setAlertMessage({
                    type: 'info',
                    title: 'Ders Tamamlandı',
                    text: 'Bu canlı ders öğretmeniniz tarafından sonlandırılmıştır. Teşekkür ederiz!'
                });
                setTimeout(() => {
                    if (onClose) onClose();
                    else window.close();
                }, 4000);
            }
        }, (err) => {
            console.error("Firestore Canlı Ders Dinleme Hatası:", err);
            setAlertMessage({
                type: 'error',
                title: 'Bağlantı Hatası',
                text: 'Ders bilgileri alınırken Firestore yetki hatası oluştu.'
            });
        });

        return () => unsubscribe();
    }, [sessionId, role, onClose]);

    // 2. Jitsi Meet External API'sini Dinamik Yükleyen Garantör Effect
    useEffect(() => {
        if (window.JitsiMeetExternalAPI) {
            setIsJitsiLoaded(true);
            return;
        }
        const script = document.createElement("script");
        script.src = "https://meet.jit.si/external_api.js";
        script.async = true;
        script.onload = () => setIsJitsiLoaded(true);
        document.body.appendChild(script);
        return () => {
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
        };
    }, []);

    // 3. Jitsi Iframe Başlatma
    useEffect(() => {
        if (permissionFlowState !== 'ready' || !session || !isJitsiLoaded || !containerRef.current) return;

        setIsLoading(true);
        // Safety timeout: automatically clear custom loader overlay after 3 seconds so native Jitsi is visible
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 3000);

        const domain = "meet.jit.si";
        const options = {
            roomName: session.roomId,
            width: "100%",
            height: "100%",
            parentNode: containerRef.current,
            userInfo: {
                displayName: isTeacherMode ? "Berkant Hoca" : "Öğrenci"
            },
            configOverwrite: {
                // 🚀 ULTRA DÜŞÜK GECİKME VE KALİTE OPTİMİZASYONLARI
                desktopSharingFrameRate: {
                    min: 5,
                    max: 8 // Maksimum 8 FPS limit — upload bant genişliğini %75 düşürür!
                },
                p2p: {
                    enabled: true, // P2P modunu zorunlu kıl — doğrudan hoca-öğrenci aktarımı!
                    preferH264: false
                },
                constraints: {
                    video: {
                        frameRate: {
                            max: 10
                        }
                    }
                },
                startWithAudioMuted: true,
                startWithVideoMuted: true,
                prejoinPageEnabled: false, // Hızlı giriş
                lobby: {
                    enabled: session.requireApproval // Planlama ayarından gelen Lobi ayarı
                }
            },
            interfaceConfigOverwrite: {
                TOOLBAR_BUTTONS: [
                    'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
                    'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
                    'sharedvideo', 'settings', 'raisehand',
                    'videoquality', 'filmstrip', 'invite', 'stats', 'shortcuts',
                    'tileview', 'videobackgroundblur'
                ],
                SETTINGS_SECTIONS: ['devices', 'language', 'profile'],
                SHOW_JITSI_WATERMARK: false,
                SHOW_WATERMARK_FOR_GUESTS: false,
                ALPHABETICAL_FILMSTRIP: true
            }
        };

        const api = new window.JitsiMeetExternalAPI(domain, options);
        apiRef.current = api;

        // Olay Dinleyicileri
        api.addEventListener('videoConferenceJoined', () => {
            setIsLoading(false);
            
            // Başlangıçta eğer öğretmen izinleri kapattıysa direkt uygula
            if (!isTeacherMode) {
                if (session.allowCamera === false) {
                    api.executeCommand('muteVideo');
                    setIsVideoMuted(true);
                }
                if (session.allowMic === false) {
                    api.executeCommand('muteAudio');
                    setIsMicMuted(true);
                }
            }
        });

        api.addEventListener('audioMuteStatusChanged', (e) => {
            setIsMicMuted(e.muted);
        });

        api.addEventListener('videoMuteStatusChanged', (e) => {
            setIsVideoMuted(e.muted);
        });

        api.addEventListener('screenSharingStatusChanged', (e) => {
            setIsScreenSharing(e.on);
        });

        return () => {
            clearTimeout(timer);
            if (apiRef.current) {
                apiRef.current.dispose();
                apiRef.current = null;
            }
        };
    }, [session?.roomId, isJitsiLoaded, isTeacherMode]);

    // 4. Öğretmen İzin Değişimlerini Öğrenciye Gerçek Zamanlı Dayatma (Forced Mute)
    useEffect(() => {
        if (isTeacherMode || !apiRef.current || !session) return;

        // Kamera Kısıtlaması
        if (session.allowCamera === false && !isVideoMuted) {
            apiRef.current.executeCommand('muteVideo');
            setIsVideoMuted(true);
            setAlertMessage({
                type: 'warning',
                title: 'Kamera Kapatıldı',
                text: 'Öğretmeniniz ders genelinde kameraları geçici olarak devre dışı bıraktı.'
            });
            setTimeout(() => setAlertMessage(null), 4000);
        }

        // Ses Kısıtlaması
        if (session.allowMic === false && !isMicMuted) {
            apiRef.current.executeCommand('muteAudio');
            setIsMicMuted(true);
            setAlertMessage({
                type: 'warning',
                title: 'Mikrofon Kapatıldı',
                text: 'Öğretmeniniz ders genelinde mikrofonları geçici olarak devre dışı bıraktı.'
            });
            setTimeout(() => setAlertMessage(null), 4000);
        }
    }, [session?.allowCamera, session?.allowMic, isTeacherMode]);

    // Yerel Kontrol Metodları
    const toggleMic = async () => {
        if (!isTeacherMode && session?.allowMic === false) return;
        
        const perms = await checkPermissions();
        if (perms.microphone === 'denied') {
            setAlertMessage({
                type: 'warning',
                title: 'Mikrofon Yetkisi Engellenmiş',
                text: 'Mikrofon izniniz engellenmiş durumda. Lütfen tarayıcınızın adres çubuğundaki kilit simgesine tıklayarak izin verin.'
            });
            return;
        } else if (perms.microphone === 'prompt') {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(t => t.stop());
                setPermissionStatus(prev => ({ ...prev, microphone: 'granted' }));
            } catch (e) {
                console.warn("Mikrofon izni alınamadı:", e);
                return;
            }
        }
        
        if (apiRef.current) {
            apiRef.current.executeCommand('toggleAudio');
        }
    };

    const toggleVideo = async () => {
        if (!isTeacherMode && session?.allowCamera === false) return;
        
        const perms = await checkPermissions();
        if (perms.camera === 'denied') {
            setAlertMessage({
                type: 'warning',
                title: 'Kamera Yetkisi Engellenmiş',
                text: 'Kamera izniniz engellenmiş durumda. Lütfen tarayıcınızın adres çubuğundaki kilit simgesine tıklayarak izin verin.'
            });
            return;
        } else if (perms.camera === 'prompt') {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                stream.getTracks().forEach(t => t.stop());
                setPermissionStatus(prev => ({ ...prev, camera: 'granted' }));
            } catch (e) {
                console.warn("Kamera izni alınamadı:", e);
                return;
            }
        }
        
        if (apiRef.current) {
            apiRef.current.executeCommand('toggleVideo');
        }
    };

    const toggleShareScreen = () => {
        if (apiRef.current) {
            apiRef.current.executeCommand('toggleShareScreen');
        }
    };

    // Hoca İçin Anlık İzin Değiştiriciler (Ders Esnasında)
    const handleLivePermissionToggle = async (field, currentValue) => {
        if (!session?.id) return;
        try {
            const sessionRef = doc(db, "liveSessions", session.id);
            await updateDoc(sessionRef, { [field]: !currentValue });
        } catch (err) {
            console.error("Anlık izin güncelleme hatası:", err);
        }
    };

    // Ders Sonlandırma
    const handleCloseOrEnd = async () => {
        if (isTeacherMode) {
            if (window.confirm("Bu canlı dersi sonlandırmak ve sınıf odasını tamamen kapatmak istiyor musunuz?")) {
                try {
                    if (onEndSession && session?.id) {
                        await onEndSession(session.id);
                    } else if (session?.id) {
                        await deleteDoc(doc(db, "liveSessions", session.id));
                        if (onClose) onClose();
                        else window.close();
                    }
                } catch (e) {
                    console.error("Ders sonlandırma hatası:", e);
                }
            }
        } else {
            if (onClose) onClose();
            else window.close();
        }
    };

    if (!session) {
        return (
            <div className="w-full h-[calc(100vh-160px)] md:h-[calc(100vh-110px)] p-4 md:p-6 rounded-[2.5rem] bg-slate-950 flex flex-col items-center justify-center gap-4 text-slate-200 border border-slate-800">
                <Loader2 size={36} className="text-brandPurple animate-spin" />
                <p className="text-sm font-bold uppercase tracking-wider">Canlı Ders Odasına Bağlanılıyor...</p>
            </div>
        );
    }

    if (permissionFlowState === 'checking') {
        return (
            <div className="w-full h-[calc(100vh-160px)] md:h-[calc(100vh-110px)] p-4 md:p-6 rounded-[2.5rem] bg-slate-950 flex flex-col items-center justify-center gap-4 text-slate-200 border border-slate-800">
                <Loader2 size={36} className="text-amber-500 animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Medya İzinleri Denetleniyor...</p>
            </div>
        );
    }

    if (permissionFlowState === 'need_prompt') {
        return (
            <div className="w-full h-[calc(100vh-160px)] md:h-[calc(100vh-110px)] p-6 rounded-[2.5rem] bg-slate-950 flex flex-col items-center justify-center text-center border border-slate-800 relative overflow-hidden select-none">
                {/* Ambient Glow */}
                <div className="absolute -top-32 -right-32 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-brandPurple/10 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="max-w-md space-y-6 relative z-10 p-6 md:p-8 rounded-[2rem] bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl">
                    <div className="w-16 h-16 bg-gradient-to-tr from-amber-400 to-yellow-500 rounded-2xl flex items-center justify-center mx-auto text-slate-950 shadow-[0_0_30px_rgba(245,158,11,0.25)] animate-pulse">
                        <Shield size={28} />
                    </div>
                    
                    <div className="space-y-2">
                       <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Canlı Sınıf İzin Sihirbazı</h2>
                       <p className="text-xs text-slate-400 font-bold leading-relaxed uppercase tracking-wider">
                           Derste sesinizi ve görüntünüzü paylaşabilmek için kamera ve mikrofon yetkilendirmesi gereklidir.
                       </p>
                       <p className="text-xs text-slate-500 font-medium leading-relaxed">
                           İzinler tarayıcınız tarafından güvenli şekilde saklanacak ve bir sonraki girişlerinizde tekrar sorulmayacaktır.
                       </p>
                    </div>

                    <div className="flex flex-col gap-2.5 pt-2">
                       <button
                           onClick={() => handleRequestPermissions('both')}
                           className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black py-3 rounded-2xl shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 text-xs"
                       >
                           <Camera size={16} /> KAMERA & MİKROFON İZNİ VER (Önerilen)
                       </button>

                       <button
                           onClick={() => handleRequestPermissions('audio')}
                           className="w-full bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold py-3 rounded-2xl transition-all flex items-center justify-center gap-2 text-xs"
                       >
                           <Mic size={16} /> SADECE MİKROFON İZNİ VER
                       </button>

                       <button
                           onClick={handleJoinWithoutPermissions}
                           className="w-full bg-transparent hover:bg-slate-900/40 text-slate-400 hover:text-slate-200 font-bold py-2.5 rounded-xl transition-all text-xs"
                       >
                           Yetki Vermeden / Dinleyici Olarak Katıl
                       </button>
                    </div>
                </div>
            </div>
        );
    }

    if (permissionFlowState === 'denied') {
        return (
            <div className="w-full h-[calc(100vh-160px)] md:h-[calc(100vh-110px)] p-6 rounded-[2.5rem] bg-slate-950 flex flex-col items-center justify-center text-center border border-slate-800 relative overflow-hidden select-none">
                {/* Ambient Glow */}
                <div className="absolute -top-32 -right-32 w-80 h-80 bg-rose-500/5 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="max-w-md space-y-6 relative z-10 p-6 md:p-8 rounded-[2rem] bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl">
                    <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/20">
                        <ShieldAlert size={28} />
                    </div>
                    
                    <div className="space-y-2">
                       <h2 className="text-xl md:text-2xl font-black text-rose-400 tracking-tight">İzinler Engellendi</h2>
                       <p className="text-xs text-slate-300 font-bold leading-relaxed">
                           Kamera veya mikrofon erişimi tarayıcınız tarafından engellenmiş durumda.
                       </p>
                       <div className="bg-slate-950/80 border border-slate-800/50 rounded-xl p-3.5 text-left text-[11px] text-slate-400 space-y-2 leading-relaxed">
                           <p className="font-bold text-slate-200 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                               💡 İzinleri Nasıl Açarsınız?
                           </p>
                           <p>1. Tarayıcınızın üst adres çubuğundaki 🔒 (kilit) veya ayarlar simgesine tıklayın.</p>
                           <p>2. <b>Kamera</b> ve <b>Mikrofon</b> izinlerini <b>"İzin Ver"</b> olarak işaretleyin.</p>
                           <p>3. PWA uygulaması veya mobil tarayıcı kullanıyorsanız, telefonunuzun Uygulama Ayarları altından tarayıcıya/PWA'ya kamera yetkisi verin.</p>
                       </div>
                    </div>

                    <div className="flex flex-col gap-2.5 pt-2">
                       <button
                           onClick={async () => {
                               const perms = await checkPermissions();
                               setPermissionStatus(perms);
                               if (perms.camera === 'granted' || perms.microphone === 'granted') {
                                   setPermissionFlowState('ready');
                               } else {
                                   handleRequestPermissions('both');
                               }
                           }}
                           className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black py-3 rounded-2xl shadow-lg shadow-rose-600/10 hover:shadow-rose-600/20 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 text-xs"
                       >
                           YETKİLERİ AÇTIM, YENİDEN DENE
                       </button>

                       <button
                           onClick={handleJoinWithoutPermissions}
                           className="w-full bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold py-3 rounded-2xl transition-all flex items-center justify-center text-xs"
                       >
                           Ses/Görüntü Olmadan Dinleyici Olarak Katıl
                       </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex flex-col bg-slate-950 text-slate-100 relative overflow-hidden select-none transition-all duration-300 ${
            isFullscreen 
                ? 'fixed inset-0 w-screen h-screen z-[150] p-4 md:p-6 rounded-none bg-slate-950' 
                : 'w-full h-[calc(100vh-160px)] md:h-[calc(100vh-110px)] p-4 md:p-6 rounded-[2.5rem] border border-slate-800 shadow-2xl'
        }`}>
            
            {/* 💎 GERÇEK ZAMANLI BİLDİRİM / DİNAMİK UYARI OVERLAY’I */}
            <AnimatePresence>
                {alertMessage && (
                    <motion.div 
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className="absolute top-6 left-1/2 -translate-x-1/2 z-[200] max-w-sm w-full bg-slate-900/95 border border-amber-500/30 rounded-2xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-md flex gap-3"
                    >
                        <div className={`p-2 shrink-0 rounded-xl ${alertMessage.type === 'warning' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>
                            <ShieldAlert size={20} />
                        </div>
                        <div>
                            <h4 className="text-xs font-black text-white">{alertMessage.title}</h4>
                            <p className="text-[10px] text-slate-300 font-medium leading-relaxed mt-1">{alertMessage.text}</p>
                        </div>
                        <button onClick={() => setAlertMessage(null)} className="ml-auto text-slate-400 hover:text-white shrink-0">
                            <X size={16} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ÜST BAR */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4 mb-4 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-tr from-brandPurple to-blue-600 rounded-2xl text-white shadow-lg animate-pulse">
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h2 className="text-base md:text-xl font-black text-white flex items-center gap-2">
                            {session.className} - VIP Canlı Sınıf Odası
                        </h2>
                        <p className="text-[10px] md:text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Yerel P2P WebRTC Bağlantısı
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {isTeacherMode ? (
                        <button 
                            onClick={handleCloseOrEnd}
                            className="w-full sm:w-auto text-xs px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl shadow-lg hover:shadow-rose-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                        >
                            <LogOut size={16} /> DERSİ BİTİR
                        </button>
                    ) : (
                        <button 
                            onClick={handleCloseOrEnd}
                            className="w-full sm:w-auto text-xs px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                        >
                            <LogOut size={16} /> AYRIL
                        </button>
                    )}
                </div>
            </div>

            {/* ANA YAYIN EKRANI */}
            <div className="flex-1 bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 relative min-h-[300px]">
                {isLoading && (
                    <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md z-40 flex flex-col items-center justify-center gap-4">
                        <Loader2 size={40} className="text-brandPurple animate-spin" />
                        <div className="text-center">
                            <h3 className="font-black text-sm text-slate-200">Görüntülü Sınıf Kuruluyor...</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Lütfen kamera ve mikrofon izinlerini onaylayın.</p>
                        </div>
                    </div>
                )}
                
                {/* Jitsi Meet Iframe Container */}
                <div ref={containerRef} className="w-full h-full"></div>
            </div>

            {/* ALT HIZLI KONTROL PANELİ & HOCA YETKİ KARTLARI */}
            <div className="mt-4 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/60 shrink-0">
                {/* Media Buttons */}
                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Microphone Toggle */}
                    <button 
                        onClick={toggleMic}
                        disabled={!isTeacherMode && session?.allowMic === false}
                        className={`p-3 rounded-xl transition-all shadow-md flex items-center gap-2 text-xs font-bold border ${
                            !isTeacherMode && session?.allowMic === false 
                                ? 'bg-slate-800 border-slate-700/50 text-slate-500 cursor-not-allowed' 
                                : isMicMuted ? 'bg-rose-500/10 border-rose-500 text-rose-500' : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                        }`}
                    >
                        {isMicMuted ? <MicOff size={16} /> : <Mic size={16} />} 
                        <span>{!isTeacherMode && session?.allowMic === false ? 'Mikrofon Kilitli' : isMicMuted ? 'Sesi Aç' : 'Sesi Kapat'}</span>
                    </button>

                    {/* Camera Toggle */}
                    <button 
                        onClick={toggleVideo}
                        disabled={!isTeacherMode && session?.allowCamera === false}
                        className={`p-3 rounded-xl transition-all shadow-md flex items-center gap-2 text-xs font-bold border ${
                            !isTeacherMode && session?.allowCamera === false 
                                ? 'bg-slate-800 border-slate-700/50 text-slate-500 cursor-not-allowed' 
                                : isVideoMuted ? 'bg-rose-500/10 border-rose-500 text-rose-500' : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                        }`}
                    >
                        {isVideoMuted ? <VideoOff size={16} /> : <Video size={16} />} 
                        <span>{!isTeacherMode && session?.allowCamera === false ? 'Kamera Kilitli' : isVideoMuted ? 'Kamerayı Aç' : 'Kamerayı Kapat'}</span>
                    </button>

                    {/* Screen Share Toggle */}
                    <button 
                        onClick={toggleShareScreen}
                        className={`p-3 rounded-xl transition-all shadow-md flex items-center gap-2 text-xs font-bold border ${
                            isScreenSharing ? 'bg-emerald-50/10 border-emerald-500 text-emerald-500' : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                        }`}
                    >
                        <Tv size={16} />
                        <span>{isScreenSharing ? 'Paylaşımı Durdur' : 'Ekranımı Paylaş'}</span>
                    </button>

                    {/* Fullscreen Toggle */}
                    <button 
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="p-3 rounded-xl transition-all shadow-md flex items-center gap-2 text-xs font-bold border bg-brandPurple/10 border-brandPurple text-brandPurple hover:bg-brandPurple hover:text-white"
                    >
                        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                        <span>{isFullscreen ? 'Küçült' : 'Tam Ekran'}</span>
                    </button>
                </div>

                {/* Teacher Instant Permissions Controller (Shows only on Teacher screen) */}
                {isTeacherMode ? (
                    <div className="flex flex-wrap items-center gap-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-1.5 border-r border-slate-800 mr-1">
                            <Shield size={12} className="text-brandPurple" /> Canlı Yetkiler:
                        </span>

                        {/* Toggle Camera Live */}
                        <button 
                            onClick={() => handleLivePermissionToggle('allowCamera', session.allowCamera)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-all ${
                                session.allowCamera 
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                            title="Öğrencilerin kamera kilidini anlık değiştir"
                        >
                            <Camera size={12} />
                            Öğrenci Kamerası: {session.allowCamera ? 'AÇIK' : 'KAPALI'}
                        </button>

                        {/* Toggle Mic Live */}
                        <button 
                            onClick={() => handleLivePermissionToggle('allowMic', session.allowMic)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-all ${
                                session.allowMic 
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                            title="Öğrencilerin ses kilidini anlık değiştir"
                        >
                            <Volume2 size={12} />
                            Öğrenci Sesi: {session.allowMic ? 'AÇIK' : 'KAPALI'}
                        </button>
                    </div>
                ) : (
                    /* Student Guide Text */
                    <div className="hidden lg:flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <HelpCircle size={14} className="text-brandPurple" />
                        <span>Kameranızı veya sesinizi kısıtlamak için öğretmen yetki paneli aktiftir.</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LiveClassroom;
