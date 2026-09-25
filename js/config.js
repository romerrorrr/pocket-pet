/**
 * config.js — EL UNICO ARCHIVO QUE ROM TIENE QUE TOCAR PARA EL FINAL
 * ====================================================================
 * Todo lo personal del final vive aca, separado del codigo. Nada se
 * rompe si algo queda vacio: los campos vacios se saltean solos (ella
 * nunca ve un "TODO").
 *
 * {nombre} se reemplaza por el nombre que ella escribio al empezar.
 * Texto en ingles (el idioma de la app). Lineas cortas pegan mas.
 */

export const FINAL = {
  // PIN del modo director (5 toques rapidos sobre el reloj de la
  // pantalla principal). CAMBIALO antes de instalarle la app a ella.
  pin: "0000",

  // ---------------------------------------------------------------
  // COMO SE DISPARA (sin QR, sin nada que ella tenga que encontrar)
  //
  //   1. La busqueda queda ARMADA: a mano desde el modo director, o
  //      sola a partir de `armarDesde`. Armada no se nota en nada.
  //   2. Cuando ella abre Baozi estando en el lago (GPS dentro de
  //      `lugar`), Baozi se entusiasma y le pide una selfie de los dos.
  //   3. Esa selfie, al revelarse, se convierte en el bote. Empieza.
  //
  // Respaldo si el GPS no ayuda arriba del agua: `pedirSinGPSDesde`,
  // o el boton "Ask for the photo now" del modo director.
  // ---------------------------------------------------------------

  // Hora local de su telefono. null = solo se arma a mano.
  // Ejemplo: "2026-10-18T09:00"
  armarDesde: null,

  // Donde tiene que estar para que Baozi pida la foto. Por defecto:
  // todo West Lake (centro del lago, 1.8 km de radio). Si sabes el
  // muelle o la zona exacta, poné esas coordenadas y un radio menor.
  lugar: { nombre: "West Lake", lat: 30.2455, lon: 120.1418, radioMetros: 1800 },

  // Si esta armada y a esta hora todavia no se pidio la foto, se pide
  // igual, este donde este. null = nunca sin GPS.
  pedirSinGPSDesde: null,

  // ---------------------------------------------------------------
  // Lo que dice Baozi al pedir la foto (voz de Baozi, sin pistas).
  // ---------------------------------------------------------------
  pedido: [
    "We're on the lake!! Look how pretty it is…",
    "{nombre}, take a photo of us two? For my album!",
  ],

  // ---------------------------------------------------------------
  // LA SECUENCIA
  //   el bote entra con los dos -> zoom -> ella -> vos -> tu dialogo
  //   mientras pasan todas sus fotos con musica -> "look up" -> un
  //   corazon latiendo mientras le das el anillo.
  // ---------------------------------------------------------------

  // Los ojos de los dos son los de Baozi. Los tuyos, tal cual (lavanda).
  // Los de ella, con otro iris: "rosa" o "cafe".
  ojosDeElla: "rosa",

  // Tu nombre en la cajita de dialogo. "" = sin cartelito.
  nombreDeEl: "",

  // TU DIALOGO. Una linea = una caja de texto; avanzan solas al ritmo
  // de lectura (y ella puede tocar para seguir). Mientras tanto pasan
  // todas las fotos que sacaron juntos. Vacio = solo fotos y musica.
  //
  // Las lineas que empiezan con "TODO" son de relleno: se ven SOLO en el
  // ensayo (para ver donde va cada cosa) y NUNCA en el de verdad.
  carta: [
    "TODO: Line 1 — start here (how we met, the first thing you want to say).",
    "TODO: Line 2 — a memory of the two of you.",
    "TODO: Line 3 — what she means to you.",
    "TODO: Line 4 — the last line before 'Look up.'",
  ],

  // Lo ultimo que dice la pantalla antes de que ella levante la vista.
  mirarArriba: "Look up.",

  // Despues del si (cuando ella toca el corazon).
  celebracion: ["YES!!!", "Baozi knew it all along."],
  fotoConAnillo: "Now one with the ring?",

  // Si el sonido esta apagado en Journal → Sound, igual suena la
  // musica del final (es una sola vez en la vida).
  musicaIgnoraSilencio: true,
};

/**
 * Musica real (opcional). Por defecto cada escena especial usa un tema
 * chiptune original (ver musica.js). Para usar una cancion tuya, poné
 * el archivo en assets/musica/ con el nombre de la escena (ej.
 * assets/musica/propuesta.mp3) y agregá la escena a esta lista. Si el
 * archivo no esta o no carga, vuelve solo al tema chiptune.
 *
 * Escenas: "propuesta", "si", "carta", "descubrimiento", "enamorado"
 */
export const MUSICA_CLIPS = [
  // "propuesta",
];

// v22: la radio del cuarto. Tocarla cambia de estacion: primero las 4
// chiptune originales de Baozi, despues las canciones de rom (si hay) y
// despues "Off". Para sumar una cancion tuya como estacion: el archivo en
// assets/musica/<archivo>.mp3 y una linea aca, por ejemplo:
//   { archivo: "casa", nombre: "Our song" },
export const ESTACIONES_PROPIAS = [];

// -------------------------------------------------------------------
// LOS LUGARES DE USTEDES (sellos de Hangzhou)
//   Cuando ella abre Baozi cerca de uno de estos lugares, cae un sello
//   en el mapa de corcho y Baozi le pide una foto para la postal.
//   Ya vienen West Lake, Longjing, Lingyin y Leifeng. Sumá los de
//   ustedes (el café de la primera cita, su facultad, el depto...):
//
//   { id: "cafe", nombre: "Our first coffee", lat: 30.2601, lon: 120.1655,
//     sello: "cafe", frase: "Wait… this is where it all started!" },
//
//   sello: "corazon" | "cafe" | "casa" | "estrella" (lo dibujo yo)
//   Las coordenadas salen de Google Maps: click derecho sobre el lugar.
// -------------------------------------------------------------------
export const LUGARES_PROPIOS = [];


// ---------------------------------------------------------------------
// v19: fechas de ustedes. Al tocar el calendario del cuarto, el personaje
// cuenta cuanto falta para la proxima. Vacio = solo dice la fecha de hoy.
// Ejemplo: { nombre: "our anniversary", mes: 3, dia: 14 }   (mes 1..12)
// ---------------------------------------------------------------------
export const FECHAS = [];
