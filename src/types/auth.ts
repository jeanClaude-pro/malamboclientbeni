export type Role =
  | "admin"
  | "superadmin"
  | "manager"
  | "staff"
  | "cashier_supervisor"
  | "inventory_manager";

export interface User {
  id: string;
  username: string;
  email: string;
  role: Role;
  branchId: BranchId;
  isSuperAdmin?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  loading: boolean;
  activeBranchId: BranchId;
}

export type BranchId = "butembo" | "beni";

export interface Branch {
  id: BranchId;
  name: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}
