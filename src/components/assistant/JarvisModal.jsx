import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, Save, TerminalSquare, ChevronRight, HelpCircle, Search, Lock, Loader2, UserPlus } from 'lucide-react';
import { STATUS_OPTIONS } from '../../utils/constants';
import Fuse from 'fuse.js';
import { GeminiLiveService } from '../../services/GeminiLiveService';

// ═══════════════════════════════════════════════════════════════
// 🛡️ GÜVENLİK KALKANI & YARDIMCI FONKSİYONLAR
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

// 🧠 TÜRKÇE NLP MOTORU & OTOMATİK DÜZELTME SÖZLÜĞÜ (Yanlış Duymalar İçin)
const FIX_MAPPINGS = {
    "uley": "ali",
    "aliyi": "ali",
    "wdd": "vdd",
    "vedede": "vdd",
    "ve de de": "vdd",
    "ve d d": "vdd",
    "v d d": "vdd",
    "se be": "sb",
    "sebe": "sb",
    "s b": "sb",
    "kele": "ka",
    "te ye te": "tyt",
    "a ye te": "ayt",
    "eksilt": "eksik",
    "eksil": "eksik",
    "muafiyet": "muaf",
    "atand": "atandi"
};

const fixMisheardWords = (text) => {
    let fixedText = text.toLocaleLowerCase('tr-TR');
    Object.entries(FIX_MAPPINGS).forEach(([bad, good]) => {
        const regex = new RegExp(`\\b${bad}\\b`, 'g');
        fixedText = fixedText.replace(regex, good);
    });
    return fixedText;
};

const turkishNormalize = (text) => {
    if (!text) return '';
    return text.toLocaleLowerCase('tr-TR')
        .replace(/â/g, 'a').replace(/ê/g, 'e').replace(/î/g, 'i')
        .replace(/ô/g, 'o').replace(/û/g, 'u')
        .replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g')
        .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ı/g, 'i')
        .replace(/İ/g, 'i');
};

// 🛠️ GELİŞTİRİLMİŞ DURUM TESPİTİ (Karışıklıkları Önler)
const detectStatus = (text) => {
    if (!text) return null;

    const normalizedText = turkishNormalize(text);

    // 1. Aşama: Tam Kelime/Öbek Eşleşmesi (En Güvenilir)
    // missing önce kontrol ediliyor ki "yapılmadı" içindeki "yapıldı"ya takılmasın.
    if (normalizedText.match(/\b(yapilmadi|eksik|bos|yapamadi|cozemedi|bitmedi|yarim|yapmamis|cozmemis|hicbiri|hic)\b/)) return 'missing';
    if (normalizedText.match(/\b(yapildi|tamamlandi|bitirildi|cozuldu|yapti|bitti|tamamdir|yapmis|cozmus|hepsi full|full|tamam|yap|coz|bitir)\b/)) return 'done';
    if (normalizedText.match(/\b(muaf|pas|es gec|gerek yok)\b/)) return 'exempt';
    if (normalizedText.match(/\b(verildi|atandi|odev verildi|yuklendi|ver|ata)\b/)) return 'assigned';

    // 2. Aşama: Kelime Kökü Eşleşmesi (Eğer tam eşleşme bulunamazsa)
    if (normalizedText.match(/yapma|cozme|bitme|eksi/)) return 'missing';
    if (normalizedText.match(/yap|coz|bit|tamam/)) return 'done';
    if (normalizedText.match(/muaf|pas/)) return 'exempt';
    if (normalizedText.match(/ver|ata/)) return 'assigned';

    return null;
};

