import { useMemo, useEffect, useRef } from 'react';

export const useHomeworkNotifications = (loggedInStudent, selectedClass) => {
    const hasRequestedPermission = useRef(false);

    useEffect(() => {
        if (!hasRequestedPermission.current && 'Notification' in window) {
            hasRequestedPermission.current = true;
            if (Notification.permission === 'default') {
                Notification.requestPermission();
            }
        }
    }, []);

    const localNotifications = useMemo(() => {
        if (!loggedInStudent || !selectedClass || !selectedClass.topics) return [];

        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const notifications = [];

        selectedClass.topics.forEach(topic => {
            if (!topic.date) return;
            const topicDate = new Date(topic.date);
            
            // Eğer ödev tarihi yarına kadarsa ve geçmişte değilse (veya geçmişte de olsa henüz yapılmamışsa uyar)
            // Biz sadece son 24 saate giren (now ile tomorrow arası) veya süresi geçmiş ödevleri kontrol edelim.
            // Fakat sadece son 24 saate girenlere odaklanalım: "son 24 saat kala ödevi yapıldı olarak işaretlenmeyen"
            const timeDiff = topicDate.getTime() - now.getTime();
            const hoursLeft = timeDiff / (1000 * 60 * 60);

            if (hoursLeft > 0 && hoursLeft <= 24) {
                // Topic altındaki tüm column'ları kontrol et
                let allDone = true;
                if (topic.subColumns && topic.subColumns.length > 0) {
                    topic.subColumns.forEach(col => {
                        const status = loggedInStudent.grades?.[col.id];
                        if (status !== 'done' && status !== 'exempt') {
                            allDone = false;
                        }
                    });
                } else {
                    allDone = false; // Sütun yoksa ödev de yapılamaz
                }

                if (!allDone) {
                    notifications.push({
                        id: `hw-alert-${topic.id}`,
                        title: '⏰ Son 24 Saat!',
                        text: `${topic.title} ödevinin teslimine 24 saatten az kaldı. Lütfen tamamlayıp işaretlemeyi unutma!`,
                        timestamp: now.toISOString(),
                        type: 'homework_alert',
                        isLocal: true
                    });
                }
            }
        });

        return notifications;
    }, [loggedInStudent, selectedClass]);

    // Uygulama açıkken yerel bildirim (OS Notification) gösterme
    const shownNotifications = useRef(new Set());
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'granted') {
            localNotifications.forEach(notif => {
                if (!shownNotifications.current.has(notif.id)) {
                    shownNotifications.current.add(notif.id);
                    new Notification(notif.title, {
                        body: notif.text,
                        icon: '/pwa-192x192.png'
                    });
                }
            });
        }
    }, [localNotifications]);

    return localNotifications;
};
