import { useState } from "react";

interface Props {
  onLoginSuccess: (role: "full" | "scanner") => void;
  showModal: (title: string, message: string, type: "success" | "error") => void;
}

export function AdminLogin({ onLoginSuccess, showModal }: Props) {
  const [password, setPassword] = useState(localStorage.getItem("pgri_admin_pass") || "");
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(!!localStorage.getItem("pgri_admin_pass"));

  const checkAdmin = () => {
    if (password === "adminpgri") {
      if (rememberMe) localStorage.setItem("pgri_admin_pass", password);
      onLoginSuccess("full");
    } else if (password === "adminscan") {
      if (rememberMe) localStorage.setItem("pgri_admin_pass", password);
      onLoginSuccess("scanner");
    } else {
      showModal("AKSES DITOLAK", "Password salah.", "error");
    }
  };

  return (
    <div className="max-w-md mx-auto py-10">
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-xl text-center">
        <img
          src="https://github.com/edibrata/image/blob/main/Logo%20PGRI%20Official.png?raw=true"
          alt="Logo"
          referrerPolicy="no-referrer"
          className="h-16 w-auto mx-auto mb-6 drop-shadow-sm"
        />
        <h2 className="text-xl font-bold mb-6 uppercase text-slate-800">
          Akses Administrator
        </h2>
        <div className="relative mb-4">
          <input
            type={showPass ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === "Enter") checkAdmin();
            }}
            className="w-full px-4 py-3 rounded-lg border border-slate-300 text-center font-black pr-12 text-lg tracking-widest outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all text-slate-800 bg-slate-50 placeholder:text-slate-400"
            placeholder="KATA SANDI"
          />
          <button
            onClick={() => setShowPass(!showPass)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
          >
            {showPass ? (
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.52 13.16 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="2.5"
                />
                <line
                  x1="2"
                  x2="22"
                  y1="2"
                  y2="22"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.036 12.322a1.012 1.012 0 010-.644C3.399 8.049 7.39 5 12 5s8.601 3.049 9.964 6.678c.07.186.07.388 0 .574-1.364 3.629-5.355 6.678-9.964 6.678s-8.601-3.049-9.964-6.678z"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="2.5"
                />
              </svg>
            )}
          </button>
        </div>
        <div className="flex items-center justify-center gap-2 mb-6">
          <input
            type="checkbox"
            id="rememberMe"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
          />
          <label
            htmlFor="rememberMe"
            className="text-xs font-bold uppercase text-slate-500 cursor-pointer"
          >
            Ingat Saya
          </label>
        </div>
        <button
          onClick={checkAdmin}
          className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-black text-xs uppercase tracking-widest cursor-pointer transition-all active:scale-95 shadow-md"
        >
          Masuk Administrator
        </button>
      </div>
    </div>
  );
}
