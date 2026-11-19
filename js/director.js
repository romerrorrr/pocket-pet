import * as Grabacion from "./grabacion.js";

import { guardarVideoEnGaleria } from "./galeria.js";

import * as Final from "./final.js";

import { FINAL } from "./config.js";

const conTope = (promesa, ms, valor) => Promise.race([ Promise.resolve(promesa).catch((() => valor)), new Promise((r => setTimeout((() => r(valor)), ms))) ]);

function esc(s) {
    return String(s).replace(/[&<>"]/g, (c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;"
    }[c])));
}

export function renderPin(contenedor, {alOk: alOk, alSalir: alSalir}) {
    let pin = "";
    contenedor.innerHTML = `\n    <div class="pantalla-pin">\n      <div class="encabezado-vista">\n        <button class="boton-volver" id="pin-volver" aria-label="Back"><i class="glifo g-atras"></i></button>\n        <div class="titulo-vista">Settings</div>\n      </div>\n      <div class="pin-puntos" id="pin-puntos">····</div>\n      <div class="pin-teclado">\n        ${[ 1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "borrar" ].map((k => k === "" ? `<span></span>` : k === "borrar" ? `<button class="tecla-pin" data-k="borrar" aria-label="Delete"><i class="glifo g-atras"></i></button>` : `<button class="tecla-pin" data-k="${k}">${k}</button>`)).join("")}\n      </div>\n    </div>`;
    const puntos = contenedor.querySelector("#pin-puntos");
    const pintar = () => puntos.textContent = "●".repeat(pin.length) + "·".repeat(Math.max(0, 4 - pin.length));
    contenedor.querySelector("#pin-volver").addEventListener("click", alSalir);
    for (const b of contenedor.querySelectorAll(".tecla-pin")) {
        b.addEventListener("click", (() => {
            const k = b.dataset.k;
            if (k === "borrar") pin = pin.slice(0, -1); else if (pin.length < 8) pin += k;
            pintar();
            if (pin.length >= 4 && Final.pinCorrecto(pin)) {
                alOk();
            } else if (pin.length >= 8) {
                puntos.classList.add("error");
                setTimeout((() => {
                    pin = "";
                    puntos.classList.remove("error");
                    pintar();
                }), 500);
            }
        }));
    }
}

const AYUDA_MIC_IPHONE = "iPhone: Settings → Apps → Safari → Microphone → Allow. Then close Baozi completely (swipe it away) and open it again.";

function cerrar(ctx) {
    try {
        if (ctx && ctx.state !== "closed") ctx.close().catch((() => {}));
    } catch (e) {}
}

function htmlMedidor() {
    return `<span class="medidor-mic" aria-hidden="true"><span class="medidor-mic-barra"></span></span>`;
}

function moverMedidor(caja, nivel) {
    const barra = caja && caja.querySelector(".medidor-mic-barra");
    if (!barra || nivel == null) return;
    barra.style.width = `${Math.round(Math.min(1, Math.sqrt(nivel) * 1.4) * 100)}%`;
}

function textoMic(r) {
    const nivel = r.pico != null ? ` (level ${Math.round(r.pico * 100)})` : "";
    if (r.ok) return r.medido ? `Mic OK — it hears you${nivel}. The video will have sound.` : "Mic allowed. (Couldn't measure the level here: do 'Test video' and play it back.)";
    if (r.error === "NotAllowedError" || r.error === "SecurityError") return `Mic NOT allowed. ${AYUDA_MIC_IPHONE}`;
    if (r.error === "NotFoundError" || r.error === "sin-pista") return "No microphone found on this device.";
    if (r.error === "NotReadableError") return "Another app is using the mic (a call, a voice memo…). Close it and try again.";
    if (r.error === "bajito") return `The mic works but heard almost nothing${nivel}. Tap again and talk while it listens.`;
    if (r.error === "sin-soporte") return "This browser can't use the microphone.";
    return `Mic allowed but SILENT (${r.error}). Close Baozi completely, open it again and retry. If it stays silent: ${AYUDA_MIC_IPHONE}`;
}

function textoVideo(v) {
    if (!v.conAudio) return `NO SOUND — the mic didn't open. Tap 'Allow microphone'. ${AYUDA_MIC_IPHONE}`;
    if (v.picoAudio == null) return "Recorded with a sound track (play it back to check)";
    if (v.picoAudio <= 0) return "Recorded, but the sound is SILENT. Tap 'Allow microphone' to check it.";
    if (v.picoAudio <= Grabacion.UMBRAL_SONIDO) return `Recorded with sound, but very quiet (level ${Math.round(v.picoAudio * 100)}). Talk while it records.`;
    return `With sound: OK (level ${Math.round(v.picoAudio * 100)})`;
}

