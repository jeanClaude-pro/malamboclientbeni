/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { getActiveBranchId } from "../services/dataSync";
import {
  Calendar,
  Calculator,
  DollarSign,
  RefreshCw,
  User,
  Phone,
  Wallet,
  FileText,
  Info,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

function getTodayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface SortieForm {
  reason: string;
  recipientName: string;
  recipientPhone: string;
  amount: string;
  amountInFC: string;
  paymentMethod: "cash" | "mpesa" | "bank" | "card" | "other";
  notes: string;
  currencyMode: "usd" | "fc";
}

interface ExchangeRate {
  rate: number;
  effectiveFrom: string;
  lastUpdated: string;
}

const API_BASE = import.meta.env.VITE_API_URL;

async function readJsonSafe(res: Response) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  const text = await res.text();
  return { __nonJson: true, text };
}

export default function Sortie() {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null);
  const [loadingRate, setLoadingRate] = useState(true);

  // Get the current user from your auth context
  const { user: currentUser } = useAuth();

  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "superadmin";
  const [operationDate, setOperationDate] = useState(getTodayDate());

  const [form, setForm] = useState<SortieForm>({
    reason: "",
    recipientName: "",
    recipientPhone: "",
    amount: "",
    amountInFC: "",
    paymentMethod: "cash",
    notes: "",
    currencyMode: "usd",
  });

  // Load exchange rate
  const loadExchangeRate = async () => {
    const requestedBranch = getActiveBranchId();
    try {
      setLoadingRate(true);
      const response = await fetch(`${API_BASE}/exchange-rates/current`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (getActiveBranchId() === requestedBranch) setExchangeRate(data);
      } else {
        console.warn('Failed to load exchange rate');
      }
    } catch (error) {
      console.error('Error loading exchange rate:', error);
    } finally {
      setLoadingRate(false);
    }
  };

  useEffect(() => {
    loadExchangeRate();
  }, []);

  useEffect(() => {
    const handleDataChange = () => { void loadExchangeRate(); };
    window.addEventListener("appDataChanged", handleDataChange);
    return () => window.removeEventListener("appDataChanged", handleDataChange);
  }, []);

  // Calculate USD amount when FC amount changes
  useEffect(() => {
    if (form.currencyMode === "fc" && form.amountInFC && exchangeRate) {
      const fcAmount = parseFloat(form.amountInFC) || 0;
      const usdAmount = fcAmount / exchangeRate.rate;
      setForm(prev => ({
        ...prev,
        amount: usdAmount.toFixed(2)
      }));
    }
  }, [form.amountInFC, form.currencyMode, exchangeRate]);

  // Calculate FC amount when USD amount changes
  useEffect(() => {
    if (form.currencyMode === "usd" && form.amount && exchangeRate) {
      const usdAmount = parseFloat(form.amount) || 0;
      const fcAmount = usdAmount * exchangeRate.rate;
      setForm(prev => ({
        ...prev,
        amountInFC: Math.round(fcAmount).toString()
      }));
    }
  }, [form.amount, form.currencyMode, exchangeRate]);

  const isFormValid =
    form.reason.trim() !== "" &&
    form.recipientName.trim() !== "" &&
    form.recipientPhone.trim() !== "" &&
    parseFloat(form.amount) > 0;

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  // Toggle between USD and FC input modes
  const toggleCurrencyMode = () => {
    setForm(prev => ({
      ...prev,
      currencyMode: prev.currencyMode === "usd" ? "fc" : "usd",
      amount: "",
      amountInFC: ""
    }));
  };

  function authHeader(): Record<string, string> {
    const token =
      localStorage.getItem("authToken") || localStorage.getItem("token") || "";
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatFc = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' FC';
  };

  async function handleSortie(e: React.FormEvent) {
    e.preventDefault();
    if (!isFormValid) return;

    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const body = {
        reason: form.reason,
        recipientName: form.recipientName,
        recipientPhone: form.recipientPhone,
        amount: parseFloat(form.amount),
        paymentMethod: form.paymentMethod,
        notes: form.notes || "",
        recordedBy: currentUser?.username || "unknown",
        ...(isAdmin && operationDate && operationDate !== getTodayDate() && {
          operationDate,
        }),
      };

      // ✅ Changed from /sales to /expenses
      const res = await fetch(`${API_BASE}/expenses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
        body: JSON.stringify(body),
      });

      const data = await readJsonSafe(res);
      if (!res.ok) {
        const msg =
          (data as any)?.error ||
          (data as any)?.text ||
          `Expense recording failed: ${res.status}`;
        throw new Error(msg);
      }

      // Reset form on success
      setForm({
        reason: "",
        recipientName: "",
        recipientPhone: "",
        amount: "",
        amountInFC: "",
        paymentMethod: "cash",
        notes: "",
        currencyMode: "usd",
      });

      setMessage("✅ Dépense enregistrée avec succès !");
    } catch (e: any) {
      setError(e?.message || "La dépense n'a pas pu être enregistrée");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with Exchange Rate */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-950 flex items-center gap-2">
                <FileText className="w-7 h-7 text-blue-600" />
                Nouvelle Sortie de Caisse
              </h2>
              <p className="text-slate-600 mt-1">
                Enregistrez les dépenses avec gestion multi-devises
              </p>
            </div>
            
            {/* Exchange Rate Display */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 min-w-[280px] shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-slate-600">Taux du jour:</span>
                </div>
                {loadingRate ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                ) : exchangeRate ? (
                  <div className="text-right">
                    <div className="font-bold text-slate-950 text-lg">
                      1 USD = {new Intl.NumberFormat('fr-FR').format(exchangeRate.rate)} FC
                    </div>
                    <div className="text-xs text-slate-500">
                      Effectif depuis {new Date(exchangeRate.effectiveFrom).toLocaleDateString('fr-FR', { timeZone: 'Africa/Johannesburg' })}
                    </div>
                  </div>
                ) : (
                  <span className="text-rose-600 text-sm">Taux non disponible</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {message && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <p className="text-emerald-700">{message}</p>
            <button
              onClick={() => setMessage(null)}
              className="ml-auto text-emerald-600 hover:text-emerald-700"
            >
              ×
            </button>
          </div>
        )}
        
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <p className="text-rose-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-rose-600 hover:text-rose-700"
            >
              ×
            </button>
          </div>
        )}

        <div className="bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 border-b border-blue-400/30">
            <h3 className="text-xl font-semibold text-white text-center flex items-center justify-center gap-2">
              <Wallet className="w-5 h-5 text-blue-100" />
              Enregistrement de Dépense
            </h3>
            <p className="text-blue-100 text-center mt-2">
              Enregistrez les sorties de caisse pour le suivi des dépenses
            </p>
          </div>

          <form onSubmit={handleSortie} className="p-6 space-y-6">
            {/* Reason for Expense */}
            <div>
              <label className="block mb-2 font-medium text-slate-600">
                Raison de la dépense *
              </label>
              <input
                type="text"
                name="reason"
                value={form.reason}
                onChange={handleChange}
                placeholder="Ex: Achat fournitures bureau, Transport, etc."
                className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400 transition-all"
                required
              />
            </div>

            {/* Recipient Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 font-medium text-slate-600">
                  <User className="w-4 h-4 inline mr-1" />
                  Nom du bénéficiaire *
                </label>
                <input
                  type="text"
                  name="recipientName"
                  value={form.recipientName}
                  onChange={handleChange}
                  placeholder="Nom complet"
                  className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block mb-2 font-medium text-slate-600">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Téléphone du bénéficiaire *
                </label>
                <input
                  type="tel"
                  name="recipientPhone"
                  value={form.recipientPhone}
                  onChange={handleChange}
                  placeholder="Numéro de téléphone"
                  className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400 transition-all"
                  required
                />
              </div>
            </div>

            {/* Amount and Payment Method */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block font-medium text-slate-600">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Montant *
                  </label>
                  <button
                    type="button"
                    onClick={toggleCurrencyMode}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-md transition-colors border border-slate-200"
                  >
                    <Calculator className="w-3 h-3" />
                    {form.currencyMode === 'usd' ? 'USD → FC' : 'FC → USD'}
                  </button>
                </div>
                
                {form.currencyMode === 'usd' ? (
                  <input
                    type="number"
                    step="0.01"
                    name="amount"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="0.00"
                    min="0.01"
                    className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400 transition-all"
                    required
                  />
                ) : (
                  <input
                    type="number"
                    name="amountInFC"
                    value={form.amountInFC}
                    onChange={(e) => setForm({ ...form, amountInFC: e.target.value })}
                    placeholder="0"
                    min="1"
                    className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400 transition-all"
                    required
                  />
                )}
                
                {/* Conversion Display */}
                {form.amount && form.currencyMode === 'usd' && exchangeRate && (
                  <p className="text-xs text-emerald-600 mt-1">
                    ≈ {formatFc(parseFloat(form.amount) * exchangeRate.rate)}
                  </p>
                )}
                {form.amountInFC && form.currencyMode === 'fc' && exchangeRate && (
                  <p className="text-xs text-emerald-600 mt-1">
                    ≈ {formatCurrency(parseFloat(form.amountInFC) / exchangeRate.rate)}
                  </p>
                )}
              </div>

              <div>
                <label className="block mb-2 font-medium text-slate-600">
                  Méthode de paiement *
                </label>
                <select
                  name="paymentMethod"
                  value={form.paymentMethod}
                  onChange={handleChange}
                  className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 transition-all"
                  required
                >
                  <option value="cash" className="bg-white">Cash</option>
                  <option value="mpesa" className="bg-white">M-Pesa ou Airtel Money</option>
                  <option value="bank" className="bg-white">Transfert Bancaire</option>
                  <option value="card" className="bg-white">Carte</option>
                  <option value="other" className="bg-white">Autre</option>
                </select>
              </div>
            </div>

            {/* Amount Summary */}
            {form.amount && exchangeRate && (
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-slate-500">Montant en USD</div>
                    <div className="text-lg font-bold text-emerald-600">
                      {formatCurrency(parseFloat(form.amount))}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-slate-500">Équivalent en FC</div>
                    <div className="text-lg font-bold text-blue-600">
                      {formatFc(parseFloat(form.amount) * exchangeRate.rate)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Additional Notes */}
            <div>
              <label className="block mb-2 font-medium text-slate-600">
                Notes supplémentaires (optionnel)
              </label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Détails supplémentaires sur cette dépense..."
                rows={3}
                className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400 transition-all resize-none"
              />
            </div>

            {/* Recorded By */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <label className="block mb-1 text-sm font-medium text-slate-500">
                Enregistré par
              </label>
              <p className="text-slate-900 font-medium">
                {currentUser?.username || "Utilisateur"}
              </p>
            </div>

            {/* Date de l'opération — Admin uniquement */}
            {isAdmin && (
              <div className="mt-4 bg-amber-50 rounded-xl p-4 border border-amber-200">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-5 h-5 text-amber-600" />
                  <h3 className="font-semibold text-amber-700 text-sm">Date de l'opération (Admin)</h3>
                </div>
                <input
                  type="date"
                  value={operationDate}
                  max={getTodayDate()}
                  onChange={(e) => setOperationDate(e.target.value)}
                  className="w-full p-3 bg-white border border-amber-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                />
                <p className="mt-2 text-xs text-amber-700/80">
                  Cette sortie sera enregistrée et comptabilisée à cette date dans l'historique et les rapports.
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isFormValid || submitting}
              className={`w-full py-4 px-4 rounded-xl text-white font-semibold transition-all duration-200 ${
                isFormValid && !submitting
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-900/50 border border-blue-400/30 transform hover:scale-[1.02]"
                  : "bg-slate-200 cursor-not-allowed text-slate-400 border border-slate-300"
              }`}
            >
              {submitting ? (
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Enregistrement...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Wallet className="w-5 h-5" />
                  📝 Enregistrer la Dépense
                </div>
              )}
            </button>
          </form>

          {/* Info Box */}
          <div className="bg-blue-50 border-t border-slate-200 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <Info className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-700">
                  Information importante
                </h3>
                <div className="mt-1 text-sm text-slate-600">
                  <p>
                    Cette dépense sera enregistrée comme une sortie de caisse et ne sera pas comptabilisée dans les ventes.
                    Le reçu pourra être imprimé ultérieurement depuis l'historique des sorties.
                  </p>
                  {exchangeRate && (
                    <p className="mt-2 font-medium text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200">
                      💱 Taux utilisé: 1 USD = {new Intl.NumberFormat('fr-FR').format(exchangeRate.rate)} FC
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
