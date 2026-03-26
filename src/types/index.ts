export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
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
  lastUpdate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Cost {
  id: string;
  projectId: string;
  concept: string;
  amount: number;
  category: "Obra" | "Mecánica" | "Estética" | "Profesionales" | "Servicios";
  costType: "material" | "mano_de_obra";
  date: Date;
  createdAt: Date;
}

export interface Investor {
  id: string;
  projectId: string;
  name: string;
  percentage: number;
}

export interface ProjectAccess {
  id: string;
  projectId: string;
  userId: string;
  role: "ver" | "interactuar";
}

export interface TimelineEvent {
  id: string;
  projectId: string;
  action: string;
  detail: string;
  date: Date;
}

export interface Session {
  user: {
    id: string;
    name: string;
    email: string;
    role: "admin" | "user";
  };
}
