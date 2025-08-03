'use client';

import { useState, ChangeEvent, FormEvent } from 'react';
import { Textarea } from '@/components/Textarea';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import Papa from 'papaparse';

interface ServerResponse {
  message: string;
  success?: boolean;
  failedTokens?: string[];
  jobId?: string;
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
  const [daysSinceLastActiveInactive, setDaysSinceLastActiveInactive] = useState<number | ''>('');
  const [tradedInLastDays, setTradedInLastDays] = useState<number | ''>('');
  const [notTradedInLastDays, setNotTradedInLastDays] = useState<number | ''>('');
  const [minLifetimeTrades, setMinLifetimeTrades] = useState<number | ''>('');
  const [maxLifetimeTrades, setMaxLifetimeTrades] = useState<number | ''>('');
  const [hasTrustedTrader, setHasTrustedTrader] = useState<boolean | null>(null);
  const [isTrustedTraderCandidate, setIsTrustedTraderCandidate] = useState<boolean | null>(null);
  const [joinedAfterDate, setJoinedAfterDate] = useState('');
  
  // Data packs state for query builder
  const [topTargetShoe, setTopTargetShoe] = useState(false);
  const [hottestShoeTraded, setHottestShoeTraded] = useState(false);
  const [hottestShoeTradedLookback, setHottestShoeTradedLookback] = useState<number | ''>(30);
  const [hottestShoeOffers, setHottestShoeOffers] = useState(false);
  const [hottestShoeOffersLookback, setHottestShoeOffersLookback] = useState<number | ''>(7);
  
  // Data packs state for manual audience
  const [manualTopTargetShoe, setManualTopTargetShoe] = useState(false);
  const [manualHottestShoeTraded, setManualHottestShoeTraded] = useState(false);
  const [manualHottestShoeTradedLookback, setManualHottestShoeTradedLookback] = useState<number | ''>(30);
  const [manualHottestShoeOffers, setManualHottestShoeOffers] = useState(false);
  const [manualHottestShoeOffersLookback, setManualHottestShoeOffersLookback] = useState<number | ''>(7);
  
  // CSV column names for variable display
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  
  // Audience query results
  const [audienceLoading, setAudienceLoading] = useState(false);
  const [audienceResponse, setAudienceResponse] = useState<AudienceResponse | null>(null);
  const [generatedCsv, setGeneratedCsv] = useState<string | null>(null);
  const [queryResult, setQueryResult] = useState<any[] | null>(null);
  const [audienceDescription, setAudienceDescription] = useState('');
  const [csvPreview, setCsvPreview] = useState<any[] | null>(null);

  // For Manual Audience
  const [manualFile, setManualFile] = useState<File | null>(null);
  
  // CSV splitting state
  const [splitSegments, setSplitSegments] = useState<number | ''>(2);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'make' | 'track' | 'calendar'>('make');
  
