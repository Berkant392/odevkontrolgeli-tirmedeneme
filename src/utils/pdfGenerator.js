import { db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { calculateStats } from './helpers';

export const generatePasswordCards = (cls) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Lütfen tarayıcınızın Pop-up engelleyicisini kapatın!');
        return;
    }

    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>${cls.className} - Giriş Kartları</title>
        <style>
            @page { margin: 0; size: A4; }
            body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                margin: 0; padding: 20px;
                background: #f8fafc;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .grid-container {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
                padding: 10px;
            }
            .card {
                background: #fff;
                border: 2px dashed #cbd5e1;
                border-radius: 16px;
                padding: 24px;
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
                position: relative;
                page-break-inside: avoid;
            }
            .card-header {
                display: flex;
                flex-direction: column;
                align-items: center;
                margin-bottom: 16px;
                border-bottom: 2px solid #f1f5f9;
                padding-bottom: 16px;
                width: 100%;
            }
            .logo { width: 48px; height: 48px; object-fit: contain; margin-bottom: 8px; }
            .brand { font-size: 14px; font-weight: 900; color: #0f172a; letter-spacing: 0.5px; }
            .sub-brand { font-size: 9px; font-weight: 800; color: #64748b; letter-spacing: 2px; text-transform: uppercase; }
            
            .student-name { font-size: 22px; font-weight: 900; color: #6366f1; margin: 10px 0; text-transform: uppercase; }
            
            .credentials {
                background: #f8fafc;
                border-radius: 12px;
                padding: 16px;
                width: 100%;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .cred-row {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
            }
            .icon { font-size: 18px; }
            .value { font-size: 18px; font-weight: 800; color: #334155; font-family: monospace; letter-spacing: 1px;}
            .welcome { margin-top: 16px; font-size: 11px; font-weight: 700; color: #94a3b8; }
            .cut-icon { position: absolute; top: -10px; left: -10px; font-size: 16px; background: #f8fafc; }
        </style>
    </head>
    <body>
        <div class="grid-container">
    `;

    cls.students.forEach(s => {
        html += `
            <div class="card">
                <div class="cut-icon">✂️</div>
                <div class="card-header">
                    <img src="/pwa-192x192.png" class="logo" />
                    <div class="brand">BERKANT HOCA</div>
                    <div class="sub-brand">Eğitim Platformu</div>
                </div>
                <div class="student-name">🧑‍🎓 ${s.name}</div>
                <div class="credentials">
                    <div class="cred-row">
                        <span class="icon">👤</span>
                        <span class="value">${s.username}</span>
                    </div>
                    <div class="cred-row">
                        <span class="icon">🔑</span>
                        <span class="value">${s.password}</span>
                    </div>
                </div>
                <div class="welcome">Platforma Hoş Geldin! Başarılar Dileriz 🚀</div>
            </div>
        `;
    });

    html += `
        </div>
        <script>
            window.onload = function() { setTimeout(function() { window.print(); }, 400); };
            window.onafterprint = function() { window.close(); };
        </script>
    </body>
    </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
};

export const generateStudentReport = async (cls, student) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Lütfen tarayıcınızın Pop-up engelleyicisini kapatın!');
        return;
    }

    // Fetch student trials
    let studentTrials = [];
    try {
        const trialsQuery = query(collection(db, 'trials'), where('studentId', '==', student.id));
        const trialsSnap = await getDocs(trialsQuery);
        studentTrials = trialsSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => new Date(a.date) - new Date(b.date));
    } catch (e) {
        console.error("Deneme verileri çekilemedi:", e);
    }

    const stats = calculateStats([student], cls.topics);
    const percentage = stats.percentage || 0;
    const dateStr = new Date().toLocaleDateString('tr-TR');

    // Calculate SVG circle properties
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>${student.name} - İlerleme Raporu</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
            @page { margin: 0; size: A4; }
            body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                color: #0f172a;
                padding: 40px;
                margin: 0;
                background: #ffffff;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 3px solid #f1f5f9;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }
            .logo-area { display: flex; align-items: center; gap: 16px; }
            .logo-img { width: 64px; height: 64px; object-fit: contain; }
            .brand-title { font-size: 24px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; }
            .brand-sub { font-size: 11px; font-weight: 800; color: #6366f1; letter-spacing: 2.5px; text-transform: uppercase; }
            
            .report-meta { text-align: right; }
            .date-badge { background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 10px; display: inline-flex; flex-direction: column; align-items: flex-end; }
            .date-label { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; }
            .date-val { font-size: 14px; font-weight: 800; color: #334155; }

            .hero-card {
                background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
                border: 2px solid #e2e8f0;
                border-radius: 24px;
                padding: 24px 32px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 30px;
                box-shadow: 0 10px 25px -5px rgba(0,0,0,0.02);
            }
            .student-info h2 { margin: 0 0 8px 0; font-size: 28px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: -0.5px; display: flex; align-items: center; gap: 10px;}
            .student-info p { margin: 0; font-size: 14px; font-weight: 700; color: #64748b; display: flex; align-items: center; gap: 6px; }
            
            .progress-circle { position: relative; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; }
            .progress-circle svg { transform: rotate(-90deg); width: 80px; height: 80px; }
            .progress-circle circle { fill: none; stroke-width: 8; stroke-linecap: round; }
            .progress-bg { stroke: #e2e8f0; }
            .progress-fill { stroke: #6366f1; stroke-dasharray: ${circumference}; stroke-dashoffset: ${strokeDashoffset}; transition: stroke-dashoffset 1s ease-out; }
            .progress-text { position: absolute; font-size: 18px; font-weight: 900; color: #0f172a; }

            .section-title { font-size: 16px; font-weight: 900; color: #1e293b; margin: 30px 0 15px 0; display: flex; align-items: center; gap: 8px; text-transform: uppercase; letter-spacing: 1px; }
            
            table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 20px; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; }
            th { background-color: #f8fafc; color: #64748b; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 16px; text-align: left; border-bottom: 1px solid #e2e8f0; }
            td { padding: 16px; font-size: 13px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: middle; word-break: break-word; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            tr:last-child td { border-bottom: none; }
            
            .topic-title { font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 4px; display: block; }
            .source-title { font-size: 11px; font-weight: 700; color: #64748b; display: flex; align-items: center; gap: 4px; }
            
            .badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 8px; }
            .badge-done { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
            .badge-missing { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
            .badge-assigned { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
            .badge-exempt { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
            
            .note-box { background: #fefce8; border: 1px dashed #fde047; padding: 10px 14px; border-radius: 10px; font-size: 12px; font-weight: 600; color: #854d0e; line-height: 1.5; position: relative; word-break: break-word; overflow-wrap: break-word; white-space: pre-wrap; }
            .note-box::before { content: '✍️'; position: absolute; top: -10px; left: -10px; background: #fff; border-radius: 50%; padding: 2px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); font-size: 14px;}
            .empty-note { color: #cbd5e1; font-weight: 700; font-style: italic; }

            .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px; page-break-inside: avoid; }
            .stat-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; text-align: center; }
            .stat-val { font-size: 28px; font-weight: 900; margin-bottom: 4px; }
            .stat-label { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }

            .subj-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; page-break-inside: avoid; }
            .subj-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; text-align: center; }
            .subj-title { font-size: 11px; font-weight: 800; color: #64748b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
            .subj-row { font-size: 10px; color: #475569; display: flex; justify-content: space-between; margin-bottom: 4px; }
            .subj-row-avg { font-size: 11px; color: #6366f1; display: flex; justify-content: space-between; margin-top: 6px; padding-top: 6px; border-top: 1px dashed #cbd5e1; font-weight: 800; }

        </style>
    </head>
    <body>
        <div class="header">
            <div class="logo-area">
                <img src="/pwa-192x192.png" class="logo-img" alt="Logo" />
                <div>
                    <div class="brand-title">BERKANT HOCA</div>
                    <div class="brand-sub">Eğitim Platformu</div>
                </div>
            </div>
            <div class="report-meta">
                <div class="date-badge">
                    <span class="date-label">📅 Rapor Tarihi</span>
                    <span class="date-val">${dateStr}</span>
                </div>
            </div>
        </div>

        <div class="hero-card">
            <div class="student-info">
                <h2>🧑‍🎓 ${student.name}</h2>
                <p>🏫 ${cls.className} Sınıfı Raporu</p>
            </div>
            
            <div style="display:flex; align-items:center; gap: 16px;">
                <div style="text-align: right;">
                    <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Genel Başarı</div>
                    <div style="font-size: 13px; font-weight: 700; color: #0f172a;">Ödev Tamamlama</div>
                </div>
                <div class="progress-circle">
                    <svg>
                        <circle class="progress-bg" cx="40" cy="40" r="${radius}"></circle>
                        <circle class="progress-fill" cx="40" cy="40" r="${radius}"></circle>
                    </svg>
                    <span class="progress-text">%${percentage}</span>
                </div>
            </div>
        </div>

        <div class="section-title">📚 Müfredat ve Ödev Durumu</div>
        <table>
            <thead>
                <tr>
                    <th style="width: 40%;">Konu ve Kaynak</th>
                    <th style="width: 20%;">Durum</th>
                    <th style="width: 40%;">Öğretmen Notu</th>
                </tr>
            </thead>
            <tbody>`;

    cls.topics.forEach(topic => {
        topic.subColumns.forEach(col => {
            const statusId = student.grades?.[col.id] || 'assigned';
            let badgeClass = 'badge-assigned';
            let statusLabel = '⏳ Verildi';
            
            if (statusId === 'done') { badgeClass = 'badge-done'; statusLabel = '✅ Yapıldı'; }
            else if (statusId === 'missing') { badgeClass = 'badge-missing'; statusLabel = '❌ Eksik'; }
            else if (statusId === 'exempt') { badgeClass = 'badge-exempt'; statusLabel = '➖ Muaf'; }

            const note = student.assignmentNotes?.[col.id] || '';
            const noteContent = note ? `<div class="note-box">${note}</div>` : `<span class="empty-note">-</span>`;

            html += `
                <tr>
                    <td>
                        <span class="topic-title">${topic.title}</span>
                        <span class="source-title">📖 ${col.title}</span>
                    </td>
                    <td><span class="badge ${badgeClass}">${statusLabel}</span></td>
                    <td>${noteContent}</td>
                </tr>`;
        });
    });

    html += `
            </tbody>
        </table>`;

    let chartScript = '';

    if (studentTrials.length > 0) {
        const trialAvg = (studentTrials.reduce((a, c) => a + c.totalNet, 0) / studentTrials.length).toFixed(1);
        const trialMax = Math.max(...studentTrials.map(t => t.totalNet)).toFixed(1);

        // Chart Data Extraction
        const chartLabels = JSON.stringify(studentTrials.map(t => t.title || 'Deneme'));
        const chartDataArray = JSON.stringify(studentTrials.map(t => t.totalNet));

        chartScript = `
            const ctx = document.getElementById('trialChart').getContext('2d');
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ${chartLabels},
                    datasets: [{
                        label: 'Toplam Net',
                        data: ${chartDataArray},
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        borderWidth: 3,
                        pointBackgroundColor: '#ffffff',
                        pointBorderColor: '#6366f1',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false, // Print için hemen render olması lazım
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { color: '#64748b', font: { size: 10 } } },
                        x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 } } }
                    }
                }
            });
        `;

        // TYT Branş İstatistikleri (Max, Min, Avg)
        const tytTrials = studentTrials.filter(t => t.type === 'TYT' && t.details);
        let tytStatsHtml = '';
        let tytAnalysisHtml = '';

        if (tytTrials.length > 0) {
            const getSubjStats = (subj) => {
                const vals = tytTrials.map(t => t.details[subj] || 0);
                if (vals.length === 0) return { max: 0, min: 0, avg: 0 };
                return {
                    max: Math.max(...vals).toFixed(1),
                    min: Math.min(...vals).toFixed(1),
                    avg: (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
                };
            };
            
            const turkce = getSubjStats('turkce');
            const mat = getSubjStats('mat');
            const sosyal = getSubjStats('sosyal');
            const fen = getSubjStats('fen');

            if (tytTrials.length > 1) {
                const first = tytTrials[0];
                const last = tytTrials[tytTrials.length - 1];
                const subjects = [
                    { id: 'turkce', name: 'Türkçe' },
                    { id: 'mat', name: 'Matematik' },
                    { id: 'sosyal', name: 'Sosyal' },
                    { id: 'fen', name: 'Fen' }
                ];
                
                const changes = subjects.map(sub => {
                    const firstNet = first.details?.[sub.id] || 0;
                    const lastNet = last.details?.[sub.id] || 0;
                    return { name: sub.name, change: lastNet - firstNet };
                });
                
                const strongest = changes.reduce((prev, current) => (prev.change > current.change) ? prev : current);
                const weakest = changes.reduce((prev, current) => (prev.change < current.change) ? prev : current);

                tytAnalysisHtml = `
                <div style="background: #ecfdf5; border: 1px dashed #34d399; padding: 15px; border-radius: 12px; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                    <div style="font-size: 24px;">🚀</div>
                    <div>
                        <div style="font-size: 11px; font-weight: 800; color: #059669; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.5px;">Ders Bazlı Gelişim Analizi</div>
                        <div style="font-size: 13px; color: #064e3b;">
                            Son denemelere göre en güçlü dersin: <strong style="color: #059669;">${strongest.name}</strong> (${strongest.change > 0 ? '+' : ''}${strongest.change.toFixed(2)} net), 
                            En zayıf dersin: <strong style="color: #e11d48;">${weakest.name}</strong> (${weakest.change > 0 ? '+' : ''}${weakest.change.toFixed(2)} net).
                        </div>
                    </div>
                </div>`;
            }
            
            tytStatsHtml = `
            <div style="page-break-inside: avoid; margin-bottom: 25px;">
                <div class="section-title" style="font-size: 13px;">📌 TYT Branş Analizi</div>
                <div class="subj-grid">
                    <div class="subj-card">
                        <div class="subj-title">TÜRKÇE</div>
                        <div class="subj-row"><span>Max:</span> <strong>${turkce.max}</strong></div>
                        <div class="subj-row"><span>Min:</span> <strong>${turkce.min}</strong></div>
                        <div class="subj-row-avg"><span>Ort:</span> <strong>${turkce.avg}</strong></div>
                    </div>
                    <div class="subj-card">
                        <div class="subj-title">MATEMATİK</div>
                        <div class="subj-row"><span>Max:</span> <strong>${mat.max}</strong></div>
                        <div class="subj-row"><span>Min:</span> <strong>${mat.min}</strong></div>
                        <div class="subj-row-avg"><span>Ort:</span> <strong>${mat.avg}</strong></div>
                    </div>
                    <div class="subj-card">
                        <div class="subj-title">SOSYAL</div>
                        <div class="subj-row"><span>Max:</span> <strong>${sosyal.max}</strong></div>
                        <div class="subj-row"><span>Min:</span> <strong>${sosyal.min}</strong></div>
                        <div class="subj-row-avg"><span>Ort:</span> <strong>${sosyal.avg}</strong></div>
                    </div>
                    <div class="subj-card">
                        <div class="subj-title">FEN</div>
                        <div class="subj-row"><span>Max:</span> <strong>${fen.max}</strong></div>
                        <div class="subj-row"><span>Min:</span> <strong>${fen.min}</strong></div>
                        <div class="subj-row-avg"><span>Ort:</span> <strong>${fen.avg}</strong></div>
                    </div>
                </div>
            </div>`;
        }

        html += `
        <div style="page-break-before: always; padding-top: 20px;">
            <div class="section-title">📈 Gelişim Grafiği (Toplam Net)</div>
            <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 15px; margin-bottom: 25px; box-sizing: border-box; overflow: hidden; display: block;">
                <div style="position: relative; width: 100%; max-width: 100%; height: 180px;">
                    <canvas id="trialChart"></canvas>
                </div>
            </div>

            ${tytAnalysisHtml}
            ${tytStatsHtml}

            <div class="section-title">📊 Deneme Sınavı Özeti</div>
            <div class="stats-grid">
                <div class="stat-card" style="border-color: #bbf7d0; background: #f0fdf4;">
                    <div class="stat-val" style="color: #15803d;">${studentTrials.length}</div>
                    <div class="stat-label">Çözülen Deneme</div>
                </div>
                <div class="stat-card" style="border-color: #fde68a; background: #fefce8;">
                    <div class="stat-val" style="color: #b45309;">${trialAvg}</div>
                    <div class="stat-label">Ortalama Net</div>
                </div>
                <div class="stat-card" style="border-color: #fecdd3; background: #fff1f2;">
                    <div class="stat-val" style="color: #be123c;">${trialMax}</div>
                    <div class="stat-label">En Yüksek Net</div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 15%;">Tarih</th>
                        <th style="width: 25%;">Deneme Adı</th>
                        <th style="width: 15%;">Sınav Türü</th>
                        <th style="width: 30%;">Branş Netleri</th>
                        <th style="width: 15%;">Toplam Net</th>
                    </tr>
                </thead>
                <tbody>`;

        studentTrials.forEach(trial => {
            const trialDate = trial.date ? new Date(trial.date).toLocaleDateString('tr-TR') : '-';
            let detailStr = '';
            if (trial.details) {
                if (trial.type === 'TYT') {
                    detailStr = `Türkçe: ${trial.details.turkce?.toFixed(1) || '0'} | Mat: ${trial.details.mat?.toFixed(1) || '0'}<br/>Sosyal: ${trial.details.sosyal?.toFixed(1) || '0'} | Fen: ${trial.details.fen?.toFixed(1) || '0'}`;
                } else if (trial.type === 'AYT') {
                    detailStr = `Edb: ${trial.details.edebiyat?.toFixed(1) || '0'} | Mat: ${trial.details.matAyt?.toFixed(1) || '0'}<br/>Fen: ${trial.details.fenAyt?.toFixed(1) || '0'} | Sos: ${trial.details.sosyalAyt?.toFixed(1) || '0'}`;
                }
            }
            html += `
                    <tr>
                        <td><strong>📅 ${trialDate}</strong></td>
                        <td><strong>${trial.title}</strong></td>
                        <td><span class="badge ${trial.type === 'TYT' ? 'badge-done' : 'badge-missing'}">${trial.type}</span></td>
                        <td style="font-size: 11px; color: #64748b; line-height: 1.4;">${detailStr}</td>
                        <td><span style="font-size: 18px; font-weight: 900; color: #6366f1;">🎯 ${trial.totalNet}</span></td>
                    </tr>`;
        });

        html += `
                </tbody>
            </table>
        </div>`;
    }

    html += `
        <script>
            window.onload = function() {
                ${chartScript}
                setTimeout(function() { window.print(); }, 800);
            };
            window.onafterprint = function() {
                window.close();
            };
        </script>
    </body>
    </html>`;

    printWindow.document.write(html);
    printWindow.document.close();
};
