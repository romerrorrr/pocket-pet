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
 * solo (sin mezclar versiones).
 *
 * v35 — como llega un deploy al telefono, sin romper nada:
 *  1. Con la app abierta y señal, el navegador baja el sw.js nuevo y
 *     este precachea en una cache NUEVA, con "?v=<hash>" en cada pedido:
 *     asi el CDN de GitHub Pages (que guarda hasta 10 min) no puede
 *     darnos un archivo viejo mezclado con uno nuevo. Pages ignora la
 *     query; se guarda bajo la URL limpia. Lo que no cambio (mismo hash)
 *     se copia de la cache vieja: un deploy de un .js baja kilobytes.
 *  2. TODO o NADA: si falla un solo archivo (sin señal, GitHub lento),
 *     se borra la cache nueva, la instalacion falla y sigue andando la
 *     version vieja entera. El navegador reintenta en el proximo arranque.
 *  3. El sw nuevo ESPERA: no se activa con el juego abierto (si no,
 *     borraria la cache vieja mientras corre el codigo viejo). Se aplica
 *     en el proximo arranque en frio, o cuando main.js se lo pide
 *     (vuelve de >= 30 min en el bolsillo, en la cara de Baozi y sin el
 *     final en juego): mensaje "activar" + recarga.
 */

const VERSION = "baozi-0e7df8efb6"; // tools/deploy.py la reemplaza por un hash del contenido

