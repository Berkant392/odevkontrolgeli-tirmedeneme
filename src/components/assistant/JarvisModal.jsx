import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, RefreshCw, Save, User, CheckCircle2, TerminalSquare, ChevronRight, HelpCircle, Search, Lock, UserPlus, Loader2 } from 'lucide-react';
import { STATUS_OPTIONS } from '../../utils/constants';
import Fuse from 'fuse.js';

// ═══════════════════════════════════════════════════════════════
// 🛡️ ÇÖKME ENGELLEYİCİ GÜVENLİK KALKANI
// ═══════════════════════════════════════════════════════════════
const getSafeText = (val) => {
    if (!val) return "";
    if (typeof val === 'string' || typeof val === 'number') return String(val);
    if (typeof val === 'object') {
        if (val.title) return getSafeText(val.title);
        if (val.text) return getSafeText(val.text);
        if (val.name) return getSafeText(val.name);
        return "İsimsiz";
    }
    return String(val);
};

const lightStatusStyles = {
    'done': 'bg-emerald-50 border-emerald-200 text-emerald-600 font-bold shadow-sm',
    'missing': 'bg-rose-50 border-rose-200 text-rose-600 font-bold shadow-sm',
    'assigned': 'bg-amber-50 border-amber-200 text-amber-600 font-bold shadow-sm',
    'exempt': 'bg-slate-50 border-slate-200 text-slate-500 font-bold shadow-sm'
};

// ═══════════════════════════════════════════════════════════════
// 🧠 TÜRKÇE NLP MOTORU - ÇEKİM EKİ NORMALİZASYONU
// ═══════════════════════════════════════════════════════════════
const TURKISH_STEM_RULES = {
    'dı': 'd', 'di': 'd', 'du': 'd', 'dü': 'd',
    'tı': 't', 'ti': 't', 'tu': 't', 'tü': 't',
    'ildi': 'il', 'ıldı': 'ıl', 'uldu': 'ul', 'üldü': 'ül',
    'madı': 'ma', 'medi': 'me', 'madu': 'ma', 'medü': 'me',
    'mış': 'm', 'miş': 'm', 'muş': 'm', 'müş': 'm',
    'mışım': 'm', 'mişim': 'm', 'muşum': 'm', 'müşüm': 'm',
};

const TURKISH_STATUS_SYNONYMS = {
    done: [
        'yapıldı', 'yapıl', 'yapılmış', 'yapmış', 'yaptı', 'yap', 'yapıyor',
        'çözüldü', 'çözül', 'çözülmüş', 'çözmüş', 'çözdü', 'çöz', 'çözüyor',
        'bitti', 'bit', 'bitmiş', 'bittik', 'tamam', 'tamamdır', 'tamamladı', 'tamamlandı',
        'hazır', 'hallettim', 'halledildi', 'halledilmiş', 'halledil', 'halloldu',
        'full', 'ful', 'ok', 'güzel', 'iyi', 'peki', 'evet', 'oldu', 'olmuş',
        'yapıyoruz', 'yapıldık', 'çözdük', 'bitirdik', 'tamamladık',
        'yapıldığı', 'çözüldüğü', 'bittiği', 'tamamlandığı'
    ],
    missing: [
        'yapılmadı', 'yapılmamış', 'yapamadı', 'yapamamış', 'yapmamış', 'yapmıyor',
        'çözülmedi', 'çözülmemiş', 'çözemedi', 'çözemedik', 'çözemedi', 'çözmüyor',
        'eksik', 'eksi', 'eksikti', 'eksikmiş', 'eksik kalmış',
        'boş', 'boşmuş', 'boştu', 'boş kalmış',
        'yok', 'yoktu', 'yokmuş', 'hiç', 'hiçbiri', 'hiçbirini', 'hiçbirine',
        'sıfır', 'sıfırdı', 'sıfır kalmış',
        'bitmedi', 'bitmemiş', 'bitiremedi', 'bitirememiş',
        'kaldı', 'kalmış', 'kalmıştı', 'yarım', 'yarım kalmış', 'bırakıldı', 'bırakılmış',
        'yapılmadığı', 'çözülmediği', 'eksik olduğu', 'boş olduğu', 'yok olduğu'
    ],
    assigned: [
        'verildi', 'veril', 'verilmiş', 'verdim', 'vermiş', 'ver', 'veriyor',
        'atandı', 'atandık', 'atadım', 'atmış', 'at', 'atıyor',
        'ödev ver', 'ödev verildi', 'ödev verdim', 'ödev verdik',
        'bıraktım', 'bırakıldı', 'bırak', 'bırakılmış',
        'verildiği', 'atandığı', 'bırakıldığı'
    ],
    exempt: [
        'muaf', 'muafız', 'muafız', 'muafiyet', 'muafiyetli',
        'gerek yok', 'gerekyok', 'gerek kalmadı', 'gerekli değil',
        'pas', 'pas geç', 'pas geçtik', 'pas geçildi', 'pas geçilmiş',
        'sayılır', 'sayıldı', 'sayılmış', 'sayıldık',
        'muaf olduğu', 'sayıldığı', 'pas geçildiği'
    ]
};

const turkishNormalize = (text) => {
    if (!text) return '';
    return text.toLocaleLowerCase('tr-TR')
        .replace(/â/g, 'a').replace(/Â/g, 'a')
        .replace(/ê/g, 'e').replace(/Ê/g, 'e')
        .replace(/î/g, 'i').replace(/Î/g, 'i')
        .replace(/ô/g, 'o').replace(/Ô/g, 'o')
        .replace(/û/g, 'u').replace(/Û/g, 'u')
        .replace(/ş/g, 's').replace(/ç/g, 'c')
        .replace(/ğ/g, 'g').replace(/ü/g, 'u')
        .replace(/ö/g, 'o').replace(/ı/g, 'i')
        .replace(/İ/g, 'i');
};

const normalizeTurkishWord = (word) => {
    if (!word) return '';
    let normalized = word.toLocaleLowerCase('tr-TR');
    Object.entries(TURKISH_STEM_RULES).forEach(([suffix, stem]) => {
        if (normalized.endsWith(suffix)) {
            normalized = normalized.slice(0, -suffix.length) + stem;
        }
    });
    return normalized;
};

