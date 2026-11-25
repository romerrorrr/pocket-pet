const esSrc = (item, ...nombres) => typeof item === "string" && nombres.some((n => item.endsWith(n)));

const DULCES = [ "comida_manzana.png", "comida_naranja.png", "comida_osmanto.png", "comida_luna.png" ];

const hora = ev => Number.isFinite(ev.hora) ? ev.hora : (new Date).getHours();

export const DESEOS = [ {
    id: "te",
    texto: "I really want milk tea today!",
    cumple: ev => ev.tipo === "comer" && esSrc(ev.item, "bebida_te.png")
}, {
    id: "dulce",
    texto: "Something sweet, please? Fruit or a treat!",
    cumple: ev => ev.tipo === "comer" && esSrc(ev.item, ...DULCES)
}, {
    id: "dumplings",
    texto: "Dumplings for dinner? (after 6 pm)",
    cumple: ev => ev.tipo === "comer" && esSrc(ev.item, "comida_dumpling.png") && hora(ev) >= 18
}, {
    id: "bano",
    texto: "Bubble bath time!",
    cumple: ev => ev.tipo === "cuidar" && ev.accion === "clean"
}, {
    id: "mimos",
    texto: "Pet me five times ♥",
    meta: 5,
    cumple: (ev, p) => ev.tipo === "mimo" ? p + 1 : false
}, {
    id: "snack15",
    texto: "Let's play Snack Rain! Catch 15 snacks in one game.",
    cumple: ev => ev.tipo === "juego" && (ev.atrapadas || 0) >= 15
}, {
    id: "snack40",
    texto: "Can you get 40 points in Snack Rain?",
    cumple: ev => ev.tipo === "juego" && (ev.puntos || 0) >= 40
}, {
    id: "pesca3",
    texto: "Let's go fishing! Catch 3 fish today.",
    meta: 3,
    cumple: (ev, p) => ev.tipo === "pesca" ? p + (ev.peces || []).filter((x => x !== "sandalia" && x !== "hoja")).length : false
}, {
    id: "koi",
    texto: "I want to see a koi! Can you catch one?",
    cumple: ev => ev.tipo === "pesca" && (ev.peces || []).some((x => x === "koi" || x === "koi_dorado"))
}, {
    id: "foto_manana",
    texto: "A photo of us before 11 am!",
    cumple: ev => ev.tipo === "foto" && hora(ev) >= 5 && hora(ev) < 11,
    puede: c => c.hora < 11
}, {
    id: "foto_color",
    texto: "A photo with the COLOR filter, please.",
    cumple: ev => ev.tipo === "foto" && ev.filtro === "color"
}, {
    id: "foto_stickers",
    texto: "A photo with two stickers on it!",
    cumple: ev => ev.tipo === "foto" && (ev.stickers || []).length >= 2
}, {
    id: "foto_corazon",
    texto: "A photo with a heart sticker ♥",
    cumple: ev => ev.tipo === "foto" && (ev.stickers || []).some((s => /corazon/.test(s)))
}, {
    id: "foto_noche",
    texto: "A photo at night, after 8 pm.",
    cumple: ev => ev.tipo === "foto" && (hora(ev) >= 20 || hora(ev) < 4)
}, {
    id: "radio",
    texto: "Can we listen to Rainy Day on the radio?",
    cumple: ev => ev.tipo === "radio" && ev.estacion === "radio_lluvia"
}, {
    id: "ropa",
    texto: "Wear something cute today!",
    cumple: ev => ev.tipo === "estado" && !!ev.puesto,
    puede: c => c.tieneRopa
}, {
    id: "regar",
    texto: "Can you water our plants on the balcony today?",
    cumple: ev => ev.tipo === "regar",
    puede: c => !!c.tienePlantas
}, {
    id: "diario",
    texto: "Write in our diary before 10 pm.",
    cumple: ev => ev.tipo === "diario" && hora(ev) >= 4 && hora(ev) < 22,
    puede: c => c.hora < 21
}, {
    id: "pasos",
    texto: "Let's walk 5,000 steps today! Tell me tonight.",
    cumple: ev => ev.tipo === "pasos" && ev.hoy && (ev.pasos || 0) >= 5e3
}, {
    id: "lugar",
    texto: "Can we go somewhere new this weekend?",
    cumple: ev => ev.tipo === "sello",
    puede: c => c.finDeSemana && c.quedanLugares
}, {
    id: "agua",
    texto: "Drink a big glass of water, right now!",
    real: true
}, {
    id: "cielo",
    texto: "Look at the sky for one whole minute.",
    real: true
}, {
    id: "amor",
    texto: "Tell someone you love them today.",
    real: true
}, {
    id: "selfie",
    texto: "Send someone you love a selfie.",
    real: true
}, {
    id: "arepa",
    texto: "An arepa, please! With butter and cheese.",
    cumple: ev => ev.tipo === "comer" && esSrc(ev.item, "comida_arepa.png")
}, {
    id: "tinto",
    texto: "A little tinto to wake me up!",
    cumple: ev => ev.tipo === "comer" && esSrc(ev.item, "comida_tinto.png")
}, {
    id: "empanadas",
    texto: "Empanadas today, with a squeeze of lime?",
    cumple: ev => ev.tipo === "comer" && esSrc(ev.item, "comida_empanada.png")
}, {
    id: "bunuelos",
    texto: "Buñuelos! Golden and crispy, please.",
    cumple: ev => ev.tipo === "comer" && esSrc(ev.item, "comida_bunuelos.png")
}, {
    id: "longjing_te",
    texto: "A cup of real Longjing tea, from our own balcony!",
    cumple: ev => ev.tipo === "comer" && esSrc(ev.item, "comida_longjing.png")
}, {
    id: "onigiri",
    texto: "An onigiri sounds nice right now.",
    cumple: ev => ev.tipo === "comer" && esSrc(ev.item, "comida_onigiri.png")
}, {
    id: "maracuya",
    texto: "Something tangy — maracuyá, maybe?",
    cumple: ev => ev.tipo === "comer" && esSrc(ev.item, "comida_maracuya.png")
}, {
    id: "energia",
    texto: "I need an energy boost today!",
    cumple: ev => ev.tipo === "comer" && esSrc(ev.item, "comida_energia.png")
}, {
    id: "bao",
    texto: "A warm bao bun, just like my name ♥",
    cumple: ev => ev.tipo === "comer" && esSrc(ev.item, "comida_bao.png")
}, {
    id: "agua_pura",
    texto: "Just plain water today, nothing fancy.",
    cumple: ev => ev.tipo === "comer" && esSrc(ev.item, "bebida_agua.png")
}, {
    id: "torre5",
    texto: "Stack the steamer tower 5 floors high!",
    cumple: ev => ev.tipo === "torre" && (ev.pisos || 0) >= 5
}, {
    id: "torre_record",
    texto: "Beat your steamer tower record!",
    cumple: ev => ev.tipo === "torre" && ev.nuevoRecord && (ev.puntos || 0) > 0
}, {
    id: "ritmo_combo",
    texto: "A full combo on Radio Beats — not one note missed!",
    cumple: ev => ev.tipo === "ritmo" && !!ev.total && ev.fallados === 0
}, {
    id: "ritmo_record",
    texto: "Beat your Radio Beats record!",
    cumple: ev => ev.tipo === "ritmo" && ev.nuevoRecord && (ev.puntos || 0) > 0
}, {
    id: "faroles5",
    texto: "Send 5 paper lanterns out on the lake!",
    cumple: ev => ev.tipo === "faroles" && (ev.faroles || 0) >= 5
}, {
    id: "faroles_record",
    texto: "Beat your paper lanterns record!",
    cumple: ev => ev.tipo === "faroles" && ev.nuevoRecord && (ev.puntos || 0) > 0
}, {
    id: "tejo_embocinada",
    texto: "Light up a mecha playing tejo!",
    cumple: ev => ev.tipo === "tejo" && (ev.embocinadas || 0) >= 1
}, {
    id: "tejo_record",
    texto: "Beat your tejo record!",
    cumple: ev => ev.tipo === "tejo" && ev.nuevoRecord && (ev.puntos || 0) > 0
}, {
    id: "pesca_carpa",
    texto: "Catch a carp today!",
    cumple: ev => ev.tipo === "pesca" && (ev.peces || []).includes("carpa")
}, {
    id: "pesca_dorado",
    texto: "A golden fish! Can you catch one?",
    cumple: ev => ev.tipo === "pesca" && (ev.peces || []).includes("dorado")
}, {
    id: "pesca_cangrejo",
    texto: "I bet there's a crab down there. Try it?",
    cumple: ev => ev.tipo === "pesca" && (ev.peces || []).includes("cangrejo")
}, {
    id: "pesca_tortuga",
    texto: "A little turtle, if you're patient enough!",
    cumple: ev => ev.tipo === "pesca" && (ev.peces || []).includes("tortuga")
}, {
    id: "pesca_bagre",
    texto: "Go fishing at night — something only comes out then.",
    cumple: ev => ev.tipo === "pesca" && (ev.peces || []).includes("bagre")
}, {
    id: "pesca_botella",
    texto: "Fish up a message in a bottle!",
    cumple: ev => ev.tipo === "pesca" && (ev.peces || []).includes("botella")
}, {
    id: "radio_te_house",
    texto: "Put on Tea House on the radio?",
    cumple: ev => ev.tipo === "radio" && ev.estacion === "radio_te"
}, {
    id: "radio_lago",
    texto: "West Lake Walk sounds nice right now.",
    cumple: ev => ev.tipo === "radio" && ev.estacion === "radio_lago"
}, {
    id: "radio_noche",
    texto: "Night Market on the radio, please!",
    cumple: ev => ev.tipo === "radio" && ev.estacion === "radio_noche"
}, {
    id: "radio_cumbia",
    texto: "Put on some cumbia and dance a little!",
    cumple: ev => ev.tipo === "radio" && ev.estacion === "radio_cumbia"
}, {
    id: "lugar_templo",
    texto: "Let's find a temple to seal this week!",
    cumple: ev => ev.tipo === "sello" && ev.categoria === "temple",
    puede: c => c.quedanLugares
}, {
    id: "lugar_te_trail",
    texto: "Somewhere on the tea trail, this week?",
    cumple: ev => ev.tipo === "sello" && ev.categoria === "tea",
    puede: c => c.quedanLugares
}, {
    id: "lugar_museo",
    texto: "A museum visit this week?",
    cumple: ev => ev.tipo === "sello" && ev.categoria === "museum",
    puede: c => c.quedanLugares
}, {
    id: "lugar_ciudad",
    texto: "Explore somewhere in the city this week.",
    cumple: ev => ev.tipo === "sello" && ev.categoria === "city",
    puede: c => c.quedanLugares
}, {
    id: "lugar_natura",
    texto: "Hills, water, somewhere green — this week?",
    cumple: ev => ev.tipo === "sello" && ev.categoria === "nature",
    puede: c => c.quedanLugares
}, {
    id: "lugar_nuestro",
    texto: "Add one of our own places to the map this week ♥",
    cumple: ev => ev.tipo === "sello" && ev.categoria === "propio",
    puede: c => c.quedanLugares
}, {
    id: "usar_ruana",
    texto: "Wear the ruana today — it's chilly!",
    cumple: ev => ev.tipo === "estado" && ev.puesto === "ruana"
}, {
    id: "usar_mochila",
    texto: "Carry the Wayuu bag today ♥",
    cumple: ev => ev.tipo === "estado" && ev.puesto === "mochila"
}, {
    id: "usar_lentes",
    texto: "Put on the round glasses — so smart!",
    cumple: ev => ev.tipo === "estado" && ev.puesto === "lentes"
}, {
    id: "usar_sombrero",
    texto: "Wear the rice hat today.",
    cumple: ev => ev.tipo === "estado" && ev.puesto === "sombrero"
}, {
    id: "usar_vueltiao",
    texto: "The sombrero vueltiao, just for today?",
    cumple: ev => ev.tipo === "estado" && ev.puesto === "vueltiao"
}, {
    id: "foto_loto",
    texto: "A photo with the lotus stickers!",
    cumple: ev => ev.tipo === "foto" && (ev.stickers || []).some((s => /loto/.test(s)))
}, {
    id: "foto_brillos",
    texto: "A photo with sparkles on it ✨",
    cumple: ev => ev.tipo === "foto" && (ev.stickers || []).some((s => /brillos/.test(s)))
}, {
    id: "foto_atardecer",
    texto: "A photo at sunset, with that golden light.",
    cumple: ev => ev.tipo === "foto" && ev.momento === "atardecer"
}, {
    id: "foto_amanecer",
    texto: "A photo at sunrise — worth waking up for!",
    cumple: ev => ev.tipo === "foto" && ev.momento === "amanecer"
}, {
    id: "foto_tarde",
    texto: "A photo sometime this afternoon (12–5 pm).",
    cumple: ev => ev.tipo === "foto" && hora(ev) >= 12 && hora(ev) < 17,
    puede: c => c.hora < 17
}, {
    id: "pasos10000",
    texto: "Big goal today: 10,000 steps! Tell me tonight.",
    cumple: ev => ev.tipo === "pasos" && ev.hoy && (ev.pasos || 0) >= 1e4
}, {
    id: "diario_manana",
    texto: "Write in our diary before noon today.",
    cumple: ev => ev.tipo === "diario" && hora(ev) < 12,
    puede: c => c.hora < 11
}, {
    id: "manana_fresca",
    texto: "A bath before 10 am — start the day fresh!",
    cumple: ev => ev.tipo === "cuidar" && ev.accion === "clean" && hora(ev) < 10,
    puede: c => c.hora < 9
}, {
    id: "estirar",
    texto: "Stretch for one whole minute.",
    real: true
}, {
    id: "elogio",
    texto: "Say one nice thing about yourself today.",
    real: true
}, {
    id: "respirar",
    texto: "Take 3 slow, deep breaths.",
    real: true
}, {
    id: "sonreir",
    texto: "Smile at a stranger today.",
    real: true
}, {
    id: "bien_del_dia",
    texto: "Write down one good thing about today.",
    real: true
} ];

