// pages/api/compare.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import * as diff from 'diff';

type ComparisonResult = {
  diff: string[];
  summary: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ComparisonResult | { error: string }>
) {
  if (req.method === 'POST') {
    try {
      const { json1, json2 } = req.body;
      
      // Parse and re-stringify to ensure consistent formatting
      const obj1 = JSON.parse(json1);
      const obj2 = JSON.parse(json2);
      const str1 = JSON.stringify(obj1, null, 2);
      const str2 = JSON.stringify(obj2, null, 2);
      
      const differences = diff.diffLines(str1, str2);
      
      const diffResult = differences.flatMap(part => {
        const prefix = part.added ? '+' : part.removed ? '-' : ' ';
        return part.value.split('\n').map(line => prefix + line).filter(line => line !== ' ');
      });
      
      const changedLines = differences.filter(part => part.added || part.removed).length;
      const summary = `Found ${changedLines} changed lines between the JSON payloads.`;
      
      res.status(200).json({ diff: diffResult, summary });
    } catch (error) {
      res.status(400).json({ error: 'Invalid JSON input' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}