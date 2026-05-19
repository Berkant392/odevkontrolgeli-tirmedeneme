import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Save, TrendingUp } from 'lucide-react';
import { DERSLER } from '../../utils/constants';
import { calculateNet } from '../../utils/helpers';

const NetTakipModal = ({ isOpen, onClose, onSave, studentId, classId }) => {
    const [tarih, setTarih] = useState(new Date().toISOString().split('T')[0]);
    const [netler, setNetler] = useState({});

    const handleInputChange = (dersId, field, value) => {
        setNetler(prev => ({
            ...prev,
            [dersId]: { ...prev[dersId], [field]: Number(value) }
        }));
    };

    const handleSave = () => {
        // Hesaplanan netleri veriye ekle
        const finalData = {
            tarih,
            dersler: Object.keys(netler).reduce((acc, dersId) => {
                const { dogru, yanlis } = netler[dersId];
                acc[dersId] = { 
                    dogru: dogru || 0, 
                    yanlis: yanlis || 0, 
                    net: calculateNet(dogru || 0, yanlis || 0) 
                };
                return acc;
            }, {})
        };
        onSave(finalData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                <div className="p-5 border-b flex justify-between items-center bg-slate-50">
                    <h3 className="font-black text-slate-800 flex items-center gap-2"><TrendingUp size={18} className="text-brandPurple"/> Net Girişi</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full"><X size={20}/></button>
                </div>
                
                <div className="p-5 overflow-y-auto space-y-4">
                    <input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold" />
                    
                    {DERSLER.map(ders => (
                        <div key={ders.id} className="grid grid-cols-3 gap-2 items-center bg-slate-50 p-3 rounded-xl">
                            <span className="text-xs font-black text-slate-600">{ders.label}</span>
                            <input type="number" placeholder="D" onChange={(e) => handleInputChange(ders.id, 'dogru', e.target.value)} className="w-full p-2 rounded-lg border text-center text-sm font-bold" />
                            <input type="number" placeholder="Y" onChange={(e) => handleInputChange(ders.id, 'yanlis', e.target.value)} className="w-full p-2 rounded-lg border text-center text-sm font-bold" />
                        </div>
                    ))}
                </div>

                <div className="p-5 border-t">
                    <button onClick={handleSave} className="w-full py-3 bg-brandPurple text-white rounded-xl font-black shadow-lg flex items-center justify-center gap-2 hover:bg-purple-700 transition-all">
                        <Save size={18}/> KAYDET
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default NetTakipModal;
