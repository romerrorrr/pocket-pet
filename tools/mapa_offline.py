#!/usr/bin/env python3
"""
mapa_offline.py — el mapa de Hangzhou, armado de antemano y metido en la app.

El corcho (js/corchoReal.js) y el mapa del dia (js/mapaDia.js) dibujan el mapa
real en pixel art a partir de un "raster de rotulos": cada pixel dice que es
(agua, bosque, parque, tierra, edificio o calle). Antes ese raster salia de las
teselas de OpenStreetMap bajadas en el telefono, con internet (y en China a
veces no cargan). Este script lo arma ACA, desde los datos de OpenStreetMap
(Overpass API, licencia ODbL: "© OpenStreetMap contributors"), y lo guarda en
paquetes que viajan con la app:

  assets/mapa/mapa.json   que zooms hay y que teselas cubre cada uno
  assets/mapa/hz{z}.bin   las teselas de rotulos de ese zoom (PNG de 6 colores)

  - z15 (≈4 m por pixel): el centro, con calles y edificios
    (de Lingyin y Xixi hasta Binjiang y Xiasha).
  - z13 (≈16 m por pixel): los alrededores, unos 90 x 90 km (agua, verde y
    calles grandes): Xiaoshan, el aeropuerto, Liangzhu, Fuyang...
  - z14 sale de z15, y z12 / z11 de z13 (achicando: gana lo que mas hay).

Nota: no se bajan las teselas ya dibujadas de openstreetmap.org (su politica
no permite bajarlas en masa para usarlas sin conexion): se bajan los DATOS y el
dibujo lo hace este script.

Uso:
  pip install pillow numpy
  python3 tools/mapa_offline.py            # baja (con cache) y arma todo
  python3 tools/mapa_offline.py --prueba   # solo un pedacito del lago (para probar)

Los pedidos a Overpass quedan en tools/cache_osm/ (no va al repo): si se corre
otra vez, no se vuelve a bajar nada.
"""
import argparse
import io
import json
import math
import os
import struct
import sys
import time
import urllib.parse
import urllib.request

import numpy as np
from PIL import Image, ImageDraw

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)

# servidores de Overpass (se prueba el siguiente si uno no responde)
OVERPASS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]

# rotulos: el mismo orden que ROTULOS en js/mapaDia.js
AGUA, BOSQUE, PARQUE, TIERRA, EDIF, CALLE = range(6)
# colores del paquete: los de referencia de mapaDia.js (asi el clasificador de
# siempre los reconoce aunque se lean como una tesela cualquiera)
COLORES = [(170, 211, 223), (173, 209, 158), (200, 250, 204), (242, 239, 233), (217, 208, 201), (255, 255, 255)]

# zonas (lon0, lat0, lon1, lat1)
CENTRO = (120.00, 30.13, 120.36, 30.36)
ALREDEDORES = (119.66, 29.84, 120.62, 30.66)
PRUEBA = (120.135, 30.235, 120.165, 30.26)


# ---------------------------------------------------------------------------
# Proyeccion (Web Mercator, la de las teselas: igual que mapaDia.js)
# ---------------------------------------------------------------------------

def mx(lon):
    return (lon + 180) / 360


def my(lat):
    r = math.radians(max(-85, min(85, lat)))
    return (1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2


def lon_de(x):
    return x * 360 - 180


def lat_de(y):
    return math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y))))


def rango_teselas(caja, z, multiplo):
    """Teselas (tx0, ty0, nx, ny) que cubren la caja, alineadas a `multiplo`
    (para poder achicar a zooms menores sin cortar teselas)."""
    lon0, lat0, lon1, lat1 = caja
    n = 2 ** z
    tx0 = math.floor(mx(lon0) * n / multiplo) * multiplo
    tx1 = math.ceil(mx(lon1) * n / multiplo) * multiplo
    ty0 = math.floor(my(lat1) * n / multiplo) * multiplo
    ty1 = math.ceil(my(lat0) * n / multiplo) * multiplo
    return tx0, ty0, tx1 - tx0, ty1 - ty0


def caja_de_rango(z, tx0, ty0, nx, ny, margen=0.002):
    n = 2 ** z
    return (lon_de(tx0 / n) - margen, lat_de((ty0 + ny) / n) - margen, lon_de((tx0 + nx) / n) + margen, lat_de(ty0 / n) + margen)


# ---------------------------------------------------------------------------
# Overpass
# ---------------------------------------------------------------------------

