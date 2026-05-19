import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { db } from './config/firebase'; 
import { doc, updateDoc, arrayUnion } from 'firebase/firestore'; // arrayUnion eklendi
import { CLASSES_COLLECTION, DEFAULT_PIN } from './utils/constants';

// BİLEŞENLER
import Header from './components/common/Header';
import OfflineScreen from './components/common/OfflineScreen';
import UpdatePrompt from './components/common/UpdatePrompt';
import CustomAlert from './components/common/CustomAlert';
import LoginScreen from './components/auth/LoginScreen';
import ClassDetail from './components/views/ClassDetail';
import NetTakipModal from './components/modals/NetTakipModal'; // YENİ EKLENDİ

const App = () => {
    // ... [ÖNCEKİ TÜM STATE TANIMLARIN AYNI KALSIN] ...
    // Sadece yeni modal state'i ekliyoruz:
    const [showNetTakipModal, setShowNetTakipModal] = useState(false);
    
    // NET TAKİP KAYIT FONKSİYONU
    const handleSaveNetTakip = async (data) => {
        try {
            const studentRef = doc(db, CLASSES_COLLECTION, modalData.classId, 'students', modalData.studentId);
            await updateDoc(studentRef, {
                netTakip: arrayUnion(data)
            });
            setShowNetTakipModal(false);
            setDialogData({ isOpen: true, type: 'success', title: 'Başarılı', message: 'Net verileri kaydedildi!' });
        } catch (error) {
            console.error("Hata:", error);
            setDialogData({ isOpen: true, type: 'error', title: 'Hata', message: 'Kaydetme başarısız.' });
        }
    };

    // ... [DİĞER FONKSİYONLARIN AYNI KALSIN] ...

    return (
        <div className={`min-h-screen pb-24 md:pb-32 relative ${currentUserRole === 'vip-student' ? 'bg-slate-900' : 'bg-lightBg'}`}>
            <Header {...headerProps} />

            <main className="max-w-7xl mx-auto px-2.5 mt-5">
                <AnimatePresence mode="wait">
                    {view === 'class-detail' && (
                        <ClassDetail 
                            {...classDetailProps}
                            setModalType={(type) => {
                                if (type === 'net-takip-ekle') setShowNetTakipModal(true);
                                else setModalType(type);
                            }}
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

            <UpdatePrompt ... />
            <CustomAlert ... />
        </div>
    );
};
export default App;
