import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Crown, Briefcase, ChevronRight, ChevronLeft, Download, Smartphone, Share, PlusSquare, X, ArrowLeft, ArrowRight } from 'lucide-react';
import { lockScroll, unlockScroll } from '../../utils/scrollLock';

// -------------------------------------------------------------
// V4 MODERN LIGHT GLASSMORPHIC LOGIN EKRANI
// -------------------------------------------------------------

const LoginScreen = ({ onStudentLogin, onTeacherLogin, deferredPrompt, isStandalone }) => {
    const [authView, setAuthView] = useState('selection'); 
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [pin, setPin] = useState("");
    
    const [errorMsg, setErrorMsg] = useState("");
    const [showForgotMsg, setShowForgotMsg] = useState(false);

    const [isIos, setIsIos] = useState(false);
    const [showIosModal, setShowIosModal] = useState(false);
    const [iosStep, setIosStep] = useState(1);

    useEffect(() => {
        const ua = window.navigator.userAgent.toLowerCase();
        setIsIos(/iphone|ipad|ipod/.test(ua));

        // Tam ekran kilit (mobil tarayıcılarda kaymayı önler)
        document.documentElement.classList.add('login-locked');
        document.body.classList.add('login-locked');
        
        // Aydınlık ferah arka plan rengi
        const originalBodyBg = document.body.style.backgroundColor;
        document.body.style.backgroundColor = '#f8fafc'; // slate-50

        // Theme-color meta tag güncelleme
        let metaThemeColor = document.querySelector('meta[name="theme-color"]');
        let originalThemeColor = '';
        if (metaThemeColor) {
            originalThemeColor = metaThemeColor.getAttribute('content');
            metaThemeColor.setAttribute('content', '#f8fafc');
        } else {
            metaThemeColor = document.createElement('meta');
            metaThemeColor.name = "theme-color";
            metaThemeColor.content = "#f8fafc";
            document.head.appendChild(metaThemeColor);
        }

        return () => {
            document.documentElement.classList.remove('login-locked');
            document.body.classList.remove('login-locked');
            document.body.style.backgroundColor = originalBodyBg;
            
            if (metaThemeColor && originalThemeColor) {
                metaThemeColor.setAttribute('content', originalThemeColor);
            } else if (metaThemeColor && !originalThemeColor) {
                document.head.removeChild(metaThemeColor);
            }
        };
    }, []);

    // iOS kılavuz modalı açıkken scroll'u kilitle
    useEffect(() => {
        if (showIosModal) {
            lockScroll();
        }
        return () => {
            if (showIosModal) {
                unlockScroll();
            }
        };
    }, [showIosModal]);

    const containerVariants = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 15, scale: 0.97 },
        show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 350, damping: 26 } }
    };

    const handleStudentLoginSubmit = async (e) => {
        if (e) e.preventDefault();
        setErrorMsg(''); 
        setShowForgotMsg(false);

        const cleanUsername = username.trim().toLowerCase();
        const cleanPassword = password.trim();

        if (!cleanUsername || !cleanPassword) {
            setErrorMsg('Lütfen kullanıcı adı ve şifrenizi giriniz.');
            return;
        }

        try {
            await onStudentLogin(cleanUsername, cleanPassword, authView === 'vip-login');
        } catch (error) {
            console.error("Giriş hatası:", error);
            setErrorMsg('Kullanıcı adı veya şifre hatalı!');
        }
    };

    const handlePwaInstall = async () => {
        if (isIos) {
            setIosStep(1); 
            setShowIosModal(true);
        } else if (deferredPrompt) {
            deferredPrompt.prompt();
            await deferredPrompt.userChoice;
        } else {
            alert("Uygulama zaten kurulu veya tarayıcınız otomatik kuruluma izin vermiyor. Tarayıcı ayarlarından 'Ana Ekrana Ekle' yapabilirsiniz.");
        }
    };

    const iosStepsData = [
        { id: 1, title: "📤 Adım 1: Menüyü Açın", desc: "Telefonunuzdan uygulamayı açtığınız tarayıcının alt barındaki veya üst köşesindeki 'Paylaş' ya da 'Seçenekler' simgesine dokunun.", img: "/pwa/adim1.png", icon: <Share className="text-blue-500" size={24} /> },
        { id: 2, title: "📜 Adım 2: Listeyi Kaydırın", desc: "Karşınıza çıkan tarayıcı işlem penceresini parmağınızla hafifçe yukarıye kaydırarak alt kısımdaki ek özellikleri görünür yapın.", img: "/pwa/adim2.png", icon: <Smartphone className="text-sky-500" size={24} /> },
        { id: 3, title: "➕ Adım 3: Ana Ekrana Ekle", desc: "Seçenekler arasında yer alan ve yanında artı simgesi bulunan 'Ana Ekrana Ekle' (Add to Home Screen) sekmesine dokunun.", img: "/pwa/adim3.png", icon: <PlusSquare className="text-primary" size={24} /> },
        { id: 4, title: "✨ Adım 4: Kurulumu Bitir", desc: "Son olarak ekranın sağ üst köşesinde beliren 'Ekle' (Add) seçeneğine tıklayın. Platform artık ana ekranınızda bir mobil uygulama!", img: "/pwa/adim4.png", icon: <Download className="text-emerald-500" size={24} /> }
    ];

    return (
        <div className="fixed inset-0 bg-slate-50 flex flex-col items-center justify-center overflow-hidden overscroll-none p-4 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] z-50">
            {/* Dinamik Arka Plan Şekilleri */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute top-1/2 -right-32 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
                <div className="absolute -bottom-32 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", bounce: 0.3, duration: 0.7 }}
                className="w-full max-w-[360px] relative z-10 flex flex-col items-center"
            >
                {/* Modern Ferah Logo Alanı */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-24 h-24 bg-white rounded-3xl shadow-xl shadow-primary/10 flex items-center justify-center relative overflow-hidden border border-slate-100">
                        {/* Marka Rengi İnce Bir Çizgi (Sol Taraf) */}
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary"></div>
                        <img src="/pwa-192x192.png" alt="Platform Logo" className="w-16 h-16 object-contain select-none pointer-events-none drop-shadow-sm" />
                    </div>
                    <div className="text-2xl font-black mt-5 text-slate-800 tracking-tight">BERKANT HOCA</div>
                    <div className="text-[10px] font-bold tracking-[0.3em] mt-1 text-primary bg-primary/5 px-3 py-1 rounded-full uppercase">
                        Eğitim Platformu
                    </div>
                </div>
                
                <AnimatePresence mode="wait">
                    {authView === 'selection' && (
                        <motion.div key="selection" variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0, x: -30, transition: { duration: 0.15 } }} className="flex flex-col items-center w-full gap-3">
                            {/* Öğrenci Butonu */}
                            <motion.button 
                                variants={itemVariants} whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }} 
                                onClick={() => setAuthView('student-login')} 
                                className="w-full bg-white/80 backdrop-blur-md border border-slate-200/60 shadow-lg shadow-slate-200/50 p-4 rounded-2xl flex items-center gap-4 transition-all hover:border-primary/30 group"
                            >
                                <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 group-hover:rotate-3">
                                    <User size={20} />
                                </div>
                                <div className="flex-1 text-left">
                                    <div className="text-slate-800 font-bold text-sm">Öğrenci Girişi</div>
                                    <div className="text-slate-400 font-medium text-[11px] mt-0.5">Sınıf öğrencileri için</div>
                                </div>
                                <ChevronRight className="text-slate-300 group-hover:text-primary transition-colors" size={18} />
                            </motion.button>

                            {/* VIP Öğrenci Butonu */}
                            <motion.button 
                                variants={itemVariants} whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }} 
                                onClick={() => setAuthView('vip-login')} 
                                className="w-full bg-white/80 backdrop-blur-md border border-slate-200/60 shadow-lg shadow-slate-200/50 p-4 rounded-2xl flex items-center gap-4 transition-all hover:border-amber-400/50 group overflow-hidden relative"
                            >
                                <div className="w-12 h-12 bg-amber-100 text-amber-500 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 group-hover:-rotate-3">
                                    <Crown size={20} />
                                </div>
                                <div className="flex-1 text-left relative z-10">
                                    <div className="text-amber-600 font-black text-sm uppercase tracking-wide">VIP Özel Ders</div>
                                    <div className="text-slate-400 font-medium text-[11px] mt-0.5">Özel ders giriş paneli</div>
                                </div>
                                <ChevronRight className="text-slate-300 group-hover:text-amber-500 transition-colors relative z-10" size={18} />
                            </motion.button>

                            <motion.div variants={itemVariants} className="flex items-center gap-3 w-full my-1">
                                <div className="h-px bg-slate-200 flex-1"></div>
                                <div className="text-[10px] font-bold tracking-widest text-slate-400">YÖNETİM</div>
                                <div className="h-px bg-slate-200 flex-1"></div>
                            </motion.div>

                            {/* Yönetici Butonu */}
                            <motion.button 
                                variants={itemVariants} whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }} 
                                onClick={() => setAuthView('teacher-login')} 
                                className="w-full bg-white/80 backdrop-blur-md border border-slate-200/60 shadow-lg shadow-slate-200/50 p-4 rounded-2xl flex items-center gap-4 transition-all hover:border-primary/30 group"
                            >
                                <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110">
                                    <Briefcase size={20} />
                                </div>
                                <div className="flex-1 text-left">
                                    <div className="text-slate-800 font-bold text-sm">Yönetici Girişi</div>
                                    <div className="text-slate-400 font-medium text-[11px] mt-0.5">Öğretmen paneli</div>
                                </div>
                                <ChevronRight className="text-slate-300 group-hover:text-primary transition-colors" size={18} />
                            </motion.button>
                            
                            {!isStandalone && (deferredPrompt || isIos) && (
                                <motion.button 
                                    variants={itemVariants}
                                    whileHover={{ scale: 1.02 }} 
                                    whileTap={{ scale: 0.97 }} 
                                    onClick={handlePwaInstall}
                                    className="mt-4 w-full bg-slate-800 text-white p-3.5 rounded-xl text-[11px] font-black tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-slate-800/20"
                                >
                                    <Download size={16} className="animate-bounce" /> 
                                    MOBİL UYGULAMAYI İNDİR
                                </motion.button>
                            )}

                            <motion.div variants={itemVariants} className="mt-6 text-center text-xs font-semibold text-slate-400 leading-relaxed px-4">
                                "Eğitim, dünyayı değiştirmek için <br/> en güçlü silahtır."
                            </motion.div>
                        </motion.div>
                    )}
                    
                    {(authView === 'student-login' || authView === 'vip-login') && (
                        <motion.div key="student-form" variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0, x: 30, transition: { duration: 0.15 } }} className="w-full">
                            <motion.button 
                                variants={itemVariants} whileHover={{ x: -2 }} whileTap={{ scale: 0.96 }} 
                                onClick={() => { setAuthView('selection'); setErrorMsg(''); setShowForgotMsg(false); }} 
                                className="flex items-center gap-1.5 text-slate-400 hover:text-primary transition-colors font-bold text-xs mb-4 w-fit px-2 py-1 rounded"
                            >
                                <ArrowLeft size={14}/> Geri Dön
                            </motion.button>

                            <motion.div variants={itemVariants} className={`p-7 rounded-[2rem] w-full relative overflow-hidden bg-white/90 backdrop-blur-xl border border-white shadow-2xl shadow-slate-200/50`}>
                                {/* VIP ise ufak bir altın taç vurgusu */}
                                {authView === 'vip-login' && (
                                    <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-300 via-amber-500 to-amber-400"></div>
                                )}
                                
                                <div className="mb-6 text-center mt-1">
                                    <h2 className={`text-lg font-black tracking-wide ${authView === 'vip-login' ? 'text-amber-600 uppercase' : 'text-slate-800'}`}>
                                        {authView === 'vip-login' ? 'VIP GİRİŞİ' : 'ÖĞRENCİ GİRİŞİ'}
                                    </h2>
                                    <p className="text-[11px] text-slate-400 mt-1.5 font-medium">Lütfen giriş bilgilerinizi doldurun</p>
                                </div>
                                
                                <div className="mb-4">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Kullanıcı Adı</label>
                                    <input 
                                        type="text" autoCapitalize="none" autoCorrect="off" autoComplete="username" spellCheck="false"
                                        className={`w-full bg-slate-50 border-2 rounded-xl p-3.5 text-sm font-semibold text-slate-800 outline-none transition-all focus:bg-white ${authView === 'vip-login' ? 'border-slate-100 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10' : 'border-slate-100 focus:border-primary focus:ring-4 focus:ring-primary/10'}`} 
                                        placeholder="örn: ahmet.yilmaz" 
                                        value={username} 
                                        onChange={e => setUsername(e.target.value)} 
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Şifre</label>
                                    <input 
                                        type="password" autoCapitalize="none" autoCorrect="off" autoComplete="current-password" spellCheck="false"
                                        className={`w-full bg-slate-50 border-2 rounded-xl p-3.5 text-base font-bold text-slate-800 tracking-[0.2em] outline-none transition-all focus:bg-white ${authView === 'vip-login' ? 'border-slate-100 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10' : 'border-slate-100 focus:border-primary focus:ring-4 focus:ring-primary/10'}`} 
                                        placeholder="•••••" 
                                        value={password} 
                                        onChange={e => setPassword(e.target.value)} 
                                        onKeyDown={e => e.key === 'Enter' && handleStudentLoginSubmit(e)} 
                                    />
                                </div>

                                {errorMsg && (
                                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-xs mt-4 font-bold text-center bg-red-50 py-2.5 rounded-xl border border-red-100">
                                        {errorMsg}
                                    </motion.div>
                                )}

                                <div className="mt-4 flex flex-col items-center">
                                    <button type="button" onClick={() => setShowForgotMsg(!showForgotMsg)} className="text-[11px] font-bold text-slate-400 hover:text-primary transition-colors underline underline-offset-2">
                                        Şifreni mi unuttun?
                                    </button>
                                    
                                    <AnimatePresence>
                                        {showForgotMsg && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-medium text-[11px] text-center overflow-hidden">
                                                Yeni şifre almak veya şifrenizi sıfırlamak için lütfen <strong>Yönetici (Berkant Hoca)</strong> ile iletişime geçiniz.
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                
                                <motion.button 
                                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} 
                                    onClick={handleStudentLoginSubmit} 
                                    className={`w-full rounded-xl p-4 mt-6 text-sm font-black tracking-widest text-white shadow-xl flex justify-center items-center gap-2 ${authView === 'vip-login' ? 'bg-gradient-to-r from-amber-500 to-amber-600 shadow-amber-500/25' : 'bg-primary shadow-primary/25'}`}
                                >
                                    SİSTEME GİRİŞ YAP <ArrowRight size={16} />
                                </motion.button>
                            </motion.div>
                        </motion.div>
                    )}
                    
                    {authView === 'teacher-login' && (
                        <motion.div key="teacher-form" variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0, y: 30, transition: { duration: 0.15 } }} className="w-full">
                            <motion.button 
                                variants={itemVariants} whileHover={{ x: -2 }} whileTap={{ scale: 0.96 }} 
                                onClick={() => setAuthView('selection')} 
                                className="flex items-center gap-1.5 text-slate-400 hover:text-primary transition-colors font-bold text-xs mb-4 w-fit px-2 py-1 rounded"
                            >
                                <ArrowLeft size={14}/> Geri Dön
                            </motion.button>

                            <motion.div variants={itemVariants} className="p-7 rounded-[2rem] w-full bg-white/90 backdrop-blur-xl border border-white shadow-2xl shadow-slate-200/50">
                                <div className="mb-6 text-center mt-1">
                                    <h2 className="text-lg font-black tracking-widest text-primary">YÖNETİCİ GİRİŞİ</h2>
                                    <p className="text-[11px] text-slate-400 mt-1.5 font-medium">Öğretmen PIN kodunu girin</p>
                                </div>

                                <div>
                                    <input 
                                        type="password" autoFocus 
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 text-2xl font-black text-center text-slate-800 tracking-[0.4em] outline-none transition-all focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10" 
                                        placeholder="••••" 
                                        value={pin} 
                                        onChange={e => setPin(e.target.value)} 
                                        onKeyDown={e => e.key === 'Enter' && onTeacherLogin(pin)} 
                                    />
                                </div>
                                
                                <motion.button 
                                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} 
                                    onClick={() => onTeacherLogin(pin)} 
                                    className="w-full bg-primary hover:opacity-90 text-white rounded-xl mt-6 p-4 text-sm font-black tracking-widest shadow-xl shadow-primary/25 flex justify-center items-center gap-2"
                                >
                                    SİSTEME GİR <ArrowRight size={16} />
                                </motion.button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* PWA iOS MODALI */}
            <AnimatePresence>
                {showIosModal && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0, y: 30, scale: 0.95 }} 
                            animate={{ opacity: 1, y: 0, scale: 1 }} 
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            className="bg-white border border-slate-200 p-5 md:p-6 rounded-[2rem] w-full max-w-[340px] text-center shadow-2xl flex flex-col relative"
                            onClick={e => e.stopPropagation()}
                        >
                            <button onClick={() => setShowIosModal(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full bg-slate-50 transition-colors z-50">
                                <X size={16}/>
                            </button>

                            <div className="mt-2">
                                <div className="flex justify-center mb-3">
                                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                                        {iosStepsData[iosStep - 1].icon}
                                    </div>
                                </div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">{iosStepsData[iosStep - 1].title}</h3>
                                <p className="text-slate-500 text-[11px] mt-2 font-medium leading-relaxed min-h-[44px]">
                                    {iosStepsData[iosStep - 1].desc}
                                </p>
                            </div>

                            <div className="my-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center h-64 overflow-hidden relative shadow-inner p-4">
                                <img 
                                    src={iosStepsData[iosStep - 1].img} 
                                    alt={iosStepsData[iosStep - 1].title} 
                                    className="max-h-full max-w-full object-contain pointer-events-none drop-shadow-md rounded-xl"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                    }}
                                />
                                <div className="hidden absolute inset-0 flex-col items-center justify-center text-slate-400 font-bold text-xs p-4 bg-slate-50/80">
                                    <Smartphone size={32} className="text-slate-300 mb-2" />
                                    <span>Görsel Eklenmedi</span>
                                </div>
                            </div>

                            <div className="mt-auto">
                                <div className="flex justify-center gap-1.5 mb-4">
                                    {iosStepsData.map((step) => (
                                        <div key={step.id} className={`h-1.5 rounded-full transition-all duration-300 ${iosStep === step.id ? 'w-6 bg-primary' : 'w-2 bg-slate-200'}`} />
                                    ))}
                                </div>

                                <div className="flex gap-2">
                                    {iosStep > 1 ? (
                                        <button onClick={() => setIosStep(iosStep - 1)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-1 transition-colors">
                                            <ArrowLeft size={14} /> GERİ
                                        </button>
                                    ) : (
                                        <button onClick={() => setShowIosModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3.5 rounded-xl text-xs transition-colors">
                                            KAPAT
                                        </button>
                                    )}

                                    {iosStep < 4 ? (
                                        <button onClick={() => setIosStep(iosStep + 1)} className="flex-1 bg-primary hover:bg-purple-600 text-white font-black py-3.5 rounded-xl text-xs flex items-center justify-center gap-1 transition-all shadow-lg shadow-primary/20">
                                            İLERİ <ArrowRight size={14} />
                                        </button>
                                    ) : (
                                        <button onClick={() => setShowIosModal(false)} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3.5 rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20 uppercase tracking-wider">
                                            HAZIRIM 🎉
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LoginScreen;
