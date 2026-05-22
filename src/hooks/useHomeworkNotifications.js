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
                        text: `${topic.title} ödevinin teslimine 24 saatten az kaldı. Lütfen tamamlayıp derse gelirken yanında getirmeyi unutma!`,
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
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'granted') {
            const storedShown = JSON.parse(localStorage.getItem('bh_shownLocalNotifications') || '[]');
            const shownSet = new Set(storedShown);
            let hasNew = false;

            localNotifications.forEach(notif => {
                if (!shownSet.has(notif.id)) {
                    shownSet.add(notif.id);
                    hasNew = true;
                    new Notification(notif.title, {
                        body: notif.text,
                        icon: '/pwa-192x192.png'
                    });
                }
            });

            if (hasNew) {
                localStorage.setItem('bh_shownLocalNotifications', JSON.stringify(Array.from(shownSet)));
            }
        }
    }, [localNotifications]);

    return localNotifications;
};
