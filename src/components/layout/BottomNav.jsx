import React, { useState, useEffect } from 'react';
import { LayoutDashboard, BookOpenCheck, Compass, MonitorPlay, Target, Layers, Users, Crown, Library, BellRing, Settings, Menu, X, Plus, Edit2, Check, LogOut, Home, Hexagon, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ALL_STUDENT_ITEMS = [
    { id: 'home', icon: <LayoutDashboard size={22} />, label: 'Ana Sayfa', required: true },
    { id: 'homework', icon: <BookOpenCheck size={22} />, label: 'Ödevler' },
    { id: 'curriculum', icon: <Compass size={22} />, label: 'Müfredat' },
    { id: 'playlists', icon: <MonitorPlay size={22} />, label: 'Videolar' },
    { id: 'trialTracker', icon: <Target size={22} />, label: 'Denemeler' },
    { id: 'subject-study', icon: <Hexagon size={22} />, label: 'Konular' },
    { id: 'questions', icon: <Layers size={22} />, label: 'Soru Kartlarım' },
    { id: 'report-bug', icon: <AlertTriangle size={22} />, label: 'Hata Bildir', isAction: true }
];

const TEACHER_ITEMS = [
    { id: 'vip-classes', icon: <Crown size={22} />, label: 'VIP Dersler' },
    { id: 'library', icon: <Library size={22} />, label: 'Kütüphane' },
    { id: 'home', icon: <Users size={22} />, label: 'Sınıflarım' },
    { id: 'subject-study', icon: <Hexagon size={22} />, label: 'Konular' },
    { id: 'send-notification', icon: <BellRing size={22} />, label: 'Bildirimler' },
    { id: 'bug-reports', icon: <AlertTriangle size={22} />, label: 'Gelen Hatalar' },
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

const BottomNav = ({ activeTab, setActiveTab, isVip, isTeacherMode, setIsSidebarOpen, handleOpenSettings, handleLogout, showAlert, onReportBug }) => {
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
        finalNavItems = [
            TEACHER_ITEMS.find(i => i.id === 'vip-classes'),
            TEACHER_ITEMS.find(i => i.id === 'library'),
            TEACHER_ITEMS.find(i => i.id === 'home'),
            TEACHER_ITEMS.find(i => i.id === 'subject-study'),
            'menu'
        ];
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
                                {!isTeacherMode && (
                                    <button 
                                        onClick={() => setIsEditing(!isEditing)}
                                        className="icon-action"
                                        title="Menüyü Düzenle"
                                    >
                                        {isEditing ? <Check size={21} /> : <Edit2 size={21} />}
                                    </button>
                                )}
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
                            {(isTeacherMode ? TEACHER_ITEMS : ALL_STUDENT_ITEMS).map((item) => {
                                if (item.id === 'settings') return null;
                                
                                const isPinned = !isTeacherMode && pinnedIds.includes(item.id);
                                const isHome = item.id === 'home';
                                
                                return (
                                    <button
                                        key={`more-${item.id}`}
                                        onClick={() => {
                                            if (isEditing && !item.isAction) {
                                                togglePin(item.id);
                                            } else {
                                                if (item.id === 'report-bug') {
                                                    setShowMoreMenu(false);
                                                    if (onReportBug) onReportBug();
                                                } else {
                                                    handleTabClick(item.id);
                                                    if (['home', 'playlists', 'trialTracker', 'questions'].includes(item.id)) {
                                                        setTimeout(() => setShowMoreMenu(false), 180);
                                                    }
                                                }
                                            }
                                        }}
                                        className={`menu-card ${isEditing && isPinned ? 'active' : ''} ${!isEditing && activeTab === item.id ? 'active' : ''}`}
                                    >
                                        {isEditing && !isHome && !item.isAction && (
                                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center bg-white shadow-md z-10 text-slate-800">
                                                {isPinned ? <Check size={12} strokeWidth={4} className="text-emerald-600" /> : <Plus size={12} strokeWidth={4} />}
                                            </div>
                                        )}
                                        <div className={item.id === 'report-bug' ? 'text-amber-500' : ''}>
                                            {item.icon}
                                        </div>
                                        <span className={item.id === 'report-bug' ? 'text-amber-600 font-bold' : ''}>{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                </>

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
