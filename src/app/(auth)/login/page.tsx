// src/app/login/page.js
'use client';
import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { buttonStyles, inputStyles, textStyles } from '@/app/styles/themes';
import { login } from '@/app/_services/authService';
import { getAuthToken } from '@/app/_services/tokenService';

// Interfaces para tipado
interface Credentials {
  email: string;
  password: string;
}

interface FormErrors {
  email: string;
  password: string;
  submit: string;
}

export default function LoginPage() {
  const [credentials, setCredentials] = useState<Credentials>({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<FormErrors>({
    email: '',
    password: '',
    submit: ''
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkToken = async () => {
      const token = await getAuthToken();
      if (token) {
        // Si el token es válido, redirige a la ruta /users
        router.push('/users');
      }
    };

    checkToken();
  }, [router]);

  const validateForm = () => {
    const tempErrors: FormErrors = {
      email: '',
      password: '',
      submit: ''
    };
    let isValid = true;

    if (!credentials.email.trim()) {
      tempErrors.email = 'El email es requerido';
      isValid = false;
    }

    if (!credentials.password) {
      tempErrors.password = 'La contraseña es requerida';
      isValid = false;
    }

    setErrors({ ...tempErrors });
    return isValid;
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
    // Limpiar error cuando el usuario empieza a escribir
    setErrors(prev => ({
      ...prev,
      [name]: '',
      submit: '' // Limpiar errores generales también
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await login(credentials);
      router.push('/users');
    } catch (err) {
      console.error('Error durante el login:', err);
      setErrors(prev => ({
        ...prev,
        submit: err instanceof Error ? err.message : 'Error en el inicio de sesión'
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-secondary">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-sm">
        <div>
          <h2 className={`${textStyles.h2} text-center`}>Mental Support</h2>
          <p className={`${textStyles.body} text-center text-text-secondary mt-2`}>
          Todo falla... menos nosotros.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-secondary">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={credentials.email}
                onChange={handleChange}
                className={`${inputStyles.base} ${inputStyles.sizes.md} mt-1 text-black`}
                placeholder="tu@email.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-secondary">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={credentials.password}
                onChange={handleChange}
                className={`${inputStyles.base} ${inputStyles.sizes.md} mt-1 text-black`}
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>
          </div>

          {errors.submit && (
            <div className="text-red-600 text-sm text-center">
              {errors.submit}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`${buttonStyles.base} ${buttonStyles.sizes.md} w-full bg-black text-white`}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}