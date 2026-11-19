import { LUGARES, NPCS } from "./mundo.js";

import { limpiarEstilo } from "./estiloDiario.js";

const MAX_ENTRADAS = 400;

export function claveDelDia(fecha = new Date) {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, "0");
    const d = String(fecha.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

export const HORA_CAMBIO_DIA = 4;

export function claveDelDiaLogico(fecha = new Date) {
    if (fecha.getHours() >= HORA_CAMBIO_DIA) return claveDelDia(fecha);
    return claveDelDia(new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() - 1));
}

const DIAS = [ "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" ];

const MESES = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];

export function fechaLegible(clave) {
    const [y, m, d] = clave.split("-").map(Number);
    const fecha = new Date(y, m - 1, d);
    return `${DIAS[fecha.getDay()]}, ${MESES[m - 1]} ${d}`;
}

function entradaVacia(clave) {
    return {
        fecha: clave,
        pasos: 0,
        lugares: [],
        npcs: [],
        cuidados: 0,
        juegos: 0,
        atrapadas: 0,
        hitos: [],
        cartas: [],
        fotos: 0,
        animo: null,
        texto: "",
        pregunta: "",
        escritoEn: 0
    };
}

export const ANIMOS = [ {
    id: "genial",
    nombre: "Amazing",
    ojo: "ojo_especial_euforico.png",
    boca: "boca_especial_euforico.png"
}, {
    id: "bien",
    nombre: "Good",
    ojo: "ojo_base_energia_alta.png",
    boca: "boca_base_feliz.png"
}, {
    id: "normal",
    nombre: "Okay",
    ojo: "ojo_base_energia_neutral.png",
    boca: "boca_base_neutral.png"
}, {
    id: "cansada",
    nombre: "Tired",
    ojo: "ojo_base_energia_baja.png",
    boca: "boca_base_neutral.png"
}, {
    id: "triste",
    nombre: "Sad",
    ojo: "ojo_especial_decepcionado.png",
    boca: "boca_especial_decepcionado.png"
} ];

export const PREGUNTAS = [ "What made you smile today?", "What did you eat that was really good?", "Who did you talk to today?", "What's one small thing you're proud of?", "What was the best moment of the day?", "What would you do again tomorrow?", "Anything funny happen?", "What did you learn today?", "Where would you go right now if you could?", "What song was stuck in your head?", "What are you looking forward to?", "What was hard today?", "What do you want to remember from today?", "Did you see anything beautiful?", "What made you laugh?", "What's something kind someone did?", "What would make tomorrow great?", "How did you take care of yourself today?", "What's on your mind right now?", "If today had a color, what would it be?", "What did you do that felt like 'you'?", "Any little adventure today?", "What surprised you today?", "What are you grateful for tonight?", "What did the sky look like today?", "Best thing you drank today?", "What's one thing you'd tell tomorrow-you?", "Who do you miss today?" ];

export function preguntaDelDia(clave = claveDelDiaLogico()) {
    let h = 0;
    for (const c of clave) h = h * 31 + c.charCodeAt(0) >>> 0;
    return PREGUNTAS[h % PREGUNTAS.length];
}

function sumarDias(clave, n) {
    const [y, m, d] = clave.split("-").map(Number);
    return claveDelDia(new Date(y, m - 1, d + n));
}

const escrita = e => !!e && (!!e.animo || !!(e.texto && e.texto.trim()));

const aTiempo = e => escrita(e) && !e.tarde;

