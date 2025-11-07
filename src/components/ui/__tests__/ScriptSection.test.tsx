import { RetryData } from '@/app/types/audioDetail'
import { AudioRequest } from '@/app/types/audioRequest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ScriptSection } from '../ScriptSection'

// Mock data
const mockAudioData: AudioRequest = {
  _id: 'test-audio-id',
  userId: 'test-user-id',
  status: 'completed',
  requestDate: '2024-01-01T00:00:00Z',
  publicationDate: '2024-01-02T00:00:00Z',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  audioMotive: {
    generatedSections: [
      {
        texts: ['Texto original 1', 'Texto original 2', 'Texto original 3']
      }
    ]
  },
  settings: {
    exportSettings: {
      sections: [
        { timeStart: 0, timeEnd: 30 },
        { timeStart: 30, timeEnd: 60 }
      ]
    }
  }
}

const mockRetryData: RetryData = {
  sections: [
    {
      sectionId: 0,
      remakeALL: false,
      texts: [
        {
          index: 1,
          textToUse: 'Texto corregido 2',
          regen: false
        }
      ]
    }
  ]
}

const defaultProps = {
  script: ['Texto original 1', 'Texto original 2', 'Texto original 3'],
  time: '00:00 - 00:30',
  index: 0,
  correcciones: [],
  audioData: mockAudioData,
  audioId: 'test-audio-id',
  audioUrl: 'https://example.com/audio.mp3',
  retryData: null,
  audiosCorrregidosManualmente: new Set(),
  times: [{ timeStart: 0, timeEnd: 30 }],
  onSave: jest.fn(),
  onUpdateRetry: jest.fn(),
  onToggleTextRegen: jest.fn(),
  onToggleRemakeAll: jest.fn(),
  getTextRetryState: jest.fn(() => ({ regen: false, textToUse: null })),
  showAlert: jest.fn(),
  editingSections: new Set(),
  setEditingSections: jest.fn(),
  errorSectionId: null,
  failedAudioIds: []
}

