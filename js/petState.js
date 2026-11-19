export const DECAY_POR_HORA = {
    hambre: 9,
    sed: 10,
    felicidad: 6,
    energia: 4,
    higiene: 7,
    aburrimiento: 4
};

export const ENERGIA_DURMIENDO_POR_HORA = 35;

export const MAX_HORAS_DECAY_OFFLINE = 10;

export const HORA_DORMIR = 23;

export const HORA_DESPERTAR = 7;

export const GRACIA_OVERRIDE_MS = 3 * 36e5;

export const PESO_HISTORICO = .7;

export const PESO_RECIENTE = .3;

export const TRAITS = [ "explorador", "sociable", "gourmet", "leal" ];

export const TRAIT_NOMBRES = {
    explorador: "Explorer",
    sociable: "Sociable",
    gourmet: "Gourmet",
    leal: "Loyal/Affectionate"
};

export const HITO_PASOS = 1e3;

export function clamp(valor, minimo = 0, maximo = 100) {
    return Math.max(minimo, Math.min(maximo, valor));
}

function proximaHora(t, hora) {
    const d = new Date(t);
    let c = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hora).getTime();
    if (c <= t) c = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, hora).getTime();
    return c;
}

function diaLocal(ms) {
    const d = new Date(ms);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const ENFRIAMIENTO_JUEGO_MS = 10 * 6e4;

export class PetState {
    constructor(nombre = "", ahoraMs = null) {
        const ahora = ahoraMs ?? Date.now();
        this.nombre = nombre;
        this.creadoEn = ahora;
        this.ultimaActualizacion = ahora;
        this.ultimaInteraccion = ahora;
        this.enferma = false;
        this.dormida = false;
        this.dormidaAuto = false;
        this.ultimoOverrideManualMs = 0;
        this.stats = {
            hambre: 80,
            sed: 80,
            felicidad: 80,
            energia: 80,
            higiene: 80,
            salud: 100,
            vinculo: 50,
            aburrimiento: 10
        };
        this.traitsHistorico = Object.fromEntries(TRAITS.map((t => [ t, 0 ])));
        this.traitsReciente = Object.fromEntries(TRAITS.map((t => [ t, 0 ])));
        this.pasosTotales = 0;
        this.ultimoDecaimientoRasgos = diaLocal(ahora);
        this.ultimoBonusJuegoMs = 0;
    }
    actualizarTiempo(ahoraMs = null, {suenioAuto: suenioAuto = true} = {}) {
        const ahora = ahoraMs ?? Date.now();
        const desde = this.ultimaActualizacion;
        const horasReales = (ahora - desde) / 36e5;
        this.ultimaActualizacion = ahora;
        if (!(horasReales > 0)) return {
            horasReales: 0,
            horasAplicadas: 0,
            suenio: null
        };
        const horasPasadas = Math.min(horasReales, MAX_HORAS_DECAY_OFFLINE);
        const inicioDeterioro = ahora - horasPasadas * 36e5;
        const inicioCastigo = (this.ultimaInteraccion || 0) + 6 * 36e5;
        const dormidaAntes = this.dormida;
        let t = Math.max(desde, inicioDeterioro - 24 * 36e5);
        let vueltas = 0;
        while (t < ahora && vueltas++ < 200) {
            if (suenioAuto) this.revisarSuenioAutomatico(t, new Date(t));
            let fin = ahora;
            const cortar = c => {
                if (c > t && c < fin) fin = c;
            };
            cortar(inicioDeterioro);
            if (suenioAuto) {
                cortar(proximaHora(t, HORA_DORMIR));
                cortar(proximaHora(t, HORA_DESPERTAR));
                cortar((this.ultimoOverrideManualMs || 0) + GRACIA_OVERRIDE_MS);
                if (t >= inicioDeterioro && this.dormida && !this.dormidaAuto && this.stats.energia < 100) {
                    cortar(t + Math.ceil((100 - this.stats.energia) / ENERGIA_DURMIENDO_POR_HORA * 36e5) + 1);
                }
            }
            if (fin > inicioDeterioro) {
                const tramoIni = Math.max(t, inicioDeterioro);
                const horas = (fin - tramoIni) / 36e5;
                this._aplicarDeterioro(horas);
                if (!this.dormida) {
                    const horasCastigo = Math.max(0, fin - Math.max(tramoIni, inicioCastigo)) / 36e5;
                    if (horasCastigo > 0) this.stats.vinculo = clamp(this.stats.vinculo - 2 * horasCastigo);
                }
                this._revisarSalud(horas);
            }
            t = fin;
        }
        const suenio = this.dormida === dormidaAntes ? null : this.dormida ? "durmio" : "desperto";
        return {
            horasReales: horasReales,
            horasAplicadas: horasPasadas,
            suenio: suenio
        };
    }
    _aplicarDeterioro(horas) {
        if (this.dormida) {
            this.stats.energia = clamp(this.stats.energia + ENERGIA_DURMIENDO_POR_HORA * horas);
            this.stats.hambre = clamp(this.stats.hambre - DECAY_POR_HORA.hambre * .3 * horas);
        } else {
            for (const stat of [ "hambre", "sed", "felicidad", "energia", "higiene" ]) {
                this.stats[stat] = clamp(this.stats[stat] - DECAY_POR_HORA[stat] * horas);
            }
            this.stats.aburrimiento = clamp(this.stats.aburrimiento + DECAY_POR_HORA.aburrimiento * horas);
        }
    }
    prepararParaElFinal({despierta: despierta = false} = {}) {
        this.stats.energia = Math.max(this.stats.energia, 85);
        this.stats.felicidad = Math.max(this.stats.felicidad, 75);
        this.stats.hambre = Math.max(this.stats.hambre, 60);
        this.stats.sed = Math.max(this.stats.sed, 60);
        this.stats.higiene = Math.max(this.stats.higiene, 60);
        this.stats.aburrimiento = Math.min(this.stats.aburrimiento, 40);
        this.stats.salud = Math.max(this.stats.salud ?? 100, 70);
        this.enferma = false;
        if (despierta && this.dormida) {
            this.dormida = false;
            this.dormidaAuto = false;
        }
    }
    revisarSuenioAutomatico(ahoraMs = null, fecha = new Date) {
        const ahora = ahoraMs ?? Date.now();
        const hora = fecha.getHours();
        const esNoche = hora >= HORA_DORMIR || hora < HORA_DESPERTAR;
        if (!esNoche && this.dormida && !this.dormidaAuto && this.stats.energia >= 100) {
            this.dormida = false;
            return "desperto";
        }
        if (ahora - (this.ultimoOverrideManualMs || 0) < GRACIA_OVERRIDE_MS) return null;
        if (esNoche && !this.dormida) {
            this.dormida = true;
            this.dormidaAuto = true;
            return "durmio";
        }
        if (!esNoche && this.dormida && this.dormidaAuto) {
            this.dormida = false;
            this.dormidaAuto = false;
            return "desperto";
        }
        return null;
    }
    _revisarSalud(horasPasadas) {
        const criticas = [ "hambre", "sed", "higiene", "energia", "felicidad" ].filter((s => this.stats[s] <= 15)).length;
        if (criticas >= 2) {
            this.stats.salud = clamp(this.stats.salud - 4 * horasPasadas);
        } else if (criticas === 0) {
            this.stats.salud = clamp(this.stats.salud + 6 * horasPasadas);
        }
        if (this.stats.salud <= 0 && !this.enferma) {
            this.enferma = true;
        }
    }
    registrarEventoRasgo(rasgo, peso = 1, ahoraMs = null) {
        if (!TRAITS.includes(rasgo)) return;
        this.traitsHistorico[rasgo] += peso;
        this.traitsReciente[rasgo] += peso;
        this._marcarInteraccion(ahoraMs);
    }
    decaerRecienteDiario() {
        for (const t of TRAITS) {
            this.traitsReciente[t] *= .6;
        }
    }
    decaerRasgosPorDias(ahoraMs = null) {
        const ahora = ahoraMs ?? Date.now();
        const hoy = diaLocal(ahora);
        const ultimo = typeof this.ultimoDecaimientoRasgos === "string" ? this.ultimoDecaimientoRasgos : "";
        if (!/^\d{4}-\d{2}-\d{2}$/.test(ultimo) || ultimo > hoy) {
            this.ultimoDecaimientoRasgos = hoy;
            return 0;
        }
        if (ultimo === hoy) return 0;
        const [y, m, d] = ultimo.split("-").map(Number);
        const [y2, m2, d2] = hoy.split("-").map(Number);
        const dias = Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y, m - 1, d)) / 864e5);
        for (let i = 0; i < Math.min(dias, 30); i++) this.decaerRecienteDiario();
        this.ultimoDecaimientoRasgos = hoy;
        return dias;
    }
    rasgoDominante() {
        const puntajes = {};
        for (const t of TRAITS) {
            puntajes[t] = this.traitsHistorico[t] * PESO_HISTORICO + this.traitsReciente[t] * PESO_RECIENTE;
        }
        const valores = Object.values(puntajes);
        const mejor = valores.length ? Math.max(...valores) : 0;
        if (mejor <= 0) return null;
        const ganadores = TRAITS.filter((t => puntajes[t] === mejor));
        return ganadores.length === 1 ? ganadores[0] : null;
    }
    _marcarInteraccion(ahoraMs = null) {
        this.ultimaInteraccion = ahoraMs ?? Date.now();
        this.stats.aburrimiento = clamp(this.stats.aburrimiento - 20);
    }
    alimentar(ahoraMs = null) {
        if (this.dormida) return false;
        this.stats.hambre = clamp(this.stats.hambre + 80);
        this.stats.higiene = clamp(this.stats.higiene - 5);
        this.stats.felicidad = clamp(this.stats.felicidad + 8);
        this.stats.vinculo = clamp(this.stats.vinculo + 2);
        this._marcarInteraccion(ahoraMs);
        return true;
    }
    darAgua(ahoraMs = null) {
        if (this.dormida) return false;
        this.stats.sed = clamp(this.stats.sed + 80);
        this.stats.felicidad = clamp(this.stats.felicidad + 5);
        this._marcarInteraccion(ahoraMs);
        return true;
    }
    limpiar(ahoraMs = null) {
        if (this.dormida) return false;
        this.stats.higiene = clamp(this.stats.higiene + 80);
        this.stats.felicidad = clamp(this.stats.felicidad + 5);
        this._marcarInteraccion(ahoraMs);
        return true;
    }
    alternarDormir(ahoraMs = null) {
        const ahora = ahoraMs ?? Date.now();
        this.dormida = !this.dormida;
        this.dormidaAuto = false;
        this.ultimoOverrideManualMs = ahora;
        this._marcarInteraccion(ahora);
        return true;
    }
    mimar(ahoraMs = null) {
        const ahora = ahoraMs ?? Date.now();
        if (this.dormida) return false;
        this.stats.felicidad = clamp(this.stats.felicidad + 4);
        this.stats.vinculo = clamp(this.stats.vinculo + 1);
        this.registrarEventoRasgo("leal", .4, ahora);
        return true;
    }
    darMedicina(ahoraMs = null) {
        if (!this.enferma) return false;
        this.stats.salud = clamp(this.stats.salud + 35);
        if (this.stats.salud >= 40) this.enferma = false;
        this._marcarInteraccion(ahoraMs);
        return true;
    }
    resultadoMinijuego(bocadosAtrapados, ahoraMs = null) {
        const ahora = ahoraMs ?? Date.now();
        const buenos = Math.max(0, Number(bocadosAtrapados) || 0);
        let ganancia = 10 + clamp(buenos * 6, 0, 40);
        if (ahora - (this.ultimoBonusJuegoMs || 0) < ENFRIAMIENTO_JUEGO_MS) {
            ganancia = Math.round(ganancia * .3);
        } else if (buenos > 0) {
            this.ultimoBonusJuegoMs = ahora;
        }
        this.stats.felicidad = clamp(this.stats.felicidad + ganancia);
        this.stats.hambre = clamp(this.stats.hambre + 5);
        this.stats.energia = clamp(this.stats.energia - 4);
        this.registrarEventoRasgo("sociable", 1, ahora);
        return ganancia;
    }
    registrarPasos(pasosNuevos, ahoraMs = null, {anotados: anotados = false} = {}) {
        const pasosAntes = this.pasosTotales;
        this.pasosTotales += pasosNuevos;
        if (!anotados) this.stats.energia = clamp(this.stats.energia - pasosNuevos * .004);
        this.stats.felicidad = clamp(this.stats.felicidad + pasosNuevos * (anotados ? .003 : .01));
        this.registrarEventoRasgo("explorador", pasosNuevos * .02, ahoraMs);
        const hitoAntes = Math.floor(pasosAntes / HITO_PASOS);
        const hitoDespues = Math.floor(this.pasosTotales / HITO_PASOS);
        return hitoDespues > hitoAntes;
    }
    visitarLugar(rasgoDelLugar, efectos, ahoraMs = null) {
        for (const [stat, delta] of Object.entries(efectos)) {
            this.stats[stat] = clamp(this.stats[stat] + delta);
        }
        this.registrarEventoRasgo(rasgoDelLugar, 3, ahoraMs);
        return true;
    }
    aObjeto() {
        return {
            nombre: this.nombre,
            creadoEn: this.creadoEn,
            ultimaActualizacion: this.ultimaActualizacion,
            ultimaInteraccion: this.ultimaInteraccion,
            enferma: this.enferma,
            dormida: this.dormida,
            dormidaAuto: this.dormidaAuto,
            ultimoOverrideManualMs: this.ultimoOverrideManualMs,
            stats: this.stats,
            traitsHistorico: this.traitsHistorico,
            traitsReciente: this.traitsReciente,
            pasosTotales: this.pasosTotales,
            ultimoDecaimientoRasgos: this.ultimoDecaimientoRasgos,
            ultimoBonusJuegoMs: this.ultimoBonusJuegoMs
        };
    }
    static desdeObjeto(datos) {
        const obj = new PetState(datos.nombre, datos.creadoEn);
        const {stats: stats, traitsHistorico: traitsHistorico, traitsReciente: traitsReciente, ...resto} = datos;
        Object.assign(obj, resto);
        obj.stats = {
            ...obj.stats,
            ...stats || {}
        };
        obj.traitsHistorico = {
            ...obj.traitsHistorico,
            ...traitsHistorico || {}
        };
        obj.traitsReciente = {
            ...obj.traitsReciente,
            ...traitsReciente || {}
        };
        if (!datos.ultimoDecaimientoRasgos) obj.ultimoDecaimientoRasgos = diaLocal(Date.now());
        return obj;
    }
}