  // Push logs state
  const [pushLogs, setPushLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Scheduling state
  const [pushMode, setPushMode] = useState<'now' | 'schedule'>('now');
  const [savedAudienceCriteria, setSavedAudienceCriteria] = useState<any>(null);
  const [savedAudienceDescription, setSavedAudienceDescription] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  // Calendar state
  const [scheduledPushes, setScheduledPushes] = useState<any[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarView, setCalendarView] = useState<'monthly' | 'weekly'>('monthly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedPush, setSelectedPush] = useState<any>(null);
  const [showPushModal, setShowPushModal] = useState(false);
  const [editingPush, setEditingPush] = useState<any>(null);

  // Modal-specific audience state
  const [modalAudienceResponse, setModalAudienceResponse] = useState<AudienceResponse | null>(null);
  const [modalGeneratedCsv, setModalGeneratedCsv] = useState<string | null>(null);
  const [modalCsvPreview, setModalCsvPreview] = useState<any[] | null>(null);
  const [modalAudienceLoading, setModalAudienceLoading] = useState(false);
  const [modalFile, setModalFile] = useState<File | null>(null);
  const [modalResponse, setModalResponse] = useState<ServerResponse | null>(null);
  const [modalIsLoading, setModalIsLoading] = useState(false);
  const [modalTrackingRecord, setModalTrackingRecord] = useState<any>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      
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

  const handleSaveAudienceCriteria = () => {
    const filters: any = {};
    if (lastActiveDays !== '') filters.lastActiveDays = lastActiveDays;
    if (daysSinceLastActiveInactive !== '') filters.daysSinceLastActive_inactive = daysSinceLastActiveInactive;
    if (tradedInLastDays !== '') filters.tradedInLastDays = tradedInLastDays;
    if (notTradedInLastDays !== '') filters.notTradedInLastDays = notTradedInLastDays;
    if (minLifetimeTrades !== '') filters.minLifetimeTrades = minLifetimeTrades;
    if (maxLifetimeTrades !== '') filters.maxLifetimeTrades = maxLifetimeTrades;
    if (hasTrustedTrader !== null) filters.hasTrustedTrader = hasTrustedTrader;
    if (isTrustedTraderCandidate !== null) filters.isTrustedTraderCandidate = isTrustedTraderCandidate;
    if (joinedAfterDate) filters.joinedAfterDate = joinedAfterDate;

    const dataPacks: any = {
      topTargetShoe,
      hottestShoeTraded,
      hottestShoeOffers,
    };

    if (hottestShoeTraded && hottestShoeTradedLookback !== '') {
      dataPacks.hottestShoeTradedLookback = hottestShoeTradedLookback;
    }
    if (hottestShoeOffers && hottestShoeOffersLookback !== '') {
      dataPacks.hottestShoeOffersLookback = hottestShoeOffersLookback;
    }

    const criteria = { filters, dataPacks };
    setSavedAudienceCriteria(criteria);
    
    // Generate description for saved criteria
    const desc = generateAudienceDescription(criteria);
    setSavedAudienceDescription(desc);
    
    alert('Audience criteria saved successfully!');
  };

  const handleSaveManualAudienceCriteria = () => {
    if (!manualUserIds.trim()) {
      alert('Please enter user IDs before saving criteria');
      return;
    }

    const userIdsArray = manualUserIds.split(',').map(id => id.trim()).filter(id => id);
    
    const dataPacks: any = {
      topTargetShoe: manualTopTargetShoe,
      hottestShoeTraded: manualHottestShoeTraded,
      hottestShoeOffers: manualHottestShoeOffers
    };

    if (manualHottestShoeTraded && manualHottestShoeTradedLookback !== '') {
      dataPacks.hottestShoeTradedLookback = manualHottestShoeTradedLookback;
    }
    if (manualHottestShoeOffers && manualHottestShoeOffersLookback !== '') {
      dataPacks.hottestShoeOffersLookback = manualHottestShoeOffersLookback;
    }

    const criteria = { manualUserIds: userIdsArray, dataPacks };
    setSavedAudienceCriteria(criteria);
    setSavedAudienceDescription(`Manual audience: ${userIdsArray.length} specified user(s)`);
    
    alert('Manual audience criteria saved successfully!');
  };

  const generateAudienceDescription = (criteria: any) => {
    const parts = [];
    const { filters, dataPacks } = criteria;
    
    if (filters?.lastActiveDays) parts.push(`active in last ${filters.lastActiveDays} days`);
    if (filters?.tradedInLastDays) parts.push(`traded in last ${filters.tradedInLastDays} days`);
    if (filters?.minLifetimeTrades) parts.push(`min ${filters.minLifetimeTrades} lifetime trades`);
    if (filters?.hasTrustedTrader === true) parts.push('trusted traders');
    if (filters?.hasTrustedTrader === false) parts.push('non-trusted traders');
    
    const dataPackParts = [];
    if (dataPacks?.topTargetShoe) dataPackParts.push('TOP TARGET SHOE');
    if (dataPacks?.hottestShoeTraded) dataPackParts.push('HOTTEST SHOE TRADED');
    if (dataPacks?.hottestShoeOffers) dataPackParts.push('HOTTEST SHOE OFFERS');
    
    let description = parts.length > 0 ? `Users with ${parts.join(', ')}` : 'All users';
    if (dataPackParts.length > 0) {
      description += ` + data packs: ${dataPackParts.join(', ')}`;
    }
    
    return description;
  };

  const handleGenerateAudience = async () => {
    setAudienceLoading(true);
    setAudienceResponse(null);

    try {
      const filters: any = {};
      if (lastActiveDays !== '') filters.lastActiveDays = lastActiveDays;
      if (daysSinceLastActiveInactive !== '') filters.daysSinceLastActive_inactive = daysSinceLastActiveInactive;
      if (tradedInLastDays !== '') filters.tradedInLastDays = tradedInLastDays;
      if (notTradedInLastDays !== '') filters.notTradedInLastDays = notTradedInLastDays;
      if (minLifetimeTrades !== '') filters.minLifetimeTrades = minLifetimeTrades;
      if (maxLifetimeTrades !== '') filters.maxLifetimeTrades = maxLifetimeTrades;
      if (hasTrustedTrader !== null) filters.hasTrustedTrader = hasTrustedTrader;
      if (isTrustedTraderCandidate !== null) filters.isTrustedTraderCandidate = isTrustedTraderCandidate;
      if (joinedAfterDate) filters.joinedAfterDate = joinedAfterDate;

      const dataPacks: any = {
        topTargetShoe,
        hottestShoeTraded,
        hottestShoeOffers,
      };

      if (hottestShoeTraded && hottestShoeTradedLookback !== '') {
        dataPacks.hottestShoeTradedLookback = hottestShoeTradedLookback;
      }
      if (hottestShoeOffers && hottestShoeOffersLookback !== '') {
        dataPacks.hottestShoeOffersLookback = hottestShoeOffersLookback;
      }

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
        Papa.parse(data.csvData, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            setCsvPreview(results.data.slice(0, 4));
          },
        });
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
      
      const dataPacks: any = {
        topTargetShoe: manualTopTargetShoe,
        hottestShoeTraded: manualHottestShoeTraded,
        hottestShoeOffers: manualHottestShoeOffers
      };

      if (manualHottestShoeTraded && manualHottestShoeTradedLookback !== '') {
        dataPacks.hottestShoeTradedLookback = manualHottestShoeTradedLookback;
      }
      if (manualHottestShoeOffers && manualHottestShoeOffersLookback !== '') {
        dataPacks.hottestShoeOffersLookback = manualHottestShoeOffersLookback;
      }

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
        Papa.parse(data.csvData, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            setCsvPreview(results.data.slice(0, 4));
          },
        });
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
    
    const blob = new Blob([generatedCsv], { type: 'text/csv' });
    const csvFile = new File([blob], 'generated_audience.csv', { type: 'text/csv' });
    
