import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Send, Trash2, History } from 'lucide-react';
import { db } from '../../config/firebase';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { NOTIFICATIONS_COLLECTION } from '../../utils/constants';

const SendNotificationView = ({ regularClasses, vipClasses, notifications, showAlert }) => {
    const [notifTab, setNotifTab] = useState('send'); // 'send' | 'history'
    const [notifTitle, setNotifTitle] = useState("");
    const [notifText, setNotifText] = useState("");

    const [selectedClasses, setSelectedClasses] = useState([]);
    const [selectedVips, setSelectedVips] = useState([]);
    const [selectAllClasses, setSelectAllClasses] = useState(false);
    const [selectAllVips, setSelectAllVips] = useState(false);

    const allVipStudents = vipClasses.flatMap(c => (c.students || []).map(s => ({ ...s, className: c.className })));

    const handleClassToggle = (classId) => {
        if (selectedClasses.includes(classId)) {
            setSelectedClasses(selectedClasses.filter(id => id !== classId));
            setSelectAllClasses(false);
        } else {
            setSelectedClasses([...selectedClasses, classId]);
        }
    };

    const handleVipToggle = (studentId) => {
        if (selectedVips.includes(studentId)) {
            setSelectedVips(selectedVips.filter(id => id !== studentId));
            setSelectAllVips(false);
        } else {
            setSelectedVips([...selectedVips, studentId]);
        }
    };

    const handleSelectAllClasses = () => {
        if (selectAllClasses) {
            setSelectedClasses([]);
            setSelectAllClasses(false);
        } else {
            setSelectedClasses(regularClasses.map(c => c.id));
            setSelectAllClasses(true);
        }
    };

    const handleSelectAllVips = () => {
        if (selectAllVips) {
            setSelectedVips([]);
            setSelectAllVips(false);
        } else {
            setSelectedVips(allVipStudents.map(s => s.id));
            setSelectAllVips(true);
        }
    };

    const handleSendNotification = async () => {
        if (!notifTitle.trim() || !notifText.trim()) {
            showAlert('warning', 'Uyarı', "Lütfen başlık ve içerik giriniz.");
            return;
        }

        if (selectedClasses.length === 0 && selectedVips.length === 0) {
            showAlert('warning', 'Uyarı', "Lütfen en az bir hedef sınıf veya VIP öğrenci seçiniz.");
            return;
        }

        let targetStudentIds = [];
        let targetNamesList = [];
        
        if (selectAllClasses && selectAllVips) {
            targetNamesList.push("Tüm Öğrenciler");
        } else {
            const classObjs = regularClasses.filter(c => selectedClasses.includes(c.id) || selectAllClasses);
            classObjs.forEach(c => {
                targetNamesList.push(c.className);
                if (c.students) targetStudentIds.push(...c.students.map(s => s.id));
            });
            
            if (selectAllVips) {
                targetNamesList.push("Tüm VIP Öğrenciler");
                targetStudentIds.push(...allVipStudents.map(s => s.id));
            } else {
                const selectedVipObjs = allVipStudents.filter(s => selectedVips.includes(s.id));
                selectedVipObjs.forEach(s => {
                    targetNamesList.push(`VIP ${s.name}`);
                    targetStudentIds.push(s.id);
                });
            }
            targetStudentIds = [...new Set(targetStudentIds)];
        }

        try {
            const newNotif = {
                title: notifTitle.trim(),
                text: notifText.trim(),
                timestamp: new Date().toISOString(),
                targetClasses: selectAllClasses ? ['all'] : selectedClasses,
                targetVipStudents: selectAllVips ? ['all'] : selectedVips,
                targetNames: targetNamesList.join(", ") // GÜNCELLEME: İsimleri kaydet
            };

            const notifRef = collection(db, NOTIFICATIONS_COLLECTION);
            await addDoc(notifRef, newNotif);

            const q = query(notifRef, orderBy('timestamp', 'desc'));
            const snap = await getDocs(q);
            if (snap.size > 10) {
                const docsToDelete = snap.docs.slice(10);
                for (let d of docsToDelete) {
                    await deleteDoc(doc(db, NOTIFICATIONS_COLLECTION, d.id));
                }
            }

            try {
                await fetch('/.netlify/functions/sendNotification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: newNotif.title,
                        text: newNotif.text,
                        targetClasses: newNotif.targetClasses,
                        targetVipStudents: newNotif.targetVipStudents,
                        targetStudentIds: targetStudentIds
                    })
                });
            } catch (functionErr) {
                console.error("Netlify Function Error:", functionErr);
            }

            setNotifTitle("");
            setNotifText("");
            setSelectedClasses([]);
            setSelectedVips([]);
            setSelectAllClasses(false);
            setSelectAllVips(false);
            setNotifTab('history');
            showAlert('success', 'Başarılı', "Bildirim başarıyla gönderildi!");
        } catch (e) {
            console.error("Bildirim gönderilirken hata:", e);
            showAlert('error', 'Hata', "Hata oluştu: " + e.message);
        }
    };

    const handleDeleteNotification = async (id) => {
        showAlert('warning', 'Bildirimi Sil', 'Bu bildirimi silmek istediğinize emin misiniz? Öğrencilerin ekranından da kaybolacaktır.', async () => {
            try {
                await deleteDoc(doc(db, NOTIFICATIONS_COLLECTION, id));
            } catch (e) {
                console.error("Bildirim silinirken hata:", e);
                showAlert('error', 'Hata', 'Silme işlemi başarısız oldu.');
            }
        });
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-4 md:p-8">
            <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-float border border-slate-100 overflow-hidden">
                <div className="flex border-b border-slate-100">
                    <button 
                        onClick={() => setNotifTab('send')} 
                        className={`flex-1 py-4 font-black tracking-widest text-xs uppercase flex items-center justify-center gap-2 transition-colors ${notifTab === 'send' ? 'bg-primary/5 text-primary border-b-2 border-primary' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                        <Send size={16} /> Yeni Gönder
                    </button>
                    <button 
                        onClick={() => setNotifTab('history')} 
                        className={`flex-1 py-4 font-black tracking-widest text-xs uppercase flex items-center justify-center gap-2 transition-colors ${notifTab === 'history' ? 'bg-primary/5 text-primary border-b-2 border-primary' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                        <History size={16} /> Geçmiş
                    </button>
                </div>

                {notifTab === 'send' ? (
                    <div className="p-6 md:p-8 space-y-6">
                        <div className="flex flex-col gap-4 mb-6">
                            <input 
                                type="text" 
                                placeholder="Bildirim Başlığı..." 
                                className="w-full border-2 border-slate-200 rounded-xl p-3 font-bold text-slate-700 outline-none focus:border-primary transition-colors"
                                value={notifTitle} 
                                onChange={e => setNotifTitle(e.target.value)}
                            />
                            <textarea 
                                placeholder="Bildirim İçeriği (Push bildirimi olarak da gidecektir)..." 
                                className="w-full border-2 border-slate-200 rounded-xl p-3 font-medium text-slate-700 outline-none focus:border-primary h-28 resize-none transition-colors"
                                value={notifText} 
                                onChange={e => setNotifText(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                                <div className="bg-slate-50 p-3 border-b border-slate-100 flex justify-between items-center">
                                    <span className="font-bold text-sm text-slate-700">Grup Sınıfları</span>
                                    <button onClick={handleSelectAllClasses} className={`text-xs font-black px-3 py-1 rounded-full border ${selectAllClasses ? 'bg-primary text-white border-primary' : 'bg-white text-slate-500 border-slate-200'}`}>
                                        TÜMÜ
                                    </button>
                                </div>
                                <div className="max-h-48 overflow-y-auto p-2">
                                    {regularClasses.map(cls => (
                                        <label key={cls.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                                            <input type="checkbox" checked={selectedClasses.includes(cls.id) || selectAllClasses} onChange={() => handleClassToggle(cls.id)} className="w-4 h-4 text-primary rounded focus:ring-primary" />
                                            <span className="font-medium text-sm text-slate-700">{cls.className} <span className="text-xs text-slate-400">({cls.students?.length || 0})</span></span>
                                        </label>
                                    ))}
                                    {regularClasses.length === 0 && <div className="p-3 text-xs text-slate-400 text-center">Sınıf bulunmuyor</div>}
                                </div>
                            </div>
                            
                            <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                                <div className="bg-yellow-50/50 p-3 border-b border-yellow-100 flex justify-between items-center">
                                    <span className="font-bold text-sm text-yellow-800">VIP Öğrenciler</span>
                                    <button onClick={handleSelectAllVips} className={`text-xs font-black px-3 py-1 rounded-full border ${selectAllVips ? 'bg-vipGold text-white border-vipGold' : 'bg-white text-slate-500 border-slate-200'}`}>
                                        TÜMÜ
                                    </button>
                                </div>
                                <div className="max-h-48 overflow-y-auto p-2">
                                    {allVipStudents.map(student => (
                                        <label key={student.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                                            <input type="checkbox" checked={selectedVips.includes(student.id) || selectAllVips} onChange={() => handleVipToggle(student.id)} className="w-4 h-4 text-vipGold rounded focus:ring-vipGold" />
                                            <span className="font-medium text-sm text-slate-700">{student.name} <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{student.className}</span></span>
                                        </label>
                                    ))}
                                    {allVipStudents.length === 0 && <div className="p-3 text-xs text-slate-400 text-center">VIP Öğrenci bulunmuyor</div>}
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={handleSendNotification}
                            className="w-full mt-4 bg-primary text-white rounded-xl py-4 font-black tracking-widest text-sm flex items-center justify-center gap-2 shadow-glow hover:opacity-90 transition-opacity"
                        >
                            <Bell size={18} /> GÖNDER VE PUSH BİLDİRİMİ AT
                        </button>
                    </div>
                ) : (
                    <div className="p-4 md:p-6 bg-slate-50">
                        {notifications.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 font-medium text-sm">Henüz gönderilmiş bildirim yok.</div>
                        ) : (
                            <div className="space-y-3">
                                {notifications.map(n => (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={n.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-start gap-4">
                                        <div className="flex-1">
                                            <h4 className="font-black text-slate-800 text-sm mb-1">{n.title}</h4>
                                            <p className="text-slate-600 text-xs mb-3 line-clamp-2">{n.text}</p>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase tracking-wider">{new Date(n.timestamp).toLocaleString('tr-TR')}</span>
                                                <span className="text-[9px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded uppercase tracking-wider border border-blue-100">
                                                    Hedef: {n.targetNames || 'Eski Bildirim'}
                                                </span>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDeleteNotification(n.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors shrink-0">
                                            <Trash2 size={16} />
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default SendNotificationView;