export function nivel(valor, corteBajo = 35, corteAlto = 65) {
    if (valor < corteBajo) return "baja";
    if (valor > corteAlto) return "alta";
    return "neutral";
}

export const FELICIDAD_A_BOCA = {
    alta: "feliz",
    neutral: "neutral",
    baja: "triste"
};

export function nivelEnergiaCara(mascota) {
    if (mascota.stats.hambre <= 15 || mascota.stats.sed <= 15) return "baja";
    return nivel(mascota.stats.energia);
}

export function estadoCara(mascota) {
    if (mascota.enferma) return {
        tipo: "enferma"
    };
    if (mascota.dormida) return {
        tipo: "dormida"
    };
    if (mascota.stats.aburrimiento >= 85) return {
        tipo: "aburrido"
    };
    const nivelEnergia = nivelEnergiaCara(mascota);
    const nivelFelicidad = nivel(mascota.stats.felicidad);
    return {
        tipo: "base",
        nivelEnergia: nivelEnergia,
        nivelFelicidad: nivelFelicidad
    };
}

export function especialPorEstado(mascota) {
    if (mascota.stats.hambre <= 15) return "hambriento";
    if (mascota.stats.sed <= 15) return "sediento";
    if (mascota.stats.higiene <= 15) return "asqueado";
    return null;
}
