import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, arrayUnion } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyC2qgW1k9A4-4_W5h73XoUq1_o5w4bXkI0",
    authDomain: "odevkontrol-6a1e8.firebaseapp.com",
    projectId: "odevkontrol-6a1e8",
    storageBucket: "odevkontrol-6a1e8.appspot.com",
    messagingSenderId: "338980373264",
    appId: "1:338980373264:web:e7c4f6b21844784a9e5256"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

/**
 * Net Takip Verisini Firestore'a Yazma Servisi
 */
export const addNetDataToStudent = async (classId, studentId, netData) => {
    try {
        const classRef = doc(db, 'classes', classId);
        // Öğrenci dizisi içindeki netTakip alanını günceller
        return await updateDoc(classRef, {
            [`students.${studentId}.netTakip`]: arrayUnion(netData)
        });
    } catch (error) {
        console.error("Firebase Net Kayıt Hatası:", error);
        throw error;
    }
};
