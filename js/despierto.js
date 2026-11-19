import { arte } from "./arte.js";

import { modoDeAudio } from "./sonido.js";

const locales = {};

function precargar(ruta) {
    try {
        fetch(arte(ruta)).then((r => r.ok ? r.blob() : null)).then((b => {
            if (b) locales[ruta] = URL.createObjectURL(b);
        })).catch((() => {}));
    } catch (e) {}
}

const local = ruta => locales[ruta] || arte(ruta);

setTimeout((() => {
    precargar("final/despierto.mp4");
    precargar("final/silencio.mp3");
}), 3e3);

let bloqueo = null;

let video = null;

let audio = null;

let activo = false;

async function pedirWakeLock() {
    try {
        if (!("wakeLock" in navigator)) return false;
        if (bloqueo) return true;
        bloqueo = await navigator.wakeLock.request("screen");
        bloqueo.addEventListener("release", (() => {
            bloqueo = null;
        }));
        return true;
    } catch (e) {
        bloqueo = null;
        return false;
    }
}

function videoDeRespaldo() {
    if (video) {
        video.play().catch((() => {}));
        return;
    }
    video = document.createElement("video");
    video.setAttribute("playsinline", "");
    video.setAttribute("muted", "");
    video.muted = true;
    video.loop = true;
    video.src = local("final/despierto.mp4");
    video.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0.01;pointer-events:none;";
    document.body.appendChild(video);
    video.play().catch((() => {}));
}

export async function mantener() {
    activo = true;
    modoDeAudio("playback");
    try {
        if (!audio) {
            audio = new Audio(local("final/silencio.mp3"));
            audio.loop = true;
            audio.volume = .01;
            audio.setAttribute("playsinline", "");
        }
        audio.play().catch((() => {}));
    } catch (e) {}
    const ok = await pedirWakeLock();
    if (!ok) videoDeRespaldo();
}

export function soltar() {
    activo = false;
    if (bloqueo) {
        bloqueo.release().catch((() => {}));
        bloqueo = null;
    }
    if (video) video.pause();
    if (audio) audio.pause();
    modoDeAudio("ambient");
}

document.addEventListener("visibilitychange", (() => {
    if (activo && document.visibilityState === "visible") {
        pedirWakeLock().then((ok => {
            if (!ok) videoDeRespaldo();
        }));
        if (audio) audio.play().catch((() => {}));
    }
}));
