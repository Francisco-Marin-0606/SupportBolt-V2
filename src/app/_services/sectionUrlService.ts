class SectionUrlService {
  private static STORAGE_KEY = 'sectionUrls';

  // Guardar la URL actual de una sección
  static saveCurrentUrl(section: 'users' | 'audios', url: string): void {
    if (typeof window !== 'undefined') {
      try {
        const sectionUrls = this.getAllUrls();
        sectionUrls[section] = url;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sectionUrls));
      } catch (error) {
        console.warn('Error saving section URL:', error);
      }
    }
  }

  // Obtener la URL guardada de una sección
  static getSavedUrl(section: 'users' | 'audios'): string | null {
    if (typeof window !== 'undefined') {
      try {
        const sectionUrls = this.getAllUrls();
        return sectionUrls[section] || null;
      } catch (error) {
        console.warn('Error getting section URL:', error);
        return null;
      }
    }
    return null;
  }

  // Obtener todas las URLs guardadas
  private static getAllUrls(): { [key: string]: string } {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  // Limpiar URL de una sección
  static clearSectionUrl(section: 'users' | 'audios'): void {
    if (typeof window !== 'undefined') {
      const sectionUrls = this.getAllUrls();
      delete sectionUrls[section];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sectionUrls));
    }
  }
}

export { SectionUrlService };
