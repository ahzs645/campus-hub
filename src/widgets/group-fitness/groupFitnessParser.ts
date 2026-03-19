export const DEFAULT_GROUP_FITNESS_URL =
  'https://www.unbc.ca/northern-sport-centre/group-fitness-drop-classes';

export const WEEKDAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export type WeekdayName = (typeof WEEKDAY_NAMES)[number];
export type GroupFitnessViewMode = 'day' | 'class';

export interface GroupFitnessRow {
  className?: string;
  day?: string;
  time?: string;
  location?: string;
  instructor?: string;
  note?: string;
}

export interface GroupFitnessSection {
  title: string;
  rows: GroupFitnessRow[];
  description?: string;
}

export interface ParsedGroupFitnessSchedule {
  semesterLabel: string;
  semesterDates?: string;
  notes: string[];
  closureNote?: string;
  lastModified?: string;
  byDay: GroupFitnessSection[];
  byClass: GroupFitnessSection[];
}

type RowField = 'className' | 'day' | 'time' | 'location' | 'instructor';

const WEEKDAY_SET = new Set<string>(WEEKDAY_NAMES);

const cleanText = (value: string): string =>
  value
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeText = (value: string): string => cleanText(value).toLowerCase();

const extractTextLines = (element: Element, doc: Document): string[] => {
  const scratch = doc.createElement('div');
  scratch.innerHTML = element.innerHTML
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n')
    .replace(/<\/li>\s*<li[^>]*>/gi, '\n')
    .replace(/<\/div>\s*<div[^>]*>/gi, '\n');

  return (scratch.textContent ?? '')
    .split('\n')
    .map(cleanText)
    .filter(Boolean);
};

const mapHeaderToField = (header: string): RowField | null => {
  switch (normalizeText(header)) {
    case 'class':
      return 'className';
    case 'day':
      return 'day';
    case 'time':
      return 'time';
    case 'location':
      return 'location';
    case 'instructor':
      return 'instructor';
    default:
      return null;
  }
};

const parseTable = (table: HTMLTableElement, doc: Document): GroupFitnessRow[] => {
  const rows = Array.from(table.querySelectorAll('tr'));
  if (rows.length < 2) return [];

  const headerCells = Array.from(rows[0].querySelectorAll('th, td'));
  const fields = headerCells.map((cell) => mapHeaderToField(cell.textContent ?? ''));

  return rows
    .slice(1)
    .map((row) => {
      const cells = Array.from(row.querySelectorAll('th, td'));
      const parsedRow: GroupFitnessRow = {};

      cells.forEach((cell, index) => {
        const field = fields[index];
        if (!field) return;

        const lines = extractTextLines(cell, doc);
        if (lines.length === 0) return;

        if (field === 'time') {
          parsedRow.time = lines[0];
          if (lines.length > 1) {
            parsedRow.note = lines.slice(1).join(' ');
          }
          return;
        }

        parsedRow[field] = lines.join(' ');
      });

      return parsedRow;
    })
    .filter((row) =>
      Boolean(row.className || row.day || row.time || row.location || row.instructor || row.note),
    );
};

const parseSection = (
  component: Element,
  heading: HTMLHeadingElement,
  doc: Document,
): GroupFitnessSection => {
  const title = cleanText(heading.textContent ?? '');
  let rows: GroupFitnessRow[] = [];
  const descriptionParts: string[] = [];

  Array.from(component.children).forEach((child) => {
    if (child === heading) return;

    if (child.tagName === 'TABLE') {
      rows = parseTable(child as HTMLTableElement, doc);
      return;
    }

    if (child.tagName === 'P') {
      const text = cleanText(child.textContent ?? '');
      if (text) descriptionParts.push(text);
    }
  });

  return {
    title,
    rows,
    description: descriptionParts.join(' ') || undefined,
  };
};

const isAfter = (node: Node, reference: Node): boolean =>
  Boolean(reference.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING);

export function isWeekdayName(value: string): value is WeekdayName {
  return WEEKDAY_SET.has(value);
}

export function getTodayWeekday(): WeekdayName {
  const today = new Date().toLocaleDateString('en-CA', { weekday: 'long' });
  return isWeekdayName(today) ? today : 'Monday';
}

export function parseGroupFitnessSchedule(html: string): ParsedGroupFitnessSchedule | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const root = doc.querySelector('.node--type-page .node__content') ?? doc.body;

  const semesterHeading = root.querySelector('h2');
  const semesterText = cleanText(semesterHeading?.textContent ?? '');
  const [semesterLabelRaw, semesterDatesRaw] = semesterText
    ? semesterText.split('|').map(cleanText)
    : ['Current Semester', ''];

  const infoHeading = Array.from(root.querySelectorAll('h3')).find(
    (heading) => normalizeText(heading.textContent ?? '') === 'things you need to know',
  );
  const infoComponent = infoHeading?.closest('.component-standard-content');
  const notes = infoComponent
    ? Array.from(infoComponent.querySelectorAll('li'))
        .map((item) => cleanText(item.textContent ?? ''))
        .filter(Boolean)
    : [];
  const closureNote = notes.find((note) => /no classes on/i.test(note));

  const dayHeading =
    root.querySelector('h3 a[id="Day Sked"]')?.closest('h3') ??
    Array.from(root.querySelectorAll('h3')).find(
      (heading) => normalizeText(heading.textContent ?? '') === 'schedule by the day',
    );

  const sections = Array.from(root.querySelectorAll('.component-standard-content'))
    .filter((component) => !dayHeading || isAfter(component, dayHeading))
    .map((component) => {
      const heading = Array.from(component.children).find(
        (child) => child.tagName === 'H4',
      ) as HTMLHeadingElement | undefined;

      if (!heading) return null;
      return parseSection(component, heading, doc);
    })
    .filter((section): section is GroupFitnessSection => section !== null);

  const byDay: GroupFitnessSection[] = [];
  const byClass: GroupFitnessSection[] = [];
  let inClassSection = false;

  sections.forEach((section) => {
    if (!inClassSection && isWeekdayName(section.title)) {
      byDay.push(section);
      return;
    }

    inClassSection = true;
    byClass.push(section);
  });

  if (byDay.length === 0 && byClass.length === 0) return null;

  return {
    semesterLabel: semesterLabelRaw || 'Current Semester',
    semesterDates: semesterDatesRaw || undefined,
    notes,
    closureNote,
    lastModified:
      doc.querySelector('meta[property="article:modified_time"]')?.getAttribute('content') ?? undefined,
    byDay,
    byClass,
  };
}
