/** Un apartado de la política, para pintarlo y para los tests (especificación 017). */
export interface LegalSection {
  title: string;
  paragraphs: readonly string[];
}

/**
 * Encargados y vías que Play y la RGPD obligan a nombrar. El test comprueba que el texto
 * los incluye (CE-1702).
 */
export const PRIVACY_PROCESSORS = ['Railway', 'Brevo', 'Google', 'Expo', 'Firebase'] as const;

export const PRIVACY_SECTIONS: readonly LegalSection[] = [
  {
    title: 'Quién es responsable',
    paragraphs: [
      'El responsable del tratamiento es la persona que publica Smartnomic en Google Play (aplicación com.raulsantamaria.smartnomic). Para ejercer tus derechos usa el correo de la ficha de Smartnomic en Google Play, o entra en la app o en la web y borra la cuenta.',
    ],
  },
  {
    title: 'Qué datos se guardan',
    paragraphs: [
      'Cuenta: nombre, email y, si te registras con contraseña, su hash. Si entras con Google, Google nos da tu nombre y tu email; no se guarda tu foto.',
      'Hogar: nombre del hogar, moneda, zona horaria, día de inicio de mes, miembros y roles, categorías, movimientos (importe, fecha, nota), pagos recurrentes, presupuestos, huchas y el dispositivo en el que tienes sesión para los avisos.',
      'No se conecta a tu banco. No se hace publicidad. No se venden datos.',
    ],
  },
  {
    title: 'Dónde se alojan',
    paragraphs: [
      'Los datos que se guardan están en la Unión Europea: servidor y base de datos en Railway (región UE). Los emails para recuperar la contraseña los envía Brevo, también en la UE.',
      'Si activas los avisos de lo que hacen otros miembros, el texto de ese aviso (hogar, nombre, importe y categoría) pasa por Expo Push y por Firebase Cloud Messaging (Google) para llegar al móvil con la app cerrada. Puedes desactivar esos avisos en Hogar, en cada hogar. Los recordatorios de tus propios vencimientos se programan en el móvil y no pasan por Expo.',
    ],
  },
  {
    title: 'Con quién se comparte en el hogar',
    paragraphs: [
      'Los miembros de un hogar ven los movimientos, presupuestos y huchas de ese hogar. Un usuario de otro hogar no puede verlos. Quien entra con Google no envía a Google tus movimientos ni tus hogares.',
    ],
  },
  {
    title: 'Cuánto se conservan',
    paragraphs: [
      'Mientras la cuenta exista. Al borrar la cuenta se elimina el usuario, las sesiones y los dispositivos. Si eras el único miembro del hogar, también se borra el hogar y sus datos. Si había más miembros, tus movimientos se quedan en el hogar como de un antiguo miembro.',
      'En el móvil, la sesión va cifrada. La copia de seguridad de Android de esta app está desactivada. La caché y los movimientos pendientes de enviar viven en el almacenamiento de la app y se borran al cerrar sesión o al borrar la cuenta.',
    ],
  },
  {
    title: 'Tus derechos',
    paragraphs: [
      'Puedes acceder a tus datos exportándolos desde Hogar, rectificar tu nombre y el del hogar, y borrar la cuenta. También puedes limitar u oponerte al tratamiento y reclamar ante la Agencia Española de Protección de Datos (aepd.es).',
    ],
  },
];

export const DELETION_SECTIONS: readonly LegalSection[] = [
  {
    title: 'Qué se borra',
    paragraphs: [
      'Al borrar tu cuenta desaparecen tu usuario, tus sesiones y los dispositivos registrados para avisos. Si eres el único miembro del hogar, también se borra el hogar con movimientos, pagos, presupuestos y huchas. Si hay más miembros, el hogar sigue y tus movimientos quedan como de un antiguo miembro.',
      'Si eres el propietario de un hogar con más personas, antes tienes que pasar la propiedad a otra.',
      'El borrado no se puede deshacer. Si quieres una copia, exporta los datos del hogar desde Hogar antes.',
    ],
  },
];

export function legalPlainText(sections: readonly LegalSection[]): string {
  return sections.map((s) => `${s.title}\n${s.paragraphs.join('\n')}`).join('\n');
}
