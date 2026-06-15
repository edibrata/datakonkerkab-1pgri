import { Home, ClipboardList, Database, Users, Lock, Scan, BarChart2, LogOut, Trophy, CalendarCheck, Sun, Moon, Smartphone, Monitor } from "lucide-react";

interface Props {
  activeTab: string;
  onTabChange: (tab: string) => void;
  adminRole: "full" | "scanner" | null;
  onLogoClick?: () => void;
  isDarkMode?: boolean;
  setIsDarkMode?: (val: boolean) => void;
  isMobileSimMode?: boolean;
  setIsMobileSimMode?: (val: boolean) => void;
}

export function Navigation({ activeTab, onTabChange, adminRole, onLogoClick, isDarkMode, setIsDarkMode, isMobileSimMode, setIsMobileSimMode }: Props) {
  return (
    <nav className="bg-white shadow-sm sticky top-0 z-[100] border-b border-slate-200">
      <div className="max-w-[96%] mx-auto px-2 md:px-4 flex items-center h-14 md:h-16 gap-3 md:gap-6">
        <div
          className="flex items-center gap-2 md:gap-3 cursor-pointer group flex-shrink-0"
          onClick={() => {
            if (onLogoClick) {
              onLogoClick();
            } else {
              onTabChange(adminRole === "full" ? "beranda" : "info_peserta");
            }
          }}
        >
          <img
            src="https://raw.githubusercontent.com/edibrata/image/main/Logo%20PGRI%20Official%20Full.png"
            alt="Logo PGRI"
            referrerPolicy="no-referrer"
            className="h-8 md:h-10 w-auto group-hover:scale-105 transition-transform duration-300"
          />
          <div className="flex flex-col">
            <span className="font-bold text-[13px] sm:text-base md:text-lg tracking-tight text-slate-900 leading-none whitespace-nowrap">
              Konkerkab 1 <span className="text-red-600 uppercase">PGRI</span>
            </span>
            <span className="text-[6px] sm:text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5 leading-none whitespace-nowrap">
              KABUPATEN PANDEGLANG
            </span>
          </div>
        </div>

        <div className="flex items-center h-full box-content overflow-x-auto md:overflow-visible hide-scrollbar flex-nowrap ml-auto w-full md:w-auto -mr-2 pr-2 md:mr-0 md:pr-0 justify-start md:justify-end gap-1 md:gap-2 py-10 -my-10">
          {adminRole === "full" && (
            <button
              onClick={() => onTabChange("beranda")}
              className={`relative px-3 transition-all duration-300 flex items-center justify-center h-full group cursor-pointer ${activeTab === "beranda" ? "text-red-600" : "text-slate-500 hover:text-red-500"}`}
            >
              <div className={`absolute bottom-0 left-0 w-full h-0.5 transition-all duration-300 ${activeTab === "beranda" ? "bg-red-600 scale-x-100" : "bg-transparent scale-x-0"}`}></div>
              <Home className="h-6 w-6 group-hover:-translate-y-1 group-hover:scale-110 transition-transform duration-300 relative z-10" />
              <span className="absolute top-[calc(100%+8px)] left-0 md:left-1/2 md:-translate-x-1/2 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-1 transition-all duration-300 shadow-xl pointer-events-none z-[9999] origin-top-left md:origin-top before:content-[''] before:absolute before:-top-1 before:left-4 md:before:left-1/2 md:before:-translate-x-1/2 before:border-4 before:border-transparent before:border-b-slate-800">
                Beranda
              </span>
            </button>
          )}
          
          {adminRole === "full" && (
            <button
              onClick={() => onTabChange("formulir")}
              className={`relative px-3 transition-all duration-300 flex items-center justify-center h-full group cursor-pointer ${activeTab === "formulir" ? "text-red-600" : "text-slate-500 hover:text-red-500"}`}
            >
              <div className={`absolute bottom-0 left-0 w-full h-0.5 transition-all duration-300 ${activeTab === "formulir" ? "bg-red-600 scale-x-100" : "bg-transparent scale-x-0"}`}></div>
              <ClipboardList className="h-6 w-6 group-hover:-translate-y-1 group-hover:scale-110 transition-transform duration-300 relative z-10" />
              <span className="absolute top-[calc(100%+8px)] left-0 md:left-1/2 md:-translate-x-1/2 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-1 transition-all duration-300 shadow-xl pointer-events-none z-[9999] origin-top-left md:origin-top before:content-[''] before:absolute before:-top-1 before:left-4 md:before:left-1/2 md:before:-translate-x-1/2 before:border-4 before:border-transparent before:border-b-slate-800">
                Pendaftaran
              </span>
            </button>
          )}
          
          <button
            onClick={() => onTabChange("info_peserta")}
            className={`relative px-3 transition-all duration-300 flex items-center justify-center h-full group cursor-pointer ${activeTab === "info_peserta" ? "text-red-600" : "text-slate-500 hover:text-red-500"}`}
          >
            <div className={`absolute bottom-0 left-0 w-full h-0.5 transition-all duration-300 ${activeTab === "info_peserta" ? "bg-red-600 scale-x-100" : "bg-transparent scale-x-0"}`}></div>
            <Users className="h-6 w-6 group-hover:-translate-y-1 group-hover:scale-110 transition-transform duration-300 relative z-10" />
            <span className="absolute top-[calc(100%+8px)] left-0 md:left-1/2 md:-translate-x-1/2 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-1 transition-all duration-300 shadow-xl pointer-events-none z-[9999] origin-top-left md:origin-top before:content-[''] before:absolute before:-top-1 before:left-4 md:before:left-1/2 md:before:-translate-x-1/2 before:border-4 before:border-transparent before:border-b-slate-800">
              Info Peserta
            </span>
          </button>
          
          <button
            onClick={() => onTabChange("konfirmasi")}
            className={`relative px-3 transition-all duration-300 flex items-center justify-center h-full group cursor-pointer ${activeTab === "konfirmasi" ? "text-indigo-600" : "text-slate-500 hover:text-indigo-500"}`}
          >
            <div className={`absolute bottom-0 left-0 w-full h-0.5 transition-all duration-300 ${activeTab === "konfirmasi" ? "bg-indigo-600 scale-x-100" : "bg-transparent scale-x-0"}`}></div>
            <CalendarCheck className="h-6 w-6 group-hover:-translate-y-1 group-hover:scale-110 transition-transform duration-300 relative z-10" />
            <span className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-1 transition-all duration-300 shadow-xl pointer-events-none z-[9999] before:content-[''] before:absolute before:-top-1 before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-b-slate-800">
              Konfirmasi Kehadiran
            </span>
          </button>
          
          <button
            onClick={() => onTabChange("presensi")}
            className={`relative px-3 transition-all duration-300 flex items-center justify-center h-full group cursor-pointer ${activeTab === "presensi" ? "text-red-600" : "text-slate-500 hover:text-red-500"}`}
          >
            <div className={`absolute bottom-0 left-0 w-full h-0.5 transition-all duration-300 ${activeTab === "presensi" ? "bg-red-600 scale-x-100" : "bg-transparent scale-x-0"}`}></div>
            <BarChart2 className="h-6 w-6 group-hover:-translate-y-1 group-hover:scale-110 transition-transform duration-300 relative z-10" />
            <span className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-1 transition-all duration-300 shadow-xl pointer-events-none z-[9999] before:content-[''] before:absolute before:-top-1 before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-b-slate-800">
              Statistik Presensi
            </span>
          </button>

          <button
            onClick={() => onTabChange("peringkat")}
            className={`relative px-3 transition-all duration-300 flex items-center justify-center h-full group cursor-pointer ${activeTab === "peringkat" ? "text-amber-600" : "text-slate-500 hover:text-amber-500"}`}
          >
            <div className={`absolute bottom-0 left-0 w-full h-0.5 transition-all duration-300 ${activeTab === "peringkat" ? "bg-amber-600 scale-x-100" : "bg-transparent scale-x-0"}`}></div>
            <Trophy className="h-6 w-6 group-hover:-translate-y-1 group-hover:scale-110 transition-transform duration-300 relative z-10" />
            <span className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-1 transition-all duration-300 shadow-xl pointer-events-none z-[9999] before:content-[''] before:absolute before:-top-1 before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-b-slate-800">
              Peringkat Kedisiplinan
            </span>
          </button>
          
          {adminRole === "full" && (
            <button
              onClick={() => onTabChange("data")}
              className={`relative px-3 transition-all duration-300 flex items-center justify-center h-full group cursor-pointer ${activeTab === "data" ? "text-red-600" : "text-slate-500 hover:text-red-500"}`}
            >
              <div className={`absolute bottom-0 left-0 w-full h-0.5 transition-all duration-300 ${activeTab === "data" ? "bg-red-600 scale-x-100" : "bg-transparent scale-x-0"}`}></div>
              <Database className="h-6 w-6 group-hover:-translate-y-1 group-hover:scale-110 transition-transform duration-300 relative z-10" />
              <span className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-1 transition-all duration-300 shadow-xl pointer-events-none z-[9999] before:content-[''] before:absolute before:-top-1 before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-b-slate-800">
                Database Admin
              </span>
            </button>
          )}

          {(adminRole === "full" || adminRole === "scanner") && (
            <button
              onClick={() => onTabChange("scanner")}
              className={`relative px-3 transition-all duration-300 flex items-center justify-center h-full group cursor-pointer ${activeTab === "scanner" ? "text-red-600" : "text-slate-500 hover:text-red-500"}`}
            >
              <div className={`absolute bottom-0 left-0 w-full h-0.5 transition-all duration-300 ${activeTab === "scanner" ? "bg-red-600 scale-x-100" : "bg-transparent scale-x-0"}`}></div>
              <Scan className="h-6 w-6 group-hover:-translate-y-1 group-hover:scale-110 transition-transform duration-300 relative z-10" />
              <span className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-1 transition-all duration-300 shadow-xl pointer-events-none z-[9999] before:content-[''] before:absolute before:-top-1 before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-b-slate-800">
                Scanner Presensi
              </span>
            </button>
          )}

          {adminRole && setIsMobileSimMode && (
            <button
              onClick={() => setIsMobileSimMode(!isMobileSimMode)}
              className={`relative px-3 ml-2 transition-all duration-300 flex items-center justify-center group cursor-pointer ${isMobileSimMode ? "text-indigo-500" : "text-slate-400 hover:text-slate-600"}`}
            >
              {isMobileSimMode ? (
                <Monitor className="h-5 w-5 group-hover:-translate-y-1 group-hover:scale-110 transition-transform duration-300" />
              ) : (
                <Smartphone className="h-5 w-5 group-hover:-translate-y-1 group-hover:scale-110 transition-transform duration-300" />
              )}
              <span className="absolute top-[calc(100%+8px)] right-0 md:left-1/2 md:-translate-x-1/2 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-1 transition-all duration-300 shadow-xl pointer-events-none z-[9999] origin-top-right md:origin-top before:content-[''] before:absolute before:-top-1 before:right-3 md:before:left-1/2 md:before:-translate-x-1/2 before:border-4 before:border-transparent before:border-b-slate-800">
                {isMobileSimMode ? "Mode Desktop" : "Simulasi Mobile"}
              </span>
            </button>
          )}

          {setIsDarkMode && (
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`relative px-3 md:ml-1 transition-all duration-300 flex items-center justify-center group cursor-pointer text-slate-400 hover:text-slate-600`}
            >
              {isDarkMode ? (
                <Sun className="h-5 w-5 group-hover:-translate-y-1 group-hover:scale-110 transition-transform duration-300" />
              ) : (
                <Moon className="h-5 w-5 group-hover:-translate-y-1 group-hover:scale-110 transition-transform duration-300" />
              )}
              <span className="absolute top-[calc(100%+8px)] right-0 md:left-1/2 md:-translate-x-1/2 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-1 transition-all duration-300 shadow-xl pointer-events-none z-[9999] origin-top-right md:origin-top before:content-[''] before:absolute before:-top-1 before:right-3 md:before:left-1/2 md:before:-translate-x-1/2 before:border-4 before:border-transparent before:border-b-slate-800">
                {isDarkMode ? "Mode Terang" : "Mode Gelap"}
              </span>
            </button>
          )}

          {!adminRole && (
            <button
              onClick={() => onTabChange("data")}
              className={`relative px-3 ml-2 transition-all duration-300 flex items-center justify-center group cursor-pointer text-slate-300 hover:text-slate-500`}
            >
              <Lock className="h-4 w-4 group-hover:-translate-y-1 group-hover:scale-110 transition-transform duration-300" />
              <span className="absolute top-[calc(100%+8px)] right-0 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-1 transition-all duration-300 shadow-xl pointer-events-none z-[9999] origin-top-right before:content-[''] before:absolute before:-top-1 before:right-3 before:border-4 before:border-transparent before:border-b-slate-800">
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
              <span className="absolute top-[calc(100%+8px)] right-0 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-1 transition-all duration-300 shadow-xl pointer-events-none z-[9999] origin-top-right before:content-[''] before:absolute before:-top-1 before:right-3 before:border-4 before:border-transparent before:border-b-slate-800">
                Keluar
              </span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
