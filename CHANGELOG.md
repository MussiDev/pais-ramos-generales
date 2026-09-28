# Changelog

All notable changes to this project are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- [FEAT-001] Animated landing prototype for País Ramos Generales: 7-section scrollytelling page
  (hero, manifiesto, recorrido, despensa, stack transitions, footer), pinned map route with stop
  indicator, category filter in despensa, WhatsApp deep links per product, reduced-motion fallback,
  mobile sticky recorrido strip, and image-placeholder fallback for missing assets.
- Client copy (2026-09-28): new hero subcopy, manifiesto text and "Productores reales" pillar,
  recorrido lede, Patagonia coast and seafood; five secondary connection points on the recorrido
  map (Córdoba, Corrientes, Misiones, south of Buenos Aires, Patagonian coast).

### Fixed
- Section titles lost the space between the lead and the italic emphasis ("país,en tu mesa").
- [FIX-001] Site contact email no longer ships as a `[EMAIL]` placeholder in the JSON-LD structured
  data — replaced with the store's verified address (`paisramosgenerales@gmail.com`).
