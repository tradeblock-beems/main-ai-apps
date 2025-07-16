'use client';

import { useState, ChangeEvent, FormEvent } from 'react';
import { Textarea } from '@/components/Textarea';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';

interface ServerResponse {
  message: string;
  success?: boolean;
  failedTokens?: string[];
}

interface AudienceResponse {
  success: boolean;
  message: string;
  userCount: number;
  csvData: string;
  audienceDescription: string;
}

const isValidDeepLink = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname === 'tradeblock.us' || parsedUrl.hostname.endsWith('.tradeblock.us');
  } catch {
    return false;
  }
};

export default function Home() {
  // Push notification form state
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [deepLink, setDeepLink] = useState('');
  const [manualUserIds, setManualUserIds] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<ServerResponse | null>(null);

  // Audience query state
  const [lastActiveDays, setLastActiveDays] = useState<number | ''>('');
  const [tradedInLastDays, setTradedInLastDays] = useState<number | ''>('');
  const [notTradedInLastDays, setNotTradedInLastDays] = useState<number | ''>('');
  const [minLifetimeTrades, setMinLifetimeTrades] = useState<number | ''>('');
  const [maxLifetimeTrades, setMaxLifetimeTrades] = useState<number | ''>('');
  const [hasTrustedTrader, setHasTrustedTrader] = useState<boolean | null>(null);
  const [joinedAfterDate, setJoinedAfterDate] = useState('');
  
  // Data packs state for query builder
  const [topTargetShoe, setTopTargetShoe] = useState(false);
  const [hottestShoeTraded, setHottestShoeTraded] = useState(false);
  const [hottestShoeOffers, setHottestShoeOffers] = useState(false);
  
  // Data packs state for manual audience
  const [manualTopTargetShoe, setManualTopTargetShoe] = useState(false);
  const [manualHottestShoeTraded, setManualHottestShoeTraded] = useState(false);
  const [manualHottestShoeOffers, setManualHottestShoeOffers] = useState(false);
  
  // CSV column names for variable display
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  
  // Audience query results
  const [audienceLoading, setAudienceLoading] = useState(false);
  const [audienceResponse, setAudienceResponse] = useState<AudienceResponse | null>(null);
  const [generatedCsv, setGeneratedCsv] = useState<string | null>(null);
  
  // CSV splitting state
  const [splitSegments, setSplitSegments] = useState<2 | 3>(2);
  const [csvSegments, setCsvSegments] = useState<{segment: string, data: string, count: number}[]>([]);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'make' | 'track'>('make');
  
  // Push logs state
  const [pushLogs, setPushLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      
      // Read the CSV file to extract column names
      const reader = new FileReader();
      reader.onload = (event) => {
        const csvContent = event.target?.result as string;
        if (csvContent) {
          setCsvColumns(extractCsvColumns(csvContent));
        }
      };
      reader.readAsText(selectedFile);
    }
  };

  const extractCsvColumns = (csvData: string) => {
    if (!csvData.trim()) return [];
    const lines = csvData.trim().split('\n');
    if (lines.length === 0) return [];
    return lines[0].split(',').map(col => col.trim().replace(/"/g, ''));
  };

  const handleGenerateAudience = async () => {
    setAudienceLoading(true);
    setAudienceResponse(null);

    try {
      const filters: any = {};
      if (lastActiveDays !== '') filters.lastActiveDays = lastActiveDays;
      if (tradedInLastDays !== '') filters.tradedInLastDays = tradedInLastDays;
      if (notTradedInLastDays !== '') filters.notTradedInLastDays = notTradedInLastDays;
      if (minLifetimeTrades !== '') filters.minLifetimeTrades = minLifetimeTrades;
      if (maxLifetimeTrades !== '') filters.maxLifetimeTrades = maxLifetimeTrades;
      if (hasTrustedTrader !== null) filters.hasTrustedTrader = hasTrustedTrader;
      if (joinedAfterDate) filters.joinedAfterDate = joinedAfterDate;

      const dataPacks = {
        topTargetShoe,
        hottestShoeTraded,
        hottestShoeOffers
      };

      const res = await fetch('/api/query-audience', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...filters,
          dataPacks
        }),
      });

      const data: AudienceResponse = await res.json();
      setAudienceResponse(data);
      
      if (data.success && data.csvData) {
        setGeneratedCsv(data.csvData);
        setCsvColumns(extractCsvColumns(data.csvData));
      }
    } catch (error: any) {
      setAudienceResponse({ 
        success: false, 
        message: error.message || 'An unexpected error occurred.',
        userCount: 0,
        csvData: '',
        audienceDescription: ''
      });
    } finally {
      setAudienceLoading(false);
    }
  };

  const handleGenerateManualAudience = async () => {
    if (!manualUserIds.trim()) {
      alert('Please enter user IDs');
      return;
    }

    setAudienceLoading(true);
    setAudienceResponse(null);

    try {
      const userIdsArray = manualUserIds.split(',').map(id => id.trim()).filter(id => id);
      
      const dataPacks = {
        topTargetShoe: manualTopTargetShoe,
        hottestShoeTraded: manualHottestShoeTraded,
        hottestShoeOffers: manualHottestShoeOffers
      };

      const res = await fetch('/api/query-audience', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          manualUserIds: userIdsArray,
          dataPacks
        }),
      });

      const data: AudienceResponse = await res.json();
      setAudienceResponse(data);
      
      if (data.success && data.csvData) {
        setGeneratedCsv(data.csvData);
        setCsvColumns(extractCsvColumns(data.csvData));
      }
    } catch (error: any) {
      setAudienceResponse({ 
        success: false, 
        message: error.message || 'An unexpected error occurred.',
        userCount: 0,
        csvData: '',
        audienceDescription: ''
      });
    } finally {
      setAudienceLoading(false);
    }
  };

  const downloadCsv = () => {
    if (!generatedCsv) return;
    
    const blob = new Blob([generatedCsv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `audience_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const useGeneratedCsv = () => {
    if (!generatedCsv) return;
    
    // Convert CSV string to a File object
    const blob = new Blob([generatedCsv], { type: 'text/csv' });
    const csvFile = new File([blob], 'generated_audience.csv', { type: 'text/csv' });
    
    setFile(csvFile);
  };

  const splitCsvForTesting = () => {
    if (!generatedCsv) return;

    // Parse the CSV
    const lines = generatedCsv.trim().split('\n');
    const header = lines[0];
    const dataRows = lines.slice(1);

    // Calculate segment sizes
    const totalRows = dataRows.length;
    const baseSize = Math.floor(totalRows / splitSegments);
    const remainder = totalRows % splitSegments;

    const segments: {segment: string, data: string, count: number}[] = [];
    let currentIndex = 0;

    for (let i = 0; i < splitSegments; i++) {
      // Add one extra row to first 'remainder' segments to distribute remainder evenly
      const segmentSize = baseSize + (i < remainder ? 1 : 0);
      const segmentRows = dataRows.slice(currentIndex, currentIndex + segmentSize);
      const segmentCsv = [header, ...segmentRows].join('\n');
      
      segments.push({
        segment: String.fromCharCode(65 + i), // A, B, C
        data: segmentCsv,
        count: segmentRows.length
      });

      currentIndex += segmentSize;
    }

    setCsvSegments(segments);
  };

  const downloadSegment = (segmentData: string, segmentName: string) => {
    const blob = new Blob([segmentData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `audience_segment_${segmentName}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const fetchPushLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch('/api/push-logs');
      const data = await res.json();
      if (data.success) {
        setPushLogs(data.logs);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setResponse(null);

    if (!file || !title || !body) {
      setResponse({ message: 'Please fill out the title, body, and upload a CSV file.' });
      setIsLoading(false);
      return;
    }

    // Validate deep link if provided
    if (deepLink && !isValidDeepLink(deepLink)) {
      setResponse({ message: 'Deep link must be a valid tradeblock.us URL (e.g., https://tradeblock.us/...)' });
      setIsLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('body', body);
    if (deepLink) {
      formData.append('deepLink', deepLink);
    }
    formData.append('file', file);

    try {
      const res = await fetch('/api/send-push', {
        method: 'POST',
        body: formData,
      });
      const data: ServerResponse = await res.json();
      setResponse(data);
    } catch (error: any) {
      setResponse({ message: error.message || 'An unexpected error occurred.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50">
      <div className="w-full max-w-4xl bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Push Blaster</h1>
        
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'make' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('make')}
          >
            MAKE
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'track' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => {
              setActiveTab('track');
              fetchPushLogs();
            }}
          >
            TRACK
          </button>
        </div>
        
        {/* MAKE Tab Content */}
        {activeTab === 'make' && (
          <div>
            {/* Audience Query Builder Container */}
            <div className="mb-8 p-6 bg-gray-50 rounded-lg border-2 border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Query Push Audience</h2>
          
          {/* Filter Criteria */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Active (days)</label>
              <Input
                type="number"
                placeholder="e.g. 90"
                value={lastActiveDays}
                onChange={(e) => setLastActiveDays(e.target.value === '' ? '' : Number(e.target.value))}
                disabled={audienceLoading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Traded in Last (days)</label>
              <Input
                type="number"
                placeholder="e.g. 30"
                value={tradedInLastDays}
                onChange={(e) => setTradedInLastDays(e.target.value === '' ? '' : Number(e.target.value))}
                disabled={audienceLoading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NOT Traded in Last (days)</label>
              <Input
                type="number"
                placeholder="e.g. 90"
                value={notTradedInLastDays}
                onChange={(e) => setNotTradedInLastDays(e.target.value === '' ? '' : Number(e.target.value))}
                disabled={audienceLoading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Lifetime Trades</label>
              <Input
                type="number"
                placeholder="e.g. 5"
                value={minLifetimeTrades}
                onChange={(e) => setMinLifetimeTrades(e.target.value === '' ? '' : Number(e.target.value))}
                disabled={audienceLoading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Lifetime Trades</label>
              <Input
                type="number"
                placeholder="e.g. 100"
                value={maxLifetimeTrades}
                onChange={(e) => setMaxLifetimeTrades(e.target.value === '' ? '' : Number(e.target.value))}
                disabled={audienceLoading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Joined After Date</label>
              <Input
                type="date"
                value={joinedAfterDate}
                onChange={(e) => setJoinedAfterDate(e.target.value)}
                disabled={audienceLoading}
              />
            </div>
          </div>

          {/* Trusted Trader Status */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Trusted Trader Status</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="trustedTrader"
                  checked={hasTrustedTrader === null}
                  onChange={() => setHasTrustedTrader(null)}
                  disabled={audienceLoading}
                  className="mr-2"
                />
                Any
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="trustedTrader"
                  checked={hasTrustedTrader === true}
                  onChange={() => setHasTrustedTrader(true)}
                  disabled={audienceLoading}
                  className="mr-2"
                />
                Trusted Trader
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="trustedTrader"
                  checked={hasTrustedTrader === false}
                  onChange={() => setHasTrustedTrader(false)}
                  disabled={audienceLoading}
                  className="mr-2"
                />
                Non-Trusted Trader
              </label>
            </div>
          </div>

          {/* Data Packs */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Data Packs</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={topTargetShoe}
                  onChange={(e) => setTopTargetShoe(e.target.checked)}
                  disabled={audienceLoading}
                  className="mr-2"
                />
                TOP TARGET SHOE
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={hottestShoeTraded}
                  onChange={(e) => setHottestShoeTraded(e.target.checked)}
                  disabled={audienceLoading}
                  className="mr-2"
                />
                YOUR HOTTEST SHOE - TRADES
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={hottestShoeOffers}
                  onChange={(e) => setHottestShoeOffers(e.target.checked)}
                  disabled={audienceLoading}
                  className="mr-2"
                />
                YOUR HOTTEST SHOE - OFFERS
              </label>
            </div>
          </div>

          {/* Generate Button */}
          <Button 
            type="button" 
            onClick={handleGenerateAudience} 
            disabled={audienceLoading}
            className="mb-4"
          >
            {audienceLoading ? 'Generating...' : 'Generate Audience CSV'}
          </Button>

          {/* Results */}
          {audienceResponse && (
            <div className={`p-4 rounded-md text-sm mb-4 ${audienceResponse.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              <p className="font-bold">{audienceResponse.success ? 'Success!' : 'Error'}</p>
              <p>{audienceResponse.message}</p>
              {audienceResponse.success && (
                <>
                  <p className="mt-2"><strong>Audience:</strong> {audienceResponse.audienceDescription}</p>
                  <div className="flex gap-2 mt-3">
                    <Button type="button" onClick={downloadCsv} disabled={!generatedCsv}>
                      Download CSV ({audienceResponse.userCount} users)
                    </Button>
                    <Button type="button" onClick={useGeneratedCsv} disabled={!generatedCsv}>
                      Use for Push
                    </Button>
                  </div>
                  
                  {/* CSV Splitting for A/B Testing */}
                  <div className="mt-4 p-4 bg-blue-50 rounded-md border">
                    <h4 className="font-medium text-blue-900 mb-2">Split for A/B Testing</h4>
                    <div className="flex items-center gap-4 mb-3">
                      <label className="text-sm text-blue-800">Split into:</label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="segments"
                          value={2}
                          checked={splitSegments === 2}
                          onChange={() => setSplitSegments(2)}
                          className="mr-1"
                        />
                        2 segments (A/B)
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="segments"
                          value={3}
                          checked={splitSegments === 3}
                          onChange={() => setSplitSegments(3)}
                          className="mr-1"
                        />
                        3 segments (A/B/C)
                      </label>
                    </div>
                    
                    <Button 
                      type="button" 
                      onClick={splitCsvForTesting} 
                      disabled={!generatedCsv}
                      className="mb-3"
                    >
                      Generate Segments
                    </Button>
                    
                    {csvSegments.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm text-blue-800 font-medium">Download Segments:</p>
                        <div className="flex gap-2">
                          {csvSegments.map(segment => (
                            <Button
                              key={segment.segment}
                              type="button"
                              onClick={() => downloadSegment(segment.data, segment.segment)}
                              className="text-sm"
                            >
                              Segment {segment.segment} ({segment.count} users)
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Manual Audience Creation Container */}
        <div className="mb-8 p-6 bg-blue-50 rounded-lg border-2 border-blue-200">
          <h2 className="text-xl font-semibold mb-4 text-blue-800">Manual Audience Creation</h2>
          
          <div className="mb-4">
            <label htmlFor="manual_user_ids" className="block text-sm font-medium text-gray-700 mb-1">Enter User IDs</label>
            <Input
              id="manual_user_ids"
              type="text"
              placeholder="up to 5, comma-separated"
              value={manualUserIds}
              onChange={(e) => setManualUserIds(e.target.value)}
              disabled={audienceLoading}
            />
            <p className="text-xs text-gray-500 mt-1">Enter friendly user IDs for testing data packs</p>
          </div>

          {/* Data Packs for Manual Audience */}
          <div className="mb-6">
            <h3 className="text-md font-medium text-gray-700 mb-3">Add Data Packs</h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={manualTopTargetShoe}
                  onChange={(e) => setManualTopTargetShoe(e.target.checked)}
                  disabled={audienceLoading}
                  className="mr-2"
                />
                TOP TARGET SHOE - User's most desired item
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={manualHottestShoeTraded}
                  onChange={(e) => setManualHottestShoeTraded(e.target.checked)}
                  disabled={audienceLoading}
                  className="mr-2"
                />
                YOUR HOTTEST SHOE - TRADES - Most traded item in past 30 days
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={manualHottestShoeOffers}
                  onChange={(e) => setManualHottestShoeOffers(e.target.checked)}
                  disabled={audienceLoading}
                  className="mr-2"
                />
                YOUR HOTTEST SHOE - OFFERS - Most offered item in past 7 days
              </label>
            </div>
          </div>

          <Button 
            type="button" 
            onClick={handleGenerateManualAudience}
            disabled={audienceLoading || !manualUserIds.trim()}
            className="mb-4"
          >
            {audienceLoading ? 'Generating...' : 'Generate Audience CSV'}
          </Button>

          {/* Manual audience results would show here (shared with query results) */}
        </div>

        <div className="border-t-2 border-gray-200 pt-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Send Push Notification</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
                      <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Notification Title</label>
            <Input
              id="title"
              type="text"
              placeholder="e.g. Hey there! Those [[var:top_target_shoe_name]]s are waiting..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">Use [[var:column_name]] to insert CSV data (e.g., [[var:top_target_shoe_name]])</p>
          </div>

          <div>
            <label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-1">Notification Body</label>
            <Textarea
              id="body"
              placeholder="e.g. We saw you hunting for [[var:top_target_shoe_name]]s, so we generated some offers for you!"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">Personalize with variables like [[var:top_target_shoe_name]] or [[var:user_first_name]]</p>
          </div>

          <div>
            <label htmlFor="deeplink" className="block text-sm font-medium text-gray-700 mb-1">Deep Link URL (Optional)</label>
            <Input
              id="deeplink"
              type="url"
              placeholder="e.g. https://tradeblock.us/offers/variant/[[var:top_target_shoe_variantid]]"
              value={deepLink}
              onChange={(e) => setDeepLink(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">Where to direct users when they tap the notification. Use variables for personalized links!</p>
          </div>

          <div>
            <label htmlFor="user_csv" className="block text-sm font-medium text-gray-700 mb-1">
              Upload User ID CSV
            </label>
            <input
              id="user_csv"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 disabled:opacity-50"
              disabled={isLoading}
            />
            {file && <p className="text-xs text-gray-500 mt-1">Selected: {file.name}</p>}
          </div>

          {/* Display CSV column names for variable reference */}
          {csvColumns.length > 0 && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm font-medium text-green-800 mb-2">Available Variables:</p>
              <div className="flex flex-wrap gap-2">
                {csvColumns.map(column => (
                  <span 
                    key={column} 
                    className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded cursor-pointer hover:bg-green-200"
                    onClick={() => {
                      navigator.clipboard.writeText(`[[var:${column}]]`);
                      alert(`Copied [[var:${column}]] to clipboard!`);
                    }}
                  >
                    [[var:{column}]]
                  </span>
                ))}
              </div>
              <p className="text-xs text-green-600 mt-1">Click any variable to copy it to clipboard</p>
            </div>
          )}

          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Blast It!'}
          </Button>
        </form>
        </div>

        {response && (
          <div className={`mt-6 p-4 rounded-md text-sm ${response.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            <p className="font-bold">{response.success ? 'Success!' : 'Error'}</p>
            <p>{response.message}</p>
            {response.failedTokens && response.failedTokens.length > 0 && (
              <div className="mt-2">
                <p className="font-semibold">Failed tokens:</p>
                <ul className="list-disc list-inside">
                  {response.failedTokens.map(token => <li key={token} className="truncate">{token}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
          </div>
        )}

        {/* TRACK Tab Content */}
        {activeTab === 'track' && (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Push Notification History</h2>
            
            {logsLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading logs...</p>
              </div>
            ) : pushLogs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No push notifications sent yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pushLogs.map((log) => (
                  <div key={log.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{log.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{log.body}</p>
                        {log.deepLink && (
                          <p className="text-xs text-blue-600 mt-1">→ {log.deepLink}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-2 py-1 text-xs rounded ${
                          log.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {log.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500 space-y-1">
                      <p><strong>Audience:</strong> {log.audienceDescription} ({log.audienceSize} users)</p>
                      {log.successCount !== undefined && log.totalCount !== undefined && (
                        <p><strong>Delivery:</strong> {log.successCount} of {log.totalCount} notifications sent</p>
                      )}
                      <p><strong>Sent:</strong> {new Date(log.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
    </div>
    </main>
  );
}
