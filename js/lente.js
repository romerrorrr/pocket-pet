import * as Personaje from "./personaje.js";

import { ANCHO_FOTO, ALTO_FOTO, recorte43, medirNiveles, aplicarFiltro, fotoTramada, guardarFoto, abrirCaptura, cargarImagen } from "./camara.js";

import { claveDelDia } from "./diario.js";

import * as Sonido from "./sonido.js";

import { vibrar } from "./actuadores.js";

import { guardarFotoEnGaleria } from "./galeria.js";

const MS_ENTRE_CUADROS = 45;

const MS_REVELADO_PEDIDO = 1900;

export const FILTROS = [ {
    id: "pixel",
    nombre: "PIXEL"
}, {
    id: "bn",
    nombre: "B&W"
}, {
    id: "sepia",
    nombre: "SEPIA"
}, {
    id: "vintage",
    nombre: "VINTAGE"
}, {
    id: "color",
    nombre: "COLOR"
} ];

const CLAVE_FILTRO = "baozi_filtro";

const MAX_STICKERS = 8;

const ESCALA_CON_STICKERS = 2;

function leerFiltro() {
    try {
        const f = localStorage.getItem(CLAVE_FILTRO);
        return FILTROS.some((x => x.id === f)) ? f : "pixel";
    } catch (e) {
        return "pixel";
    }
}

export function camaraEnVivoPosible() {
    return !!(window.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

function escaparHtml(s) {
    return String(s).replace(/[&<>"]/g, (c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;"
    }[c])));
}

