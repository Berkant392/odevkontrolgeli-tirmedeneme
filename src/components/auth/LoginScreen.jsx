import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Crown, Briefcase, ChevronRight, ChevronLeft, Download, Smartphone, Share, PlusSquare, X, ArrowLeft, ArrowRight } from 'lucide-react';
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";

// -------------------------------------------------------------
// V3 VIP BUTON İÇİ ALTIN PARÇACIK EFEKTİ
// -------------------------------------------------------------
const VipParticles = () => {
    const G = ['#ffd700','#ffe566','#ffc107','#fff8c0'];
    const particles = Array.from({length: 16}).map((_, i) => ({
        id: i,
        sz: (Math.random()*2.2+0.8).toFixed(2),
        c: G[i%G.length],
        l: (Math.random()*100).toFixed(2),
        t: (Math.random()*100).toFixed(2),
        dur: (Math.random()*1.6+1.2).toFixed(2),
        del: (Math.random()*3).toFixed(2)
    }));
    return (
        <div style={{position:'absolute', inset:0, pointerEvents:'none', borderRadius:'16px', overflow:'hidden'}}>
            {particles.map(p => (
                <div key={p.id} style={{
                    position:'absolute', width: `${p.sz}px`, height: `${p.sz}px`, borderRadius:'50%', background: p.c,
                    left: `${p.l}%`, top: `${p.t}%`, animation: `vp2 ${p.dur}s ${p.del}s ease-in-out infinite`
                }} />
            ))}
        </div>
    );
};

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
    }, []);

    const particlesInit = useCallback(async (engine) => {
        await loadSlim(engine);
    }, []);

    const particlesOptions = {
        background: { color: { value: "transparent" } },
        fpsLimit: 60,
        interactivity: {
            events: {
                onHover: { enable: true, mode: "bubble" },
                resize: true,
            },
            modes: { bubble: { distance: 200, size: 3, duration: 2, opacity: 1 } },
        },
        particles: {
            color: { value: ["#ffffff", "#ffd700", "#ffeb99", "#e2e8f0"] },
            links: { enable: false },
            move: {
                direction: "none",
                enable: true,
                outModes: { default: "out" },
                random: true,
                speed: 0.15,
                straight: false,
            },
            number: { density: { enable: true, area: 800 }, value: 250 },
            opacity: { 
                value: { min: 0.1, max: 0.9 }, 
                animation: { enable: true, speed: 0.5, minimumValue: 0.1, sync: false } 
            },
            shape: { type: "circle" },
            size: { 
                value: { min: 0.5, max: 2.5 }, 
                animation: { enable: true, speed: 1.5, minimumValue: 0.1, sync: false } 
            },
        },
        detectRetina: true,
    };

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
        { id: 1, title: "📤 Adım 1: Menüyü Açın", desc: "Telefonunuzdan uygulamayı açtığınız tarayıcının alt barındaki veya üst köşesindeki 'Paylaş' ya da 'Seçenekler' simgesine dokunun.", img: "/pwa/adim1.png", icon: <Share className="text-blue-400" size={24} /> },
        { id: 2, title: "📜 Adım 2: Listeyi Kaydırın", desc: "Karşınıza çıkan tarayıcı işlem penceresini parmağınızla hafifçe yukarıye kaydırarak alt kısımdaki ek özellikleri görünür yapın.", img: "/pwa/adim2.png", icon: <Smartphone className="text-sky-400" size={24} /> },
        { id: 3, title: "➕ Adım 3: Ana Ekrana Ekle", desc: "Seçenekler arasında yer alan ve yanında artı simgesi bulunan 'Ana Ekrana Ekle' (Add to Home Screen) sekmesine dokunun.", img: "/pwa/adim3.png", icon: <PlusSquare className="text-indigo-400" size={24} /> },
        { id: 4, title: "✨ Adım 4: Kurulumu Bitir", desc: "Son olarak ekranın sağ üst köşesinde beliren 'Ekle' (Add) seçeneğine tıklayın. Platform artık ana ekranınızda bir mobil uygulama!", img: "/pwa/adim4.png", icon: <Download className="text-emerald-400" size={24} /> }
    ];

    return (
        <div className="login-scene">
            <Particles id="tsparticles" init={particlesInit} options={particlesOptions} style={{position: "absolute", zIndex: 0, inset: 0}} />
            <div className="login-orb login-o1"></div>
            <div className="login-orb login-o2"></div>
            <div className="login-orb login-o3"></div>

            <motion.div 
                initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", bounce: 0.3, duration: 0.7 }}
                className="login-card max-w-[340px] md:max-w-[360px]"
            >
                <div className="logo-area mb-6 md:mb-9">
                    <div className="logo-glow-wrapper">
                        <div className="logo-border-spin"></div>
                        <div className="logo-inner">
                            <img src="/pwa-192x192.png" alt="Platform Logo" className="w-full h-full p-2 object-contain select-none pointer-events-none" />
                        </div>
                    </div>
                    <div className="logo-brand text-lg md:text-xl font-black mt-4">BERKANT HOCA</div>
                    <div className="logo-sub text-[9px] md:text-[10px] tracking-[0.2em] mt-1 text-slate-400">EĞİTİM PLATFORMU</div>
                </div>
                
                <AnimatePresence mode="wait">
                    {authView === 'selection' && (
                        <motion.div key="selection" variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0, x: -30, transition: { duration: 0.15 } }} className="login-btns flex flex-col items-center w-full gap-2.5">
                            <motion.button variants={itemVariants} whileHover={{ scale: 1.01, y: -1 }} whileTap={{ scale: 0.98 }} onClick={() => setAuthView('student-login')} className="lbtn lbtn-s w-full p-3.5 md:p-4 rounded-xl">
                                <div className="liw liw-s w-9 h-9 text-base"><User color="#a78bfa" size={16}/></div>
                                <div className="lbl">
                                    <div className="lts text-xs md:text-sm">Öğrenci Girişi</div>
                                    <div className="lss text-[10px] md:text-xs">Sınıf öğrencileri için</div>
                                </div>
                                <ChevronRight className="lch" size={14}/>
                            </motion.button>

                            <motion.button variants={itemVariants} whileHover={{ scale: 1.01, y: -1 }} whileTap={{ scale: 0.98 }} onClick={() => setAuthView('vip-login')} className="lbtn lbtn-v w-full p-3.5 md:p-4 rounded-xl">
                                <VipParticles />
                                <div className="liw liw-v w-9 h-9 text-base"><Crown color="#ffd700" size={16}/></div>
                                <div className="lbl">
                                    <div className="ltv text-sm md:text-base">Özel Ders</div>
                                    <div className="lsv text-[10px] md:text-xs">Özel ders öğrenci girişi</div>
                                </div>
                                <ChevronRight className="lch lch-v" size={14}/>
                            </motion.button>

                            <motion.div variants={itemVariants} className="ldivline w-full my-1"><div className="ldl"></div><div className="ldt text-[8px] md:text-[9px]">YÖNETİM</div><div className="ldl"></div></motion.div>

                            <motion.button variants={itemVariants} whileHover={{ scale: 1.01, y: -1 }} whileTap={{ scale: 0.98 }} onClick={() => setAuthView('teacher-login')} className="lbtn lbtn-a w-full p-3.5 md:p-4 rounded-xl">
                                <div className="liw liw-a w-9 h-9 text-base"><Briefcase color="#60a5fa" size={16}/></div>
                                <div className="lbl">
                                    <div className="lts text-xs md:text-sm">Yönetici Girişi</div>
                                    <div className="lss text-[10px] md:text-xs">Öğretmen paneli</div>
                                </div>
                                <ChevronRight className="lch" size={14}/>
                            </motion.button>
                            
                            {!isStandalone && (deferredPrompt || isIos) && (
                                <motion.button 
                                    variants={itemVariants}
                                    whileHover={{ scale: 1.02 }} 
                                    whileTap={{ scale: 0.97 }} 
                                    onClick={handlePwaInstall}
                                    className="pwa-download-btn mt-4 w-full"
                                >
                                    <div className="shiny-sweep"></div>
                                    <Download size={16} className="animate-bounce" /> 
                                    <span>MOBİL UYGULAMAYI İNDİR</span>
                                </motion.button>
                            )}

                            <motion.div variants={itemVariants} className="lquote quote-gradient-anim text-[12px] md:text-[13px] mt-6 font-black tracking-wide">
                                <span className="lqm text-[16px] text-white">"</span> Eğitim, dünyayı değiştirmek için en güçlü silahtır. <span className="lqm text-[16px] text-white">"</span>
                            </motion.div>
                        </motion.div>
                    )}
                    
                    {(authView === 'student-login' || authView === 'vip-login') && (
                        <motion.div key="student-form" variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0, x: 30, transition: { duration: 0.15 } }} className="login-btns flex flex-col items-center w-full">
                            <motion.button variants={itemVariants} whileHover={{ x: -2 }} whileTap={{ scale: 0.96 }} onClick={() => { setAuthView('selection'); setErrorMsg(''); setShowForgotMsg(false); }} className="lbtn lbtn-a w-full" style={{padding: '8px 12px', background: 'transparent', border: 'none', boxShadow: 'none', marginBottom: '6px'}}>
                                <ChevronLeft className="lch" size={16}/>
                                <div className="lbl"><div className="lts text-[11px] text-slate-400">Geri Dön</div></div>
                            </motion.button>

                            <motion.div variants={itemVariants} className={`p-6 md:p-8 rounded-[2rem] w-full relative overflow-hidden ${authView === 'vip-login' ? 'form-vip-card' : 'form-glass-card'}`}>
                                {authView === 'vip-login' && (
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-700 via-yellow-400 to-yellow-700"></div>
                                )}
                                
                                <div className="mb-5 text-center">
                                    <h2 className={`text-base md:text-xl font-black tracking-wide ${authView === 'vip-login' ? 'real-gold-text' : 'text-white'}`}>
                                        {authView === 'vip-login' ? 'ÖZEL DERS GİRİŞİ' : 'ÖĞRENCİ GİRİŞİ'}
                                    </h2>
                                    <p className="text-[10px] md:text-xs text-slate-400 mt-1 font-medium">
                                        Lütfen giriş bilgilerinizi doldurun
                                    </p>
                                </div>
                                
                                <div className="login-input-group">
                                    <label className="login-label text-[9px] md:text-[10px]" style={{color: authView === 'vip-login' ? '#e6c27a' : '#94a3b8'}}>Kullanıcı Adı</label>
                                    <input 
                                        type="text" 
                                        autoCapitalize="none"
                                        autoCorrect="off"
                                        autoComplete="username"
                                        spellCheck="false"
                                        className={`login-input p-3 text-xs md:text-sm ${authView === 'vip-login' ? 'vip-input' : ''}`} 
                                        placeholder="örn: ahmet.yilmaz" 
                                        value={username} 
                                        onChange={e => setUsername(e.target.value)} 
                                    />
                                </div>
                                
                                <div className="login-input-group mt-3.5">
                                    <label className="login-label text-[9px] md:text-[10px]" style={{color: authView === 'vip-login' ? '#e6c27a' : '#94a3b8'}}>Şifre</label>
                                    <input 
                                        type="password" 
                                        autoCapitalize="none"
                                        autoCorrect="off"
                                        autoComplete="current-password"
                                        spellCheck="false"
                                        className={`login-input p-3 text-sm md:text-base ${authView === 'vip-login' ? 'vip-input' : ''}`} 
                                        style={{letterSpacing: '0.25em'}} 
                                        placeholder="•••••" 
                                        value={password} 
                                        onChange={e => setPassword(e.target.value)} 
                                        onKeyDown={e => e.key === 'Enter' && handleStudentLoginSubmit(e)} 
                                    />
                                </div>

                                {errorMsg && (
                                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-red-400 text-xs mt-2.5 font-medium text-center bg-red-500/10 py-1.5 rounded-lg border border-red-500/20">
                                        {errorMsg}
                                    </motion.div>
                                )}

                                <div className="mt-3 flex flex-col items-end">
                                    <button
                                        type="button"
                                        onClick={() => setShowForgotMsg(!showForgotMsg)}
                                        className="text-[10px] text-slate-400 hover:text-white transition-colors"
                                    >
                                        Şifreni mi unuttun?
                                    </button>
                                    
                                    <AnimatePresence>
                                        {showForgotMsg && (
                                            <motion.div 
                                                initial={{ opacity: 0, height: 0 }} 
                                                animate={{ opacity: 1, height: 'auto' }} 
                                                exit={{ opacity: 0, height: 0 }}
                                                className="mt-2 w-full p-2.5 bg-slate-900/80 border border-indigo-500/20 rounded-lg text-indigo-200 text-[10px] text-center"
                                            >
                                                Yeni şifre almak veya şifrenizi sıfırlamak için lütfen <strong>Berkant Hoca</strong> ile iletişime geçiniz.
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleStudentLoginSubmit} className={`lbtn w-full flex items-center justify-center rounded-xl p-3.5 ${authView === 'vip-login' ? 'real-gold-bg' : 'bg-brandPurple hover:bg-purple-600 shadow-glow'}`} style={{marginTop: '18px', border: 'none'}}>
                                    <span style={{color: authView === 'vip-login' ? '#111111' : '#ffffff', fontSize: '13px', fontWeight: '900', letterSpacing: '0.05em'}}>GİRİŞ YAP</span>
                                </motion.button>
                            </motion.div>
                        </motion.div>
                    )}
                    
                    {authView === 'teacher-login' && (
                        <motion.div key="teacher-form" variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0, y: 30, transition: { duration: 0.15 } }} className="login-btns flex flex-col items-center w-full">
                            <motion.button variants={itemVariants} whileHover={{ x: -2 }} whileTap={{ scale: 0.96 }} onClick={() => setAuthView('selection')} className="lbtn lbtn-a w-full" style={{padding: '8px 12px', background: 'transparent', border: 'none', boxShadow: 'none', marginBottom: '6px'}}>
                                <ChevronLeft className="lch" size={16}/>
                                <div className="lbl"><div className="lts text-[11px] text-slate-400">Geri Dön</div></div>
                            </motion.button>

                            <motion.div variants={itemVariants} className="p-6 md:p-8 rounded-[2rem] w-full form-glass-card">
                                <div className="mb-4 text-center">
                                    <h2 className="text-base md:text-lg font-black tracking-widest color text-blue-400">YÖNETİCİ GİRİŞİ</h2>
                                    <p className="text-[10px] text-slate-400 mt-1">Öğretmen PIN kodunu girin</p>
                                </div>

                                <div className="login-input-group">
                                    <label className="login-label text-[9px] md:text-[10px]">Yönetici PIN Kodu</label>
                                    <input type="password" autoFocus className="login-input text-center text-xl md:text-2xl p-3 tracking-[0.4em]" placeholder="••••" value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => e.key === 'Enter' && onTeacherLogin(pin)} />
                                </div>
                                
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => onTeacherLogin(pin)} className="lbtn lbtn-a w-full flex items-center justify-center rounded-xl mt-5 p-3.5" style={{background: 'rgba(96,155,250,0.12)', border: '1px solid rgba(96,165,250,0.25)'}}>
                                    <span style={{color: '#60a5fa', fontSize: '13px', fontWeight: '900'}}>SİSTEME GİR</span>
                                </motion.button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* 🔥 DIKDÖRTGEN DIKEY TELEFON TASARIMLI SİHİRBAZ MODALI */}
            <AnimatePresence>
                {showIosModal && (
                    <div className="fixed inset-0 bg-slate-950 z-[99999] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0, y: 30, scale: 0.97 }} 
                            animate={{ opacity: 1, y: 0, scale: 1 }} 
                            exit={{ opacity: 0, y: 25, scale: 0.97 }}
                            className="bg-slate-900 border-2 border-slate-800 p-4 md:p-6 rounded-[2.5rem] w-full max-w-[340px] min-h-[600px] text-center shadow-2xl flex flex-col justify-between relative overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <button onClick={() => setShowIosModal(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 transition-colors z-50"><X size={15}/></button>

                            <div className="mt-1">
                                <div className="flex justify-center mb-1.5">
                                    <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/30 text-brandPurple rounded-full flex items-center justify-center shadow-glow">
                                        {iosStepsData[iosStep - 1].icon}
                                    </div>
                                </div>
                                <h3 className="text-sm md:text-base font-black text-white uppercase tracking-wider">{iosStepsData[iosStep - 1].title}</h3>
                                <p className="text-slate-300 text-[10px] md:text-[11px] mt-1 px-1 font-medium leading-relaxed min-h-[40px]">{iosStepsData[iosStep - 1].desc}</p>
                            </div>

                            <div className="my-2 bg-slate-950/80 rounded-2xl border border-slate-800 flex items-center justify-center h-80 overflow-hidden relative shadow-inner">
                                <img 
                                    src={iosStepsData[iosStep - 1].img} 
                                    alt={iosStepsData[iosStep - 1].title} 
                                    className="max-h-full max-w-full object-contain pointer-events-none"
                                    onError={(e) => {
                                        const currentSrc = e.target.src;
                                        if (currentSrc.includes('pwa/')) {
                                            e.target.src = currentSrc.replace('pwa/', '');
                                        } else {
                                            e.target.style.display = 'none';
                                            e.target.nextSibling.style.display = 'flex';
                                        }
                                    }}
                                />
                                <div className="hidden absolute inset-0 flex-col items-center justify-center text-slate-600 font-bold text-xs p-4 bg-slate-950/40">
                                    <Smartphone size={28} className="text-slate-700 mb-1 animate-pulse" />
                                    <span>[ Ekran Görüntüsü Alanı ]</span>
                                    <span className="text-[9px] text-slate-500 mt-0.5 font-normal">public/{iosStepsData[iosStep - 1].img}</span>
                                </div>
                            </div>

                            <div className="mb-1">
                                <div className="flex justify-center gap-1.5 mb-2.5">
                                    {iosStepsData.map((step) => (
                                        <div key={step.id} className={`h-1.5 rounded-full transition-all duration-300 ${iosStep === step.id ? 'w-5 bg-brandPurple shadow-glow' : 'w-1.5 bg-slate-700'}`} />
                                    ))}
                                </div>

                                <div className="flex gap-2">
                                    {iosStep > 1 ? (
                                        <button 
                                            onClick={() => setIosStep(iosStep - 1)}
                                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-1 transition-colors border border-slate-700"
                                        >
                                            <ArrowLeft size={12} /> GERİ
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => setShowIosModal(false)}
                                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold py-3 rounded-xl text-xs transition-colors border border-slate-700"
                                        >
                                            KAPAT
                                        </button>
                                    )}

                                    {iosStep < 4 ? (
                                        <button 
                                            onClick={() => setIosStep(iosStep + 1)}
                                            className="flex-1 bg-brandPurple hover:bg-purple-600 text-white font-black py-3 rounded-xl text-xs flex items-center justify-center gap-1 transition-all shadow-glow"
                                        >
                                            İLERİ <ArrowRight size={12} />
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => setShowIosModal(false)}
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl text-xs transition-all shadow-md uppercase tracking-wider"
                                        >
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
