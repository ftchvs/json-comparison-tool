import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Upload, Loader2, Download, Info, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Define interface for our payload data structure
interface Payload {
  timestamp: string;
  properties: Record<string, any>;
  fileName: string;
}

const ConsumerJourneyAnalyzer: React.FC = () => {
  // State management
  const [files, setFiles] = useState<File[]>([]);
  const [payloads, setPayloads] = useState<Payload[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [columnWidths, setColumnWidths] = useState<number[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [activeIndex, setActiveIndex] = useState(-1);
  
  // Ref for the table container
  const tableRef = useRef<HTMLDivElement>(null);

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
      // Sort payloads chronologically and add file names
      const sortedPayloads = result.payloads
        .map((payload: Payload, index: number) => ({
          ...payload,
          fileName: files[index].name
        }))
        .sort((a: Payload, b: Payload) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      setPayloads(sortedPayloads);
      // Initialize column widths
      setColumnWidths(new Array(sortedPayloads.length + 1).fill(200)); // +1 for property column
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsAnalyzing(false);
    }
  }, [files]);

  // Export analysis as JSON
  const exportAnalysis = useCallback(() => {
    const dataStr = JSON.stringify({ payloads }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'consumer_journey_analysis.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [payloads]);

  // Format cell value for display
  const formatCellValue = (value: any): string => {
    if (typeof value === 'object') {
      return JSON.stringify(value).slice(0, 20) + '...';
    }
    return String(value).slice(0, 20) + (String(value).length > 20 ? '...' : '');
  };

  // Toggle row expansion
  const toggleRowExpansion = (property: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(property)) {
        newSet.delete(property);
      } else {
        newSet.add(property);
      }
      return newSet;
    });
  };

  // Filter properties based on search term
  const filteredProperties = useMemo(() => {
    const properties = Object.keys(payloads[0]?.properties || {});
    return properties.filter(prop => 
      prop.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [payloads, searchTerm]);

  // Export filtered data as CSV
  const exportCSV = useCallback(() => {
    const headers = ['Property', ...payloads.map((_, index) => `Step ${payloads.length - index}`)];
    const csvContent = [
      headers.join(','),
      ...filteredProperties.map(property => 
        [property, ...payloads.map(payload => JSON.stringify(payload.properties[property]))].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'consumer_journey_analysis.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [payloads, filteredProperties]);

  // Handle start of column resize
  const handleMouseDown = (e: React.MouseEvent, index: number) => {
    setIsDragging(true);
    setStartX(e.clientX);
    setActiveIndex(index);
  };

  // Handle column resize
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const difference = e.clientX - startX;
    setColumnWidths(prev => {
      const newWidths = [...prev];
      newWidths[activeIndex] = Math.max(50, newWidths[activeIndex] + difference);
      return newWidths;
    });
    setStartX(e.clientX);
  }, [isDragging, startX, activeIndex]);

  // Handle end of column resize
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setActiveIndex(-1);
  }, []);

  // Add and remove event listeners for mouse move and up
  React.useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Render the journey analysis table
  const renderJourney = () => (
    <div className="overflow-x-auto" ref={tableRef}>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th style={{ width: columnWidths[0], minWidth: columnWidths[0] }} className="sticky left-0 bg-gray-100 z-10 p-2 border">
              Property
              <div
                className="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize"
                onMouseDown={(e) => handleMouseDown(e, 0)}
              />
            </th>
            {payloads.map((payload, index) => (
              <th key={index} style={{ width: columnWidths[index + 1], minWidth: columnWidths[index + 1] }} className="p-2 border">
                {payload.fileName}
                <br />
                Step {payloads.length - index}
                <br />
                {new Date(payload.timestamp).toLocaleString()}
                <div
                  className="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize"
                  onMouseDown={(e) => handleMouseDown(e, index + 1)}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredProperties.map((property) => (
            <React.Fragment key={property}>
              <tr>
                <th style={{ width: columnWidths[0], minWidth: columnWidths[0] }} className="sticky left-0 bg-white z-10 p-2 border text-left">
                  <button onClick={() => toggleRowExpansion(property)} className="mr-1">
                    {expandedRows.has(property) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </button>
                  {property}
                </th>
                {payloads.map((payload, index) => {
                  const value = payload.properties[property];
                  const nextValue = payloads[index + 1]?.properties[property];
                  const hasChanged = JSON.stringify(value) !== JSON.stringify(nextValue);
                  return (
                    <td 
                      key={index}
                      style={{ width: columnWidths[index + 1], minWidth: columnWidths[index + 1] }}
                      className={`p-2 border ${hasChanged ? "bg-yellow-100" : ""}`}
                      title={JSON.stringify(value)}
                    >
                      {formatCellValue(value)}
                    </td>
                  );
                })}
              </tr>
              {expandedRows.has(property) && (
                <tr>
                  <td colSpan={payloads.length + 1} className="p-2 border">
                    <pre className="text-xs whitespace-pre-wrap">
                      {JSON.stringify(payloads[0].properties[property], null, 2)}
                    </pre>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Main component render
  return (
    <div className="p-4 max-w-full mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">Consumer Journey Analyzer</h1>
      
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
      
      <div className="flex justify-center space-x-4 mb-6">
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
        {payloads.length > 0 && (
          <>
            <Button onClick={exportAnalysis} className="text-lg px-6 py-3">
              <Download className="mr-2 h-4 w-4" /> Export JSON
            </Button>
            <Button onClick={exportCSV} className="text-lg px-6 py-3">
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </>
        )}
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {payloads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Consumer Journey
              <div className="flex items-center text-sm text-gray-500">
                <Info className="h-4 w-4 mr-2" />
                Yellow cells indicate changes from the previous step
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center">
              <Search className="mr-2 h-4 w-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Search properties..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            {renderJourney()}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ConsumerJourneyAnalyzer;