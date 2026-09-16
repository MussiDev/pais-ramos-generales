import json, math, re

SRC = 'argentina_provinces.geojson'

# Stop id used in src/content/provinces.ts -> real province name(s) in the geojson
STOP_PROVINCES = {
    'salta': ['Salta'],
    'jujuy': ['Jujuy'],
    'misiones-corrientes': ['Misiones', 'Corrientes'],
    'buenos-aires': ['Buenos Aires'],
    'rio-negro': ['Río Negro'],
}
FUNES_LATLON = (-32.9188, -60.8103)  # Funes, Santa Fe

with open(SRC, encoding='utf-8') as f:
    data = json.load(f)

# geoBoundaries' source data has one typo'd shapeName ("La Roja" for La Rioja, ISO AR-F).
NAME_FIXES = {'La Roja': 'La Rioja'}

features = {
    NAME_FIXES.get(feat['properties']['shapeName'], feat['properties']['shapeName']): feat
    for feat in data['features']
}

# ---- Collect all rings as lists of (lon, lat), tagged with province name ----
def rings_of(feature):
    geom = feature['geometry']
    if geom['type'] == 'Polygon':
        return geom['coordinates']
    else:  # MultiPolygon
        out = []
        for poly in geom['coordinates']:
            out.extend(poly)
        return out

all_lons, all_lats = [], []
province_rings = {}  # name -> list of rings (each ring: list of (lon,lat))
for name, feat in features.items():
    rs = rings_of(feat)
    province_rings[name] = rs
    for ring in rs:
        for lon, lat in ring:
            all_lons.append(lon)
            all_lats.append(lat)

# Exclude the Antarctic-claim tail of Tierra del Fuego (lat < -56) from the bounding box,
# so the mainland map isn't squeezed to fit territory that would never be drawn on a decorative map.
mainland_lats = [lat for lat in all_lats if lat > -56]
min_lon, max_lon = min(all_lons), max(all_lons)
min_lat, max_lat = min(mainland_lats), max(mainland_lats)
mean_lat_rad = math.radians((min_lat + max_lat) / 2)
cos_lat = math.cos(mean_lat_rad)

TARGET_W = 380.0
TARGET_H = 660.0
PAD = 6.0

lon_span = (max_lon - min_lon) * cos_lat
lat_span = (max_lat - min_lat)
scale = min((TARGET_W - 2 * PAD) / lon_span, (TARGET_H - 2 * PAD) / lat_span)

def project(lon, lat):
    x = (lon - min_lon) * cos_lat * scale + PAD
    y = (max_lat - lat) * scale + PAD
    return (round(x, 1), round(y, 1))

# ---- Douglas-Peucker simplification on projected points ----
def perp_dist(p, a, b):
    (x, y), (ax, ay), (bx, by) = p, a, b
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return math.hypot(x - ax, y - ay)
    t = ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)
    t = max(0, min(1, t))
    px, py = ax + t * dx, ay + t * dy
    return math.hypot(x - px, y - py)

def simplify(points, epsilon):
    if len(points) < 3:
        return points
    dmax, idx = 0.0, 0
    for i in range(1, len(points) - 1):
        d = perp_dist(points[i], points[0], points[-1])
        if d > dmax:
            dmax, idx = d, i
    if dmax > epsilon:
        left = simplify(points[:idx + 1], epsilon)
        right = simplify(points[idx:], epsilon)
        return left[:-1] + right
    return [points[0], points[-1]]

EPSILON = 0.6  # projected units; ~0.6px at this scale

def ring_to_path(ring_lonlat):
    pts = [project(lon, lat) for lon, lat in ring_lonlat]
    # de-dupe consecutive identical points before simplifying
    dedup = [pts[0]]
    for p in pts[1:]:
        if p != dedup[-1]:
            dedup.append(p)
    simplified = simplify(dedup, EPSILON)
    if len(simplified) < 3:
        simplified = dedup
    d = f"M{simplified[0][0]} {simplified[0][1]} " + " ".join(
        f"L{x} {y}" for x, y in simplified[1:]
    ) + " Z"
    return d, simplified