// tools/deploy.py escribe aca el hash de cada archivo ({"./js/main.js": "ab12..."}).
// Vacio (sin deploy, servido local): se usa VERSION para romper caches y no se copia nada.
const HASHES = {"./": "d319e43cbdb3", "./assets/amigos/acc_antenas.png": "3351eb86b705", "./assets/amigos/acc_boina.png": "e31101ba9242", "./assets/amigos/acc_corona.png": "6cf6861e8251", "./assets/amigos/acc_orejas.png": "07e284f08b73", "./assets/amigos/deco_cuadro_baozi.png": "f8a325b8bb47", "./assets/amigos/deco_cuadro_mantou.png": "072b206ebf1d", "./assets/amigos/deco_maceta.png": "d729ba1871c9", "./assets/amigos/deco_ovni.png": "5e9e88f65c33", "./assets/amigos/deco_te.png": "cffc481c0db6", "./assets/caras/boca_base_feliz.png": "5eb338d45080", "./assets/caras/boca_base_neutral.png": "fe37724b234e", "./assets/caras/boca_base_triste.png": "5feed90a4491", "./assets/caras/boca_dormida.png": "83bf214856fc", "./assets/caras/boca_enferma.png": "ca73f57d6765", "./assets/caras/boca_especial_aburrido.png": "fa2c7d2fa18e", "./assets/caras/boca_especial_asqueado.png": "c74ef3fb164d", "./assets/caras/boca_especial_asustado.png": "ffedffdfd4eb", "./assets/caras/boca_especial_curioso.png": "c66935af4753", "./assets/caras/boca_especial_decepcionado.png": "5feed90a4491", "./assets/caras/boca_especial_enamorado.png": "ef5ad4fb3590", "./assets/caras/boca_especial_euforico.png": "5eb338d45080", "./assets/caras/boca_especial_hambriento.png": "aecc643bd771", "./assets/caras/boca_especial_sorprendido.png": "51fa6506b976", "./assets/caras/cuerpo.png": "815ca0a211c4", "./assets/caras/cuerpo_dormido.png": "5bd2399856e2", "./assets/caras/cuerpo_sentado.png": "5bd2399856e2", "./assets/caras/ojo_base_energia_alta.png": "22514e343f4d", "./assets/caras/ojo_base_energia_baja.png": "ce7e66828301", "./assets/caras/ojo_base_energia_neutral.png": "22514e343f4d", "./assets/caras/ojo_dormida.png": "de98116bdb35", "./assets/caras/ojo_enferma.png": "c14aee73e091", "./assets/caras/ojo_especial_aburrido.png": "8818bfd9d540", "./assets/caras/ojo_especial_asqueado.png": "7b348f8434a3", "./assets/caras/ojo_especial_asustado.png": "b3f7c16b847b", "./assets/caras/ojo_especial_curioso.png": "e343354ef383", "./assets/caras/ojo_especial_decepcionado.png": "82ef84544c1c", "./assets/caras/ojo_especial_enamorado.png": "cea7cdefde76", "./assets/caras/ojo_especial_euforico.png": "2cd7b344289f", "./assets/caras/ojo_especial_hambriento.png": "6dd6a4c27617", "./assets/caras/ojo_especial_sorprendido.png": "e940d6bb9773", "./assets/comida/bebida_agua.png": "0b6c01c04e45", "./assets/comida/bebida_te.png": "7d5020b1d7f7", "./assets/comida/comida_bao.png": "f982e83ed0bb", "./assets/comida/comida_dumpling.png": "b7d155401a3b", "./assets/comida/comida_grillo1.png": "c26f69b80469", "./assets/comida/comida_grillo2.png": "6ae0bd6b95b6", "./assets/comida/comida_grillo3.png": "270ff49ac1ce", "./assets/comida/comida_manzana.png": "b04419a86e54", "./assets/comida/comida_naranja.png": "0c9077a679f0", "./assets/comida/comida_onigiri.png": "979ecb2cc02c", "./assets/comida/juego_bao_dorado.png": "e2d33e84b1c8", "./assets/comida/juego_chile.png": "0240088f7c7e", "./assets/final/anillo.png": "e36a556ebe59", "./assets/final/boca_hablando.png": "f28f02f8cb2f", "./assets/final/bote.png": "fced809b4d31", "./assets/final/bote_ella.png": "1a6367b6bd6a", "./assets/final/bote_mascotas.png": "2bb243dd94a4", "./assets/final/bote_reflejo.png": "abb4d799d097", "./assets/final/bote_reflejo_ella.png": "1162f6533c16", "./assets/final/bote_reflejo_mascotas.png": "85501b476208", "./assets/final/corazon_rojo.png": "8a14af181a8f", "./assets/final/corazon_rosa.png": "2aac4404419f", "./assets/final/despierto.mp4": "0c42688262a3", "./assets/final/destello.png": "374f8e57f2b8", "./assets/final/grieta.png": "fa4c6527fc0a", "./assets/final/grieta_blanco.png": "cc7b2ad68bf9", "./assets/final/huevo.png": "37a16f26fa16", "./assets/final/huevo_blanco.png": "94b9a849095c", "./assets/final/lago.png": "c01adc100ac8", "./assets/final/ojos_el.png": "48984b48feb4", "./assets/final/ojos_ella_cafe.png": "d26f6d640e9f", "./assets/final/ojos_ella_rosa.png": "d26f6d640e9f", "./assets/final/silencio.mp3": "f5d0d2d394ae", "./assets/final/ventana_baozi.png": "ce724a2e7e84", "./assets/final/ventana_mantou.png": "666aea8ea398", "./assets/fondo_caminar.webp": "41026efe19f0", "./assets/fonts/LICENSE-OFL.txt": "8ed5cd9e189e", "./assets/fonts/pixelify-sans-latin-400-normal.woff2": "bf971a152148", "./assets/fonts/pixelify-sans-latin-600-normal.woff2": "b1f48e4df7d4", "./assets/fonts/pixelify-sans-latin-700-normal.woff2": "d2aaabdb6b75", "./assets/fonts/pixelify-sans-latin-ext-400-normal.woff2": "b3adb19d68a0", "./assets/fonts/pixelify-sans-latin-ext-600-normal.woff2": "a6e624967a4a", "./assets/fonts/pixelify-sans-latin-ext-700-normal.woff2": "ff161050f286", "./assets/fonts/press-start-2p-latin-400-normal.woff2": "afec86997fda", "./assets/fonts/press-start-2p-latin-ext-400-normal.woff2": "3c7df3a15e17", "./assets/juegos/icono_ritmo.png": "81854bcc99f5", "./assets/juegos/icono_tejo.png": "96b5da3704ea", "./assets/juegos/icono_torre.png": "506e65da5c35", "./assets/lugares/lugar_lingyin.png": "4724e5f33312", "./assets/lugares/lugar_longjing.png": "fc2de2937fef", "./assets/lugares/lugar_westlake.png": "ea974de01fda", "./assets/mantou/cara_aburrido.png": "e268ddd8c7ac", "./assets/mantou/cara_asqueado.png": "13a33673bb51", "./assets/mantou/cara_asustado.png": "ea46fb0a9c6d", "./assets/mantou/cara_cansada.png": "534ec8f99a61", "./assets/mantou/cara_comiendo.png": "d6ff724beb37", "./assets/mantou/cara_curioso.png": "59a8a29e9fd2", "./assets/mantou/cara_dormida.png": "22dfc0562c36", "./assets/mantou/cara_enamorado.png": "b0f2c21a276d", "./assets/mantou/cara_enferma.png": "4d6631cac495", "./assets/mantou/cara_euforico.png": "e659257768fe", "./assets/mantou/cara_feliz.png": "20c1dd209c3e", "./assets/mantou/cara_hambriento.png": "c7f957f3a35d", "./assets/mantou/cara_neutral.png": "859bade942c9", "./assets/mantou/cara_sorprendido.png": "200b3e3ff4c1", "./assets/mantou/cara_triste.png": "85c58f760a35", "./assets/mantou/cuerpo.png": "802d70d5ce5c", "./assets/mantou/cuerpo_sentado.png": "2b255d463bee", "./assets/mascotas/gato_camina.png": "62ea849df5b8", "./assets/mascotas/gato_camina_b.png": "9d6e66b405a9", "./assets/mascotas/gato_camina_c.png": "3ce0824e3d9c", "./assets/mascotas/gato_camina_d.png": "ce35e6147ceb", "./assets/mascotas/gato_dormido.png": "21e1ec3a2a6a", "./assets/mascotas/gato_dormido_b.png": "061285963742", "./assets/mascotas/gato_parpadeo.png": "19eb93e63e76", "./assets/mascotas/gato_sentado.png": "5392d7e234f7", "./assets/mascotas/gato_sentado_b.png": "3450b6ce6915", "./assets/mascotas/perro_camina.png": "718c282e2b8b", "./assets/mascotas/perro_camina_b.png": "94dc3dcc47de", "./assets/mascotas/perro_camina_c.png": "2363a5d7118e", "./assets/mascotas/perro_camina_d.png": "4dc145d6d44a", "./assets/mascotas/perro_contento.png": "fc02361b4a63", "./assets/mascotas/perro_dormido.png": "494a2d6b073a", "./assets/mascotas/perro_dormido_b.png": "7a1e349abfc2", "./assets/mascotas/perro_parpadeo.png": "580804117fd6", "./assets/mascotas/perro_sentado.png": "83b1336c06d6", "./assets/mascotas/perro_sentado_b.png": "f70aa42c6d15", "./assets/mascotas/serpiente_alta.png": "6435e413a472", "./assets/mascotas/serpiente_dormida.png": "299ffb1f0a85", "./assets/mascotas/serpiente_enroscada.png": "743a2b3336d4", "./assets/mascotas/serpiente_lengua.png": "31bd9a79af49", "./assets/mascotas/serpiente_repta.png": "8def6134358b", "./assets/mascotas/serpiente_repta_b.png": "d12cd41cd019", "./assets/mascotas/serpiente_repta_c.png": "2945531c8a7a", "./assets/mascotas/serpiente_repta_d.png": "5ae0ff582ce5", "./assets/mascotas/serpiente_repta_e.png": "f2b1826b9585", "./assets/mascotas/serpiente_repta_f.png": "43dd17bc14da", "./assets/menu/menu_backup.png": "575d697378bf", "./assets/menu/menu_clean.png": "a1e206796409", "./assets/menu/menu_diary.png": "2de13da9dd85", "./assets/menu/menu_feed.png": "c02683648027", "./assets/menu/menu_lens.png": "fa948a9601d3", "./assets/menu/menu_medicine.png": "27a70b71941f", "./assets/menu/menu_npcs.png": "965e7e021340", "./assets/menu/menu_play.png": "32dd047a300c", "./assets/menu/menu_progress.png": "b002c1c91e08", "./assets/menu/menu_sleep.png": "a60a568e0ef2", "./assets/menu/menu_sound.png": "bb52003e610b", "./assets/menu/menu_stats.png": "3a530028edcf", "./assets/menu/menu_traits.png": "7a6360272dd7", "./assets/menu/menu_walk.png": "a300c5eabf62", "./assets/menu/menu_water.png": "90ed2026bbf0", "./assets/npcs/npc_chagee.png": "8210c8a3af6b", "./assets/npcs/npc_chagee_saludo.png": "c0a227346020", "./assets/npcs/npc_mimi.png": "afbb1e099d00", "./assets/npcs/npc_mimi_saludo.png": "58826adcf59b", "./assets/npcs/npc_ruchong.png": "5854a5b69284", "./assets/npcs/npc_ruchong_saludo.png": "de5f75c76b44", "./assets/npcs/npc_usagi.png": "c972dd1716f4", "./assets/npcs/npc_usagi_saludo.png": "818788463c4d", "./assets/pesca/fondo_dia.png": "7e4b46a0929a", "./assets/pesca/fondo_noche.png": "af83dbc48d3a", "./assets/pesca/pez_carpa.png": "1a62cba8ab8d", "./assets/pesca/pez_dorado.png": "76ff60bfdd76", "./assets/pesca/pez_hoja.png": "bf25ba90a625", "./assets/pesca/pez_koi.png": "e8629b782bb3", "./assets/pesca/pez_koi_dorado.png": "108746234af3", "./assets/pesca/pez_sandalia.png": "30b85209b456", "./assets/pieza/balde.png": "3233c1cafccb", "./assets/pieza/bote/balde.png": "496421e299fb", "./assets/pieza/bote/botiquin.png": "50a7f279764a", "./assets/pieza/bote/calendario.png": "e610d96dbe3d", "./assets/pieza/bote/camara.png": "09d5e5b697d4", "./assets/pieza/bote/cielo_amanecer.png": "1fecbd57b159", "./assets/pieza/bote/cielo_atardecer.png": "50363cdcb65c", "./assets/pieza/bote/cielo_dia.png": "b2c01a548308", "./assets/pieza/bote/cielo_noche.png": "73c61e5b578d", "./assets/pieza/bote/corcho.png": "5d1ac58012f0", "./assets/pieza/bote/cortinas.png": "682f9d61b3d0", "./assets/pieza/bote/farol.png": "83f47f09dd3e", "./assets/pieza/bote/farol_apagado.png": "fa76c713fe18", "./assets/pieza/bote/fondo.png": "92a75de09f26", "./assets/pieza/bote/heladera.png": "a28343e99fbe", "./assets/pieza/bote/heladera_adentro.png": "9cf3c9311985", "./assets/pieza/bote/mesita.png": "67908d03b65a", "./assets/pieza/bote/radio.png": "ea3d37c53e01", "./assets/pieza/bote/radio_apagada.png": "c47b0ecf49f8", "./assets/pieza/bote/reloj.png": "93d21f14d065", "./assets/pieza/bote/tele.png": "b83b8d6f894e", "./assets/pieza/bote/vista_amanecer.png": "ed513c533f64", "./assets/pieza/bote/vista_atardecer.png": "170d3dbaf3cc", "./assets/pieza/bote/vista_dia.png": "551fa8d5fc52", "./assets/pieza/bote/vista_noche.png": "f52b30b78735", "./assets/pieza/botiquin.png": "d8d3b758525b", "./assets/pieza/cabana/balde.png": "a9a5a3fde29b", "./assets/pieza/cabana/botiquin.png": "5efe76444b53", "./assets/pieza/cabana/calendario.png": "45d3edb0b1e9", "./assets/pieza/cabana/camara.png": "09d5e5b697d4", "./assets/pieza/cabana/cielo_amanecer.png": "53d69216ad4f", "./assets/pieza/cabana/cielo_atardecer.png": "de0478d851bc", "./assets/pieza/cabana/cielo_dia.png": "44ac82d2b9d2", "./assets/pieza/cabana/cielo_noche.png": "44c7646fab5c", "./assets/pieza/cabana/corcho.png": "b3f763afbcfd", "./assets/pieza/cabana/cortinas.png": "da52a2bc585d", "./assets/pieza/cabana/farol.png": "492a6897f48f", "./assets/pieza/cabana/farol_apagado.png": "910b680f0834", "./assets/pieza/cabana/fondo.png": "0a56aa735607", "./assets/pieza/cabana/heladera.png": "9fa753342a26", "./assets/pieza/cabana/heladera_adentro.png": "f5eb6ab7dce9", "./assets/pieza/cabana/mesita.png": "9c05d29813c8", "./assets/pieza/cabana/radio.png": "4f2815f7d73c", "./assets/pieza/cabana/radio_apagada.png": "78e4536bddfa", "./assets/pieza/cabana/reloj.png": "f2e449f88f3a", "./assets/pieza/cabana/tele.png": "813ccae18983", "./assets/pieza/cabana/vista_amanecer.png": "0a7a94ec3a9f", "./assets/pieza/cabana/vista_atardecer.png": "90c87528b6c0", "./assets/pieza/cabana/vista_dia.png": "a966ab8f1bd3", "./assets/pieza/cabana/vista_noche.png": "911e11287290", "./assets/pieza/calendario.png": "00a5cb9370fc", "./assets/pieza/camara.png": "09d5e5b697d4", "./assets/pieza/cielo_amanecer.png": "3970f4e906e4", "./assets/pieza/cielo_atardecer.png": "86148f6911ac", "./assets/pieza/cielo_dia.png": "4a82b48278fb", "./assets/pieza/cielo_noche.png": "0c992ebf85d3", "./assets/pieza/corcho.png": "a103e54b25f1", "./assets/pieza/cortinas.png": "48ac952df818", "./assets/pieza/farol.png": "913af9b01e76", "./assets/pieza/farol_apagado.png": "bcc163e742ca", "./assets/pieza/finca/balde.png": "1a5d8fbca074", "./assets/pieza/finca/botiquin.png": "02e29ec51680", "./assets/pieza/finca/calendario.png": "7c3c9f3837a3", "./assets/pieza/finca/camara.png": "09d5e5b697d4", "./assets/pieza/finca/cielo_amanecer.png": "98c6b902f5f2", "./assets/pieza/finca/cielo_atardecer.png": "1b514fd3d4e1", "./assets/pieza/finca/cielo_dia.png": "f8c237597288", "./assets/pieza/finca/cielo_noche.png": "f062ed185c3e", "./assets/pieza/finca/corcho.png": "3f8bc7cc5e3b", "./assets/pieza/finca/cortinas.png": "aea588c5a736", "./assets/pieza/finca/farol.png": "1d383ee123b0", "./assets/pieza/finca/farol_apagado.png": "f61f9549a715", "./assets/pieza/finca/fondo.png": "7ae390a91eed", "./assets/pieza/finca/heladera.png": "99670671460e", "./assets/pieza/finca/heladera_adentro.png": "781063e24041", "./assets/pieza/finca/mesita.png": "fa3fce18fb66", "./assets/pieza/finca/radio.png": "096b8f68a8b7", "./assets/pieza/finca/radio_apagada.png": "d2bc8746ff07", "./assets/pieza/finca/reloj.png": "983236df67f8", "./assets/pieza/finca/tele.png": "060ae2c3e9fe", "./assets/pieza/finca/vista_amanecer.png": "b3add74bc851", "./assets/pieza/finca/vista_atardecer.png": "507f6e404492", "./assets/pieza/finca/vista_dia.png": "848d40404aa0", "./assets/pieza/finca/vista_noche.png": "bc7f17401bf6", "./assets/pieza/fondo.png": "793ac6f202a0", "./assets/pieza/guatape/balde.png": "5484ac27b9f3", "./assets/pieza/guatape/botiquin.png": "0f7344ed9624", "./assets/pieza/guatape/calendario.png": "e449229b245b", "./assets/pieza/guatape/camara.png": "09d5e5b697d4", "./assets/pieza/guatape/cielo_amanecer.png": "f545ea70e0d8", "./assets/pieza/guatape/cielo_atardecer.png": "7dc4a52fc1c5", "./assets/pieza/guatape/cielo_dia.png": "fe5a8108f6ff", "./assets/pieza/guatape/cielo_noche.png": "f883200c566d", "./assets/pieza/guatape/corcho.png": "7852fe5a7607", "./assets/pieza/guatape/cortinas.png": "8f5a7713c876", "./assets/pieza/guatape/farol.png": "a62a533fa578", "./assets/pieza/guatape/farol_apagado.png": "bbbabe69a1d0", "./assets/pieza/guatape/fondo.png": "0d82440b9b4b", "./assets/pieza/guatape/heladera.png": "e80a6f8875ea", "./assets/pieza/guatape/heladera_adentro.png": "e033892db532", "./assets/pieza/guatape/mesita.png": "79c347073410", "./assets/pieza/guatape/radio.png": "95460796b276", "./assets/pieza/guatape/radio_apagada.png": "8208f756f708", "./assets/pieza/guatape/reloj.png": "ac452559b897", "./assets/pieza/guatape/tele.png": "5dd52127b76b", "./assets/pieza/guatape/vista_amanecer.png": "2f0a8e392efe", "./assets/pieza/guatape/vista_atardecer.png": "7923c5591ee6", "./assets/pieza/guatape/vista_dia.png": "b18e6e74aad2", "./assets/pieza/guatape/vista_noche.png": "4684290a72b7", "./assets/pieza/heladera.png": "2dfe4b481863", "./assets/pieza/heladera_adentro.png": "a7729531cf36", "./assets/pieza/mapa.png": "cf999144dc8d", "./assets/pieza/mesita.png": "881af3b042fb", "./assets/pieza/radio.png": "c5ff1dc3ecb5", "./assets/pieza/radio_apagada.png": "60883dd3b885", "./assets/pieza/recuerdo_generico.png": "0ba520736964", "./assets/pieza/recuerdo_leifeng.png": "508047d9146b", "./assets/pieza/recuerdo_lingyin.png": "88f5495743d9", "./assets/pieza/recuerdo_longjing.png": "5c7d1d9a0581", "./assets/pieza/recuerdo_westlake.png": "fb608e9087d7", "./assets/pieza/reloj.png": "3be3be19943d", "./assets/pieza/sello_cafe.png": "a3e502f90dcd", "./assets/pieza/sello_casa.png": "af8ec8c547f3", "./assets/pieza/sello_corazon.png": "3a44842fb90a", "./assets/pieza/sello_estrella.png": "ed34cdc976fd", "./assets/pieza/sello_hoja.png": "de3e91813308", "./assets/pieza/sello_pabellon.png": "0f4601087110", "./assets/pieza/sello_pagoda.png": "a77fbd7464ed", "./assets/pieza/sello_templo.png": "b49b118358f9", "./assets/pieza/te/balde.png": "6ae28294476a", "./assets/pieza/te/botiquin.png": "0494e3c29814", "./assets/pieza/te/calendario.png": "8b2055e259aa", "./assets/pieza/te/camara.png": "09d5e5b697d4", "./assets/pieza/te/cielo_amanecer.png": "3970f4e906e4", "./assets/pieza/te/cielo_atardecer.png": "86148f6911ac", "./assets/pieza/te/cielo_dia.png": "4a82b48278fb", "./assets/pieza/te/cielo_noche.png": "0c992ebf85d3", "./assets/pieza/te/corcho.png": "7da83d6cdf74", "./assets/pieza/te/cortinas.png": "c9a4906c4f75", "./assets/pieza/te/farol.png": "91a37688c4a3", "./assets/pieza/te/farol_apagado.png": "f5c0a8f71cb1", "./assets/pieza/te/fondo.png": "6d2d8af09d72", "./assets/pieza/te/heladera.png": "5c3d8f5c5e71", "./assets/pieza/te/heladera_adentro.png": "233b2b5f300d", "./assets/pieza/te/mesita.png": "12cc33706292", "./assets/pieza/te/radio.png": "6dd345c96109", "./assets/pieza/te/radio_apagada.png": "6d428e40a80c", "./assets/pieza/te/reloj.png": "3d00451f4155", "./assets/pieza/te/tele.png": "a558552ebf3c", "./assets/pieza/te/vista_amanecer.png": "5732405737bb", "./assets/pieza/te/vista_atardecer.png": "584791034abf", "./assets/pieza/te/vista_dia.png": "7f741461f883", "./assets/pieza/te/vista_noche.png": "c31e4fb17e5e", "./assets/pieza/tele.png": "0ddd005198c9", "./assets/pieza/vista_amanecer.png": "ac1bf2f3751a", "./assets/pieza/vista_atardecer.png": "2f3724991b6a", "./assets/pieza/vista_dia.png": "84131ce3a949", "./assets/pieza/vista_noche.png": "d71f452a2aab", "./assets/tienda/acc_lentes.png": "073d86dc296e", "./assets/tienda/acc_mochila.png": "c6a557df022a", "./assets/tienda/acc_mono.png": "36bb42b10d2a", "./assets/tienda/acc_osmanto.png": "44716c2c4a45", "./assets/tienda/acc_ruana.png": "8b07ad724f27", "./assets/tienda/acc_silletera.png": "38724cebf875", "./assets/tienda/acc_sombrero.png": "4b81c1d2c2ea", "./assets/tienda/acc_vueltiao.png": "f0417a7e4476", "./assets/tienda/comida_arepa.png": "1d56543daadc", "./assets/tienda/comida_bunuelos.png": "7012f5de71f3", "./assets/tienda/comida_empanada.png": "95ee001ad000", "./assets/tienda/comida_longjing.png": "6fc918916f13", "./assets/tienda/comida_luna.png": "12357ecd8216", "./assets/tienda/comida_osmanto.png": "4e444ab5d671", "./assets/tienda/comida_tinto.png": "75d6f080685d", "./assets/tienda/cuarto_bote.png": "84f941726a8a", "./assets/tienda/cuarto_cabana.png": "f9f83ca99ff0", "./assets/tienda/cuarto_finca.png": "1fffc72abb74", "./assets/tienda/cuarto_guatape.png": "17733a7cd7f7", "./assets/tienda/cuarto_te.png": "3160a9d8a778", "./assets/tienda/deco_banderin.png": "8ef8fe3035bf", "./assets/tienda/deco_bonsai.png": "6fd663e0048b", "./assets/tienda/deco_chiva.png": "ecccca4f58b6", "./assets/tienda/deco_farolitos.png": "79b1a2bf3258", "./assets/tienda/deco_luces.png": "6afbf263a648", "./assets/tienda/deco_marco.png": "372130076067", "./assets/tienda/deco_orquidea.png": "24e177cc2095", "./assets/tienda/deco_pecera.png": "9db7cbb7e670", "./assets/tienda/deco_peluche_baozi.png": "9e51565a11e4", "./assets/tienda/deco_peluche_mantou.png": "080a17085fd8", "./assets/tienda/deco_poster.png": "c7dde7682e90", "./assets/tienda/deco_saco.png": "bc2603695fcf", "./assets/tienda/moneda.png": "bb2b8b1f533b", "./assets/tienda/sticker_brillos.png": "ef550a67f334", "./assets/tienda/sticker_corazones.png": "86f8028d2154", "./assets/tienda/sticker_hoja_loto.png": "ca3ccd5ac5fc", "./assets/tienda/sticker_loto.png": "dfb6682b50c4", "./assets/tienda/valija.png": "0f8d2142e767", "./assets/ui/g_atras@2.png": "f4029268274e", "./assets/ui/g_atras@4.png": "846b83c74092", "./assets/ui/g_burbuja@2.png": "49c48551f7b3", "./assets/ui/g_burbuja@4.png": "6763a070f240", "./assets/ui/g_camara@2.png": "dc4e7f739173", "./assets/ui/g_camara@4.png": "67ab15f645f4", "./assets/ui/g_candado@2.png": "81c499713a31", "./assets/ui/g_candado@4.png": "f0388f09adc3", "./assets/ui/g_cerrar@2.png": "ef9f8f4626c9", "./assets/ui/g_cerrar@4.png": "54e2199649ed", "./assets/ui/g_check@2.png": "103ed8770167", "./assets/ui/g_check@4.png": "08e636f3ea00", "./assets/ui/g_corazon@2.png": "86162fca9b58", "./assets/ui/g_corazon@4.png": "0aa0585d7ec1", "./assets/ui/g_der@2.png": "11b9f9109f97", "./assets/ui/g_der@4.png": "39ccf77fab04", "./assets/ui/g_estrella@2.png": "35d49321bc05", "./assets/ui/g_estrella@4.png": "1ceb392fbb98", "./assets/ui/g_exclama@2.png": "d6a3c4df2313", "./assets/ui/g_exclama@4.png": "b14a2827b123", "./assets/ui/g_girar@2.png": "a5185bf9cb0e", "./assets/ui/g_girar@4.png": "4fc1292c58eb", "./assets/ui/g_gota@2.png": "bba57c633919", "./assets/ui/g_gota@4.png": "0f455363bfec", "./assets/ui/g_izq@2.png": "12f1450c1021", "./assets/ui/g_izq@4.png": "7ae2d22304ff", "./assets/ui/g_libro@2.png": "cff79d5d9608", "./assets/ui/g_libro@4.png": "f29d30ce66cf", "./assets/ui/g_nota@2.png": "bf30f7d163ef", "./assets/ui/g_nota@4.png": "2a2c5e8c2702", "./assets/ui/g_pie@2.png": "e49882c6e908", "./assets/ui/g_pie@4.png": "f3e563713c86", "./assets/ui/g_pin@2.png": "45feda70be14", "./assets/ui/g_pin@4.png": "4c66567a750e", "./assets/ui/g_tenedor@2.png": "eb92fbc1868f", "./assets/ui/g_tenedor@4.png": "3fad0fb76f92", "./css/glifos.css": "1b9e026a7193", "./css/style.css": "873fc3214851", "./icons/mochi-192.png": "19f765341adb", "./icons/mochi-512.png": "1e1fb890608c", "./index.html": "d319e43cbdb3", "./js/actuadores.js": "f4be46ccc973", "./js/amigos.js": "e25b66a6ecea", "./js/arte.js": "8745a9b89ccf", "./js/camara.js": "2bbe14a0b613", "./js/cartas.js": "231e20ea54f5", "./js/clima.js": "5fc2374db694", "./js/config.js": "e438d8810b44", "./js/corchoReal.js": "ff8c17ff15ad", "./js/deseos.js": "af5c2c0bcbc4", "./js/despierto.js": "cb72ebce1f8e", "./js/dialogo.js": "2d183c3f5304", "./js/diario.js": "436e697c623f", "./js/director.js": "926a8329449f", "./js/dondeEstuvimos.js": "a6be9951f3b1", "./js/escena.js": "7f613ccd84e2", "./js/escena_datos.js": "0737693f8d1f", "./js/fechas.js": "0113b2ec468f", "./js/final.js": "6bd916da8cc0", "./js/galeria.js": "aa88dbd55f68", "./js/gameController.js": "8e81ac7a8ba5", "./js/grabacion.js": "37c2a4fe675c", "./js/juego.js": "9dc37d5909a4", "./js/juegoComun.js": "8a8ef5624a52", "./js/lente.js": "8604efb7469f", "./js/main.js": "5d5708f3ebd8", "./js/mapaDia.js": "eacff76810cd", "./js/mapa_final.js": "af825455974f", "./js/mundo.js": "eab47d69b3dc", "./js/musica.js": "0f9fa35780ab", "./js/personaje.js": "e03856c9ea36", "./js/personajes_datos.js": "34cb838d1b21", "./js/pesca.js": "1be9447705cc", "./js/petState.js": "c234cdfbd9da", "./js/pieza.js": "58885329b8d0", "./js/pieza_datos.js": "e5577def5116", "./js/pregunta.js": "fa79a48b8ec5", "./js/recortes.js": "403ad3b019c3", "./js/render.js": "dce166a53647", "./js/ritmo.js": "21a2905f9669", "./js/sensores.js": "bb2c0310b8bd", "./js/sonido.js": "ce1ad12d986d", "./js/storage.js": "b888d3832106", "./js/tejo.js": "adb14ba85829", "./js/tienda.js": "ac9df11c4894", "./js/torre.js": "3963e3bbefe8", "./js/visorMapa.js": "b516d2a46d66", "./manifest.webmanifest": "a9c7ff9b8b0a"}; // tools/deploy.py

