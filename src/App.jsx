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
    // [STATE'LER] - Eksiksiz tanımlama
    const [currentUserRole, setCurrentUserRole] = useState(null);
    const [view, setView] = useState('home');
    const [activeTab, setActiveTab] = useState('homework');
    const [selectedClass, setSelectedClass] = useState(null);
    const [classes, setClasses] = useState([]);
    const [modalData, setModalData] = useState(null);
    const [dialogData, setDialogData] = useState({ isOpen: false, type: 'info', title: '', message: '' });
    const [showNetTakipModal, setShowNetTakipModal] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW();

    // --- NET TAKİP KAYIT FONKSİYONU ---
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

    if (!isOnline) return <OfflineScreen />;
    if (!currentUserRole) return <LoginScreen onStudentLogin={() => {}} onTeacherLogin={() => {}} />;

    return (
        <div className="min-h-screen bg-lightBg pb-20">
            {/* PROP SPREAD KULLANMADAN AÇIK PROP GEÇİŞİ */}
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
                            setModalData={setModalData}
                            setModalType={(type) => {
                                if (type === 'net-takip-ekle') setShowNetTakipModal(true);
                            }}
                        />
                    )}
                </AnimatePresence>
            </main>

            <NetTakipModal 
                isOpen={showNetTakipModal} 
                onClose={() => setShowNetTakipModal(false)} 
                onSave={handleSaveNetTakip}
                studentId={modalData?.studentId}
                classId={modalData?.classId}
            />
            <CustomAlert dialogData={dialogData} closeAlert={() => setDialogData({...dialogData, isOpen: false})} />
        </div>
    );
};
export default App;
