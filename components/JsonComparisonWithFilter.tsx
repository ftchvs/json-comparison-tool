import React, { useCallback, useRef, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Loader2, RefreshCcw, Upload } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

type CompareResponse = {
  diff: string[];
  summary: string;
  filteredDiff?: string[];
};

const sampleJsonA = JSON.stringify(
  {
    orderId: 'ord_1001',
    customer: {
      name: 'Avery Stone',
      tier: 'standard',
      region: 'west',
    },
    items: [
      { sku: 'desk-lamp', quantity: 1, price: 39.99 },
      { sku: 'notebook', quantity: 3, price: 8.5 },
    ],
    fulfillment: {
      status: 'processing',
      carrier: null,
    },
  },
  null,
  2
);

const sampleJsonB = JSON.stringify(
  {
    orderId: 'ord_1001',
    customer: {
      name: 'Avery Stone',
      tier: 'premium',
      region: 'west',
    },
    items: [
      { sku: 'desk-lamp', quantity: 2, price: 39.99 },
      { sku: 'notebook', quantity: 3, price: 8.5 },
      { sku: 'pen-set', quantity: 1, price: 12 },
    ],
    fulfillment: {
      status: 'shipped',
      carrier: 'UPS',
    },
  },
  null,
  2
);

const JsonComparisonWithFilter = () => {
  const [json1, setJson1] = useState(sampleJsonA);
  const [json2, setJson2] = useState(sampleJsonB);
  const [filter, setFilter] = useState('customer.tier');
  const [diff, setDiff] = useState<string[]>([]);
  const [filteredDiff, setFilteredDiff] = useState<string[]>([]);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const fileInput1Ref = useRef<HTMLInputElement>(null);
  const fileInput2Ref = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>, setJson: React.Dispatch<React.SetStateAction<string>>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        if (typeof readerEvent.target?.result === 'string') {
          setJson(readerEvent.target.result);
        }
      };
      reader.readAsText(file);
    },
    []
  );

  const loadSamplePayloads = () => {
    setJson1(sampleJsonA);
    setJson2(sampleJsonB);
    setFilter('customer.tier');
    setError('');
    setDiff([]);
    setFilteredDiff([]);
    setSummary('');
  };

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

      const data = (await response.json()) as CompareResponse | { error: string };

      if (!response.ok) {
        throw new Error('error' in data ? data.error : `Request failed with status ${response.status}`);
      }

      const result = data as CompareResponse;
      setDiff(result.diff);
      setFilteredDiff(result.filteredDiff || []);
      setSummary(result.summary);
      setIsOpen(true);
    } catch (caughtError: unknown) {
      const message = caughtError instanceof Error ? caughtError.message : 'Unknown comparison error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [json1, json2, filter]);

  const renderJsonInput = (
    label: string,
    value: string,
    setValue: React.Dispatch<React.SetStateAction<string>>,
    inputRef: React.RefObject<HTMLInputElement>
  ) => (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <textarea
          className="h-72 w-full resize-y rounded-md border border-slate-200 bg-white p-3 font-mono text-sm leading-6 outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          spellCheck={false}
          placeholder="Paste JSON here"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Upload JSON
          </Button>
          <input
            type="file"
            ref={inputRef}
            onChange={(event) => handleFileChange(event, setValue)}
            className="hidden"
            accept="application/json,.json"
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderDiff = (diffData: string[]) => {
    const leftLines: React.ReactNode[] = [];
    const rightLines: React.ReactNode[] = [];

    diffData.forEach((line, index) => {
      if (line.startsWith('+')) {
        leftLines.push(<div key={`left-${index}`} className="min-h-6">&nbsp;</div>);
        rightLines.push(
          <div key={`right-${index}`} className="min-h-6 bg-emerald-50 px-2 text-emerald-900">
            {line}
          </div>
        );
      } else if (line.startsWith('-')) {
        leftLines.push(
          <div key={`left-${index}`} className="min-h-6 bg-red-50 px-2 text-red-900">
            {line}
          </div>
        );
        rightLines.push(<div key={`right-${index}`} className="min-h-6">&nbsp;</div>);
      } else {
        leftLines.push(<div key={`left-${index}`}>{line}</div>);
        rightLines.push(<div key={`right-${index}`}>{line}</div>);
      }
    });

    return (
      <div className="grid grid-cols-1 gap-4 font-mono text-xs md:grid-cols-2">
        <ScrollArea className="h-[420px] rounded-md border bg-white p-2">
          <div className="min-w-max whitespace-pre">{leftLines}</div>
        </ScrollArea>
        <ScrollArea className="h-[420px] rounded-md border bg-white p-2">
          <div className="min-w-max whitespace-pre">{rightLines}</div>
        </ScrollArea>
      </div>
    );
  };

  const activeDiff = filter && filteredDiff.length > 0 ? filteredDiff : diff;
  const activeTitle = filter && filteredDiff.length > 0 ? `Filtered differences: ${filter}` : 'Detailed differences';

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-950">JSON Comparison Tool</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Compare two JSON payloads, inspect added and removed values, and optionally narrow the diff to a nested dot-path.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={loadSamplePayloads}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Load sample
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {renderJsonInput('Original JSON', json1, setJson1, fileInput1Ref)}
        {renderJsonInput('Updated JSON', json2, setJson2, fileInput2Ref)}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <Input
            type="text"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Optional dot-path, for example customer.tier"
          />
          <Button type="button" onClick={compareJson} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Comparing
              </>
            ) : (
              'Compare JSON'
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {summary && (
        <Alert>
          <AlertDescription>{summary}</AlertDescription>
        </Alert>
      )}

      {activeDiff.length > 0 && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="outline" className="w-full justify-between">
              {activeTitle}
              {isOpen ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            {renderDiff(activeDiff)}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};

export default JsonComparisonWithFilter;
