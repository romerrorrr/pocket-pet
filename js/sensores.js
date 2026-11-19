const GRAVEDAD = 9.80665;

function magnitud(x, y, z) {
    return Math.sqrt(x * x + y * y + z * z);
}

export class DetectorPasos {
    static UMBRAL_PICO=2;
    static UMBRAL_BAJADA=.8;
    static REFRACTARIO_SEGUNDOS=.25;
    constructor() {
        this.enPico = false;
        this.ultimoPasoEn = null;
    }
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
    static UMBRAL_SACUDIDA=4;
    static REFRACTARIO_SEGUNDOS=.15;
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

export function motionDisponible() {
    return typeof window !== "undefined" && "DeviceMotionEvent" in window;
}

export function motionRequierePermiso() {
    return motionDisponible() && typeof DeviceMotionEvent.requestPermission === "function";
}

export async function pedirPermisoMotion() {
    if (!motionRequierePermiso()) return "granted";
    try {
        const resultado = await DeviceMotionEvent.requestPermission();
        return resultado === "granted" ? "granted" : "denied";
    } catch (e) {
        return "denied";
    }
}

export function iniciarEscuchaMotion(callback) {
    function onMotion(evento) {
        const a = evento.accelerationIncludingGravity;
        if (!a || a.x === null || a.x === undefined) return;
        callback(a.x, a.y, a.z, performance.now() / 1e3);
    }
    window.addEventListener("devicemotion", onMotion);
    return () => window.removeEventListener("devicemotion", onMotion);
}

export function geolocationDisponible() {
    return typeof navigator !== "undefined" && "geolocation" in navigator;
}

export function iniciarSeguimientoGPS(onPosicion, onError) {
    if (!geolocationDisponible()) return null;
    return navigator.geolocation.watchPosition((posicion => {
        onPosicion(posicion.coords.latitude, posicion.coords.longitude, posicion.coords.accuracy, Date.now());
    }), (error => {
        if (onError) onError(error);
    }), {
        enableHighAccuracy: true,
        maximumAge: 1e4,
        timeout: 2e4
    });
}

export function detenerSeguimientoGPS(watchId) {
    if (watchId !== null && watchId !== undefined && geolocationDisponible()) {
        navigator.geolocation.clearWatch(watchId);
    }
}
