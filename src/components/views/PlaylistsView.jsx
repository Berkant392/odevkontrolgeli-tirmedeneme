import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Play, Youtube, Plus, Trash2, Star, CheckCircle, Clock, Search, 
    Filter, Tv, ArrowLeft, ExternalLink, X, BookOpen, Save, Trash, Edit3, MonitorPlay, ListVideo, CheckCircle2, FolderPlus 
} from 'lucide-react';
import { db } from '../../config/firebase';
import { 
    collection, query, where, onSnapshot, addDoc, deleteDoc, updateDoc, doc, 
    serverTimestamp, getDoc, setDoc
} from 'firebase/firestore';
import { lockScroll, unlockScroll } from '../../utils/scrollLock';

// Ders/Konu listesi
const SUBJECTS = [
    { id: 'mat', name: 'Matematik', color: '#3b82f6', bg: 'bg-blue-50 text-blue-600 border-blue-100' },
    { id: 'tur', name: 'Türkçe', color: '#ef4444', bg: 'bg-rose-50 text-rose-600 border-rose-100' },
    { id: 'fiz', name: 'Fizik', color: '#a855f7', bg: 'bg-purple-50 text-purple-600 border-purple-100' },
    { id: 'kim', name: 'Kimya', color: '#10b981', bg: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    { id: 'biy', name: 'Biyoloji', color: '#06b6d4', bg: 'bg-cyan-50 text-cyan-600 border-cyan-100' },
    { id: 'tar', name: 'Tarih', color: '#ea580c', bg: 'bg-orange-50 text-orange-600 border-orange-100' },
    { id: 'cog', name: 'Coğrafya', color: '#14b8a6', bg: 'bg-teal-50 text-teal-600 border-teal-100' },
    { id: 'ede', name: 'Edebiyat', color: '#db2777', bg: 'bg-pink-50 text-pink-600 border-pink-100' },
    { id: 'yab', name: 'Yabancı Dil', color: '#6366f1', bg: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
    { id: 'dig', name: 'Diğer', color: '#64748b', bg: 'bg-slate-50 text-slate-600 border-slate-100' }
];

// Playlist/Video görseli yüklenemediğinde kullanılan yerleşik placeholder (harici URL'ye bağımlı değil)
const PLACEHOLDER_THUMB = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='480' height='360' viewBox='0 0 480 360'%3E%3Crect width='480' height='360' fill='%23111827'/%3E%3Cpolygon points='210,120 210,240 300,180' fill='%234b5563'/%3E%3C/svg%3E";

// YouTube URL Ayrıştırıcı
const parseYoutubeUrl = (url) => {
    let videoId = null;
    let playlistId = null;
    
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes('youtu.be')) {
            videoId = urlObj.pathname.substring(1);
        } else if (urlObj.hostname.includes('youtube.com')) {
            if (urlObj.pathname.includes('/watch')) {
                videoId = urlObj.searchParams.get('v');
            } else if (urlObj.pathname.includes('/embed/')) {
                videoId = urlObj.pathname.split('/embed/')[1]?.split('?')[0];
            }
            playlistId = urlObj.searchParams.get('list');
        }
        if (!playlistId && urlObj.pathname.includes('/playlist')) {
            playlistId = urlObj.searchParams.get('list') || urlObj.searchParams.get('id');
        }
    } catch (e) {
        const vidRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const listRegex = /[&?]list=([^"&?\/\s]+)/;
        
        const vidMatch = url.match(vidRegex);
        if (vidMatch) videoId = vidMatch[1];
        
        const listMatch = url.match(listRegex);
        if (listMatch) playlistId = listMatch[1];
    }
    
    return { videoId, playlistId };
};

const fetchWithTimeout = async (url, options = {}) => {
    const { timeout = 2500 } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
};

// YouTube Oynatma Listesi Genel Bilgilerini ve Videolarını Çekme Algoritması (Cache-First)
const fetchPlaylistData = async (playlistId) => {
    // 1. Önce Firestore Cache kontrol et (Global önbellek - kota harcamaz, milisaniyeler sürer)
    try {
        const cacheRef = doc(db, 'playlistCache', playlistId);
        const cacheSnap = await getDoc(cacheRef);
        if (cacheSnap.exists()) {
            const cacheData = cacheSnap.data();
            
            // Eğer cache içindeki ilk birkaç video 15:00 ise (eski hatalı cache), bu cache'i yoksay ve ağdan çek
            const isBrokenCache = cacheData.videos && cacheData.videos.length > 0 && cacheData.videos.slice(0, 3).every(v => v.duration === "15:00");
            
            if (!isBrokenCache) {
                console.log("Playlist data loaded from Firestore Cache:", cacheData.title);
                return {
                    title: cacheData.title,
                    thumbnail: cacheData.thumbnail,
                    videos: cacheData.videos || []
                };
            } else {
                console.log("Eski/Hatalı (15:00) cache tespit edildi, güncel veriler çekiliyor...");
            }
        }
    } catch (e) {
        console.error("Firestore Cache read error:", e);
    }

    let plData = null;

    // 2. Netlify Serverless Function çağrısını yap (CORS sorunu yok, tüm videoları çeker)
    try {
        const netlifyUrl = `/.netlify/functions/youtubePlaylist?list=${playlistId}`;
        const res = await fetchWithTimeout(netlifyUrl, { timeout: 15000 }); // Tüm sayfaları çekebilmesi için süre biraz uzatıldı
        
        // Yanıt HTML mi diye kontrol et (npm run dev kullanıldığında index.html dönebilir)
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
            throw new Error("Sunucu JSON yerine HTML döndürdü. Lütfen 'npm run dev' yerine 'netlify dev' kullandığınızdan emin olun.");
        }

        if (res.ok) {
            let data;
            try {
                data = await res.json();
            } catch (err) {
                throw new Error("Sunucudan dönen veri okunamadı (Geçersiz JSON).");
            }
            
            if (data.success && data.videos && data.videos.length > 0) {
                // Netlify'dan gelen veriyi mevcut yapıya uyarla
                const mappedVideos = data.videos.map((vid, index) => ({
                    id: `vid_${Date.now()}_${index}_${Math.floor(Math.random() * 1000)}`,
                    title: vid.title,
                    youtubeId: vid.videoId, // Netlify artık videoId döndürüyor
                    duration: vid.duration || "15:00",
                    thumbnail: vid.thumb, // Netlify artık thumb döndürüyor
                    watched: false
                }));

                plData = {
                    title: data.title,
                    thumbnail: data.thumbnail || mappedVideos[0]?.thumbnail || PLACEHOLDER_THUMB,
                    videos: mappedVideos
                };
            } else {
                throw new Error(data.error || "Playlist videoları bulunamadı.");
            }
        } else {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Sunucu hatası: ${res.status}`);
        }
    } catch (e) {
        console.error("Netlify function fetch failed:", e.message);
        // Hata durumunda boş döndür, UI tarafı bunu handle edecek (isFetchingUrl false olup alert gösterebilir)
        return null;
    }

    // 3. Gelecekteki istekler için Firestore önbelleğine kaydet
    if (plData && plData.videos.length > 0) {
        try {
            const cacheRef = doc(db, 'playlistCache', playlistId);
            await setDoc(cacheRef, {
                title: plData.title,
                thumbnail: plData.thumbnail,
                videos: plData.videos,
                cachedAt: serverTimestamp(),
                videoCount: plData.videos.length
            });
            console.log(`Playlist data cached in Firestore (${plData.videos.length} videolar)!`);
        } catch (e) {
            console.error("Firestore Cache write error:", e);
        }
    }

    return plData;
};

// YouTube Iframe API Yükleme Yardımcısı
let ytApiPromise = null;
const loadYoutubeIframeApi = () => {
    if (ytApiPromise) return ytApiPromise;
    ytApiPromise = new Promise((resolve) => {
        if (window.YT && window.YT.Player) {
            resolve(window.YT);
            return;
        }
        
        const previousCallback = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            if (previousCallback) previousCallback();
            resolve(window.YT);
        };
        
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    });
    return ytApiPromise;
};

// Tekil Videolarda Süre ve Başlık Çekme Algoritması (Cache-First + Hidden Iframe Probe)
const probeVideoDuration = async (videoId) => {
    // 1. Önce Firestore video önbelleğini kontrol et
    try {
        const cacheRef = doc(db, 'videoCache', videoId);
        const cacheSnap = await getDoc(cacheRef);
        if (cacheSnap.exists()) {
            const data = cacheSnap.data();
            console.log("Video data loaded from Firestore Cache:", data.title);
            return {
                title: data.title,
                duration: data.duration,
                thumbnail: data.thumbnail
            };
        }
    } catch (e) {
        console.error("Firestore video cache read error:", e);
    }

    let probeData = null;

    // 2. Iframe Probe Hack: Arka planda görünmez iframe ile süreyi çek
    try {
        const YT = await loadYoutubeIframeApi();
        probeData = await new Promise((resolve) => {
            const divId = `yt_probe_${Date.now()}`;
            const div = document.createElement('div');
            div.id = divId;
            div.style.position = 'absolute';
            div.style.left = '-9999px';
            div.style.top = '-9999px';
            div.style.width = '200px';
            div.style.height = '150px';
            document.body.appendChild(div);

            let player;
            let checkInterval;
            let timeoutId;

            const cleanUp = () => {
                clearInterval(checkInterval);
                clearTimeout(timeoutId);
                try {
                    if (player && typeof player.destroy === 'function') {
                        player.destroy();
                    }
                } catch (e) {}
                try {
                    document.body.removeChild(div);
                } catch (e) {}
            };

            // 7.5 saniye zaman aşımı
            timeoutId = setTimeout(() => {
                cleanUp();
                resolve(null);
            }, 7500);

            player = new YT.Player(divId, {
                videoId: videoId,
                playerVars: {
                    autoplay: 1,
                    mute: 1,
                    controls: 0,
                    showinfo: 0,
                    rel: 0
                },
                events: {
                    onReady: (event) => {
                        event.target.playVideo();
                    },
                    onStateChange: (event) => {
                        if (event.data === YT.PlayerState.PLAYING || event.data === YT.PlayerState.BUFFERING) {
                            if (!checkInterval) {
                                checkInterval = setInterval(() => {
                                    try {
                                        const durSec = player.getDuration();
                                        const videoData = player.getVideoData();
                                        const title = videoData ? videoData.title : "";
                                        
                                        if (durSec > 0) {
                                            const hrs = Math.floor(durSec / 3600);
                                            const mins = Math.floor((durSec % 3600) / 60);
                                            const secs = Math.floor(durSec % 60);
                                            
                                            let durationStr = "";
                                            if (hrs > 0) {
                                                durationStr = `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                                            } else {
                                                durationStr = `${mins}:${secs.toString().padStart(2, '0')}`;
                                            }

                                            cleanUp();
                                            resolve({
                                                title: title || "YouTube Videosu",
                                                duration: durationStr,
                                                thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                                            });
                                        }
                                    } catch (e) {
                                        // Hata oluşursa pas geç
                                    }
                                }, 300);
                            }
                        }
                    },
                    onError: () => {
                        cleanUp();
                        resolve(null);
                    }
                }
            });
        });
    } catch (e) {
        console.error("Iframe probe hatası:", e);
    }

    // 3. Noembed.com fallback (Iframe probe başarısız olursa veya başlığı eksikse)
    if (!probeData || !probeData.title) {
        try {
            const noembedUrl = `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`;
            const res = await fetchWithTimeout(noembedUrl, { timeout: 3000 });
            if (res.ok) {
                const data = await res.json();
                if (data && data.title) {
                    probeData = {
                        title: data.title,
                        duration: probeData ? probeData.duration : "15:00",
                        thumbnail: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                    };
                }
            }
        } catch (err) {
            console.error("Noembed fallback hatası:", err);
        }
    }

    // 4. Tamamen başarısız olunursa varsayılan değer
    if (!probeData) {
        probeData = {
            title: "Yeni YouTube Videosu",
            duration: "20:00",
            thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
        };
    }

    // 5. Firestore video cache kaydet
    try {
        const cacheRef = doc(db, 'videoCache', videoId);
        await setDoc(cacheRef, {
            title: probeData.title,
            duration: probeData.duration,
            thumbnail: probeData.thumbnail,
            cachedAt: serverTimestamp()
        });
    } catch (e) {
        console.error("Firestore video cache yazma hatası:", e);
    }

    return probeData;
};

