/**
 * actuadores.js
 * ==============
 * Equivalente de actuadores.py, pero para el unico "actuador" real que
 * tiene un navegador: el vibrador del celular (navigator.vibrate). El
 * ESP32 tiene el solenoide de la tapa del anillo — eso NO tiene
 * equivalente aca ni lo va a tener: el anillo lo entrega el usuario en
 * persona (decision ya tomada, ver claude/PLAN_APP_WEB_MOVIL.md).
 *
 * Soporte real: solo Android/Chrome. iOS Safari nunca implemento esta
 * API, asi que en iPhone esto es un no-op silencioso — no rompe nada,
 * simplemente no vibra.
 */

export function vibracionDisponible() {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

/** duracionMs: numero, o arreglo [vibra, pausa, vibra, ...] para patrones. */
export function vibrar(duracionMs) {
  if (!vibracionDisponible()) return false;
  try {
    return navigator.vibrate(duracionMs);
  } catch (e) {
    return false;
  }
}
