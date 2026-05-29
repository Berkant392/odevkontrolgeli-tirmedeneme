import React, { useEffect, useState } from 'react';
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
import { doc, onSnapshot, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';

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
    // States
    const [session, setSession] = useState(initialSession);
    const [isTeacherMode, setIsTeacherMode] = useState(initialTeacherMode || role === 'teacher');
    const [isLoading, setIsLoading] = useState(true);
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

    // 2. LiveKit Ayarlarını Firestore'dan Dinamik Olarak Çek
    const [liveKitSettings, setLiveKitSettings] = useState({
        url: '',
        apiKey: '',
        apiSecret: '',
        isLoading: true
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const docRef = doc(db, "settings", "livekit");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setLiveKitSettings({
                        url: data.url || 'wss://berkant-hoca-odevtakip-u4qjph.livekit.cloud',
                        apiKey: data.apiKey || 'API2aJtL3LgSp8e',
                        apiSecret: data.apiSecret || 'secretm4gXgHqE7bT2Z9w',
                        isLoading: false
                    });
                } else {
                    // Fallback to Berkant Hoca sandbox credentials so it works instantly!
                    setLiveKitSettings({
                        url: 'wss://berkant-hoca-odevtakip-u4qjph.livekit.cloud',
                        apiKey: 'API2aJtL3LgSp8e',
                        apiSecret: 'secretm4gXgHqE7bT2Z9w',
                        isLoading: false
                    });
                }
            } catch (e) {
                console.error("LiveKit ayarları okuma hatası, varsayılana geçildi:", e);
                setLiveKitSettings({
                    url: 'wss://berkant-hoca-odevtakip-u4qjph.livekit.cloud',
                    apiKey: 'API2aJtL3LgSp8e',
                    apiSecret: 'secretm4gXgHqE7bT2Z9w',
                    isLoading: false
                });
            }
        };
        fetchSettings();
    }, []);

    // Pure Client-side Cryptographic JWT generator using Web Crypto API
    const generateLiveKitToken = async (apiKey, apiSecret, roomId, identity, name) => {
        const header = {
            alg: "HS256",
            typ: "JWT"
        };

        const now = Math.floor(Date.now() / 1000);
        const payload = {
            exp: now + 3600 * 4, // 4 hours session limit
            iss: apiKey,
            sub: identity,
            nbf: now - 5,
            name: name,
            video: {
                room: roomId,
                roomJoin: true,
                canPublish: true,
                canSubscribe: true,
                canPublishData: true
            }
        };

        const base64UrlEncode = (obj) => {
            const str = JSON.stringify(obj);
            const bytes = new TextEncoder().encode(str);
            return btoa(String.fromCharCode(...bytes))
                .replace(/=/g, "")
                .replace(/\+/g, "-")
                .replace(/\//g, "_");
        };

        const headerEncoded = base64UrlEncode(header);
        const payloadEncoded = base64UrlEncode(payload);
        const dataToSign = `${headerEncoded}.${payloadEncoded}`;

        const encoder = new TextEncoder();
        const keyData = encoder.encode(apiSecret);
        const dataBytes = encoder.encode(dataToSign);

        const cryptoKey = await window.crypto.subtle.importKey(
            "raw",
            keyData,
            { name: "HMAC", hash: { name: "SHA-256" } },
            false,
            ["sign"]
        );

        const signature = await window.crypto.subtle.sign(
            "HMAC",
            cryptoKey,
            dataBytes
        );

        const signatureEncoded = btoa(String.fromCharCode(...new Uint8Array(signature)))
            .replace(/=/g, "")
            .replace(/\+/g, "-")
            .replace(/\//g, "_");

        return `${dataToSign}.${signatureEncoded}`;
    };

    // 3. Token Generator Hook
    const [liveKitToken, setLiveKitToken] = useState('');
    const [tokenError, setTokenError] = useState(null);

    useEffect(() => {
        if (permissionFlowState !== 'ready' || liveKitSettings.isLoading || !session) return;

        const generateToken = async () => {
            setIsLoading(true);
            try {
                const identity = isTeacherMode ? 'berkant-hoca' : `student-${loggedInStudent?.id || Math.random().toString(36).substring(2, 9)}`;
                const name = isTeacherMode ? 'Berkant Hoca' : (loggedInStudent?.name || 'Öğrenci');
                
                const token = await generateLiveKitToken(
                    liveKitSettings.apiKey,
                    liveKitSettings.apiSecret,
                    session.roomId,
                    identity,
                    name
                );
                setLiveKitToken(token);
                setIsLoading(false);
            } catch (err) {
                console.error("LiveKit token oluşturma hatası:", err);
                setTokenError("Güvenli bağlantı anahtarı (Token) oluşturulamadı.");
                setIsLoading(false);
            }
        };

        generateToken();
    }, [permissionFlowState, liveKitSettings.isLoading, session]);



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
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">LiveKit güvenli bağlantısı tesis ediliyor.</p>
                        </div>
                    </div>
                )}
                
                {tokenError ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-rose-500 p-6">
                        <ShieldAlert size={40} />
                        <p className="font-bold text-sm">{tokenError}</p>
                    </div>
                ) : (
                    liveKitToken && (
                        <iframe
                            src={`https://meet.livekit.io/embed/?url=${encodeURIComponent(liveKitSettings.url)}&token=${liveKitToken}`}
                            allow="camera; microphone; display-capture; autoplay"
                            className="w-full h-full border-0 rounded-3xl"
                        ></iframe>
                    )
                )}
            </div>

            {/* ALT HIZLI KONTROL PANELİ & HOCA YETKİ KARTLARI */}
            <div className="mt-4 flex justify-between items-center gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/60 shrink-0">
                {/* Fullscreen and Exit Controls */}
                <div className="flex items-center gap-2.5">
                    {/* Fullscreen Toggle */}
                    <button 
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="p-3 rounded-xl transition-all shadow-md flex items-center gap-2 text-xs font-bold border bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-slate-950"
                    >
                        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                        <span>{isFullscreen ? 'Küçült' : 'Tam Ekran Modu'}</span>
                    </button>
                </div>

                {/* Info Text */}
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <HelpCircle size={14} className="text-amber-500" />
                    <span>Mikrofon, kamera ve ekran paylaşımı kontrolleri LiveKit paneli içerisinden yönetilir.</span>
                </div>
            </div>
        </div>
    );
};

export default LiveClassroom;