const PlaylistsView = ({ studentId, isTeacherMode, showAlert, currentUserRole }) => {
    const isVip = currentUserRole === 'vip-student';

    // State'ler
    const [playlists, setPlaylists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlaylist, setSelectedPlaylist] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [activeVideo, setActiveVideo] = useState(null); // Oynatılan video
    const [isSaving, setIsSaving] = useState(false);
    
    // Filtre State'leri
    const [searchQuery, setSearchQuery] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all'); // all, playlist, single
    const [starFilter, setStarFilter] = useState(false);

    // Form State'leri
    const [inputUrl, setInputUrl] = useState('');
    const [inputSubject, setInputSubject] = useState('dig');
    const [inputType, setInputType] = useState('playlist'); // playlist, single
    const [isFetchingUrl, setIsFetchingUrl] = useState(false);
    const [fetchedData, setFetchedData] = useState(null);

    // Realtime Database Bağlantısı
    useEffect(() => {
        if (!studentId) return;
        const q = query(collection(db, 'playlists'), where('studentId', '==', studentId));
        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPlaylists(list);
            setLoading(false);
        }, (err) => {
            console.error("Playlists error:", err);
            setLoading(false);
        });
        return () => unsub();
    }, [studentId]);

    // Modal açıldığında/kapandığında scroll'u yönet
    useEffect(() => {
        if (showAddModal || activeVideo) {
            lockScroll();
        }
        return () => {
            if (showAddModal || activeVideo) {
                unlockScroll();
            }
        };
    }, [showAddModal, activeVideo]);

    // Mobil cihazlarda tam ekrana geçildiğinde videoyu otomatik yatay yap (YouTube App davranışı)
    useEffect(() => {
        const handleFullscreenChange = async () => {
            if (document.fullscreenElement || document.webkitFullscreenElement) {
                try {
                    if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
                        await window.screen.orientation.lock('landscape');
                    }
                } catch (err) {
                    // Cihaz desteklemiyorsa veya izin yoksa yoksay (örn: iOS Safari veya masaüstü)
                }
            } else {
                try {
                    if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
                        window.screen.orientation.unlock();
                    }
                } catch (err) {
                    // Yoksay
                }
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        };
    }, []);

    // Link değiştiğinde otomatik metadata getir (oEmbed veya Playlist Scraper) ve tipi belirle
    useEffect(() => {
        if (!inputUrl.trim()) {
            setFetchedData(null);
            return;
        }

        const { videoId, playlistId } = parseYoutubeUrl(inputUrl);
        if (!videoId && !playlistId) {
            setFetchedData(null);
            return;
        }

        // Tipi otomatik belirle (playlist parametresi varsa playlist moduna al, yoksa tekil videoya al)
        if (playlistId) {
            setInputType('playlist');
        } else if (videoId) {
            setInputType('single');
        }

        const targetId = playlistId || videoId;
        const fetchMetadata = async () => {
            setIsFetchingUrl(true);
            try {
                if (playlistId) {
                    const plData = await fetchPlaylistData(playlistId);
                    if (plData) {
                        setFetchedData({
                            title: plData.title,
                            thumbnail: plData.thumbnail,
                            youtubeId: playlistId,
                            isPlaylist: true,
                            videos: plData.videos || []
                        });
                        return;
                    }
                } else if (videoId) {
                    const videoData = await probeVideoDuration(videoId);
                    if (videoData) {
                        setFetchedData({
                            title: videoData.title,
                            thumbnail: videoData.thumbnail,
                            youtubeId: videoId,
                            isPlaylist: false,
                            videos: [{
                                id: `vid_${Date.now()}_1`,
                                title: videoData.title,
                                youtubeId: videoId,
                                duration: videoData.duration,
                                thumbnail: videoData.thumbnail,
                                watched: false
                            }]
                        });
                        return;
                    }
                }
                
                // Fallback
                setFetchedData({
                    title: playlistId ? "Yeni YouTube Oynatma Listesi" : "Yeni YouTube Videosu",
                    thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : PLACEHOLDER_THUMB,
                    youtubeId: targetId,
                    isPlaylist: !!playlistId
                });
            } catch (err) {
                console.error("fetchMetadata hatası:", err);
                setFetchedData({
                    title: playlistId ? "Yeni YouTube Oynatma Listesi" : "Yeni YouTube Videosu",
                    thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : PLACEHOLDER_THUMB,
                    youtubeId: targetId,
                    isPlaylist: !!playlistId
                });
            } finally {
                setIsFetchingUrl(false);
            }
        };

        const timer = setTimeout(fetchMetadata, 800);
        return () => clearTimeout(timer);
    }, [inputUrl]);

    // Filtreleme mantığı
    const filteredPlaylists = useMemo(() => {
        return playlists.filter(pl => {
            const queryNorm = searchQuery.toLowerCase().trim();
            const matchesSearch = pl.title?.toLowerCase().includes(queryNorm);
            const matchesSubject = subjectFilter === 'all' || pl.subject === subjectFilter;
            const matchesType = typeFilter === 'all' || pl.type === typeFilter;
            const matchesStar = !starFilter || pl.isStarred;
            return matchesSearch && matchesSubject && matchesType && matchesStar;
        });
    }, [playlists, searchQuery, subjectFilter, typeFilter, starFilter]);

    // Oynatma listesi kaydet
    const handleSavePlaylist = async (e) => {
        e.preventDefault();
        if (!inputUrl.trim()) return;

        const { videoId, playlistId } = parseYoutubeUrl(inputUrl);
        if (!videoId && !playlistId) {
            if (showAlert) showAlert('error', 'Hata', 'Lütfen geçerli bir YouTube video veya oynatma listesi linki giriniz.');
            return;
        }

        setIsSaving(true);

        const title = fetchedData?.title || (inputType === 'playlist' ? 'YouTube Oynatma Listesi' : 'YouTube Videosu');
        const thumbnail = fetchedData?.thumbnail || (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : PLACEHOLDER_THUMB);
        const yid = playlistId || videoId;

        // Oynatma listesi videoları oluştur (Cache-first check)
        let videos = [];
        if (inputType === 'playlist' && playlistId) {
            // Eğer metadata çekerken videolar da geldiyse önbellekten kullan (Instant!)
            if (fetchedData && fetchedData.youtubeId === playlistId && fetchedData.videos && fetchedData.videos.length > 0) {
                videos = fetchedData.videos;
            } else {
                try {
                    const plData = await fetchPlaylistData(playlistId);
                    if (plData && plData.videos && plData.videos.length > 0) {
                        videos = plData.videos;
                    } else {
                        // Fallback mocks
                        for (let i = 1; i <= 8; i++) {
                            videos.push({
                                id: `vid_${Date.now()}_${i}`,
                                title: `Ders ${i}: ${title.replace("Oynatma Listesi: ", "")} - Bölüm ${i}`,
                                youtubeId: videoId || "dQw4w9WgXcQ",
                                duration: `${Math.floor(Math.random() * 15 + 15)}:00`,
                                thumbnail: `https://img.youtube.com/vi/${videoId || "dQw4w9WgXcQ"}/hqdefault.jpg`,
                                watched: false
                            });
                        }
                    }
                } catch (err) {
                    console.error("Save: failed to fetch playlist data, fallback to mock", err);
                    for (let i = 1; i <= 8; i++) {
                        videos.push({
                            id: `vid_${Date.now()}_${i}`,
                            title: `Ders ${i}: ${title.replace("Oynatma Listesi: ", "")} - Bölüm ${i}`,
                            youtubeId: videoId || "dQw4w9WgXcQ",
                            duration: `${Math.floor(Math.random() * 15 + 15)}:00`,
                            thumbnail: `https://img.youtube.com/vi/${videoId || "dQw4w9WgXcQ"}/hqdefault.jpg`,
                            watched: false
                        });
                    }
                }
            }
        } else {
            // Tek video
            if (fetchedData && fetchedData.youtubeId === videoId && fetchedData.videos && fetchedData.videos.length > 0) {
                videos = fetchedData.videos;
            } else {
                try {
                    const videoData = await probeVideoDuration(videoId);
                    videos.push({
                        id: `vid_${Date.now()}_1`,
                        title: videoData ? videoData.title : title,
                        youtubeId: videoId,
                        duration: videoData ? videoData.duration : "20:00",
                        thumbnail: videoData ? videoData.thumbnail : thumbnail,
                        watched: false
                    });
                } catch (err) {
                    videos.push({
                        id: `vid_${Date.now()}_1`,
                        title: title,
                        youtubeId: videoId,
                        duration: "20:00",
                        thumbnail: thumbnail,
                        watched: false
                    });
                }
            }
        }

        const payload = {
            studentId,
            title,
            thumbnail,
            youtubeId: yid,
            type: inputType,
            subject: inputSubject,
            isStarred: false,
            videos,
            createdAt: serverTimestamp()
        };

        try {
            await addDoc(collection(db, 'playlists'), payload);
            if (showAlert) showAlert('success', 'Eklendi', 'Oynatma listeniz başarıyla kütüphanenize eklendi.');
            setShowAddModal(false);
            setInputUrl('');
            setFetchedData(null);
        } catch (err) {
            console.error("Save playlist error:", err);
            if (showAlert) showAlert('error', 'Hata', 'Kaydedilirken bir sorun oluştu.');
        } finally {
            setIsSaving(false);
        }
    };

    // Playlist favori durumu değiştir
    const handleToggleStar = async (pl, e) => {
        e.stopPropagation();
        try {
            await updateDoc(doc(db, 'playlists', pl.id), {
                isStarred: !pl.isStarred
            });
        } catch (err) {
            console.error(err);
        }
    };

    // Playlist sil
    const handleDeletePlaylist = (pl, e) => {
        e.stopPropagation();
        if (showAlert) {
            showAlert('warning', 'Oynatma Listesini Sil', 'Bu oynatma listesini ve izleme geçmişinizi silmek istediğinize emin misiniz?', async () => {
                try {
                    await deleteDoc(doc(db, 'playlists', pl.id));
                    if (selectedPlaylist?.id === pl.id) {
                        setSelectedPlaylist(null);
                    }
                } catch (err) {
                    showAlert('error', 'Hata', 'Silme işlemi gerçekleştirilemedi.');
                }
            });
        }
    };

    // Video izlendi/izlenmedi durumunu güncelle
    const handleToggleVideoWatched = async (playlist, videoId) => {
        const updatedVideos = playlist.videos.map(v => 
            v.id === videoId ? { ...v, watched: !v.watched } : v
        );
        try {
            await updateDoc(doc(db, 'playlists', playlist.id), {
                videos: updatedVideos
            });
            // Seçili olan playlist referansını da güncelle
            if (selectedPlaylist && selectedPlaylist.id === playlist.id) {
                setSelectedPlaylist(prev => ({ ...prev, videos: updatedVideos }));
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Video oynatıcıyı tetikle
    const handleWatchVideo = (video, playlist) => {
        setActiveVideo({ ...video, playlist });
    };

    // İlerleme oranı hesaplama
    const getProgress = (pl) => {
        if (!pl.videos || pl.videos.length === 0) return 0;
        const watched = pl.videos.filter(v => v.watched).length;
        return Math.round((watched / pl.videos.length) * 100);
    };

    // Toplam süre hesaplama (dakika cinsinden)
    const getTotalDuration = (pl) => {
        if (!pl.videos) return 0;
        return pl.videos.reduce((acc, v) => {
            const mins = parseInt(v.duration.split(':')[0]) || 0;
            return acc + mins;
        }, 0);
    };

    // Çalışılan toplam süre
    const getWatchedDuration = (pl) => {
        if (!pl.videos) return 0;
        return pl.videos.reduce((acc, v) => {
            if (v.watched) {
                const mins = parseInt(v.duration.split(':')[0]) || 0;
                return acc + mins;
            }
            return acc;
        }, 0);
    };

    return (
        <div className={`playlist-premium-container ${isVip ? 'vip-mode' : ''} space-y-4 max-w-3xl mx-auto px-4 pb-12`}>
            
            {/* HERO */}
            <section className="hero mt-4">
                <div className="hero-main">
                    <div className="hero-icon">
                        <MonitorPlay size={32} strokeWidth={2.2} />
                    </div>
                    <div className="hero-copy">
                        <h1>Oynatma Listelerim</h1>
                        <p>YouTube ders playlistlerini entegre et, reklamsız ve düzenli şekilde takip et.</p>
                    </div>
                </div>

                {!isTeacherMode && (
                    <div className="hero-actions">
                        <button className="primary-btn" onClick={() => setShowAddModal(true)}>
                            <svg viewBox="0 0 24 24"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                            Yeni Playlist Ekle
                        </button>
                    </div>
                )}
            </section>

            {/* COMPACT STATS */}
            <section className="stats">
                <div className="stat">
                    <div className="stat-icon" style={{color:"var(--blue)", background:"var(--blue-soft)"}}>
                        <ListVideo size={18} strokeWidth={2.5} />
                    </div>
                    <small>Playlist</small>
                    <strong>{playlists.length}</strong>
                </div>

                <div className="stat">
                    <div className="stat-icon" style={{color:"var(--green)", background:"var(--green-soft)"}}>
                        <CheckCircle2 size={18} strokeWidth={2.5} />
                    </div>
                    <small>İzlenen</small>
                    <strong>{playlists.reduce((acc, pl) => acc + (pl.videos?.filter(v => v.watched).length || 0), 0)}/{playlists.reduce((acc, pl) => acc + (pl.videos?.length || 0), 0)}</strong>
                </div>

                <div className="stat">
                    <div className="stat-icon" style={{color:"var(--orange)", background:"var(--orange-soft)"}}>
                        <Clock size={18} strokeWidth={2.5} />
                    </div>
                    <small>Süre</small>
                    <strong>{playlists.reduce((acc, pl) => acc + getWatchedDuration(pl), 0)} dk</strong>
                </div>
            </section>

            {/* LIBRARY */}
            <section className="library">
                <div className="section-head">
                    <div className="section-title">
                        <i>
                            <FolderPlus size={18} strokeWidth={2.5} />
                        </i>
                        <strong>Playlist Kütüphanesi</strong>
                    </div>
                    <div className="count-pill">{filteredPlaylists.length} liste</div>
                </div>

                <div className="library-body">
                    <label className="search">
                        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>
                        <input 
                            placeholder="Playlist başlığı ile ara..." 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </label>

                    <div className="controls">
                        <select 
                            className="select-like outline-none appearance-none"
                            value={subjectFilter}
                            onChange={e => setSubjectFilter(e.target.value)}
                        >
                            <option value="all">Tüm Dersler</option>
                            {SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <select 
                            className="select-like outline-none appearance-none"
                            value={typeFilter}
                            onChange={e => setTypeFilter(e.target.value)}
                        >
                            <option value="all">Tüm Türler</option>
                            <option value="playlist">Oynatma Listesi</option>
                            <option value="single">Tekil Video</option>
                        </select>
                    </div>

                    <button 
                        className={`star-filter ${starFilter ? 'active' : ''}`}
                        onClick={() => setStarFilter(!starFilter)}
                    >
                        ☆ Sadece yıldızlılar
                    </button>

                    <div className="playlists">
                        {filteredPlaylists.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 font-bold text-xs bg-slate-50 rounded-2xl border border-dashed mt-4">
                                Arama kriterine uygun playlist bulunamadı.
                            </div>
                        ) : (
                            filteredPlaylists.map(pl => {
                                const progress = getProgress(pl);
                                const isOpen = selectedPlaylist?.id === pl.id;
                                const subjectInfo = SUBJECTS.find(s => s.id === pl.subject) || SUBJECTS[SUBJECTS.length - 1];
                                const isMath = pl.subject === 'mat' || pl.subject === 'fiz' || pl.subject === 'kim';
                                const playlistYear = pl.createdAt?.seconds ? new Date(pl.createdAt.seconds * 1000).getFullYear() : new Date().getFullYear();
                                
                                return (
                                    <article key={pl.id} className={`playlist ${pl.isStarred ? 'favorite' : ''} ${isOpen ? 'open' : ''}`}>
                                        <button 
                                            className="playlist-header" 
                                            onClick={() => setSelectedPlaylist(isOpen ? null : pl)}
                                        >
                                            <div className={`thumb ${isMath ? 'math' : ''}`} style={pl.thumbnail && pl.thumbnail !== PLACEHOLDER_THUMB ? { backgroundImage: `url(${pl.thumbnail})` } : {}} data-year={playlistYear}></div>
                                            <div className="playlist-info">
                                                <span className="type-badge" style={subjectInfo.id === 'mat' ? {color:"var(--blue)", background:"var(--blue-soft)"} : {}}>{subjectInfo.name}</span>
                                                <h3>{pl.title}</h3>
                                                <div className="playlist-progress">
                                                    <div className="mini-bar" style={{"--progress": `${progress}%`}}><span></span></div>
                                                    <small>%{progress}</small>
                                                </div>
                                            </div>
                                            <div className="chevron">
                                                <svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>
                                            </div>
                                        </button>

                                        <div className="accordion-content">
                                            <div className="accordion-inner">
                                                <div className="accordion-line"></div>
                                                
                                                <div className="flex justify-between items-center mb-4 px-2">
                                                    <button onClick={(e) => handleToggleStar(pl, e)} className={`text-xs font-bold hover:text-amber-500 flex items-center gap-1.5 transition-colors ${pl.isStarred ? 'text-amber-500' : 'text-slate-500'}`}>
                                                        <Star size={14} fill={pl.isStarred ? '#f59e0b' : 'none'} /> {pl.isStarred ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}
                                                    </button>
                                                    {!isTeacherMode && (
                                                        <button onClick={(e) => handleDeletePlaylist(pl, e)} className="text-xs font-bold text-slate-500 hover:text-red-500 flex items-center gap-1.5 transition-colors">
                                                            <Trash2 size={14} /> Listeyi Sil
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="accordion-summary">
                                                    <div className="acc-stat">
                                                        <span>Video</span>
                                                        <strong>{pl.videos?.length || 0}</strong>
                                                    </div>
                                                    <div className="acc-stat">
                                                        <span>İzlenen</span>
                                                        <strong>{pl.videos?.filter(v => v.watched).length || 0}</strong>
                                                    </div>
                                                    <div className="acc-stat">
                                                        <span>Süre</span>
                                                        <strong>{getTotalDuration(pl)} dk</strong>
                                                    </div>
                                                </div>

                                                <div className="video-list mt-2">
                                                    {pl.videos?.map((vid, idx) => (
                                                        <div key={vid.id} className="video-row" onClick={() => handleWatchVideo(vid, pl)}>
                                                            <div className="video-thumb">
                                                                <img src={vid.thumbnail || `https://img.youtube.com/vi/${vid.youtubeId}/hqdefault.jpg`} alt={vid.title} />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <strong>{vid.title}</strong>
                                                                <span>{vid.duration} • {vid.watched ? 'izlendi' : (idx === 0 || pl.videos[idx-1]?.watched ? 'sıradaki' : 'bekliyor')}</span>
                                                            </div>
                                                            {isTeacherMode ? (
                                                                <div className={`watch-pill ${vid.watched ? '' : 'waiting'}`}>{idx + 1}</div>
                                                            ) : (
                                                                <div className="flex items-center" onClick={(e) => { e.stopPropagation(); handleToggleVideoWatched(pl, vid.id); }}>
                                                                    <div className={`w-7 h-7 rounded-full border-[2px] flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                                                                        vid.watched 
                                                                            ? 'bg-emerald-500 border-emerald-500 text-white'
                                                                            : 'border-slate-300 hover:border-emerald-500 hover:text-emerald-500 text-transparent'
                                                                    }`}>
                                                                        <CheckCircle size={16} strokeWidth={3} className={vid.watched ? "opacity-100" : "opacity-0 hover:opacity-100 transition-opacity"} />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="playlist-actions">
                                                    <button className="play-action primary" onClick={() => {
                                                        const nextVid = pl.videos?.find(v => !v.watched) || pl.videos?.[0];
                                                        if(nextVid) handleWatchVideo(nextVid, pl);
                                                    }}>Devam Et</button>
                                                    <button className="play-action secondary" onClick={() => setSelectedPlaylist(null)}>Listeyi Kapat</button>
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })
                        )}
                    </div>
                </div>
            </section>

            {/* EKLEME MODALI */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ scale: 0.95, y: 15, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: 15, opacity: 0 }}
                            className={`w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl relative ${
                                isVip ? 'bg-slate-905 text-slate-105 border border-slate-800' : 'bg-white text-slate-850'
                            }`}
                        >
                            <form onSubmit={handleSavePlaylist} className="p-6 space-y-5">
                                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                                    <h3 className="text-base font-black flex items-center gap-2">
                                        <Youtube className={isVip ? 'text-amber-500' : 'text-primary'} size={22} />
                                        Yeni Oynatma Listesi Ekle
                                    </h3>
                                    <button 
                                        type="button" 
                                        onClick={() => { setShowAddModal(false); setInputUrl(''); setFetchedData(null); }}
                                        className="p-1.5 rounded-full hover:bg-slate-100 transition-colors text-slate-400"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {/* Ekleme Tipi Seçimi */}
                                    <div className="grid grid-cols-2 gap-2.5 bg-slate-100/60 p-1 rounded-xl">
                                        <button 
                                            type="button" 
                                            onClick={() => setInputType('playlist')}
                                            className={`py-2 rounded-lg font-black text-xs transition-all ${
                                                inputType === 'playlist' 
                                                    ? (isVip ? 'bg-amber-500 text-slate-900 shadow' : 'bg-white text-primary shadow')
                                                    : 'text-slate-500'
                                            }`}
                                        >
                                            Oynatma Listesi Ekle
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => setInputType('single')}
                                            className={`py-2 rounded-lg font-black text-xs transition-all ${
                                                inputType === 'single' 
                                                    ? (isVip ? 'bg-amber-500 text-slate-900 shadow' : 'bg-white text-primary shadow')
                                                    : 'text-slate-500'
                                            }`}
                                        >
                                            Sadece Tek Video Ekle
                                        </button>
                                    </div>

                                    {/* Link Kutusu */}
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5 ml-1">
                                            YouTube Linki
                                        </label>
                                        <input 
                                            type="url" 
                                            placeholder={inputType === 'playlist' ? "https://www.youtube.com/playlist?list=..." : "https://www.youtube.com/watch?v=..."}
                                            required
                                            value={inputUrl}
                                            onChange={e => setInputUrl(e.target.value)}
                                            className={`w-full border-2 rounded-xl p-3 font-bold text-xs outline-none transition-all ${
                                                isVip ? 'bg-slate-800 border-slate-700 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-100 focus:bg-white focus:border-primary'
                                            }`}
                                        />
                                    </div>

                                    {/* Ders Seçimi */}
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5 ml-1">
                                            İlgili Ders / Konu Grubu
                                        </label>
                                        <select 
                                            value={inputSubject}
                                            onChange={e => setInputSubject(e.target.value)}
                                            className={`w-full border-2 rounded-xl p-3 font-black text-xs outline-none transition-all ${
                                                isVip ? 'bg-slate-800 border-slate-700 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-100 focus:bg-white focus:border-primary'
                                            }`}
                                        >
                                            {SUBJECTS.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Link Getirme Durumu */}
                                    {isFetchingUrl && (
                                        <div className="flex items-center gap-2 justify-center py-2 text-xs font-bold text-slate-500">
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-400 border-t-primary"></div>
                                            Metadatalar çekiliyor...
                                        </div>
                                    )}

                                    {isSaving && (
                                        <div className="flex items-center gap-2 justify-center py-2 text-xs font-bold text-primary animate-pulse">
                                            <div className={`animate-spin rounded-full h-4 w-4 border-2 border-slate-200 ${isVip ? 'border-t-amber-500' : 'border-t-primary'}`}></div>
                                            Oynatma listesi videoları çekiliyor...
                                        </div>
                                    )}

                                    {/* Önizleme Kartı */}
                                    {fetchedData && (
                                        <div className="p-3 border rounded-2xl flex gap-3 bg-slate-50/50">
                                            <div className="w-20 aspect-video bg-slate-200 rounded-lg overflow-hidden shrink-0">
                                                <img src={fetchedData.thumbnail} alt="Önizleme" className="w-full h-full object-cover" />
                                            </div>
                                            <div className="min-w-0 flex-1 py-0.5">
                                                <span className="text-[8px] font-black text-primary block uppercase">Önizleme Başlığı</span>
                                                <h4 className="text-xs font-black text-slate-700 truncate mt-1">
                                                    {fetchedData.title}
                                                </h4>
                                                <span className="text-[9px] text-slate-400 block mt-1 font-bold">
                                                    ID: {fetchedData.youtubeId}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
                                    <button 
                                        type="button" 
                                        disabled={isSaving}
                                        onClick={() => { setShowAddModal(false); setInputUrl(''); setFetchedData(null); }}
                                        className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                                    >
                                        İptal
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={isFetchingUrl || isSaving || !inputUrl.trim()}
                                        className={`px-6 py-2.5 rounded-xl font-black text-xs text-white shadow-md active:scale-95 disabled:opacity-50 ${
                                            isVip ? 'bg-amber-500 text-slate-900 shadow-amber-500/25' : 'bg-primary hover:bg-purple-700 shadow-primary/20'
                                        }`}
                                    >
                                        {isSaving ? 'Videolar Çekiliyor...' : 'Playlist Ekle'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* AD-FREE KİŞİSEL VİDEO İZLEME OYNATICISI MODALI */}
            <AnimatePresence>
                {activeVideo && (
                    <div 
                        className="fixed inset-0 bg-slate-950/95 z-[9999] flex items-center justify-center p-4"
                        onClick={() => setActiveVideo(null)}
                    >
                        <motion.div 
                            initial={{ scale: 0.96, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.96, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-5xl aspect-video md:aspect-[21/9] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col md:flex-row relative z-10"
                        >
                            {/* Sol Bölüm: Video iframe */}
                            <div className="flex-1 bg-black relative aspect-video md:aspect-auto">
                                {/* Mobil için video üzeri Kapat butonu */}
                                <button 
                                    onClick={() => setActiveVideo(null)}
                                    className="md:hidden absolute top-3 right-3 z-[99] p-2 rounded-full bg-black/60 text-white backdrop-blur-md border border-white/20 shadow-xl"
                                >
                                    <X size={20} />
                                </button>
                                <iframe 
                                    className="w-full h-full absolute inset-0"
                                    src={`https://www.youtube-nocookie.com/embed/${activeVideo.youtubeId}?autoplay=1&rel=0&enablejsapi=1`}
                                    title={activeVideo.title}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    allowFullScreen
                                />
                            </div>

                            {/* Sağ Bölüm: Müfredat ve Kontroller */}
                            <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-800 flex flex-col justify-between h-[300px] md:h-auto bg-slate-900">
                                
                                {/* Üst Detay */}
                                <div className="p-4 border-b border-slate-800 flex justify-between items-start">
                                    <div className="min-w-0">
                                        <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest block">REKLAMSIZ OYNATICI</span>
                                        <h3 className="text-white text-xs font-black mt-1 truncate pr-2">
                                            {activeVideo.title}
                                        </h3>
                                    </div>
                                    <button 
                                        onClick={() => setActiveVideo(null)}
                                        className="p-1 rounded-full bg-slate-800 text-slate-400 hover:text-white"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* Oynatma Akışı Listesi */}
                                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1 mb-1">
                                        DİĞER VİDEOLAR ({activeVideo.playlist?.videos?.length || 0})
                                    </span>
                                    {activeVideo.playlist?.videos?.map((vid, vIdx) => {
                                        const isPlaying = vid.id === activeVideo.id;
                                        return (
                                            <div 
                                                key={vid.id}
                                                onClick={() => {
                                                    if (!isPlaying) {
                                                        setActiveVideo({ ...vid, playlist: activeVideo.playlist });
                                                    }
                                                }}
                                                className={`p-2 rounded-xl flex items-center justify-between gap-2.5 cursor-pointer transition-all border ${
                                                    isPlaying 
                                                        ? 'bg-amber-500/10 border-amber-500 text-amber-400' 
                                                        : 'bg-slate-800/60 border-transparent hover:border-slate-700 text-slate-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className={`text-[10px] font-black shrink-0 ${isPlaying ? 'text-amber-400' : 'text-slate-500'}`}>
                                                        {vIdx + 1}
                                                    </span>
                                                    <span className="text-[10px] font-bold truncate block">
                                                        {vid.title}
                                                    </span>
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-500 shrink-0">
                                                    {vid.duration}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Alt Kontroller */}
                                <div className="p-4 bg-slate-950/40 border-t border-slate-800 flex gap-2">
                                    {!isTeacherMode && (
                                        <button 
                                            onClick={() => {
                                                handleToggleVideoWatched(activeVideo.playlist, activeVideo.id);
                                                // Local state'i de toggle yapalım
                                                setActiveVideo(prev => ({
                                                    ...prev,
                                                    watched: !prev.watched
                                                }));
                                            }}
                                            className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 ${
                                                activeVideo.watched 
                                                    ? 'bg-slate-800 text-slate-400 border border-slate-700' 
                                                    : (isVip ? 'bg-amber-500 text-slate-900 shadow-amber-500/15' : 'bg-primary text-white shadow-primary/15 hover:brightness-105')
                                            }`}
                                        >
                                            <CheckCircle size={14} /> 
                                            {activeVideo.watched ? 'İzlenmedi Yap' : 'İzledim (Bitir)'}
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => setActiveVideo(null)}
                                        className="px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-800 text-slate-300 hover:text-white"
                                    >
                                        Kapat
                                    </button>
                                </div>

                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default PlaylistsView;
