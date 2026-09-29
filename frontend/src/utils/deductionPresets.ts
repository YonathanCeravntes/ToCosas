import { WorkProfile } from '../api/types';

/**
 * FIN-051 · Deducciones típicas en Colombia según "¿De qué vives?" (Fundador, 2026-09-29):
 * Millo las sugiere para que nadie tenga que saberse los porcentajes. Son una
 * propuesta que la persona confirma con un toque; después las puede borrar o cambiar.
 */
export interface DeductionPreset {
  kind: 'salud' | 'pension';
  name: string;
  percent: number;
  /** Parte del ingreso sobre la que se calcula (1 = total; 0,4 = el 40% de independientes). */
  baseShare: number;
  withheldAtSource: boolean;
}

export interface ProfilePresets {
  /** "Como empleado, normalmente…" */
  intro: string;
  items: DeductionPreset[];
  note?: string;
}

const INDEPENDENT: ProfilePresets = {
  intro: 'Como independiente, pagas tú la seguridad social sobre el 40% de lo que recibes',
  items: [
    { kind: 'salud', name: 'Salud', percent: 12.5, baseShare: 0.4, withheldAtSource: false },
    { kind: 'pension', name: 'Pensión', percent: 16, baseShare: 0.4, withheldAtSource: false },
  ],
  note: 'Millo las aparta cada mes como un compromiso, igual que un gasto fijo.',
};

export const PROFILE_PRESETS: Partial<Record<WorkProfile, ProfilePresets>> = {
  empleado: {
    intro: 'Como empleado, normalmente te descuentan de la nómina',
    items: [
      { kind: 'salud', name: 'Salud', percent: 4, baseShare: 1, withheldAtSource: true },
      { kind: 'pension', name: 'Pensión', percent: 4, baseShare: 1, withheldAtSource: true },
    ],
    note: 'Si ganas más de 4 salarios mínimos, suma 1% o más al fondo de solidaridad.',
  },
  independiente: INDEPENDENT,
  empresario: {
    ...INDEPENDENT,
    intro: 'Si no estás en nómina de tu empresa, pagas tú la seguridad social sobre el 40% de lo que recibes',
  },
  pensionado: {
    intro: 'Como pensionado, normalmente te descuentan de la mesada',
    items: [{ kind: 'salud', name: 'Salud', percent: 12, baseShare: 1, withheldAtSource: true }],
    note: 'Con mesadas bajas el porcentaje puede ser menor: ajústalo si tu desprendible dice otra cosa.',
  },
};

/** "Salud 4% · Pensión 4%" */
export const presetSummary = (p: ProfilePresets) =>
  p.items.map((i) => `${i.name} ${String(i.percent).replace('.', ',')}%`).join(' · ');
