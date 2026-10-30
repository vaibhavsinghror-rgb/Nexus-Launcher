import os from 'os'
import { exec } from 'child_process'
import type { SystemTelemetry, GpuTelemetry } from '../../shared/ipc-types'

let previousCpuTimes = getCpuTimes()
let cachedGpuName: string | null = null
let hasCheckedGpuName = false

function getCpuTimes() {
  const cpus = os.cpus()
  let idle = 0
  let total = 0
  for (const cpu of cpus) {
    for (const type in cpu.times) {
      total += (cpu.times as any)[type]
    }
    idle += cpu.times.idle
  }
  return { idle, total }
}

async function queryNvidiaGpu(): Promise<GpuTelemetry> {
  return new Promise((resolve) => {
    // Exact command specified in SPEC:
    // nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits
    exec(
      'nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits',
      { timeout: 2000 },
      (err, stdout) => {
        if (err || !stdout) {
          return resolve({
            hasNvidiaGpu: false,
            gpuName: null,
            gpuUtilization: null,
            vramUsedMb: null,
            vramTotalMb: null,
            vramPercent: null
          })
        }

        try {
          const firstLine = stdout.trim().split(/\r?\n/)[0]
          if (!firstLine) throw new Error('Empty output')

          const parts = firstLine.split(',').map((s) => s.trim())
          if (parts.length < 3) throw new Error('Invalid CSV columns')

          const gpuUtilization = parseFloat(parts[0]) || 0
          const vramUsedMb = parseFloat(parts[1]) || 0
          const vramTotalMb = parseFloat(parts[2]) || 0
          const vramPercent = vramTotalMb > 0 ? Math.round((vramUsedMb / vramTotalMb) * 100) : 0

          // Fetch GPU name once if not cached
          if (!hasCheckedGpuName) {
            hasCheckedGpuName = true
            exec('nvidia-smi --query-gpu=name --format=csv,noheader', { timeout: 2000 }, (_, nameOut) => {
              if (nameOut) cachedGpuName = nameOut.trim().split(/\r?\n/)[0]
            })
          }

          resolve({
            hasNvidiaGpu: true,
            gpuName: cachedGpuName,
            gpuUtilization: Math.max(0, Math.min(100, Math.round(gpuUtilization))),
            vramUsedMb: Math.round(vramUsedMb),
            vramTotalMb: Math.round(vramTotalMb),
            vramPercent
          })
        } catch {
          resolve({
            hasNvidiaGpu: false,
            gpuName: null,
            gpuUtilization: null,
            vramUsedMb: null,
            vramTotalMb: null,
            vramPercent: null
          })
        }
      }
    )
  })
}

export class TelemetryService {
  static async getTelemetry(): Promise<SystemTelemetry> {
    const currentTimes = getCpuTimes()
    const idleDelta = currentTimes.idle - previousCpuTimes.idle
    const totalDelta = currentTimes.total - previousCpuTimes.total
    previousCpuTimes = currentTimes

    let cpuUsagePercent = 0
    if (totalDelta > 0) {
      cpuUsagePercent = Math.round((1 - idleDelta / totalDelta) * 100)
    }

    const cpus = os.cpus()
    const cpuModel = cpus[0]?.model || 'Processor'

    const totalBytes = os.totalmem()
    const freeBytes = os.freemem()
    const usedBytes = totalBytes - freeBytes
    const ramUsagePercent = Math.round((usedBytes / totalBytes) * 100)
    const usedGb = parseFloat((usedBytes / (1024 * 1024 * 1024)).toFixed(1))
    const totalGb = parseFloat((totalBytes / (1024 * 1024 * 1024)).toFixed(1))

    const gpu = await queryNvidiaGpu()

    return {
      timestamp: Date.now(),
      cpu: {
        usagePercent: Math.max(0, Math.min(100, cpuUsagePercent)),
        cores: cpus.length,
        model: cpuModel
      },
      ram: {
        usedBytes,
        totalBytes,
        freeBytes,
        usagePercent: ramUsagePercent,
        usedGb,
        totalGb
      },
      gpu,
      os: {
        platform: os.platform(),
        release: os.release(),
        uptimeSeconds: os.uptime(),
        arch: os.arch()
      }
    }
  }
}