def consulta(bbox, detalle):
    s, w, n, e = bbox[1], bbox[0], bbox[3], bbox[2]
    b = f"{s:.5f},{w:.5f},{n:.5f},{e:.5f}"
    calles = ("motorway|trunk|primary|secondary|tertiary|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link"
              + ("|unclassified|residential|living_street|service|pedestrian|footway|path|cycleway|steps|track" if detalle else ""))
    rios = "riverbank|dock|river|canal" + ("|stream|drain|ditch" if detalle else "")
    partes = [
        f'way["natural"~"^(water|wood|scrub|wetland|grassland|heath)$"]({b});',
        f'relation["natural"~"^(water|wood|scrub|wetland|grassland|heath)$"]({b});',
        f'way["waterway"~"^({rios})$"]({b});',
        f'relation["waterway"~"^(riverbank|dock)$"]({b});',
        f'way["landuse"~"^(forest|grass|meadow|recreation_ground|village_green|cemetery|orchard|vineyard|plant_nursery|allotments|basin|reservoir)$"]({b});',
        f'relation["landuse"~"^(forest|grass|meadow|recreation_ground|village_green|cemetery|orchard|vineyard|basin|reservoir)$"]({b});',
        f'way["landuse"="farmland"]["crop"="tea"]({b});',
        f'relation["landuse"="farmland"]["crop"="tea"]({b});',
        f'way["leisure"~"^(park|garden|golf_course|pitch|playground|common|dog_park)$"]({b});',
        f'relation["leisure"~"^(park|garden|golf_course)$"]({b});',
        f'way["highway"~"^({calles})$"]({b});',
    ]
    if detalle:
        partes += [f'way["building"]({b});', f'relation["building"]({b});']
    return "[out:json][timeout:600][maxsize:1073741824];\n(\n" + "\n".join(partes) + "\n);\nout geom qt;"


def bajar(bbox, detalle, cache_dir, intentos=9):
    nombre = f"{'d' if detalle else 'a'}_{bbox[0]:.4f}_{bbox[1]:.4f}_{bbox[2]:.4f}_{bbox[3]:.4f}.json"
    ruta = os.path.join(cache_dir, nombre)
    if os.path.exists(ruta):
        with open(ruta, encoding="utf-8") as f:
            return json.load(f)
    datos = urllib.parse.urlencode({"data": consulta(bbox, detalle)}).encode()
    espera = 10
    for intento in range(1, intentos + 1):
        servidor = OVERPASS[(intento - 1) % len(OVERPASS)]
        try:
            req = urllib.request.Request(servidor, data=datos, headers={"User-Agent": "baozi-pocket-pet/1.0 (mapa offline de un juego personal)"})
            with urllib.request.urlopen(req, timeout=900) as r:
                crudo = r.read()
            j = json.loads(crudo)
            if "remark" in j and "error" in j["remark"].lower():
                raise RuntimeError(j["remark"])
            with open(ruta, "wb") as f:
                f.write(crudo)
            print(f"  bajado {nombre}: {len(crudo) / 1e6:.1f} MB, {len(j.get('elements', []))} elementos", flush=True)
            time.sleep(4)  # sin apurar a Overpass
            return j
        except Exception as e:  # 429, 504, cortes: se espera y se reintenta
            print(f"  fallo {nombre} (intento {intento}, {servidor.split('/')[2]}): {e}", flush=True)
            time.sleep(espera)
            espera = min(espera * 2, 180)
    raise SystemExit(f"no se pudo bajar {nombre}")


def pedazos(caja, n_x, n_y):
    lon0, lat0, lon1, lat1 = caja
    dx, dy = (lon1 - lon0) / n_x, (lat1 - lat0) / n_y
    for j in range(n_y):
        for i in range(n_x):
            yield (lon0 + i * dx, lat0 + j * dy, lon0 + (i + 1) * dx, lat0 + (j + 1) * dy)


# ---------------------------------------------------------------------------
# De OSM a rotulos
# ---------------------------------------------------------------------------

def rotulo_area(t):
    """El rotulo de un area (o None si no se pinta como area)."""
    nat, lu, lei, ww = t.get("natural"), t.get("landuse"), t.get("leisure"), t.get("waterway")
    if nat == "water" or ww in ("riverbank", "dock") or lu in ("basin", "reservoir"):
        return AGUA
    if lu == "forest" or nat in ("wood", "scrub"):
        return BOSQUE
    if (lei in ("park", "garden", "golf_course", "pitch", "playground", "common", "dog_park")
            or lu in ("grass", "meadow", "recreation_ground", "village_green", "cemetery", "orchard", "vineyard", "plant_nursery", "allotments")
            or nat in ("wetland", "grassland", "heath")
            or (lu == "farmland" and t.get("crop") == "tea")):  # el te de Longjing, verde
        return PARQUE
    if "building" in t and t.get("building") != "no":
        return EDIF
    return None


