import type { NextApiRequest, NextApiResponse } from 'next';
import * as diff from 'diff';

type ComparisonResult = {
  diff: string[];
  summary: string;
  filteredDiff?: string[];
};

function findAttributeInObject(obj: any, path: string[]): any {
  let current = obj;
  for (const key of path) {
    if (current === undefined || current === null || typeof current !== 'object') {
      return undefined;
    }
    current = current[key];
  }
  return current;
}

function formatDiff(differences: diff.Change[]): string[] {
  return differences.flatMap(part => {
    if (!part.added && !part.removed) return [];
    const prefix = part.added ? '+' : '-';
    return part.value.split('\n')
      .map(line => line.trim())
      .filter(line => line !== '')
      .map(line => `${prefix} ${line}`);
  });
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ComparisonResult | { error: string }>
) {
  if (req.method === 'POST') {
    const { json1, json2, filter } = req.body;

    if (!json1 || !json2) {
      return res.status(400).json({ error: 'Both JSON inputs are required' });
    }

    try {
      const obj1 = JSON.parse(json1);
      const obj2 = JSON.parse(json2);
      
      // Perform full comparison
      const differences = diff.diffJson(obj1, obj2);
      const diffResult = formatDiff(differences);
      
      const changedParts = differences.filter(part => part.added || part.removed).length;
      const summary = `Found ${changedParts} changed parts between the JSON payloads.`;
      
      let filteredDiff: string[] | undefined;

      // Apply filter if provided
      if (filter && typeof filter === 'string') {
        const filterPath = filter.split('.');
        const filteredObj1 = findAttributeInObject(obj1, filterPath);
        const filteredObj2 = findAttributeInObject(obj2, filterPath);

        if (filteredObj1 !== undefined || filteredObj2 !== undefined) {
          const filteredDifferences = diff.diffJson(filteredObj1, filteredObj2);
          filteredDiff = formatDiff(filteredDifferences);
          
          if (filteredDiff.length > 0) {
            // Add the filter path to the beginning of the filtered diff
            filteredDiff.unshift(`  "${filter}": {`);
            filteredDiff.push('  }');
          }
        }
      }

      const result: ComparisonResult = { 
        diff: diffResult, 
        summary,
        filteredDiff: filteredDiff && filteredDiff.length > 0 ? filteredDiff : undefined
      };
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Error processing request:', error);
      res.status(400).json({ error: 'Invalid JSON input or filter' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}