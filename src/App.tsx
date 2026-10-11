"use client";

import { lazy, Suspense } from "react";

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Navbar from "./components/Navbar";
import { RequireAuth } from "./components/RequireAuth";
import { AuthProvider } from "./context/AuthProvider";
import { useAuth } from "./hooks/useAuth";
import MobileNavigation from "./components/MobileNavigation";
import PwaStatus from "./components/PwaStatus";
import DialogAccessibility from "./components/DialogAccessibility";
import LoginPage from "./pages/login";

// Every business screen is loaded only when its route is opened. The previous
// eager imports put the POS, every history screen and jsPDF in the initial
// bundle, delaying even the login and dashboard on slower phones.
const Products = lazy(() => import("./pages/Product"));
const SalesHistory = lazy(() => import("./pages/SalesHistory"));
const CompanyReport = lazy(() => import("./pages/CompanyReport"));
const StockSheet = lazy(() => import("./pages/StockSheet"));
const Customers = lazy(() => import("./pages/Customers"));
const NewSale = lazy(() => import("./pages/NewSale"));
const Sortie = lazy(() => import("./pages/Sortie"));
const SortieHistory = lazy(() => import("./pages/SortieHistory"));
const Rate = lazy(() => import("./pages/Rate"));
const Entry = lazy(() => import("./pages/Entry"));
const EntryHistory = lazy(() => import("./pages/EntryHistory"));
const Cars = lazy(() => import("./pages/Cars"));
const CarsHistory = lazy(() => import("./pages/CarsHistory"));
const Transfert = lazy(() => import("./pages/Transfert"));
const TransfertHistory = lazy(() => import("./pages/TransfertHistory"));
const TransferReception = lazy(() => import("./pages/TransferReception"));
const TransferReceptionHistory = lazy(() => import("./pages/TransferReceptionHistory"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Users = lazy(() => import("./pages/Users"));
const SuperadminLanding = lazy(() => import("./pages/SuperadminLanding"));

function RouteLoading() {
  return (
    <div className="flex min-h-[45dvh] items-center justify-center px-4" role="status" aria-live="polite">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" aria-hidden="true" />
      <span className="ml-3 text-sm font-semibold text-slate-600">Chargement du module…</span>
    </div>
  );
}

// Reactive counterpart to RequireAuth: reads from AuthContext (not a one-off
// localStorage snapshot) so it stays correct across login/logout without
// needing a full page reload — see AuthProvider's token-refreshed/logout
// event listeners for how that state is kept in sync.
function LoginRoute() {
  const { token, loading } = useAuth();
  if (loading) return <RouteLoading />;
  return token ? <Navigate to="/" replace /> : <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastContainer position="top-right" autoClose={3000} newestOnTop />

      <Router>
        <div className="min-h-dvh bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50 text-slate-900">
          <Navbar />
          <PwaStatus />
          <DialogAccessibility />

          {/* Main content */}
          <main className="min-h-dvh min-w-0 overflow-x-clip">
            <div className="min-h-dvh w-full min-w-0 overflow-x-clip bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50 text-slate-900 [&_table]:min-w-[720px] [&_table]:bg-white [&_table]:text-slate-700 [&_thead]:bg-slate-950 [&_thead]:text-white [&_.overflow-x-auto]:max-w-full [&_.overflow-auto]:max-w-full max-sm:[&_.p-6]:p-4">
              <Suspense fallback={<RouteLoading />}>
              <Routes>
                <Route
                  path="/products"
                  element={
                    <RequireAuth>
                      <Products />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/new-sale"
                  element={
                    <RequireAuth>
                      <NewSale />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/entry"
                  element={
                    <RequireAuth>
                      <Entry />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/entryhistory"
                  element={
                    <RequireAuth>
                      <EntryHistory />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/cars"
                  element={
                    <RequireAuth>
                      <Cars />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/rate"
                  element={
                    <RequireAuth>
                      <Rate />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/carshistory"
                  element={
                    <RequireAuth>
                      <CarsHistory />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/sortie"
                  element={
                    <RequireAuth>
                      <Sortie />
                    </RequireAuth>
                  }
                />
                
                <Route
                  path="/sortiehistory"
                  element={
                    <RequireAuth>
                      <SortieHistory />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/transfert"
                  element={
                    <RequireAuth>
                      <Transfert />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/transferthistory"
                  element={
                    <RequireAuth>
                      <TransfertHistory />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/transfer-reception"
                  element={
                    <RequireAuth>
                      <TransferReception />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/transfer-reception-history"
                  element={
                    <RequireAuth>
                      <TransferReceptionHistory />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/"
                  element={
                    <RequireAuth>
                      <Analytics />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/workspace"
                  element={
                    <RequireAuth>
                      <SuperadminLanding />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/sales"
                  element={
                    <RequireAuth>
                      <SalesHistory />
                    </RequireAuth>
                  }
                />
                
                <Route
                  path="/fiche-de-stock"
                  element={
                    <RequireAuth>
                      <StockSheet />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <RequireAuth>
                      <CompanyReport />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/customers"
                  element={
                    <RequireAuth>
                      <Customers />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <RequireAuth>
                      <Users />
                    </RequireAuth>
                  }
                />
                <Route path="/login" element={<LoginRoute />} />
              </Routes>
              </Suspense>
            </div>
          </main>
          <MobileNavigation />
        </div>
      </Router>
    </AuthProvider>
  );
}
