import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Users, Layout } from 'lucide-react';

const AddClassView = ({ onAddClass }) => {
    const [className, setClassName] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (className.trim()) {
            onAddClass(className.trim());
            setClassName('');
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-4 md:p-8">
            <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-float border border-slate-100 p-6 md:p-10">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 bg-brandPurple/10 text-brandPurple rounded-2xl flex items-center justify-center">
                        <Users size={28} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">Grup Sınıfı Ekle</h2>
                        <p className="text-slate-500 font-medium text-sm">Yeni bir grup sınıfı oluşturun ve öğrencileri eklemeye başlayın.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                            Sınıf Adı
                        </label>
                        <input
                            type="text"
                            autoFocus
                            placeholder="Örn: 12 B"
                            className="w-full border-2 border-slate-200 rounded-2xl p-4 font-bold text-slate-700 outline-none focus:border-brandPurple transition-colors"
                            value={className}
                            onChange={(e) => setClassName(e.target.value)}
                        />
                    </div>
                    
                    <button
                        type="submit"
                        disabled={!className.trim()}
                        className="w-full bg-brandPurple text-white rounded-2xl p-4 font-black tracking-wide flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors shadow-glow disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus size={20} />
                        SINIFI OLUŞTUR
                    </button>
                </form>
            </div>
        </motion.div>
    );
};

export default AddClassView;
