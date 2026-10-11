import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";

interface ExportPdfButtonProps {
  /** Fetches every matching record from the backend and builds the PDF. Returns the record count. */
  onExport: () => Promise<number | void>;
  label?: string;
  disabled?: boolean;
  className?: string;
}

/** "Télécharger PDF" with progress and offline states. */
export default function ExportPdfButton({ onExport, label = "Télécharger PDF", disabled = false, className = "" }: ExportPdfButtonProps) {
  const online = useOnlineStatus();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const count = await onExport();
      if (typeof count === "number") {
        toast.success(`PDF généré : ${count.toLocaleString("fr-FR")} enregistrement${count > 1 ? "s" : ""}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Échec de la génération du PDF");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={run}
      disabled={busy || disabled || !online}
      title={online ? undefined : "Connexion requise pour exporter"}
      aria-busy={busy}
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
      {busy ? "Préparation du PDF…" : online ? label : "Hors connexion"}
    </button>
  );
}
