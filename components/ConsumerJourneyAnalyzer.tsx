import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Define interfaces for our data structures
interface Payload {
  timestamp: string;
  properties: Record<string, any>;
}

interface JourneyStep {
  timestamp: string;
  changes: Array<{
    property: string;
    oldValue: any;
    newValue: any;
  }>;
}

const ConsumerJourneyAnalyzer: React.FC = () => {
  // State management
  const [files, setFiles] = useState<File[]>([]); // Store selected files
  const [payloads, setPayloads] = useState<Payload[]>([]); // Store analyzed payloads
  const [isAnalyzing, setIsAnalyzing] = useState(false); // Loading state
  const [error, setError] = useState<string | null>(null); // Error handling

  // Handle file selection
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      setFiles(newFiles);
    }
  }, []);

  // Analyze the journey by sending files to the API
  const analyzeJourney = useCallback(async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('file', file);
      });

      const response = await fetch('/api/analyze-journey', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      // Sort payloads chronologically
      const sortedPayloads = result.payloads.sort((a: Payload, b: Payload) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      setPayloads(sortedPayloads);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsAnalyzing(false);
    }
  }, [files]);

  // Calculate journey steps and changes between each step
  const journeySteps = useMemo(() => {
    const steps: JourneyStep[] = [];
    for (let i = 1; i < payloads.length; i++) {
      const prevPayload = payloads[i - 1];
      const currentPayload = payloads[i];
      const changes = Object.keys(currentPayload.properties).reduce((acc, key) => {
        if (JSON.stringify(prevPayload.properties[key]) !== JSON.stringify(currentPayload.properties[key])) {
          acc.push({
            property: key,
            oldValue: prevPayload.properties[key],
            newValue: currentPayload.properties[key]
          });
        }
        return acc;
      }, [] as JourneyStep['changes']);

      if (changes.length > 0) {
        steps.push({
          timestamp: currentPayload.timestamp,
          changes
        });
      }
    }
    return steps;
  }, [payloads]);

  // Render the journey analysis table
  const renderJourney = () => (
    <ScrollArea className="h-[600px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-white z-10">Property</TableHead>
            {payloads.map((payload, index) => (
              <TableHead key={index} className="text-center">
                <div>Step {index + 1}</div>
                <div className="text-xs text-gray-500">
                  {new Date(payload.timestamp).toLocaleString()}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.keys(payloads[0]?.properties || {}).map((property) => (
            <TableRow key={property}>
              <TableCell className="sticky left-0 bg-white font-medium z-10">{property}</TableCell>
              {payloads.map((payload, index) => (
                <TableCell 
                  key={index} 
                  className={
                    index > 0 && 
                    JSON.stringify(payload.properties[property]) !== JSON.stringify(payloads[index-1].properties[property]) 
                      ? "bg-yellow-100" 
                      : ""
                  }
                >
                  {JSON.stringify(payload.properties[property])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  // Main component render
  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">Consumer Journey Analyzer</h1>
      
      {/* File upload section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Upload Payload Files</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Button onClick={() => document.getElementById('file-upload')?.click()}>
              <Upload className="mr-2 h-4 w-4" /> Select Files
            </Button>
            <input
              id="file-upload"
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              accept=".json"
            />
            <span>{files.length} file(s) selected</span>
          </div>
        </CardContent>
      </Card>
      
      {/* Analyze button */}
      <div className="flex justify-center mb-6">
        <Button 
          onClick={analyzeJourney}
          disabled={isAnalyzing || files.length === 0}
          className="text-lg px-6 py-3"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            'Analyze Journey'
          )}
        </Button>
      </div>
      
      {/* Error display */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Journey analysis results */}
      {payloads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Consumer Journey</CardTitle>
          </CardHeader>
          <CardContent>
            {renderJourney()}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ConsumerJourneyAnalyzer;