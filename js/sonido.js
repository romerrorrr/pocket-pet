const CLAVE_PREF = "mochi_sonido";

let ctx = null;

let habilitado = true;

try {
    habilitado = localStorage.getItem(CLAVE_PREF) !== "0";
} catch (e) {
    habilitado = true;
}

let modoBase = "ambient";

let capturando = false;

let pegadoAlFinal = false;

function aplicarModo() {
    const tipo = capturando || pegadoAlFinal ? "play-and-record" : modoBase;
    try {
        if (navigator.audioSession && navigator.audioSession.type !== tipo) navigator.audioSession.type = tipo;
    } catch (e) {}
}

export function modoDeAudio(tipo) {
    modoBase = tipo;
    if (tipo !== "playback") pegadoAlFinal = false;
    aplicarModo();
}

export function capturaDeAudio(si) {
    capturando = !!si;
    if (capturando && modoBase === "playback") pegadoAlFinal = true;
    aplicarModo();
}

export function tipoDeSesion() {
    try {
        return navigator.audioSession ? navigator.audioSession.type : "sin-api";
    } catch (e) {
        return "sin-api";
    }
}

modoDeAudio("ambient");

export function contexto() {
    if (ctx) return ctx;
    const Constructor = window.AudioContext || window.webkitAudioContext;
    if (!Constructor) return null;
    try {
        ctx = new Constructor;
    } catch (e) {
        ctx = null;
    }
    return ctx;
}

function nota(frec, inicio, dur, {forma: forma = "square", vol: vol = .18, desliz: desliz = null} = {}) {
    const c = contexto();
    if (!c) return;
    const osc = c.createOscillator();
    const ganancia = c.createGain();
    osc.type = forma;
    osc.frequency.setValueAtTime(frec, inicio);
    if (desliz) osc.frequency.exponentialRampToValueAtTime(desliz, inicio + dur);
    ganancia.gain.setValueAtTime(1e-4, inicio);
    ganancia.gain.exponentialRampToValueAtTime(vol, inicio + .012);
    ganancia.gain.exponentialRampToValueAtTime(1e-4, inicio + dur);
    osc.connect(ganancia);
    ganancia.connect(c.destination);
    osc.start(inicio);
    osc.stop(inicio + dur + .02);
}

