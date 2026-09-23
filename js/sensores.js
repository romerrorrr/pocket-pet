/**
 * sensores.js
 * ============
 * Port de sensores.py (la parte que se puede portar: la logica pura de
 * pasos/sacudida) mas el plomeria del navegador para GPS real y el
 * acelerometro del celular — algo que el ESP32 nunca tuvo (ahi era un
 * modulo NEO-6M por UART y un MPU6050 por I2C leidos a mano).
 *
 * DetectorPasos y DetectorSacudida son un port 1:1 de sensores.py: los
 * mismos umbrales, ya probados en hardware real (MPU6050). El telefono
 * usa un acelerometro distinto, pero ambos reportan aceleracion en
 * m/s^2 incluyendo la gravedad, asi que la magnitud en reposo (~9.8)
 * es la misma referencia — es el punto de partida razonable, se puede
 * afinar por dispositivo si hace falta.
 */

// ===================================================================
// PASOS Y SACUDIDAS — logica pura, identica a sensores.py
// ===================================================================

const GRAVEDAD = 9.80665;

function magnitud(x, y, z) {
  return Math.sqrt(x * x + y * y + z * z);
}

export class DetectorPasos {
  static UMBRAL_PICO = 2.0;
  static UMBRAL_BAJADA = 0.8;
  static REFRACTARIO_SEGUNDOS = 0.25;

  constructor() {
    this.enPico = false;
    this.ultimoPasoEn = null;
  }

  /** ahoraSegundos: reloj monotonico en segundos (performance.now()/1000). */
  procesarLectura(x, y, z, ahoraSegundos) {
    const m = magnitud(x, y, z);
    const diferencia = m - GRAVEDAD;

    if (!this.enPico && diferencia > DetectorPasos.UMBRAL_PICO) {
      if (this.ultimoPasoEn === null || ahoraSegundos - this.ultimoPasoEn >= DetectorPasos.REFRACTARIO_SEGUNDOS) {
        this.ultimoPasoEn = ahoraSegundos;
        this.enPico = true;
        return true;
      }
    }

    if (this.enPico && diferencia < DetectorPasos.UMBRAL_BAJADA) {
      this.enPico = false;
    }

    return false;
  }
}

export class DetectorSacudida {
  static UMBRAL_SACUDIDA = 4.0;
  static REFRACTARIO_SEGUNDOS = 0.15;

  constructor() {
    this.ultimaSacudidaEn = null;
  }

  procesarLectura(x, y, z, ahoraSegundos) {
    const m = magnitud(x, y, z);
    const diferencia = Math.abs(m - GRAVEDAD);

    if (diferencia > DetectorSacudida.UMBRAL_SACUDIDA) {
      if (this.ultimaSacudidaEn === null || ahoraSegundos - this.ultimaSacudidaEn >= DetectorSacudida.REFRACTARIO_SEGUNDOS) {
        this.ultimaSacudidaEn = ahoraSegundos;
        return true;
      }
    }
    return false;
  }
}

// ===================================================================
// ACELEROMETRO DEL CELULAR (DeviceMotion) — sin equivalente en
// sensores.py, es puro navegador.
// ===================================================================

export function motionDisponible() {
  return typeof window !== "undefined" && "DeviceMotionEvent" in window;
}

/**
 * iOS 13+ (Safari) exige pedir permiso con un gesto real del usuario
 * (un tap), y hay que volver a pedirlo en CADA carga de pagina — no se
 * acuerda entre sesiones como el permiso de ubicacion. Android/Chrome
 * no tiene esta API: el sensor esta disponible directo, sin pedir nada.
 */
export function motionRequierePermiso() {
  return motionDisponible() && typeof DeviceMotionEvent.requestPermission === "function";
}

/** Devuelve "granted" o "denied". Debe llamarse desde un handler de click/tap. */
export async function pedirPermisoMotion() {
  if (!motionRequierePermiso()) return "granted";
  try {
    const resultado = await DeviceMotionEvent.requestPermission();
    return resultado === "granted" ? "granted" : "denied";
  } catch (e) {
    return "denied";
  }
}

/**
 * callback(x, y, z, ahoraSegundos) — x/y/z son accelerationIncludingGravity,
 * en m/s^2, la misma magnitud que espera DetectorPasos/DetectorSacudida.
 * Devuelve una funcion para dejar de escuchar.
 */
export function iniciarEscuchaMotion(callback) {
  function onMotion(evento) {
    const a = evento.accelerationIncludingGravity;
    if (!a || a.x === null || a.x === undefined) return;
    callback(a.x, a.y, a.z, performance.now() / 1000);
  }
  window.addEventListener("devicemotion", onMotion);
  return () => window.removeEventListener("devicemotion", onMotion);
}

// ===================================================================
// GPS REAL (navigator.geolocation) — reemplaza al modulo NEO-6M +
// parseo NMEA de sensores.py. El navegador ya entrega lat/lon
// decimales listos para usar, y el prompt de permiso nativo se
// dispara solo con llamar a watchPosition, sin pedirlo aparte.
// ===================================================================

export function geolocationDisponible() {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

/**
 * onPosicion(lat, lon, precisionMetros, ahoraMs). onError(GeolocationPositionError).
 * Devuelve el watchId (para detenerSeguimientoGPS) o null si no hay soporte.
 */
export function iniciarSeguimientoGPS(onPosicion, onError) {
  if (!geolocationDisponible()) return null;
  return navigator.geolocation.watchPosition(
    (posicion) => {
      onPosicion(posicion.coords.latitude, posicion.coords.longitude, posicion.coords.accuracy, Date.now());
    },
    (error) => {
      if (onError) onError(error);
    },
    { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
  );
}

export function detenerSeguimientoGPS(watchId) {
  if (watchId !== null && watchId !== undefined && geolocationDisponible()) {
    navigator.geolocation.clearWatch(watchId);
  }
}
