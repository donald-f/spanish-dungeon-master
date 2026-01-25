import { db } from "./db";
import { presetPlots, spanishLevels, durations } from "@shared/schema";
import { eq, and, count } from "drizzle-orm";
import { fileURLToPath } from "url";

// Plot templates organized by theme categories
const plotTemplates = [
  // FANTASY - Castillos y reinos
  {
    title: "El castillo maldito",
    desc: "Una aldea vive bajo la sombra de un castillo abandonado en lo alto de una colina. Antes de partir, los aldeanos te entregan un arma decente, provisiones y un talismán protector. Los habitantes del castillo desaparecieron hace años, y los rumores hablan de fantasmas, trampas antiguas y tesoros ocultos.",
  },

  {
    title: "La torre del mago",
    desc: "Un mago poderoso te invita a su torre para poner a prueba tu mente y tu voluntad. Te permite estudiar brevemente en su biblioteca, aumentando tu inteligencia, y te entrega una poción de emergencia. Si superas la prueba, recibirás grandes recompensas; si fallas, podrías no salir nunca.",
  },

  {
    title: "El reino de las sombras",
    desc: "Viajas a un reino donde el sol no ha brillado en cien años y la gente vive con miedo. Un sacerdote te bendice, aumentando tu resistencia, y te da una pequeña arma imbuida con luz. Debes descubrir qué causa la oscuridad y devolverle la esperanza al reino.",
  },

  {
    title: "La corona perdida",
    desc: "La corona del rey ha sido robada y el reino está al borde del caos. El rey te concede acceso limitado a la armería real y algunas monedas para prepararte. Tienes tres días para encontrar la corona antes de que estalle una guerra civil.",
  },

  {
    title: "El dragón dormido",
    desc: "Un dragón antiguo duerme bajo una montaña cercana, y nadie sabe cuándo despertará. Un veterano cazador te da pociones, trampas simples y consejos sobre dragones. La cueva del dragón guarda riquezas increíbles, pero el peligro es inmenso.",
  },

  {
    title: "El bosque encantado",
    desc: "Un bosque mágico donde los árboles susurran y las criaturas actúan de forma extraña. Un druida te ofrece hierbas curativas y un amuleto natural. Algo oscuro está corrompiendo lentamente el corazón del bosque.",
  },

  {
    title: "La princesa guerrera",
    desc: "La princesa ha desaparecido mientras investigaba una amenaza por su cuenta. Dejó pistas escondidas y un mapa parcial de su ruta. Debes encontrarla antes de que se meta en una batalla que ni siquiera ella pueda ganar.",
  },

  {
    title: "El caballero negro",
    desc: "Un caballero misterioso ataca a viajeros en los caminos durante la noche. Un herrero agradecido mejora tu arma antes de partir. Nadie sabe quién es el caballero ni por qué actúa, y tú debes descubrir la verdad.",
  },

  {
    title: "La espada legendaria",
    desc: "En un santuario antiguo, una espada mágica permanece clavada en una roca. Los monjes te permiten entrenar un poco, aumentando tu fuerza, antes de intentarlo. Muchos han fallado, pero la leyenda dice que el elegido logrará empuñarla.",
  },

  {
    title: "El portal olvidado",
    desc: "Un antiguo portal se ha abierto en el bosque cercano y nadie recuerda quién lo creó. Un mago local te entrega sellos mágicos y pergaminos básicos. Criaturas extrañas comienzan a cruzar, y alguien debe cerrarlo.",
  },

  // MISTERIO - Investigación
  {
    title: "El misterio del faro",
    desc: "Un pequeño pueblo costero está en pánico porque el guardián del faro ha desaparecido. El alcalde te da acceso al faro, una linterna potente y suministros básicos. Cada noche la luz se apaga, y los barcos comienzan a estrellarse contra las rocas.",
  },

  {
    title: "La mansión Blackwood",
    desc: "Una familia rica te invita a pasar la noche en su enorme mansión debido a tensiones internas. Te ofrecen una habitación privada y acceso libre a la casa. Esa misma noche, uno de los miembros aparece muerto, y todos tienen motivos ocultos.",
  },

  {
    title: "El museo embrujado",
    desc: "El director del museo afirma que las estatuas cambian de lugar después de medianoche. Te entrega llaves, planos del edificio y una linterna. Debes descubrir si se trata de un engaño, un fenómeno sobrenatural, o algo peor.",
  },

  {
    title: "La carta anónima",
    desc: "Recibes una carta que dice: 'No vayas al pueblo viejo'. Dentro hay un pequeño mapa y algo de dinero. El problema es que tu familia vive allí, y han dejado de responder a tus mensajes.",
  },

  {
    title: "El tren fantasma",
    desc: "Un tren que desapareció hace cincuenta años ha reaparecido en las vías. Las autoridades te permiten abordarlo con equipo básico de investigación. Los pasajeros parecen normales, pero ninguno ha envejecido.",
  },

  {
    title: "La librería secreta",
    desc: "Una librería antigua esconde una sección que no aparece en los planos. Encuentras una llave y un diario del dueño desaparecido. Algunos libros parecen reaccionar cuando los tocas.",
  },

  {
    title: "El detective desaparecido",
    desc: "Un famoso detective estaba siguiendo un caso importante antes de desaparecer. La policía te entrega sus notas, su grabadora y su placa. Todas las pistas apuntan a que él descubrió algo peligroso.",
  },

  {
    title: "La máscara de plata",
    desc: "Durante el carnaval, un ladrón con máscara de plata comete robos imposibles. La policía te permite investigar encubierto y te proporciona un disfraz. Nadie ha logrado verlo sin la máscara.",
  },

  {
    title: "El reloj de la torre",
    desc: "El reloj de la torre del pueblo se detuvo hace una semana. Desde entonces, cada medianoche ocurren sucesos extraños. El alcalde te da acceso a la torre y a los registros antiguos.",
  },

  {
    title: "Los gemelos sospechosos",
    desc: "Dos hermanos gemelos discuten públicamente por un crimen reciente. Te permiten interrogarlos por separado y revisar sus coartadas. Uno siempre dice la verdad; el otro siempre miente.",
  },

  // AVENTURA - Exploración
  {
    title: "La isla perdida",
    desc: "Tu barco naufraga durante una tormenta y despiertas en una playa desconocida. Logras rescatar una mochila con comida, un cuchillo y un botiquín. La isla no aparece en ningún mapa y hay ruinas visibles en la jungla.",
  },

  {
    title: "El templo sumergido",
    desc: "Un antiguo templo ha emergido parcialmente del mar tras un terremoto. Un grupo de exploradores te presta equipo de buceo básico y cuerdas. Se dice que el templo guarda artefactos valiosos y trampas antiguas.",
  },

  {
    title: "La expedición ártica",
    desc: "Una expedición al Ártico perdió contacto hace días. Te entregan ropa térmica, bengalas y un rifle. Encuentras su campamento abandonado con señales de lucha.",
  },

  {
    title: "Las ruinas mayas",
    desc: "Un guía local te conduce hasta ruinas ocultas en la selva. Te proporciona suministros, un machete y advertencias claras. Los jeroglíficos hablan de una maldición que protege el lugar.",
  },

  {
    title: "El oasis misterioso",
    desc: "Te pierdes en el desierto hasta encontrar un oasis que parece imposible. Empiezas con agua suficiente, una brújula y un mapa incompleto. Los lugareños afirman que el oasis aparece solo para algunos.",
  },

  {
    title: "La cueva de cristal",
    desc: "Una cueva llena de cristales luminosos ha sido descubierta recientemente. Recibes botas reforzadas, linterna y herramientas básicas. Los mineros que entraron no regresaron.",
  },

  {
    title: "El puente roto",
    desc: "El único puente que cruza un enorme cañón está parcialmente destruido. Un ingeniero te entrega cuerdas y ganchos. Al otro lado, alguien ha pedido ayuda desesperadamente.",
  },

  {
    title: "La montaña sagrada",
    desc: "Una montaña considerada sagrada nunca ha sido escalada por completo. Monjes locales te enseñan técnicas básicas de escalada y te dan provisiones. Dicen que en la cima vive un ermitaño con grandes conocimientos.",
  },

  {
    title: "El río subterráneo",
    desc: "Un río oculto fluye bajo una red de cavernas. Te proporcionan una pequeña balsa y una linterna impermeable. El río conduce a territorios jamás explorados.",
  },

  {
    title: "El volcán dormido",
    desc: "Un volcán que llevaba siglos inactivo muestra señales de despertar. Un chamán te entrega un talismán protector contra el calor y un pergamino ritual. Debes llegar a la cima antes de la erupción.",
  },

  // TERROR - Suspenso
  {
    title: "La casa de muñecas",
    desc: "Una casa abandonada al final del camino está llena de muñecas antiguas. Un sacerdote te entrega agua bendita, una linterna y algunos calmantes. Por la noche, las muñecas parecen cambiar de lugar.",
  },

  {
    title: "El cementerio antiguo",
    desc: "El cementerio del pueblo tiene tumbas sin nombre y mausoleos olvidados. Un sepulturero te presta una pala, una linterna y símbolos de protección. Últimamente se escuchan ruidos bajo tierra.",
  },

  {
    title: "El hotel vacío",
    desc: "Un hotel en las montañas cerró hace años tras varias muertes. Un guardabosques te da una llave maestra y una radio. Esta noche, todas las luces del hotel están encendidas.",
  },

  {
    title: "La niebla roja",
    desc: "Una niebla roja cubre el pueblo al amanecer. Te entregan una máscara filtrante y vendas protectoras. Los que entran en la niebla regresan… diferentes.",
  },

  {
    title: "El espejo maldito",
    desc: "Un espejo antiguo fue encontrado en una casa en ruinas. Un ocultista te da un libro con rituales básicos y una bolsa de sal. El espejo muestra cosas que no deberían existir.",
  },

  {
    title: "La llamada nocturna",
    desc: "Cada noche a las tres suena el teléfono de una casa vacía. El dueño anterior te deja una grabadora y una pistola pequeña. Al contestar, escuchas tu propia voz.",
  },

  {
    title: "El sótano sellado",
    desc: "Una casa fue abandonada después de sellar su sótano con tablones y cadenas. Los nuevos dueños te dan herramientas y te muestran una advertencia escrita en sangre. Algo sigue moviéndose debajo.",
  },

  {
    title: "Las voces del bosque",
    desc: "En el bosque, voces susurran tu nombre cuando cae la noche. Un chamán te entrega un amuleto protector y hierbas calmantes. Las voces suenan como personas que conoces.",
  },

  {
    title: "El pueblo abandonado",
    desc: "Un pueblo entero quedó vacío de un día para otro. Un explorador te da un mapa del lugar y una linterna de largo alcance. Las mesas aún tienen comida servida.",
  },

  {
    title: "La sombra que sigue",
    desc: "Tu sombra empezó a moverse de forma independiente. Un ocultista te entrega un espejo pequeño y un talismán. Y parece que la sombra tiene sus propios planes.",
  },

  // CIENCIA FICCIÓN - Futuro
  {
    title: "La estación espacial",
    desc: "Una estación espacial dejó de comunicarse con la Tierra sin explicación. Te envían con un traje espacial reforzado, un dron de reconocimiento y suministros. Debes averiguar qué ocurrió antes de que la estación caiga de su órbita.",
  },

  {
    title: "El androide rebelde",
    desc: "Un androide de alta gama ha desarrollado emociones y escapó de su laboratorio. Te proporcionan un dispositivo de control, mejoras de hackeo y acceso a archivos clasificados. Debes decidir si destruirlo, capturarlo o ayudarlo.",
  },

  {
    title: "El planeta prohibido",
    desc: "Un planeta marcado como extremadamente peligroso aparece frente a tu nave tras un fallo de navegación. Tus sensores avanzados aún funcionan y detectan estructuras desconocidas. Aterrizas sin saber qué te espera.",
  },

  {
    title: "La cápsula del tiempo",
    desc: "Una cápsula proveniente del futuro aparece en órbita terrestre. Contiene un mensaje dirigido solo a ti. Te dan un traductor universal y acceso a archivos históricos.",
  },

  {
    title: "El virus digital",
    desc: "Un virus se está propagando por todos los sistemas de la ciudad. Te entregan software defensivo y acceso al núcleo de la red. Si fallas, hospitales, transporte y energía colapsarán.",
  },

  {
    title: "La colonia perdida",
    desc: "Una colonia humana en Marte dejó de responder hace semanas. Te asignan un vehículo funcional y un robot asistente. Los sensores muestran actividad, pero nadie contesta.",
  },

  {
    title: "El experimento fallido",
    desc: "Un experimento secreto rompió las leyes de la física dentro de un laboratorio. Te proporcionan un campo estabilizador portátil y traje protector. La realidad empieza a deformarse.",
  },

  {
    title: "El último humano",
    desc: "Despiertas en una ciudad silenciosa donde no quedan humanos. Encuentras un refugio seguro con comida, armas básicas y energía. Las máquinas parecen estar buscándote.",
  },

  {
    title: "La nave fantasma",
    desc: "Una nave a la deriva emite una señal automática de socorro. Tu nave se acopla y activas escáneres vitales. No hay tripulación visible, pero los sistemas siguen funcionando.",
  },

  {
    title: "El portal dimensional",
    desc: "Un portal a otra dimensión se abre dentro de una instalación militar. Te equipan con un traje adaptable y sensores multidimensionales. Las leyes de la física cambian al cruzar.",
  },

  // PIRATAS - Marinera
  {
    title: "El tesoro del capitán",
    desc: "Un viejo marinero te entrega un mapa incompleto que perteneció a un capitán legendario. También te da un sable decente y algo de ron para el viaje. Otros piratas ya están buscando el tesoro.",
  },

  {
    title: "La isla de los piratas",
    desc: "Una isla entera está controlada por clanes piratas hostiles. Consigues un disfraz, documentos falsos y un contacto local. Necesitas algo que está allí.",
  },

  {
    title: "El barco hundido",
    desc: "Un barco cargado de oro se hundió hace siglos cerca de los arrecifes. Te prestan equipo de buceo y una cuerda resistente. Se rumorea que algo más protege el naufragio.",
  },

  {
    title: "La sirena prisionera",
    desc: "Piratas han capturado una sirena y la mantienen encadenada. Logras robar una llave y una daga antes de entrar. Ella promete un secreto del mar a cambio de ayuda.",
  },

  {
    title: "El motín silencioso",
    desc: "Notas tensión entre algunos tripulantes de tu barco. Un marinero leal te advierte y te ofrece su ayuda. Alguien planea un motín.",
  },

  {
    title: "El faro del contrabandista",
    desc: "Un faro abandonado es usado como punto secreto de entregas. Consigues un arma silenciosa y un plano parcial. Esta noche habrá un intercambio importante.",
  },

  {
    title: "La tormenta perfecta",
    desc: "Una tormenta monstruosa se aproxima rápidamente. Tu barco está reforzado y listo para zarpar. El único refugio cercano es una isla peligrosa.",
  },

  {
    title: "El kraken despierto",
    desc: "Varios barcos han sido destruidos por una criatura gigante. Te equipan con un arpón especial y redes reforzadas. Si nadie lo detiene, las rutas comerciales morirán.",
  },

  {
    title: "La botella misteriosa",
    desc: "Una botella con un mensaje desesperado llega a la orilla. Incluye coordenadas claras y una súplica de auxilio. Alguien está atrapado.",
  },

  {
    title: "El puerto maldito",
    desc: "Un puerto antes próspero ahora está abandonado. Un sacerdote te bendice antes de entrar. Los barcos que atracan allí nunca regresan.",
  },

  // MEDIEVAL - Histórico
  {
    title: "El torneo real",
    desc: "El rey anuncia un gran torneo abierto a guerreros de todo el reino. Puedes entrenar con un maestro de armas y mejorar tu equipo antes de participar. Sin embargo, hay rumores de sabotaje.",
  },

  {
    title: "La aldea sitiada",
    desc: "Una aldea está rodeada por bandidos que impiden la llegada de ayuda. Los aldeanos te ofrecen provisiones y algunos luchadores locales se unen a ti. Debes romper el cerco.",
  },

  {
    title: "El gremio de ladrones",
    desc: "El gremio de ladrones te propone un trabajo arriesgado. Te entregan herramientas de sigilo y una ruta de escape. La recompensa es enorme.",
  },

  {
    title: "La peste negra",
    desc: "Una enfermedad mortal se extiende rápidamente. Un médico te da recetas básicas y equipo protector. Debes encontrar una cura.",
  },

  {
    title: "El mercader engañado",
    desc: "Un mercader rico fue estafado por bandidos. Te ofrece una carreta, monedas iniciales y pistas. Quiere recuperar su mercancía.",
  },

  {
    title: "La orden secreta",
    desc: "Una orden de monjes guarda conocimientos prohibidos. Un contacto interno acepta ayudarte. Debes infiltrarte en su biblioteca oculta.",
  },

  {
    title: "El heredero falso",
    desc: "Alguien se hace pasar por heredero del trono. Posees un documento que contradice su historia. Pero nadie más confía en ti.",
  },

  {
    title: "La fragua del herrero",
    desc: "El mejor herrero del reino puede mejorar cualquier arma. Te ofrece una mejora gratuita a cambio de un favor peligroso.",
  },

  {
    title: "El bosque de los bandidos",
    desc: "Un bosque infestado de bandidos bloquea una ruta vital. Te dan un mapa alternativo y algunas flechas. Debes cruzar.",
  },

  {
    title: "La feria del pueblo",
    desc: "La feria anual atrae mercaderes, artistas y forasteros. Puedes comprar equipo barato y reunir información. Pero también atrae criminales.",
  },

  // SUPERVIVENCIA - Natural
  {
    title: "Perdido en la selva",
    desc: "Tu avión se estrella en una zona remota de la selva. Logras recuperar un botiquín, un machete y una botella de agua. Debes sobrevivir y encontrar una salida.",
  },

  {
    title: "La avalancha",
    desc: "Una avalancha bloquea el único paso de la montaña. Encuentras un refugio cercano con comida limitada y una pala. Debes buscar una ruta alternativa.",
  },

  {
    title: "El naufragio",
    desc: "Tu barco se hunde cerca de una isla desierta. Logras rescatar una caja con comida, una cuerda y una navaja. No hay señales de rescate.",
  },

  {
    title: "La cueva del oso",
    desc: "Una tormenta te obliga a entrar en una cueva. Tienes una antorcha y spray repelente. Pronto descubres que un oso vive allí.",
  },

  {
    title: "Sin agua",
    desc: "Te pierdes en el desierto bajo un sol abrasador. Conservas un mapa incompleto y una brújula. El agua se está acabando.",
  },

  {
    title: "El lobo solitario",
    desc: "Un lobo herido comienza a seguirte a distancia. Tienes carne seca y vendas. Podría volverse aliado o enemigo.",
  },

  {
    title: "La inundación",
    desc: "El río se desborda e inunda tu pueblo. Consigues un bote pequeño y una cuerda. Personas están atrapadas.",
  },

  {
    title: "El incendio forestal",
    desc: "Un incendio se mueve rápido hacia tu posición. Te dan una máscara y un mapa de rutas. El tiempo se acaba.",
  },

  {
    title: "Atrapado en el hielo",
    desc: "Tu expedición queda varada en el hielo ártico. Tienes radio funcional, combustible y comida limitada. El frío es mortal.",
  },

  {
    title: "La montaña traicionera",
    desc: "El clima cambia durante una escalada sencilla. Tienes crampones, cuerda y abrigo. Debes descender pronto.",
  },

  // URBANO - Ciudad moderna
  {
    title: "El robo del museo",
    desc: "Recibes información de que alguien planea robar una obra invaluable. Un contacto interno te da planos del museo y credenciales falsas. Debes decidir cómo intervenir.",
  },

  {
    title: "La persecución nocturna",
    desc: "Sales de un bar y notas que alguien te sigue. Llevas algo de dinero, spray de pimienta y tu teléfono con batería completa. No sabes quién es ni por qué te persigue.",
  },

  {
    title: "El edificio abandonado",
    desc: "La policía sospecha que una banda usa un edificio vacío como base. Te dan una linterna, ganzúas y un plano básico. Debes entrar sin alertarlos.",
  },

  {
    title: "El metro a medianoche",
    desc: "Subes al último tren de la noche. Te dan una tarjeta especial de acceso y un número de emergencia. Los pasajeros actúan de forma extraña.",
  },

  {
    title: "El restaurante secreto",
    desc: "Un restaurante exclusivo sirve como fachada. Consigues una invitación falsa y una cámara oculta. Algo ilegal ocurre en el sótano.",
  },

  {
    title: "La estación de radio",
    desc: "Una radio pirata transmite mensajes cifrados. Recibes un decodificador portátil. Alguien quiere que descubras qué significan.",
  },

  {
    title: "El parque de noche",
    desc: "Debes recuperar algo oculto en el parque después del anochecer. Llevas una linterna potente y un mapa del área. No estás solo.",
  },

  {
    title: "El hospital viejo",
    desc: "El antiguo hospital fue cerrado tras varios incidentes. Te entregan planos del edificio y una radio. Las luces siguen encendiéndose.",
  },

  {
    title: "La galería de arte",
    desc: "Una galería exhibe cuadros que parecen moverse. El curador te deja examinar las obras después de cerrar. El artista desapareció.",
  },

  {
    title: "El taxi misterioso",
    desc: "Un taxi se detiene frente a ti aunque no lo llamaste. El conductor parece saber cosas sobre tu pasado. Llevas una grabadora encendida.",
  },

  // MAGIA - Fantástico
  {
    title: "El libro de hechizos",
    desc: "Encuentras un libro antiguo oculto en una biblioteca olvidada. Un mago local te enseña un hechizo menor de protección. Cada hechizo dentro del libro tiene un precio desconocido.",
  },

  {
    title: "La poción prohibida",
    desc: "Un alquimista excéntrico te ofrece una poción que puede conceder deseos. También te da un antídoto básico, por si algo sale mal. Advierte que los efectos son impredecibles.",
  },

  {
    title: "El familiar perdido",
    desc: "Tu compañero mágico ha desaparecido durante la noche. Un hechicero te ayuda a crear un rastro mágico para seguirlo. Las pistas llevan a un lugar peligroso.",
  },

  {
    title: "La academia de magia",
    desc: "Has sido admitido en una academia secreta. Recibes una varita básica y acceso a clases iniciales. Algo oscuro se oculta en los pasillos.",
  },

  {
    title: "El amuleto robado",
    desc: "Tu amuleto de protección ha sido robado. Un encantador te da un sello temporal que reduce los efectos del mal. Debes recuperarlo pronto.",
  },

  {
    title: "La bruja del pantano",
    desc: "Una bruja poderosa puede ayudarte con un gran problema. Te entregan un talismán para sobrevivir al pantano. Sus favores siempre tienen consecuencias.",
  },

  {
    title: "El círculo de piedras",
    desc: "Un círculo antiguo brilla bajo la luna llena. Un druida te concede visión nocturna temporal. Algo te atrae al centro.",
  },

  {
    title: "El espíritu atrapado",
    desc: "Un espíritu está encerrado dentro de un objeto antiguo. Un monje te da un recipiente mágico. El espíritu promete conocimiento a cambio de libertad.",
  },

  {
    title: "La maldición familiar",
    desc: "Tu familia arrastra una maldición ancestral. Un sabio te entrega un libro genealógico y un ritual incompleto. Es hora de romperla.",
  },

  {
    title: "El jardín mágico",
    desc: "Un jardín contiene plantas con propiedades increíbles. Te dan guantes protectores y semillas curativas. El jardinero ha perdido la razón.",
  },

  // WESTERN - Viejo Oeste
  {
    title: "El duelo al amanecer",
    desc: "Un forajido te acusa públicamente y exige un duelo. Un viejo sheriff te presta un revólver confiable y algunos consejos. Si ganas, limpiarás tu nombre.",
  },

  {
    title: "El tren del oro",
    desc: "Un tren transporta un cargamento de oro a través del desierto. Una banda planea robarlo y te ofrece una parte. Te dan explosivos y planos básicos.",
  },

  {
    title: "El pueblo sin ley",
    desc: "El sheriff fue asesinado y nadie tomó su lugar. Te entregan una escopeta y una estrella provisional. Los bandidos controlan las calles.",
  },

  {
    title: "El rancho asediado",
    desc: "Una familia está atrapada en su rancho por un grupo armado. Te proporcionan munición y un caballo. El ataque es inminente.",
  },

  {
    title: "La mina abandonada",
    desc: "Una mina de oro cerró tras un derrumbe. Un minero te da casco, linterna y pico. Dicen que aún hay riquezas dentro.",
  },

  {
    title: "El cazarrecompensas",
    desc: "Un criminal peligroso tiene precio por su cabeza. Recibes un cartel oficial y un caballo. Tú decides cazarlo.",
  },

  {
    title: "El saloon de la viuda",
    desc: "El saloon es el centro de rumores del pueblo. La viuda te ofrece información y una habitación. Ella sabe más de lo que dice.",
  },

  {
    title: "El predicador extraño",
    desc: "Un nuevo predicador llega con sermones inquietantes. El alcalde te pide vigilarlo. Algo no encaja.",
  },

  {
    title: "La diligencia perdida",
    desc: "Una diligencia con pasajeros importantes desapareció. Te dan un mapa del recorrido y provisiones. Las pistas llevan al desierto.",
  },

  {
    title: "El forastero misterioso",
    desc: "Un hombre silencioso llega al pueblo. Poco después comienzan los problemas. Nadie sabe quién es realmente.",
  },

  // EXTRA - Variados
  {
    title: "El circo ambulante",
    desc: "Un circo llega al pueblo con espectáculos increíbles. El dueño te da una entrada especial y acceso tras bastidores. Los artistas esconden secretos oscuros.",
  },

  {
    title: "La subasta secreta",
    desc: "Recibes una invitación a una subasta clandestina. Te dan créditos iniciales y una lista parcial de objetos. Algunos compradores son extremadamente peligrosos.",
  },

  {
    title: "El laberinto viviente",
    desc: "Un enorme laberinto de setos aparece fuera del pueblo. Te entregan tiza, cuerda y una brújula. En el centro hay un premio legendario.",
  },

  {
    title: "La carrera mortal",
    desc: "Una carrera ilegal promete riquezas al ganador. Te asignan un vehículo decente y un mecánico básico. No todos los corredores juegan limpio.",
  },

  {
    title: "El casino flotante",
    desc: "Un casino lujoso navega constantemente para evitar autoridades. Te dan fichas iniciales y una identidad falsa. Las apuestas son altas.",
  },

  {
    title: "La fiesta de máscaras",
    desc: "Una elegante fiesta privada requiere máscara obligatoria. Recibes un disfraz y una invitación auténtica. Alguien planea cometer un crimen.",
  },

  {
    title: "El zoológico nocturno",
    desc: "El zoológico cierra de noche, pero ciertos animales están inquietos. Un guardia te da llaves y una linterna. Algo anda suelto.",
  },

  {
    title: "La fábrica abandonada",
    desc: "Una fábrica cerrada desde hace años emite ruidos por la noche. Te entregan planos y herramientas básicas. Las máquinas parecen activarse solas.",
  },

  {
    title: "El puente colgante",
    desc: "El único puente que cruza un enorme abismo está dañado. Te dan cuerdas y ganchos. Debes cruzar antes de que colapse.",
  },

  {
    title: "La cueva de los murciélagos",
    desc: "Miles de murciélagos viven en una cueva profunda. Te entregan una antorcha potente y protección auditiva. Algo más grande se mueve dentro.",
  },
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
  "en las montañas",
  "junto al río",
  "en el valle escondido",
  "cerca del volcán",
  "en la costa",
  "en el desierto",
  "en el bosque profundo",
  "en las ruinas",
  "bajo tierra",
  "en las nubes",
  "en la frontera",
  "en el norte helado",
];

function generatePlotsForLevel(
  level: string,
  duration: string,
): { title: string; description: string }[] {
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
    const location =
      locationModifiers[locationIndex % locationModifiers.length];

    // Create varied version
    let newTitle =
      variation.prefix +
      template.title.toLowerCase().replace("el ", "").replace("la ", "") +
      variation.suffix;
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
        .where(
          and(
            eq(presetPlots.spanishLevel, level),
            eq(presetPlots.duration, dur),
          ),
        );

      const existing = existingCount[0]?.count ?? 0;

      if (existing >= 100) {
        console.log(`Skipping ${level}/${dur}: already has ${existing} plots`);
        continue;
      }

      const plots = generatePlotsForLevel(level, dur);
      const toInsert = plots.slice(0, 110 - existing);

      if (toInsert.length > 0) {
        await db.insert(presetPlots).values(
          toInsert.map((p) => ({
            spanishLevel: level,
            duration: dur,
            title: p.title,
            description: p.description,
          })),
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
const isMainModule =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

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
