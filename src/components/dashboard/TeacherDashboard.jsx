import React from 'react';
import { motion } from 'framer-motion';
import { Users, Crown, Plus } from 'lucide-react';

const TeacherDashboard = ({ regularClasses, vipClasses, onOpenClass, onNewClass, onNewVipClass }) => {
    return (
        <motion.div 
            key="teacher-home"
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1, transition: { staggerChildren: 0.1 } }} 
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col gap-10"
        >
            {/* STANDART SINIFLAR */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 24 }}>
                <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6">
                    <h2 className="text-lg md:text-xl font-black text-slate-800 flex items-center gap-2"><Users className="text-brandPurple"/> Sınıf Yönetimi</h2>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onNewClass} className="bg-brandPurple hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-glow flex items-center gap-2"><Plus size={18}/> Yeni Sınıf</motion.button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {regularClasses.map((cls) => ( 
                        <motion.div 
                            key={cls.id} 
                            whileHover={{ scale: 1.02, y: -4 }} 
                            whileTap={{ scale: 0.97 }} 
                            onClick={() => onOpenClass(cls)} 
                            className="cursor-pointer group bg-white rounded-3xl p-8 shadow-float border border-slate-100 flex flex-col items-center justify-center text-center"
                        >
                            <div className="w-16 h-16 bg-purple-50 text-brandPurple rounded-2xl flex items-center justify-center mb-5 group-hover:bg-brandPurple group-hover:text-white transition-colors duration-300 shadow-sm"><Users size={32}/></div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight group-hover:text-brandPurple transition-colors">{cls.className}</h2>
                            <p className="text-xs text-slate-400 mt-3 font-bold uppercase tracking-widest bg-slate-50 px-4 py-1.5 rounded-full">Sınıfa Gir</p>
                        </motion.div> 
                    ))}
                </div>
            </motion.div>

            {/* ÖZEL DERSLER (VIP) */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 24, delay: 0.1 }}>
                <div className="flex justify-between items-center bg-gradient-to-r from-yellow-50 to-amber-50 p-5 rounded-2xl shadow-sm border border-yellow-200 mb-6">
                    <h2 className="text-lg md:text-xl font-black text-amber-900 flex items-center gap-2"><Crown className="text-amber-500"/> Özel Ders Yönetimi</h2>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onNewVipClass} className="real-gold-bg text-slate-900 px-5 py-2.5 rounded-xl text-sm font-black shadow-vip-glow flex items-center gap-2"><Plus size={18}/> Yeni Özel Ders</motion.button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {vipClasses.map((cls) => ( 
                        <motion.div 
                            key={cls.id} 
                            whileHover={{ scale: 1.02, y: -4 }} 
                            whileTap={{ scale: 0.97 }} 
                            onClick={() => onOpenClass(cls)} 
                            className="cursor-pointer group bg-white rounded-3xl p-8 shadow-float border border-yellow-200 flex flex-col items-center justify-center text-center relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-b from-yellow-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                            <div className="w-16 h-16 bg-yellow-50 text-amber-500 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300 relative z-10 shadow-sm"><Crown size={32}/></div>
                            <h2 className="text-2xl font-black text-amber-800 tracking-tight relative z-10">{cls.className}</h2>
                            <p className="text-xs text-amber-600 mt-3 font-bold uppercase tracking-widest bg-yellow-50 px-4 py-1.5 rounded-full border border-yellow-100 relative z-10">Özel Ders Paneli</p>
                        </motion.div> 
                    ))}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default TeacherDashboard;
