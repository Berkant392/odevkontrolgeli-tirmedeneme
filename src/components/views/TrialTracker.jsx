import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    ReferenceLine, LineChart, Line, Legend, BarChart, Bar 
} from 'recharts';
import { 
    Target, TrendingUp, Trash2, Plus, CheckCircle, Flame, Save, X, Calendar, 
    Rocket, Trophy, Edit3, ChevronDown, ChevronUp, ChevronLeft, Search, 
    Filter, ArrowUpDown, Award, Eye, EyeOff 
} from 'lucide-react';
import { db } from '../../config/firebase';
import { 
    collection, query, where, onSnapshot, addDoc, deleteDoc, updateDoc, doc, 
    serverTimestamp 
} from 'firebase/firestore';
import { formatDate } from '../../utils/helpers';
import { lockScroll, unlockScroll } from '../../utils/scrollLock';

// Net hesaplama yardımcı fonksiyonu
const calcNet = (c, w) => {
    const correct = Number(c) || 0;
    const wrong = Number(w) || 0;
    return Math.max(0, correct - (wrong / 4));
};

// Boş soru hesaplama yardımcı fonksiyonu
const calcEmpty = (max, c, w) => {
    const correct = Number(c) || 0;
    const wrong = Number(w) || 0;
    return Math.max(0, max - (correct + wrong));
};

// Soru limiti ve sayı giriş doğrulaması
const handleScoreInput = (val, maxAllowed, currentOther, setStateKey, scoreState, setScoreState) => {
    let numStr = val.replace(/[^0-9]/g, '');
    if (numStr === '') {
        setScoreState({ ...scoreState, [setStateKey]: '' });
        return;
    }
    let num = parseInt(numStr, 10);
    let otherNum = parseInt(scoreState[currentOther] || 0, 10);
    if (num + otherNum > maxAllowed) num = maxAllowed - otherNum;
    setScoreState({ ...scoreState, [setStateKey]: num.toString() });
};

// AYT Branş/Alan Tanımları
const AYT_TRACKS = [
    { id: 'SAY', name: 'SAY (Sayısal)', subjects: ['matAyt', 'fenAyt'] },
    { id: 'EA', name: 'EA (Eşit Ağırlık)', subjects: ['matAyt', 'edebiyat', 'tarih1', 'cografya1'] },
    { id: 'SOZ', name: 'SÖZ (Sözel)', subjects: ['edebiyat', 'tarih1', 'cografya1', 'sosyalAyt'] },
    { id: 'DIL', name: 'DİL (Yabancı Dil)', subjects: ['yabanciDil'] }
];

// Ders Bazlı Detay Bilgileri
const SUBJECT_INFO = {
    turkce: { name: 'Türkçe', max: 40, color: '#e11d48', darkColor: '#fda4af' },
    mat: { name: 'Matematik', max: 40, color: '#2563eb', darkColor: '#93c5fd' },
    sosyal: { name: 'Sosyal Bilimler', max: 20, color: '#d97706', darkColor: '#fde68a' },
    fen: { name: 'Fen Bilimleri', max: 20, color: '#059669', darkColor: '#a7f3d0' },
    matAyt: { name: 'AYT Matematik', max: 40, color: '#3b82f6', darkColor: '#60a5fa' },
    edebiyat: { name: 'Edebiyat', max: 24, color: '#db2777', darkColor: '#f472b6' },
    tarih1: { name: 'Tarih-1', max: 10, color: '#ea580c', darkColor: '#fb923c' },
    cografya1: { name: 'Coğrafya-1', max: 6, color: '#0d9488', darkColor: '#2dd4bf' },
    fenAyt: { name: 'AYT Fen Bilimleri', max: 40, color: '#10b981', darkColor: '#34d399' },
    sosyalAyt: { name: 'AYT Sosyal-2', max: 40, color: '#8b5cf6', darkColor: '#a78bfa' },
    yabanciDil: { name: 'Yabancı Dil', max: 80, color: '#6366f1', darkColor: '#818cf8' }
};

