import { createServer } from 'net'
import { exec } from 'child_process'
import type { ListeningPortInfo } from '../../shared/ipc-types'
import { ProcessManager } from '../processes/ProcessManager'

export class PortManager {
  /**
   * Checks whether a port is currently listening / occupied.
   */
  static isPortFree(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = createServer()
      server.unref()
      server.on('error', () => {
        resolve(false)
      })
      server.listen(port, '127.0.0.1', () => {
        server.close(() => {
          resolve(true)
        })
      })
    })
  }

  /**
   * Discovers which PID is occupying a port on Windows.
   */
  static getProcessHoldingPort(port: number): Promise<{ inUse: boolean; pid?: number; processName?: string }> {
    return new Promise((resolve) => {
      this.isPortFree(port).then((free) => {
        if (free) {
          return resolve({ inUse: false })
        }

        exec(`netstat -ano -p tcp | findstr :${port}`, (err, stdout) => {
          if (err || !stdout) {
            return resolve({ inUse: true })
          }

          const lines = stdout.trim().split(/\r?\n/)
          for (const line of lines) {
            const parts = line.trim().split(/\s+/)
            // Format: TCP    127.0.0.1:5173    0.0.0.0:0    LISTENING    12345
            if (parts.length >= 5 && parts[3] === 'LISTENING') {
              const pid = parseInt(parts[4], 10)
              if (!isNaN(pid) && pid > 0) {
                exec(`tasklist /fi "PID eq ${pid}" /fo csv /nh`, (_, taskOut) => {
                  let processName: string | undefined = undefined
                  if (taskOut) {
                    const match = taskOut.match(/^"([^"]+)"/)
                    if (match) processName = match[1]
                  }
                  return resolve({ inUse: true, pid, processName })
                })
                return
              }
            }
          }

          resolve({ inUse: true })
        })
      })
    })
  }

  /**
   * Utility service that parses all active LISTENING TCP sockets on Windows,
   * maps PIDs to process names, and matches against registered Nexus processes.
   */
  static getAllListeningPorts(): Promise<ListeningPortInfo[]> {
    return new Promise((resolve) => {
      exec('netstat -ano -p tcp', { maxBuffer: 1024 * 1024 * 5 }, (err, netstatOut) => {
        if (err || !netstatOut) {
          return resolve([])
        }

        // Get running process map from Nexus ProcessManager
        const runningNexusProcs = ProcessManager.getInstance().getRunning()
        const pidToNexusMap = new Map<number, { name: string; id: string }>()
        for (const p of runningNexusProcs) {
          if (p.pid) {
            pidToNexusMap.set(p.pid, { name: p.projectName, id: p.projectId })
          }
        }

        // Parse netstat
        const lines = netstatOut.split(/\r?\n/)
        const portMap = new Map<number, { pid: number; protocol: string }>()

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.includes('LISTENING')) continue

          const parts = trimmed.split(/\s+/)
          if (parts.length >= 5 && parts[3] === 'LISTENING') {
            const localAddress = parts[1]
            const pid = parseInt(parts[4], 10)
            if (isNaN(pid) || pid <= 0) continue

            const colonIndex = localAddress.lastIndexOf(':')
            if (colonIndex !== -1) {
              const port = parseInt(localAddress.slice(colonIndex + 1), 10)
              if (!isNaN(port) && port > 0 && port < 65536) {
                if (!portMap.has(port)) {
                  portMap.set(port, { pid, protocol: parts[0] })
                }
              }
            }
          }
        }

        if (portMap.size === 0) {
          return resolve([])
        }

        // Fetch tasklist to map PIDs to process names in bulk
        exec('tasklist /fo csv /nh', { maxBuffer: 1024 * 1024 * 5 }, (_, tasklistOut) => {
          const pidToName = new Map<number, string>()
          if (tasklistOut) {
            const taskLines = tasklistOut.split(/\r?\n/)
            for (const tl of taskLines) {
              const match = tl.match(/^"([^"]+)","(\d+)"/)
              if (match) {
                const name = match[1]
                const pid = parseInt(match[2], 10)
                pidToName.set(pid, name)
              }
            }
          }

          const results: ListeningPortInfo[] = []
          for (const [port, { pid, protocol }] of portMap.entries()) {
            const processName = pidToName.get(pid) || `PID ${pid}`
            const matchedNexus = pidToNexusMap.get(pid)

            results.push({
              port,
              pid,
              protocol,
              processName,
              matchedProjectName: matchedNexus?.name,
              matchedProjectId: matchedNexus?.id
            })
          }

          // Sort by port number ascending
          results.sort((a, b) => a.port - b.port)
          resolve(results)
        })
      })
    })
  }

  /**
   * Forcefully kills a Windows process by PID using taskkill /pid <PID> /T /F.
   */
  static killPid(pid: number): Promise<boolean> {
    return new Promise((resolve) => {
      if (!pid || pid <= 0) return resolve(false)
      exec(`taskkill /pid ${pid} /T /F`, (err) => {
        resolve(!err)
      })
    })
  }

  /**
   * Kills any Windows process holding a specified port.
   */
  static async killPort(port: number): Promise<boolean> {
    const info = await this.getProcessHoldingPort(port)
    if (info.inUse && info.pid) {
      return this.killPid(info.pid)
    }
    return false
  }
}
