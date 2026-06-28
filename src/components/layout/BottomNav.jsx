import React, { useState, useEffect } from 'react';
import { Home, BookOpen, Target, Map, Crown, Bell, Youtube, BrainCircuit, Menu, X, Plus, Edit2, Check, Settings, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ALL_STUDENT_ITEMS = [
    { id: 'home', icon: <Home size={22} />, label: 'Ana Sayfa', required: true },
    { id: 'homework', icon: <BookOpen size={22} />, label: 'Ödevler' },
    { id: 'curriculum', icon: <Map size={22} />, label: 'Müfredat' },
    { id: 'playlists', icon: <Youtube size={22} />, label: 'Videolar' },
    { id: 'trialTracker', icon: <Target size={22} />, label: 'Denemeler' },
    { id: 'questions', icon: <BrainCircuit size={22} />, label: 'Kütüphane' }
];

const TEACHER_ITEMS = [
    { id: 'vip-classes', icon: <Crown size={22} />, label: 'VIP Dersler' },
    { id: 'library', icon: <BookOpen size={22} />, label: 'Kütüphane' },
    { id: 'home', icon: <Home size={22} />, label: 'Sınıflarım' },
    { id: 'send-notification', icon: <Bell size={22} />, label: 'Bildirimler' },
    { id: 'settings', icon: <Settings size={22} />, label: 'Ayarlar', isAction: true }
];

const Ripple = ({ trigger }) => {
    const [ripples, setRipples] = useState([]);

    useEffect(() => {
        if (trigger) {
            setRipples([...ripples, { ...trigger, id: Date.now() }]);
            setTimeout(() => {
                setRipples((prev) => prev.slice(1));
            }, 600);
        }
    }, [trigger]);

    return (
        <>
            {ripples.map((r) => (
                <span
                    key={r.id}
                    className="ripple"
                    style={{
                        '--x': `${r.x}px`,
                        '--y': `${r.y}px`,
                        animation: 'ripple 0.56s ease-out forwards'
                    }}
                />
            ))}
        </>
    );
};

const NavButton = ({ item, isActive, onClick, isHome, isMenu }) => {
    const [rippleTrigger, setRippleTrigger] = useState(null);

    const handlePointerDown = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setRippleTrigger({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    if (!item && !isMenu) return <div className="nav-btn-premium opacity-50 pointer-events-none" />;

    return (
        <button
            onPointerDown={handlePointerDown}
            onClick={() => onClick(item ? item.id : 'menu')}
            className={`nav-btn-premium ${isHome ? 'home' : ''} ${isActive ? 'active' : ''}`}
            aria-label={isMenu ? 'Menü' : item?.label}
        >
            <Ripple trigger={rippleTrigger} />
            {isHome ? (
                <span className="home-fab">
                    {item?.icon}
                </span>
            ) : isMenu ? (
                <Menu size={22} />
            ) : (
                item?.icon
            )}
            <span className="label">{isMenu ? 'Menü' : item?.label}</span>
        </button>
    );
};

const BottomNav = ({ activeTab, setActiveTab, isVip, isTeacherMode, setIsSidebarOpen, handleOpenSettings, handleLogout, showAlert }) => {
    const [pinnedIds, setPinnedIds] = useState(() => {
        const saved = localStorage.getItem('bh-pinned-nav');
        return saved ? JSON.parse(saved) : ['home', 'homework', 'questions', 'trialTracker'];
    });

    const [isEditing, setIsEditing] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);

    useEffect(() => {
        localStorage.setItem('bh-pinned-nav', JSON.stringify(pinnedIds));
    }, [pinnedIds]);

    useEffect(() => {
        if (showMoreMenu) {
            document.body.classList.add('menu-open');
        } else {
            document.body.classList.remove('menu-open');
        }
        return () => document.body.classList.remove('menu-open');
    }, [showMoreMenu]);

    const handleTabClick = (id) => {
        setShowMoreMenu(false);
        if (id === 'settings') {
            if (handleOpenSettings) handleOpenSettings();
            return;
        }
        if (window.handleBottomNavNavigate) {
            window.handleBottomNavNavigate(id);
        }
        setActiveTab(id);
    };

    const togglePin = (id) => {
        if (id === 'home') return;
        if (pinnedIds.includes(id)) {
            setPinnedIds(pinnedIds.filter(pid => pid !== id));
        } else {
            if (pinnedIds.length >= 4) {
                if (showAlert) showAlert('warning', 'Sınır Aşıldı', 'En fazla 4 menü sabitleyebilirsiniz!');
                else alert("En fazla 4 menü sabitleyebilirsiniz!");
                return;
            }
            setPinnedIds([...pinnedIds, id]);
        }
    };

    let finalNavItems = [];
    if (isTeacherMode) {
        finalNavItems = TEACHER_ITEMS;
    } else {
        const otherPinned = pinnedIds.filter(id => id !== 'home');
        finalNavItems = [
            ALL_STUDENT_ITEMS.find(i => i.id === otherPinned[0]) || null,
            ALL_STUDENT_ITEMS.find(i => i.id === otherPinned[1]) || null,
            ALL_STUDENT_ITEMS.find(i => i.id === 'home'),
            ALL_STUDENT_ITEMS.find(i => i.id === otherPinned[2]) || null,
            'menu'
        ];
    }

    return (
        <>
            {!isTeacherMode && (
                <>
                    <button 
                        className="menu-backdrop xl:hidden" 
                        onClick={() => { setShowMoreMenu(false); setIsEditing(false); }}
                        aria-label="Menüyü kapat"
                    />

                    <section className="menu-sheet xl:hidden">
                        <div className="drag-handle"></div>

                        <header className="menu-head">
                            <div>
                                <h2 className="menu-title">Tüm Menüler</h2>
                                <span className="menu-subtitle">
                                    {isEditing ? 'Alt barınıza sabitlemek istediğiniz menüleri seçin' : 'Hızlı erişim için menünü seç'}
                                </span>
                            </div>

                            <div className="menu-actions">
                                <button 
                                    onClick={() => { setShowMoreMenu(false); if(handleOpenSettings) handleOpenSettings(); }}
                                    className="icon-action"
                                    title="Ayarlar"
                                >
                                    <Settings size={21} />
                                </button>
                                <button 
                                    onClick={() => setIsEditing(!isEditing)}
                                    className="icon-action"
                                    title="Menüyü Düzenle"
                                >
                                    {isEditing ? <Check size={21} /> : <Edit2 size={21} />}
                                </button>
                                <button 
                                    onClick={() => { 
                                        setShowMoreMenu(false); 
                                        if (showAlert && handleLogout) {
                                            showAlert('warning', 'Oturumu Kapat', 'Hesabınızdan güvenli bir şekilde çıkış yapmak istediğinize emin misiniz?', () => handleLogout());
                                        } else if(handleLogout) {
                                            handleLogout();
                                        }
                                    }}
                                    className="icon-action logout-btn"
                                    title="Çıkış Yap"
                                >
                                    <LogOut size={21} />
                                </button>
                            </div>
                        </header>

                        <div className="menu-grid">
                            {ALL_STUDENT_ITEMS.map((item) => {
                                if (item.id === 'settings') return null;
                                
                                const isPinned = pinnedIds.includes(item.id);
                                const isHome = item.id === 'home';
                                
                                return (
                                    <button
                                        key={`more-${item.id}`}
                                        onClick={() => {
                                            if (isEditing) {
                                                togglePin(item.id);
                                            } else {
                                                handleTabClick(item.id);
                                                if (['home', 'playlists', 'trialTracker', 'questions'].includes(item.id)) {
                                                    setTimeout(() => setShowMoreMenu(false), 180);
                                                }
                                            }
                                        }}
                                        className={`menu-card ${isEditing && isPinned ? 'active' : ''} ${!isEditing && activeTab === item.id ? 'active' : ''}`}
                                    >
                                        {isEditing && !isHome && (
                                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center bg-white shadow-md z-10 text-slate-800">
                                                {isPinned ? <Check size={12} strokeWidth={4} className="text-emerald-600" /> : <Plus size={12} strokeWidth={4} />}
                                            </div>
                                        )}
                                        {item.icon}
                                        <span>{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                </>
            )}

            <nav className="bottom-nav-premium xl:hidden" aria-label="Alt menü">
                {finalNavItems.map((item, index) => {
                    if (item === 'menu') {
                        return (
                            <NavButton
                                key="menu"
                                isMenu={true}
                                isActive={showMoreMenu}
                                onClick={() => setShowMoreMenu(true)}
                            />
                        );
                    }
                    
                    return (
                        <NavButton
                            key={item ? item.id : `empty-${index}`}
                            item={item}
                            isActive={activeTab === item?.id}
                            isHome={item?.id === 'home'}
                            onClick={(id) => handleTabClick(id)}
                        />
                    );
                })}
            </nav>
        </>
    );
};

export default BottomNav;
