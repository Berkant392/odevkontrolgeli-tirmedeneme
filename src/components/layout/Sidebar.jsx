import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Home, 
    BookOpen, 
    Settings, 
    LogOut, 
    ClipboardList, 
    Target, 
    Map, 
    X,
    ChevronRight,
    ChevronLeft,
    Plus,
    FolderPlus,
    Bell,
    Crown,
    Rocket,
    MessageCircle
} from 'lucide-react';

const Sidebar = ({ 
    isOpen, 
    setIsOpen, 
    isMobile, 
    currentUserRole, 
    activeTab, 
    setActiveTab, 
    handleLogout, 
    handleOpenSettings,
    handleOpenLibrary
}) => {
    const [isHovered, setIsHovered] = useState(false);

    // Sidebar'ın PC'de tam açık, kapalı(hover) veya mobilde açık olma durumu
    const isExpanded = isMobile ? isOpen : (isHovered || isOpen);

    const teacherMenu = [
        { id: 'home', label: 'Sınıflarım', icon: Home },
        { id: 'vip-classes', label: 'Özel Derslerim', icon: Crown },
        { id: 'reminders', label: 'Hatırlatıcılar', icon: ClipboardList },
        { id: 'whatsapp', label: 'WhatsApp Mesajı', icon: MessageCircle },
        { id: 'send-notification', label: 'Bildirim Gönder', icon: Bell },
        { id: 'library', label: 'Kütüphane', icon: BookOpen },
    ];

    const studentMenu = [];

    const menuItems = currentUserRole === 'teacher' ? teacherMenu : studentMenu;

    const handleMenuClick = (item) => {
        if (item.action) {
            item.action();
        } else {
            setActiveTab(item.id);
        }
        if (isMobile) {
            setIsOpen(false);
        }
    };

    const sidebarContent = (
        <div className={`h-full flex flex-col justify-between ${currentUserRole === 'vip-student' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border-r shadow-xl relative`}>
            
            {/* Üst Kısım: Logo & Kapatma/Daraltma Butonu */}
            <div className="flex items-center justify-between p-4 h-16 shrink-0 border-b border-opacity-50">
                <div className={`flex items-center gap-3 overflow-hidden ${isExpanded ? 'w-auto' : 'w-0 opacity-0'} transition-all duration-300`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${currentUserRole === 'vip-student' ? 'real-gold-bg' : 'bg-gradient-to-tr from-brandPurple to-blue-600'}`}>
                        <img src="/pwa-192x192.png" alt="Logo" className="w-5 h-5 object-contain" />
                    </div>
                    <span className={`font-black tracking-tight whitespace-nowrap ${currentUserRole === 'vip-student' ? 'real-gold-text' : 'text-slate-800'}`}>
                        Berkant Hoca
                    </span>
                </div>
                
                {/* Mobilde Çarpı, PC'de Pin/Unpin Oku */}
                {isMobile ? (
                    <button onClick={() => setIsOpen(false)} className={`p-1 rounded-full ${currentUserRole === 'vip-student' ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-800'}`}>
                        <X size={20} />
                    </button>
                ) : (
                    <button onClick={() => setIsOpen(!isOpen)} className={`absolute -right-3 top-5 p-1 rounded-full border shadow-sm transition-transform ${currentUserRole === 'vip-student' ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-800'} ${isExpanded && !isOpen ? 'rotate-180' : ''}`}>
                        {isOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                    </button>
                )}
            </div>

            {/* Orta Kısım: Menü Öğeleri */}
            <div className="flex-1 py-6 flex flex-col gap-2 overflow-y-auto overflow-x-hidden px-3">
                {menuItems.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60 space-y-3 mt-10">
                        <Rocket size={40} strokeWidth={1.5} className={currentUserRole === 'vip-student' ? 'text-amber-500 mb-2' : 'text-brandPurple mb-2'} />
                        <span className="text-[10px] font-bold text-center px-4 uppercase tracking-widest text-slate-500">Çok Yakında</span>
                        <span className="text-xs font-medium text-center px-6 leading-relaxed">Yeni öğrenci araçları ve özellikler buraya eklenecek.</span>
                    </div>
                )}
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => handleMenuClick(item)}
                            className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 relative group
                                ${isActive 
                                    ? (currentUserRole === 'vip-student' ? 'bg-slate-800 text-vipGold' : 'bg-brandPurple/10 text-brandPurple font-bold')
                                    : (currentUserRole === 'vip-student' ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800')}
                            `}
                        >
                            <div className="shrink-0 relative">
                                <Icon size={20} className={isActive && currentUserRole === 'vip-student' ? 'drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]' : ''} />
                            </div>
                            
                            <span className={`whitespace-nowrap transition-opacity duration-300 ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}`}>
                                {item.label}
                            </span>

                            {/* PC'de dar modda tooltip (hover) */}
                            {!isExpanded && !isMobile && (
                                <div className={`absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50`}>
                                    {item.label}
                                </div>
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Alt Kısım: Ayarlar & Çıkış */}
            <div className={`p-3 border-t border-opacity-50 flex flex-col gap-2 ${currentUserRole === 'vip-student' ? 'border-slate-800' : 'border-slate-100'}`}>
                <button
                    onClick={() => { handleOpenSettings(); if (isMobile) setIsOpen(false); }}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 group
                        ${currentUserRole === 'vip-student' ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
                >
                    <Settings size={20} className="shrink-0 group-hover:rotate-90 transition-transform duration-500" />
                    <span className={`whitespace-nowrap transition-opacity duration-300 ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}`}>
                        {currentUserRole === 'teacher' ? 'Ayarlar' : 'Hesabım'}
                    </span>
                </button>

                <button
                    onClick={handleLogout}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 group
                        ${currentUserRole === 'vip-student' ? 'text-rose-400 hover:bg-rose-500/10 hover:text-rose-300' : 'text-rose-500 hover:bg-rose-50 hover:text-rose-600'}`}
                >
                    <LogOut size={20} className="shrink-0" />
                    <span className={`whitespace-nowrap transition-opacity duration-300 ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}`}>
                        Çıkış Yap
                    </span>
                </button>
            </div>
        </div>
    );

    // Mobilde Sidebar (Drawer)
    if (isMobile) {
        return (
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 z-[90] backdrop-blur-sm"
                            onClick={() => setIsOpen(false)}
                        />
                        <motion.div
                            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 left-0 w-64 z-[100]"
                        >
                            {sidebarContent}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        );
    }

    // Bilgisayarda Sidebar (Collapsible)
    return (
        <motion.div 
            className="h-screen sticky top-0 z-[60]"
            initial={false}
            animate={{ width: isExpanded ? 240 : 72 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {sidebarContent}
        </motion.div>
    );
};

export default Sidebar;