const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/style.css",
  "./css/glifos.css",
  "./js/main.js",
  "./js/arte.js",
  "./js/config.js",
  "./js/pregunta.js",
  "./js/dondeEstuvimos.js",
  "./js/mapaDia.js",
  "./js/corchoReal.js",
  "./js/visorMapa.js",
  "./js/fechas.js",
  "./js/juegoComun.js",
  "./js/torre.js",
  "./js/ritmo.js",
  "./js/tejo.js",
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
  "./assets/fondo_caminar.webp",
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
  "final/grieta_blanco.png",
  ...["acc_orejas", "acc_antenas", "acc_boina", "acc_corona", "deco_maceta", "deco_ovni", "deco_te", "deco_cuadro_baozi", "deco_cuadro_mantou"].map((n) => `amigos/${n}.png`),
  // v24: la pesca
  ...["fondo_dia", "fondo_noche", "pez_carpa", "pez_dorado", "pez_koi", "pez_koi_dorado", "pez_sandalia", "pez_hoja"].map((n) => `pesca/${n}.png`),
  // v29: los juegos nuevos de la tele
  ...["icono_torre", "icono_ritmo", "icono_tejo"].map((n) => `juegos/${n}.png`),
  // v23: la tienda
  ...["moneda", "comida_osmanto", "comida_longjing", "comida_luna", "sticker_loto", "sticker_hoja_loto", "sticker_corazones", "sticker_brillos", "acc_mono", "acc_lentes", "acc_sombrero", "acc_osmanto", "deco_farolitos", "deco_pecera", "deco_bonsai", "deco_poster", "deco_luces", "deco_peluche_baozi", "deco_peluche_mantou", "deco_marco", "valija", "comida_arepa", "comida_empanada", "comida_bunuelos", "comida_tinto", "acc_vueltiao", "acc_silletera", "acc_ruana", "acc_mochila", "deco_chiva", "deco_orquidea", "deco_banderin", "deco_saco"].map((n) => `tienda/${n}.png`),
  ...["bote_mascotas", "bote_ella", "bote_reflejo_mascotas", "bote_reflejo_ella", "ventana_baozi", "ventana_mantou"].map((n) => `final/${n}.png`),
  ...["westlake", "longjing", "lingyin"].map((n) => `lugares/lugar_${n}.png`),
  ...["chagee", "mimi", "ruchong", "usagi"].flatMap((n) => [`npcs/npc_${n}.png`, `npcs/npc_${n}_saludo.png`]),
  ...["feed", "water", "clean", "sleep", "medicine", "play", "walk", "lens", "stats", "traits", "npcs", "diary", "progress", "sound", "backup"].map((n) => `menu/menu_${n}.png`),
  ...["anillo", "destello", "corazon_rojo", "corazon_rosa", "huevo", "grieta"].map((n) => `final/${n}.png`),
  ...["lago", "bote", "bote_reflejo", "ojos_el", "ojos_ella_rosa", "ojos_ella_cafe", "boca_hablando"].map((n) => `final/${n}.png`),
  ...["balde.png", "botiquin.png", "calendario.png", "camara.png", "cielo_amanecer.png", "cielo_atardecer.png", "cielo_dia.png", "cielo_noche.png", "corcho.png", "cortinas.png", "vista_amanecer.png", "vista_dia.png", "vista_atardecer.png", "vista_noche.png", "farol.png", "farol_apagado.png", "fondo.png", "heladera.png", "heladera_adentro.png", "mapa.png", "mesita.png", "radio.png", "radio_apagada.png", "recuerdo_generico.png", "recuerdo_leifeng.png", "recuerdo_lingyin.png", "recuerdo_longjing.png", "recuerdo_westlake.png", "reloj.png", "sello_cafe.png", "sello_casa.png", "sello_corazon.png", "sello_estrella.png", "sello_hoja.png", "sello_pabellon.png", "sello_pagoda.png", "sello_templo.png", "tele.png"].map((n) => `pieza/${n}`),
  // v25: los cuartos (tools/cuartos.py) y las mascotas (tools/mascotas.py)
  ...["te", "bote", "cabana", "finca", "guatape"].flatMap((t) => ["balde.png", "botiquin.png", "calendario.png", "camara.png", "cielo_amanecer.png", "cielo_atardecer.png", "cielo_dia.png", "cielo_noche.png", "corcho.png", "cortinas.png", "farol.png", "farol_apagado.png", "fondo.png", "heladera.png", "heladera_adentro.png", "mesita.png", "radio.png", "radio_apagada.png", "reloj.png", "tele.png", "vista_amanecer.png", "vista_atardecer.png", "vista_dia.png", "vista_noche.png"].map((n) => `pieza/${t}/${n}`)),
  ...["te", "bote", "cabana", "finca", "guatape"].map((t) => `tienda/cuarto_${t}.png`),
  ...["gato_camina", "gato_camina_b", "gato_camina_c", "gato_camina_d", "gato_dormido", "gato_dormido_b", "gato_parpadeo", "gato_sentado", "gato_sentado_b", "perro_camina", "perro_camina_b", "perro_camina_c", "perro_camina_d", "perro_contento", "perro_dormido", "perro_dormido_b", "perro_parpadeo", "perro_sentado", "perro_sentado_b", "serpiente_alta", "serpiente_dormida", "serpiente_enroscada", "serpiente_lengua", "serpiente_repta", "serpiente_repta_b", "serpiente_repta_c", "serpiente_repta_d", "serpiente_repta_e", "serpiente_repta_f"].map((n) => `mascotas/${n}.png`),
  "final/despierto.mp4",
  "final/silencio.mp3",
  ...["libro", "pin", "exclama", "gota", "tenedor", "burbuja", "atras", "izq", "der", "camara", "candado", "check", "corazon", "estrella", "nota", "cerrar", "girar", "pie"]
    .flatMap((n) => [`ui/g_${n}@2.png`, `ui/g_${n}@4.png`]),
].map((r) => `./assets/${r}`);

