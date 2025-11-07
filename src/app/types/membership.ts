// export interface Membership {
//   id: string;
//   userId: string;
//   type: string;
//   startDate: string;
//   endDate: string;
//   status: 'active' | 'expired' | 'cancelled';
//   paymentStatus: 'paid' | 'pending' | 'failed';
//   createdAt: string;
//   updatedAt: string;
//   [key: string]: unknown; // For compatibility with Record<string, unknown>
// } 

export interface Membership {
  _id: {
    $oid: string;
  };
  userId: string;
  membershipSheetsId: string;
  membershipType: string;
  amount: number;
  currency: string;
  processor: string;
  source: string;
  availableAudios: number;
  paymentDate: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
} 
