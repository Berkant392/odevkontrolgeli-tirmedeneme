import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { db } from './config/firebase'; 
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { CLASSES_COLLECTION, DEFAULT_PIN } from './utils/constants';

// BİLEŞENLER
import Header from './components/common/Header';
import OfflineScreen from './components/common/OfflineScreen';
import UpdatePrompt from './components/common/UpdatePrompt';
import CustomAlert from './components/common/CustomAlert';
import LoginScreen from './components/auth/LoginScreen';
import ClassDetail from './components/views/ClassDetail';
import NetTakipModal from './components/modals/NetTakipModal'; 

const App = () => {
    // --- STATE TANIMLARI ---
    const [classes, setClasses] = useState([]);
    const [currentUserRole, setCurrentUserRole] = useState(null);
    const [view, setView] = useState('home');
    const [activeTab, setActiveTab] = useState('homework');
    const [selectedClass, setSelectedClass] = useState(null);
    const [modalData, setModalData] = useState(null);
    const [modalType, setModalType] = useState(null);
    const [dialogData, setDialogData] = useState({ isOpen: false, type: 'info', title: '', message: '' });
    const [showNetTakipModal, setShowNetTakipModal] = useState(false);
    
    // PWA & Sistem State'leri
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW();

    // --- FONKSİYONLAR ---
    const handleSaveNetTakip = async (data) => {
        try {
            if (!modalData?.classId || !modalData?.studentId) return;
            const studentRef = doc(db, CLASSES_COLLECTION, modalData.classId, 'students', modalData.studentId);
            await updateDoc(studentRef, { netTakip: arrayUnion(data) });
            setShowNetTakipModal(false);
            setDialogData({ isOpen: true, type: 'success', title: 'Başarılı', message: 'Net verileri kaydedildi!' });
        } catch (error) {
            setDialogData({ isOpen: true, type: 'error', title: 'Hata', message: 'Kaydetme başarısız.' });
        }
    };

    const closeAlert = () => setDialogData({ ...dialogData, isOpen: false });

    // --- RENDER ---
    if (!isOnline) return <OfflineScreen />;

    if (!currentUserRole) return (
        <LoginScreen onStudentLogin={() => {}} onTeacherLogin={() => {}} />
    );

    return (
        <div className="min-h-screen bg-lightBg pb-20">
            <Header 
                currentUserRole={currentUserRole}
                view={view}
                setView={setView}
            />

            <main className="max-w-7xl mx-auto px-2.5 mt-5">
                <AnimatePresence mode="wait">
                    {view === 'class-detail' && selectedClass && (
                        <ClassDetail 
                            selectedClass={selectedClass}
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            // Modal tetikleyicisi
                            setModalType={(type) => {
                                if (type === 'net-takip-ekle') setShowNetTakipModal(true);
                                else setModalType(type);
                            }}
                            setModalData={setModalData}
                        />
                    )}
                </AnimatePresence>
            </main>

            {/* MODALLAR */}
            <NetTakipModal 
                isOpen={showNetTakipModal} 
                onClose={() => setShowNetTakipModal(false)} 
                onSave={handleSaveNetTakip}
                studentId={modalData?.studentId}
                classId={modalData?.classId}
            />
            <CustomAlert dialogData={dialogData} closeAlert={closeAlert} />
            <UpdatePrompt needRefresh={needRefresh} updateServiceWorker={updateServiceWorker} setNeedRefresh={setNeedRefresh} />
        </div>
    );
};

export default App;
