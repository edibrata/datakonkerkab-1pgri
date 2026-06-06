import { Home, ClipboardList, Database } from "lucide-react";

interface Props {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Navigation({ activeTab, onTabChange }: Props) {
  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50 border-b border-slate-200">
      <div className="max-w-[96%] mx-auto px-4 flex justify-between items-center h-14 md:h-16">
        <div
          className="flex items-center gap-2 md:gap-3 cursor-pointer group tooltip-container"
          onClick={() => onTabChange("beranda")}
        >
          <img
            src="https://raw.githubusercontent.com/edibrata/image/main/Logo%20PGRI%20Official%20Full.png"
            alt="Logo PGRI"
            className="h-8 md:h-10 w-auto"
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
          <button
            onClick={() => onTabChange("beranda")}
            className={`nav-link px-3 transition-all border-b-2 flex items-center justify-center h-full group tooltip-container ${activeTab === "beranda" ? "text-red-600 border-red-600" : "border-transparent text-slate-500 hover:text-red-500"}`}
          >
            <Home className="h-6 w-6" />
            <span className="tooltip-text" style={{ width: "auto" }}>
              Beranda
            </span>
          </button>
          <button
            onClick={() => onTabChange("formulir")}
            className={`nav-link px-3 transition-all border-b-2 flex items-center justify-center h-full group tooltip-container ${activeTab === "formulir" ? "text-red-600 border-red-600" : "border-transparent text-slate-500 hover:text-red-500"}`}
          >
            <ClipboardList className="h-6 w-6" />
            <span className="tooltip-text" style={{ width: "auto" }}>
              Pendaftaran
            </span>
          </button>
          <button
            onClick={() => onTabChange("data")}
            className={`nav-link px-3 transition-all border-b-2 flex items-center justify-center h-full group tooltip-container ${activeTab === "data" ? "text-red-600 border-red-600" : "border-transparent text-slate-500 hover:text-red-500"}`}
          >
            <Database className="h-6 w-6" />
            <span className="tooltip-text" style={{ width: "auto" }}>
              Database Admin
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
}
