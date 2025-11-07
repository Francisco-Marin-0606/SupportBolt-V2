export interface User {
  id: string;
  names: string;
  lastnames: string;
  wantToBeCalled: string;
  gender: string;
  birthdate: string;
  cellphone: string;
  availableRequest: number;
  features?: {
    nextAvailableForm?: {
      value?: number | string;
      enabled?: boolean;
    };
  };
  lastMembership: {
    membershipId: string;
    membershipDate: string;
    membershipPaymentDate: string;
    billingDate?: string;
    type: string;
  };
  userData: {
    wantToBeCalled: string;
    phone: string;
    birthdate: string;
    gender: string;
  };
  auraEnabled: boolean;
  loginCode: string | null;
  loginCodeDate: string | null;
  email: string;
  role: string;
  status: "active" | "inactive" | "pending";
  isActiveInStripe?: boolean;
  createdAt: string;
  userLevel: string | null;
  source: string | null;
  device: string | null; // ✅ NUEVO CAMPO
  processorData?: {
    appID: string;
    customId: string;
  }
  [key: string]: unknown; // For compatibility with Record<string, unknown>
  language?: "es" | "en";
}

export interface MmgUserStats {
  total: number;
  active: number | null;
  cancelled: number | null;
  trial: number;
  totalActives: number;
  activeUsers?: User[];
}
