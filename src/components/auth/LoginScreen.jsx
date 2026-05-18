import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, User, Crown, Briefcase, ChevronRight, ChevronLeft, Download, Smartphone, Share, PlusSquare } from 'lucide-react';

// -------------------------------------------------------------
// V3 HTML KUSURSUZ CANVAS YILDIZ MOTORU
// -------------------------------------------------------------
const CanvasStarfield = () => {
    const canvasRef = useRef(null);
    useEffect(() => {
        const cv = canvasRef.current;
        if(!cv) return;
        const cx = cv.getContext('2d');
        const sc = cv.parentElement;
        
        const rsz = () => { cv.width = sc.offsetWidth; cv.height = sc.offsetHeight; };
        rsz();
        window.addEventListener('resize', rsz);

        const G=['#ffd700','#ffe566','#ffc107','#fff8c0'];
        const W=['rgba(255,255,255,0.9)','rgba(200,190,255,0.75)','rgba(255,255,255,0.65)'];
        const pts=[];
        for(let i=0;i<85;i++){
            const g=Math.random()<0.2;
            pts.push({
                x:Math.random()*2000, y:Math.random()*1000,
                r:g ? Math.random()*1.9+0.7 : Math.random()*1.1+0.3,
                c:g ? G[i%G.length] : W[i%W.length],
                ph:Math.random()*Math.PI*2, ts:Math.random()*0.016+0.005,
                vy:-(Math.random()*0.22+0.04), vx:(Math.random()-0.5)*0.07, g
            });
        }

        let t=0;
        let reqId;
        const draw = () => {
            const W2=cv.width, H=cv.height;
            cx.clearRect(0,0,W2,H);
            for(const p of pts){
                const a=0.2+0.8*Math.abs(Math.sin(t*p.ts+p.ph));
                const sc2=0.5+0.9*Math.abs(Math.sin(t*p.ts*0.65+p.ph));
                const r=p.r*sc2;
                const px=((p.x%W2)+W2)%W2, py=((p.y%H)+H)%H;
                cx.save();
                cx.globalAlpha=a*(p.g?0.88:0.5);
                cx.fillStyle=p.c;
                cx.beginPath();cx.arc(px,py,r,0,Math.PI*2);cx.fill();
                if(p.g&&r>1.3){cx.globalAlpha=a*0.15;cx.beginPath();cx.arc(px,py,r*4,0,Math.PI*2);cx.fill();}
                cx.restore();
                p.y+=p.vy; p.x+=p.vx;
            }
            t++;
            reqId = requestAnimationFrame(draw);
        };
        draw();

        return () => { cancelAnimationFrame(reqId); window.removeEventListener('resize', rsz); };
    }, []);

    return <canvas ref={canvasRef} style={{position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:0}} />
};

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

