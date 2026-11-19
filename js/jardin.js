export const MACETAS = 4;

export const DIAS_PARA_MUSTIA = 2;

export const PLANTAS = {
    girasol: {
        nombre: "Sunflower",
        dias: 3,
        cosecha: {
            monedas: 25
        }
    },
    longjing: {
        nombre: "Longjing tea",
        dias: 3,
        cosecha: {
            comida: "longjing",
            n: 2
        }
    },
    bambu: {
        nombre: "Bamboo",
        dias: 3,
        cosecha: {
            monedas: 35
        }
    },
    loto: {
        nombre: "Lotus",
        dias: 4,
        cosecha: {
            monedas: 45
        }
    },
    osmanto: {
        nombre: "Osmanthus",
        dias: 4,
        cosecha: {
            comida: "osmanto",
            n: 2
        }
    },
    cafe: {
        nombre: "Coffee",
        dias: 5,
        cosecha: {
            comida: "tinto",
            n: 3
        }
    },
    maracuya: {
        nombre: "Passion fruit",
        dias: 5,
        cosecha: {
            comida: "maracuya",
            n: 2
        }
    },
    orquidea: {
        nombre: "Orchid",
        dias: 5,
        cosecha: {
            monedas: 60
        }
    }
};

export const SEMILLAS_DE_REGALO = [ "girasol", "longjing" ];

export function diasEntre(a, b) {
    const f = k => {
        const [y, m, d] = k.split("-").map(Number);
        return Date.UTC(y, m - 1, d);
    };
    return Math.round((f(b) - f(a)) / 864e5);
}

const claveValida = k => typeof k === "string" && /^\d{4}-\d{2}-\d{2}$/.test(k);

export class Jardin {
    constructor() {
        this.macetas = Array(MACETAS).fill(null);
        this.regalo = false;
        this.cosechas = 0;
        this.lluviaAvisada = null;
    }
    estado(i, hoy) {
        const m = this.macetas[i];
        if (!m) return null;
        const p = PLANTAS[m.planta];
        const lista = m.riegos >= p.dias;
        const etapa = lista ? 3 : m.riegos === 0 ? 0 : m.riegos >= Math.ceil(p.dias / 2) ? 2 : 1;
        const desde = m.ultimoRiego || m.sembrada;
        const mustia = !lista && diasEntre(desde, hoy) >= DIAS_PARA_MUSTIA;
        return {
            planta: m.planta,
            nombre: p.nombre,
            etapa: etapa,
            mustia: mustia,
            regadaHoy: m.ultimoRiego === hoy,
            lista: lista,
            dia: m.riegos,
            dias: p.dias
        };
    }
    estados(hoy) {
        return this.macetas.map(((_, i) => this.estado(i, hoy)));
    }
    hayPlantas() {
        return this.macetas.some(Boolean);
    }
    quiereAgua(hoy) {
        return this.estados(hoy).some((e => e && !e.lista && !e.regadaHoy));
    }
    hayCosecha(hoy) {
        return this.estados(hoy).some((e => e && e.lista));
    }
    sembrar(i, planta, hoy) {
        if (!PLANTAS[planta] || i < 0 || i >= MACETAS || this.macetas[i]) return false;
        this.macetas[i] = {
            planta: planta,
            sembrada: hoy,
            riegos: 0,
            ultimoRiego: null
        };
        return true;
    }
    regar(hoy) {
        let n = 0;
        for (const m of this.macetas) {
            if (!m || m.ultimoRiego === hoy || m.riegos >= PLANTAS[m.planta].dias) continue;
            m.ultimoRiego = hoy;
            m.riegos += 1;
            n += 1;
        }
        return n;
    }
    cosechar(i, hoy) {
        const e = this.estado(i, hoy);
        if (!e || !e.lista) return null;
        this.macetas[i] = null;
        this.cosechas += 1;
        return {
            planta: e.planta,
            nombre: e.nombre,
            cosecha: PLANTAS[e.planta].cosecha,
            primera: this.cosechas === 1
        };
    }
    aObjeto() {
        return {
            macetas: this.macetas.map((m => m ? {
                ...m
            } : null)),
            regalo: this.regalo,
            cosechas: this.cosechas,
            lluviaAvisada: this.lluviaAvisada
        };
    }
    static desdeObjeto(datos) {
        const j = new Jardin;
        if (!datos || typeof datos !== "object") return j;
        const lista = Array.isArray(datos.macetas) ? datos.macetas : [];
        for (let i = 0; i < MACETAS; i++) {
            const m = lista[i];
            if (!m || !PLANTAS[m.planta] || !claveValida(m.sembrada)) continue;
            const riegos = Number.isFinite(m.riegos) ? Math.max(0, Math.min(PLANTAS[m.planta].dias, Math.floor(m.riegos))) : 0;
            j.macetas[i] = {
                planta: m.planta,
                sembrada: m.sembrada,
                riegos: riegos,
                ultimoRiego: claveValida(m.ultimoRiego) ? m.ultimoRiego : null
            };
        }
        j.regalo = datos.regalo === true;
        j.cosechas = Number.isFinite(datos.cosechas) ? Math.max(0, Math.floor(datos.cosechas)) : 0;
        j.lluviaAvisada = claveValida(datos.lluviaAvisada) ? datos.lluviaAvisada : null;
        return j;
    }
}
