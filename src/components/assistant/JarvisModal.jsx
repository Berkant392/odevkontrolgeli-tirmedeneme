// ════════ REFS ════════
const recognitionRef = useRef(null);
const autoListenTimerRef = useRef(null);
const startListeningRef = useRef(null);
const handleDraftGradeChangeRef = useRef(null);
const applyChangesRef = useRef(null);

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
        document.body.style.overflow = '';
        if (recognitionRef.current) recognitionRef.current.abort();
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

// 🧠 GELİŞMİŞ ÖĞRENCİ ARAMA (7 AŞAMA) (Aynı kalıyor)
const findStudentsAdvanced = useCallback((inputText) => {
    if (!inputText || allStudents.length === 0) return { students: [], exactMatch: false, reason: 'empty' };

    let text = inputText.toLocaleLowerCase('tr-TR').trim();
    const textNormalized = turkishNormalize(text);
    const textStemmed = normalizeText(text);

    // AŞAMA 1: Tam Ad Soyad (===)
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

    // AŞAMA 2: İçerme (includes)
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

    // AŞAMA 4: Ses Benzerliği (Metafonik)
    const phoneticMatches = allStudents.filter(s => {
        const similarity = phoneticSimilarity(turkishNormalize(s.name), textNormalized);
        return similarity > 0.75;
    }).sort((a, b) => {
        return phoneticSimilarity(turkishNormalize(b.name), textNormalized) -
               phoneticSimilarity(turkishNormalize(a.name), textNormalized);
    });

    if (phoneticMatches.length === 1) {
        return { students: phoneticMatches, exactMatch: false, isSingle: true, reason: 'phonetic_single' };
    }

    // AŞAMA 5: Fuse.js Fuzzy (daha sıkı)
    const fuse = new Fuse(allStudents, {
        keys: ['name'],
        threshold: 0.3,
        includeScore: true,
        ignoreLocation: true,
        minMatchCharLength: 2
    });
    const fuseResults = fuse.search(text);

    if (fuseResults.length === 0) {
        // AŞAMA 6: Levenshtein (son çare)
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


// 📚 YENİ VE GELİŞMİŞ KONU/KAYNAK BULMA (STRATEJİ 1 ve 2 UYGULAMASI)
const findTopicOrSource = useCallback((items, inputTranscript, type = 'topic') => {
    if (!items || items.length === 0 || !inputTranscript) return null;

    const text = inputTranscript.toLocaleLowerCase('tr-TR');
    const textNorm = turkishNormalize(text);
    
    let bestMatch = null;
    let maxLength = -1; // En uzun eşleşmeyi takip etmek için
    let maxMatchedWords = -1; // Kelime bazlı arama için

    // 1. TAM EŞLEŞME - EN UZUN EŞLEŞMEYİ BUL (STRATEJİ 1)
    items.forEach(item => {
        const itemTitle = getSafeText(item.title).toLocaleLowerCase('tr-TR');
        const itemNorm = turkishNormalize(itemTitle);

        // Metin içinde konu başlığı geçiyor mu? (Örn: "oran orantı çıkmış sorular" içinde "oran orantı" ve "oran orantı çıkmış sorular" geçer)
        if (text.includes(itemTitle) || textNorm.includes(itemNorm)) {
            if (itemTitle.length > maxLength) {
                maxLength = itemTitle.length;
                bestMatch = item;
            }
        }
    });

    if (bestMatch) return bestMatch; // Eğer tam eşleşme bulduysak (ve en uzununu seçtiysek) döndür.

    // 2. KELİME BAZLI ARAMA (STRATEJİ 2) - Eğer tam eşleşme yoksa (kullanıcı eksik/hatalı söylediyse)
    const inputWords = textNorm.split(/\s+/).filter(w => w.length > 2);
    
    items.forEach(item => {
        const itemTitle = getSafeText(item.title).toLocaleLowerCase('tr-TR');
        const itemNorm = turkishNormalize(itemTitle);
        const itemWords = itemNorm.split(/\s+/).filter(w => w.length > 2);
        
        let matchedWords = 0;
        inputWords.forEach(iw => {
            if(itemWords.some(tw => tw.includes(iw) || iw.includes(tw))) {
               matchedWords++; 
            }
        });

        if (matchedWords > 0) {
            // Eşleşen kelime sayısı daha fazlaysa YADA eşleşen kelime sayısı aynı ama başlık daha uzunsa (Daha spesifik konuyu seç)
            if (matchedWords > maxMatchedWords || (matchedWords === maxMatchedWords && itemTitle.length > maxLength)) {
                maxMatchedWords = matchedWords;
                maxLength = itemTitle.length;
                bestMatch = item;
            }
        }
    });

    if (bestMatch) return bestMatch;

    // 3. KISALTMALAR VE ÖZEL DURUMLAR (Sadece Kaynaklar için)
    if (type === 'source') {
         const shortcuts = {
            'video ders defteri': ['vdd', 'video ders', 've de', 've d', 'bide', 'video defter', 'ders defteri', 'ders defter'],
            'soru bankası': ['sb', 'soru banka', 'se be', 'soru b', 'banka', 'soru bank'],
            'konu anlatımı': ['ka', 'konu anlat', 'konu anl', 'anlatım', 'konu anlatım'],
            'ek kaynak': ['ek', 'ek kay', 'kaynak ek', 'ekk', 'ek kaynak'],
            'çalışma kitabı': ['çk', 'çalışma kit', 'kitapçık', 'çalışma k', 'çalışma kitab'],
            'deneme sınavı': ['ds', 'deneme', 'sınav', 'deneme s', 'deneme sınav'],
            'yaprak test': ['yt', 'yaprak', 'test y', 'yaprak t', 'yaprak test'],
            'çıkmış sorular': ['çs', 'çıkmış', 'sorular', 'çıkmış soru', 'eski sorular'],
            'formül kitabı': ['fk', 'formül', 'formül kit', 'formül k'],
            'konu testi': ['kt', 'konu test', 'konu t', 'test konu']
        };

        let highestShortcutScore = 0;
        let shortcutMatch = null;

        items.forEach(item => {
             const itemTitle = getSafeText(item.title).toLocaleLowerCase('tr-TR');
             Object.entries(shortcuts).forEach(([full, shorts]) => {
                if (itemTitle.includes(full)) {
                    shorts.forEach(s => {
                        if (text.includes(s) && 98 > highestShortcutScore) {
                            highestShortcutScore = 98;
                            shortcutMatch = item;
                        }
                    });
                }
            });
        });
        if(shortcutMatch) return shortcutMatch;
    }

    // 4. FUSE.JS (Son çare, hafif esnek arama)
    const fuse = new Fuse(items, {
        keys: ['title'],
        threshold: 0.4, // Biraz daha hassas (eski 0.45)
        ignoreLocation: true,
        minMatchCharLength: 3
    });
    const results = fuse.search(text);
    if (results.length > 0) return results[0].item;

    return null;
}, []);


// 🔬 AKILLI KOMUT ANALİZİ (YENİLENMİŞ VERSİYON)
const analyzeCommandLocal = useCallback((transcript, isFinalFallback = true) => {
    let text = transcript.toLocaleLowerCase('tr-TR').trim();
    let originalText = text; // Orjinal metni sakla

    if (isFinalFallback) {
        setPendingAction(null);
        setPendingSources([]);
        setPendingStatusSelect(null);
    }

    // GLOBAL KOMUTLAR
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

    // 📝 ÖDEV MODU
    if (!selectedStudent) return false;

    const status = detectStatus(text);
    const targetClass = (classes || []).find(c => c.id === selectedStudent.classId);
    const topics = targetClass?.topics || [];
    
    let targetTopic = null;

    // 1. ÖNCE KONUYU BUL (STRATEJİ 3 - Ön Koşul)
    // Sıra No ile arama: "3. konu" veya "konu 3"
    const topicOrderMatch = text.match(/(\d+)\.\s*(konu|ünite|ders|bölüm|konular|üniteler|topic)/) || text.match(/(?:konu|ünite|ders)\s+(\d+)/);
    if (topicOrderMatch) {
        const topicIndex = parseInt(topicOrderMatch[1]) - 1;
        if (topics[topicIndex]) targetTopic = topics[topicIndex];
    }

    // İsimle Arama
    if (!targetTopic) {
        targetTopic = findTopicOrSource(topics, originalText, 'topic');
    }

    // Konu Bulunamadıysa
    if (!targetTopic) {
        // Belki kullanıcı sadece kaynak adı söyledi, onu da kontrol edelim. (Geliştirme aşamasında burası atlanabilir ama kullanıcı deneyimini artırır)
        // Şimdilik sadece konu zorunlu tutalım.
        if (isFinalFallback) {
            setJarvisFeedback("📚 Konu anlaşılmadı. Lütfen önce konunun adını veya numarasını söyleyin.");
            autoListenTimerRef.current = setTimeout(() => startListeningRef.current?.(), 1500);
        }
        return false;
    }

    // 2. KONU BULUNDU, ŞİMDİ HEDEFLERİ BELİRLE
    const subColumns = targetTopic.subColumns || [];
    const subColumnsCount = subColumns.length;

    // 3. "TÜMÜ" KONTROLÜ (STRATEJİ 3 - Sadece bulunan konuda)
    // Kullanıcı metninden konunun adını çıkartarak "tümü" kelimesinin konuyla mı yoksa kaynakla mı ilgili olduğunu anla
    const topicTitleNorm = turkishNormalize(getSafeText(targetTopic.title));
    const textWithoutTopic = turkishNormalize(originalText).replace(topicTitleNorm, "").trim();
    
    const isAllSources = textWithoutTopic.match(/tümünü|tamamını|hepsini|bütün kaynaklar|tüm kaynaklar|tümü|tamamı|hepsi|hepsine|tümüne|tüm kaynağı|bütünü|hepsin|tamamın/);
    const isNoneSources = textWithoutTopic.match(/hiçbiri|hiçbirini|hiçbirine|hiç biri|hiç|sıfır|boş hepsi|hiçbir|hiçbiri/);


    // DURUM BELİRTİLMEMİŞSE
    if (!status) {
        // Eğer sadece 1 kaynak varsa
        if (subColumnsCount === 1 && isFinalFallback) {
            const onlyCol = subColumns[0];
            setPendingStatusSelect({
                studentId: selectedStudent.id,
                topicId: targetTopic.id,
                colId: onlyCol.id,
                colTitle: onlyCol.title,
                topicTitle: targetTopic.title
            });
            setJarvisFeedback(`"${targetTopic.title} → ${onlyCol.title}" için durum seçin.`);
            return true;
        }

        // Birden fazla kaynak varsa ve "tümü" DEMEMİŞSE, kaynağı bulmaya çalış. Bulamazsa kaynakları listele
        const targetCol = findTopicOrSource(subColumns, textWithoutTopic, 'source');
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
        } else if (isFinalFallback) {
             setPendingSources(subColumns);
             setJarvisFeedback(`"${targetTopic.title}" anlaşıldı. Lütfen kaynak ve durum belirtin.`);
             return true;
        }
        return false;
    }

    // DURUM BELİRTİLMİŞSE
    
    // A) "Tümü" veya "Hiçbiri" denmişse, o konudaki tüm kaynakları işaretle
    if ((isAllSources || isNoneSources)) {
        const targetStatus = isNoneSources ? 'missing' : status;
        if (isFinalFallback) {
            subColumns.forEach(col => {
                handleDraftGradeChangeRef.current?.(selectedStudent.id, col.id, targetStatus);
            });
            setJarvisFeedback(`✅ ${targetTopic.title} altındaki tüm kaynaklar "${targetStatus}" olarak güncellendi.`);
            autoListenTimerRef.current = setTimeout(() => startListeningRef.current?.(), 1200);
        }
        return true;
    }

    // B) Sadece 1 kaynak varsa direkt işaretle
    if (subColumnsCount === 1) {
        const onlyCol = subColumns[0];
        if (isFinalFallback) {
            handleDraftGradeChangeRef.current?.(selectedStudent.id, onlyCol.id, status);
            setJarvisFeedback(`✅ ${targetTopic.title} → ${onlyCol.title}: "${status}" olarak kaydedildi.`);
            autoListenTimerRef.current = setTimeout(() => startListeningRef.current?.(), 1200);
        }
        return true;
    }

    // C) Birden fazla kaynak varsa, belirtilen kaynağı bul
    const targetCol = findTopicOrSource(subColumns, textWithoutTopic, 'source');
    
    if (targetCol) {
        if (isFinalFallback) {
            handleDraftGradeChangeRef.current?.(selectedStudent.id, targetCol.id, status);
            setJarvisFeedback(`✅ ${targetTopic.title} → ${targetCol.title}: "${status}" kaydedildi.`);
            autoListenTimerRef.current = setTimeout(() => startListeningRef.current?.(), 1200);
        }
        return true;
    } else {
        // Kaynak bulunamadı, kullanıcıdan seçmesini iste
        if (isFinalFallback) {
            setPendingAction({
                studentId: selectedStudent.id,
                topicId: targetTopic.id,
                status: status,
                topicTitle: targetTopic.title
            });
            setPendingSources(subColumns);
            setJarvisFeedback(`"${targetTopic.title}" anlaşıldı. Hangi kaynak "${status}" işaretlenecek?`);
        }
        return false;
    }

}, [commandMode, selectedStudent, classes, findStudentsAdvanced, findTopicOrSource, handleResetStudent]);

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
            autoListenTimerRef.current = setTimeout(() => startListeningRef.current?.(), 1000);
        } else if (e.error === 'audio-capture') {
            setJarvisFeedback("🎤 Mikrofon erişimi yok.");
        } else if (e.error === 'not-allowed') {
            setJarvisFeedback("🚫 Mikrofon izni reddedildi.");
        }
    };

    recognition.onend = () => { setIsListening(false); };
    recognition.start();
}, [handleCommandAlternatives]);

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
                    <X size={20}/>
                </button>

                <div className="absolute top-5 left-6 flex items-center gap-2 text-slate-400 text-[10px] font-black tracking-widest z-20">
                    <TerminalSquare size={13}/> 
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
                                <UserPlus size={14}/> YENİ ÖĞRENCİ ARA
                            </button>
                        )}
                    </div>
                </div>

                {/* FEEDBACK ALANI */}
                <div className="z-10 text-center w-full px-4 min-h-[28px] flex flex-col justify-center items-center mt-3">
                    {speechTranscript && (
                        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-[11px] text-slate-400 font-medium italic mb-1">
                            "{speechTranscript}"
                        </motion.p>
                    )}
                    <div className="flex items-center gap-1.5 justify-center font-black text-slate-700 text-sm">
                        <span className="text-brandPurple font-black">
                            {isProcessing ? <Loader2 size={14} className="animate-spin"/> : '>'}
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
                                    <HelpCircle size={12}/> Kaynak Seçin:
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
                            <Search size={12}/> Eşleşen Öğrenciler — Lütfen Seçin
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
                            <Search size={48} className="text-slate-300"/>
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
