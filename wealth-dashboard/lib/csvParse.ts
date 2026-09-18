/**
 * Minimal, dependency-free RFC 4180 CSV parser (the counterpart to
 * lib/csv.ts's writer). Handles quoted fields containing commas,
 * embedded quotes ("" escaping), and both \n and \r\n line endings,
 * including newlines embedded inside a quoted field.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (i < len) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === ",") {
      pushField();
      i += 1;
      continue;
    }
    if (char === "\r") {
      i += 1;
      continue;
    }
    if (char === "\n") {
      pushRow();
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }

  // Final field/row, if the text didn't end with a newline.
  if (field.length > 0 || row.length > 0) {
    pushRow();
  }

  // Drop trailing fully-empty rows (common with a trailing newline).
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

/** Parses a CSV with a header row into an array of header->value objects. */
export function parseCsvToObjects(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const table = parseCsv(text);
  if (table.length === 0) return { headers: [], rows: [] };
  const headers = table[0].map((h) => h.trim());
  const rows = table.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (cells[idx] ?? "").trim();
    });
    return obj;
  });
  return { headers, rows };
}
