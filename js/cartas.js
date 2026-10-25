/**
 * cartas.js
 * ==========
 * Cartas que Baozi "trae" al cruzar un hito: los pasos caminados juntos,
 * al descubrir un lugar, al enamorarse de alguien y, despues del si, en
 * las fechas del compromiso. Reusa la pantalla narrativa que ya existe, no
 * necesita arte, y es la via mas directa para que la voz de rom aparezca
 * de a poco en vez de toda junta el ultimo dia.
 *
 * El texto es de rom (en ingles, como toda la app). Se puede cambiar
 * cuando quiera: los id y las condiciones ya estan cableados y
 * probados, no hace falta tocar nada mas. El texto no pasa por el
 * cambio Baozi -> Mantou (data-sin-nombre): por eso no nombra a la
 * mascota. Entra comodo en la pantalla hasta ~300 letras.
 *
 * Ritmo (v33, rom: "llegan demasiado rapido"): las de pasos y las
 * atrasadas llegan como mucho una por dia (main.js). Las de un momento
 * (un lugar, el primer In Love) llegan en ese momento. Los id no cambian
 * aunque cambie el hito: asi una carta que ya llego no vuelve a llegar.
 */

export const CARTAS = [
  {
    id: "pasos_5k",
    condicion: { tipo: "pasos", valor: 10000 },
    titulo: "10,000 steps together",
    texto: "Hi, my love. Our little friend asked me to write you something, so here it is: thank you for walking with me. 10,000 steps already, and every single one was better because you were next to me. Let's keep going? — Juan",
  },
  {
    id: "pasos_15k",
    condicion: { tipo: "pasos", valor: 30000 },
    titulo: "30,000 steps together",
    texto: "30,000 steps! Honestly, I don't always notice where we're going, because I'm too busy looking at you. Thank you for every walk: the long ones, the lazy ones, the ones with snacks and the ones with no plan at all. — Juan",
  },
  {
    id: "pasos_30k",
    condicion: { tipo: "pasos", valor: 60000 },
    titulo: "60,000 steps together",
    texto: "60,000 steps. That's a lot of Hangzhou! I hope you know that the best part of any place is that you're in it. Wherever we go next, near or far, I want to get there walking next to you. — Juan",
  },
  {
    id: "pasos_60k",
    condicion: { tipo: "pasos", valor: 120000 },
    titulo: "120,000 steps together",
    texto: "120,000 steps together! If I could, I would walk every single one of them again, the same way, next to the same person. Thank you for letting me walk beside you. I'm not planning on stopping anytime soon. — Juan",
  },
  {
    id: "lugar_westlake",
    condicion: { tipo: "lugar", valor: "westlake" },
    titulo: "About West Lake",
    texto: "They say that a long time ago, two people met by this lake in the rain, shared an umbrella, and that was it: love for a thousand years. I don't need the legend. I already know exactly how that feels. — Juan",
  },
  {
    id: "lugar_longjing",
    condicion: { tipo: "lugar", valor: "longjing" },
    titulo: "About Longjing",
    texto: "Here they pick the tea leaf by leaf, by hand, and the first leaves of spring are the most precious ones. I think the best things are like that: they take patience and care. That's how I want to love you, every day. — Juan",
  },
  {
    id: "lugar_lingyin",
    condicion: { tipo: "lugar", valor: "lingyin" },
    titulo: "About Lingyin",
    texto: "People come to Lingyin to light incense and make a wish. Can I tell you a secret? I don't know what to wish for anymore, because the thing I wanted most already found me. (Okay, maybe more dumplings.) — Juan",
  },
  {
    id: "primer_enamorado",
    condicion: { tipo: "enamorado" },
    titulo: "Baozi is in love",
    texto: "Look at that, our little friend fell in love! Big eyes, silly smile, can't stop thinking about someone… I know that feeling very well. I've had it every single day since Hong Kong. — Juan",
  },
  // v33: despues del si (dias desde el si), y el dia de la boda (una fecha
  // "Wedding" con su año en el calendario del cuarto)
  {
    id: "si_30",
    condicion: { tipo: "trasElSi", dias: 30 },
    titulo: "One month engaged",
    texto: "One month ago you said yes, and I still smile like an idiot every time I see the ring on your hand. Thank you for choosing me. I promise to keep choosing you, every single day. — Juan",
  },
  {
    id: "si_100",
    condicion: { tipo: "trasElSi", dias: 100 },
    titulo: "100 days",
    texto: "100 days since you said yes. They say the first hundred days are worth celebrating, so consider this my little celebration: thank you for every one of them. Here's to the next ten thousand. — Juan",
  },
  {
    id: "si_182",
    condicion: { tipo: "trasElSi", dias: 182 },
    titulo: "Half a year",
    texto: "Six months ago, on a little boat on West Lake, you said yes. I think about that moment more than you'd believe. Every day since then has felt like the beginning of something beautiful. — Juan",
  },
  {
    id: "si_365",
    condicion: { tipo: "trasElSi", dias: 365 },
    titulo: "One year engaged",
    texto: "One year since West Lake. A whole year of being your fiancé… I love saying that word. Whatever the next year brings, I want to face it holding your hand. Thank you for saying yes. — Juan",
  },
  {
    id: "boda",
    condicion: { tipo: "boda" },
    titulo: "Our wedding day",
    texto: "Today is the day. Whatever happens, wherever we are, I just want you to know: marrying you is the best thing I will ever do. I'll be the one waiting for you, with the biggest smile. — Juan",
  },
];

