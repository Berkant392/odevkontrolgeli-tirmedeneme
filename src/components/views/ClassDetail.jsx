import React from 'react';
import { motion } from 'framer-motion';
import { Layout, Crown, Pencil, AlertOctagon, KeyRound, BookOpen, Plus, Trash2, Calendar, MoreVertical, UserPlus, Printer, TrendingUp, Save } from 'lucide-react';
import { calculateStats, formatDate, getDeadlineStatus } from '../../utils/helpers';
import { TOPIC_THEMES, STATUS_OPTIONS, DERSLER } from '../../utils/constants';
import MobileStudentCard from '../student/MobileCard';
import PdfDownloadButton from '../ui/PdfButton';
import StatusBadge from '../ui/StatusBadge';
import CurriculumTracker from '../curriculum/CurriculumTracker';

const getSafeText = (val) => {
    if (!val) return "";
    if (typeof val === 'string' || typeof val === 'number') return String(val);
    return "İsimsiz";
};

const ClassDetail = ({ 
    selectedClass, activeTab, setActiveTab, isMobile, newStudentName, setNewStudentName, 
    addStudent, updateGrade, openCellNoteModal, setModalData, setModalInputVal, 
    setModalDateVal, setModalPdfVal, setModalType, deleteStudent, handlePrintStudentReport, 
    openStudent, setActiveTopicMenu, setActiveColMenu, setActiveCell, deleteColumn, 
    updateClassInDb, handleOpenRisk, handlePrintPasswords, deleteClass, libraryItems, 
    saveToLibrary, setModalEditUsername, setModalEditPassword
}) => {
    
    const reversedTopics = selectedClass.topics ? [...selectedClass.topics].reverse() : [];

    const handleEditStudentClick = (student) => {
        setModalData({ classId: selectedClass.id, studentId: student.id, currentName: student.name });
        setModalInputVal(student.name);
        setModalEditUsername(student.username || "");
        setModalEditPassword(student.password || "");
        setModalType('edit-student');
    };

    return (
        <motion.div key="class-detail" initial={{ opacity: 0, y: 30, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: "spring", stiffness: 260, damping: 20 }} className="bg-white rounded-[2rem] shadow-float border border-slate-200 overflow-hidden relative z-10">
            
            <div className={`p-4 md:p-6 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4 ${selectedClass.type === 'vip' ? 'bg-gradient-to-r from-yellow-50 to-white border-yellow-100' : 'bg-gradient-to-r from-slate-50 to-white border-slate-100'}`}>
                <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
                    <div className={`p-2.5 md:p-3 rounded-xl shadow-inner ${selectedClass.type === 'vip' ? 'bg-yellow-100 text-amber-600' : 'bg-purple-100 text-brandPurple'}`}><Layout size={20}/></div>
                    <div>
                        <h3 className={`text-lg md:text-2xl font-black flex items-center gap-1.5 ${selectedClass.type === 'vip' ? 'text-amber-700' : 'text-slate-800'}`}>
                            {selectedClass.type === 'vip' && <Crown size={16} className="text-amber-500"/>}
                            {getSafeText(selectedClass.className)} 
                        </h3>
                        <div className="text-[10px] md:text-xs text-slate-500 font-medium mt-0.5">{selectedClass.students?.length || 0} Öğrenci</div>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto justify-end">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setActiveTab('homework')} className={`text-[10px] md:text-xs px-3 py-1.5 rounded-xl font-bold shadow-sm flex items-center gap-1 transition-colors ${activeTab === 'homework' ? 'bg-brandPurple text-white' : 'bg-slate-100 text-slate-600'}`}><Layout size={12}/> Ödevler</motion.button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setActiveTab('curriculum')} className={`text-[10px] md:text-xs px-3 py-1.5 rounded-xl font-bold shadow-sm flex items-center gap-1 transition-colors ${activeTab === 'curriculum' ? 'bg-brandPurple text-white' : 'bg-slate-100 text-slate-600'}`}><BookOpen size={12}/> Müfredat</motion.button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setActiveTab('net-takip')} className={`text-[10px] md:text-xs px-3 py-1.5 rounded-xl font-bold shadow-sm flex items-center gap-1 transition-colors ${activeTab === 'net-takip' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'}`}><TrendingUp size={12}/> Net Takip</motion.button>
                </div>
            </div>

            {/* 🔥 NET TAKİP PANELİ TABLOSU */}
            {activeTab === 'net-takip' && (
                <div className="p-6 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b">
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Öğrenci</th>
                                {DERSLER.map(ders => <th key={ders.id} className="p-4 text-xs font-black text-slate-500 uppercase text-center">{ders.label}</th>)}
                                <th className="p-4 text-xs font-black text-slate-500 uppercase text-center">İşlem</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedClass.students?.map(std => (
                                <tr key={std.id} className="border-b hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-bold text-slate-800">{std.name}</td>
                                    {DERSLER.map(ders => {
                                        const sonNet = std.netTakip?.[std.netTakip.length - 1]?.dersler?.[ders.id]?.net || 0;
                                        return <td key={ders.id} className="p-4 text-center font-black text-brandPurple">{sonNet}</td>
                                    })}
                                    <td className="p-4 text-center">
                                        <button onClick={() => { setModalData({ classId: selectedClass.id, studentId: std.id }); setModalType('net-takip-ekle'); }} className="text-brandPurple hover:bg-purple-100 p-2 rounded-xl transition-all">
                                            <Plus size={16}/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            {/* Diğer tablar (homework, curriculum) mevcut yapıda kalacak... */}
            {activeTab === 'homework' && ( <div>{/* Mevcut Ödev Yapısı */}</div> )}
            {activeTab === 'curriculum' && ( <CurriculumTracker cls={selectedClass} updateClassInDb={updateClassInDb} isTeacherMode={true} libraryItems={libraryItems} saveToLibrary={saveToLibrary} /> )}
        </motion.div>
    );
};

export default ClassDetail;
