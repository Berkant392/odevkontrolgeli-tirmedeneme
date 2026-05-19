import React from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp } from 'lucide-react';

const StudentDashboard = ({ classes, currentUserRole, onOpenClass }) => {
    return (
        <div className="space-y-6 md:space-y-8">
            {/* 🔥 GÜNCELLEME: Net Takip Sistemi - Ana Panel Başlık Alanı */}
            <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">Sınıflarım</h3>
            </div>

            <motion.div 
                key="student-home"
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1, transition: { staggerChildren: 0.1 } }} 
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
            >
                {classes.map((cls) => ( 
                    <div key={cls.id} className="flex flex-col gap-2">
                        <motion.div 
                            whileHover={{ scale: 1.02, y: -3 }} 
                            whileTap={{ scale: 0.98 }} 
                            onClick={() => onOpenClass(cls)} 
                            className={`cursor-pointer group rounded-2xl md:rounded-3xl p-5 md:p-8 flex flex-col items-center justify-center text-center ${currentUserRole === 'vip-student' ? 'bg-slate-800 border border-slate-700 shadow-xl' : 'bg-white border-slate-100 shadow-float'}`}
                        >
                            <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center mb-3.5 md:mb-5 transition-all duration-300 shadow-sm ${currentUserRole === 'vip-student' ? 'bg-slate-700 text-vipGold group-hover:bg-vipGold group-hover:text-slate-900' : 'bg-purple-50 text-brandPurple group-hover:bg-brandPurple group-hover:text-white'}`}>
                                <Users className="w-6 h-6 md:w-8 md:h-8" />
                            </div>
                            
                            <h2 className={`text-lg md:text-2xl font-black tracking-tight transition-colors ${currentUserRole === 'vip-student' ? 'text-white group-hover:real-gold-text' : 'text-slate-800 group-hover:text-brandPurple'}`}>{cls.className}</h2>
                            
                            <p className={`text-[10px] md:text-xs mt-2.5 md:mt-3 font-bold uppercase tracking-widest px-3 py-1 md:px-4 md:py-1.5 rounded-full ${currentUserRole === 'vip-student' ? 'bg-slate-700 text-vipGold border border-slate-600' : 'bg-slate-50 text-slate-400'}`}>Sınıfa Gir</p>
                        </motion.div>

                        {/* 🔥 GÜNCELLEME: Net Takip Butonu - Öğrenci paneline entegre edildi */}
                        <motion.button 
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            className={`w-full py-2.5 rounded-xl text-[11px] md:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${currentUserRole === 'vip-student' ? 'bg-slate-700 text-vipGold border border-slate-600' : 'bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100'}`}
                            onClick={() => {/* Net Takip Modalı Tetiklenecek */}}
                        >
                            <TrendingUp size={14} /> Net Takip Paneli
                        </motion.button>
                    </div>
                ))}
            </motion.div> 
        </div>
    );
};

export default StudentDashboard;