export function buscarCarta(id) {
  return CARTAS.find((c) => c.id === id) || null;
}

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

/**
 * Las cartas que la mascota trae al cuarto (de a una por dia): las de algo
 * que ya paso sin que se entregara (un lugar sellado antes de que la carta
 * existiera, el primer In Love) y las del compromiso. Las de pasos no:
 * esas llegan solas la proxima vez que se anotan pasos.
 * pasado = { sellados: Set de ids, enamorado: bool, diasTrasElSi: numero|null, boda: bool }
 * v35: boda = HOY es el dia de la boda (fechas.bodaEsHoy): la carta dice
 * "Today is the day", asi que no llega otro dia; y ese dia va primero.
 * Las del compromiso (un mes, 100 dias...) llegan hasta MAX_DIAS_TARDE
 * despues de su fecha: "One month ago you said yes" a los tres meses no.
 */
export const MAX_DIAS_TARDE = 14;
export function cartaAtrasada(entregadas, { sellados = new Set(), enamorado = false, diasTrasElSi = null, boda = false } = {}) {
  const lista = boda ? [...CARTAS].sort((a, b) => (b.condicion.tipo === "boda") - (a.condicion.tipo === "boda")) : CARTAS;
  for (const carta of lista) {
    if (entregadas.includes(carta.id) || !cartaEscrita(carta)) continue;
    const c = carta.condicion;
    if (c.tipo === "lugar" && sellados.has(c.valor)) return carta;
    if (c.tipo === "enamorado" && enamorado) return carta;
    if (c.tipo === "trasElSi" && diasTrasElSi != null && diasTrasElSi >= c.dias && diasTrasElSi - c.dias <= MAX_DIAS_TARDE) return carta;
    if (c.tipo === "boda" && boda) return carta;
  }
  return null;
}

/**
 * Devuelve la PRIMERA carta que corresponda entregar ahora y todavia no se
 * haya entregado — de a una por vez, a proposito: dos cartas seguidas se
 * pisarian y ninguna se leeria con atencion.
 *
 * `contexto` es { pasosTotales, lugarDescubierto, huboEnamorado, sinPasos }
 * (sinPasos: hoy ya llego una carta, las de pasos esperan a otro dia).
 */
export function cartaPendiente(contexto, entregadas) {
  const yaEsta = (id) => entregadas.includes(id);

  for (const carta of CARTAS) {
    if (yaEsta(carta.id)) continue;
    if (!cartaEscrita(carta)) continue;
    const c = carta.condicion;

    if (c.tipo === "pasos" && !contexto.sinPasos && (contexto.pasosTotales || 0) >= c.valor) return carta;
    if (c.tipo === "lugar" && contexto.lugarDescubierto === c.valor) return carta;
    if (c.tipo === "enamorado" && contexto.huboEnamorado) return carta;
  }
  return null;
}
