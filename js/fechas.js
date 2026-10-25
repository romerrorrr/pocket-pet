/**
 * fechas.js
 * ==========
 * v33: las fechas de ustedes. Las de config.js (FECHAS) vienen fijas; las
 * que ella agrega desde el calendario del cuarto van en el guardado. Cada
 * una se repite todos los años (un cumpleaños, un aniversario); si tiene
 * año, la primera vez es ese año (la boda: antes cuenta los dias, despues
 * es el aniversario).
 *
 * El tipo "boda" (Wedding) solo se ofrece despues del si: antes seria una
 * pista. El dia de la boda la mascota trae una carta (cartas.js).
 *
 * Sin DOM: main.js arma la pantalla con render.js.
 */

export const TIPOS_FECHA = ["aniversario", "cumple", "boda", "otra"];
export const NOMBRES_TIPO = { aniversario: "Anniversary", cumple: "Birthday", boda: "Wedding", otra: "Other" };
export const MAX_FECHAS = 30;

const diasDelMes = (anio, mes) => new Date(anio, mes, 0).getDate(); // mes 1..12

/** Una fecha valida (limpia) o null. */
export function fechaValida(f) {
  if (!f || typeof f !== "object") return null;
  const nombre = String(f.nombre || "").trim().slice(0, 28);
  const mes = Math.floor(Number(f.mes));
  const dia = Math.floor(Number(f.dia));
  const anio = f.anio == null || f.anio === "" ? null : Math.floor(Number(f.anio));
  if (!nombre || !(mes >= 1 && mes <= 12) || !(dia >= 1 && dia <= 31)) return null;
  if (anio != null && !(anio >= 1900 && anio <= 2200)) return null;
  // el 29 de febrero sin año vale (los años que no hay, se festeja el 28)
  if (dia > diasDelMes(anio ?? 2000, mes)) return null;
  return {
    id: typeof f.id === "string" && /^fecha_[a-z0-9_]+$/.test(f.id) ? f.id : `fecha_${Date.now().toString(36)}`,
    nombre,
    mes,
    dia,
    anio,
    tipo: TIPOS_FECHA.includes(f.tipo) ? f.tipo : "otra",
  };
}

/** Las de config.js con la misma forma (fijas: no se borran desde el juego). */
export function fechasDeConfig(lista) {
  return (lista || [])
    .map((f, i) => (f && f.nombre && f.mes && f.dia ? { id: `config_${i}`, nombre: f.nombre, mes: f.mes, dia: f.dia, anio: f.anio ?? null, tipo: f.tipo || "aniversario", fija: true } : null))
    .filter(Boolean);
}

const soloDia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** El dia (Date) de la proxima vez que toca, desde hoy (incluido). */
export function proximaVez(f, ahora = new Date()) {
  const hoy = soloDia(ahora);
  const en = (anio) => new Date(anio, f.mes - 1, Math.min(f.dia, diasDelMes(anio, f.mes)));
  if (f.anio != null && en(f.anio) >= hoy) return en(f.anio);
  let d = en(hoy.getFullYear());
  if (d < hoy) d = en(hoy.getFullYear() + 1);
  return d;
}

/** Cuantos dias faltan (0 = hoy). */
export function diasHasta(f, ahora = new Date()) {
  return Math.round((proximaVez(f, ahora) - soloDia(ahora)) / 86400000);
}

/** Cuantas veces se cumplio ya (los años desde la primera), o null si no tiene año. */
export function vecesCumplidas(f, ahora = new Date()) {
  if (f.anio == null) return null;
  // v35: los años YA cumplidos (antes contaba hasta la proxima vez: con un
  // año cumplido decia "2 years"). El mismo dia ya cuenta.
  const proxima = proximaVez(f, ahora).getFullYear() - f.anio;
  return Math.max(0, diasHasta(f, ahora) === 0 ? proxima : proxima - 1);
}

/** Todas, de la mas cercana a la mas lejana. */
export function ordenadas(lista, ahora = new Date()) {
  return [...lista].sort((a, b) => diasHasta(a, ahora) - diasHasta(b, ahora));
}

/** La proxima (o null): { nombre, dias, f }. */
export function proxima(lista, ahora = new Date()) {
  const [f] = ordenadas(lista, ahora);
  return f ? { nombre: f.nombre, dias: diasHasta(f, ahora), f } : null;
}

/** ¿Ya llego el dia de la boda? (una fecha "boda" con año, de hoy o de antes) */
export function bodaLlego(lista, ahora = new Date()) {
  return lista.some((f) => f.tipo === "boda" && f.anio != null && new Date(f.anio, f.mes - 1, f.dia) <= soloDia(ahora));
}

/**
 * v35: ¿HOY es el dia de la boda? (con año; hasta las 4 de la mañana del
 * dia siguiente sigue siendo "hoy", como la pagina del diario). La carta de
 * la boda dice "Today is the day": solo llega ese dia.
 */
export function bodaEsHoy(lista, ahora = new Date()) {
  const ref = ahora.getHours() < 4 ? new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 1) : ahora;
  return lista.some((f) => f.tipo === "boda" && f.anio != null && f.anio === ref.getFullYear() && f.mes === ref.getMonth() + 1 && f.dia === ref.getDate());
}
