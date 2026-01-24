import { db } from "./db";
import { presetPlots, spanishLevels, durations } from "@shared/schema";
import { eq, and, count } from "drizzle-orm";
import { fileURLToPath } from 'url';

// Plot templates organized by theme categories
const plotTemplates = [
  // FANTASY - Castillos y reinos
  { title: "El castillo maldito", desc: "Un castillo abandonado esconde un oscuro secreto. Los habitantes desaparecieron hace años y los rumores hablan de fantasmas y tesoros escondidos." },
  { title: "La torre del mago", desc: "Un mago poderoso te invita a su torre para una prueba. Si pasas, recibirás grandes recompensas. Si fallas, podrías no salir nunca." },
  { title: "El reino de las sombras", desc: "El sol no ha brillado en este reino durante cien años. Debes encontrar la fuente de la oscuridad y restaurar la luz." },
  { title: "La corona perdida", desc: "La corona del rey ha sido robada. Sin ella, el reino caerá en el caos. Tienes tres días para encontrarla." },
  { title: "El dragón dormido", desc: "Un dragón antiguo duerme bajo la montaña. Si despierta, destruirá todo. Pero su cueva guarda tesoros increíbles." },
  { title: "El bosque encantado", desc: "Un bosque mágico donde los árboles hablan y los animales tienen secretos. Algo maligno está corrompiendo este lugar." },
  { title: "La princesa guerrera", desc: "La princesa ha sido secuestrada, pero ella no es una damisela indefensa. Debes encontrarla antes de que cause problemas." },
  { title: "El caballero negro", desc: "Un caballero misterioso aterroriza los caminos. Nadie conoce su identidad ni sus motivos. Tú debes descubrir la verdad." },
  { title: "La espada legendaria", desc: "Una espada mágica está clavada en una roca. Muchos han intentado sacarla. Dicen que solo el elegido podrá hacerlo." },
  { title: "El portal olvidado", desc: "Un antiguo portal se ha abierto en el bosque. Criaturas extrañas empiezan a aparecer. Alguien debe cerrarlo." },
  
  // MISTERIO - Investigación
  { title: "El misterio del faro", desc: "El guardián del faro ha desaparecido y las luces se apagan cada noche. Los barcos se pierden en las rocas." },
  { title: "La mansión Blackwood", desc: "Una familia rica te invita a su mansión. Esa noche, uno de ellos aparece muerto. Tú eres el único que puede resolver el caso." },
  { title: "El museo embrujado", desc: "Las estatuas del museo cobran vida por la noche. El director necesita tu ayuda para descubrir qué está pasando." },
  { title: "La carta anónima", desc: "Has recibido una carta con una advertencia: 'No vayas al pueblo viejo'. Pero tu familia está allí." },
  { title: "El tren fantasma", desc: "Un tren que desapareció hace cincuenta años ha reaparecido. Los pasajeros no han envejecido ni un día." },
  { title: "La librería secreta", desc: "Una librería antigua esconde libros prohibidos. El dueño ha desaparecido y los libros empiezan a actuar de forma extraña." },
  { title: "El detective desaparecido", desc: "Un famoso detective investigaba un caso importante. Ahora él también ha desaparecido. Sus notas son tu única pista." },
  { title: "La máscara de plata", desc: "Durante el carnaval, alguien con máscara de plata comete robos imposibles. Nadie sabe quién es." },
  { title: "El reloj de la torre", desc: "El reloj de la torre del pueblo se ha detenido. Desde entonces, cosas extrañas suceden cada medianoche." },
  { title: "Los gemelos sospechosos", desc: "Dos hermanos gemelos. Uno dice la verdad, el otro miente. Uno de ellos cometió un crimen. Debes descubrir cuál." },
  
  // AVENTURA - Exploración
  { title: "La isla perdida", desc: "Tu barco naufraga en una isla que no aparece en ningún mapa. Hay ruinas antiguas y señales de que no estás solo." },
  { title: "El templo sumergido", desc: "Un templo antiguo ha emergido del mar. Contiene artefactos de valor incalculable y trampas mortales." },
  { title: "La expedición ártica", desc: "Una expedición al Ártico ha perdido contacto. Encuentras su campamento abandonado con el diario del líder." },
  { title: "Las ruinas mayas", desc: "En la selva, descubres unas ruinas olvidadas. Los jeroglíficos advierten de una maldición terrible." },
  { title: "El oasis misterioso", desc: "En medio del desierto, encuentras un oasis que nadie más puede ver. Los lugareños dicen que está maldito." },
  { title: "La cueva de cristal", desc: "Una cueva llena de cristales brillantes esconde un secreto antiguo. Pero cada paso puede ser el último." },
  { title: "El puente roto", desc: "El único puente que cruza el cañón está destruido. Al otro lado, alguien necesita tu ayuda urgentemente." },
  { title: "La montaña sagrada", desc: "Una montaña que nadie ha escalado completamente. Dicen que en la cima vive un ermitaño que conoce todos los secretos." },
  { title: "El río subterráneo", desc: "Un río que fluye bajo tierra lleva a lugares que nadie ha explorado. Pero las corrientes son traicioneras." },
  { title: "El volcán dormido", desc: "El volcán está despertando. Debes llegar a la cima antes de que erupcione para realizar un ritual antiguo." },
  
  // TERROR - Suspenso
  { title: "La casa de muñecas", desc: "Una casa abandonada llena de muñecas antiguas. Por la noche, las muñecas parecen moverse solas." },
  { title: "El cementerio antiguo", desc: "El cementerio del pueblo tiene tumbas sin nombre. Últimamente, se escuchan ruidos bajo tierra." },
  { title: "El hotel vacío", desc: "Un hotel en las montañas, cerrado hace años. Esta noche, todas las luces están encendidas." },
  { title: "La niebla roja", desc: "Una niebla roja cubre el pueblo. Los que entran en ella no vuelven a ser los mismos." },
  { title: "El espejo maldito", desc: "Un espejo antiguo muestra cosas que no existen. O quizás muestra lo que realmente existe." },
  { title: "La llamada nocturna", desc: "Cada noche a las tres, suena el teléfono. Nadie habla, pero escuchas tu propia voz al otro lado." },
  { title: "El sótano sellado", desc: "La casa tiene un sótano que fue sellado hace décadas. Los dueños anteriores dejaron una advertencia clara: no abrir." },
  { title: "Las voces del bosque", desc: "El bosque te llama por tu nombre. Las voces suenan como familiares, pero algo no está bien." },
  { title: "El pueblo abandonado", desc: "Un pueblo donde todos desaparecieron en una sola noche. Las mesas todavía tienen comida servida." },
  { title: "La sombra que sigue", desc: "Tu sombra ha empezado a actuar de forma independiente. Y parece tener sus propios planes." },
  
  // CIENCIA FICCIÓN - Futuro
  { title: "La estación espacial", desc: "Una estación espacial ha perdido contacto con la Tierra. Eres el único que puede investigar qué pasó." },
  { title: "El androide rebelde", desc: "Un androide ha desarrollado emociones y se niega a seguir órdenes. Debes decidir su destino." },
  { title: "El planeta prohibido", desc: "Un planeta marcado como peligroso en todos los mapas. Pero tu nave ha aterrizado allí por accidente." },
  { title: "La cápsula del tiempo", desc: "Una cápsula del futuro ha llegado con un mensaje: tienes que cambiar algo para salvar a la humanidad." },
  { title: "El virus digital", desc: "Un virus está infectando todos los sistemas. La ciudad entera depende de que lo detengas." },
  { title: "La colonia perdida", desc: "Una colonia en Marte dejó de comunicarse. Los sensores muestran actividad, pero nadie responde." },
  { title: "El experimento fallido", desc: "Un experimento científico ha salido mal. La realidad misma está empezando a desmoronarse." },
  { title: "El último humano", desc: "Despiertas en un mundo donde los humanos han desaparecido. Solo quedan máquinas que te buscan." },
  { title: "La nave fantasma", desc: "Una nave abandonada flota en el espacio. Su tripulación desapareció, pero los sistemas siguen funcionando." },
  { title: "El portal dimensional", desc: "Un portal a otra dimensión se ha abierto. Las leyes de la física no funcionan igual al otro lado." },
  
  // PIRATAS - Marinera
  { title: "El tesoro del capitán", desc: "Un mapa del tesoro de un famoso pirata ha llegado a tus manos. Otros también lo buscan." },
  { title: "La isla de los piratas", desc: "Una isla controlada por piratas. Necesitas algo que está allí, pero los piratas no aceptan visitantes." },
  { title: "El barco hundido", desc: "Un barco lleno de oro se hundió hace siglos. Ahora tienes la oportunidad de encontrarlo." },
  { title: "La sirena prisionera", desc: "Los piratas han capturado una sirena. Ella te pide ayuda a cambio de revelar un secreto del mar." },
  { title: "El motín silencioso", desc: "En tu barco, algunos tripulantes planean un motín. Debes descubrir quiénes son antes de que actúen." },
  { title: "El faro del contrabandista", desc: "Un faro abandonado es usado por contrabandistas. Esta noche, harán su entrega más importante." },
  { title: "La tormenta perfecta", desc: "Una tormenta terrible se acerca. El único refugio es una isla habitada por personas hostiles." },
  { title: "El kraken despierto", desc: "Una criatura marina gigante ha atacado varios barcos. Alguien debe detenerla o el comercio morirá." },
  { title: "La botella misteriosa", desc: "Una botella con un mensaje desesperado llega a la playa. Alguien está atrapado y necesita rescate." },
  { title: "El puerto maldito", desc: "Un puerto próspero se ha vuelto un lugar de muerte. Los barcos que entran no vuelven a salir." },
  
  // MEDIEVAL - Histórico
  { title: "El torneo real", desc: "El rey organiza un torneo. El ganador recibirá tierras y títulos. Pero alguien quiere sabotearlo." },
  { title: "La aldea sitiada", desc: "Bandidos han rodeado la aldea. Los habitantes no pueden escapar y los suministros se agotan." },
  { title: "El gremio de ladrones", desc: "El gremio de ladrones te ofrece trabajo. Es peligroso pero la recompensa es enorme." },
  { title: "La peste negra", desc: "Una enfermedad mortal se extiende por el reino. Debes encontrar una cura antes de que sea tarde." },
  { title: "El mercader engañado", desc: "Un mercader rico ha sido estafado. Te ofrece una fortuna por recuperar lo que le robaron." },
  { title: "La orden secreta", desc: "Una orden de monjes guarda conocimientos prohibidos. Necesitas acceder a su biblioteca oculta." },
  { title: "El heredero falso", desc: "Alguien se hace pasar por el heredero del trono. Solo tú conoces la verdad, pero nadie te cree." },
  { title: "La fragua del herrero", desc: "El mejor herrero del reino puede forjar cualquier arma. Pero su precio no es oro, sino favores." },
  { title: "El bosque de los bandidos", desc: "Un bosque donde los bandidos atacan a todos los viajeros. Debes cruzarlo para salvar a alguien." },
  { title: "La feria del pueblo", desc: "La feria anual atrae a mercaderes de todo el mundo. También atrae a criminales y espías." },
  
  // SUPERVIVENCIA - Natural
  { title: "Perdido en la selva", desc: "Tu avión se estrelló en la selva. Debes sobrevivir y encontrar la civilización." },
  { title: "La avalancha", desc: "Una avalancha ha bloqueado el paso. Estás atrapado en las montañas con provisiones limitadas." },
  { title: "El naufragio", desc: "Tu barco se hundió cerca de una isla desierta. Solo tienes lo que pudiste rescatar del agua." },
  { title: "La cueva del oso", desc: "Una tormenta te obliga a refugiarte en una cueva. No estás solo: un oso enorme vive aquí." },
  { title: "Sin agua", desc: "Estás perdido en el desierto. El sol quema y tu agua se ha acabado. Debes encontrar un oasis." },
  { title: "El lobo solitario", desc: "Un lobo herido te sigue. Podría ser un aliado o un peligro. Tu decisión marcará la diferencia." },
  { title: "La inundación", desc: "El río ha crecido y tu pueblo está inundado. Debes rescatar a los atrapados antes de que sea tarde." },
  { title: "El incendio forestal", desc: "Un incendio avanza rápido hacia tu posición. Debes encontrar una ruta de escape segura." },
  { title: "Atrapado en el hielo", desc: "Tu expedición está atrapada en el hielo ártico. Los suministros se agotan y el frío es mortal." },
  { title: "La montaña traicionera", desc: "La escalada parecía fácil, pero el clima cambió. Ahora debes bajar antes de que sea imposible." },
  
  // URBANO - Ciudad moderna
  { title: "El robo del museo", desc: "Alguien planea robar una obra de arte invaluable. Tienes información sobre el plan." },
  { title: "La persecución nocturna", desc: "Alguien te persigue por las calles de la ciudad. No sabes quién es ni qué quiere." },
  { title: "El edificio abandonado", desc: "Un edificio abandonado es el escondite de una banda criminal. Debes entrar sin ser visto." },
  { title: "El metro a medianoche", desc: "El último metro de la noche. Los pasajeros actúan de forma extraña y las puertas no abren." },
  { title: "El restaurante secreto", desc: "Un restaurante exclusivo es la fachada de algo más. Solo los invitados especiales entran al sótano." },
  { title: "La estación de radio", desc: "Una estación de radio pirata transmite mensajes cifrados. Alguien quiere que los descifres." },
  { title: "El parque de noche", desc: "El parque central se vuelve peligroso después del anochecer. Pero hay algo que debes buscar allí." },
  { title: "El hospital viejo", desc: "El antiguo hospital fue cerrado hace años. Pero las luces siguen encendiéndose cada noche." },
  { title: "La galería de arte", desc: "Una galería exhibe cuadros que parecen moverse. El artista desapareció misteriosamente." },
  { title: "El taxi misterioso", desc: "Un taxi te recoge aunque no lo llamaste. El conductor sabe cosas sobre ti que nadie debería saber." },
  
  // MAGIA - Fantástico
  { title: "El libro de hechizos", desc: "Has encontrado un libro de hechizos antiguos. Pero cada hechizo tiene un precio inesperado." },
  { title: "La poción prohibida", desc: "Un alquimista te ofrece una poción que concede deseos. Pero advierte que los efectos son impredecibles." },
  { title: "El familiar perdido", desc: "Tu compañero mágico ha desaparecido. Las pistas te llevan a un mundo peligroso." },
  { title: "La academia de magia", desc: "Has sido admitido en una academia de magia secreta. Pero algo oscuro acecha en los pasillos." },
  { title: "El amuleto robado", desc: "Tu amuleto de protección ha sido robado. Sin él, eres vulnerable a fuerzas malignas." },
  { title: "La bruja del pantano", desc: "Una bruja puede ayudarte, pero sus favores siempre tienen consecuencias inesperadas." },
  { title: "El círculo de piedras", desc: "Un círculo de piedras antiguas brilla bajo la luna llena. Algo te atrae hacia el centro." },
  { title: "El espíritu atrapado", desc: "Un espíritu está atrapado en un objeto antiguo. Te pide liberación a cambio de conocimiento." },
  { title: "La maldición familiar", desc: "Tu familia carga con una maldición antigua. Es hora de romperla de una vez por todas." },
  { title: "El jardín mágico", desc: "Un jardín donde las plantas tienen propiedades extraordinarias. Pero el jardinero ha enloquecido." },
  
  // WESTERN - Viejo Oeste
  { title: "El duelo al amanecer", desc: "Has sido desafiado a un duelo. Si ganas, limpiarás tu nombre. Si pierdes, todo habrá terminado." },
  { title: "El tren del oro", desc: "Un tren lleva un cargamento de oro. Alguien planea robarlo y necesitan tu ayuda." },
  { title: "El pueblo sin ley", desc: "Un pueblo donde el sheriff ha muerto. Los bandidos controlan todo. Alguien debe hacer justicia." },
  { title: "El rancho asediado", desc: "Bandidos atacan un rancho familiar. La familia está atrapada y necesita ayuda urgente." },
  { title: "La mina abandonada", desc: "Una mina de oro fue abandonada después de un accidente. Dicen que todavía hay riquezas dentro." },
  { title: "El cazarrecompensas", desc: "Un criminal peligroso tiene precio por su cabeza. Tú decides cazarlo por la recompensa." },
  { title: "El saloon de la viuda", desc: "El saloon es el centro de toda la información del pueblo. La viuda dueña sabe más de lo que dice." },
  { title: "El predicador extraño", desc: "Un nuevo predicador llega al pueblo. Sus sermones son inspiradores, pero algo no está bien." },
  { title: "La diligencia perdida", desc: "Una diligencia con pasajeros importantes no llegó a su destino. Las pistas llevan al desierto." },
  { title: "El forastero misterioso", desc: "Un forastero llega al pueblo sin decir palabra. Los problemas empiezan desde su llegada." },
  
  // EXTRA - Variados
  { title: "El circo ambulante", desc: "Un circo llega al pueblo con actuaciones increíbles. Pero los artistas esconden secretos oscuros." },
  { title: "La subasta secreta", desc: "Una subasta de objetos raros y peligrosos. Algunos compradores harían cualquier cosa por ganar." },
  { title: "El laberinto viviente", desc: "Un laberinto de setos que cambia constantemente. En el centro hay un premio, pero pocos lo alcanzan." },
  { title: "La carrera mortal", desc: "Una carrera donde solo el ganador sobrevive. Los premios son enormes, los riesgos mayores." },
  { title: "El casino flotante", desc: "Un casino en un barco lujoso. Las apuestas son altas y los jugadores son peligrosos." },
  { title: "La fiesta de máscaras", desc: "Una fiesta elegante donde todos usan máscaras. Uno de los invitados planea un crimen." },
  { title: "El zoológico nocturno", desc: "El zoológico cierra de noche, pero los animales están actuando de forma extraña." },
  { title: "La fábrica abandonada", desc: "Una fábrica cerrada hace años. Pero las máquinas siguen funcionando cuando nadie mira." },
  { title: "El puente colgante", desc: "El único puente para cruzar el abismo está dañado. Cada paso podría ser el último." },
  { title: "La cueva de los murciélagos", desc: "Miles de murciélagos habitan esta cueva. Pero también hay algo más grande escondido dentro." },
];

