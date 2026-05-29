import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Video, VideoOff, Mic, MicOff, Tv, ShieldAlert, CheckCircle, LogOut, Loader2, Sparkles, HelpCircle } from 'lucide-react';

const LiveClassroom = ({ session, isTeacherMode, onEndSession, onClose, classes }) => {
    const containerRef = useRef(null);
    const apiRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMicMuted, setIsMicMuted] = useState(false);
    const [isVideoMuted, setIsVideoMuted] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);

    useEffect(() => {
        if (!session || !containerRef.current) return;

        setIsLoading(true);

        // Jitsi Meet External API'sini Kur
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
                    enabled: true, // P2P modunu zorunlu kıl — veri doğrudan hoca-öğrenci arasında aksın!
                    preferH264: false // Yeni nesil VP9/AV1 codec'lerini önceliklendir
                },
                constraints: {
                    video: {
                        frameRate: {
                            max: 10
                        }
                    }
                },
                startWithAudioMuted: false,
                startWithVideoMuted: false,
                prejoinPageEnabled: false, // Hızlı giriş için ön sayfa kapatılır
                lobby: {
                    enabled: true // Bekleme odası desteği aktif
                }
            },
            interfaceConfigOverwrite: {
                TOOLBAR_BUTTONS: [
                    'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
                    'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
                    'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
                    'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
                    'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
                    'security'
                ],
                SETTINGS_SECTIONS: ['devices', 'language', 'profile', 'calendar'],
                SHOW_JITSI_WATERMARK: false,
                SHOW_WATERMARK_FOR_GUESTS: false,
                ALPHABETICAL_FILMSTRIP: true
            }
        };

        // API'yi Başlat
        const api = new window.JitsiMeetExternalAPI(domain, options);
        apiRef.current = api;

        // Olay Dinleyicileri
        api.addEventListener('videoConferenceJoined', () => {
            setIsLoading(false);
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

        // Temizlik adımı
        return () => {
            if (apiRef.current) {
                apiRef.current.dispose();
                apiRef.current = null;
            }
        };
    }, [session, isTeacherMode]);

    // Hızlı Kontrol Metodları (Yerel Arayüz için)
    const toggleMic = () => {
        if (apiRef.current) {
            apiRef.current.executeCommand('toggleAudio');
        }
    };

    const toggleVideo = () => {
        if (apiRef.current) {
            apiRef.current.executeCommand('toggleVideo');
        }
    };

    const toggleShareScreen = () => {
        if (apiRef.current) {
            apiRef.current.executeCommand('toggleShareScreen');
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col h-[calc(100vh-80px)] md:h-[calc(100vh-40px)] bg-slate-950 rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl p-4 md:p-6 text-slate-100 relative z-10"
        >
            {/* ÜST BAR */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4 mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-tr from-brandPurple to-blue-600 rounded-2xl text-white shadow-lg animate-pulse">
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h2 className="text-base md:text-xl font-black text-white flex items-center gap-2">
                            {session.className} - VIP Canlı Sınıf Odası
                        </h2>
                        <p className="text-[10px] md:text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Live WebRTC Connection
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {isTeacherMode ? (
                        <button 
                            onClick={() => onEndSession(session.id)}
                            className="w-full sm:w-auto text-xs px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl shadow-lg hover:shadow-rose-600/30 flex items-center justify-center gap-2 transition-all"
                        >
                            <LogOut size={16} /> DERSİ BİTİR
                        </button>
                    ) : (
                        <button 
                            onClick={onClose}
                            className="w-full sm:w-auto text-xs px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-all"
                        >
                            <LogOut size={16} /> AYRIL
                        </button>
                    )}
                </div>
            </div>

            {/* ANA SINIF ODASI ALANI */}
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

            {/* HIZLI KONTROL PANELİ */}
            <div className="mt-4 flex flex-wrap justify-center items-center gap-3 bg-slate-900/40 p-3 rounded-2xl border border-slate-800/60">
                <button 
                    onClick={toggleMic}
                    className={`p-3 rounded-xl transition-all shadow-md flex items-center gap-2 text-xs font-bold border ${isMicMuted ? 'bg-rose-500/10 border-rose-500 text-rose-500' : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'}`}
                >
                    {isMicMuted ? <MicOff size={16} /> : <Mic size={16} />} 
                    <span>{isMicMuted ? 'Sesi Aç' : 'Sesi Kapat'}</span>
                </button>

                <button 
                    onClick={toggleVideo}
                    className={`p-3 rounded-xl transition-all shadow-md flex items-center gap-2 text-xs font-bold border ${isVideoMuted ? 'bg-rose-500/10 border-rose-500 text-rose-500' : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'}`}
                >
                    {isVideoMuted ? <VideoOff size={16} /> : <Video size={16} />} 
                    <span>{isVideoMuted ? 'Kamerayı Aç' : 'Kamerayı Kapat'}</span>
                </button>

                <button 
                    onClick={toggleShareScreen}
                    className={`p-3 rounded-xl transition-all shadow-md flex items-center gap-2 text-xs font-bold border ${isScreenSharing ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'}`}
                >
                    <Tv size={16} />
                    <span>{isScreenSharing ? 'Paylaşımı Durdur' : 'Ekranımı Paylaş'}</span>
                </button>

                <div className="hidden lg:flex items-center gap-2 ml-auto text-[10px] font-bold text-slate-500 uppercase tracking-widest border-l border-slate-800 pl-4">
                    <HelpCircle size={14} className="text-brandPurple" />
                    <span>Ekran paylaşımında "Tüm Ekran" seçerek uygulamalarınızı gösterebilirsiniz.</span>
                </div>
            </div>
        </motion.div>
    );
};

export default LiveClassroom;