const normalizeText = (text) => {
    if (!text) return '';
    return text.toLocaleLowerCase('tr-TR')
        .split(/\s+/)
        .map(normalizeTurkishWord)
        .join(' ');
};

const detectStatus = (text) => {
    if (!text) return null;
    const normalized = normalizeText(text);
    const words = normalized.split(/\s+/);
    let bestMatch = { status: null, length: 0, confidence: 0 };

    Object.entries(TURKISH_STATUS_SYNONYMS).forEach(([status, synonyms]) => {
        synonyms.forEach(syn => {
            const normalizedSyn = normalizeText(syn);
            if (normalized.includes(normalizedSyn)) {
                if (normalizedSyn.length > bestMatch.length) {
                    bestMatch = { status, length: normalizedSyn.length, confidence: 1.0 };
                }
            }
            const synWords = normalizedSyn.split(/\s+/);
            let matchedWords = 0;
            synWords.forEach(sw => {
                if (words.includes(sw)) matchedWords++;
            });
            if (matchedWords === synWords.length && synWords.length > bestMatch.length) {
                bestMatch = { status, length: synWords.length, confidence: 0.9 };
            }
        });
    });

    return bestMatch.status;
};

const levenshteinDistance = (str1, str2) => {
    const track = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    for (let i = 0; i <= str1.length; i++) track[0][i] = i;
    for (let j = 0; j <= str2.length; j++) track[j][0] = j;
    for (let j = 1; j <= str2.length; j++) {
        for (let i = 1; i <= str1.length; i++) {
            const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
            track[j][i] = Math.min(
                track[j][i - 1] + 1,
                track[j - 1][i] + 1,
                track[j - 1][i - 1] + indicator
            );
        }
    }
    return track[str2.length][str1.length];
};

const phoneticSimilarity = (str1, str2) => {
    const n1 = turkishNormalize(str1);
    const n2 = turkishNormalize(str2);
    const maxLen = Math.max(n1.length, n2.length);
    if (maxLen === 0) return 1;
    const distance = levenshteinDistance(n1, n2);
    return 1 - distance / maxLen;
};

