import React from 'react';
import { motion } from 'framer-motion';
import { Layout, Crown, Pencil, AlertOctagon, KeyRound, BookOpen, Plus, Trash2, Calendar, MoreVertical, UserPlus, Printer, TrendingUp } from 'lucide-react';
import { calculateStats, formatDate, getDeadlineStatus } from '../../utils/helpers';
import { TOPIC_THEMES, STATUS_OPTIONS } from '../../utils/constants';
import MobileStudentCard from '../student/MobileCard';
import PdfDownloadButton from '../ui/PdfButton';
import StatusBadge from '../ui/StatusBadge';
import CurriculumTracker from '../curriculum/CurriculumTracker';

const getSafeText = (val) => {
    if (!val) return "";
    if (typeof val === 'string' || typeof val === 'number') return String(val);
    if (typeof val === 'object') {
        if (val.title) return getSafeText(val.title);
        if (val.text) return getSafeText(val.text);
        if (val.name) return getSafeText(val.name);
        return "İsimsiz";
    }
    return String(val);
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
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); setModalData({ classId: selectedClass.id, currentName: selectedClass.className }); setModalInputVal(selectedClass.className); setModalType('edit-class'); }} className={`p-1 rounded-lg transition-colors ${selectedClass.type === 'vip' ? 'text-amber-500 hover:text-amber-600 hover:bg-yellow-100' : 'text-slate-400 hover:text-brandPurple hover:bg-purple-50'}`}><Pencil size={14} /></motion.button>
                        </h3>
                        <div className="text-[10px] md:text-xs text-slate-500 font-medium mt-0.5">{selectedClass.students?.length || 0} Öğrenci • {selectedClass.topics?.length || 0} Görev</div>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto justify-end">
                    {/* 🔥 TAB GEÇİŞLERİNE NET TAKİP EKLENDİ */}
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setActiveTab('homework')} className={`text-[10px] md:text-xs px-3 py-1.5 rounded-xl font-bold shadow-sm flex items-center gap-1 transition-colors ${activeTab === 'homework' ? 'bg-brandPurple text-white' : 'bg-slate-100 text-slate-600'}`}><Layout size={12}/> Ödevler</motion.button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setActiveTab('curriculum')} className={`text-[10px] md:text-xs px-3 py-1.5 rounded-xl font-bold shadow-sm flex items-center gap-1 transition-colors ${activeTab === 'curriculum' ? 'bg-brandPurple text-white' : 'bg-slate-100 text-slate-600'}`}><BookOpen size={12}/> Müfredat</motion.button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setActiveTab('net-takip')} className={`text-[10px] md:text-xs px-3 py-1.5 rounded-xl font-bold shadow-sm flex items-center gap-1 transition-colors ${activeTab === 'net-takip' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'}`}><TrendingUp size={12}/> Net Takip</motion.button>
                    
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={(e) => deleteClass(e, selectedClass.id)} className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 size={16}/></motion.button>
                </div>
            </div>

            {/* TAB İÇERİKLERİ */}
            {activeTab === 'homework' && ( /* ÖDEV İÇERİĞİ AYNI KALACAK */ )}
            {activeTab === 'curriculum' && ( <CurriculumTracker cls={selectedClass} updateClassInDb={updateClassInDb} isTeacherMode={true} libraryItems={libraryItems} saveToLibrary={saveToLibrary} /> )}
            
            {/* 🔥 YENİ: NET TAKİP PANELİ BOŞ YER TUTUCU */}
            {activeTab === 'net-takip' && (
                <div className="p-10 text-center text-slate-400">
                    <TrendingUp size={48} className="mx-auto mb-4 opacity-50"/>
                    <h3 className="text-lg font-black">Net Takip Paneli Yapım Aşamasında</h3>
                    <p className="text-sm">Buraya sınıfın tüm netlerini listeleyen tabloyu ekleyeceğiz.</p>
                </div>
            )}
        </motion.div>
    );
};

export default ClassDetail;
