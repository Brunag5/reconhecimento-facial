
export type MarkType = "tatuagem" | "cicatriz";

export type MarkLocation =
  | "braco"
  | "perna"
  | "costas"
  | "rosto"
  | "maos";

export const MARK_TYPE_OPTIONS: {
  value: MarkType;
  label: string;
}[] = [
  {
    value: "tatuagem",
    label: "Tatuagem",
  },
  {
    value: "cicatriz",
    label: "Cicatriz",
  },
];

export const MARK_LOCATION_OPTIONS: {
  value: MarkLocation;
  label: string;
}[] = [
  {
    value: "braco",
    label: "Braço",
  },
  {
    value: "perna",
    label: "Perna",
  },
  {
    value: "costas",
    label: "Costas",
  },
  {
    value: "rosto",
    label: "Rosto",
  },
  {
    value: "maos",
    label: "Mãos",
  },
];

export interface BodyMark {
  id: string;
  type: MarkType;
  location?: MarkLocation;
  observation?: string;
}

export interface Person {
  id: string;
  name: string;
  imageSrc: string;
  notes?: string;
  bodyMarks?: BodyMark[];
  registeredAt: string;
  additionalPhotos?: string[];
}

/**
 * Retorna uma descrição legível
 * de uma marca corporal.
 */
export function formatBodyMark(
  mark: BodyMark
): string {
  const parts: string[] = [];

  const typeLabel = MARK_TYPE_OPTIONS.find(
    (option) => option.value === mark.type
  )?.label;

  if (typeLabel) {
    parts.push(typeLabel);
  }

  if (mark.location) {
    const locationLabel = MARK_LOCATION_OPTIONS.find(
      (option) => option.value === mark.location
    )?.label;

    if (locationLabel) {
      parts.push(locationLabel);
    }
  }

  if (mark.observation?.trim()) {
    parts.push(mark.observation.trim());
  }

  return parts.join(" — ");
}

/**
 * Retorna todas as marcas corporais
 * de uma pessoa em formato de texto.
 */
export function formatPersonMarks(
  person: Person
): string[] {
  return (person.bodyMarks ?? [])
    .map(formatBodyMark)
    .filter(Boolean);
}

/**
 * Retorna todas as fotografias
 * cadastradas para uma pessoa.
 *
 * Inclui a fotografia principal
 * e as fotografias adicionais.
 */
export function getPersonPhotoSources(
  person: Person
): string[] {
  return [
    person.imageSrc,
    ...(person.additionalPhotos ?? []),
  ];
}

/**
 * Cadastros iniciais.
 *
 * O sistema começa sem pessoas cadastradas.
 * Novos cadastros são realizados pela interface
 * e armazenados no localStorage do navegador.
 *
 * Nenhuma fotografia pessoal precisa
 * ser publicada no repositório.
 */
export const initialPersons: Person[] = [];
