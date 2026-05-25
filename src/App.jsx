import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Library, Settings, LogOut, Mic, X, Edit3, Pencil, Trash2, AlertTriangle, CheckCircle, Info, RefreshCw, WifiOff, Bell, Menu } from 'lucide-react';

import Sidebar from './components/layout/Sidebar';
import BottomNav from './components/layout/BottomNav';

// FİREBASE
import { db } from './config/firebase';
import { collection, doc, updateDoc, addDoc, deleteDoc, getDocs, query, orderBy } from 'firebase/firestore';

// 🔥 CUSTOM HOOKS
import { usePWA } from './hooks/usePWA';
import { useFirebaseData } from './hooks/useFirebaseData';
import { useAppAuth } from './hooks/useAppAuth';
import { useAppModals } from './hooks/useAppModals';

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
import VirtualAgentCursor from './components/assistant/VirtualAgentCursor';
import ReminderDashboard from './components/views/ReminderDashboard';
import WhatsAppPanel from './components/views/WhatsAppPanel';
import SuperAgentDashboard from './components/views/SuperAgentDashboard';

const App = () => {
    // 🔥 DATA HOOKS
    const { classes, libraryItems, notifications, allTrials, dbTeacherPin, countdownConfig, globalReminders } = useFirebaseData();
    const { isOnline, deferredPrompt, isStandalone } = usePWA();

    const [showSplash, setShowSplash] = useState(true);
    useEffect(() => {
        const timer = setTimeout(() => setShowSplash(false), 2000);
        return () => clearTimeout(timer);
    }, []);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('home');
    const [view, setView] = useState('home');

    const [selectedClass, setSelectedClass] = useState(null);
    const [selectedStudentForView, setSelectedStudentForView] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => { const handleResize = () => setIsMobile(window.innerWidth < 768); window.addEventListener('resize', handleResize); return () => window.removeEventListener('resize', handleResize); }, []);

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
        showAlert
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

                // OneSignal send_after beklediği format string
                const pad = (num) => String(num).padStart(2, '0');
                const offset = -sendTime.getTimezoneOffset();
                const sign = offset >= 0 ? '+' : '-';
                const offsetHours = pad(Math.floor(Math.abs(offset) / 60));
                const offsetMins = pad(Math.abs(offset) % 60);
                const timezoneString = `GMT${sign}${offsetHours}${offsetMins}`;

                const sendAfterStr = `${sendTime.getFullYear()}-${pad(sendTime.getMonth()+1)}-${pad(sendTime.getDate())} ${pad(sendTime.getHours())}:${pad(sendTime.getMinutes())}:${pad(sendTime.getSeconds())} ${timezoneString}`;

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
                    body: JSON.stringify(payload)
                });
                console.log("Bildirim planlandı:", sendAfterStr);
            } catch (err) {
                console.error("Bildirim planlanamadı", err);
            }
        }
    });

    // AKILLI YÖNETİCİ BİLDİRİM (HATIRLATICI) SİSTEMİ
    const [reminders, setRemindersState] = useState([]);
    const [isRemindersLoaded, setIsRemindersLoaded] = useState(false);

    useEffect(() => {
        if (globalReminders) {
            setRemindersState(globalReminders);
            setIsRemindersLoaded(true);
        }
    }, [globalReminders]);

    const setReminders = (updater) => {
        setRemindersState(prev => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            if (JSON.stringify(prev) !== JSON.stringify(next)) {
                updateDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC), { reminders: next }).catch(console.error);

                // Yeni eklenen hatırlatıcıları tespit et
                const addedReminders = next.filter(nItem => !prev.some(pItem => pItem.id === nItem.id));
                addedReminders.forEach(r => {
                    if (r.targetTime && !r.isTriggered) {
                        const targetDate = new Date(r.targetTime);
                        if (targetDate.getTime() > Date.now()) {
                            // OneSignal send_after beklediği format string
                            const pad = (num) => String(num).padStart(2, '0');
                            const offset = -targetDate.getTimezoneOffset();
                            const sign = offset >= 0 ? '+' : '-';
                            const offsetHours = pad(Math.floor(Math.abs(offset) / 60));
                            const offsetMins = pad(Math.abs(offset) % 60);
                            const timezoneString = `GMT${sign}${offsetHours}${offsetMins}`;
                            const sendAfterStr = `${targetDate.getFullYear()}-${pad(targetDate.getMonth()+1)}-${pad(targetDate.getDate())} ${pad(targetDate.getHours())}:${pad(targetDate.getMinutes())}:${pad(targetDate.getSeconds())} ${timezoneString}`;

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
                            }).then(res => res.json()).then(data => {
                                console.log("Arka plan hatırlatıcı bildirimi OneSignal'de planlandı:", sendAfterStr, data);
                            }).catch(console.error);
                        }
                    }
                });
            }
            return next;
        });
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
        if (!isRemindersLoaded) return;
        const interval = setInterval(() => {
            const now = new Date();
            setReminders(prev => {
                let changed = false;
                const updated = prev.map(r => {
                    if (r.targetTime && !r.isTriggered && new Date(r.targetTime) <= now) {
                        const diffMs = now.getTime() - new Date(r.targetTime).getTime();
                        const isLive = diffMs >= 0 && diffMs < 15000; // Son 15 saniye içinde mi tetiklendi?

                        if (isLive) {
                            // Canlı tetiklenmede sesli ve görsel uyar
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

                        // Her iki durumda da veritabanı kaydı oluştur (Geçmiş takibi için)
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
                                // En eski bildirimleri temizle (Limit: 10)
                                const snap = await getDocs(query(notifRef, orderBy('timestamp', 'desc')));
                                if (snap.size > 10) {
                                    const docsToDelete = snap.docs.slice(10);
                                    for (let d of docsToDelete) {
                                        await deleteDoc(doc(db, NOTIFICATIONS_COLLECTION, d.id));
                                    }
                                }
                            } catch (error) {
                                console.error("Geçmiş bildirimi kaydedilemedi:", error);
                            }
                        }, 600);

                        changed = true;
                        return { ...r, isTriggered: true };
                    }
                    return r;
                });
                return changed ? updated : prev;
            });
        }, 10000); // Her 10 saniyede bir kontrol et

        return () => clearInterval(interval);
    }, [isRemindersLoaded]);

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
                    ? { ...s, username: studentUsernameInput.trim().toLowerCase(), password: studentPasswordInput.trim() }
                    : s
            );

            await updateClassInDb({ ...cls, students: updatedStudents });
            setLoggedInStudent(prev => ({ ...prev, username: studentUsernameInput.trim().toLowerCase(), password: studentPasswordInput.trim() }));
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

            // OneSignal send_after beklediği format string (Örn: 2015-09-24 14:00:00 GMT-0700)
            const pad = (num) => String(num).padStart(2, '0');
            const offset = -sendTime.getTimezoneOffset();
            const sign = offset >= 0 ? '+' : '-';
            const offsetHours = pad(Math.floor(Math.abs(offset) / 60));
            const offsetMins = pad(Math.abs(offset) % 60);
            const timezoneString = `GMT${sign}${offsetHours}${offsetMins}`;

            const sendAfterStr = `${sendTime.getFullYear()}-${pad(sendTime.getMonth()+1)}-${pad(sendTime.getDate())} ${pad(sendTime.getHours())}:${pad(sendTime.getMinutes())}:${pad(sendTime.getSeconds())} ${timezoneString}`;

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

    if (showSplash || isSessionRestoring) {
        return (
            <div className="fixed inset-0 bg-slate-950 z-[99999] flex flex-col items-center justify-between py-16 md:py-24 overflow-hidden select-none">
                {/* Arkaplan Efekti */}
                <div className="absolute inset-0 bg-gradient-to-b from-brandPurple/20 via-slate-950 to-slate-950 opacity-40 pointer-events-none"></div>
                <div className="absolute top-[20%] left-[20%] w-64 h-64 bg-brandPurple/20 rounded-full mix-blend-screen filter blur-[100px] pointer-events-none"></div>
                
                {/* Üst Başlıklar */}
                <motion.div 
                    initial={{ opacity: 0, y: -20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ duration: 0.8, ease: "easeOut" }} 
                    className="relative z-10 text-center space-y-2 mt-8 md:mt-12"
                >
                    <h1 className="text-xl md:text-3xl font-black text-white tracking-[0.2em] md:tracking-[0.3em] drop-shadow-lg">BERKANT HOCA</h1>
                    <p className="text-xs md:text-sm font-bold text-slate-400 tracking-[0.4em] uppercase">Eğitim Platformu</p>
                </motion.div>

                {/* Dönen Çerçeveli Logo */}
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }} 
                    transition={{ delay: 0.2, duration: 0.8, type: 'spring' }}
                    className="relative z-10"
                >
                    <div className="relative w-44 h-44 md:w-56 md:h-56 rounded-[3rem] p-1.5 overflow-hidden shadow-[0_0_60px_rgba(147,51,234,0.3)]">
                        {/* Spinning Border */}
                        <div className="absolute inset-[-100%] animate-[spin_4s_linear_infinite]" style={{ background: 'conic-gradient(from 0deg, transparent 0 340deg, #9333ea 360deg)' }}></div>
                        
                        {/* İç Kutu ve Logo */}
                        <div className="relative w-full h-full bg-slate-900 rounded-[2.8rem] flex items-center justify-center p-4 z-10 overflow-hidden">
                            <img src="/pwa-192x192.png" alt="Logo" className="w-full h-full object-contain drop-shadow-xl pointer-events-none" />
                        </div>
                    </div>
                </motion.div>

                {/* Alt Metinler */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }} 
                    className="relative z-10 text-center space-y-6 mb-8 md:mb-12"
                >
                    <div className="space-y-1.5 max-w-sm mx-auto px-4">
                        <h2 className="text-sm md:text-base font-black text-white/90 tracking-wide leading-relaxed">
                            "Eğitim dünyayı değiştirmek için en güçlü araçtır."
                        </h2>
                    </div>
                    <p className="text-xs md:text-sm text-brandPurple font-black tracking-[0.3em] uppercase animate-pulse">YÜKLENİYOR...</p>
                </motion.div>
            </div>
        );
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
            setView('student-detail');
            setActiveTab(id);
        } else if (id === 'trialTracker') {
            setView('trialTracker');
            setActiveTab('trialTracker');
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
                    setActiveTab(tabId);
                    if (view === 'class-detail' || view === 'student-detail') {
                        setView('home');
                    }
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
            />
            
            <div className="flex-1 flex flex-col relative overflow-hidden">
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

                    <header className={`no-print shrink-0 relative z-20 transition-all duration-500 ${currentUserRole === 'vip-student' ? 'bg-slate-800/90 border-b border-slate-700 shadow-md' : 'bg-white border-b border-slate-200 shadow-sm'}`}>
                        <div className="max-w-7xl mx-auto px-3 py-2.5 md:py-4 flex flex-col items-center gap-2">
                            <div className="flex items-center gap-3 w-full justify-between">
                                <div className="flex items-center gap-2">
                                    {isMobile && (
                                        <button onClick={() => setIsSidebarOpen(true)} className={`p-1.5 md:p-2 rounded-xl transition-colors hover-lift ${currentUserRole === 'vip-student' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                                            <Menu size={20} />
                                        </button>
                                    )}
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
                                    <button onClick={() => setShowNotifications(!showNotifications)} className={`p-2 md:p-2.5 rounded-xl transition-colors hover-lift relative ${currentUserRole === 'vip-student' ? 'text-slate-200 hover:text-vipGold bg-slate-700 border border-slate-600 shadow-md' : 'text-slate-700 hover:text-brandPurple bg-white shadow-md border border-slate-200'}`} title="Bildirimler">
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
                                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${n.isLocal ? 'bg-amber-100 text-amber-500' : 'bg-brandPurple/10 text-brandPurple'}`}>
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

                <AnimatePresence mode="wait">
                    {isTeacherMode && view === 'home' && activeTab === 'home' && <TeacherDashboard regularClasses={regularClasses} onOpenClass={openClass} onNewClass={handleAddClass} />}
                    {isTeacherMode && view === 'home' && activeTab === 'vip-classes' && <VipDashboard vipClasses={vipClasses} onOpenClass={openClass} onNewVipClass={handleAddVip} />}
                    {isTeacherMode && view === 'home' && activeTab === 'send-notification' && <SendNotificationView regularClasses={regularClasses} vipClasses={vipClasses} notifications={notifications} showAlert={showAlert} />}
                    {isTeacherMode && view === 'home' && activeTab === 'library' && <LibraryView libraryCategory={libraryCategory} setLibraryCategory={setLibraryCategory} libraryInput={libraryInput} setLibraryInput={setLibraryInput} libraryDate={libraryDate} setLibraryDate={setLibraryDate} libraryItems={libraryItems} addLibraryItem={addLibraryItem} deleteLibraryItem={deleteLibraryItem} />}
                    {isTeacherMode && view === 'home' && activeTab === 'reminders' && <ReminderDashboard reminders={reminders} setReminders={setReminders} />}
                    {isTeacherMode && view === 'home' && activeTab === 'whatsapp' && <WhatsAppPanel classes={classes} allTrials={allTrials} />}
                    {isTeacherMode && view === 'home' && activeTab === 'super-agent' && <SuperAgentDashboard classes={classes} allTrials={allTrials} />}

                    {isTeacherMode && view === 'class-detail' && selectedClass && (
                        <ClassDetail
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

                    {!isTeacherMode && view === 'home' && <StudentDashboard classes={classes} currentUserRole={currentUserRole} loggedInStudent={loggedInStudent} onOpenClass={openClass} setView={setView} countdownConfig={countdownConfig} />}

                    {view === 'student-detail' && selectedClass && selectedStudentForView && <StudentDetail selectedStudentForView={selectedStudentForView} selectedClass={selectedClass} currentUserRole={currentUserRole} activeTab={activeTab} setActiveTab={setActiveTab} isTeacherMode={isTeacherMode} openCellNoteModal={openCellNoteModal} updateGrade={updateGrade} updateClassInDb={updateClassInDb} showAlert={showAlert} />}

                    {view === 'trialTracker' && loggedInStudent && (
                        <TrialTracker
                            studentId={loggedInStudent.id}
                            isTeacherMode={false}
                            showAlert={showAlert}
                            currentUserRole={currentUserRole}
                        />
                    )}
                </AnimatePresence>
            </main>
            </div> {/* End of scrollable area */}
            </div> {/* End of flex-1 container */}



            {showAssistant && <JarvisModal classes={classes} allTrials={allTrials} updateClassInDb={updateClassInDb} onClose={() => setShowAssistant(false)} initialStudent={selectedStudentForView} reminders={reminders} setReminders={setReminders} />}
            <VirtualAgentCursor />

            {/* BİLGİ GİRİŞ/DÜZENLEME MODALLARI */}
            {modalType && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-2xl">
                        {modalType === 'system-settings' ? (
                            <>
                                <h3 className="font-bold text-base mb-3 text-slate-800 flex items-center gap-2"><Settings size={18} className="text-brandPurple" /> Sayaç Ayarları</h3>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Sayaç Başlığı</label>
                                <input type="text" className="w-full border-2 border-slate-200 rounded-xl p-2.5 mb-3 font-bold text-xs outline-none focus:border-brandPurple" value={modalPdfVal} onChange={e => setModalPdfVal(e.target.value)} />
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Başlangıç Tarihi</label>
                                <input type="date" className="w-full border-2 border-slate-200 rounded-xl p-2.5 mb-3 font-bold text-xs outline-none focus:border-brandPurple" value={modalTitleVal} onChange={e => setModalTitleVal(e.target.value)} />
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Hedef Tarih (Bitiş)</label>
                                <input type="date" className="w-full border-2 border-slate-200 rounded-xl p-2.5 mb-3 font-bold text-xs outline-none focus:border-brandPurple" value={modalDateVal} onChange={e => setModalDateVal(e.target.value)} />
                            </>
                        ) : modalType === 'edit-student' ? (
                            <>
                                <h3 className="font-bold text-base mb-3 text-slate-800">Öğrenci Bilgilerini Düzenle</h3>

                                <div className="mb-3">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Öğrenci Adı</label>
                                    <input type="text" autoFocus className="w-full border-2 border-slate-200 rounded-xl p-2.5 font-bold text-xs outline-none focus:border-brandPurple" value={modalInputVal} onChange={e => setModalInputVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleModalSubmit()} />
                                </div>

                                <div className="mb-3">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Telefon Numarası (WhatsApp İçin)</label>
                                    <input type="text" placeholder="+905554443322" className="w-full border-2 border-slate-200 rounded-xl p-2.5 font-bold text-xs outline-none focus:border-brandPurple" value={modalPhoneVal} onChange={e => setModalPhoneVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleModalSubmit()} />
                                </div>

                                <div className="mb-3">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Kullanıcı Adı</label>
                                    <input type="text" className="w-full border-2 border-slate-200 rounded-xl p-2.5 font-bold text-xs outline-none focus:border-brandPurple" value={modalEditUsername} onChange={e => setModalEditUsername(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleModalSubmit()} />
                                </div>

                                <div className="mb-3">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Şifre</label>
                                    <input type="text" className="w-full border-2 border-slate-200 rounded-xl p-2.5 font-bold text-xs outline-none focus:border-brandPurple" value={modalEditPassword} onChange={e => setModalEditPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleModalSubmit()} />
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 className="font-bold text-base mb-3 text-slate-800">{modalType === 'topic' ? 'Yeni Ödev Ekle' : 'Düzenle'}</h3>
                                <input type="text" autoFocus className="w-full border-2 border-slate-200 rounded-xl p-2.5 mb-2 font-bold text-xs outline-none focus:border-brandPurple" placeholder="Başlık girin..." value={modalInputVal} onChange={e => setModalInputVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleModalSubmit()} />

                                {modalType === 'topic' && (
                                    <div className="mb-3">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Kütüphaneden Seç:</label>
                                        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-0.5">
                                            {libraryItems.filter(i => i.type === LIBRARY_TYPES.TOPIC).map(item => (<button key={item.id} onClick={() => setModalInputVal(item.text)} className="text-[11px] bg-purple-50 hover:bg-purple-100 text-brandPurple px-2 py-1 rounded-lg transition-colors font-bold border border-purple-100">{item.text}</button>))}
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

                                {(modalType === 'source' || modalType === 'edit-source') && (<input type="text" className="w-full border-2 border-slate-200 rounded-xl p-2.5 mb-3 font-bold text-xs outline-none focus:border-brandPurple" placeholder="Google Drive Linki" value={modalPdfVal} onChange={e => setModalPdfVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleModalSubmit()} />)}
                                {(modalType === 'topic' || modalType === 'edit-topic' || modalType === 'edit-date') && (<input type="datetime-local" data-jarvis-target="tarih saat ekle" className="w-full border-2 border-slate-200 rounded-xl p-2.5 mb-3 font-bold text-xs outline-none focus:border-brandPurple" value={modalDateVal} onChange={e => setModalDateVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleModalSubmit()} />)}
                            </>
                        )}
                        <div className="flex gap-2 justify-end mt-2">
                            <button onClick={() => { setModalType(null); setModalEditUsername(""); setModalEditPassword(""); }} className="px-3.5 py-1.5 font-bold text-xs text-slate-500 hover:bg-slate-100 rounded-xl">İptal</button>
                            <button onClick={handleModalSubmit} className="px-4 py-1.5 bg-brandPurple text-white font-bold text-xs rounded-xl hover:bg-purple-700 shadow-md">Kaydet</button>
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
                                <Settings size={18} className="text-brandPurple" /> Hesap Bilgilerini Düzenle
                            </h3>

                            <div className="mb-3">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Kullanıcı Adı</label>
                                <input type="text" autoCapitalize="none" autoCorrect="off" spellCheck="false" className="w-full border-2 border-slate-200 rounded-xl p-2.5 font-bold text-xs outline-none focus:border-brandPurple" value={studentUsernameInput} onChange={e => setStudentUsernameInput(e.target.value)} />
                            </div>

                            <div className="mb-3">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Yeni Şifre</label>
                                <input type="text" autoCapitalize="none" autoCorrect="off" spellCheck="false" className="w-full border-2 border-slate-200 rounded-xl p-2.5 font-bold text-xs outline-none focus:border-brandPurple" placeholder="Yeni şifrenizi girin" value={studentPasswordInput} onChange={e => setStudentPasswordInput(e.target.value)} />
                            </div>

                            <div className="mb-3">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Yeni Şifre (Tekrar)</label>
                                <input type="text" autoCapitalize="none" autoCorrect="off" spellCheck="false" className="w-full border-2 border-slate-200 rounded-xl p-2.5 font-bold text-xs outline-none focus:border-brandPurple" placeholder="Şifrenizi doğrulayın" value={studentConfirmPasswordInput} onChange={e => setStudentConfirmPasswordInput(e.target.value)} />
                            </div>

                            <div className="flex gap-2 justify-end mt-2">
                                <button onClick={() => setStudentSettingsModal(false)} className="px-3.5 py-1.5 font-bold text-xs text-slate-500 hover:bg-slate-100 rounded-xl">İptal</button>
                                <button onClick={handleSaveStudentSettings} className="px-4 py-1.5 bg-brandPurple text-white font-bold text-xs rounded-xl hover:bg-purple-700 shadow-md">Kaydet</button>
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

            {isTeacherMode && <button onClick={() => setShowAssistant(true)} className="fab-button bg-brandPurple text-white" title="Akıllı Asistan"><div className="fab-pulse"></div><Mic size={24} /></button>}

            {/* 💎 CUSTOM ALERT / DIALOG MODALI */}
            <AnimatePresence>
                {dialogData.isOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 15 }} className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl">
                            <div className="p-5 text-center">
                                <div className="flex justify-center mb-3">
                                    {dialogData.type === 'warning' && <div className="w-14 h-14 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center"><AlertTriangle size={28} /></div>}
                                    {dialogData.type === 'error' && <div className="w-14 h-14 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center"><AlertTriangle size={28} /></div>}
                                    {dialogData.type === 'success' && <div className="w-14 h-14 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center"><CheckCircle size={28} /></div>}
                                    {dialogData.type === 'info' && <div className="w-14 h-14 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center"><Info size={28} /></div>}
                                </div>
                                <h3 className="text-lg font-black text-slate-800 mb-1.5">{dialogData.title}</h3>
                                <p className="text-slate-500 font-medium text-xs whitespace-pre-wrap">{dialogData.message}</p>
                            </div>
                            <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2.5">
                                {dialogData.onConfirm ? (
                                    <>
                                        <button onClick={closeAlert} className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-100 transition-colors">İptal</button>
                                        <button onClick={() => { dialogData.onConfirm(); closeAlert(); }} className={`flex-1 py-2.5 rounded-xl font-bold text-xs text-white transition-colors shadow-sm ${dialogData.type === 'warning' || dialogData.type === 'error' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-brandPurple hover:bg-purple-600'}`}>Onaylıyorum</button>
                                    </>
                                ) : (
                                    <button onClick={closeAlert} className="w-full py-2.5 bg-brandPurple text-white rounded-xl font-bold text-xs shadow-glow hover:bg-purple-600 transition-colors">Tamam</button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* 💎 BİLDİRİM OKUMA MODALI */}
            <AnimatePresence>
                {selectedNotification && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setSelectedNotification(null)}>
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
                            <div className={`h-2 ${selectedNotification.isLocal ? 'bg-amber-400' : 'bg-brandPurple'}`}></div>
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${selectedNotification.isLocal ? 'bg-amber-100 text-amber-500' : 'bg-brandPurple/10 text-brandPurple'}`}>
                                        <Bell size={24} />
                                    </div>
                                    <button onClick={() => setSelectedNotification(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>
                                <h2 className="text-xl font-black text-slate-800 mb-2 leading-tight">{selectedNotification.title}</h2>
                                <p className="text-sm font-medium text-slate-600 leading-relaxed mb-6 whitespace-pre-wrap">{selectedNotification.text}</p>
                                <div className="flex items-center justify-between text-xs font-bold text-slate-400 border-t border-slate-100 pt-4">
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
            />
        </div>
    );
};
export default App;
