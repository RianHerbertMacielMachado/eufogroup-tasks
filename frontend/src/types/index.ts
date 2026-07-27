export interface User {
  id: string;
  name: string;
  discordId: string;
  email?: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'OPERATOR';
  firstLogin: boolean;
  cities: City[];
}

export type CityLayoutType = 'CLASSIC' | 'DARK_PRO' | 'CORPORATE' | 'MINIMAL' | 'MILITARY' | 'CYBERPUNK';

export interface City {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  backgroundMode: 'STATIC' | 'CAROUSEL';
  carouselInterval: number;
  layout: CityLayoutType;
  isActive: boolean;
  backgroundImages?: CityBackground[];
  _count?: { employees: number; tasks: number; events: number };
}

export interface CityBackground {
  id: string;
  cityId: string;
  imageUrl: string;
  order: number;
}

export interface Employee {
  id: string;
  name: string;
  discordId: string;
  cargo: string;
  funcao: string;
  isActive: boolean;
  cityId: string;
  createdAt: string;
  _count?: { tasks: number; events: number };
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate: string;
  cityId: string;
  employeeId?: string | null;
  employee?: Pick<Employee, 'id' | 'name' | 'cargo' | 'funcao'> | null;
  employeeSnapshot?: string; // nome preservado após delete do funcionário
  cargoSnapshot?: string;
  funcaoSnapshot?: string;
  cancelReason?: string;
  cancelledBy?: string;
  completedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: string;
  description: string;
  tipo: 'POSITIVE' | 'NEGATIVE';
  cargo: string;
  funcao: string;
  link?: string;
  images: string[];
  cityId: string;
  employeeId?: string | null;
  employee?: Pick<Employee, 'id' | 'name' | 'cargo' | 'funcao'> | null;
  employeeSnapshot?: string; // nome preservado após delete do funcionário
  cargoSnapshot?: string;
  funcaoSnapshot?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  cancelledTasks: number;
  overdueTasks: number;
  slaRate: number;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (discordId: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

export interface CityContextType {
  currentCity: City | null;
  setCurrentCity: (city: City | null) => void;
}
