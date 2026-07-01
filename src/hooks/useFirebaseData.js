import { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, onSnapshot, doc, query, orderBy, limit } from 'firebase/firestore';
import { CLASSES_COLLECTION, LIBRARY_COLLECTION, SETTINGS_COLLECTION, SETTINGS_DOC, DEFAULT_PIN, NOTIFICATIONS_COLLECTION, BUG_REPORTS_COLLECTION } from '../utils/constants';

export const useFirebaseData = () => {
    const [classes, setClasses] = useState([]);
    const [libraryItems, setLibraryItems] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [allTrials, setAllTrials] = useState([]);
    const [dbTeacherPin, setDbTeacherPin] = useState(DEFAULT_PIN);
    const [dbTeacherTheme, setDbTeacherTheme] = useState(null);
    const [countdownConfig, setCountdownConfig] = useState({ targetDate: '2026-06-20T00:00:00', startDate: '2025-06-20T00:00:00', label: 'YKS 2026' });
    const [globalReminders, setGlobalReminders] = useState([]);
    const [bugReports, setBugReports] = useState([]);

    useEffect(() => {
        const unsubClasses = onSnapshot(
            collection(db, CLASSES_COLLECTION), 
            (snap) => setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
            (err) => console.error("Firestore [classes] query subscription failed:", err)
        );
        
        const unsubLibrary = onSnapshot(
            collection(db, LIBRARY_COLLECTION), 
            (snap) => setLibraryItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
            (err) => console.error("Firestore [libraryItems] query subscription failed:", err)
        );
        
        const unsubTrials = onSnapshot(
            collection(db, 'trials'), 
            (snap) => setAllTrials(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
            (err) => console.error("Firestore [trials] query subscription failed:", err)
        );
        
        const qNotif = query(collection(db, NOTIFICATIONS_COLLECTION), orderBy('timestamp', 'desc'), limit(10));
        const unsubNotif = onSnapshot(
            qNotif, 
            (snap) => setNotifications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
            (err) => console.error("Firestore [notifications] query subscription failed:", err)
        );
        
        const qBugs = query(collection(db, BUG_REPORTS_COLLECTION), orderBy('createdAt', 'desc'));
        const unsubBugs = onSnapshot(
            qBugs,
            (snap) => setBugReports(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
            (err) => console.error("Firestore [bug_reports] query subscription failed:", err)
        );
        
        const unsubConfig = onSnapshot(
            doc(db, SETTINGS_COLLECTION, SETTINGS_DOC), 
            (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.pin) setDbTeacherPin(data.pin);
                    if (data.countdown) setCountdownConfig(data.countdown);
                    if (data.reminders) setGlobalReminders(data.reminders);
                    if (data.teacherTheme) setDbTeacherTheme(data.teacherTheme);
                }
            },
            (err) => console.error("Firestore [systemConfig] document subscription failed:", err)
        );
        
        return () => { unsubClasses(); unsubLibrary(); unsubTrials(); unsubNotif(); unsubBugs(); unsubConfig(); };
    }, []);

    return {
        classes,
        libraryItems,
        notifications,
        allTrials,
        dbTeacherPin,
        dbTeacherTheme,
        countdownConfig,
        globalReminders,
        bugReports
    };
};
