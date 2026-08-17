"use client";

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Navbar from "./components/Navbar";
import Products from "./pages/Product";
import SalesHistory from "./pages/SalesHistory";
import CompanyReport from "./pages/CompanyReport";
import Customers from "./pages/Customers";
import LoginPage from "./pages/login";
import NewSale from "./pages/NewSale";
import Sortie from "./pages/Sortie";
import SortieHistory  from "./pages/SortieHistory";
import Rate from "./pages/Rate";
import Entry from "./pages/Entry";
import EntryHistory from "./pages/EntryHistory";
import { RequireAuth } from "./components/RequireAuth";
import { AuthProvider } from "./context/AuthProvider";
import Cars from "./pages/Cars";
import CarsHistory  from "./pages/CarsHistory";
import Transfert from "./pages/Transfert";
import TransfertHistory from "./pages/TransfertHistory";
import TransferReception from "./pages/TransferReception";
import TransferReceptionHistory from "./pages/TransferReceptionHistory";
import Analytics from "./pages/Analytics";
import Users from "./pages/Users";

export default function App() {
  const token = localStorage.getItem("token");
  const isAuthenticated = !!token;

  return (
    <AuthProvider>
      <ToastContainer position="top-right" autoClose={3000} newestOnTop />

      <Router>
        <div className="min-h-dvh bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50 text-slate-900">
          <Navbar />

          {/* Main content */}
          <main className="min-h-dvh min-w-0 overflow-x-hidden">
            <div className="min-h-dvh w-full min-w-0 overflow-x-hidden bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50 text-slate-900 [&_table]:min-w-[720px] [&_table]:bg-white [&_table]:text-slate-700 [&_thead]:bg-slate-950 [&_thead]:text-white [&_.overflow-x-auto]:max-w-full [&_.overflow-auto]:max-w-full max-sm:[&_.p-6]:p-4">
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
                  path="/sales"
                  element={
                    <RequireAuth>
                      <SalesHistory />
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
                <Route
                  path="/login"
                  element={
                    isAuthenticated ? (
                      <Navigate to="/" replace />
                    ) : (
                      <LoginPage />
                    )
                  }
                />
              </Routes>
            </div>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}
