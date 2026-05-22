import React from 'react';
import { Home, BookOpen, Bell, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

const BottomNav = ({ activeTab, setActiveTab, isVip }) => {
    const navItems = [
        { id: 'home', icon: <Home size={24} />, label: 'Ana Sayfa' },
        { id: 'curriculum', icon: <BookOpen size={24} />, label: 'Ödevler' },
        { id: 'notifications', icon: <Bell size={24} />, label: 'Bildirimler' },
        { id: 'profile', icon: <Settings size={24} />, label: 'Profil' }
    ];

    const handleTabClick = (id) => {
        if (id === 'profile') {
            // Profil tıklandığında settings açılabilir
            // Bunu App.jsx'ten prop olarak almamız lazım, şimdilik aktif tab yapalım veya
            // App.jsx'e onProfileClick prop'u ekleyeceğiz
            if (window.handleOpenStudentProfile) window.handleOpenStudentProfile();
            return;
        }
        if (id === 'notifications') {
            if (window.handleOpenNotifications) window.handleOpenNotifications();
            return;
        }
        setActiveTab(id);
    };

    return (
        <div className={`fixed bottom-0 left-0 w-full z-50 md:hidden ${isVip ? 'glass-panel-vip border-t border-yellow-500/20' : 'glass-panel border-t border-slate-200'} shadow-[0_-10px_40px_rgba(0,0,0,0.05)]`}
             style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="flex justify-around items-center h-[70px] px-2">
                {navItems.map((item) => {
                    const isActive = activeTab === item.id;
                    const activeColor = isVip ? 'text-amber-500' : 'text-brandPurple';
                    const inactiveColor = isVip ? 'text-slate-400' : 'text-slate-400';
                    
                    return (
                        <motion.button
                            key={item.id}
                            onClick={() => handleTabClick(item.id)}
                            className="relative flex flex-col items-center justify-center w-full h-full gap-1"
                            whileTap={{ scale: 0.9 }}
                        >
                            {isActive && (
                                <motion.div 
                                    layoutId="bottomNavIndicator"
                                    className={`absolute -top-[1px] w-12 h-1 rounded-b-full ${isVip ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-brandPurple shadow-[0_0_10px_rgba(139,92,246,0.5)]'}`}
                                />
                            )}
                            <div className={`${isActive ? activeColor : inactiveColor} transition-colors duration-300`}>
                                {item.icon}
                            </div>
                            <span className={`text-[10px] font-bold ${isActive ? activeColor : inactiveColor} transition-colors duration-300`}>
                                {item.label}
                            </span>
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
};

export default BottomNav;
