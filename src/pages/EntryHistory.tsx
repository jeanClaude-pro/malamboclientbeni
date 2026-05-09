"use client";

import { useState, useEffect } from "react";
import {
  Search,
  FileText,
  Eye,
  Download,
  User,
  DollarSign,
  Edit,
  Trash2,
  RefreshCw,
  Printer,
  Calendar,
  ChevronLeft,
  ChevronRight,
  History,
  Filter,
  Shield
} from "lucide-react";
import jsPDF from "jspdf";

interface EditHistoryEntry {
  editedBy: string;
  editedAt: string;
  changes: any;
  reason: string;
  _id?: string;
}

interface Entry {
  _id: string;
  entryId: string;
  amount: number;
  source: string;
  category: string;
  paymentMethod: string;
  description: string;
  receivedFrom: {
    name: string;
    phone: string;
    email: string;
  };
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    _id: string;
    username: string;
  };
  updatedBy?: string;
  editedBy?: string;
  editedAt?: string;
  editHistory?: EditHistoryEntry[];
}

// User interface for role checking
interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  username?: string;
  permissions?: string[];
}

// Helper function to get today's date in correct format
const getTodayDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to get date range for different timeframes
const getTimeframeParams = (
  timeframe: "day" | "week" | "month" | "year", 
  selectedYear?: number, 
  selectedDate?: string
) => {
  const params = new URLSearchParams();
  const today = new Date();
  
  switch (timeframe) {
    case "day":
      params.set("date", selectedDate || getTodayDate());
      break;
      
    case "week":
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      params.set("from", weekAgo.toISOString().split('T')[0]);
      params.set("to", today.toISOString().split('T')[0]);
      break;
      
    case "month":
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      params.set("from", firstDayOfMonth.toISOString().split('T')[0]);
      params.set("to", lastDayOfMonth.toISOString().split('T')[0]);
      break;
      
    case "year":
      const year = selectedYear || today.getFullYear();
      params.set("year", year.toString());
      break;
  }
  
  return params.toString();
};

