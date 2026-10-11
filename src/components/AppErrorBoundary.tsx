import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

/** Keeps an unexpected render/DOM failure from leaving the ERP as a blank page. */
export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Application rendering error", error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-4 text-slate-900">
        <section className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-xl" role="alert">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-700">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-xl font-bold">L'interface doit être rechargée</h1>
          <p className="mt-2 text-sm text-slate-600">
            Vos données enregistrées ne sont pas affectées. Rechargez l'application pour reprendre votre travail.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 font-semibold text-white hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Recharger l'application
          </button>
        </section>
      </main>
    );
  }
}
