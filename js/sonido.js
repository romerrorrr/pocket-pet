/**
 * sonido.js
 * ==========
 * Sintesis con Web Audio: cero archivos de audio, cero descargas, cero
 * arte. Son ondas cuadradas cortas con envolvente — el mismo tipo de
 * sonido que haria un buzzer piezo pegado al ESP32, que es exactamente
 * el vocabulario sonoro que corresponde a este aparato (no samples
 * realistas: blips).
 *
 * Reglas del navegador que condicionan el diseño de este modulo:
 *  - El AudioContext no puede arrancar sin un gesto real del usuario,
 *    asi que se crea perezosamente y se "despierta" en el primer toque
 *    (ver despertarConPrimerToque()).
 *  - En iOS el contexto se suspende al volver de segundo plano: por eso
 *    cada sonido llama a resume() si hace falta, en vez de asumir.
 *
 * La preferencia (sonido si/no) vive aparte del guardado del juego: es
 * una preferencia del dispositivo, no progreso de la mascota.
 */

const CLAVE_PREF = "mochi_sonido";

let ctx = null;
let habilitado = true;

try {
  habilitado = localStorage.getItem(CLAVE_PREF) !== "0";
} catch (e) {
  habilitado = true;
}

/**
 * iOS (Safari 17+): la sesion de audio. En el dia a dia va "ambient": se
 * mezcla con la musica que ella este escuchando (no la corta) y respeta
 * el switch de silencio. Durante el final despierto.js la pasa a
 * "playback" para que la musica suene aunque el telefono este en silencio.
 */
export function modoDeAudio(tipo) {
  try {
    if (navigator.audioSession) navigator.audioSession.type = tipo;
  } catch (e) {
    /* no soportado: no pasa nada */
  }
}
modoDeAudio("ambient");

export function contexto() {
  if (ctx) return ctx;
  const Constructor = window.AudioContext || window.webkitAudioContext;
  if (!Constructor) return null;
  try {
    ctx = new Constructor();
  } catch (e) {
    ctx = null;
  }
  return ctx;
}

/**
 * Una nota. `forma` es el timbre, `dur` en segundos, `vol` relativo.
 * `desliz` (opcional) es la frecuencia final: si esta, la nota barre de
 * `frec` a `desliz` — es lo que da el "pio" ascendente de atrapar.
 */
function nota(frec, inicio, dur, { forma = "square", vol = 0.18, desliz = null } = {}) {
  const c = contexto();
  if (!c) return;

  const osc = c.createOscillator();
  const ganancia = c.createGain();
  osc.type = forma;
  osc.frequency.setValueAtTime(frec, inicio);
  if (desliz) osc.frequency.exponentialRampToValueAtTime(desliz, inicio + dur);

  // Envolvente: ataque muy corto y caida exponencial. Sin esto, cada
  // nota arranca y corta con un "click" audible.
  ganancia.gain.setValueAtTime(0.0001, inicio);
  ganancia.gain.exponentialRampToValueAtTime(vol, inicio + 0.012);
  ganancia.gain.exponentialRampToValueAtTime(0.0001, inicio + dur);

  osc.connect(ganancia);
  ganancia.connect(c.destination);
  osc.start(inicio);
  osc.stop(inicio + dur + 0.02);
}