// 🔥 PROPS GÜNCELLEMESİ ALINDI
const LoginScreen = ({ onStudentLogin, onTeacherLogin, deferredPrompt, isStandalone }) => {
    const [authView, setAuthView] = useState('selection'); 
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [pin, setPin] = useState("");
    
    const [errorMsg, setErrorMsg] = useState("");
    const [showForgotMsg, setShowForgotMsg] = useState(false);

    // 🔥 PWA MOBİL CİHAZ AYIRT EDİCİ HOOK'LAR
    const [isIos, setIsIos] = useState(false);
    const [showIosModal, setShowIosModal] = useState(false);

    useEffect(() => {
        const ua = window.navigator.userAgent.toLowerCase();
        setIsIos(/iphone|ipad|ipod/.test(ua));
    }, []);

    const containerVariants = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20, scale: 0.95 },
        show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
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

    // 🔥 PWA AKILLI YÜKLEME AKIŞI TETİKLEYİCİSİ
    const handlePwaInstall = async () => {
        if (isIos) {
            setShowIosModal(true);
        } else if (deferredPrompt) {
            deferredPrompt.prompt();
            await deferredPrompt.userChoice;
        } else {
            alert("Uygulama zaten kurulu veya tarayıcınız otomatik kuruluma izin vermiyor. Tarayıcı ayarlarından 'Ana Ekrana Ekle' yapabilirsiniz.");
        }
    };

    return (
        <div className="login-scene">
            <CanvasStarfield />
            <div className="login-orb login-o1"></div>
            <div className="login-orb login-o2"></div>
            <div className="login-orb login-o3"></div>

            <motion.div 
                initial={{ opacity: 0, y: 40, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", bounce: 0.4, duration: 0.8 }}
                className="login-card"
            >
                <div className="logo-area">
                    <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} className="logo-box">
                        <GraduationCap size={30} color="white" strokeWidth={2}/>
                    </motion.div>
                    <div className="logo-brand">BERKANT HOCA</div>
                    <div className="logo-sub">EĞİTİM PLATFORMU</div>
                </div>
                
                <AnimatePresence mode="wait">
                    {authView === 'selection' && (
                        <motion.div key="selection" variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0, x: -50, transition: { duration: 0.2 } }} className="login-btns flex flex-col items-center w-full">
                            <motion.button variants={itemVariants} whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.97 }} onClick={() => setAuthView('student-login')} className="lbtn lbtn-s w-full max-w-[360px]">
                                <div className="liw liw-s"><User color="#a78bfa" size={18}/></div>
                                <div className="lbl"><div className="lts">Öğrenci Girişi</div><div className="lss">Sınıf öğrencileri için</div></div>
                                <ChevronRight className="lch" size={16}/>
                            </motion.button>

                            <motion.button variants={itemVariants} whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.97 }} onClick={() => setAuthView('vip-login')} className="lbtn lbtn-v w-full max-w-[360px]">
                                <VipParticles />
                                <div className="liw liw-v"><Crown color="#ffd700" size={18}/></div>
                                <div className="lbl"><div className="ltv">Özel Ders</div><div className="lsv">Özel ders öğrenci girişi</div></div>
                                <ChevronRight className="lch lch-v" size={16}/>
                            </motion.button>

                            <motion.div variants={itemVariants} className="ldivline w-full max-w-[360px]"><div className="ldl"></div><div className="ldt">YÖNETİM</div><div className="ldl"></div></motion.div>

                            <motion.button variants={itemVariants} whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.97 }} onClick={() => setAuthView('teacher-login')} className="lbtn lbtn-a w-full max-w-[360px]">
                                <div className="liw liw-a"><Briefcase color="#60a5fa" size={18}/></div>
                                <div className="lbl"><div className="lts">Yönetici Girişi</div><div className="lss">Öğretmen paneli</div></div>
                                <ChevronRight className="lch" size={16}/>
                            </motion.button>
                            
                            {/* 🔥 YENİ: DİNAMİK PWA MOBİL UYGULAMA İNDİRME BUTONU (Zaten kuruluysa tamamen gizlenir) */}
                            {!isStandalone && (deferredPrompt || isIos) && (
                                <motion.button 
                                    variants={itemVariants}
                                    whileHover={{ scale: 1.03 }} 
                                    whileTap={{ scale: 0.96 }} 
                                    onClick={handlePwaInstall}
                                    className="mt-6 w-full max-w-[360px] py-4 bg-slate-700/50 hover:bg-slate-700 text-white rounded-xl border border-slate-600 font-black text-xs tracking-widest flex items-center justify-center gap-2.5 transition-all shadow-md uppercase"
                                >
                                    <Download size={15} className="animate-bounce" /> Mobil Uygulamayı İndir
                                </motion.button>
                            )}

                            <motion.div variants={itemVariants} className="lquote"><span className="lqm">"</span> Eğitim, dünyayı değiştirmek için en güçlü silahtır. <span className="lqm">"</span></motion.div>
                        </motion.div>
                    )}
                    
                    {(authView === 'student-login' || authView === 'vip-login') && (
                        <motion.div key="student-form" variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0, x: 50, transition: { duration: 0.2 } }} className="login-btns flex flex-col items-center w-full">
                            <motion.button variants={itemVariants} whileHover={{ x: -4 }} whileTap={{ scale: 0.95 }} onClick={() => { setAuthView('selection'); setErrorMsg(''); setShowForgotMsg(false); }} className="lbtn lbtn-a" style={{padding: '10px 17px', background: 'transparent', border: 'none', boxShadow: 'none', width: '100%', maxWidth: '360px', marginBottom: '10px'}}>
                                <ChevronLeft className="lch" size={18}/>
                                <div className="lbl"><div className="lts" style={{fontSize:'12px', color: '#cbd5e1'}}>Geri Dön</div></div>
                            </motion.button>

                            <motion.div variants={itemVariants} className={`p-8 rounded-[2rem] w-full max-w-[360px] relative overflow-hidden ${authView === 'vip-login' ? 'bg-slate-800 real-gold-border shadow-[0_0_40px_rgba(255,215,0,0.15)]' : 'bg-slate-800/90 border border-slate-700 shadow-2xl'}`}>
                                <div style={{marginBottom: '28px', textAlign: 'center'}}>
                                    <h2 className={authView === 'vip-login' ? 'real-gold-text' : 'text-white'} style={{fontSize: '22px', fontWeight: '900', letterSpacing: '0.05em'}}>
                                        {authView === 'vip-login' ? 'ÖZEL DERS ÖĞRENCİSİ' : 'ÖĞRENCİ GİRİŞİ'}
                                    </h2>
                                    <p style={{fontSize: '12px', color: authView === 'vip-login' ? '#d4af37' : '#94a3b8', marginTop: '8px', fontWeight: '600'}}>
                                        Lütfen giriş bilgilerinizi doldurun
                                    </p>
                                </div>
                                
                                <div className="login-input-group">
                                    <label className="login-label" style={{color: authView === 'vip-login' ? '#e6c27a' : '#94a3b8'}}>Kullanıcı Adı</label>
                                    <input 
                                        type="text" 
                                        autoCapitalize="none"
                                        autoCorrect="off"
                                        autoComplete="username"
                                        spellCheck="false"
                                        className={`login-input ${authView === 'vip-login' ? 'vip-input' : ''}`} 
                                        placeholder="örn: ahmet.yilmaz" 
                                        value={username} 
                                        onChange={e => setUsername(e.target.value)} 
                                    />
                                </div>
                                
                                <div className="login-input-group" style={{marginTop: '20px'}}>
                                    <label className="login-label" style={{color: authView === 'vip-login' ? '#e6c27a' : '#94a3b8'}}>Şifre</label>
                                    <input 
                                        type="password" 
                                        autoCapitalize="none"
                                        autoCorrect="off"
                                        autoComplete="current-password"
                                        spellCheck="false"
                                        className={`login-input ${authView === 'vip-login' ? 'vip-input' : ''}`} 
                                        style={{letterSpacing: '0.3em', fontSize: '18px'}} 
                                        placeholder="•••••" 
                                        value={password} 
                                        onChange={e => setPassword(e.target.value)} 
                                        onKeyDown={e => e.key === 'Enter' && handleStudentLoginSubmit(e)} 
                                    />
                                </div>

                                {errorMsg && (
                                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-red-400 text-sm mt-3 font-medium text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">
                                        {errorMsg}
                                    </motion.div>
                                )}

                                <div className="mt-4 flex flex-col items-end">
                                    <button
                                        type="button"
                                        onClick={() => setShowForgotMsg(!showForgotMsg)}
                                        className="text-xs text-slate-400 hover:text-white transition-colors underline-offset-2 hover:underline"
                                    >
                                        Şifreni mi unuttun?
                                    </button>
                                    
                                    <AnimatePresence>
                                        {showForgotMsg && (
                                            <motion.div 
                                                initial={{ opacity: 0, height: 0 }} 
                                                animate={{ opacity: 1, height: 'auto' }} 
                                                exit={{ opacity: 0, height: 0 }}
                                                className="mt-3 w-full p-3 bg-slate-900/80 border border-indigo-500/30 rounded-lg text-indigo-200 text-xs text-center"
                                            >
                                                Yeni şifre almak veya şifrenizi sıfırlamak için lütfen <strong>Berkant Hoca</strong> ile iletişime geçiniz.
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                
                                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={handleStudentLoginSubmit} className={`lbtn w-full flex items-center justify-center rounded-xl transition-all ${authView === 'vip-login' ? 'real-gold-bg' : 'bg-brandPurple hover:bg-purple-600 shadow-glow'}`} style={{marginTop: '24px', padding: '16px', border: 'none'}}>
                                    <span style={{color: authView === 'vip-login' ? '#111111' : '#ffffff', fontSize: '16px', fontWeight: '900', letterSpacing: '0.05em'}}>GİRİŞ YAP</span>
                                </motion.button>
                            </motion.div>
                        </motion.div>
                    )}
                    
                    {authView === 'teacher-login' && (
                        <motion.div key="teacher-form" variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0, y: 50, transition: { duration: 0.2 } }} className="login-btns flex flex-col items-center w-full">
                            <motion.button variants={itemVariants} whileHover={{ x: -4 }} whileTap={{ scale: 0.95 }} onClick={() => setAuthView('selection')} className="lbtn lbtn-a" style={{padding: '10px 17px', background: 'transparent', border: 'none', boxShadow: 'none', width: '100%', maxWidth: '360px', marginBottom: '10px'}}>
                                <ChevronLeft className="lch" size={18}/>
                                <div className="lbl"><div className="lts" style={{fontSize:'12px', color: '#cbd5e1'}}>Geri Dön</div></div>
                            </motion.button>

                            <motion.div variants={itemVariants} className="p-8 rounded-[2rem] w-full max-w-[360px] bg-slate-800/90 border border-slate-700 shadow-2xl">
                                <div style={{marginBottom: '24px', textAlign: 'center'}}>
                                    <h2 style={{fontSize: '20px', fontWeight: '900', letterSpacing: '0.1em', color: '#60a5fa'}}>YÖNETİCİ GİRİŞİ</h2>
                                    <p style={{fontSize: '11px', color: '#94a3b8', marginTop: '6px'}}>Öğretmen PIN kodunu girin</p>
                                </div>

                                <div className="login-input-group">
                                    <label className="login-label">Yönetici PIN Kodu</label>
                                    <input type="password" autoFocus className="login-input" style={{textAlign: 'center', fontSize: '24px', letterSpacing: '0.5em', padding: '16px'}} placeholder="••••" value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => e.key === 'Enter' && onTeacherLogin(pin)} />
                                </div>
                                
                                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={() => onTeacherLogin(pin)} className="lbtn lbtn-a w-full flex items-center justify-center rounded-xl" style={{marginTop: '28px', padding: '16px', background: 'rgba(96,155,250,0.15)', border: '1px solid rgba(96,165,250,0.3)'}}>
                                    <span style={{color: '#60a5fa', fontSize: '16px', fontWeight: '900'}}>SİSTEME GİR</span>
                                </motion.button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* 🔥 YENİ: APPLE (iOS) KULLANICILARI İÇİN ADIM ADIM KURULUM KILAVUZU MODALI */}
            <AnimatePresence>
                {showIosModal && (
                    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[99999] flex items-center justify-center p-4" onClick={() => setShowIosModal(false)}>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 30 }} 
                            animate={{ opacity: 1, scale: 1, y: 0 }} 
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            className="bg-slate-900 border border-slate-700 p-6 rounded-[2rem] w-full max-w-sm text-center shadow-2xl relative"
                            onClick={e => e.stopPropagation()}
                        >
                            <button onClick={() => setShowIosModal(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800 transition-colors"><X size={16}/></button>
                            
                            <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/30 text-brandPurple rounded-full flex items-center justify-center mx-auto mb-4 shadow-glow">
                                <Smartphone size={22} />
                            </div>

                            <h3 className="text-xl font-black text-white uppercase tracking-wide">iPhone Kurulum Rehberi</h3>
                            <p className="text-slate-400 text-xs mt-2 font-medium">Uygulamayı telefonunuza kurmak için Safari tarayıcısından aşağıdaki basit adımları izleyin:</p>

                            <div className="mt-6 space-y-4 text-left">
                                <div className="flex items-center gap-3.5 bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50">
                                    <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-brandPurple font-black text-xs flex items-center justify-center border border-indigo-500/20">1</div>
                                    <p className="text-slate-200 text-xs font-semibold flex items-center gap-1.5">
                                        Safari alt barındaki <Share size={16} className="text-blue-400" /> <b>"Paylaş"</b> butonuna basın.
                                    </p>
                                </div>

                                <div className="flex items-center gap-3.5 bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50">
                                    <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-brandPurple font-black text-xs flex items-center justify-center border border-indigo-500/20">2</div>
                                    <p className="text-slate-200 text-xs font-semibold">
                                        Açılan pencerede sayfayı biraz aşağı kaydırın.
                                    </p>
                                </div>

                                <div className="flex items-center gap-3.5 bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50">
                                    <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-brandPurple font-black text-xs flex items-center justify-center border border-indigo-500/20">3</div>
                                    <p className="text-slate-200 text-xs font-semibold flex items-center gap-1.5">
                                        <PlusSquare size={16} className="text-slate-300" /> <b>"Ana Ekrana Ekle"</b> seçeneğine tıklayın.
                                    </p>
                                </div>
                            </div>

                            <button 
                                onClick={() => setShowIosModal(false)}
                                className="w-full mt-6 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl text-xs tracking-widest transition-colors"
                            >
                                ANLADIM
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default LoginScreen;
