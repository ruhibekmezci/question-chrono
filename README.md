# ⏱️ Soru Süre Ölçer Ultimate (Question Chrono)

KPSS, YKS, ALES veya DGS... Hangi sınava hazırlanıyorsan hazırlan, en büyük düşmanın zaman. Bu proje, test çözerken her soruya ne kadar vakit ayırdığını takip etmeni sağlayan, **sesli uyarı sistemli**, **geri sayım modlu** ve kurulum gerektirmeyen pratik bir araçtır.

"Hangi soruda takıldım?", "Sınavı yetiştirebiliyor muyum?", "Ortalamam kaç?" dertlerine son. İndir ve çift tıkla; hepsi bu.

## 🔥 Özellikler

* **İki Farklı Çalışma Modu:**
    * **Kronometre (İleri Say):** Rahat çalışma seansları için.
    * **Geri Sayım (Sınav Modu):** Gerçek sınav simülasyonu. Süre bittiğinde **otomatik durur ve alarm çalar.**
* **Sesli ve Görsel Uyarı Sistemi:**
    * Belirlenen soru limitini (örn: 120 sn) aştığında ekran **kırmızı** olur ve kısa bir **"Bip"** sesiyle uyarır.
    * Sınav süresi bittiğinde **3 kez uzun alarm** çalarak kalemi bırakman gerektiğini hatırlatır.
* **Klavye Odaklı Kontrol:** Fareye dokunmadan testi yönet.
    * `Space`: Sonraki soruya geç.
    * `S`: Sayacı durdur/başlat.
    * `Backspace`: Yanlışlıkla geçiş yaptıysan son soruyu sil.
    * `R`: Her şeyi sıfırla.
* **Detaylı Raporlama (.TXT):** Sadece süreleri değil; **Ders, Konu, Yayınevi** bilgilerini, limit aşan soruları, en hızlı/en yavaş çözülenleri içeren profesyonel bir rapor indirir.
* **Akıllı Kısayollar:** Bilgi girişi yaparken (input alanlarında) kısayol tuşları devre dışı kalır, böylece yazı yazarken yanlışlıkla sayacı tetiklemezsin.
* **Kurulumsuz:** Tek bir `.html` dosyasıdır. İnternet olmasa bile çalışır.

## 🚀 Kurulum ve Çalıştırma

Bu proje **"Single File Application"** (Tek Dosya Uygulaması) yapısındadır. Node.js, React veya sunucu kurulumuna gerek yoktur.

1.  `index.html` dosyasını indir.
2.  Dosyaya çift tıkla.
3.  Tarayıcında açılacaktır. İyi çalışmalar!

## 🎮 Kullanım Kılavuzu

1.  **Ayarları Yap:** Üst kısımdan **Ders, Konu** bilgilerini gir.
2.  **Modu Seç:** Sadece soru mu çözeceksin yoksa 40 dakikalık bir deneme mi yapacaksın? Modu seç (Kronometre/Geri Sayım).
3.  **Başlat:** `Başlat` butonuna bas veya klavyeden `S` tuşuna dokun.
4.  **Soru Çöz:** Soruyu bitirince `Space` tuşuna bas. Süre kaydedilir ve sayaç sıfırlanıp yeni soru için akmaya başlar.
5.  **Raporla:** Çalışman bitince **📥 .TXT İndir** butonuna basarak detaylı analizini al.

## 🛠️ Kullanılan Teknolojiler

* **HTML5 & CSS3:** Modern ve duyarlı (responsive) tasarım.
* **Vanilla JavaScript (ES6+):** Harici kütüphane bağımlılığı yok. Saf ve hızlı kod.
* **Web Audio API:** Harici ses dosyası yüklemeden, tarayıcının kendi içinde dijital sesler (Bip/Alarm) üretmesini sağlayan teknoloji.

## 🤝 İpucu

Tarayıcın ses çalmaya izin vermezse sayfada herhangi bir yere (örneğin "Başlat" butonuna) bir kez tıklaman yeterlidir. Modern tarayıcılar kullanıcı etkileşimi olmadan ses çalınmasını engeller.

---
