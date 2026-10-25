/**
 * petState.js
 * ============
 * Port 1:1 de pet_state.py (el "cerebro" de la mascota: stats y
 * personalidad). Misma logica, mismos numeros — solo cambia el lenguaje.
 *
 * Diferencia deliberada con el firmware: aca el tiempo real se mide con
 * Date.now() (milisegundos) en vez de time.time() (segundos), asi que
 * actualizarTiempo() divide por 1000 antes de comparar. Todo lo demas
 * (formulas de decay, umbrales de salud, pesos de traits) es identico.
 */

// Cuanto baja (o sube, en el caso de aburrimiento) cada stat por HORA real.
// REBALANCEO (2 sep 2026). Los valores originales venian del firmware,
// pensados para un aparato que se lleva encima TODO el dia: hambre 25/h
// y sed 30/h significan llegar a cero en 4 y 3,3 horas. En una app que
// se abre dos o tres veces por dia eso daba una mascota casi siempre
// triste y al borde de enfermarse — la peor cara era la que mas se
// veia. Ver claude/AUDITORIA_WEB_APP.md, seccion 1.
export const DECAY_POR_HORA = {
  hambre: 9, // ~11 h a cero: aguanta una jornada normal
  sed: 10,
  felicidad: 6,
  energia: 4, // v21: antes 7 (rom: "le da sueño muy rapido"); se recupera durmiendo
  higiene: 7,
  aburrimiento: 4, // este SUBE con el tiempo (al reves que los demas)
};

// Cuanta energia recupera por hora de sueño (una siesta de 2 h: +70).
export const ENERGIA_DURMIENDO_POR_HORA = 35;

// Tope al deterioro acumulado con la app cerrada. Sin esto, volver
// despues de cinco dias aplicaba 120 horas de castigo de golpe.
export const MAX_HORAS_DECAY_OFFLINE = 10;

// Ventana de dormir automatico (hora local): la mascota duerme cuando
// ella duerme. Antes, si no tocaba "Sleep" a mano, amanecia sin energia.
export const HORA_DORMIR = 23; // v21: antes 22
export const HORA_DESPERTAR = 7;

// Un toque manual de Sleep le gana al automatico por este rato.
export const GRACIA_OVERRIDE_MS = 3 * 3600000;

// Que tan rapido "olvida" el rasgo de personalidad lo viejo.
export const PESO_HISTORICO = 0.7; // 70% historico de toda la vida
export const PESO_RECIENTE = 0.3; // 30% de los ultimos dias

export const TRAITS = ["explorador", "sociable", "gourmet", "leal"];
export const TRAIT_NOMBRES = {
  explorador: "Explorer",
  sociable: "Sociable",
  gourmet: "Gourmet",
  leal: "Loyal/Affectionate",
};

export const HITO_PASOS = 1000; // cada cuantos pasos totales se dispara "Orgulloso"

export function clamp(valor, minimo = 0, maximo = 100) {
  return Math.max(minimo, Math.min(maximo, valor));
}

/** v35: el proximo momento (ms) despues de t en que el reloj local marca hora:00. */
function proximaHora(t, hora) {
  const d = new Date(t);
  let c = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hora).getTime();
  if (c <= t) c = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, hora).getTime();
  return c;
}