// Thematic variations to multiply templates
const variations = [
  // Personajes adicionales
  { prefix: "Un ", suffix: " te necesita" },
  { prefix: "La historia de ", suffix: "" },
  { prefix: "El secreto de ", suffix: "" },
  { prefix: "La venganza de ", suffix: "" },
  { prefix: "El regreso de ", suffix: "" },
  // Situaciones
  { prefix: "", suffix: " bajo la lluvia" },
  { prefix: "", suffix: " en la oscuridad" },
  { prefix: "", suffix: " antes del amanecer" },
  { prefix: "", suffix: " sin retorno" },
  { prefix: "", suffix: " contra el tiempo" },
];

// Unique location modifiers
const locationModifiers = [
  "en las montañas", "junto al río", "en el valle escondido", "cerca del volcán",
  "en la costa", "en el desierto", "en el bosque profundo", "en las ruinas",
  "bajo tierra", "en las nubes", "en la frontera", "en el norte helado",
];

function generatePlotsForLevel(level: string, duration: string): { title: string; description: string }[] {
  const plots: { title: string; description: string }[] = [];
  const usedTitles = new Set<string>();
  
  // First, add all base templates
  for (const template of plotTemplates) {
    if (!usedTitles.has(template.title)) {
      plots.push({ title: template.title, description: template.desc });
      usedTitles.add(template.title);
    }
  }
  
  // Then create variations until we have at least 110 plots
  let variationIndex = 0;
  let locationIndex = 0;
  let templateIndex = 0;
  
  while (plots.length < 110) {
    const template = plotTemplates[templateIndex % plotTemplates.length];
    const variation = variations[variationIndex % variations.length];
    const location = locationModifiers[locationIndex % locationModifiers.length];
    
    // Create varied version
    let newTitle = variation.prefix + template.title.toLowerCase().replace("el ", "").replace("la ", "") + variation.suffix;
    newTitle = newTitle.charAt(0).toUpperCase() + newTitle.slice(1);
    
    if (!usedTitles.has(newTitle) && newTitle.length <= 120) {
      const newDesc = template.desc.replace(/\.$/, "") + " " + location + ".";
      if (newDesc.length >= 100 && newDesc.length <= 500) {
        plots.push({ title: newTitle, description: newDesc });
        usedTitles.add(newTitle);
      }
    }
    
    templateIndex++;
    if (templateIndex % plotTemplates.length === 0) {
      variationIndex++;
      if (variationIndex % variations.length === 0) {
        locationIndex++;
      }
    }
    
    // Safety valve
    if (templateIndex > 1000) break;
  }
  
  return plots.slice(0, 110);
}

