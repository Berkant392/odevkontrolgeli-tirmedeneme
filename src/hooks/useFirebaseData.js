import { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { CLASSES_COLLECTION, LIBRARY_COLLECTION, SETTINGS_COLLECTION, SETTINGS_DOC, DEFAULT_PIN } from '../utils/constants';

export const useFirebaseData = () => {
    const [classes, setClasses] = useState([]);
    const [libraryItems, setLibraryItems] = useState([]);
    const [dbTeacherPin, setDbTeacherPin] = useState(DEFAULT_PIN);
    const [announcementTitle, setAnnouncementTitle] = useState("Sistem Duyurusu");
    const [systemAnnouncement, setSystemAnnouncement] = useState("Eğitim, dünyayı değiştirmek için en güçlü silahtır.");
    const [countdownConfig, setCountdownConfig] = useState({ targetDate: '2026-06-20T00:00:00', startDate: '2025-06-20T00:00:00', label: 'YKS 2026' });

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

    return {
        classes,
        libraryItems,
        dbTeacherPin,
        announcementTitle,
        systemAnnouncement,
        countdownConfig
    };
};
