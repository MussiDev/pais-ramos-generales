import type { Fair } from './types';

export const DEFAULT_FAIR_DATE = '[DD/MM]';
export const DEFAULT_FAIR_HOURS = '[HORARIO]';

/** Builds a fair record, defaulting unconfirmed date and hours to placeholders. */
export function createFair(fair: Pick<Fair, 'name' | 'place'> & Partial<Fair>): Fair {
  return { date: DEFAULT_FAIR_DATE, hours: DEFAULT_FAIR_HOURS, ...fair };
}

/** Evidence for the sources below: docs/content-sources.md. */
export const nextFair: Fair = createFair({
  name: 'Feria de emprendedores Don Bosco', // source: instagram
  place: 'Don Bosco, Funes', // source: instagram
  // date and hours — source: pending
});