export class Diario {
    constructor(entradas = []) {
        this.entradas = entradas;
    }
    hoy(fecha = new Date) {
        return this._entradaCreando(claveDelDia(fecha));
    }
    _entradaCreando(clave) {
        let entrada = this.entradas.find((e => e.fecha === clave));
        if (!entrada) {
            entrada = entradaVacia(clave);
            this.entradas.push(entrada);
            if (this.entradas.length > MAX_ENTRADAS) this._recortar(entrada);
        }
        return entrada;
    }
    _recortar(nueva = null) {
        let sobran = this.entradas.length - MAX_ENTRADAS;
        if (sobran <= 0) return;
        const porFecha = [ ...this.entradas ].sort(((a, b) => a.fecha < b.fecha ? -1 : 1));
        const fuera = new Set;
        for (const e of porFecha) {
            if (sobran <= 0) break;
            if (e !== nueva && !escrita(e)) {
                fuera.add(e);
                sobran -= 1;
            }
        }
        for (const e of porFecha) {
            if (sobran <= 0) break;
            if (e !== nueva && !fuera.has(e)) {
                fuera.add(e);
                sobran -= 1;
            }
        }
        this.entradas = this.entradas.filter((e => !fuera.has(e)));
    }
    sumarPasos(cantidad, fecha = new Date) {
        this.hoy(fecha).pasos += cantidad;
    }
    entradaDe(clave) {
        return this.entradas.find((e => e.fecha === clave)) || null;
    }
    anotarPasosDelDia(clave, cantidad) {
        const e = this.entradaDe(clave) || (clave === claveDelDia() ? this.hoy() : null);
        if (!e) return 0;
        const n = Math.max(0, Math.floor(cantidad) || 0);
        e.pasosAnotados = Math.max(n, e.pasosAnotados || 0);
        const nuevos = Math.max(0, n - e.pasos);
        e.pasos += nuevos;
        return nuevos;
    }
    pasosAnotados(clave) {
        const e = this.entradaDe(clave);
        return !!e && e.pasosAnotados != null;
    }
    anotarLugar(idLugar, fecha = new Date) {
        const e = this.hoy(fecha);
        if (!e.lugares.includes(idLugar)) e.lugares.push(idLugar);
    }
    anotarNpc(idNpc, fecha = new Date) {
        const e = this.hoy(fecha);
        if (!e.npcs.includes(idNpc)) e.npcs.push(idNpc);
    }
    anotarCuidado(fecha = new Date) {
        this.hoy(fecha).cuidados += 1;
    }
    anotarJuego(atrapadas, fecha = new Date) {
        const e = this.hoy(fecha);
        e.juegos += 1;
        e.atrapadas += atrapadas;
    }
    anotarFoto(fecha = new Date) {
        this.hoy(fecha).fotos += 1;
    }
    anotarHito(texto, fecha = new Date) {
        const e = this.hoy(fecha);
        if (!e.hitos.includes(texto)) e.hitos.push(texto);
    }
    anotarCarta(idCarta, fecha = new Date) {
        const e = this.hoy(fecha);
        if (!e.cartas.includes(idCarta)) e.cartas.push(idCarta);
    }
    escribirHoy({animo: animo = null, texto: texto = "", pregunta: pregunta = ""} = {}, fecha = new Date) {
        const e = this._entradaCreando(claveDelDiaLogico(fecha));
        e.animo = animo;
        e.texto = String(texto || "").slice(0, 400);
        e.pregunta = pregunta;
        e.escritoEn = fecha.getTime();
        return e;
    }
    escribirDia(clave, {animo: animo = null, texto: texto = ""} = {}) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(clave))) return null;
        const e = this._entradaCreando(clave);
        const antes = escrita(e);
        e.animo = animo;
        e.texto = String(texto || "").slice(0, 400);
        if (!e.pregunta) e.pregunta = preguntaDelDia(clave);
        if (!antes && escrita(e)) e.tarde = true;
        return e;
    }
    ponerEstilo(clave, estilo) {
        const e = this.entradaDe(clave);
        if (!e) return null;
        const limpio = limpiarEstilo(estilo);
        if (limpio) e.estilo = limpio; else delete e.estilo;
        return limpio;
    }
    entrada(clave) {
        return this.entradas.find((e => e.fecha === clave)) || null;
    }
    hoyEscrito(fecha = new Date) {
        return escrita(this.entrada(claveDelDiaLogico(fecha)));
    }
    racha(fecha = new Date) {
        let clave = claveDelDiaLogico(fecha);
        if (!aTiempo(this.entrada(clave))) clave = sumarDias(clave, -1);
        let n = 0;
        while (aTiempo(this.entrada(clave))) {
            n += 1;
            clave = sumarDias(clave, -1);
        }
        return n;
    }
    semana(fecha = new Date) {
        const hoy = claveDelDiaLogico(fecha);
        return Array.from({
            length: 7
        }, ((_, i) => {
            const clave = sumarDias(hoy, i - 6);
            const e = this.entrada(clave);
            return {
                clave: clave,
                animo: e ? e.animo : null,
                escrita: escrita(e)
            };
        }));
    }
    recuerdo(fecha = new Date) {
        const anio = new Date(fecha.getFullYear() - 1, fecha.getMonth(), fecha.getDate());
        const mes = new Date(fecha.getFullYear(), fecha.getMonth() - 1, fecha.getDate());
        for (const [cuando, f] of [ [ "One year ago today", anio ], [ "One month ago today", mes ] ]) {
            const e = this.entrada(claveDelDia(f));
            if (escrita(e)) return {
                cuando: cuando,
                entrada: e
            };
        }
        return null;
    }
    entradasRecientes(limite = 60) {
        return this.todasRecientes().slice(0, limite);
    }
    todasRecientes() {
        return [ ...this.entradas ].sort(((a, b) => a.fecha < b.fecha ? 1 : -1));
    }
    primeraFecha() {
        let p = null;
        for (const e of this.entradas) if (!p || e.fecha < p) p = e.fecha;
        return p;
    }
    aObjeto() {
        return {
            entradas: this.entradas
        };
    }
    static desdeObjeto(datos) {
        if (!datos || !Array.isArray(datos.entradas)) return new Diario;
        const entradas = datos.entradas.map((e => {
            const n = {
                ...entradaVacia(e.fecha),
                ...e
            };
            const estilo = limpiarEstilo(e.estilo);
            if (estilo) n.estilo = estilo; else delete n.estilo;
            return n;
        }));
        return new Diario(entradas);
    }
}

