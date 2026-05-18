import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, ArrowRight, BookOpen, AlertCircle, Info } from 'lucide-react';

const LoginScreen = ({ onLogin, classes }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showForgotMessage, setShowForgotMessage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setShowForgotMessage(false);
    setIsLoading(true);

    // Kısa bir bekleme efekti (daha gerçekçi hissettirir)
    setTimeout(() => {
      // Öğretmen (Admin) Girişi
      if (username === 'admin' && password === 'admin') {
        onLogin('teacher', { name: 'Berkant Hoca' });
        return;
      }

      // Öğrenci Girişi
      let foundStudent = null;
      let foundClass = null;

      if (classes) {
        for (const cls of classes) {
          const student = cls.students?.find(
            (s) => s.username === username && s.password === password
          );
          if (student) {
            foundStudent = student;
            foundClass = cls;
            break;
          }
        }
      }

      if (foundStudent) {
        onLogin('student', { ...foundStudent, classId: foundClass.id, className: foundClass.className });
      } else {
        // Hatalı giriş durumu
        setError('Kullanıcı adı veya şifre hatalı!');
      }
      setIsLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-brandPurple rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-200 rotate-3 hover:rotate-6 transition-transform">
            <BookOpen size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 mb-2">Hoş Geldin! 👋</h1>
          <p className="text-slate-500 font-medium">Ödev takip sistemine giriş yap</p>
        </div>

        <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* HATA MESAJI ALANI */}
            <AnimatePresence>
                {error && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }} 
                        animate={{ opacity: 1, height: 'auto', marginBottom: 16 }} 
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        className="bg-rose-50 text-rose-600 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold border border-rose-100 overflow-hidden"
                    >
                        <AlertCircle size={18} className="shrink-0" />
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="space-y-4">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brandPurple transition-colors">
                  <User size={20} />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brandPurple/20 focus:border-brandPurple transition-all font-medium text-slate-700 placeholder:text-slate-400"
                  placeholder="Kullanıcı Adı"
                  required
                />
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brandPurple transition-colors">
                  <Lock size={20} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brandPurple/20 focus:border-brandPurple transition-all font-medium text-slate-700 placeholder:text-slate-400"
                  placeholder="Şifre"
                  required
                />
              </div>
            </div>

            {/* ŞİFREMİ UNUTTUM KISMI */}
            <div className="flex flex-col items-end gap-2">
                <button 
                    type="button" 
                    onClick={() => setShowForgotMessage(!showForgotMessage)}
                    className="text-xs font-bold text-slate-400 hover:text-brandPurple transition-colors"
                >
                    Şifreni mi unuttun?
                </button>
                
                <AnimatePresence>
                    {showForgotMessage && (
                        <motion.div 
                            initial={{ opacity: 0, y: -5, height: 0 }} 
                            animate={{ opacity: 1, y: 0, height: 'auto' }} 
                            exit={{ opacity: 0, y: -5, height: 0 }}
                            className="bg-amber-50 text-amber-700 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-amber-200 w-full overflow-hidden"
                        >
                            <Info size={16} className="shrink-0" />
                            Yeni şifre almak için lütfen Berkant Hoca ile iletişime geçiniz.
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <button
              type="submit"
              disabled={isLoading || !username || !password}
              className="w-full bg-brandPurple hover:bg-purple-700 text-white p-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-200 active:scale-[0.98]"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Giriş Yap
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginScreen;
