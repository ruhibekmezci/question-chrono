import React, { useEffect, useMemo, useRef, useState } from "react";
import { Download, Play, Square, SkipForward, RotateCcw, Scissors, Copy, Undo } from "lucide-react";

// Helper: format milliseconds to HH:MM:SS.ms
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

const STORAGE_KEY = "question-stopwatch-state-v1";
const TWO_MIN_MS = 2 * 60 * 1000;

export default function QuestionStopwatch() {
  const [running, setRunning] = useState(false);
  const [startAt, setStartAt] = useState(0); // epoch ms when started (current stint)
  const [accumulated, setAccumulated] = useState(0); // paused time carried over
  const [lastSplitAt, setLastSplitAt] = useState(0);
  const [laps, setLaps] = useState([]); // {label, duration}
  const [nextLabel, setNextLabel] = useState("Soru 1");
  const [copied, setCopied] = useState(false);

  // Load from localStorage
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const s = JSON.parse(raw);
      setRunning(false); // güvenli başlat: durdurulmuş
      setStartAt(0);
      setAccumulated(s.accumulated || 0);
      setLastSplitAt(0);
      setLaps(Array.isArray(s.laps) ? s.laps : []);
      setNextLabel(s.nextLabel || inferNextLabel(Array.isArray(s.laps) ? s.laps : []));
    } catch (e) {
      console.warn("State load error", e);
    }
  }, []);

  // Save to localStorage on changes (except volatile timestamps)
  useEffect(() => {
    const s = { accumulated, laps, nextLabel };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }, [accumulated, laps, nextLabel]);

  // Timer tick
  const now = useNow(running);
  const elapsed = useMemo(() => accumulated + (running ? now - startAt : 0), [accumulated, running, now, startAt]);

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

  function inferNextLabel(currentLaps) {
    // Find the max trailing number in labels like "Soru X"
    const base = "Soru ";
    let n = 1;
    const nums = currentLaps
      .map(l => (typeof l.label === 'string' && l.label.startsWith(base)) ? parseInt(l.label.slice(base.length), 10) : NaN)
      .filter(x => !isNaN(x));
    if (nums.length > 0) n = Math.max(...nums) + 1; else n = currentLaps.length + 1;
    return base + n;
  }

  function startTimer() {
    const now = Date.now();
    setStartAt(now);
    setLastSplitAt(now);
    setRunning(true);
  }

  function stopTimer() {
    // sadece durdur; toggle değil
    if (!running) return;
    setRunning(false);
    // toplam zamanı koru
    setAccumulated(accumulated + (Date.now() - startAt));
  }

  function handleStartStop() {
    // eski buton davranışı: toggle
    if (running) {
      stopTimer();
    } else {
      startTimer();
    }
  }

  function handleNext() {
    if (!running) {
      // çalışmıyorsa sezgisel olsun: başlat
      startTimer();
      return;
    }
    const now = Date.now();
    const duration = now - lastSplitAt;
    const label = nextLabel?.trim() || `Soru ${laps.length + 1}`;
    const newLaps = [...laps, { label, duration }];
    setLaps(newLaps);
    setLastSplitAt(now);
    // Auto-increment label if it ends with a number
    const m = label.match(/^(.*?)(\d+)$/);
    if (m) {
      setNextLabel(`${m[1].trim()} ${parseInt(m[2], 10) + 1}`.replace(/\s+/, ' '));
    } else {
      setNextLabel(inferNextLabel(newLaps));
    }
  }

  function handleReset() {
    setRunning(false);
    setStartAt(0);
    setAccumulated(0);
    setLastSplitAt(0);
    setLaps([]);
    setNextLabel("Soru 1");
  }

  function handleUndoSplit() {
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

  function handleDownload() {
    downloadCSV(cumulativeRows);
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      if (e.repeat) return;
      // SPACE = Yeni Soru
      if (e.code === "Space") {
        e.preventDefault();
        handleNext();
      // S = Durdur
      } else if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        stopTimer();
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
  }, [running, laps, lastSplitAt, nextLabel, accumulated, startAt]);

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-100 p-6 sm:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Soru Süre Ölçer</h1>
            <p className="text-neutral-400 text-sm">Space = Yeni Soru · S = Durdur. Kronometreye tıklamak da yeni soru geçişidir.</p>
          </div>

          <div className="flex items-center gap-2 text-xs sm:text-sm text-neutral-400">
            <kbd className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700">Space</kbd>
            <span>Yeni Soru</span>
            <kbd className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 ml-3">S</kbd>
            <span>Durdur</span>
            <kbd className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 ml-3">U / ⌫</kbd>
            <span>Geri Al</span>
            <kbd className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 ml-3">R</kbd>
            <span>Sıfırla</span>
          </div>
        </header>

        {/* Timer Card */}
        <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <div className="flex-1">
              <div
                className="font-mono tabular-nums text-5xl sm:text-6xl md:text-7xl tracking-tight select-none cursor-pointer"
                onClick={handleNext}
                title="Yeni soru (Space)"
              >
                {formatDuration(elapsed)}
              </div>
              <div className="text-neutral-400 text-xs mt-1">Toplam süre</div>
            </div>

            <div className="w-full sm:w-auto flex flex-col gap-2">
              <div className="flex gap-2 w-full">
                <button
                  onClick={handleStartStop}
                  className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium transition border ${running ? "bg-red-600/90 hover:bg-red-600 border-red-500/50" : "bg-emerald-600/90 hover:bg-emerald-600 border-emerald-500/50"}`}
                >
                  {running ? <Square size={18} /> : <Play size={18} />}
                  {running ? "Durdur" : "Başlat"}
                </button>
                <button
                  onClick={handleNext}
                  className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium transition border ${"bg-sky-600/90 hover:bg-sky-600 border-sky-500/50"}`}
                >
                  <SkipForward size={18} /> Yeni Soru (Space)
                </button>
              </div>
              <div className="flex gap-2 w-full">
                <button
                  onClick={handleUndoSplit}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium transition border bg-neutral-800 hover:bg-neutral-700 border-neutral-700"
                >
                  <Undo size={18} /> Geri Al
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium transition border bg-neutral-800 hover:bg-neutral-700 border-neutral-700"
                >
                  <RotateCcw size={18} /> Sıfırla
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <label className="text-sm text-neutral-300">Sonraki etiket:</label>
            <input
              className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-neutral-500"
              value={nextLabel}
              onChange={e => setNextLabel(e.target.value)}
              placeholder="Soru 5"
            />
          </div>
        </div>

        {/* Laps Table */}
        <div className="rounded-2xl bg-neutral-900 border border-neutral-800 shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
            <h2 className="font-semibold">Soru Süreleri</h2>
            <div className="flex items-center gap-2">
              <button onClick={handleCopy} className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border bg-neutral-800 hover:bg-neutral-700 border-neutral-700">
                <Copy size={16} /> {copied ? "Kopyalandı" : "Tabloyu Kopyala"}
              </button>
              <button onClick={handleDownload} className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border bg-neutral-800 hover:bg-neutral-700 border-neutral-700">
                <Download size={16} /> CSV İndir
              </button>
            </div>
          </div>

          {laps.length === 0 ? (
            <div className="p-6 text-neutral-400 text-sm">Henüz kayıt yok. <span className="font-mono">Space</span> ile yeni soruya geç.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-neutral-900 text-neutral-400 border-b border-neutral-800">
                  <tr>
                    <th className="text-left px-4 py-2">#</th>
                    <th className="text-left px-4 py-2">Etiket</th>
                    <th className="text-left px-4 py-2">Süre</th>
                    <th className="text-left px-4 py-2">Dakika</th>
                    <th className="text-left px-4 py-2">Kümülatif</th>
                    <th className="text-left px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {cumulativeRows.map((r, i) => {
                    const over = r.duration > TWO_MIN_MS;
                    return (
                      <tr key={i} className={`border-b border-neutral-900 hover:bg-neutral-800/30 ${over ? "bg-red-950/20" : ""}`}>
                        <td className="px-4 py-2 text-neutral-400">{i + 1}</td>
                        <td className="px-4 py-2">
                          <input
                            className={`bg-transparent border border-transparent hover:border-neutral-700 focus:border-neutral-600 rounded px-2 py-1 outline-none ${over ? "text-red-300" : ""}`}
                            value={r.label}
                            onChange={(e) => {
                              const v = e.target.value;
                              setLaps(prev => prev.map((x, idx) => idx === i ? { ...x, label: v } : x));
                            }}
                          />
                        </td>
                        <td className={`px-4 py-2 font-mono tabular-nums ${over ? "text-red-400" : ""}`}>{formatDuration(r.duration)}{over && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-red-900/60 border border-red-700/50">2dk+</span>}</td>
                        <td className={`px-4 py-2 font-mono tabular-nums ${over ? "text-red-400" : ""}`}>{msToMinutes(r.duration).toFixed(3)}</td>
                        <td className="px-4 py-2 font-mono tabular-nums">{formatDuration(r.cumulative)}</td>
                        <td className="px-4 py-2 text-right">
                          <button
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border bg-neutral-800 hover:bg-neutral-700 border-neutral-700"
                            onClick={() => setLaps(prev => prev.filter((_, idx) => idx !== i))}
                          >
                            <Scissors size={14} /> Sil
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Toplam" value={stats ? formatDuration(stats.total) : "-"} sub={stats ? `${msToMinutes(stats.total).toFixed(2)} dk` : ""} />
          <StatCard label="Ortalama" value={stats ? formatDuration(stats.avg) : "-"} sub={stats ? `${msToMinutes(stats.avg).toFixed(2)} dk` : ""} />
          <StatCard label="En Hızlı" value={stats ? formatDuration(stats.fastest) : "-"} />
          <StatCard label="En Yavaş" value={stats ? formatDuration(stats.slowest) : "-"} />
        </div>

        {/* Mini Help */}
        <details className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-300">
          <summary className="cursor-pointer font-semibold">Nasıl çalışır?</summary>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><span className="font-medium">Başlat</span>'a basarak sayaç akmaya başlar.</li>
            <li><span className="font-medium">Yeni Soru</span> için <span className="font-mono">Space</span> veya üstteki butona tıkla (kronometre ekranına tıklamak da geçiş yapar).</li>
            <li><span className="font-medium">Durdur</span> için <span className="font-mono">S</span> tuşu.</li>
            <li>2 dakikayı aşan sorular kırmızı vurgulanır.</li>
            <li><span className="font-medium">Geri Al</span> (U / Backspace), <span className="font-medium">Sıfırla</span> (R).</li>
            <li>Veriler otomatik olarak bu tarayıcıda saklanır (localStorage).</li>
          </ul>
        </details>

        <footer className="text-center text-xs text-neutral-500 pt-2 pb-8">Made for pratik: Kronometre → Soru → Süre. 🕒</footer>
      </div>
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

// Hook: high-resolution ticking when running
function useNow(active) {
  const [now, setNow] = useState(Date.now());
  const rafRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    let mounted = true;
    function tick() {
      if (!mounted) return;
      setNow(Date.now());
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  useEffect(() => {
    if (!active) {
      // when not active, update once per second to keep UI fresh
      const id = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(id);
    }
  }, [active]);

  return now;
}