// ═══════════════════════════════════════════════════════════════
// 🎯 ANA BİLEŞEN
// ═══════════════════════════════════════════════════════════════
const AssistantModal = ({ classes, updateClassInDb, onClose, initialStudent }) => {
    // ════════ STATE ════════
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

    // ════════ REFS ════════
    const recognitionRef = useRef(null);
    const autoListenTimerRef = useRef(null);
    const processTimerRef = useRef(null); // Nefes alma ve duraklama payı için
    const startListeningRef = useRef(null);
    const handleDraftGradeChangeRef = useRef(null);
    const applyChangesRef = useRef(null);
    const geminiServiceRef = useRef(null);

    // ════════ USEMEMO ════════
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

    const sortedFoundTopics = useMemo(() => {
        return Array.isArray(foundTopics) ? [...foundTopics].filter(Boolean).reverse() : [];
    }, [foundTopics]);

    const changeCount = useMemo(() => {
        return Object.values(draftGrades).reduce((acc, studentGrades) => {
            return acc + Object.keys(studentGrades || {}).length;
        }, 0);
    }, [draftGrades]);

    // ════════ LATEST STATE REFS FOR GEMINI ════════
    // Gemini Live API'nin fonksiyonlarında güncel state'i okuyabilmek için
    const latestState = useRef({
        classes: [],
        allStudents: [],
        selectedStudent: null,
        draftGrades: {}
    });

    useEffect(() => {
        latestState.current = {
            classes,
            allStudents,
            selectedStudent,
            draftGrades
        };
    }, [classes, allStudents, selectedStudent, draftGrades]);

    // ════════ USEEFFECT ════════
    useEffect(() => {
        document.body.style.overflow = 'hidden';

        if (initialStudent) {
            const targetClass = (classes || []).find(c => c.id === initialStudent.classId);
            setFoundTopics(targetClass?.topics || []);
            setJarvisFeedback(`${initialStudent.name} profili aktif. Ödev durumunu söyleyin.`);
            setCommandMode('homework');
            autoListenTimerRef.current = setTimeout(() => startListeningRef.current?.(), 800);
        } else {
            setJarvisFeedback("Öğrenci adını söyleyin. Örnek: 'Ahmet Yılmaz'");
            autoListenTimerRef.current = setTimeout(() => startListeningRef.current?.(), 600);
        }

        return () => {
            clearTimeout(autoListenTimerRef.current);
            clearTimeout(processTimerRef.current);
            document.body.style.overflow = '';
            if (geminiServiceRef.current) {
                geminiServiceRef.current.disconnect();
            }
        };
    }, [initialStudent, classes]);

    // ════════ CALLBACKS ════════
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

    // 🧠 GELİŞMİŞ ÖĞRENCİ ARAMA
    const findStudentsAdvanced = useCallback((inputText) => {
        if (!inputText || allStudents.length === 0) return { students: [], isSingle: false };
        const textNormalized = turkishNormalize(inputText);

        // 1. Tam Eşleşme
        const exactMatches = allStudents.filter(s => turkishNormalize(s.name) === textNormalized);
        if (exactMatches.length > 0) return { students: exactMatches, isSingle: exactMatches.length === 1 };

        // 2. Fuse.js ile Bulanık Arama
        const fuse = new Fuse(allStudents, { keys: ['name'], threshold: 0.3, ignoreLocation: true });
        const results = fuse.search(inputText).map(r => r.item);

        if (results.length > 0) return { students: results.slice(0, 5), isSingle: results.length === 1 };
        return { students: [], isSingle: false };
    }, [allStudents]);

    // 📚 GELİŞTİRİLMİŞ KONU/KAYNAK BULMA (Kısaltmaları Otomatik Çevirir)
    const findTopicOrSource = useCallback((items, inputTranscript, type = 'topic') => {
        if (!items || items.length === 0 || !inputTranscript) return null;

        const text = inputTranscript.toLocaleLowerCase('tr-TR');
        let textNorm = turkishNormalize(text);

        // KAYNAK KISALTMALARINI AÇ (Sadece kaynak ararken: VDD, SB gibi kısaltmaları uzun haline çevirir)
        if (type === 'source') {
            const expansions = {
                '\\b(vdd|wdd|ve de de)\\b': 'video ders defteri',
                '\\b(sb|se be|sebe)\\b': 'soru bankasi',
                '\\b(ka|kele)\\b': 'konu anlatim',
                '\\b(ek|ekk)\\b': 'ek kaynak',
                '\\b(ck|ce ka)\\b': 'calisma kitabi',
                '\\b(ds|de se)\\b': 'deneme sinavi',
                '\\b(yt|ye te)\\b': 'yaprak test',
                '\\b(cs|ce se)\\b': 'cikmis sorular',
                '\\b(fk|fe ka)\\b': 'formul kitabi',
                '\\b(kt|ka te)\\b': 'konu testi'
            };
            Object.entries(expansions).forEach(([short, full]) => {
                textNorm = textNorm.replace(new RegExp(short, 'g'), full);
            });
        }

        let bestMatch = null;
        let maxLength = -1;
        let maxMatchedWords = -1;

        // 1. TAM EŞLEŞME - Başlık içinde geçiyorsa ve en uzunsa seç
        items.forEach(item => {
            const itemTitle = getSafeText(item.title).toLocaleLowerCase('tr-TR');
            const itemNorm = turkishNormalize(itemTitle);

            if (textNorm.includes(itemNorm) || itemNorm.includes(textNorm)) {
                if (itemTitle.length > maxLength) {
                    maxLength = itemTitle.length;
                    bestMatch = item;
                }
            }
        });

        if (bestMatch) return bestMatch;

        // 2. KELİME BAZLI ARAMA (Eğer cümlenin bir kısmı eksikse)
        const inputWords = textNorm.split(/\s+/).filter(w => w.length > 1);

        items.forEach(item => {
            const itemTitle = getSafeText(item.title).toLocaleLowerCase('tr-TR');
            const itemNorm = turkishNormalize(itemTitle);
            const itemWords = itemNorm.split(/\s+/).filter(w => w.length > 1);

            let matchedWords = 0;
            inputWords.forEach(iw => {
                if (itemWords.some(tw => tw === iw || tw.includes(iw) || iw.includes(tw))) {
                    matchedWords++;
                }
            });

            if (matchedWords > 0) {
                if (matchedWords > maxMatchedWords || (matchedWords === maxMatchedWords && itemTitle.length > maxLength)) {
                    maxMatchedWords = matchedWords;
                    maxLength = itemTitle.length;
                    bestMatch = item;
                }
            }
        });

        if (bestMatch) return bestMatch;

        // 3. FUSE.JS (Son çare, hafif esnek arama)
        const fuse = new Fuse(items, {
            keys: ['title'],
            threshold: 0.35,
            ignoreLocation: true,
            minMatchCharLength: 2
        });
        const results = fuse.search(textNorm);
        if (results.length > 0) return results[0].item;

        return null;
    }, []);

    // 🔬 AKILLI KOMUT ANALİZİ
    const analyzeCommandLocal = useCallback((transcript) => {
        // Ses düzeltme yamasını uygula (Uley -> Ali vb.)
        let text = fixMisheardWords(transcript.trim());
        let originalText = text;
        let normText = turkishNormalize(text);

        setPendingAction(null);
        setPendingSources([]);
        setPendingStatusSelect(null);

        // GLOBAL KOMUTLAR
        if (normText.match(/\b(kaydet|onayla|isley|isleye|kapat|cik|iptal)\b/)) {
            if (normText.match(/\b(kaydet|onayla|isley|isleye)\b/)) {
                applyChangesRef.current?.();
            } else {
                onClose();
            }
            return;
        }

        if (normText.match(/\b(ogrenci degistir|yeni ogrenci|ogrenci ara|baska ogrenci|degistir)\b/)) {
            handleResetStudent();
            return;
        }

        // Sayı dönüşümleri
        const numberMap = {
            'birinci': '1', 'ikinci': '2', 'üçüncü': '3', 'dördüncü': '4', 'beşinci': '5',
            'altıncı': '6', 'yedinci': '7', 'sekizinci': '8', 'dokuzuncu': '9', 'onuncu': '10',
            'bir': '1', 'iki': '2', 'üç': '3', 'dört': '4', 'beş': '5',
            'altı': '6', 'yedi': '7', 'sekiz': '8', 'dokuz': '9', 'on': '10'
        };

        Object.entries(numberMap).forEach(([word, num]) => {
            text = text.replace(new RegExp(`\\b${word}\\b`, 'g'), num);
        });

        // 🎓 ÖĞRENCİ MODU
        if (commandMode === 'student' || !selectedStudent) {
            const searchResult = findStudentsAdvanced(text);

            if (searchResult.students.length === 0) {
                setJarvisFeedback("❌ Öğrenci bulunamadı. Lütfen adı tekrar söyleyin.");
                autoListenTimerRef.current = setTimeout(() => startListeningRef.current?.(), 2000);
                return;
            }

            if (searchResult.isSingle) {
                const student = searchResult.students[0];
                const targetClass = (classes || []).find(c => c.id === student.classId);

                setFoundStudents([student]);
                setSelectedStudent(student);
                setFoundTopics(targetClass?.topics || []);
                setCommandMode('homework');
                setJarvisFeedback(`✅ ${student.name} kilitlendi. Ödev durumunu söyleyin.`);
                autoListenTimerRef.current = setTimeout(() => startListeningRef.current?.(), 1000);
            } else {
                setFoundStudents(searchResult.students);
                setJarvisFeedback(`⚠️ Birden fazla öğrenci bulundu. Lütfen ekrandan seçin.`);
            }
            return;
        }

        // 📝 ÖDEV MODU
        const status = detectStatus(text);
        const targetClass = (classes || []).find(c => c.id === selectedStudent.classId);
        const topics = targetClass?.topics || [];

        let targetTopic = null;

        // 1. Önce Konuyu Bul (Sıra numarası veya İsim ile)
        const topicOrderMatch = text.match(/(\d+)\.\s*(konu|ünite|ders|bölüm|konular|üniteler|topic)/) || text.match(/(?:konu|ünite|ders)\s+(\d+)/);
        if (topicOrderMatch) {
            const topicIndex = parseInt(topicOrderMatch[1]) - 1;
            if (topics[topicIndex]) targetTopic = topics[topicIndex];
        }

        if (!targetTopic) {
            targetTopic = findTopicOrSource(topics, originalText, 'topic');
        }

        if (!targetTopic) {
            setJarvisFeedback("📚 Konu anlaşılmadı. Lütfen önce konunun adını veya numarasını söyleyin.");
            autoListenTimerRef.current = setTimeout(() => startListeningRef.current?.(), 2000);
            return;
        }

        const subColumns = targetTopic.subColumns || [];
        const subColumnsCount = subColumns.length;

        // 2. "TÜMÜ" / "HİÇBİRİ" Kontrolü 
        // Konu adını metinden çıkararak sadece işlem kısmını bırakalım ki yanlış eşleşmesin
        const topicTitleNorm = turkishNormalize(getSafeText(targetTopic.title));
        const textWithoutTopic = normText.replace(topicTitleNorm, "").trim();

        const hasAllKeyword = textWithoutTopic.match(/\b(tumunu|tamamini|hepsini|butun|tum|tumu|tamami|hepsi|hepsine|tumune|butunu|hepsin|tamamin)\b/);
        const hasNoneKeyword = textWithoutTopic.match(/\b(hicbiri|hicbirini|hicbirine|hic biri|hicbir|hic)\b/);
        const isBulkAction = hasAllKeyword || hasNoneKeyword;

        // DURUM BELİRTİLMEMİŞSE
        if (!status) {
            if (subColumnsCount === 1) {
                setPendingStatusSelect({ studentId: selectedStudent.id, topicId: targetTopic.id, colId: subColumns[0].id, topicTitle: targetTopic.title, colTitle: subColumns[0].title });
                setJarvisFeedback(`"${targetTopic.title} -> ${subColumns[0].title}" için durum seçin.`);
            } else {
                const targetCol = findTopicOrSource(subColumns, textWithoutTopic, 'source');
                if (targetCol) {
                    setPendingStatusSelect({ studentId: selectedStudent.id, topicId: targetTopic.id, colId: targetCol.id, topicTitle: targetTopic.title, colTitle: targetCol.title });
                    setJarvisFeedback(`"${targetTopic.title} -> ${targetCol.title}" için durum seçin.`);
                } else {
                    setPendingSources(subColumns);
                    setJarvisFeedback(`"${targetTopic.title}" anlaşıldı. Lütfen kaynak veya "tümü yapıldı" şeklinde belirtin.`);
                }
            }
            return;
        }

        // DURUM VARSA İŞLE

        // A) "Tümü" veya "Hiçbiri" denmişse, o konudaki tüm kaynakları işaretle
        if (isBulkAction) {
            const finalStatus = hasNoneKeyword ? 'missing' : status;
            subColumns.forEach(col => {
                handleDraftGradeChangeRef.current?.(selectedStudent.id, col.id, finalStatus);
            });
            setJarvisFeedback(`✅ ${targetTopic.title} altındaki tüm kaynaklar "${finalStatus}" yapıldı.`);
            autoListenTimerRef.current = setTimeout(() => startListeningRef.current?.(), 1500);
            return;
        }

        // B) Sadece 1 kaynak varsa direkt işaretle
        if (subColumnsCount === 1) {
            handleDraftGradeChangeRef.current?.(selectedStudent.id, subColumns[0].id, status);
            setJarvisFeedback(`✅ ${targetTopic.title} -> ${subColumns[0].title}: "${status}" kaydedildi.`);
            autoListenTimerRef.current = setTimeout(() => startListeningRef.current?.(), 1500);
            return;
        }

        // C) Birden fazla kaynak varsa, kaynağı bul
        const targetCol = findTopicOrSource(subColumns, textWithoutTopic, 'source');
        if (targetCol) {
            handleDraftGradeChangeRef.current?.(selectedStudent.id, targetCol.id, status);
            setJarvisFeedback(`✅ ${targetTopic.title} -> ${targetCol.title}: "${status}" kaydedildi.`);
            autoListenTimerRef.current = setTimeout(() => startListeningRef.current?.(), 1500);
        } else {
            // Kaynak anlaşılamadı
            setPendingAction({ studentId: selectedStudent.id, status: status, topicTitle: targetTopic.title });
            setPendingSources(subColumns);
            setJarvisFeedback(`"${targetTopic.title}" anlaşıldı. Hangi kaynak "${status}" yapılacak?`);
        }

    }, [commandMode, selectedStudent, classes, findStudentsAdvanced, findTopicOrSource, handleResetStudent]);


    // 🎤 SES DİNLEME (GEMINI LIVE API ENTEGRASYONU)
    const startListening = useCallback(async () => {
        if (autoListenTimerRef.current) clearTimeout(autoListenTimerRef.current);
        if (processTimerRef.current) clearTimeout(processTimerRef.current);

        setIsListening(true);
        setIsProcessing(false);
        setSpeechTranscript("");

        if (!geminiServiceRef.current) {
            geminiServiceRef.current = new GeminiLiveService(
                (type, text) => {
                    if (type === 'text') {
                        // AI'nin iç düşüncelerini (örn: **Thinking**) filtrele
                        const cleanText = text.replace(/\*\*[^*]+\*\*/g, '').replace(/I'm currently focused on.*/gi, '').trim();
                        if (cleanText.length > 0) {
                            setJarvisFeedback(cleanText);
                            setSpeechTranscript(prev => prev + " " + cleanText);
                        }
                    }
                },
                (status, msg) => {
                    if (status === 'error') {
                        setJarvisFeedback("Hata: " + msg);
                        setIsListening(false);
                    } else if (status === 'listening') {
                        setJarvisFeedback("Sizi dinliyor...");
                    } else if (status === 'disconnected') {
                        setIsListening(false);
                        setJarvisFeedback("Bağlantı kesildi.");
                    }
                }
            );

            // ════════ SIFIR GECİKME (ZERO-LATENCY) İÇİN SİSTEM VERİTABANI (CONTEXT INJECTION) ════════
            const dbDump = latestState.current.allStudents.map(s => {
                const c = latestState.current.classes.find(cls => cls.id === s.classId);
                return {
                    id: s.id,
                    isim: s.name,
                    sinif: c ? c.className : 'Bilinmiyor',
                    vip: s.isVip,
                    notlar: s.grades || {},
                    denemeler: (s.exams || []).map(e => e.net)
                };
            });
            const dbString = JSON.stringify(dbDump);

            // Jarvis Persona ve Bağlamı
            const contextText = selectedStudent ? `Şu an ${selectedStudent.name} adlı öğrencinin profili açık.` : 'Şu an genel arama modundayız.';
            const prompt = `Sen Berkant Hoca'nın eğitim platformundaki yapay zeka asistanı Jarvis'sin. Türkçeyi kusursuz ve doğal konuşuyorsun.
            Mevcut bağlam: ${contextText}
            Kullanıcı sana sesli olarak komut verecek veya soru soracak. Kısa, net ve anlaşılır cevaplar ver.
            ÖNEMLİ KURAL: Kesinlikle iç düşüncelerini (thinking process), İngilizce planlarını veya **Crafting...** gibi analizlerini ÇIKTI OLARAK VERME. SADECE doğrudan söyleyeceğin cevabı Türkçe olarak ilet.
            
            [SİSTEM VERİTABANI - ÖĞRENCİLER VE NOTLAR]
            ${dbString}
            
            KURAL: Yukarıdaki veritabanında tüm öğrencilerin güncel durumu, deneme netleri ve sınıf bilgileri yer almaktadır. Bir öğrenci hakkında bilgi sorulduğunda veya "Merve'yi bul" dendiğinde ASLA FONKSİYON ÇAĞIRMA. Sadece doğrudan yukarıdaki veriye bakarak "Hocam Merve 11-A'da, deneme notu 65" veya "İki tane Merve var, hangisi?" diye doğrudan SESLİ CEVAP VER. Fonksiyonları SADECE sistemi değiştirmek (ödev işaretlemek) veya arayüzde ekranı değiştirmek (öğrencinin profilini açmak) için kullan.`;

            // ════════ TOOL (FONKSİYON) TANIMLAMALARI ════════
            const tools = [
                {
                    name: "apply_system_action",
                    description: "Sisteme müdahale etmek, arayüzü değiştirmek veya ödev notu girmek için kullanılır. Öğrenci araması veya rapor okuması için DEĞİL, sadece veritabanını DEĞİŞTİRMEK için çağır.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            action_type: {
                                type: "STRING",
                                description: "Yapılacak işlemin türü.",
                                enum: ["open_student_profile", "mark_homework", "save_and_close"]
                            },
                            student_id: {
                                type: "STRING",
                                description: "İşlem yapılacak öğrencinin benzersiz ID'si (veritabanından bul)."
                            },
                            topic_name: {
                                type: "STRING",
                                description: "Ödevin konusu (mark_homework için zorunlu)."
                            },
                            source_name: {
                                type: "STRING",
                                description: "Kaynak adı (Örn: Soru Bankası, Tümü). Belirtilmemişse boş bırak."
                            },
                            status: {
                                type: "STRING",
                                description: "Ödevin durumu.", enum: ["yapıldı", "yapılmadı", "eksik"]
                            }
                        },
                        required: ["action_type"]
                    }
                }
            ];

            // ════════ FONKSİYON İŞLEYİCİSİ (ON_FUNCTION_CALL) ════════
            geminiServiceRef.current.onFunctionCall = async (call) => {
                const { name, args, id } = call;
                let response = {};
                const state = latestState.current;

                try {
                    if (name === "apply_system_action") {
                        if (args.action_type === "save_and_close") {
                            applyChangesRef.current?.();
                            response = { success: true, message: "Veriler kaydedildi ve sistem kapatılıyor. Kullanıcıya işlemi başardığını onayla." };
                        } else {
                            const student = state.allStudents.find(s => String(s.id) === String(args.student_id));

                            if (!student) {
                                response = { success: false, message: "Geçersiz öğrenci ID'si." };
                            } else if (args.action_type === "open_student_profile") {
                                const targetClass = state.classes.find(c => c.id === student.classId);
                                // Ekran güncellemeleri
                                setSelectedStudent(student);
                                setFoundStudents([student]);
                                setFoundTopics(targetClass?.topics || []);
                                setCommandMode('homework');
                                response = { success: true, message: `${student.name} profili ekranda açıldı. Kullanıcıya işlemi başardığını onayla.` };
                            } else if (args.action_type === "mark_homework") {
                                const targetClass = state.classes.find(c => c.id === student.classId);
                                const topics = targetClass?.topics || [];

                                // Konu bulma
                                const topicNorm = turkishNormalize(args.topic_name || "");
                                let targetTopic = topics.find(t => turkishNormalize(getSafeText(t.title)).includes(topicNorm) || topicNorm.includes(turkishNormalize(getSafeText(t.title))));

                                const topicOrderMatch = args.topic_name ? args.topic_name.match(/(\d+)/) : null;
                                if (!targetTopic && topicOrderMatch) {
                                    const index = parseInt(topicOrderMatch[1]) - 1;
                                    if (topics[index]) targetTopic = topics[index];
                                }

                                if (!targetTopic) {
                                    response = { success: false, message: `"${args.topic_name}" adında bir konu bulunamadı. Kullanıcıdan tekrar etmesini iste.` };
                                } else {
                                    const subCols = targetTopic.subColumns || [];
                                    let columnsToUpdate = [];

                                    if (!args.source_name || args.source_name.toLowerCase() === 'tümü' || args.source_name.toLowerCase() === 'hepsi') {
                                        columnsToUpdate = subCols; // Tüm kaynakları işaretle
                                    } else {
                                        const sourceNorm = turkishNormalize(args.source_name);
                                        const matchedCol = subCols.find(c => turkishNormalize(getSafeText(c.title)).includes(sourceNorm));
                                        if (matchedCol) {
                                            columnsToUpdate = [matchedCol];
                                        }
                                    }

                                    if (columnsToUpdate.length === 0) {
                                        response = { success: false, message: `Konu bulundu ancak "${args.source_name}" adında bir kaynak bulunamadı.` };
                                    } else {
                                        // Status Mapping
                                        let finalStatus = 'done';
                                        if (args.status === 'yapılmadı' || args.status === 'eksik') finalStatus = 'missing';

                                        // Güncelleme işlemi
                                        columnsToUpdate.forEach(col => {
                                            handleDraftGradeChangeRef.current?.(student.id, col.id, finalStatus);
                                        });
                                        response = { success: true, message: `Başarılı! ${targetTopic.title} konusu için ${columnsToUpdate.length} kaynak "${args.status}" olarak işaretlendi. Kullanıcıya "Tamamdır, ödevi işaretledim" şeklinde onay ver.` };
                                    }
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.error("Tool Execution Error:", e);
                    response = { success: false, message: "Sistemde teknik bir hata oluştu." };
                }

                geminiServiceRef.current.sendFunctionResponse(id, name, response);
            };

            const connected = await geminiServiceRef.current.connect(prompt, tools);
            if (connected) {
                await geminiServiceRef.current.startAudioCapture();
            } else {
                setIsListening(false);
            }
        } else {
            // Zaten kuruluysa yeniden başlat
            const connected = await geminiServiceRef.current.connect();
            if (connected) await geminiServiceRef.current.startAudioCapture();
        }

    }, [selectedStudent]);

    startListeningRef.current = startListening;

    const stopListening = useCallback(() => {
        if (autoListenTimerRef.current) clearTimeout(autoListenTimerRef.current);
        if (processTimerRef.current) clearTimeout(processTimerRef.current);

        if (geminiServiceRef.current) {
            geminiServiceRef.current.disconnect();
            geminiServiceRef.current = null;
        }

        setIsListening(false);
        setIsProcessing(false);
        setJarvisFeedback("Mikrofon kapatıldı.");
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

    // ═══════════════════════════════════════════════════════════════
    // JSX RENDER
    // ═══════════════════════════════════════════════════════════════
    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 12 }}
                className="bg-white border border-slate-200 rounded-[2.2rem] w-full max-w-2xl overflow-hidden shadow-float flex flex-col max-h-[85vh]"
            >
                {/* ÜST RADAR */}
                <div className="relative overflow-hidden bg-slate-50/70 border-b border-slate-100 p-6 flex flex-col items-center justify-center shrink-0">
                    <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors z-30">
                        <X size={20} />
                    </button>

                    <div className="absolute top-5 left-6 flex items-center gap-2 text-slate-400 text-[10px] font-black tracking-widest z-20">
                        <TerminalSquare size={13} />
                        {commandMode === 'student' ? '🔍 ÖĞRENCİ ARAMA MODU' : '📝 ÖDEV YÖNETİM MODU'}
                    </div>

                    {/* MIC RADAR */}
                    <div
                        onClick={isListening ? stopListening : startListening}
                        className="z-10 bg-white p-5 rounded-full border border-slate-200 shadow-sm mb-4 cursor-pointer relative hover:scale-105 active:scale-95 transition-all group mt-3"
                    >
                        {isListening && (
                            <>
                                <span className="absolute inset-0 rounded-full bg-brandPurple/10 animate-ping"></span>
                                <span className="absolute inset-[-6px] rounded-full border-2 border-brandPurple/20 animate-pulse"></span>
                            </>
                        )}
                        {isProcessing ? (
                            <Loader2 size={28} className="text-brandPurple animate-spin" />
                        ) : (
                            <Mic size={28} className={isListening ? 'text-brandPurple animate-pulse' : 'text-slate-400 group-hover:text-brandPurple transition-colors'} />
                        )}
                    </div>

                    {/* AKTİF ÖĞRENCİ BAR */}
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
                                    <UserPlus size={14} /> YENİ ÖĞRENCİ ARA
                                </button>
                            )}
                        </div>
                    </div>

                    {/* FEEDBACK ALANI */}
                    <div className="z-10 text-center w-full px-4 min-h-[40px] flex flex-col justify-center items-center mt-3">
                        {speechTranscript && (
                            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-[11px] text-slate-400 font-medium italic mb-1">
                                "{speechTranscript}" {isProcessing && <span className="text-amber-500 not-italic ml-1">(İşleniyor...)</span>}
                            </motion.p>
                        )}
                        <div className="flex items-center gap-1.5 justify-center font-black text-slate-700 text-sm">
                            <span className="text-brandPurple font-black">
                                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : '>'}
                            </span>
                            {jarvisFeedback}
                        </div>

                        {/* BEKLEYEN KAYNAK PANELİ */}
                        <AnimatePresence>
                            {pendingSources.length > 0 && !pendingStatusSelect && (
                                <motion.div
                                    initial={{ opacity: 0, y: 4, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -4, scale: 0.95 }}
                                    className="mt-3 flex flex-wrap justify-center gap-1.5 max-w-full overflow-x-auto p-2.5 bg-white border border-slate-100 rounded-2xl shadow-sm"
                                >
                                    <span className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1 px-2">
                                        <HelpCircle size={12} /> Kaynak Seçin:
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
                                        onClick={() => { setPendingAction(null); setPendingSources([]); setJarvisFeedback("İptal edildi."); autoListenTimerRef.current = setTimeout(() => startListeningRef.current?.(), 500); }}
                                        className="text-[10px] font-black text-rose-500 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        İptal
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* BEKLEYEN DURUM PANELİ */}
                        <AnimatePresence>
                            {pendingStatusSelect && (
                                <motion.div
                                    initial={{ opacity: 0, y: 4, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -4, scale: 0.95 }}
                                    className="mt-3 flex flex-wrap justify-center gap-1.5 max-w-full p-2.5 bg-white border border-slate-100 rounded-2xl shadow-sm items-center"
                                >
                                    <span className="text-[10px] font-black text-slate-400 uppercase px-2">Durum:</span>
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
                                            <opt.icon size={12} className={opt.color} /> {opt.label}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => { setPendingStatusSelect(null); autoListenTimerRef.current = setTimeout(() => startListeningRef.current?.(), 500); }}
                                        className="text-[10px] font-bold text-slate-400 px-3 py-1.5 hover:bg-slate-50 rounded-lg transition-colors"
                                    >
                                        İptal
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* GÖREV MATRİSİ */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-50/40 min-h-0 custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>

                    {/* ÇOKLU ÖĞRENCİ LİSTESİ */}
                    {foundStudents.length > 1 && !selectedStudent && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                            <h4 className="text-slate-400 font-bold text-[10px] uppercase tracking-wider ml-1 flex items-center gap-2">
                                <Search size={12} /> Eşleşen Öğrenciler — Lütfen Seçin
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
                                        <span className="font-bold text-slate-700 group-hover:text-brandPurple transition-all">{getSafeText(student.name)}</span>
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
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pb-6">
                            {/* ÖZET BAŞLIK */}
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
                                                    <span className="text-xs font-bold text-slate-600 flex-1">{getSafeText(col?.title)}</span>
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
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full min-h-[180px] flex flex-col items-center justify-center text-slate-400 font-mono py-12">
                            <div className="relative mb-4">
                                <Search size={48} className="text-slate-300" />
                                {isListening && <span className="absolute inset-0 rounded-full bg-brandPurple/20 animate-ping"></span>}
                            </div>
                            <p className="text-xs font-black text-slate-400">
                                {commandMode === 'student' ? "Öğrenci adını söyleyin..." : "Öğrenci seçimi bekleniyor..."}
                            </p>
                            <p className="text-[10px] text-slate-300 mt-2 text-center max-w-xs">
                                {commandMode === 'student' ? 'Örnek: "Ahmet Yılmaz", "İrem Atış VIP", "Merve Gündüz"' : 'Listeden öğrenci seçin veya sesle arayın'}
                            </p>
                        </motion.div>
                    )}
                </div>

                {/* ALT PANEL */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex justify-between items-center gap-4 shrink-0">
                    <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-slate-400 tracking-wide ml-1">{changeCount} Değişiklik</span>
                        {selectedStudent && <span className="text-[10px] text-slate-300 ml-1">{selectedStudent.name} için bekliyor</span>}
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
                            <Save size={14} /> KAYDET VE KAPAT
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AssistantModal;
