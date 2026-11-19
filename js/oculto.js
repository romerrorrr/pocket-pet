export function leer(s) {
    const b = atob(String(s).split("").reverse().join(""));
    return (new TextDecoder).decode(Uint8Array.from(b, (c => c.charCodeAt(0))));
}
