// DO NOT MODIFY THIS FILE - MANAGED BY AI FOR SECURITY
// This Netlify Function securely communicates with OneSignal to send push notifications.
// It uses Environment Variables to ensure API keys are never exposed to the client.

exports.handler = async (event, context) => {
    // Sadece POST isteklerine izin ver
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const body = JSON.parse(event.body);
        const { title, text, targetClasses, targetVipStudents } = body;

        const appId = process.env.VITE_ONESIGNAL_APP_ID;
        const apiKey = process.env.ONESIGNAL_REST_API_KEY;

        if (!appId || !apiKey) {
            console.error("OneSignal App ID or API Key is missing in environment variables.");
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Server configuration error (missing keys)" })
            };
        }

        // Hedef kitleyi belirle
        let includeAliases = null; // OneSignal login ID'leri
        let isGlobal = false;

        // Tüm öğrencilere gönderilecek mi?
        if (targetClasses.includes('all') || targetVipStudents.includes('all')) {
            isGlobal = true; // OneSignal'de herkese göndermek için "included_segments": ["Total Subscriptions"] veya "All" kullanılır
        } else {
            // Sınıf veya VIP id'lerine göre özel hedefleme
            // Öğretmen panelinden gönderirken, sınıfların içindeki öğrenci ID'lerini bulup buraya parametre olarak eklememiz gerekir.
            // Bu yüzden TeacherDashboard'da hedef öğrencilerin ID'lerini (aliases) toplayıp fonksiyona paslayacağız.
            if (body.targetStudentIds && body.targetStudentIds.length > 0) {
                includeAliases = { external_id: body.targetStudentIds };
            } else {
                return { statusCode: 400, body: JSON.stringify({ error: "No target students specified." }) };
            }
        }

        const oneSignalPayload = {
            app_id: appId,
            headings: { "en": title, "tr": title },
            contents: { "en": text, "tr": text },
        };

        if (isGlobal) {
            oneSignalPayload.included_segments = ["Total Subscriptions"];
        } else {
            // Spesifik kullanıcılara gönder (external_id üzerinden)
            oneSignalPayload.include_aliases = includeAliases;
            oneSignalPayload.target_channel = "push";
        }

        const response = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${apiKey}`
            },
            body: JSON.stringify(oneSignalPayload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("OneSignal Error:", data);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: "OneSignal error", details: data })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, data })
        };

    } catch (error) {
        console.error("Netlify Function Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error", message: error.message })
        };
    }
};
