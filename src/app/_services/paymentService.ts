import { Payment } from '@/app/types/payment';
import { Connection } from './connectionService';

const connection = new Connection();
const PAYMENTS_API = 'payments';


// Get all payments
export async function getPayments(): Promise<Payment[]> {
  try {
    const response = await connection.get<Payment[]>(PAYMENTS_API);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error('Error in getPayments:', error);
    throw error;
  }
}

// Get a single payment by ID
export async function getPaymentById(id: string): Promise<Payment> {
  try {
    const response = await connection.get<Payment>(`${PAYMENTS_API}/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error('Error in getPaymentById:', error);
    throw error;
  }
}

// Create a new payment
export async function createPayment(paymentData: Omit<Payment, 'id'>): Promise<Payment> {
  try {
    const response = await connection.post<Payment>(PAYMENTS_API, paymentData);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error('Error in createPayment:', error);
    throw error;
  }
}

// Update a payment
export async function updatePayment(id: string, paymentData: Partial<Payment>): Promise<Payment> {
  try {
    const response = await connection.patch<Payment>(`${PAYMENTS_API}/${id}`, paymentData);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error('Error in updatePayment:', error);
    throw error;
  }
}

// Delete a payment
export async function deletePayment(id: string): Promise<void> {
  try {
    const response = await connection.delete<void>(`${PAYMENTS_API}/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error in deletePayment:', error);
    throw error;
  }
}

// Update payment status
export async function updatePaymentStatus(id: string, status: Payment['status']): Promise<Payment> {
  try {
    const response = await connection.patch<Payment>(`${PAYMENTS_API}/${id}/status`, { status });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error('Error in updatePaymentStatus:', error);
    throw error;
  }
}

// Get payments by user
export async function getPaymentsByUser(userId: string): Promise<Payment[]> {
  try {
    const response = await connection.get<Payment[]>(`${PAYMENTS_API}/user/${userId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error('Error in getPaymentsByUser:', error);
    throw error;
  }
}

// Get payments by date range
export async function getPaymentsByDateRange(
  startDate: string,
  endDate: string
): Promise<Payment[]> {
  try {
    const response = await connection.get<Payment[]>(`${PAYMENTS_API}/date-range`, {
      params: { start: startDate, end: endDate }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error('Error in getPaymentsByDateRange:', error);
    throw error;
  }
}

// Get payments with pagination
export async function getPaymentsWithPagination(page: number, limit: number): Promise<{
  payments: Payment[];
  total: number;
  totalPages: number;
}> {
  try {
    const response = await connection.get<{
      payments: Payment[];
      total: number;
      totalPages: number;
    }>(PAYMENTS_API, {
      params: { page, limit }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error('Error in getPaymentsWithPagination:', error);
    throw error;
  }
}

// Process refund
export async function processRefund(paymentId: string, refundData: {
  amount: number;
  reason: string;
}): Promise<Payment> {
  try {
    const response = await connection.post<Payment>(`${PAYMENTS_API}/${paymentId}/refund`, refundData);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error('Error in processRefund:', error);
    throw error;
  }
}