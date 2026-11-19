import { LUGARES, NPCS, distanciaLugar } from "./mundo.js";

export const MAX_CORAZONES = 5;

let accesoriosExtra = () => [];

export function registrarAccesoriosExtra(fn) {
    accesoriosExtra = typeof fn === "function" ? fn : () => [];
}

export const REGALOS = {
    "sticker:usagi": {
        tipo: "sticker",
        npc: "usagi",
        nombre: "Usagi sticker",
        arte: "npcs/npc_usagi.png"
    },
    "sticker:mimi": {
        tipo: "sticker",
        npc: "mimi",
        nombre: "Mimi sticker",
        arte: "npcs/npc_mimi.png"
    },
    "sticker:ruchong": {
        tipo: "sticker",
        npc: "ruchong",
        nombre: "Ruchong sticker",
        arte: "npcs/npc_ruchong.png"
    },
    "sticker:chagee": {
        tipo: "sticker",
        npc: "chagee",
        nombre: "Chagee sticker",
        arte: "npcs/npc_chagee.png"
    },
    "acc:orejas": {
        tipo: "accesorio",
        id: "orejas",
        nombre: "Bunny ears",
        arte: "amigos/acc_orejas.png"
    },
    "acc:antenas": {
        tipo: "accesorio",
        id: "antenas",
        nombre: "Antennae",
        arte: "amigos/acc_antenas.png"
    },
    "acc:boina": {
        tipo: "accesorio",
        id: "boina",
        nombre: "Painter's beret",
        arte: "amigos/acc_boina.png"
    },
    "acc:corona": {
        tipo: "accesorio",
        id: "corona",
        nombre: "Opera crown",
        arte: "amigos/acc_corona.png"
    },
    "deco:maceta": {
        tipo: "decoracion",
        id: "maceta",
        nombre: "Carrot pot",
        arte: "amigos/deco_maceta.png"
    },
    "deco:ovni": {
        tipo: "decoracion",
        id: "ovni",
        nombre: "UFO lamp",
        arte: "amigos/deco_ovni.png"
    },
    "deco:cuadro": {
        tipo: "decoracion",
        id: "cuadro",
        nombre: "Ruchong's painting",
        arte: "amigos/deco_cuadro_baozi.png"
    },
    "deco:te": {
        tipo: "decoracion",
        id: "te",
        nombre: "Tea set",
        arte: "amigos/deco_te.png"
    }
};

