import React, { useState } from 'react';
import { ChevronDown, Pencil, Printer, Trash2, Calendar, StickyNote, Info } from 'lucide-react';
import { calculateStats, isOverdue, formatDate } from '../../utils/helpers';
import { TOPIC_THEMES, STATUS_OPTIONS } from '../../utils/constants';
import StatusBadge from '../ui/StatusBadge';
import PdfDownloadButton from '../ui/PdfButton';

const MobileStudentCard = ({ student, cls, updateGrade, onOpenNote, onEditStudent, onDeleteStudent, onPrintReport }) => {
    const [expanded, setExpanded] = useState(false);
    const studentStats = calculateStats([student], cls.topics);
    
    // YENİ EKLENENLERİ EN YUKARI ALMAK İÇİN
    const reversedTopics = cls.topics ? [...cls.topics].reverse() : [];

    return (
        <div className="bg-white rounded-2xl shadow-soft border border-slate-200 overflow-hidden mb-4 transition-all duration-300">
            <div className="p-4 flex items-center justify-between cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors" onClick={() => setExpanded(!expanded)}>
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shadow-sm text-white ${cls.type === 'vip' ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}>{student.name.charAt(0)}</div>
                    <div className="flex flex-col"><span className="font-bold text-slate-800 text-lg">{student.name}</span><div className="flex items-center gap-2 mt-1"><span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${cls.type === 'vip' ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-indigo-600 bg-indigo-50 border-indigo-100'}`}>%{studentStats.percentage} Başarı</span>{student.username && <span className="text-[10px] font-mono text-slate-500 bg-slate-200 px-2 py-0.5 rounded">{student.username}</span>}</div></div>
                </div>
                <div className="flex items-center gap-2"><div className={`p-1 rounded-full text-slate-400 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}><ChevronDown size={20} /></div></div>
            </div>

            {expanded && (
                <div className="p-4 border-t border-slate-100 bg-white">
                    <div className="flex justify-end gap-2 mb-4 pb-4 border-b border-slate-100"><button onClick={(e) => { e.stopPropagation(); onEditStudent(student); }} className="text-xs flex items-center gap-1 text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg font-bold"><Pencil size={14}/> Düzenle</button><button onClick={(e) => { e.stopPropagation(); onPrintReport(cls, student); }} className="text-xs flex items-center gap-1 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg font-bold"><Printer size={14}/> Rapor</button><button onClick={(e) => { e.stopPropagation(); onDeleteStudent(e, cls.id, student.id); }} className="text-xs flex items-center gap-1 text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg font-bold"><Trash2 size={14}/> Sil</button></div>
                    {reversedTopics.length === 0 ? (
                        <p className="text-center text-sm text-slate-400 py-4">Bu sınıfa henüz ödev eklenmemiş.</p>
                    ) : (
                        <div className="space-y-6">
                            {reversedTopics.map((topic, i) => {
                                const theme = cls.type === 'vip' ? { main: 'bg-amber-100 text-amber-900 border-amber-200' } : TOPIC_THEMES[i % TOPIC_THEMES.length]; const isLate = isOverdue(topic.date);
                                return (
                                    <div key={topic.id} className={`border border-slate-100 rounded-xl overflow-hidden shadow-sm`}>
                                        <div className={`p-3 flex justify-between items-center border-b ${theme.main}`}><h4 className="font-black text-sm uppercase tracking-wide">{topic.title}</h4>{topic.date && <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${isLate ? 'bg-red-500 text-white animate-pulse' : 'bg-white/50 text-slate-800'}`}>{formatDate(topic.date)}</span>}</div>
                                        <div className="p-2 space-y-2 bg-slate-50/30">
                                            {topic.subColumns?.map(col => {
                                                const currentStatus = student.grades?.[col.id] || 'assigned'; const hasNote = !!student.assignmentNotes?.[col.id];
                                                return (
                                                    <div key={col.id} className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                                                        <div className="flex justify-between items-start mb-2"><div className="font-bold text-sm text-slate-700">{col.title}</div><button onClick={() => onOpenNote(cls.id, student.id, col.id, student.assignmentNotes?.[col.id] || "")} className={`p-1.5 rounded-md transition-colors ${hasNote ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400 hover:text-amber-500'}`} title="Öğretmen Notu"><StickyNote size={14} /></button></div>
                                                        {hasNote && <div className="mb-3 p-2 bg-amber-50 rounded-lg text-xs text-amber-800 border border-amber-100 flex gap-2 items-start"><Info size={14} className="shrink-0 mt-0.5"/><span>{student.assignmentNotes[col.id]}</span></div>}
                                                        <div className="grid grid-cols-4 gap-1 mt-2 bg-slate-100 p-1 rounded-xl">
                                                            {STATUS_OPTIONS.map(opt => (
                                                                <button key={opt.id} onClick={() => updateGrade(cls.id, student.id, col.id, opt.id)} className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${currentStatus === opt.id ? `${opt.bg} ${opt.color} shadow-sm border ${opt.border} scale-105` : 'text-slate-400 hover:bg-white'}`}><opt.icon size={16} className="mb-1" /><span className="text-[9px] font-bold">{opt.label}</span></button>
                                                            ))}
                                                        </div>
                                                        {col.pdfLink && <PdfDownloadButton link={col.pdfLink} isVip={cls.type === 'vip'} isTeacher={false} />}
                                                    </div>
                                                )
                                            })}
                                            {topic.subColumns?.length === 0 && <div className="text-xs text-slate-400 text-center p-2">Bu konuya ait kaynak yok.</div>}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MobileStudentCard;