// ═══════════════════════════════════════════════════════════════
// 🎯 ANA BİLEŞEN
// ═══════════════════════════════════════════════════════════════
const AssistantModal = ({ classes, updateClassInDb, onClose, initialStudent }) => {
    // ════════ STATE TANIMLARI (En üstte!) ════════
    const [isListening, setIsListening] = useState(false);
    const [speechTranscript, setSpeechTranscript] = useState("");
    const [jarvisFeedback, setJarvisFeedback] = useState("Sistem aktif. Öğrenci adını söyleyin.");
    const [foundStudents, setFoundStudents] = useState(initialStudent ? [initialStudent] : []);
    const [selectedStudent, setSelectedStudent] = useState(initialStudent || null);
    const [foundTopics, setFoundTopics] = useState([]);
    const [pendingAction, setPendingAction] = useState(null); 
    const [pendingSources, setPendingSources] = useState([]); 
    const [pendingStatusSelect, setPendingStatusSelect] = useState(null);
    const [draftGrades, setDraftGrades] = useState({});
    const [commandMode, setCommandMode] = useState(initialStudent ? 'homework' : 'student');
    const [isProcessing, setIsProcessing] = useState(false);

    // ════════ REF TANIMLARI ════════
    const recognitionRef = useRef(null);
    const autoListenTimerRef = useRef(null);

    // ════════ USEMEMO TANIMLARI (State'lerden hemen sonra!) ════════
    const allStudents = useMemo(() => {
        const safeClasses = Array.isArray(classes) ? classes.filter(c => c && typeof c === 'object') : [];
        return safeClasses.flatMap(cls => 
            Array.isArray(cls.students) 
                ? cls.students.filter(std => std && std.name).map(std => ({ 
                    ...std, 
                    classId: cls.id, 
                    className: cls.className, 
                    isVip: cls.type === 'vip',
                    classType: cls.type || 'normal'
                })) 
                : []
        );
    }, [classes]);

    // 🆕 DÜZELTME: sortedFoundTopics artık useMemo hook'u olarak tanımlı!
    // foundTopics state'ine bağımlı ve JSX'ten ÖNCE, callback'lerden ÖNCE tanımlı
    const sortedFoundTopics = useMemo(() => {
        return Array.isArray(foundTopics) ? [...foundTopics].filter(Boolean).reverse() : [];
    }, [foundTopics]);

    const changeCount = useMemo(() => {
        return Object.values(draftGrades).reduce((acc, studentGrades) => {
            return acc + Object.keys(studentGrades || {}).length;
        }, 0);
    }, [draftGrades]);

    // ════════ USEEFFECT TANIMLARI ════════
    useEffect(() => {
        document.body.style.overflow = 'hidden';

        if (initialStudent) {
            const targetClass = (classes || []).find(c => c.id === initialStudent.classId);
            setFoundTopics(targetClass?.topics || []);
            setJarvisFeedback(`${initialStudent.name} profili aktif. Ödev durumunu söyleyin.`);
            setCommandMode('homework');
            autoListenTimerRef.current = setTimeout(() => startListeningRef(), 800);
        } else {
            setJarvisFeedback("Öğrenci adını söyleyin. Örnek: 'Ahmet Yılmaz'");
            autoListenTimerRef.current = setTimeout(() => startListeningRef(), 600);
        }

        return () => { 
            clearTimeout(autoListenTimerRef.current);
            document.body.style.overflow = ''; 
            if (recognitionRef.current) recognitionRef.current.abort();
        };
    }, [initialStudent, classes]);

    // ════════ YARDIMCI FONKSİYONLAR (useCallback İÇİNDE DEĞİL!) ════════
    // startListening fonksiyonunu ref ile saklayalım ki useEffect içinde kullanabilelim
    const startListeningRef = useRef(null);

    // ════════ USECALLBACK TANIMLARI ════════
    const handleResetStudent = useCallback(() => {
        setSelectedStudent(null);
        setFoundStudents([]);
        setFoundTopics([]);
        setPendingAction(null);
        setPendingSources([]);
        setPendingStatusSelect(null);
        setDraftGrades({});
        setCommandMode('student');
        setSpeechTranscript("");
        setJarvisFeedback("Yeni öğrenci araması. Adı söyleyin.");
        setTimeout(() => startListeningRef.current?.(), 500);
    }, []);

    const findStudentsAdvanced = useCallback((inputText) => {
        if (!inputText || allStudents.length === 0) return { students: [], exactMatch: false, reason: 'empty' };

        let text = inputText.toLocaleLowerCase('tr-TR').trim();
        const textNormalized = turkishNormalize(text);

        // AŞAMA 1: Tam Ad Soyad Eşleşmesi
        const exactMatches = allStudents.filter(s => {
            const nameLower = s.name.toLocaleLowerCase('tr-TR');
            return nameLower === text || turkishNormalize(nameLower) === textNormalized;
        });

        if (exactMatches.length === 1) {
            return { students: exactMatches, exactMatch: true, isSingle: true, reason: 'exact_single' };
        }
        if (exactMatches.length > 1) {
            return { students: exactMatches, exactMatch: true, isSingle: false, reason: 'exact_multiple' };
        }

        // AŞAMA 2: İçerme Eşleşmesi
        const includeMatches = allStudents.filter(s => {
            const nameLower = s.name.toLocaleLowerCase('tr-TR');
            return nameLower.includes(text) || text.includes(nameLower);
        });

        if (includeMatches.length === 1) {
            return { students: includeMatches, exactMatch: false, isSingle: true, reason: 'include_single' };
        }

        // AŞAMA 3: Kelime Sırası Bağımsız
        const inputWords = text.split(/\s+/).filter(w => w.length > 2);
        const wordOrderMatches = allStudents.filter(s => {
            const nameWords = s.name.toLocaleLowerCase('tr-TR').split(/\s+/);
            return inputWords.every(iw => nameWords.some(nw => nw.includes(iw) || iw.includes(nw)));
        });

        if (wordOrderMatches.length === 1) {
            return { students: wordOrderMatches, exactMatch: false, isSingle: true, reason: 'wordorder_single' };
        }

        // AŞAMA 4: Ses Benzerliği
        const phoneticMatches = allStudents.filter(s => {
            const nameNorm = turkishNormalize(s.name);
            const similarity = phoneticSimilarity(nameNorm, textNormalized);
            return similarity > 0.75;
        }).sort((a, b) => {
            const simA = phoneticSimilarity(turkishNormalize(a.name), textNormalized);
            const simB = phoneticSimilarity(turkishNormalize(b.name), textNormalized);
            return simB - simA;
        });

        if (phoneticMatches.length === 1) {
            return { students: phoneticMatches, exactMatch: false, isSingle: true, reason: 'phonetic_single' };
        }

        // AŞAMA 5: Fuse.js Fuzzy
        const fuse = new Fuse(allStudents, { 
            keys: ['name'], 
            threshold: 0.3,
            includeScore: true, 
            ignoreLocation: true,
            minMatchCharLength: 2
        });
        const fuseResults = fuse.search(text);

        if (fuseResults.length === 0) {
            // AŞAMA 6: Levenshtein
            const levMatches = allStudents.map(s => ({
                student: s,
                distance: levenshteinDistance(turkishNormalize(s.name), textNormalized)
            })).filter(m => m.distance <= 3).sort((a, b) => a.distance - b.distance);

            if (levMatches.length === 1) {
                return { students: [levMatches[0].student], exactMatch: false, isSingle: true, reason: 'levenshtein_single' };
            }
            if (levMatches.length > 1) {
                return { students: levMatches.slice(0, 5).map(m => m.student), exactMatch: false, isSingle: false, reason: 'levenshtein_multiple' };
            }

            return { students: [], exactMatch: false, reason: 'no_match' };
        }

        const bestScore = fuseResults[0].score;
        const scoreThreshold = bestScore + 0.15;

        let matchedStudents = fuseResults
            .filter(r => r.score <= scoreThreshold)
            .map(r => r.item);

        // AŞAMA 7: Aynı isimdeki öğrencileri grupla
        const nameGroups = {};
        matchedStudents.forEach(s => {
            const baseName = s.name.toLocaleLowerCase('tr-TR');
            if (!nameGroups[baseName]) nameGroups[baseName] = [];
            nameGroups[baseName].push(s);
        });

        const groupKeys = Object.keys(nameGroups);
        if (groupKeys.length === 1 && nameGroups[groupKeys[0]].length === 1) {
            return { students: [nameGroups[groupKeys[0]][0]], exactMatch: false, isSingle: true, reason: 'fuse_single' };
        }

        if (groupKeys.length === 1 && nameGroups[groupKeys[0]].length > 1) {
            return { 
                students: nameGroups[groupKeys[0]], 
                exactMatch: false, 
                isSingle: false, 
                reason: 'same_name_multiple',
                nameGroup: groupKeys[0]
            };
        }

        return { 
            students: matchedStudents.slice(0, 5), 
            exactMatch: false, 
            isSingle: matchedStudents.length === 1,
            reason: 'fuse_multiple'
        };
    }, [allStudents]);

    const findBestComponentLocal = useCallback((items, targetProperty, inputTranscript) => {
        if (!items || items.length === 0 || !inputTranscript) return null;

        const text = inputTranscript.toLocaleLowerCase('tr-TR');
        const textNorm = turkishNormalize(text);

        let bestItem = null;
        let highestScore = 0;

        items.forEach(item => {
            const targetText = getSafeText(item[targetProperty]).toLocaleLowerCase('tr-TR');
            const targetNorm = turkishNormalize(targetText);

            if (text.includes(targetText) || targetText.includes(text)) {
                highestScore = 100;
                bestItem = item;
                return;
            }

            if (textNorm.includes(targetNorm) || targetNorm.includes(textNorm)) {
                if (95 > highestScore) {
                    highestScore = 95;
                    bestItem = item;
                }
                return;
            }

            const shortcuts = {
                'video ders defteri': ['vdd', 'video ders', 've de', 've d', 'bide', 'video defter', 'ders defteri'],
                'soru bankası': ['sb', 'soru banka', 'se be', 'soru b', 'banka'],
                'konu anlatımı': ['ka', 'konu anlat', 'konu anl', 'anlatım'],
                'ek kaynak': ['ek', 'ek kay', 'kaynak ek', 'ekk'],
                'çalışma kitabı': ['çk', 'çalışma kit', 'kitapçık', 'çalışma k'],
                'deneme sınavı': ['ds', 'deneme', 'sınav', 'deneme s'],
                'yaprak test': ['yt', 'yaprak', 'test y', 'yaprak t']
            };

            Object.entries(shortcuts).forEach(([full, shorts]) => {
                if (targetText.includes(full)) {
                    if (shorts.some(s => text.includes(s))) {
                        if (98 > highestScore) {
                            highestScore = 98;
                            bestItem = item;
                        }
                    }
                }
            });

            const targetTokens = targetText.split(/\s+/).filter(t => t.length > 2);
            const inputTokens = text.split(/\s+/).filter(t => t.length > 2);

            let matchedTokens = 0;
            targetTokens.forEach(tt => {
                const ttNorm = turkishNormalize(tt);
                if (inputTokens.some(it => {
                    const itNorm = turkishNormalize(it);
                    return it.includes(tt) || tt.includes(it) || itNorm === ttNorm ||
                           phoneticSimilarity(itNorm, ttNorm) > 0.8;
                })) {
                    matchedTokens++;
                }
            });

            const tokenScore = (matchedTokens / targetTokens.length) * 85;
            if (tokenScore > highestScore && tokenScore >= 40) {
                highestScore = tokenScore;
                bestItem = item;
            }
        });

        if (highestScore < 50) {
            const fuse = new Fuse(items, { 
                keys: [targetProperty], 
                threshold: 0.45, 
                ignoreLocation: true,
                minMatchCharLength: 2
            });
            const results = fuse.search(text);
            if (results.length > 0) bestItem = results[0].item;
        }

        return bestItem;
    }, []);

    const analyzeCommandLocal = useCallback((transcript, isFinalFallback = true) => {
        let text = transcript.toLocaleLowerCase('tr-TR').trim();

        if (isFinalFallback) {
            setPendingAction(null);
            setPendingSources([]);
            setPendingStatusSelect(null);
        }

        // Global komutlar
        if (text.match(/kaydet|onayla|sisteme işle|kaydet ve kapat/)) { 
            applyChangesRef.current?.(); 
            return true; 
        }
        if (text === 'kapat' || text === 'çık' || text === 'iptal') { 
            onClose(); 
            return true; 
        }
        if (text.match(/öğrenci değiştir|yeni öğrenci|öğrenci ara|başka öğrenci|değiştir/)) { 
            handleResetStudent(); 
            return true; 
        }

        // Sayı dönüşümleri
        text = text.replace(/birinci/g, '1').replace(/ikinci/g, '2').replace(/üçüncü/g, '3')
                   .replace(/dördüncü/g, '4').replace(/beşinci/g, '5').replace(/altıncı/g, '6')
                   .replace(/yedinci/g, '7').replace(/sekizinci/g, '8').replace(/dokuzuncu/g, '9')
                   .replace(/onuncu/g, '10')
                   .replace(/\bbir\b/g, '1').replace(/\biki\b/g, '2').replace(/\b[uü]ç\b/g, '3')
                   .replace(/\bdört\b/g, '4').replace(/\bbeş\b/g, '5').replace(/\baltı\b/g, '6')
                   .replace(/\byedi\b/g, '7').replace(/\bsekiz\b/g, '8').replace(/\bdokuz\b/g, '9')
                   .replace(/\bon\b/g, '10');

        // ÖĞRENCİ MODU
        if (commandMode === 'student' || !selectedStudent) {
            const searchResult = findStudentsAdvanced(text);

            if (searchResult.students.length === 0) {
                if (isFinalFallback) {
                    setJarvisFeedback("❌ Öğrenci bulunamadı. Lütfen adı tekrar söyleyin.");
                    autoListenTimerRef.current = setTimeout(() => startListeningRef.current?.(), 1500);
                }
                return false;
            }

            if (searchResult.isSingle) {
                const student = searchResult.students[0];
                const targetClass = (classes || []).find(c => c.id === student.classId);

                if (isFinalFallback) {
                    setFoundStudents([student]);
                    setSelectedStudent(student);
                    setFoundTopics(targetClass?.topics || []);
                    setCommandMode('homework');
                    setJarvisFeedback(`✅ ${student.name} ${student.isVip ? '(VIP)' : ''} kilitlendi. Ödev durumunu söyleyin.`);
                    autoListenTimerRef.current = setTimeout(() => startListeningRef.current?.(), 1000);
                }
                return true;
            } else {
                if (isFinalFallback) {
                    setFoundStudents(searchResult.students);
                    setSelectedStudent(null);
                    setFoundTopics([]);

                    if (searchResult.reason === 'same_name_multiple') {
                        setJarvisFeedback(`⚠️ ${searchResult.nameGroup}: ${searchResult.students.length} öğrenci bulundu. VIP veya sınıf tipini söyleyin.`);
                    } else {
                        setJarvisFeedback(`⚠️ ${searchResult.students.length} öğrenci bulundu. Lütfen listeden seçin.`);
                    }
                }
                return false;
            }
        }

        // ÖDEV MODU
        if (!selectedStudent) return false;

        const status = detectStatus(text);

        const isAllSources = text.match(/tümünü|tamamını|hepsini|bütün kaynaklar|tüm kaynaklar|tümü|tamamı|hepsi|hepsine|tümüne|tüm kaynağı|bütünü/);
        const isNoneSources = text.match(/hiçbiri|hiçbirini|hiçbirine|hiç biri|hiç|sıfır|boş hepsi/);
        const isAllTopics = text.match(/tüm konular|bütün konular|her konu|tüm konu|bütünü|hepsini|tüm dersler|bütün dersler/);

        const targetClass = (classes || []).find(c => c.id === selectedStudent.classId);
        const topics = targetClass?.topics || [];

        // TÜM KONULARDA TOPLU İŞLEM
        if (isAllTopics && status) {
            if (isFinalFallback) {
                let changeCount = 0;
                topics.forEach(topic => {
                    (topic.subColumns || []).forEach(col => {
                        handleDraftGradeChangeRef.current?.(selectedStudent.id, col.id, status);
                        changeCount++;
                    });
                });
                setJarvisFeedback(`🎯 ${changeCount} kaynak "${status}" olarak işaretlendi.`);
                autoListenTimerRef.current = setTimeout(() => startListeningRef.current?.(), 1200);
            }
            return true;
        }

        // KONU ARAMA
        let targetTopic = null;

        const topicOrderMatch = text.match(/(\d+)\.\s*(konu|ünite|ders|bölüm|konular|üniteler)/);
        if (topicOrderMatch) {
            const topicIndex = parseInt(topicOrderMatch[1]) - 1;
            if (topics[topicIndex]) targetTopic = topics[topicIndex];
        }

        if (!targetTopic) {
            targetTopic = findBestComponentLocal(topics, 'title', text);
        }

        if (!targetTopic) {
            if (isFinalFallback) {
                setJarvisFeedback("📚 Konu anlaşılmadı. Konu adını veya numarasını söyleyin.");
                autoListenTimerRef.current = setTimeout(() => startListeningRef.current?.(), 1500);
            }
            return false;
        }

        const subColumns = targetTopic.subColumns || [];
        const subColumnsCount = subColumns.length;

        // KONUNUN TÜM KAYNAKLARINA TOPLU İŞLEM
        if ((isAllSources || isNoneSources) && status) {
            const targetStatus = isNoneSources ? 'missing' : status;
            if (isFinalFallback) {
                subColumns.forEach(col => {
                    handleDraftGradeChangeRef.current?.(selectedStudent.id, col.id, targetStatus);
                });
                setJarvisFeedback(`✅ ${targetTopic.title}: ${subColumnsCount} kaynak "${targetStatus}" olarak güncellendi.`);
                autoListenTimerRef.current = setTimeout(() => startListeningRef.current?.(), 1200);
            }
            return true;
        }

        // TEK KAYNAK VARSA DİREKT İŞARETLE (Sorma!)
        if (subColumnsCount === 1 && status) {
            const onlyCol = subColumns[0];
            if (isFinalFallback) {
                handleDraftGradeChangeRef.current?.(selectedStudent.id, onlyCol.id, status);
                setJarvisFeedback(`✅ ${targetTopic.title} → ${onlyCol.title}: "${status}" olarak kaydedildi.`);
                autoListenTimerRef.current = setTimeout(() => startListeningRef.current?.(), 1200);
            }
            return true;
        }

        // TEK KAYNAK VARSA DURUM BELİRTİLMEMİŞ (Durum bekle)
        if (subColumnsCount === 1 && !status) {
            const onlyCol = subColumns[0];
            if (isFinalFallback) {
                setPendingStatusSelect({ 
                    studentId: selectedStudent.id, 
                    topicId: targetTopic.id, 
                    colId: onlyCol.id, 
                    colTitle: onlyCol.title,
                    topicTitle: targetTopic.title
                });
                setJarvisFeedback(`"${targetTopic.title} → ${onlyCol.title}" için durum seçin.`);
            }
            return true;
        }

        // ÇOKLU KAYNAK + DURUM VAR → KAYNAK BUL
        if (status) {
            const targetCol = findBestComponentLocal(subColumns, 'title', text);

            if (targetCol) {
                if (isFinalFallback) {
                    handleDraftGradeChangeRef.current?.(selectedStudent.id, targetCol.id, status);
                    setJarvisFeedback(`✅ ${targetTopic.title} → ${targetCol.title}: "${status}" kaydedildi.`);
                    autoListenTimerRef.current = setTimeout(() => startListeningRef.current?.(), 1200);
                }
                return true;
            } else {
                if (isFinalFallback) {
                    setPendingAction({ 
                        studentId: selectedStudent.id, 
                        topicId: targetTopic.id, 
                        status: status,
                        topicTitle: targetTopic.title
                    });
                    setPendingSources(subColumns);
                    setJarvisFeedback(`"${targetTopic.title}" anlaşıldı. Hangi kaynak?`);
                }
                return false;
            }
        }

        // DURUM BELİRTİLMEMİŞ → KAYNAK BUL, DURUM BEKLE
        const targetCol = findBestComponentLocal(subColumns, 'title', text);
        if (targetCol && isFinalFallback) {
            setPendingStatusSelect({ 
                studentId: selectedStudent.id, 
                topicId: targetTopic.id, 
                colId: targetCol.id, 
                colTitle: targetCol.title,
                topicTitle: targetTopic.title
            });
            setJarvisFeedback(`"${targetTopic.title} → ${targetCol.title}" için durum seçin.`);
            return true;
        }

        if (isFinalFallback) {
            setJarvisFeedback(`"${targetTopic.title}" anlaşıldı ama kaynak bulunamadı. Tekrar söyleyin.`);
            autoListenTimerRef.current = setTimeout(() => startListeningRef.current?.(), 1500);
        }
        return false;
    }, [commandMode, selectedStudent, classes, findStudentsAdvanced, findBestComponentLocal, handleResetStudent]);

    const handleCommandAlternatives = useCallback((alternatives) => {
        setIsProcessing(true);

        for (const transcript of alternatives) {
            let hasProcessed = analyzeCommandLocal(transcript, false);
            if (hasProcessed) {
                setSpeechTranscript(transcript);
                analyzeCommandLocal(transcript, true);
                setIsProcessing(false);
                return;
            }
        }

        setSpeechTranscript(alternatives[0]);
        analyzeCommandLocal(alternatives[0], true);
        setIsProcessing(false);
    }, [analyzeCommandLocal]);

    // 🆕 DÜZELTME: startListening artık düzgün bağımlılık dizisi ile tanımlı
    const startListening = useCallback(() => {
        if (autoListenTimerRef.current) clearTimeout(autoListenTimerRef.current);

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) { 
            setJarvisFeedback("❌ Ses modülü aktif değil."); 
            return; 
        }
        if (recognitionRef.current) recognitionRef.current.abort();

        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.lang = 'tr-TR';
        recognition.continuous = false;
        recognition.maxAlternatives = 5;
        recognition.interimResults = false;

        recognition.onstart = () => { 
            setIsListening(true); 
            setSpeechTranscript(""); 
            setIsProcessing(false);
        };

        recognition.onresult = (event) => { 
            const alternatives = Array.from(event.results[0]).map(r => r.transcript);
            handleCommandAlternatives(alternatives);
        };

        recognition.onerror = (e) => { 
            setIsListening(false);
            if (e.error === 'no-speech') {
                setJarvisFeedback("🔇 Ses algılanmadı. Tekrar deneyin.");
                autoListenTimerRef.current = setTimeout(() => startListening(), 1000);
            } else if (e.error === 'audio-capture') {
                setJarvisFeedback("🎤 Mikrofon erişimi yok.");
            } else if (e.error === 'not-allowed') {
                setJarvisFeedback("🚫 Mikrofon izni reddedildi.");
            }
        };

        recognition.onend = () => { 
            setIsListening(false); 
        }; 

        recognition.start();
    }, [handleCommandAlternatives]);

    // Ref'lere fonksiyonları atayalım ki useEffect içinde kullanabilelim
    startListeningRef.current = startListening;

    const stopListening = useCallback(() => {
        if (autoListenTimerRef.current) clearTimeout(autoListenTimerRef.current);
        if (recognitionRef.current) { 
            recognitionRef.current.abort(); 
            setIsListening(false); 
        }
    }, []);

    const handleManualSourceSelect = useCallback((col) => {
        if (!pendingAction) return;
        handleDraftGradeChangeRef.current?.(pendingAction.studentId, col.id, pendingAction.status);
        setJarvisFeedback(`✅ ${pendingAction.topicTitle} → ${getSafeText(col.title)}: "${pendingAction.status}" kaydedildi.`);
        setPendingAction(null);
        setPendingSources([]);
        autoListenTimerRef.current = setTimeout(() => startListeningRef.current?.(), 800);
    }, [pendingAction]);

    const handleDraftGradeChange = useCallback((studentId, colId, statusId) => { 
        setDraftGrades(prev => ({ 
            ...prev, 
            [studentId]: { ...(prev[studentId] || {}), [colId]: statusId } 
        })); 
    }, []);

    // Ref'e atama
    const handleDraftGradeChangeRef = useRef(handleDraftGradeChange);
    handleDraftGradeChangeRef.current = handleDraftGradeChange;

    const applyChanges = useCallback(() => {
        if (!selectedStudent) { onClose(); return; }
        const targetClass = (classes || []).find(c => c.id === selectedStudent.classId); 
        if (!targetClass) return;

        const updatedStudents = Array.isArray(targetClass.students) 
            ? targetClass.students.filter(Boolean).map(s => {
                if (s.id === selectedStudent.id) {
                    return { ...s, grades: { ...(s.grades || {}), ...(draftGrades[s.id] || {}) } };
                } 
                return s;
            }) 
            : [];

        updateClassInDb({ ...targetClass, students: updatedStudents });
        setDraftGrades({}); 
        onClose(); 
    }, [selectedStudent, classes, draftGrades, updateClassInDb, onClose]);

    const applyChangesRef = useRef(applyChanges);
    applyChangesRef.current = applyChanges;

    const handleSelectStudentFromList = useCallback((student) => {
        const targetClass = (classes || []).find(c => c.id === student.classId);
        setSelectedStudent(student);
        setFoundTopics(targetClass?.topics || []);
        setFoundStudents([student]);
        setCommandMode('homework');
        setJarvisFeedback(`✅ ${student.name} seçildi. Ödev durumunu söyleyin.`);
        setTimeout(() => startListeningRef.current?.(), 600);
    }, [classes]);

    // ════════ JSX RENDER (En sonda!) ════════
    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.97, y: 12 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.97, y: 12 }} 
                className="bg-white border border-slate-200 rounded-[2.2rem] w-full max-w-2xl overflow-hidden shadow-float flex flex-col max-h-[85vh]"
            >
                {/* ÜST RADAR VE KONTROL ALANI */}
                <div className="relative overflow-hidden bg-slate-50/70 border-b border-slate-100 p-6 flex flex-col items-center justify-center shrink-0">
                    <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors z-30">
                        <X size={20}/>
                    </button>

                    <div className="absolute top-5 left-6 flex items-center gap-2 text-slate-400 text-[10px] font-black tracking-widest z-20">
                        <TerminalSquare size={13}/> 
                        {commandMode === 'student' ? '🔍 ÖĞRENCİ ARAMA MODU' : '📝 ÖDEV YÖNETİM MODU'}
                    </div>

                    {/* BEYAZ PREMIUM MIC RADAR */}
                    <div 
                        onClick={isListening ? stopListening : startListening} 
                        className="z-10 bg-white p-5 rounded-full border border-slate-200 shadow-sm mb-4 cursor-pointer relative hover:scale-105 active:scale-95 transition-all group mt-3"
                    >
                        {isListening && (
                            <>
                                <span className="absolute inset-0 rounded-full bg-brandPurple/10 animate-ping"></span>
                                <span className="absolute inset-[-6px] rounded-full border-2 border-brandPurple/20 animate-pulse"></span>
                                <span className="absolute inset-[-12px] rounded-full border border-brandPurple/10 animate-pulse delay-75"></span>
                            </>
                        )}
                        {isProcessing ? (
                            <Loader2 size={28} className="text-brandPurple animate-spin" />
                        ) : (
                            <Mic 
                                size={28} 
                                className={isListening ? 'text-brandPurple animate-pulse' : 'text-slate-400 group-hover:text-brandPurple transition-colors'} 
                            />
                        )}
                    </div>

                    {/* GELİŞMİŞ BAĞLAM / ÖĞRENCİ DEĞİŞTİRME SEKMESİ */}
                    <div className="w-full max-w-xl z-10 flex gap-2">
                        <div className="flex-1 bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-2.5">
                                <div className={`w-2.5 h-2.5 rounded-full ${selectedStudent ? 'bg-emerald-500' : isListening ? 'bg-amber-400 animate-pulse' : 'bg-slate-300'}`}></div>
                                <span className="text-slate-400 font-medium">
                                    {commandMode === 'student' ? 'Aranan:' : 'Aktif:'}
                                </span>
                                <span className="text-brandPurple font-black text-base">
                                    {selectedStudent ? selectedStudent.name : "İsim bekleniyor..."}
                                </span>
                                {selectedStudent && (
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${selectedStudent.isVip ? 'bg-amber-100 text-amber-600 border border-amber-200' : 'bg-purple-100 text-brandPurple border border-purple-200'}`}>
                                        {selectedStudent.isVip ? 'VIP' : selectedStudent.className}
                                    </span>
                                )}
                            </div>

                            {selectedStudent && (
                                <button 
                                    onClick={handleResetStudent}
                                    className="flex items-center gap-1.5 text-[11px] font-black bg-purple-50 text-brandPurple border border-purple-200 px-4 py-2.5 rounded-xl hover:bg-brandPurple hover:text-white transition-all shadow-sm hover:shadow-md active:scale-95"
                                >
                                    <UserPlus size={14}/> 
                                    YENİ ÖĞRENCİ ARA
                                </button>
                            )}
                        </div>
                    </div>

                    {/* DİNAMİK FEEDBACK ALANI */}
                    <div className="z-10 text-center w-full px-4 min-h-[28px] flex flex-col justify-center items-center mt-3">
                        {speechTranscript && (
                            <motion.p 
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-[11px] text-slate-400 font-medium italic mb-1"
                            >
                                "{speechTranscript}"
                            </motion.p>
                        )}
                        <div className="flex items-center gap-1.5 justify-center font-black text-slate-700 text-sm">
                            <span className="text-brandPurple font-black">
                                {isProcessing ? <Loader2 size={14} className="animate-spin"/> : '>'}
                            </span> 
                            {jarvisFeedback}
                        </div>

                        {/* BEKLEYEN KAYNAK SEÇİM PANELİ */}
                        <AnimatePresence>
                            {pendingSources.length > 0 && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 4, scale: 0.95 }} 
                                    animate={{ opacity: 1, y: 0, scale: 1 }} 
                                    exit={{ opacity: 0, y: -4, scale: 0.95 }} 
                                    className="mt-3 flex flex-wrap justify-center gap-1.5 max-w-full overflow-x-auto p-2.5 bg-white border border-slate-100 rounded-2xl shadow-sm"
                                >
                                    <span className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1 px-2">
                                        <HelpCircle size={12}/> 
                                        Kaynak Seçin:
                                    </span>
                                    {pendingSources.map(col => (
                                        <button 
                                            key={col.id} 
                                            onClick={() => handleManualSourceSelect(col)} 
                                            className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-bold rounded-lg hover:border-brandPurple hover:bg-purple-50 hover:text-brandPurple transition-all active:scale-95"
                                        >
                                            {getSafeText(col?.title)}
                                        </button>
                                    ))}
                                    <button 
                                        onClick={() => { 
                                            setPendingAction(null); 
                                            setPendingSources([]); 
                                            setJarvisFeedback("İptal edildi."); 
                                            autoListenTimerRef.current = setTimeout(() => startListeningRef.current?.(), 500);
                                        }} 
                                        className="text-[10px] font-black text-rose-500 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        İptal
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* BEKLEYEN DURUM SEÇİM PANELİ */}
                        <AnimatePresence>
                            {pendingStatusSelect && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 4, scale: 0.95 }} 
                                    animate={{ opacity: 1, y: 0, scale: 1 }} 
                                    exit={{ opacity: 0, y: -4, scale: 0.95 }} 
                                    className="mt-3 flex flex-wrap justify-center gap-1.5 max-w-full p-2.5 bg-white border border-slate-100 rounded-2xl shadow-sm items-center"
                                >
                                    <span className="text-[10px] font-black text-slate-400 uppercase px-2">
                                        Durum:
                                    </span>
                                    {STATUS_OPTIONS.map(opt => (
                                        <button 
                                            key={opt.id} 
                                            onClick={() => { 
                                                handleDraftGradeChangeRef.current?.(pendingStatusSelect.studentId, pendingStatusSelect.colId, opt.id); 
                                                setJarvisFeedback(`✅ ${pendingStatusSelect.topicTitle} → ${pendingStatusSelect.colTitle}: "${opt.label}" kaydedildi.`); 
                                                setPendingStatusSelect(null);
                                                autoListenTimerRef.current = setTimeout(() => startListeningRef.current?.(), 800);
                                            }} 
                                            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1 transition-all active:scale-95"
                                        >
                                            <opt.icon size={12} className={opt.color} /> 
                                            {opt.label}
                                        </button>
                                    ))}
                                    <button 
                                        onClick={() => {
                                            setPendingStatusSelect(null);
                                            autoListenTimerRef.current = setTimeout(() => startListeningRef.current?.(), 500);
                                        }} 
                                        className="text-[10px] font-bold text-slate-400 px-3 py-1.5 hover:bg-slate-50 rounded-lg transition-colors"
                                    >
                                        İptal
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* GÖREV VE SINIF MATRİS AKIŞI */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-50/40 min-h-0 custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>

                    {/* ÇOKLU ÖĞRENCİ LİSTESİ */}
                    {foundStudents.length > 1 && !selectedStudent && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-2"
                        >
                            <h4 className="text-slate-400 font-bold text-[10px] uppercase tracking-wider ml-1 flex items-center gap-2">
                                <Search size={12}/> 
                                Eşleşen Öğrenciler — Lütfen Seçin
                            </h4>
                            {foundStudents.map(student => (
                                <motion.button 
                                    key={`${student.id}-${student.classId}`} 
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    onClick={() => handleSelectStudentFromList(student)} 
                                    className="w-full text-left p-4 rounded-2xl border border-slate-200 bg-white hover:border-brandPurple hover:bg-purple-50/20 transition-all flex items-center gap-3.5 group shadow-sm active:scale-[0.98]"
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${student.isVip ? 'bg-amber-100 text-amber-600' : 'bg-purple-100 text-brandPurple'}`}>
                                        {getSafeText(student.name).charAt(0)}
                                    </div>
                                    <div className="flex flex-col flex-1">
                                        <span className="font-bold text-slate-700 group-hover:text-brandPurple transition-all">
                                            {getSafeText(student.name)}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">
                                            {student.isVip ? 'VIP ÖZEL DERS' : getSafeText(student.className)}
                                        </span>
                                    </div>
                                    <div className={`text-[10px] px-2.5 py-1 rounded-full font-black ${student.isVip ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                        {student.isVip ? 'VIP' : 'SINIF'}
                                    </div>
                                    <ChevronRight size={16} className="text-slate-300 group-hover:text-brandPurple transition-transform group-hover:translate-x-1" />
                                </motion.button>
                            ))}
                        </motion.div>
                    )}

                    {/* KİLİTLİ ÖĞRENCİ ÖDEV LİSTESİ */}
                    {selectedStudent && foundStudents.length === 1 && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-4 pb-6"
                        >
                            {/* ÖDEV ÖZETİ BAŞLIK */}
                            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedStudent.isVip ? 'bg-amber-100' : 'bg-purple-100'}`}>
                                        <Lock size={18} className={selectedStudent.isVip ? 'text-amber-600' : 'text-brandPurple'} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-700 text-sm">{selectedStudent.name}</h3>
                                        <p className="text-[10px] font-bold text-slate-400">{selectedStudent.isVip ? 'VIP Özel Ders' : selectedStudent.className}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-slate-400">Değişiklik</p>
                                    <p className="text-lg font-black text-brandPurple">{changeCount}</p>
                                </div>
                            </div>

                            {sortedFoundTopics.map((topic, topicIndex) => (
                                <motion.div 
                                    key={topic.id} 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: topicIndex * 0.05 }}
                                    className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm"
                                >
                                    <h4 className="font-black text-slate-700 text-xs mb-3.5 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                                        <div className={`w-1.5 h-3.5 rounded-full ${selectedStudent.isVip ? 'bg-amber-400' : 'bg-brandPurple'}`}></div>
                                        <span className="text-slate-400 font-medium mr-1">{topicIndex + 1}.</span>
                                        {getSafeText(topic?.title)}
                                    </h4>
                                    <div className="space-y-2.5">
                                        {(topic.subColumns || []).filter(Boolean).map(col => {
                                            const studentData = (classes || [])
                                                .find(c => c && c.id === selectedStudent.classId)
                                                ?.students?.find(s => s && s.id === selectedStudent.id);

                                            const displayGrade = draftGrades[selectedStudent.id]?.[col.id] !== undefined 
                                                ? draftGrades[selectedStudent.id]?.[col.id] 
                                                : (studentData?.grades?.[col.id] || 'assigned');

                                            const isChanged = draftGrades[selectedStudent.id]?.[col.id] !== undefined;

                                            return (
                                                <div 
                                                    key={col.id} 
                                                    className={`p-3 rounded-xl bg-slate-50/50 border transition-all ${isChanged ? 'border-purple-400 bg-purple-50/10 shadow-sm' : 'border-slate-100'} flex flex-col md:flex-row md:items-center justify-between gap-3`}
                                                >
                                                    <span className="text-xs font-bold text-slate-600 flex-1">
                                                        {getSafeText(col?.title)}
                                                    </span>
                                                    <div className="flex gap-1 overflow-x-auto">
                                                        {STATUS_OPTIONS.map(opt => (
                                                            <button 
                                                                key={opt.id} 
                                                                onClick={() => handleDraftGradeChangeRef.current?.(selectedStudent.id, col.id, opt.id)} 
                                                                className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 ${displayGrade === opt.id ? lightStatusStyles[opt.id] : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600 hover:bg-slate-50'}`}
                                                            >
                                                                {opt.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}

                    {/* BOŞ DURUM */}
                    {!selectedStudent && foundStudents.length <= 1 && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="h-full min-h-[180px] flex flex-col items-center justify-center text-slate-400 font-mono py-12"
                        >
                            <div className="relative mb-4">
                                <Search size={48} className="text-slate-300"/>
                                {isListening && (
                                    <span className="absolute inset-0 rounded-full bg-brandPurple/20 animate-ping"></span>
                                )}
                            </div>
                            <p className="text-xs font-black text-slate-400">
                                {commandMode === 'student' 
                                    ? "Öğrenci adını söyleyin..." 
                                    : "Öğrenci seçimi bekleniyor..."}
                            </p>
                            <p className="text-[10px] text-slate-300 mt-2 text-center max-w-xs">
                                {commandMode === 'student' 
                                    ? 'Örnek: "Ahmet Yılmaz", "İrem Atış VIP", "Merve Gündüz"' 
                                    : 'Listeden öğrenci seçin veya sesle arayın'}
                            </p>
                        </motion.div>
                    )}
                </div>

                {/* ALT PANEL: ONAY VE KAYIT */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex justify-between items-center gap-4 shrink-0">
                    <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-slate-400 tracking-wide ml-1">
                            {changeCount} Değişiklik
                        </span>
                        {selectedStudent && (
                            <span className="text-[10px] text-slate-300 ml-1">
                                {selectedStudent.name} için bekliyor
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => { stopListening(); onClose(); }} 
                            className="px-5 py-2.5 text-xs font-bold text-slate-500 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors active:scale-95"
                        >
                            İptal
                        </button>
                        <button 
                            onClick={applyChanges} 
                            disabled={changeCount === 0} 
                            className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 active:scale-95 ${changeCount > 0 ? 'bg-brandPurple text-white hover:bg-purple-700 shadow-lg shadow-purple-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                        >
                            <Save size={14} /> 
                            KAYDET VE KAPAT
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AssistantModal;
