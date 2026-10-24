/**
 * cartas.js
 * ==========
 * Cartas que Baozi "trae" al cruzar un hito: cada 5.000 pasos, al
 * descubrir un lugar, al enamorarse de alguien. Reusa la pantalla
 * narrativa que ya existe, no necesita arte, y es la via mas directa
 * para que la voz de rom aparezca de a poco durante las semanas previas
 * en vez de toda junta el ultimo dia.
 *
 * El texto es de rom (en ingles, como toda la app). Se puede cambiar
 * cuando quiera: los id y las condiciones ya estan cableados y
 * probados, no hace falta tocar nada mas. El texto no pasa por el
 * cambio Baozi -> Mantou (data-sin-nombre): por eso no nombra a la
 * mascota. Entra comodo en la pantalla hasta ~300 letras.
 */

export const CARTAS = [
  {
    id: "pasos_5k",
    condicion: { tipo: "pasos", valor: 5000 },
    titulo: "5,000 steps together",
    texto: "Hi, my love. Our little friend asked me to write you something, so here it is: thank you for walking with me. 5,000 steps already, and every single one was better because you were next to me. Let's keep going? — Juan",
  },
  {
    id: "pasos_15k",
    condicion: { tipo: "pasos", valor: 15000 },
    titulo: "15,000 steps together",
    texto: "15,000 steps! Honestly, I don't always notice where we're going, because I'm too busy looking at you. Thank you for every walk: the long ones, the lazy ones, the ones with snacks and the ones with no plan at all. — Juan",
  },
  {
    id: "pasos_30k",
    condicion: { tipo: "pasos", valor: 30000 },
    titulo: "30,000 steps together",
    texto: "30,000 steps. That's a lot of Hangzhou! I hope you know that the best part of any place is that you're in it. Wherever we go next, near or far, I want to get there walking next to you. — Juan",
  },
  {
    id: "pasos_60k",
    condicion: { tipo: "pasos", valor: 60000 },
    titulo: "60,000 steps together",
    texto: "60,000 steps together! If I could, I would walk every single one of them again, the same way, next to the same person. Thank you for letting me walk beside you. I'm not planning on stopping anytime soon. — Juan",
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

/**
 * v30: una carta de lugar o de "In Love" cuyo momento ya paso sin que se
 * entregara (el lugar se sello antes de que la carta estuviera escrita, por
 * ejemplo). La trae la mascota la proxima vez que ella esta en el cuarto.
 * Las de pasos no: esas llegan solas la proxima vez que se anotan pasos.
 * pasado = { sellados: Set de ids, enamorado: bool }
 */
export function cartaAtrasada(entregadas, { sellados = new Set(), enamorado = false } = {}) {
  for (const carta of CARTAS) {
    if (entregadas.includes(carta.id) || !cartaEscrita(carta)) continue;
    const c = carta.condicion;
    if (c.tipo === "lugar" && sellados.has(c.valor)) return carta;
    if (c.tipo === "enamorado" && enamorado) return carta;
  }
  return null;
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
