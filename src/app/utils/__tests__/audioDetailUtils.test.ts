import {
    clearScriptSessionData,
    formatDate,
    formatDateUTC,
    formatTime,
    getMonthName,
    validateRetryData,
} from '../audioDetailUtils';

describe('audioDetailUtils', () => {
  describe('formatDate', () => {
    it('debe formatear una fecha válida', () => {
      const date = new Date('2024-01-15T10:30:00');
      const result = formatDate(date);
      expect(result).toContain('2024');
      expect(result).toContain('enero');
      expect(result).toContain('15');
    });

    it('debe retornar "-" para fecha undefined', () => {
      expect(formatDate(undefined)).toBe('-');
    });

    it('debe formatear un string de fecha', () => {
      const result = formatDate('2024-01-15T10:30:00');
      expect(result).toContain('2024');
    });
  });

  describe('formatTime', () => {
    it('debe formatear segundos a minutos:segundos', () => {
      expect(formatTime(90)).toBe('1:30');
      expect(formatTime(125)).toBe('2:05');
      expect(formatTime(45)).toBe('0:45');
    });

    it('debe agregar padding a los segundos', () => {
      expect(formatTime(5)).toBe('0:05');
      expect(formatTime(305)).toBe('5:05');
    });
  });

  describe('formatDateUTC', () => {
    it('debe formatear una fecha UTC válida', () => {
      const result = formatDateUTC('2024-01-15T10:30:00Z');
      expect(result).toContain('enero');
      expect(result).toContain('2024');
      expect(result).toContain('15');
    });

    it('debe retornar "Sin fecha" para string undefined', () => {
      expect(formatDateUTC(undefined)).toBe('Sin fecha');
    });
  });

  describe('getMonthName', () => {
    it('debe retornar el nombre del mes correcto', () => {
      expect(getMonthName(1)).toBe('Enero');
      expect(getMonthName(6)).toBe('Junio');
      expect(getMonthName(12)).toBe('Diciembre');
    });
  });

  describe('clearScriptSessionData', () => {
    let store: Record<string, string> = {};

    beforeAll(() => {
      // Mock sessionStorage
      Object.defineProperty(global, 'sessionStorage', {
        value: {
          getItem: (key: string) => store[key] || null,
          setItem: (key: string, value: string) => {
            store[key] = value.toString();
          },
          removeItem: (key: string) => {
            delete store[key];
          },
          clear: () => {
            store = {};
          },
          get length() {
            return Object.keys(store).length;
          },
          key: (index: number) => {
            const keys = Object.keys(store);
            return keys[index] || null;
          },
        },
        writable: true,
        configurable: true,
      });

      // Mock Object.keys para sessionStorage
      const originalObjectKeys = Object.keys;
      jest.spyOn(Object, 'keys').mockImplementation((obj: any) => {
        if (obj === sessionStorage) {
          return originalObjectKeys(store);
        }
        return originalObjectKeys(obj);
      });
    });

    beforeEach(() => {
      store = {};
    });

    afterAll(() => {
      jest.restoreAllMocks();
    });

    it('debe limpiar solo las claves relacionadas con scriptEdit y isEditing', () => {
      const audioId = 'test-audio-123';
      store[`scriptEdit_${audioId}_1`] = 'value1';
      store[`isEditing_${audioId}_1`] = 'true';
      store['otherKey'] = 'value';

      clearScriptSessionData(audioId);

      expect(store[`scriptEdit_${audioId}_1`]).toBeUndefined();
      expect(store[`isEditing_${audioId}_1`]).toBeUndefined();
      expect(store['otherKey']).toBe('value');
    });

    it('debe manejar múltiples claves del mismo audioId', () => {
      const audioId = 'test-audio-456';
      store[`scriptEdit_${audioId}_1`] = 'value1';
      store[`scriptEdit_${audioId}_2`] = 'value2';
      store[`isEditing_${audioId}_3`] = 'true';

      clearScriptSessionData(audioId);

      expect(Object.keys(store).length).toBe(0);
    });
  });

  describe('validateRetryData', () => {
    it('debe retornar true si retryData es null', () => {
      expect(validateRetryData(null)).toBe(true);
    });

    it('debe validar correctamente cuando remakeALL es true', () => {
      const validData = {
        sections: [
          {
            sectionId: 1,
            remakeALL: true,
            texts: [],
          },
        ],
      };
      expect(validateRetryData(validData)).toBe(true);
    });

    it('debe fallar si remakeALL es true pero texts no está vacío', () => {
      const invalidData = {
        sections: [
          {
            sectionId: 1,
            remakeALL: true,
            texts: [{ index: 0, textToUse: 'test', regen: false }],
          },
        ],
      };
      expect(validateRetryData(invalidData)).toBe(false);
    });

    it('debe validar correctamente cuando remakeALL es false con texts', () => {
      const validData = {
        sections: [
          {
            sectionId: 1,
            remakeALL: false,
            texts: [
              { index: 0, textToUse: 'test', regen: false },
            ],
          },
        ],
      };
      expect(validateRetryData(validData)).toBe(true);
    });

    it('debe fallar si remakeALL es false pero texts está vacío', () => {
      const invalidData = {
        sections: [
          {
            sectionId: 1,
            remakeALL: false,
            texts: [],
          },
        ],
      };
      expect(validateRetryData(invalidData)).toBe(false);
    });

    it('debe fallar si regen es false pero textToUse es null', () => {
      const invalidData = {
        sections: [
          {
            sectionId: 1,
            remakeALL: false,
            texts: [{ index: 0, textToUse: null, regen: false }],
          },
        ],
      };
      expect(validateRetryData(invalidData)).toBe(false);
    });

    it('debe fallar si textToUse no es null pero regen es true', () => {
      const invalidData = {
        sections: [
          {
            sectionId: 1,
            remakeALL: false,
            texts: [{ index: 0, textToUse: 'test', regen: true }],
          },
        ],
      };
      expect(validateRetryData(invalidData)).toBe(false);
    });

    it('debe validar correctamente cuando regen es true', () => {
      const validData = {
        sections: [
          {
            sectionId: 1,
            remakeALL: false,
            texts: [
              { index: 0, textToUse: null, regen: true },
            ],
          },
        ],
      };
      expect(validateRetryData(validData)).toBe(true);
    });
  });

});