export async function seedPlots() {
  console.log("Starting plot seeding...");
  
  const levels = ["A2", "B1", "B2"];
  const durs = ["corta", "media", "larga"];
  
  let totalInserted = 0;
  
  for (const level of levels) {
    for (const dur of durs) {
      // Check if plots already exist for this combo
      const existingCount = await db
        .select({ count: count() })
        .from(presetPlots)
        .where(and(
          eq(presetPlots.spanishLevel, level),
          eq(presetPlots.duration, dur)
        ));
      
      const existing = existingCount[0]?.count ?? 0;
      
      if (existing >= 100) {
        console.log(`Skipping ${level}/${dur}: already has ${existing} plots`);
        continue;
      }
      
      const plots = generatePlotsForLevel(level, dur);
      const toInsert = plots.slice(0, 110 - existing);
      
      if (toInsert.length > 0) {
        await db.insert(presetPlots).values(
          toInsert.map(p => ({
            spanishLevel: level,
            duration: dur,
            title: p.title,
            description: p.description,
          }))
        );
        
        console.log(`Inserted ${toInsert.length} plots for ${level}/${dur}`);
        totalInserted += toInsert.length;
      }
    }
  }
  
  console.log(`Seeding complete. Total new plots: ${totalInserted}`);
  return totalInserted;
}

// Run directly if called as script
const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMainModule) {
  seedPlots()
    .then((count) => {
      console.log(`Done! Inserted ${count} plots.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seed error:", err);
      process.exit(1);
    });
}
