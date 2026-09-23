/**
 * Hook que controla el editor contenteditable y su historial de deshacer.
 *
 * Diseño del historial (manual, no el nativo del navegador):
 *  - Cada acción discreta (comando de barra, insertar tabla/imagen/enlace)
 *    registra una foto del HTML ANTES de ejecutarse.
 *  - La escritura continua se agrupa en "ráfagas": cada ráfaga registra una
 *    sola foto (la del estado antes del primer carácter). Así Ctrl+Z deshace
 *    un párrafo entero, no carácter a carácter.
 *  - "lastPushHtml" recuerda el último estado registrado para no duplicar.
 *  - Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y se interceptan y usan nuestra pila.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { execFormat, queryFormatState, queryFormatValue } from './editorCommands'

const MAX_HISTORY = 120

export interface EditorToolbarState {
  bold: boolean
  italic: boolean
  underline: boolean
  strike: boolean
  orderedList: boolean
  unorderedList: boolean
  blockquote: boolean
  code: boolean
  align: 'left' | 'center' | 'right' | 'justify'
  block: string
}

const DEFAULT_TOOLBAR: EditorToolbarState = {
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  orderedList: false,
  unorderedList: false,
  blockquote: false,
  code: false,
  align: 'left',
  block: 'p',
}

type Align = EditorToolbarState['align']

const EDIT_KEYS = new Set([
  'Backspace', 'Delete', 'Enter', ' ', 'Tab',
])

const isPrintableKey = (key: string): boolean => key.length === 1

const isEditingKey = (key: string): boolean => isPrintableKey(key) || EDIT_KEYS.has(key)

interface UseDocumentEditorOptions {
  onHtmlChange: (html: string) => void
}

export function useDocumentEditor(initialHtml: string, { onHtmlChange }: UseDocumentEditorOptions) {
  const editorRef = useRef<HTMLDivElement>(null)
  const currentHtmlRef = useRef(initialHtml)
  const lastPushHtmlRef = useRef<string | null>(null)
  const undoStackRef = useRef<string[]>([])
  const redoStackRef = useRef<string[]>([])
  const onChangeRef = useRef(onHtmlChange)
  onChangeRef.current = onHtmlChange

  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [toolbar, setToolbar] = useState<EditorToolbarState>(DEFAULT_TOOLBAR)

  const syncHtml = useCallback((html: string) => {
    currentHtmlRef.current = html
    onChangeRef.current(html)
  }, [])

  const refreshFlags = useCallback(() => {
    setCanUndo(undoStackRef.current.length > 0)
    setCanRedo(redoStackRef.current.length > 0)
  }, [])

  /** Registra la foto actual si aún no lo está (coalesce ráfagas de escritura). */
  const pushCheckpoint = useCallback((force = false) => {
    if (!force && lastPushHtmlRef.current === currentHtmlRef.current) return
    undoStackRef.current.push(currentHtmlRef.current)
    if (undoStackRef.current.length > MAX_HISTORY) undoStackRef.current.shift()
    lastPushHtmlRef.current = currentHtmlRef.current
    redoStackRef.current = []
    refreshFlags()
  }, [refreshFlags])

  /** Pinta el HTML en el editor sin pasar por onChange (undo/redo/load). */
  const renderHtml = useCallback((html: string) => {
    const el = editorRef.current
    if (el) el.innerHTML = html
    currentHtmlRef.current = html
    lastPushHtmlRef.current = html
  }, [])

  /** Guarda/restaura la selección, útil antes de enfocar para comandos. */
  const withSelection = useCallback(<T,>(fn: () => T): T => {
    const sel = document.getSelection()
    const saved = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null
    const result = fn()
    if (saved && sel) {
      sel.removeAllRanges()
      sel.addRange(saved)
    }
    return result
  }, [])

  /** Aplica una operación al editor registrando el estado previo en el historial. */
  const applyOperation = useCallback(
    (op: () => void) => {
      const el = editorRef.current
      if (!el) return
      withSelection(() => {
        pushCheckpoint()
      })
      el.focus()
      op()
      const html = el.innerHTML
      syncHtml(html)
      refreshActiveState()
    },
    [withSelection, pushCheckpoint, syncHtml, refreshActiveState],
  )

  const exec = useCallback(
    (command: string, value?: string) => {
      applyOperation(() => execFormat(command, value))
    },
    [applyOperation],
  )

  const undo = useCallback(() => {
    if (undoStackRef.current.length === 0) return
    redoStackRef.current.push(currentHtmlRef.current)
    currentHtmlRef.current = undoStackRef.current.pop() as string
    renderHtml(currentHtmlRef.current)
    syncHtml(currentHtmlRef.current)
    refreshFlags()
  }, [renderHtml, syncHtml, refreshFlags])

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return
    undoStackRef.current.push(currentHtmlRef.current)
    currentHtmlRef.current = redoStackRef.current.pop() as string
    renderHtml(currentHtmlRef.current)
    syncHtml(currentHtmlRef.current)
    refreshFlags()
  }, [renderHtml, syncHtml, refreshFlags])

  const refreshActiveState = useCallback(() => {
    if (!document.activeElement || !editorRef.current?.contains(document.activeElement)) return
    const next: EditorToolbarState = {
      bold: queryFormatState('bold'),
      italic: queryFormatState('italic'),
      underline: queryFormatState('underline'),
      strike: queryFormatState('strikeThrough'),
      orderedList: queryFormatState('insertOrderedList'),
      unorderedList: queryFormatState('insertUnorderedList'),
      blockquote: false,
      code: false,
      align: 'left',
      block: queryFormatValue('formatBlock') || 'p',
    }
    if (next.block === 'blockquote') next.blockquote = true
    if (next.block === 'pre') next.code = true
    if (queryFormatState('justifyLeft')) next.align = 'left'
    else if (queryFormatState('justifyCenter')) next.align = 'center'
    else if (queryFormatState('justifyRight')) next.align = 'right'
    else if (queryFormatState('justifyFull')) next.align = 'justify'

    setToolbar((prev) => {
      const changed = (Object.keys(next) as (keyof EditorToolbarState)[]).some(
        (k) => prev[k] !== next[k],
      )
      return changed ? next : prev
    })
  }, [])

  const insertImage = useCallback(
    (file: File) => {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        applyOperation(() => execFormat('insertImage', dataUrl))
      }
      reader.readAsDataURL(file)
    },
    [applyOperation],
  )

  const insertTable = useCallback(
    (rows: number, cols: number) => {
      applyOperation(() => {
        execFormat('insertHTML', buildTableHtml(rows, cols))
      })
    },
    [applyOperation],
  )

  const insertLink = useCallback(
    (url: string) => {
      applyOperation(() => execFormat('createLink', url))
    },
    [applyOperation],
  )

  const setBlock = useCallback(
    (block: string) => applyOperation(() => execFormat('formatBlock', block)),
    [applyOperation],
  )

  const setColor = useCallback(
    (color: string) => applyOperation(() => execFormat('foreColor', color)),
    [applyOperation],
  )

  const setHighlight = useCallback(
    (color: string) => applyOperation(() => execFormat('hiliteColor', color)),
    [applyOperation],
  )

  const setAlign = useCallback(
    (align: Align) => {
      const cmd =
        align === 'left' ? 'justifyLeft' : align === 'center' ? 'justifyCenter' : align === 'right' ? 'justifyRight' : 'justifyFull'
      applyOperation(() => execFormat(cmd))
    },
    [applyOperation],
  )

  const toggleList = useCallback(
    (ordered: boolean) => applyOperation(() => execFormat(ordered ? 'insertOrderedList' : 'insertUnorderedList')),
    [applyOperation],
  )

  const clearFormatting = useCallback(() => applyOperation(() => execFormat('removeFormat')), [applyOperation])

  // Inicial: pintar el HTML inicial y enganchar los listeners globales.
  useEffect(() => {
    const el = editorRef.current
    if (el) {
      el.innerHTML = initialHtml
      currentHtmlRef.current = initialHtml
      lastPushHtmlRef.current = null
    }
    document.addEventListener('selectionchange', refreshActiveState)
    return () => document.removeEventListener('selectionchange', refreshActiveState)
  }, [initialHtml, refreshActiveState])

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (mod && (e.key === 'z' || e.key === 'Z' || e.key === 'y')) {
        e.preventDefault()
        if (e.shiftKey || e.key === 'y') redo()
        else undo()
        return
      }
      if (!mod && !e.altKey && isEditingKey(e.key)) {
        pushCheckpoint()
      }
    },
    [pushCheckpoint, undo, redo],
  )

  const onInput = useCallback(
    (e: React.FormEvent<HTMLDivElement>) => {
      const html = (e.currentTarget as HTMLDivElement).innerHTML
      syncHtml(html)
    },
    [syncHtml],
  )

  return {
    editorRef,
    exec,
    undo,
    redo,
    canUndo,
    canRedo,
    toolbar,
    insertImage,
    insertTable,
    insertLink,
    setBlock,
    setColor,
    setHighlight,
    setAlign,
    toggleList,
    clearFormatting,
    onKeyDown,
    onInput,
  }
}

function buildTableHtml(rows: number, cols: number): string {
  const head = `<tr>${Array.from({ length: cols }, () => '<th></th>').join('')}</tr>`
  const body = Array.from(
    { length: rows },
    () => `<tr>${Array.from({ length: cols }, () => '<td></td>').join('')}</tr>`,
  ).join('')
  return `<table><thead>${head}</thead><tbody>${body}</tbody></table><p><br></p>`
}