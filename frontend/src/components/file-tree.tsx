import { useState } from 'react'
import { ChevronRight, FileCode2, Folder, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FileNode } from '@/types'

interface FileTreeProps {
  nodes: FileNode[]
  onSelect?: (node: FileNode) => void
}

export function FileTree({ nodes, onSelect }: FileTreeProps) {
  return (
    <div className="space-y-0.5 text-xs">
      {nodes.map((node) => <TreeNode key={node.path} node={node} onSelect={onSelect} />)}
    </div>
  )
}

function TreeNode({ node, onSelect }: { node: FileNode; onSelect?: (node: FileNode) => void }) {
  const [open, setOpen] = useState(node.name === 'pkg' || node.name === 'src')
  const hasChildren = Boolean(node.children?.length)

  return (
    <div>
      <button
        type="button"
        onClick={() => (node.isDir && hasChildren ? setOpen((value) => !value) : onSelect?.(node))}
        className={cn(
          'group flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-muted-foreground transition-colors hover:bg-[var(--mn-surface-muted)] hover:text-foreground',
          node.isDir && 'text-foreground/80',
        )}
      >
        {node.isDir ? (
          <ChevronRight className={cn('size-3.5 transition-transform', open && 'rotate-90 text-primary')} />
        ) : <span className="size-3.5" />}
        {node.isDir ? (
          open ? <FolderOpen className="size-3.5 text-amber-600 dark:text-amber-200/80" /> : <Folder className="size-3.5 text-amber-600/80 dark:text-amber-200/70" />
        ) : <FileCode2 className="size-3.5 text-cyan-700/80 dark:text-cyan-200/70" />}
        <span className="truncate">{node.name}</span>
      </button>
      {node.isDir && open && hasChildren && (
        <div className="ml-3 border-l border-[var(--mn-line)] pl-2 animate-in fade-in-0 slide-in-from-top-1 duration-200">
          <FileTree nodes={node.children ?? []} onSelect={onSelect} />
        </div>
      )}
    </div>
  )
}
