export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "colaborador" | "vista";
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  type: "Casa" | "Auto";
  status: "activo" | "pausado" | "vendido";
  buyPrice: number;
  salePrice: number | null;
  listingPrice: number | null;
  address: string | null;
  buyDate: Date;
  saleDate?: Date | null;
  buyerName?: string | null;
  lastUpdate: Date;
  createdAt: Date;
  updatedAt: Date;
  // Computed fields from API
  totalCosts?: number;
  totalExpenses?: number;
  investment?: number;
  result?: number;
  margin?: number;
  estimatedMargin?: number;
  investorCount?: number;
  costCount?: number;
  costs?: Cost[];
  expenses?: Expense[];
  investors?: Investor[];
  access?: ProjectAccess[];
  timeline?: TimelineEvent[];
}

export interface Cost {
  id: string;
  projectId: string;
  concept: string;
  amount: number;
  currency?: "ARS" | "USD";
  exchangeRate?: number | null;
  amountUsd?: number | null;
  category: string;
  costType: string;
  date: Date;
  createdAt: Date;
}

export interface Investor {
  id: string;
  projectId: string;
  name: string;
  capitalPercentage: number;
  profitPercentage: number;
  amountInvested: number;
  userId?: string | null;
  user?: { id: string; name: string; email: string } | null;
}

export interface ProjectAccess {
  id: string;
  projectId: string;
  userId: string;
  role: "ver" | "interactuar";
  /** Populated when API includes user relation */
  user?: { id: string; name: string; email: string };
}

export interface TimelineEvent {
  id: string;
  projectId: string;
  action: string;
  detail: string;
  date: Date;
}

export interface Expense {
  id: string;
  projectId: string;
  concept: string;
  amount: number;
  currency: "ARS" | "USD";
  exchangeRate: number | null;
  amountUsd: number | null;
  period: Date;
  paidDate: Date | null;
  paidByInvestorId?: string | null;
  receiptUrl: string | null;
  receiptName: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  message: string;
  projectId: string | null;
  read: boolean;
  createdAt: Date;
}

export interface ParsedReceipt {
  concept: string;
  amount: number;
  currency: "ARS" | "USD";
  period: string;
  paidDate: string | null;
  notes: string | null;
}