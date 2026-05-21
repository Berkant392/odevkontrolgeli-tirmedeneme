import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Target, TrendingUp, Trash2, Plus, CheckCircle, Flame, Save, X, Calendar, Rocket, Trophy, Edit3 } from 'lucide-react';
import { db } from '../../config/firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { formatDate } from '../../utils/helpers';

const calcNet = (c, w) => {
    const correct = Number(c) || 0;
    const wrong = Number(w) || 0;
    return Math.max(0, correct - (wrong / 4));
};

const calcEmpty = (max, c, w) => {
    const correct = Number(c) || 0;
    const wrong = Number(w) || 0;
    return Math.max(0, max - (correct + wrong));
};

const handleNumberInput = (val, maxAllowed, currentOther, setStateKey, state, setState) => {
    let numStr = val.replace(/[^0-9]/g, '');
    if (numStr === '') {
        setState({ ...state, [setStateKey]: '' });
        return;
    }
    let num = parseInt(numStr, 10);
    let otherNum = parseInt(state[currentOther] || 0, 10);
    if (num + otherNum > maxAllowed) num = maxAllowed - otherNum;
    setState({ ...state, [setStateKey]: num.toString() });
};

const SubjectInput = ({ label, max, state, setState, color }) => {
    const empty = calcEmpty(max, state.correct, state.wrong);
    return (
        <div className={`p-2.5 md:p-4 rounded-2xl border ${color.border} ${color.bg} shadow-sm`}>
            <div className={`font-black text-[10px] md:text-xs uppercase tracking-widest ${color.text} mb-2 md:mb-3`}>{label} <span className="opacity-60 text-[8px] md:text-[9px] lowercase ml-1">(Max: {max})</span></div>
            <div className="flex gap-1.5 md:gap-3 items-end">
                <div className="flex-[2]">
                    <label className="text-[8px] md:text-[10px] font-bold text-slate-500 block mb-0.5 md:mb-1">Doğru</label>
                    <input type="text" inputMode="numeric" value={state.correct} onFocus={(e) => e.target.select()} onChange={(e) => handleNumberInput(e.target.value, max, 'wrong', 'correct', state, setState)} className="w-full bg-white border-2 border-slate-200 rounded-lg md:rounded-xl p-1.5 md:p-2.5 text-xs md:text-base font-black text-slate-700 outline-none focus:border-brandPurple transition-colors text-center" placeholder="0" />
                </div>
                <div className="flex-[2]">
                    <label className="text-[8px] md:text-[10px] font-bold text-slate-500 block mb-0.5 md:mb-1">Yanlış</label>
                    <input type="text" inputMode="numeric" value={state.wrong} onFocus={(e) => e.target.select()} onChange={(e) => handleNumberInput(e.target.value, max, 'correct', 'wrong', state, setState)} className="w-full bg-white border-2 border-slate-200 rounded-lg md:rounded-xl p-1.5 md:p-2.5 text-xs md:text-base font-black text-slate-700 outline-none focus:border-brandPurple transition-colors text-center" placeholder="0" />
                </div>
                <div className="flex-[1.5] opacity-50">
                    <label className="text-[8px] md:text-[10px] font-bold text-slate-500 block mb-0.5 md:mb-1 text-center">Boş</label>
                    <div className="w-full bg-slate-100/50 border-2 border-slate-100 rounded-lg md:rounded-xl p-1.5 md:p-2.5 text-xs md:text-base font-bold text-slate-500 text-center flex items-center justify-center min-h-[32px] md:min-h-[44px]">
                        {empty}
                    </div>
                </div>
                <div className="flex-[2] flex flex-col justify-end">
                    <div className="bg-white border-2 border-brandPurple/20 rounded-lg md:rounded-xl p-1.5 md:p-2.5 text-xs md:text-base font-black text-center text-brandPurple shadow-[0_0_15px_rgba(147,51,234,0.1)] flex items-center justify-center min-h-[32px] md:min-h-[44px]">
                        {calcNet(state.correct, state.wrong).toFixed(2)}
                    </div>
                </div>
            </div>
        </div>
    );
};

