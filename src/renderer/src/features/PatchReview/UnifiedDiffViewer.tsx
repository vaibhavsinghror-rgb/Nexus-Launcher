import React from 'react'

interface UnifiedDiffViewerProps {
  diff: string
}

export const UnifiedDiffViewer: React.FC<UnifiedDiffViewerProps> = ({ diff }) => {
  if (!diff) {
    return (
      <div className="p-4 text-xs font-mono text-slate-500 text-center">
        No changes detected.
      </div>
    )
  }

  const lines = diff.split('\n')

  let origLineNum = 0
  let patchLineNum = 0

  return (
    <div className="font-mono text-xs select-text overflow-x-auto bg-obsidian-950 rounded-xl border border-slate-800/80 p-2">
      <table className="w-full border-collapse">
        <tbody>
          {lines.map((line, idx) => {
            const isHunkHeader = line.startsWith('@@')
            const isFileHeader = line.startsWith('---') || line.startsWith('+++')
            const isAdd = line.startsWith('+') && !isFileHeader
            const isDel = line.startsWith('-') && !isFileHeader

            if (isHunkHeader) {
              const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/)
              if (match) {
                origLineNum = parseInt(match[1], 10) - 1
                patchLineNum = parseInt(match[2], 10) - 1
              }
            } else if (isAdd) {
              patchLineNum++
            } else if (isDel) {
              origLineNum++
            } else if (!isFileHeader) {
              origLineNum++
              patchLineNum++
            }

            return (
              <tr
                key={idx}
                className={`transition-colors leading-relaxed ${
                  isAdd
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : isDel
                    ? 'bg-rose-500/15 text-rose-300'
                    : isHunkHeader
                    ? 'bg-indigo-500/10 text-indigo-400 font-bold'
                    : isFileHeader
                    ? 'bg-slate-800/50 text-slate-400 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/30'
                }`}
              >
                {/* Left Line Number (Original) */}
                <td className="w-10 px-2 py-0.5 text-right select-none text-[11px] text-slate-600 border-r border-slate-800/60">
                  {!isHunkHeader && !isFileHeader && !isAdd ? origLineNum : ''}
                </td>

                {/* Right Line Number (Patched) */}
                <td className="w-10 px-2 py-0.5 text-right select-none text-[11px] text-slate-600 border-r border-slate-800/60">
                  {!isHunkHeader && !isFileHeader && !isDel ? patchLineNum : ''}
                </td>

                {/* Diff Indicator (+, -, @@, or space) */}
                <td className="w-5 px-1 py-0.5 text-center select-none font-bold">
                  {isAdd ? '+' : isDel ? '-' : isHunkHeader ? '@@' : ' '}
                </td>

                {/* Line Code Content */}
                <td className="px-2 py-0.5 whitespace-pre font-mono break-all">
                  {line.startsWith('+') || line.startsWith('-') ? line.substring(1) : line}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