ANCHO_CALLE = {  # en pixeles a z15 / a z13
    "motorway": (5, 2), "trunk": (5, 2), "primary": (4, 2), "secondary": (4, 1), "tertiary": (3, 1),
    "motorway_link": (2, 1), "trunk_link": (2, 1), "primary_link": (2, 1), "secondary_link": (2, 1), "tertiary_link": (2, 1),
    "unclassified": (2, 0), "residential": (2, 0), "living_street": (2, 0), "pedestrian": (2, 0),
    "service": (1, 0), "track": (1, 0), "footway": (1, 0), "path": (1, 0), "cycleway": (1, 0), "steps": (1, 0),
}
ANCHO_RIO = {"river": (3, 2), "canal": (2, 1), "stream": (1, 0), "drain": (1, 0), "ditch": (1, 0)}


def anillos(miembros):
    """Une los caminos de una relacion en anillos cerrados: (exteriores, interiores)."""
    out, inn = [], []
    for rol, lista in (("outer", out), ("inner", inn)):
        trozos = [[(p["lon"], p["lat"]) for p in m["geometry"]] for m in miembros
                  if m.get("type") == "way" and m.get("geometry") and (m.get("role") or "outer") == rol]
        trozos = [t for t in trozos if len(t) >= 2]
        while trozos:
            anillo = trozos.pop()
            cambio = True
            while anillo[0] != anillo[-1] and cambio:
                cambio = False
                for i, t in enumerate(trozos):
                    if t[0] == anillo[-1]:
                        anillo += t[1:]
                    elif t[-1] == anillo[-1]:
                        anillo += t[::-1][1:]
                    elif t[-1] == anillo[0]:
                        anillo = t[:-1] + anillo
                    elif t[0] == anillo[0]:
                        anillo = t[::-1][:-1] + anillo
                    else:
                        continue
                    trozos.pop(i)
                    cambio = True
                    break
            if len(anillo) >= 4 and anillo[0] == anillo[-1]:
                lista.append(anillo)
    return out, inn


def superficie(anillo):
    s = 0.0
    for (x0, y0), (x1, y1) in zip(anillo, anillo[1:]):
        s += x0 * y1 - x1 * y0
    return abs(s) / 2


def leer(elementos, detalle, vistos, areas, rios, calles):
    """De los elementos de Overpass a figuras: areas, rios, calles (sin repetidos:
    un mismo camino viene en todos los pedazos que toca)."""
    for el in elementos:
        clave = (el["type"], el["id"])
        if clave in vistos:
            continue
        vistos.add(clave)
        t = el.get("tags", {})
        if el["type"] == "way":
            g = [(p["lon"], p["lat"]) for p in el.get("geometry", [])]
            if len(g) < 2:
                continue
            hw, ww = t.get("highway"), t.get("waterway")
            if hw in ANCHO_CALLE:
                if t.get("tunnel") in ("yes", "building_passage") or t.get("area") == "yes":
                    continue
                if hw == "footway" and t.get("footway") in ("sidewalk", "crossing"):
                    continue
                ancho = ANCHO_CALLE[hw][0 if detalle else 1]
                if ancho:
                    calles.append((ancho, g))
                continue
            if ww in ANCHO_RIO:
                if t.get("tunnel") == "culvert":
                    continue
                ancho = ANCHO_RIO[ww][0 if detalle else 1]
                if ancho:
                    rios.append((ancho, g))
                continue
            r = rotulo_area(t)
            if r is not None and g[0] == g[-1] and len(g) >= 4:
                areas.append((r, [g], []))
        elif el["type"] == "relation" and t.get("type") in ("multipolygon", None):
            r = rotulo_area(t)
            if r is None:
                continue
            ext, inn = anillos(el.get("members", []))
            if ext:
                areas.append((r, ext, inn))


