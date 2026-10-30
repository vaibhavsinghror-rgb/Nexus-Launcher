import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { basename, join, resolve, normalize, isAbsolute } from 'path'
import type { ProjectType, ScannedProject } from '../../shared/ipc-types'
import { GitInspector } from './GitInspector'

export class ProjectScanner {
  /**
   * Normalizes a Windows filesystem path and validates against path traversal.
   */
  static normalizeWindowsPath(inputPath: string): string | null {
    if (!inputPath || typeof inputPath !== 'string') return null
    let clean = inputPath.trim()

    // Remove wrapping quotes if dragged/copied from Windows Explorer
    if (
      (clean.startsWith('"') && clean.endsWith('"')) ||
      (clean.startsWith("'") && clean.endsWith("'"))
    ) {
      clean = clean.slice(1, -1).trim()
    }

    try {
      const fullPath = resolve(normalize(clean))
      if (!existsSync(fullPath)) return null

      const stats = statSync(fullPath)
      if (!stats.isDirectory()) return null

      return fullPath
    } catch {
      return null
    }
  }

  /**
   * Resolves an isolated virtual environment interpreter in the project root.
   */
  static resolvePythonVenv(projectPath: string): string | null {
    const candidates = [
      join(projectPath, '.venv', 'Scripts', 'python.exe'),
      join(projectPath, 'venv', 'Scripts', 'python.exe'),
      join(projectPath, 'env', 'Scripts', 'python.exe'),
      // Also fallback for POSIX/WSL style if encountered
      join(projectPath, '.venv', 'bin', 'python'),
      join(projectPath, 'venv', 'bin', 'python')
    ]

    for (const cand of candidates) {
      if (existsSync(cand)) {
        return cand
      }
    }
    return null
  }

  /**
   * Inspects a directory to detect project tech stack, package manager,
   * framework, python venv, git branch, and suggested launch profiles.
   */
  static inspectDirectory(dirPath: string): ScannedProject | null {
    const fullPath = this.normalizeWindowsPath(dirPath)
    if (!fullPath) return null

    const name = basename(fullPath)
    let type: ProjectType = 'other'
    let framework: string | undefined = undefined
    let primaryLanguage = 'Unknown'
    let packageManager: ScannedProject['packageManager'] = 'none'
    let scripts: Record<string, string> = {}
    let suggestedPort: number | undefined = undefined
    const suggestedProfiles: NonNullable<ScannedProject['suggestedProfiles']> = []

    const packageJsonPath = join(fullPath, 'package.json')
    const cargoTomlPath = join(fullPath, 'Cargo.toml')
    const pyprojectPath = join(fullPath, 'pyproject.toml')
    const requirementsPath = join(fullPath, 'requirements.txt')
    const pipfilePath = join(fullPath, 'Pipfile')
    const goModPath = join(fullPath, 'go.mod')

    // 1. Python Environment Resolver
    const pythonVenv = this.resolvePythonVenv(fullPath)

    // 2. Node / Web Stack Detection
    if (existsSync(packageJsonPath)) {
      try {
        const raw = readFileSync(packageJsonPath, 'utf-8')
        const pkg = JSON.parse(raw)
        scripts = pkg.scripts || {}
        primaryLanguage = existsSync(join(fullPath, 'tsconfig.json')) ? 'TypeScript' : 'JavaScript'

        // Detect package manager
        if (existsSync(join(fullPath, 'pnpm-lock.yaml'))) {
          packageManager = 'pnpm'
        } else if (existsSync(join(fullPath, 'yarn.lock'))) {
          packageManager = 'yarn'
        } else if (existsSync(join(fullPath, 'bun.lockb')) || existsSync(join(fullPath, 'bun.lock'))) {
          packageManager = 'bun'
        } else {
          packageManager = 'npm'
        }

        const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }

        if (deps['next']) {
          type = 'nextjs'
          framework = 'Next.js'
          suggestedPort = 3000
        } else if (deps['vite']) {
          type = 'vite'
          framework = 'Vite'
          suggestedPort = 5173
        } else if (deps['@remix-run/react']) {
          type = 'react'
          framework = 'Remix'
          suggestedPort = 3000
        } else if (deps['react-scripts'] || deps['react']) {
          type = 'react'
          framework = 'React'
          suggestedPort = 3000
        } else if (deps['vue'] || deps['nuxt']) {
          type = 'nodejs'
          framework = deps['nuxt'] ? 'Nuxt' : 'Vue'
          suggestedPort = 3000
        } else if (deps['@nestjs/core']) {
          type = 'nodejs'
          framework = 'NestJS'
          suggestedPort = 3000
        } else if (deps['express']) {
          type = 'nodejs'
          framework = 'Express'
          suggestedPort = 3000
        } else if (deps['electron']) {
          type = 'nodejs'
          framework = 'Electron'
        } else {
          type = 'nodejs'
          framework = 'Node.js'
        }

        // Generate suggested launch profiles from scripts
        const pmCommand = `${packageManager}.cmd`
        if (scripts['dev']) {
          suggestedProfiles.push({
            name: 'Dev Server',
            command: pmCommand,
            args: ['run', 'dev'],
            isDefault: true,
            autoOpenPreview: Boolean(suggestedPort)
          })
        }
        if (scripts['start']) {
          suggestedProfiles.push({
            name: 'Production Start',
            command: pmCommand,
            args: ['run', 'start'],
            isDefault: !scripts['dev'],
            autoOpenPreview: Boolean(suggestedPort)
          })
        }
        if (scripts['build']) {
          suggestedProfiles.push({
            name: 'Build',
            command: pmCommand,
            args: ['run', 'build'],
            isDefault: false,
            autoOpenPreview: false
          })
        }
      } catch {
        type = 'nodejs'
        packageManager = 'npm'
        primaryLanguage = 'JavaScript'
      }
    }