export async function renderDirector(contenedor, acciones) {
    const fase = Final.fase();
    const puedeArmar = fase === "dormido";
    const puedeDesarmar = fase === "armado" || fase === "pedido";
    const antes = fase === "dormido" || fase === "armado" || fase === "pedido";
    const puedePausar = fase === "pedido" || fase === "en_curso";
    contenedor.innerHTML = `\n    <div class="pantalla-director">\n      <div class="encabezado-vista">\n        <button class="boton-volver" id="dir-cerrar" aria-label="Back"><i class="glifo g-atras"></i></button>\n        <div class="titulo-vista">Director</div>\n      </div>\n      <div class="director-cuerpo">\n        <div class="director-col">\n          <div class="director-estado fase-${fase}">${esc(Final.descripcionFase())}</div>\n          <div class="director-botones">\n            ${puedePausar ? `<button class="boton" id="dir-pausar">Pause: back to armed</button><div class="director-gps" id="dir-pausar-resultado"></div>` : ""}\n            ${puedeArmar ? `<button class="boton" id="dir-armar">Arm it</button>` : ""}\n            ${puedeDesarmar ? `<button class="boton boton-fantasma" id="dir-desarmar">Disarm</button>` : ""}\n            <div class="director-gps">${esc(fase === "armado" ? `Armed: the GPS can start it by itself (${Math.round(FINAL.lugar.radioMetros)} m around ${FINAL.lugar.nombre}).` : `Not armed = only you can start it. (GPS radius when armed: ${Math.round(FINAL.lugar.radioMetros)} m)`)}</div>\n            <button class="boton boton-fantasma" id="dir-gps"><i class="glifo g-pin"></i> Test location here</button>\n            <div class="director-gps" id="dir-gps-resultado"></div>\n            <button class="boton" id="dir-mic">Allow microphone</button>\n            <div class="director-gps" id="dir-mic-resultado"></div>\n            <button class="boton boton-fantasma" id="dir-permisos"><i class="glifo g-camara"></i> Allow camera + mic</button>\n            <button class="boton boton-fantasma" id="dir-probar-video">Test video (5 s)</button>\n            <div class="director-gps" id="dir-video-resultado"></div>\n            ${fase !== "en_curso" ? `<button class="boton boton-fantasma" id="dir-ensayo">Rehearse everything</button>` : ""}\n            ${acciones.mudanza ? `<button class="boton boton-fantasma" id="dir-mudanza">${acciones.mudanza.estado() === "vive" ? "Move-in test: undo (partner leaves)" : "Move-in test: preview now"}</button>` : ""}\n            ${acciones.probarCocina ? `<button class="boton boton-fantasma" id="dir-cocina">Kitchen test: try any recipe</button>` : ""}\n            ${acciones.tienda ? `<button class="boton boton-fantasma" id="dir-monedas">Shop test: +200 coins</button>\n            <button class="boton boton-fantasma" id="dir-semanas">${acciones.tienda.todo() ? "Shop test: all weeks ON (tap = off)" : "Shop test: show all weeks"}</button>\n            <div class="director-gps" id="dir-tienda-resultado"></div>` : ""}\n            ${antes ? `<button class="boton boton-fantasma" id="dir-pedir">Ask for the photo now</button>` : ""}\n            ${antes ? `<button class="boton boton-fantasma" id="dir-ya">Start the sequence now</button>` : ""}\n            <button class="boton boton-peligro" id="dir-reset">Reset the ending</button>\n          </div>\n        </div>\n        <div class="director-col">\n          <div class="director-sub">Day-of checklist</div>\n          <ul class="director-chequeos" id="dir-chequeos"><li>Checking…</li></ul>\n        </div>\n      </div>\n    </div>`;
    const $ = id => contenedor.querySelector(`#${id}`);
    $("dir-cerrar").addEventListener("click", acciones.cerrar);
    const armar = $("dir-armar");
    if (armar) armar.addEventListener("click", (() => {
        Final.armar();
        renderDirector(contenedor, acciones);
    }));
    const desarmar = $("dir-desarmar");
    if (desarmar) desarmar.addEventListener("click", (() => {
        Final.desarmar();
        renderDirector(contenedor, acciones);
    }));
    $("dir-gps").addEventListener("click", (() => acciones.probarGPS($("dir-gps-resultado"))));
    if ($("dir-ensayo")) $("dir-ensayo").addEventListener("click", acciones.ensayar);
    const pausar = $("dir-pausar");
    if (pausar) {
        pausar.addEventListener("click", (async () => {
            if (pausar.disabled) return;
            pausar.disabled = true;
            pausar.textContent = "Pausing…";
            await conTope(Final.pausar(), 4e3, false);
            renderDirector(contenedor, acciones);
        }));
    }
    if (acciones.mudanza) {
        $("dir-mudanza").addEventListener("click", (() => {
            if (acciones.mudanza.estado() === "vive") {
                acciones.mudanza.deshacer();
                renderDirector(contenedor, acciones);
            } else acciones.mudanza.previa();
        }));
    }
    if (acciones.probarCocina) $("dir-cocina").addEventListener("click", (() => acciones.probarCocina()));
    if (acciones.tienda) {
        $("dir-monedas").addEventListener("click", (() => {
            $("dir-tienda-resultado").textContent = `Coins: ${acciones.tienda.sumar(200)}`;
        }));
        $("dir-semanas").addEventListener("click", (() => {
            acciones.tienda.alternarTodo();
            renderDirector(contenedor, acciones);
        }));
    }
    $("dir-permisos").addEventListener("click", (async () => {
        const b = $("dir-permisos");
        if (b.disabled) return;
        b.disabled = true;
        const r = await conTope(Grabacion.pedirPermisos({
            dejarMicAbierto: Grabacion.grabando()
        }), 2e4, {
            camara: false,
            microfono: false
        });
        b.textContent = `Camera: ${r.camara ? "OK" : "NO"} · Mic: ${r.microfono ? "OK" : "NO"}`;
        b.disabled = false;
        pintarChequeos();
    }));
    $("dir-mic").addEventListener("click", (async () => {
        const b = $("dir-mic");
        const res = $("dir-mic-resultado");
        if (b.disabled) return;
        if (Grabacion.grabando()) {
            res.textContent = "The real video is recording right now — pause first.";
            return;
        }
        b.disabled = true;
        const ctx = Grabacion.contextoParaMedir();
        res.innerHTML = `Say something… ${htmlMedidor()}`;
        const r = await Grabacion.probarMicrofono({
            ctx: ctx,
            alNivel: n => moverMedidor(res, n),
            ms: 4e3
        });
        cerrar(ctx);
        b.disabled = false;
        b.textContent = r.ok ? "Microphone: OK" : "Allow microphone";
        res.innerHTML = textoMic(r);
        pintarChequeos();
    }));
    $("dir-probar-video").addEventListener("click", (async () => {
        const b = $("dir-probar-video");
        const res = $("dir-video-resultado");
        if (b.disabled) return;
        if (Grabacion.grabando()) {
            res.textContent = "The real video is recording right now — pause first.";
            return;
        }
        b.disabled = true;
        const ctx = Grabacion.contextoParaMedir();
        await conTope(Grabacion.pedirPermisos({
            dejarMicAbierto: true
        }), 2e4, null);
        const ok = await conTope(Grabacion.empezar({
            ensayo: true,
            ctxMedidor: ctx
        }), 12e3, false);
        if (!ok) {
            Grabacion.detener();
            res.textContent = "Couldn't record here.";
            b.disabled = false;
            cerrar(ctx);
            return;
        }
        let n = 5;
        b.textContent = `Recording… ${n} (talk!)`;
        res.innerHTML = htmlMedidor();
        const mover = setInterval((() => moverMedidor(res, Grabacion.nivelActual())), 80);
        const tic = setInterval((() => {
            n -= 1;
            if (n > 0) b.textContent = `Recording… ${n} (talk!)`;
        }), 1e3);
        setTimeout((async () => {
            clearInterval(tic);
            clearInterval(mover);
            await Grabacion.detener();
            cerrar(ctx);
            const v = await Grabacion.ultimoVideo({
                ensayo: true
            });
            b.textContent = "Test video (5 s)";
            b.disabled = false;
            if (!v) {
                res.textContent = "Nothing was recorded.";
                return;
            }
            res.innerHTML = `${textoVideo(v)} · <button class="boton chico boton-galeria" type="button" id="dir-guardar-prueba">Save to Photos</button>`;
            $("dir-guardar-prueba").addEventListener("click", (() => guardarVideoEnGaleria(v.blob, "prueba-video")));
            pintarChequeos();
        }), 5e3);
    }));
    const conConfirmacion = (boton, texto, fn) => {
        if (!boton) return;
        let seguro = false;
        boton.addEventListener("click", (() => {
            if (!seguro) {
                seguro = true;
                boton.textContent = texto;
                return;
            }
            fn();
        }));
    };
    conConfirmacion($("dir-pedir"), "Tap again: Baozi asks now", acciones.pedirYa);
    conConfirmacion($("dir-ya"), "Tap again to start it", (() => {
        const b = $("dir-ya");
        if (!b || b.disabled) return;
        b.disabled = true;
        b.textContent = "Starting…";
        Promise.resolve(acciones.empezarYa()).catch((() => {}));
    }));
    conConfirmacion($("dir-reset"), "Tap again to reset", (() => {
        Final.reiniciarTodo();
        renderDirector(contenedor, acciones);
    }));
    async function pintarChequeos() {
        const lista = await conTope(Final.chequeos({
            sonidoHabilitado: acciones.sonidoHabilitado()
        }), 5e3, [ [ false, "Couldn't check right now (tap a button and come back)" ] ]);
        const ul = $("dir-chequeos");
        if (!ul) return;
        ul.innerHTML = lista.map((([ok, texto]) => `<li class="${ok ? "ok" : "ojo"}"><i class="glifo ${ok ? "g-check" : "g-exclama"}"></i><span>${esc(texto)}</span></li>`)).join("");
    }
    await pintarChequeos();
}
