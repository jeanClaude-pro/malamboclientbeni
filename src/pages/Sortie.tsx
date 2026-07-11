/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
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

  const isAdmin = currentUser?.role === "admin";
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
    try {
      setLoadingRate(true);
      const response = await fetch(`${API_BASE}/exchange-rates/current`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setExchangeRate(data);
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
    <div className="min-h-screen bg-gradient-to-br from-black via-blue-950 to-black p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with Exchange Rate */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <FileText className="w-7 h-7 text-blue-400" />
                Nouvelle Sortie de Caisse
              </h2>
              <p className="text-blue-200/70 mt-1">
                Enregistrez les dépenses avec gestion multi-devises
              </p>
            </div>
            
            {/* Exchange Rate Display */}
            <div className="bg-gradient-to-br from-blue-900 to-blue-950 border border-blue-700/50 rounded-xl p-4 min-w-[280px] shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-400" />
                  <span className="font-semibold text-blue-200">Taux du jour:</span>
                </div>
                {loadingRate ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                ) : exchangeRate ? (
                  <div className="text-right">
                    <div className="font-bold text-white text-lg">
                      1 USD = {new Intl.NumberFormat('fr-FR').format(exchangeRate.rate)} FC
                    </div>
                    <div className="text-xs text-blue-300/70">
                      Effectif depuis {new Date(exchangeRate.effectiveFrom).toLocaleDateString('fr-FR', { timeZone: 'Africa/Johannesburg' })}
                    </div>
                  </div>
                ) : (
                  <span className="text-red-400 text-sm">Taux non disponible</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {message && (
          <div className="mb-6 p-4 bg-green-900/50 border border-green-700/50 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
            <p className="text-green-300">{message}</p>
            <button
              onClick={() => setMessage(null)}
              className="ml-auto text-green-400 hover:text-green-300"
            >
              ×
            </button>
          </div>
        )}
        
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700/50 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-300">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              ×
            </button>
          </div>
        )}

        <div className="bg-gradient-to-br from-gray-900 to-blue-950 shadow-xl rounded-xl border border-blue-800/50 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-900 to-purple-900 p-6 border-b border-blue-800/50">
            <h3 className="text-xl font-semibold text-white text-center flex items-center justify-center gap-2">
              <Wallet className="w-5 h-5 text-blue-300" />
              Enregistrement de Dépense
            </h3>
            <p className="text-blue-200 text-center mt-2">
              Enregistrez les sorties de caisse pour le suivi des dépenses
            </p>
          </div>

          <form onSubmit={handleSortie} className="p-6 space-y-6">
            {/* Reason for Expense */}
            <div>
              <label className="block mb-2 font-medium text-blue-200">
                Raison de la dépense *
              </label>
              <input
                type="text"
                name="reason"
                value={form.reason}
                onChange={handleChange}
                placeholder="Ex: Achat fournitures bureau, Transport, etc."
                className="w-full p-3 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-blue-300/50 transition-all"
                required
              />
            </div>

            {/* Recipient Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 font-medium text-blue-200">
                  <User className="w-4 h-4 inline mr-1" />
                  Nom du bénéficiaire *
                </label>
                <input
                  type="text"
                  name="recipientName"
                  value={form.recipientName}
                  onChange={handleChange}
                  placeholder="Nom complet"
                  className="w-full p-3 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-blue-300/50 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block mb-2 font-medium text-blue-200">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Téléphone du bénéficiaire *
                </label>
                <input
                  type="tel"
                  name="recipientPhone"
                  value={form.recipientPhone}
                  onChange={handleChange}
                  placeholder="Numéro de téléphone"
                  className="w-full p-3 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-blue-300/50 transition-all"
                  required
                />
              </div>
            </div>

            {/* Amount and Payment Method */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block font-medium text-blue-200">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Montant *
                  </label>
                  <button
                    type="button"
                    onClick={toggleCurrencyMode}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-900/30 hover:bg-blue-800/50 text-blue-300 rounded-md transition-colors border border-blue-800/30"
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
                    className="w-full p-3 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-blue-300/50 transition-all"
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
                    className="w-full p-3 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-blue-300/50 transition-all"
                    required
                  />
                )}
                
                {/* Conversion Display */}
                {form.amount && form.currencyMode === 'usd' && exchangeRate && (
                  <p className="text-xs text-green-400 mt-1">
                    ≈ {formatFc(parseFloat(form.amount) * exchangeRate.rate)}
                  </p>
                )}
                {form.amountInFC && form.currencyMode === 'fc' && exchangeRate && (
                  <p className="text-xs text-green-400 mt-1">
                    ≈ {formatCurrency(parseFloat(form.amountInFC) / exchangeRate.rate)}
                  </p>
                )}
              </div>

              <div>
                <label className="block mb-2 font-medium text-blue-200">
                  Méthode de paiement *
                </label>
                <select
                  name="paymentMethod"
                  value={form.paymentMethod}
                  onChange={handleChange}
                  className="w-full p-3 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white transition-all"
                  required
                >
                  <option value="cash" className="bg-gray-900">Cash</option>
                  <option value="mpesa" className="bg-gray-900">M-Pesa ou Airtel Money</option>
                  <option value="bank" className="bg-gray-900">Transfert Bancaire</option>
                  <option value="card" className="bg-gray-900">Carte</option>
                  <option value="other" className="bg-gray-900">Autre</option>
                </select>
              </div>
            </div>

            {/* Amount Summary */}
            {form.amount && exchangeRate && (
              <div className="bg-black/30 p-4 rounded-lg border border-blue-800/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-blue-300">Montant en USD</div>
                    <div className="text-lg font-bold text-green-400">
                      {formatCurrency(parseFloat(form.amount))}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-blue-300">Équivalent en FC</div>
                    <div className="text-lg font-bold text-blue-400">
                      {formatFc(parseFloat(form.amount) * exchangeRate.rate)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Additional Notes */}
            <div>
              <label className="block mb-2 font-medium text-blue-200">
                Notes supplémentaires (optionnel)
              </label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Détails supplémentaires sur cette dépense..."
                rows={3}
                className="w-full p-3 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-blue-300/50 transition-all resize-none"
              />
            </div>

            {/* Recorded By */}
            <div className="bg-black/30 p-4 rounded-lg border border-blue-800/30">
              <label className="block mb-1 text-sm font-medium text-blue-300">
                Enregistré par
              </label>
              <p className="text-white font-medium">
                {currentUser?.username || "Utilisateur"}
              </p>
            </div>

            {/* Date de l'opération — Admin uniquement */}
            {isAdmin && (
              <div className="mt-4 bg-gradient-to-br from-amber-950 to-orange-950 rounded-xl p-4 border border-amber-700/50">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-5 h-5 text-amber-400" />
                  <h3 className="font-semibold text-amber-300 text-sm">Date de l'opération (Admin)</h3>
                </div>
                <input
                  type="date"
                  value={operationDate}
                  max={getTodayDate()}
                  onChange={(e) => setOperationDate(e.target.value)}
                  className="w-full p-3 bg-black/30 border border-amber-700/50 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                />
                <p className="mt-2 text-xs text-amber-300/80">
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
                  : "bg-gray-800 cursor-not-allowed text-gray-500 border border-gray-700"
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
          <div className="bg-blue-900/30 border-t border-blue-800/50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <Info className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-blue-300">
                  Information importante
                </h3>
                <div className="mt-1 text-sm text-blue-200">
                  <p>
                    Cette dépense sera enregistrée comme une sortie de caisse et ne sera pas comptabilisée dans les ventes.
                    Le reçu pourra être imprimé ultérieurement depuis l'historique des sorties.
                  </p>
                  {exchangeRate && (
                    <p className="mt-2 font-medium text-blue-300 bg-black/30 p-2 rounded-lg border border-blue-800/30">
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
