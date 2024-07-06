import React, { useState, useRef, useCallback } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, Upload, ChevronDown, ChevronUp } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

const JsonComparisonWithFilter: React.FC = () => {
  const [json1, setJson1] = useState('');
  const [json2, setJson2] = useState('');
  const [filter, setFilter] = useState('');
  const [diff, setDiff] = useState<string[]>([]);
  const [filteredDiff, setFilteredDiff] = useState<string[]>([]);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const fileInput1Ref = useRef<HTMLInputElement>(null);
  const fileInput2Ref = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>, setJson: React.Dispatch<React.SetStateAction<string>>) => {
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
  }, []);

  const compareJson = useCallback(async () => {
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
      setIsOpen(true);
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
  }, [json1, json2, filter]);

  const renderJsonInput = useCallback((value: string, setValue: React.Dispatch<React.SetStateAction<string>>, inputRef: React.RefObject<HTMLInputElement>) => (
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
  ), [handleFileChange]);

  const renderDiff = useCallback((diffData: string[]) => {
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
        <ScrollArea className="h-[400px] border rounded p-2">
          {leftLines}
        </ScrollArea>
        <ScrollArea className="h-[400px] border rounded p-2">
          {rightLines}
        </ScrollArea>
      </div>
    );
  }, []);

  const renderNestedTable = (data: any, depth = 0): JSX.Element => {
    if (typeof data !== 'object' || data === null) {
      return <span className="font-mono">{JSON.stringify(data)}</span>;
    }

    return (
      <Table className={depth > 0 ? 'border-t border-l border-r' : ''}>
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/3">Key</TableHead>
            <TableHead>Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(data).map(([key, value]) => (
            <TableRow key={key}>
              <TableCell className="font-medium">{key}</TableCell>
              <TableCell>
                {typeof value === 'object' && value !== null ? (
                  renderNestedTable(value, depth + 1)
                ) : (
                  <span className="font-mono">{JSON.stringify(value)}</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderAttributeTable = (jsonData: string) => {
    if (!jsonData) return null;
  
    try {
      const data = JSON.parse(jsonData);
      return (
        <ScrollArea className="h-[400px]">
          {renderNestedTable(data)}
        </ScrollArea>
      );
    } catch (error) {
      console.error('Error parsing JSON:', error);
      return <p>Error parsing JSON data</p>;
    }
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">JSON Comparison and Filter Tool</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="mb-2 w-full">
              {isOpen ? 'Hide' : 'Show'} Detailed Diff
              {isOpen ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
            </Button>
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
      <div className="space-y-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>JSON 1 Attributes</CardTitle>
          </CardHeader>
          <CardContent>
            {renderAttributeTable(json1)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>JSON 2 Attributes</CardTitle>
          </CardHeader>
          <CardContent>
            {renderAttributeTable(json2)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JsonComparisonWithFilter;