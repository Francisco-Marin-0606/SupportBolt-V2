"use client"

import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-3xl font-bold mb-4">404 - Página no encontrada</h1>
      <p className="mb-6">La página que estás buscando no existe.</p>
      <Link 
        href="/"
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        Volver al inicio
      </Link>
    </div>
  );
} 