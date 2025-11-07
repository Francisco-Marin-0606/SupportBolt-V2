import {
    acceleratePublication,
    getAudioRequestById,
    getAudioRequestsByUserId,
    reprocessAudioRequestV2,
    updateAudioRequestStatus,
} from '../audioRequestService';

// Mock del servicio de conexión
jest.mock('../connectionService', () => {
  const mockGet = jest.fn();
  const mockPost = jest.fn();
  const mockPatch = jest.fn();
  const mockDelete = jest.fn();

  return {
    Connection: jest.fn().mockImplementation(() => ({
      get: mockGet,
      post: mockPost,
      patch: mockPatch,
      delete: mockDelete,
    })),
    __getMockGet: () => mockGet,
    __getMockPost: () => mockPost,
    __getMockPatch: () => mockPatch,
    __getMockDelete: () => mockDelete,
  };
});

describe('audioRequestService', () => {
  let mockGet: jest.Mock;
  let mockPost: jest.Mock;
  let mockPatch: jest.Mock;
  let mockDelete: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const connectionModule = require('../connectionService');
    mockGet = connectionModule.__getMockGet();
    mockPost = connectionModule.__getMockPost();
    mockPatch = connectionModule.__getMockPatch();
    mockDelete = connectionModule.__getMockDelete();
  });

  describe('getAudioRequestById', () => {
    it('debe obtener un audio request por ID exitosamente', async () => {
      const mockAudioRequest = {
        _id: 'test-id',
        userId: 'user-123',
        email: 'test@test.com',
        status: 'completed' as const,
        requestDate: '2024-01-15',
        membershipDate: '2024-01-01',
        audioMotive: null,
      };

      mockGet.mockResolvedValue({
        ok: true,
        data: mockAudioRequest,
        status: 200,
      });

      const result = await getAudioRequestById('test-id');

      expect(result).toEqual(mockAudioRequest);
      expect(mockGet).toHaveBeenCalledWith('mmg-audio-requests/test-id');
    });

    it('debe lanzar error si la respuesta no es ok', async () => {
      mockGet.mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(getAudioRequestById('invalid-id')).rejects.toThrow();
    });
  });

  describe('getAudioRequestsByUserId', () => {
    it('debe obtener audio requests por userId', async () => {
      const mockAudioRequests = [
        {
          _id: 'audio-1',
          userId: 'user-123',
          email: 'test@test.com',
          status: 'completed' as const,
          requestDate: '2024-01-15',
          membershipDate: '2024-01-01',
          audioMotive: null,
        },
      ];

      mockGet.mockResolvedValue({
        ok: true,
        data: mockAudioRequests,
        status: 200,
      });

      const result = await getAudioRequestsByUserId('user-123');

      expect(result).toEqual(mockAudioRequests);
      expect(mockGet).toHaveBeenCalledWith('mmg-audio-requests/user/user-123');
    });
  });

  describe('acceleratePublication', () => {
    it('debe acelerar la publicación exitosamente', async () => {
      const mockResponse = {
        message: 'Publicación acelerada',
        audioRequest: {
          _id: 'test-id',
          requestDate: '2024-01-15',
          publicationDate: '2024-01-16',
        },
      };

      mockPost.mockResolvedValue({
        ok: true,
        data: mockResponse,
        status: 200,
      });

      const result = await acceleratePublication('test-id');

      expect(result).toEqual(mockResponse);
      expect(mockPost).toHaveBeenCalledWith(
        'mmg-audio-requests/accelerate-publication-date-new-era/test-id',
        {}
      );
    });

    it('debe lanzar error si falla la aceleración', async () => {
      mockPost.mockResolvedValue({
        ok: false,
        status: 400,
      });

      await expect(acceleratePublication('test-id')).rejects.toThrow(
        'Error al acelerar la publicación'
      );
    });
  });

  describe('reprocessAudioRequestV2', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('debe reprocesar un audio request exitosamente', async () => {
      const mockPayload = {
        task: 'test-task-id',
        retry: {
          sections: [
            {
              sectionId: 1,
              remakeALL: false,
              texts: [
                { index: 0, textToUse: 'texto actualizado', regen: false },
              ],
            },
          ],
        },
        fromScript: true,
      };

      const mockResponse = { success: true };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        headers: {
          get: (key: string) => (key === 'content-type' ? 'application/json' : ''),
        },
        json: async () => mockResponse,
      });

      const result = await reprocessAudioRequestV2(mockPayload);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/tasks/retry?priority=false',
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'accept': 'application/json',
          },
          body: JSON.stringify(mockPayload),
        })
      );
    });

    it('debe manejar respuestas de texto plano', async () => {
      const mockPayload = {
        task: 'test-task-id',
        retry: null,
        fromScript: false,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        headers: {
          get: (key: string) => (key === 'content-type' ? 'text/plain' : ''),
        },
        text: async () => 'Success',
      });

      const result = await reprocessAudioRequestV2(mockPayload);

      expect(result).toBe('Success');
    });

    it('debe lanzar error si la respuesta no es ok', async () => {
      const mockPayload = {
        task: 'test-task-id',
        retry: null,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Error del servidor',
      });

      await expect(reprocessAudioRequestV2(mockPayload)).rejects.toThrow(
        'HTTP error! status: 500'
      );
    });
  });

  describe('updateAudioRequestStatus', () => {
    it('debe actualizar el estado exitosamente', async () => {
      const mockUpdatedRequest = {
        _id: 'test-id',
        userId: 'user-123',
        email: 'test@test.com',
        status: 'completed' as const,
        requestDate: '2024-01-15',
        membershipDate: '2024-01-01',
        audioMotive: null,
      };

      mockPatch.mockResolvedValue({
        ok: true,
        data: mockUpdatedRequest,
        status: 200,
      });

      const result = await updateAudioRequestStatus('test-id', 'completed');

      expect(result).toEqual(mockUpdatedRequest);
      expect(mockPatch).toHaveBeenCalledWith(
        'mmg-audio-requests/test-id/status',
        { status: 'completed' }
      );
    });
  });
});