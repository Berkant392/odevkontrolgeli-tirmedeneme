import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image as ImageIcon, Camera, ChevronRight, CheckCircle, UploadCloud, BrainCircuit } from 'lucide-react';
import ScannerModal from './ScannerModal';
import { db } from '../../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const SUBJECTS = [
    { id: 'tyt_matematik', name: 'TYT Matematik' },
    { id: 'ayt_matematik', name: 'AYT Matematik' },
    { id: 'tyt_fizik', name: 'TYT Fizik' },
    { id: 'ayt_fizik', name: 'AYT Fizik' },
    { id: 'tyt_kimya', name: 'TYT Kimya' },
    { id: 'ayt_kimya', name: 'AYT Kimya' },
    { id: 'tyt_biyoloji', name: 'TYT Biyoloji' },
    { id: 'ayt_biyoloji', name: 'AYT Biyoloji' },
    { id: 'turkce', name: 'Türkçe' },
    { id: 'edebiyat', name: 'Edebiyat' },
    { id: 'tarih', name: 'Tarih' },
    { id: 'cografya', name: 'Coğrafya' },
    { id: 'felsefe', name: 'Felsefe' },
    { id: 'ingilizce', name: 'İngilizce' }
];

export default function UploadFlowModal({ onClose, studentId, studentName, showAlert, initialFolderId }) {
    const [step, setStep] = useState(1); // 1: Question, 2: Answer, 3: Subject, 4: Uploading
    
    const [questionImg, setQuestionImg] = useState(null);
    const [answerImg, setAnswerImg] = useState(null);
    const [selectedSubject, setSelectedSubject] = useState(initialFolderId || null);

    const [isScanning, setIsScanning] = useState(false);
    const [scanFile, setScanFile] = useState(null);
    const [scanType, setScanType] = useState('question'); // 'question' | 'answer'
    
    const [queueMessage, setQueueMessage] = useState('');

    const handleFileSelect = (e, type) => {
        if (e.target.files && e.target.files[0]) {
            setScanType(type);
            setScanFile(e.target.files[0]);
            setIsScanning(true);
        }
    };

    const executeUpload = async (qImg, aImg, subjectId) => {
        if (!qImg || !subjectId) return;
        setStep(4);
        setQueueMessage('');

        const uploadToTelegram = async (base64, type) => {
            const subjectName = SUBJECTS.find(s => s.id === subjectId)?.name || subjectId;
            const caption = `Öğrenci: ${studentName || studentId}\nDers: ${subjectName}\nTip: ${type === 'question' ? 'Soru' : 'Cevap'}`;
            
            const res = await fetch('/.netlify/functions/telegramUpload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    imageBase64: base64, 
                    filename: `${type}_${Date.now()}.jpg`,
                    caption 
                })
            });

            if (res.status === 429) {
                const data = await res.json();
                const waitSeconds = data.retry_after || 5;
                setQueueMessage(`Çok yoğun istek var. ${waitSeconds} saniye bekleniyor...`);
                await new Promise(r => setTimeout(r, waitSeconds * 1000));
                return uploadToTelegram(base64, type);
            }

            const data = await res.json();
            if (data.success) return data.file_id;
            throw new Error(data.error);
        };

        try {
            const qFileId = await uploadToTelegram(qImg, 'question');
            let aFileId = null;
            if (aImg) {
                aFileId = await uploadToTelegram(aImg, 'answer');
            }

            await addDoc(collection(db, 'questions'), {
                studentId,
                folderId: subjectId,
                questionImageId: qFileId,
                answerImageId: aFileId,
                createdAt: serverTimestamp()
            });

            if(showAlert) showAlert('success', 'Harika!', 'Soru başarıyla kütüphanenize eklendi.');
            onClose();
        } catch (err) {
            console.error("Upload error", err);
            if(showAlert) showAlert('error', 'Hata', 'Yükleme sırasında bir sorun oluştu.');
            setStep(initialFolderId ? 2 : 3); // Go back appropriately
        }
    };

    const handleApplyScan = (base64Img) => {
        if (scanType === 'question') {
            setQuestionImg(base64Img);
            setStep(2);
        } else {
            setAnswerImg(base64Img);
            if (initialFolderId) {
                executeUpload(questionImg, base64Img, initialFolderId);
            } else {
                setStep(3);
            }
        }
        setIsScanning(false);
        setScanFile(null);
    };

    const skipAnswer = () => {
        setAnswerImg(null);
        if (initialFolderId) {
            executeUpload(questionImg, null, initialFolderId);
        } else {
            setStep(3);
        }
    };

    const handleFinalUploadBtn = () => {
        executeUpload(questionImg, answerImg, selectedSubject);
    };

    const modalContent = (
        <div className="fixed inset-0 bg-slate-900/95 z-[99999] flex items-center justify-center p-4">
            {!isScanning ? (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative max-h-[95vh] flex flex-col"
                >
                    {step < 4 && (
                        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors z-[100]">
                            <X size={20} />
                        </button>
                    )}

                    <div className="p-6 md:p-8 overflow-y-auto min-h-0 custom-scrollbar">
                        {step === 1 && (
                            <div className="text-center">
                                <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl mx-auto flex items-center justify-center mb-6">
                                    <Camera size={32} />
                                </div>
                                <h2 className="text-2xl font-black text-slate-800 mb-2">Soru Görseli</h2>
                                <p className="text-sm font-medium text-slate-500 mb-8">Çözemediğiniz veya tekrar etmek istediğiniz sorunun fotoğrafını çekin.</p>
                                
                                <label className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm bg-primary text-white shadow-lg shadow-primary/25 cursor-pointer hover:brightness-105 active:scale-95 transition-all">
                                    <ImageIcon size={20} /> FOTOĞRAF ÇEK VEYA SEÇ
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, 'question')} />
                                </label>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="text-center">
                                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-2xl mx-auto flex items-center justify-center mb-6">
                                    <CheckCircle size={32} />
                                </div>
                                <h2 className="text-2xl font-black text-slate-800 mb-2">Çözüm Görseli (Opsiyonel)</h2>
                                <p className="text-sm font-medium text-slate-500 mb-8">Eğer bu sorunun çözümünü biliyorsanız veya hocanız çözdüyse arkasına ekleyin.</p>
                                
                                <div className="flex flex-col gap-3">
                                    <label className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 cursor-pointer hover:brightness-105 active:scale-95 transition-all">
                                        <Camera size={20} /> ÇÖZÜMÜ ÇEK VEYA SEÇ
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, 'answer')} />
                                    </label>
                                    <button onClick={skipAnswer} className="w-full py-4 rounded-2xl font-black text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                                        ÇÖZÜMÜ GEÇ (SONRA EKLERİM)
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 mb-2 text-center">Ders Seçimi</h2>
                                <p className="text-sm font-medium text-slate-500 mb-6 text-center">Bu soru hangi derse ait?</p>
                                
                                <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2 pb-2 custom-scrollbar">
                                    {SUBJECTS.map(sub => (
                                        <button 
                                            key={sub.id}
                                            onClick={() => setSelectedSubject(sub.id)}
                                            className={`p-3 rounded-xl font-bold text-sm text-left border-2 transition-all flex items-center justify-between ${selectedSubject === sub.id ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200'}`}
                                        >
                                            {sub.name}
                                            {selectedSubject === sub.id && <CheckCircle size={16} />}
                                        </button>
                                    ))}
                                </div>

                                <button 
                                    onClick={handleFinalUploadBtn}
                                    disabled={!selectedSubject}
                                    className={`w-full mt-6 py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 ${selectedSubject ? 'bg-primary text-white shadow-lg shadow-primary/25 hover:brightness-105' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                                >
                                    <UploadCloud size={20} /> SİSTEME YÜKLE
                                </button>
                            </div>
                        )}

                        {step === 4 && (
                            <div className="text-center py-10">
                                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full mx-auto flex items-center justify-center mb-6 relative">
                                    <div className="absolute inset-0 border-4 border-blue-200 rounded-full border-t-blue-600 animate-spin"></div>
                                    <BrainCircuit size={32} className="animate-pulse" />
                                </div>
                                <h2 className="text-xl font-black text-slate-800 mb-2">Sisteme Yükleniyor...</h2>
                                <p className="text-sm font-medium text-slate-500 h-6">
                                    {queueMessage ? (
                                        <span className="text-amber-600 font-bold">{queueMessage}</span>
                                    ) : (
                                        "Görseller Telegram'a güvenle şifreleniyor."
                                    )}
                                </p>
                            </div>
                        )}
                    </div>
                </motion.div>
            ) : (
                <ScannerModal imageFile={scanFile} onClose={() => setIsScanning(false)} onApply={handleApplyScan} />
            )}
        </div>
    );

    return createPortal(modalContent, document.body);
}