const TrialTracker = ({ studentId, isTeacherMode, showAlert, currentUserRole }) => {
    const isVip = currentUserRole === 'vip-student';
    
    // Veritabanı ve Arayüz State'leri
    const [trials, setTrials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingTrial, setEditingTrial] = useState(null); // Düzenlenen deneme objesi
    
    // Filtre ve Sıralama State'leri
    const [activeFilter, setActiveFilter] = useState('TYT'); // TYT veya AYT
    const [activeSubject, setActiveSubject] = useState('all'); // Hangi ders seçili?
    const [searchQuery, setSearchQuery] = useState('');
    const [minNetFilter, setMinNetFilter] = useState('');
    const [maxNetFilter, setMaxNetFilter] = useState('');
    const [sortBy, setSortBy] = useState('dateDesc'); // dateDesc, dateAsc, netDesc, netAsc
    
    // Sağ Analiz Paneli Sekme State'i
    const [analyticsTab, setAnalyticsTab] = useState('trend'); // trend, subjects, dyb, targets
    const [showTrendline, setShowTrendline] = useState(true);
    const [showTargetLine, setShowTargetLine] = useState(true);

    // AYT için aktif Alan (SAY, EA, SOZ, DIL)
    const [selectedAytTrack, setSelectedAytTrack] = useState('SAY');
    
    // Hedef Net'ler (Ders bazlı, localStorage)
    const [targets, setTargets] = useState(() => {
        try {
            const saved = localStorage.getItem('bh_targets_' + studentId);
            return saved ? JSON.parse(saved) : {};
        } catch { return {}; }
    });

    // Form Girdileri (Ekleme/Düzenleme)
    const [formTitle, setFormTitle] = useState('');
    const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
    const [formExamType, setFormExamType] = useState('TYT');
    const [formAytTrack, setFormAytTrack] = useState('SAY');
    const [scores, setScores] = useState({
        turkce: { c: '', w: '' },
        mat: { c: '', w: '' },
        sosyal: { c: '', w: '' },
        fen: { c: '', w: '' },
        matAyt: { c: '', w: '' },
        edebiyat: { c: '', w: '' },
        tarih1: { c: '', w: '' },
        cografya1: { c: '', w: '' },
        fenAyt: { c: '', w: '' },
        sosyalAyt: { c: '', w: '' },
        yabanciDil: { c: '', w: '' }
    });

    // Form modalı açıkken scroll'u kilitle
    useEffect(() => {
        if (showFormModal) {
            lockScroll();
        }
        return () => {
            if (showFormModal) {
                unlockScroll();
            }
        };
    }, [showFormModal]);

    // Veritabanı Dinleyicisi
    useEffect(() => {
        if (!studentId) return;
        const q = query(collection(db, 'trials'), where('studentId', '==', studentId));
        const unsub = onSnapshot(q, (snap) => {
            const fetchedTrials = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setTrials(fetchedTrials);
            setLoading(false);
        }, () => setLoading(false));
        return () => unsub();
    }, [studentId]);

    // Aktif tab değişiminde ders filtresini sıfırla
    useEffect(() => {
        setActiveSubject('all');
    }, [activeFilter]);

    // Ders Bazlı Hedef Kaydetme
    const handleTargetSave = (subId, value) => {
        const newTargets = { ...targets, [subId]: parseFloat(value) || 0 };
        setTargets(newTargets);
        localStorage.setItem('bh_targets_' + studentId, JSON.stringify(newTargets));
        if (showAlert) showAlert('success', 'Başarılı', 'Ders hedefi güncellendi!');
    };

    // Sıralama ve Filtreleme Algoritması
    const processedTrials = useMemo(() => {
        let list = trials.filter(t => t.type === activeFilter);

        // 1. Arama Filtresi (Deneme ismi)
        if (searchQuery.trim()) {
            const queryNorm = searchQuery.toLowerCase().trim();
            list = list.filter(t => t.title.toLowerCase().includes(queryNorm));
        }

        // 2. Net Filtresi (Min - Max)
        if (minNetFilter !== '') {
            list = list.filter(t => t.totalNet >= parseFloat(minNetFilter));
        }
        if (maxNetFilter !== '') {
            list = list.filter(t => t.totalNet <= parseFloat(maxNetFilter));
        }

        // 3. Sıralama
        list.sort((a, b) => {
            if (sortBy === 'dateDesc') return new Date(b.date) - new Date(a.date);
            if (sortBy === 'dateAsc') return new Date(a.date) - new Date(b.date);
            if (sortBy === 'netDesc') return b.totalNet - a.totalNet;
            if (sortBy === 'netAsc') return a.totalNet - b.totalNet;
            return 0;
        });

        return list;
    }, [trials, activeFilter, searchQuery, minNetFilter, maxNetFilter, sortBy]);

    // Grafiklerin X eksenine göre sıralı veri listesi (Zaman sırasına göre)
    const chronologicalTrials = useMemo(() => {
        return [...processedTrials].sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [processedTrials]);

    // Aktif Filtre İçin Konu Listesi
    const currentSubjects = useMemo(() => {
        if (activeFilter === 'TYT') {
            return [
                { id: 'all', name: 'Toplam Net' },
                { id: 'turkce', name: 'Türkçe' },
                { id: 'mat', name: 'Matematik' },
                { id: 'sosyal', name: 'Sosyal' },
                { id: 'fen', name: 'Fen' }
            ];
        } else {
            // AYT Alanına Göre Filtreleri Listele
            const trackInfo = AYT_TRACKS.find(t => t.id === selectedAytTrack);
            const subs = trackInfo ? trackInfo.subjects : [];
            return [
                { id: 'all', name: 'Toplam Net' },
                ...subs.map(s => ({ id: s, name: SUBJECT_INFO[s].name }))
            ];
        }
    }, [activeFilter, selectedAytTrack]);

    // Trend Eğrisi Hesaplama (plansal trendline slope)
    const trendSlope = useMemo(() => {
        if (chronologicalTrials.length < 2) return null;
        const data = chronologicalTrials.map(t => {
            if (activeSubject === 'all') return t.totalNet;
            return t.details?.[activeSubject] || 0;
        });

        const n = data.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        for (let i = 0; i < n; i++) {
            sumX += i;
            sumY += data[i];
            sumXY += i * data[i];
            sumXX += i * i;
        }
        const denom = (n * sumXX - sumX * sumX);
        if (denom === 0) return 0;
        return (n * sumXY - sumX * sumY) / denom;
    }, [chronologicalTrials, activeSubject]);

    // İstatistikler (Ortalama, En Yüksek, Trend)
    const stats = useMemo(() => {
        const list = processedTrials;
        if (list.length === 0) return { total: 0, avg: '0.00', max: '0.00' };

        const nets = list.map(t => {
            if (activeSubject === 'all') return t.totalNet;
            return t.details?.[activeSubject] || 0;
        });

        const sum = nets.reduce((a, b) => a + b, 0);
        const avg = (sum / list.length).toFixed(2);
        const max = Math.max(...nets).toFixed(2);

        return {
            total: list.length,
            avg,
            max
        };
    }, [processedTrials, activeSubject]);

    // Grafik data eşleştirici
    const trendChartData = useMemo(() => {
        return chronologicalTrials.map((t, index) => {
            let val = activeSubject === 'all' ? t.totalNet : (t.details?.[activeSubject] || 0);
            
            // Trendline noktası hesapla
            let trendVal = null;
            if (chronologicalTrials.length >= 2) {
                // Basit regresyon formülü: y = mx + c
                // X ekseni olarak index değerini kullanıyoruz.
                const nets = chronologicalTrials.map(ct => activeSubject === 'all' ? ct.totalNet : (ct.details?.[activeSubject] || 0));
                const n = nets.length;
                let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
                for (let i = 0; i < n; i++) {
                    sumX += i;
                    sumY += nets[i];
                    sumXY += i * nets[i];
                    sumXX += i * i;
                }
                const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
                const intercept = (sumY - slope * sumX) / n;
                trendVal = parseFloat((slope * index + intercept).toFixed(2));
            }

            return {
                name: t.title,
                Net: val,
                Trend: trendVal,
                date: formatDate(t.date)
            };
        });
    }, [chronologicalTrials, activeSubject]);

    // Tüm Dersler Karşılaştırma Grafiği Verisi
    const subjectsChartData = useMemo(() => {
        const subs = activeFilter === 'TYT' 
            ? ['turkce', 'mat', 'sosyal', 'fen'] 
            : (AYT_TRACKS.find(t => t.id === selectedAytTrack)?.subjects || []);

        return chronologicalTrials.map(t => {
            const dataPoint = { name: t.title };
            subs.forEach(s => {
                dataPoint[SUBJECT_INFO[s].name] = t.details?.[s] || 0;
            });
            return dataPoint;
        });
    }, [chronologicalTrials, activeFilter, selectedAytTrack]);

    // Stacked Bar Doğru Yanlış Boş Grafiği Verisi
    const dybChartData = useMemo(() => {
        return chronologicalTrials.map(t => {
            let correct = 0;
            let wrong = 0;
            let empty = 0;

            if (t.rawDetails) {
                // Yeni veri modeli varsa doğrudan oku
                Object.values(t.rawDetails).forEach(subject => {
                    correct += Number(subject.c) || 0;
                    wrong += Number(subject.w) || 0;
                    empty += Number(subject.e) || 0;
                });
            } else {
                // Eski veri modeli varsa net skorları baz alarak simüle et (Wrong = 0 varsay)
                if (t.type === 'TYT') {
                    correct = Math.round(t.totalNet);
                    empty = 120 - correct;
                } else {
                    correct = Math.round(t.totalNet);
                    empty = 80 - correct;
                }
            }

            return {
                name: t.title,
                Doğru: correct,
                Yanlış: wrong,
                Boş: empty
            };
        });
    }, [chronologicalTrials]);

    // Aktif Filtre/Konu için Hedef Değeri Bul
    const activeTargetValue = useMemo(() => {
        if (activeSubject === 'all') {
            const subs = activeFilter === 'TYT' 
                ? ['turkce', 'mat', 'sosyal', 'fen'] 
                : (AYT_TRACKS.find(t => t.id === selectedAytTrack)?.subjects || []);
            // Her dersin hedefini toplayarak toplam hedef neti bul
            return subs.reduce((sum, s) => sum + (targets[s] || 0), 0);
        }
        return targets[activeSubject] || 0;
    }, [targets, activeSubject, activeFilter, selectedAytTrack]);

    // Deneme Ekleme Modalı Açılış Hazırlığı
    const openAddModal = () => {
        setEditingTrial(null);
        setFormTitle('');
        setFormDate(new Date().toISOString().split('T')[0]);
        setFormExamType(activeFilter);
        setFormAytTrack(selectedAytTrack);
        
        // Skorları Sıfırla
        const freshScores = {};
        Object.keys(SUBJECT_INFO).forEach(k => {
            freshScores[k] = { c: '', w: '' };
        });
        setScores(freshScores);
        setShowFormModal(true);
    };

    // Deneme Düzenleme Modalı Açılış Hazırlığı
    const openEditModal = (trial) => {
        setEditingTrial(trial);
        setFormTitle(trial.title);
        setFormDate(trial.date);
        setFormExamType(trial.type);
        setFormAytTrack(trial.track || 'SAY');
        
        const loadedScores = {};
        Object.keys(SUBJECT_INFO).forEach(k => {
            if (trial.rawDetails?.[k]) {
                loadedScores[k] = { 
                    c: String(trial.rawDetails[k].c || ''), 
                    w: String(trial.rawDetails[k].w || '') 
                };
            } else {
                // Eski verileri okurken neti doğru olarak yükle, yanlışı 0 yap
                const netVal = trial.details?.[k];
                loadedScores[k] = {
                    c: netVal !== undefined ? String(Math.round(netVal)) : '',
                    w: netVal !== undefined ? '0' : ''
                };
            }
        });
        setScores(loadedScores);
        setShowFormModal(true);
    };

    // Kaydetme ve Düzenleme Tetikleyicisi
    const handleSaveTrial = async (e) => {
        e.preventDefault();
        if (!formTitle.trim()) {
            if (showAlert) showAlert('warning', 'Eksik Bilgi', 'Lütfen deneme adını giriniz.');
            return;
        }

        // Seçili form alanlarındaki dersleri topla
        const selectedSubjects = formExamType === 'TYT' 
            ? ['turkce', 'mat', 'sosyal', 'fen'] 
            : (AYT_TRACKS.find(t => t.id === formAytTrack)?.subjects || []);

        let totalNet = 0;
        const details = {};
        const rawDetails = {};

        selectedSubjects.forEach(sId => {
            const cVal = parseInt(scores[sId].c) || 0;
            const wVal = parseInt(scores[sId].w) || 0;
            const maxVal = SUBJECT_INFO[sId].max;
            const eVal = calcEmpty(maxVal, cVal, wVal);
            const netVal = calcNet(cVal, wVal);

            totalNet += netVal;
            details[sId] = parseFloat(netVal.toFixed(2));
            rawDetails[sId] = { c: cVal, w: wVal, e: eVal };
        });

        const payload = {
            studentId,
            title: formTitle.trim(),
            date: formDate,
            type: formExamType,
            track: formExamType === 'AYT' ? formAytTrack : null,
            totalNet: parseFloat(totalNet.toFixed(2)),
            details,
            rawDetails,
            updatedAt: serverTimestamp()
        };

        try {
            if (editingTrial) {
                // Güncelleme
                await updateDoc(doc(db, 'trials', editingTrial.id), payload);
                if (showAlert) showAlert('success', 'Güncellendi', 'Deneme analizi başarıyla güncellendi.');
            } else {
                // Yeni Ekleme
                await addDoc(collection(db, 'trials'), { ...payload, createdAt: serverTimestamp() });
                if (showAlert) showAlert('success', 'Eklendi', 'Yeni deneme analizi eklendi.');
                setActiveFilter(formExamType);
                if (formExamType === 'AYT') setSelectedAytTrack(formAytTrack);
            }
            setShowFormModal(false);
        } catch (err) {
            console.error("Deneme kaydetme hatası:", err);
            if (showAlert) showAlert('error', 'Hata', 'Deneme verisi kaydedilirken bir sorun oluştu.');
        }
    };

    // Silme İşlemi
    const handleDeleteTrial = (id) => {
        if (showAlert) {
            showAlert('warning', 'Denemeyi Sil', 'Bu deneme analizini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.', async () => {
                try {
                    await deleteDoc(doc(db, 'trials', id));
                } catch (err) {
                    showAlert('error', 'Hata', 'Silinirken bir sorun oluştu.');
                }
            });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[300px]">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-300 border-t-brandPurple"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 pb-12">
            
            {/* ÜST BAŞLIK */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/70 backdrop-blur-md p-6 rounded-3xl border border-slate-200/60 shadow-sm relative z-10">
                <div className="flex items-center gap-3.5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                        isVip ? 'bg-amber-500/10 text-amber-500' : 'bg-brandPurple/10 text-brandPurple'
                    }`}>
                        <Award size={26} className="animate-pulse" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Deneme Analiz Merkezi</h1>
                        <p className="text-xs font-bold text-slate-400">Netlerini takip et, zayıf/güçlü yönlerini planla.</p>
                    </div>
                </div>

                <div className="flex gap-2.5 w-full md:w-auto">
                    <button 
                        onClick={() => { setActiveFilter('TYT'); }}
                        className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl font-black text-xs transition-all uppercase tracking-wider ${
                            activeFilter === 'TYT' 
                                ? (isVip ? 'bg-amber-500 text-slate-955 shadow-md' : 'bg-brandPurple text-white shadow-md')
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                    >
                        TYT
                    </button>
                    <button 
                        onClick={() => { setActiveFilter('AYT'); }}
                        className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl font-black text-xs transition-all uppercase tracking-wider ${
                            activeFilter === 'AYT' 
                                ? (isVip ? 'bg-amber-500 text-slate-955 shadow-md' : 'bg-brandPurple text-white shadow-md')
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                    >
                        AYT
                    </button>
                </div>
            </div>

            {/* İKİ KOLONLU ANA YERLEŞİM */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* SOL KOLON: KONTROL PANELİ & DENEME LİSTESİ */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-3xl border border-slate-200/60 p-5 shadow-sm space-y-4">
                        
                        {/* Ekleme Butonu */}
                        {!isTeacherMode && (
                            <button 
                                onClick={openAddModal}
                                className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] ${
                                    isVip 
                                        ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-955 shadow-amber-500/25' 
                                        : 'bg-gradient-to-r from-brandPurple to-indigo-600 text-white shadow-brandPurple/25 hover:brightness-105'
                                }`}
                            >
                                <Plus size={18} strokeWidth={2.5} /> YENİ DENEME EKLE
                            </button>
                        )}

                        {/* AYT için Alan Seçimi */}
                        {activeFilter === 'AYT' && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">AYT Alan Seçiminiz</label>
                                <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl">
                                    {AYT_TRACKS.map(t => (
                                        <button 
                                            key={t.id}
                                            onClick={() => { setSelectedAytTrack(t.id); }}
                                            className={`py-1.5 rounded-lg text-[10px] font-black transition-all ${
                                                selectedAytTrack === t.id 
                                                    ? (isVip ? 'bg-amber-500 text-slate-955 shadow-sm' : 'bg-white text-brandPurple shadow-sm')
                                                    : 'text-slate-500 hover:text-slate-800'
                                            }`}
                                        >
                                            {t.id}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Filtre ve Arama Paneli */}
                        <div className="space-y-3 pt-2 border-t border-slate-100">
                            
                            {/* Arama */}
                            <div className="relative">
                                <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="Deneme ismiyle ara..."
                                    className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold outline-none focus:border-brandPurple focus:bg-white transition-all text-slate-700"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>

                            {/* Net Aralığı Filtresi */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        placeholder="Min Net"
                                        className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brandPurple focus:bg-white transition-all text-slate-700"
                                        value={minNetFilter}
                                        onChange={e => setMinNetFilter(e.target.value)}
                                    />
                                </div>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        placeholder="Max Net"
                                        className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brandPurple focus:bg-white transition-all text-slate-700"
                                        value={maxNetFilter}
                                        onChange={e => setMaxNetFilter(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Sıralama Seçimi */}
                            <div className="relative">
                                <div className="absolute left-3 top-3 text-slate-400"><ArrowUpDown size={14} /></div>
                                <select 
                                    className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold outline-none text-slate-600 appearance-none cursor-pointer focus:border-brandPurple focus:bg-white"
                                    value={sortBy}
                                    onChange={e => setSortBy(e.target.value)}
                                >
                                    <option value="dateDesc">Tarih (En Yeni Önce)</option>
                                    <option value="dateAsc">Tarih (En Eski Önce)</option>
                                    <option value="netDesc">Net (En Yüksek Önce)</option>
                                    <option value="netAsc">Net (En Düşük Önce)</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-3 text-slate-400 pointer-events-none" size={14} />
                            </div>
                        </div>

                        {/* Deneme Listesi */}
                        <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1 pt-1.5 border-t border-slate-100">
                            {processedTrials.length === 0 ? (
                                <div className="text-center py-8 text-xs font-bold text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                    Kriterlere uygun kayıtlı deneme bulunamadı.
                                </div>
                            ) : (
                                processedTrials.map(trial => (
                                    <div 
                                        key={trial.id}
                                        className={`p-3.5 rounded-2xl border text-left flex items-start justify-between gap-3 group relative transition-all ${
                                            isVip ? 'bg-slate-800/20 border-slate-700/50 hover:border-amber-500/30' : 'bg-white border-slate-100 shadow-sm hover:shadow hover:border-brandPurple/20'
                                        }`}
                                    >
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded tracking-wider uppercase ${
                                                    trial.type === 'TYT' 
                                                        ? 'bg-sky-50 text-sky-600 border border-sky-100' 
                                                        : 'bg-rose-50 text-rose-600 border border-rose-100'
                                                }`}>
                                                    {trial.type} {trial.track && `(${trial.track})`}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400">{formatDate(trial.date)}</span>
                                            </div>
                                            <h4 className="font-black text-slate-700 text-xs mt-1.5 truncate pr-6">{trial.title}</h4>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <div className={`text-right font-black text-sm px-2.5 py-1.5 rounded-xl border flex items-center justify-center ${
                                                trial.type === 'TYT' 
                                                    ? 'bg-sky-50/50 text-sky-600 border-sky-100/60' 
                                                    : 'bg-rose-50/50 text-rose-600 border-rose-100/60'
                                            }`}>
                                                {trial.totalNet.toFixed(2)} N
                                            </div>

                                            {/* Kart aksiyonları (Düzenle / Sil) */}
                                            {!isTeacherMode && (
                                                <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 shrink-0 transition-opacity absolute right-2 top-2 bg-white/95 p-1 rounded-lg border shadow-sm">
                                                    <button 
                                                        onClick={() => openEditModal(trial)}
                                                        className="p-1 text-slate-400 hover:text-brandPurple hover:bg-slate-50 rounded"
                                                        title="Düzenle"
                                                    >
                                                        <Edit3 size={12} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteTrial(trial.id)}
                                                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                                        title="Sil"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                    </div>
                </div>

                {/* SAĞ KOLON: GELİŞMİŞ ANALİZ VE GRAFİKLER */}
                <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/60 p-5 shadow-sm space-y-6">
                    
                    {/* Analiz Sekmeleri */}
                    <div className="flex border-b border-slate-100 pb-2 flex-wrap gap-4">
                        <button 
                            onClick={() => setAnalyticsTab('trend')}
                            className={`pb-2.5 font-black text-xs uppercase tracking-wider transition-all relative ${
                                analyticsTab === 'trend' ? 'text-brandPurple' : 'text-slate-400 hover:text-slate-700'
                            }`}
                        >
                            Net Gelişimi (Trend)
                            {analyticsTab === 'trend' && <motion.div layoutId="daTabLine" className="absolute bottom-0 left-0 w-full h-[3px] bg-brandPurple rounded-full" />}
                        </button>
                        <button 
                            onClick={() => setAnalyticsTab('subjects')}
                            className={`pb-2.5 font-black text-xs uppercase tracking-wider transition-all relative ${
                                analyticsTab === 'subjects' ? 'text-brandPurple' : 'text-slate-400 hover:text-slate-700'
                            }`}
                        >
                            Ders Karşılaştırma
                            {analyticsTab === 'subjects' && <motion.div layoutId="daTabLine" className="absolute bottom-0 left-0 w-full h-[3px] bg-brandPurple rounded-full" />}
                        </button>
                        <button 
                            onClick={() => setAnalyticsTab('dyb')}
                            className={`pb-2.5 font-black text-xs uppercase tracking-wider transition-all relative ${
                                analyticsTab === 'dyb' ? 'text-brandPurple' : 'text-slate-400 hover:text-slate-700'
                            }`}
                        >
                            Doğru/Yanlış/Boş
                            {analyticsTab === 'dyb' && <motion.div layoutId="daTabLine" className="absolute bottom-0 left-0 w-full h-[3px] bg-brandPurple rounded-full" />}
                        </button>
                        <button 
                            onClick={() => setAnalyticsTab('targets')}
                            className={`pb-2.5 font-black text-xs uppercase tracking-wider transition-all relative ${
                                analyticsTab === 'targets' ? 'text-brandPurple' : 'text-slate-400 hover:text-slate-700'
                            }`}
                        >
                            Hedefler
                            {analyticsTab === 'targets' && <motion.div layoutId="daTabLine" className="absolute bottom-0 left-0 w-full h-[3px] bg-brandPurple rounded-full" />}
                        </button>
                    </div>

                    {/* Sekme İçerikleri */}
                    <AnimatePresence mode="wait">
                        
                        {/* 1. NET GELİŞİMİ SEKMESİ */}
                        {analyticsTab === 'trend' && (
                            <motion.div 
                                key="trend-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                className="space-y-6"
                            >
                                {/* Ders Seçimi Filtresi */}
                                <div className="flex overflow-x-auto w-full pb-1.5 gap-2 custom-scrollbar border-b border-slate-50">
                                    {currentSubjects.map(sub => (
                                        <button 
                                            key={sub.id}
                                            onClick={() => setActiveSubject(sub.id)}
                                            className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all ${
                                                activeSubject === sub.id 
                                                    ? 'bg-slate-800 text-white shadow-sm'
                                                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                            }`}
                                        >
                                            {sub.name}
                                        </button>
                                    ))}
                                </div>

                                {/* İstatistik Kartları */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-slate-50/70 border rounded-2xl p-3 text-center">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Deneme Sayısı</span>
                                        <span className="text-lg md:text-xl font-black text-slate-800 mt-1 block">{stats.total}</span>
                                    </div>
                                    <div className="bg-slate-50/70 border rounded-2xl p-3 text-center">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Ortalama Net</span>
                                        <span className="text-lg md:text-xl font-black text-slate-800 mt-1 block">{stats.avg}</span>
                                    </div>
                                    <div className="bg-slate-50/70 border rounded-2xl p-3 text-center">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Gelişim Hızı</span>
                                        <span className={`text-xs md:text-sm font-black mt-1.5 flex items-center justify-center gap-1 ${
                                            trendSlope === null ? 'text-slate-500' : trendSlope >= 0 ? 'text-emerald-600' : 'text-rose-500'
                                        }`}>
                                            {trendSlope === null ? '-' : `${trendSlope >= 0 ? '+' : ''}${trendSlope.toFixed(2)} N/deneme`}
                                        </span>
                                    </div>
                                </div>

                                {/* Grafik Görsel Kontroller */}
                                <div className="flex gap-4 items-center justify-end text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                        <input type="checkbox" checked={showTrendline} onChange={e => setShowTrendline(e.target.checked)} className="rounded text-brandPurple focus:ring-brandPurple" />
                                        Eğilim Çizgisi
                                    </label>
                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                        <input type="checkbox" checked={showTargetLine} onChange={e => setShowTargetLine(e.target.checked)} className="rounded text-brandPurple focus:ring-brandPurple" />
                                        Hedef Net
                                    </label>
                                </div>

                                {/* Recharts Grafik */}
                                <div className="h-64 md:h-80 w-full relative">
                                    {trendChartData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={trendChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={activeFilter === 'TYT' ? '#0ea5e9' : '#f43f5e'} stopOpacity={0.25}/>
                                                        <stop offset="95%" stopColor={activeFilter === 'TYT' ? '#0ea5e9' : '#f43f5e'} stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} dy={10} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} dx={-5} />
                                                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', fontWeight: 'bold', fontSize: '12px' }} />
                                                
                                                {/* Ortalama Net Çizgisi */}
                                                <ReferenceLine y={parseFloat(stats.avg)} stroke="#64748b" strokeDasharray="4 4" strokeWidth={1.5} label={{ position: 'insideBottomRight', value: 'ORTALAMA', fill: '#64748b', fontSize: 9, fontWeight: 'bold' }} />
                                                
                                                {/* Hedef Net Çizgisi */}
                                                {showTargetLine && activeTargetValue > 0 && (
                                                    <ReferenceLine y={activeTargetValue} stroke="#ea580c" strokeDasharray="4 4" strokeWidth={1.5} label={{ position: 'insideTopLeft', value: `HEDEF: ${activeTargetValue} N`, fill: '#ea580c', fontSize: 9, fontWeight: 'black' }} />
                                                )}

                                                <Area type="monotone" dataKey="Net" stroke={activeFilter === 'TYT' ? '#0ea5e9' : '#f43f5e'} strokeWidth={3} fillOpacity={1} fill="url(#colorNet)" activeDot={{ r: 5, strokeWidth: 0, fill: activeFilter === 'TYT' ? '#0ea5e9' : '#f43f5e' }} />
                                                
                                                {/* Regresyon Eğilim Çizgisi */}
                                                {showTrendline && (
                                                    <Line type="monotone" dataKey="Trend" stroke="#a855f7" strokeWidth={2} dot={false} strokeDasharray="3 3" />
                                                )}
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                                            <TrendingUp size={48} className="mb-3 opacity-20" />
                                            <p className="font-bold text-xs">Analiz edilecek deneme verisi bulunmuyor.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Otomatik Çıkarım Paneli */}
                                {chronologicalTrials.length >= 2 && (
                                    <div className="bg-slate-50 border rounded-2xl p-4 flex items-start gap-3">
                                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl shrink-0 mt-0.5"><Rocket size={18} /></div>
                                        <div className="text-left">
                                            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Otomatik Performans Özeti</h4>
                                            <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                                                İlk denemeden son denemeye gelişiminiz incelendiğinde netlerinizin 
                                                <strong> {trendSlope >= 0 ? 'yükseliş' : 'düşüş'}</strong> eğiliminde olduğu gözlemlenmiştir. 
                                                Hedeflerinize ulaşmak için {activeSubject === 'all' ? 'genel konu eksiklerinizi' : `${SUBJECT_INFO[activeSubject]?.name} dersi konu eksiklerinizi`} analiz ederek çalışmaya devam edin.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* 2. DERS BAZLI NET GRAFİKLERİ SEKMESİ */}
                        {analyticsTab === 'subjects' && (
                            <motion.div 
                                key="subjects-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                className="space-y-6"
                            >
                                <div className="text-left">
                                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">Ders Bazlı Karşılaştırmalı Grafikler</h3>
                                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">Derslerinizin gelişim seyrini eş zamanlı izleyin.</p>
                                </div>

                                <div className="h-64 md:h-80 w-full">
                                    {subjectsChartData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={subjectsChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
                                                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', fontWeight: 'bold', fontSize: '11px' }} />
                                                <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', paddingTop: '10px' }} />
                                                {/* Seçili olan dersler için dinamik çizgi oluştur */}
                                                {(activeFilter === 'TYT' ? ['turkce', 'mat', 'sosyal', 'fen'] : (AYT_TRACKS.find(t => t.id === selectedAytTrack)?.subjects || [])).map(sKey => (
                                                    <Line 
                                                        key={sKey}
                                                        type="monotone" 
                                                        dataKey={SUBJECT_INFO[sKey].name} 
                                                        stroke={SUBJECT_INFO[sKey].color} 
                                                        strokeWidth={2.5}
                                                        dot={{ r: 3, strokeWidth: 0, fill: SUBJECT_INFO[sKey].color }} 
                                                        activeDot={{ r: 5 }}
                                                    />
                                                ))}
                                            </LineChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                                            <TrendingUp size={48} className="mb-3 opacity-20" />
                                            <p className="font-bold text-xs">Analiz edilecek deneme verisi bulunmuyor.</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* 3. DOĞRU/YANLIŞ/BOŞ DAĞILIM SEKMESİ */}
                        {analyticsTab === 'dyb' && (
                            <motion.div 
                                key="dyb-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                className="space-y-6"
                            >
                                <div className="text-left">
                                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">Sınav Doğru-Yanlış Dağılımları</h3>
                                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">Soru çözüm performansınızın dağılım analizi.</p>
                                </div>

                                <div className="h-64 md:h-80 w-full">
                                    {dybChartData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={dybChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
                                                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', fontWeight: 'bold', fontSize: '11px' }} />
                                                <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', paddingTop: '10px' }} />
                                                <Bar dataKey="Doğru" stackId="a" fill="#10b981" />
                                                <Bar dataKey="Yanlış" stackId="a" fill="#ef4444" />
                                                <Bar dataKey="Boş" stackId="a" fill="#94a3b8" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                                            <TrendingUp size={48} className="mb-3 opacity-20" />
                                            <p className="font-bold text-xs">Analiz edilecek deneme verisi bulunmuyor.</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* 4. HEDEFLER SEKMESİ */}
                        {analyticsTab === 'targets' && (
                            <motion.div 
                                key="targets-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                className="space-y-6"
                            >
                                <div className="text-left">
                                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                                        <Target size={16} className="text-amber-500 animate-spin-slow" /> Ders Bazlı Hedefleriniz
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">Ulaşmak istediğiniz net sayılarını belirleyin. Grafiklerde otomatik gösterilecektir.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {(activeFilter === 'TYT' ? ['turkce', 'mat', 'sosyal', 'fen'] : (AYT_TRACKS.find(t => t.id === selectedAytTrack)?.subjects || [])).map(sId => {
                                        const curTarget = targets[sId] || '';
                                        return (
                                            <div key={sId} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border">
                                                <span className="text-xs font-black text-slate-700">{SUBJECT_INFO[sId].name} <span className="text-[9px] text-slate-400 font-medium">(Max: {SUBJECT_INFO[sId].max})</span></span>
                                                <div className="flex gap-2 items-center">
                                                    <input 
                                                        type="number" 
                                                        placeholder="Net"
                                                        className="w-16 bg-white border border-slate-200 rounded-xl px-2 py-1 text-xs font-black outline-none text-center focus:border-brandPurple"
                                                        value={curTarget}
                                                        onChange={e => handleTargetSave(sId, e.target.value)}
                                                    />
                                                    <span className="text-[10px] font-black text-slate-400">NET</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}

                    </AnimatePresence>

                </div>

            </div>

            {/* EKLEME / DÜZENLEME MODAL OVERLAY */}
            <AnimatePresence>
                {showFormModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ scale: 0.95, y: 15, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: 15, opacity: 0 }}
                            className={`w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl relative max-h-[90vh] overflow-y-auto ${
                                isVip ? 'bg-slate-905 text-slate-100 border border-slate-800' : 'bg-white text-slate-800'
                            }`}
                        >
                            <form onSubmit={handleSaveTrial} className="p-6 space-y-6">
                                
                                {/* Modal Header */}
                                <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                                    <h3 className="text-lg font-black flex items-center gap-2">
                                        <Target className={isVip ? 'text-amber-500' : 'text-brandPurple'} size={22} />
                                        {editingTrial ? 'Deneme Analizini Düzenle' : 'Yeni Deneme Ekle'}
                                    </h3>
                                    <button 
                                        type="button" 
                                        onClick={() => setShowFormModal(false)}
                                        className="p-1.5 rounded-full hover:bg-slate-100 transition-colors text-slate-400"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* Genel Girişler */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5 ml-1">Deneme Adı</label>
                                        <input 
                                            type="text" 
                                            placeholder="Örn: 3D Türkiye Geneli"
                                            required
                                            value={formTitle}
                                            onChange={e => setFormTitle(e.target.value)}
                                            className={`w-full border-2 rounded-xl p-3 font-bold text-xs outline-none transition-all ${
                                                isVip ? 'bg-slate-800 border-slate-700 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-100 focus:bg-white focus:border-brandPurple'
                                            }`}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5 ml-1">Tarih</label>
                                        <input 
                                            type="date" 
                                            required
                                            value={formDate}
                                            onChange={e => setFormDate(e.target.value)}
                                            className={`w-full border-2 rounded-xl p-3 font-bold text-xs outline-none transition-all ${
                                                isVip ? 'bg-slate-800 border-slate-700 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-100 focus:bg-white focus:border-brandPurple'
                                            }`}
                                        />
                                    </div>
                                </div>

                                {/* Sınav Türü Seçimi */}
                                {!editingTrial && (
                                    <div className="grid grid-cols-2 gap-3 bg-slate-100/60 p-1.5 rounded-2xl">
                                        <button 
                                            type="button" 
                                            onClick={() => setFormExamType('TYT')}
                                            className={`py-2 rounded-xl font-black text-xs transition-all ${
                                                formExamType === 'TYT' 
                                                    ? (isVip ? 'bg-amber-500 text-slate-900 shadow' : 'bg-white text-brandPurple shadow')
                                                    : 'text-slate-505'
                                            }`}
                                        >
                                            TYT
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => setFormExamType('AYT')}
                                            className={`py-2 rounded-xl font-black text-xs transition-all ${
                                                formExamType === 'AYT' 
                                                    ? (isVip ? 'bg-amber-500 text-slate-900 shadow' : 'bg-white text-brandPurple shadow')
                                                    : 'text-slate-505'
                                            }`}
                                        >
                                            AYT
                                        </button>
                                    </div>
                                )}

                                {/* AYT için Alan Seçimi */}
                                {formExamType === 'AYT' && !editingTrial && (
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5 ml-1">AYT Alanınız</label>
                                        <div className="grid grid-cols-4 gap-1.5 bg-slate-100/60 p-1.5 rounded-2xl">
                                            {AYT_TRACKS.map(t => (
                                                <button 
                                                    key={t.id}
                                                    type="button"
                                                    onClick={() => setFormAytTrack(t.id)}
                                                    className={`py-2 rounded-xl font-black text-xs transition-all ${
                                                        formAytTrack === t.id 
                                                            ? (isVip ? 'bg-amber-500 text-slate-900 shadow' : 'bg-white text-brandPurple shadow')
                                                            : 'text-slate-505'
                                                    }`}
                                                >
                                                    {t.id}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Ders Skorları Girişleri */}
                                <div className="space-y-3 pt-2">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 block ml-1 mb-1 border-b pb-1.5">Branş Doğru/Yanlış Analizi</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[300px] overflow-y-auto pr-1">
                                        {(formExamType === 'TYT' 
                                            ? ['turkce', 'mat', 'sosyal', 'fen'] 
                                            : (AYT_TRACKS.find(t => t.id === formAytTrack)?.subjects || [])
                                        ).map(sKey => {
                                            const correct = scores[sKey].c;
                                            const wrong = scores[sKey].w;
                                            const max = SUBJECT_INFO[sKey].max;
                                            const empty = calcEmpty(max, correct, wrong);
                                            const net = calcNet(correct, wrong);

                                            return (
                                                <div 
                                                    key={sKey} 
                                                    className={`p-3 rounded-2xl border flex items-center justify-between gap-4 transition-all ${
                                                        isVip ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50/70 border-slate-200'
                                                    }`}
                                                >
                                                    <div className="min-w-0">
                                                        <span className="text-xs font-black text-slate-700 block truncate">{SUBJECT_INFO[sKey].name}</span>
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">Soru: {max} • Boş: {empty}</span>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        {/* Doğru */}
                                                        <div className="w-12 text-center">
                                                            <input 
                                                                type="text" 
                                                                inputMode="numeric"
                                                                placeholder="D"
                                                                value={correct}
                                                                onFocus={e => e.target.select()}
                                                                onChange={e => handleScoreInput(e.target.value, max, 'w', 'c', scores, setScores)}
                                                                className="w-full bg-white border rounded-lg p-1.5 text-xs font-black text-center text-emerald-600 outline-none focus:border-emerald-500"
                                                            />
                                                        </div>
                                                        <span className="text-slate-300">/</span>
                                                        {/* Yanlış */}
                                                        <div className="w-12 text-center">
                                                            <input 
                                                                type="text" 
                                                                inputMode="numeric"
                                                                placeholder="Y"
                                                                value={wrong}
                                                                onFocus={e => e.target.select()}
                                                                onChange={e => handleScoreInput(e.target.value, max, 'c', 'w', scores, setScores)}
                                                                className="w-full bg-white border rounded-lg p-1.5 text-xs font-black text-center text-rose-600 outline-none focus:border-rose-500"
                                                            />
                                                        </div>

                                                        {/* Dinamik Net Gösterimi */}
                                                        <div className="min-w-[48px] text-center font-black text-xs text-brandPurple bg-white border px-1.5 py-1.5 rounded-xl">
                                                            {net.toFixed(2)} N
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Modal Actions */}
                                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                                    <button 
                                        type="button" 
                                        onClick={() => setShowFormModal(false)}
                                        className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-500 hover:bg-slate-100 transition-colors"
                                    >
                                        İptal
                                    </button>
                                    <button 
                                        type="submit"
                                        className={`px-6 py-2.5 rounded-xl font-black text-xs text-white shadow-md active:scale-95 transition-all uppercase tracking-wider flex items-center gap-1.5 ${
                                            isVip ? 'bg-amber-500 text-slate-900 shadow-amber-500/20' : 'bg-brandPurple hover:bg-purple-700 shadow-glow'
                                        }`}
                                    >
                                        <Save size={14} /> Kaydet
                                    </button>
                                </div>

                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default TrialTracker;
