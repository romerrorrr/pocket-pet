/**
 * sw.js — service worker
 * =======================
 * 1. Que la app se pueda INSTALAR (en iOS, instalada, el progreso deja
 *    de estar en riesgo de borrarse solo tras ~7 dias sin uso).
 * 2. Que ande sin señal — el final es en un bote en West Lake: nada de
 *    lo que necesita puede depender de internet.
 *
 * Todo el juego se precachea al instalar: codigo, fuentes y TODO el
 * arte (es poco). Los clips de musica opcionales se
 * intentan uno por uno y si no estan, no pasa nada.
 *
 * Todo sale de la cache de esta VERSION (cache primero). VERSION la
 * escribe tools/deploy.py con un hash del contenido: cualquier cambio,
 * de codigo o de arte, da una VERSION nueva y el telefono se actualiza
 * solo la proxima vez que abra la app con señal (sin mezclar versiones).
 */

const VERSION = "baozi-25c6f6fc1f"; // tools/deploy.py la reemplaza por un hash del contenido

const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/style.css",
  "./css/glifos.css",
  "./js/main.js",
  "./js/arte.js",
  "./js/config.js",
  "./js/petState.js",
  "./js/mundo.js",
  "./js/storage.js",
  "./js/gameController.js",
  "./js/render.js",
  "./js/sensores.js",
  "./js/actuadores.js",
  "./js/sonido.js",
  "./js/musica.js",
  "./js/diario.js",
  "./js/cartas.js",
  "./js/camara.js",
  "./js/lente.js",
  "./js/dialogo.js",
  "./js/final.js",
  "./js/escena.js",
  "./js/escena_datos.js",
  "./js/pieza.js",
  "./js/pieza_datos.js",
  "./js/clima.js",
  "./js/director.js",
  "./js/despierto.js",
  "./js/recortes.js",
  "./js/personaje.js",
  "./js/personajes_datos.js",
  "./js/juego.js",
  "./js/mapa_final.js",
  "./js/amigos.js",
  "./js/grabacion.js",
  "./js/galeria.js",
  "./js/tienda.js",
  "./js/deseos.js",
  "./js/pesca.js",
  "./icons/mochi-192.png",
  "./icons/mochi-512.png",
  "./assets/fondo_caminar.png",
];

// El arte se lista aparte para que agregar un sprite sea una linea.
const ARTE = [
  "fonts/press-start-2p-latin-400-normal.woff2",
  "fonts/press-start-2p-latin-ext-400-normal.woff2",
  "fonts/pixelify-sans-latin-400-normal.woff2",
  "fonts/pixelify-sans-latin-ext-400-normal.woff2",
  "fonts/pixelify-sans-latin-600-normal.woff2",
  "fonts/pixelify-sans-latin-ext-600-normal.woff2",
  "fonts/pixelify-sans-latin-700-normal.woff2",
  "fonts/pixelify-sans-latin-ext-700-normal.woff2",
  ...["boca_base_feliz", "boca_base_neutral", "boca_base_triste", "boca_dormida", "boca_enferma",
    "ojo_base_energia_alta", "ojo_base_energia_baja", "ojo_base_energia_neutral", "ojo_dormida", "ojo_enferma",
    "cuerpo", "cuerpo_sentado", "cuerpo_dormido"].map((n) => `caras/${n}.png`),
  ...["aburrido", "asqueado", "asustado", "curioso", "decepcionado", "enamorado", "euforico", "hambriento", "sorprendido"]
    .flatMap((n) => [`caras/ojo_especial_${n}.png`, `caras/boca_especial_${n}.png`]),
  ...["manzana", "naranja", "grillo1", "grillo2", "grillo3", "bao", "onigiri", "dumpling"].map((n) => `comida/comida_${n}.png`),
  "comida/bebida_te.png",
  "comida/bebida_agua.png",
  "comida/juego_chile.png",
  "comida/juego_bao_dorado.png",
  "mantou/cuerpo.png",
  "mantou/cuerpo_sentado.png",
  "mantou/cara_neutral.png",
  "mantou/cara_feliz.png",
  "mantou/cara_euforico.png",
  "mantou/cara_cansada.png",
  "mantou/cara_dormida.png",
  "mantou/cara_triste.png",
  "mantou/cara_enferma.png",
  "mantou/cara_comiendo.png",
  "mantou/cara_aburrido.png",
  "mantou/cara_asqueado.png",
  "mantou/cara_asustado.png",
  "mantou/cara_curioso.png",
  "mantou/cara_enamorado.png",
  "mantou/cara_hambriento.png",
  "mantou/cara_sorprendido.png",
  "final/huevo_blanco.png",
  ...["acc_orejas", "acc_antenas", "acc_boina", "acc_corona", "deco_maceta", "deco_ovni", "deco_te", "deco_cuadro_baozi", "deco_cuadro_mantou"].map((n) => `amigos/${n}.png`),
  // v24: la pesca
  ...["fondo_dia", "fondo_noche", "pez_carpa", "pez_dorado", "pez_koi", "pez_koi_dorado", "pez_sandalia", "pez_hoja"].map((n) => `pesca/${n}.png`),
  // v23: la tienda
  ...["moneda", "comida_osmanto", "comida_longjing", "comida_luna", "sticker_loto", "sticker_hoja_loto", "sticker_corazones", "sticker_brillos", "acc_mono", "acc_lentes", "acc_sombrero", "acc_osmanto", "deco_farolitos", "deco_pecera", "deco_bonsai", "deco_poster", "deco_luces", "deco_peluche_baozi", "deco_peluche_mantou", "deco_marco", "valija"].map((n) => `tienda/${n}.png`),
  ...["bote_mascotas", "bote_ella", "bote_reflejo_mascotas", "bote_reflejo_ella", "ventana_baozi", "ventana_mantou"].map((n) => `final/${n}.png`),
  ...["westlake", "longjing", "lingyin"].map((n) => `lugares/lugar_${n}.png`),
  ...["chagee", "mimi", "ruchong", "usagi"].flatMap((n) => [`npcs/npc_${n}.png`, `npcs/npc_${n}_saludo.png`]),
  ...["feed", "water", "clean", "sleep", "medicine", "play", "walk", "lens", "stats", "traits", "npcs", "diary", "progress", "sound", "backup"].map((n) => `menu/menu_${n}.png`),
  ...["anillo", "destello", "corazon_rojo", "corazon_rosa", "huevo", "grieta"].map((n) => `final/${n}.png`),
  ...["lago", "bote", "bote_reflejo", "ojos_el", "ojos_ella_rosa", "ojos_ella_cafe", "boca_hablando"].map((n) => `final/${n}.png`),
  ...["balde.png", "botiquin.png", "calendario.png", "camara.png", "cielo_amanecer.png", "cielo_atardecer.png", "cielo_dia.png", "cielo_noche.png", "corcho.png", "cortinas.png", "vista_amanecer.png", "vista_dia.png", "vista_atardecer.png", "vista_noche.png", "farol.png", "farol_apagado.png", "fondo.png", "heladera.png", "heladera_adentro.png", "mapa.png", "mesita.png", "radio.png", "radio_apagada.png", "recuerdo_generico.png", "recuerdo_leifeng.png", "recuerdo_lingyin.png", "recuerdo_longjing.png", "recuerdo_westlake.png", "reloj.png", "sello_cafe.png", "sello_casa.png", "sello_corazon.png", "sello_estrella.png", "sello_hoja.png", "sello_pabellon.png", "sello_pagoda.png", "sello_templo.png", "tele.png"].map((n) => `pieza/${n}`),
  "final/despierto.mp4",
  "final/silencio.mp3",
  ...["libro", "pin", "exclama", "gota", "tenedor", "burbuja", "atras", "izq", "der", "camara", "candado", "check", "corazon", "estrella", "nota", "cerrar", "girar", "pie"]
    .flatMap((n) => [`ui/g_${n}@2.png`, `ui/g_${n}@4.png`]),
].map((r) => `./assets/${r}`);

