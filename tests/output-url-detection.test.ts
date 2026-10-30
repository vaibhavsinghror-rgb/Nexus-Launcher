import { describe, it, expect } from 'vitest'
import { OutputParser } from '../src/main/processes/OutputParser'

describe('Output URL & Port Detection Tests', () => {
  it('detects Vite dev server output with ANSI codes', () => {
    const line = '  \x1b[32m➜\x1b[39m  \x1b[1mLocal\x1b[22m:   \x1b[36mhttp://localhost:\x1b[1m5173\x1b[22m/\x1b[39m'
    const result = OutputParser.parseLine(line)

    expect(result).not.toBeNull()
    expect(result?.port).toBe(5173)
    expect(result?.url).toBe('http://localhost:5173/')
  })

  it('detects FastAPI and Uvicorn server bindings', () => {
    const line = 'INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)'
    const result = OutputParser.parseLine(line)

    expect(result).not.toBeNull()
    expect(result?.port).toBe(8000)
    expect(result?.url).toBe('http://localhost:8000/')
  })

  it('detects Flask / Werkzeug output', () => {
    const line = ' * Running on http://127.0.0.1:5000'
    const result = OutputParser.parseLine(line)

    expect(result).not.toBeNull()
    expect(result?.port).toBe(5000)
    expect(result?.url).toBe('http://localhost:5000/')
  })

  it('detects Django development server', () => {
    const line = 'Starting development server at http://127.0.0.1:8000/'
    const result = OutputParser.parseLine(line)

    expect(result).not.toBeNull()
    expect(result?.port).toBe(8000)
    expect(result?.url).toBe('http://localhost:8000/')
  })

  it('detects Next.js local URL', () => {
    const line = '   - Local:        http://localhost:3000'
    const result = OutputParser.parseLine(line)

    expect(result).not.toBeNull()
    expect(result?.port).toBe(3000)
    expect(result?.url).toBe('http://localhost:3000/')
  })

  it('detects Express and NestJS listening on port banners', () => {
    const line = 'Server running on port 8080'
    const result = OutputParser.parseLine(line)

    expect(result).not.toBeNull()
    expect(result?.port).toBe(8080)
    expect(result?.url).toBe('http://localhost:8080/')
  })

  it('preserves Swagger /docs subpath when present in URL', () => {
    const line = 'Documentation live at http://localhost:8000/docs'
    const result = OutputParser.parseLine(line)

    expect(result).not.toBeNull()
    expect(result?.port).toBe(8000)
    expect(result?.url).toBe('http://localhost:8000/docs')
  })

  it('returns null for non-port logs', () => {
    expect(OutputParser.parseLine('Compiling TypeScript sources...')).toBeNull()
    expect(OutputParser.parseLine('Database query completed in 42ms')).toBeNull()
    expect(OutputParser.parseLine('')).toBeNull()
  })
})