function nombreLugar(id) {
    return LUGARES.find((l => l.id === id))?.nombre || (String(id).startsWith("propio_") ? "a special place" : id);
}

function nombreNpc(id) {
    return NPCS.find((n => n.id === id))?.nombre || id;
}

function unirEnIngles(lista) {
    if (lista.length === 0) return "";
    if (lista.length === 1) return lista[0];
    return lista.slice(0, -1).join(", ") + " and " + lista[lista.length - 1];
}

export function resumenDelDia(entrada, lugaresDelDia = 0) {
    const partes = [];
    if (lugaresDelDia >= 2) partes.push(`we went to ${lugaresDelDia} places`);
    if (entrada.lugares.length > 0) {
        partes.push(`we found ${unirEnIngles(entrada.lugares.map(nombreLugar))}`);
    }
    if (entrada.npcs.length > 0) {
        partes.push(`we ran into ${unirEnIngles(entrada.npcs.map(nombreNpc))}`);
    }
    if (entrada.pasos > 0) {
        partes.push(`we walked ${entrada.pasos.toLocaleString("en-US")} steps`);
    }
    if (entrada.juegos > 0) {
        partes.push(entrada.juegos === 1 ? "we played a round" : `we played ${entrada.juegos} rounds`);
    }
    if (entrada.fotos > 0) {
        partes.push(entrada.fotos === 1 ? "we took a photo" : `we took ${entrada.fotos} photos`);
    }
    if (partes.length === 0 && entrada.cuidados > 0) {
        partes.push("a quiet day at home");
    }
    if (partes.length === 0) return entrada.fecha === claveDelDia() ? "Nothing much happened today." : "A quiet day.";
    const frase = unirEnIngles(partes);
    return frase.charAt(0).toUpperCase() + frase.slice(1) + ".";
}

export function fotoDelDia(entrada) {
    if (entrada.lugares.length > 0) return {
        tipo: "lugar",
        id: entrada.lugares[0]
    };
    if (entrada.npcs.length > 0) return {
        tipo: "npc",
        id: entrada.npcs[0]
    };
    return {
        tipo: "cara",
        id: entrada.pasos > 0 ? "feliz" : "neutral"
    };
}
