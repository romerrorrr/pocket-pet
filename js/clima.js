import { contexto, sonidoHabilitado } from "./sonido.js";

const CLAVE = "baozi_clima";

const HANGZHOU = {
    lat: 30.25,
    lon: 120.15
};

const VIGENCIA_MS = 3 * 36e5;

let dato = null;

try {
    dato = JSON.parse(localStorage.getItem(CLAVE) || "null");
} catch (e) {
    dato = null;
}

export function tipoDeCodigo(c) {
    if (c == null) return null;
    if (c <= 1) return "despejado";
    if (c <= 3) return "nublado";
    if (c === 45 || c === 48) return "niebla";
    if (c >= 51 && c <= 57) return "llovizna";
    if (c >= 61 && c <= 67 || c >= 80 && c <= 82) return "lluvia";
    if (c >= 71 && c <= 77 || c === 85 || c === 86) return "nieve";
    if (c >= 95) return "tormenta";
    return "nublado";
}

const MALOS = new Set([ "llovizna", "lluvia", "tormenta", "nieve", "niebla" ]);

export const esMalo = tipo => MALOS.has(tipo);

export const llueve = tipo => tipo === "llovizna" || tipo === "lluvia" || tipo === "tormenta";

export function tipo() {
    if (!dato || Date.now() - dato.t > VIGENCIA_MS) return null;
    return dato.tipo;
}

export function temperatura() {
    if (!dato || Date.now() - dato.t > VIGENCIA_MS || !Number.isFinite(dato.temp)) return null;
    return dato.temp;
}

export const FRASES = {
    llovizna: "Oh! It's drizzling outside…",
    lluvia: "It's raining!! Good day to stay in.",
    tormenta: "A storm?! Did you hear that?!",
    nieve: "It's SNOWING!!",
    niebla: "Whoa… I can't see the lake. So foggy."
};

export async function actualizar(pos = null) {
    const antes = tipo();
    if (typeof fetch === "undefined" || typeof navigator !== "undefined" && navigator.onLine === false) return {
        antes: antes,
        ahora: antes
    };
    const lat = pos && pos.lat || HANGZHOU.lat;
    const lon = pos && pos.lon || HANGZHOU.lon;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(2)}&longitude=${lon.toFixed(2)}&current=weather_code,temperature_2m&timezone=auto`;
    try {
        const ctrl = typeof AbortController !== "undefined" ? new AbortController : null;
        const reloj = ctrl ? setTimeout((() => ctrl.abort()), 8e3) : null;
        const r = await fetch(url, {
            cache: "no-store",
            signal: ctrl ? ctrl.signal : undefined
        });
        if (reloj) clearTimeout(reloj);
        if (!r.ok) return {
            antes: antes,
            ahora: antes
        };
        const j = await r.json();
        const codigo = j && j.current ? j.current.weather_code : null;
        const t = tipoDeCodigo(codigo);
        if (!t) return {
            antes: antes,
            ahora: antes
        };
        const temp = j.current && Number.isFinite(j.current.temperature_2m) ? j.current.temperature_2m : null;
        dato = {
            tipo: t,
            codigo: codigo,
            temp: temp,
            t: Date.now()
        };
        try {
            localStorage.setItem(CLAVE, JSON.stringify(dato));
        } catch (e) {}
        return {
            antes: antes,
            ahora: t
        };
    } catch (e) {
        return {
            antes: antes,
            ahora: antes
        };
    }
}

export function forzar(t) {
    dato = t ? {
        tipo: t,
        codigo: null,
        temp: dato && Number.isFinite(dato.temp) ? dato.temp : null,
        t: Date.now()
    } : null;
}

let lluvia = null;

function ruido(c, segundos) {
    const b = c.createBuffer(1, Math.floor(c.sampleRate * segundos), c.sampleRate);
    const d = b.getChannelData(0);
    let ultimo = 0;
    for (let i = 0; i < d.length; i++) {
        ultimo = (ultimo + .08 * (Math.random() * 2 - 1)) / 1.08;
        d[i] = ultimo * 3 + (Math.random() * 2 - 1) * .25;
    }
    return b;
}

export function sonidoLluvia(nivel) {
    const c = contexto();
    const quiere = nivel > 0 && sonidoHabilitado() && c;
    if (!quiere) {
        if (lluvia) {
            const l = lluvia;
            lluvia = null;
            try {
                l.ganancia.gain.setTargetAtTime(1e-4, l.ctx.currentTime, .4);
                setTimeout((() => {
                    try {
                        l.fuente.stop();
                    } catch (e) {}
                }), 1600);
            } catch (e) {}
        }
        return;
    }
    if (c.state === "suspended") c.resume().catch((() => {}));
    const vol = .02 + .035 * nivel;
    if (lluvia) {
        if (lluvia.nivel !== nivel) {
            lluvia.ganancia.gain.setTargetAtTime(vol, c.currentTime, .6);
            lluvia.nivel = nivel;
        }
        return;
    }
    try {
        const fuente = c.createBufferSource();
        fuente.buffer = ruido(c, 2.5);
        fuente.loop = true;
        const pasaAltos = c.createBiquadFilter();
        pasaAltos.type = "highpass";
        pasaAltos.frequency.value = 500;
        const banda = c.createBiquadFilter();
        banda.type = "lowpass";
        banda.frequency.value = 3200;
        const ganancia = c.createGain();
        ganancia.gain.setValueAtTime(1e-4, c.currentTime);
        ganancia.gain.setTargetAtTime(vol, c.currentTime, .8);
        fuente.connect(pasaAltos);
        pasaAltos.connect(banda);
        banda.connect(ganancia);
        ganancia.connect(c.destination);
        fuente.start();
        lluvia = {
            fuente: fuente,
            ganancia: ganancia,
            nivel: nivel,
            ctx: c
        };
    } catch (e) {
        lluvia = null;
    }
}

export function trueno() {
    const c = contexto();
    if (!c || !sonidoHabilitado()) return;
    if (c.state === "suspended") c.resume().catch((() => {}));
    try {
        const t0 = c.currentTime + .25 + Math.random() * .6;
        const fuente = c.createBufferSource();
        fuente.buffer = ruido(c, 3);
        const grave = c.createBiquadFilter();
        grave.type = "lowpass";
        grave.frequency.value = 180;
        const g = c.createGain();
        g.gain.setValueAtTime(1e-4, t0);
        g.gain.exponentialRampToValueAtTime(.5, t0 + .08);
        g.gain.exponentialRampToValueAtTime(.12, t0 + .7);
        g.gain.exponentialRampToValueAtTime(1e-4, t0 + 2.6);
        fuente.connect(grave);
        grave.connect(g);
        g.connect(c.destination);
        fuente.start(t0);
        fuente.stop(t0 + 2.8);
    } catch (e) {}
}
