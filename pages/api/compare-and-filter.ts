// pages/api/compare-and-filter.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import * as diff from 'diff';

type ComparisonResult = {
  diff: string[];
  summary: string;
  filteredResult?: any;
};

function findAttributeInObject(obj: any, path: string[]): any {
  let current = obj;
  for (const key of path) {
    if (current[key] === undefined) {
      return undefined;
    }
    current = current[key];
  }
  return current;
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ComparisonResult | { error: string }>
) {
  if (req.method === 'POST') {
    try {
      const { json1, json2, filter } = req.body;
      
      // Parse JSON inputs
      const obj1 = JSON.parse(json1);
      const obj2 = JSON.parse(json2);
      
      // Apply filter if provided
      let filteredObj1 = obj1;
      let filteredObj2 = obj2;
      if (filter) {
        const filterPath = filter.split('.');
        filteredObj1 = findAttributeInObject(obj1, filterPath);
        filteredObj2 = findAttributeInObject(obj2, filterPath);
      }
      
      // Stringify for comparison
      const str1 = JSON.stringify(filteredObj1, null, 2);
      const str2 = JSON.stringify(filteredObj2, null, 2);
      
      const differences = diff.diffLines(str1, str2);
      
      const diffResult = differences.flatMap(part => {
        const prefix = part.added ? '+' : part.removed ? '-' : ' ';
        return part.value.split('\n').map(line => prefix + line).filter(line => line !== ' ');
      });
      
      const changedLines = differences.filter(part => part.added || part.removed).length;
      const summary = `Found ${changedLines} changed lines between the ${filter ? 'filtered ' : ''}JSON payloads.`;
      
      const result: ComparisonResult = { 
        diff: diffResult, 
        summary,
        filteredResult: filter ? { json1: filteredObj1, json2: filteredObj2 } : undefined
      };
      
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ error: 'Invalid JSON input or filter' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}