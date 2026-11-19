export const TIPOS_FECHA = [ "aniversario", "cumple", "boda", "otra" ];

export const NOMBRES_TIPO = {
    aniversario: "Anniversary",
    cumple: "Birthday",
    boda: "Wedding",
    otra: "Other"
};

export const MAX_FECHAS = 30;

const diasDelMes = (anio, mes) => new Date(anio, mes, 0).getDate();

export function fechaValida(f) {
    if (!f || typeof f !== "object") return null;
    const nombre = String(f.nombre || "").trim().slice(0, 28);
    const mes = Math.floor(Number(f.mes));
    const dia = Math.floor(Number(f.dia));
    const anio = f.anio == null || f.anio === "" ? null : Math.floor(Number(f.anio));
    if (!nombre || !(mes >= 1 && mes <= 12) || !(dia >= 1 && dia <= 31)) return null;
    if (anio != null && !(anio >= 1900 && anio <= 2200)) return null;
    if (dia > diasDelMes(anio ?? 2e3, mes)) return null;
    return {
        id: typeof f.id === "string" && /^fecha_[a-z0-9_]+$/.test(f.id) ? f.id : `fecha_${Date.now().toString(36)}`,
        nombre: nombre,
        mes: mes,
        dia: dia,
        anio: anio,
        tipo: TIPOS_FECHA.includes(f.tipo) ? f.tipo : "otra"
    };
}

export function fechasDeConfig(lista) {
    return (lista || []).map(((f, i) => f && f.nombre && f.mes && f.dia ? {
        id: `config_${i}`,
        nombre: f.nombre,
        mes: f.mes,
        dia: f.dia,
        anio: f.anio ?? null,
        tipo: f.tipo || "aniversario",
        fija: true
    } : null)).filter(Boolean);
}

const soloDia = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function proximaVez(f, ahora = new Date) {
    const hoy = soloDia(ahora);
    const en = anio => new Date(anio, f.mes - 1, Math.min(f.dia, diasDelMes(anio, f.mes)));
    if (f.anio != null && en(f.anio) >= hoy) return en(f.anio);
    let d = en(hoy.getFullYear());
    if (d < hoy) d = en(hoy.getFullYear() + 1);
    return d;
}

export function diasHasta(f, ahora = new Date) {
    return Math.round((proximaVez(f, ahora) - soloDia(ahora)) / 864e5);
}

export function vecesCumplidas(f, ahora = new Date) {
    if (f.anio == null) return null;
    const proxima = proximaVez(f, ahora).getFullYear() - f.anio;
    return Math.max(0, diasHasta(f, ahora) === 0 ? proxima : proxima - 1);
}

export function ordenadas(lista, ahora = new Date) {
    return [ ...lista ].sort(((a, b) => diasHasta(a, ahora) - diasHasta(b, ahora)));
}

export function proxima(lista, ahora = new Date) {
    const [f] = ordenadas(lista, ahora);
    return f ? {
        nombre: f.nombre,
        dias: diasHasta(f, ahora),
        f: f
    } : null;
}

export function bodaLlego(lista, ahora = new Date) {
    return lista.some((f => f.tipo === "boda" && f.anio != null && new Date(f.anio, f.mes - 1, f.dia) <= soloDia(ahora)));
}

export function bodaEsHoy(lista, ahora = new Date) {
    const ref = ahora.getHours() < 4 ? new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 1) : ahora;
    return lista.some((f => f.tipo === "boda" && f.anio != null && f.anio === ref.getFullYear() && f.mes === ref.getMonth() + 1 && f.dia === ref.getDate()));
}
