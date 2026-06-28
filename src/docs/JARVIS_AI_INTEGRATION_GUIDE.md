# Jarvis Yapay Zeka Ajanı (Visual Agent) Entegrasyon Rehberi

Bu belge, projeye gelecekte eklenecek yeni butonların, formların ve arayüz elemanlarının **Jarvis** tarafından nasıl %100 isabetle bulunup kullanılabileceğini açıklamak için yapay zeka ajanlarına ve geliştiricilere bırakılmış bir **KALICI NOTTUR**.

## 🧠 Jarvis Nasıl Görmektedir?
Jarvis'in gözü olan `VirtualAgentCursor.jsx`, ekrandaki öğeleri "Ağırlıklı Puanlama Algoritması" (Scoring-Based Resolver) ile bulur. Bir HTML öğesinin Jarvis tarafından bulunabilmesi için şu özellikleri okur:
1. `textContent` (Ekranda yazan düz metin)
2. `placeholder` (Input içi gölge metin)
3. `title` (Fare üzerine gelince çıkan tooltip)
4. `id`
5. `data-jarvis-target` **(EN YÜKSEK ÖNCELİKLİ KESİN EŞLEŞTİRİCİ)**

## ⚠️ Kritik Kural: Yeni Buton/Özellik Eklerken Yapılması Gerekenler

Eğer projeye sadece "İkon" içeren (Örn: Sadece Çöp Kutusu, Kalem, Artı, Menü) bir buton eklerseniz, Jarvis bunun ne işe yaradığını **GÖREMEZ**. Ekranda metin olmadığı için tıklayamaz.

### Çözüm 1: `title` Etiketi Eklemek (Önerilen)
Sadece ikon olan butonlara muhakkak `title` ekleyin.
```jsx
// YANLIŞ: Jarvis ne işe yaradığını bilmez.
<button onClick={deleteItem}><Trash2 size={16}/></button>

// DOĞRU: Jarvis "Sil" dendiğinde bu butonu bulur.
<button title="Sil" onClick={deleteItem}><Trash2 size={16}/></button>
```

### Çözüm 2: Karmaşık Modallar İçin `data-jarvis-target` Eklemek (Zorunlu)
Eğer ekranda aynı isimli birden fazla buton varsa (Örn: Hem ana ekranda "Kaydet" var, hem de Modal içinde "Kaydet" var), Jarvis'in kafası karışabilir. Hedefin %100 o buton olduğundan emin olmak için `data-jarvis-target` özelliğini kullanın.
```jsx
// Jarvis'in kesin hedeflemesi için:
<button data-jarvis-target="modal-ogrenci-kaydet-buton" onClick={save}>
    KAYDET
</button>
```
Sistem Prompt'u içerisinde Jarvis'e hedef olarak `"modal-ogrenci-kaydet-buton"` metnini yollamasını söylerseniz, puanlama algoritması doğrudan +100 puan vererek milimetrik olarak o butona tıklayacaktır.

## 🤖 Proaktif Oluşturma (Auto-Creation) Mantığı
Jarvis'e bir özellik eklerken, sadece "var olan butonlara tıklama" mantığıyla değil, "olmayan bir şeyi sıfırdan oluşturma" mantığıyla promptlar yazın.
*   **Örnek:** Kullanıcı "Trigonometri ödevi ekle" dediğinde, Jarvis ekranda "Trigonometri" aramamalıdır. 
*   **ReAct Döngüsü:** Jarvis önce "Yeni Ana Konu Başlığı" isimli *input alanını* bulmalı, oraya `type` eylemi ile "Trigonometri" yazmalı ve sonrasında "EKLE" butonuna `click` eylemi ile basmalıdır.

### Özet Geliştirici Formülü:
1. Her ikona `title` ver.
2. Karışabilecek butonlara `data-jarvis-target` ver.
3. Jarvis'e hedef (target) gönderirken asla XPath (Örn: `//button`) KULLANMA. Sadece düz metin gönder.
