/**
 * palabras.js
 * ============
 * v50: la palabra del dia. Baozi aprende una palabra por dia en español
 * (algunas de Colombia), chino (con pinyin) e ingles, con una frase de
 * ejemplo. Sale al tocar el calendario del cuarto; las que ya salieron
 * quedan en el diccionario (pestaña Baozi). Se pueden oir con la voz del
 * telefono (speechSynthesis), si el telefono la tiene.
 *
 * La lista la reviso rom (Sheet "Baozi — palabras del dia"). El orden es
 * el de la lista: el primer dia que abre esta version sale la 1, al otro
 * dia la 2, y asi; al terminar, vuelve a empezar.
 */

export const PALABRAS = [
  {"es": "¡Hola!", "zh": "你好", "py": "nǐ hǎo", "en": "Hello!", "co": false, "ejEs": "¡Hola, Baozi!", "ejEn": "Hello, Baozi!"},
  {"es": "Gracias", "zh": "谢谢", "py": "xièxie", "en": "Thank you", "co": false, "ejEs": "Gracias por el té.", "ejEn": "Thanks for the tea."},
  {"es": "Abrazo", "zh": "拥抱", "py": "yōngbào", "en": "Hug", "co": false, "ejEs": "Dame un abrazo.", "ejEn": "Give me a hug."},
  {"es": "Beso", "zh": "亲亲", "py": "qīnqin", "en": "Kiss", "co": false, "ejEs": "Un beso de buenas noches.", "ejEn": "A good night kiss."},
  {"es": "¡Chévere!", "zh": "太棒了", "py": "tài bàng le", "en": "Awesome!", "co": true, "ejEs": "¡Qué chévere tu foto!", "ejEn": "What an awesome photo!"},
  {"es": "Parce", "zh": "哥们", "py": "gēmen", "en": "Buddy, pal", "co": true, "ejEs": "¿Qué más, parce?", "ejEn": "What's up, buddy?"},
  {"es": "Tinto", "zh": "黑咖啡", "py": "hēi kāfēi", "en": "A little cup of black coffee", "co": true, "ejEs": "¿Nos tomamos un tinto?", "ejEn": "Shall we have a coffee?"},
  {"es": "¡Bacano!", "zh": "真酷", "py": "zhēn kù", "en": "Cool!", "co": true, "ejEs": "¡Qué bacano este lugar!", "ejEn": "This place is so cool!"},
  {"es": "¿Qué más?", "zh": "最近怎么样？", "py": "zuìjìn zěnmeyàng?", "en": "What's up? How are you?", "co": true, "ejEs": "¿Qué más, cómo vas?", "ejEn": "What's up, how are you doing?"},
  {"es": "Guayabo", "zh": "宿醉", "py": "sùzuì", "en": "Hangover", "co": true, "ejEs": "Hoy tengo guayabo.", "ejEn": "I have a hangover today."},
  {"es": "Berraca", "zh": "厉害", "py": "lìhai", "en": "Amazing, tough (a compliment)", "co": true, "ejEs": "¡Eres una berraca!", "ejEn": "You're amazing!"},
  {"es": "Ahorita", "zh": "一会儿", "py": "yíhuìr", "en": "In a bit (…or never)", "co": true, "ejEs": "Ahorita lo hago.", "ejEn": "I'll do it in a bit."},
  {"es": "Qué pena", "zh": "不好意思", "py": "bù hǎoyìsi", "en": "Sorry, excuse me", "co": true, "ejEs": "Qué pena, llegué tarde.", "ejEn": "Sorry, I'm late."},
  {"es": "Antojo", "zh": "嘴馋", "py": "zuǐchán", "en": "Craving", "co": false, "ejEs": "Tengo antojo de dulce.", "ejEn": "I'm craving something sweet."},
  {"es": "Arepa", "zh": "玉米饼", "py": "yùmǐ bǐng", "en": "Arepa, a corn cake", "co": true, "ejEs": "Una arepa con queso.", "ejEn": "An arepa with cheese."},
  {"es": "Empanada", "zh": "馅饼", "py": "xiànbǐng", "en": "Empanada, a stuffed pastry", "co": false, "ejEs": "Las empanadas de la abuela.", "ejEn": "Grandma's empanadas."},
  {"es": "Bollo al vapor", "zh": "包子", "py": "bāozi", "en": "Steamed bun (like our Baozi!)", "co": false, "ejEs": "Baozi es un bollo al vapor.", "ejEn": "Baozi is a steamed bun."},
  {"es": "Fideos", "zh": "面条", "py": "miàntiáo", "en": "Noodles", "co": false, "ejEs": "Fideos para la cena.", "ejEn": "Noodles for dinner."},
  {"es": "Arroz", "zh": "米饭", "py": "mǐfàn", "en": "Rice", "co": false, "ejEs": "Arroz con pollo.", "ejEn": "Chicken and rice."},
  {"es": "Delicioso", "zh": "好吃", "py": "hǎochī", "en": "Delicious", "co": false, "ejEs": "¡Esto está delicioso!", "ejEn": "This is delicious!"},
  {"es": "Dulce", "zh": "甜", "py": "tián", "en": "Sweet", "co": false, "ejEs": "El mango es muy dulce.", "ejEn": "The mango is very sweet."},
  {"es": "Picante", "zh": "辣", "py": "là", "en": "Spicy", "co": false, "ejEs": "¿Está muy picante?", "ejEn": "Is it very spicy?"},
  {"es": "Hambre", "zh": "饿", "py": "è", "en": "Hungry", "co": false, "ejEs": "Tengo hambre.", "ejEn": "I'm hungry."},
  {"es": "Té", "zh": "茶", "py": "chá", "en": "Tea", "co": false, "ejEs": "Un té de Longjing.", "ejEn": "A Longjing tea."},
  {"es": "Té verde", "zh": "绿茶", "py": "lǜchá", "en": "Green tea", "co": false, "ejEs": "El té verde de Hangzhou.", "ejEn": "Hangzhou's green tea."},
  {"es": "Café", "zh": "咖啡", "py": "kāfēi", "en": "Coffee", "co": false, "ejEs": "El café de Colombia.", "ejEn": "Coffee from Colombia."},
  {"es": "Agua", "zh": "水", "py": "shuǐ", "en": "Water", "co": false, "ejEs": "Un vaso de agua.", "ejEn": "A glass of water."},
  {"es": "Fruta", "zh": "水果", "py": "shuǐguǒ", "en": "Fruit", "co": false, "ejEs": "Fruta para el desayuno.", "ejEn": "Fruit for breakfast."},
  {"es": "Maracuyá", "zh": "百香果", "py": "bǎixiāngguǒ", "en": "Passion fruit", "co": false, "ejEs": "Jugo de maracuyá.", "ejEn": "Passion fruit juice."},
  {"es": "Mango", "zh": "芒果", "py": "mángguǒ", "en": "Mango", "co": false, "ejEs": "Mango con sal y limón.", "ejEn": "Mango with salt and lime."},
  {"es": "Aguacate", "zh": "牛油果", "py": "niúyóuguǒ", "en": "Avocado", "co": false, "ejEs": "Arepa con aguacate.", "ejEn": "Arepa with avocado."},
  {"es": "Guayaba", "zh": "番石榴", "py": "fānshíliu", "en": "Guava", "co": false, "ejEs": "Dulce de guayaba.", "ejEn": "Guava candy."},
  {"es": "Chocolate", "zh": "巧克力", "py": "qiǎokèlì", "en": "Chocolate", "co": false, "ejEs": "Chocolate caliente con queso.", "ejEn": "Hot chocolate with cheese."},
  {"es": "Helado", "zh": "冰淇淋", "py": "bīngqílín", "en": "Ice cream", "co": false, "ejEs": "Un helado de fresa.", "ejEn": "A strawberry ice cream."},
  {"es": "Luna", "zh": "月亮", "py": "yuèliang", "en": "Moon", "co": false, "ejEs": "Mira la luna.", "ejEn": "Look at the moon."},
  {"es": "Sol", "zh": "太阳", "py": "tàiyáng", "en": "Sun", "co": false, "ejEs": "Hoy hace sol.", "ejEn": "It's sunny today."},
  {"es": "Lluvia", "zh": "雨", "py": "yǔ", "en": "Rain", "co": false, "ejEs": "Me gusta el sonido de la lluvia.", "ejEn": "I like the sound of rain."},
  {"es": "Paraguas", "zh": "雨伞", "py": "yǔsǎn", "en": "Umbrella", "co": false, "ejEs": "Compartimos el paraguas.", "ejEn": "We shared the umbrella."},
  {"es": "Nube", "zh": "云", "py": "yún", "en": "Cloud", "co": false, "ejEs": "Esa nube parece un gato.", "ejEn": "That cloud looks like a cat."},
  {"es": "Estrella", "zh": "星星", "py": "xīngxing", "en": "Star", "co": false, "ejEs": "Muchas estrellas esta noche.", "ejEn": "So many stars tonight."},
  {"es": "Nieve", "zh": "雪", "py": "xuě", "en": "Snow", "co": false, "ejEs": "¡Está nevando!", "ejEn": "It's snowing!"},
  {"es": "Lago", "zh": "湖", "py": "hú", "en": "Lake", "co": false, "ejEs": "Un paseo por el lago.", "ejEn": "A walk by the lake."},
  {"es": "Montaña", "zh": "山", "py": "shān", "en": "Mountain", "co": false, "ejEs": "Subimos la montaña.", "ejEn": "We climbed the mountain."},
  {"es": "Mar", "zh": "大海", "py": "dàhǎi", "en": "Sea", "co": false, "ejEs": "Quiero ver el mar.", "ejEn": "I want to see the sea."},
  {"es": "Puente", "zh": "桥", "py": "qiáo", "en": "Bridge", "co": false, "ejEs": "El puente roto.", "ejEn": "The Broken Bridge."},
  {"es": "Flor", "zh": "花", "py": "huā", "en": "Flower", "co": false, "ejEs": "Una flor para ti.", "ejEn": "A flower for you."},
  {"es": "Loto", "zh": "荷花", "py": "héhuā", "en": "Lotus flower", "co": false, "ejEs": "Los lotos del lago.", "ejEn": "The lotuses on the lake."},
  {"es": "Osmanto", "zh": "桂花", "py": "guìhuā", "en": "Osmanthus", "co": false, "ejEs": "Huele a osmanto.", "ejEn": "It smells like osmanthus."},
  {"es": "Árbol", "zh": "树", "py": "shù", "en": "Tree", "co": false, "ejEs": "Sombra bajo el árbol.", "ejEn": "Shade under the tree."},
  {"es": "Mariposa", "zh": "蝴蝶", "py": "húdié", "en": "Butterfly", "co": false, "ejEs": "¡Una mariposa amarilla!", "ejEn": "A yellow butterfly!"},
  {"es": "Gato", "zh": "猫", "py": "māo", "en": "Cat", "co": false, "ejEs": "Baozi parece un gato.", "ejEn": "Baozi looks like a cat."},
  {"es": "Perro", "zh": "狗", "py": "gǒu", "en": "Dog", "co": false, "ejEs": "Un perrito en el parque.", "ejEn": "A little dog in the park."},
  {"es": "Pez", "zh": "鱼", "py": "yú", "en": "Fish", "co": false, "ejEs": "Un pez dorado.", "ejEn": "A goldfish."},
  {"es": "Pájaro", "zh": "鸟", "py": "niǎo", "en": "Bird", "co": false, "ejEs": "Los pájaros cantan.", "ejEn": "The birds are singing."},
  {"es": "Panda", "zh": "熊猫", "py": "xióngmāo", "en": "Panda", "co": false, "ejEs": "El panda está comiendo.", "ejEn": "The panda is eating."},
  {"es": "Linterna, farol", "zh": "灯笼", "py": "dēnglong", "en": "Lantern", "co": false, "ejEs": "Faroles rojos en la calle.", "ejEn": "Red lanterns on the street."},
  {"es": "Cometa", "zh": "风筝", "py": "fēngzheng", "en": "Kite", "co": false, "ejEs": "Volemos una cometa.", "ejEn": "Let's fly a kite."},
  {"es": "Bicicleta", "zh": "自行车", "py": "zìxíngchē", "en": "Bicycle", "co": false, "ejEs": "En bici alrededor del lago.", "ejEn": "Biking around the lake."},
  {"es": "Paseo", "zh": "散步", "py": "sànbù", "en": "A walk, a stroll", "co": false, "ejEs": "Un paseo después de comer.", "ejEn": "A walk after dinner."},
  {"es": "Viaje", "zh": "旅行", "py": "lǚxíng", "en": "Trip", "co": false, "ejEs": "Nuestro próximo viaje.", "ejEn": "Our next trip."},
  {"es": "Aventura", "zh": "冒险", "py": "màoxiǎn", "en": "Adventure", "co": false, "ejEs": "¡Qué aventura!", "ejEn": "What an adventure!"},
  {"es": "Foto", "zh": "照片", "py": "zhàopiàn", "en": "Photo", "co": false, "ejEs": "Una foto de los dos.", "ejEn": "A photo of the two of us."},
  {"es": "Música", "zh": "音乐", "py": "yīnyuè", "en": "Music", "co": false, "ejEs": "Pon música.", "ejEn": "Put some music on."},
  {"es": "Bailar", "zh": "跳舞", "py": "tiàowǔ", "en": "To dance", "co": false, "ejEs": "¿Bailamos salsa?", "ejEn": "Shall we dance salsa?"},
  {"es": "Cantar", "zh": "唱歌", "py": "chànggē", "en": "To sing", "co": false, "ejEs": "Cantar en la ducha.", "ejEn": "Singing in the shower."},
  {"es": "Reír", "zh": "笑", "py": "xiào", "en": "To laugh", "co": false, "ejEs": "Me haces reír.", "ejEn": "You make me laugh."},
  {"es": "Sonrisa", "zh": "微笑", "py": "wēixiào", "en": "Smile", "co": false, "ejEs": "Me encanta tu sonrisa.", "ejEn": "I love your smile."},
  {"es": "Feliz", "zh": "开心", "py": "kāixīn", "en": "Happy", "co": false, "ejEs": "Hoy estoy feliz.", "ejEn": "I'm happy today."},
  {"es": "Cansada", "zh": "累", "py": "lèi", "en": "Tired", "co": false, "ejEs": "Estoy cansada.", "ejEn": "I'm tired."},
  {"es": "Sueño", "zh": "困", "py": "kùn", "en": "Sleepy", "co": false, "ejEs": "Tengo sueño.", "ejEn": "I'm sleepy."},
  {"es": "Bonita", "zh": "漂亮", "py": "piàoliang", "en": "Pretty, beautiful", "co": false, "ejEs": "¡Qué bonita estás!", "ejEn": "You look so pretty!"},
  {"es": "Linda", "zh": "可爱", "py": "kě'ài", "en": "Cute, sweet", "co": false, "ejEs": "Eres muy linda.", "ejEn": "You're so sweet."},
  {"es": "Mi amor", "zh": "亲爱的", "py": "qīn'ài de", "en": "My love", "co": false, "ejEs": "Buenos días, mi amor.", "ejEn": "Good morning, my love."},
  {"es": "Cariño", "zh": "宝贝", "py": "bǎobèi", "en": "Sweetheart", "co": false, "ejEs": "Ven, cariño.", "ejEn": "Come here, sweetheart."},
  {"es": "Corazón", "zh": "心", "py": "xīn", "en": "Heart", "co": false, "ejEs": "Con todo el corazón.", "ejEn": "With all my heart."},
  {"es": "Te extraño", "zh": "我想你", "py": "wǒ xiǎng nǐ", "en": "I miss you", "co": false, "ejEs": "Te extraño cuando no estás.", "ejEn": "I miss you when you're not here."},
  {"es": "Juntos", "zh": "一起", "py": "yìqǐ", "en": "Together", "co": false, "ejEs": "Siempre juntos.", "ejEn": "Always together."},
  {"es": "Siempre", "zh": "永远", "py": "yǒngyuǎn", "en": "Always, forever", "co": false, "ejEs": "Para siempre.", "ejEn": "Forever."},
  {"es": "Casa", "zh": "家", "py": "jiā", "en": "Home", "co": false, "ejEs": "Vamos a casa.", "ejEn": "Let's go home."},
  {"es": "Familia", "zh": "家人", "py": "jiārén", "en": "Family", "co": false, "ejEs": "Mi familia te quiere.", "ejEn": "My family loves you."},
  {"es": "Abuela", "zh": "奶奶", "py": "nǎinai", "en": "Grandma", "co": false, "ejEs": "La abuela cocina rico.", "ejEn": "Grandma cooks really well."},
  {"es": "Amigo", "zh": "朋友", "py": "péngyou", "en": "Friend", "co": false, "ejEs": "Un amigo de la tienda.", "ejEn": "A friend from the shop."},
  {"es": "Regalo", "zh": "礼物", "py": "lǐwù", "en": "Gift", "co": false, "ejEs": "Un regalito para ti.", "ejEn": "A little gift for you."},
  {"es": "Buenos días", "zh": "早上好", "py": "zǎoshang hǎo", "en": "Good morning", "co": false, "ejEs": "¡Buenos días, dormilona!", "ejEn": "Good morning, sleepyhead!"},
  {"es": "Buenas noches", "zh": "晚安", "py": "wǎn'ān", "en": "Good night", "co": false, "ejEs": "Buenas noches, Baozi.", "ejEn": "Good night, Baozi."},
  {"es": "Hoy", "zh": "今天", "py": "jīntiān", "en": "Today", "co": false, "ejEs": "¿Qué hacemos hoy?", "ejEn": "What shall we do today?"},
  {"es": "Mañana", "zh": "明天", "py": "míngtiān", "en": "Tomorrow", "co": false, "ejEs": "Mañana vamos al lago.", "ejEn": "Tomorrow we go to the lake."},
  {"es": "Feliz cumpleaños", "zh": "生日快乐", "py": "shēngrì kuàilè", "en": "Happy birthday", "co": false, "ejEs": "¡Feliz cumpleaños, mi amor!", "ejEn": "Happy birthday, my love!"},
  {"es": "¡Ánimo!", "zh": "加油", "py": "jiāyóu", "en": "You can do it!", "co": false, "ejEs": "¡Ánimo, tú puedes!", "ejEn": "Come on, you can do it!"},
  {"es": "No pasa nada", "zh": "没关系", "py": "méi guānxi", "en": "It's okay", "co": false, "ejEs": "Tranquila, no pasa nada.", "ejEn": "Don't worry, it's okay."},
  {"es": "Despacito", "zh": "慢慢来", "py": "mànmàn lái", "en": "Slowly, take it easy", "co": false, "ejEs": "Despacito y con calma.", "ejEn": "Slowly and calmly."}
];

