/**
 * cartas.js
 * ==========
 * Cartas que Baozi "trae" al cruzar un hito: cada 5.000 pasos, al
 * descubrir un lugar, al enamorarse de alguien. Reusa la pantalla
 * narrativa que ya existe, no necesita arte, y es la via mas directa
 * para que la voz de rom aparezca de a poco durante las semanas previas
 * en vez de toda junta el ultimo dia.
 *
 * ============================================================
 *  TODO (rom): el TEXTO de estas cartas lo escribis vos.
 *  Lo que esta abajo son marcadores neutros y deliberadamente
 *  genericos — NO son texto final y no pretenden sonar como vos.
 *  Cambiar solo el campo `texto`: los id y las condiciones ya
 *  estan cableados y probados, no hace falta tocar nada mas.
 * ============================================================
 */

export const CARTAS = [
  {
    id: "pasos_5k",
    condicion: { tipo: "pasos", valor: 5000 },
    titulo: "A note from Baozi",
    texto: "TODO: primera carta — 5.000 pasos juntos.",
  },
  {
    id: "pasos_15k",
    condicion: { tipo: "pasos", valor: 15000 },
    titulo: "A note from Baozi",
    texto: "TODO: segunda carta — 15.000 pasos.",
  },
  {
    id: "pasos_30k",
    condicion: { tipo: "pasos", valor: 30000 },
    titulo: "A note from Baozi",
    texto: "TODO: tercera carta — 30.000 pasos.",
  },
  {
    id: "pasos_60k",
    condicion: { tipo: "pasos", valor: 60000 },
    titulo: "A note from Baozi",
    texto: "TODO: cuarta carta — 60.000 pasos.",
  },
  {
    id: "lugar_westlake",
    condicion: { tipo: "lugar", valor: "westlake" },
    titulo: "About West Lake",
    texto: "TODO: que significa West Lake para ustedes dos.",
  },
  {
    id: "lugar_longjing",
    condicion: { tipo: "lugar", valor: "longjing" },
    titulo: "About Longjing",
    texto: "TODO: que significa Longjing para ustedes dos.",
  },
  {
    id: "lugar_lingyin",
    condicion: { tipo: "lugar", valor: "lingyin" },
    titulo: "About Lingyin",
    texto: "TODO: que significa Lingyin para ustedes dos.",
  },
  {
    id: "primer_enamorado",
    condicion: { tipo: "enamorado" },
    titulo: "Baozi is in love",
    texto: "TODO: la carta del primer 'In Love'.",
  },
];

export function buscarCarta(id) {
  return CARTAS.find((c) => c.id === id) || null;
}

/**
 * Devuelve la PRIMERA carta que corresponda entregar y todavia no se
 * haya entregado — de a una por vez, a proposito: dos cartas seguidas se
 * pisarian y ninguna se leeria con atencion.
 *
 * `contexto` es { pasosTotales, lugarDescubierto, huboEnamorado }.
 */
/**
 * Una carta sin texto real (vacia o que todavia dice "TODO") NO se
 * entrega nunca: ella jamas tiene que ver un marcador. Queda sin marcar
 * como entregada, asi que si rom la escribe despues, las de pasos
 * llegan en el proximo hito que corresponda.
 */
export function cartaEscrita(carta) {
  const t = (carta && carta.texto ? carta.texto : "").trim();
  return t.length > 0 && !/^TODO/i.test(t);
}

export function cartaPendiente(contexto, entregadas) {
  const yaEsta = (id) => entregadas.includes(id);

  for (const carta of CARTAS) {
    if (yaEsta(carta.id)) continue;
    if (!cartaEscrita(carta)) continue;
    const c = carta.condicion;

    if (c.tipo === "pasos" && (contexto.pasosTotales || 0) >= c.valor) return carta;
    if (c.tipo === "lugar" && contexto.lugarDescubierto === c.valor) return carta;
    if (c.tipo === "enamorado" && contexto.huboEnamorado) return carta;
  }
  return null;
}