    // 3. Python / AI / ML Detection
    if (existsSync(pyprojectPath) || existsSync(requirementsPath) || existsSync(pipfilePath) || pythonVenv) {
      if (type === 'other') {
        type = 'python'
        primaryLanguage = 'Python'
        packageManager = 'pip'

        let pyContent = ''
        if (existsSync(requirementsPath)) {
          pyContent += readFileSync(requirementsPath, 'utf-8').toLowerCase()
        }
        if (existsSync(pyprojectPath)) {
          pyContent += readFileSync(pyprojectPath, 'utf-8').toLowerCase()
        }

        if (pyContent.includes('fastapi') || existsSync(join(fullPath, 'app', 'main.py'))) {
          framework = 'FastAPI'
          suggestedPort = 8000
        } else if (pyContent.includes('flask')) {
          framework = 'Flask'
          suggestedPort = 5000
        } else if (pyContent.includes('django') || existsSync(join(fullPath, 'manage.py'))) {
          framework = 'Django'
          suggestedPort = 8000
        } else if (pyContent.includes('torch') || pyContent.includes('pytorch')) {
          framework = 'PyTorch AI/ML'
        } else if (pyContent.includes('tensorflow')) {
          framework = 'TensorFlow'
        } else if (pyContent.includes('streamlit')) {
          framework = 'Streamlit'
          suggestedPort = 8501
        } else {
          framework = 'Python'
        }

        const pyExec = pythonVenv || 'python.exe'

        if (framework === 'FastAPI') {
          suggestedProfiles.push({
            name: 'FastAPI Dev (uvicorn)',
            command: pyExec,
            args: ['-m', 'uvicorn', 'app.main:app', '--reload', '--port', '8000'],
            isDefault: true,
            autoOpenPreview: true
          })
        } else if (framework === 'Django') {
          suggestedProfiles.push({
            name: 'Django Runserver',
            command: pyExec,
            args: ['manage.py', 'runserver'],
            isDefault: true,
            autoOpenPreview: true
          })
        } else if (framework === 'Streamlit') {
          suggestedProfiles.push({
            name: 'Streamlit Run',
            command: pyExec,
            args: ['-m', 'streamlit', 'run', 'app.py'],
            isDefault: true,
            autoOpenPreview: true
          })
        } else {
          const entryPoint = existsSync(join(fullPath, 'main.py'))
            ? 'main.py'
            : existsSync(join(fullPath, 'app.py'))
            ? 'app.py'
            : 'run.py'

          suggestedProfiles.push({
            name: 'Python Run',
            command: pyExec,
            args: [entryPoint],
            isDefault: true,
            autoOpenPreview: false
          })
        }
      }
    }

    // 4. Rust / Cargo
    if (existsSync(cargoTomlPath)) {
      type = 'rust'
      framework = 'Cargo'
      primaryLanguage = 'Rust'
      packageManager = 'cargo'
      suggestedProfiles.push({
        name: 'Cargo Run',
        command: 'cargo',
        args: ['run'],
        isDefault: true,
        autoOpenPreview: false
      })
      suggestedProfiles.push({
        name: 'Cargo Build (Release)',
        command: 'cargo',
        args: ['build', '--release'],
        isDefault: false,
        autoOpenPreview: false
      })
    }

    // 5. Go Module
    if (existsSync(goModPath)) {
      type = 'go'
      framework = 'Go Module'
      primaryLanguage = 'Go'
      packageManager = 'none'
      suggestedProfiles.push({
        name: 'Go Run',
        command: 'go',
        args: ['run', '.'],
        isDefault: true,
        autoOpenPreview: false
      })
    }

    // Fallback: If no profiles generated yet
    if (suggestedProfiles.length === 0) {
      suggestedProfiles.push({
        name: 'Default Launch',
        command: 'cmd.exe',
        args: ['/c', 'dir'],
        isDefault: true,
        autoOpenPreview: false
      })
    }

    // Query Git Status
    const gitStatus = GitInspector.getStatus(fullPath)

    return {
      name,
      path: fullPath,
      type,
      framework,
      primaryLanguage,
      packageManager,
      pythonVenvPath: pythonVenv,
      scripts,
      suggestedPort,
      gitBranch: gitStatus.branch,
      isGitClean: gitStatus.isClean,
      dirtyFilesCount: gitStatus.dirtyCount,
      suggestedProfiles
    }
  }

  /**
   * Scans a parent directory for nested projects (one level).
   */
  static scanParentDirectory(parentPath: string): ScannedProject[] {
    const results: ScannedProject[] = []
    const fullParent = this.normalizeWindowsPath(parentPath)
    if (!fullParent) return results

    // Check if the parent folder itself is a project
    const selfProj = this.inspectDirectory(fullParent)
    if (selfProj && selfProj.type !== 'other') {
      results.push(selfProj)
      return results
    }

    try {
      const entries = readdirSync(fullParent, { withFileTypes: true })
      for (const entry of entries) {
        if (
          entry.isDirectory() &&
          !entry.name.startsWith('.') &&
          entry.name !== 'node_modules' &&
          entry.name !== 'venv' &&
          entry.name !== 'env' &&
          entry.name !== '__pycache__'
        ) {
          const subPath = join(fullParent, entry.name)
          const proj = this.inspectDirectory(subPath)
          if (proj && !results.some((r) => r.path === proj.path)) {
            results.push(proj)
          }
        }
      }
    } catch (err) {
      console.error('Scan parent error:', parentPath, err)
    }

    // If nothing found in subdirectories, return self
    if (results.length === 0 && selfProj) {
      results.push(selfProj)
    }

    return results
  }
}
