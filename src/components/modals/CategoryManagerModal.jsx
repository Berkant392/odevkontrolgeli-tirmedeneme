import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Save, AlertTriangle, Hexagon } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

const CategoryManagerModal = ({ isOpen, onClose, curriculum, setCurriculum, examsList, subjectsList, showAlert }) => {
    const [activeTab, setActiveTab] = useState('exams'); // 'exams' | 'subjects'
    const [localExams, setLocalExams] = useState([...examsList]);
    const [localSubjects, setLocalSubjects] = useState([...subjectsList]);
    
    // Geçici olarak yeni eklenenler için state'ler
    const [newExamLabel, setNewExamLabel] = useState('');
    const [newSubjectLabel, setNewSubjectLabel] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    // Silme onayı için
    const [itemToDelete, setItemToDelete] = useState(null); // { type, id, label }

    // Sync state with props when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setLocalExams([...(examsList || [])]);
            setLocalSubjects([...(subjectsList || [])]);
            setNewExamLabel('');
            setNewSubjectLabel('');
            setItemToDelete(null);
            setActiveTab('exams');
        }
    }, [isOpen, examsList, subjectsList]);

    if (!isOpen) return null;

    const generateId = (label) => {
        return label.toLowerCase()
            .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
            .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
            .replace(/[^a-z0-9]/g, '')
            .substring(0, 8) + '_' + Math.random().toString(36).substr(2, 4);
    };

    const handleAddExam = () => {
        if (!newExamLabel.trim()) return;
        const newId = generateId(newExamLabel);
        setLocalExams([...localExams, { id: newId, label: newExamLabel.trim() }]);
        setNewExamLabel('');
    };

    const handleAddSubject = () => {
        if (!newSubjectLabel.trim()) return;
        const newId = generateId(newSubjectLabel);
        // Varsayılan olarak tüm sınavlara değil, sadece listeye ekle. 
        // Kullanıcı sonradan hangi sınava ait olduğunu seçecek.
        setLocalSubjects([...localSubjects, { id: newId, label: newSubjectLabel.trim(), examIds: [] }]);
        setNewSubjectLabel('');
    };

    const toggleSubjectExam = (subjectId, examId) => {
        setLocalSubjects(localSubjects.map(su => {
            if (su.id === subjectId) {
                const currentExamIds = su.examIds || [];
                const hasExam = currentExamIds.includes(examId);
                return {
                    ...su,
                    examIds: hasExam ? currentExamIds.filter(id => id !== examId) : [...currentExamIds, examId]
                };
            }
            return su;
        }));
    };

    const handleDelete = (type, id) => {
        if (type === 'exam') {
            setLocalExams(localExams.filter(e => e.id !== id));
        } else {
            setLocalSubjects(localSubjects.filter(s => s.id !== id));
        }
        setItemToDelete(null);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updatedCurriculum = {
                ...curriculum,
                categories: {
                    exams: localExams,
                    subjects: localSubjects
                }
            };
            
            // Yeni sınav veya dersler için eksik ağaçları (boş listeler) oluşturma
            localExams.forEach(ex => {
                if (!updatedCurriculum[ex.id]) {
                    updatedCurriculum[ex.id] = {};
                }
                localSubjects.forEach(su => {
                    if (!updatedCurriculum[ex.id][su.id]) {
                        updatedCurriculum[ex.id][su.id] = [];
                    }
                });
            });

            await setDoc(doc(db, "settings", "globalCurriculum"), updatedCurriculum);
            setCurriculum(updatedCurriculum);
            showAlert('success', 'Başarılı', 'Kategoriler başarıyla güncellendi!');
            onClose();
        } catch (error) {
            console.error("Error saving categories:", error);
            showAlert('error', 'Hata', 'Kategoriler kaydedilirken bir hata oluştu.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    onClick={onClose}
                />
                
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="bg-white w-full max-w-4xl rounded-[24px] shadow-2xl relative z-10 flex flex-col overflow-hidden max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                                <Hexagon size={24} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-800 tracking-tight">Kategori Yönetimi</h2>
                                <p className="text-sm font-bold text-slate-400">Sınav türlerini ve dersleri düzenleyin.</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 bg-white border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 rounded-xl flex items-center justify-center transition-all">
                            <X size={20} strokeWidth={2.5} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex flex-1 overflow-hidden flex-col md:flex-row bg-slate-50/50">
                        {/* Tabs (Mobile only) */}
                        <div className="md:hidden flex p-4 border-b border-slate-200 bg-white gap-2">
                            <button 
                                onClick={() => setActiveTab('exams')}
                                className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'exams' ? 'bg-primary text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            >
                                Sınav Türleri
                            </button>
                            <button 
                                onClick={() => setActiveTab('subjects')}
                                className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'subjects' ? 'bg-primary text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            >
                                Dersler
                            </button>
                        </div>

                        {/* EXAMS PANEL */}
                        <div className={`flex-1 flex-col p-6 border-r border-slate-100 ${activeTab === 'exams' ? 'flex' : 'hidden md:flex'}`}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-black text-slate-700 uppercase tracking-widest text-xs">Sınav Türleri</h3>
                                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">{localExams.length} Sınav</span>
                            </div>
                            
                            <div className="flex gap-2 mb-6">
                                <input 
                                    type="text" 
                                    value={newExamLabel}
                                    onChange={(e) => setNewExamLabel(e.target.value)}
                                    placeholder="Örn: YDT, LGS..."
                                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddExam()}
                                />
                                <button 
                                    onClick={handleAddExam}
                                    disabled={!newExamLabel.trim()}
                                    className="bg-primary text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    <Plus size={18} strokeWidth={2.5} /> Ekle
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 space-y-2 hide-scrollbar">
                                {localExams.map(ex => (
                                    <div key={ex.id} className="bg-white border border-slate-200 p-3 rounded-xl flex items-center justify-between group hover:border-slate-300 transition-colors shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 font-black text-xs flex items-center justify-center">
                                                {ex.label.substring(0,2).toUpperCase()}
                                            </div>
                                            <span className="font-bold text-slate-700">{ex.label}</span>
                                        </div>
                                        <button 
                                            onClick={() => setItemToDelete({ type: 'exam', id: ex.id, label: ex.label })}
                                            className="w-8 h-8 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-all"
                                            title="Sil"
                                        >
                                            <Trash2 size={16} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                ))}
                                {localExams.length === 0 && (
                                    <div className="text-center py-8 text-slate-400 font-medium text-sm">
                                        Henüz hiç sınav türü eklenmemiş.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* SUBJECTS PANEL */}
                        <div className={`flex-1 flex-col p-6 ${activeTab === 'subjects' ? 'flex' : 'hidden md:flex'}`}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-black text-slate-700 uppercase tracking-widest text-xs">Dersler</h3>
                                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">{localSubjects.length} Ders</span>
                            </div>
                            
                            <div className="flex gap-2 mb-6">
                                <input 
                                    type="text" 
                                    value={newSubjectLabel}
                                    onChange={(e) => setNewSubjectLabel(e.target.value)}
                                    placeholder="Örn: Tarih, Coğrafya..."
                                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
                                />
                                <button 
                                    onClick={handleAddSubject}
                                    disabled={!newSubjectLabel.trim()}
                                    className="bg-primary text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    <Plus size={18} strokeWidth={2.5} /> Ekle
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 space-y-2 hide-scrollbar">
                                {localSubjects.map(su => (
                                    <div key={su.id} className="bg-white border border-slate-200 p-3 rounded-xl flex flex-col group hover:border-slate-300 transition-colors shadow-sm gap-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 font-black text-xs flex items-center justify-center shrink-0">
                                                    {su.label.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-bold text-slate-700">{su.label}</span>
                                            </div>
                                            <button 
                                                onClick={() => setItemToDelete({ type: 'subject', id: su.id, label: su.label })}
                                                className="w-8 h-8 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-all shrink-0"
                                                title="Sil"
                                            >
                                                <Trash2 size={16} strokeWidth={2.5} />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-wrap pl-11">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mr-1">Sınavlar:</span>
                                            {localExams.map(ex => {
                                                const isSelected = su.examIds && su.examIds.includes(ex.id);
                                                // Eğer examIds tanımsız veya boş dizi ise her sınavda görüneceğini varsayıyoruz (Eski uyumluluk)
                                                // Ama kullanıcı yeni düzenleme yapıyorsa net olarak examId atar.
                                                const isActive = isSelected || !su.examIds || su.examIds.length === 0;
                                                return (
                                                    <button 
                                                        key={ex.id}
                                                        onClick={() => toggleSubjectExam(su.id, ex.id)}
                                                        className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors ${isSelected ? 'bg-primary text-white shadow-sm shadow-primary/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                                        title={`${ex.label} sınavında göster/gizle`}
                                                    >
                                                        {ex.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                                {localSubjects.length === 0 && (
                                    <div className="text-center py-8 text-slate-400 font-medium text-sm">
                                        Henüz hiç ders eklenmemiş.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer / Actions */}
                    <div className="bg-white border-t border-slate-100 p-6 shrink-0 flex justify-end gap-3 rounded-b-[24px]">
                        <button 
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                        >
                            İptal
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-8 py-3 rounded-xl font-bold text-white bg-primary hover:bg-primary-dark transition-all shadow-lg shadow-primary/30 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSaving ? (
                                <>Kaydediliyor...</>
                            ) : (
                                <><Save size={18} strokeWidth={2.5} /> Kaydet ve Kapat</>
                            )}
                        </button>
                    </div>

                    {/* Delete Confirmation Overlay */}
                    <AnimatePresence>
                        {itemToDelete && (
                            <motion.div 
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center p-6"
                            >
                                <motion.div 
                                    initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                                    className="bg-white max-w-sm w-full rounded-2xl shadow-2xl border border-slate-100 p-6 text-center"
                                >
                                    <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <AlertTriangle size={32} />
                                    </div>
                                    <h3 className="text-lg font-black text-slate-800 mb-2">Emin misiniz?</h3>
                                    <p className="text-sm font-medium text-slate-500 mb-6 leading-relaxed">
                                        <strong>{itemToDelete.label}</strong> adlı {itemToDelete.type === 'exam' ? 'sınavı' : 'dersi'} silmek üzeresiniz. 
                                        Bu işlem, bu kategoriye eklenmiş olan <span className="text-rose-500 font-bold">tüm konuların (peteklerin) öğrencilerin ekranından kalkmasına</span> neden olabilir!
                                    </p>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => setItemToDelete(null)}
                                            className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                                        >
                                            Vazgeç
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(itemToDelete.type, itemToDelete.id)}
                                            className="flex-1 py-3 rounded-xl font-bold text-white bg-rose-500 hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20"
                                        >
                                            Evet, Sil
                                        </button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default CategoryManagerModal;
