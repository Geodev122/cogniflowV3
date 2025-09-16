import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';

interface CaseItem {
  id: string;
  case_number?: string | null;
  profiles?: {
    first_name?: string;
    last_name?: string;
  } | null;
}

const Workspace: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();  // logged-in therapist profile (includes id)
  
  // State for cases list, loading status, and error message
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // State for selected case in dropdown (initialize to current route caseId if any)
  const [selectedCaseId, setSelectedCaseId] = useState<string>(caseId || '');
  
  // Placeholder autosave function for unsaved notes
  const autosaveNotes = useCallback(() => {
    console.log('Autosaving notes for case', selectedCaseId || '(none)');
    // In a real app, implement note-saving logic here (e.g., update DB or cache)
  }, [selectedCaseId]);
  
  // Fetch active cases for this therapist on component mount (or when therapist profile is ready)
  useEffect(() => {
    if (!profile?.id) {
      setCases([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    supabase
      .from('cases')
      .select(`
        id,
        case_number,
        profiles:profiles!cases_client_id_fkey (
          first_name,
          last_name
        )
      `)
      .eq('therapist_id', profile.id)    // only cases belonging to this therapist:contentReference[oaicite:5]{index=5}
      .eq('status', 'active')            // only active cases:contentReference[oaicite:6]{index=6}
      .order('created_at', { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          console.error('Failed to fetch cases:', fetchError);
          setCases([]);
          setError('Failed to load cases.');
        } else {
          setCases(data || []);
        }
        setLoading(false);
      });
  }, [profile]);
  
  // Update selectedCaseId if route param changes (e.g., navigated programmatically)
  useEffect(() => {
    setSelectedCaseId(caseId || '');
  }, [caseId]);
  
  // Handle dropdown selection change
  const handleCaseChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newCaseId = event.target.value;
    if (!newCaseId || newCaseId === selectedCaseId) return;
    // If switching from an existing case, autosave current notes
    if (selectedCaseId) {
      autosaveNotes();
    }
    // Update selected case and navigate to the new case's workspace
    setSelectedCaseId(newCaseId);
    navigate(`/therapist/workspace/${newCaseId}`);
  };
  
  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with title and case selector */}
        <header className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Practice Management Workspace</h1>
            {/* Dropdown or status message for case selection */}
            {loading ? (
              <p className="text-sm text-gray-600">Loading cases...</p>
            ) : error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : cases.length === 0 ? (
              <p className="text-sm text-gray-600">No active cases available.</p>
            ) : (
              <select 
                value={selectedCaseId} 
                onChange={handleCaseChange} 
                className="mt-1 text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {/* Default placeholder option */}
                <option value="" disabled>Select a case...</option>
                {cases.map(c => {
                  // Compose display name: use client’s name if available, otherwise case ID
                  const clientName = c.profiles ? 
                    `${c.profiles.first_name ?? ''} ${c.profiles.last_name ?? ''}`.trim() : 
                    '';
                  const caseNumber = c.case_number ?? '';
                  // Option text example: "John Doe – Case 123" or "Case 123" if name missing
                  const optionLabel = clientName 
                    ? (caseNumber ? `${clientName} – Case ${caseNumber}` : clientName)
                    : (caseNumber ? `Case ${caseNumber}` : `Case ${c.id}`);
                  return (
                    <option key={c.id} value={c.id}>
                      {optionLabel}
                    </option>
                  );
                })}
              </select>
            )}
          </div>
          {/* Right-side actions (e.g., open assessments button) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/therapist/assessments')}
              className="px-3 py-2 text-sm rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100"
            >
              Open Assessments
            </button>
          </div>
        </header>
        
        {/* Main workspace content */}
        {!caseId ? (
          <div className="bg-white border border-dashed rounded-xl p-8 text-center text-gray-600">
            <p>Select a case from the dropdown to load its workspace.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {/* ... (case-specific workspace content goes here) ... */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h2 className="font-medium text-gray-900 mb-1">Session Context Bar</h2>
              <p className="text-sm text-gray-500">Stub (will show client, case, goals)</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white border border-gray-200 rounded-xl p-4 lg:col-span-2">
                <h3 className="font-medium text-gray-900 mb-1">Session Progress</h3>
                <p className="text-sm text-gray-500">Stub (timeline)</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <h3 className="font-medium text-gray-900 mb-1">Between Sessions</h3>
                <p className="text-sm text-gray-500">Stub (activities/homework)</p>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="font-medium text-gray-900 mb-1">Session Board</h3>
              <p className="text-sm text-gray-500">Stub (resource drawer + note editor)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Workspace;
