import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useParams() {
    return {
      id: 'test-audio-id',
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/audio/test-audio-id'
  },
}))

// Mock Next.js dynamic imports
jest.mock('next/dynamic', () => () => {
  const DynamicComponent = () => null
  DynamicComponent.displayName = 'LoadableComponent'
  DynamicComponent.preload = jest.fn()
  return DynamicComponent
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
})

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock fetch para evitar llamadas HTTP reales durante tests
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers({
      'content-type': 'application/json',
    }),
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
)

// Mock fetchWithTokenRefresh si existe
if (typeof global.fetchWithTokenRefresh === 'undefined') {
  global.fetchWithTokenRefresh = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({
        'content-type': 'application/json',
      }),
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
    })
  )
}

// Mock de servicios HTTP para evitar llamadas reales
jest.mock('@/app/_services/audioRequestService', () => ({
  getAudioRequestById: jest.fn(() => Promise.resolve({})),
  reprocessAudioRequestV2: jest.fn(() => Promise.resolve({})),
  searchAudioRequests: jest.fn(() => Promise.resolve([])),
  acceleratePublication: jest.fn(() => Promise.resolve({})),
  getAudioRequestsByUserId: jest.fn(() => Promise.resolve([])),
}))

jest.mock('@/app/_services/audioService', () => ({
  getAudiosByRequestId: jest.fn(() => Promise.resolve([])),
}))

jest.mock('@/app/_services/mmgUserService', () => ({
  findOne: jest.fn(() => Promise.resolve({})),
}))

jest.mock('@/app/_services/connectionService', () => ({
  Connection: jest.fn().mockImplementation(() => ({
    get: jest.fn(() => Promise.resolve({ data: {}, status: 200, ok: true })),
    post: jest.fn(() => Promise.resolve({ data: {}, status: 200, ok: true })),
    put: jest.fn(() => Promise.resolve({ data: {}, status: 200, ok: true })),
    delete: jest.fn(() => Promise.resolve({ data: {}, status: 200, ok: true })),
  })),
}))

jest.mock('@/app/_services/tokenService', () => ({
  refreshAccessToken: jest.fn(() => Promise.resolve('mock-token')),
  fetchWithTokenRefresh: jest.fn(() => Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })),
  getValidToken: jest.fn(() => Promise.resolve('mock-token')),
}))

// Mock console methods to reduce noise in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})