export const AMIGOS = {
    usagi: {
        linea: "Oh, hi. I was just listening to the leaves. Walk with me a little?",
        lineaReencuentro: "You again! The trees told me you'd come.",
        lineaEnamorado: "You're my favorite person to be quiet with.",
        lineaMejorAmigo: "Best friends sit in silence and it's never awkward. Like us.",
        secretos: [ {
            corazones: 2,
            lugar: "jiuxi",
            texto: "Psst… past the tea hills there's a forest where nine creeks sing. It's on your map now."
        }, {
            corazones: 4,
            lugar: "huanglong",
            texto: "Want a secret? Yellow Dragon Cave. There's music, and a dragon that spits water. I put it on your map."
        } ],
        misiones: [ {
            id: "usagi_pasos",
            tipo: "pasos",
            meta: 3e3,
            resumen: "Walk 3,000 steps in one day",
            pide: "Let's walk together today. 3,000 steps? Tell Baozi tonight how many you did!",
            gracias: "3,000 steps! My paws are tired. Here, a sticker of me.",
            regalo: "sticker:usagi"
        }, {
            id: "usagi_jiuxi",
            tipo: "lugar",
            lugar: "jiuxi",
            resumen: "Visit Nine Creeks in Misty Forest",
            pide: "Take me to Nine Creeks? I heard the water sings.",
            gracias: "The creeks really sang. These are for you… bunny ears!",
            regalo: "acc:orejas"
        }, {
            id: "usagi_amanecer",
            tipo: "foto",
            categoria: "lake",
            momento: "amanecer",
            resumen: "A photo at the lake at sunrise (6–9 am)",
            pide: "Could you take a photo of the lake at sunrise? I always sleep through it.",
            gracias: "The lake at sunrise… so pink. I grew this carrot for your room.",
            regalo: "deco:maceta"
        } ]
    },
    mimi: {
        linea: "Hold still… perfect. I'm collecting Earth photos. You're a good one.",
        lineaReencuentro: "Earthling! The light is great today. Found any good angles?",
        lineaEnamorado: "I've taken a hundred photos of you. Don't tell my planet.",
        lineaMejorAmigo: "On my planet, you'd have a statue. Best Earth friend ever.",
        secretos: [ {
            corazones: 2,
            lugar: "baochu",
            texto: "Secret coordinates: Baochu Pagoda, up on the hill. Best sunset on this planet. It's on your map."
        }, {
            corazones: 4,
            lugar: "gongchen",
            texto: "Gongchen Bridge at night. The canal looks like outer space. Added it to your map."
        } ],
        misiones: [ {
            id: "mimi_lago",
            tipo: "coleccion",
            categoria: "lake",
            meta: 5,
            resumen: "Stamp 5 places around the lake",
            pide: "My album needs the lake. Can you stamp 5 places around West Lake?",
            gracias: "5 lake places! My album is glowing. Take this sticker of me.",
            regalo: "sticker:mimi"
        }, {
            id: "mimi_color",
            tipo: "foto",
            filtro: "color",
            sticker: "npc-mimi",
            resumen: "A COLOR photo with Mimi's sticker",
            pide: "Take a COLOR photo with me in it! Use my sticker.",
            gracias: "I'm famous now! Here, antennae. Now we can call my planet.",
            regalo: "acc:antenas"
        }, {
            id: "mimi_baochu",
            tipo: "foto",
            lugar: "baochu",
            momento: "atardecer",
            resumen: "A photo at Baochu Pagoda at sunset (6–9 pm)",
            pide: "Baochu Pagoda at sunset. That's the shot.",
            gracias: "The perfect shot. This UFO lamp is for your room. It's from home.",
            regalo: "deco:ovni"
        } ]
    },
    ruchong: {
        linea: "Oh! Um… hi. I'm painting. Do you like it? It's not finished.",
        lineaReencuentro: "You came back… I saved you a little spot in my painting.",
        lineaEnamorado: "I keep using your colors without noticing.",
        lineaMejorAmigo: "I painted us side by side. Best friends look like that, right?",
        secretos: [ {
            corazones: 2,
            lugar: "faxi",
            texto: "There's a temple with yellow walls… Faxi Temple. I paint it when I'm sad. It's on your map."
        }, {
            corazones: 4,
            lugar: "xixi",
            texto: "Xixi Wetland. The water there is every green I know. I put it on your map."
        } ],
        misiones: [ {
            id: "ruchong_diario",
            tipo: "diario",
            meta: 3,
            resumen: "Write in the diary 3 days in a row",
            pide: "Could you write in your diary 3 days in a row? Words are like paint.",
            gracias: "Three pages! You're an artist too. Um, here… a sticker of me.",
            regalo: "sticker:ruchong"
        }, {
            id: "ruchong_faxi",
            tipo: "foto",
            lugar: "faxi",
            filtro: "sepia",
            resumen: "A SEPIA photo at Faxi Temple",
            pide: "A SEPIA photo at Faxi Temple? For my painting…",
            gracias: "It's perfect for my painting. This beret is for you. Artists wear them.",
            regalo: "acc:boina"
        }, {
            id: "ruchong_xixi",
            tipo: "lugar",
            lugar: "xixi",
            resumen: "Visit Xixi Wetland",
            pide: "Visit Xixi with me? I want to see all the greens.",
            gracias: "I finished it. It's Baozi! Hang it in your room?",
            regalo: "deco:cuadro"
        } ]
    },
    chagee: {
        linea: "Darling! Tea is poured, the stage is set. Sit with me a moment.",
        lineaReencuentro: "My favorite audience returns! Bravo, bravo.",
        lineaEnamorado: "Every show I do, I do for you. Don't let it go to your head.",
        lineaMejorAmigo: "Front row, always reserved for you, darling. That's what best friends get.",
        secretos: [ {
            corazones: 2,
            lugar: "meijiawu",
            texto: "A secret, darling: Meijiawu Tea Village. The best tea hides in the hills. It's on your map."
        }, {
            corazones: 4,
            lugar: "teatro",
            texto: "The Grand Theater. When the lights go down… magic. It's on your map now."
        } ],
        misiones: [ {
            id: "chagee_te",
            tipo: "comer",
            item: "te",
            resumen: "Give Baozi a milk tea",
            pide: "Share a milk tea with Baozi. Everyone deserves a treat.",
            gracias: "Sweet, sweet milk tea. Take my sticker, darling.",
            regalo: "sticker:chagee"
        }, {
            id: "chagee_juego",
            tipo: "juego",
            meta: 30,
            resumen: "Score 30 in Snack Rain",
            pide: "Score 30 in Snack Rain. Give me some drama!",
            gracias: "What a performance! Wear this crown, you've earned it.",
            regalo: "acc:corona"
        }, {
            id: "chagee_meijiawu",
            tipo: "lugar",
            lugar: "meijiawu",
            resumen: "Visit Meijiawu Tea Village",
            pide: "Meet me at Meijiawu. Tea is on me.",
            gracias: "The finest tea, for the finest friend. A tea set for your table.",
            regalo: "deco:te"
        } ]
    }
};