const MUSICA_OPCIONAL = ["busqueda", "propuesta", "si", "carta", "descubrimiento", "enamorado", "casa"].map((n) => `./assets/musica/${n}.mp3`);

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(VERSION)
      .then(async (cache) => {
        // cache: "reload" = directo del servidor, nunca de la cache HTTP del
        // navegador (si no, tras un deploy podria guardar arte viejo con codigo nuevo)
        const fresco = (u) => new Request(u, { cache: "reload" });
        await cache.addAll(SHELL.map(fresco));
        await cache.addAll(ARTE.map(fresco));
        await Promise.all(MUSICA_OPCIONAL.map((u) => cache.add(fresco(u)).catch(() => {})));
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== VERSION).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  const pedido = evento.request;
  if (pedido.method !== "GET") return;
  const url = new URL(pedido.url);
  if (url.origin !== self.location.origin) return;

  const esDocumento = pedido.mode === "navigate" || pedido.destination === "document";
  const esCodigo = esDocumento || /\.(js|css|webmanifest)$/.test(url.pathname);

  if (esCodigo) {
    // Codigo: SIEMPRE de la cache de esta VERSION (arranca al instante, con
    // o sin señal, y nunca se mezclan modulos de dos deploys). Un deploy
    // nuevo cambia VERSION (tools/deploy.py la calcula del contenido): el
    // navegador baja el sw.js nuevo solo, precachea todo junto y la proxima
    // vez que ella abra la app ya esta la version nueva.
    evento.respondWith(
      caches
        .match(pedido, { ignoreSearch: esDocumento })
        .then((r) => r || (esDocumento ? caches.match("./index.html") : undefined))
        .then(
          (r) =>
            r ||
            fetch(pedido).then((respuesta) => {
              if (respuesta.ok && respuesta.type === "basic") {
                const copia = respuesta.clone();
                caches.open(VERSION).then((cache) => cache.put(pedido, copia));
              }
              return respuesta;
            }),
        ),
    );
    return;
  }

  // Arte, fuentes, musica: cache primero (no cambian, y pesan).
  evento.respondWith(
    caches.match(pedido).then((enCache) => {
      if (enCache) return enCache;
      return fetch(pedido).then((respuesta) => {
        if (respuesta.ok && respuesta.type === "basic") {
          const copia = respuesta.clone();
          caches.open(VERSION).then((cache) => cache.put(pedido, copia));
        }
        return respuesta;
      });
    }),
  );
});
