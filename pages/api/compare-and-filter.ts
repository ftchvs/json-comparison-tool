import type { NextApiRequest, NextApiResponse } from 'next';
import * as diff from 'diff';

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type ComparisonResult = {
  diff: string[];
  summary: string;
  filteredDiff?: string[];
};

type ErrorResult = {
  error: string;
};

function findAttributeInObject(obj: JsonValue, path: string[]): JsonValue | undefined {
  let current: JsonValue | undefined = obj;

  for (const key of path) {
    if (current === null || typeof current !== 'object' || Array.isArray(current)) {
      return undefined;
    }
    current = current[key];
  }

  return current;
}

function formatDiff(differences: diff.Change[]): string[] {
  return differences.flatMap((part) => {
    if (!part.added && !part.removed) {
      return [];
    }

    const prefix = part.added ? '+' : '-';
    return part.value
      .split('\n')
      .map((line) => line.trimEnd())
      .filter((line) => line !== '')
      .map((line) => `${prefix} ${line}`);
  });
}

function toDiffInput(value: JsonValue | undefined): string | object {
  if (value === undefined) {
    return 'undefined';
  }

  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  return value;
}

function parseJsonInput(value: unknown, label: string): JsonValue {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} is required`);
  }

  return JSON.parse(value) as JsonValue;
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ComparisonResult | ErrorResult>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const obj1 = parseJsonInput(req.body?.json1, 'Original JSON');
    const obj2 = parseJsonInput(req.body?.json2, 'Updated JSON');
    const filter = typeof req.body?.filter === 'string' ? req.body.filter.trim() : '';

    const differences = diff.diffJson(toDiffInput(obj1), toDiffInput(obj2));
    const diffResult = formatDiff(differences);
    const changedParts = differences.filter((part) => part.added || part.removed).length;
    const summary =
      changedParts === 0
        ? 'The JSON payloads match.'
        : `Found ${changedParts} changed ${changedParts === 1 ? 'part' : 'parts'} between the JSON payloads.`;

    let filteredDiff: string[] | undefined;

    if (filter) {
      const filterPath = filter.split('.').filter(Boolean);
      const filteredObj1 = findAttributeInObject(obj1, filterPath);
      const filteredObj2 = findAttributeInObject(obj2, filterPath);

      if (filteredObj1 === undefined && filteredObj2 === undefined) {
        filteredDiff = [`  No values found at "${filter}".`];
      } else {
        filteredDiff = formatDiff(diff.diffJson(toDiffInput(filteredObj1), toDiffInput(filteredObj2)));
      }
    }

    return res.status(200).json({
      diff: diffResult,
      summary,
      filteredDiff: filteredDiff && filteredDiff.length > 0 ? filteredDiff : undefined,
    });
  } catch (error: unknown) {
    const message = error instanceof SyntaxError ? 'Invalid JSON input' : error instanceof Error ? error.message : 'Invalid request';
    return res.status(400).json({ error: message });
  }
}
