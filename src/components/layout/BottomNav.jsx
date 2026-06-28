import React from 'react';
import { Home, BookOpen, Target, Map, Crown, Bell, Youtube, BrainCircuit } from 'lucide-react';
import { motion } from 'framer-motion';

const BottomNav = ({ activeTab, setActiveTab, isVip, isTeacherMode }) => {
    const studentItems = [
        { id: 'home', icon: <Home size={22} />, label: 'Ana Sayfa' },
        { id: 'homework', icon: <BookOpen size={22} />, label: 'Ödevler' },
        { id: 'curriculum', icon: <Map size={22} />, label: 'Müfredat' },
        { id: 'playlists', icon: <Youtube size={22} />, label: 'Playlistler' },
        { id: 'trialTracker', icon: <Target size={22} />, label: 'Net Takibi' },
        { id: 'questions', icon: <BrainCircuit size={22} />, label: 'Sorular' }
    ];

    const teacherItems = [
        { id: 'home', icon: <Home size={22} />, label: 'Sınıflarım' },
        { id: 'vip-classes', icon: <Crown size={22} />, label: 'VIP Dersler' },
        { id: 'send-notification', icon: <Bell size={22} />, label: 'Bildirimler' },
        { id: 'library', icon: <BookOpen size={22} />, label: 'Kütüphane' }
    ];

    const navItems = isTeacherMode ? teacherItems : studentItems;

    const handleTabClick = (id) => {
        if (window.handleBottomNavNavigate) {
            window.handleBottomNavNavigate(id);
        }
        setActiveTab(id);
    };

    return (
        <div className={`fixed bottom-0 left-0 w-full z-50 xl:hidden ${isVip ? 'glass-panel-vip border-t border-yellow-500/20' : 'glass-panel border-t border-slate-200'} shadow-[0_-10px_40px_rgba(0,0,0,0.05)]`}
             style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="flex justify-around items-center h-[65px] px-1">
                {navItems.map((item) => {
                    const isActive = activeTab === item.id;
                    const activeColor = isVip ? 'text-amber-500' : 'text-brandPurple';
                    const inactiveColor = 'text-slate-400';
                    
                    return (
                        <motion.button
                            key={item.id}
                            onClick={() => handleTabClick(item.id)}
                            className="relative flex flex-col items-center justify-center w-full h-full gap-0.5"
                            whileTap={{ scale: 0.9 }}
                        >
                            {isActive && (
                                <motion.div 
                                    layoutId="bottomNavIndicator"
                                    className={`absolute -top-[1px] w-10 h-[3px] rounded-b-full ${isVip ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-brandPurple shadow-[0_0_10px_rgba(139,92,246,0.5)]'}`}
                                />
                            )}
                            <div className={`${isActive ? activeColor : inactiveColor} transition-colors duration-300`}>
                                {item.icon}
                            </div>
                            <span className={`text-[9px] font-bold ${isActive ? activeColor : inactiveColor} transition-colors duration-300`}>
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
