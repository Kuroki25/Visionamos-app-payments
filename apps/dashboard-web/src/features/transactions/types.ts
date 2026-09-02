import type { Tone } from '../../lib/tone';

/** View model for one `TxTable` row — decoupled from the `Transaction` API DTO on purpose (`DASHBOARD_FRONTEND_SOURCE_OF_TRUTH.md`, "Tipos y contratos": "API DTO ≠ View Model"). */
export interface TxRow {
  id: string;
  fecha: string;
  metodo: string;
  monto: string;
  estadoLabel: string;
  estadoTone: Tone;
}
