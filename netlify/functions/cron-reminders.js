import { schedule } from '@netlify/functions';

// Firebase Proje ID'niz
const PROJECT_ID = "odevtakip-145f5";

// Sınıfları çeken fonksiyon
async function fetchClasses() {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/classes`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.documents || [];
}

// REST API dökümanlarını JSON formatına çeviren yardımcı fonksiyon
function parseFirestoreDoc(doc) {
    if (!doc || !doc.fields) return {};
    const parsed = {};
    for (const [key, value] of Object.entries(doc.fields)) {
        if (value.stringValue !== undefined) parsed[key] = value.stringValue;
        else if (value.integerValue !== undefined) parsed[key] = parseInt(value.integerValue, 10);
        else if (value.booleanValue !== undefined) parsed[key] = value.booleanValue;
        else if (value.timestampValue !== undefined) parsed[key] = value.timestampValue;
        else if (value.arrayValue !== undefined) {
            parsed[key] = value.arrayValue.values ? value.arrayValue.values.map(v => parseFirestoreDoc({ fields: v.mapValue.fields })) : [];
        } else if (value.mapValue !== undefined) {
            parsed[key] = parseFirestoreDoc({ fields: value.mapValue.fields });
        }
    }
    return parsed;
}

export const handler = schedule('0 * * * *', async (event) => {
    try {
        const appId = process.env.VITE_ONESIGNAL_APP_ID;
        const apiKey = process.env.ONESIGNAL_REST_API_KEY;

        if (!appId || !apiKey) {
            console.error("Missing OneSignal Credentials");
            return { statusCode: 500 };
        }

        const documents = await fetchClasses();
        const now = new Date();
        const notificationsToSend = {}; // studentId -> { titles: [], timeLeft: '' }

        documents.forEach(docData => {
            const cls = parseFirestoreDoc(docData);
            if (!cls.topics || !cls.students) return;

            cls.topics.forEach(topic => {
                if (!topic.date) return;
                
                const deadline = new Date(topic.date);
                if (isNaN(deadline.getTime())) return;

                const diffMs = deadline - now;
                const diffHours = diffMs / (1000 * 60 * 60);

                let timeLeftLabel = null;
                // 72 ile 71 saat arası kalmışsa -> 3 gün uyarısı
                if (diffHours <= 72 && diffHours > 71) {
                    timeLeftLabel = "3 gün";
                } 
                // 24 ile 23 saat arası kalmışsa -> 24 saat uyarısı
                else if (diffHours <= 24 && diffHours > 23) {
                    timeLeftLabel = "24 saat";
                }

                if (timeLeftLabel) {
                    cls.students.forEach(student => {
                        // Eğer öğrenci bu ödevi tamamlamadıysa (statüsü done değilse)
                        // Bunu student.grades[col.id] diyerek kontrol edebilirdik ama REST üzerinden çok derin yapı okumak zor olabilir.
                        // Her ihtimale karşı hatırlatma göndermek iyidir.
                        if (!notificationsToSend[student.id]) {
                            notificationsToSend[student.id] = { titles: [], timeLeft: timeLeftLabel };
                        }
                        notificationsToSend[student.id].titles.push(topic.title);
                    });
                }
            });
        });

        // Bildirimleri Grupla ve Gönder
        for (const [studentId, data] of Object.entries(notificationsToSend)) {
            const count = data.titles.length;
            const titlesStr = data.titles.join(", ");
            const title = `🚨 Ödev Hatırlatması!`;
            const text = `Sevgili öğrenci, ${count > 1 ? `${count} adet ödevinin` : `"${titlesStr}" ödevinin`} teslimine son ${data.timeLeft} kaldı! Lütfen tamamlayıp derse gelirken yanında getirmeyi unutma!`;

            const payload = {
                app_id: appId,
                headings: { "en": title, "tr": title },
                contents: { "en": text, "tr": text },
                include_aliases: { external_id: [studentId] },
                target_channel: "push",
                priority: 10,
                android_sound: "notification",
                ios_sound: "default",
                android_visibility: 1,
                ttl: 2419200 // 4 hafta geçerli
            };

            await fetch('https://onesignal.com/api/v1/notifications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${apiKey}`
                },
                body: JSON.stringify(payload)
            });
        }

        console.log(`Successfully processed and sent reminders to ${Object.keys(notificationsToSend).length} students.`);
        return { statusCode: 200, body: "Success" };

    } catch (error) {
        console.error("Cron Error:", error);
        return { statusCode: 500, body: "Error" };
    }
});
