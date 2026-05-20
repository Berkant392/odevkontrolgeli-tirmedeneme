import { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, onSnapshot, doc, query, orderBy, limit } from 'firebase/firestore';
import { CLASSES_COLLECTION, LIBRARY_COLLECTION, SETTINGS_COLLECTION, SETTINGS_DOC, DEFAULT_PIN, NOTIFICATIONS_COLLECTION } from '../utils/constants';

export const useFirebaseData = () => {
    const [classes, setClasses] = useState([]);
    const [libraryItems, setLibraryItems] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [dbTeacherPin, setDbTeacherPin] = useState(DEFAULT_PIN);
    const [countdownConfig, setCountdownConfig] = useState({ targetDate: '2026-06-20T00:00:00', startDate: '2025-06-20T00:00:00', label: 'YKS 2026' });

    useEffect(() => {
        const unsubClasses = onSnapshot(collection(db, CLASSES_COLLECTION), (snap) => setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        const unsubLibrary = onSnapshot(collection(db, LIBRARY_COLLECTION), (snap) => setLibraryItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        const qNotif = query(collection(db, NOTIFICATIONS_COLLECTION), orderBy('timestamp', 'desc'), limit(10));
        const unsubNotif = onSnapshot(qNotif, (snap) => setNotifications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        
        const unsubConfig = onSnapshot(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.pin) setDbTeacherPin(data.pin);
                if (data.countdown) setCountdownConfig(data.countdown);
            }
        });
        return () => { unsubClasses(); unsubLibrary(); unsubNotif(); unsubConfig(); };
    }, []);

    return {
        classes,
        libraryItems,
        notifications,
        dbTeacherPin,
        countdownConfig
    };
};
