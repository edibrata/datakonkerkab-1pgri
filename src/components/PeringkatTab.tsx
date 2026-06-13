import { SubmissionData } from "../types";
import { getFlattenedRows } from "../lib/data-utils";
import { getLeaderboard, LeaderboardEntry } from "../lib/data-utils";
import { EVENT_AGENDA } from "../lib/constants";
import { Trophy, Medal, Award, Info } from "lucide-react";
import { useState } from "react";

interface Props {
  submissions: SubmissionData[];
  attendanceLogs: any[];
}

export function PeringkatTab({ submissions, attendanceLogs }: Props) {
  const flattenedRows = getFlattenedRows(submissions);
  const leaderboardFull = getLeaderboard(flattenedRows, attendanceLogs);
  const leaderboard = leaderboardFull.filter(entry => entry.attendancesCount > 0);
  
  const [searchTerm, setSearchTerm] = useState("");

  const filteredLeaderboard = leaderboard.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.branch.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.rank.toString() === searchTerm
  );

  const agendasWithoutMakan = EVENT_AGENDA.filter(e => !e.id.includes("makan")).length;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-sm border border-amber-200 p-6 md:p-8 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Trophy className="w-32 h-32 text-amber-500" />
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-amber-900 uppercase tracking-tight mb-2">
          Peringkat Kedisiplinan
        </h2>
        <div className="bg-white/60 rounded-xl p-4 md:p-5 mt-4 text-left border border-amber-200/50 shadow-sm inline-block max-w-4xl mx-auto">
          <h4 className="font-black text-amber-900 text-sm md:text-base mb-2 flex items-center justify-center sm:justify-start gap-2">
            <Info className="w-5 h-5 text-amber-600" />
            Cara Penilaian Peringkat
          </h4>
          <ul className="text-amber-800 text-xs md:text-sm space-y-2 font-medium ml-4 list-decimal text-left">
            <li><strong className="text-amber-900">Total Kehadiran:</strong> Prioritas utama didasarkan pada jumlah event yang telah diikuti.</li>
            <li><strong className="text-amber-900">Poin Kecepatan:</strong> Jika jumlah kehadiran sama, peringkat ditentukan oleh kecepatan scan barcode. Peserta yang melakukan scan lebih awal pada setiap event akan mendapatkan poin lebih tinggi (Peserta tercepat 1 mendapat 100 poin, tercepat 2 mendapat 99 poin, dst).</li>
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6 text-center">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Top Peserta Disiplin</h3>
          <div className="relative w-full sm:w-auto">
            <input
              type="text"
              placeholder="Cari Nama / Entitas..."
              className="w-full sm:w-64 bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold uppercase p-2.5 rounded-lg focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-center"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filteredLeaderboard.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-medium border border-slate-200 rounded-xl">
              Belum ada data peringkat presensi.
            </div>
          ) : (
            filteredLeaderboard.map((entry) => (
              <div 
                key={entry.participantId} 
                className={`flex flex-col sm:flex-row items-center gap-4 sm:gap-6 p-4 sm:p-5 border rounded-xl transition-all ${
                  entry.rank === 1 ? 'bg-amber-50 border-amber-200 shadow-sm' : 
                  entry.rank <= 3 ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-100 hover:bg-slate-50'
                }`}
              >
                <div className="flex-shrink-0 flex sm:w-16 items-center justify-center">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full border-2 ${
                    entry.rank === 1 ? 'border-amber-400 bg-amber-100 text-amber-700' : 
                    entry.rank === 2 ? 'border-slate-300 bg-slate-100 text-slate-600' : 
                    entry.rank === 3 ? 'border-orange-300 bg-orange-100 text-orange-700' : 'border-slate-100 bg-slate-50 text-slate-500'
                  }`}>
                    <span className="text-lg md:text-xl font-black">
                      {entry.rank}
                    </span>
                  </div>
                </div>
                
                <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left min-w-0 w-full">
                  <span className="font-black text-slate-800 uppercase text-base sm:text-lg w-full truncate">
                    {entry.name}
                  </span>
                  <span className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                    {entry.branch} • {entry.kategori}
                  </span>
                </div>

                <div className="flex-shrink-0 flex flex-row items-center justify-center gap-2 mt-2 sm:mt-0">
                  <div className={`flex flex-col items-center justify-center min-w-[4.5rem] p-2 rounded-lg border ${
                    entry.rank === 1 ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}>
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-0.5">Hadir</span>
                    <span className="font-black text-sm leading-none">{entry.attendancesCount}/{agendasWithoutMakan}</span>
                  </div>
                  <div className={`flex flex-col items-center justify-center min-w-[5rem] p-2 rounded-lg border ${
                    entry.rank === 1 ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    <span className="text-[7.5px] sm:text-[9px] font-black uppercase tracking-widest opacity-60 mb-0.5 text-center leading-tight">Poin<br/>Kecepatan</span>
                    <span className="font-black text-sm leading-none">{entry.poinKecepatan}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
