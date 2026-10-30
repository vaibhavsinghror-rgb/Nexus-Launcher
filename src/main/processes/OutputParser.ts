import type { ServerReadyEvent } from '../../shared/ipc-types'

export interface DetectedServer {
  url: string
  port: number
}

// Ordered list of regex patterns from most specific to generic
const PATTERNS: Array<{
  regex: RegExp
  extract: (match: RegExpMatchArray) => DetectedServer | null
}> = [
  // 1. Direct Localhost/127.0.0.1/0.0.0.0 URLs with protocol, port, and optional path
  {
    regex: /(https?):\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0):(\d{2,5})(\/[^\s"']*)?/i,
    extract: (match) => {
      const proto = match[1].toLowerCase()
      const port = parseInt(match[3], 10)
      const path = match[4] || '/'
      if (port > 0 && port < 65536) {
        return {
          port,
          url: `${proto}://localhost:${port}${path.startsWith('/') ? path : '/' + path}`
        }
      }
      return null
    }
  },

  // 2. Vite / Nuxt / Astro format: "Local:   http://localhost:5173/"
  {
    regex: /(?:Local|Network):\s+(https?:\/\/[^\s]+)/i,
    extract: (match) => {
      try {
        const parsed = new URL(match[1])
        const port = parseInt(parsed.port, 10)
        if (port > 0 && port < 65536) {
          const path = parsed.pathname || '/'
          return {
            port,
            url: `${parsed.protocol}//localhost:${port}${path}`
          }
        }
      } catch {
        // invalid URL
      }
      return null
    }
  },

  // 3. Uvicorn: "INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)"
  {
    regex: /Uvicorn running on\s+(https?:\/\/[^\s\)]+)/i,
    extract: (match) => {
      try {
        const parsed = new URL(match[1])
        const port = parseInt(parsed.port, 10)
        if (port > 0 && port < 65536) {
          return {
            port,
            url: `http://localhost:${port}/`
          }
        }
      } catch {}
      return null
    }
  },

  // 4. Flask / Werkzeug: " * Running on http://127.0.0.1:5000"
  {
    regex: /Running on\s+(https?:\/\/[^\s]+)/i,
    extract: (match) => {
      try {
        const parsed = new URL(match[1])
        const port = parseInt(parsed.port, 10)
        if (port > 0 && port < 65536) {
          return {
            port,
            url: `http://localhost:${port}/`
          }
        }
      } catch {}
      return null
    }
  },

  // 5. Django: "Starting development server at http://127.0.0.1:8000/"
  {
    regex: /Starting development server at\s+(https?:\/\/[^\s]+)/i,
    extract: (match) => {
      try {
        const parsed = new URL(match[1])
        const port = parseInt(parsed.port, 10)
        if (port > 0 && port < 65536) {
          return {
            port,
            url: `http://localhost:${port}/`
          }
        }
      } catch {}
      return null
    }
  },

  // 6. Generic "listening on [port] 3000" or "server running on port 8080"
  {
    regex: /(?:server|app|service|listening|running)\s+(?:is\s+)?(?:listening|running|started|ready)?\s+(?:at|on)?\s*(?:port\s*[:=]?\s*|:)(\d{2,5})/i,
    extract: (match) => {
      const port = parseInt(match[1], 10)
      if (port > 0 && port < 65536) {
        return {
          port,
          url: `http://localhost:${port}/`
        }
      }
      return null
    }
  },

  // 7. Generic "ready in 350ms (http://localhost:3000)"
  {
    regex: /ready in\s+\d+ms.*(?:http:\/\/localhost:(\d{2,5}))/i,
    extract: (match) => {
      const port = parseInt(match[1], 10)
      if (port > 0 && port < 65536) {
        return {
          port,
          url: `http://localhost:${port}/`
        }
      }
      return null
    }
  }
]

export class OutputParser {
  /**
   * Scans a line or text chunk from stdout/stderr for localhost server bindings.
   */
  static parseLine(text: string): DetectedServer | null {
    if (!text || typeof text !== 'string') return null

    // Strip ANSI escape codes first so formatting characters don't break regex matching
    const cleanText = text.replace(
      // eslint-disable-next-line no-control-regex
      /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
      ''
    )

    for (const { regex, extract } of PATTERNS) {
      const match = cleanText.match(regex)
      if (match) {
        const detected = extract(match)
        if (detected) {
          return detected
        }
      }
    }

    return null
  }
}
