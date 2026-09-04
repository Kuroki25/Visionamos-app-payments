/**
 * Home page copy (`01-public-home-directory.png`, `02-public-home-support.png`,
 * `03-public-home-faq.png`). Portal/comercio names, logos and descriptions
 * are NOT here — those come from the public API (master prompt §21).
 */
export const home = {
  hero: {
    title: 'Buscar comercios aliados',
    searchPlaceholder: 'Escribe el nombre del aliado',
    searchLabel: 'Buscar comercios aliados',
  },
  portalDirectory: {
    title: 'Escribe el nombre del portal',
    searchPlaceholder: 'Escribe el nombre del portal',
    searchLabel: 'Buscar portales por nombre',
    noResults: 'No se encontraron portales con ese nombre.',
    pageLabel: (page: number, totalPages: number) => `Página ${page} de ${totalPages}`,
    previousPage: 'Página anterior',
    nextPage: 'Página siguiente',
    goToPage: (page: number) => `Ir a la página ${page}`,
    logoAlt: (portalName: string) => `Logo de ${portalName}`,
    logoFallbackAlt: 'Portal sin logotipo',
  },
  commerceSearch: {
    resultsHeading: (count: number) => (count === 1 ? '1 resultado' : `${count} resultados`),
    noResults: 'No se encontraron comercios aliados con ese nombre.',
    error: 'No se pudo completar la búsqueda. Inténtalo de nuevo.',
    resultSubtitle: (portalName: string) => `Portal ${portalName}`,
  },
  support: {
    title: '¿Tienes dudas?',
    cta: 'Contactar soporte',
  },
  trust: {
    title: 'Paga con',
    titleAccent: 'confianza',
    description: 'Contamos con entidades regulatorias y certificados de seguridad.',
  },
} as const;
