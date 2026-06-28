import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Library, Settings, LogOut, Mic, X, Edit3, Pencil, Trash2, AlertTriangle, CheckCircle, Info, RefreshCw, WifiOff, Bell, Menu } from 'lucide-react';

import Sidebar from './components/layout/Sidebar';
import BottomNav from './components/layout/BottomNav';

// FİREBASE
import { db } from './config/firebase';
import { collection, doc, updateDoc, addDoc, deleteDoc, getDocs, query, orderBy, onSnapshot } from 'firebase/firestore';

// 🔥 CUSTOM HOOKS
import { usePWA } from './hooks/usePWA';
import { useFirebaseData } from './hooks/useFirebaseData';
import { useAppAuth } from './hooks/useAppAuth';
import { useAppModals } from './hooks/useAppModals';
import { useTheme } from './context/ThemeContext';

// YARDIMCILAR VE SABİTLER
import { LIBRARY_TYPES, CLASSES_COLLECTION, LIBRARY_COLLECTION, SETTINGS_COLLECTION, SETTINGS_DOC, NOTIFICATIONS_COLLECTION, DEFAULT_PIN, STATUS_OPTIONS } from './utils/constants';
import { generateId, calculateStats } from './utils/helpers';
import { generatePasswordCards, generateStudentReport } from './utils/pdfGenerator';
import { useHomeworkNotifications } from './hooks/useHomeworkNotifications';

// AI UYARISI: DO NOT MODIFY OneSignal INITIALIZATION UNLESS NECESSARY
const APP_VERSION = '2.0.0'; // PWA sürüm kontrolü için

// 🧩 PARÇALANMIŞ BİLEŞENLERİMİZ
import LoginScreen from './components/auth/LoginScreen';
import TeacherDashboard from './components/dashboard/TeacherDashboard';
import StudentDashboard from './components/dashboard/StudentDashboard';
import ClassDetail from './components/views/ClassDetail';
import StudentDetail from './components/views/StudentDetail';
import LibraryView from './components/views/LibraryView';
import VipDashboard from './components/dashboard/VipDashboard';
import SendNotificationView from './components/views/SendNotificationView';
import ClassProgressChart from './components/analytics/ClassProgressChart';
import CountdownTimer from './components/ui/Countdown';
import JarvisModal from './components/assistant/JarvisModal';
import TrialTracker from './components/views/TrialTracker';
import PlaylistsView from './components/views/PlaylistsView';
import ReminderDashboard from './components/views/ReminderDashboard';
import WhatsAppPanel from './components/views/WhatsAppPanel';
import QuestionsView from './components/views/QuestionsView';
import { lockScroll, unlockScroll } from './utils/scrollLock';

