// components/JsonComparison.tsx

import React, { useState } from 'react';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Loader2, Upload, X } from 'lucide-react';

const JsonComparison: React.FC = () => {
  const [json1, setJson1] = useState('');
  const [json2, setJson2] = useState('');
  const [files1, setFiles1] = useState<File[]>([]);
  const [files2, setFiles2] = useState<File[]>([]);
  const [diff, setDiff] = useState<string[]>([]);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, setFiles: React.Dispatch<React.SetStateAction<File[]>>, setJson: React.Dispatch<React.SetStateAction<string>>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      setFiles(prevFiles => [...prevFiles, ...newFiles]);
      
      if (newFiles.length > 0) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target && typeof e.target.result === 'string') {
            setJson(e.target.result);
          }
        };
        reader.readAsText(newFiles[0]);
      }
    }
  };

  const removeFile = (index: number, files: File[], setFiles: React.Dispatch<React.SetStateAction<File[]>>) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const compareJson = async () => {
    setIsLoading(true);
    setError('');
    setDiff([]);
    setSummary('');

    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ json1, json2 }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setDiff(data.diff);
      setSummary(data.summary);
    } catch (error) {
      console.error('There was a problem with the fetch operation:', error);
      setError('An error occurred while communicating with the server: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderJsonInput = (value: string, setValue: React.Dispatch<React.SetStateAction<string>>, files: File[], setFiles: React.Dispatch<React.SetStateAction<File[]>>, inputRef: React.RefObject<HTMLInputElement>) => (
    <Tabs defaultValue="text" className="w-full">
      <TabsList>
        <TabsTrigger value="text">Text Input</TabsTrigger>
        <TabsTrigger value="file">File Input</TabsTrigger>
      </TabsList>
      <TabsContent value="text">
        <textarea
          className="w-full h-64 p-2 border rounded font-mono text-sm"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste your JSON here"
        />
      </TabsContent>
      <TabsContent value="file">
        <div className="space-y-2">
          <Button onClick={() => inputRef.current?.click()} className="w-full">
            <Upload className="mr-2 h-4 w-4" /> Select Files
          </Button>
          <input
            type="file"
            ref={inputRef}
            onChange={(e) => handleFileChange(e, setFiles, setValue)}
            multiple
            className="hidden"
          />
          <div className="space-y-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-100 p-2 rounded">
                <span className="truncate">{file.name}</span>
                <Button variant="ghost" size="sm" onClick={() => removeFile(index, files, setFiles)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );

  const renderDiff = () => {
    return (
      <div className="grid grid-cols-2 gap-4 font-mono text-sm">
        <div className="border rounded p-2 overflow-x-auto">
          {diff.map((line, index) => (
            <div key={`left-${index}`} className={line.startsWith('-') ? 'bg-red-100 text-red-800' : ''}>
              {line.startsWith('-') ? line.slice(1) : line}
            </div>
          ))}
        </div>
        <div className="border rounded p-2 overflow-x-auto">
          {diff.map((line, index) => (
            <div key={`right-${index}`} className={line.startsWith('+') ? 'bg-green-100 text-green-800' : ''}>
              {line.startsWith('+') ? line.slice(1) : line}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">JSON Comparison Tool</h1>
      <div className="grid grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>JSON 1</CardTitle>
          </CardHeader>
          <CardContent>
            {renderJsonInput(json1, setJson1, files1, setFiles1, React.useRef<HTMLInputElement>(null))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>JSON 2</CardTitle>
          </CardHeader>
          <CardContent>
            {renderJsonInput(json2, setJson2, files2, setFiles2, React.useRef<HTMLInputElement>(null))}
          </CardContent>
        </Card>
      </div>
      <div className="flex justify-center mb-6">
        <Button 
          onClick={compareJson}
          disabled={isLoading}
          className="text-lg px-6 py-3"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Comparing...
            </>
          ) : (
            'Compare JSON'
          )}
        </Button>
      </div>
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {summary && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="bg-yellow-50 p-4 rounded border border-yellow-200">{summary}</p>
          </CardContent>
        </Card>
      )}
      {diff.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="mb-2">Toggle Detailed Diff</Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card>
              <CardHeader>
                <CardTitle>Detailed Differences</CardTitle>
              </CardHeader>
              <CardContent>
                {renderDiff()}
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};

export default JsonComparison;