// Musica de rom (opcional): tools/deploy.py reemplaza esta linea por la lista de
// TODOS los assets/musica/*.mp3 que haya (escenas de MUSICA_CLIPS y estaciones de
// ESTACIONES_PROPIAS, con cualquier nombre). Si uno falla, se saltea: no rompe la instalacion.
const MUSICA_OPCIONAL = []; // tools/deploy.py: assets/musica/*.mp3

// Dentro de cada cache: que hash tenia cada archivo. Se escribe AL FINAL de
// la instalacion, asi que una cache sin esto quedo a medias.
const MANIFIESTO = "./__hashes__.json";
const EN_PARALELO = 6; // con GitHub lento desde China, mejor pocos a la vez

/** Baja un archivo salteando la cache del navegador Y la del CDN (?v=). Un reintento. */
async function bajar(u) {
  const url = u + (u.includes("?") ? "&" : "?") + "v=" + (HASHES[u] || VERSION);
  let error = null;
  for (let intento = 0; intento < 2; intento++) {
    try {
      const r = await fetch(new Request(url, { cache: "reload" }));
      if (!r.ok) throw new Error(`${u}: HTTP ${r.status}`);
      // una respuesta redirigida no se puede servir a una navegacion (Safari): se copia limpia
      if (r.redirected) return new Response(await r.blob(), { status: r.status, statusText: r.statusText, headers: r.headers });
      return r;
    } catch (e) {
      error = e;
    }
  }
  throw error;
}

