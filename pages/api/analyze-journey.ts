import type { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm, Fields, Files, File } from 'formidable';
import fs from 'fs/promises';

export const config = {
  api: {
    bodyParser: false,
  },
};

interface Payload {
  timestamp: string;
  properties: Record<string, any>;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('API route called');

  if (req.method !== 'POST') {
    console.log('Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = new IncomingForm({ multiples: true });

    const [fields, files] = await new Promise<[Fields, Files]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('Error parsing form:', err);
          return reject(err);
        }
        resolve([fields, files]);
      });
    });

    console.log('Files received:', files);

    const fileArray = Array.isArray(files.file) ? files.file : (files.file ? [files.file] : []);
    console.log('Number of files:', fileArray.length);

    if (fileArray.length === 0) {
      return res.status(400).json({ error: 'No files were uploaded' });
    }

    const payloadsPromises = fileArray.map(async (file: File) => {
      if (!file || !file.filepath) {
        console.log(`File is undefined or missing filepath`);
        return null;
      }
      console.log(`Processing file:`, file.originalFilename);
      const content = await fs.readFile(file.filepath, 'utf8');
      console.log(`File content:`, content.substring(0, 100) + '...');
      try {
        const data = JSON.parse(content);
        return {
          timestamp: data.timestamp || file.originalFilename || 'Unknown',
          properties: data.properties || data
        };
      } catch (parseError) {
        console.error(`Error parsing JSON for file:`, parseError);
        return null;
      }
    });

    const payloadsWithNull = await Promise.all(payloadsPromises);
    const payloads: Payload[] = payloadsWithNull.filter((payload): payload is Payload => payload !== null);
    
    console.log('Valid payloads:', payloads.length);

    if (payloads.length === 0) {
      return res.status(400).json({ error: 'No valid payloads found' });
    }

    payloads.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    res.status(200).json({ payloads });
  } catch (error) {
    console.error('Unexpected error in API route:', error);
    res.status(500).json({ error: 'An unexpected error occurred: ' + (error instanceof Error ? error.message : String(error)) });
  }
}