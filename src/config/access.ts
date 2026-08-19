import type { ComponentType } from "react";
import {
  ArrowLeftRight,
  BarChart3,
  CalendarDays,
  ClipboardList,
  History,
  Package,
  ReceiptText,
  ShoppingCart,
  TrendingUp,
  UserRoundCog,
  Users,
  WalletCards,
} from "lucide-react";
import type { Role, User } from "../types/auth";

export type OperationalRole = Exclude<Role, "admin" | "superadmin">;

export interface ModuleAccess {
  id: string;
  label: string;
  description: string;
  path: string;
  section: "Opérations" | "Stock & logistique" | "Suivi & rapports" | "Administration";
  icon: ComponentType<{ className?: string }>;
  roles: OperationalRole[];
  featured?: boolean;
}

export const MODULES: ModuleAccess[] = [
  { id: "rate", label: "Taux de change", description: "Configurer le taux monétaire utilisé par l'entreprise.", path: "/rate", section: "Administration", icon: TrendingUp, roles: [] },
  { id: "pos", label: "Point de vente", description: "Enregistrer les ventes, crédits et réservations.", path: "/new-sale", section: "Opérations", icon: ShoppingCart, roles: ["cashier_supervisor", "inventory_manager"], featured: true },
  { id: "entry", label: "Entrée de caisse", description: "Enregistrer les recettes et autres entrées de caisse.", path: "/entry", section: "Opérations", icon: WalletCards, roles: ["cashier_supervisor", "inventory_manager"] },
  { id: "sortie", label: "Sortie de caisse", description: "Soumettre les dépenses et décaissements.", path: "/sortie", section: "Opérations", icon: ReceiptText, roles: ["cashier_supervisor", "inventory_manager"] },
  { id: "cars", label: "Camions", description: "Planifier un trajet et son chargement multi-articles.", path: "/cars", section: "Stock & logistique", icon: CalendarDays, roles: ["cashier_supervisor", "inventory_manager"] },
  { id: "transfert", label: "Transfert", description: "Préparer les transferts de marchandises.", path: "/transfert", section: "Stock & logistique", icon: ArrowLeftRight, roles: ["cashier_supervisor", "inventory_manager"] },
  { id: "transfer-reception", label: "Réception", description: "Réceptionner les marchandises et mettre le stock à jour.", path: "/transfer-reception", section: "Stock & logistique", icon: ClipboardList, roles: ["cashier_supervisor", "inventory_manager"] },
  { id: "products", label: "Articles & stock", description: "Consulter les articles, niveaux de stock et fiches d'audit.", path: "/products", section: "Stock & logistique", icon: Package, roles: ["manager", "inventory_manager"], featured: true },
  { id: "sales", label: "Historique des ventes", description: "Suivre les ventes, réservations et paiements.", path: "/sales", section: "Suivi & rapports", icon: History, roles: ["cashier_supervisor", "inventory_manager"] },
  { id: "carshistory", label: "Historique des camions", description: "Contrôler les arrivées et corrections de trajets.", path: "/carshistory", section: "Suivi & rapports", icon: History, roles: ["cashier_supervisor", "inventory_manager"] },
  { id: "entryhistory", label: "Historique des entrées", description: "Consulter les recettes enregistrées.", path: "/entryhistory", section: "Suivi & rapports", icon: History, roles: ["cashier_supervisor", "inventory_manager"] },
  { id: "historicsortie", label: "Historique des sorties", description: "Contrôler et, selon le rôle, valider les dépenses.", path: "/sortiehistory", section: "Suivi & rapports", icon: History, roles: ["manager", "cashier_supervisor", "inventory_manager"] },
  { id: "historictransfert", label: "Historique des transferts", description: "Suivre les transferts enregistrés.", path: "/transferthistory", section: "Suivi & rapports", icon: History, roles: ["cashier_supervisor", "inventory_manager"] },
  { id: "historicreception", label: "Historique des réceptions", description: "Auditer les réceptions et annulations de stock.", path: "/transfer-reception-history", section: "Suivi & rapports", icon: History, roles: ["cashier_supervisor", "inventory_manager"] },
  { id: "reports", label: "Rapports", description: "Analyser les résultats de l'agence et produire les PDF.", path: "/reports", section: "Suivi & rapports", icon: BarChart3, roles: ["manager"], featured: true },
  { id: "customers", label: "Clients", description: "Consulter les clients et leur historique dans l'agence.", path: "/customers", section: "Suivi & rapports", icon: Users, roles: ["cashier_supervisor"] },
  { id: "users", label: "Personnel & agences", description: "Approuver les comptes, attribuer les rôles et affecter les agences.", path: "/users", section: "Administration", icon: UserRoundCog, roles: [], featured: true },
];

export const ROLE_DEFINITIONS: Record<Role, { label: string; summary: string; access: string[] }> = {
  superadmin: {
    label: "Super Admin",
    summary: "Contrôle intégral des deux agences.",
    access: ["Tous les modules", "Sélection Butembo/Beni", "Gestion des comptes, rôles et agences", "Toutes les validations, corrections et annulations"],
  },
  admin: {
    label: "Super Admin (historique)",
    summary: "Les comptes administrateur existants conservent tous les pouvoirs.",
    access: ["Tous les modules", "Sélection Butembo/Beni", "Gestion des comptes, rôles et agences", "Toutes les validations, corrections et annulations"],
  },
  manager: {
    label: "Responsable",
    summary: "Pilotage, contrôle des sorties et consultation du stock.",
    access: ["Articles & stock", "Historique des sorties", "Rapports de l'agence"],
  },
  inventory_manager: {
    label: "Gestionnaire de stock",
    summary: "Opérations de stock, logistique et consultation des historiques.",
    access: ["Point de vente et caisse", "Articles & stock", "Camions, transferts et réceptions", "Historiques opérationnels"],
  },
  cashier_supervisor: {
    label: "Superviseur de caisse",
    summary: "Ventes, caisse, clients et suivi opérationnel.",
    access: ["Point de vente", "Entrées et sorties de caisse", "Clients", "Camions, transferts, réceptions et historiques"],
  },
  staff: {
    label: "Personnel",
    summary: "Compte de base sans module opérationnel supplémentaire.",
    access: ["Accueil uniquement", "L'accès évolue lorsque le Super Admin attribue un rôle opérationnel"],
  },
};

export const ASSIGNABLE_ROLES: Role[] = [
  "staff",
  "cashier_supervisor",
  "inventory_manager",
  "manager",
  "admin",
  "superadmin",
];

export function isSuperAdmin(user: Pick<User, "role" | "isSuperAdmin"> | null | undefined): boolean {
  return Boolean(user?.isSuperAdmin || user?.role === "admin" || user?.role === "superadmin");
}

// Branch switching is narrower than isSuperAdmin: superadmin only, admin excluded.
export function canSwitchBranch(user: Pick<User, "role"> | null | undefined): boolean {
  return user?.role === "superadmin";
}

export function canAccessModule(user: Pick<User, "role" | "isSuperAdmin"> | null | undefined, module: ModuleAccess): boolean {
  if (!user) return false;
  return isSuperAdmin(user) || module.roles.includes(user.role as OperationalRole);
}

export function canAccessPath(user: Pick<User, "role" | "isSuperAdmin"> | null | undefined, path: string): boolean {
  if (!user) return false;
  if (path === "/") return true;
  const module = MODULES.find((item) => item.path.toLowerCase() === path.toLowerCase());
  return module ? canAccessModule(user, module) : false;
}