export function abrirLente(contenedor, opts = {}) {
    const {modo: modo = "foto", lugar: lugar = null, tipoFoto: tipoFoto = "diario", ensayo: ensayo = false, titulo: titulo = `${Personaje.nombre().toUpperCase()} LENS`, alGuardar: alGuardar = () => {}, alSalir: alSalir = () => {}} = opts;
    let frontal = !!opts.frontal;
    const esPedido = modo === "pedido";
    let filtro = esPedido ? "pixel" : leerFiltro();
    const catalogo = esPedido ? [] : opts.stickers || [];
    const grupos = (opts.grupos || []).filter((g => catalogo.some((c => c.grupo === g.id))));
    let grupoAbierto = grupos.length ? grupos[0].id : null;
    let poseAbierta = "parado";
    const puestos = [];
    let elegido = null;
    let stickersDeLaFoto = [];
    contenedor.innerHTML = `\n    <div class="lente modo-${modo}">\n      <div class="visor" id="visor">\n        <canvas class="visor-lienzo" id="visor-lienzo" width="${ANCHO_FOTO}" height="${ALTO_FOTO}"></canvas>\n        <video class="visor-video" id="visor-video" playsinline muted autoplay></video>\n        <div class="visor-esquinas" aria-hidden="true"><i></i><i></i><i></i><i></i></div>\n        <div class="visor-rotulo"><span class="rec"></span>${escaparHtml(titulo)}</div>\n        ${ensayo ? `<div class="visor-rotulo derecha">REHEARSAL</div>` : ""}\n        <div class="visor-flash" id="visor-flash"></div>\n        <div class="visor-aviso oculto" id="visor-aviso"></div>\n        ${esPedido ? "" : `<div class="capa-stickers" id="capa-stickers"></div>\n               <div class="bandeja-stickers oculto" id="bandeja-stickers" data-sin-nombre>\n                 <div class="bandeja-pestanas">\n                   ${grupos.map((g => `<button class="pestana-sticker" data-grupo="${g.id}">${g.html || escaparHtml(g.nombre)}</button>`)).join("")}\n                   <span class="bandeja-poses">\n                     <button class="chip-filtro" data-pose="parado">STAND</button>\n                     <button class="chip-filtro" data-pose="sentado">SIT</button>\n                   </span>\n                   <button class="bandeja-cerrar" id="bandeja-cerrar" aria-label="Close"><i class="glifo g-cerrar"></i></button>\n                 </div>\n                 <div class="bandeja-grilla" id="bandeja-grilla"></div>\n               </div>\n               <div class="visor-filtros" id="visor-filtros">\n                 ${FILTROS.map((f => `<button class="chip-filtro" data-filtro="${f.id}">${f.nombre}</button>`)).join("")}\n               </div>`}\n      </div>\n      <div class="lente-lateral">\n        <button class="boton-icono" id="lente-volver" aria-label="Back"><i class="glifo g-atras"></i></button>\n        ${esPedido || !catalogo.length ? "" : `<button class="boton-icono boton-sticker" id="lente-sticker" aria-label="Stickers">${opts.iconoSticker || ""}</button>`}\n        <button class="obturador" id="lente-obturador" aria-label="Take photo"><span></span></button>\n        <button class="boton-icono" id="lente-girar" aria-label="Flip camera"><i class="glifo g-girar"></i></button>\n      </div>\n      <div class="lente-revelado oculto" id="lente-revelado">\n        <div class="revelado-marco">\n          <canvas class="revelado-lienzo" id="revelado-lienzo" width="${ANCHO_FOTO}" height="${ALTO_FOTO}"></canvas>\n        </div>\n        ${esPedido ? "" : `<div class="revelado-botones">\n                 <button class="boton boton-fantasma" id="revelado-otra">Retake</button>\n                 <button class="boton boton-fantasma boton-galeria" id="revelado-galeria" type="button">Save to Photos</button>\n                 <button class="boton" id="revelado-guardar"><i class="glifo g-check"></i> Keep</button>\n               </div>`}\n      </div>\n    </div>\n  `;
    const $ = id => contenedor.querySelector(`#${id}`);
    const lienzo = $("visor-lienzo");
    const vctx = lienzo.getContext("2d");
    const video = $("visor-video");
    video.muted = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    const trabajo = document.createElement("canvas");
    trabajo.width = ANCHO_FOTO;
    trabajo.height = ALTO_FOTO;
    const tctx = trabajo.getContext("2d", {
        willReadFrequently: true
    });
    let stream = null;
    let pedidoCamara = 0;
    let raf = 0;
    let vivo = true;
    let congelado = false;
    let guardando = false;
    let ultimoCuadro = 0;
    let niveles = null;
    function detenerStream() {
        if (stream) {
            for (const pista of stream.getTracks()) pista.stop();
            stream = null;
        }
        video.srcObject = null;
    }
    async function iniciarStream() {
        const miPedido = ++pedidoCamara;
        detenerStream();
        ocultarAviso();
        if (!camaraEnVivoPosible()) {
            mostrarRespaldo("no-soportado");
            return;
        }
        try {
            const nuevo = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    facingMode: {
                        ideal: frontal ? "user" : "environment"
                    },
                    width: {
                        ideal: 1280
                    },
                    height: {
                        ideal: 960
                    }
                }
            });
            if (!vivo || miPedido !== pedidoCamara) {
                for (const pista of nuevo.getTracks()) pista.stop();
                return;
            }
            stream = nuevo;
            const pistaVideo = stream.getVideoTracks()[0];
            if (pistaVideo) {
                pistaVideo.addEventListener("ended", (() => {
                    if (vivo && stream === nuevo && document.visibilityState === "visible") iniciarStream();
                }));
            }
            video.srcObject = stream;
            await video.play().catch((() => {}));
        } catch (e) {
            if (miPedido !== pedidoCamara || !vivo) return;
            mostrarRespaldo(e && e.name === "NotAllowedError" ? "permiso" : "sin-camara");
        }
    }
    function cuadro(ts) {
        if (!vivo) return;
        raf = requestAnimationFrame(cuadro);
        if (congelado || ts - ultimoCuadro < MS_ENTRE_CUADROS) return;
        if (!video.videoWidth || video.readyState < 2) return;
        ultimoCuadro = ts;
        const r = recorte43(video.videoWidth, video.videoHeight);
        if (lienzo.width !== ANCHO_FOTO) {
            lienzo.width = ANCHO_FOTO;
            lienzo.height = ALTO_FOTO;
        }
        tctx.save();
        if (frontal) {
            tctx.translate(ANCHO_FOTO, 0);
            tctx.scale(-1, 1);
        }
        tctx.drawImage(video, r.sx, r.sy, r.sw, r.sh, 0, 0, ANCHO_FOTO, ALTO_FOTO);
        tctx.restore();
        const datos = tctx.getImageData(0, 0, ANCHO_FOTO, ALTO_FOTO);
        const medidos = medirNiveles(datos);
        niveles = niveles ? {
            lo: niveles.lo + (medidos.lo - niveles.lo) * .2,
            hi: niveles.hi + (medidos.hi - niveles.hi) * .2
        } : medidos;
        aplicarFiltro(datos, niveles, filtro);
        vctx.putImageData(datos, 0, 0);
    }
    function destellar() {
        const f = $("visor-flash");
        if (!f) return;
        f.classList.remove("activo");
        void f.offsetWidth;
        f.classList.add("activo");
    }
    function mostrarRevelado(fuenteLienzo) {
        congelado = true;
        const rev = $("lente-revelado");
        const rl = $("revelado-lienzo");
        rl.width = fuenteLienzo.width;
        rl.height = fuenteLienzo.height;
        rl.getContext("2d").drawImage(fuenteLienzo, 0, 0);
        rev.classList.remove("oculto", "imprimiendo");
        void rev.offsetWidth;
        rev.classList.add("imprimiendo");
        Sonido.sonar("impresora");
        if (esPedido) {
            const volver = $("lente-volver");
            if (volver) volver.disabled = true;
            setTimeout((() => {
                if (vivo) guardarRevelado();
            }), MS_REVELADO_PEDIDO);
        }
    }
    function fotoFinal() {
        const copia = document.createElement("canvas");
        copia.width = ANCHO_FOTO;
        copia.height = ALTO_FOTO;
        copia.getContext("2d").drawImage(lienzo, 0, 0);
        return pegarStickers(copia);
    }
    function pegarStickers(foto) {
        const listos = puestos.filter((p => p.imgs.every((i => i.complete && i.naturalWidth))));
        if (!listos.length) return foto;
        const k = ESCALA_CON_STICKERS;
        const c = document.createElement("canvas");
        c.width = foto.width * k;
        c.height = foto.height * k;
        const g = c.getContext("2d");
        g.imageSmoothingEnabled = false;
        g.drawImage(foto, 0, 0, c.width, c.height);
        for (const p of listos) {
            const lado = p.def.lado || Math.max(p.imgs[0].naturalWidth, p.imgs[0].naturalHeight);
            const esc = Math.max(.5, Math.round(p.s * c.height / lado * 2) / 2);
            for (const i of p.imgs) {
                const w = i.naturalWidth * esc;
                const h = i.naturalHeight * esc;
                g.drawImage(i, Math.round(p.x * c.width - w / 2), Math.round(p.y * c.height - h / 2), w, h);
            }
        }
        return c;
    }
    function sacarFoto() {
        if (congelado || !video.videoWidth) return;
        Sonido.sonar("obturador");
        vibrar(25);
        destellar();
        const copia = fotoFinal();
        stickersDeLaFoto = puestos.map((p => p.def.id));
        setTimeout((() => {
            if (vivo) mostrarRevelado(copia);
        }), 160);
    }
    async function guardarRevelado() {
        if (guardando) return;
        guardando = true;
        const rl = $("revelado-lienzo");
        const dataUrl = rl.toDataURL("image/png");
        let foto = {
            dataUrl: dataUrl,
            dia: claveDelDia(),
            lugar: lugar,
            tipo: tipoFoto,
            filtro: filtro,
            stickers: stickersDeLaFoto
        };
        if (!ensayo) foto = await guardarFoto(foto);
        if (!esPedido) Sonido.sonar("guardado");
        cerrar();
        alGuardar(foto);
    }
    function mostrarAviso(html) {
        const a = $("visor-aviso");
        a.innerHTML = html;
        a.classList.remove("oculto");
    }
    function ocultarAviso() {
        const a = $("visor-aviso");
        if (a) a.classList.add("oculto");
    }
    function mostrarRespaldo(motivo) {
        const textos = {
            permiso: "Baozi needs permission to see through your camera.",
            "sin-camara": "Baozi can't find a camera right now.",
            "no-soportado": "This browser won't let Baozi look through the camera."
        };
        mostrarAviso(`\n      <div class="aviso-texto">${textos[motivo] || textos["sin-camara"]}</div>\n      <div class="aviso-botones">\n        ${motivo !== "no-soportado" ? `<button class="boton boton-fantasma" id="aviso-reintentar">Try again</button>` : ""}\n        <button class="boton" id="aviso-app"><i class="glifo g-camara"></i> Use camera app</button>\n      </div>\n    `);
        const reintentar = $("aviso-reintentar");
        if (reintentar) reintentar.addEventListener("click", iniciarStream);
        $("aviso-app").addEventListener("click", usarAppDeCamara);
    }
    async function usarAppDeCamara() {
        const archivo = await abrirCaptura({
            frontal: frontal
        });
        if (!archivo || !vivo) return;
        try {
            const img = await cargarImagen(archivo);
            const lista = pegarStickers(fotoTramada(img, img.naturalWidth, img.naturalHeight, {
                filtro: filtro
            }));
            stickersDeLaFoto = puestos.map((p => p.def.id));
            ocultarAviso();
            mostrarRevelado(lista);
        } catch (e) {}
    }
    function alCambiarVisibilidad() {
        if (!vivo) return;
        if (document.visibilityState === "hidden") detenerStream(); else if (!stream && !congelado) iniciarStream();
    }
    function cerrar() {
        if (!vivo) return;
        vivo = false;
        cancelAnimationFrame(raf);
        detenerStream();
        document.removeEventListener("visibilitychange", alCambiarVisibilidad);
    }
    $("lente-volver").addEventListener("click", (() => {
        if ($("lente-volver").disabled) return;
        cerrar();
        alSalir();
    }));
    $("lente-girar").addEventListener("click", (() => {
        frontal = !frontal;
        niveles = null;
        iniciarStream();
    }));
    $("lente-obturador").addEventListener("click", sacarFoto);
    function marcarFiltro() {
        for (const b of contenedor.querySelectorAll("[data-filtro]")) b.classList.toggle("activo", b.dataset.filtro === filtro);
    }
    for (const b of contenedor.querySelectorAll("[data-filtro]")) {
        b.addEventListener("click", (() => {
            filtro = b.dataset.filtro;
            niveles = null;
            try {
                localStorage.setItem(CLAVE_FILTRO, filtro);
            } catch (e) {}
            Sonido.sonar("tocar");
            marcarFiltro();
        }));
    }
    marcarFiltro();
    const capa = $("capa-stickers");
    const bandeja = $("bandeja-stickers");
    function ubicar(p) {
        p.el.style.left = `${p.x * 100}%`;
        p.el.style.top = `${p.y * 100}%`;
        p.el.style.height = `${p.s * 100}%`;
        p.el.style.width = `${p.s * 75}%`;
    }
    function elegir(p) {
        elegido = p;
        for (const q of puestos) q.el.classList.toggle("elegido", q === p);
    }
    function quitar(p) {
        const i = puestos.indexOf(p);
        if (i >= 0) puestos.splice(i, 1);
        p.el.remove();
        if (elegido === p) elegir(puestos[puestos.length - 1] || null);
        Sonido.sonar("tocar");
    }
    function poner(def) {
        if (puestos.length >= MAX_STICKERS) quitar(puestos[0]);
        const el = document.createElement("div");
        el.className = "visor-sticker";
        el.dataset.sticker = def.id;
        el.innerHTML = `${def.html}<button class="sticker-quitar" aria-label="Remove sticker"><i class="glifo g-cerrar"></i></button>`;
        const n = puestos.length;
        const p = {
            def: def,
            el: el,
            x: Math.min(.85, .5 + (n % 3 - 1) * .18),
            y: .56,
            s: def.grupo === "extras" ? .24 : .62,
            imgs: def.capas.map((src => {
                const i = new Image;
                i.src = src;
                return i;
            }))
        };
        capa.appendChild(el);
        puestos.push(p);
        ubicar(p);
        elegir(p);
        movible(p);
        el.querySelector(".sticker-quitar").addEventListener("pointerdown", (ev => {
            ev.stopPropagation();
            ev.preventDefault();
            quitar(p);
        }));
    }
    function movible(p) {
        const dedos = new Map;
        let inicio = null;
        const visorEl = $("visor");
        const el = p.el;
        el.addEventListener("pointerdown", (ev => {
            el.setPointerCapture(ev.pointerId);
            dedos.set(ev.pointerId, {
                x: ev.clientX,
                y: ev.clientY
            });
            inicio = {
                x: p.x,
                y: p.y,
                s: p.s,
                dedos: new Map(dedos)
            };
            elegir(p);
            capa.appendChild(el);
            ev.preventDefault();
        }));
        el.addEventListener("pointermove", (ev => {
            if (!dedos.has(ev.pointerId) || !inicio) return;
            dedos.set(ev.pointerId, {
                x: ev.clientX,
                y: ev.clientY
            });
            const r = visorEl.getBoundingClientRect();
            const ps = [ ...dedos.values() ];
            const ps0 = [ ...inicio.dedos.values() ];
            if (ps.length >= 2 && ps0.length >= 2) {
                const d = Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y);
                const d0 = Math.hypot(ps0[0].x - ps0[1].x, ps0[0].y - ps0[1].y) || 1;
                p.s = Math.min(1.2, Math.max(.16, inicio.s * (d / d0)));
            } else if (ps.length === 1 && ps0.length >= 1) {
                p.x = Math.min(1, Math.max(0, inicio.x + (ps[0].x - ps0[0].x) / r.width));
                p.y = Math.min(1.1, Math.max(0, inicio.y + (ps[0].y - ps0[0].y) / r.height));
            }
            ubicar(p);
        }));
        const soltar = ev => {
            dedos.delete(ev.pointerId);
            inicio = {
                x: p.x,
                y: p.y,
                s: p.s,
                dedos: new Map(dedos)
            };
        };
        el.addEventListener("pointerup", soltar);
        el.addEventListener("pointercancel", soltar);
        el.addEventListener("wheel", (ev => {
            ev.preventDefault();
            p.s = Math.min(1.2, Math.max(.16, p.s * (ev.deltaY < 0 ? 1.08 : .93)));
            ubicar(p);
        }), {
            passive: false
        });
    }
    function pintarBandeja() {
        if (!bandeja) return;
        for (const b of bandeja.querySelectorAll("[data-grupo]")) b.classList.toggle("activo", b.dataset.grupo === grupoAbierto);
        const conPoses = catalogo.some((c => c.grupo === grupoAbierto && c.pose));
        bandeja.querySelector(".bandeja-poses").classList.toggle("oculto", !conPoses);
        for (const b of bandeja.querySelectorAll("[data-pose]")) b.classList.toggle("activo", b.dataset.pose === poseAbierta);
        const lista = catalogo.filter((c => c.grupo === grupoAbierto && (!conPoses || !c.pose || c.pose === poseAbierta)));
        const grilla = $("bandeja-grilla");
        grilla.innerHTML = lista.map((c => `<button class="item-sticker" data-id="${escaparHtml(c.id)}" aria-label="${escaparHtml(c.nombre || c.id)}">${c.html}</button>`)).join("");
        for (const b of grilla.querySelectorAll("[data-id]")) {
            b.addEventListener("click", (() => {
                const def = catalogo.find((c => c.id === b.dataset.id));
                if (!def) return;
                poner(def);
                Sonido.sonar("tocar");
                bandeja.classList.add("oculto");
                $("lente-sticker").classList.remove("activo");
            }));
        }
    }
    if (bandeja) {
        $("lente-sticker").addEventListener("click", (() => {
            const abrir = bandeja.classList.contains("oculto");
            bandeja.classList.toggle("oculto", !abrir);
            $("lente-sticker").classList.toggle("activo", abrir);
            if (abrir) pintarBandeja();
            Sonido.sonar("tocar");
        }));
        $("bandeja-cerrar").addEventListener("click", (() => {
            bandeja.classList.add("oculto");
            $("lente-sticker").classList.remove("activo");
        }));
        for (const b of bandeja.querySelectorAll("[data-grupo]")) {
            b.addEventListener("click", (() => {
                grupoAbierto = b.dataset.grupo;
                pintarBandeja();
            }));
        }
        for (const b of bandeja.querySelectorAll("[data-pose]")) {
            b.addEventListener("click", (() => {
                poseAbierta = b.dataset.pose;
                pintarBandeja();
            }));
        }
    }
    if (!esPedido) {
        $("revelado-otra").addEventListener("click", (() => {
            $("lente-revelado").classList.add("oculto");
            congelado = false;
            if (!stream) iniciarStream();
        }));
        $("revelado-guardar").addEventListener("click", guardarRevelado);
        let guardandoEnGaleria = false;
        $("revelado-galeria").addEventListener("click", (async () => {
            const b = $("revelado-galeria");
            if (guardandoEnGaleria || !b) return;
            guardandoEnGaleria = true;
            Sonido.sonar("tocar");
            const r = await guardarFotoEnGaleria($("revelado-lienzo"), lugar ? `baozi-${lugar}` : "baozi");
            guardandoEnGaleria = false;
            const aviso = {
                compartido: "Saved ♥",
                descargado: "Downloaded ♥",
                error: "Couldn't save"
            }[r];
            if (!aviso || !b.isConnected) return;
            if (r !== "error") Sonido.sonar("guardado");
            b.textContent = aviso;
            clearTimeout(b._aviso);
            b._aviso = setTimeout((() => {
                b.textContent = "Save to Photos";
            }), 1800);
        }));
    }
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    vctx.fillStyle = "#181618";
    vctx.fillRect(0, 0, ANCHO_FOTO, ALTO_FOTO);
    iniciarStream();
    raf = requestAnimationFrame(cuadro);
    return {
        cerrar: cerrar
    };
}
