// Prefijos para cada sección
const PREFIXES = {
  users: 'users',
  audios: 'audios',
} as const;

type SectionType = keyof typeof PREFIXES;

// Claves específicas para cada sección
const STORAGE_KEYS = {
  currentPage: 'CurrentPage',
  pageSize: 'PageSize',
  query: 'Query',
  sortField: 'SortField',
  sortDirection: 'SortDirection',
  status: 'Status',
  userLevel: 'UserLevel'
} as const;

export class LocalStorageService {
  private static getKey(section: SectionType, key: keyof typeof STORAGE_KEYS): string {
    return `${PREFIXES[section]}${STORAGE_KEYS[key]}`;
  }

  // Guardar un valor
  static setValue(section: SectionType, key: keyof typeof STORAGE_KEYS, value: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.getKey(section, key), value);
    }
  }

  // Obtener un valor
  static getValue(section: SectionType, key: keyof typeof STORAGE_KEYS): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.getKey(section, key));
    }
    return null;
  }

  // Obtener un valor numérico
  static getNumberValue(section: SectionType, key: keyof typeof STORAGE_KEYS, defaultValue: number): number {
    const value = this.getValue(section, key);
    return value ? parseInt(value) : defaultValue;
  }

  // Limpiar todos los valores de una sección (localStorage Y sessionStorage)
  static clearSection(section: SectionType): void {
    if (typeof window !== 'undefined') {
      Object.keys(STORAGE_KEYS).forEach(key => {
        const fullKey = this.getKey(section, key as keyof typeof STORAGE_KEYS);
        localStorage.removeItem(fullKey);
        // También limpiar sessionStorage para compatibilidad con código existente
        sessionStorage.removeItem(fullKey);
      });
      
      // Limpiar también las claves legacy de sessionStorage
      if (section === 'users') {
        sessionStorage.removeItem('usersQuery');
        sessionStorage.removeItem('usersPageSize');
        sessionStorage.removeItem('usersCache');
      }
    }
  }

  // Limpiar todas las secciones
  static clearAll(): void {
    Object.keys(PREFIXES).forEach(prefix => {
      this.clearSection(prefix as SectionType);
    });
  }
} 