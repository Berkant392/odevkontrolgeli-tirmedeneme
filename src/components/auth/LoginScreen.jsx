import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, User, Crown, Briefcase, ChevronRight, ChevronLeft, Download, Smartphone, Share, PlusSquare, X, ArrowLeft, ArrowRight } from 'lucide-react';

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
        for(let i=0; i<85; i++){
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

    // 🔥 GÜNCELLENEN EVRENSEL ADIMLAR (.jpg uzantılı ve cihaz bağımsız)
    const iosStepsData = [
        {
            id: 1,
            title: "📤 Adım 1: Menüyü Açın",
            desc: "Telefonunuzdan uygulamayı açtığınız tarayıcının alt barındaki veya üst köşesindeki 'Paylaş' ya da 'Seçenekler' simgesine dokunun.",
            img: "/pwa/adim1.jpg",
            icon: <Share className="text-blue-400" size={24} />
        },
        {
            id: 2,
            title: "📜 Adım 2: Listeyi Kaydırın",
            desc: "Karşınıza çıkan tarayıcı işlem penceresini parmağınızla hafifçe yukarıya kaydırarak alt kısımdaki ek özellikleri görünür yapın.",
            img: "/pwa/adim2.jpg",
            icon: <Smartphone className="text-sky-400" size={24} />
        },
        {
            id: 3,
            title: "➕ Adım 3: Ana Ekrana Ekle",
            desc: "Seçenekler arasında yer alan ve yanında artı simgesi bulunan 'Ana Ekrana Ekle' (Add to Home Screen) sekmesine dokunun.",
            img: "/pwa/adim3.jpg",
            icon: <PlusSquare className="text-indigo-400" size={24} />
        },
        {
            id: 4,
            title: "✨ Adım 4: Kurulumu Bitir",
            desc: "Açılan son onay ekranının sağ üst köşesindeki 'Ekle' butonuna basın. Platform artık ana ekranınızda bir mobil uygulama!",
            img: "/pwa/adim4.jpg",
            icon: <GraduationCap className="text-emerald-400" size={24} />
        }
    ];

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

            {/* 🔥 GÜNCELLEME: DIKDÖRTGEN DIKEY TELEFON TASARIMLI SİHİRBAZ MODALI (Saf Kanatlı CSS) */}
            <AnimatePresence>
                {showIosModal && (
                    <div className="fixed inset-0 bg-slate-950 z-[99999] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0, y: 40, scale: 0.95 }} 
                            animate={{ opacity: 1, y: 0, scale: 1 }} 
                            exit={{ opacity: 0, y: 30, scale: 0.95 }}
                            // max-w-[360px] ve min-h-[640px] ile dikey dikdörtgen (smartphone mockup) yapısına kavuşturuldu
                            className="bg-slate-900 border-2 border-slate-800 p-5 md:p-6 rounded-[2.5rem] w-full max-w-[360px] min-h-[640px] text-center shadow-2xl flex flex-col justify-between relative overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <button onClick={() => setShowIosModal(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 transition-colors z-50"><X size={16}/></button>

                            {/* Üst Başlık ve İkon Alanı */}
                            <div className="mt-2">
                                <div className="flex justify-center mb-2">
                                    <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/30 text-brandPurple rounded-full flex items-center justify-center shadow-glow">
                                        {iosStepsData[iosStep - 1].icon}
                                    </div>
                                </div>
                                <h3 className="text-md font-black text-white uppercase tracking-wider">{iosStepsData[iosStep - 1].title}</h3>
                                <p className="text-slate-300 text-[11px] mt-1.5 px-1 font-medium leading-relaxed min-h-[45px]">{iosStepsData[iosStep - 1].desc}</p>
                            </div>

                            {/* Orta Kısım: Dikdörtgen Elongated Görsel Çerçevesi (h-96 yapılarak dikey alan genişletildi) */}
                            <div className="my-3 bg-slate-950/80 rounded-2xl border border-slate-800 flex items-center justify-center h-96 overflow-hidden relative shadow-inner">
                                <img 
                                    src={iosStepsData[iosStep - 1].img} 
                                    alt={iosStepsData[iosStep - 1].title} 
                                    className="max-h-full max-w-full object-contain pointer-events-none"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                    }}
                                />
                                <div className="hidden absolute inset-0 flex-col items-center justify-center text-slate-600 font-bold text-xs p-4 bg-slate-950/40">
                                    <Smartphone size={32} className="text-slate-700 mb-2 animate-pulse" />
                                    <span>[ Ekran Görüntüsü Alanı ]</span>
                                    <span className="text-[10px] text-slate-500 mt-1 font-normal">public{iosStepsData[iosStep - 1].img}</span>
                                </div>
                            </div>

                            {/* Alt Kontrol Paneli */}
                            <div className="mb-2">
                                <div className="flex justify-center gap-1.5 mb-3">
                                    {iosStepsData.map((step) => (
                                        <div key={step.id} className={`h-1.5 rounded-full transition-all duration-300 ${iosStep === step.id ? 'w-6 bg-brandPurple shadow-glow' : 'w-1.5 bg-slate-700'}`} />
                                    ))}
                                </div>

                                <div className="flex gap-2">
                                    {iosStep > 1 ? (
                                        <button 
                                            onClick={() => setIosStep(iosStep - 1)}
                                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                                        >
                                            <ArrowLeft size={14} /> GERİ
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => setShowIosModal(false)}
                                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold py-3.5 rounded-xl text-xs transition-colors border border-slate-700"
                                        >
                                            KAPAT
                                        </button>
                                    )}

                                    {iosStep < 4 ? (
                                        <button 
                                            onClick={() => setIosStep(iosStep + 1)}
                                            className="flex-1 bg-brandPurple hover:bg-purple-600 text-white font-black py-3.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-glow"
                                        >
                                            İLERİ <ArrowRight size={14} />
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => setShowIosModal(false)}
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-xl text-xs transition-all shadow-md uppercase tracking-wider"
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