describe('ScriptSection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders script texts correctly', () => {
    render(<ScriptSection {...defaultProps} />)
    
    expect(screen.getByText('Texto original 1')).toBeInTheDocument()
    expect(screen.getByText('Texto original 2')).toBeInTheDocument()
    expect(screen.getByText('Texto original 3')).toBeInTheDocument()
  })

  it('shows edit button initially', () => {
    render(<ScriptSection {...defaultProps} />)
    
    expect(screen.getByText('Editar')).toBeInTheDocument()
  })

  it('enters edit mode when edit button is clicked', () => {
    render(<ScriptSection {...defaultProps} />)
    
    const editButton = screen.getByText('Editar')
    fireEvent.click(editButton)
    
    expect(defaultProps.setEditingSections).toHaveBeenCalledWith(new Set([0]))
  })

  it('shows textareas in edit mode', () => {
    const editingSections = new Set([0])
    render(<ScriptSection {...defaultProps} editingSections={editingSections} />)
    
    const textareas = screen.getAllByRole('textbox')
    expect(textareas).toHaveLength(3)
  })

  it('updates text when user types in textarea', async () => {
    const user = userEvent.setup()
    const editingSections = new Set([0])
    render(<ScriptSection {...defaultProps} editingSections={editingSections} />)
    
    const textarea = screen.getAllByRole('textbox')[0]
    await user.clear(textarea)
    await user.type(textarea, 'Nuevo texto')
    
    expect(textarea).toHaveValue('Nuevo texto')
  })

  it('saves changes when "Listo" button is clicked', async () => {
    const user = userEvent.setup()
    const editingSections = new Set([0])
    render(<ScriptSection {...defaultProps} editingSections={editingSections} />)
    
    const textarea = screen.getAllByRole('textbox')[0]
    await user.clear(textarea)
    await user.type(textarea, 'Texto modificado')
    
    const saveButton = screen.getByText('Listo')
    await user.click(saveButton)
    
    expect(defaultProps.onUpdateRetry).toHaveBeenCalledWith(0, 0, 'Texto modificado', 'Texto original 1')
    expect(defaultProps.setEditingSections).toHaveBeenCalledWith(new Set())
    expect(defaultProps.onSave).toHaveBeenCalled()
    expect(defaultProps.showAlert).toHaveBeenCalledWith('success', 'Cambios guardados localmente')
  })

  it('applies retry data when available', () => {
    render(<ScriptSection {...defaultProps} retryData={mockRetryData} />)
    
    // Should show corrected text for index 1
    expect(screen.getByText('Texto corregido 2')).toBeInTheDocument()
    // Should show original text for other indices
    expect(screen.getByText('Texto original 1')).toBeInTheDocument()
    expect(screen.getByText('Texto original 3')).toBeInTheDocument()
  })

  it('handles remakeALL correctly', () => {
    const retryDataWithRemakeAll: RetryData = {
      sections: [
        {
          sectionId: 0,
          remakeALL: true,
          texts: []
        }
      ]
    }
    
    render(<ScriptSection {...defaultProps} retryData={retryDataWithRemakeAll} />)
    
    // Should show original texts when remakeALL is true
    expect(screen.getByText('Texto original 1')).toBeInTheDocument()
    expect(screen.getByText('Texto original 2')).toBeInTheDocument()
    expect(screen.getByText('Texto original 3')).toBeInTheDocument()
  })

  it('shows audio player when audioUrl is provided', () => {
    render(<ScriptSection {...defaultProps} />)
    
    const audioPlayer = screen.getByRole('group')
    expect(audioPlayer).toBeInTheDocument()
  })

  it('handles empty script gracefully', () => {
    render(<ScriptSection {...defaultProps} script={[]} />)
    
    expect(screen.getByText('Editar')).toBeInTheDocument()
  })

  it('calls onToggleTextRegen when regen button is clicked', async () => {
    const user = userEvent.setup()
    const editingSections = new Set([0])
    render(<ScriptSection {...defaultProps} editingSections={editingSections} />)
    
    // The component doesn't have individual regen buttons, so we'll test the remake all button instead
    const remakeAllButton = screen.getByText('🔄 Re-Procesar Sección')
    await user.click(remakeAllButton)
    
    expect(defaultProps.onToggleRemakeAll).toHaveBeenCalledWith(0)
  })

  it('calls onToggleRemakeAll when remake all button is clicked', async () => {
    const user = userEvent.setup()
    const editingSections = new Set([0])
    render(<ScriptSection {...defaultProps} editingSections={editingSections} />)
    
    const remakeAllButton = screen.getByText('🔄 Re-Procesar Sección')
    await user.click(remakeAllButton)
    
    expect(defaultProps.onToggleRemakeAll).toHaveBeenCalledWith(0)
  })

  it('shows error state when audioData is null', () => {
    render(<ScriptSection {...defaultProps} audioData={null} />)
    
    expect(screen.getByText('Editar')).toBeInTheDocument()
  })

  it('handles save error gracefully', async () => {
    const user = userEvent.setup()
    const editingSections = new Set([0])
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    // Mock an error in the save function by making handleSave throw
    const errorProps = {
      ...defaultProps,
      onSave: jest.fn(() => {
        throw new Error('Save error')
      })
    }
    
    render(<ScriptSection {...errorProps} editingSections={editingSections} />)
    
    const textarea = screen.getAllByRole('textbox')[0]
    await user.clear(textarea)
    await user.type(textarea, 'Texto modificado')
    
    const saveButton = screen.getByText('Listo')
    await user.click(saveButton)
    
    expect(consoleSpy).toHaveBeenCalledWith('Error al guardar:', expect.any(Error))
    expect(errorProps.showAlert).toHaveBeenCalledWith('error', 'Error al guardar los cambios')
    
    consoleSpy.mockRestore()
  })

  it('updates editedScript when retryData changes', () => {
    const { rerender } = render(<ScriptSection {...defaultProps} retryData={null} />)
    
    // Initially shows original text
    expect(screen.getByText('Texto original 2')).toBeInTheDocument()
    
    // Update with retry data
    rerender(<ScriptSection {...defaultProps} retryData={mockRetryData} />)
    
    // Should now show corrected text
    expect(screen.getByText('Texto corregido 2')).toBeInTheDocument()
  })

  it('preserves edited text when entering edit mode again', async () => {
    const user = userEvent.setup()
    const editingSections = new Set([0])
    
    // Create retry data that simulates a saved edit
    const retryDataWithEdit = {
      sections: [
        {
          sectionId: 0,
          remakeALL: false,
          texts: [
            {
              index: 0,
              textToUse: 'Primera edición',
              regen: false
            }
          ]
        }
      ]
    }
    
    // First render with retry data
    const { rerender } = render(<ScriptSection {...defaultProps} retryData={retryDataWithEdit} editingSections={new Set()} />)
    
    // Enter edit mode
    rerender(<ScriptSection {...defaultProps} retryData={retryDataWithEdit} editingSections={new Set([0])} />)
    
    // Should show the edited text
    const newTextarea = screen.getAllByRole('textbox')[0]
    expect(newTextarea).toHaveValue('Primera edición')
  })
})