/** {url: hash} de lo que ya esta guardado en las caches de versiones anteriores (completas). */
async function hashesViejos() {
  const viejos = new Map(); // url -> nombre de la cache donde esta con ese hash
  for (const nombre of await caches.keys()) {
    if (nombre === VERSION) continue;
    try {
      const r = await (await caches.open(nombre)).match(MANIFIESTO);
      if (!r) continue;
      const mapa = await r.json();
      for (const [u, h] of Object.entries(mapa)) if (!viejos.has(u + "|" + h)) viejos.set(u + "|" + h, nombre);
    } catch (e) {
      /* cache rara: se ignora */
    }
  }
  return viejos;
}

async function precachear() {
  // una cache con este nombre pero sin manifiesto es una instalacion que quedo a medias: de cero
  const previa = await caches.open(VERSION);
  if (!(await previa.match(MANIFIESTO))) await caches.delete(VERSION);
  const cache = await caches.open(VERSION);
  const viejos = Object.keys(HASHES).length ? await hashesViejos() : new Map();

  const guardar = async (u) => {
    const h = HASHES[u];
    const deAntes = h && viejos.get(u + "|" + h);
    if (deAntes) {
      const r = await (await caches.open(deAntes)).match(u);
      if (r) return cache.put(u, r);
    }
    return cache.put(u, await bajar(u));
  };
  // de a EN_PARALELO; si uno falla, falla todo (y los demas dejan de bajar)
  const cola = [...SHELL, ...ARTE];
  let fallo = false;
  const obreros = Array.from({ length: EN_PARALELO }, async () => {
    while (cola.length && !fallo) {
      try {
        await guardar(cola.shift());
      } catch (e) {
        fallo = true;
        throw e;
      }
    }
  });
  await Promise.all(obreros);
  await Promise.all(MUSICA_OPCIONAL.map((u) => guardar(u).catch(() => {})));
  // ultimo paso: el manifiesto (marca la cache como completa)
  await cache.put(MANIFIESTO, new Response(JSON.stringify(HASHES), { headers: { "Content-Type": "application/json" } }));
}

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    precachear()
      .catch(async (e) => {
        // todo o nada: sin la cache a medias, la version vieja sigue entera
        await caches.delete(VERSION).catch(() => {});
        throw e;
      })
      .then(async () => {
        // Solo se activa de una si no hay ninguna ventana abierta. Con la app
        // abierta ESPERA (ver arriba): el proximo arranque o main.js la activan.
        const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        if (!ventanas.length) await self.skipWaiting();
      }),
  );
});

// main.js pide "activar" solo en un momento tranquilo, y despues recarga.
self.addEventListener("message", (evento) => {
  if (evento.data && evento.data.tipo === "activar") self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== VERSION).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

/** Busca SOLO en la cache de esta version (mientras espera un sw nuevo, conviven dos). */
const deEstaVersion = (pedido, opciones) => caches.open(VERSION).then((c) => c.match(pedido, opciones));

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
    // navegador baja el sw.js nuevo solo, precachea todo junto en otra
    // cache y se aplica en el proximo arranque (ver arriba).
    evento.respondWith(
      deEstaVersion(pedido, { ignoreSearch: esDocumento })
        .then((r) => r || (esDocumento ? deEstaVersion("./index.html") : undefined))
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
    deEstaVersion(pedido).then((enCache) => {
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
