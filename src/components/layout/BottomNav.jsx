import React from 'react';
import { Home, BookOpen, Target, Map, Crown, Bell, Mic } from 'lucide-react';
import { motion } from 'framer-motion';

const BottomNav = ({ activeTab, setActiveTab, isVip, isTeacherMode }) => {
    const studentItems = [
        { id: 'home', icon: <Home size={22} />, label: 'Ana Sayfa' },
        { id: 'homework', icon: <BookOpen size={22} />, label: 'Ödevler' },
        { id: 'curriculum', icon: <Map size={22} />, label: 'Müfredat' },
        { id: 'trialTracker', icon: <Target size={22} />, label: 'Net Takibi' }
    ];

    const teacherItems = [
        { id: 'home', icon: <Home size={22} />, label: 'Sınıflar' },
        { id: 'vip-classes', icon: <Crown size={22} />, label: 'VIP' },
        { id: 'send-notification', icon: <Bell size={22} />, label: 'Bildirim' },
        { id: 'library', icon: <BookOpen size={22} />, label: 'Kütüphane' }
    ];

    const navItems = isTeacherMode ? teacherItems : studentItems;

    const handleTabClick = (id) => {
        if (window.handleBottomNavNavigate) {
            window.handleBottomNavNavigate(id);
        }
        setActiveTab(id);
    };

    const handleJarvisClick = () => {
        // Jarvis modali tetikleyecek global event
        const event = new CustomEvent('open-jarvis');
        window.dispatchEvent(event);
    };

    // Nav barı ortadan ikiye bölüp ortaya Jarvis butonunu koyalım
    const leftItems = navItems.slice(0, 2);
    const rightItems = navItems.slice(2, 4);

    return (
        <div className="fixed bottom-4 left-4 right-4 z-[90] md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className={`flex justify-between items-center h-[70px] px-2 rounded-3xl ${isVip ? 'glass-panel-vip' : 'glass-panel shadow-smart-shadow'}`}>
                
                {/* Sol Menü */}
                <div className="flex w-2/5 justify-around items-center h-full">
                    {leftItems.map((item) => {
                        const isActive = activeTab === item.id;
                        const activeColor = isVip ? 'text-amber-500' : 'text-deepNavy';
                        const inactiveColor = 'text-slate-400';
                        return (
                            <motion.button
                                key={item.id}
                                onClick={() => handleTabClick(item.id)}
                                className="relative flex flex-col items-center justify-center w-full h-full gap-1"
                                whileTap={{ scale: 0.85 }}
                            >
                                <div className={`${isActive ? activeColor : inactiveColor} transition-colors duration-300`}>
                                    {item.icon}
                                </div>
                                <span className={`text-[10px] font-bold ${isActive ? activeColor : inactiveColor} transition-colors duration-300`}>
                                    {item.label}
                                </span>
                                {isActive && (
                                    <motion.div layoutId="bottomNavIndicator" className={`absolute -bottom-1 w-8 h-1 rounded-t-full ${isVip ? 'bg-amber-500' : 'bg-deepNavy'}`} />
                                )}
                            </motion.button>
                        );
                    })}
                </div>

                {/* Orta Jarvis (Asistan) Butonu */}
                <div className="w-1/5 flex justify-center -mt-6">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleJarvisClick}
                        className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl ${isVip ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' : 'bg-gradient-to-br from-[#0c3d64] to-[#00b4d8]'}`}
                        style={{ border: '4px solid #f4f7f9' }}
                    >
                        <Mic size={24} />
                    </motion.button>
                </div>

                {/* Sağ Menü */}
                <div className="flex w-2/5 justify-around items-center h-full">
                    {rightItems.map((item) => {
                        const isActive = activeTab === item.id;
                        const activeColor = isVip ? 'text-amber-500' : 'text-deepNavy';
                        const inactiveColor = 'text-slate-400';
                        return (
                            <motion.button
                                key={item.id}
                                onClick={() => handleTabClick(item.id)}
                                className="relative flex flex-col items-center justify-center w-full h-full gap-1"
                                whileTap={{ scale: 0.85 }}
                            >
                                <div className={`${isActive ? activeColor : inactiveColor} transition-colors duration-300`}>
                                    {item.icon}
                                </div>
                                <span className={`text-[10px] font-bold ${isActive ? activeColor : inactiveColor} transition-colors duration-300`}>
                                    {item.label}
                                </span>
                                {isActive && (
                                    <motion.div layoutId="bottomNavIndicator" className={`absolute -bottom-1 w-8 h-1 rounded-t-full ${isVip ? 'bg-amber-500' : 'bg-deepNavy'}`} />
                                )}
                            </motion.button>
                        );
                    })}
                </div>

            </div>
        </div>
    );
};

export default BottomNav;
