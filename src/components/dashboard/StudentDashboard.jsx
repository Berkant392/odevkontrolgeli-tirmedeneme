import React from 'react';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';

const StudentDashboard = ({ classes, currentUserRole, onOpenClass }) => {
    return (
        <motion.div 
            key="student-home"
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1, transition: { staggerChildren: 0.1 } }} 
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
            {classes.map((cls) => ( 
                <motion.div 
                    key={cls.id} 
                    whileHover={{ scale: 1.03, y: -5 }} 
                    whileTap={{ scale: 0.97 }} 
                    onClick={() => onOpenClass(cls)} 
                    className={`cursor-pointer group rounded-3xl p-8 flex flex-col items-center justify-center text-center ${currentUserRole === 'vip-student' ? 'bg-slate-800 border border-slate-700 shadow-xl' : 'bg-white border-slate-100 shadow-float'}`}
                >
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-all duration-300 shadow-sm ${currentUserRole === 'vip-student' ? 'bg-slate-700 text-vipGold group-hover:bg-vipGold group-hover:text-slate-900 shadow-sm' : 'bg-purple-50 text-brandPurple group-hover:bg-brandPurple group-hover:text-white'}`}><Users size={32}/></div>
                    <h2 className={`text-2xl font-black tracking-tight transition-colors ${currentUserRole === 'vip-student' ? 'text-white group-hover:real-gold-text' : 'text-slate-800 group-hover:text-brandPurple'}`}>{cls.className}</h2>
                    <p className={`text-xs mt-3 font-bold uppercase tracking-widest px-4 py-1.5 rounded-full ${currentUserRole === 'vip-student' ? 'bg-slate-700 text-vipGold border border-slate-600' : 'bg-slate-50 text-slate-400'}`}>Sınıfa Gir</p>
                </motion.div> 
            ))}
        </motion.div> 
    );
};

export default StudentDashboard;