const claveValida = (k) => typeof k === "string" && /^\d{4}-\d{2}-\d{2}$/.test(k);

function diasEntre(a, b) {
  const f = (k) => {
    const [y, m, d] = k.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((f(b) - f(a)) / 86400000);
}

export class Palabras {
  constructor() {
    this.desde = null; // el dia de la primera palabra
    this.vistas = []; // los indices que ya vio (en el orden en que los vio)
  }

  /** El indice de la palabra de un dia (y arranca la cuenta si es la primera vez). */
  indiceDe(hoy) {
    if (!this.desde) this.desde = hoy;
    const n = Math.max(0, diasEntre(this.desde, hoy));
    return n % PALABRAS.length;
  }

  deHoy(hoy) {
    return { i: this.indiceDe(hoy), ...PALABRAS[this.indiceDe(hoy)] };
  }

  /** ¿Ya vio la de hoy? (para el "!" en el calendario) */
  vioLaDeHoy(hoy) {
    return this.desde !== null && this.vistas.includes(this.indiceDe(hoy));
  }

  /** La marca como vista. true si era nueva. */
  ver(hoy) {
    const i = this.indiceDe(hoy);
    if (this.vistas.includes(i)) return false;
    this.vistas.push(i);
    return true;
  }

  /** El diccionario: las que vio, la ultima primero. */
  diccionario() {
    return [...this.vistas].reverse().map((i) => ({ i, ...PALABRAS[i] }));
  }

  aObjeto() {
    return { desde: this.desde, vistas: [...this.vistas] };
  }

  static desdeObjeto(datos) {
    const p = new Palabras();
    if (!datos || typeof datos !== "object") return p;
    p.desde = claveValida(datos.desde) ? datos.desde : null;
    const vistas = Array.isArray(datos.vistas) ? datos.vistas : [];
    p.vistas = [...new Set(vistas.filter((i) => Number.isInteger(i) && i >= 0 && i < PALABRAS.length))];
    return p;
  }
}

/** La voz del telefono: true si pudo empezar a hablar. */
export function decirEnVoz(texto, idioma) {
  try {
    if (typeof speechSynthesis === "undefined" || typeof SpeechSynthesisUtterance === "undefined") return false;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = idioma;
    u.rate = 0.85;
    const voces = speechSynthesis.getVoices ? speechSynthesis.getVoices() : [];
    const base = idioma.slice(0, 2).toLowerCase();
    const voz = voces.find((v) => v.lang && v.lang.toLowerCase() === idioma.toLowerCase()) || voces.find((v) => v.lang && v.lang.toLowerCase().startsWith(base));
    if (voz) u.voice = voz;
    speechSynthesis.speak(u);
    return true;
  } catch (e) {
    return false;
  }
}

export const hayVoz = () => typeof speechSynthesis !== "undefined" && typeof SpeechSynthesisUtterance !== "undefined";