/** "AAAA-MM-DD" local (lo mismo que claveDelDia de diario.js, sin importarlo). */
function diaLocal(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// v35: el premio de un minijuego. Lleno, a lo sumo uno cada 10 minutos.
export const ENFRIAMIENTO_JUEGO_MS = 10 * 60000;

export class PetState {
  constructor(nombre = "", ahoraMs = null) {
    const ahora = ahoraMs ?? Date.now();

    this.nombre = nombre;
    this.creadoEn = ahora;
    this.ultimaActualizacion = ahora;
    this.ultimaInteraccion = ahora;

    this.enferma = false;
    this.dormida = false;
    this.dormidaAuto = false; // se durmio sola, no lo pidio ella
    this.ultimoOverrideManualMs = 0;

    this.stats = {
      hambre: 80,
      sed: 80,
      felicidad: 80,
      energia: 80,
      higiene: 80,
      salud: 100,
      vinculo: 50,
      aburrimiento: 10,
    };

    // cada rasgo tiene un puntaje "historico" (de toda la vida) y uno "reciente"
    this.traitsHistorico = Object.fromEntries(TRAITS.map((t) => [t, 0]));
    this.traitsReciente = Object.fromEntries(TRAITS.map((t) => [t, 0]));

    this.pasosTotales = 0;

    // v35: el ultimo dia en que se "olvido" un poco lo reciente (antes vivia
    // solo en memoria de main.js y con la app cerrada nunca pasaba)
    this.ultimoDecaimientoRasgos = diaLocal(ahora);
    // v35: el ultimo minijuego que dio el premio lleno
    this.ultimoBonusJuegoMs = 0;
  }

  // ------------------------------------------------------------------
  // TIEMPO REAL: hay que llamar esto seguido (al abrir la app, o cada
  // pocos minutos mientras esta abierta) para que el tiempo pase de
  // verdad — incluso si el celular estuvo con la pantalla apagada.
  // ------------------------------------------------------------------

  /**
   * v35: el tiempo con la app cerrada se procesa POR TRAMOS, cortando en
   * las horas de dormir/despertar (y donde vence el toque manual de Sleep,
   * o donde una siesta llena la energia). Antes, si ella cerraba a las 22
   * y abria a las 8, se aplicaban 10 horas DESPIERTA (el dormir automatico
   * solo corre con la app abierta) y amanecia destruida.
   * Solo se aplica el deterioro de las ultimas MAX_HORAS_DECAY_OFFLINE
   * horas; lo de antes solo sirve para saber si estaba dormida o no.
   * suenioAuto = false: no se duerme ni se despierta sola (los dias del
   * pedido y de la secuencia, como en el tick de main.js).
   * Devuelve { horasReales, horasAplicadas, suenio: "durmio"|"desperto"|null }.
   */
  actualizarTiempo(ahoraMs = null, { suenioAuto = true } = {}) {
    const ahora = ahoraMs ?? Date.now();
    const desde = this.ultimaActualizacion;
    const horasReales = (ahora - desde) / 3600000.0;
    this.ultimaActualizacion = ahora;

    if (!(horasReales > 0)) return { horasReales: 0, horasAplicadas: 0, suenio: null };

    // El deterioro va con tope; el tiempo real se devuelve igual, para
    // que main.js pueda saludarla distinto si volvio despues de un dia.
    const horasPasadas = Math.min(horasReales, MAX_HORAS_DECAY_OFFLINE);
    const inicioDeterioro = ahora - horasPasadas * 3600000;
    // el vinculo baja solo despues de 6 horas sin interactuar (y no durmiendo)
    const inicioCastigo = (this.ultimaInteraccion || 0) + 6 * 3600000;
    const dormidaAntes = this.dormida;

    // Con un hueco largo, alcanza con simular el ultimo dia antes del tramo
    // con deterioro (la noche y el dia se repiten); ahi se mira la hora.
    let t = Math.max(desde, inicioDeterioro - 24 * 3600000);

    let vueltas = 0;
    while (t < ahora && vueltas++ < 200) {
      // al principio de cada tramo, lo mismo que haria el tick con la app abierta
      if (suenioAuto) this.revisarSuenioAutomatico(t, new Date(t));
      // el proximo corte: dormir, despertar, fin del toque manual, el
      // comienzo del tramo con deterioro, o una siesta que se llena
      let fin = ahora;
      const cortar = (c) => {
        if (c > t && c < fin) fin = c;
      };
      cortar(inicioDeterioro);
      if (suenioAuto) {
        cortar(proximaHora(t, HORA_DORMIR));
        cortar(proximaHora(t, HORA_DESPERTAR));
        cortar((this.ultimoOverrideManualMs || 0) + GRACIA_OVERRIDE_MS);
        if (t >= inicioDeterioro && this.dormida && !this.dormidaAuto && this.stats.energia < 100) {
          cortar(t + Math.ceil(((100 - this.stats.energia) / ENERGIA_DURMIENDO_POR_HORA) * 3600000) + 1);
        }
      }

      if (fin > inicioDeterioro) {
        const tramoIni = Math.max(t, inicioDeterioro);
        const horas = (fin - tramoIni) / 3600000.0;
        this._aplicarDeterioro(horas);
        if (!this.dormida) {
          const horasCastigo = Math.max(0, fin - Math.max(tramoIni, inicioCastigo)) / 3600000.0;
          if (horasCastigo > 0) this.stats.vinculo = clamp(this.stats.vinculo - 2 * horasCastigo);
        }
        this._revisarSalud(horas);
      }

      t = fin;
    }

    const suenio = this.dormida === dormidaAntes ? null : this.dormida ? "durmio" : "desperto";
    return { horasReales, horasAplicadas: horasPasadas, suenio };
  }

  /** El deterioro de un tramo, dormida o despierta (sin cambiar de estado). */
  _aplicarDeterioro(horas) {
    if (this.dormida) {
      // dormida recupera energia en vez de perderla, y casi no gasta nada mas
      // v21: antes +20/h (rom: "se demora mucho en recuperar energia")
      this.stats.energia = clamp(this.stats.energia + ENERGIA_DURMIENDO_POR_HORA * horas);
      this.stats.hambre = clamp(this.stats.hambre - DECAY_POR_HORA.hambre * 0.3 * horas);
    } else {
      for (const stat of ["hambre", "sed", "felicidad", "energia", "higiene"]) {
        this.stats[stat] = clamp(this.stats[stat] - DECAY_POR_HORA[stat] * horas);
      }
      this.stats.aburrimiento = clamp(this.stats.aburrimiento + DECAY_POR_HORA.aburrimiento * horas);
    }
  }

  /**
   * v21: los dias del final (armado, el pedido de la foto, la secuencia)
   * tiene que estar bien: con energia, contenta, sin hambre ni sed y sana.
   * despierta = true la despierta tambien (pedido y secuencia).
   */
  prepararParaElFinal({ despierta = false } = {}) {
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

  /**
   * Dormir automatico segun la hora local. Devuelve "durmio" |
   * "desperto" | null. Un toque manual gana por GRACIA_OVERRIDE_MS: si
   * no, apagarle la luz a la noche la volveria a dormir al instante.
   */
  revisarSuenioAutomatico(ahoraMs = null, fecha = new Date()) {
    const ahora = ahoraMs ?? Date.now();
    const hora = fecha.getHours();
    const esNoche = hora >= HORA_DORMIR || hora < HORA_DESPERTAR;

    // v21: una siesta de dia termina sola cuando ya recupero toda la energia
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
    const criticas = ["hambre", "sed", "higiene", "energia", "felicidad"].filter(
      (s) => this.stats[s] <= 15
    ).length;

    // Enfermarse tiene que ser un evento raro, no el estado por defecto
    // de una vida normal: con -8/h bastaban 12,5 h de descuido.
    if (criticas >= 2) {
      this.stats.salud = clamp(this.stats.salud - 4 * horasPasadas);
    } else if (criticas === 0) {
      this.stats.salud = clamp(this.stats.salud + 6 * horasPasadas);
    }

    if (this.stats.salud <= 0 && !this.enferma) {
      this.enferma = true;
    }
  }

  // ------------------------------------------------------------------
  // PERSONALIDAD
  // ------------------------------------------------------------------

  registrarEventoRasgo(rasgo, peso = 1.0, ahoraMs = null) {
    if (!TRAITS.includes(rasgo)) return;
    this.traitsHistorico[rasgo] += peso;
    this.traitsReciente[rasgo] += peso;
    this._marcarInteraccion(ahoraMs);
  }

  decaerRecienteDiario() {
    // Llamar una vez por dia: el puntaje "reciente" se va olvidando de a poco.
    for (const t of TRAITS) {
      this.traitsReciente[t] *= 0.6;
    }
  }

  /**
   * v35: aplica el olvido de lo reciente una vez por cada dia (de calendario)
   * que paso desde la ultima vez, aunque la app haya estado cerrada.
   * Devuelve cuantos dias aplico.
   */
  decaerRasgosPorDias(ahoraMs = null) {
    const ahora = ahoraMs ?? Date.now();
    const hoy = diaLocal(ahora);
    const ultimo = typeof this.ultimoDecaimientoRasgos === "string" ? this.ultimoDecaimientoRasgos : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ultimo) || ultimo > hoy) {
      // un guardado de antes (o un reloj que fue para atras): se empieza a contar hoy
      this.ultimoDecaimientoRasgos = hoy;
      return 0;
    }
    if (ultimo === hoy) return 0;
    const [y, m, d] = ultimo.split("-").map(Number);
    const [y2, m2, d2] = hoy.split("-").map(Number);
    const dias = Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y, m - 1, d)) / 86400000);
    // (despues de ~20 dias lo reciente ya es casi cero: no hace falta seguir)
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
    const ganadores = TRAITS.filter((t) => puntajes[t] === mejor);
    return ganadores.length === 1 ? ganadores[0] : null;
  }

  // ------------------------------------------------------------------
  // ACCIONES DEL USUARIO
  // ------------------------------------------------------------------

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
    if (this.dormida) return false; // coherencia con feed/water/play
    this.stats.higiene = clamp(this.stats.higiene + 80);
    this.stats.felicidad = clamp(this.stats.felicidad + 5);
    this._marcarInteraccion(ahoraMs);
    return true;
  }

  alternarDormir(ahoraMs = null) {
    const ahora = ahoraMs ?? Date.now();
    this.dormida = !this.dormida;
    this.dormidaAuto = false;
    this.ultimoOverrideManualMs = ahora; // el automatico no discute por un rato
    this._marcarInteraccion(ahora);
    return true;
  }

  /** Acariciar: el gesto mas obvio de un celular, que antes no hacia nada. */
  mimar(ahoraMs = null) {
    const ahora = ahoraMs ?? Date.now();
    if (this.dormida) return false;
    this.stats.felicidad = clamp(this.stats.felicidad + 4);
    this.stats.vinculo = clamp(this.stats.vinculo + 1);
    this.registrarEventoRasgo("leal", 0.4, ahora);
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
    // Se llama cuando termina un minijuego (bocadosAtrapados = cuantos
    // resultados "buenos" hubo). v35: antes daba +35 aunque perdiera al
    // instante o lo abandonara; ahora jugar da un poquito y el resto
    // depende de como le fue. Y el premio lleno, uno cada 10 minutos:
    // si no, diez partidas de un segundo la ponian al 100.
    const ahora = ahoraMs ?? Date.now();
    const buenos = Math.max(0, Number(bocadosAtrapados) || 0);
    let ganancia = 10 + clamp(buenos * 6, 0, 40);
    if (ahora - (this.ultimoBonusJuegoMs || 0) < ENFRIAMIENTO_JUEGO_MS) {
      ganancia = Math.round(ganancia * 0.3);
    } else if (buenos > 0) {
      this.ultimoBonusJuegoMs = ahora;
    }
    this.stats.felicidad = clamp(this.stats.felicidad + ganancia);
    this.stats.hambre = clamp(this.stats.hambre + 5);
    this.stats.energia = clamp(this.stats.energia - 4); // v21: antes -8
    this.registrarEventoRasgo("sociable", 1.0, ahora);
    return ganancia;
  }

  registrarPasos(pasosNuevos, ahoraMs = null, { anotados = false } = {}) {
    // Devuelve true si con estos pasos se cruzo un nuevo hito de 1000
    // pasos totales — esa es la señal para disparar la especial "Orgulloso".
    // v22: los pasos anotados de la app Salud (ya caminados, de una vez) no
    // cansan y alegran menos por paso: 7.000 pasos no pueden dejarlo rendido.
    const pasosAntes = this.pasosTotales;
    this.pasosTotales += pasosNuevos;
    if (!anotados) this.stats.energia = clamp(this.stats.energia - pasosNuevos * 0.004); // v21: 3000 pasos = -12 (antes -30)
    this.stats.felicidad = clamp(this.stats.felicidad + pasosNuevos * (anotados ? 0.003 : 0.01));
    this.registrarEventoRasgo("explorador", pasosNuevos * 0.02, ahoraMs);

    const hitoAntes = Math.floor(pasosAntes / HITO_PASOS);
    const hitoDespues = Math.floor(this.pasosTotales / HITO_PASOS);
    return hitoDespues > hitoAntes;
  }

  visitarLugar(rasgoDelLugar, efectos, ahoraMs = null) {
    // efectos: objeto tipo {felicidad: 15, hambre: 10}
    for (const [stat, delta] of Object.entries(efectos)) {
      this.stats[stat] = clamp(this.stats[stat] + delta);
    }
    this.registrarEventoRasgo(rasgoDelLugar, 3.0, ahoraMs);
    return true;
  }

  // ------------------------------------------------------------------
  // GUARDAR / CARGAR
  // ------------------------------------------------------------------

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
      ultimoBonusJuegoMs: this.ultimoBonusJuegoMs,
    };
  }

  static desdeObjeto(datos) {
    const obj = new PetState(datos.nombre, datos.creadoEn);
    const { stats, traitsHistorico, traitsReciente, ...resto } = datos;
    Object.assign(obj, resto);
    // un guardado viejo puede no traer todos los campos: lo que falta queda
    // con su valor inicial (si no, una stat undefined contagia NaN a todo)
    obj.stats = { ...obj.stats, ...(stats || {}) };
    obj.traitsHistorico = { ...obj.traitsHistorico, ...(traitsHistorico || {}) };
    obj.traitsReciente = { ...obj.traitsReciente, ...(traitsReciente || {}) };
    // un guardado de antes de v35 no sabe cuando se olvido lo reciente: se cuenta desde hoy
    if (!datos.ultimoDecaimientoRasgos) obj.ultimoDecaimientoRasgos = diaLocal(Date.now());
    return obj;
  }
}

