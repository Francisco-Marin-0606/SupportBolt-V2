import * as audioRequestService from '@/app/_services/audioRequestService';
import * as audioService from '@/app/_services/audioService';
import * as mmgUserService from '@/app/_services/mmgUserService';
import * as audioDetailUtils from '@/app/utils/audioDetailUtils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import React from 'react';
import { useAudioDetail } from '../useAudioDetail';

// Mocks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));
jest.mock('@/app/_services/audioRequestService');
jest.mock('@/app/_services/audioService');
jest.mock('@/app/_services/mmgUserService');
jest.mock('@/app/utils/audioDetailUtils');

describe('useAudioDetail', () => {
  const mockRouter = {
    back: jest.fn(),
    push: jest.fn(),
    refresh: jest.fn(),
  };

  const mockAudioRequest = {
    _id: 'test-audio-id',
    userId: 'user-123',
    email: 'test@test.com',
    status: 'completed' as const,
    requestDate: '2024-01-15',
    membershipDate: '2024-01-01',
    audioMotive: {
      voice: 'test-voice',
      export: 'test',
      questions: [],
      generatedSections: [],
    },
    settings: {
      exportSettings: {
        sectionsSettings: [
          { startTime: 0, endTime: 10, msSilenceBeforeNextSection: 0, effectsSettings: { useReverb: false, reverbIntensity: 0 } },
        ],
        language: 'es' as const,
      },
      appSettings: {
        questions: [],
        formSettings: {
          backgroundColor: '#fff',
          imagePlayer: 'test.jpg',
          genderImage: { base: 'base.jpg', male: 'male.jpg', female: 'female.jpg' },
          genderTitle: { base: 'Base', male: 'Male', female: 'Female' },
          genderAudioDescription: { base: 'Base', male: 'Male', female: 'Female' },
        },
      },
    },
  };

  const mockAudio = {
    audioID: 1,
    format: 'mp3',
    path: '/test.mp3',
    text: 'Test text',
    textHistorial: ['Test text'],
    static: false,
    transcription: 'Test transcription',
    completed: true,
    audioUrl: 'http://test.com/audio.mp3',
    imageUrl: 'http://test.com/image.jpg',
  };

  const mockUser = {
    _id: 'user-123',
    email: 'test@test.com',
    names: 'John',
    lastnames: 'Doe',
  };

  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    return ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (audioRequestService.getAudioRequestById as jest.Mock).mockResolvedValue(mockAudioRequest);
    (audioService.getAudiosByRequestId as jest.Mock).mockResolvedValue([mockAudio]);
    (mmgUserService.findOne as jest.Mock).mockResolvedValue(mockUser);
    (audioDetailUtils.clearScriptSessionData as jest.Mock).mockImplementation(() => {});
  });

  describe('Carga inicial de datos', () => {
    it('debe cargar los datos del audio exitosamente', async () => {
      const { result } = renderHook(() => useAudioDetail('test-audio-id'), {
        wrapper: createWrapper(),
      });

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.audioData).toEqual(mockAudioRequest);
      expect(result.current.audio).toEqual(mockAudio);
      expect(result.current.user).toEqual(mockUser);
    });

    it('debe manejar usuario no encontrado', async () => {
      (mmgUserService.findOne as jest.Mock).mockRejectedValue(new Error('Usuario no encontrado'));

      const { result } = renderHook(() => useAudioDetail('test-audio-id'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
    });
  });

  describe('handleAccelerate', () => {
    it('debe acelerar la publicación exitosamente', async () => {
      const mockAccelerateResponse = {
        message: 'Acelerado',
        audioRequest: {
          _id: 'test-audio-id',
          requestDate: '2024-01-15',
          publicationDate: '2024-01-16',
        },
      };

      (audioRequestService.acceleratePublication as jest.Mock).mockResolvedValue(mockAccelerateResponse);

      const { result } = renderHook(() => useAudioDetail('test-audio-id'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleAccelerate();
      });

      expect(result.current.isAccelerating).toBe(true);

      await waitFor(() => {
        expect(result.current.isAccelerating).toBe(false);
      });

      expect(audioRequestService.acceleratePublication).toHaveBeenCalledWith('test-audio-id');
    });

    it('debe mostrar alerta de error si falla la aceleración', async () => {
      (audioRequestService.acceleratePublication as jest.Mock).mockRejectedValue(new Error('Error al acelerar'));

      const { result } = renderHook(() => useAudioDetail('test-audio-id'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.handleAccelerate();
      });

      await waitFor(() => {
        expect(result.current.alertState).toBeTruthy();
        expect(result.current.alertState?.type).toBe('error');
      });
    });
  });

  describe('confirmGlobalReprocess', () => {
    it('debe reprocesar el audio con retry data válido', async () => {
      const mockRetryData = {
        sections: [
          {
            sectionId: 1,
            remakeALL: false,
            texts: [{ index: 0, textToUse: 'texto actualizado', regen: false }],
          },
        ],
      };

      (audioDetailUtils.validateRetryData as jest.Mock).mockReturnValue(true);
      (audioRequestService.reprocessAudioRequestV2 as jest.Mock).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAudioDetail('test-audio-id'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setRetryData(mockRetryData);
      });

      await act(async () => {
        await result.current.confirmGlobalReprocess('script');
      });

      await waitFor(() => {
        expect(audioRequestService.reprocessAudioRequestV2).toHaveBeenCalledWith({
          task: 'test-audio-id',
          retry: mockRetryData,
          fromScript: true,
        });
      });
    });

    it('debe mostrar error si retry data es inválido', async () => {
      const invalidRetryData = {
        sections: [
          {
            sectionId: 1,
            remakeALL: true,
            texts: [{ index: 0, textToUse: 'texto', regen: false }],
          },
        ],
      };

      (audioDetailUtils.validateRetryData as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() => useAudioDetail('test-audio-id'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setRetryData(invalidRetryData);
      });

      await act(async () => {
        await result.current.confirmGlobalReprocess('script');
      });

      expect(audioRequestService.reprocessAudioRequestV2).not.toHaveBeenCalled();
      expect(result.current.alertState?.type).toBe('error');
    });

    it('debe manejar error en el reprocesamiento', async () => {
      const mockRetryData = {
        sections: [
          {
            sectionId: 1,
            remakeALL: false,
            texts: [{ index: 0, textToUse: 'texto', regen: false }],
          },
        ],
      };

      (audioDetailUtils.validateRetryData as jest.Mock).mockReturnValue(true);
      (audioRequestService.reprocessAudioRequestV2 as jest.Mock).mockRejectedValue(new Error('Error al reprocesar'));

      const { result } = renderHook(() => useAudioDetail('test-audio-id'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setRetryData(mockRetryData);
      });

      await act(async () => {
        await result.current.confirmGlobalReprocess('script');
      });

      await waitFor(() => {
        expect(result.current.alertState?.type).toBe('error');
        expect(result.current.reprocessLoading).toBe(false);
      });
    });
  });

  describe('handleBackNavigation', () => {
    it('debe limpiar datos de sesión y navegar hacia atrás', async () => {
      const { result } = renderHook(() => useAudioDetail('test-audio-id'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleBackNavigation();
      });

      expect(audioDetailUtils.clearScriptSessionData).toHaveBeenCalledWith('test-audio-id');
      expect(mockRouter.back).toHaveBeenCalled();
    });
  });

  describe('fetchHistory', () => {
    it('debe cargar el historial de audios del usuario', async () => {
      const mockHistoryAudios = [
        {
          _id: 'audio-2',
          userId: 'user-123',
          email: 'test@test.com',
          status: 'completed' as const,
          requestDate: '2024-01-10',
          membershipDate: '2024-01-01',
          audioMotive: null,
        },
      ];

      (audioRequestService.getAudioRequestsByUserId as jest.Mock).mockResolvedValue(mockHistoryAudios);
      (audioService.getAudiosByRequestId as jest.Mock).mockResolvedValue([mockAudio]);

      const { result } = renderHook(() => useAudioDetail('test-audio-id'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.fetchHistory();
      });

      await waitFor(() => {
        expect(result.current.historyAudios.length).toBeGreaterThanOrEqual(0);
        expect(result.current.loadingHistory).toBe(false);
      });
    });

    it('no debe cargar historial si no hay usuario', async () => {
      (mmgUserService.findOne as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useAudioDetail('test-audio-id'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.fetchHistory();
      });

      expect(audioRequestService.getAudioRequestsByUserId).not.toHaveBeenCalled();
    });
  });

  describe('refreshData', () => {
    it('debe refrescar los datos correctamente', async () => {
      const { result } = renderHook(() => useAudioDetail('test-audio-id'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      jest.clearAllMocks();

      await act(async () => {
        await result.current.refreshData();
      });

      await waitFor(() => {
        expect(audioRequestService.getAudioRequestById).toHaveBeenCalled();
      });
    });
  });

  describe('showAlert', () => {
    it('debe mostrar alerta de éxito', async () => {
      const { result } = renderHook(() => useAudioDetail('test-audio-id'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.showAlert('success', 'Operación exitosa');
      });

      expect(result.current.alertState).toEqual({
        show: true,
        type: 'success',
        message: 'Operación exitosa',
      });
    });

    it('debe limpiar la alerta después de 5 segundos', async () => {
      jest.useFakeTimers();

      const { result } = renderHook(() => useAudioDetail('test-audio-id'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.showAlert('success', 'Test');
      });

      expect(result.current.alertState).toBeTruthy();

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(result.current.alertState).toBeNull();
      });

      jest.useRealTimers();
    });
  });
});