    setFile(csvFile);
  };

  const handleSplitAndDownload = async () => {
    if (!generatedCsv || !splitSegments) return;

    const numSegments = Number(splitSegments);
    if (isNaN(numSegments) || numSegments < 1 || numSegments > 20) {
      alert('Please enter a number of segments between 1 and 20.');
      return;
    }

    setAudienceLoading(true);

    try {
      const res = await fetch('/api/query-audience', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          csvData: generatedCsv,
          splitCount: numSegments,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to generate zip file.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `audience_segments_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setAudienceLoading(false);
    }
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

  const fetchScheduledPushes = async () => {
    setCalendarLoading(true);
    try {
      const res = await fetch('/api/scheduled-pushes');
      const data = await res.json();
      if (data.success) {
        setScheduledPushes(data.scheduledPushes);
      }
    } catch (error) {
      console.error('Failed to fetch scheduled pushes:', error);
    } finally {
      setCalendarLoading(false);
    }
  };

  const handlePushClick = (push: any) => {
    setSelectedPush(push);
    setEditingPush({
      title: push.title,
      body: push.body,
      deepLinkUrl: push.deepLinkUrl || ''
    });
    
    // Clear modal-specific state when opening
    setModalResponse(null);
    setModalAudienceResponse(null);
    setModalGeneratedCsv(null);
    setModalFile(null);
    
    // If push status is 'sent', we should show tracking record instead of edit interface
    if (push.status === 'sent') {
      // For sent pushes, we'll need to fetch the actual tracking record
      // For now, create a basic tracking record structure
      setModalTrackingRecord({
        id: push.id,
        timestamp: push.createdAt,
        status: 'completed',
        title: push.title,
        body: push.body,
        deepLink: push.deepLinkUrl || undefined,
        audienceDescription: push.audienceDescription,
        audienceSize: 0, // Would need to be stored when sent
        isDryRun: false,
        successCount: 0,
        totalCount: 0
      });
    } else {
      setModalTrackingRecord(null);
    }
    
    setShowPushModal(true);
  };

  const handleSavePushChanges = async () => {
    if (!selectedPush || !editingPush) return;

    setModalIsLoading(true);
    setModalResponse(null);
    try {
      const res = await fetch(`/api/scheduled-pushes/${selectedPush.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingPush),
      });

      const data = await res.json();
      if (data.success) {
        // Update the scheduled pushes list
        setScheduledPushes(prev => 
          prev.map(push => 
            push.id === selectedPush.id 
              ? { ...push, ...editingPush }
              : push
          )
        );
        setModalResponse({ success: true, message: 'Push updated successfully!' });
      } else {
        setModalResponse({ success: false, message: data.message || 'Failed to update push.' });
      }
    } catch (error: any) {
      setModalResponse({ success: false, message: error.message || 'An unexpected error occurred.' });
    } finally {
      setModalIsLoading(false);
    }
  };

  const handleGenerateModalAudience = async () => {
    if (!selectedPush?.audienceCriteria) return;

    setModalAudienceLoading(true);
    setModalAudienceResponse(null);

    try {
      const criteria = selectedPush.audienceCriteria;
      
      const requestBody: any = {
        ...criteria.filters,
        dataPacks: criteria.dataPacks
      };

      if (criteria.manualUserIds) {
        requestBody.manualUserIds = criteria.manualUserIds;
      }

      const res = await fetch('/api/query-audience', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data: AudienceResponse = await res.json();
      setModalAudienceResponse(data);
      
      if (data.success && data.csvData) {
        setModalGeneratedCsv(data.csvData);
        Papa.parse(data.csvData, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            setModalCsvPreview(results.data.slice(0, 4));
          },
        });
      }
    } catch (error: any) {
      setModalAudienceResponse({ 
        success: false, 
        message: error.message || 'An unexpected error occurred.',
        userCount: 0,
        csvData: '',
        audienceDescription: ''
      });
    } finally {
      setModalAudienceLoading(false);
    }
  };

  const downloadModalCsv = () => {
    if (!modalGeneratedCsv) return;
    
    const blob = new Blob([modalGeneratedCsv], { type: 'text/csv' });
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

  const useModalGeneratedCsv = () => {
    if (!modalGeneratedCsv) return;
    
    const blob = new Blob([modalGeneratedCsv], { type: 'text/csv' });
    const csvFile = new File([blob], 'generated_audience.csv', { type: 'text/csv' });
    
    setModalFile(csvFile);
  };

  const handleModalFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setModalFile(selectedFile);
    }
  };

  const handleModalSendPush = async (isDryRun: boolean = false) => {
    if (!modalFile || !editingPush?.title || !editingPush?.body) {
      setModalResponse({ message: 'Please fill out the title, body, and ensure a CSV file is available.' });
      return;
    }

    if (editingPush.deepLinkUrl && !isValidDeepLink(editingPush.deepLinkUrl)) {
      setModalResponse({ message: 'Deep link must be a valid tradeblock.us URL.' });
      return;
    }

    setModalIsLoading(true);
    setModalResponse(null);

    const formData = new FormData();
    formData.append('title', editingPush.title);
    formData.append('body', editingPush.body);
    if (editingPush.deepLinkUrl) {
      formData.append('deepLink', editingPush.deepLinkUrl);
    }
    formData.append('file', modalFile);

    try {
      const url = isDryRun ? '/api/send-push?dryRun=true' : '/api/send-push';
      const res = await fetch(url, {
        method: 'POST',
        body: formData,
      });
      const data: ServerResponse = await res.json();
      setModalResponse(data);

      // If successful and not a dry run, update push status and create tracking record
      if (data.success && !isDryRun) {
        try {
          // Update the scheduled push status to 'sent'
          await fetch(`/api/scheduled-pushes/${selectedPush.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: 'sent' }),
          });

          // Update local scheduled pushes state
          setScheduledPushes(prev => 
            prev.map(push => 
              push.id === selectedPush.id 
                ? { ...push, status: 'sent' }
                : push
            )
          );

          // Create tracking record for modal display
          const trackingRecord = {
            id: data.jobId,
            timestamp: new Date().toISOString(),
            status: 'completed',
            title: editingPush.title,
            body: editingPush.body,
            deepLink: editingPush.deepLinkUrl || undefined,
            audienceDescription: selectedPush.audienceDescription,
            audienceSize: modalAudienceResponse?.userCount || 0,
            isDryRun: false,
            successCount: modalAudienceResponse?.userCount || 0,
            totalCount: modalAudienceResponse?.userCount || 0
          };

          setModalTrackingRecord(trackingRecord);
        } catch (error) {
          console.error('Failed to update push status:', error);
        }
      }
    } catch (error: any) {
      setModalResponse({ message: error.message || 'An unexpected error occurred.' });
    } finally {
      setModalIsLoading(false);
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

  const handleDryRun = async () => {
    setIsLoading(true);
    setResponse(null);

    if (!file || !title || !body) {
      setResponse({ message: 'Please fill out the title, body, and upload a CSV file for a dry run.' });
      setIsLoading(false);
      return;
    }

    if (deepLink && !isValidDeepLink(deepLink)) {
      setResponse({ message: 'Deep link must be a valid tradeblock.us URL.' });
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
      const res = await fetch('/api/send-push?dryRun=true', {
        method: 'POST',
        body: formData,
      });
      const data: ServerResponse = await res.json();
      setResponse(data);
    } catch (error: any) {
      setResponse({ message: error.message || 'An unexpected error occurred during dry run.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleScheduleClick = () => {
    if (!savedAudienceCriteria) {
      alert('Please save audience criteria first using the "Save Audience Criteria" button in one of the audience sections above.');
      return;
    }

    if (!title || !body) {
      alert('Please fill out the notification title and body before scheduling.');
      return;
    }

    setShowScheduleModal(true);
  };

  const handleScheduleSubmit = async () => {
    if (!scheduledDate || !scheduledTime) {
      alert('Please select both date and time for scheduling.');
      return;
    }

    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    
    if (scheduledDateTime <= new Date()) {
      alert('Scheduled time must be in the future.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/scheduled-pushes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheduledFor: scheduledDateTime.toISOString(),
          title,
          body,
          deepLinkUrl: deepLink || null,
          audienceCriteria: savedAudienceCriteria,
          audienceDescription: savedAudienceDescription,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setResponse({ 
          success: true, 
          message: `Push notification scheduled successfully for ${scheduledDateTime.toLocaleString()}!` 
        });
        setShowScheduleModal(false);
        setScheduledDate('');
        setScheduledTime('');
        // Clear form
        setTitle('');
        setBody('');
        setDeepLink('');
        setSavedAudienceCriteria(null);
        setSavedAudienceDescription('');
      } else {
        setResponse({ 
          success: false, 
          message: data.message || 'Failed to schedule push notification.' 
        });
      }
    } catch (error: any) {
      setResponse({ 
        success: false, 
        message: error.message || 'An unexpected error occurred while scheduling.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusInfo = (log: any) => {
    if (log.isDryRun) {
      return {
        text: 'DRY RUN',
        className: 'bg-yellow-100 text-yellow-800',
      };
    }
    switch (log.status) {
      case 'completed':
        return { text: 'COMPLETED', className: 'bg-green-100 text-green-800' };
      case 'failed':
        return { text: 'FAILED', className: 'bg-red-100 text-red-800' };
      case 'in_progress':
        return { text: 'IN PROGRESS', className: 'bg-blue-100 text-blue-800' };
      default:
        return { text: (log.status || 'UNKNOWN').toUpperCase(), className: 'bg-gray-100 text-gray-800' };
    }
  };

  const truncateUrl = (url: string, maxLength: number = 99) => {
    if (url.length <= maxLength) return url;
    
    // Smart truncation: show beginning and end
    const startChars = Math.floor((maxLength - 3) * 0.6); // 60% for start
    const endChars = Math.floor((maxLength - 3) * 0.4);   // 40% for end
    
    return `${url.substring(0, startChars)}...${url.substring(url.length - endChars)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('URL copied to clipboard!');
  };

  // Calendar utility functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };

  const getPushesForDate = (date: Date) => {
    return scheduledPushes.filter(push => {
      const pushDate = new Date(push.scheduledFor);
      return isSameDay(pushDate, date);
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setDate(prev.getDate() - 7);
      } else {
        newDate.setDate(prev.getDate() + 7);
      }
      return newDate;
    });
  };

  const getWeekDays = (date: Date) => {
    const week = [];
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }
    return week;
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50">
      <div className="w-full max-w-4xl bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Push Blaster</h1>
        
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
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'calendar' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => {
              setActiveTab('calendar');
              fetchScheduledPushes();
            }}
          >
            CALENDAR
          </button>
        </div>
        
        {activeTab === 'make' && (
          <div>
            {/* Push Mode Toggle */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold mb-3 text-blue-800">Push Mode</h3>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="pushMode"
                    checked={pushMode === 'now'}
                    onChange={() => setPushMode('now')}
                    className="mr-2"
                  />
                  <span className="font-medium">Push Now</span>
                  <span className="text-sm text-gray-600 ml-2">(existing experience)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="pushMode"
                    checked={pushMode === 'schedule'}
                    onChange={() => setPushMode('schedule')}
                    className="mr-2"
                  />
                  <span className="font-medium">Schedule a Push</span>
                  <span className="text-sm text-gray-600 ml-2">(draft and schedule for later)</span>
                </label>
              </div>
              {savedAudienceCriteria && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm font-medium text-green-800">✓ Saved Audience Criteria:</p>
                  <p className="text-sm text-green-700">{savedAudienceDescription}</p>
                </div>
              )}
            </div>
            <div className="mb-8 p-6 bg-gray-50 rounded-lg border-2 border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Query Push Audience</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Active in Last (days)</label>
              <Input
                type="number"
                placeholder="e.g. 90"
                value={lastActiveDays}
                onChange={(e) => setLastActiveDays(e.target.value === '' ? '' : Number(e.target.value))}
                disabled={audienceLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NOT Active in Last (days)</label>
              <Input
                type="number"
                placeholder="e.g. 30"
                value={daysSinceLastActiveInactive}
                onChange={(e) => setDaysSinceLastActiveInactive(e.target.value === '' ? '' : Number(e.target.value))}
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

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Trusted Trader Candidate?</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="trustedTraderCandidate"
                  checked={isTrustedTraderCandidate === null}
                  onChange={() => setIsTrustedTraderCandidate(null)}
                  disabled={audienceLoading}
                  className="mr-2"
                />
                Any
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="trustedTraderCandidate"
                  checked={isTrustedTraderCandidate === true}
                  onChange={() => setIsTrustedTraderCandidate(true)}
                  disabled={audienceLoading}
                  className="mr-2"
                />
                Is a Candidate
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="trustedTraderCandidate"
                  checked={isTrustedTraderCandidate === false}
                  onChange={() => setIsTrustedTraderCandidate(false)}
                  disabled={audienceLoading}
                  className="mr-2"
                />
                Not a Candidate
              </label>
            </div>
          </div>

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
              {hottestShoeTraded && (
                  <div className="pl-6">
                      <label className="text-xs text-gray-500">Lookback (days)</label>
                      <Input 
                          type="number"
                          value={hottestShoeTradedLookback}
                          onChange={(e) => setHottestShoeTradedLookback(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-24 h-8 text-sm"
                          placeholder="30"
                      />
                  </div>
              )}
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
              {hottestShoeOffers && (
                  <div className="pl-6">
                      <label className="text-xs text-gray-500">Lookback (days)</label>
                      <Input 
                          type="number"
                          value={hottestShoeOffersLookback}
                          onChange={(e) => setHottestShoeOffersLookback(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-24 h-8 text-sm"
                          placeholder="7"
                      />
                  </div>
              )}
            </div>
          </div>

          {pushMode === 'now' ? (
            <Button 
              type="button" 
              onClick={handleGenerateAudience} 
              disabled={audienceLoading}
              className="mb-4"
            >
              {audienceLoading ? 'Generating...' : 'Generate Audience CSV'}
            </Button>
          ) : (
            <div className="flex gap-3 mb-4">
              <Button 
                type="button" 
                onClick={handleSaveAudienceCriteria} 
                disabled={audienceLoading}
                className="bg-green-600 hover:bg-green-500"
              >
                Save Audience Criteria
              </Button>
              <Button 
                type="button" 
                onClick={handleGenerateAudience} 
                disabled={audienceLoading}
              >
                {audienceLoading ? 'Generating...' : 'Generate Audience CSV'}
              </Button>
            </div>
          )}

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
                      <label htmlFor="split_segments" className="block text-sm font-medium text-gray-700">Number of segments (1-20)</label>
                      <Input
                        id="split_segments"
                        type="number"
                        min="1"
                        max="20"
                        value={splitSegments}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') {
                                setSplitSegments('');
                            } else {
                                const num = Math.max(1, Math.min(20, Number(val)));
                                setSplitSegments(num);
                            }
                        }}
                        placeholder="e.g. 5"
                        className="w-24"
                        disabled={!generatedCsv || audienceLoading}
                      />
                    </div>
                    
                    <Button 
                      type="button" 
                      onClick={handleSplitAndDownload} 
                      disabled={!generatedCsv || audienceLoading || !splitSegments}
                      className="mb-3"
                    >
                      {audienceLoading ? 'Generating...' : 'Generate & Download Segments (.zip)'}
                    </Button>
                  </div>

                  {csvPreview && csvPreview.length > 0 && (
                    <div className="mt-4 p-4 border border-gray-700 rounded-lg">
                      <h3 className="text-lg font-semibold mb-2 text-gray-100">Audience Preview (First 4 Rows)</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-600">
                          <thead className="bg-gray-800">
                            <tr>
                              {Object.keys(csvPreview[0]).map((key) => (
                                <th key={key} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 tracking-wider">
                                  {key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-gray-900 divide-y divide-gray-700">
                            {csvPreview.map((row, index) => (
                              <tr key={index}>
                                {Object.values(row).map((value: any, i) => (
                                  <td key={i} className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                    {value}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

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
              {manualHottestShoeTraded && (
                <div className="pl-6">
                  <label className="text-xs text-gray-500">Lookback (days)</label>
                  <Input
                    type="number"
                    value={manualHottestShoeTradedLookback}
                    onChange={(e) => setManualHottestShoeTradedLookback(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-24 h-8 text-sm"
                    placeholder="30"
                  />
                </div>
              )}
              
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
              {manualHottestShoeOffers && (
                <div className="pl-6">
                  <label className="text-xs text-gray-500">Lookback (days)</label>
                  <Input
                    type="number"
                    value={manualHottestShoeOffersLookback}
                    onChange={(e) => setManualHottestShoeOffersLookback(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-24 h-8 text-sm"
                    placeholder="7"
                  />
                </div>
              )}
            </div>
          </div>

          {pushMode === 'now' ? (
            <Button 
              type="button" 
              onClick={handleGenerateManualAudience}
              disabled={audienceLoading || !manualUserIds.trim()}
              className="mb-4"
            >
              {audienceLoading ? 'Generating...' : 'Generate Audience CSV'}
            </Button>
          ) : (
            <div className="flex gap-3 mb-4">
              <Button 
                type="button" 
                onClick={handleSaveManualAudienceCriteria}
                disabled={audienceLoading || !manualUserIds.trim()}
                className="bg-green-600 hover:bg-green-500"
              >
                Save Audience Criteria
              </Button>
              <Button 
                type="button" 
                onClick={handleGenerateManualAudience}
                disabled={audienceLoading || !manualUserIds.trim()}
              >
                {audienceLoading ? 'Generating...' : 'Generate Audience CSV'}
              </Button>
            </div>
          )}
        </div>

        <div className="border-t-2 border-gray-200 pt-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            {pushMode === 'now' ? 'Send Push Notification' : 'Draft Push Notification'}
          </h2>
          
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

          <div className="flex items-center space-x-4">
              {pushMode === 'now' ? (
                <>
                  <Button type="submit" disabled={isLoading} className="flex-1">
                    Blast It!
                  </Button>
                  <Button type="button" onClick={handleDryRun} disabled={isLoading} className="flex-1 bg-gray-600 hover:bg-gray-500">
                    Dry Run
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    type="button" 
                    onClick={handleScheduleClick} 
                    disabled={isLoading} 
                    className="flex-1 bg-blue-600 hover:bg-blue-500"
                  >
                    Schedule It!
                  </Button>
                  <Button type="button" onClick={handleDryRun} disabled={isLoading} className="flex-1 bg-gray-600 hover:bg-gray-500">
                    Dry Run
                  </Button>
                </>
              )}
            </div>
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
                {pushLogs.map((log) => {
                  const statusInfo = getStatusInfo(log);
                  return (
                    <div key={log.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{log.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{log.body}</p>
                          {log.deepLink && (
                            <p 
                              className="text-xs text-blue-600 mt-1 cursor-pointer hover:text-blue-800" 
                              onClick={() => copyToClipboard(log.deepLink)}
                              title={`Click to copy full URL: ${log.deepLink}`}
                            >
                              → {truncateUrl(log.deepLink)}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${statusInfo.className}`}>
                            {statusInfo.text}
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
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'calendar' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Scheduled Push Notifications</h2>
              <div className="flex items-center gap-4">
                <div className="flex border border-gray-300 rounded-lg">
                  <button
                    className={`px-4 py-2 text-sm font-medium ${
                      calendarView === 'monthly' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    } rounded-l-lg border-r border-gray-300`}
                    onClick={() => setCalendarView('monthly')}
                  >
                    Monthly
                  </button>
                  <button
                    className={`px-4 py-2 text-sm font-medium ${
                      calendarView === 'weekly' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    } rounded-r-lg`}
                    onClick={() => setCalendarView('weekly')}
                  >
                    Weekly
                  </button>
                </div>
              </div>
            </div>

            {calendarLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading scheduled pushes...</p>
              </div>
            ) : (
              <div>
                {calendarView === 'monthly' ? (
                  <div className="bg-white border border-gray-200 rounded-lg">
                    {/* Month Navigation */}
                    <div className="flex justify-between items-center p-4 border-b border-gray-200">
                      <button
                        onClick={() => navigateMonth('prev')}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        ←
                      </button>
                      <h3 className="text-lg font-semibold">
                        {currentDate.toLocaleDateString('en-US', { 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </h3>
                      <button
                        onClick={() => navigateMonth('next')}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        →
                      </button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-0">
                      {/* Day Headers */}
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="p-3 text-center text-sm font-medium text-gray-500 border-b border-gray-200">
                          {day}
                        </div>
                      ))}

                      {/* Calendar Days */}
                      {Array.from({ length: getFirstDayOfMonth(currentDate) }, (_, i) => (
                        <div key={`empty-${i}`} className="p-3 h-24 border-b border-r border-gray-200"></div>
                      ))}

                      {Array.from({ length: getDaysInMonth(currentDate) }, (_, i) => {
                        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1);
                        const dayPushes = getPushesForDate(date);
                        const isToday = isSameDay(date, new Date());

                        return (
                          <div 
                            key={i + 1} 
                            className={`p-2 h-24 border-b border-r border-gray-200 ${
                              isToday ? 'bg-blue-50' : ''
                            } hover:bg-gray-50`}
                          >
                            <div className={`text-sm ${isToday ? 'font-bold text-blue-600' : ''}`}>
                              {i + 1}
                            </div>
                            <div className="mt-1 space-y-1">
                              {dayPushes.map(push => {
                                const isSent = push.status === 'sent';
                                return (
                                <div
                                  key={push.id}
                                  onClick={() => handlePushClick(push)}
                                  className={`text-xs px-2 py-1 rounded cursor-pointer truncate ${
                                    isSent 
                                      ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                      : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                  }`}
                                  title={push.title}
                                >
                                  {new Date(push.scheduledFor).toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true
                                  })} - {push.title}
                                </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-lg">
                    {/* Week Navigation */}
                    <div className="flex justify-between items-center p-4 border-b border-gray-200">
                      <button
                        onClick={() => navigateWeek('prev')}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        ←
                      </button>
                      <h3 className="text-lg font-semibold">
                        Week of {formatDate(getWeekDays(currentDate)[0])}
                      </h3>
                      <button
                        onClick={() => navigateWeek('next')}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        →
                      </button>
                    </div>

                    {/* Weekly Grid */}
                    <div className="grid grid-cols-7 gap-0">
                      {getWeekDays(currentDate).map((date, i) => {
                        const dayPushes = getPushesForDate(date);
                        const isToday = isSameDay(date, new Date());

                        return (
                          <div 
                            key={i}
                            className={`p-3 h-32 border-r border-gray-200 ${
                              isToday ? 'bg-blue-50' : ''
                            } hover:bg-gray-50`}
                          >
                            <div className={`text-sm font-medium mb-2 ${
                              isToday ? 'text-blue-600' : ''
                            }`}>
                              {date.toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </div>
                            <div className="space-y-1">
                              {dayPushes.map(push => {
                                const isSent = push.status === 'sent';
                                return (
                                <div
                                  key={push.id}
                                  onClick={() => handlePushClick(push)}
                                  className={`text-xs px-2 py-1 rounded cursor-pointer ${
                                    isSent 
                                      ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                      : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                  }`}
                                  title={push.title}
                                >
                                  <div className="font-medium">
                                    {new Date(push.scheduledFor).toLocaleTimeString('en-US', {
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true
                                    })}
                                  </div>
                                  <div className="truncate">{push.title}</div>
                                </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {scheduledPushes.length === 0 && !calendarLoading && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No scheduled push notifications found.</p>
                    <p className="text-sm text-gray-400 mt-1">Create scheduled pushes from the "Make" tab.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Push Details Modal */}
        {showPushModal && selectedPush && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  {modalTrackingRecord ? 'Push Notification Tracking' : 'Push Draft Details'}
                </h3>
                <button
                  onClick={() => setShowPushModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Tracking Record Display */}
              {modalTrackingRecord ? (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{modalTrackingRecord.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{modalTrackingRecord.body}</p>
                      {modalTrackingRecord.deepLink && (
                        <p 
                          className="text-xs text-blue-600 mt-1 cursor-pointer hover:text-blue-800" 
                          onClick={() => copyToClipboard(modalTrackingRecord.deepLink)}
                          title={`Click to copy full URL: ${modalTrackingRecord.deepLink}`}
                        >
                          → {truncateUrl(modalTrackingRecord.deepLink)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusInfo(modalTrackingRecord).className}`}>
                        {getStatusInfo(modalTrackingRecord).text}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 space-y-1">
                    <p><strong>Audience:</strong> {modalTrackingRecord.audienceDescription} ({modalTrackingRecord.audienceSize} users)</p>
                    {modalTrackingRecord.successCount !== undefined && modalTrackingRecord.totalCount !== undefined && (
                      <p><strong>Delivery:</strong> {modalTrackingRecord.successCount} of {modalTrackingRecord.totalCount} notifications sent</p>
                    )}
                    <p><strong>Sent:</strong> {new Date(modalTrackingRecord.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Audience Criteria (Read-only) */}
              <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
                <h4 className="text-md font-medium text-gray-800 mb-2">Audience Criteria</h4>
                <p className="text-sm text-gray-700">{selectedPush.audienceDescription}</p>
                <div className="text-xs text-gray-500 mt-2">
                  Scheduled for: {new Date(selectedPush.scheduledFor).toLocaleString()}
                </div>
              </div>

              {/* Editable Push Content */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notification Title
                  </label>
                  <Input
                    type="text"
                    value={editingPush?.title || ''}
                    onChange={(e) => setEditingPush((prev: any) => prev ? {...prev, title: e.target.value} : null)}
                    disabled={modalIsLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notification Body
                  </label>
                  <Textarea
                    value={editingPush?.body || ''}
                    onChange={(e) => setEditingPush((prev: any) => prev ? {...prev, body: e.target.value} : null)}
                    disabled={modalIsLoading}
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deep Link URL (Optional)
                  </label>
                  <Input
                    type="url"
                    value={editingPush?.deepLinkUrl || ''}
                    onChange={(e) => setEditingPush((prev: any) => prev ? {...prev, deepLinkUrl: e.target.value} : null)}
                    disabled={modalIsLoading}
                  />
                </div>
              </div>

              {/* Save Changes Button */}
              <div className="mb-6">
                <Button
                  type="button"
                  onClick={handleSavePushChanges}
                  disabled={modalIsLoading}
                  className="w-full"
                >
                  {modalIsLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>

              {/* Modal Response Messages */}
              {modalResponse && (
                <div className={`p-4 rounded-md text-sm mb-6 ${
                  modalResponse.success 
                    ? 'bg-green-50 text-green-800 border border-green-200' 
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  <p className="font-bold">{modalResponse.success ? 'Success!' : 'Error'}</p>
                  <p>{modalResponse.message}</p>
                  {modalResponse.success && modalResponse.jobId && (
                    <div className="mt-2">
                      <p className="text-xs text-green-600">
                        Job ID: {modalResponse.jobId}
                      </p>
                    </div>
                  )}
                  {modalResponse.failedTokens && modalResponse.failedTokens.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-red-600">
                        {modalResponse.failedTokens.length} tokens failed
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Audience Generation Section */}
              <div className="border-t pt-6">
                <h4 className="text-md font-medium text-gray-800 mb-4">Generate Audience & Send</h4>
                
                <Button
                  type="button"
                  onClick={handleGenerateModalAudience}
                  disabled={modalAudienceLoading}
                  className="mb-4"
                >
                  {modalAudienceLoading ? 'Generating...' : 'Generate Audience CSV'}
                </Button>

                <div className="text-sm text-gray-500 mb-4">
                  <p>This will generate the audience based on the saved criteria:</p>
                  <p className="italic">{selectedPush.audienceDescription}</p>
                </div>

                {/* Audience Results */}
                {modalAudienceResponse && (
                  <div className={`p-4 rounded-md text-sm mb-4 ${modalAudienceResponse.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    <p className="font-bold">{modalAudienceResponse.success ? 'Success!' : 'Error'}</p>
                    <p>{modalAudienceResponse.message}</p>
                    {modalAudienceResponse.success && (
                      <>
                        <div className="flex gap-2 mt-3">
                          <Button type="button" onClick={downloadModalCsv} disabled={!modalGeneratedCsv}>
                            Download CSV ({modalAudienceResponse.userCount} users)
                          </Button>
                          <Button type="button" onClick={useModalGeneratedCsv} disabled={!modalGeneratedCsv}>
                            Use for Push
                          </Button>
                        </div>
                        
                        {/* CSV Splitting for A/B Testing */}
                        <div className="mt-4 p-4 bg-blue-50 rounded-md border">
                          <h4 className="font-medium text-blue-900 mb-2">Split for A/B Testing</h4>
                          <div className="flex items-center gap-4 mb-3">
                            <label htmlFor="modal_split_segments" className="block text-sm font-medium text-gray-700">Number of segments (1-20)</label>
                            <Input
                              id="modal_split_segments"
                              type="number"
                              min="1"
                              max="20"
                              value={splitSegments}
                              onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '') {
                                      setSplitSegments('');
                                  } else {
                                      const num = Math.max(1, Math.min(20, Number(val)));
                                      setSplitSegments(num);
                                  }
                              }}
                              placeholder="e.g. 5"
                              className="w-24"
                              disabled={!modalGeneratedCsv || modalAudienceLoading}
                            />
                          </div>
                          
                          <Button 
                            type="button" 
                            onClick={handleSplitAndDownload} 
                            disabled={!modalGeneratedCsv || modalAudienceLoading || !splitSegments}
                            className="mb-3"
                          >
                            {modalAudienceLoading ? 'Generating...' : 'Generate & Download Segments (.zip)'}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Upload User ID CSV Section */}
                <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
                  <h4 className="font-medium text-gray-800 mb-3">Upload User ID CSV</h4>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleModalFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 disabled:opacity-50"
                    disabled={modalIsLoading}
                  />
                  {modalFile && <p className="text-xs text-gray-500 mt-1">Selected: {modalFile.name}</p>}
                </div>

                {/* Send Push Buttons */}
                <div className="flex items-center space-x-4 mt-6">
                  <Button 
                    type="button" 
                    onClick={() => handleModalSendPush(false)} 
                    disabled={modalIsLoading || !modalFile} 
                    className="flex-1"
                  >
                    {modalIsLoading ? 'Sending...' : 'Blast It!'}
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => handleModalSendPush(true)} 
                    disabled={modalIsLoading || !modalFile} 
                    className="flex-1 bg-gray-600 hover:bg-gray-500"
                  >
                    Dry Run
                  </Button>
                </div>
              </div>
                </>
              )}

              {/* Close Button */}
              <div className="mt-6 flex justify-end">
                <Button
                  type="button"
                  onClick={() => setShowPushModal(false)}
                  className="bg-gray-600 hover:bg-gray-500"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Scheduling Modal */}
        {showScheduleModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Schedule Push Notification</h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="schedule_date" className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <Input
                    id="schedule_date"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="schedule_time" className="block text-sm font-medium text-gray-700 mb-1">
                    Time
                  </label>
                  <Input
                    id="schedule_time"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    required
                  />
                </div>

                {savedAudienceCriteria && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm font-medium text-blue-800">Audience:</p>
                    <p className="text-sm text-blue-700">{savedAudienceDescription}</p>
                  </div>
                )}

                <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                  <p className="text-sm font-medium text-gray-800">Notification Preview:</p>
                  <p className="text-sm text-gray-700 mt-1"><strong>{title}</strong></p>
                  <p className="text-sm text-gray-600">{body}</p>
                  {deepLink && (
                    <p className="text-xs text-blue-600 mt-1">→ {deepLink}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3 mt-6">
                <Button
                  type="button"
                  onClick={handleScheduleSubmit}
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-500"
                >
                  {isLoading ? 'Scheduling...' : 'Schedule It!'}
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  disabled={isLoading}
                  className="flex-1 bg-gray-600 hover:bg-gray-500"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
    </div>
    </main>
  );
}