// ------------------------------------------------------------------
// LECTURA DE ESTADO PARA LA CARA (portado de estado_cara() / pantalla.py)
// ------------------------------------------------------------------

export function nivel(valor, corteBajo = 35, corteAlto = 65) {
  if (valor < corteBajo) return "baja";
  if (valor > corteAlto) return "alta";
  return "neutral";
}

export const FELICIDAD_A_BOCA = { alta: "feliz", neutral: "neutral", baja: "triste" };

export function nivelEnergiaCara(mascota) {
  // La sed pesa igual que el hambre en la cara: si no, el usuario no
  // tendria forma de notar que hace falta agua sin abrir Stats.
  if (mascota.stats.hambre <= 15 || mascota.stats.sed <= 15) return "baja";
  return nivel(mascota.stats.energia);
}

export function estadoCara(mascota) {
  if (mascota.enferma) return { tipo: "enferma" };
  if (mascota.dormida) return { tipo: "dormida" };
  if (mascota.stats.aburrimiento >= 85) return { tipo: "aburrido" };

  const nivelEnergia = nivelEnergiaCara(mascota);
  const nivelFelicidad = nivel(mascota.stats.felicidad);
  return { tipo: "base", nivelEnergia, nivelFelicidad };
}

export function especialPorEstado(mascota) {
  if (mascota.stats.hambre <= 15) return "hambriento";
  if (mascota.stats.sed <= 15) return "sediento";
  if (mascota.stats.higiene <= 15) return "asqueado";
  return null;
}
