/**
 * Province landscapes for El recorrido, drawn from reference photos of each place: Salta's
 * Quebrada castles, Jujuy's Cerro de los Siete Colores, a Litoral capybara, the Obelisco and
 * Bariloche's snowy peaks. Flat layers whose colors derive from the panel (`.terrain__*`).
 *
 * Each scene has a wide ground strip for the bottom of the panel and a landmark figure, rendered
 * by `Terrain.astro`. Paths are generated here at build time; nothing ships as JavaScript.
 */
import type { Terrain } from '../content/types';

export type Layer = 'back' | 'mid' | 'band' | 'front' | 'snow' | 'frost';
export type Layers = Array<{ layer: Layer; d: string }>;
export interface Scene {
  ground: Layers;
  /**
   * The province's figure. `perch` puts it on the featured card's top edge instead of the panel
   * corner: a small figure that would otherwise hide behind the card (the capybara).
   */
  landmark: { viewBox: string; layers: Layers; perch?: boolean };
}

export const W = 1600;
export const H = 360;

/** Rounded bushes or grass along a baseline, deterministic (no randomness between builds). */
function bushes(top: number, size: number, from = 0, to = W, base = H): string {
  let d = `M${from} ${base} L${from} ${top}`;
  let x = from;
  let index = 0;
  while (x < to) {
    const width = size * (0.7 + ((index * 37) % 10) / 16);
    const lift = size * (0.35 + ((index * 53) % 10) / 22);
    const next = Math.min(to, x + width);
    d += ` Q${Math.round((x + next) / 2)} ${Math.round(top - lift)} ${Math.round(next)} ${top}`;
    x = next;
    index += 1;
  }
  return `${d} L${to} ${base} Z`;
}

/** A Lombardy poplar: tall, narrow, pointed. */
function poplar(x: number, height: number, width: number, base: number): string {
  const top = base - height;
  const half = width / 2;
  return (
    `M${x - half * 0.8} ${base} C${x - half * 1.1} ${base - height * 0.35} ${x - half * 0.7} ${top + height * 0.25} ${x} ${top}` +
    ` C${x + half * 0.7} ${top + height * 0.25} ${x + half * 1.1} ${base - height * 0.35} ${x + half * 0.8} ${base} Z`
  );
}

/** A three-tier pine, and the snow on each tier's tip (as a separate path). */
function pine(x: number, height: number, width: number, base: number) {
  const tiers = [
    { top: 0, bottom: 0.42, spread: 0.55 },
    { top: 0.25, bottom: 0.7, spread: 0.8 },
    { top: 0.5, bottom: 0.95, spread: 1 },
  ];
  const y = (fraction: number) => Math.round(base - height + height * fraction);
  const half = width / 2;
  let tree = '';
  let snow = '';
  for (const tier of tiers) {
    const span = half * tier.spread;
    tree += `M${x} ${y(tier.top)} L${Math.round(x + span)} ${y(tier.bottom)} L${Math.round(x - span)} ${y(tier.bottom)} Z `;
    const cap = (tier.bottom - tier.top) * 0.32;
    snow += `M${x} ${y(tier.top)} L${Math.round(x + span * 0.32)} ${y(tier.top + cap)} L${x} ${y(tier.top + cap * 0.7)} L${Math.round(x - span * 0.32)} ${y(tier.top + cap)} Z `;
  }
  tree += `M${x - 4} ${y(0.95)} H${x + 4} V${base} H${x - 4} Z`;
  return { tree, snow };
}

const bariloche = [
  [40, 150, 70], [100, 190, 84], [165, 160, 72], [225, 215, 92], [300, 175, 78], [370, 225, 96],
  [440, 170, 76], [505, 205, 90], [570, 180, 80],
].map(([x, height, width]) => pine(x, height, width, 520));

