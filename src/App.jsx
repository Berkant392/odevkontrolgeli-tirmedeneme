import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, GraduationCap, Library, Settings, LogOut, Mic, X, Megaphone, Edit3, Pencil, Trash2, AlertTriangle, CheckCircle, Info } from 'lucide-react';

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
    const [countdownConfig, setCountdownConfig] = useState({ targetDate: '2026-06-20T00:00:00', startDate: '2025-06-20T00:00:00', label: '20 Haziran 2026' });
    const [view, setView] = useState('home'); 
    const [activeTab, setActiveTab] = useState('homework'); 
    const [selectedClass, setSelectedClass] = useState(null);
    const [selectedStudentForView, setSelectedStudentForView] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    
    // 🔥 YENİ: MERKEZİ UYARI/ONAY SİSTEMİ (Custom Alert)
    const [dialogData, setDialogData] = useState({ isOpen: false, type: 'info', title: '', message: '', onConfirm: null });

    useEffect(() => { const handleResize = () => setIsMobile(window.innerWidth < 768); window.addEventListener('resize', handleResize); return () => window.removeEventListener('resize', handleResize); }, []);
    
    const [newStudentName, setNewStudentName] = useState("");
    const [modalType, setModalType] = useState(null); 
    const [modalData, setModalData] = useState(null);
    const [modalInputVal, setModalInputVal] = useState("");
    const [modalTitleVal, setModalTitleVal] = useState(""); 
    const [modalDateVal, setModalDateVal] = useState("");
    const [modalPdfVal, setModalPdfVal] = useState("");
    
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

    const regularClasses = classes.filter(c => c.type !== 'vip');
    const vipClasses = classes.filter(c => c.type === 'vip');

    // 🎨 ÖZEL UYARI FONKSİYONU
    const showAlert = (type, title, message, onConfirm = null) => {
        setDialogData({ isOpen: true, type, title, message, onConfirm });
    };
    const closeAlert = () => setDialogData({ isOpen: false, type: 'info', title: '', message: '', onConfirm: null });

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
            showAlert('error', 'Giriş Başarısız', 'Girdiğiniz PIN kodu hatalı. Lütfen tekrar deneyin.');
        } 
    };

    const handleStudentLogin = (username, password, isVipLogin = false) => {
        let foundStudent = null, foundClass = null; const classesToSearch = isVipLogin ? vipClasses : regularClasses;
        for (const cls of classesToSearch) { const std = cls.students?.find(s => s.username === username.trim() && s.password === password.trim()); if (std) { foundStudent = std; foundClass = cls; break; } }
        if (foundStudent) { 
            setCurrentUserRole(isVipLogin ? 'vip-student' : 'student'); setLoggedInStudent(foundStudent); setSelectedClass(foundClass); setSelectedStudentForView(foundStudent); setView('student-detail'); setActiveTab('homework'); const updatedStudents = foundClass.students.map(s => s.id === foundStudent.id ? { ...s, lastLogin: new Date().toISOString() } : s); updateClassInDb({ ...foundClass, students: updatedStudents }); 
        } else { 
            showAlert('error', 'Bağlantı Hatası', 'Kullanıcı adı veya şifre hatalı!');
        }
    };
    
    const handleLogout = () => { setCurrentUserRole(null); setIsTeacherMode(false); setLoggedInStudent(null); setSelectedClass(null); setSelectedStudentForView(null); setView('home'); };
    const updateClassInDb = async (updatedClass) => { try { await updateDoc(doc(db, CLASSES_COLLECTION, updatedClass.id), updatedClass); if (selectedClass?.id === updatedClass.id) setSelectedClass(updatedClass); } catch (e) { console.error("Sınıf güncellenemedi:", e); } };
    const goHome = () => { setView('home'); setSelectedClass(null); setSelectedStudentForView(null); setActiveTab('homework'); };
    const openClass = (cls) => { setSelectedClass(cls); setView('class-detail'); setActiveTab('homework'); };
    const openStudent = (std) => { setSelectedStudentForView(std); setView('student-detail'); setActiveTab('homework'); };
    
    const addLibraryItem = async (text) => { if(!text || typeof text !== 'string' || !text.trim()) return; let subTopics = []; let mainText = text.trim(); if (libraryCategory === LIBRARY_TYPES.CURRICULUM && text.includes(',')) { const parts = text.split(','); mainText = parts[0].trim(); subTopics = parts.slice(1).map(p => ({ title: p.trim() })).filter(p => p.title); } await addDoc(collection(db, LIBRARY_COLLECTION), { text: mainText, type: libraryCategory, date: libraryCategory === LIBRARY_TYPES.TOPIC ? libraryDate : null, subTopics: subTopics }); showAlert('success', 'Kütüphaneye Eklendi', 'Öğe başarıyla kütüphaneye kaydedildi.');};
    
    // KÜTÜPHANEDEN SİLME
    const deleteLibraryItem = (id) => { 
        showAlert('warning', 'Emin misiniz?', 'Bu öğe kütüphaneden kalıcı olarak silinecek.', async () => {
            await deleteDoc(doc(db, LIBRARY_COLLECTION, id));
            showAlert('success', 'Silindi', 'Öğe kütüphaneden kaldırıldı.');
        });
    };
    
    const addStudent = (classId) => { if(!newStudentName.trim()) return; const cls = classes.find(c => c.id === classId); const username = newStudentName.toLowerCase().replace(/\s+/g, '.') + Math.floor(Math.random()*1000); const password = Math.random().toString(36).slice(-6); const newStd = { id: generateId('std'), name: newStudentName, username, password, grades: {}, assignmentNotes: {} }; updateClassInDb({ ...cls, students: [...(cls.students || []), newStd] }); setNewStudentName(""); };
    
    // ÖĞRENCİ SİLME
    const deleteStudent = (e, classId, studentId) => { 
        e.stopPropagation(); 
        showAlert('warning', 'Öğrenci Silinecek', 'Öğrenciyi ve tüm notlarını silmek istediğinize emin misiniz?', () => {
            const cls = classes.find(c => c.id === classId); 
            updateClassInDb({ ...cls, students: cls.students.filter(s => s.id !== studentId) });
        });
    };
    
    const updateGrade = (classId, studentId, colId, statusId) => { const cls = classes.find(c => c.id === classId); const updatedStudents = cls.students.map(s => s.id === studentId ? { ...s, grades: { ...s.grades, [colId]: statusId } } : s); updateClassInDb({ ...cls, students: updatedStudents }); };
    
    // SINIF SİLME
    const deleteClass = (e, id) => { 
        e.stopPropagation(); 
        showAlert('warning', 'Sınıf Silinecek', 'Bu sınıfı ve içindeki TÜM ÖĞRENCİLERİ silmek istediğinize emin misiniz? Bu işlem geri alınamaz!', async () => {
            await deleteDoc(doc(db, CLASSES_COLLECTION, id));
            setView('home'); setSelectedClass(null);
            showAlert('success', 'Silindi', 'Sınıf başarıyla silindi.');
        });
    };
    
    const handleCreateClass = async (name, type) => { if(!name.trim()) return; const newCls = { name: name.trim(), className: name.trim(), type, topics: [], students: [], curriculum: [], createdAt: new Date().toISOString() }; try { await addDoc(collection(db, CLASSES_COLLECTION), newCls); showAlert('success', 'Başarılı', 'Sınıf başarıyla oluşturuldu.');} catch (e) { showAlert('error', 'Hata', 'Sınıf oluşturulamadı.'); } };
    
    // ÖDEV SİLME (Ana Başlık)
    const deleteTopic = (classId, topicId) => {
        showAlert('warning', 'Ödevi Sil', 'Bu ödevi (ana başlığı) silmek istediğinize emin misiniz?', () => {
            const cls = classes.find(c => c.id === classId);
            const updatedTopics = cls.topics.filter(t => t.id !== topicId);
            updateClassInDb({ ...cls, topics: updatedTopics });
            setActiveTopicMenu(null);
        });
    };

    // KAYNAK SİLME (Alt Sütun)
    const deleteColumn = (classId, topicId, colId) => { 
        showAlert('warning', 'Kaynağı Sil', 'Bu kaynağı silmek istediğinize emin misiniz?', () => {
            const cls = classes.find(c => c.id === classId); 
            const updatedTopics = cls.topics.map(t => { if(t.id === topicId) return { ...t, subColumns: t.subColumns.filter(c => c.id !== colId) }; return t; }); 
            updateClassInDb({ ...cls, topics: updatedTopics }); 
            setActiveColMenu(null);
        });
    };

    const handleSaveModal = () => {
        if (!selectedClass) return;
        const cls = selectedClass;
        if (modalType === 'edit-class') {
            updateClassInDb({ ...cls, className: modalInputVal, name: modalInputVal });
        } else if (modalType === 'edit-student') {
            updateClassInDb({ ...cls, students: cls.students.map(s => s.id === modalData.studentId ? { ...s, name: modalInputVal } : s) });
        } else if (modalType === 'topic') {
            const newTopic = { id: generateId('top'), title: modalInputVal, date: modalDateVal, subColumns: [] };
            updateClassInDb({ ...cls, topics: [...(cls.topics || []), newTopic] });
        } else if (modalType === 'edit-topic') {
            updateClassInDb({ ...cls, topics: cls.topics.map(t => t.id === modalData.topicId ? { ...t, title: modalInputVal, date: modalDateVal } : t) });
        } else if (modalType === 'source') {
            const newCol = { id: generateId('col'), title: modalInputVal, pdfLink: modalPdfVal || "" };
            updateClassInDb({ ...cls, topics: cls.topics.map(t => t.id === modalData.topicId ? { ...t, subColumns: [...(t.subColumns || []), newCol] } : t) });
        } else if (modalType === 'edit-source') {
            updateClassInDb({ ...cls, topics: cls.topics.map(t => t.id === modalData.topicId ? { ...t, subColumns: t.subColumns.map(c => c.id === modalData.colId ? { ...c, title: modalInputVal, pdfLink: modalPdfVal } : c) } : t) });
        }
        setModalType(null); setModalInputVal(""); setModalTitleVal(""); setModalDateVal(""); setModalPdfVal("");
    };

    const handleOpenRisk = (cls) => {
        const stats = calculateStats(cls.students, cls.topics);
        if (stats.atRisk && stats.atRisk.length > 0) {
            let msg = stats.atRisk.map(s => `• ${s.name} - Başarı Oranı: %${s.rate}`).join('\n');
            showAlert('warning', `⚠️ RİSKLİ ÖĞRENCİLER (${cls.className})`, msg);
        } else {
            showAlert('success', 'Harika!', 'Bu sınıfta risk grubunda öğrenci bulunmuyor.');
        }
    };

    const handlePrintPasswords = (cls) => {
        let content = `<h2>${cls.className} - Giriş Bilgileri</h2><table border="1" style="width:100%; border-collapse:collapse; text-align:left;"><tr><th>Öğrenci Adı</th><th>Kullanıcı Adı</th><th>Şifre</th></tr>`;
        cls.students?.forEach(s => { content += `<tr><td style="padding:8px;">${s.name}</td><td style="padding:8px; font-family:monospace;">${s.username || '-'}</td><td style="padding:8px; font-family:monospace;">${s.password || '-'}</td></tr>`; });
        content += `</table>`;
        const printWin = window.open('', '', 'width=800,height=600'); printWin.document.write(content); printWin.document.close(); printWin.print();
    };

    if (!currentUserRole) return <LoginScreen onLogin={handleStudentLogin} onTeacherLogin={verifyPin} />;

    return (
        <div className={`min-h-screen pb-20 ${currentUserRole === 'vip-student' ? 'bg-vipBg text-slate-200' : 'bg-lightBg'}`}>
            <nav className={`fixed top-0 left-0 w-full z-50 transition-all ${currentUserRole === 'vip-student' ? 'bg-vipBg/80 border-slate-800 backdrop-blur-xl' : 'glass-panel border-b'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {view !== 'home' && <motion.button whileHover={{ x: -3 }} whileTap={{ scale: 0.9 }} onClick={goHome} className={`p-2 rounded-xl transition-colors flex items-center gap-1 font-bold ${currentUserRole === 'vip-student' ? 'text-vipGold bg-slate-800/50 hover:bg-slate-700' : 'text-slate-600 bg-white hover:text-brandPurple hover:bg-purple-50 shadow-sm'}`}><ChevronLeft size={20}/><span className="hidden md:block">Geri</span></motion.button>}
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center shadow-lg ${currentUserRole === 'vip-student' ? 'real-gold-bg text-slate-900' : 'bg-brandPurple text-white'}`}><GraduationCap size={24} /></div>
                            <div className="hidden md:block"><h1 className={`text-xl font-black tracking-tight ${currentUserRole === 'vip-student' ? 'text-white' : 'text-slate-800'}`}>Berkant Hoca</h1><p className={`text-[10px] font-black uppercase tracking-widest ${currentUserRole === 'vip-student' ? 'text-vipGold' : 'text-slate-500'}`}>{currentUserRole === 'teacher' ? 'Yönetim Paneli' : 'Öğrenci Portalı'}</p></div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {isTeacherMode && (
                            <>
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowAssistant(true)} className="hidden md:flex bg-gradient-to-r from-brandPurple to-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-glow items-center gap-2"> <Mic size={16}/> Asistan</motion.button>
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowLibraryManager(true)} className="hidden md:flex bg-white text-slate-600 border border-slate-200 hover:text-brandPurple hover:bg-purple-50 px-4 py-2 rounded-xl text-sm font-bold shadow-sm items-center gap-2"><Library size={18}/> Kütüphane</motion.button>
                            </>
                        )}
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleLogout} className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-2 md:px-4 md:py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 shadow-sm"><LogOut size={18}/><span className="hidden md:block">Çıkış</span></motion.button>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 md:pt-32">
                {isTeacherMode && view === 'home' && (
                    <div className="mb-8 p-6 rounded-[2rem] bg-gradient-to-br from-brandPurple to-blue-600 text-white shadow-glow relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                        <div className="relative z-10 flex-1">
                            <h2 className="text-2xl md:text-3xl font-black mb-2 tracking-tight">Eğitim Yönetim Merkezi</h2>
                            <p className="text-purple-100 font-medium text-sm md:text-base">Toplam {classes.length} aktif sınıf ve eğitim programı yönetiliyor.</p>
                        </div>
                        <div className="relative z-10 flex items-center gap-3">
                            <CountdownTimer targetDateStr={countdownConfig.targetDate} startDateStr={countdownConfig.startDate} targetLabel={countdownConfig.label} />
                        </div>
                    </div>
                )}
                
                <AnimatePresence mode="wait">
                    {view === 'home' && isTeacherMode && <TeacherDashboard key="teacher" regularClasses={regularClasses} vipClasses={vipClasses} onOpenClass={openClass} onNewClass={() => { setModalData({ classId: generateId('cls') }); setModalType('class'); }} onNewVipClass={() => { setModalData({ classId: generateId('vip'), type: 'vip' }); setModalType('class'); }} />}
                    {view === 'home' && !isTeacherMode && <StudentDashboard key="student" classes={classes} currentUserRole={currentUserRole} onOpenClass={openClass} />}
                    {view === 'class-detail' && selectedClass && <ClassDetail key="class" selectedClass={selectedClass} activeTab={activeTab} setActiveTab={setActiveTab} isMobile={isMobile} newStudentName={newStudentName} setNewStudentName={setNewStudentName} addStudent={addStudent} updateGrade={updateGrade} openCellNoteModal={(c,s,col,n) => setCellNoteModal({classId:c, studentId:s, colId:col, note:n})} setModalData={setModalData} setModalInputVal={setModalInputVal} setModalDateVal={setModalDateVal} setModalPdfVal={setModalPdfVal} setModalType={setModalType} deleteStudent={deleteStudent} handlePrintStudentReport={()=>{}} openStudent={openStudent} setActiveTopicMenu={setActiveTopicMenu} setActiveColMenu={setActiveColMenu} setActiveCell={setActiveCell} deleteColumn={deleteColumn} deleteTopic={deleteTopic} updateClassInDb={updateClassInDb} handleOpenRisk={handleOpenRisk} handlePrintPasswords={handlePrintPasswords} deleteClass={deleteClass} libraryItems={libraryItems} saveToLibrary={(data) => addLibraryItem(typeof data === 'string' ? data : JSON.stringify(data))} />}
                    {view === 'student-detail' && selectedStudentForView && selectedClass && <StudentDetail key="student-det" selectedStudentForView={selectedStudentForView} selectedClass={selectedClass} currentUserRole={currentUserRole} activeTab={activeTab} setActiveTab={setActiveTab} isTeacherMode={isTeacherMode} openCellNoteModal={(c,s,col,n) => setCellNoteModal({classId:c, studentId:s, colId:col, note:n})} updateGrade={updateGrade} updateClassInDb={updateClassInDb} />}
                </AnimatePresence>
            </main>

            {/* 💎 CUSTOM ALERT / DIALOG MODALI */}
            <AnimatePresence>
                {dialogData.isOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl"
                        >
                            <div className="p-6 text-center">
                                <div className="flex justify-center mb-4">
                                    {dialogData.type === 'warning' && <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center"><AlertTriangle size={32} /></div>}
                                    {dialogData.type === 'error' && <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center"><Trash2 size={32} /></div>}
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

            {/* ESKİ BİLGİ GİRİŞ MODALLARI (Ekle/Düzenle) */}
            <AnimatePresence>
                {modalType && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl w-full max-w-md p-6 shadow-float">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-black text-xl text-slate-800">
                                    {modalType === 'class' ? 'Yeni Sınıf Oluştur' : modalType === 'edit-class' ? 'Sınıf Adını Düzenle' : modalType === 'student' ? 'Yeni Öğrenci Ekle' : modalType === 'edit-student' ? 'Öğrenci Adını Düzenle' : modalType === 'topic' ? 'Yeni Ödev Ekle' : modalType === 'edit-topic' ? 'Ödevi Düzenle' : modalType === 'source' ? 'Kaynak Ekle' : 'Kaynağı Düzenle'}
                                </h3>
                                <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full"><X size={20}/></button>
                            </div>
                            <div className="space-y-4">
                                <div><label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Başlık / İsim</label><input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold focus:border-brandPurple outline-none transition-colors" value={modalInputVal} onChange={e => setModalInputVal(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && handleSaveModal()} /></div>
                                {(modalType === 'topic' || modalType === 'edit-topic') && (<div><label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Son Teslim Tarihi</label><input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold focus:border-brandPurple outline-none transition-colors" value={modalDateVal} onChange={e => setModalDateVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveModal()}/></div>)}
                                {(modalType === 'source' || modalType === 'edit-source') && (<div><label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">PDF Linki (İsteğe Bağlı)</label><input type="url" placeholder="https://drive.google.com/..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium focus:border-brandPurple outline-none transition-colors" value={modalPdfVal} onChange={e => setModalPdfVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveModal()}/></div>)}
                                <button onClick={handleSaveModal} className="w-full bg-brandPurple text-white py-3 rounded-xl font-bold shadow-glow hover:bg-purple-700 transition-colors mt-2">Kaydet</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* KÜTÜPHANE VE ASİSTAN MODALLARI */}
            <AnimatePresence>
                {showLibraryManager && <LibraryModal libraryCategory={libraryCategory} setLibraryCategory={setLibraryCategory} libraryInput={libraryInput} setLibraryInput={setLibraryInput} libraryDate={libraryDate} setLibraryDate={setLibraryDate} libraryItems={libraryItems} addLibraryItem={addLibraryItem} deleteLibraryItem={deleteLibraryItem} onClose={() => setShowLibraryManager(false)} />}
                {showAssistant && <JarvisModal classes={classes} updateClassInDb={updateClassInDb} onClose={() => setShowAssistant(false)} />}
            </AnimatePresence>
        </div>
    );
};

export default App;