function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

export class Deseos {
    constructor() {
        this.dia = null;
        this.id = null;
        this.estado = null;
        this.progreso = 0;
        this.historial = [];
        this.cumplidos = 0;
        this.propios = [];
        this.celebrar = false;
    }
    catalogo() {
        const deRom = (this.propios || []).filter((t => typeof t === "string" && t.trim())).map(((t, i) => ({
            id: `rom_${i}`,
            texto: t.trim(),
            real: true,
            deRom: true
        })));
        return [ ...DESEOS, ...deRom ];
    }
    actual() {
        return this.catalogo().find((d => d.id === this.id)) || null;
    }
    elegir(clave, ctx = {}) {
        if (this.dia === clave && this.actual()) return false;
        const recientes = new Set(this.historial.slice(-6));
        const posibles = this.catalogo().filter((d => !recientes.has(d.id) && (!d.puede || d.puede(ctx))));
        if (!posibles.length) return false;
        const peso = d => d.deRom ? 3 : d.real ? .6 : 1;
        const total = posibles.reduce(((s, d) => s + peso(d)), 0);
        let r = hash(clave) % 1e4 / 1e4 * total;
        let elegido = posibles[posibles.length - 1];
        for (const d of posibles) {
            r -= peso(d);
            if (r < 0) {
                elegido = d;
                break;
            }
        }
        this.dia = clave;
        this.id = elegido.id;
        this.estado = "nuevo";
        this.progreso = 0;
        this.celebrar = false;
        this.historial = [ ...this.historial.filter((x => x !== elegido.id)), elegido.id ].slice(-10);
        return true;
    }
    pendiente() {
        return !!this.actual() && this.estado !== "cumplido";
    }
    escuchar() {
        if (this.estado === "nuevo") this.estado = "escuchado";
    }
    evento(ev) {
        const d = this.actual();
        if (!d || d.real || this.estado === "cumplido" || !d.cumple) return false;
        const r = d.cumple(ev, this.progreso);
        if (r === true) return this._cumplir();
        if (typeof r === "number" && r !== this.progreso) {
            this.progreso = r;
            if (d.meta && r >= d.meta) return this._cumplir();
        }
        return false;
    }
    hecho() {
        const d = this.actual();
        if (!d || !d.real || this.estado === "cumplido") return false;
        return this._cumplir();
    }
    _cumplir() {
        this.estado = "cumplido";
        this.cumplidos += 1;
        this.celebrar = true;
        return true;
    }
    aObjeto() {
        return {
            dia: this.dia,
            id: this.id,
            estado: this.estado,
            progreso: this.progreso,
            historial: this.historial,
            cumplidos: this.cumplidos,
            celebrar: this.celebrar
        };
    }
    static desdeObjeto(datos, propios = []) {
        const d = new Deseos;
        d.propios = propios;
        if (!datos || typeof datos !== "object") return d;
        if (typeof datos.dia === "string" && /^\d{4}-\d\d-\d\d$/.test(datos.dia)) d.dia = datos.dia;
        d.id = typeof datos.id === "string" ? datos.id : null;
        d.estado = [ "nuevo", "escuchado", "cumplido" ].includes(datos.estado) ? datos.estado : null;
        d.progreso = Number.isFinite(datos.progreso) ? Math.max(0, Math.floor(datos.progreso)) : 0;
        d.historial = Array.isArray(datos.historial) ? datos.historial.filter((x => typeof x === "string")).slice(-10) : [];
        d.cumplidos = Number.isFinite(datos.cumplidos) ? Math.max(0, Math.floor(datos.cumplidos)) : 0;
        d.celebrar = datos.celebrar === true;
        if (!d.actual()) {
            d.id = null;
            d.estado = null;
        }
        return d;
    }
}
