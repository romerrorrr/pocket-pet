/**
 * gameController.js
 * ==================
 * El equivalente de menu.py + buena parte de la maquina de estados de
 * main.py, pero para dedos en vez de 3 botones.
 *
 * Care/Play/Journal son tabs siempre visibles, y cada categoria abre un
 * carrusel tipo ruleta (item grande al centro, vecinos asomando) — se
 * volvio a esa metafora del aparato fisico a pedido del usuario, tras
 * probar una grilla de tarjetas en la fase 1. La estructura de datos
 * (MENU_CATEGORIAS) es la misma que pt.MENU_CATEGORIAS.
 */

import { LUGARES } from "./mundo.js";

// Mismos id/nombre/tipo que pt.MENU_CATEGORIAS en pantalla.py. El
// despacho sigue siendo por "id" (string), nunca por indice.
export const MENU_CATEGORIAS = [
  {
    id: "care",
    nombre: "Care",
    items: [
      { id: "feed", nombre: "Feed", tipo: "accion" },
      { id: "water", nombre: "Water", tipo: "accion" },
      { id: "clean", nombre: "Clean", tipo: "accion" },
      { id: "sleep", nombre: "Sleep", tipo: "accion" },
      { id: "medicine", nombre: "Medicine", tipo: "accion" },
    ],
  },
  {
    id: "fun",
    nombre: "Play",
    items: [
      { id: "play", nombre: "Play", tipo: "minijuego" },
      { id: "walk", nombre: "Walk", tipo: "caminar" },
      { id: "lens", nombre: "Lens", tipo: "lente" },
    ],
  },
  {
    id: "journal",
    nombre: "Journal",
    items: [
      { id: "stats", nombre: "Stats", tipo: "consulta" },
      { id: "traits", nombre: "Traits", tipo: "consulta" },
      { id: "npcs", nombre: "Friends", tipo: "consulta" },
      { id: "diary", nombre: "Diary", tipo: "consulta" },
      { id: "progress", nombre: "Places", tipo: "consulta" },
      { id: "sound", nombre: "Sound", tipo: "ajuste" },
      { id: "backup", nombre: "Backup", tipo: "consulta" },
    ],
  },
];

export function buscarCategoria(idCategoria) {
  return MENU_CATEGORIAS.find((c) => c.id === idCategoria) || null;
}

export function buscarItem(idCategoria, idItem) {
  const cat = buscarCategoria(idCategoria);
  if (!cat) return null;
  return cat.items.find((i) => i.id === idItem) || null;
}

// Motivos de rechazo de una accion (port de pt.MOTIVOS_ACCION_FALLIDA).
export const MOTIVOS_ACCION_FALLIDA = {
  feed: ["Shhh…", "Baozi is asleep"],
  water: ["Shhh…", "Baozi is asleep"],
  clean: ["Shhh…", "Baozi is asleep"],
  play: ["Shhh…", "Baozi is asleep"],
  medicine: ["All good!", "Baozi isn't sick"],
};

/**
 * Ejecuta el item de menu elegido sobre la mascota.
 * Devuelve {tipo, dato} igual que ejecutar_item_menu() en main.py.
 */
export function ejecutarItemMenu(itemId, mascota, ahoraMs = null) {
  switch (itemId) {
    case "feed":
      return { tipo: "accion", ok: mascota.alimentar(ahoraMs) };
    case "water":
      return { tipo: "accion", ok: mascota.darAgua(ahoraMs) };
    case "clean":
      return { tipo: "accion", ok: mascota.limpiar(ahoraMs) };
    case "sleep":
      return { tipo: "accion", ok: mascota.alternarDormir(ahoraMs) };
    case "medicine":
      return { tipo: "accion", ok: mascota.darMedicina(ahoraMs) };
    case "play":
      return { tipo: "minijuego", ok: true };
    case "walk":
      return { tipo: "caminar", ok: true };
    case "lens":
      return { tipo: "lente", ok: true };
    case "sound":
      return { tipo: "ajuste", dato: "sound" };
    case "diary":
    case "stats":
    case "traits":
    case "npcs":
    case "progress":
    case "backup":
      return { tipo: "consulta", dato: itemId };
    default:
      return null;
  }
}

/**
 * Controlador de vistas. Equivalente de ControladorMenu, simplificado
 * para navegacion tactil: no hay "indice" de carrusel, hay taps
 * directos sobre tarjetas.
 *
 * Vistas: "cara" | "menu" | "consulta" | "caminar" | "encuentro" |
 *         "descubrimiento" | "minijuego" | "nombre"
 */
export class ControladorVistas {
  constructor() {
    this.vista = "nombre"; // arranca pidiendo el nombre si no hay guardado
    this.categoria = null; // id de MENU_CATEGORIAS activa, o null
    this.consultaActual = null;
    this.indiceCarrusel = 0; // posicion dentro de la categoria abierta
  }

  irACara() {
    this.vista = "cara";
    this.categoria = null;
    this.consultaActual = null;
  }

  abrirCategoria(idCategoria) {
    this.categoria = idCategoria;
    this.vista = "menu";
    this.indiceCarrusel = 0;
  }

  cerrarCategoria() {
    this.categoria = null;
    this.vista = "cara";
  }

  abrirConsulta(idConsulta) {
    this.consultaActual = idConsulta;
    this.vista = "consulta";
  }

  // Ruleta del menu (equivalente tactil de anterior()/siguiente() en
  // menu.py): circular, como pt.ITEMS_MENU con modulo.
  moverCarrusel(delta) {
    const cat = buscarCategoria(this.categoria);
    if (!cat) return;
    const total = cat.items.length;
    this.indiceCarrusel = (this.indiceCarrusel + delta + total) % total;
  }
}

// -----------------------------------------------------------------
// "Where to?" - descubrimiento manual de lugares (reemplaza al GPS
// hasta la fase 2 del plan). Ver mundo.js: RegistroLugares.pendientes().
// -----------------------------------------------------------------

export function lugaresParaOfrecer(registroLugares) {
  return registroLugares.pendientes();
}
