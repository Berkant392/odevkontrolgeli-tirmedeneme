import { Clock, CheckCircle, XCircle, MinusCircle } from 'lucide-react';

export const CLASSES_COLLECTION = 'berkant_hoca_classes_secure';
export const LIBRARY_COLLECTION = 'berkant_hoca_library';
export const SETTINGS_COLLECTION = 'berkant_hoca_system_config_v2';
export const SETTINGS_DOC = 'main_config';
export const DEFAULT_PIN = "1234"; 
export const LIBRARY_TYPES = { EXCUSE: 'excuse', TOPIC: 'topic', SOURCE: 'source', CURRICULUM: 'curriculum' };

export const MOTIVATIONAL_QUOTES = [
    { text: "Başarı, her gün tekrarlanan küçük çabaların toplamıdır.", author: "Robert Collier" },
    { text: "Gelecek, bugünden ona hazırlananlara aittir.", author: "Malcolm X" },
    { text: "Bir şeyi başarmak için önce ona inanmalısın.", author: "Nikos Kazancakis" },
    { text: "Eğitim, dünyayı değiştirmek için kullanabileceğiniz en güçlü silahtır.", author: "Nelson Mandela" },
    { text: "Düşlerini gerçekleştirmek istiyorsan uyanmalısın.", author: "J.M. Power" }
];

export const TOPIC_THEMES = [
    { main: 'bg-indigo-100 text-indigo-900 border-indigo-200', sub: 'bg-indigo-50 text-indigo-800 border-indigo-100', cell: 'bg-white border-indigo-50', btn: 'hover:bg-indigo-200 text-indigo-600', border: 'border-indigo-300', tag: 'bg-indigo-500', text: 'text-indigo-900' },
    { main: 'bg-rose-100 text-rose-900 border-rose-200', sub: 'bg-rose-50 text-rose-800 border-rose-100', cell: 'bg-white border-rose-50', btn: 'hover:bg-rose-200 text-rose-600', border: 'border-rose-300', tag: 'bg-rose-500', text: 'text-rose-900' },
    { main: 'bg-emerald-100 text-emerald-900 border-emerald-200', sub: 'bg-emerald-50 text-emerald-800 border-emerald-100', cell: 'bg-white border-emerald-50', btn: 'hover:bg-emerald-200 text-emerald-600', border: 'border-emerald-300', tag: 'bg-emerald-500', text: 'text-emerald-900' },
    { main: 'bg-amber-100 text-amber-900 border-amber-200', sub: 'bg-amber-50 text-amber-800 border-amber-100', cell: 'bg-white border-amber-50', btn: 'hover:bg-amber-200 text-amber-600', border: 'border-amber-300', tag: 'bg-amber-500', text: 'text-amber-900' },
    { main: 'bg-sky-100 text-sky-900 border-sky-200', sub: 'bg-sky-50 text-sky-800 border-sky-100', cell: 'bg-white border-sky-50', btn: 'hover:bg-sky-200 text-sky-600', border: 'border-sky-300', tag: 'bg-sky-500', text: 'text-sky-900' },
];

export const STATUS_OPTIONS = [
    { id: 'assigned', label: 'Verildi', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200' },
    { id: 'done', label: 'Yapıldı', icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { id: 'missing', label: 'Eksik', icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-200' },
    { id: 'exempt', label: 'Muaf', icon: MinusCircle, color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-200' },
];