// Cada entrada es una lista de [frecuencia, retrasoSeg, duracionSeg, opts]
const VOCES = {
  comer: (t) => {
    nota(523, t, 0.08);
    nota(659, t + 0.09, 0.08);
    nota(784, t + 0.18, 0.12);
  },
  beber: (t) => {
    nota(440, t, 0.07, { forma: "triangle" });
    nota(660, t + 0.08, 0.14, { forma: "triangle" });
  },
  limpiar: (t) => {
    nota(880, t, 0.06, { forma: "triangle", vol: 0.12, desliz: 1600 });
    nota(1046, t + 0.1, 0.06, { forma: "triangle", vol: 0.12, desliz: 1760 });
    nota(1318, t + 0.2, 0.1, { forma: "triangle", vol: 0.12, desliz: 1980 });
  },
  dormir: (t) => {
    nota(587, t, 0.16, { forma: "sine", vol: 0.14 });
    nota(440, t + 0.16, 0.16, { forma: "sine", vol: 0.14 });
    nota(330, t + 0.32, 0.26, { forma: "sine", vol: 0.14 });
  },
  despertar: (t) => {
    nota(392, t, 0.1, { forma: "sine", vol: 0.14 });
    nota(587, t + 0.1, 0.16, { forma: "sine", vol: 0.14 });
  },
  medicina: (t) => {
    nota(659, t, 0.1, { forma: "sine" });
    nota(880, t + 0.12, 0.2, { forma: "sine" });
  },
  atrapar: (t) => nota(880, t, 0.1, { desliz: 1320, vol: 0.16 }),
  mimo: (t) => {
    nota(660, t, 0.09, { forma: "sine", vol: 0.13 });
    nota(990, t + 0.07, 0.14, { forma: "sine", vol: 0.11 });
  },
  encuentro: (t) => {
    nota(523, t, 0.1);
    nota(659, t + 0.11, 0.1);
    nota(784, t + 0.22, 0.1);
    nota(1046, t + 0.33, 0.2);
  },
  descubrimiento: (t) => {
    nota(392, t, 0.12);
    nota(523, t + 0.12, 0.12);
    nota(659, t + 0.24, 0.12);
    nota(880, t + 0.36, 0.28);
  },
  hito: (t) => {
    nota(523, t, 0.1);
    nota(523, t + 0.11, 0.08);
    nota(784, t + 0.2, 0.1);
    nota(1046, t + 0.32, 0.32);
  },
  carta: (t) => {
    nota(698, t, 0.14, { forma: "sine", vol: 0.15 });
    nota(880, t + 0.15, 0.14, { forma: "sine", vol: 0.15 });
    nota(1174, t + 0.3, 0.3, { forma: "sine", vol: 0.13 });
  },
  paso: (t) => nota(220, t, 0.04, { forma: "triangle", vol: 0.07 }),
  // --- lente, final, primer arranque ---
  obturador: (t) => {
    nota(1800, t, 0.03, { forma: "square", vol: 0.1, desliz: 900 });
    nota(300, t + 0.04, 0.06, { forma: "triangle", vol: 0.12, desliz: 120 });
  },
  impresora: (t) => {
    for (let i = 0; i < 6; i++) nota(i % 2 ? 180 : 240, t + i * 0.09, 0.05, { forma: "square", vol: 0.035 });
  },
  guardado: (t) => {
    nota(784, t, 0.07, { forma: "triangle", vol: 0.14 });
    nota(1175, t + 0.08, 0.14, { forma: "triangle", vol: 0.14 });
  },
  enganche: (t) => {
    nota(988, t, 0.05, { vol: 0.08 });
    nota(1319, t + 0.06, 0.08, { vol: 0.08 });
  },
  hallazgo: (t) => {
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => nota(f, t + i * 0.07, 0.12, { vol: 0.11 }));
  },
  tecla: (t) => nota(620 + Math.random() * 60, t, 0.025, { forma: "square", vol: 0.025 }),
  grieta: (t) => {
    nota(160, t, 0.05, { forma: "sawtooth", vol: 0.08, desliz: 90 });
    nota(1400, t + 0.02, 0.03, { forma: "square", vol: 0.04 });
  },
  eclosion: (t) => {
    nota(392, t, 0.08, { vol: 0.1 });
    nota(523, t + 0.08, 0.08, { vol: 0.1 });
    nota(659, t + 0.16, 0.08, { vol: 0.1 });
    nota(1047, t + 0.24, 0.3, { forma: "triangle", vol: 0.14 });
  },
  tocar: (t) => nota(880, t, 0.03, { forma: "square", vol: 0.04 }),
  no: (t) => {
    nota(220, t, 0.1, { forma: "sawtooth", vol: 0.1 });
    nota(165, t + 0.11, 0.18, { forma: "sawtooth", vol: 0.1 });
  },
};

export function sonar(tipo) {
  if (!habilitado) return;
  const voz = VOCES[tipo];
  if (!voz) return;
  const c = contexto();
  if (!c) return;
  if (c.state !== "running") c.resume().catch(() => {}); // "suspended" o el "interrupted" de iOS
  try {
    voz(c.currentTime + 0.01);
  } catch (e) {
    /* que un sonido falle nunca puede romper el juego */
  }
}

/**
 * El navegador exige un gesto real antes de dejar sonar nada. Se engancha
 * una sola vez al primer toque y se desengancha solo.
 */
export function despertarConPrimerToque() {
  let desbloqueado = false;
  const abrir = () => {
    const c = contexto();
    if (!c) return;
    // En iOS el contexto se vuelve a suspender al pasar a segundo plano.
    // Por eso el listener queda puesto para siempre (es barato): cada
    // toque lo reanima, y la musica del final — que arranca sin toque,
    // al detectar la tarjeta — lo encuentra despierto.
    if (c.state !== "running") c.resume().catch(() => {});
    if (desbloqueado) return;
    desbloqueado = true;
    // iOS viejo: el contexto solo queda "desbloqueado" de verdad despues
    // de reproducir algo dentro del gesto. Un buffer mudo de 1 muestra.
    try {
      const b = c.createBuffer(1, 1, 22050);
      const s = c.createBufferSource();
      s.buffer = b;
      s.connect(c.destination);
      s.start(0);
    } catch (e) {
      /* nada */
    }
  };
  window.addEventListener("pointerdown", abrir, { passive: true });
  window.addEventListener("touchstart", abrir, { passive: true });
}

export function sonidoHabilitado() {
  return habilitado;
}

export function alternarSonido() {
  habilitado = !habilitado;
  try {
    localStorage.setItem(CLAVE_PREF, habilitado ? "1" : "0");
  } catch (e) {
    /* modo privado: la preferencia dura solo esta sesion */
  }
  if (habilitado) sonar("mimo"); // confirmacion audible de que volvio
  return habilitado;
}
