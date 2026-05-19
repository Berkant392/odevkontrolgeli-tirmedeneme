import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, arrayUnion } from 'firebase/firestore';

// Buradaki config değerleri projenizin çalışması için kritiktir.
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

/**
 * Net Takip Verisini Firestore'a Yazma Servisi
 * @param {string} classId - Sınıf ID'si
 * @param {string} studentId - Öğrenci ID'si
 * @param {object} netData - { tarih, dersler: { turkce: { net: 10 }, ... } }
 */
export const addNetDataToStudent = async (classId, studentId, netData) => {
    try {
        const classRef = doc(db, 'classes', classId);
        
        // Firestore'da öğrenciyi bulup güncelleyecek mantık için hazırlık
        // Bu fonksiyon, UI tarafından tetiklendiğinde kullanılacaktır.
        return await updateDoc(classRef, {
            // Firestore yapınıza göre öğrenci dizisindeki netTakip alanını günceller
            [`students.${studentId}.netTakip`]: arrayUnion(netData)
        });
    } catch (error) {
        console.error("Firebase Net Kayıt Hatası:", error);
        throw error;
    }
};
