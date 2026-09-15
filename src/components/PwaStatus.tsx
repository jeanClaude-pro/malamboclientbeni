import { useEffect, useState } from "react";
import { Download, RefreshCw, WifiOff } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [restored, setRestored] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW();

  useEffect(() => {
    let timer = 0;
    const handleOffline = () => { setOnline(false); setRestored(false); };
    const handleOnline = () => { setOnline(true); setRestored(true); timer = window.setTimeout(() => setRestored(false), 3000); };
    const handleInstall = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent); };
    const handleInstalled = () => setInstallPrompt(null);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    window.addEventListener("beforeinstallprompt", handleInstall);
    window.addEventListener("appinstalled", handleInstalled);
    return () => { window.clearTimeout(timer); window.removeEventListener("offline", handleOffline); window.removeEventListener("online", handleOnline); window.removeEventListener("beforeinstallprompt", handleInstall); window.removeEventListener("appinstalled", handleInstalled); };
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  if (online && !restored && !needRefresh && !installPrompt) return null;
  return (
    <div className="no-print fixed inset-x-3 top-[4.5rem] z-[45] mx-auto flex max-w-xl flex-col gap-2" aria-live="polite">
      {!online && <div className="flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-xl"><WifiOff className="h-4 w-4" /> Hors connexion — les enregistrements sont désactivés.</div>}
      {restored && <div className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white shadow-xl">Connexion rétablie.</div>}
      {needRefresh && <div className="flex items-center gap-3 rounded-xl bg-white p-3 text-sm text-slate-800 shadow-xl ring-1 ring-slate-200"><span className="flex-1 font-semibold">Une mise à jour est prête.</span><button type="button" onClick={() => updateServiceWorker(true)} className="compact-control inline-flex h-10 items-center gap-2 rounded-lg bg-blue-700 px-3 font-bold text-white"><RefreshCw className="h-4 w-4" /> Actualiser</button><button type="button" onClick={() => setNeedRefresh(false)} className="compact-control h-10 px-2 text-slate-500">Plus tard</button></div>}
      {installPrompt && !needRefresh && <button type="button" onClick={install} className="self-end inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white shadow-xl"><Download className="h-4 w-4" /> Installer l’application</button>}
    </div>
  );
}
