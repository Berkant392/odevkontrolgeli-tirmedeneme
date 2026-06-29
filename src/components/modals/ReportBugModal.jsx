import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, UploadCloud, CheckCircle, AlertTriangle, Send } from 'lucide-react';
import { db } from '../../config/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { BUG_REPORTS_COLLECTION } from '../../utils/constants';

const ReportBugModal = ({ onClose, currentUserRole, loggedInStudent, showAlert }) => {
    const [description, setDescription] = useState("");
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    
    const fileInputRef = useRef(null);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > 1200) {
                    height = Math.round((height * 1200) / width);
                    width = 1200;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                setImage(dataUrl);
                setImagePreview(dataUrl);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    const uploadToTelegram = async (base64) => {
        const res = await fetch('/.netlify/functions/telegramUpload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64, type: 'bug' })
        });
        const data = await res.json();
        if (data.success) return data.file_id;
        if (data.error && data.error.includes("429")) {
            await new Promise(r => setTimeout(r, 2000));
            return uploadToTelegram(base64);
        }
        throw new Error("Telegram yüklemesi başarısız.");
    };

    const handleSubmit = async () => {
        if (!description.trim() && !image) return;

        setIsUploading(true);
        try {
            let fileId = null;
            if (image) {
                fileId = await uploadToTelegram(image);
            }

            let reporterName = "Yönetici";
            let reporterId = "teacher";
            
            if (currentUserRole === 'student' && loggedInStudent) {
                reporterName = loggedInStudent.name;
                reporterId = loggedInStudent.id;
            }

            await addDoc(collection(db, BUG_REPORTS_COLLECTION), {
                reporterName,
                reporterId,
                description: description.trim(),
                fileId,
                status: 'open',
                createdAt: new Date().toISOString()
            });

            setIsSuccess(true);
            setTimeout(() => {
                onClose();
            }, 3000);
        } catch (error) {
            console.error("Hata bildirimi gönderilemedi:", error);
            if (showAlert) {
                showAlert('error', 'Hata Oluştu', 'Bir hata oluştu, lütfen tekrar deneyin.');
            } else {
                alert("Bir hata oluştu, lütfen tekrar deneyin.");
            }
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-rose-500 to-orange-500 p-5 text-white relative shrink-0">
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <h2 className="text-xl font-black mb-1 flex items-center gap-2">
                        <AlertTriangle size={24} /> Hata Bildir
                    </h2>
                    <p className="text-rose-100 text-sm font-medium opacity-90">
                        Uygulama geliştirme aşamasında olup çeşitli hatalar veya eksikler bulunabilir. Bize destek olmak için karşılaştığınız sorunları bildirebilirsiniz.
                    </p>
                </div>

                <div className="p-6 overflow-y-auto space-y-5">
                    {isSuccess ? (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center py-8 text-center space-y-4"
                        >
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-2">
                                <CheckCircle size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">Mesajınız İletilmiştir</h3>
                            <p className="text-slate-500 font-medium">Bildiriminiz için teşekkürler! Bir sonraki güncellemede bu hata en kısa sürede giderilecektir.</p>
                        </motion.div>
                    ) : (
                        <>
                            {/* Form */}
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Sorunu Açıklayın</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Nerede ve nasıl bir hata ile karşılaştınız?"
                                    className="w-full border-2 border-slate-200 rounded-2xl p-4 font-medium text-sm outline-none focus:border-rose-500 min-h-[120px] resize-none transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Ekran Görüntüsü (İsteğe Bağlı)</label>
                                
                                {!imagePreview ? (
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full border-2 border-dashed border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-slate-500 hover:text-rose-500 hover:border-rose-400 hover:bg-rose-50 transition-all group"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-rose-100 flex items-center justify-center transition-colors">
                                            <UploadCloud size={24} />
                                        </div>
                                        <span className="font-bold text-sm">Görsel Seçmek İçin Tıklayın</span>
                                    </button>
                                ) : (
                                    <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200 group">
                                        <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button 
                                                onClick={() => {
                                                    setImage(null);
                                                    setImagePreview(null);
                                                    if(fileInputRef.current) fileInputRef.current.value = '';
                                                }}
                                                className="px-4 py-2 bg-white text-rose-600 rounded-xl font-bold text-sm shadow-lg hover:scale-105 transition-transform"
                                            >
                                                Görseli Kaldır
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handleImageChange} 
                                    accept="image/*" 
                                    className="hidden" 
                                />
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={isUploading || (!description.trim() && !image)}
                                className="w-full py-4 bg-gradient-to-r from-rose-500 to-orange-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-rose-200 hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:pointer-events-none disabled:transform-none shrink-0"
                            >
                                {isUploading ? (
                                    <span className="animate-pulse flex items-center gap-2">Gönderiliyor...</span>
                                ) : (
                                    <><Send size={18} /> Gönder</>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default ReportBugModal;
