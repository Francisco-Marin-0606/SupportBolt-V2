import { AudioRequest } from '@/app/types/audioRequest';
import {
    createReprocessPayload,
    filterUniqueAudiosByAttempt,
    getImageUrlFromSettings,
    getTextoCorregidoDesdeGuion,
    prepareGridData,
    prepareHistoryData,
    processUniqueResults,
} from '../audioDetailService';

describe('audioDetailService', () => {
  describe('getImageUrlFromSettings', () => {
    const baseAudioRequest: AudioRequest = {
      _id: 'test-id',
      userId: 'user-123',
      email: 'test@test.com',
      status: 'completed',
      requestDate: '2024-01-15',
      membershipDate: '2024-01-01',
      audioMotive: null,
      settings: {
        appSettings: {
          questions: [],
          formSettings: {
            backgroundColor: '#fff',
            imagePlayer: 'test.jpg',
            genderImage: {
              base: 'base.jpg',
              male: 'male.jpg',
              female: 'female.jpg',
            },
            genderTitle: { base: 'Base', male: 'Male', female: 'Female' },
            genderAudioDescription: { base: 'Base', male: 'Male', female: 'Female' },
          },
        },
      },
    };

    it('debe retornar imagen masculina cuando el género es "male"', () => {
      const audioRequest = {
        ...baseAudioRequest,
        additionalData: { formName: 'test', name: 'test', gender: 'male' },
      };

      const result = getImageUrlFromSettings(audioRequest);
      expect(result).toBe('male.jpg');
    });

    it('debe retornar imagen masculina cuando el género es "masculino"', () => {
      const audioRequest = {
        ...baseAudioRequest,
        additionalData: { formName: 'test', name: 'test', gender: 'masculino' },
      };

      const result = getImageUrlFromSettings(audioRequest);
      expect(result).toBe('male.jpg');
    });

    it('debe retornar imagen femenina cuando el género es "female"', () => {
      const audioRequest = {
        ...baseAudioRequest,
        additionalData: { formName: 'test', name: 'test', gender: 'female' },
      };

      const result = getImageUrlFromSettings(audioRequest);
      expect(result).toBe('female.jpg');
    });

    it('debe retornar imagen femenina cuando el género es "femenino"', () => {
      const audioRequest = {
        ...baseAudioRequest,
        additionalData: { formName: 'test', name: 'test', gender: 'femenino' },
      };

      const result = getImageUrlFromSettings(audioRequest);
      expect(result).toBe('female.jpg');
    });

    it('debe retornar imagen base cuando no hay género', () => {
      const result = getImageUrlFromSettings(baseAudioRequest);
      expect(result).toBe('base.jpg');
    });

    it('debe retornar imagen base cuando el género no es reconocido', () => {
      const audioRequest = {
        ...baseAudioRequest,
        additionalData: { formName: 'test', name: 'test', gender: 'other' },
      };

      const result = getImageUrlFromSettings(audioRequest);
      expect(result).toBe('base.jpg');
    });

    it('debe usar userData.gender si no existe additionalData.gender', () => {
      const audioRequest = {
        ...baseAudioRequest,
        userData: {
          _id: 'user-123',
          email: 'test@test.com',
          names: 'John',
          lastnames: 'Doe',
          wantToBeCalled: 'John',
          gender: 'male',
          birthdate: '1990-01-01',
          language: 'en' as const,
        },
      };

      const result = getImageUrlFromSettings(audioRequest);
      expect(result).toBe('male.jpg');
    });

    it('debe retornar string vacío si no hay settings', () => {
      const audioRequest = {
        ...baseAudioRequest,
        settings: null,
      };

      const result = getImageUrlFromSettings(audioRequest);
      expect(result).toBe('');
    });

    it('debe retornar string vacío si audioData es null', () => {
      const result = getImageUrlFromSettings(null);
      expect(result).toBe('');
    });
  });

  describe('getTextoCorregidoDesdeGuion', () => {
    const audioRequestWithSections: AudioRequest = {
      _id: 'test-id',
      userId: 'user-123',
      email: 'test@test.com',
      status: 'completed',
      requestDate: '2024-01-15',
      membershipDate: '2024-01-01',
      audioMotive: {
        voice: 'test-voice',
        export: 'test',
        questions: [],
        generatedSections: [
          {
            sectionID: 1,
            questions: [],
            texts: ['Texto 1', 'Texto 2', 'Texto 3'],
            path: '/path1',
            audios: [],
            completed: true,
          },
          {
            sectionID: 2,
            questions: [],
            texts: ['Texto 4', 'Texto 5'],
            path: '/path2',
            audios: [],
            completed: true,
          },
        ],
      },
    };

    it('debe retornar el texto correcto del primer audio de la primera sección', () => {
      const result = getTextoCorregidoDesdeGuion(audioRequestWithSections, 1);
      expect(result).toBe('Texto 1');
    });

    it('debe retornar el texto correcto del último audio de la primera sección', () => {
      const result = getTextoCorregidoDesdeGuion(audioRequestWithSections, 3);
      expect(result).toBe('Texto 3');
    });

    it('debe retornar el texto correcto del primer audio de la segunda sección', () => {
      const result = getTextoCorregidoDesdeGuion(audioRequestWithSections, 4);
      expect(result).toBe('Texto 4');
    });

    it('debe retornar el texto correcto del último audio de la segunda sección', () => {
      const result = getTextoCorregidoDesdeGuion(audioRequestWithSections, 5);
      expect(result).toBe('Texto 5');
    });

    it('debe retornar null si audioN está fuera de rango', () => {
      const result = getTextoCorregidoDesdeGuion(audioRequestWithSections, 10);
      expect(result).toBeNull();
    });

    it('debe retornar null si no hay generatedSections', () => {
      const audioRequest = {
        ...audioRequestWithSections,
        audioMotive: {
          ...audioRequestWithSections.audioMotive!,
          generatedSections: null,
        },
      };

      const result = getTextoCorregidoDesdeGuion(audioRequest, 1);
      expect(result).toBeNull();
    });

    it('debe retornar null si audioData es null', () => {
      const result = getTextoCorregidoDesdeGuion(null, 1);
      expect(result).toBeNull();
    });
  });

  describe('processUniqueResults', () => {
    it('debe procesar y retornar resultados únicos por audioN', () => {
      const erroresAudios = [
        {
          toRetry: [
            { audioN: 1, attempt: 1, text: 'texto 1' },
            { audioN: 2, attempt: 1, text: 'texto 2' },
          ],
        },
      ];

      const correccionesManuales = [
        { audioN: 1, attempt: 2, text: 'texto 1 corregido' },
      ];

      const result = processUniqueResults(erroresAudios, correccionesManuales);

      expect(result).toHaveLength(2);
      expect(result.find(r => r.audioN === 1)?.attempt).toBe(2);
      expect(result.find(r => r.audioN === 2)?.attempt).toBe(1);
    });

    it('debe mantener solo el intento más alto para cada audioN', () => {
      const erroresAudios = [
        {
          toRetry: [
            { audioN: 1, attempt: 1, text: 'intento 1' },
            { audioN: 1, attempt: 2, text: 'intento 2' },
            { audioN: 1, attempt: 3, text: 'intento 3' },
          ],
        },
      ];

      const result = processUniqueResults(erroresAudios, []);

      expect(result).toHaveLength(1);
      expect(result[0].attempt).toBe(3);
      expect(result[0].text).toBe('intento 3');
    });

    it('debe manejar múltiples bloques de errores', () => {
      const erroresAudios = [
        {
          toRetry: [{ audioN: 1, attempt: 1 }],
        },
        {
          toRetry: [{ audioN: 2, attempt: 1 }],
        },
      ];

      const result = processUniqueResults(erroresAudios, []);

      expect(result).toHaveLength(2);
    });
  });

  describe('prepareGridData', () => {
    it('debe preparar datos de grid correctamente', () => {
      const audioData: AudioRequest = {
        _id: 'test-id',
        userId: 'user-123',
        email: 'test@test.com',
        status: 'completed',
        requestDate: '2024-01-15',
        membershipDate: '2024-01-01',
        audioMotive: null,
        settings: {
          appSettings: {
            questions: [],
            formSettings: {
              backgroundColor: '#fff',
              imagePlayer: 'test.jpg',
              genderImage: {
                base: 'base.jpg',
                male: 'male.jpg',
                female: 'female.jpg',
              },
              genderTitle: { base: 'Base', male: 'Male', female: 'Female' },
              genderAudioDescription: { base: 'Base', male: 'Male', female: 'Female' },
            },
          },
        },
      };

      const audio = {
        audioUrl: 'http://test.com/audio.mp3',
        imageUrl: 'http://test.com/image.jpg',
      };

      const result = prepareGridData(audioData, audio);

      expect(result).toHaveLength(1);
      expect(result[0].audioUrl).toBe('http://test.com/audio.mp3');
      expect(result[0].audioUrlPlay).toBe('http://test.com/audio.mp3');
      expect(result[0].imageUrl).toBe('base.jpg');
    });

    it('debe retornar array vacío si audioData es null', () => {
      const result = prepareGridData(null, null);
      expect(result).toEqual([]);
    });
  });

  describe('prepareHistoryData', () => {
    it('debe preparar datos de historial correctamente', () => {
      const historyAudios = [
        {
          _id: 'audio-1',
          userId: 'user-123',
          email: 'test@test.com',
          status: 'completed' as const,
          requestDate: '2024-01-15',
          membershipDate: '2024-01-01',
          audioMotive: null,
          audioUrl: 'http://test.com/audio1.mp3',
        },
        {
          _id: 'audio-2',
          userId: 'user-123',
          email: 'test@test.com',
          status: 'completed' as const,
          requestDate: '2024-01-10',
          membershipDate: '2024-01-01',
          audioMotive: null,
          audioUrl: 'http://test.com/audio2.mp3',
        },
      ];

      const result = prepareHistoryData(historyAudios as any);

      expect(result).toHaveLength(2);
      expect(result[0].audioUrl).toBe('http://test.com/audio1.mp3');
      expect(result[1].audioUrl).toBe('http://test.com/audio2.mp3');
    });
  });

  describe('createReprocessPayload', () => {
    it('debe crear el payload de reprocesamiento correctamente', () => {
      const audioId = 'test-audio-id';
      const retryData = {
        sections: [
          {
            sectionId: 1,
            remakeALL: false,
            texts: [{ index: 0, textToUse: 'texto', regen: false }],
          },
        ],
      };

      const result = createReprocessPayload(audioId, retryData);

      expect(result).toEqual({
        task: audioId,
        retry: retryData,
      });
    });
  });

  describe('filterUniqueAudiosByAttempt', () => {
    it('debe filtrar audios únicos con attempt = 1', () => {
      const erroresAudiosOriginales = [
        {
          toRetry: [
            { audioN: 1, attempt: 1, text: 'texto 1' },
            { audioN: 1, attempt: 2, text: 'texto 1 intento 2' },
            { audioN: 2, attempt: 1, text: 'texto 2' },
          ],
        },
      ];

      const result = filterUniqueAudiosByAttempt(erroresAudiosOriginales);

      expect(result).toHaveLength(1);
      expect(result[0].audios).toHaveLength(2);
      expect(result[0].audios.every((a: any) => a.attempt === 1)).toBe(true);
    });

    it('debe eliminar bloques sin audios', () => {
      const erroresAudiosOriginales = [
        {
          toRetry: [
            { audioN: 1, attempt: 2, text: 'solo attempt 2' },
          ],
        },
        {
          toRetry: [
            { audioN: 2, attempt: 1, text: 'texto 2' },
          ],
        },
      ];

      const result = filterUniqueAudiosByAttempt(erroresAudiosOriginales);

      expect(result).toHaveLength(1);
      expect(result[0].audios).toHaveLength(1);
      expect(result[0].audios[0].audioN).toBe(2);
    });

    it('debe eliminar audioN duplicados', () => {
      const erroresAudiosOriginales = [
        {
          toRetry: [
            { audioN: 1, attempt: 1, text: 'texto 1 primera vez' },
            { audioN: 1, attempt: 1, text: 'texto 1 segunda vez' },
            { audioN: 2, attempt: 1, text: 'texto 2' },
          ],
        },
      ];

      const result = filterUniqueAudiosByAttempt(erroresAudiosOriginales);

      expect(result).toHaveLength(1);
      expect(result[0].audios).toHaveLength(2);
      expect(result[0].audios[0].audioN).toBe(1);
      expect(result[0].audios[1].audioN).toBe(2);
    });

    it('debe agregar bloqueIdx a cada bloque', () => {
      const erroresAudiosOriginales = [
        {
          toRetry: [{ audioN: 1, attempt: 1, text: 'texto 1' }],
        },
        {
          toRetry: [{ audioN: 2, attempt: 1, text: 'texto 2' }],
        },
      ];

      const result = filterUniqueAudiosByAttempt(erroresAudiosOriginales);

      expect(result).toHaveLength(2);
      expect(result[0].bloqueIdx).toBe(0);
      expect(result[1].bloqueIdx).toBe(1);
    });
  });
});

