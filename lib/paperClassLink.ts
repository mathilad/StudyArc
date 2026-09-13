export type PaperClassLink = {
  sourceClassId: string | null;
  occurrenceDate: string | null;
  subjectName: string | null;
};

let activeLink: PaperClassLink | null = null;

const clean = (value: unknown) => {
  const text = String(value ?? "").trim();
  return text || null;
};

export function setActivePaperClassLink(value: Partial<PaperClassLink> | null) {
  if (!value) {
    activeLink = null;
    return;
  }
  const next: PaperClassLink = {
    sourceClassId: clean(value.sourceClassId),
    occurrenceDate: clean(value.occurrenceDate),
    subjectName: clean(value.subjectName),
  };
  activeLink = next.sourceClassId || next.occurrenceDate || next.subjectName ? next : null;
}

export function getActivePaperClassLink(): PaperClassLink | null {
  return activeLink;
}

export function clearActivePaperClassLink(sourceClassId?: string | null) {
  if (!activeLink) return;
  if (sourceClassId && activeLink.sourceClassId && activeLink.sourceClassId !== sourceClassId) return;
  activeLink = null;
}