def polygon_area_centroid(points):
    """Shoelace-based signed area and centroid for a single closed ring (list of (x,y))."""
    a = 0.0
    cx = 0.0
    cy = 0.0
    n = len(points)
    for i in range(n):
        x0, y0 = points[i]
        x1, y1 = points[(i + 1) % n]
        cross = x0 * y1 - x1 * y0
        a += cross
        cx += (x0 + x1) * cross
        cy += (y0 + y1) * cross
    a *= 0.5
    if a == 0:
        xs = [p[0] for p in points]
        ys = [p[1] for p in points]
        return sum(xs) / len(xs), sum(ys) / len(ys), 0
    cx /= (6 * a)
    cy /= (6 * a)
    return cx, cy, abs(a)

province_paths = {}   # name -> combined 'd' (all rings, holes ignored - outer rings only, fine for a flat fill map)
province_centroids = {}  # name -> (x, y) of the largest ring by area

for name, rings in province_rings.items():
    ds = []
    best_area = -1
    best_centroid = None
    for ring in rings:
        d, simplified = ring_to_path(ring)
        ds.append(d)
        cx, cy, area = polygon_area_centroid(simplified)
        if area > best_area:
            best_area = area
            best_centroid = (cx, cy)
    province_paths[name] = " ".join(ds)
    province_centroids[name] = best_centroid

# ---- Emit TS module ----
def esc(s):
    return s.replace("'", "\\'")

def slug(name):
    s = name.lower()
    s = (s.replace('í', 'i').replace('ó', 'o').replace('á', 'a').replace('é', 'e')
           .replace('ú', 'u').replace('ñ', 'n'))
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s

lines = []
lines.append('/**')
lines.append(' * Argentina province outlines and centroids, generated from geoBoundaries ADM1 data')
lines.append(' * (CC-BY 4.0, Runfola et al. 2020 - https://www.geoboundaries.org), simplified and')
lines.append(' * reprojected (equirectangular, longitude scaled by cos(mean latitude)) to a compact')
lines.append(f' * {int(TARGET_W)}x{int(TARGET_H)} viewBox. Regenerate with scripts/build-argentina-map.py.')
lines.append(' * Mainland only: the Antarctic sector claimed by Tierra del Fuego province is excluded.')
lines.append(' */')
lines.append(f'export const MAP_VIEWBOX = {{ x: 0, y: 0, width: {int(TARGET_W)}, height: {int(TARGET_H)} }} as const;')
lines.append('')
lines.append('export interface ProvincePath {')
lines.append('  id: string;')
lines.append('  name: string;')
lines.append('  d: string;')
lines.append('  centroid: { x: number; y: number };')
lines.append('}')
lines.append('')
lines.append('export const PROVINCE_PATHS: ProvincePath[] = [')
for name in sorted(province_paths.keys()):
    d = province_paths[name]
    cx, cy = province_centroids[name]
    lines.append('  {')
    lines.append(f"    id: '{slug(name)}',")
    lines.append(f"    name: '{esc(name)}',")
    lines.append(f"    d: '{d}',")
    lines.append(f"    centroid: {{ x: {round(cx,1)}, y: {round(cy,1)} }},")
    lines.append('  },')
lines.append('];')
lines.append('')

# Funes pin, projected the same way (approximate: linear extrapolation using the same scale/origin)
fx = (FUNES_LATLON[1] - min_lon) * cos_lat * scale + PAD
fy = (max_lat - FUNES_LATLON[0]) * scale + PAD
lines.append(f'export const FUNES_PIN = {{ x: {round(fx,1)}, y: {round(fy,1)} }} as const;')

with open('map-provinces.ts', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

total_chars = sum(len(d) for d in province_paths.values())
print('viewBox', TARGET_W, TARGET_H, 'scale', scale)
print('total path chars', total_chars)
for name in sorted(province_centroids):
    print(name, province_centroids[name], slug(name))
print('FUNES', fx, fy)
