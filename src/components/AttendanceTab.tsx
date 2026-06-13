import React, { useMemo, useState } from "react";
import { SubmissionData } from "../types";
import { EVENT_AGENDA } from "../lib/constants";
import { getFlattenedRows } from "../lib/data-utils";

interface Props {
  submissions: SubmissionData[];
  attendanceLogs: any[];
}

export const AttendanceTab = ({ submissions, attendanceLogs }: Props) => {
  const [selectedEvent, setSelectedEvent] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const flatRows = useMemo(() => {
    return getFlattenedRows(submissions);
  }, [submissions]);

  const totalParticipants = flatRows.length;

  const stats = useMemo(() => {
    return EVENT_AGENDA.map((event) => {
      const logsForEvent = attendanceLogs.filter((l) => l.eventId === event.id);
      const count = logsForEvent.length;
      return {
        ...event,
        count,
        percentage: totalParticipants ? Math.round((count / totalParticipants) * 100) : 0,
      };
    });
  }, [attendanceLogs, totalParticipants]);

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
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-4">Statistik Presensi</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Peserta/Tiket</span>
            <span className="text-3xl font-black text-slate-800 mt-2">{totalParticipants}</span>
          </div>
          {stats.map((stat) => (
            <div key={stat.id} className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex flex-col justify-between">
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{stat.name}</span>
              <div className="flex items-end gap-2 mt-2">
                <span className="text-2xl font-black text-emerald-700 leading-none">{stat.count}</span>
                <span className="text-xs font-bold text-emerald-500 pb-0.5">{stat.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Rincian Log</h2>
          <div className="flex w-full md:w-auto gap-2">
            <select
              className="bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold uppercase p-2 rounded focus:outline-none focus:border-red-400"
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
              placeholder="Cari nama / cabang..."
              className="bg-slate-50 border border-slate-200 text-slate-800 text-sm p-2 rounded focus:outline-none focus:border-red-400 min-w-[200px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
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
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">Beliom ada data log.</td>
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