function ruido(inicio, dur, {vol: vol = .3, corte: corte = 1200} = {}) {
    const c = contexto();
    if (!c) return;
    const n = Math.max(1, Math.floor(c.sampleRate * dur));
    const b = c.createBuffer(1, n, c.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2;
    const s = c.createBufferSource();
    s.buffer = b;
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(corte, inicio);
    f.frequency.exponentialRampToValueAtTime(120, inicio + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, inicio);
    g.gain.exponentialRampToValueAtTime(1e-4, inicio + dur);
    s.connect(f);
    f.connect(g);
    g.connect(c.destination);
    s.start(inicio);
    s.stop(inicio + dur + .02);
}

const VOCES = {
    comer: t => {
        nota(523, t, .08);
        nota(659, t + .09, .08);
        nota(784, t + .18, .12);
    },
    beber: t => {
        nota(440, t, .07, {
            forma: "triangle"
        });
        nota(660, t + .08, .14, {
            forma: "triangle"
        });
    },
    limpiar: t => {
        nota(880, t, .06, {
            forma: "triangle",
            vol: .12,
            desliz: 1600
        });
        nota(1046, t + .1, .06, {
            forma: "triangle",
            vol: .12,
            desliz: 1760
        });
        nota(1318, t + .2, .1, {
            forma: "triangle",
            vol: .12,
            desliz: 1980
        });
    },
    dormir: t => {
        nota(587, t, .16, {
            forma: "sine",
            vol: .14
        });
        nota(440, t + .16, .16, {
            forma: "sine",
            vol: .14
        });
        nota(330, t + .32, .26, {
            forma: "sine",
            vol: .14
        });
    },
    despertar: t => {
        nota(392, t, .1, {
            forma: "sine",
            vol: .14
        });
        nota(587, t + .1, .16, {
            forma: "sine",
            vol: .14
        });
    },
    medicina: t => {
        nota(659, t, .1, {
            forma: "sine"
        });
        nota(880, t + .12, .2, {
            forma: "sine"
        });
    },
    atrapar: t => nota(880, t, .1, {
        desliz: 1320,
        vol: .16
    }),
    mimo: t => {
        nota(660, t, .09, {
            forma: "sine",
            vol: .13
        });
        nota(990, t + .07, .14, {
            forma: "sine",
            vol: .11
        });
    },
    encuentro: t => {
        nota(523, t, .1);
        nota(659, t + .11, .1);
        nota(784, t + .22, .1);
        nota(1046, t + .33, .2);
    },
    descubrimiento: t => {
        nota(392, t, .12);
        nota(523, t + .12, .12);
        nota(659, t + .24, .12);
        nota(880, t + .36, .28);
    },
    hito: t => {
        nota(523, t, .1);
        nota(523, t + .11, .08);
        nota(784, t + .2, .1);
        nota(1046, t + .32, .32);
    },
    carta: t => {
        nota(698, t, .14, {
            forma: "sine",
            vol: .15
        });
        nota(880, t + .15, .14, {
            forma: "sine",
            vol: .15
        });
        nota(1174, t + .3, .3, {
            forma: "sine",
            vol: .13
        });
    },
    paso: t => nota(220, t, .04, {
        forma: "triangle",
        vol: .07
    }),
    obturador: t => {
        nota(1800, t, .03, {
            forma: "square",
            vol: .1,
            desliz: 900
        });
        nota(300, t + .04, .06, {
            forma: "triangle",
            vol: .12,
            desliz: 120
        });
    },
    impresora: t => {
        for (let i = 0; i < 6; i++) nota(i % 2 ? 180 : 240, t + i * .09, .05, {
            forma: "square",
            vol: .035
        });
    },
    moneda: t => {
        nota(988, t, .06, {
            forma: "square",
            vol: .07
        });
        nota(1319, t + .06, .16, {
            forma: "square",
            vol: .07
        });
    },
    compra: t => {
        nota(784, t, .07, {
            forma: "square",
            vol: .08
        });
        nota(988, t + .07, .07, {
            forma: "square",
            vol: .08
        });
        nota(1319, t + .14, .2, {
            forma: "triangle",
            vol: .12
        });
    },
    guardado: t => {
        nota(784, t, .07, {
            forma: "triangle",
            vol: .14
        });
        nota(1175, t + .08, .14, {
            forma: "triangle",
            vol: .14
        });
    },
    enganche: t => {
        nota(988, t, .05, {
            vol: .08
        });
        nota(1319, t + .06, .08, {
            vol: .08
        });
    },
    hallazgo: t => {
        [ 523, 659, 784, 1047, 1319, 1568 ].forEach(((f, i) => nota(f, t + i * .07, .12, {
            vol: .11
        })));
    },
    tecla: t => nota(620 + Math.random() * 60, t, .025, {
        forma: "square",
        vol: .025
    }),
    grieta: t => {
        nota(160, t, .05, {
            forma: "sawtooth",
            vol: .08,
            desliz: 90
        });
        nota(1400, t + .02, .03, {
            forma: "square",
            vol: .04
        });
    },
    eclosion: t => {
        nota(392, t, .08, {
            vol: .1
        });
        nota(523, t + .08, .08, {
            vol: .1
        });
        nota(659, t + .16, .08, {
            vol: .1
        });
        nota(1047, t + .24, .3, {
            forma: "triangle",
            vol: .14
        });
    },
    tocar: t => nota(880, t, .03, {
        forma: "square",
        vol: .04
    }),
    tejo: t => {
        nota(110, t, .12, {
            forma: "triangle",
            vol: .22,
            desliz: 60
        });
        ruido(t, .08, {
            vol: .12,
            corte: 600
        });
    },
    mecha: t => {
        ruido(t, .6, {
            vol: .5,
            corte: 3e3
        });
        nota(80, t, .35, {
            forma: "sawtooth",
            vol: .16,
            desliz: 40
        });
    },
    no: t => {
        nota(220, t, .1, {
            forma: "sawtooth",
            vol: .1
        });
        nota(165, t + .11, .18, {
            forma: "sawtooth",
            vol: .1
        });
    }
};

export function sonar(tipo) {
    if (!habilitado) return;
    const voz = VOCES[tipo];
    if (!voz) return;
    const c = contexto();
    if (!c) return;
    if (c.state !== "running") c.resume().catch((() => {}));
    try {
        voz(c.currentTime + .01);
    } catch (e) {}
}

export function despertarConPrimerToque() {
    let desbloqueado = false;
    const abrir = () => {
        const c = contexto();
        if (!c) return;
        if (c.state !== "running") c.resume().catch((() => {}));
        if (desbloqueado) return;
        try {
            const b = c.createBuffer(1, 1, 22050);
            const s = c.createBufferSource();
            s.buffer = b;
            s.connect(c.destination);
            s.start(0);
        } catch (e) {}
        if (c.state === "running") desbloqueado = true; else c.resume().then((() => {
            if (c.state === "running") desbloqueado = true;
        })).catch((() => {}));
    };
    for (const ev of [ "pointerdown", "touchstart", "touchend", "click" ]) window.addEventListener(ev, abrir, {
        passive: true,
        capture: true
    });
}

export function sonidoHabilitado() {
    return habilitado;
}

export function alternarSonido() {
    habilitado = !habilitado;
    try {
        localStorage.setItem(CLAVE_PREF, habilitado ? "1" : "0");
    } catch (e) {}
    if (habilitado) sonar("mimo");
    return habilitado;
}
