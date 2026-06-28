import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { Plus, Folder, Trash, Image as ImageIcon, ChevronLeft, Play } from 'lucide-react';
import FlipGallery from '../questions/FlipGallery';
import UploadFlowModal from '../questions/UploadFlowModal';

const SUBJECTS = [
    { id: 'matematik', name: 'Matematik' },
    { id: 'geometri', name: 'Geometri' },
    { id: 'fizik', name: 'Fizik' },
    { id: 'kimya', name: 'Kimya' },
    { id: 'biyoloji', name: 'Biyoloji' },
    { id: 'turkce', name: 'Türkçe' },
    { id: 'edebiyat', name: 'Edebiyat' },
    { id: 'tarih', name: 'Tarih' },
    { id: 'cografya', name: 'Coğrafya' },
    { id: 'felsefe', name: 'Felsefe' },
    { id: 'ingilizce', name: 'İngilizce' }
];

export default function QuestionsView({ studentId, studentName, showAlert }) {
    const [allQuestions, setAllQuestions] = useState([]);
    const [activeFolder, setActiveFolder] = useState(null);
    const [loading, setLoading] = useState(true);

    const [showUploadFlow, setShowUploadFlow] = useState(false);
    
    // Gallery State
    const [galleryIndex, setGalleryIndex] = useState(null);

    // Fetch ALL questions for this student once
    useEffect(() => {
        if (!studentId) return;
        const qAll = query(collection(db, 'questions'), where('studentId', '==', studentId));
        const unsub = onSnapshot(qAll, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.createdAt - a.createdAt);
            setAllQuestions(list);
            setLoading(false);
        });
        return () => unsub();
    }, [studentId]);

    // Active folder questions (derived locally)
    const questions = activeFolder 
        ? allQuestions.filter(q => q.folderId === activeFolder.id) 
        : [];

    const handleDeleteQuestion = async (e, id) => {
        e.stopPropagation();
        if(window.confirm("Bu soruyu silmek istediğinize emin misiniz?")) {
            await deleteDoc(doc(db, 'questions', id));
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 pb-12">
            {!activeFolder ? (
                <>
                    <div className="flex flex-col md:flex-row justify-between items-center bg-white/70 backdrop-blur-md p-6 rounded-3xl border border-slate-200/60 shadow-sm relative z-10 text-center md:text-left gap-4">
                        <div>
                            <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Soru Kütüphanesi</h1>
                            <p className="text-xs font-bold text-slate-400">Tüm dersleriniz bir arada. Soru yüklemek veya çözmek için bir ders seçin.</p>
                        </div>
                        <button 
                            onClick={() => setShowUploadFlow(true)}
                            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black text-sm transition-all shadow-md active:scale-95 bg-brandPurple text-white shadow-brandPurple/25 hover:brightness-105 w-full md:w-auto justify-center"
                        >
                            <Plus size={18} strokeWidth={2.5} /> YENİ SORU EKLE
                        </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {SUBJECTS.map(f => {
                            const count = allQuestions.filter(q => q.folderId === f.id).length;
                            return (
                                <div 
                                    key={f.id} 
                                    onClick={() => setActiveFolder(f)}
                                    className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md hover:border-brandPurple transition-all cursor-pointer group relative flex flex-col items-center text-center gap-3"
                                >
                                    <div className="w-16 h-16 bg-brandPurple/10 text-brandPurple rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Folder size={32} fill="currentColor" className="opacity-80" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-sm">{f.name}</h3>
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full mt-1 inline-block">
                                            {count} Soru
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            ) : (
                <>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/70 backdrop-blur-md p-4 md:p-6 rounded-3xl border border-slate-200/60 shadow-sm relative z-10">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => setActiveFolder(null)}
                                className="w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <div>
                                <h1 className="text-lg md:text-xl font-black text-slate-800 tracking-tight">{activeFolder.name}</h1>
                                <p className="text-xs font-bold text-slate-400">{questions.length} Soru</p>
                            </div>
                        </div>

                        <button 
                            onClick={() => setShowUploadFlow(true)}
                            className="flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs transition-all shadow-md active:scale-95 bg-brandPurple text-white shadow-brandPurple/25 hover:brightness-105"
                        >
                            <Plus size={16} strokeWidth={2.5} /> SORU EKLE
                        </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {questions.map((q, index) => (
                            <div 
                                key={q.id} 
                                onClick={() => setGalleryIndex(index)}
                                className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm relative group overflow-hidden cursor-pointer hover:border-brandPurple transition-colors"
                            >
                                <div className="aspect-square bg-slate-100 rounded-xl overflow-hidden relative mb-2 flex items-center justify-center">
                                    {q.questionImageId ? (
                                        <img 
                                            src={`/.netlify/functions/telegramFetch?file_id=${q.questionImageId}`} 
                                            alt="Soru" 
                                            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <ImageIcon size={40} className="text-slate-300" />
                                    )}
                                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                                        <div className="w-10 h-10 bg-white/20 backdrop-blur text-white rounded-full flex items-center justify-center">
                                            <Play size={20} fill="currentColor" className="ml-1" />
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => handleDeleteQuestion(e, q.id)} 
                                        className="absolute top-2 right-2 p-2 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-rose-600 transition-all z-20"
                                    >
                                        <Trash size={14} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                        Soru {questions.length - index}
                                    </span>
                                    {q.answerImageId && (
                                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600">
                                            Cevaplı
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {showUploadFlow && (
                <UploadFlowModal 
                    onClose={() => setShowUploadFlow(false)} 
                    studentId={studentId} 
                    studentName={studentName} 
                    showAlert={showAlert} 
                />
            )}
            {galleryIndex !== null && <FlipGallery questions={questions} initialIndex={galleryIndex} onClose={() => setGalleryIndex(null)} />}
        </div>
    );
}
