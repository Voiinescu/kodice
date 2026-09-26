/**
 * Tests del historial de deshacer/rehacer de la hoja de cálculo.
 * El reducer de historial es puro, así que se prueba sin DOM.
 */

import { describe, expect, it } from 'vitest'
import { createEmptySpreadsheet } from '../defaults'
import { initSheetHistory, sheetHistoryReducer, SHEET_HISTORY_LIMIT, type SheetState } from './reducer'

function freshState(): SheetState {
  const file = createEmptySpreadsheet()
  return { file: { ...file, type: 'spreadsheet', id: 's-test', name: 'Test', createdAt: 0, updatedAt: 0 }, rowOrder: null, filter: null }
}

describe('sheetHistoryReducer', () => {
  it('registra snapshots al editar celdas y permite deshacer/rehacer', () => {
    const initial = freshState()
    let h = initSheetHistory(initial)

    h = sheetHistoryReducer(h, { type: 'setCell', row: 0, col: 0, raw: '42' })
    h = sheetHistoryReducer(h, { type: 'setCell', row: 0, col: 1, raw: '7' })
    expect(h.present.file.cells.A1.raw).toBe('42')
    expect(h.present.file.cells.B1.raw).toBe('7')
    expect(h.past.length).toBe(2)

    // Deshacer: vuelve al estado anterior al segundo cambio.
    h = sheetHistoryReducer(h, { type: 'undo' })
    expect(h.present.file.cells.B1).toBeUndefined()
    expect(h.present.file.cells.A1.raw).toBe('42')
    expect(h.future.length).toBe(1)

    // Rehacer: restaura el segundo cambio.
    h = sheetHistoryReducer(h, { type: 'redo' })
    expect(h.present.file.cells.B1.raw).toBe('7')
    expect(h.future.length).toBe(0)
  })

  it('deshace también el recálculo de fórmulas dependientes', () => {
    const initial = freshState()
    let h = initSheetHistory(initial)

    h = sheetHistoryReducer(h, { type: 'setCell', row: 0, col: 0, raw: '10' })
    h = sheetHistoryReducer(h, { type: 'setCell', row: 0, col: 1, raw: '=A1*2' })

    expect(h.present.file.cells.B1.value).toEqual({ ok: true, value: 20 })

    h = sheetHistoryReducer(h, { type: 'undo' })
    expect(h.present.file.cells.B1).toBeUndefined()
  })

  it('un cambio nuevo tras deshacer vacía la pila de rehacer', () => {
    const initial = freshState()
    let h = initSheetHistory(initial)

    h = sheetHistoryReducer(h, { type: 'setCell', row: 0, col: 0, raw: '1' })
    h = sheetHistoryReducer(h, { type: 'setCell', row: 0, col: 1, raw: '2' })
    h = sheetHistoryReducer(h, { type: 'undo' })
    expect(h.future.length).toBe(1)

    h = sheetHistoryReducer(h, { type: 'setCell', row: 0, col: 2, raw: '3' })
    expect(h.future.length).toBe(0)

    // Rehacer ya no tiene nada que hacer.
    h = sheetHistoryReducer(h, { type: 'redo' })
    expect(h.present.file.cells.C1.raw).toBe('3')
  })

  it('acciones sin efecto real (escritura idéntica) no generan snapshots', () => {
    const initial = freshState()
    let h = initSheetHistory(initial)

    h = sheetHistoryReducer(h, { type: 'setCell', row: 0, col: 0, raw: '5' })
    const pastBefore = h.past.length

    h = sheetHistoryReducer(h, { type: 'setCell', row: 0, col: 0, raw: '5' })
    expect(h.past.length).toBe(pastBefore)
  })

  it('acciones excluidas (renombrar, ancho de columna) no entran en el historial', () => {
    const initial = freshState()
    let h = initSheetHistory(initial)

    h = sheetHistoryReducer(h, { type: 'setCell', row: 0, col: 0, raw: '1' })
    h = sheetHistoryReducer(h, { type: 'rename', name: 'Otro nombre' })
    h = sheetHistoryReducer(h, { type: 'setColWidth', col: 2, width: 120 })

    expect(h.past.length).toBe(1)
    expect(h.present.file.name).toBe('Otro nombre')
    expect(h.present.file.colWidths[2]).toBe(120)
  })

  it('limita el tamaño del historial', () => {
    const initial = freshState()
    let h = initSheetHistory(initial)

    for (let i = 0; i < SHEET_HISTORY_LIMIT + 20; i++) {
      h = sheetHistoryReducer(h, { type: 'setCell', row: 0, col: 0, raw: String(i) })
    }
    expect(h.past.length).toBe(SHEET_HISTORY_LIMIT)

    // Deshacer repetido agota la pila sin errores.
    for (let i = 0; i < SHEET_HISTORY_LIMIT + 20; i++) {
      h = sheetHistoryReducer(h, { type: 'undo' })
    }
    expect(h.past.length).toBe(0)
  })
})