export const LUGARES_SECRETOS = new Set(Object.values(AMIGOS).flatMap((a => a.secretos.map((s => s.lugar)))));

const lugarPorId = id => LUGARES.find((l => l.id === id));

export function lugarCercano(lat, lon) {
    let mejor = null;
    let mejorD = Infinity;
    for (const l of LUGARES) {
        const d = distanciaLugar(lat, lon, l);
        if (d <= l.radioMetros && d < mejorD) {
            mejor = l;
            mejorD = d;
        }
    }
    return mejor;
}

function misionCumplida(m, ev) {
    switch (m.tipo) {
      case "pasos":
        return ev.tipo === "estado" && (ev.pasosHoy || 0) >= m.meta;

      case "coleccion":
        return ev.tipo === "estado" && [ ...ev.sellados || [] ].filter((id => (lugarPorId(id) || {}).categoria === m.categoria)).length >= m.meta;

      case "diario":
        return ev.tipo === "estado" && (ev.racha || 0) >= m.meta;

      case "lugar":
        if (ev.tipo === "sello") return ev.lugar === m.lugar;
        if (ev.tipo === "posicion") {
            const l = lugarPorId(m.lugar);
            return !!l && distanciaLugar(ev.lat, ev.lon, l) <= l.radioMetros;
        }
        return false;

      case "foto":
        {
            if (ev.tipo !== "foto") return false;
            if (m.filtro && ev.filtro !== m.filtro) return false;
            if (m.sticker && !(ev.stickers || []).includes(m.sticker)) return false;
            if (m.momento && ev.momento !== m.momento) return false;
            const l = ev.lugar ? lugarPorId(ev.lugar) : null;
            if (m.lugar && (!l || l.id !== m.lugar)) return false;
            if (m.categoria && (!l || l.categoria !== m.categoria)) return false;
            return true;
        }

      case "comer":
        return ev.tipo === "comer" && ev.item === m.item;

      case "juego":
        return ev.tipo === "juego" && (ev.puntos || 0) >= m.meta;

      default:
        return false;
    }
}