const TrialTracker = ({ studentId, isTeacherMode, showAlert, currentUserRole }) => {
    const [trials, setTrials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    
    // TYT / AYT Filter State
    const [activeFilter, setActiveFilter] = useState('TYT');
    const [activeSubject, setActiveSubject] = useState('all');
    const [targets, setTargets] = useState(() => {
        try {
            const saved = localStorage.getItem('bh_targets_' + studentId);
            return saved ? JSON.parse(saved) : {};
        } catch { return {}; }
    });
    
    const handleTargetChange = (e) => {
        const val = e.target.value;
        const newTargets = { ...targets, [`${activeFilter}_${activeSubject}`]: val };
        setTargets(newTargets);
        localStorage.setItem('bh_targets_' + studentId, JSON.stringify(newTargets));
    };

    const currentTarget = targets[`${activeFilter}_${activeSubject}`] || '';

    const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
    const [formTitle, setFormTitle] = useState('');
    const [examType, setExamType] = useState('TYT'); // YDT removed

    // TYT
    const [turkce, setTurkce] = useState({ correct: '', wrong: '' });
    const [mat, setMat] = useState({ correct: '', wrong: '' });
    const [sosyal, setSosyal] = useState({ correct: '', wrong: '' });
    const [fen, setFen] = useState({ correct: '', wrong: '' });
    
    // AYT
    const [edebiyat, setEdebiyat] = useState({ correct: '', wrong: '' }); // Max 24
    const [tarih1, setTarih1] = useState({ correct: '', wrong: '' }); // Max 10
    const [cografya1, setCografya1] = useState({ correct: '', wrong: '' }); // Max 6

    const [matAyt, setMatAyt] = useState({ correct: '', wrong: '' });
    const [fenAyt, setFenAyt] = useState({ correct: '', wrong: '' });
    const [sosyalAyt, setSosyalAyt] = useState({ correct: '', wrong: '' }); // Sos-2 (Max 40)

    const isVip = currentUserRole === 'vip-student';

    useEffect(() => {
        if (!studentId) return;
        const q = query(collection(db, 'trials'), where('studentId', '==', studentId));
        const unsub = onSnapshot(q, (snap) => {
            const fetchedTrials = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setTrials(fetchedTrials.sort((a, b) => new Date(a.date) - new Date(b.date)));
            setLoading(false);
        }, () => setLoading(false));
        return () => unsub();
    }, [studentId]);

    const resetForm = () => {
        setFormTitle(''); setTurkce({ correct: '', wrong: '' }); setMat({ correct: '', wrong: '' });
        setSosyal({ correct: '', wrong: '' }); setFen({ correct: '', wrong: '' });
        setEdebiyat({ correct: '', wrong: '' }); setTarih1({ correct: '', wrong: '' }); setCografya1({ correct: '', wrong: '' });
        setMatAyt({ correct: '', wrong: '' }); setFenAyt({ correct: '', wrong: '' }); setSosyalAyt({ correct: '', wrong: '' });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formTitle.trim()) { showAlert('warning', 'Hata', 'Lütfen deneme adını giriniz.'); return; }
        let totalNet = 0, details = {};
        
        if (examType === 'TYT') {
            const tN = calcNet(turkce.correct, turkce.wrong), mN = calcNet(mat.correct, mat.wrong);
            const sN = calcNet(sosyal.correct, sosyal.wrong), fN = calcNet(fen.correct, fen.wrong);
            totalNet = tN + mN + sN + fN;
            details = { turkce: tN, mat: mN, sosyal: sN, fen: fN };
        } else if (examType === 'AYT') {
            const edbN = calcNet(edebiyat.correct, edebiyat.wrong);
            const tar1N = calcNet(tarih1.correct, tarih1.wrong);
            const cog1N = calcNet(cografya1.correct, cografya1.wrong);
            const sos1Total = edbN + tar1N + cog1N;
            
            const mN = calcNet(matAyt.correct, matAyt.wrong);
            const fN = calcNet(fenAyt.correct, fenAyt.wrong);
            const s2N = calcNet(sosyalAyt.correct, sosyalAyt.wrong);
            
            totalNet = sos1Total + mN + fN + s2N;
            details = { edebiyat: edbN, tarih1: tar1N, cografya1: cog1N, sos1Total: sos1Total, matAyt: mN, fenAyt: fN, sosyalAyt: s2N };
        }
        
        try {
            await addDoc(collection(db, 'trials'), { studentId, title: formTitle, date: formDate, type: examType, totalNet: parseFloat(totalNet.toFixed(2)), details, createdAt: serverTimestamp() });
            setShowForm(false); resetForm();
            showAlert('success', 'Başarılı', 'Deneme sonucu başarıyla kaydedildi.');
            setActiveFilter(examType); // Switch view to saved type
        } catch (err) { showAlert('error', 'Hata', 'Deneme kaydedilirken bir hata oluştu.'); }
    };

    const handleDelete = (id) => {
        showAlert('warning', 'Denemeyi Sil', 'Bu deneme sonucunu silmek istediğinize emin misiniz?', async () => {
            try { await deleteDoc(doc(db, 'trials', id)); } catch (err) { showAlert('error', 'Hata', 'Silinirken bir sorun oluştu.'); }
        });
    };

    const tytTrials = trials.filter(t => t.type === 'TYT');
    const aytTrials = trials.filter(t => t.type === 'AYT');
    const displayTrials = activeFilter === 'TYT' ? tytTrials : aytTrials;

    const tytSubjects = [
        { id: 'all', name: 'Toplam Net' },
        { id: 'turkce', name: 'Türkçe' },
        { id: 'mat', name: 'Matematik' },
        { id: 'sosyal', name: 'Sosyal' },
        { id: 'fen', name: 'Fen' }
    ];

    const aytSubjects = [
        { id: 'all', name: 'Toplam Net' },
        { id: 'edebiyat', name: 'Edebiyat' },
        { id: 'tarih1', name: 'Tarih-1' },
        { id: 'cografya1', name: 'Coğrafya-1' },
        { id: 'matAyt', name: 'Matematik' },
        { id: 'fenAyt', name: 'Fen' },
        { id: 'sosyalAyt', name: 'Sosyal-2' }
    ];

    const currentSubjects = activeFilter === 'TYT' ? tytSubjects : aytSubjects;

    useEffect(() => {
        setActiveSubject('all');
    }, [activeFilter]);

    const chartData = displayTrials.map(t => {
        let netValue = t.totalNet;
        if (activeSubject !== 'all' && t.details) {
            netValue = t.details[activeSubject] || 0;
        }
        return { name: t.title, Net: netValue, date: formatDate(t.date) };
    });

    const getSubjectAnalysis = () => {
        if (displayTrials.length < 2) return null;
        const first = displayTrials[0];
        const last = displayTrials[displayTrials.length - 1];
        
        const subjects = currentSubjects.filter(s => s.id !== 'all');
        const changes = subjects.map(sub => {
            const firstNet = first.details?.[sub.id] || 0;
            const lastNet = last.details?.[sub.id] || 0;
            const change = lastNet - firstNet;
            return { ...sub, change, firstNet, lastNet };
        }).filter(sub => sub.firstNet > 0 || sub.lastNet > 0);

        if (changes.length === 0) return null;

        const strongest = changes.reduce((prev, current) => (prev.change > current.change) ? prev : current);
        const weakest = changes.reduce((prev, current) => (prev.change < current.change) ? prev : current);

        return { strongest, weakest };
    };

    const analysis = getSubjectAnalysis();

    const stats = {
        total: displayTrials.length,
        avg: displayTrials.length ? (displayTrials.reduce((a, c) => a + c.totalNet, 0) / displayTrials.length).toFixed(2) : '0.00',
        max: displayTrials.length ? Math.max(...displayTrials.map(t => t.totalNet)).toFixed(2) : '0.00',
    };

    const getDetailLabels = (trial) => {
        if (!trial.details) return [];
        if (trial.type === 'TYT') return [
            { label: 'Türkçe', val: trial.details.turkce }, { label: 'Mat', val: trial.details.mat },
            { label: 'Sosyal', val: trial.details.sosyal }, { label: 'Fen', val: trial.details.fen }
        ];
        if (trial.type === 'AYT') return [
            { label: 'Edebiyat', val: trial.details.edebiyat }, { label: 'Tarih-1', val: trial.details.tarih1 }, 
            { label: 'Coğrafya-1', val: trial.details.cografya1 }, { label: 'Mat', val: trial.details.matAyt },
            { label: 'Fen', val: trial.details.fenAyt }, { label: 'Sosyal-2', val: trial.details.sosyalAyt }
        ];
        return [];
    };

    if (loading) return <div className="text-center text-slate-400 py-10 text-sm font-bold">Yükleniyor...</div>;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-7xl mx-auto">
            {/* Gösterge Paneli */}
            <div className="text-center mb-5 md:mb-6">
                <h2 className={`text-xl md:text-2xl font-black mb-1 ${isVip ? 'text-white' : 'text-slate-800'}`}>Deneme Takip Paneli</h2>
                <p className="text-[11px] md:text-sm font-bold text-slate-400">Netlerini kaydet, gelişimini izle.</p>
            </div>

            <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6 md:mb-8">
                <div className={`p-3 md:p-6 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center text-center gap-1 md:gap-2 ${isVip ? 'bg-slate-700 shadow-lg border border-slate-600' : 'bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100'}`}>
                    <div className="flex flex-col md:flex-row items-center gap-1 md:gap-2">
                        <span className="text-xl md:text-3xl">📝</span>
                        <div className="text-[9px] md:text-sm font-bold text-slate-400 leading-tight">Toplam<br className="md:hidden"/> {activeFilter}</div>
                    </div>
                    <div className={`text-xl md:text-4xl font-black mt-1 md:mt-0 ${isVip ? 'text-white' : 'text-slate-800'}`}>{stats.total}</div>
                </div>
                <div className={`p-3 md:p-6 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center text-center gap-1 md:gap-2 ${isVip ? 'bg-slate-700 shadow-lg border border-slate-600' : 'bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100'}`}>
                    <div className="flex flex-col md:flex-row items-center gap-1 md:gap-2">
                        <span className="text-xl md:text-3xl">🎯</span>
                        <div className="text-[9px] md:text-sm font-bold text-slate-400 leading-tight">Ortalama<br className="md:hidden"/> Net</div>
                    </div>
                    <div className={`text-xl md:text-4xl font-black mt-1 md:mt-0 ${isVip ? 'text-white' : 'text-slate-800'}`}>{stats.avg}</div>
                </div>
                <div className={`p-3 md:p-6 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center text-center gap-1 md:gap-2 ${isVip ? 'bg-slate-700 shadow-lg border border-slate-600' : 'bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100'}`}>
                    <div className="flex flex-col md:flex-row items-center gap-1 md:gap-2">
                        <span className="text-xl md:text-3xl">🏆</span>
                        <div className="text-[9px] md:text-sm font-bold text-slate-400 leading-tight">En Yüksek<br className="md:hidden"/> Net</div>
                    </div>
                    <div className={`text-xl md:text-4xl font-black mt-1 md:mt-0 ${isVip ? 'text-white' : 'text-slate-800'}`}>{stats.max}</div>
                </div>
            </div>

            {/* Üst Bar ve Filtreler */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-3 md:gap-4 mb-4">
                <div className="flex bg-slate-100/80 p-1 md:p-1.5 rounded-xl md:rounded-2xl w-full md:w-auto">
                    {['TYT', 'AYT'].map(filter => (
                        <button key={filter} onClick={() => setActiveFilter(filter)} className={`flex-1 md:flex-initial md:px-8 py-2 md:py-2.5 rounded-lg md:rounded-xl font-black text-xs md:text-sm transition-all ${activeFilter === filter ? 'bg-white text-brandPurple shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{filter}</button>
                    ))}
                </div>
                {!isTeacherMode && (
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { setExamType(activeFilter); setShowForm(true); }}
                        className={`w-full md:w-auto px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl font-black text-xs md:text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${isVip ? 'real-gold-bg text-slate-900 hover:shadow-xl' : 'bg-brandPurple text-white hover:bg-purple-600 shadow-brandPurple/30'}`}>
                        <Edit3 size={16} strokeWidth={2.5} /> Yeni Deneme Gir
                    </motion.button>
                )}
            </div>

            {/* Ders Filtreleri ve Hedef Net */}
            <div className={`p-4 rounded-2xl md:rounded-3xl border mb-6 flex flex-col md:flex-row items-center justify-between gap-4 ${isVip ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="flex overflow-x-auto w-full pb-1 custom-scrollbar gap-2">
                    {currentSubjects.map(sub => (
                        <button 
                            key={sub.id} 
                            onClick={() => setActiveSubject(sub.id)} 
                            className={`whitespace-nowrap px-4 py-2 rounded-xl font-black text-xs md:text-sm transition-all ${activeSubject === sub.id ? 'bg-brandPurple text-white shadow-md' : isVip ? 'bg-slate-600 text-slate-300 hover:bg-slate-500' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                        >
                            {sub.name}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                    <Target size={18} className="text-brandPurple" />
                    <input 
                        type="number" 
                        placeholder="Hedef Net" 
                        value={currentTarget} 
                        onChange={handleTargetChange} 
                        className={`w-28 px-3 py-2 rounded-xl font-black text-sm outline-none border-2 transition-all ${isVip ? 'bg-slate-600 border-slate-500 text-white focus:border-amber-400' : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-brandPurple focus:bg-white'}`}
                    />
                </div>
            </div>

            {/* Yapay Zekasız Basit Analiz */}
            {analysis && (
                <div className={`mb-6 p-4 rounded-2xl md:rounded-3xl border flex items-center gap-3 ${isVip ? 'bg-emerald-900/30 border-emerald-500/30 text-emerald-100' : 'bg-emerald-50 border-emerald-100 text-emerald-800'}`}>
                    <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-500"><Rocket size={20}/></div>
                    <div className="text-xs md:text-sm">
                        <span className="font-black block mb-0.5">Ders Bazlı Gelişim Analizi</span>
                        En güçlü dersin: <span className="font-black">{analysis.strongest.name}</span> ({analysis.strongest.change > 0 ? '+' : ''}{analysis.strongest.change.toFixed(2)} net), 
                        En zayıf dersin: <span className="font-black">{analysis.weakest.name}</span> ({analysis.weakest.change > 0 ? '+' : ''}{analysis.weakest.change.toFixed(2)} net).
                    </div>
                </div>
            )}

            {/* Grafik */}
            <div className={`p-4 md:p-8 rounded-2xl md:rounded-3xl border ${isVip ? 'bg-slate-700 border-slate-600 shadow-lg' : 'bg-white border-slate-100 shadow-[0_8px_30px_-4px_rgba(0,0,0,0.05)]'}`}>
                <h3 className={`text-sm md:text-base font-black mb-4 md:mb-8 flex items-center gap-2 ${isVip ? 'text-white' : 'text-slate-800'}`}>
                    <TrendingUp className={activeFilter === 'TYT' ? 'text-blue-500' : 'text-rose-500'} size={20} /> 
                    {activeFilter} {activeSubject !== 'all' ? currentSubjects.find(s => s.id === activeSubject)?.name : 'Toplam'} Net Gelişim Grafiği
                </h3>
                <div className="h-48 md:h-72 w-full">
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                                <defs><linearGradient id="cNet2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={activeFilter === 'TYT' ? '#3b82f6' : '#f43f5e'} stopOpacity={0.4}/><stop offset="95%" stopColor={activeFilter === 'TYT' ? '#3b82f6' : '#f43f5e'} stopOpacity={0}/></linearGradient></defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isVip ? '#334155' : '#f1f5f9'} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold', fill: '#94a3b8' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold', fill: '#94a3b8' }} dx={-10} />
                                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.15)', fontWeight: 'bold', fontSize: '13px', padding: '12px' }} />
                                {currentTarget && !isNaN(parseFloat(currentTarget)) && (
                                    <ReferenceLine y={parseFloat(currentTarget)} label={{ position: 'insideTopLeft', value: 'HEDEF', fill: '#ef4444', fontSize: 11, fontWeight: 'black' }} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={2} />
                                )}
                                <Area type="monotone" dataKey="Net" stroke={activeFilter === 'TYT' ? '#3b82f6' : '#f43f5e'} strokeWidth={4} fillOpacity={1} fill="url(#cNet2)" activeDot={{ r: 6, strokeWidth: 0, fill: activeFilter === 'TYT' ? '#3b82f6' : '#f43f5e' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                            <TrendingUp size={56} className="mb-4 opacity-10" />
                            <p className="font-bold text-sm">Bu kategori için henüz deneme verisi yok.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Deneme Listesi */}
            {displayTrials.length > 0 && (
                <div className="space-y-4">
                    <h3 className={`text-base font-black flex items-center gap-2 px-1 mt-4 ${isVip ? 'text-white' : 'text-slate-800'}`}>
                        <Target className={activeFilter === 'TYT' ? 'text-blue-500' : 'text-rose-500'} size={20} /> Kaydedilen {activeFilter} Denemeleri
                    </h3>
                    {[...displayTrials].reverse().map(trial => (
                        <div key={trial.id} className={`p-4 md:p-6 rounded-2xl md:rounded-3xl border group relative overflow-hidden ${isVip ? 'bg-slate-700 border-slate-600 shadow-md' : 'bg-white border-slate-100 shadow-sm hover:shadow-md'} transition-all`}>
                            <div className="flex justify-between items-start mb-4 md:mb-5">
                                <div>
                                    <span className={`text-[9px] md:text-[10px] font-black px-2.5 py-1 rounded-lg tracking-widest ${trial.type === 'TYT' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>{trial.type}</span>
                                    <h4 className={`font-black text-base md:text-xl mt-2 ${isVip ? 'text-white' : 'text-slate-800'}`}>{trial.title}</h4>
                                </div>
                                <div className="flex items-center gap-2 md:gap-4">
                                    <div className="text-right">
                                        <span className={`text-xl md:text-3xl font-black ${trial.type === 'TYT' ? 'text-blue-600' : 'text-rose-600'}`}>{trial.totalNet} <span className="text-xs md:text-sm opacity-50">Net</span></span>
                                    </div>
                                    {!isTeacherMode && (
                                        <button onClick={() => handleDelete(trial.id)} className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={16} /></button>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 md:gap-2 border-t border-slate-100 pt-3 md:pt-4">
                                <div className={`flex items-center gap-1 md:gap-1.5 text-[10px] md:text-xs font-bold px-2.5 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl ${isVip ? 'bg-slate-600 text-slate-300' : 'bg-slate-50 text-slate-500'}`}>
                                    <Calendar size={12} className="md:w-[14px] md:h-[14px]"/> {formatDate(trial.date)}
                                </div>
                                {getDetailLabels(trial).map((d, i) => (
                                    <span key={i} className={`text-[10px] md:text-xs font-bold px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl ${isVip ? 'bg-slate-600 text-slate-200' : 'bg-slate-50 text-slate-600'}`}>
                                        <span className="opacity-70 mr-0.5 md:mr-1">{d.label}:</span> <span className="font-black text-[11px] md:text-[13px]">{typeof d.val === 'number' ? d.val.toFixed(2) : d.val}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Yeni Deneme Formu Modalı */}
            <AnimatePresence>
                {showForm && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 md:p-4 bg-slate-900/60 backdrop-blur-md">
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white w-full max-w-2xl rounded-3xl md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-4 md:p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center shrink-0">
                                <h3 className="text-base md:text-lg font-black text-slate-800 flex items-center gap-2"><Target className="text-brandPurple" size={20} /> Yeni Deneme Kaydı</h3>
                                <button onClick={() => setShowForm(false)} className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"><X size={20} /></button>
                            </div>
                            
                            <div className="p-4 md:p-6 overflow-y-auto space-y-4 md:space-y-6">
                                <div className="grid grid-cols-2 gap-3 md:gap-4">
                                    <div>
                                        <label className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block md:mb-1.5">Deneme Adı</label>
                                        <input type="text" placeholder="Örn: 3D TG" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl p-2.5 md:p-3.5 font-bold text-xs md:text-sm text-slate-700 outline-none focus:bg-white focus:border-brandPurple transition-colors" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block md:mb-1.5">Tarih</label>
                                        <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl p-2.5 md:p-3.5 font-bold text-xs md:text-sm text-slate-700 outline-none focus:bg-white focus:border-brandPurple transition-colors" />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block md:mb-2">Sınav Türü</label>
                                    <div className="flex bg-slate-100 p-1 md:p-1.5 rounded-xl md:rounded-2xl">
                                        {['TYT', 'AYT'].map(type => (
                                            <button key={type} onClick={() => setExamType(type)} className={`flex-1 py-2 md:py-3 rounded-lg md:rounded-xl font-black text-xs md:text-sm transition-all ${examType === type ? 'bg-white text-brandPurple shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>{type}</button>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="space-y-3 md:space-y-4">
                                    {examType === 'TYT' && <>
                                        <SubjectInput label="Türkçe" max={40} state={turkce} setState={setTurkce} color={{ bg: 'bg-rose-50/50', border: 'border-rose-100', text: 'text-rose-600' }} />
                                        <SubjectInput label="Matematik" max={40} state={mat} setState={setMat} color={{ bg: 'bg-blue-50/50', border: 'border-blue-100', text: 'text-blue-600' }} />
                                        <SubjectInput label="Sosyal" max={20} state={sosyal} setState={setSosyal} color={{ bg: 'bg-amber-50/50', border: 'border-amber-100', text: 'text-amber-600' }} />
                                        <SubjectInput label="Fen" max={20} state={fen} setState={setFen} color={{ bg: 'bg-emerald-50/50', border: 'border-emerald-100', text: 'text-emerald-600' }} />
                                    </>}
                                    {examType === 'AYT' && <>
                                        <div className="bg-slate-50 p-3 md:p-4 rounded-2xl md:rounded-3xl border border-slate-100 space-y-3 md:space-y-4">
                                            <h4 className="font-black text-xs md:text-sm text-slate-700 mb-1 md:mb-2">Edebiyat / Sosyal-1</h4>
                                            <SubjectInput label="Edebiyat" max={24} state={edebiyat} setState={setEdebiyat} color={{ bg: 'bg-white', border: 'border-rose-100', text: 'text-rose-600' }} />
                                            <SubjectInput label="Tarih-1" max={10} state={tarih1} setState={setTarih1} color={{ bg: 'bg-white', border: 'border-orange-100', text: 'text-orange-600' }} />
                                            <SubjectInput label="Coğrafya-1" max={6} state={cografya1} setState={setCografya1} color={{ bg: 'bg-white', border: 'border-amber-100', text: 'text-amber-600' }} />
                                        </div>
                                        <SubjectInput label="Matematik" max={40} state={matAyt} setState={setMatAyt} color={{ bg: 'bg-blue-50/50', border: 'border-blue-100', text: 'text-blue-600' }} />
                                        <SubjectInput label="Fen Bilimleri" max={40} state={fenAyt} setState={setFenAyt} color={{ bg: 'bg-emerald-50/50', border: 'border-emerald-100', text: 'text-emerald-600' }} />
                                        <SubjectInput label="Sosyal-2" max={40} state={sosyalAyt} setState={setSosyalAyt} color={{ bg: 'bg-amber-50/50', border: 'border-amber-100', text: 'text-amber-600' }} />
                                    </>}
                                </div>
                            </div>
                            
                            <div className="p-4 md:p-6 bg-white border-t border-slate-100 flex gap-3 md:gap-4 shrink-0">
                                <button onClick={() => setShowForm(false)} className="flex-1 py-3.5 bg-slate-50 text-slate-600 rounded-xl md:rounded-2xl font-black text-xs md:text-sm hover:bg-slate-100 transition-colors">İptal</button>
                                <button onClick={handleSave} className="flex-1 py-3.5 bg-brandPurple text-white rounded-xl md:rounded-2xl font-black text-xs md:text-sm hover:bg-purple-600 transition-colors shadow-glow flex items-center justify-center gap-2"><Save size={16}/> Kaydet</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default TrialTracker;
