import React, { useEffect, useState, useMemo } from "react";
import { SubmissionData } from "../types";
import { DEADLINE_DATE } from "../lib/constants";
import { Users, Database } from "lucide-react";

interface Props {
  submissions: SubmissionData[];
  isRegistrationOpen: boolean;
  onOpenCategoryModal: () => void;
}

export function HomeTab({
  submissions,
  isRegistrationOpen,
  onOpenCategoryModal,
}: Props) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; dir: number }>({
    key: "timestamp",
    dir: -1,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const diff = DEADLINE_DATE.getTime() - new Date().getTime();
      if (diff > 0) {
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000),
        });
      } else {
        setTimeLeft(null);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSort = (key: string) => {
    setSortConfig((prev) =>
      prev.key === key ? { key, dir: prev.dir * -1 } : { key, dir: 1 },
    );
  };

  const parseDate = (dateStr: string) => {
    if (!dateStr || dateStr === "-") return 0;
    const [datePart, timePart] = dateStr.split(", ");
    if (datePart && timePart) {
      const [d, m, y] = datePart.split("/");
      const [hr, min, sec] = timePart.split(/[:.]/);
      return new Date(
        `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T${hr.padStart(2, "0")}:${min.padStart(2, "0")}:${sec.padStart(2, "0")}`,
      ).getTime();
    }
    return 0;
  };

  // Derived statistics
  const entityGroups = new Map<string, { timestamp: string; pCount: number }>();
  const sizeMap: Record<string, number> = {
    S: 0,
    M: 0,
    L: 0,
    XL: 0,
    XXL: 0,
    XXXL: 0,
  };
  let countP = 0;

  submissions.forEach((s) => {
    const br = (s.nama_cabang || "TANPA NAMA").toUpperCase();
    if (!entityGroups.has(br)) {
      entityGroups.set(br, { timestamp: s.waktu_simpan || "-", pCount: 0 });
    }
    const group = entityGroups.get(br)!;
    group.timestamp = s.waktu_simpan || group.timestamp;

    for (let i = 1; i <= 4; i++) {
      if ((s as any)[`p${i}_nama`]) {
        countP++;
        group.pCount++;
        const sz = (s as any)[`p${i}_kaos`];
        if (sizeMap[sz] !== undefined) sizeMap[sz]++;
      }
    }
  });

  const activeEntities = Array.from(entityGroups.entries()).filter(
    ([_, data]) => data.pCount > 0,
  );
  const isOpen = isRegistrationOpen || new Date() < DEADLINE_DATE;

  const sortedEntities = useMemo(() => {
    let entities = activeEntities.map(([name, data], idx) => ({
      name,
      data,
      originalIdx: idx,
    }));

    return entities.sort((a, b) => {
      if (a.name === "PANITIA" && b.name !== "PANITIA") return 1;
      if (a.name !== "PANITIA" && b.name === "PANITIA") return -1;

      let valA: any, valB: any;
      if (sortConfig.key === "no") {
        valA = a.originalIdx;
        valB = b.originalIdx;
      } else if (sortConfig.key === "timestamp") {
        valA = parseDate(a.data.timestamp);
        valB = parseDate(b.data.timestamp);
      } else if (sortConfig.key === "entitas") {
        valA = a.name;
        valB = b.name;
      } else if (sortConfig.key === "pCount") {
        valA = a.data.pCount;
        valB = b.data.pCount;
      } else {
        valA = parseDate(a.data.timestamp);
        valB = parseDate(b.data.timestamp);
      }

      if (valA < valB) return -1 * sortConfig.dir;
      if (valA > valB) return 1 * sortConfig.dir;
      return 0;
    });
  }, [submissions, sortConfig]);

  let displayCounter = 0;
  if (sortConfig.key === "no" && sortConfig.dir === -1) {
    displayCounter = sortedEntities.length + 1;
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="bg-white border border-slate-200 rounded-lg p-6 md:p-10 overflow-hidden relative shadow-sm text-center md:text-left">
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <img
            src="https://raw.githubusercontent.com/edibrata/image/main/Logo%20PGRI%20Official%20Full.png"
            alt="Logo"
            className="w-24 md:w-32 h-auto"
          />
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 mb-2 uppercase leading-tight">
              Konferensi Kerja 1<br />
              PGRI Kabupaten Pandeglang
            </h1>
            <p className="text-[12px] text-slate-600 mb-2 font-medium">
              Portal pendaftaran resmi Konferensi Kerja 1 PGRI Kabupaten
              Pandeglang Tahun 2026.
            </p>
            <p className="text-[11px] text-slate-500 mb-3 font-bold leading-tight text-red-600 uppercase">
              Batas pendaftaran: 31 Mei 2026 pukul 18.00 WIB.
            </p>

            <div className="mb-4 text-center md:text-left transition-all">
              {isOpen ? (
                timeLeft ? (
                  <>
                    <div className="leading-none mb-1 opacity-80 font-bold uppercase tracking-widest text-[8px] md:text-[9px]">
                      PENDAFTARAN DITUTUP DALAM:
                    </div>
                    <div className="leading-none text-[14px] md:text-[18px] font-black text-red-700 tracking-tighter">
                      {timeLeft.days}{" "}
                      <span className="text-[9px] opacity-60 mr-1">HARI</span>
                      {timeLeft.hours}{" "}
                      <span className="text-[9px] opacity-60 mr-1">JAM</span>
                      {timeLeft.minutes}{" "}
                      <span className="text-[9px] opacity-60 mr-1">MENIT</span>
                      {timeLeft.seconds}{" "}
                      <span className="text-[9px] opacity-60">DETIK</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="leading-none mb-1 opacity-80 font-bold uppercase tracking-widest text-[8px] md:text-[9px]">
                      STATUS PENDAFTARAN:
                    </div>
                    <div className="leading-none text-[14px] md:text-[18px] font-black text-emerald-600 tracking-tighter">
                      DIBUKA SECARA MANUAL
                    </div>
                  </>
                )
              ) : (
                <div className="leading-none font-black text-sm uppercase text-red-600">
                  PENDAFTARAN TELAH DITUTUP
                </div>
              )}
            </div>

            <button
              onClick={onOpenCategoryModal}
              disabled={!isOpen}
              className={`px-8 py-3 rounded font-bold shadow-md text-[11px] uppercase tracking-widest transition-all ${
                isOpen
                  ? "gradient-bg text-white active:scale-95 cursor-pointer"
                  : "bg-slate-300 text-slate-500 cursor-not-allowed"
              }`}
            >
              {isOpen ? "Daftar Sekarang" : "Pendaftaran Ditutup"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900 p-4 rounded-lg shadow-lg text-white group cursor-default">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black uppercase opacity-60 mb-0.5 tracking-wider">
                Entitas Terdaftar
              </p>
              <h2 className="text-2xl font-black">{activeEntities.length}</h2>
            </div>
            <div className="p-2 bg-white/10 rounded-lg group-hover:bg-white/20 transition-all">
              <Database className="h-6 w-6" />
            </div>
          </div>
        </div>
        <div className="gradient-bg p-4 rounded-lg shadow-lg text-white group cursor-default">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black uppercase opacity-60 mb-0.5 tracking-wider">
                Total Delegasi
              </p>
              <h2 className="text-2xl font-black">{countP}</h2>
            </div>
            <div className="p-2 bg-white/20 rounded-lg group-hover:bg-white/30 transition-all">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm group cursor-default">
        <div className="flex items-center justify-between mb-3 border-b border-slate-50 pb-2">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em]">
            Pemetaan Ukuran Kaos (Logistik)
          </p>
          <span className="text-[9px] font-bold text-red-500 uppercase bg-red-50 px-2 py-0.5 rounded-full">
            Real-time
          </span>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {Object.entries(sizeMap).map(([size, count]) => (
            <div
              key={size}
              className="bg-slate-50 p-2 rounded border border-slate-100 flex flex-col items-center"
            >
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">
                {size}
              </span>
              <span className="text-sm font-black text-slate-900 leading-none">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b">
            <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
              <th
                className="px-6 py-4 w-16 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSort("no")}
              >
                No
              </th>
              <th
                className="px-6 py-4 w-40 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSort("timestamp")}
              >
                Time Stamp
              </th>
              <th
                className="px-6 py-4 text-left cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSort("entitas")}
              >
                Entitas
              </th>
              <th
                className="px-6 py-4 w-32 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSort("pCount")}
              >
                Jumlah Personel
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[11px] md:text-sm text-slate-700 font-medium">
            {sortedEntities.map(({ name, data }, idx) => {
              const indexToDisplay =
                sortConfig.key === "no" && sortConfig.dir === -1
                  ? displayCounter - idx - 1
                  : idx + 1;

              return (
                <tr key={name} className="text-center">
                  <td className="px-6 py-3 font-bold text-slate-300">
                    {indexToDisplay}
                  </td>
                  <td className="px-6 py-3 text-[10px] uppercase font-bold text-slate-400">
                    {data.timestamp}
                  </td>
                  <td className="px-6 py-3 text-left font-black uppercase text-slate-900">
                    {name}
                  </td>
                  <td className="px-6 py-3 font-black text-red-600">
                    {data.pCount}
                  </td>
                </tr>
              );
            })}
            {sortedEntities.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-8 text-center text-slate-400 text-xs uppercase font-bold"
                >
                  Belum ada data pendaftar
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
