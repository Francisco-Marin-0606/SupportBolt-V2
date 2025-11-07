import { RetryData } from '@/app/types/audioDetail'
import { act, renderHook } from '@testing-library/react'
import { useRetryLogic } from '../useRetryLogic'

describe('useRetryLogic', () => {
  const mockSetRetryData = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('initializes with empty retry data', () => {
    const { result } = renderHook(() => useRetryLogic(null, mockSetRetryData))

    expect(result.current).toBeDefined()
    expect(typeof result.current.updateRetryStructure).toBe('function')
    expect(typeof result.current.toggleTextRegen).toBe('function')
    expect(typeof result.current.toggleRemakeAll).toBe('function')
    expect(typeof result.current.getTextRetryState).toBe('function')
  })

  it('updates retry structure with new text', () => {
    const { result } = renderHook(() => useRetryLogic(null, mockSetRetryData))

    act(() => {
      result.current.updateRetryStructure(0, 1, 'Nuevo texto', 'Texto original')
    })

    expect(mockSetRetryData).toHaveBeenCalledWith({
      sections: [
        {
          sectionId: 0,
          remakeALL: false,
          texts: [
            {
              index: 1,
              textToUse: 'Nuevo texto',
              regen: false
            }
          ]
        }
      ]
    })
  })

  it('updates existing section when section already exists', () => {
    const existingRetryData: RetryData = {
      sections: [
        {
          sectionId: 0,
          remakeALL: false,
          texts: [
            {
              index: 0,
              textToUse: 'Texto existente',
              regen: false
            }
          ]
        }
      ]
    }

    const { result } = renderHook(() => useRetryLogic(existingRetryData, mockSetRetryData))

    act(() => {
      result.current.updateRetryStructure(0, 1, 'Nuevo texto', 'Texto original')
    })

    expect(mockSetRetryData).toHaveBeenCalledWith({
      sections: [
        {
          sectionId: 0,
          remakeALL: false,
          texts: [
            {
              index: 0,
              textToUse: 'Texto existente',
              regen: false
            },
            {
              index: 1,
              textToUse: 'Nuevo texto',
              regen: false
            }
          ]
        }
      ]
    })
  })

  it('updates existing text when text already exists', () => {
    const existingRetryData: RetryData = {
      sections: [
        {
          sectionId: 0,
          remakeALL: false,
          texts: [
            {
              index: 1,
              textToUse: 'Texto anterior',
              regen: false
            }
          ]
        }
      ]
    }

    const { result } = renderHook(() => useRetryLogic(existingRetryData, mockSetRetryData))

    act(() => {
      result.current.updateRetryStructure(0, 1, 'Texto actualizado', 'Texto anterior')
    })

    expect(mockSetRetryData).toHaveBeenCalledWith({
      sections: [
        {
          sectionId: 0,
          remakeALL: false,
          texts: [
            {
              index: 1,
              textToUse: 'Texto actualizado',
              regen: false
            }
          ]
        }
      ]
    })
  })

  it('does not update when text is the same', () => {
    const { result } = renderHook(() => useRetryLogic(null, mockSetRetryData))

    act(() => {
      result.current.updateRetryStructure(0, 1, 'Mismo texto', 'Mismo texto')
    })

    expect(mockSetRetryData).not.toHaveBeenCalled()
  })

  it('toggles text regen correctly', () => {
    const existingRetryData: RetryData = {
      sections: [
        {
          sectionId: 0,
          remakeALL: false,
          texts: [
            {
              index: 1,
              textToUse: 'Texto existente',
              regen: false
            }
          ]
        }
      ]
    }

    const { result } = renderHook(() => useRetryLogic(existingRetryData, mockSetRetryData))

    act(() => {
      result.current.toggleTextRegen(0, 1)
    })

    expect(mockSetRetryData).toHaveBeenCalledWith({
      sections: [
        {
          sectionId: 0,
          remakeALL: false,
          texts: [
            {
              index: 1,
              textToUse: null,
              regen: true
            }
          ]
        }
      ]
    })
  })

  it('toggles remake all correctly', () => {
    const existingRetryData: RetryData = {
      sections: [
        {
          sectionId: 0,
          remakeALL: false,
          texts: [
            {
              index: 1,
              textToUse: 'Texto existente',
              regen: false
            }
          ]
        }
      ]
    }

    const { result } = renderHook(() => useRetryLogic(existingRetryData, mockSetRetryData))

    act(() => {
      result.current.toggleRemakeAll(0)
    })

    expect(mockSetRetryData).toHaveBeenCalledWith({
      sections: [
        {
          sectionId: 0,
          remakeALL: true,
          texts: []
        }
      ]
    })
  })

  it('toggles remake all from true to false', () => {
    const existingRetryData: RetryData = {
      sections: [
        {
          sectionId: 0,
          remakeALL: true,
          texts: []
        }
      ]
    }

    const { result } = renderHook(() => useRetryLogic(existingRetryData, mockSetRetryData))

    act(() => {
      result.current.toggleRemakeAll(0)
    })

    expect(mockSetRetryData).toHaveBeenCalledWith({
      sections: [
        {
          sectionId: 0,
          remakeALL: false,
          texts: []
        }
      ]
    })
  })

  it('gets text retry state correctly', () => {
    const existingRetryData: RetryData = {
      sections: [
        {
          sectionId: 0,
          remakeALL: false,
          texts: [
            {
              index: 1,
              textToUse: 'Texto personalizado',
              regen: false
            }
          ]
        }
      ]
    }

    const { result } = renderHook(() => useRetryLogic(existingRetryData, mockSetRetryData))

    const state = result.current.getTextRetryState(0, 1)
    expect(state).toEqual({
      index: 1,
      textToUse: 'Texto personalizado',
      regen: false
    })
  })

  it('returns default state for non-existent text', () => {
    const { result } = renderHook(() => useRetryLogic(null, mockSetRetryData))

    const state = result.current.getTextRetryState(0, 1)
    expect(state).toBeNull()
  })

  it('handles multiple sections correctly', () => {
    const { result } = renderHook(() => useRetryLogic(null, mockSetRetryData))

    act(() => {
      result.current.updateRetryStructure(0, 1, 'Texto sección 0', 'Original')
    })

    act(() => {
      result.current.updateRetryStructure(1, 2, 'Texto sección 1', 'Original')
    })

    // Check that both calls were made
    expect(mockSetRetryData).toHaveBeenCalledTimes(2)
    
    // Check the second call (last one)
    expect(mockSetRetryData).toHaveBeenNthCalledWith(2, {
      sections: [
        {
          sectionId: 1,
          remakeALL: false,
          texts: [
            {
              index: 2,
              textToUse: 'Texto sección 1',
              regen: false
            }
          ]
        }
      ]
    })
  })

  it('prevents editing individual text when remakeALL is active', () => {
    const existingRetryData: RetryData = {
      sections: [
        {
          sectionId: 0,
          remakeALL: true,
          texts: []
        }
      ]
    }

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const { result } = renderHook(() => useRetryLogic(existingRetryData, mockSetRetryData))

    act(() => {
      result.current.updateRetryStructure(0, 1, 'Nuevo texto', 'Original')
    })

    expect(consoleSpy).toHaveBeenCalledWith('❌ No se puede editar texto individual cuando remakeALL está activo')
    expect(mockSetRetryData).not.toHaveBeenCalled()

    consoleSpy.mockRestore()
  })

  it('removes text from retry when called', () => {
    const existingRetryData: RetryData = {
      sections: [
        {
          sectionId: 0,
          remakeALL: false,
          texts: [
            {
              index: 1,
              textToUse: 'Texto personalizado',
              regen: false
            },
            {
              index: 2,
              textToUse: 'Otro texto',
              regen: false
            }
          ]
        }
      ]
    }

    const { result } = renderHook(() => useRetryLogic(existingRetryData, mockSetRetryData))

    act(() => {
      result.current.removeFromRetry(0, 1)
    })

    expect(mockSetRetryData).toHaveBeenCalledWith({
      sections: [
        {
          sectionId: 0,
          remakeALL: false,
          texts: [
            {
              index: 2,
              textToUse: 'Otro texto',
              regen: false
            }
          ]
        }
      ]
    })
  })

  it('removes entire section when no texts remain', () => {
    const existingRetryData: RetryData = {
      sections: [
        {
          sectionId: 0,
          remakeALL: false,
          texts: [
            {
              index: 1,
              textToUse: 'Texto único',
              regen: false
            }
          ]
        }
      ]
    }

    const { result } = renderHook(() => useRetryLogic(existingRetryData, mockSetRetryData))

    act(() => {
      result.current.removeFromRetry(0, 1)
    })

    expect(mockSetRetryData).toHaveBeenCalledWith({ sections: [] })
  })

  it('does nothing when section does not exist', () => {
    const { result } = renderHook(() => useRetryLogic(null, mockSetRetryData))

    act(() => {
      result.current.removeFromRetry(0, 1)
    })

    expect(mockSetRetryData).not.toHaveBeenCalled()
  })
})
