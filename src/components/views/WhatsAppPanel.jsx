import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageCircle, ChevronDown, CheckSquare, Square, Check, User, AlertTriangle, FileText } from 'lucide-react';

const WhatsAppPanel = ({ classes, allTrials }) => {
    const [selectedTemplate, setSelectedTemplate] = useState('custom');
    const [customMessage, setCustomMessage] = useState('');
    
    // { classId: [studentId1, studentId2, ...] }
    const [selectedStudents, setSelectedStudents] = useState({});
    const [expandedClasses, setExpandedClasses] = useState({});

    // Gönderim Kuyruğu State'leri
    const [sendQueue, setSendQueue] = useState([]);
    const [currentSendIndex, setCurrentSendIndex] = useState(0);
    const [isSending, setIsSending] = useState(false);
    const [sendMode, setSendMode] = useState('popup_single'); // 'popup_single' | 'web_single' | 'web_multi'

    const toggleClassExpand = (classId) => {
        setExpandedClasses(prev => ({ ...prev, [classId]: !prev[classId] }));
    };

    const toggleStudentSelect = (classId, studentId) => {
        setSelectedStudents(prev => {
            const classSelections = prev[classId] || [];
            if (classSelections.includes(studentId)) {
                return { ...prev, [classId]: classSelections.filter(id => id !== studentId) };
            } else {
                return { ...prev, [classId]: [...classSelections, studentId] };
            }
        });
    };

    const toggleClassSelectAll = (classId, students) => {
        setSelectedStudents(prev => {
            const currentSelected = prev[classId] || [];
            if (currentSelected.length === students.length) {
                // Hepsini kaldır
                return { ...prev, [classId]: [] };
            } else {
                // Hepsini seç
                return { ...prev, [classId]: students.map(s => s.id) };
            }
        });
    };

    const totalSelected = Object.values(selectedStudents).reduce((sum, arr) => sum + arr.length, 0);

    // DINAMIK SABLON MOTORU
    const generateMessageForStudent = (cls, student, templateType) => {
        let msg = "";
        const signature = "\n\n_Bu mesaj Berkant Hoca Eğitim Platformu ile otomatik olarak gönderilmiştir. Lütfen cevap yazmayınız._";

        if (templateType === 'missing_homework') {
            msg = `Merhaba ${student.name},\n\nBu haftaki ödev kontrol raporun aşağıdadır:\n`;
            let missingItems = [];
            (cls.topics || []).forEach(topic => {
                (topic.subColumns || []).forEach(col => {
                    const status = student.grades?.[col.id] || 'assigned';
                    if (status === 'missing' || status === 'assigned') {
                        missingItems.push(`- ${topic.title} -> ${col.title}`);
                    }
                });
            });

            if (missingItems.length > 0) {
                msg += `\n*Eksik/Tamamlanmayan Görevleriniz:*\n${missingItems.join("\n")}\n\nLütfen en kısa sürede eksiklerini tamamla!`;
            } else {
                msg += `\nTebrikler! Şu an için eksik bir ödevin görünmüyor. Başarılarının devamını dilerim.`;
            }
        } 
        else if (templateType === 'homework_reminder') {
            msg = `Merhaba ${student.name},\n\nYarına yetişmesi gereken ödevlerin bulunmaktadır. Lütfen ödevlerini tamamlamayı ve derse gelirken yanında getirmeyi unutma! İyi çalışmalar.`;
        }
        else if (templateType === 'class_update') {
            msg = `Merhaba ${student.name},\n\nBugünkü dersimizin saatinde/planında bir değişiklik olmuştur. Lütfen en kısa sürede dönüş yapınız veya detaylar için sistemi kontrol ediniz.`;
        }
        else if (templateType === 'trial_results') {
            // Son denemeyi bul
            const studentTrials = allTrials.filter(t => t.studentId === student.id).sort((a,b) => new Date(b.date) - new Date(a.date));
            if (studentTrials.length > 0) {
                const latest = studentTrials[0];
                msg = `Merhaba ${student.name},\n\nSon katıldığın "${latest.title || 'Deneme'}" sınavının sonuçları sisteme girilmiştir:\n\n*Puan / Net:* ${latest.totalNet} Net\n\nDetaylı analiz için platforma giriş yapabilirsin.`;
            } else {
                msg = `Merhaba ${student.name},\n\nSisteme henüz bir deneme sınavı sonucun girilmemiştir.`;
            }
        }
        else {
            // Custom Message
            msg = customMessage.replace(/{isim}/g, student.name);
        }

        return encodeURIComponent(msg + signature);
    };

    const startBulkSend = () => {
        if (totalSelected === 0) return;
        
        const queue = [];
        classes.forEach(cls => {
            const selectedIds = selectedStudents[cls.id] || [];
            if (selectedIds.length === 0) return;

            (cls.students || []).forEach(student => {
                if (selectedIds.includes(student.id)) {
                    if (!student.phone) {
                        alert(`${student.name} için kayıtlı bir telefon numarası bulunamadı! Lütfen atlayın.`);
                        return;
                    }
                    const text = generateMessageForStudent(cls, student, selectedTemplate);
                    queue.push({
                        studentName: student.name,
                        phone: student.phone.replace('+', ''), // WhatsApp Web requires no +
                        text: text
                    });
                }
            });
        });

        if (queue.length === 0) {
            alert("Gönderilecek geçerli (telefon numarası olan) kimse bulunamadı.");
            return;
        }

        setSendQueue(queue);
        setCurrentSendIndex(0);
        setIsSending(true);
    };

    const sendNext = () => {
        if (currentSendIndex < sendQueue.length) {
            const item = sendQueue[currentSendIndex];
            const url = `https://web.whatsapp.com/send?phone=${item.phone}&text=${item.text}`;
            
            if (sendMode === 'popup_single') {
                const width = 850;
                const height = 650;
                const left = window.screen.width - width - 20; // Ekranın sağına yasla
                const top = 100;
                window.open(url, 'whatsapp_reusable_window', `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no,location=no,toolbar=no,menubar=no`);
            } else if (sendMode === 'web_single') {
                window.open(url, 'whatsapp_reusable_window');
            } else {
                window.open(url, '_blank');
            }
            
            if (currentSendIndex + 1 === sendQueue.length) {
                setIsSending(false); // Bitti
            } else {
                setCurrentSendIndex(prev => prev + 1);
            }
        }
    };

    const cancelSend = () => {
        setIsSending(false);
        setSendQueue([]);
        setCurrentSendIndex(0);
    };

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-6 min-h-screen">
            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-[#25D366]/10 text-[#25D366] rounded-2xl flex items-center justify-center">
                    <MessageCircle size={28} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-800">WhatsApp Mesaj Merkezi</h1>
                    <p className="text-sm font-bold text-slate-500">Öğrencilere toplu veya kişiselleştirilmiş şablon mesajları gönderin.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* SOL: ŞABLON VE MESAJ SEÇİMİ */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                        <h2 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-widest flex items-center gap-2">
                            <FileText size={16} className="text-primary" /> 1. Şablon Seçimi
                        </h2>
                        
                        <div className="space-y-3">
                            <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${selectedTemplate === 'missing_homework' ? 'border-[#25D366] bg-[#25D366]/5' : 'border-slate-100 hover:border-slate-200 bg-slate-50'}`}>
                                <input type="radio" name="template" checked={selectedTemplate === 'missing_homework'} onChange={() => setSelectedTemplate('missing_homework')} className="mt-1" />
                                <div>
                                    <div className="font-bold text-slate-800 text-sm">Eksik Ödev Raporu (Kişiye Özel)</div>
                                    <div className="text-xs text-slate-500 mt-1">Öğrencinin yapmadığı ödevleri/kaynakları analiz eder ve isim isim listeler.</div>
                                </div>
                            </label>

                            <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${selectedTemplate === 'homework_reminder' ? 'border-[#25D366] bg-[#25D366]/5' : 'border-slate-100 hover:border-slate-200 bg-slate-50'}`}>
                                <input type="radio" name="template" checked={selectedTemplate === 'homework_reminder'} onChange={() => setSelectedTemplate('homework_reminder')} className="mt-1" />
                                <div>
                                    <div className="font-bold text-slate-800 text-sm">Genel Ödev Hatırlatması</div>
                                    <div className="text-xs text-slate-500 mt-1">Yarına ödevleri olduğunu ve yanında getirmesi gerektiğini hatırlatır.</div>
                                </div>
                            </label>

                            <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${selectedTemplate === 'trial_results' ? 'border-[#25D366] bg-[#25D366]/5' : 'border-slate-100 hover:border-slate-200 bg-slate-50'}`}>
                                <input type="radio" name="template" checked={selectedTemplate === 'trial_results'} onChange={() => setSelectedTemplate('trial_results')} className="mt-1" />
                                <div>
                                    <div className="font-bold text-slate-800 text-sm">Deneme Sınavı Sonuçları</div>
                                    <div className="text-xs text-slate-500 mt-1">Öğrencinin son girdiği deneme sınavı netini okur ve raporlar.</div>
                                </div>
                            </label>

                            <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${selectedTemplate === 'custom' ? 'border-[#25D366] bg-[#25D366]/5' : 'border-slate-100 hover:border-slate-200 bg-slate-50'}`}>
                                <input type="radio" name="template" checked={selectedTemplate === 'custom'} onChange={() => setSelectedTemplate('custom')} className="mt-1" />
                                <div className="w-full">
                                    <div className="font-bold text-slate-800 text-sm">Kendi Mesajımı Yazacağım</div>
                                    <div className="text-xs text-slate-500 mt-1 mb-2">Öğrenci adı için {`{isim}`} etiketini kullanabilirsiniz.</div>
                                    {selectedTemplate === 'custom' && (
                                        <textarea 
                                            value={customMessage}
                                            onChange={e => setCustomMessage(e.target.value)}
                                            placeholder="Merhaba {isim}, nasılsın? ..."
                                            className="w-full h-24 p-3 rounded-lg border border-slate-200 focus:border-[#25D366] outline-none text-sm font-medium resize-none bg-white"
                                        />
                                    )}
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                        <h2 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-widest flex items-center gap-2">
                            <Send size={16} className="text-[#25D366]" /> 2. Gönderim Türü
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <label className={`flex flex-col p-3 rounded-xl border-2 cursor-pointer transition-colors text-center justify-between h-28 ${sendMode === 'popup_single' ? 'border-[#25D366] bg-[#25D366]/5' : 'border-slate-100 hover:border-slate-200 bg-slate-50'}`}>
                                <input type="radio" name="sendmode" checked={sendMode === 'popup_single'} onChange={() => setSendMode('popup_single')} className="sr-only" />
                                <div>
                                    <div className="font-bold text-slate-800 text-xs flex items-center justify-center gap-1">🚀 Akıllı Pencere</div>
                                    <div className="text-[10px] text-slate-400 mt-1.5 leading-normal">Yan tarafta bağımsız pop-up pencere açar ve orada günceller. Sıfır sekme kirliliği!</div>
                                </div>
                            </label>

                            <label className={`flex flex-col p-3 rounded-xl border-2 cursor-pointer transition-colors text-center justify-between h-28 ${sendMode === 'web_single' ? 'border-[#25D366] bg-[#25D366]/5' : 'border-slate-100 hover:border-slate-200 bg-slate-50'}`}>
                                <input type="radio" name="sendmode" checked={sendMode === 'web_single'} onChange={() => setSendMode('web_single')} className="sr-only" />
                                <div>
                                    <div className="font-bold text-slate-800 text-xs flex items-center justify-center gap-1">🌐 Ayrı Sekme</div>
                                    <div className="text-[10px] text-slate-400 mt-1.5 leading-normal">Normal tarayıcınızda tek bir sekme üzerinde sırayla açar ve günceller.</div>
                                </div>
                            </label>

                            <label className={`flex flex-col p-3 rounded-xl border-2 cursor-pointer transition-colors text-center justify-between h-28 ${sendMode === 'web_multi' ? 'border-[#25D366] bg-[#25D366]/5' : 'border-slate-100 hover:border-slate-200 bg-slate-50'}`}>
                                <input type="radio" name="sendmode" checked={sendMode === 'web_multi'} onChange={() => setSendMode('web_multi')} className="sr-only" />
                                <div>
                                    <div className="font-bold text-slate-800 text-xs flex items-center justify-center gap-1">📑 Klasik Sekmeler</div>
                                    <div className="text-[10px] text-slate-400 mt-1.5 leading-normal">Her mesajı tamamen yeni bir tarayıcı sekmesinde açan eski klasik yöntem.</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    {isSending && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#25D366] rounded-3xl p-6 shadow-lg text-white">
                            <h2 className="text-xl font-black mb-2">Gönderim Kuyruğu Aktif</h2>
                            <p className="text-sm font-medium text-white/90 bg-white/20 p-3 rounded-xl mb-4 leading-relaxed">
                                {sendMode === 'popup_single' 
                                    ? "Mesajlar ekranın sağında açılan tek bir özel pop-up penceresinde sırayla yüklenecektir. Gönderip buraya dönün ve 'Sıradaki'ne basın."
                                    : sendMode === 'web_single'
                                        ? "Mesajlar tarayıcınızdaki tek bir ortak sekmede sırayla açılacaktır. Gönderip buraya dönün ve 'Sıradaki'ne basın."
                                        : "Tarayıcı engeline takılmamak için mesajlar tek tek açılır. WhatsApp Web açıldıktan sonra gönderin ve buraya dönüp 'Sıradaki' butonuna basın."
                                }
                            </p>
                            
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-bold">Gönderilen: {currentSendIndex} / {sendQueue.length}</span>
                            </div>
                            <div className="w-full bg-white/30 h-3 rounded-full mb-6 overflow-hidden">
                                <div className="bg-white h-full transition-all duration-300" style={{ width: `${(currentSendIndex / sendQueue.length) * 100}%` }}></div>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={sendNext} className="flex-1 bg-white text-[#25D366] font-black py-3 rounded-xl shadow-sm hover:scale-105 transition-transform flex items-center justify-center gap-2">
                                    <Send size={18} /> SIRADAKİNİ GÖNDER ({sendQueue[currentSendIndex]?.studentName})
                                </button>
                                <button onClick={cancelSend} className="px-4 py-3 bg-rose-500 text-white font-black rounded-xl hover:bg-rose-600 transition-colors">İPTAL</button>
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* SAĞ: HEDEF SEÇİMİ */}
                <div className="lg:col-span-5">
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 sticky top-6">
                        <h2 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-widest flex items-center gap-2">
                            <User size={16} className="text-primary" /> 2. Hedef Kitle
                        </h2>
                        
                        <div className="max-h-[50vh] overflow-y-auto pr-2 space-y-3 mb-6">
                            {classes.map(cls => {
                                const students = cls.students || [];
                                const selectedInClass = selectedStudents[cls.id] || [];
                                const isExpanded = expandedClasses[cls.id];
                                const isAllSelected = students.length > 0 && selectedInClass.length === students.length;
                                const isIndeterminate = selectedInClass.length > 0 && selectedInClass.length < students.length;

                                return (
                                    <div key={cls.id} className="border border-slate-200 rounded-2xl overflow-hidden">
                                        <div className="bg-slate-50 p-3 flex items-center justify-between cursor-pointer select-none" onClick={() => toggleClassExpand(cls.id)}>
                                            <div className="flex items-center gap-3">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); toggleClassSelectAll(cls.id, students); }}
                                                    className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isAllSelected ? 'bg-primary border-primary text-white' : isIndeterminate ? 'bg-primary/20 border-primary text-primary' : 'border-slate-300 bg-white'}`}
                                                >
                                                    {isAllSelected && <Check size={14} />}
                                                    {isIndeterminate && <div className="w-2.5 h-0.5 bg-primary rounded-full"></div>}
                                                </button>
                                                <span className="font-bold text-sm text-slate-800">{cls.className}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-400">{selectedInClass.length}/{students.length}</span>
                                                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                            </div>
                                        </div>

                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                                    <div className="p-2 border-t border-slate-100 bg-white divide-y divide-slate-50">
                                                        {students.length === 0 && <div className="p-3 text-xs text-center text-slate-400 font-bold">Öğrenci yok</div>}
                                                        {students.map(std => {
                                                            const isSelected = selectedInClass.includes(std.id);
                                                            const hasPhone = !!std.phone;
                                                            return (
                                                                <div key={std.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer" onClick={() => toggleStudentSelect(cls.id, std.id)}>
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary text-white' : 'border-slate-300'}`}>
                                                                            {isSelected && <Check size={12} />}
                                                                        </div>
                                                                        <span className={`text-xs font-bold ${hasPhone ? 'text-slate-700' : 'text-rose-500'}`}>{std.name}</span>
                                                                    </div>
                                                                    {!hasPhone && <AlertTriangle size={12} className="text-rose-400" title="Telefon numarası eksik!" />}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )
                            })}
                        </div>

                        <button 
                            onClick={startBulkSend}
                            disabled={totalSelected === 0 || isSending}
                            className={`w-full py-4 rounded-xl font-black shadow-md flex items-center justify-center gap-2 transition-all ${totalSelected > 0 && !isSending ? 'bg-[#25D366] hover:bg-[#128C7E] text-white hover:scale-[1.02]' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                        >
                            <MessageCircle size={20} />
                            {totalSelected} KİŞİYE GÖNDER
                        </button>
                        
                        <p className="text-[10px] text-center font-bold text-slate-400 mt-4 leading-relaxed px-4">
                            Öğrencilerinizin numaralarının sistemde +90 formatıyla kayıtlı olduğundan emin olun. Tarayıcı pop-up engelleyicisinin WhatsApp Web'e izin verdiğini doğrulayın.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default WhatsAppPanel;