def dibujar(areas, rios, calles, z, tx0, ty0, nx, ny):
    """El raster de rotulos (numpy uint8, alto x ancho) de ese rango de teselas."""
    N = 256 * 2 ** z
    X0, Y0 = tx0 * 256, ty0 * 256
    W, H = nx * 256, ny * 256
    lienzo = Image.new("L", (W, H), TIERRA)
    d = ImageDraw.Draw(lienzo)
    pp = lambda g: [(mx(lon) * N - X0, my(lat) * N - Y0) for lon, lat in g]

    def area(r, ext, inn):
        pe = [pp(a) for a in ext]
        pi = [pp(a) for a in inn]
        if not inn:
            for a in pe:
                d.polygon(a, fill=r)
            return
        xs = [x for a in pe for x, _ in a]
        ys = [y for a in pe for _, y in a]
        bx0, by0 = max(0, int(min(xs)) - 1), max(0, int(min(ys)) - 1)
        bx1, by1 = min(W, int(max(xs)) + 2), min(H, int(max(ys)) + 2)
        if bx1 <= bx0 or by1 <= by0:
            return
        m = Image.new("1", (bx1 - bx0, by1 - by0), 0)
        dm = ImageDraw.Draw(m)
        for a in pe:
            dm.polygon([(x - bx0, y - by0) for x, y in a], fill=1)
        for a in pi:
            dm.polygon([(x - bx0, y - by0) for x, y in a], fill=0)
        lienzo.paste(r, (bx0, by0, bx1, by1), m)

    # 1) el suelo (verde y agua): de la mas grande a la mas chica, asi una isla
    #    o un lago chico quedan arriba del parque o del bosque grande. El agua
    #    "pesa" un poco menos: a igual tamaño, va arriba.
    suelo = [a for a in areas if a[0] != EDIF]
    suelo.sort(key=lambda a: -sum(superficie(x) for x in a[1]) * (0.25 if a[0] == AGUA else 1))
    for a in suelo:
        area(*a)
    # 2) rios y canales (las lineas: los que no tienen orilla dibujada)
    for ancho, g in rios:
        d.line(pp(g), fill=AGUA, width=ancho, joint="curve")
    # 3) edificios
    for a in areas:
        if a[0] == EDIF:
            area(*a)
    # 4) calles: las chicas primero, las grandes encima
    for ancho, g in sorted(calles, key=lambda c: c[0]):
        d.line(pp(g), fill=CALLE, width=ancho, joint="curve")
    return np.asarray(lienzo, dtype=np.uint8)