export default function EntryHistory() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [editForm, setEditForm] = useState({
    amount: 0,
    source: "",
    category: "",
    paymentMethod: "cash" as "cash" | "card" | "transfer" | "other",
    description: "",
    receivedFrom: { name: "", phone: "", email: "" },
    reason: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // User state for role checking
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Timeframe state
  const [timeframe, setTimeframe] = useState<"day" | "week" | "month" | "year">("day");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());
  const [initialLoad, setInitialLoad] = useState(true);
  const [timeframeDescription, setTimeframeDescription] = useState<string>("");

  // Edited entries filter state
  const [showEditedEntries, setShowEditedEntries] = useState(false);
  const [editedEntries, setEditedEntries] = useState<Entry[]>([]);
  const [selectedEditedEntry, setSelectedEditedEntry] = useState<Entry | null>(null);
  const [showEditedDetailsModal, setShowEditedDetailsModal] = useState(false);
  const [summary, setSummary] = useState<any>(null);

  // Sources and categories (same as Entry.tsx)
  const sources = [
    "Paiement Client",
    "Dépôt Bancaire",
    "Reçu d'Espèces",
    "Remboursement Prêt",
    "Investissement",
    "Revenue Divers",
    "Transfert Mobile",
    "Autre Source"
  ];

  const categories = [
    "Revenue Ventes",
    "Dépôt Espèces",
    "Remboursement",
    "Prêt",
    "Investissement",
    "Revenue Divers",
    "Autre Catégorie"
  ];

  // Effect to automatically set to today's date when timeframe changes to "day"
  useEffect(() => {
    if (!initialLoad && timeframe === "day") {
      const today = getTodayDate();
      setSelectedDate(today);
    }
  }, [timeframe, initialLoad]);

  // Fetch current user on component mount
  useEffect(() => {
    fetchCurrentUser();
    fetchEntries();
  }, []);

  // Fetch entries when timeframe or filters change
  useEffect(() => {
    if (currentUser !== null) { // Only fetch entries after user data is loaded
      fetchEntries();
    }
  }, [timeframe, selectedYear, selectedDate, showEditedEntries, currentUser]);

  // Update edited entries when entries change
  useEffect(() => {
    updateEditedEntries();
  }, [entries]);

  // Fetch current user from API or localStorage
  const fetchCurrentUser = async () => {
    try {
      // Try to get user from localStorage first
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setCurrentUser(userData);
        setIsAdmin(userData.role === "admin" || userData.role === "administrator");
      } else {
        // Fallback to API call
        const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        });

        if (res.ok) {
          const userData = await res.json();
          setCurrentUser(userData);
          setIsAdmin(userData.role === "admin" || userData.role === "administrator");
          localStorage.setItem("user", JSON.stringify(userData));
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      // Default to non-admin if can't fetch user
      setIsAdmin(false);
    }
  };

  const updateEditedEntries = () => {
    // Filter entries that have editHistory or editedBy field
    const edited = entries.filter(entry => 
      (entry.editHistory && entry.editHistory.length > 0) || entry.editedBy
    );

    // Sort by edit date (newest first)
    const sortedEditedEntries = edited.sort((a, b) => {
      const dateA = a.editedAt ? new Date(a.editedAt).getTime() : new Date(a.updatedAt).getTime();
      const dateB = b.editedAt ? new Date(b.editedAt).getTime() : new Date(b.updatedAt).getTime();
      return dateB - dateA;
    });

    setEditedEntries(sortedEditedEntries);
  };

  const fetchEntries = async () => {
    try {
      setLoading(true);
      
      // Build query parameters based on timeframe
      const timeframeParams = getTimeframeParams(timeframe, selectedYear, selectedDate);
      
      // Add status filter for edited entries view
      const statusParam = showEditedEntries ? "&status=all" : "&status=active";
      
      const url = `${import.meta.env.VITE_API_URL}/entries?${timeframeParams}${statusParam}`;
      
      console.log("Fetching entries from:", url);
      
      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        
        console.log("API Response:", data);
        
        if (data.success && data.data) {
          // Set entries
          const fetchedEntries: Entry[] = data.data;
          setEntries(fetchedEntries);
          
          // Set timeframe description
          setTimeframeDescription(data.timeframe?.description || "");
          
          // Set summary data
          if (data.summary) {
            setSummary(data.summary);
          }
          
          console.log(`Fetched ${fetchedEntries.length} entries with timeframe: ${data.timeframe?.description}`);
        } else {
          console.error("Unexpected API response format:", data);
          setEntries([]);
          setSummary(null);
          setError("Format de réponse API inattendu");
        }
      } else {
        const errorData = await res.json().catch(() => ({ error: "Erreur serveur" }));
        console.error("Entries fetch failed:", res.status, errorData);
        setError(errorData.error || `Échec du chargement (${res.status})`);
        setEntries([]);
      }
    } catch (error) {
      console.error("Error loading entries:", error);
      setError("Échec de la connexion au serveur");
      setEntries([]);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  // Get available years from API or default
  const getAvailableYears = (): number[] => {
    // Start with current year
    const currentYear = new Date().getFullYear();
    const years = [currentYear];
    
    // Add previous years (up to 5 years back)
    for (let i = 1; i <= 5; i++) {
      years.push(currentYear - i);
    }
    
    return years.sort((a, b) => b - a);
  };

  const navigateYear = (direction: 'prev' | 'next') => {
    const years = getAvailableYears();
    const currentIndex = years.indexOf(selectedYear);
    
    if (direction === 'prev' && currentIndex < years.length - 1) {
      setSelectedYear(years[currentIndex + 1]);
    } else if (direction === 'next' && currentIndex > 0) {
      setSelectedYear(years[currentIndex - 1]);
    }
  };

  const getTimeframeLabel = () => {
    if (timeframeDescription) {
      return timeframeDescription;
    }
    
    switch (timeframe) {
      case "day":
        if (selectedDate) {
          const date = new Date(selectedDate);
          return date.toLocaleDateString("fr-FR", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        }
        return "Aujourd'hui";
      case "week":
        return "Cette Semaine";
      case "month":
        return "Ce Mois";
      case "year":
        return `Année ${selectedYear}`;
      default:
        return "Cette Semaine";
    }
  };

  const handleTimeframeChange = (period: "day" | "week" | "month" | "year") => {
    setTimeframe(period);
    
    if (period === "year") {
      const years = getAvailableYears();
      setSelectedYear(years[0] || new Date().getFullYear());
    }
  };

  // Filter entries based on search term
  const filteredEntries = (showEditedEntries ? editedEntries : entries).filter(entry =>
    entry.entryId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.receivedFrom.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.receivedFrom.phone.includes(searchTerm) ||
    entry.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (entry.createdBy?.username && entry.createdBy.username.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Function to view edited entry details
  const viewEditedEntryDetails = (entry: Entry) => {
    setSelectedEditedEntry(entry);
    setShowEditedDetailsModal(true);
  };

  // Function to render change comparison
  const renderChangeComparison = (entry: Entry) => {
    if (!entry.editHistory || entry.editHistory.length === 0) return null;

    const latestEdit = entry.editHistory[entry.editHistory.length - 1];
    const changes = latestEdit.changes;

    return (
      <div className="mt-4 p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
        <h4 className="font-medium text-blue-400 mb-2 flex items-center gap-2">
          <History className="w-4 h-4" />
          Dernière modification
        </h4>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-blue-800/30">
            <span className="text-blue-300">Modifié par:</span>
            <span className="font-medium text-white">{latestEdit.editedBy || entry.editedBy || "Unknown"}</span>
          </div>
          
          <div className="flex justify-between py-2 border-b border-blue-800/30">
            <span className="text-blue-300">Date de modification:</span>
            <span className="font-medium text-white">{formatDate(latestEdit.editedAt || entry.editedAt || entry.updatedAt)}</span>
          </div>
          
          <div className="flex justify-between py-2 border-b border-blue-800/30">
            <span className="text-blue-300">Raison:</span>
            <span className="font-medium text-white text-right">{latestEdit.reason}</span>
          </div>

          {changes && Object.keys(changes).length > 0 && (
            <div className="mt-3 pt-3 border-t border-blue-700/30">
              <h5 className="font-medium text-blue-400 mb-2">Changements:</h5>
              {Object.entries(changes).map(([field, changeData]: [string, any]) => (
                <div key={field} className="mb-3 last:mb-0">
                  <div className="font-medium text-blue-300 mb-1 capitalize">
                    {field.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div className="bg-red-900/30 p-2 rounded border border-red-700/30">
                      <div className="text-red-400 font-medium mb-1">Avant:</div>
                      <div className="text-red-300 break-words">{JSON.stringify(changeData.from)}</div>
                    </div>
                    <div className="bg-green-900/30 p-2 rounded border border-green-700/30">
                      <div className="text-green-400 font-medium mb-1">Après:</div>
                      <div className="text-green-300 break-words">{JSON.stringify(changeData.to)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Print function for entry receipt
  const printEntryReceipt = (entry: Entry) => {
    const printWindow = window.open("", "_blank", "width=320,height=600");
    if (printWindow) {
      printWindow.document.write(`
<html>
  <head>
    <title>Reçu d'Entrée d'Argent</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { 
        font-family: 'Courier New', Courier, monospace; 
        margin: 0; padding: 0; 
        font-size: 13px; font-weight: bold; line-height: 1.1;
        width: 72mm; background-color: white;
        -webkit-print-color-adjust: exact; print-color-adjust: exact;
        display: flex; justify-content: center;
      }
      .receipt-container { width: 70mm; margin: 0 auto; padding: 0.5mm; border: none; text-align: center; }
      .header { text-align: center; margin-bottom: 1mm; padding-bottom: 1mm; border-bottom: 2px double #000; }
      .shop-name { font-size: 15px; font-weight: bold; margin-bottom: 0.5mm; text-transform: uppercase; }
      .shop-details { font-size: 11px; margin-bottom: 0.3mm; line-height: 1; font-weight: bold; }
      .receipt-info { margin: 1mm 0; padding: 1mm; background-color: #f8f8f8; border-left: 3px solid #000; }
      .receipt-title { font-size: 13px; font-weight: bold; margin: 1mm 0; text-transform: uppercase; background-color: #000; color: white; padding: 1mm; border-radius: 2px; }
      .entry-badge { background-color: #000; color: white; padding: 2mm; font-weight: bold; text-align: center; margin: 1mm 0; font-size: 14px; border-radius: 3px; }
      .details-section { margin: 1mm 0; padding: 1mm; background-color: #fafafa; border: 1px solid #eee; }
      .detail-row { display: flex; justify-content: space-between; margin-bottom: 0.5mm; padding: 0 1mm; border-bottom: 1px dotted #ddd; }
      .detail-label { text-align: left; font-weight: bold; font-size: 12px; flex: 1; }
      .detail-value { text-align: right; font-weight: bold; font-size: 12px; flex: 1; }
      .amount-section { font-weight: bold; margin-top: 1mm; padding: 1mm; background-color: #f0f0f0; border: 1px solid #ddd; border-radius: 3px; }
      .amount-row { display: flex; justify-content: space-between; margin-bottom: 0.3mm; font-size: 13px; padding: 0 1mm; }
      .payment-method { text-transform: uppercase; font-weight: bold; font-size: 13px; color: #000; }
      .footer { text-align: center; margin-top: 1mm; font-size: 11px; font-weight: bold; padding: 1mm; background-color: #f8f8f8; border-top: 1px dashed #000; }
      .agent-info { margin-top: 1mm; text-align: center; font-weight: bold; font-size: 12px; padding: 1mm; background-color: #e8e8e8; border: 1px solid #ccc; border-radius: 2px; }
      .sender-info { margin: 1mm 0; padding: 1mm; font-weight: bold; text-align: center; background-color: #f5f5f5; border: 1px solid #ddd; border-radius: 3px; }
      .sender-field { margin-bottom: 0.3mm; font-size: 12px; }
      .cut-line { text-align: center; margin: 1mm 0; font-weight: bold; font-size: 11px; color: #000; letter-spacing: 1px; }
      .thank-you { font-weight: bold; margin: 0.5mm 0; font-size: 12px; }
      .warning { font-size: 10px; color: #000; margin: 0.3mm 0; font-weight: bold; }
      .description { margin: 1mm 0; padding: 1mm; background-color: #f5f5f5; border-left: 3px solid #ccc; font-size: 11px; font-weight: bold; border-radius: 2px; }
      .section-divider { height: 2px; background: linear-gradient(to right, transparent, #000, transparent); margin: 1mm 0; }
      @media print {
        @page { margin: 0 !important; size: 72mm auto !important; }
        body { margin: 0 !important; padding: 0 !important; width: 72mm !important; font-size: 13px !important; background: white !important; font-weight: bold !important; height: auto !important; overflow: hidden !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; display: flex !important; justify-content: center !important; }
        .receipt-container { border: none !important; box-shadow: none !important; margin: 0 auto !important; padding: 0.5mm !important; width: 70mm !important; page-break-after: avoid !important; page-break-inside: avoid !important; }
        .cut-line { page-break-after: always !important; margin-bottom: 0 !important; }
      }
    </style>
  </head>
  <body>
    <div class="receipt-container">
      <div class="header">
        <div class="shop-name"><strong>Lulu Fashion</strong></div>
        <div class="shop-details"><strong>Av Mitwaba Rue Musoshi N°51, C. Kenya, Lubumbashi</strong></div>
        <div class="shop-details">TEL: <strong>+243 991 924 151 / +243 995 797 399</strong></div>
        <div class="shop-details"><strong>LSH-RCCM-23-A-00842</strong></div>
      </div>
      
      <div class="section-divider"></div>
      
      <div class="receipt-info">
        <div class="shop-details">DATE: <strong>${formatDate(entry.createdAt)}</strong></div>
        <div class="shop-details">REÇU #: <strong>${entry.entryId}</strong></div>
      </div>
      
      <div class="entry-badge">
        <strong>💰 ENTRÉE D'ARGENT CONFIRMÉE 💰</strong>
      </div>
      
      <div class="sender-info">
        <div class="sender-field">REÇU DE: <strong>${entry.receivedFrom.name.toUpperCase()}</strong></div>
        <div class="sender-field">TÉLÉPHONE: <strong>${entry.receivedFrom.phone}</strong></div>
        ${entry.receivedFrom.email ? `<div class="sender-field">EMAIL: <strong>${entry.receivedFrom.email}</strong></div>` : ""}
      </div>
      
      ${entry.description ? `<div class="description"><strong>DESCRIPTION:</strong> <strong>${entry.description}</strong></div>` : ''}
      
      <div class="receipt-title">DÉTAILS DE L'ENTRÉE</div>
      
      <div class="details-section">
        <div class="detail-row">
          <div class="detail-label"><strong>SOURCE:</strong></div>
          <div class="detail-value"><strong>${entry.source}</strong></div>
        </div>
        <div class="detail-row">
          <div class="detail-label"><strong>CATÉGORIE:</strong></div>
          <div class="detail-value"><strong>${entry.category}</strong></div>
        </div>
        <div class="detail-row">
          <div class="detail-label"><strong>MÉTHODE PAIEMENT:</strong></div>
          <div class="detail-value"><strong>${entry.paymentMethod.toUpperCase()}</strong></div>
        </div>
      </div>
      
      <div class="amount-section">
        <div class="amount-row">
          <div><strong>MONTANT REÇU:</strong></div>
          <div><strong>$${entry.amount.toFixed(2)}</strong></div>
        </div>
      </div>
      
      <div class="agent-info">
        Enregistré par: <strong>${(entry.createdBy?.username || 'Non spécifié').toUpperCase()}</strong>
      </div>
      
      <div class="footer">
        <div class="thank-you"><strong>ENTRÉE ENREGISTRÉE AVEC SUCCÈS !</strong></div>
        <div class="warning"><strong>Conserver ce reçu comme preuve</strong></div>
        <div class="warning"><strong>Merci pour votre confiance</strong></div>
        <div class="thank-you"><strong>À BIENTÔT !</strong></div>
      </div>

      <div class="cut-line">✄ ────────────────────────── ✄</div>
    </div>
    <script>
      window.onload = function() {
        try { window.print(); } catch(e) { console.error('Print error:', e); }
        setTimeout(() => { window.close(); }, 1000);
      };
    </script>
  </body>
</html>
`);
      printWindow.document.close();
    }
  };

  const generateEntryPDF = (entry: Entry) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text("Lulu Fashion", 105, 10, { align: "center" });
    doc.setFontSize(10);
    
    doc.setFontSize(12);
    doc.text("LSH-RCCM-23-A-00842", 105, 20, { align: "center" });
    doc.text("+243 991 924 151 / +243 995 797 399", 105, 25, { align: "center" });
    doc.text("Av Mitwaba Rue Musoshi N°51, C. Kenya, Lubumbashi", 105, 30, { align: "center" });

    doc.setFontSize(16);
    doc.text("Reçu d'entrée d'argent", 105, 35, { align: "center" });

    // Entry Info
    doc.setFontSize(10);
    doc.text(`Date: ${formatDate(entry.createdAt)}`, 20, 45);
    doc.text(`Reçu #: ${entry.entryId}`, 20, 52);
    doc.text(`Méthode de paiement: ${entry.paymentMethod.toUpperCase()}`, 20, 59);
    doc.text(`Statut: ${entry.status.toUpperCase()}`, 20, 66);

    // Created By Info
    doc.text(`Enregistré par: ${entry.createdBy?.username || "Non spécifié"}`, 20, 73);

    // Received From Info
    doc.setFontSize(12);
    doc.text("Information sur l'expéditeur:", 20, 85);
    doc.setFontSize(10);
    doc.text(`Nom: ${entry.receivedFrom.name}`, 20, 92);
    doc.text(`Téléphone: ${entry.receivedFrom.phone}`, 20, 99);
    if (entry.receivedFrom.email) {
      doc.text(`Email: ${entry.receivedFrom.email}`, 20, 106);
    }

    // Entry Details
    doc.setFontSize(12);
    doc.text("Détails de l'entrée:", 20, 113);
    doc.setFontSize(10);
    
    let yPos = 120;
    doc.text(`Source: ${entry.source}`, 20, yPos); yPos += 7;
    doc.text(`Catégorie: ${entry.category}`, 20, yPos); yPos += 7;
    doc.text(`Montant: ${formatCurrency(entry.amount)}`, 20, yPos); yPos += 7;
    
    if (entry.description) {
      yPos += 3;
      doc.text(`Description: ${entry.description}`, 20, yPos); yPos += 10;
    }

    // Footer
    doc.setFontSize(10);
    doc.text("Entrée enregistrée avec succès !", 105, yPos + 20, { align: "center" });
    doc.text("Conserver ce reçu comme preuve.", 105, yPos + 30, { align: "center" });
    doc.text("Merci pour votre confiance", 105, yPos + 40, { align: "center" });

    doc.save(`entry-${entry.entryId}.pdf`);
  };

  const viewEntryDetails = (entry: Entry) => {
    setSelectedEntry(entry);
    setShowModal(true);
    setError(null);
  };

  const openEditModal = async (entry: Entry) => {
    if (entry.status === "deleted") {
      setError("Cannot edit a deleted entry");
      return;
    }

    setEditingEntry(entry);
    setEditForm({
      amount: entry.amount,
      source: entry.source,
      category: entry.category,
      paymentMethod: entry.paymentMethod as "cash" | "card" | "transfer" | "other",
      description: entry.description,
      receivedFrom: { ...entry.receivedFrom },
      reason: "",
    });
    setShowEditModal(true);
    setError(null);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingEntry(null);
    setEditForm({
      amount: 0,
      source: "",
      category: "",
      paymentMethod: "cash",
      description: "",
      receivedFrom: { name: "", phone: "", email: "" },
      reason: "",
    });
    setError(null);
  };

  const handleEditEntry = async () => {
    if (!editingEntry) return;

    if (!editForm.receivedFrom.name || !editForm.receivedFrom.phone) {
      setError("Le nom et le téléphone de l'expéditeur sont requis");
      return;
    }

    if (!editForm.reason) {
      setError("Veuillez fournir une raison pour la modification de cette entrée");
      return;
    }

    try {
      setLoading(true);

      const updateData = {
        amount: editForm.amount,
        source: editForm.source,
        category: editForm.category,
        paymentMethod: editForm.paymentMethod,
        description: editForm.description,
        receivedFrom: editForm.receivedFrom,
        reason: editForm.reason,
      };

      console.log("Sending update data:", updateData);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/entries/${editingEntry._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
          body: JSON.stringify(updateData),
        }
      );

      console.log("Update response status:", response.status);

      if (response.ok) {
        const updatedEntry = await response.json();
        console.log("Updated entry:", updatedEntry);

        setMessage("✅ Entrée mise à jour avec succès");
        await fetchEntries();
        closeEditModal();
      } else {
        const errorData = await response.json();
        console.error("Update error:", errorData);
        setError(errorData.error || `Échec de la mise à jour: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error updating entry:", error);
      setError("Échec de la mise à jour de l'entrée. Veuillez vérifier votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (entry: Entry) => {
    if (entry.status === "deleted") {
      setError("L'entrée est déjà supprimée");
      return;
    }

    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer l'entrée ${entry.entryId}? Cette action ne peut pas être annulée.`)) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/entries/${entry._id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        }
      );

      if (response.ok) {
        setMessage("✅ Entrée supprimée avec succès");
        await fetchEntries();
        setShowModal(false);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Échec de la suppression de l'entrée");
      }
    } catch (error) {
      setError("Échec de la suppression de l'entrée");
      console.error("Error deleting entry:", error);
    } finally {
      setLoading(false);
    }
  };

  // Summary statistics display component - ONLY VISIBLE TO ADMINS
  const SummaryStats = () => {
    if (!summary || !isAdmin) return null;

    return (
      <div className="bg-gradient-to-br from-blue-900 to-blue-950 p-4 rounded-lg border border-blue-700/50 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-blue-300 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            Statistiques des Entrées (Vue Admin)
          </h3>
          {currentUser && (
            <span className="text-sm text-blue-300 bg-blue-900/50 px-3 py-1 rounded-full border border-blue-700/30">
              Connecté en tant que: {currentUser.name || currentUser.username} ({currentUser.role})
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-black/50 p-4 rounded-lg border border-blue-800/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-300">Total Entrées</p>
                <p className="text-2xl font-bold text-white">{summary.totalRecords}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-black/50 p-4 rounded-lg border border-blue-800/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-300">Montant Total</p>
                <p className="text-2xl font-bold text-green-400">{formatCurrency(summary.totalAmount)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-400" />
            </div>
          </div>
          
          <div className="bg-black/50 p-4 rounded-lg border border-blue-800/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-300">Entrées Actives</p>
                <p className="text-2xl font-bold text-green-400">{summary.active?.count || 0}</p>
                <p className="text-sm text-blue-300">{formatCurrency(summary.active?.amount || 0)}</p>
              </div>
              <FileText className="w-8 h-8 text-green-400" />
            </div>
          </div>
          
          <div className="bg-black/50 p-4 rounded-lg border border-blue-800/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-300">Méthodes de Paiement</p>
                <p className="text-xl font-semibold text-purple-400">
                  {Object.keys(summary.paymentMethods || {}).length}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Detailed stats row */}
        {summary.paymentMethods && Object.keys(summary.paymentMethods).length > 0 && (
          <div className="mt-4 pt-4 border-t border-blue-800/50">
            <h4 className="font-medium text-blue-400 mb-3">Détails par méthode de paiement:</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {Object.entries(summary.paymentMethods).map(([method, data]: [string, any]) => (
                <div key={method} className="bg-black/30 p-3 rounded-lg border border-blue-800/30">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-blue-300 capitalize">{method}:</span>
                    <span className="font-semibold text-green-400">{data.count}</span>
                  </div>
                  <div className="text-sm text-blue-300 mt-1">
                    Total: {formatCurrency(data.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sources summary */}
        {summary.sources && Object.keys(summary.sources).length > 0 && (
          <div className="mt-4 pt-4 border-t border-blue-800/50">
            <h4 className="font-medium text-blue-400 mb-3">Sources principales:</h4>
            <div className="space-y-2">
              {Object.entries(summary.sources)
                .sort(([, a], [, b]) => (b as any).amount - (a as any).amount)
                .slice(0, 3)
                .map(([source, data]: [string, any]) => (
                  <div key={source} className="flex justify-between items-center bg-black/30 p-2 rounded border border-blue-800/30">
                    <span className="text-blue-300">{source}</span>
                    <div className="text-right">
                      <div className="font-semibold text-white">{data.count} entrées</div>
                      <div className="text-sm text-green-400">{formatCurrency(data.amount)}</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-blue-950 to-black p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <History className="w-8 h-8 text-blue-400" />
              Historique des Entrées d'Argent
            </h1>
            <p className="text-blue-200/70">
              Voir toutes les entrées d'argent enregistrées
            </p>
          </div>
          <div className="flex gap-3">
            {/* Edited Entries Filter Button */}
            <button
              onClick={() => setShowEditedEntries(!showEditedEntries)}
              className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 border ${
                showEditedEntries
                  ? "bg-gradient-to-r from-blue-600 to-blue-800 text-white border-blue-400/30 shadow-lg shadow-blue-900/50"
                  : "bg-black/50 text-blue-300 border-blue-800/50 hover:bg-blue-900/30"
              }`}
            >
              <Filter className="w-4 h-4" />
              {showEditedEntries ? "Toutes les entrées" : "Entrées modifiées"}
              {showEditedEntries && (
                <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                  {editedEntries.length}
                </span>
              )}
            </button>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher des entrées..."
                className="pl-10 w-64 px-3 py-2 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-blue-300/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Timeframe Filter Section */}
        <div className="bg-gradient-to-br from-gray-900 to-blue-950 p-4 sm:p-6 rounded-lg shadow-xl border border-blue-800/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h3 className="text-lg font-semibold text-blue-400 flex items-center gap-2">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
              {showEditedEntries ? "Entrées modifiées" : "Toutes les entrées"} - {getTimeframeLabel()}
            </h3>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Date Picker for Day View */}
              {timeframe === "day" && (
                <div className="flex items-center gap-2 bg-black/50 rounded-lg border border-blue-800/50 px-3 py-2 shadow-sm w-full sm:w-auto">
                  <Calendar className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <label htmlFor="date-picker" className="text-xs sm:text-sm font-medium text-blue-300 whitespace-nowrap">
                    Date:
                  </label>
                  <input
                    id="date-picker"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="ml-2 px-2 py-1 border-none bg-transparent text-xs sm:text-sm focus:outline-none focus:ring-0 text-white font-medium w-full"
                  />
                </div>
              )}
              
              {timeframe === "year" && (
                <div className="flex items-center gap-2 bg-black/50 rounded-lg border border-blue-800/50 px-3 py-2 shadow-sm w-full sm:w-auto">
                  <button
                    onClick={() => navigateYear('prev')}
                    disabled={getAvailableYears().indexOf(selectedYear) === getAvailableYears().length - 1}
                    className="p-1 rounded hover:bg-blue-900/30 text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                  <span className="text-xs sm:text-sm font-medium text-white px-2 min-w-[60px] sm:min-w-[80px] text-center">{selectedYear}</span>
                  <button
                    onClick={() => navigateYear('next')}
                    disabled={getAvailableYears().indexOf(selectedYear) === 0}
                    className="p-1 rounded hover:bg-blue-900/30 text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                </div>
              )}
              
              <div className="flex gap-1 bg-black/50 p-1 rounded-lg w-full sm:w-auto border border-blue-800/50">
                {(["day", "week", "month", "year"] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => handleTimeframeChange(period)}
                    className={`px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 flex-1 sm:flex-none ${
                      timeframe === period
                        ? "bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg"
                        : "text-blue-300 hover:text-white hover:bg-blue-900/30"
                    }`}
                  >
                    {period === "day" && "Jour"}
                    {period === "week" && "Semaine"}
                    {period === "month" && "Mois"}
                    {period === "year" && "Année"}
                  </button>
                ))}
              </div>
              
              {/* Refresh Button */}
              <button
                onClick={fetchEntries}
                disabled={loading}
                className="px-3 py-2 bg-blue-900/30 text-blue-400 hover:bg-blue-800/50 rounded-lg border border-blue-800/50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          
          {/* Show summary statistics - Admin only */}
          <SummaryStats />
        </div>

        {message && (
          <div className="mb-4 p-3 bg-green-900/50 border border-green-700/50 text-green-300 rounded-lg">
            {message}
            <button
              onClick={() => setMessage(null)}
              className="float-right text-green-300 hover:text-green-100"
            >
              ×
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700/50 text-red-300 rounded-lg">
            {error}
            <button
              onClick={() => setError(null)}
              className="float-right text-red-300 hover:text-red-100"
            >
              ×
            </button>
          </div>
        )}

        <div className="bg-gradient-to-br from-gray-900 to-blue-950 rounded-lg shadow-xl border border-blue-800/50">
          <div className="px-6 py-4 border-b border-blue-800/50">
            <h2 className="text-lg font-semibold text-blue-400 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {showEditedEntries ? "Entrées modifiées" : "Entrées d'argent"} ({filteredEntries.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
                <p className="text-blue-300 mt-2">Chargement des entrées...</p>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="text-center py-12 text-blue-300">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50 text-blue-400" />
                <p>
                  {showEditedEntries 
                    ? "Aucune entrée modifiée trouvée" 
                    : "Aucune entrée trouvée"
                  }
                </p>
                <p className="text-sm text-blue-300/70">pour la période sélectionnée</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-blue-800/30">
                <thead className="bg-black/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">
                      ID Entrée
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">
                      Expéditeur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">
                      Catégorie
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">
                      Paiement
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">
                      Date
                    </th>
                    {showEditedEntries && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">
                        Dernière modification
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-800/30">
                  {filteredEntries.map((entry) => (
                    <tr key={entry._id} className="hover:bg-blue-900/20 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                        {entry.entryId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">
                          {entry.receivedFrom.name}
                        </div>
                        <div className="text-sm text-blue-300">
                          {entry.receivedFrom.phone}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-300">
                        {entry.source}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-300">
                        {entry.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-400">
                        {formatCurrency(entry.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900/50 text-blue-300 border border-blue-700/30">
                          {entry.paymentMethod}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                            entry.status === "active"
                              ? "bg-green-900/50 text-green-400 border border-green-700/30"
                              : "bg-red-900/50 text-red-400 border border-red-700/30"
                          }`}
                        >
                          {entry.status === "active" ? "Actif" : "Supprimé"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-300">
                        {formatDate(entry.createdAt)}
                      </td>
                      {showEditedEntries && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-300">
                          {entry.editedAt ? formatDate(entry.editedAt) : "N/A"}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          {showEditedEntries ? (
                            <button
                              onClick={() => viewEditedEntryDetails(entry)}
                              className="text-blue-400 hover:text-blue-300 p-1 rounded transition-colors"
                              title="Voir les détails des modifications"
                            >
                              <History className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => viewEntryDetails(entry)}
                              className="text-blue-400 hover:text-blue-300 p-1 rounded transition-colors"
                              title="Voir les détails"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          {!showEditedEntries && (
                            <>
                              <button
                                onClick={() => openEditModal(entry)}
                                disabled={entry.status === "deleted"}
                                className={`p-1 rounded transition-colors ${
                                  entry.status === "deleted"
                                    ? "text-gray-600 cursor-not-allowed"
                                    : "text-yellow-400 hover:text-yellow-300"
                                }`}
                                title="Modifier l'entrée"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => generateEntryPDF(entry)}
                                className="text-green-400 hover:text-green-300 p-1 rounded transition-colors"
                                title="Télécharger PDF"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => printEntryReceipt(entry)}
                                className="text-purple-400 hover:text-purple-300 p-1 rounded transition-colors"
                                title="Imprimer le reçu"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteEntry(entry)}
                                disabled={entry.status === "deleted"}
                                className={`p-1 rounded transition-colors ${
                                  entry.status === "deleted"
                                    ? "text-gray-600 cursor-not-allowed"
                                    : "text-red-400 hover:text-red-300"
                                }`}
                                title="Supprimer l'entrée"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Entry Details Modal */}
      {showModal && selectedEntry && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-gray-900 to-blue-950 rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-blue-800/50 shadow-2xl">
            <div className="px-6 py-4 border-b border-blue-800/50 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-400" />
                Détails de l'Entrée
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Entry Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-blue-300 mb-1">
                    ID Entrée
                  </label>
                  <p className="text-sm text-white bg-black/30 p-2 rounded border border-blue-800/30">{selectedEntry.entryId}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-300 mb-1">
                    Date
                  </label>
                  <p className="text-sm text-white bg-black/30 p-2 rounded border border-blue-800/30">
                    {formatDate(selectedEntry.createdAt)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-300 mb-1">
                    Méthode de Paiement
                  </label>
                  <p className="text-sm text-white bg-black/30 p-2 rounded border border-blue-800/30 capitalize">
                    {selectedEntry.paymentMethod}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-300 mb-1">
                    Statut
                  </label>
                  <span
                    className={`inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium capitalize ${
                      selectedEntry.status === "active"
                        ? "bg-green-900/50 text-green-400 border border-green-700/30"
                        : "bg-red-900/50 text-red-400 border border-red-700/30"
                    }`}
                  >
                    {selectedEntry.status === "active" ? "Actif" : "Supprimé"}
                  </span>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-blue-300 mb-1">
                    Enregistré par
                  </label>
                  <p className="text-sm text-white bg-black/30 p-2 rounded border border-blue-800/30">
                    {selectedEntry.createdBy?.username || "Non spécifié"}
                  </p>
                </div>
                {selectedEntry.editedBy && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-blue-300 mb-1">
                      Dernière modification
                    </label>
                    <p className="text-sm text-white bg-black/30 p-2 rounded border border-blue-800/30">
                      Par: {selectedEntry.editedBy} à{" "}
                      {selectedEntry.editedAt
                        ? formatDate(selectedEntry.editedAt)
                        : "N/A"}
                    </p>
                  </div>
                )}
              </div>

              {/* Received From Info */}
              <div>
                <h4 className="text-md font-medium text-blue-400 mb-3 flex items-center gap-2 border-b border-blue-800/50 pb-2">
                  <User className="w-4 h-4" />
                  Information sur l'Expéditeur
                </h4>
                <div className="bg-black/30 rounded-lg p-4 border border-blue-800/30">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-300 mb-1">
                        Nom
                      </label>
                      <p className="text-sm text-white">
                        {selectedEntry.receivedFrom.name}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-300 mb-1">
                        Téléphone
                      </label>
                      <p className="text-sm text-white">
                        {selectedEntry.receivedFrom.phone}
                      </p>
                    </div>
                    {selectedEntry.receivedFrom.email && (
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-blue-300 mb-1">
                          Email
                        </label>
                        <p className="text-sm text-white">
                          {selectedEntry.receivedFrom.email}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Entry Details */}
              <div>
                <h4 className="text-md font-medium text-blue-400 mb-3 flex items-center gap-2 border-b border-blue-800/50 pb-2">
                  <DollarSign className="w-4 h-4" />
                  Détails de l'Entrée
                </h4>
                <div className="bg-black/30 rounded-lg p-4 space-y-3 border border-blue-800/30">
                  <div className="flex justify-between py-2 border-b border-blue-800/30">
                    <span className="font-medium text-blue-300">Source:</span>
                    <span className="text-white">{selectedEntry.source}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-blue-800/30">
                    <span className="font-medium text-blue-300">Catégorie:</span>
                    <span className="text-white">{selectedEntry.category}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-blue-800/30">
                    <span className="font-medium text-blue-300">Montant:</span>
                    <span className="text-white font-semibold text-green-400">
                      {formatCurrency(selectedEntry.amount)}
                    </span>
                  </div>
                  {selectedEntry.description && (
                    <div>
                      <span className="font-medium text-blue-300">Description:</span>
                      <p className="text-white mt-1 bg-black/20 p-2 rounded">{selectedEntry.description}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Show edit history if available */}
              {selectedEntry.editHistory && selectedEntry.editHistory.length > 0 && (
                renderChangeComparison(selectedEntry)
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-blue-800/50">
                <button
                  onClick={() => generateEntryPDF(selectedEntry)}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-800 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-900 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-900/50 border border-blue-400/30"
                >
                  <Download className="w-4 h-4" />
                  Télécharger PDF
                </button>
                <button
                  onClick={() => printEntryReceipt(selectedEntry)}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-800 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-purple-900 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-purple-900/50 border border-purple-400/30"
                >
                  <Printer className="w-4 h-4" />
                  Imprimer Reçu
                </button>
                <button
                  onClick={() => {
                    setShowModal(false);
                    openEditModal(selectedEntry);
                  }}
                  disabled={selectedEntry.status === "deleted"}
                  className={`px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 border ${
                    selectedEntry.status === "deleted"
                      ? "border-gray-700 text-gray-600 cursor-not-allowed bg-black/30"
                      : "border-yellow-700/30 text-yellow-400 hover:bg-yellow-900/30"
                  }`}
                >
                  <Edit className="w-4 h-4" />
                  Modifier
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-blue-800/50 rounded-lg hover:bg-blue-900/30 text-blue-300 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edited Entry Details Modal */}
      {showEditedDetailsModal && selectedEditedEntry && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-gray-900 to-blue-950 rounded-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-blue-800/50 shadow-2xl">
            <div className="px-6 py-4 border-b border-blue-800/50 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-blue-400" />
                Détails des modifications - {selectedEditedEntry.entryId}
              </h3>
              <button
                onClick={() => setShowEditedDetailsModal(false)}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Current Entry Info */}
              <div>
                <h4 className="text-md font-medium text-blue-400 mb-3 bg-blue-900/30 p-3 rounded-lg border border-blue-700/30">
                  État actuel de l'entrée
                </h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-300 mb-1">
                      Expéditeur
                    </label>
                    <p className="text-sm text-white bg-black/30 p-2 rounded border border-blue-800/30">
                      {selectedEditedEntry.receivedFrom.name} ({selectedEditedEntry.receivedFrom.phone})
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-300 mb-1">
                      Montant actuel
                    </label>
                    <p className="text-sm font-medium text-green-400 bg-black/30 p-2 rounded border border-blue-800/30">
                      {formatCurrency(selectedEditedEntry.amount)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-300 mb-1">
                      Source
                    </label>
                    <p className="text-sm text-white bg-black/30 p-2 rounded border border-blue-800/30">
                      {selectedEditedEntry.source}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-300 mb-1">
                      Catégorie
                    </label>
                    <p className="text-sm text-white bg-black/30 p-2 rounded border border-blue-800/30">
                      {selectedEditedEntry.category}
                    </p>
                  </div>
                </div>
              </div>

              {/* Edit History */}
              <div>
                <h4 className="text-md font-medium text-blue-400 mb-3">
                  Historique des modifications
                </h4>
                <div className="space-y-4">
                  {selectedEditedEntry.editHistory && selectedEditedEntry.editHistory.length > 0 ? (
                    selectedEditedEntry.editHistory.map((edit, index) => (
                      <div key={edit._id || index} className="border border-blue-800/50 rounded-lg p-4 bg-black/30">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h5 className="font-medium text-white">
                              Modification #{selectedEditedEntry.editHistory!.length - index}
                            </h5>
                            <p className="text-sm text-blue-300">
                              {formatDate(edit.editedAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-white">
                              Par: {edit.editedBy}
                            </p>
                            <p className="text-sm text-blue-300">
                              Raison: {edit.reason}
                            </p>
                          </div>
                        </div>

                        {edit.changes && Object.keys(edit.changes).length > 0 && (
                          <div className="space-y-3">
                            <h6 className="font-medium text-blue-400 text-sm">Changements détaillés:</h6>
                            {Object.entries(edit.changes).map(([field, changeData]: [string, any]) => (
                              <div key={field} className="border-l-4 border-blue-600 pl-3">
                                <div className="font-medium text-blue-300 text-sm capitalize mb-2">
                                  {field.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                  <div className="bg-red-900/30 p-3 rounded border border-red-700/30">
                                    <div className="text-red-400 font-medium mb-1">Avant:</div>
                                    <div className="text-red-300 break-words">
                                      {typeof changeData.from === 'object' 
                                        ? JSON.stringify(changeData.from, null, 2)
                                        : String(changeData.from || 'N/A')
                                      }
                                    </div>
                                  </div>
                                  <div className="bg-green-900/30 p-3 rounded border border-green-700/30">
                                    <div className="text-green-400 font-medium mb-1">Après:</div>
                                    <div className="text-green-300 break-words">
                                      {typeof changeData.to === 'object' 
                                        ? JSON.stringify(changeData.to, null, 2)
                                        : String(changeData.to || 'N/A')
                                      }
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-blue-300">
                      <History className="w-12 h-12 mx-auto mb-4 opacity-50 text-blue-400" />
                      <p>Aucun détail de modification disponible</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-blue-800/50">
                <button
                  onClick={() => setShowEditedDetailsModal(false)}
                  className="flex-1 px-4 py-2 border border-blue-800/50 rounded-lg hover:bg-blue-900/30 text-blue-300 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Entry Modal */}
      {showEditModal && editingEntry && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-gray-900 to-blue-950 rounded-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-blue-800/50 shadow-2xl">
            <div className="px-6 py-4 border-b border-blue-800/50 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-400" />
                Modifier l'Entrée - {editingEntry.entryId}
              </h3>
              <button
                onClick={closeEditModal}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {error && (
                <div className="p-3 bg-red-900/50 border border-red-700/50 text-red-300 rounded-lg">
                  {error}
                </div>
              )}

              {/* Entry Information */}
              <div>
                <h4 className="text-md font-medium text-blue-400 mb-3">
                  Informations de l'Entrée
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-300 mb-1">
                      Montant (USD) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.amount}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          amount: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full p-2 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-300 mb-1">
                      Source *
                    </label>
                    <select
                      value={editForm.source}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          source: e.target.value,
                        }))
                      }
                      className="w-full p-2 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                      required
                    >
                      <option value="" className="bg-gray-900">Sélectionner la source</option>
                      {sources.map((source) => (
                        <option key={source} value={source} className="bg-gray-900">
                          {source}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-300 mb-1">
                      Catégorie *
                    </label>
                    <select
                      value={editForm.category}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          category: e.target.value,
                        }))
                      }
                      className="w-full p-2 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                      required
                    >
                      <option value="" className="bg-gray-900">Sélectionner la catégorie</option>
                      {categories.map((category) => (
                        <option key={category} value={category} className="bg-gray-900">
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-300 mb-1">
                      Méthode de Paiement *
                    </label>
                    <select
                      value={editForm.paymentMethod}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          paymentMethod: e.target.value as "cash" | "card" | "transfer" | "other",
                        }))
                      }
                      className="w-full p-2 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                      required
                    >
                      <option value="cash" className="bg-gray-900">Espèces</option>
                      <option value="card" className="bg-gray-900">Carte</option>
                      <option value="transfer" className="bg-gray-900">Transfert</option>
                      <option value="other" className="bg-gray-900">Autre</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-blue-300 mb-1">
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Description de l'entrée d'argent..."
                  className="w-full p-2 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white h-20"
                />
              </div>

              {/* Received From Information */}
              <div>
                <h4 className="text-md font-medium text-blue-400 mb-3">
                  Information sur l'Expéditeur
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-300 mb-1">
                      Nom *
                    </label>
                    <input
                      type="text"
                      value={editForm.receivedFrom.name}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          receivedFrom: { ...prev.receivedFrom, name: e.target.value },
                        }))
                      }
                      className="w-full p-2 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-300 mb-1">
                      Téléphone *
                    </label>
                    <input
                      type="tel"
                      value={editForm.receivedFrom.phone}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          receivedFrom: { ...prev.receivedFrom, phone: e.target.value },
                        }))
                      }
                      className="w-full p-2 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-blue-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={editForm.receivedFrom.email}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          receivedFrom: { ...prev.receivedFrom, email: e.target.value },
                        }))
                      }
                      className="w-full p-2 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Edit Reason */}
              <div>
                <h4 className="text-md font-medium text-blue-400 mb-3">
                  Raison de modification
                </h4>
                <textarea
                  value={editForm.reason}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  placeholder="Veuillez indiquer une raison pour la modification de cette entrée..."
                  className="w-full p-2 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white h-20"
                  required
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-blue-800/50">
                <button
                  onClick={handleEditEntry}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-800 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-900/50 border border-blue-400/30"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Mise à jour...
                    </>
                  ) : (
                    <>
                      <Edit className="w-4 h-4" /> Mettre à jour l'Entrée
                    </>
                  )}
                </button>
                <button
                  onClick={closeEditModal}
                  className="px-4 py-2 border border-blue-800/50 rounded-lg hover:bg-blue-900/30 text-blue-300 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
