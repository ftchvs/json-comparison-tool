// components/JsonComparisonWithFilter.tsx

import React, { useState, useRef } from 'react';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { Loader2, Upload, X } from 'lucide-react';

const JsonComparisonWithFilter: React.FC = () => {
  const [json1, setJson1] = useState('');
  const [json2, setJson2] = useState('');
  const [filter, setFilter] = useState('');
  const [diff, setDiff] = useState<string[]>([]);
  const [filteredDiff, setFilteredDiff] = useState<string[]>([]);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const fileInput1Ref = useRef<HTMLInputElement>(null);
  const fileInput2Ref = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, setJson: React.Dispatch<React.SetStateAction<string>>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target && typeof e.target.result === 'string') {
          setJson(e.target.result);
        }
      };
      reader.readAsText(file);
    }
  };

  const compareJson = async () => {
  setIsLoading(true);
  setError('');
  setDiff([]);
  setFilteredDiff([]);
  setSummary('');

  try {
    const response = await fetch('/api/compare-and-filter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ json1, json2, filter }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    setDiff(data.diff);
    setFilteredDiff(data.filteredDiff || []);
    setSummary(data.summary);
  } catch (error: unknown) {
    console.error('There was a problem with the fetch operation:', error);
    if (error instanceof Error) {
      setError('An error occurred while communicating with the server: ' + error.message);
    } else {
      setError('An unknown error occurred while communicating with the server.');
    }
  } finally {
    setIsLoading(false);
  }
};

  const renderJsonInput = (value: string, setValue: React.Dispatch<React.SetStateAction<string>>, inputRef: React.RefObject<HTMLInputElement>) => (
    <div className="space-y-2">
      <textarea
        className="w-full h-64 p-2 border rounded font-mono text-sm"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Paste your JSON here"
      />
      <div className="flex items-center space-x-2">
        <Button onClick={() => inputRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" /> Upload JSON File
        </Button>
        <input
          type="file"
          ref={inputRef}
          onChange={(e) => handleFileChange(e, setValue)}
          className="hidden"
          accept=".json"
        />
      </div>
    </div>
  );

  const renderDiff = (diffData: string[]) => {
    const leftLines: React.ReactNode[] = [];
    const rightLines: React.ReactNode[] = [];
  
    diffData.forEach((line, index) => {
      if (line.startsWith('+')) {
        leftLines.push(<div key={`left-${index}`} className="invisible">&nbsp;</div>);
        rightLines.push(<div key={`right-${index}`} className="bg-green-100 text-green-800">{line}</div>);
      } else if (line.startsWith('-')) {
        leftLines.push(<div key={`left-${index}`} className="bg-red-100 text-red-800">{line}</div>);
        rightLines.push(<div key={`right-${index}`} className="invisible">&nbsp;</div>);
      } else {
        leftLines.push(<div key={`left-${index}`}>{line}</div>);
        rightLines.push(<div key={`right-${index}`}>{line}</div>);
      }
    });
  
    return (
      <div className="grid grid-cols-2 gap-4 font-mono text-sm">
        <div className="border rounded p-2 overflow-x-auto">
          {leftLines}
        </div>
        <div className="border rounded p-2 overflow-x-auto">
          {rightLines}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">JSON Comparison and Filter Tool</h1>
      <div className="grid grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>JSON 1</CardTitle>
          </CardHeader>
          <CardContent>
            {renderJsonInput(json1, setJson1, fileInput1Ref)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>JSON 2</CardTitle>
          </CardHeader>
          <CardContent>
            {renderJsonInput(json2, setJson2, fileInput2Ref)}
          </CardContent>
        </Card>
      </div>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter (Optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Enter attribute to filter (e.g., 'user.name')"
            className="mb-2"
          />
        </CardContent>
      </Card>
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
     {(diff.length > 0 || (filter && filteredDiff && filteredDiff.length > 0)) && (
  <Collapsible>
    <CollapsibleTrigger asChild>
      <Button variant="outline" className="mb-2">Toggle Detailed Diff</Button>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <Card>
        <CardHeader>
          <CardTitle>
            {filter && filteredDiff && filteredDiff.length > 0
              ? `Filtered Differences (${filter})`
              : 'Detailed Differences'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filter && filteredDiff && filteredDiff.length > 0
            ? renderDiff(filteredDiff)
            : diff.length > 0
              ? renderDiff(diff)
              : <p>No differences found.</p>}
        </CardContent>
      </Card>
    </CollapsibleContent>
  </Collapsible>
)}
    </div>
  );
};

export default JsonComparisonWithFilter;