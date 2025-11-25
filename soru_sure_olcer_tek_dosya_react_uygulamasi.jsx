import React, { useEffect, useMemo, useRef, useState } from "react";
import { Download, Play, Square, SkipForward, RotateCcw, Scissors, Copy, Undo, AlertCircle, Settings } from "lucide-react";

// --- YARDIMCI FONKSİYONLAR ---

// Süreyi HH:MM:SS.cs formatına çevirir
function formatDuration(ms) {
  const sign = ms < 0 ? "-" : "";
  ms = Math.abs(ms);
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const centis = Math.floor((ms % 1000) / 10);
  const pad = (n, l = 2) => String(n).padStart(l, "0");
  return `${sign}${hours > 0 ? pad(hours) + ":" : ""}${pad(minutes)}:${pad(seconds)}.${pad(centis)}`;
}

function msToMinutes(ms) {
  return (ms / 60000);
}

// CSV İndirme
function downloadCSV(rows, filename = "soru-sureleri.csv") {
  const header = ["#", "Etiket", "Süre (ms)", "Süre (DK)", "Süre (MM:SS.cs)", "Kümülatif (MM:SS.cs)"];
  const lines = [header.join(",")];
  rows.forEach((r, i) => {
    lines.push([
      i + 1,
      '"' + (r.label || `Soru ${i + 1}`) + '"',
      r.duration,
      msToMinutes(r.duration).toFixed(3),
      formatDuration(r.duration),
      formatDuration(r.cumulative)
    ].join(","));
  });
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const STORAGE_KEY = "question-stopwatch-state-v2"; // Versiyonu güncelledim

// --- ALT BİLEŞENLER ---

// Performans için sayacı ayırdım. Sadece bu kısım saniyede 60 kez render olur.
function BigTimerDisplay({ running, startAt, accumulated }) {
  const now = useNow(running);
  const elapsed = accumulated + (running ? now - startAt : 0);
  
  return (
    <div className="font-mono tabular-nums text-5xl sm:text-6xl md:text-7xl tracking-tight select-none">
      {formatDuration(elapsed)}
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 shadow">
      <div className="text-neutral-400 text-xs">{label}</div>
      <div className="font-mono tabular-nums text-2xl mt-1">{value}</div>
      {sub ? <div className="text-neutral-500 text-xs mt-1">{sub}</div> : null}
    </div>
  );
}

// --- ANA BİLEŞEN ---

export default function QuestionStopwatch() {
  const [running, setRunning] = useState(false);
  const [startAt, setStartAt] = useState(0); 
  const [accumulated, setAccumulated] = useState(0); 
  const [lastSplitAt, setLastSplitAt] = useState(0);
  const [laps, setLaps] = useState([]); 
  const [nextLabel, setNextLabel] = useState("Soru 1");
  const [copied, setCopied] = useState(false);
  const [warningSeconds, setWarningSeconds] = useState(120); // Varsayılan 2 dk
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // State referansları (Event Listener içinde güncel state'e erişmek için)
  const stateRef = useRef({ running, laps, lastSplitAt, nextLabel, accumulated, startAt });

  useEffect(() => {
    stateRef.current = { running, laps, lastSplitAt, nextLabel, accumulated, startAt };
  }, [running, laps, lastSplitAt, nextLabel, accumulated, startAt]);

  // LocalStorage Yükleme
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const s = JSON.parse(raw);
      setRunning(false); 
      setStartAt(0);
      setAccumulated(s.accumulated || 0);
      setLastSplitAt(0);
      setLaps(Array.isArray(s.laps) ? s.laps : []);
      setNextLabel(s.nextLabel || "Soru 1");
      setWarningSeconds(s.warningSeconds || 120);
    } catch (e) {
      console.warn("State load error", e);
    }
  }, []);

  // LocalStorage Kaydetme
  useEffect(() => {
    const s = { accumulated, laps, nextLabel, warningSeconds };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }, [accumulated, laps, nextLabel, warningSeconds]);

  // Hesaplamalar
  const cumulativeRows = useMemo(() => {
    let sum = 0;
    return laps.map((l) => {
      sum += l.duration;
      return { ...l, cumulative: sum };
    });
  }, [laps]);

  const stats = useMemo(() => {
    if (laps.length === 0) return null;
    const durations = laps.map(l => l.duration);
    const total = durations.reduce((a, b) => a + b, 0);
    const avg = total / durations.length;
    const fastest = Math.min(...durations);
    const slowest = Math.max(...durations);
    return { total, avg, fastest, slowest };
  }, [laps]);

  // Toplam geçen süre (Stats ve display dışı kullanım için)
  // Not: BigTimerDisplay kendi içinde hesaplar, bu sadece anlık olmayan işlemler için.
  const totalElapsed = accumulated + (running ? Date.now() - startAt : 0);

  function inferNextLabel(currentLaps) {
    const base = "Soru ";
    const nums = currentLaps
      .map(l => (typeof l.label === 'string' && l.label.startsWith(base)) ? parseInt(l.label.slice(base.length), 10) : NaN)
      .filter(x => !isNaN(x));
    
    let n = 1;
    if (nums.length > 0) n = Math.max(...nums) + 1; 
    else n = currentLaps.length + 1;
    return base + n;
  }

  // --- EYLEMLER ---

  function startTimer() {
    const now = Date.now();
    setStartAt(now);
    setLastSplitAt(now);
    setRunning(true);
  }

  function stopTimer() {
    if (!running) return;
    setRunning(false);
    setAccumulated(accumulated + (Date.now() - startAt));
  }

  function handleStartStop() {
    if (running) stopTimer();
    else startTimer();
  }

  function handleNext() {
    const { running, lastSplitAt, nextLabel, laps } = stateRef.current;
    
    if (!running) {
      startTimer();
      return;
    }

    const now = Date.now();
    const duration = now - lastSplitAt;
    const label = nextLabel?.trim() || `Soru ${laps.length + 1}`;
    
    const newLaps = [...laps, { label, duration }];
    setLaps(newLaps);
    setLastSplitAt(now);

    // Otomatik etiket artırma mantığı
    const m = label.match(/^(.*?)(\d+)$/);
    if (m) {
      setNextLabel(`${m[1].trim()} ${parseInt(m[2], 10) + 1}`.replace(/\s+/, ' '));
    } else {
      setNextLabel(inferNextLabel(newLaps));
    }
  }

  function handleReset() {
    if (!window.confirm("Tüm veriler silinecek ve sayaç sıfırlanacak. Emin misin?")) return;
    setRunning(false);
    setStartAt(0);
    setAccumulated(0);
    setLastSplitAt(0);
    setLaps([]);
    setNextLabel("Soru 1");
  }

  function handleUndoSplit() {
    const { laps, running } = stateRef.current;
    if (!laps.length) return;
    
    const last = laps[laps.length - 1];
    setLaps(laps.slice(0, -1));
    
    if (running) {
      setLastSplitAt(Date.now());
    }
    setNextLabel(last.label);
  }

  function handleCopy() {
    const rows = cumulativeRows.map((r, i) => (
      `${i + 1}. ${r.label}\t${formatDuration(r.duration)}\t(kümülatif: ${formatDuration(r.cumulative)})`
    ));
    const text = rows.join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  }

  // --- KLAVYE KISAYOLLARI ---

  useEffect(() => {
    function onKey(e) {
      if (e.repeat) return;
      
      // Kritik Düzeltme: Eğer kullanıcı bir input'a yazı yazıyorsa kısayolları yoksay.
      const activeTag = document.activeElement?.tagName;
      if (activeTag === "INPUT" || activeTag === "TEXTAREA") return;

      if (e.code === "Space") {
        e.preventDefault();
        handleNext(); // Ref üzerinden state'e erişir
      } else if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        // Buradan direkt fonksiyona erişmek yerine ref kontrolü veya state setter kullanımı daha güvenli
        // ancak stateRef ile handleNext içindeki mantık zaten güncel.
        // Stop işlemi için:
        if (stateRef.current.running) {
            setRunning(false);
            setAccumulated(stateRef.current.accumulated + (Date.now() - stateRef.current.startAt));
        }
      } else if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        handleReset();
      } else if (e.key.toLowerCase() === "u" || e.code === "Backspace") {
        e.preventDefault();
        handleUndoSplit();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []); // Dependency array boş, çünkü stateRef kullanıyoruz. Listener sürekli sökülüp takılmıyor.

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-100 p-4 sm:p-10 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Soru Süre Ölçer</h1>
            <p className="text-neutral-400 text-sm mt-1">Sınav ve test pratikleri için optimize edildi.</p>
          </div>
          
          <div className="flex flex-wrap gap-2 text-xs sm:text-sm text-neutral-400">
            <div className="flex items-center gap-1 bg-neutral-900 px-2 py-1 rounded border border-neutral-800"><kbd className="font-bold text-neutral-200">Space</kbd> <span>Yeni</span></div>
            <div className="flex items-center gap-1 bg-neutral-900 px-2 py-1 rounded border border-neutral-800"><kbd className="font-bold text-neutral-200">S</kbd> <span>Durdur</span></div>
            <div className="flex items-center gap-1 bg-neutral-900 px-2 py-1 rounded border border-neutral-800"><kbd className="font-bold text-neutral-200">U / ⌫</kbd> <span>Geri Al</span></div>
          </div>
        </header>

        {/* Ana Kontrol Paneli */}
        <div className="rounded-3xl bg-neutral-900/80 border border-neutral-800/80 p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
            
            {/* Sayaç */}
            <div className="flex-1 text-center lg:text-left cursor-pointer group" onClick={handleNext} title="Yeni soru için tıkla (Space)">
               <div className="group-hover:text-emerald-400 transition-colors duration-200">
                 <BigTimerDisplay running={running} startAt={startAt} accumulated={accumulated} />
               </div>
               <div className="text-neutral-500 text-xs font-medium uppercase tracking-widest mt-2">Geçen Toplam Süre</div>
            </div>

            {/* Butonlar */}
            <div className="w-full lg:w-auto flex flex-col gap-3">
               <div className="grid grid-cols-2 gap-3 w-full">
                  <button
                    onClick={handleStartStop}
                    className={`col-span-1 h-12 inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all ${
                      running 
                      ? "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/20" 
                      : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20"
                    }`}
                  >
                    {running ? <Square size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                    {running ? "Durdur" : "Başlat"}
                  </button>

                  <button
                    onClick={handleNext}
                    className="col-span-1 h-12 inline-flex items-center justify-center gap-2 rounded-xl font-semibold bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-900/20 transition-all"
                  >
                    <SkipForward size={20} fill="currentColor" />
                    Yeni Soru
                  </button>
               </div>

               <div className="grid grid-cols-2 gap-3 w-full">
                 <button onClick={handleUndoSplit} className="h-10 inline-flex items-center justify-center gap-2 rounded-lg font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-colors">
                   <Undo size={16} /> Geri
                 </button>
                 <button onClick={handleReset} className="h-10 inline-flex items-center justify-center gap-2 rounded-lg font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-colors">
                   <RotateCcw size={16} /> Sıfırla
                 </button>
               </div>
            </div>
          </div>

          {/* Alt Kontroller: Etiket ve Ayarlar */}
          <div className="mt-8 pt-6 border-t border-neutral-800 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-sm text-neutral-400 whitespace-nowrap">Sonraki Etiket:</span>
              <input
                className="bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/50 transition-all w-full sm:w-48"
                value={nextLabel}
                onChange={e => setNextLabel(e.target.value)}
                placeholder="Örn: Mat Soru 5"
              />
            </div>
            
            <button 
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              <Settings size={14} /> {warningSeconds}sn Uyarı Limiti
            </button>
          </div>

          {/* Ayarlar Paneli (Basit) */}
          {isSettingsOpen && (
            <div className="mt-4 p-4 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
              <div className="text-sm text-neutral-300">Kırmızı Uyarı Limiti (saniye):</div>
              <input 
                type="number" 
                className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 w-20 text-sm text-center"
                value={warningSeconds}
                onChange={(e) => setWarningSeconds(Number(e.target.value))}
              />
              <div className="text-xs text-neutral-500">Varsayılan: 120</div>
            </div>
          )}
        </div>

        {/* İstatistikler */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Toplam Kayıt" value={laps.length} />
          <StatCard label="Ortalama Süre" value={stats ? formatDuration(stats.avg) : "-"} sub={stats ? `${msToMinutes(stats.avg).toFixed(2)} dk` : ""} />
          <StatCard label="En Hızlı" value={stats ? formatDuration(stats.fastest) : "-"} />
          <StatCard label="En Yavaş" value={stats ? formatDuration(stats.slowest) : "-"} />
        </div>

        {/* Tablo */}
        <div className="rounded-2xl bg-neutral-900 border border-neutral-800 shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/50">
            <h2 className="font-semibold text-neutral-200 flex items-center gap-2">
              Kayıtlar
              <span className="text-xs font-normal text-neutral-500 bg-neutral-800 px-2 py-0.5 rounded-full">{laps.length}</span>
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={handleCopy} className="inline-flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg border bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-300 transition-colors">
                <Copy size={14} /> {copied ? "Kopyalandı!" : "Kopyala"}
              </button>
              <button onClick={() => downloadCSV(cumulativeRows)} className="inline-flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg border bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-300 transition-colors">
                <Download size={14} /> CSV
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            {laps.length === 0 ? (
              <div className="p-12 text-center text-neutral-500">
                <p className="mb-2">Henüz kayıt yok.</p>
                <p className="text-sm">Başlamak için <span className="font-mono text-sky-500 bg-sky-950/30 px-1 rounded">Space</span> tuşuna bas.</p>
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-neutral-950/50 text-neutral-500 font-medium sticky top-0 z-10 backdrop-blur-md">
                  <tr>
                    <th className="px-6 py-3 w-16 text-center">#</th>
                    <th className="px-6 py-3">Etiket</th>
                    <th className="px-6 py-3 text-right">Süre</th>
                    <th className="px-6 py-3 text-right">Kümülatif</th>
                    <th className="px-6 py-3 w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {cumulativeRows.map((r, i) => {
                    const over = r.duration > (warningSeconds * 1000);
                    return (
                      <tr key={i} className={`group transition-colors ${over ? "bg-red-900/10 hover:bg-red-900/20" : "hover:bg-neutral-800/50"}`}>
                        <td className="px-6 py-3 text-center text-neutral-600 font-mono text-xs">{i + 1}</td>
                        <td className="px-6 py-3">
                          <input
                            className={`bg-transparent border border-transparent hover:border-neutral-700 focus:border-neutral-600 rounded px-2 py-1 outline-none w-full transition-all ${over ? "text-red-200" : "text-neutral-300"}`}
                            value={r.label}
                            onChange={(e) => {
                              const v = e.target.value;
                              setLaps(prev => prev.map((x, idx) => idx === i ? { ...x, label: v } : x));
                            }}
                          />
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className={`font-mono tabular-nums ${over ? "text-red-400 font-bold" : "text-emerald-400"}`}>
                            {formatDuration(r.duration)}
                          </div>
                          {over && <div className="text-[10px] text-red-500/70 mt-0.5 flex items-center justify-end gap-1"><AlertCircle size={10}/> Limit aşıldı</div>}
                        </td>
                        <td className="px-6 py-3 text-right font-mono tabular-nums text-neutral-500">
                          {formatDuration(r.cumulative)}
                        </td>
                        <td className="px-6 py-3 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className="text-neutral-600 hover:text-red-400 p-1.5 rounded hover:bg-neutral-800 transition-colors"
                            onClick={() => setLaps(prev => prev.filter((_, idx) => idx !== i))}
                            title="Sil"
                          >
                            <Scissors size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
        
        <footer className="text-center text-xs text-neutral-600 pb-8">
           Pratik yapmak mükemmelleştirir. ⚡
        </footer>
      </div>
    </div>
  );
}

// Hook: Yüksek çözünürlüklü zamanlayıcı (Sadece aktifken çalışır)
function useNow(active) {
  const [now, setNow] = useState(Date.now());
  const rafRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    function tick() {
      setNow(Date.now());
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  return now;
}
