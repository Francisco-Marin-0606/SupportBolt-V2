export interface Order {
  id: string;
  customerName: string;
  status: 'created' | 'pending' | 'completed' | 'sended' | 'error' | 'review';
  total: number;
  createdAt: string;
  marketplace?: string;
  messages?: Array<{
    id: string;
    content: string;
    timestamp: string;
    sender: string;
  }>;
  [key: string]: unknown; // For compatibility with Record<string, unknown>
} 