import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, GraduationCap, Library, Settings, LogOut, Mic, X, Megaphone, Edit3, Pencil, Trash2, AlertTriangle, CheckCircle, Info, RefreshCw, WifiOff } from 'lucide-react';

// 🔥 PWA GÜNCELLEME MOTORU İÇİN VİTE-PWA HOOK'U
import { useRegisterSW } from 'virtual:pwa-register/react';

// FİREBASE
import { db } from './config/firebase'; 
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';

// YARDIMCILAR VE SABİTLER
import { LIBRARY_TYPES, CLASSES_COLLECTION, LIBRARY_COLLECTION, SETTINGS_COLLECTION, SETTINGS_DOC, DEFAULT_PIN, STATUS_OPTIONS } from './utils/constants';
import { generateId, calculateStats } from './utils/helpers';

// 🧩 PARÇALANMIŞ BİLEŞENLERİMİZ
import LoginScreen from './components/auth/LoginScreen';
import TeacherDashboard from './components/dashboard/TeacherDashboard';
import StudentDashboard from './components/dashboard/StudentDashboard';
import ClassDetail from './components/views/ClassDetail';
import StudentDetail from './components/views/StudentDetail';
import LibraryModal from './components/modals/LibraryModal';
import CountdownTimer from './components/ui/Countdown'; 
import JarvisModal from './components/assistant/JarvisModal'; 

