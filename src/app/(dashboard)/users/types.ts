export interface User {
    id: number;
    name: string;
    email: string;
    registrationDate: string;
    lastPayment: number | null;
    status: 'active' | 'inactive' | 'pending';
  }