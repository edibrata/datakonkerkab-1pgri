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

  const filteredLeaderboardFull = leaderboard.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.branch.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.rank.toString() === searchTerm
  );

  const filteredLeaderboard = searchTerm ? filteredLeaderboardFull : filteredLeaderboardFull.slice(0, 20);

  const agendasWithoutMakan = EVENT_AGENDA.filter(e => !e.id.includes("makan")).length;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-sm border border-amber-200 p-6 md:p-8 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Trophy className="w-32 h-32 text-amber-500" />
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-amber-900 uppercase tracking-tight m-0 relative z-10">
          Peringkat Kedisiplinan
        </h2>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex justify-center">
        <input
          type="text"
          placeholder="Cari Nama/Entitas..."
          className="w-full sm:w-80 bg-white border-2 border-slate-100 text-slate-600 text-sm font-black uppercase p-3 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-center tracking-wide"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 py-5 px-4 md:px-6 text-center flex flex-col">
        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-5">Top 20 Peserta Disiplin</h3>

        <div className="overflow-y-auto max-h-[420px] pr-2 -mr-2">
          <div className="grid grid-cols-1 gap-3">
          {filteredLeaderboard.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-medium border border-slate-200 rounded-xl">
              Belum ada data peringkat presensi.
            </div>
          ) : (
            filteredLeaderboard.map((entry) => (
              <div 
                key={entry.participantId} 
                className={`flex flex-row items-center gap-3 md:gap-4 p-3 border rounded-xl transition-all ${
                  entry.rank === 1 ? 'bg-amber-100/50 border-amber-200 shadow-sm' : 
                  entry.rank <= 3 ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-100 hover:bg-slate-50'
                }`}
              >
                <div className="flex-shrink-0 w-10 md:w-12 flex items-center justify-center">
                  <div className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full border-2 ${
                    entry.rank === 1 ? 'border-amber-400 bg-amber-100 text-amber-800' : 
                    entry.rank === 2 ? 'border-slate-300 bg-slate-100 text-slate-700' : 
                    entry.rank === 3 ? 'border-orange-300 bg-orange-100 text-orange-800' : 'border-slate-100 bg-slate-50 text-slate-500'
                  }`}>
                    <span className="text-sm md:text-base font-black">
                      {entry.rank}
                    </span>
                  </div>
                </div>
                
                <div className="flex-1 flex flex-col items-start text-left min-w-0">
                  <span className="font-black text-slate-800 uppercase text-sm md:text-base truncate w-full">
                    {entry.name}
                  </span>
                  <span className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5 truncate w-full">
                    {entry.branch} • {entry.kategori}
                  </span>
                </div>

                <div className="flex-shrink-0 flex items-center justify-end gap-1.5 md:gap-2">
                  <div className={`flex flex-col items-center justify-center min-w-[3.5rem] md:min-w-[4rem] p-1.5 md:p-2 rounded-lg border ${
                    entry.rank === 1 ? 'bg-amber-100 text-amber-800 border-amber-200/50' : 'bg-slate-50 text-slate-700 border-slate-200/50'
                  }`}>
                    <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest opacity-60 mb-0.5">Hadir</span>
                    <span className="font-black text-xs md:text-sm leading-none">{entry.attendancesCount}/{agendasWithoutMakan}</span>
                  </div>
                  <div className={`flex flex-col items-center justify-center min-w-[4rem] md:min-w-[4.5rem] p-1.5 md:p-2 rounded-lg border ${
                    entry.rank === 1 ? 'bg-amber-100 text-amber-800 border-amber-200/50' : 'bg-emerald-50 text-emerald-700 border-emerald-200/50'
                  }`}>
                    <span className="text-[7.5px] md:text-[8px] font-black uppercase tracking-widest opacity-60 mb-0.5 leading-none">Poin</span>
                    <span className="font-black text-xs md:text-sm leading-none">{entry.poinKecepatan}</span>
                  </div>
                </div>
              </div>
            ))
          )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6 text-left">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-xl">
            <Info className="w-5 h-5 text-amber-600" />
          </div>
          <h4 className="font-black text-slate-800 text-sm md:text-base uppercase tracking-tight">
            Informasi Penilaian Peringkat
          </h4>
        </div>
        <ul className="text-slate-600 text-xs md:text-sm space-y-3 font-medium list-disc pl-5 text-justify">
           <li><strong className="text-slate-800">Total Kehadiran:</strong> Prioritas utama didasarkan pada jumlah event yang telah diikuti.</li>
           <li><strong className="text-slate-800">Poin Kecepatan:</strong> Jika jumlah kehadiran sama, peringkat ditentukan oleh kecepatan scan barcode. Peserta yang melakukan scan lebih awal pada setiap event mendapat poin lebih tinggi (Tercepat 1 = 100 poin, dst).</li>
        </ul>
      </div>
    </div>
  );
}
