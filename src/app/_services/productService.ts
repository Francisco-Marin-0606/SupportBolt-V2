import { Product } from '@/app/types/product';
import { Connection } from './connectionService';

const connection = new Connection();
const PRODUCTS_API = 'products';

// Get all products
export async function getProducts(): Promise<Product[]> {
  try {
    const response = await connection.get<Product[]>(PRODUCTS_API);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error('Error in getProducts:', error);
    throw error;
  }
}

// Get a single product by ID
export async function getProductById(id: string): Promise<Product> {
  try {
    const response = await connection.get<Product>(`${PRODUCTS_API}/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error('Error in getProductById:', error);
    throw error;
  }
}

// Create a new product
export async function createProduct(productData: Omit<Product, 'id'>): Promise<Product> {
  try {
    const response = await connection.post<Product>(PRODUCTS_API, productData);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error('Error in createProduct:', error);
    throw error;
  }
}

// Update a product
export async function updateProduct(id: string, productData: Partial<Product>): Promise<Product> {
  try {
    const response = await connection.patch<Product>(`${PRODUCTS_API}/${id}`, productData);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error('Error in updateProduct:', error);
    throw error;
  }
}

// Delete a product
export async function deleteProduct(id: string): Promise<void> {
  try {
    const response = await connection.delete<void>(`${PRODUCTS_API}/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error in deleteProduct:', error);
    throw error;
  }
}

// Update product stock
export async function updateProductStock(id: string, quantity: number): Promise<Product> {
  try {
    const response = await connection.patch<Product>(`${PRODUCTS_API}/${id}/stock`, { quantity });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error('Error in updateProductStock:', error);
    throw error;
  }
}

// Get products by category
export async function getProductsByCategory(category: string): Promise<Product[]> {
  try {
    const response = await connection.get<Product[]>(`${PRODUCTS_API}/category/${category}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error('Error in getProductsByCategory:', error);
    throw error;
  }
}

// Search products
export async function searchProducts(query: string): Promise<Product[]> {
  try {
    const response = await connection.get<Product[]>(`${PRODUCTS_API}/search`, {
      params: { q: query }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error('Error in searchProducts:', error);
    throw error;
  }
}

// Get products with pagination
export async function getProductsWithPagination(page: number, limit: number): Promise<{
  products: Product[];
  total: number;
  totalPages: number;
}> {
  try {
    const response = await connection.get<{
      products: Product[];
      total: number;
      totalPages: number;
    }>(PRODUCTS_API, {
      params: { page, limit }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error('Error in getProductsWithPagination:', error);
    throw error;
  }
}

// Get products by price range
export async function getProductsByPriceRange(
  minPrice: number,
  maxPrice: number
): Promise<Product[]> {
  try {
    const response = await connection.get<Product[]>(`${PRODUCTS_API}/price-range`, {
      params: { min: minPrice, max: maxPrice }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error('Error in getProductsByPriceRange:', error);
    throw error;
  }
}