const App = () => {
    // 🔥 DATA HOOKS
    const { classes, libraryItems, notifications, allTrials, dbTeacherPin, countdownConfig, globalReminders } = useFirebaseData();
    const { isOnline, deferredPrompt, isStandalone } = usePWA();
    const { accentColor, changeAccentColor, mode, toggleMode } = useTheme();

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('home');
    const [view, setView] = useState('home');

    const [selectedClass, setSelectedClass] = useState(null);
    const [selectedStudentForView, setSelectedStudentForView] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1280);
    useEffect(() => { const handleResize = () => setIsMobile(window.innerWidth < 1280); window.addEventListener('resize', handleResize); return () => window.removeEventListener('resize', handleResize); }, []);

    const [newStudentName, setNewStudentName] = useState("");
    const [newStudentPhone, setNewStudentPhone] = useState("");



    // DATABASE HELPER (Passed to modular hooks)
    const updateClassInDb = async (updatedClass) => { 
        try { 
            await updateDoc(doc(db, CLASSES_COLLECTION, updatedClass.id), updatedClass); 
            if (selectedClass?.id === updatedClass.id) setSelectedClass(updatedClass); 
        } catch (e) { 
            console.error("Sınıf güncellenemedi:", e); 
        } 
    };

    // CUSTOM DIALOG SYSTEM STATE (Used by verifyPin and other auth logic)
    const [dialogData, setDialogData] = useState({ isOpen: false, type: 'info', title: '', message: '', onConfirm: null });
    const showAlert = (type, title, message, onConfirm = null) => { setDialogData({ isOpen: true, type, title, message, onConfirm }); };
    const closeAlert = () => { setDialogData({ isOpen: false, type: 'info', title: '', message: '', onConfirm: null }); };

    // 🔥 MODULAR AUTH HOOK
    const {
        currentUserRole,
        setCurrentUserRole,
        isTeacherMode,
        setIsTeacherMode,
        loggedInStudent,
        setLoggedInStudent,
        isSessionRestoring,
        verifyPin,
        handleStudentLogin,
        handleLogout
    } = useAppAuth({
        classes,
        dbTeacherPin,
        isStandalone,
        regularClasses: classes.filter(c => c.type !== 'vip'),
        vipClasses: classes.filter(c => c.type === 'vip'),
        setView,
        setActiveTab,
        setSelectedClass,
        setSelectedStudentForView,
        updateClassInDb,
        showAlert,
        changeAccentColor
    });

    // 🔥 MODULAR MODALS HOOK
    const {
        modalType,
        setModalType,
        modalData,
        setModalData,
        modalInputVal,
        setModalInputVal,
        modalTitleVal,
        setModalTitleVal,
        modalDateVal,
        setModalDateVal,
        modalPdfVal,
        setModalPdfVal,
        modalPhoneVal,
        setModalPhoneVal,
        modalEditUsername,
        setModalEditUsername,
        modalEditPassword,
        setModalEditPassword,
        handleModalSubmit
    } = useAppModals({
        classes,
        countdownConfig,
        updateClassInDb,
        scheduleDeadlinePush: async (cls, topicTitle, targetDateStr) => {
            if (!targetDateStr) return;
            try {
                const targetDate = new Date(targetDateStr);
                // Tam 24 saat öncesini hesapla
                const sendTime = new Date(targetDate.getTime() - 24 * 60 * 60 * 1000);

                if (sendTime.getTime() <= Date.now()) return; // Zaten geçmişse planlama yapma

                const studentIds = cls.students.map(s => s.id);
                if (studentIds.length === 0) return;

                const sendAfterStr = sendTime.toString();

                const payload = {
                    title: "⏳ Ödev Hatırlatması!",
                    text: `${topicTitle} adlı görev için son 24 saate girildi. Lütfen tamamlayıp derse gelirken yanında getirmeyi unutma!`,
                    targetClasses: [],
                    targetVipStudents: [],
                    targetStudentIds: studentIds,
                    send_after: sendAfterStr
                };

                await fetch('/.netlify/functions/sendNotification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                console.log("Bildirim planlandı:", sendAfterStr);
            } catch (err) {
                console.error("Bildirim planlanamadı", err);
            }
        }
    });

    // 📱 KÜÇÜK EKRANLARDA MODAL AÇILINCA ALT MENÜYÜ GİZLEME MANTIĞI
    useEffect(() => {
        // Checking if these states exist and are truthy to prevent undefined errors if they aren't declared yet in this scope, wait! 
        // studentSettingsModal and showLibraryManager are declared later in App.jsx... this is a React hook dependency issue.
        // Actually, JavaScript allows accessing let/const before if it's inside a function that runs later, but for useEffect dependencies they must be available.
        // I will just use document.querySelectorAll('.fixed.inset-0').length > 0 inside a MutationObserver instead! It's much more reliable!
        
        const checkModals = () => {
            const hasModals = document.querySelectorAll('.fixed.inset-0, .modal-overlay').length > 0;
            if (hasModals) {
                document.body.classList.add('modal-open');
            } else {
                document.body.classList.remove('modal-open');
            }
        };

        const observer = new MutationObserver(checkModals);
        observer.observe(document.body, { childList: true, subtree: true });
        
        return () => observer.disconnect();
    }, []);

    // AKILLI YÖNETİCİ BİLDİRİM (HATIRLATICI) SİSTEMİ
    const [reminders, setRemindersState] = useState([]);
    const [isRemindersLoaded, setIsRemindersLoaded] = useState(false);

    useEffect(() => {
        if (globalReminders) {
            setRemindersState(globalReminders);
            setIsRemindersLoaded(true);
        }
    }, [globalReminders]);

    const setReminders = async (newReminders) => {
        try {
            await updateDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC), { reminders: newReminders });
            // Yeni eklenen hatırlatıcıları tespit et
            const addedReminders = newReminders.filter(nItem => !reminders.some(pItem => pItem.id === nItem.id));
            addedReminders.forEach(r => {
                if (r.targetTime && !r.isTriggered) {
                    const targetDate = new Date(r.targetTime);
                    if (targetDate.getTime() > Date.now()) {
                        const sendAfterStr = targetDate.toString();
                        fetch('/.netlify/functions/sendNotification', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                title: '🚨 Jarvis Hatırlatıcısı',
                                text: r.text,
                                targetClasses: [],
                                targetVipStudents: [],
                                targetStudentIds: ['teacher_admin'],
                                send_after: sendAfterStr
                            })
                        }).catch(console.error);
                    }
                }
            });
        } catch (e) {
            console.error(e);
        }
    };

    const playNotificationSound = () => {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const playTone = (freq, time, duration) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, time);
                gain.gain.setValueAtTime(0, time);
                gain.gain.linearRampToValueAtTime(0.3, time + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
                osc.start(time);
                osc.stop(time + duration);
            };
            const now = audioCtx.currentTime;
            playTone(587.33, now, 0.35); // D5
            playTone(880, now + 0.12, 0.45); // A5
        } catch (e) {
            console.error("Ses sentezlenemedi:", e);
        }
    };

    useEffect(() => {
        if (!isRemindersLoaded || currentUserRole !== 'teacher') return;
        
        const interval = setInterval(() => {
            const now = new Date();
            let changed = false;
            const updated = reminders.map(r => {
                if (r.targetTime && !r.isTriggered && new Date(r.targetTime) <= now) {
                    const diffMs = now.getTime() - new Date(r.targetTime).getTime();
                    const isLive = diffMs >= 0 && diffMs < 15000;

                    if (isLive) {
                        playNotificationSound();
                        if (window.navigator && window.navigator.vibrate) {
                            window.navigator.vibrate([200, 100, 200]);
                        }
                        
                        setTimeout(() => {
                            setSelectedNotification({
                                id: r.id || Date.now().toString(),
                                title: '🚨 Jarvis Hatırlatıcısı',
                                text: r.text,
                                isLocal: true,
                                timestamp: new Date().toISOString()
                            });
                        }, 500);
                    }

                    setTimeout(async () => {
                        try {
                            const notifRef = collection(db, NOTIFICATIONS_COLLECTION);
                            await addDoc(notifRef, {
                                title: '🚨 Jarvis Hatırlatıcısı',
                                text: r.text,
                                timestamp: new Date().toISOString(),
                                targetClasses: ['teacher_admin'],
                                targetVipStudents: [],
                                targetNames: "Öğretmen (Sen)"
                            });
                        } catch (error) {
                            console.error("Geçmiş bildirimi kaydedilemedi:", error);
                        }
                    }, 600);

                    changed = true;
                    return { ...r, isTriggered: true };
                }
                return r;
            });

            if (changed) {
                updateDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC), { reminders: updated }).catch(console.error);
            }
        }, 10000);

        return () => clearInterval(interval);
    }, [isRemindersLoaded, reminders, currentUserRole]);

    // ONE SIGNAL INITIALIZATION (Arka plan bildirimleri için)
    const [notificationPermission, setNotificationPermission] = useState(window.Notification?.permission || 'default');
    const [showPermissionGuide, setShowPermissionGuide] = useState(false);

    // Her uygulama açılışında izin durumunu yeniden kontrol et
    useEffect(() => {
        const checkPerm = () => {
            if (window.Notification) {
                setNotificationPermission(window.Notification.permission);
            }
        };
        checkPerm();
        // Uygulama tekrar görünür olduğunda (arka plandan dönüş) izni yeniden kontrol et
        document.addEventListener('visibilitychange', () => { if (!document.hidden) checkPerm(); });
        return () => document.removeEventListener('visibilitychange', checkPerm);
    }, []);

    useEffect(() => {
        if (import.meta.env.VITE_ONESIGNAL_APP_ID) {
            window.OneSignalDeferred = window.OneSignalDeferred || [];
            window.OneSignalDeferred.push(async function(OneSignal) {
                try {
                    await OneSignal.init({
                        appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
                        serviceWorkerPath: '/OneSignalSDKWorker.js',
                        serviceWorkerParam: { scope: '/' },
                        allowLocalhostAsSecureOrigin: true,
                    });
                } catch (e) {
                    console.warn('OneSignal init hatası (bildirimler devre dışı):', e.message);
                }
                
                const currentPerm = window.Notification?.permission;
                setNotificationPermission(currentPerm || 'default');

                OneSignal.Notifications.addEventListener('permissionChange', (granted) => {
                    setNotificationPermission(granted ? 'granted' : 'denied');
                });
            });
        }
    }, []);

    // Cihaz tespiti (rehber modal için)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    const handleRequestPushPermission = async () => {
        // Eğer daha önce engellediyse, rehber modalı göster
        if (notificationPermission === 'denied') {
            setShowPermissionGuide(true);
            return;
        }

        // Doğrudan tarayıcının native popup'ını tetikle (user gesture korunmalı!)
        if (window.Notification) {
            try {
                const permission = await window.Notification.requestPermission();
                setNotificationPermission(permission);
                
                if (permission === 'granted' && window.OneSignalDeferred) {
                    window.OneSignalDeferred.push(async function(OneSignal) {
                        try { await OneSignal.Notifications.requestPermission(); } catch(e) {}
                    });
                }
            } catch (err) {
                console.error("Permission request error:", err);
            }
        }
    };

    // ÖĞRENCİNİN KENDİ AYARLARI İÇİN GEREKLİ INPUT STATE'LERİ
    const [studentUsernameInput, setStudentUsernameInput] = useState("");
    const [studentPasswordInput, setStudentPasswordInput] = useState("");
    const [studentConfirmPasswordInput, setStudentConfirmPasswordInput] = useState("");

    const [activeTopicMenu, setActiveTopicMenu] = useState(null);
    const [activeColMenu, setActiveColMenu] = useState(null);
    const [activeCell, setActiveCell] = useState(null);
    const [studentSettingsModal, setStudentSettingsModal] = useState(false);
    const [cellNoteModal, setCellNoteModal] = useState(null);

    const [showLibraryManager, setShowLibraryManager] = useState(false);
    const [libraryCategory, setLibraryCategory] = useState(LIBRARY_TYPES.TOPIC);
    const [libraryInput, setLibraryInput] = useState("");
    const [libraryDate, setLibraryDate] = useState("");

    const [showAssistant, setShowAssistant] = useState(false);

    const [showNotifications, setShowNotifications] = useState(false);
    const localHomeworkNotifications = useHomeworkNotifications(loggedInStudent, selectedClass);

    // Bildirim okundu bilgisi
    const [readNotifications, setReadNotifications] = useState(() => {
        try { return JSON.parse(localStorage.getItem('bh_read_notifs')) || []; } catch (e) { return []; }
    });
    const [selectedNotification, setSelectedNotification] = useState(null);

    // Öğrenci veya öğretmen için birleşik bildirimler
    const studentNotifications = React.useMemo(() => {
        if (currentUserRole === 'teacher') {
            let teacherNotifs = notifications.filter(n => {
                if (n.targetClasses && n.targetClasses.includes('teacher_admin')) return true;
                return false;
            });
            teacherNotifs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            return teacherNotifs.map((n, idx) => ({ ...n, id: n.id || `notif_${idx}` })).slice(0, 10);
        }

        if (!loggedInStudent) return [];
        let globalNotifs = notifications.filter(n => {
            if (n.targetClasses && n.targetClasses.includes('all')) return true;
            if (n.targetClasses && n.targetClasses.includes(selectedClass?.id)) return true;
            if (n.targetVipStudents && n.targetVipStudents.includes('all') && currentUserRole === 'vip-student') return true;
            if (n.targetVipStudents && n.targetVipStudents.includes(loggedInStudent.id)) return true;
            return false;
        });
        const combined = [...localHomeworkNotifications, ...globalNotifs];
        combined.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        // Her bildirime benzersiz ID atayalım (Eğer yoksa)
        return combined.map((n, idx) => ({ ...n, id: n.id || `notif_${idx}` })).slice(0, 10);
    }, [notifications, localHomeworkNotifications, loggedInStudent, selectedClass, currentUserRole]);

    const unreadCount = studentNotifications.filter(n => !readNotifications.includes(n.id)).length;

    // Badge API (uygulama ikonundaki rozet)
    useEffect(() => {
        if (currentUserRole === 'student' || currentUserRole === 'vip-student' || currentUserRole === 'teacher') {
            if (navigator.setAppBadge) {
                if (unreadCount > 0) navigator.setAppBadge(unreadCount).catch(console.error);
                else navigator.clearAppBadge().catch(console.error);
            }
        }
    }, [unreadCount, currentUserRole]);

    const handleOpenNotification = (n) => {
        setSelectedNotification(n);
        if (!readNotifications.includes(n.id)) {
            const newRead = [...readNotifications, n.id];
            setReadNotifications(newRead);
            localStorage.setItem('bh_read_notifs', JSON.stringify(newRead));
        }
        setShowNotifications(false);
    };

    const regularClasses = classes.filter(c => c.type !== 'vip');
    const vipClasses = classes.filter(c => c.type === 'vip');
    // Modal & popup states to block background scroll
    useEffect(() => {
        const isAnyModalOpen = !!(
            showAssistant ||
            modalType ||
            studentSettingsModal ||
            activeCell ||
            activeColMenu ||
            activeTopicMenu ||
            cellNoteModal ||
            dialogData.isOpen ||
            selectedNotification ||
            showPermissionGuide
        );
        if (isAnyModalOpen) {
            lockScroll();
        }
        return () => {
            if (isAnyModalOpen) {
                unlockScroll();
            }
        };
    }, [
        showAssistant,
        modalType,
        studentSettingsModal,
        activeCell,
        activeColMenu,
        activeTopicMenu,
        cellNoteModal,
        dialogData.isOpen,
        selectedNotification,
        showPermissionGuide
    ]);

    useEffect(() => {
        if (classes.length > 0) {
            if (selectedClass) {
                const freshClass = classes.find(c => c.id === selectedClass.id);
                if (freshClass) {
                    setSelectedClass(freshClass);
                    if (selectedStudentForView) {
                        const freshStudent = freshClass.students?.find(s => s.id === selectedStudentForView.id);
                        if (freshStudent) {
                            setSelectedStudentForView(freshStudent);
                            if (loggedInStudent && loggedInStudent.id === freshStudent.id) {
                                setLoggedInStudent(freshStudent);
                            }
                        }
                    }
                }
            }
        }
    }, [classes]);
    const goHome = () => { setView('home'); setSelectedClass(null); setSelectedStudentForView(null); setActiveTab('homework'); };
    const openClass = (cls) => { setSelectedClass(cls); setView('class-detail'); setActiveTab('homework'); };
    const openStudent = (std) => { setSelectedStudentForView(std); setView('student-detail'); setActiveTab('homework'); };

    const addLibraryItem = async (text) => { if (!text || typeof text !== 'string' || !text.trim()) return; let subTopics = []; let mainText = text.trim(); if (libraryCategory === LIBRARY_TYPES.CURRICULUM && text.includes(',')) { const parts = text.split(','); mainText = parts[0].trim(); subTopics = parts.slice(1).map(p => ({ title: p.trim() })).filter(p => p.title); } await addDoc(collection(db, LIBRARY_COLLECTION), { text: mainText, type: libraryCategory, date: libraryCategory === LIBRARY_TYPES.TOPIC ? libraryDate : null, subTopics: subTopics }); showAlert('success', 'Kütüphane', 'Öğe kütüphaneye başarıyla eklendi.'); };
    const addLibraryItemDirect = async (text, category, date = null) => { if (!text || typeof text !== 'string' || !text.trim()) return; let subTopics = []; let mainText = text.trim(); const finalCategory = category || LIBRARY_TYPES.TOPIC; if (finalCategory === LIBRARY_TYPES.CURRICULUM && text.includes(',')) { const parts = text.split(','); mainText = parts[0].trim(); subTopics = parts.slice(1).map(p => ({ title: p.trim() })).filter(p => p.title); } await addDoc(collection(db, LIBRARY_COLLECTION), { text: mainText, type: finalCategory, date: finalCategory === LIBRARY_TYPES.TOPIC ? (date || libraryDate || new Date().toISOString().split('T')[0]) : null, subTopics: subTopics }); showAlert('success', 'Kütüphane', 'Öğe kütüphaneye başarıyla eklendi.'); };
    const deleteLibraryItem = async (id) => {
        showAlert('warning', 'Emin misiniz?', 'Bu öğe kütüphaneden silinecek.', async () => { await deleteDoc(doc(db, LIBRARY_COLLECTION, id)); });
    };

    const addStudent = (classId) => {
        if (!newStudentName.trim()) return;
        const targetId = classId || selectedClass?.id;
        const cls = classes.find(c => c.id === targetId);
        if (!cls) return;
        
        let formattedPhone = "";
        if (newStudentPhone && newStudentPhone.trim() !== "") {
            // Sadece rakamları tut ve başındaki 0'ı at
            let cleanPhone = newStudentPhone.replace(/\D/g, "");
            if (cleanPhone.startsWith("0")) cleanPhone = cleanPhone.substring(1);
            if (!cleanPhone.startsWith("90")) cleanPhone = "90" + cleanPhone;
            formattedPhone = "+" + cleanPhone;
        }

        const username = newStudentName.toLowerCase().replace(/\s+/g, '.') + Math.floor(Math.random() * 1000);
        const password = Math.random().toString(36).slice(-6);
        const newStd = { 
            id: generateId('std'), 
            name: newStudentName, 
            phone: formattedPhone, // Yeni telefon numarası alanı
            username, 
            password, 
            grades: {}, 
            assignmentNotes: {} 
        };
        updateClassInDb({ ...cls, students: [...(cls.students || []), newStd] });
        setNewStudentName("");
        setNewStudentPhone("");
    };

    const deleteStudent = (e, classId, studentId) => {
        e.stopPropagation();
        showAlert('warning', 'Öğrenciyi Sil', 'Öğrenciyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.', () => { const cls = classes.find(c => c.id === classId); updateClassInDb({ ...cls, students: cls.students.filter(s => s.id !== studentId) }); });
    };

    const updateGrade = (classId, studentId, colId, statusId) => { const cls = classes.find(c => c.id === classId); const updatedStudents = cls.students.map(s => s.id === studentId ? { ...s, grades: { ...(s.grades || {}), [colId]: statusId } } : s); updateClassInDb({ ...cls, students: updatedStudents }); setActiveCell(null); };

    const deleteColumn = (classId, topicId, colId) => {
        showAlert('warning', 'Kaynağı Sil', 'Kaynağı silmek istediğinize emin misiniz?', () => { const cls = classes.find(c => c.id === classId); const updatedTopics = cls.topics.map(t => t.id === topicId ? { ...t, subColumns: t.subColumns.filter(c => c.id !== colId) } : t); updateClassInDb({ ...cls, topics: updatedTopics }); });
    };

    const deleteTopic = (classId, topicId) => {
        showAlert('warning', 'Ödevi Sil', 'Bu ödevi ve altındaki TÜM kaynakları silmek istediğinize emin misiniz?', () => {
            const cls = classes.find(c => c.id === classId);
            const updatedTopics = cls.topics.filter(t => t.id !== topicId);
            updateClassInDb({ ...cls, topics: updatedTopics });
        });
    };

    const deleteClass = (e, classId) => {
        e.stopPropagation();
        showAlert('warning', 'Sınıfı Sil', 'Tüm sınıf ve içindeki öğrenciler silinecek. Emin misiniz?', () => { deleteDoc(doc(db, CLASSES_COLLECTION, classId)); goHome(); });
    };

    const handlePrintPasswords = (cls) => generatePasswordCards(cls);
    const handlePrintStudentReport = (cls, student) => generateStudentReport(cls, student);

    const handleOpenRisk = (cls) => {
        const stats = calculateStats(cls.students, cls.topics);
        if (stats.atRisk && stats.atRisk.length > 0) {
            let msg = ``; stats.atRisk.forEach(s => { msg += `• ${s.name} - Başarı Oranı: %${s.rate}\n`; });
            showAlert('warning', `⚠️ RİSKLİ ÖĞRENCİLER (${cls.className})`, msg);
        } else {
            showAlert('success', 'Harika!', `Sınıfınızda risk grubunda olan öğrenci bulunmuyor.`);
        }
    };

    const openCellNoteModal = (classId, studentId, colId, currentNote) => { setCellNoteModal({ classId, studentId, colId, note: currentNote || "" }); };

    const handleOpenStudentSettings = () => {
        if (loggedInStudent) {
            setStudentUsernameInput(loggedInStudent.username || "");
            setStudentPasswordInput(loggedInStudent.password || "");
            setStudentConfirmPasswordInput(loggedInStudent.password || "");
            setStudentSettingsModal(true);
        }
    };

    const handleSaveStudentSettings = async () => {
        if (!studentUsernameInput.trim() || !studentPasswordInput.trim()) {
            showAlert('error', 'Eksik Bilgi', 'Kullanıcı adı veya şifre alanı boş bırakılamaz.');
            return;
        }
        if (studentPasswordInput !== studentConfirmPasswordInput) {
            showAlert('error', 'Şifre Uyuşmazlığı', 'Girdiğiniz şifreler birbiriyle eşleşmiyor! Lütfen kontrol edin.');
            return;
        }

        try {
            const cls = classes.find(c => c.id === selectedClass.id);
            if (!cls) return;

            const updatedStudents = cls.students.map(s =>
                s.id === loggedInStudent.id
                    ? { ...s, username: studentUsernameInput.trim().toLowerCase(), password: studentPasswordInput.trim(), themeColor: accentColor }
                    : s
            );

            await updateClassInDb({ ...cls, students: updatedStudents });
            setLoggedInStudent(prev => ({ ...prev, username: studentUsernameInput.trim().toLowerCase(), password: studentPasswordInput.trim(), themeColor: accentColor }));
            setStudentSettingsModal(false);
            showAlert('success', 'Başarılı', 'Hesap bilgileriniz başarıyla güncellendi ve kaydedildi.');
        } catch (e) {
            console.error(e);
            showAlert('error', 'Hata', 'Bilgiler güncellenirken bir hata meydana geldi.');
        }
    };

    const scheduleDeadlinePush = async (cls, topicTitle, targetDateStr) => {
        if (!targetDateStr) return;
        try {
            const targetDate = new Date(targetDateStr);
            // Tam 24 saat öncesini hesapla
            const sendTime = new Date(targetDate.getTime() - 24 * 60 * 60 * 1000);

            if (sendTime.getTime() <= Date.now()) return; // Zaten geçmişse planlama yapma

            const studentIds = cls.students.map(s => s.id);
            if (studentIds.length === 0) return;

            const sendAfterStr = sendTime.toString();

            const payload = {
                title: "⏳ Ödev Hatırlatması!",
                text: `${topicTitle} adlı görev için son 24 saate girildi. Lütfen tamamlayıp derse gelirken yanında getirmeyi unutma!`,
                targetClasses: [],
                targetVipStudents: [],
                targetStudentIds: studentIds,
                send_after: sendAfterStr
            };

            await fetch('/.netlify/functions/sendNotification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            console.log("Bildirim planlandı:", sendAfterStr);
        } catch (err) {
            console.error("Bildirim planlanamadı", err);
        }
    };

    const handleAddClass = async (className) => {
        await addDoc(collection(db, CLASSES_COLLECTION), { className, type: 'regular', students: [], topics: [], curriculum: [] });
        showAlert('success', 'Başarılı', `${className} sınıfı başarıyla oluşturuldu.`);
        setActiveTab('home');
    };

    const handleAddVip = async (vipName) => {
        await addDoc(collection(db, CLASSES_COLLECTION), { className: vipName, type: 'vip', students: [], topics: [], curriculum: [] });
        showAlert('success', 'Başarılı', `${vipName} özel dersi başarıyla oluşturuldu.`);
        setActiveTab('home');
    };



    if (!isOnline) {
        return (
            <div className="fixed inset-0 bg-slate-950 z-[99999] flex flex-col items-center justify-center p-6 text-center select-none">
                <motion.div
                    animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                    className="w-24 h-24 bg-rose-500/10 border border-rose-500/30 rounded-full flex items-center justify-center text-rose-500 mb-6 shadow-[0_0_50px_rgba(239,68,68,0.2)]"
                >
                    <WifiOff size={44} />
                </motion.div>
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-wide uppercase">Ağ Bağlantısı Yok</h2>
                <p className="text-slate-400 text-sm md:text-base mt-3 max-w-sm font-medium leading-relaxed">
                    Berkant Hoca Eğitim Platformu aktif bir internet bağlantısı gerektirir. Lütfen internet/ağ bağlantınızı kontrol ediniz.
                </p>
            </div>
        );
    }

    if (isSessionRestoring) {
        return null;
    }

    if (!currentUserRole) return (
        <LoginScreen
            onStudentLogin={handleStudentLogin}
            onTeacherLogin={verifyPin}
            deferredPrompt={deferredPrompt}
            isStandalone={isStandalone}
        />
    );

    // BottomNav için global handler'lar (Prop drilling önlemek için)
    window.handleOpenStudentProfile = () => {
        if (currentUserRole !== 'teacher') {
            handleOpenStudentSettings();
        }
    };
    window.handleOpenNotifications = () => setShowNotifications(true);
    window.handleBottomNavNavigate = (id) => {
        if (id === 'home') {
            setView('home');
            setActiveTab('home');
        } else if (id === 'homework' || id === 'curriculum') {
            if (!isTeacherMode && loggedInStudent) {
                const studentClass = classes.find(c => c.students?.some(s => s.id === loggedInStudent.id));
                if (studentClass) {
                    setSelectedClass(studentClass);
                    setSelectedStudentForView(loggedInStudent);
                    setView('student-detail');
                    setActiveTab(id);
                }
            } else {
                setActiveTab(id);
            }
        } else if (id === 'trialTracker') {
            setView('trialTracker');
            setActiveTab('trialTracker');
        } else if (id === 'playlists') {
            setView('playlists');
            setActiveTab('playlists');
        } else if (id === 'questions') {
            setView('questions');
            setActiveTab('questions');
        } else {
            setActiveTab(id);
        }
    };



    return (
        <div className={`flex h-screen overflow-hidden ${currentUserRole === 'vip-student' ? 'bg-slate-900' : 'bg-lightBg'}`}>
            <Sidebar 
                isOpen={isSidebarOpen} 
                setIsOpen={setIsSidebarOpen} 
                isMobile={isMobile} 
                currentUserRole={currentUserRole} 
                activeTab={activeTab} 
                setActiveTab={(tabId) => {
                    window.handleBottomNavNavigate(tabId);
                }} 
                handleLogout={handleLogout} 
                handleOpenSettings={() => {
                    if (currentUserRole === 'teacher') {
                        setModalType('system-settings');
                        setModalTitleVal(countdownConfig.startDate.split('T')[0]);
                        setModalPdfVal(countdownConfig.label);
                        setModalDateVal(countdownConfig.targetDate.split('T')[0]);
                    } else {
                        handleOpenStudentSettings();
                    }
                }}
                handleOpenLibrary={() => setShowLibraryManager(true)}
                selectedClass={selectedClass}
                classes={classes}
                loggedInStudent={loggedInStudent}
            />
            
            <div id="app-content-wrapper" className="flex-1 flex flex-col relative overflow-hidden">
                    {currentUserRole === 'vip-student' && (<div className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"><div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full mix-blend-screen opacity-10" style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.4) 0%, transparent 70%)' }}></div><div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full mix-blend-screen opacity-[0.05]" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 70%)' }}></div></div>)}

                    {/* BİLDİRİM İZNİ BANNER'I — Sadece Mobil PWA'da göster */}
                    {currentUserRole && isMobile && isStandalone && notificationPermission !== 'granted' && (
                        <div className="bg-rose-500 text-white px-4 py-3 flex items-center justify-between gap-3 shadow-md z-[60] relative">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <Bell size={18} className="shrink-0 animate-bounce" />
                                <span className="leading-tight">
                                    {notificationPermission === 'denied' 
                                        ? "Bildirimler kapalı! Açmak için dokunun →" 
                                        : "Bildirimleri açarak ödev hatırlatmalarını kaçırmayın!"}
                                </span>
                            </div>
                            <button 
                                onClick={handleRequestPushPermission}
                                className="shrink-0 bg-white text-rose-600 px-4 py-1.5 rounded-full text-xs font-black tracking-wide shadow-sm active:scale-95 transition-all uppercase"
                            >
                                {notificationPermission === 'denied' ? 'Nasıl Açılır?' : 'İzin Ver'}
                            </button>
                        </div>
                    )}

                    {/* BİLDİRİM AYAR REHBERİ MODALI */}
                    <AnimatePresence>
                        {showPermissionGuide && (
                            <motion.div 
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                                onClick={() => setShowPermissionGuide(false)}
                            >
                                <motion.div 
                                    initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                                    className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
                                    onClick={e => e.stopPropagation()}
                                >
                                    <div className="bg-gradient-to-r from-rose-500 to-orange-500 p-5 text-center">
                                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Bell size={32} className="text-white" />
                                        </div>
                                        <h3 className="text-white text-lg font-black">Bildirimleri Açın</h3>
                                        <p className="text-white/80 text-xs mt-1">Sadece 3 adımda tamamlayın</p>
                                    </div>
                                    <div className="p-5 space-y-3">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">📌 Yol 1: Ayarlardan Açın</p>
                                        {isIOS ? (
                                            <>
                                                <div className="flex gap-3 items-start">
                                                    <div className="w-7 h-7 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-sm font-black shrink-0">1</div>
                                                    <p className="text-sm text-slate-700">Telefonunuzdan <strong>Ayarlar</strong> uygulamasını açın</p>
                                                </div>
                                                <div className="flex gap-3 items-start">
                                                    <div className="w-7 h-7 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-sm font-black shrink-0">2</div>
                                                    <p className="text-sm text-slate-700"><strong>Bildirimler</strong> bölümüne gidin ve <strong>Berkant Hoca</strong> uygulamasını bulun</p>
                                                </div>
                                                <div className="flex gap-3 items-start">
                                                    <div className="w-7 h-7 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-sm font-black shrink-0">3</div>
                                                    <p className="text-sm text-slate-700"><strong>Bildirimlere İzin Ver</strong> seçeneğini <strong className="text-green-600">açık</strong> konuma getirin</p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex gap-3 items-start">
                                                    <div className="w-7 h-7 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-sm font-black shrink-0">1</div>
                                                    <p className="text-sm text-slate-700">Ana ekrandaki <strong>uygulama simgesine basılı tutun</strong> 👆</p>
                                                </div>
                                                <div className="flex gap-3 items-start">
                                                    <div className="w-7 h-7 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-sm font-black shrink-0">2</div>
                                                    <p className="text-sm text-slate-700">Açılan menüden <strong>Site ayarları</strong> seçeneğine dokunun</p>
                                                </div>
                                                <div className="flex gap-3 items-start">
                                                    <div className="w-7 h-7 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-sm font-black shrink-0">3</div>
                                                    <p className="text-sm text-slate-700"><strong>Bildirimler</strong> kısmını bulun ve <strong className="text-green-600">Bildirimleri göster</strong> seçeneğini açın</p>
                                                </div>
                                            </>
                                        )}

                                        {/* PLAN B — Her iki platform için ortak */}
                                        <div className="border-t border-slate-200 pt-3 mt-3">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">🔄 Yol 2: Uygulamayı Yeniden Kurun</p>
                                            <p className="text-sm text-slate-600 leading-relaxed">
                                                Yukarıdaki adımlar işe yaramazsa, uygulamayı ana ekrandan kaldırıp <strong>en baştan yeniden kurun</strong>. 
                                                Bu sefer bildirim izni sorulduğunda <strong className="text-green-600">"İzin Ver"</strong> demeyi unutmayın 😊
                                            </p>
                                        </div>

                                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-2">
                                            <p className="text-xs text-amber-800 text-center font-medium">
                                                💡 Ayarları değiştirdikten sonra uygulamaya geri dönün. Bu uyarı otomatik olarak kaybolacaktır.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="px-5 pb-5">
                                        <button 
                                            onClick={() => setShowPermissionGuide(false)}
                                            className="w-full py-3 bg-gradient-to-r from-rose-500 to-orange-500 text-white rounded-xl font-bold text-sm active:scale-[0.98] transition-all shadow-lg"
                                        >
                                            Anlaşıldı 👍
                                        </button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <header 
                        className={`no-print shrink-0 relative z-20 transition-all duration-500 ${currentUserRole === 'vip-student' ? 'bg-slate-800/90 border-b border-slate-700 shadow-md' : 'bg-white border-b border-slate-200 shadow-sm'}`}
                        style={{ paddingTop: 'max(env(safe-area-inset-top), 0px)' }}
                    >
                        <div className="max-w-7xl mx-auto px-3 pb-2.5 pt-2.5 md:py-4 flex flex-col items-center gap-2">
                            <div className="flex items-center gap-3 w-full justify-between">
                                <div className="flex items-center gap-2">
                                    {currentUserRole !== 'student' && currentUserRole !== 'vip-student' && view !== 'home' ? (<button onClick={() => { if (view === 'student-detail') { setView('class-detail'); } else { if (selectedClass) { setActiveTab(selectedClass.type === 'vip' ? 'vip-classes' : 'home'); } setView('home'); } }} className={`p-1.5 md:p-2 rounded-xl transition-colors hover-lift ${currentUserRole === 'vip-student' ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}><ChevronLeft size={20} /></button>) : <div className="w-8"></div>}
                                </div>

                        <div className="text-center">
                            <h1 className={`text-md md:text-2xl font-black tracking-tight flex items-center justify-center gap-2.5 ${currentUserRole === 'vip-student' ? 'real-gold-text' : 'text-slate-800'}`}>
                                <div className={`relative w-8 h-8 md:w-10 md:h-10 rounded-[0.6rem] p-[2px] overflow-hidden group shadow-md hover:scale-105 transition-transform ${currentUserRole === 'vip-student' ? 'shadow-vip-glow' : 'shadow-[0_0_15px_rgba(147,51,234,0.3)]'}`}>
                                    <div className="absolute inset-[-100%] animate-[spin_4s_linear_infinite]" style={{ background: currentUserRole === 'vip-student' ? 'conic-gradient(from 0deg, transparent 0 340deg, #f59e0b 360deg)' : 'conic-gradient(from 0deg, transparent 0 340deg, #9333ea 360deg)' }}></div>
                                    <div className="relative w-full h-full bg-slate-900 rounded-lg flex items-center justify-center p-1.5 z-10 overflow-hidden">
                                        <img src="/pwa-192x192.png" alt="Mini Logo" className="w-full h-full object-contain pointer-events-none select-none drop-shadow-md" />
                                    </div>
                                </div>
                                BERKANT HOCA
                            </h1>
                        </div>

                        <div className="flex items-center gap-1.5 justify-end relative">
                            {(currentUserRole === 'student' || currentUserRole === 'vip-student' || currentUserRole === 'teacher') && (
                                <div className="relative">
                                    <button onClick={() => setShowNotifications(!showNotifications)} className={`p-2 md:p-2.5 rounded-xl transition-colors hover-lift relative ${currentUserRole === 'vip-student' ? 'text-slate-200 hover:text-vipGold bg-slate-700 border border-slate-600 shadow-md' : 'text-slate-700 hover:text-primary bg-white shadow-md border border-slate-200'}`} title="Bildirimler">
                                        <Bell size={22} />
                                        {unreadCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-[10px] font-black text-white border-2 border-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                                    </button>

                                    <AnimatePresence>
                                        {showNotifications && (
                                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 top-full mt-3 w-72 md:w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[100]">
                                                <div className="p-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                                    <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Bildirim Merkezi</span>
                                                    <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-rose-500 transition-colors"><X size={16} /></button>
                                                </div>
                                                <div className="max-h-80 overflow-y-auto">
                                                    {studentNotifications.length === 0 ? (
                                                        <div className="p-6 text-center text-slate-400 text-xs font-medium">Yeni bildiriminiz yok.</div>
                                                    ) : (
                                                                studentNotifications.map((n) => {
                                                                    const isRead = readNotifications.includes(n.id);
                                                                    return (
                                                                        <div key={n.id} onClick={() => handleOpenNotification(n)} className={`p-4 border-b border-slate-50 transition-colors flex gap-3 cursor-pointer ${isRead ? 'bg-white opacity-60' : 'bg-rose-50/30 hover:bg-rose-50/50'}`}>
                                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${n.isLocal ? 'bg-amber-100 text-amber-500' : 'bg-primary/10 text-primary'}`}>
                                                                                <Bell size={14} />
                                                                            </div>
                                                                            <div className="flex-1">
                                                                                <div className={`text-xs mb-0.5 ${isRead ? 'font-bold text-slate-700' : 'font-black text-slate-900'}`}>{n.title}</div>
                                                                                <div className={`text-[11px] leading-relaxed line-clamp-2 ${isRead ? 'text-slate-500' : 'text-slate-700'}`}>{n.text}</div>
                                                                                <div className="text-[9px] text-slate-400 mt-1">{new Date(n.timestamp).toLocaleDateString('tr-TR')}</div>
                                                                            </div>
                                                                            {!isRead && <div className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0"></div>}
                                                                        </div>
                                                                    )
                                                                })
                                                            )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto pb-24 md:pb-32 transition-colors duration-1000 relative">
                <main className="max-w-7xl mx-auto px-2.5 mt-5 no-print relative z-10">
                {/* Öğretmen Ana Sayfasında Geri Sayım Görünmeye Devam Eder */}
                {isTeacherMode && view === 'home' && activeTab === 'home' && (
                    <CountdownTimer targetDateStr={countdownConfig.targetDate} startDateStr={countdownConfig.startDate} targetLabel={countdownConfig.label} />
                )}

                <>
                    {isTeacherMode && view === 'home' && activeTab === 'home' && <TeacherDashboard key="teacherDashboard" regularClasses={regularClasses} onOpenClass={openClass} onNewClass={handleAddClass} />}
                    {isTeacherMode && view === 'home' && activeTab === 'vip-classes' && <VipDashboard key="vipDashboard" vipClasses={vipClasses} onOpenClass={openClass} onNewVipClass={handleAddVip} />}
                    {isTeacherMode && view === 'home' && activeTab === 'send-notification' && <SendNotificationView key="sendNotificationView" regularClasses={regularClasses} vipClasses={vipClasses} notifications={notifications} showAlert={showAlert} />}
                    {isTeacherMode && view === 'home' && activeTab === 'library' && <LibraryView key="libraryView" libraryCategory={libraryCategory} setLibraryCategory={setLibraryCategory} libraryInput={libraryInput} setLibraryInput={setLibraryInput} libraryDate={libraryDate} setLibraryDate={setLibraryDate} libraryItems={libraryItems} addLibraryItem={addLibraryItem} deleteLibraryItem={deleteLibraryItem} />}
                    {isTeacherMode && view === 'home' && activeTab === 'reminders' && <ReminderDashboard key="reminderDashboard" reminders={reminders} setReminders={setReminders} />}
                    {isTeacherMode && view === 'home' && activeTab === 'whatsapp' && <WhatsAppPanel key="whatsappPanel" classes={classes} allTrials={allTrials} />}

                    {isTeacherMode && view === 'class-detail' && selectedClass && (
                        <ClassDetail
                            key="classDetail"
                            selectedClass={selectedClass}
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            isMobile={isMobile}
                            newStudentName={newStudentName}
                            setNewStudentName={setNewStudentName}
                            newStudentPhone={newStudentPhone}
                            setNewStudentPhone={setNewStudentPhone}
                            addStudent={addStudent}
                            updateGrade={updateGrade}
                            openCellNoteModal={openCellNoteModal}
                            setModalData={setModalData}
                            setModalInputVal={setModalInputVal}
                            setModalDateVal={setModalDateVal}
                            setModalPdfVal={setModalPdfVal}
                            setModalPhoneVal={setModalPhoneVal}
                            setModalType={setModalType}
                            deleteStudent={deleteStudent}
                            handlePrintStudentReport={handlePrintStudentReport}
                            openStudent={openStudent}
                            setActiveTopicMenu={setActiveTopicMenu}
                            setActiveColMenu={setActiveColMenu}
                            setActiveCell={setActiveCell}
                            deleteColumn={deleteColumn}
                            updateClassInDb={updateClassInDb}
                            handleOpenRisk={handleOpenRisk}
                            handlePrintPasswords={handlePrintPasswords}
                            deleteClass={deleteClass}
                            libraryItems={libraryItems.filter(i => i.type === LIBRARY_TYPES.CURRICULUM)}
                            saveToLibrary={async (topic) => { if (!topic.title) return; try { await addDoc(collection(db, LIBRARY_COLLECTION), { text: topic.title, type: LIBRARY_TYPES.CURRICULUM, subTopics: topic.subTopics ? topic.subTopics.map(st => ({ title: st.title })) : [] }); showAlert('success', 'Başarılı', 'Ödev başarıyla kütüphaneye kaydedildi!'); } catch (e) { showAlert('error', 'Hata', 'Kütüphane kayıt hatası oluştu!'); } }}
                            setModalEditUsername={setModalEditUsername}
                            setModalEditPassword={setModalEditPassword}
                        />
                    )}

                    {!isTeacherMode && view === 'home' && activeTab === 'home' && <StudentDashboard key="studentDashboard" classes={classes} currentUserRole={currentUserRole} loggedInStudent={loggedInStudent} onOpenClass={openClass} setView={setView} countdownConfig={countdownConfig} selectedClass={selectedClass} />}

                    {view === 'student-detail' && selectedClass && selectedStudentForView && <StudentDetail key="studentDetail" selectedStudentForView={selectedStudentForView} selectedClass={selectedClass} currentUserRole={currentUserRole} activeTab={activeTab} setActiveTab={setActiveTab} isTeacherMode={isTeacherMode} openCellNoteModal={openCellNoteModal} updateGrade={updateGrade} updateClassInDb={updateClassInDb} showAlert={showAlert} />}

                    {(view === 'trialTracker' || activeTab === 'trialTracker') && loggedInStudent && (
                        <TrialTracker
                            key="trialTracker"
                            studentId={loggedInStudent.id}
                            isTeacherMode={false}
                            showAlert={showAlert}
                            currentUserRole={currentUserRole}
                        />
                    )}

                    {(view === 'playlists' || activeTab === 'playlists') && loggedInStudent && (
                        <PlaylistsView
                            key="playlistsView"
                            studentId={loggedInStudent.id}
                            isTeacherMode={false}
                            showAlert={showAlert}
                            currentUserRole={currentUserRole}
                        />
                    )}

                    {(view === 'questions' || activeTab === 'questions') && loggedInStudent && (
                        <QuestionsView
                            key="questionsView"
                            studentId={loggedInStudent.id}
                            studentName={
                                (() => {
                                    const cls = classes.find(c => c.students?.some(s => s.id === loggedInStudent.id));
                                    return cls ? `${loggedInStudent.name} - ${cls.className}` : loggedInStudent.name;
                                })()
                            }
                            showAlert={showAlert}
                        />
                    )}

                    {/* LiveClassroom artık layout dışında render ediliyor — buradan kaldırıldı */}
                </>
            </main>
            </div> {/* End of scrollable area */}
            </div> {/* End of flex-1 container */}



            {showAssistant && <JarvisModal classes={classes} allTrials={allTrials} updateClassInDb={updateClassInDb} onClose={() => setShowAssistant(false)} initialStudent={selectedStudentForView} reminders={reminders} setReminders={setReminders} addLibraryItemDirect={addLibraryItemDirect} setActiveTab={setActiveTab} setView={setView} />}

            {/* BİLGİ GİRİŞ/DÜZENLEME MODALLARI */}
            {modalType && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-2xl">
                        {modalType === 'system-settings' ? (
                            <>
                                <h3 className="font-bold text-base mb-3 text-slate-800 flex items-center gap-2"><Settings size={18} className="text-primary" /> Sayaç Ayarları</h3>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Sayaç Başlığı</label>
                                <input type="text" className="w-full border-2 border-slate-200 rounded-xl p-2.5 mb-3 font-bold text-xs outline-none focus:border-primary" value={modalPdfVal} onChange={e => setModalPdfVal(e.target.value)} />
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Başlangıç Tarihi</label>
                                <input type="date" className="w-full border-2 border-slate-200 rounded-xl p-2.5 mb-3 font-bold text-xs outline-none focus:border-primary" value={modalTitleVal} onChange={e => setModalTitleVal(e.target.value)} />
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Hedef Tarih (Bitiş)</label>
                                <input type="date" className="w-full border-2 border-slate-200 rounded-xl p-2.5 mb-3 font-bold text-xs outline-none focus:border-primary" value={modalDateVal} onChange={e => setModalDateVal(e.target.value)} />
                            </>
                        ) : modalType === 'edit-student' ? (
                            <>
                                <h3 className="font-bold text-base mb-3 text-slate-800">Öğrenci Bilgilerini Düzenle</h3>

                                <div className="mb-3">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Öğrenci Adı</label>
                                    <input type="text" autoFocus className="w-full border-2 border-slate-200 rounded-xl p-2.5 font-bold text-xs outline-none focus:border-primary" value={modalInputVal} onChange={e => setModalInputVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleModalSubmit()} />
                                </div>

                                <div className="mb-3">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Telefon Numarası (WhatsApp İçin)</label>
                                    <input type="text" placeholder="+905554443322" className="w-full border-2 border-slate-200 rounded-xl p-2.5 font-bold text-xs outline-none focus:border-primary" value={modalPhoneVal} onChange={e => setModalPhoneVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleModalSubmit()} />
                                </div>

                                <div className="mb-3">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Kullanıcı Adı</label>
                                    <input type="text" className="w-full border-2 border-slate-200 rounded-xl p-2.5 font-bold text-xs outline-none focus:border-primary" value={modalEditUsername} onChange={e => setModalEditUsername(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleModalSubmit()} />
                                </div>

                                <div className="mb-3">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Şifre</label>
                                    <input type="text" className="w-full border-2 border-slate-200 rounded-xl p-2.5 font-bold text-xs outline-none focus:border-primary" value={modalEditPassword} onChange={e => setModalEditPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleModalSubmit()} />
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 className="font-bold text-base mb-3 text-slate-800">{modalType === 'topic' ? 'Yeni Ödev Ekle' : 'Düzenle'}</h3>
                                <input type="text" autoFocus className="w-full border-2 border-slate-200 rounded-xl p-2.5 mb-2 font-bold text-xs outline-none focus:border-primary" placeholder="Başlık girin..." value={modalInputVal} onChange={e => setModalInputVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleModalSubmit()} />

                                {modalType === 'topic' && (
                                    <div className="mb-3">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Kütüphaneden Seç:</label>
                                        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-0.5">
                                            {libraryItems.filter(i => i.type === LIBRARY_TYPES.TOPIC).map(item => (<button key={item.id} onClick={() => setModalInputVal(item.text)} className="text-[11px] bg-purple-50 hover:bg-purple-100 text-primary px-2 py-1 rounded-lg transition-colors font-bold border border-purple-100">{item.text}</button>))}
                                        </div>
                                    </div>
                                )}
                                {modalType === 'source' && (
                                    <div className="mb-3">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Kütüphaneden Seç:</label>
                                        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-0.5">
                                            {libraryItems.filter(i => i.type === LIBRARY_TYPES.SOURCE).map(item => (<button key={item.id} onClick={() => setModalInputVal(item.text)} className="text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg transition-colors font-bold border border-emerald-100">{item.text}</button>))}
                                        </div>
                                    </div>
                                )}

                                {(modalType === 'source' || modalType === 'edit-source') && (<input type="text" className="w-full border-2 border-slate-200 rounded-xl p-2.5 mb-3 font-bold text-xs outline-none focus:border-primary" placeholder="Google Drive Linki" value={modalPdfVal} onChange={e => setModalPdfVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleModalSubmit()} />)}
                                {(modalType === 'topic' || modalType === 'edit-topic' || modalType === 'edit-date') && (<input type="datetime-local" data-jarvis-target="tarih saat ekle" className="w-full border-2 border-slate-200 rounded-xl p-2.5 mb-3 font-bold text-xs outline-none focus:border-primary" value={modalDateVal} onChange={e => setModalDateVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleModalSubmit()} />)}
                            </>
                        )}
                        <div className="flex gap-2 justify-end mt-2">
                            <button onClick={() => { setModalType(null); setModalEditUsername(""); setModalEditPassword(""); }} className="px-3.5 py-1.5 font-bold text-xs text-slate-500 hover:bg-slate-100 rounded-xl">İptal</button>
                            <button onClick={handleModalSubmit} className="px-4 py-1.5 bg-primary text-white font-bold text-xs rounded-xl hover:bg-purple-700 shadow-md">Kaydet</button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* ÖĞRENCİ KENDİ HESAP AYARLARI MODALI */}
            <AnimatePresence>
                {studentSettingsModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-2xl">
                            <h3 className="font-bold text-base mb-3 text-slate-800 flex items-center gap-2">
                                <Settings size={18} className="text-primary" /> Hesap Bilgilerini Düzenle
                            </h3>

                            <div className="mb-3">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Kullanıcı Adı</label>
                                <input type="text" autoCapitalize="none" autoCorrect="off" spellCheck="false" className="w-full border-2 border-slate-200 rounded-xl p-2.5 font-bold text-xs outline-none focus:border-primary" value={studentUsernameInput} onChange={e => setStudentUsernameInput(e.target.value)} />
                            </div>

                            <div className="mb-4">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Uygulama Teması</label>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => changeAccentColor('')} className={`w-8 h-8 rounded-full bg-blue-500 border-2 transition-transform hover:scale-110 ${!accentColor ? 'border-slate-800 scale-110 shadow-md' : 'border-transparent'}`} title="Varsayılan (Mavi)"></button>
                                    <button type="button" onClick={() => changeAccentColor('theme-red')} className={`w-8 h-8 rounded-full bg-red-500 border-2 transition-transform hover:scale-110 ${accentColor === 'theme-red' ? 'border-slate-800 scale-110 shadow-md' : 'border-transparent'}`} title="Kırmızı"></button>
                                    <button type="button" onClick={() => changeAccentColor('theme-purple')} className={`w-8 h-8 rounded-full bg-purple-500 border-2 transition-transform hover:scale-110 ${accentColor === 'theme-purple' ? 'border-slate-800 scale-110 shadow-md' : 'border-transparent'}`} title="Mor"></button>
                                    <button type="button" onClick={() => changeAccentColor('theme-emerald')} className={`w-8 h-8 rounded-full bg-emerald-500 border-2 transition-transform hover:scale-110 ${accentColor === 'theme-emerald' ? 'border-slate-800 scale-110 shadow-md' : 'border-transparent'}`} title="Zümrüt"></button>
                                    <button type="button" onClick={() => changeAccentColor('theme-rose')} className={`w-8 h-8 rounded-full bg-rose-500 border-2 transition-transform hover:scale-110 ${accentColor === 'theme-rose' ? 'border-slate-800 scale-110 shadow-md' : 'border-transparent'}`} title="Pembe"></button>
                                    <button type="button" onClick={() => changeAccentColor('theme-amber')} className={`w-8 h-8 rounded-full bg-amber-500 border-2 transition-transform hover:scale-110 ${accentColor === 'theme-amber' ? 'border-slate-800 scale-110 shadow-md' : 'border-transparent'}`} title="Kehribar"></button>
                                </div>
                            </div>

                            <div className="mb-3">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Yeni Şifre</label>
                                <input type="text" autoCapitalize="none" autoCorrect="off" spellCheck="false" className="w-full border-2 border-slate-200 rounded-xl p-2.5 font-bold text-xs outline-none focus:border-primary" placeholder="Yeni şifrenizi girin" value={studentPasswordInput} onChange={e => setStudentPasswordInput(e.target.value)} />
                            </div>

                            <div className="mb-3">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Yeni Şifre (Tekrar)</label>
                                <input type="text" autoCapitalize="none" autoCorrect="off" spellCheck="false" className="w-full border-2 border-slate-200 rounded-xl p-2.5 font-bold text-xs outline-none focus:border-primary" placeholder="Şifrenizi doğrulayın" value={studentConfirmPasswordInput} onChange={e => setStudentConfirmPasswordInput(e.target.value)} />
                            </div>

                            <div className="flex gap-2 justify-end mt-2">
                                <button onClick={() => setStudentSettingsModal(false)} className="px-3.5 py-1.5 font-bold text-xs text-slate-500 hover:bg-slate-100 rounded-xl">İptal</button>
                                <button onClick={handleSaveStudentSettings} className="px-4 py-1.5 bg-primary text-white font-bold text-xs rounded-xl hover:bg-purple-700 shadow-md">Kaydet</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* TABLODAKİ BUTON/MENÜ MODALLARI */}
            {activeCell && <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setActiveCell(null)}><motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-3 rounded-2xl shadow-xl flex gap-1.5" onClick={e => e.stopPropagation()}>{STATUS_OPTIONS.map(opt => (<button key={opt.id} onClick={() => updateGrade(activeCell.classId, activeCell.studentId, activeCell.colId, opt.id)} className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${opt.bg} ${opt.color} hover:scale-105 border ${opt.border}`}><opt.icon size={20} className="mb-1" strokeWidth={2.5} /><span className="text-xs font-black uppercase tracking-wider">{opt.label}</span></button>))}</motion.div></div>}

            {activeColMenu && <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setActiveColMenu(null)}><motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-1.5 rounded-2xl shadow-xl flex flex-col gap-0.5 w-48" onClick={e => e.stopPropagation()}><button onClick={() => { const cls = classes.find(c => c.id === activeColMenu.classId); const col = cls.topics.find(t => t.id === activeColMenu.topicId).subColumns.find(c => c.id === activeColMenu.colId); setModalData({ classId: cls.id, topicId: activeColMenu.topicId, colId: col.id }); setModalInputVal(col.title); setModalPdfVal(col.pdfLink || ""); setModalType('edit-source'); setActiveColMenu(null); }} className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"><Pencil size={14} /> Kaynağı Düzenle</button><button onClick={() => { deleteColumn(activeColMenu.classId, activeColMenu.topicId, activeColMenu.colId); setActiveColMenu(null); }} className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 size={14} /> Kaynağı Sil</button></motion.div></div>}

            {activeTopicMenu && <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setActiveTopicMenu(null)}><motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-1.5 rounded-2xl shadow-xl flex flex-col gap-0.5 w-48" onClick={e => e.stopPropagation()}>
                <button onClick={() => { const cls = classes.find(c => c.id === activeTopicMenu.classId); const top = cls.topics.find(t => t.id === activeTopicMenu.topicId); setModalData({ classId: cls.id, topicId: top.id }); setModalInputVal(top.title); setModalDateVal(top.date || ""); setModalType('edit-topic'); setActiveTopicMenu(null); }} className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"><Pencil size={14} /> Başlık / Tarih Düzenle</button>
                <button onClick={() => { deleteTopic(activeTopicMenu.classId, activeTopicMenu.topicId); setActiveTopicMenu(null); }} className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 size={14} /> Ödevi Sil</button>
            </motion.div></div>}

            {cellNoteModal && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4"><motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-2xl"><h3 className="font-bold text-base mb-3 text-slate-800 flex items-center gap-2"><Edit3 size={18} className="text-amber-500" />Öğretmen Notu</h3><textarea autoFocus rows="3" className="w-full border-2 border-slate-200 rounded-xl p-2.5 mb-3 font-medium text-xs outline-none focus:border-amber-400" placeholder="Öğrenci için notunuz..." value={cellNoteModal.note} onChange={e => setCellNoteModal({ ...cellNoteModal, note: e.target.value })}></textarea><div className="flex gap-2 justify-end mt-1"><button onClick={() => setCellNoteModal(null)} className="px-3.5 py-1.5 font-bold text-xs text-slate-500 hover:bg-slate-100 rounded-xl">İptal</button><button onClick={() => { const cls = classes.find(c => c.id === cellNoteModal.classId); const updatedStudents = cls.students.map(s => s.id === cellNoteModal.studentId ? { ...s, assignmentNotes: { ...(s.assignmentNotes || {}), [cellNoteModal.colId]: cellNoteModal.note } } : s); updateClassInDb({ ...cls, students: updatedStudents }); setCellNoteModal(null); }} className="px-4 py-1.5 bg-amber-50 text-white font-bold text-xs rounded-xl hover:bg-amber-600 shadow-md">Kaydet</button></div></motion.div></div>}

            {isTeacherMode && <button onClick={() => setShowAssistant(true)} className="fab-button bg-primary text-white" title="Akıllı Asistan"><div className="fab-pulse"></div><Mic size={24} /></button>}

            {/* 💎 PREMIUM ALERT / DIALOG MODALI */}
            <AnimatePresence>
                {dialogData.isOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-lg z-[9999] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="bg-white/95 backdrop-blur-2xl border border-white/40 rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)]">
                            <div className="p-8 text-center relative">
                                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-slate-50 to-transparent -z-10"></div>
                                <div className="flex justify-center mb-5 relative">
                                    <div className="absolute inset-0 bg-current opacity-20 blur-2xl rounded-full scale-150"></div>
                                    {dialogData.type === 'warning' && <div className="w-20 h-20 bg-gradient-to-tr from-amber-100 to-amber-50 text-amber-500 rounded-3xl flex items-center justify-center shadow-[0_10px_20px_-10px_rgba(245,158,11,0.4)] relative z-10"><AlertTriangle size={36} /></div>}
                                    {dialogData.type === 'error' && <div className="w-20 h-20 bg-gradient-to-tr from-rose-100 to-rose-50 text-rose-500 rounded-3xl flex items-center justify-center shadow-[0_10px_20px_-10px_rgba(243,33,101,0.4)] relative z-10"><AlertTriangle size={36} /></div>}
                                    {dialogData.type === 'success' && <div className="w-20 h-20 bg-gradient-to-tr from-emerald-100 to-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center shadow-[0_10px_20px_-10px_rgba(16,185,129,0.4)] relative z-10"><CheckCircle size={36} /></div>}
                                    {dialogData.type === 'info' && <div className="w-20 h-20 bg-gradient-to-tr from-blue-100 to-blue-50 text-blue-500 rounded-3xl flex items-center justify-center shadow-[0_10px_20px_-10px_rgba(59,130,246,0.4)] relative z-10"><Info size={36} /></div>}
                                </div>
                                <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">{dialogData.title}</h3>
                                <p className="text-slate-500 font-medium text-sm whitespace-pre-wrap leading-relaxed">{dialogData.message}</p>
                            </div>
                            <div className="p-4 bg-slate-50/80 border-t border-white/50 flex gap-3 backdrop-blur-xl">
                                {dialogData.onConfirm && typeof dialogData.onConfirm === 'function' ? (
                                    <>
                                        <button onClick={closeAlert} className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-100 hover:text-slate-800 transition-all shadow-sm">İptal</button>
                                        <button onClick={() => { dialogData.onConfirm(); closeAlert(); }} className={`flex-1 py-3.5 rounded-2xl font-black text-sm text-white transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 ${dialogData.type === 'warning' || dialogData.type === 'error' ? 'bg-gradient-to-r from-rose-500 to-rose-600 shadow-rose-500/30' : 'bg-primary shadow-primary/30'}`}>Onaylıyorum</button>
                                    </>
                                ) : (
                                    <button onClick={closeAlert} className="w-full py-3.5 bg-primary text-white rounded-2xl font-black text-sm shadow-lg shadow-primary/30 hover:shadow-xl hover:-translate-y-0.5 transition-all">Tamam</button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* 💎 PREMIUM BİLDİRİM OKUMA MODALI */}
            <AnimatePresence>
                {selectedNotification && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-lg z-[9999] flex items-center justify-center p-4" onClick={() => setSelectedNotification(null)}>
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="bg-white/95 backdrop-blur-2xl border border-white/40 rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] relative" onClick={e => e.stopPropagation()}>
                            <div className="p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-primary opacity-20 blur-2xl rounded-full scale-150"></div>
                                        <div className={`w-16 h-16 rounded-[1.25rem] flex items-center justify-center shrink-0 shadow-lg relative z-10 ${selectedNotification.isLocal ? 'bg-gradient-to-tr from-amber-400 to-amber-300 text-white shadow-amber-500/40' : 'bg-primary text-white shadow-primary/40'}`}>
                                            <Bell size={28} />
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedNotification(null)} className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all">
                                        <X size={24} />
                                    </button>
                                </div>
                                <h2 className="text-2xl font-black text-slate-800 mb-3 leading-tight tracking-tight">{selectedNotification.title}</h2>
                                <p className="text-sm font-medium text-slate-600 leading-relaxed mb-8 whitespace-pre-wrap">{selectedNotification.text}</p>
                                <div className="flex items-center justify-between text-xs font-black tracking-widest uppercase text-slate-400 border-t border-slate-100/50 pt-5 mt-auto">
                                    <span>{new Date(selectedNotification.timestamp).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                    <span>{new Date(selectedNotification.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute:'2-digit' })}</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* MOBİL ALT NAVİGASYON (Sadece mobil ekranlarda) */}
            <BottomNav 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                isVip={currentUserRole === 'vip-student'} 
                isTeacherMode={isTeacherMode}
                handleOpenSettings={() => {
                    if (currentUserRole === 'teacher') {
                        setModalType('system-settings');
                        setModalTitleVal(countdownConfig.startDate.split('T')[0]);
                        setModalPdfVal(countdownConfig.label);
                        setModalDateVal(countdownConfig.targetDate.split('T')[0]);
                    } else {
                        handleOpenStudentSettings();
                    }
                }}
                handleLogout={handleLogout}
                showAlert={showAlert}
            />
        </div>
    );
};
export default App;