export class RegistroAmigos {
    constructor() {
        this.misiones = Object.fromEntries(NPCS.map((n => [ n.id, {
            n: 0,
            estado: "ninguna"
        } ])));
        this.revelados = new Set;
        this.premios = new Set;
        this.puesto = null;
    }
    corazones(npcId, npcsReg) {
        const veces = npcsReg && npcsReg.vecesEncontrado[npcId] || 0;
        return Math.min(MAX_CORAZONES, veces + (this.misiones[npcId] ? this.misiones[npcId].n : 0));
    }
    misionActual(npcId) {
        const a = AMIGOS[npcId];
        const m = this.misiones[npcId];
        if (!a || !m || m.n >= a.misiones.length) return null;
        return a.misiones[m.n];
    }
    estado(npcId) {
        return this.misiones[npcId] ? this.misiones[npcId].estado : "ninguna";
    }
    secretoNuevo(npcId, npcsReg) {
        const a = AMIGOS[npcId];
        if (!a) return null;
        const c = this.corazones(npcId, npcsReg);
        return a.secretos.find((s => c >= s.corazones && !this.revelados.has(s.lugar))) || null;
    }
    revelar(lugarId) {
        this.revelados.add(lugarId);
    }
    lugarVisible(lugarId, sellados) {
        return !LUGARES_SECRETOS.has(lugarId) || this.revelados.has(lugarId) || sellados && sellados.has(lugarId);
    }
    misionParaOfrecer(npcId, npcsReg) {
        const m = this.misionActual(npcId);
        if (!m || this.estado(npcId) !== "ninguna") return null;
        if (this.corazones(npcId, npcsReg) < this.misiones[npcId].n + 1) return null;
        const secreto = m.lugar && LUGARES_SECRETOS.has(m.lugar) && !this.revelados.has(m.lugar);
        return secreto ? null : m;
    }
    aceptar(npcId) {
        if (this.misionActual(npcId) && this.estado(npcId) === "ninguna") this.misiones[npcId].estado = "activa";
    }
    evento(ev) {
        const listos = [];
        for (const npcId of Object.keys(this.misiones)) {
            if (this.estado(npcId) !== "activa") continue;
            const m = this.misionActual(npcId);
            if (m && misionCumplida(m, ev)) {
                this.misiones[npcId].estado = "lista";
                listos.push(npcId);
            }
        }
        return listos;
    }
    regaloPendiente() {
        return Object.keys(this.misiones).find((id => this.estado(id) === "lista")) || null;
    }
    entregar(npcId) {
        if (this.estado(npcId) !== "lista") return null;
        const mision = this.misionActual(npcId);
        this.premios.add(mision.regalo);
        this.misiones[npcId] = {
            n: this.misiones[npcId].n + 1,
            estado: "ninguna"
        };
        const regalo = REGALOS[mision.regalo];
        if (regalo.tipo === "accesorio" && !this.puesto) this.puesto = regalo.id;
        return {
            mision: mision,
            regalo: regalo,
            clave: mision.regalo
        };
    }
    delTipo(tipo) {
        return [ ...this.premios ].map((k => REGALOS[k])).filter((r => r && r.tipo === tipo));
    }
    accesorios() {
        return this.delTipo("accesorio").map((r => r.id));
    }
    decoraciones() {
        return this.delTipo("decoracion").map((r => r.id));
    }
    stickers() {
        return this.delTipo("sticker").map((r => r.npc));
    }
    poner(accesorio) {
        this.puesto = accesorio && (this.accesorios().includes(accesorio) || accesoriosExtra().includes(accesorio)) ? accesorio : null;
    }
    lineaPara(npcId, npcsReg, progreso = "") {
        const a = AMIGOS[npcId];
        if (!a) return "";
        if (this.estado(npcId) === "activa") {
            const m = this.misionActual(npcId);
            return `Remember? ${m.resumen}.${progreso ? ` (${progreso})` : ""} I believe in you!`;
        }
        const veces = npcsReg && npcsReg.vecesEncontrado[npcId] || 0;
        if (veces >= MAX_CORAZONES) return npcsReg && npcsReg.amor && npcsReg.amor !== npcId ? a.lineaMejorAmigo : a.lineaEnamorado;
        if (veces >= 2) return a.lineaReencuentro;
        return a.linea;
    }
    aObjeto() {
        return {
            misiones: this.misiones,
            revelados: [ ...this.revelados ],
            premios: [ ...this.premios ],
            puesto: this.puesto
        };
    }
    static desdeObjeto(datos) {
        const r = new RegistroAmigos;
        if (!datos || typeof datos !== "object") return r;
        for (const id of Object.keys(r.misiones)) {
            const m = datos.misiones && datos.misiones[id];
            if (m && Number.isInteger(m.n) && [ "ninguna", "activa", "lista" ].includes(m.estado)) r.misiones[id] = {
                n: Math.max(0, Math.min(3, m.n)),
                estado: m.estado
            };
        }
        r.revelados = new Set((datos.revelados || []).filter((id => LUGARES_SECRETOS.has(id))));
        r.premios = new Set((datos.premios || []).filter((k => REGALOS[k])));
        r.puesto = typeof datos.puesto === "string" ? datos.puesto : null;
        if (r.puesto && !r.accesorios().includes(r.puesto) && !accesoriosExtra().includes(r.puesto)) r.puesto = null;
        return r;
    }
}

export function progresoDe(m, ctx) {
    if (!m) return "";
    if (m.tipo === "pasos") return `${Math.min(m.meta, ctx.pasosHoy || 0).toLocaleString("en-US")} / ${m.meta.toLocaleString("en-US")} steps today`;
    if (m.tipo === "coleccion") {
        const n = [ ...ctx.sellados || [] ].filter((id => (lugarPorId(id) || {}).categoria === m.categoria)).length;
        return `${Math.min(n, m.meta)} / ${m.meta}`;
    }
    if (m.tipo === "diario") return `${Math.min(ctx.racha || 0, m.meta)} / ${m.meta} days`;
    if (m.tipo === "juego") return `best ${ctx.record || 0}`;
    return "";
}
