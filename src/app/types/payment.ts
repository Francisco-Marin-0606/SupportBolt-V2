export interface Payment {
  id: string;
  userId: string;
  orderId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'partially_refunded';
  paymentMethod: string;
  transactionId?: string;
  refundedAmount?: number;
  refundReason?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown; // For compatibility with Record<string, unknown>
} 