const App = () => {
    const [classes, setClasses] = useState([]);
    const [libraryItems, setLibraryItems] = useState([]);
    const [currentUserRole, setCurrentUserRole] = useState(null);
    const [isTeacherMode, setIsTeacherMode] = useState(false);
    const [loggedInStudent, setLoggedInStudent] = useState(null);
    const [dbTeacherPin, setDbTeacherPin] = useState(DEFAULT_PIN); 
    const [announcementTitle, setAnnouncementTitle] = useState("Sistem Duyurusu");
    const [systemAnnouncement, setSystemAnnouncement] = useState("Eğitim, dünyayı değiştirmek için en güçlü silahtır.");
    const [countdownConfig, setCountdownConfig] = useState({ targetDate: '2026-06-20T00:00:00', startDate: '2025-06-20T00:00:00', label: '20 Jenkins 2026' });
    const [view, setView] = useState('home'); 
    const [activeTab, setActiveTab] = useState('homework'); 
    const [selectedClass, setSelectedClass] = useState(null);
    const [selectedStudentForView, setSelectedStudentForView] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => { const handleResize = () => setIsMobile(window.innerWidth < 768); window.addEventListener('resize', handleResize); return () => window.removeEventListener('resize', handleResize); }, []);
    
    const [newStudentName, setNewStudentName] = useState("");
    const [modalType, setModalType] = useState(null); 
    const [modalData, setModalData] = useState(null);
    const [modalInputVal, setModalInputVal] = useState("");
    const [modalTitleVal, setModalTitleVal] = useState(""); 
    const [modalDateVal, setModalDateVal] = useState("");
    const [modalPdfVal, setModalPdfVal] = useState("");
    
    // ÖĞRENCİ DÜZENLEME İÇİN STATE'LER
    const [modalEditUsername, setModalEditUsername] = useState("");
    const [modalEditPassword, setModalEditPassword] = useState("");
    
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

    // CUSTOM ALERT / DIALOG MODALI STATE'İ
    const [dialogData, setDialogData] = useState({ isOpen: false, type: 'info', title: '', message: '', onConfirm: null });

    // 🔥 PWA YAŞAM DÖNGÜSÜ VE İNTERNET KONTROLÜ STATE'LERİ
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegisteredSW(swUrl, r) {
            if (r) {
                setInterval(() => {
                    r.update();
                }, 15 * 60 * 1000);
            }
        }
    });

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const regularClasses = classes.filter(c => c.type !== 'vip');
    const vipClasses = classes.filter(c => c.type === 'vip');

    const showAlert = (type, title, message, onConfirm = null) => { setDialogData({ isOpen: true, type, title, message, onConfirm }); };
    const closeAlert = () => { setDialogData({ isOpen: false, type: 'info', title: '', message: '', onConfirm: null }); };

    useEffect(() => {
        const unsubClasses = onSnapshot(collection(db, CLASSES_COLLECTION), (snap) => setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        const unsubLibrary = onSnapshot(collection(db, LIBRARY_COLLECTION), (snap) => setLibraryItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        const unsubConfig = onSnapshot(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.pin) setDbTeacherPin(data.pin);
                if (data.announcement) setSystemAnnouncement(data.announcement);
                if (data.announcementTitle) setAnnouncementTitle(data.announcementTitle);
                if (data.countdown) setCountdownConfig(data.countdown);
            }
        });
        return () => { unsubClasses(); unsubLibrary(); unsubConfig(); };
    }, []);

    const verifyPin = (inputPin) => { 
        if (String(inputPin).trim() === String(dbTeacherPin).trim()) { 
            setIsTeacherMode(true); setCurrentUserRole('teacher'); setView('home'); setActiveTab('homework'); 
        } else { 
            showAlert('error', 'Hata', 'Girdiğiniz PIN kodu hatalı! Lütfen tekrar deneyin.'); 
        } 
    };
    
    const handleStudentLogin = (username, password, isVipLogin = false) => {
        let foundStudent = null, foundClass = null; const classesToSearch = isVipLogin ? vipClasses : regularClasses;
        for (const cls of classesToSearch) { const std = cls.students?.find(s => s.username === username.trim() && s.password === password.trim()); if (std) { foundStudent = std; foundClass = cls; break; } }
        
        if (foundStudent) { 
            setCurrentUserRole(isVipLogin ? 'vip-student' : 'student'); 
            setLoggedInStudent(foundStudent); 
            setSelectedClass(foundClass); 
            setSelectedStudentForView(foundStudent); 
            setView('student-detail'); 
            setActiveTab('homework'); 
            const updatedStudents = foundClass.students.map(s => s.id === foundStudent.id ? { ...s, lastLogin: new Date().toISOString() } : s); 
            updateClassInDb({ ...foundClass, students: updatedStudents }); 
        } else { 
            throw new Error("Kullanıcı adı veya şifre hatalı"); 
        }
    };
    
    const handleLogout = () => { setCurrentUserRole(null); setIsTeacherMode(false); setLoggedInStudent(null); setSelectedClass(null); setSelectedStudentForView(null); setView('home'); };
    const updateClassInDb = async (updatedClass) => { try { await updateDoc(doc(db, CLASSES_COLLECTION, updatedClass.id), updatedClass); if (selectedClass?.id === updatedClass.id) setSelectedClass(updatedClass); } catch (e) { console.error("Sınıf güncellenemedi:", e); } };
    const goHome = () => { setView('home'); setSelectedClass(null); setSelectedStudentForView(null); setActiveTab('homework'); };
    const openClass = (cls) => { setSelectedClass(cls); setView('class-detail'); setActiveTab('homework'); };
    const openStudent = (std) => { setSelectedStudentForView(std); setView('student-detail'); setActiveTab('homework'); };
    
    const addLibraryItem = async (text) => { if(!text || typeof text !== 'string' || !text.trim()) return; let subTopics = []; let mainText = text.trim(); if (libraryCategory === LIBRARY_TYPES.CURRICULUM && text.includes(',')) { const parts = text.split(','); mainText = parts[0].trim(); subTopics = parts.slice(1).map(p => ({ title: p.trim() })).filter(p => p.title); } await addDoc(collection(db, LIBRARY_COLLECTION), { text: mainText, type: libraryCategory, date: libraryCategory === LIBRARY_TYPES.TOPIC ? libraryDate : null, subTopics: subTopics }); showAlert('success', 'Kütüphane', 'Öğe kütüphaneye başarıyla eklendi.'); };
    const deleteLibraryItem = async (id) => { 
        showAlert('warning', 'Emin misiniz?', 'Bu öğe kütüphaneden silinecek.', async () => { await deleteDoc(doc(db, LIBRARY_COLLECTION, id)); }); 
    };
    
    // 🔥 SÖZDİZİMİ (SYNTAX) OPTİMİZASYONU YAPILDI
    const addStudent = (classId) => { 
        if(!newStudentName.trim()) return; 
        const targetId = classId || selectedClass?.id;
        const cls = classes.find(c => c.id === targetId); 
        if (!cls) return;
        const username = newStudentName.toLowerCase().replace(/\s+/g, '.') + Math.floor(Math.random()*1000); 
        const password = Math.random().toString(36).slice(-6); 
        const newStd = { id: generateId('std'), name: newStudentName, username, password, grades: {}, assignmentNotes: {} }; 
        updateClassInDb({ ...cls, students: [...(cls.students || []), newStd] }); 
        setNewStudentName(""); 
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
    
    const handlePrintPasswords = (cls) => { const printWindow = window.open('', '_blank'); if (!printWindow) { showAlert('error', 'Pop-up Engellendi', 'Lütfen tarayıcınızın Pop-up engelleyicisini kapatın!'); return; } let html = `<html><head><title>${cls.className} - Şifre Listesi</title><style>body{font-family:sans-serif;padding:20px;}table{width:100%;border-collapse:collapse;margin-top:20px;}th,td{border:1px solid #ddd;padding:12px;text-align:left;}th{background-color:#f4f4f4;} h2{color:#4f46e5;}</style></head><body><h2>${cls.className} Sınıfı - Öğrenci Giriş Bilgileri</h2><table><tr><th>Öğrenci Adı</th><th>Kullanıcı Adı</th><th>Şifre</th></tr>`; cls.students.forEach(s => { html += `<tr><td><strong>${s.name}</strong></td><td>${s.username}</td><td style="letter-spacing: 2px;"><b>${s.password}</b></td></tr>`; }); html += `</table><script>window.onload = function() { setTimeout(function() { window.print(); }, 300); }; window.onafterprint = function() { window.close(); };</script></body></html>`; printWindow.document.write(html); printWindow.document.close(); };
    const handlePrintStudentReport = (cls, student) => { const printWindow = window.open('', '_blank'); if (!printWindow) { showAlert('error', 'Pop-up Engellendi', 'Lütfen tarayıcınızın Pop-up engelleyicisini kapatın!'); return; } let html = `<html><head><title>${student.name} - İlerleme Raporu</title><style>body{font-family:sans-serif;padding:20px;}table{width:100%;border-collapse:collapse;margin-top:20px;}th,td{border:1px solid #ddd;padding:12px;text-align:left;}th{background-color:#f4f4f4;} h2{color:#4f46e5;}</style></head><body><h2>${student.name} - Ödev ve İlerleme Raporu</h2><h3>Sınıf: ${cls.className} | Genel Başarı: %${calculateStats([student], cls.topics).percentage}</h3><table><tr><th>Konu ve Kaynak</th><th>Durum</th><th>Öğretmen Notu</th></tr>`; cls.topics.forEach(topic => { topic.subColumns.forEach(col => { const statusId = student.grades?.[col.id] || 'assigned'; let statusText = statusId === 'done' ? '<span style="color:green;font-weight:bold;">Yapıldı</span>' : statusId === 'missing' ? '<span style="color:red;font-weight:bold;">Eksik</span>' : statusId === 'assigned' ? '<span style="color:orange;font-weight:bold;">Verildi</span>' : '<span style="color:gray;">Muaf</span>'; const note = student.assignmentNotes?.[col.id] || '-'; html += `<tr><td><b>${topic.title}</b><br/>${col.title}</td><td>${statusText}</td><td>${note}</td></tr>`; }); }); html += `</table><script>window.onload = function() { setTimeout(function() { window.print(); }, 300); }; window.onafterprint = function() { window.close(); };</script></body></html>`; printWindow.document.write(html); printWindow.document.close(); };
    
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

    const handleModalSubmit = async () => {
        if (modalType === 'system-settings') { 
            await updateDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC), { announcement: modalInputVal, announcementTitle: modalTitleVal, countdown: { targetDate: modalDateVal ? `${modalDateVal}T00:00:00` : countdownConfig.targetDate, startDate: countdownConfig.startDate, label: modalPdfVal || "" } }); 
            setModalType(null); setModalInputVal(""); setModalTitleVal(""); setModalDateVal(""); setModalPdfVal(""); 
            return; 
        }
        
        if (!modalInputVal.trim() && modalType !== 'edit-date') return;
        
        if (modalType === 'class' || modalType === 'vip') { 
            await addDoc(collection(db, CLASSES_COLLECTION), { className: modalInputVal, type: modalType === 'vip' ? 'vip' : 'regular', students: [], topics: [], curriculum: [] }); 
        } 
        else if (modalType === 'edit-class') { 
            const cls = classes.find(c => c.id === modalData.classId); 
            updateClassInDb({ ...cls, className: modalInputVal }); 
        } 
        else if (modalType === 'edit-student') { 
            const cls = classes.find(c => c.id === modalData.classId); 
            const updatedStudents = cls.students.map(s => 
                s.id === modalData.studentId ? { ...s, name: modalInputVal, username: modalEditUsername.trim().toLowerCase(), password: modalEditPassword.trim() } : s
            ); 
            updateClassInDb({ ...cls, students: updatedStudents }); 
        } 
        else if (modalType === 'topic') { 
            const cls = classes.find(c => c.id === modalData.classId); 
            const newTopic = { id: generateId('top'), title: modalInputVal, date: modalDateVal, subColumns: [] }; 
            updateClassInDb({ ...cls, topics: [...(cls.topics||[]), newTopic] }); 
        } 
        else if (modalType === 'edit-topic') { 
            const cls = classes.find(c => c.id === modalData.classId); 
            const updatedTopics = cls.topics.map(t => t.id === modalData.topicId ? { ...t, title: modalInputVal, date: modalDateVal } : t); 
            updateClassInDb({ ...cls, topics: updatedTopics }); 
        } 
        else if (modalType === 'edit-date') { 
            const cls = classes.find(c => c.id === modalData.classId); 
            const updatedTopics = cls.topics.map(t => t.id === modalData.topicId ? { ...t, date: modalDateVal } : t); 
            updateClassInDb({ ...cls, topics: updatedTopics }); 
        } 
        else if (modalType === 'source') { 
            const cls = classes.find(c => c.id === modalData.classId); 
            const updatedTopics = cls.topics.map(t => t.id === modalData.topicId ? { ...t, subColumns: [...(t.subColumns||[]), { id: generateId('col'), title: modalInputVal, pdfLink: modalPdfVal }] } : t); 
            updateClassInDb({ ...cls, topics: updatedTopics }); 
        } 
        else if (modalType === 'edit-source') { 
            const cls = classes.find(c => c.id === modalData.classId); 
            const updatedTopics = cls.topics.map(t => { if (t.id === modalData.topicId) { return { ...t, subColumns: t.subColumns.map(c => c.id === modalData.colId ? { ...c, title: modalInputVal, pdfLink: modalPdfVal } : c) }; } return t; }); 
            updateClassInDb({ ...cls, topics: updatedTopics }); 
        }
        
        setModalType(null); 
        setModalInputVal(""); 
        setModalTitleVal(""); 
        setModalDateVal(""); 
        setModalPdfVal("");
        setModalEditUsername(""); 
        setModalEditPassword("");
    };

    if (!currentUserRole) return <LoginScreen onStudentLogin={handleStudentLogin} onTeacherLogin={verifyPin} />;

    return (
        <div className={`min-h-screen pb-32 relative transition-colors duration-1000 ${currentUserRole === 'vip-student' ? 'bg-slate-900' : 'bg-lightBg'}`}>
            {currentUserRole === 'vip-student' && ( <div className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"><div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full mix-blend-screen opacity-10" style={{background: 'radial-gradient(circle, rgba(255,215,0,0.4) 0%, transparent 70%)'}}></div><div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full mix-blend-screen opacity-[0.05]" style={{background: 'radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 70%)'}}></div></div> )}
            
            <header className={`no-print relative z-20 transition-all duration-500 ${currentUserRole === 'vip-student' ? 'bg-slate-800/90 border-b border-slate-700 shadow-md' : 'bg-white border-b border-slate-200 shadow-sm'}`}>
                 <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col items-center gap-2">
                    <div className="flex items-center gap-3 w-full justify-between">
                        {currentUserRole !== 'student' && currentUserRole !== 'vip-student' && view !== 'home' ? ( <button onClick={() => view === 'student-detail' ? setView('class-detail') : goHome()} className={`p-2 rounded-full transition-colors hover-lift ${currentUserRole === 'vip-student' ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}><ChevronLeft size={24} /></button> ) : <div className="w-10"></div>}
                        <div className="text-center"><h1 className={`text-xl md:text-3xl font-black tracking-tight flex items-center justify-center gap-3 ${currentUserRole === 'vip-student' ? 'real-gold-text' : 'text-slate-800'}`}><div className={`p-2 rounded-xl shadow-md transition-transform hover:scale-105 hover-lift ${currentUserRole === 'vip-student' ? 'real-gold-bg shadow-vip-glow' : 'bg-gradient-to-tr from-brandPurple to-blue-600 shadow-glow'}`}><GraduationCap className={currentUserRole === 'vip-student' ? 'text-[#111]' : 'text-white'} size={24} strokeWidth={2.5} /></div> BERKANT HOCA</h1></div>
                        <div className="flex items-center gap-2 min-w-[80px] justify-end">
                            {isTeacherMode && <button onClick={() => setShowLibraryManager(true)} className="p-2 text-slate-500 hover:text-brandPurple bg-white hover:bg-purple-50 rounded-full transition-colors shadow-sm border border-slate-200 hover-lift"><Library size={20}/></button>}
                            {(currentUserRole === 'student' || currentUserRole === 'vip-student') && <button onClick={handleOpenStudentSettings} className={`p-2 rounded-full transition-colors hover-lift ${currentUserRole === 'vip-student' ? 'text-slate-300 hover:text-vipGold bg-slate-700 border border-slate-600 shadow-sm' : 'text-slate-500 hover:text-brandPurple bg-white shadow-sm border border-slate-200'}`} title="Hesabım"><Settings size={20}/></button>}
                            <button onClick={handleLogout} className={`p-2 rounded-full transition-colors hover-lift ${currentUserRole === 'vip-student' ? 'text-rose-400 hover:text-rose-300 bg-slate-700 border border-slate-600 shadow-sm' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 shadow-sm border border-slate-200'}`} title="Çıkış Yap"><LogOut size={20}/></button>
                        </div>
                    </div>
                </div>
            </header>

            {view === 'home' && (
                <>
                    <div className="max-w-7xl mx-auto px-4 mt-6 animate-fade-in-up relative z-10">
                        <div className={`p-5 md:p-6 rounded-[2rem] shadow-sm border flex flex-col md:flex-row gap-4 items-start md:items-center relative overflow-hidden ${currentUserRole === 'vip-student' ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-100'}`}>
                            <div className={`p-3 rounded-2xl shrink-0 ${currentUserRole === 'vip-student' ? 'bg-slate-700 text-vipGold shadow-vip-glow' : 'bg-white text-brandPurple shadow-sm'}`}><Megaphone size={28} /></div>
                            <div className="flex-1 z-10 pr-8">
                                <h4 className={`text-xs font-black uppercase tracking-widest mb-1 ${currentUserRole === 'vip-student' ? 'text-slate-400' : 'text-brandPurple'}`}>{announcementTitle}</h4>
                                <p className={`text-sm md:text-base font-medium leading-relaxed ${currentUserRole === 'vip-student' ? 'text-slate-200' : 'text-slate-700'}`}>{systemAnnouncement}</p>
                            </div>
                            {isTeacherMode && <button onClick={() => { setModalType('system-settings'); setModalInputVal(systemAnnouncement); setModalTitleVal(announcementTitle); setModalPdfVal(countdownConfig.label); setModalDateVal(countdownConfig.targetDate.split('T')[0]); }} className={`absolute top-4 right-4 p-2 rounded-xl transition-all shadow-sm ${currentUserRole === 'vip-student' ? 'bg-slate-700 text-slate-300 hover:text-vipGold' : 'bg-white text-slate-400 hover:text-brandPurple hover:bg-purple-100'}`} title="Duyuru ve Takvimi Düzenle"><Edit3 size={18} /></button>}
                        </div>
                    </div>
                    <CountdownTimer targetDateStr={countdownConfig.targetDate} startDateStr={countdownConfig.startDate} targetLabel={countdownConfig.label} />
                </>
            )}

            <main className="max-w-7xl mx-auto px-4 mt-8 no-print relative z-10">
                <AnimatePresence mode="wait">
                    {isTeacherMode && view === 'home' && <TeacherDashboard regularClasses={regularClasses} vipClasses={vipClasses} onOpenClass={openClass} onNewClass={() => { setModalType('class'); setModalInputVal(''); }} onNewVipClass={() => { setModalType('vip'); setModalInputVal(''); }} />}
                    
                    {isTeacherMode && view === 'class-detail' && selectedClass && (
                        <ClassDetail 
                            selectedClass={selectedClass} 
                            activeTab={activeTab} 
                            setActiveTab={setActiveTab} 
                            isMobile={isMobile} 
                            newStudentName={newStudentName} 
                            setNewStudentName={setNewStudentName} 
                            addStudent={addStudent} 
                            updateGrade={updateGrade} 
                            openCellNoteModal={openCellNoteModal} 
                            setModalData={setModalData} 
                            setModalInputVal={setModalInputVal} 
                            setModalDateVal={setModalDateVal} 
                            setModalPdfVal={setModalPdfVal} 
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
                            saveToLibrary={async (topic) => { if(!topic.title) return; try { await addDoc(collection(db, LIBRARY_COLLECTION), { text: topic.title, type: LIBRARY_TYPES.CURRICULUM, subTopics: topic.subTopics ? topic.subTopics.map(st => ({ title: st.title })) : [] }); showAlert('success', 'Başarılı', 'Ödev başarıyla kütüphaneye kaydedildi!'); } catch (e) { showAlert('error', 'Hata', 'Kütüphane kayıt hatası oluştu!'); } }} 
                            setModalEditUsername={setModalEditUsername}
                            setModalEditPassword={setModalEditPassword}
                        />
                    )}

                    {!isTeacherMode && view === 'home' && <StudentDashboard classes={classes} currentUserRole={currentUserRole} onOpenClass={openClass} />}
                    
                    {view === 'student-detail' && selectedClass && selectedStudentForView && <StudentDetail selectedStudentForView={selectedStudentForView} selectedClass={selectedClass} currentUserRole={currentUserRole} activeTab={activeTab} setActiveTab={setActiveTab} isTeacherMode={isTeacherMode} openCellNoteModal={openCellNoteModal} updateGrade={updateGrade} updateClassInDb={updateClassInDb} />}
                </AnimatePresence>
            </main>

            {showLibraryManager && <LibraryModal libraryCategory={libraryCategory} setLibraryCategory={setLibraryCategory} libraryInput={libraryInput} setLibraryInput={setLibraryInput} libraryDate={libraryDate} setLibraryDate={setLibraryDate} libraryItems={libraryItems} addLibraryItem={addLibraryItem} deleteLibraryItem={deleteLibraryItem} onClose={() => setShowLibraryManager(false)} />}
            
           {showAssistant && <JarvisModal classes={classes} updateClassInDb={updateClassInDb} onClose={() => setShowAssistant(false)} initialStudent={selectedStudentForView} />}
            
            {/* BİLGİ GİRİŞ/DÜZENLEME MODALLARI */}
            {modalType && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
                        {modalType === 'system-settings' ? (
                            <>
                                <h3 className="font-bold text-lg mb-4 text-slate-800 flex items-center gap-2"><Settings size={20} className="text-brandPurple"/> Sistem Ayarları</h3>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Duyuru Başlığı</label>
                                <input type="text" className="w-full border-2 border-slate-200 rounded-xl p-3 mb-4 font-bold text-sm outline-none focus:border-brandPurple" value={modalTitleVal} onChange={e => setModalTitleVal(e.target.value)} />
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Duyuru Metni</label>
                                <textarea rows="3" className="w-full border-2 border-slate-200 rounded-xl p-3 mb-4 font-bold text-sm outline-none focus:border-brandPurple" value={modalInputVal} onChange={e => setModalInputVal(e.target.value)}></textarea>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Sayaç Başlığı (Örn: 20 Haziran 2026)</label>
                                <input type="text" className="w-full border-2 border-slate-200 rounded-xl p-3 mb-4 font-bold text-sm outline-none focus:border-brandPurple" value={modalPdfVal} onChange={e => setModalPdfVal(e.target.value)} />
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Sayaç Hedef Tarihi</label>
                                <input type="date" className="w-full border-2 border-slate-200 rounded-xl p-3 mb-4 font-bold text-sm outline-none focus:border-brandPurple" value={modalDateVal} onChange={e => setModalDateVal(e.target.value)} />
                            </>
                        ) : modalType === 'edit-student' ? (
                            <>
                                <h3 className="font-bold text-lg mb-4 text-slate-800">Öğrenci Bilgilerini Düzenle</h3>
                                
                                <div className="mb-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Öğrenci Adı</label>
                                    <input type="text" autoFocus className="w-full border-2 border-slate-200 rounded-xl p-3 mb-2 font-bold outline-none focus:border-brandPurple" value={modalInputVal} onChange={e => setModalInputVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleModalSubmit()} />
                                </div>
                                
                                <div className="mb-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Kullanıcı Adı</label>
                                    <input type="text" className="w-full border-2 border-slate-200 rounded-xl p-3 mb-2 font-bold outline-none focus:border-brandPurple" value={modalEditUsername} onChange={e => setModalEditUsername(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleModalSubmit()} />
                                </div>

                                <div className="mb-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Şifre</label>
                                    <input type="text" className="w-full border-2 border-slate-200 rounded-xl p-3 mb-2 font-bold outline-none focus:border-brandPurple" value={modalEditPassword} onChange={e => setModalEditPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleModalSubmit()} />
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 className="font-bold text-lg mb-4 text-slate-800">{modalType === 'class' ? 'Yeni Sınıf Oluştur' : modalType === 'vip' ? 'Yeni Özel Ders Oluştur' : modalType === 'topic' ? 'Yeni Ödev Ekle' : 'Düzenle'}</h3>
                                <input type="text" autoFocus className="w-full border-2 border-slate-200 rounded-xl p-3 mb-2 font-bold outline-none focus:border-brandPurple" placeholder="Başlık girin..." value={modalInputVal} onChange={e => setModalInputVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleModalSubmit()} />
                                
                                {modalType === 'topic' && (
                                    <div className="mb-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Veya Kütüphaneden Seç:</label>
                                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1">
                                            {libraryItems.filter(i => i.type === LIBRARY_TYPES.TOPIC).map(item => ( <button key={item.id} onClick={() => setModalInputVal(item.text)} className="text-xs bg-purple-50 hover:bg-purple-100 text-brandPurple px-2.5 py-1.5 rounded-lg transition-colors font-bold border border-purple-100">{item.text}</button> ))}
                                            {libraryItems.filter(i => i.type === LIBRARY_TYPES.TOPIC).length === 0 && <span className="text-[10px] text-slate-400 italic">Kütüphanede ödev başlığı yok.</span>}
                                        </div>
                                    </div>
                                )}
                                {modalType === 'source' && (
                                    <div className="mb-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Veya Kütüphaneden Seç:</label>
                                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1">
                                            {libraryItems.filter(i => i.type === LIBRARY_TYPES.SOURCE).map(item => ( <button key={item.id} onClick={() => setModalInputVal(item.text)} className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1.5 rounded-lg transition-colors font-bold border border-emerald-100">{item.text}</button> ))}
                                            {libraryItems.filter(i => i.type === LIBRARY_TYPES.SOURCE).length === 0 && <span className="text-[10px] text-slate-400 italic">Kütüphanede kaynak başlığı yok.</span>}
                                        </div>
                                    </div>
                                )}

                                {(modalType === 'source' || modalType === 'edit-source') && ( <input type="text" className="w-full border-2 border-slate-200 rounded-xl p-3 mb-4 font-bold text-sm outline-none focus:border-brandPurple" placeholder="Google Drive Linki (İsteğe bağlı)" value={modalPdfVal} onChange={e => setModalPdfVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleModalSubmit()} /> )}
                                {(modalType === 'topic' || modalType === 'edit-topic' || modalType === 'edit-date') && ( <input type="date" className="w-full border-2 border-slate-200 rounded-xl p-3 mb-4 font-bold text-sm outline-none focus:border-brandPurple" value={modalDateVal} onChange={e => setModalDateVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleModalSubmit()} /> )}
                            </>
                        )}
                        <div className="flex gap-2 justify-end mt-2">
                            <button onClick={() => { setModalType(null); setModalEditUsername(""); setModalEditPassword(""); }} className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-xl">İptal</button>
                            <button onClick={handleModalSubmit} className="px-4 py-2 bg-brandPurple text-white font-bold rounded-xl hover:bg-purple-700 shadow-md">Kaydet</button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* ÖĞRENCİ KENDİ HESAP AYARLARI MODALI */}
            <AnimatePresence>
                {studentSettingsModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
                            <h3 className="font-bold text-lg mb-4 text-slate-800 flex items-center gap-2">
                                <Settings size={20} className="text-brandPurple"/> Hesap Bilgilerini Düzenle
                            </h3>
                            
                            <div className="mb-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Kullanıcı Adı</label>
                                <input type="text" autoCapitalize="none" autoCorrect="off" spellCheck="false" className="w-full border-2 border-slate-200 rounded-xl p-3 mb-2 font-bold outline-none focus:border-brandPurple" value={studentUsernameInput} onChange={e => setStudentUsernameInput(e.target.value)} />
                            </div>

                            <div className="mb-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Yeni Şifre</label>
                                <input type="text" autoCapitalize="none" autoCorrect="off" spellCheck="false" className="w-full border-2 border-slate-200 rounded-xl p-3 mb-2 font-bold outline-none focus:border-brandPurple" placeholder="Yeni şifrenizi girin" value={studentPasswordInput} onChange={e => setStudentPasswordInput(e.target.value)} />
                            </div>

                            <div className="mb-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Yeni Şifre (Tekrar)</label>
                                <input type="text" autoCapitalize="none" autoCorrect="off" spellCheck="false" className="w-full border-2 border-slate-200 rounded-xl p-3 mb-2 font-bold outline-none focus:border-brandPurple" placeholder="Şifrenizi doğrulayın" value={studentConfirmPasswordInput} onChange={e => setStudentConfirmPasswordInput(e.target.value)} />
                            </div>

                            <div className="flex gap-2 justify-end mt-2">
                                <button onClick={() => setStudentSettingsModal(false)} className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-xl">İptal</button>
                                <button onClick={handleSaveStudentSettings} className="px-4 py-2 bg-brandPurple text-white font-bold rounded-xl hover:bg-purple-700 shadow-md">Değişiklikleri Kaydet</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* TABLODAKİ BUTON/MENÜ MODALLARI */}
            {activeCell && <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setActiveCell(null)}><motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-4 rounded-2xl shadow-xl flex gap-2" onClick={e => e.stopPropagation()}>{STATUS_OPTIONS.map(opt => ( <button key={opt.id} onClick={() => updateGrade(activeCell.classId, activeCell.studentId, activeCell.colId, opt.id)} className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all ${opt.bg} ${opt.color} hover:scale-105 border ${opt.border}`}><opt.icon size={24} className="mb-2" strokeWidth={2.5}/><span className="text-xs font-black uppercase tracking-wider">{opt.label}</span></button> ))}</motion.div></div>}
            
            {activeColMenu && <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setActiveColMenu(null)}><motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-2 rounded-2xl shadow-xl flex flex-col gap-1 w-52" onClick={e => e.stopPropagation()}><button onClick={() => { const cls = classes.find(c => c.id === activeColMenu.classId); const col = cls.topics.find(t => t.id === activeColMenu.topicId).subColumns.find(c => c.id === activeColMenu.colId); setModalData({ classId: cls.id, topicId: activeColMenu.topicId, colId: col.id }); setModalInputVal(col.title); setModalPdfVal(col.pdfLink || ""); setModalType('edit-source'); setActiveColMenu(null); }} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"><Pencil size={16}/> Kaynağı Düzenle</button><button onClick={() => { deleteColumn(activeColMenu.classId, activeColMenu.topicId, activeColMenu.colId); setActiveColMenu(null); }} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 size={16}/> Kaynağı Sil</button></motion.div></div>}
            
            {activeTopicMenu && <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setActiveTopicMenu(null)}><motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-2 rounded-2xl shadow-xl flex flex-col gap-1 w-56" onClick={e => e.stopPropagation()}>
                <button onClick={() => { const cls = classes.find(c => c.id === activeTopicMenu.classId); const top = cls.topics.find(t => t.id === activeTopicMenu.topicId); setModalData({ classId: cls.id, topicId: top.id }); setModalInputVal(top.title); setModalDateVal(top.date || ""); setModalType('edit-topic'); setActiveTopicMenu(null); }} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"><Pencil size={16}/> Başlık / Tarih Düzenle</button>
                <button onClick={() => { deleteTopic(activeTopicMenu.classId, activeTopicMenu.topicId); setActiveTopicMenu(null); }} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 size={16}/> Ödevi Sil</button>
            </motion.div></div>}
            
            {cellNoteModal && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4"><motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"><h3 className="font-bold text-lg mb-4 text-slate-800 flex items-center gap-2"><Edit3 size={20} className="text-amber-500"/>Öğretmen Notu</h3><textarea autoFocus rows="4" className="w-full border-2 border-slate-200 rounded-xl p-3 mb-4 font-medium text-sm outline-none focus:border-amber-400" placeholder="Öğrenci için notunuzu buraya yazın..." value={cellNoteModal.note} onChange={e => setCellNoteModal({ ...cellNoteModal, note: e.target.value })}></textarea><div className="flex gap-2 justify-end mt-2"><button onClick={() => setCellNoteModal(null)} className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-xl">İptal</button><button onClick={() => { const cls = classes.find(c => c.id === cellNoteModal.classId); const updatedStudents = cls.students.map(s => s.id === cellNoteModal.studentId ? { ...s, assignmentNotes: { ...(s.assignmentNotes || {}), [cellNoteModal.colId]: cellNoteModal.note } } : s); updateClassInDb({ ...cls, students: updatedStudents }); setCellNoteModal(null); }} className="px-4 py-2 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 shadow-md">Notu Kaydet</button></div></motion.div></div>}
            
            {isTeacherMode && <button onClick={() => setShowAssistant(true)} className="fab-button bg-brandPurple text-white" title="Akıllı Asistan"><div className="fab-pulse"></div><Mic size={28} /></button>}

            {/* 💎 CUSTOM ALERT / DIALOG MODALI */}
            <AnimatePresence>
                {dialogData.isOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl">
                            <div className="p-6 text-center">
                                <div className="flex justify-center mb-4">
                                    {dialogData.type === 'warning' && <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center"><AlertTriangle size={32} /></div>}
                                    {dialogData.type === 'error' && <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center"><AlertTriangle size={32} /></div>}
                                    {dialogData.type === 'success' && <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center"><CheckCircle size={32} /></div>}
                                    {dialogData.type === 'info' && <div className="w-16 h-16 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center"><Info size={32} /></div>}
                                </div>
                                <h3 className="text-xl font-black text-slate-800 mb-2">{dialogData.title}</h3>
                                <p className="text-slate-500 font-medium text-sm whitespace-pre-wrap">{dialogData.message}</p>
                            </div>
                            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                                {dialogData.onConfirm ? (
                                    <>
                                        <button onClick={closeAlert} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition-colors">İptal</button>
                                        <button onClick={() => { dialogData.onConfirm(); closeAlert(); }} className={`flex-1 py-3 rounded-xl font-bold text-white transition-colors shadow-sm ${dialogData.type === 'warning' || dialogData.type === 'error' ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/30' : 'bg-brandPurple hover:bg-purple-600 shadow-brandPurple/30'}`}>Evet, Onaylıyorum</button>
                                    </>
                                ) : (
                                    <button onClick={closeAlert} className="w-full py-3 bg-brandPurple text-white rounded-xl font-bold shadow-glow hover:bg-purple-600 transition-colors">Tamam</button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* 🔴 İNTERNETSİZ ÇALIŞMAYI ENGELLEYEN TAM SAYFA KAPLAMA (OVERLAY) */}
            <AnimatePresence>
                {!isOnline && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[99999] flex flex-col items-center justify-center p-6 text-center select-none"
                    >
                        <motion.div 
                            animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
                            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                            className="w-24 h-24 bg-rose-500/10 border border-rose-500/30 rounded-full flex items-center justify-center text-rose-500 mb-6 shadow-[0_0_50px_rgba(239,68,68,0.2)]"
                        >
                            <WifiOff size={44} />
                        </motion.div>
                        <h2 className="text-2xl md:text-3xl font-black text-white tracking-wide uppercase">Bağlantı Kesildi</h2>
                        <p className="text-slate-400 text-sm md:text-base mt-3 max-w-sm font-medium leading-relaxed">
                            Berkant Hoca Eğitim Platformu aktif bir internet bağlantısı gerektirir. Lütfen ağ ayarlarınızı kontrol edin.
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 🚀 KAÇIŞI OLMAYAN ZORUNLU GÜNCELLEME EKRANI (UPDATE PROMPT) */}
            <AnimatePresence>
                {needRefresh && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[99998] flex items-center justify-center p-4 select-none"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 30 }} 
                            animate={{ scale: 1, y: 0 }}
                            className="bg-slate-900 border-2 border-brandPurple/40 p-6 md:p-8 rounded-[2.5rem] w-full max-w-md text-center shadow-[0_0_80px_rgba(147,51,234,0.25)] relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-brandPurple/10 blur-3xl pointer-events-none"></div>

                            <div className="w-16 h-16 bg-purple-500/10 border border-purple-500/30 text-brandPurple rounded-full flex items-center justify-center mx-auto mb-6 shadow-glow">
                                <RefreshCw size={28} className="animate-spin" style={{ animationDuration: '6s' }} />
                            </div>

                            <h3 className="text-2xl font-black text-white tracking-wide uppercase">Sistem Güncellemesi</h3>
                            <p className="text-slate-300 text-xs md:text-sm font-medium mt-3 leading-relaxed">
                                Sizin için uygulamayı geliştirdik ve yeni akıllı özellikler ekledik! Kesintisiz ve hatasız bir deneyim için devam etmeden önce lütfen güncelleyin.
                            </p>

                            <motion.button 
                                whileHover={{ scale: 1.03 }} 
                                whileTap={{ scale: 0.97 }} 
                                onClick={() => updateServiceWorker(true)}
                                className="w-full mt-8 bg-brandPurple hover:bg-purple-600 text-white font-black py-4 rounded-2xl shadow-glow tracking-widest text-sm transition-colors flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={16} /> UYGULAMAYI GÜNCELLE
                            </motion.button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};
export default App;
