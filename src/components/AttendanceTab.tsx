import React, { useMemo, useState } from "react";
import { SubmissionData } from "../types";
import { EVENT_AGENDA } from "../lib/constants";
import { getFlattenedRows } from "../lib/data-utils";

interface Props {
  submissions: SubmissionData[];
  attendanceLogs: any[];
  confirmations?: any[];
}

export const AttendanceTab = ({ submissions, attendanceLogs, confirmations = [] }: Props) => {
  const [selectedEvent, setSelectedEvent] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const flatRows = useMemo(() => {
    return getFlattenedRows(submissions);
  }, [submissions]);

  const totalPesertaCabang = useMemo(() => {
    return flatRows.filter(r => r.kategori === "PESERTA CABANG").length;
  }, [flatRows]);

  const stats = useMemo(() => {
    const uniqueKomisi = Array.from(new Set(flatRows.map((r) => r.kom).filter(Boolean))).sort();

    return EVENT_AGENDA.flatMap((event) => {
      if (event.id === "komisi") {
        return uniqueKomisi.map((komisiName) => {
          const komisiId = `komisi_${komisiName}`;
          // total peserta in this komisi
          const totalInKomisi = flatRows.filter(r => r.kategori === "PESERTA CABANG" && r.kom === komisiName).length;

          const logsForEvent = attendanceLogs.filter((l) => l.eventId === event.id);
          const pesertaCabangLogs = logsForEvent.filter(l => {
             const person = flatRows.find((r) => `${r.id}-${r.i}` === l.participantId);
             return person?.kategori === "PESERTA CABANG" && person?.kom === komisiName;
          });
          const count = pesertaCabangLogs.length;

          const eventConfirmations = confirmations.filter(c => c.eventId === event.id);
          const pesertaCabangConfirms = eventConfirmations.filter(c => {
            const person = flatRows.find((r) => `${r.id}-${r.i}` === c.participantId);
            return person?.kategori === "PESERTA CABANG" && person?.kom === komisiName;
          });
          const confirmCount = pesertaCabangConfirms.length;

          return {
            id: komisiId,
            name: `Sidang ${komisiName}`,
            count,
            confirmCount,
            percentage: totalInKomisi ? Math.round((count / totalInKomisi) * 100) : 0,
            confirmPercentage: totalInKomisi ? Math.round((confirmCount / totalInKomisi) * 100) : 0,
            totalSummary: count + confirmCount,
            totalPercentage: totalInKomisi ? Math.round(((count + confirmCount) / totalInKomisi) * 100) : 0,
          };
        });
      }

      const logsForEvent = attendanceLogs.filter((l) => l.eventId === event.id);
      
      const pesertaCabangLogs = logsForEvent.filter(l => {
         const person = flatRows.find((r) => `${r.id}-${r.i}` === l.participantId);
         return person?.kategori === "PESERTA CABANG";
      });

      const count = pesertaCabangLogs.length;

      const eventConfirmations = confirmations.filter(c => c.eventId === event.id);
      const pesertaCabangConfirms = eventConfirmations.filter(c => {
        const person = flatRows.find((r) => `${r.id}-${r.i}` === c.participantId);
        return person?.kategori === "PESERTA CABANG";
      });
      const confirmCount = pesertaCabangConfirms.length;

      return [{
        ...event,
        count,
        confirmCount,
        percentage: totalPesertaCabang ? Math.round((count / totalPesertaCabang) * 100) : 0,
        confirmPercentage: totalPesertaCabang ? Math.round((confirmCount / totalPesertaCabang) * 100) : 0,
        totalSummary: count + confirmCount,
        totalPercentage: totalPesertaCabang ? Math.round(((count + confirmCount) / totalPesertaCabang) * 100) : 0,
      }];
    });
  }, [attendanceLogs, confirmations, flatRows, totalPesertaCabang]);

  const enrichedLogs = useMemo(() => {
    return attendanceLogs
      .map((log) => {
        // participantId is like `${person.id}-${person.i}`
        const person = flatRows.find((r) => `${r.id}-${r.i}` === log.participantId);
        const eventName = EVENT_AGENDA.find((e) => e.id === log.eventId)?.name || log.eventId;
        return {
          ...log,
          name: person ? person.name : "Tidak Diketahui",
          branch: person ? person.branch : "-",
          kategori: person ? person.kategori : "-",
          eventName,
        };
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [attendanceLogs, flatRows]);

  const filteredLogs = useMemo(() => {
    return enrichedLogs.filter((log) => {
      const matchEvent = selectedEvent === "all" || log.eventId === selectedEvent;
      const matchSearch = 
        log.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        log.branch.toLowerCase().includes(searchTerm.toLowerCase());
      return matchEvent && matchSearch;
    });
  }, [enrichedLogs, selectedEvent, searchTerm]);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6 text-left">
        <h2 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tight mb-4 text-center md:text-left">Statistik Presensi</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <div className="col-span-2 sm:col-span-full md:col-span-1 bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-center text-center md:text-left">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-tight">Total Peserta Cabang</span>
            <span className="text-3xl font-black text-slate-800 mt-1">{totalPesertaCabang}</span>
          </div>
          {stats.map((stat) => (
            <div key={stat.id} className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col justify-between text-left shadow-sm hover:shadow-md transition-shadow">
              <span 
                className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-2 truncate" 
                title={stat.name}
              >
                {stat.name}
              </span>
              <div className="flex flex-col gap-1.5 mt-auto">
                <div className="grid grid-cols-[1fr_28px_36px] gap-1 items-end">
                  <span className="text-[10px] sm:text-xs font-bold text-emerald-700 tracking-wide leading-none pb-[1px]">SCAN</span>
                  <span className="text-sm sm:text-base font-black text-emerald-700 text-right leading-none">{stat.count}</span>
                  <span className="text-[9px] sm:text-[10px] font-bold text-emerald-600 text-right leading-none pb-[2px]">({stat.percentage}%)</span>
                </div>
                {!stat.id.includes("makan") && (
                  <div className="grid grid-cols-[1fr_28px_36px] gap-1 items-end">
                    <span className="text-[10px] sm:text-xs font-bold text-indigo-600 tracking-wide leading-none pb-[1px]">CONFIRM</span>
                    <span className="text-sm sm:text-base font-black text-indigo-600 text-right leading-none">{stat.confirmCount}</span>
                    <span className="text-[9px] sm:text-[10px] font-bold text-indigo-500 text-right leading-none pb-[2px]">({stat.confirmPercentage}%)</span>
                  </div>
                )}
                 {!stat.id.includes("makan") && (
                  <div className="grid grid-cols-[1fr_28px_36px] gap-1 items-end pt-1.5 mt-0.5 border-t border-slate-100">
                    <span className="text-[10px] sm:text-xs font-black text-slate-700 tracking-wide leading-none pb-[1px]">JUMLAH</span>
                    <span className="text-sm sm:text-base font-black text-slate-800 text-right leading-none">{stat.totalSummary}</span>
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 text-right leading-none pb-[2px]">({stat.totalPercentage}%)</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-3 md:gap-4 items-center justify-between">
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight text-center md:text-left w-full md:w-auto">Rincian Log</h2>
          <div className="flex flex-col sm:flex-row w-full md:w-auto gap-2">
            <select
              className="bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold uppercase p-2 rounded-lg focus:outline-none focus:border-red-400 w-full sm:w-auto"
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
            >
              <option value="all">SEMUA AGENDA</option>
              {EVENT_AGENDA.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.name}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Cari nama/cabang..."
              className="bg-slate-50 border border-slate-200 text-slate-800 text-sm p-2 rounded-lg focus:outline-none focus:border-red-400 w-full sm:w-auto min-w-0 md:min-w-[200px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Mobile View */}
        <div className="block md:hidden border-t border-slate-100">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-medium">Belum ada data log.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredLogs.map((log, idx) => (
                <div key={log.id} className="p-3 sm:p-4 hover:bg-slate-50/50 transition-colors flex gap-3 text-left">
                  <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200 mt-0.5">
                    <span className="text-xs sm:text-sm font-black text-slate-400">{idx + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <div className="text-sm font-black text-slate-800 truncate pr-2">{log.name}</div>
                      <div className="text-[9px] sm:text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <div className="text-[11px] sm:text-xs font-medium text-slate-600 truncate mb-1.5">
                      {log.branch} <span className="opacity-50 mx-1">&bull;</span> <span className="text-slate-400">{log.kategori}</span>
                    </div>
                    <div className="inline-flex items-center text-[9px] sm:text-[10px] uppercase tracking-wider font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      {log.eventName}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse border-t border-slate-100">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-500">
                <th className="p-4 font-black w-14 text-center">No</th>
                <th className="p-4 font-black">Waktu</th>
                <th className="p-4 font-black">Kegiatan</th>
                <th className="p-4 font-black">Nama</th>
                <th className="p-4 font-black">Kategori</th>
                <th className="p-4 font-black">Cabang</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">Belum ada data log.</td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => (
                  <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 text-center text-sm font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-4 text-sm font-mono text-slate-600">
                      {new Date(log.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </td>
                    <td className="p-4 text-sm font-bold text-slate-800">{log.eventName}</td>
                    <td className="p-4 text-sm font-bold text-slate-800">{log.name}</td>
                    <td className="p-4 text-xs font-bold text-slate-500">{log.kategori}</td>
                    <td className="p-4 text-sm font-medium text-slate-600">{log.branch}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
