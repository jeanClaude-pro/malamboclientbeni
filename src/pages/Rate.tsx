import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  RefreshCw, 
  History, 
  Save, 
  Edit, 
  TrendingUp,
  Calendar,
  User,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { getActiveBranchId } from '../services/dataSync';

interface TauxChange {
  _id: string;
  rate: number;
  effectiveFrom: string;
  createdBy: {
    _id: string;
    username: string;
    email: string;
  };
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface HistoriqueTaux {
  _id: string;
  rate: number;
  effectiveFrom: string;
  createdBy: {
    username: string;
    email: string;
  };
  isActive: boolean;
  notes?: string;
  createdAt: string;
}

const API_BASE = import.meta.env.VITE_API_URL;

export default function TauxChange() {
  const [tauxActuel, setTauxActuel] = useState<TauxChange | null>(null);
  const [historiqueTaux, setHistoriqueTaux] = useState<HistoriqueTaux[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // État du formulaire
  const [form, setForm] = useState({
    rate: '',
    effectiveFrom: '',
    notes: ''
  });

  // Charger le taux actuel et l'historique
  const chargerTaux = async () => {
    const requestedBranch = getActiveBranchId();
    try {
      setLoading(true);
      setError(null);

      // Charger le taux actuel
      const reponseActuel = await fetch(`${API_BASE}/exchange-rates/current`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });

      if (reponseActuel.ok) {
        const donneesActuel = await reponseActuel.json();
        console.log('Données taux actuel:', donneesActuel); // Debug log

        if (getActiveBranchId() !== requestedBranch) return; // stale — branch changed mid-flight

        // Handle different response structures
        if (donneesActuel.rate) {
          // If the response has a rate object (from POST response)
          setTauxActuel(donneesActuel.rate);
        } else if (donneesActuel._id) {
          // If the response is the rate object itself
          setTauxActuel(donneesActuel);
        } else {
          setTauxActuel(null);
        }
      } else {
        console.warn('Aucun taux actuel trouvé ou erreur de chargement');
        setTauxActuel(null);
      }

      // Charger l'historique des taux
      const reponseHistorique = await fetch(`${API_BASE}/exchange-rates/history?limit=20`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });

      if (reponseHistorique.ok) {
        const donneesHistorique = await reponseHistorique.json();
        console.log('Données historique:', donneesHistorique); // Debug log
        if (getActiveBranchId() !== requestedBranch) return; // stale — branch changed mid-flight
        setHistoriqueTaux(donneesHistorique.history || donneesHistorique || []);
      } else if (reponseHistorique.status === 403) {
        setError('Vous n\'avez pas la permission de voir l\'historique des taux');
      } else {
        setHistoriqueTaux([]);
      }

    } catch (error) {
      console.error('Erreur lors du chargement des taux:', error);
      setError('Échec du chargement des taux de change');
      setTauxActuel(null);
      setHistoriqueTaux([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chargerTaux();
  }, []);

  useEffect(() => {
    const handleDataChange = () => { void chargerTaux(); };
    window.addEventListener("appDataChanged", handleDataChange);
    return () => window.removeEventListener("appDataChanged", handleDataChange);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.rate || parseFloat(form.rate) <= 0) {
      setError('Veuillez entrer un taux de change valide');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setMessage(null);

      const response = await fetch(`${API_BASE}/exchange-rates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({
          rate: parseFloat(form.rate),
          effectiveFrom: form.effectiveFrom || new Date().toISOString(),
          notes: form.notes
        }),
      });

      const data = await response.json();
      console.log('Réponse mise à jour:', data); // Debug log

      if (response.ok) {
        setMessage('Taux de change mis à jour avec succès !');
        setForm({ rate: '', effectiveFrom: '', notes: '' });
        await chargerTaux(); // Actualiser les données
      } else {
        setError(data.error || `Échec de la mise à jour: ${response.status}`);
      }
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour du taux:', error);
      setError(error?.message || 'Échec de la mise à jour du taux de change');
    } finally {
      setSubmitting(false);
    }
  };

  const formaterDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', { timeZone: 'Africa/Johannesburg',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Date invalide';
    }
  };

  const formaterMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(montant);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Chargement des taux de change...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-950 flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-blue-600" />
                Gestion des Taux de Change
              </h1>
              <p className="text-slate-600 mt-2">
                Gérez les taux de change FC vers USD pour votre système de vente
              </p>
            </div>
            <button
              onClick={chargerTaux}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-lg hover:bg-slate-50 text-slate-500 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Actualiser
            </button>
          </div>
        </div>

        {/* Messages */}
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Colonne de gauche - Taux actuel et formulaire */}
          <div className="lg:col-span-2 space-y-6">
            {/* Carte du taux actuel */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-blue-600 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Taux de Change Actuel
                </h2>
                {tauxActuel?.isActive && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Actif
                  </span>
                )}
              </div>

              {tauxActuel ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
                      <p className="text-sm text-slate-500 font-medium">Taux FC → USD</p>
                      <p className="text-2xl font-bold text-slate-950">
                        1 USD = {formaterMontant(tauxActuel.rate)} FC
                      </p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
                      <p className="text-sm text-emerald-600 font-medium">Taux USD → FC</p>
                      <p className="text-2xl font-bold text-slate-950">
                        1 FC = {formaterMontant(1 / tauxActuel.rate)} USD
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-3 rounded-lg">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span>Effectif depuis: {formaterDate(tauxActuel.effectiveFrom)}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-3 rounded-lg">
                      <User className="w-4 h-4 text-blue-600" />
                      <span>Défini par: {tauxActuel.createdBy?.username || 'Inconnu'}</span>
                    </div>
                  </div>

                  {tauxActuel.notes && (
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                      <p className="text-sm font-medium text-slate-500 mb-1">Notes:</p>
                      <p className="text-sm text-slate-950">{tauxActuel.notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50 text-blue-600" />
                  <p>Aucun taux de change actif</p>
                  <p className="text-sm text-slate-500">Veuillez définir un taux de change</p>
                </div>
              )}
            </div>

            {/* Formulaire de mise à jour */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
              <h2 className="text-xl font-semibold text-blue-600 mb-4 flex items-center gap-2 border-b border-slate-200 pb-3">
                <Edit className="w-5 h-5 text-orange-600" />
                Mettre à Jour le Taux de Change
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-2">
                      Nouveau Taux (1 USD = X FC) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={form.rate}
                      onChange={(e) => setForm({ ...form, rate: e.target.value })}
                      placeholder="Ex: 2500 pour 1 USD = 2500 FC"
                      className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400"
                      required
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Entrez combien de Francs Congolais valent 1 USD
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-2">
                      Date d'Effet
                    </label>
                    <input
                      type="datetime-local"
                      value={form.effectiveFrom}
                      onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
                      className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Laisser vide pour utiliser la date actuelle
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-2">
                    Notes (Optionnel)
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Raison du changement, source du taux, etc."
                    rows={3}
                    className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !form.rate}
                  className={`w-full md:w-auto px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all duration-200 ${
                    submitting || !form.rate
                      ? 'bg-slate-100 cursor-not-allowed text-slate-400 border border-slate-200'
                      : 'bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white shadow-lg shadow-blue-900/50 border border-blue-400/30'
                  }`}
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Mise à jour...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Mettre à Jour le Taux
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Colonne de droite - Historique */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-blue-600 flex items-center gap-2">
                <History className="w-5 h-5 text-purple-600" />
                Historique des Taux
              </h2>
              <span className="bg-purple-50 text-purple-600 text-xs px-2 py-1 rounded-full border border-purple-200">
                {historiqueTaux.length} entrées
              </span>
            </div>

            {historiqueTaux.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {historiqueTaux.map((taux) => (
                  <div
                    key={taux._id}
                    className={`p-3 rounded-lg border ${
                      taux.isActive
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-950">
                          1 USD = {formaterMontant(taux.rate)} FC
                        </span>
                        {taux.isActive && (
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                        )}
                      </div>
                      <span className="text-xs text-slate-500">
                        {formaterDate(taux.effectiveFrom)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Par: {taux.createdBy?.username || 'Inconnu'}</span>
                      <span>{formaterDate(taux.createdAt)}</span>
                    </div>
                    {taux.notes && (
                      <p className="text-xs text-slate-500 mt-1 truncate">
                        {taux.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <History className="w-12 h-12 mx-auto mb-4 opacity-50 text-blue-600" />
                <p>Aucun historique disponible</p>
                <p className="text-sm text-slate-500">Les changements de taux apparaîtront ici</p>
              </div>
            )}
          </div>
        </div>

        {/* Section d'information */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-slate-500 mb-3 flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-600" />
            💡 Comment utiliser les taux de change
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
            <div>
              <p className="font-medium mb-2 text-slate-500">Pour les ventes en FC:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Les prix saisis en FC seront convertis en USD</li>
                <li>Le système utilise toujours le taux actif</li>
                <li>Bien faire attention avant de definir un nouveau taux</li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-2 text-slate-500">Bonnes pratiques:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Mettez à jour le taux régulièrement</li>
                <li>Notez la source du taux (banque, marché, etc.)</li>
                <li>Un seul taux peut être actif à la fois</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
