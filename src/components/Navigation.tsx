import { Home, ClipboardList, Database, Users, Lock, Scan, BarChart2, LogOut } from "lucide-react";

interface Props {
  activeTab: string;
  onTabChange: (tab: string) => void;
  adminRole: "full" | "scanner" | null;
}

export function Navigation({ activeTab, onTabChange, adminRole }: Props) {
  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50 border-b border-slate-200 relative">
      <div className="max-w-[96%] mx-auto px-4 flex justify-between items-center h-14 md:h-16">
        <div
          className="flex items-center gap-2 md:gap-3 cursor-pointer group"
          onClick={() => onTabChange(adminRole === "full" ? "beranda" : "info_peserta")}
        >
          <img
            src="https://github.com/edibrata/image/blob/main/Logo%20PGRI%20Official%20Full.png?raw=true"
            alt="Logo PGRI"
            referrerPolicy="no-referrer"
            className="h-8 md:h-10 w-auto group-hover:scale-105 transition-transform duration-300"
          />
          <div className="flex flex-col">
            <span className="font-bold text-base md:text-lg tracking-tight text-slate-900 leading-none">
              Konkerkab 1 <span className="text-red-600 uppercase">PGRI</span>
            </span>
            <span className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5 leading-none">
              KABUPATEN PANDEGLANG
            </span>
          </div>
        </div>

        <div className="flex items-center h-full">
          {adminRole === "full" && (
            <button
              onClick={() => onTabChange("beranda")}
              className={`relative px-3 transition-all duration-300 border-b-2 flex items-center justify-center h-full group cursor-pointer ${activeTab === "beranda" ? "text-red-600 border-red-600" : "border-transparent text-slate-500 hover:text-red-500"}`}
            >
              <Home className="h-6 w-6 group-hover:-translate-y-1 group-hover:scale-110 transition-transform duration-300" />
              <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-1 transition-all duration-300 shadow-xl pointer-events-none z-[60]">
                Beranda
              </span>
            </button>
          )}
          
          {adminRole === "full" && (
            <button
              onClick={() => onTabChange("formulir")}
              className={`relative px-3 transition-all duration-300 border-b-2 flex items-center justify-center h-full group cursor-pointer ${activeTab === "formulir" ? "text-red-600 border-red-600" : "border-transparent text-slate-500 hover:text-red-500"}`}
            >
              <ClipboardList className="h-6 w-6 group-hover:-translate-y-1 group-hover:scale-110 transition-transform duration-300" />
              <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-1 transition-all duration-300 shadow-xl pointer-events-none z-[60]">
                Pendaftaran
              </span>
            </button>
          )}
          
          <button
            onClick={() => onTabChange("info_peserta")}
            className={`relative px-3 transition-all duration-300 border-b-2 flex items-center justify-center h-full group cursor-pointer ${activeTab === "info_peserta" ? "text-red-600 border-red-600" : "border-transparent text-slate-500 hover:text-red-500"}`}
          >
            <Users className="h-6 w-6 group-hover:-translate-y-1 group-hover:scale-110 transition-transform duration-300" />
            <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-1 transition-all duration-300 shadow-xl pointer-events-none z-[60]">
              Info Peserta
            </span>
          </button>
          
          <button
            onClick={() => onTabChange("presensi")}
            className={`relative px-3 transition-all duration-300 border-b-2 flex items-center justify-center h-full group cursor-pointer ${activeTab === "presensi" ? "text-red-600 border-red-600" : "border-transparent text-slate-500 hover:text-red-500"}`}
          >
            <BarChart2 className="h-6 w-6 group-hover:-translate-y-1 group-hover:scale-110 transition-transform duration-300" />
            <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-1 transition-all duration-300 shadow-xl pointer-events-none z-[60]">
              Statistik Presensi
            </span>
          </button>
          
          {adminRole === "full" && (
            <button
              onClick={() => onTabChange("data")}
              className={`relative px-3 transition-all duration-300 border-b-2 flex items-center justify-center h-full group cursor-pointer ${activeTab === "data" ? "text-red-600 border-red-600" : "border-transparent text-slate-500 hover:text-red-500"}`}
            >
              <Database className="h-6 w-6 group-hover:-translate-y-1 group-hover:scale-110 transition-transform duration-300" />
              <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-1 transition-all duration-300 shadow-xl pointer-events-none z-[60]">
                Database Admin
              </span>
            </button>
          )}

          {(adminRole === "full" || adminRole === "scanner") && (
            <button
              onClick={() => onTabChange("scanner")}
              className={`relative px-3 transition-all duration-300 border-b-2 flex items-center justify-center h-full group cursor-pointer ${activeTab === "scanner" ? "text-red-600 border-red-600" : "border-transparent text-slate-500 hover:text-red-500"}`}
            >
              <Scan className="h-6 w-6 group-hover:-translate-y-1 group-hover:scale-110 transition-transform duration-300" />
              <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-1 transition-all duration-300 shadow-xl pointer-events-none z-[60]">
                Scanner Presensi
              </span>
            </button>
          )}

          {!adminRole && (
            <button
              onClick={() => onTabChange("data")}
              className={`relative px-3 ml-2 transition-all duration-300 flex items-center justify-center group cursor-pointer text-slate-300 hover:text-slate-500`}
            >
              <Lock className="h-4 w-4 group-hover:-translate-y-1 group-hover:scale-110 transition-transform duration-300" />
              <span className="absolute top-full mt-2 right-0 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-1 transition-all duration-300 shadow-xl pointer-events-none z-[60] origin-top-right">
                Buka Admin
              </span>
            </button>
          )}
          
          {adminRole && (
            <button
              onClick={() => {
                localStorage.removeItem("pgri_admin_pass");
                window.location.reload();
              }}
              className={`relative px-3 ml-2 transition-all duration-300 flex items-center justify-center group cursor-pointer text-slate-400 hover:text-red-600`}
            >
              <LogOut className="h-4 w-4 group-hover:-translate-y-1 group-hover:scale-110 transition-transform duration-300" />
              <span className="absolute top-full mt-2 right-0 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-1 transition-all duration-300 shadow-xl pointer-events-none z-[60] origin-top-right">
                Keluar
              </span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
