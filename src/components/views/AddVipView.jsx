import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FolderPlus, Crown } from 'lucide-react';

const AddVipView = ({ onAddVip }) => {
    const [vipName, setVipName] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (vipName.trim()) {
            onAddVip(vipName.trim());
            setVipName('');
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-4 md:p-8">
            <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-float border border-slate-100 p-6 md:p-10 relative overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-yellow-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 pointer-events-none"></div>
                
                <div className="flex items-center gap-4 mb-8 relative z-10">
                    <div className="w-14 h-14 bg-amber-100 text-vipGold rounded-2xl flex items-center justify-center">
                        <Crown size={28} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">Özel Ders (VIP) Ekle</h2>
                        <p className="text-slate-500 font-medium text-sm">Birebir takip edeceğiniz VIP öğrenci sınıfı oluşturun.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                            Özel Ders Adı
                        </label>
                        <input
                            type="text"
                            autoFocus
                            placeholder="Örn: VIP Ayşe"
                            className="w-full border-2 border-slate-200 rounded-2xl p-4 font-bold text-slate-700 outline-none focus:border-vipGold transition-colors"
                            value={vipName}
                            onChange={(e) => setVipName(e.target.value)}
                        />
                    </div>
                    
                    <button
                        type="submit"
                        disabled={!vipName.trim()}
                        className="w-full bg-vipGold text-white rounded-2xl p-4 font-black tracking-wide flex items-center justify-center gap-2 hover:bg-yellow-500 transition-colors shadow-vip-glow disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FolderPlus size={20} />
                        ÖZEL DERS OLUŞTUR
                    </button>
                </form>
            </div>
        </motion.div>
    );
};

export default AddVipView;
