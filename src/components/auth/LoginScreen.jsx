import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, User, Lock, Sparkles, BookOpen, AlertCircle, Info } from 'lucide-react';

const LoginScreen = ({ onLogin, classes }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotMessage, setShowForgotMessage] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({
        x: (e.clientX / window.innerWidth) * 20 - 10,
        y: (e.clientY / window.innerHeight) * 20 - 10,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setShowForgotMessage(false);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      if (username === 'admin' && password === 'admin') {
        onLogin('teacher', { name: 'Berkant Hoca' });
        return;
      }

      let foundStudent = null;
      let foundClass = null;

      if (classes) {
        for (const cls of classes) {
          const student = cls.students?.find(
            s => s.username === username && s.password === password
          );
          if (student) {
            foundStudent = student;
            foundClass = cls;
            break;
          }
        }
      }

      if (foundStudent) {
        onLogin('student', {
          ...foundStudent,
          classId: foundClass.id,
          className: foundClass.className
        });
      } else {
        // Hatalı giriş durumu
        setError('Kullanıcı adı veya şifre hatalı!');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Orijinal Arka Plan Animasyonları */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000" />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-indigo-500/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-4000" />
      </div>

      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-white rounded-full opacity-20"
          animate={{
            y: [0, -20, 0],
            opacity: [0.2, 0.8, 0.2],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: Math.random() * 3 + 2,
            repeat: Infinity,
            ease: "linear",
            delay: Math.random() * 2,
          }}
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[420px]"
        style={{
          transform: `perspective(1000px) rotateX(${mousePos.y * -0.5}deg) rotateY(${mousePos.x * 0.5}deg)`,
        }}
      >
        <div className="backdrop-blur-xl bg-white/10 p-8 rounded-[2rem] border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 z-0" />
          
          <div className="relative z-10">
            <div className="text-center mb-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                className="w-20 h-20 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-500/30 rotate-3"
              >
                <BookOpen size={40} className="text-white" />
              </motion.div>
              <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
                Hoş Geldiniz
              </h1>
              <p className="text-slate-300 font-medium text-sm flex items-center justify-center gap-2">
                <Sparkles size={16} className="text-yellow-400" />
                Eğitim Yönetim Sistemi
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* HATA MESAJI ALANI */}
              <AnimatePresence>
                  {error && (
                      <motion.div 
                          initial={{ opacity: 0, height: 0, marginBottom: 0 }} 
                          animate={{ opacity: 1, height: 'auto', marginBottom: 20 }} 
                          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                          className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-xl flex items-center gap-3 text-sm font-medium overflow-hidden backdrop-blur-sm"
                      >
                          <AlertCircle size={18} className="shrink-0" />
                          {error}
                      </motion.div>
                  )}
              </AnimatePresence>

              <div className="space-y-4">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-400 transition-colors">
                    <User size={20} />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all font-medium text-white placeholder:text-slate-500 backdrop-blur-sm"
                    placeholder="Kullanıcı Adı"
                    required
                  />
                </div>

                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-purple-400 transition-colors">
                    <Lock size={20} />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all font-medium text-white placeholder:text-slate-500 backdrop-blur-sm"
                    placeholder="Şifre"
                    required
                  />
                </div>
              </div>

              {/* ŞİFREMİ UNUTTUM KISMI */}
              <div className="flex flex-col items-end gap-2 pt-1 pb-2">
                  <button 
                      type="button" 
                      onClick={() => setShowForgotMessage(true)}
                      className="text-xs font-medium text-slate-400 hover:text-white transition-colors"
                  >
                      Şifreni mi unuttun?
                  </button>
                  
                  <AnimatePresence>
                      {showForgotMessage && (
                          <motion.div 
                              initial={{ opacity: 0, y: -5, height: 0 }} 
                              animate={{ opacity: 1, y: 0, height: 'auto' }} 
                              exit={{ opacity: 0, y: -5, height: 0 }}
                              className="bg-blue-500/20 text-blue-100 p-3 rounded-xl text-xs font-medium flex items-center gap-2 border border-blue-500/30 w-full overflow-hidden mt-2 backdrop-blur-sm"
                          >
                              <Info size={16} className="shrink-0 text-blue-300" />
                              <span>Yeni şifre almak için lütfen <b>Berkant Hoca</b> ile iletişime geçiniz.</span>
                          </motion.div>
                      )}
                  </AnimatePresence>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading || !username || !password}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white p-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(59,130,246,0.3)] mt-2"
              >
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <LogIn size={20} />
                    Sisteme Giriş Yap
                  </>
                )}
              </motion.button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginScreen;
