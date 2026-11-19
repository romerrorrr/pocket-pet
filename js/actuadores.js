export function vibracionDisponible() {
    return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

export function vibrar(duracionMs) {
    if (!vibracionDisponible()) return false;
    try {
        return navigator.vibrate(duracionMs);
    } catch (e) {
        return false;
    }
}
