import React, { useState, useEffect } from 'react';
import { LayoutDashboard, BookOpenCheck, Compass, MonitorPlay, Target, Layers, Users, Crown, Library, BellRing, Settings, Menu, X, Plus, Edit2, Check, LogOut, Home, Hexagon, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors, DragOverlay, defaultDropAnimationSideEffects } from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createPortal } from 'react-dom';
import { db } from '../../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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



const SortableItem = ({ item, isEditing, isPinned, activeTab, togglePin, handleTabClick, setShowMoreMenu, onReportBug }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id, disabled: !isEditing });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 0 : 1,
        opacity: isDragging ? 0 : 1, // Hide the original item while dragging
        touchAction: isEditing ? 'none' : 'manipulation', // CRITICAL for dnd-kit pointer sensors!
    };

    const isHome = item.id === 'home';

    return (
        <button
            ref={setNodeRef}
            style={style}
            {...(isEditing ? { ...attributes, ...listeners } : {})}
            onClick={() => {
                if (isEditing && !item.isAction) {
                    togglePin(item.id);
                } else if (!isEditing) {
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
            className={`menu-card ${isEditing && isPinned ? 'active' : ''} ${!isEditing && activeTab === item.id ? 'active' : ''} ${isEditing ? 'cursor-grab' : ''}`}
        >
            {isEditing && !isHome && !item.isAction && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center bg-white shadow-md z-10 text-slate-800 pointer-events-none">
                    {isPinned ? <Check size={12} strokeWidth={4} className="text-emerald-600" /> : <Plus size={12} strokeWidth={4} />}
                </div>
            )}
            <div className={item.id === 'report-bug' ? 'text-amber-500 pointer-events-none' : 'pointer-events-none'}>
                {item.icon}
            </div>
            <span className={item.id === 'report-bug' ? 'text-amber-600 font-bold pointer-events-none' : 'pointer-events-none'}>{item.label}</span>
        </button>
    );
};

const BottomNav = ({ activeTab, setActiveTab, isVip, isTeacherMode, setIsSidebarOpen, handleOpenSettings, handleLogout, showAlert, onReportBug, loggedInStudent }) => {
    const [pinnedIds, setPinnedIds] = useState(() => {
        const saved = localStorage.getItem('bh-pinned-nav');
        return saved ? JSON.parse(saved) : ['home', 'homework', 'questions', 'trialTracker'];
    });

    const [isEditing, setIsEditing] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);

    // Draggable Menu States
    const [studentItems, setStudentItems] = useState(() => {
        const saved = localStorage.getItem('bh-student-menu-order');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const mapped = parsed.map(id => ALL_STUDENT_ITEMS.find(i => i.id === id)).filter(Boolean);
                const missing = ALL_STUDENT_ITEMS.filter(i => !parsed.includes(i.id));
                return [...mapped, ...missing];
            } catch (e) { return ALL_STUDENT_ITEMS; }
        }
        return ALL_STUDENT_ITEMS;
    });

    const [teacherItems, setTeacherItems] = useState(() => {
        const saved = localStorage.getItem('bh-teacher-menu-order');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const mapped = parsed.map(id => TEACHER_ITEMS.find(i => i.id === id)).filter(Boolean);
                const missing = TEACHER_ITEMS.filter(i => !parsed.includes(i.id));
                return [...mapped, ...missing];
            } catch (e) { return TEACHER_ITEMS; }
        }
        return TEACHER_ITEMS;
    });

    // Firebase Fetch Preferences on Mount
    useEffect(() => {
        const fetchPreferences = async () => {
            const userId = isTeacherMode ? 'teacher' : (loggedInStudent ? loggedInStudent.id : null);
            if (!userId) return;
            
            try {
                const prefDoc = await getDoc(doc(db, 'berkant_hoca_user_preferences', userId));
                if (prefDoc.exists()) {
                    const data = prefDoc.data();
                    
                    if (isTeacherMode && data.teacherMenuOrder) {
                        const mapped = data.teacherMenuOrder.map(id => TEACHER_ITEMS.find(i => i.id === id)).filter(Boolean);
                        const missing = TEACHER_ITEMS.filter(i => !data.teacherMenuOrder.includes(i.id));
                        setTeacherItems([...mapped, ...missing]);
                    } 
                    else if (!isTeacherMode && data.studentMenuOrder) {
                        const mapped = data.studentMenuOrder.map(id => ALL_STUDENT_ITEMS.find(i => i.id === id)).filter(Boolean);
                        const missing = ALL_STUDENT_ITEMS.filter(i => !data.studentMenuOrder.includes(i.id));
                        setStudentItems([...mapped, ...missing]);
                    }
                    
                    if (data.pinnedIds) {
                        setPinnedIds(data.pinnedIds);
                    }
                }
            } catch (error) {
                console.error("Menü tercihleri çekilirken hata:", error);
            }
        };
        fetchPreferences();
    }, [isTeacherMode, loggedInStudent]);

    // Save to Firebase helper
    const savePreferencesToFirebase = async (dataToUpdate) => {
        const userId = isTeacherMode ? 'teacher' : (loggedInStudent ? loggedInStudent.id : null);
        if (!userId) return;
        
        try {
            await setDoc(doc(db, 'berkant_hoca_user_preferences', userId), dataToUpdate, { merge: true });
        } catch (error) {
            console.error("Menü tercihleri kaydedilirken hata:", error);
        }
    };

    // Listeners for state changes to save to DB and LocalStorage
    useEffect(() => {
        const orderIds = studentItems.map(i => i.id);
        localStorage.setItem('bh-student-menu-order', JSON.stringify(orderIds));
        if (!isTeacherMode && loggedInStudent) {
            savePreferencesToFirebase({ studentMenuOrder: orderIds });
        }
    }, [studentItems, isTeacherMode, loggedInStudent]);

    useEffect(() => {
        const orderIds = teacherItems.map(i => i.id);
        localStorage.setItem('bh-teacher-menu-order', JSON.stringify(orderIds));
        if (isTeacherMode) {
            savePreferencesToFirebase({ teacherMenuOrder: orderIds });
        }
    }, [teacherItems, isTeacherMode]);

    useEffect(() => {
        localStorage.setItem('bh-pinned-nav', JSON.stringify(pinnedIds));
        savePreferencesToFirebase({ pinnedIds });
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

    const [activeId, setActiveId] = useState(null);

    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250, 
                tolerance: 5,
            },
        })
    );

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveId(null);
        
        if (over && active.id !== over.id) {
            if (isTeacherMode) {
                setTeacherItems((items) => {
                    const oldIndex = items.findIndex(i => i.id === active.id);
                    const newIndex = items.findIndex(i => i.id === over.id);
                    return arrayMove(items, oldIndex, newIndex);
                });
            } else {
                setStudentItems((items) => {
                    const oldIndex = items.findIndex(i => i.id === active.id);
                    const newIndex = items.findIndex(i => i.id === over.id);
                    return arrayMove(items, oldIndex, newIndex);
                });
            }
        }
    };
    
    const dropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: '0.4',
                },
            },
        }),
    };

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

                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                        >
                            <div className="menu-grid">
                                <SortableContext
                                    items={(isTeacherMode ? teacherItems : studentItems).filter(i => i.id !== 'settings' && i.id !== 'home').map(i => i.id)}
                                    strategy={rectSortingStrategy}
                                >
                                    {(isTeacherMode ? teacherItems : studentItems).filter(i => i.id !== 'settings' && i.id !== 'home').map((item) => {
                                        
                                        return (
                                            <SortableItem
                                                key={`more-${item.id}`}
                                                item={item}
                                                isEditing={isEditing}
                                                isPinned={!isTeacherMode && pinnedIds.includes(item.id)}
                                                activeTab={activeTab}
                                                togglePin={togglePin}
                                                handleTabClick={handleTabClick}
                                                setShowMoreMenu={setShowMoreMenu}
                                                onReportBug={onReportBug}
                                            />
                                        );
                                    })}
                                </SortableContext>
                            </div>
                            
                            {createPortal(
                                <DragOverlay dropAnimation={dropAnimation}>
                                    {activeId ? (
                                        (() => {
                                            const item = (isTeacherMode ? teacherItems : studentItems).find(i => i.id === activeId);
                                            if (!item) return null;
                                            const isPinned = !isTeacherMode && pinnedIds.includes(item.id);
                                            const isHome = item.id === 'home';
                                            return (
                                                <div className={`menu-card shadow-2xl scale-[1.08] rotate-2 cursor-grabbing ${isPinned ? 'active' : ''}`} style={{ zIndex: 9999, margin: 0, width: '100%', height: '100%' }}>
                                                    {isEditing && !isHome && !item.isAction && (
                                                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center bg-white shadow-md z-10 text-slate-800 pointer-events-none">
                                                            {isPinned ? <Check size={12} strokeWidth={4} className="text-emerald-600" /> : <Plus size={12} strokeWidth={4} />}
                                                        </div>
                                                    )}
                                                    <div className={item.id === 'report-bug' ? 'text-amber-500' : ''}>
                                                        {item.icon}
                                                    </div>
                                                    <span className={item.id === 'report-bug' ? 'text-amber-600 font-bold' : ''}>{item.label}</span>
                                                </div>
                                            );
                                        })()
                                    ) : null}
                                </DragOverlay>,
                                document.body
                            )}
                        </DndContext>
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
