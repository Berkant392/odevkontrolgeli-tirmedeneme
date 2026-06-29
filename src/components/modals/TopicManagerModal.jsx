import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Plus, Upload, Check, Copy, AlertTriangle } from 'lucide-react';

const TopicManagerModal = ({ isOpen, onClose, onAddSingle, onAddBulk, existingCount }) => {
    const [activeTab, setActiveTab] = useState('single'); // 'single' or 'bulk'
    const [singleTitle, setSingleTitle] = useState('');
    const [bulkText, setBulkText] = useState('');
    const [copied, setCopied] = useState(false);
    const fileInputRef = useRef(null);

    const templateText = `Konu: Temel Kavramlar
- Rakam ve Sayı Kümeleri
- Tek ve Çift Sayılar
- Pozitif ve Negatif Sayılar

Konu: Sayı Basamakları
- Çözümleme
- Dört İşlem`;

    useEffect(() => {
        if (isOpen) {
            document.body.classList.add('modal-open');
        } else {
            document.body.classList.remove('modal-open');
        }
        return () => {
            document.body.classList.remove('modal-open');
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleCopyTemplate = () => {
        navigator.clipboard.writeText(templateText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSingleSubmit = () => {
        if (!singleTitle.trim()) return;
        onAddSingle(singleTitle.trim());
        setSingleTitle('');
        onClose();
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            setBulkText(event.target.result);
        };
        reader.readAsText(file);
    };

    const parseBulkText = (text) => {
        // Replace potential zero-width spaces or weird characters, then split by newline
        const lines = text.replace(/\u200B/g, '').split('\n').map(line => line.trim()).filter(line => line.length > 0);
        const parsedTopics = [];
        let currentTopic = null;

        for (const line of lines) {
            // "Konu: Başlık" veya "# Başlık" formatı ana konudur
            if (line.toLowerCase().startsWith('konu:') || line.startsWith('#')) {
                const title = line.replace(/^konu:/i, '').replace(/^#/, '').trim();
                currentTopic = {
                    title,
                    subtopics: []
                };
                parsedTopics.push(currentTopic);
            } 
            // "-" veya "*", "o", "•", veya sayı (1.) ile başlayanlar alt başlıktır
            else if (/^[-*+o•]/.test(line) || /^\d+\./.test(line)) {
                const subTitle = line.replace(/^[-*+o•\s]+/, '').replace(/^\d+\.\s*/, '').trim();
                if (currentTopic) {
                    currentTopic.subtopics.push(subTitle);
                } else {
                    // Eğer konu başlığı yoksa ama madde imi varsa, geçici bir konu aç
                    currentTopic = { title: 'Genel Konular', subtopics: [subTitle] };
                    parsedTopics.push(currentTopic);
                }
            } else {
                // Konu başlığı değil ve madde imi yoksa, belki alt alta yazılmış alt başlıktır.
                if (currentTopic) {
                    currentTopic.subtopics.push(line);
                }
            }
        }
        return parsedTopics;
    };

    const handleBulkSubmit = () => {
        if (!bulkText.trim()) return;
        const parsedData = parseBulkText(bulkText);
        if (parsedData.length === 0) {
            alert("Lütfen txt formatının şablona uygun olduğundan emin olun. 'Konu:' ve '-' etiketlerini kullanın.");
            return;
        }
        onAddBulk(parsedData);
        setBulkText('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
            
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative overflow-hidden z-10 flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="bg-slate-50 px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                            <Plus className="text-primary"/> Petek (Konu) Yöneticisi
                        </h2>
                        <p className="text-xs font-bold text-slate-500 mt-1">Haritaya yeni görevler ekleyin</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-slate-200 text-slate-600 hover:bg-slate-300 rounded-full transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex px-6 pt-4 gap-4 border-b border-slate-100 shrink-0">
                    <button 
                        onClick={() => setActiveTab('single')}
                        className={`pb-3 px-1 text-sm font-bold border-b-2 transition-colors ${activeTab === 'single' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        Tekli Ekleme
                    </button>
                    <button 
                        onClick={() => setActiveTab('bulk')}
                        className={`pb-3 px-1 text-sm font-bold border-b-2 transition-colors ${activeTab === 'bulk' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        Toplu Yükleme (TXT)
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    {activeTab === 'single' ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Yeni Konu Başlığı</label>
                                <input 
                                    type="text" 
                                    value={singleTitle}
                                    onChange={(e) => setSingleTitle(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSingleSubmit()}
                                    placeholder="Örn: Temel Kavramlar"
                                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:border-primary focus:bg-white transition-all"
                                    autoFocus
                                />
                            </div>
                            <button 
                                onClick={handleSingleSubmit}
                                disabled={!singleTitle.trim()}
                                className="w-full bg-primary text-white font-bold py-3.5 rounded-2xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <Plus size={18} /> Haritaya Ekle
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4">
                                <h3 className="text-sm font-black text-blue-900 mb-2 flex items-center gap-2">
                                    <AlertTriangle size={16} className="text-blue-600"/> Yapay Zeka ile Otomatik Oluştur
                                </h3>
                                <p className="text-xs font-medium text-blue-800/80 mb-3 leading-relaxed">
                                    Müfredatınızı ChatGPT veya Claude gibi bir yapay zeka aracına verip <strong>"Bu konuları aşağıdaki txt şablonuna göre düzenle"</strong> diyebilirsiniz. Ardından aldığınız sonucu bir txt dosyasına kaydedip buraya yükleyin.
                                </p>
                                
                                <div className="bg-slate-900 rounded-xl p-3 relative group">
                                    <pre className="text-[10px] sm:text-xs font-mono text-slate-300 whitespace-pre-wrap">
                                        {templateText}
                                    </pre>
                                    <button 
                                        onClick={handleCopyTemplate}
                                        className="absolute top-2 right-2 bg-slate-800 text-slate-400 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:text-white"
                                        title="Şablonu Kopyala"
                                    >
                                        {copied ? <Check size={14} className="text-green-400"/> : <Copy size={14}/>}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">TXT Dosyası Yükle Veya Metni Yapıştır</label>
                                <div className="flex gap-2 mb-3">
                                    <input 
                                        type="file" 
                                        accept=".txt" 
                                        ref={fileInputRef} 
                                        onChange={handleFileUpload} 
                                        className="hidden" 
                                    />
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex-1 bg-slate-100 text-slate-600 hover:bg-slate-200 border-2 border-dashed border-slate-300 font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Upload size={16} /> .TXT Seç
                                    </button>
                                </div>
                                <div 
                                    contentEditable
                                    onInput={(e) => setBulkText(e.currentTarget.innerText)}
                                    placeholder="Veya formatlı metni buraya yapıştırın..."
                                    className="w-full h-40 bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 text-xs font-mono text-slate-700 focus:outline-none focus:border-primary focus:bg-white transition-all overflow-y-auto empty:before:content-[attr(placeholder)] empty:before:text-slate-400"
                                />
                            </div>

                            <button 
                                onClick={handleBulkSubmit}
                                disabled={!bulkText.trim()}
                                className="w-full bg-primary text-white font-bold py-3.5 rounded-2xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <FileText size={18} /> Toplu Dönüştür ve Ekle
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default TopicManagerModal;
