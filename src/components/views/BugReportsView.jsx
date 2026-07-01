import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, Search, Trash2, CheckCircle2, Inbox, Calendar, Image as ImageIcon, X } from 'lucide-react';
import { db } from '../../config/firebase';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { BUG_REPORTS_COLLECTION } from '../../utils/constants';

const BugReportsView = ({ bugReports, showAlert }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);

    const filteredReports = bugReports.filter(report => 
        report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.reporterName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleResolve = async (id) => {
        try {
            await deleteDoc(doc(db, BUG_REPORTS_COLLECTION, id));
            showAlert('success', 'Başarılı', 'Hata raporu çözüldü olarak işaretlendi ve listeden kaldırıldı.');
        } catch (error) {
            console.error("Hata çözülürken hata oluştu:", error);
            showAlert('error', 'Hata', 'İşlem sırasında bir hata oluştu.');
        }
    };

    return (
        <div className="h-full flex flex-col p-4 xl:p-8 overflow-y-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                        <AlertTriangle className="text-amber-500" size={32} />
                        Gelen Hatalar
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Öğrencilerin bildirdiği hataları buradan takip edebilirsiniz.</p>
                </div>
                
                <div className="relative w-full md:w-auto">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Hata veya Öğrenci Ara..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full md:w-80 pl-11 pr-4 py-3 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-amber-400 transition-colors font-medium"
                    />
                </div>
            </div>

            {/* List */}
            {filteredReports.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white/50 border-2 border-dashed border-slate-200 rounded-3xl">
                    <div className="w-24 h-24 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-6">
                        <Inbox size={48} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-700 mb-2">Hata Raporu Yok</h2>
                    <p className="text-slate-500 font-medium text-center max-w-md">Harika! Şu anda bildirilmiş herhangi bir hata bulunmuyor veya aramanızla eşleşen bir sonuç yok.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {filteredReports.map((report) => (
                            <motion.div 
                                key={report.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all group flex flex-col h-full"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-xs font-bold mb-3">
                                            <AlertTriangle size={14} /> Açık
                                        </div>
                                        <h3 className="font-bold text-slate-800 text-lg mb-1">{report.reporterName}</h3>
                                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                                            <Calendar size={12} />
                                            {new Date(report.createdAt).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={() => handleResolve(report.id)}
                                        className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-colors shrink-0"
                                        title="Çözüldü İşaretle (Kaldır)"
                                    >
                                        <CheckCircle2 size={24} />
                                    </button>
                                </div>

                                <div className="bg-slate-50 rounded-2xl p-4 text-sm font-medium text-slate-600 mb-4 flex-1">
                                    {report.description}
                                </div>

                                {report.fileId && (
                                    <button 
                                        onClick={() => setSelectedImage(report.fileId)}
                                        className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 text-white rounded-xl font-bold text-sm hover:bg-slate-700 transition-colors"
                                    >
                                        <ImageIcon size={18} />
                                        Ekran Görüntüsünü Gör
                                    </button>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Image Modal */}
            {selectedImage && (
                <div 
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4"
                    onClick={() => setSelectedImage(null)}
                >
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative max-w-5xl w-full"
                        onClick={e => e.stopPropagation()}
                    >
                        <button 
                            onClick={() => setSelectedImage(null)}
                            className="absolute -top-12 right-0 p-2 bg-white/20 text-white rounded-full hover:bg-white/40 transition-colors"
                        >
                            <X size={24} />
                        </button>
                        <img 
                            src={`/.netlify/functions/telegramFetch?file_id=${selectedImage}`} 
                            alt="Hata Ekran Görüntüsü" 
                            className="w-full h-auto max-h-[85vh] object-contain rounded-2xl shadow-2xl"
                        />
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default BugReportsView;