def achicar(r):
    """De un zoom al anterior: cada 2x2 -> 1. Si hay 2 de calle, calle (son finas);
    si no, el que mas hay (empates: agua, edificio, bosque, parque, tierra)."""
    h, w = r.shape
    b = r.reshape(h // 2, 2, w // 2, 2).transpose(0, 2, 1, 3).reshape(h // 2, w // 2, 4)
    cuenta = np.stack([(b == k).sum(axis=2) for k in range(6)], axis=2).astype(np.int16)
    prioridad = np.array([5, 3, 2, 1, 4, 0], dtype=np.int16)  # desempate (agua gana)
    puntaje = cuenta * 8 + prioridad
    out = puntaje.argmax(axis=2).astype(np.uint8)
    out[cuenta[:, :, CALLE] >= 2] = CALLE
    return out


# ---------------------------------------------------------------------------
# Paquetes
# ---------------------------------------------------------------------------

PALETA = [c for col in COLORES for c in col] + [0] * (768 - 3 * len(COLORES))


def png(teselita):
    # los indices de la paleta son los rotulos
    im = Image.frombytes("P", (256, 256), np.ascontiguousarray(teselita).tobytes())
    im.putpalette(PALETA)
    buf = io.BytesIO()
    im.save(buf, "PNG", optimize=True, bits=4)
    return buf.getvalue()


def escribir_paquete(r, z, tx0, ty0, nx, ny, carpeta):
    """hz{z}.bin = "BZMAPA1\\n" + largo (uint32) + cabecera JSON + PNGs.
    En la cabecera, cada tesela es un numero (toda de un rotulo) o [offset, largo]."""
    datos = bytearray()
    entradas = []
    for j in range(ny):
        for i in range(nx):
            t = r[j * 256:(j + 1) * 256, i * 256:(i + 1) * 256]
            v = np.unique(t)
            if len(v) == 1:
                entradas.append(int(v[0]))
            else:
                b = png(t)
                entradas.append([len(datos), len(b)])
                datos += b
    cab = json.dumps({"v": 1, "z": z, "tx0": tx0, "ty0": ty0, "nx": nx, "ny": ny, "t": entradas}, separators=(",", ":")).encode()
    nombre = f"hz{z}.bin"
    with open(os.path.join(carpeta, nombre), "wb") as f:
        f.write(b"BZMAPA1\n" + struct.pack("<I", len(cab)) + cab + bytes(datos))
    lisas = sum(1 for e in entradas if isinstance(e, int))
    print(f"  {nombre}: {nx}x{ny} teselas ({lisas} lisas), {(len(datos) + len(cab)) / 1e6:.2f} MB", flush=True)
    return {"archivo": nombre, "tx0": tx0, "ty0": ty0, "nx": nx, "ny": ny}


def vista_previa(r, ruta, paso=1):
    pal = {AGUA: (126, 176, 204), BOSQUE: (150, 176, 118), PARQUE: (178, 200, 140), TIERRA: (240, 230, 206), EDIF: (214, 196, 168), CALLE: (255, 251, 240)}
    s = r[::paso, ::paso]
    rgb = np.zeros(s.shape + (3,), dtype=np.uint8)
    for k, c in pal.items():
        rgb[s == k] = c
    Image.fromarray(rgb, "RGB").save(ruta)


# ---------------------------------------------------------------------------

def armar(nombre, caja_zona, z, multiplo, detalle, n_x, n_y, cache_dir):
    tx0, ty0, nx, ny = rango_teselas(caja_zona, z, multiplo)
    caja = caja_de_rango(z, tx0, ty0, nx, ny)
    print(f"{nombre}: z{z}, {nx}x{ny} teselas, bajando {n_x * n_y} pedazos de {caja}", flush=True)
    areas, rios, calles, vistos = [], [], [], set()
    for bb in pedazos(caja, n_x, n_y):
        leer(bajar(bb, detalle, cache_dir).get("elements", []), detalle, vistos, areas, rios, calles)
    print(f"  {len(areas)} areas, {len(rios)} rios, {len(calles)} calles", flush=True)
    return dibujar(areas, rios, calles, z, tx0, ty0, nx, ny), (tx0, ty0, nx, ny)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--prueba", action="store_true", help="solo un pedacito del lago, a z15")
    ap.add_argument("--salida", default=os.path.join(RAIZ, "assets", "mapa"))
    ap.add_argument("--cache", default=os.path.join(AQUI, "cache_osm"))
    ap.add_argument("--vistas", default=None, help="carpeta para vistas previas (PNG)")
    a = ap.parse_args()
    os.makedirs(a.salida, exist_ok=True)
    os.makedirs(a.cache, exist_ok=True)
    indice = {"v": 1, "credito": "© OpenStreetMap contributors", "fecha": time.strftime("%Y-%m-%d"), "zooms": {}}

    if a.prueba:
        r15, (tx0, ty0, nx, ny) = armar("prueba", PRUEBA, 15, 2, True, 1, 1, a.cache)
        indice["zooms"]["15"] = escribir_paquete(r15, 15, tx0, ty0, nx, ny, a.salida)
        indice["zooms"]["14"] = escribir_paquete(achicar(r15), 14, tx0 // 2, ty0 // 2, nx // 2, ny // 2, a.salida)
        if a.vistas:
            vista_previa(r15, os.path.join(a.vistas, "vista_prueba_z15.png"))
    else:
        r15, (tx0, ty0, nx, ny) = armar("centro", CENTRO, 15, 2, True, 6, 5, a.cache)
        indice["zooms"]["15"] = escribir_paquete(r15, 15, tx0, ty0, nx, ny, a.salida)
        r14 = achicar(r15)
        indice["zooms"]["14"] = escribir_paquete(r14, 14, tx0 // 2, ty0 // 2, nx // 2, ny // 2, a.salida)
        if a.vistas:
            vista_previa(r15, os.path.join(a.vistas, "vista_z15.png"), 2)
        del r15, r14
        r13, (tx0, ty0, nx, ny) = armar("alrededores", ALREDEDORES, 13, 4, False, 4, 4, a.cache)
        indice["zooms"]["13"] = escribir_paquete(r13, 13, tx0, ty0, nx, ny, a.salida)
        r12 = achicar(r13)
        indice["zooms"]["12"] = escribir_paquete(r12, 12, tx0 // 2, ty0 // 2, nx // 2, ny // 2, a.salida)
        r11 = achicar(r12)
        indice["zooms"]["11"] = escribir_paquete(r11, 11, tx0 // 4, ty0 // 4, nx // 4, ny // 4, a.salida)
        if a.vistas:
            vista_previa(r13, os.path.join(a.vistas, "vista_z13.png"))

    with open(os.path.join(a.salida, "mapa.json"), "w", encoding="utf-8") as f:
        json.dump(indice, f, ensure_ascii=False, separators=(",", ":"))
    print("listo:", a.salida, flush=True)


if __name__ == "__main__":
    sys.exit(main())
