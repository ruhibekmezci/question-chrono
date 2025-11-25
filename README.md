# ⏱️ Soru Süre Ölçer (Question Chrono)

KPSS, YKS, ALES veya DGS... Hangi sınava hazırlanıyorsan hazırlan, en büyük düşmanın zaman. Bu proje, test çözerken her soruya ne kadar vakit ayırdığını takip etmeni sağlayan, klavye odaklı, pratik bir React uygulamasıdır.

"Hangi soruda takıldım?", "Ortalamam kaç?", "Toplam kaç dakika gitti?" dertlerine son.

## 🔥 Özellikler

* **Klavye Odaklı Kontrol:** Fareye dokunmadan testi yönet.
    * `Space`: Sonraki soruya geç.
    * `S`: Sayacı durdur/başlat.
    * `Backspace` / `U`: Yanlışlıkla geçiş yaptıysan geri al.
    * `R`: Her şeyi sıfırla.
* **Akıllı Kısayollar:** Soru etiketini değiştirmek için yazı yazarken `Space` tuşu sayacı tetiklemez (sinir krizi engellendi).
* **Görsel Uyarı Sistemi:** Varsayılan olarak 120 saniyeyi (2 dk) geçen sorularda süre kırmızıya döner. Bu süreyi ayarlardan değiştirebilirsin.
* **Veri Kaybı Yok:** Sayfayı yenilesen bile verilerin `localStorage` sayesinde korunur. Kaldığın yerden devam edersin.
* **Analiz:** En hızlı, en yavaş ve ortalama çözüm sürelerini anlık gösterir.
* **Dışa Aktarma:** Çözdüğün testin istatistiklerini Kopyala butonuyla alabilir veya CSV (Excel) formatında indirebilirsin.
* **Performanslı:** Gereksiz render işlemlerinden arındırılmış, yağ gibi akan kod yapısı.

## 🚀 Kurulum ve Çalıştırma

Bu proje tek bir React bileşeni olarak tasarlandı ama modern bir React ortamında (Vite, CRA, Next.js) çalıştırılması önerilir.

### Gereksinimler

Projede ikonlar için `lucide-react` ve stil için `Tailwind CSS` kullanılmıştır.

1.  Paketleri yükle:
    ```bash
    npm install lucide-react
    ```

2.  Bileşeni (`QuestionStopwatch.jsx`) projene dahil et ve kullan:
    ```jsx
    import QuestionStopwatch from './QuestionStopwatch';

    function App() {
      return (
        <QuestionStopwatch />
      );
    }
    ```

## 🎮 Kullanım Kılavuzu

1.  **Başlat:** Sayfayı aç, "Başlat" butonuna bas veya manuel başla.
2.  **Soru Çöz:** Soruyu çözdün mü? Yapıştır `Space` tuşuna. Süre kaydedilir, sayaç sıfırlanıp bir sonraki soru için akmaya başlar.
3.  **Etiketle:** Tabloda "Soru 1" yazan yere tıklayıp "Matematik Zor Soru" gibi notlar alabilirsin.
4.  **Bitir:** Test bitince ister tabloyu kopyala notlarına yapıştır, ister CSV olarak indir arşivle.

## 🛠️ Kullanılan Teknolojiler

* **React:** (Hooks: useState, useEffect, useMemo, useRef)
* **Tailwind CSS:** Hızlı ve modern stillendirme.
* **Lucide React:** Temiz ikon seti.
* **LocalStorage API:** Veri kalıcılığı için.

## 🤝 Katkıda Bulunma

Fork'la, geliştir, PR at. "Şuraya bir de grafik eklesek fena olmazdı" dersen beklerim.

---
*Gibi* dizisindeki Yılmaz'ın dediği gibi: "Bunu bu kadar büyütmeye gerek yok." Basit, işlevsel, bitti gitti.