export const scenes: Record<Terrain, Scene> = {
  // Salta: the sandstone "castles" of the Quebrada de las Conchas, the cordillera behind.
  castillos: {
    ground: [
      {
        layer: 'back',
        d: 'M0 175 L90 135 L170 152 L260 100 L340 142 L430 112 L520 150 L610 104 L700 138 L800 88 L900 132 L990 106 L1080 142 L1180 92 L1270 122 L1360 70 L1450 112 L1530 92 L1600 118 L1600 360 L0 360 Z',
      },
      { layer: 'front', d: bushes(318, 46) },
    ],
    landmark: {
      viewBox: '0 0 660 300',
      layers: [
        {
          layer: 'mid',
          d:
            'M0 300 L0 142 L25 136 L32 97 L50 92 L56 60 L72 52 L90 56 L96 97 L110 100 L116 42 L130 30 L152 28 L164 34 ' +
            'L170 82 L182 88 L188 124 L210 120 L218 62 L230 42 L256 38 L270 44 L276 10 L296 0 L322 2 L332 12 L336 60 L350 68 ' +
            'L356 106 L376 110 L382 52 L398 32 L426 28 L440 38 L444 88 L460 92 L466 20 L484 8 L512 6 L526 16 L532 72 L546 78 ' +
            'L552 42 L570 30 L600 32 L612 44 L616 98 L638 102 L644 72 L660 68 L660 300 Z',
        },
        {
          // Vertical erosion grooves down the castle faces.
          layer: 'front',
          d:
            'M78 300 L82 72 L87 300 Z M138 300 L142 42 L147 300 Z M246 300 L250 57 L255 300 Z M304 300 L308 17 L313 300 Z ' +
            'M412 300 L416 42 L421 300 Z M496 300 L500 22 L505 300 Z M584 300 L588 47 L593 300 Z',
        },
        { layer: 'front', d: bushes(270, 40, 0, 660, 300) },
      ],
    },
  },

  // Jujuy: Purmamarca's Cerro de los Siete Colores, poplars and low adobe houses at its foot.
  'siete-colores': {
    ground: [
      {
        layer: 'back',
        d: 'M0 230 C120 200 220 196 320 212 C420 226 500 196 600 190 C700 184 760 210 860 204 C960 198 1000 180 1100 180 C1250 180 1400 196 1600 204 L1600 360 L0 360 Z',
      },
      { layer: 'front', d: bushes(334, 34) },
    ],
    landmark: {
      viewBox: '0 0 760 320',
      layers: [
        {
          layer: 'mid',
          d: 'M0 320 L0 260 C100 210 180 110 320 72 C410 48 500 26 590 44 C670 60 710 106 760 110 L760 320 Z',
        },
        {
          // The colored strata, running diagonally down the slope.
          layer: 'band',
          d:
            'M140 208 C240 136 360 92 480 78 C560 70 630 88 690 120 L760 132 L760 150 L690 144 C620 112 550 96 480 102 C370 114 260 156 170 222 Z ' +
            'M90 260 C200 190 320 160 450 156 C550 154 640 174 760 196 L760 222 C640 200 550 182 450 184 C330 188 220 218 120 278 Z',
        },
        {
          layer: 'front',
          d:
            'M200 140 C300 110 400 90 500 102 C580 110 650 140 760 164 L760 174 C650 152 580 126 500 118 C400 110 300 130 210 156 Z ' +
            'M60 320 V282 H160 V290 H260 V276 H370 V286 H490 V320 Z ' +
            [poplar(520, 150, 30, 320), poplar(560, 185, 34, 320), poplar(605, 135, 28, 320), poplar(690, 170, 32, 320), poplar(735, 200, 36, 320)].join(' '),
        },
      ],
    },
  },

  // Misiones y Corrientes: the wetlands (esteros) and a capybara sitting in the grass.
  esteros: {
    ground: [
      { layer: 'back', d: bushes(250, 70) },
      {
        layer: 'band',
        d: 'M0 312 C200 302 400 318 600 308 C800 298 1000 316 1600 304 L1600 322 C1000 334 800 318 600 326 C400 334 200 322 0 330 Z',
      },
      { layer: 'front', d: bushes(340, 26) },
    ],
    landmark: {
      viewBox: '0 0 260 200',
      perch: true,
      layers: [
        {
          // Sitting, head raised (from the reference photo), perched on the featured card.
          layer: 'front',
          d:
            'M36 182 L38 130 C36 110 30 92 22 80 C14 70 8 62 10 52 L14 38 C16 28 24 22 34 20 L48 16 C62 12 76 10 88 14 ' +
            'C94 6 102 4 106 10 C110 16 108 22 102 24 C126 28 156 38 178 58 C206 82 222 122 224 160 C226 174 220 182 206 182 ' +
            'L72 182 C72 174 66 168 58 168 C50 168 46 174 46 182 Z',
        },
        { layer: 'mid', d: bushes(190, 18, 0, 260, 200) },
      ],
    },
  },

  // Buenos Aires: the Obelisco against the city skyline.
  obelisco: {
    ground: [
      {
        layer: 'back',
        d:
          'M0 360 V230 H70 V200 H130 V240 H190 V180 H260 V220 H300 V160 H370 V210 H430 V190 H500 V236 H560 V170 H640 V214 H700 V150 ' +
          'H760 V200 H830 V176 H900 V226 H960 V140 H1040 V190 H1100 V208 H1160 V160 H1230 V218 H1300 V168 H1370 V200 H1440 V150 H1510 V190 H1600 V360 Z',
      },
      {
        layer: 'mid',
        d: 'M0 360 V272 H90 V252 H180 V280 H260 V246 H350 V270 H470 V258 H560 V284 H700 V262 H820 V286 H960 V268 H1090 V290 H1600 V360 Z',
      },
      { layer: 'front', d: bushes(334, 40) },
    ],
    landmark: {
      viewBox: '0 0 64 320',
      layers: [{ layer: 'front', d: 'M12 320 L20 42 L32 14 L44 42 L52 320 Z' }],
    },
  },

  // Río Negro: Bariloche's snowy peaks over a pine forest.
  nevados: {
    ground: [
      {
        layer: 'back',
        d: 'M0 230 L120 170 L200 200 L330 120 L430 170 L520 140 L640 200 L760 150 L880 110 L1000 170 L1100 140 L1240 100 L1360 160 L1460 130 L1600 170 L1600 360 L0 360 Z',
      },
      { layer: 'front', d: bushes(346, 30) },
    ],
    landmark: {
      viewBox: '0 0 600 520',
      layers: [
        {
          layer: 'back',
          d: 'M0 520 L0 330 L110 210 L180 260 L330 40 L430 180 L490 130 L600 250 L600 520 Z',
        },
        {
          // Snow cover, following the ridge with a jagged lower edge.
          layer: 'snow',
          d:
            'M330 40 L410 150 L382 140 L362 172 L336 142 L310 176 L290 146 L262 160 L240 150 Z ' +
            'M490 130 L540 190 L516 186 L500 206 L484 188 L464 200 L450 184 Z ' +
            'M110 210 L150 238 L130 240 L114 256 L98 240 L84 246 Z',
        },
        { layer: 'front', d: bariloche.map((tree) => tree.tree).join(' ') },
        // Snow on the pine tips: its own layer, since `snow` drifts with the peaks (parallax).
        { layer: 'frost', d: bariloche.map((tree) => tree.snow).join(' ') },
      ],
    },
  },
};
