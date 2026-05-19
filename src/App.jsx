import React, { useState, useEffect } from 'react';
import { db } from './config/firebase'; 
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { CLASSES_COLLECTION } from './utils/constants';

import Header from './components/common/Header';
import OfflineScreen from './components/common/OfflineScreen';
import LoginScreen from './components/auth/LoginScreen';
import ClassDetail from './components/views/ClassDetail';
import NetTakipModal from './components/modals/NetTakipModal'; 
import CustomAlert from './components/common/CustomAlert';

const App = () => {
    const [currentUserRole, setCurrentUserRole] = useState(null);
    const [view, setView] = useState('home');
    const [selectedClass, setSelectedClass] = useState(null);
    const [modalData, setModalData] = useState(null);
    const [showNetTakipModal, setShowNetTakipModal] = useState(false);
    const [dialogData, setDialogData] = useState({ isOpen: false, type: 'info', title: '', message: '' });
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleStatus = () => setIsOnline(navigator.onLine);
        window.addEventListener('online', handleStatus);
        window.addEventListener('offline', handleStatus);
        return () => {
            window.removeEventListener('online', handleStatus);
            window.removeEventListener('offline', handleStatus);
        };
    }, []);

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
    if (!currentUserRole) return <LoginScreen onStudentLogin={(r) => setCurrentUserRole(r)} onTeacherLogin={(r) => setCurrentUserRole(r)} />;

    return (
        <div className="min-h-screen bg-lightBg pb-20">
            <Header currentUserRole={currentUserRole} view={view} setView={setView} />
            <main className="max-w-7xl mx-auto px-2.5 mt-5">
                {view === 'class-detail' && selectedClass ? (
                    <ClassDetail 
                        selectedClass={selectedClass}
                        setModalData={setModalData}
                        setModalType={(type) => {
                            if (type === 'net-takip-ekle') setShowNetTakipModal(true);
                        }}
                    />
                ) : (
                    <div className="p-10 text-center font-bold text-slate-400">Dashboard Yükleniyor...</div>
                )}
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
