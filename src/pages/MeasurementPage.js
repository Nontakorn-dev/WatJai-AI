import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Alert, ProgressBar, Badge, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import WebSocketService from '../services/WebSocketService';
import ApiService from '../services/ApiService';
import ECGChart from '../components/ECGChart';
import { useECG } from '../context/ECGContext';

const MeasurementPage = () => {
  const navigate = useNavigate();
  const {
    currentLead,
    switchLead,
    saveLeadData,
    lead1Data,
    lead2Data,
    lead3Data,
    saveResults,
    isConnected: contextIsConnected,
    updateConnectionStatus,
    deviceIP
  } = useECG();
  
  // --- Component States ---
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingInterval, setRecordingInterval] = useState(null);
  const [error, setError] = useState('');
  const [lastReceivedData, setLastReceivedData] = useState([]);
  const [leadsConnected, setLeadsConnected] = useState(true);
  const [dataWasSaved, setDataWasSaved] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [ipAddress, setIpAddress] = useState(deviceIP || '');
  const [isConnecting, setIsConnecting] = useState(false);
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  // --- Refs ---
  const dataRef = useRef([]); // To store the full recording
  const MAX_CHART_POINTS = 500; // Number of points to display on the chart
  const maxRecordingTimeSeconds = 10;

  // Process data received from ESP32 WebSocket
  const processReceivedData = useCallback((data) => {
    const lines = data.toString().split('\n');
    
    lines.forEach(line => {
      if (line.trim() === '') return;
      
      console.log("Received WebSocket data:", line);
      
      if (line.startsWith('STATUS:')) {
        const status = line.substring(7);
        if (status === 'MEASURING') {
          setIsMeasuring(true);
        } else if (status === 'READY') {
          setIsMeasuring(false);
        }
      } else if (line.startsWith('DATA:')) {
        // Only process data packets if we are in measuring state
        if (!isMeasuring) return;

        const pointsStr = line.substring(5);
        const newPoints = pointsStr.split(',').map(p => Number(p));

        // Update the data for the chart display (scrolling effect)
        setLastReceivedData(prevData => {
            const updatedData = [...prevData, ...newPoints];
            if (updatedData.length > MAX_CHART_POINTS) {
                return updatedData.slice(updatedData.length - MAX_CHART_POINTS);
            }
            return updatedData;
        });

        // Append to the full recording data
        dataRef.current = [...dataRef.current, ...newPoints];

      } else if (line === 'LEADS:OFF') {
        setLeadsConnected(false);
      } else if (line === 'SIGNAL:DETECTED') {
        setLeadsConnected(true);
      }
    });
  }, [isMeasuring]); // Dependency on isMeasuring is important

  // Setup WebSocket callbacks
  useEffect(() => {
    WebSocketService.onConnectionChanged = (connected) => {
      updateConnectionStatus(connected);
      if (connected) setError('');
    };
    
    WebSocketService.onError = (message) => setError(message);
    WebSocketService.onDataReceived = (data) => processReceivedData(data);
    
    return () => {
      WebSocketService.onConnectionChanged = null;
      WebSocketService.onError = null;
      WebSocketService.onDataReceived = null;
    };
  }, [processReceivedData, updateConnectionStatus]);

  // Save data for the current lead
  const saveCurrentLeadData = useCallback(() => {
    if (dataRef.current.length > 0) {
      const dataToSave = [...dataRef.current];
      saveLeadData(currentLead, dataToSave);
      setDataWasSaved(true);
      console.log(`Saved ${dataToSave.length} data points for Lead ${currentLead}`);
    }
  }, [currentLead, saveLeadData]);
  
  // Start measurement
  const handleStartMeasurement = () => {
    if (!contextIsConnected) {
      setError('Please connect to a device before starting measurement');
      return;
    }
    
    setIsMeasuring(true);
    setRecordingTime(0);
    setDataWasSaved(false);
    dataRef.current = [];
    setLastReceivedData([]); // Clear previous chart data
    
    // Send commands to device
    (async () => {
      try {
        await WebSocketService.sendCommand(`LEAD:${currentLead}`);
        await WebSocketService.sendCommand('START');
      } catch (err) {
        console.error("Error sending command to device:", err);
      }
    })();
    
    // Set up timer for recording time
    const interval = setInterval(() => {
      setRecordingTime((prev) => {
        const newTime = prev + 1;
        if (newTime >= maxRecordingTimeSeconds) {
          clearInterval(interval);
          setRecordingInterval(null);
          handleStopMeasurement(true); // Auto-stop
          return maxRecordingTimeSeconds;
        }
        return newTime;
      });
    }, 1000);
    setRecordingInterval(interval);
  };
  
  // Stop measurement
  const handleStopMeasurement = (isAutoStop = false) => {
    setIsMeasuring(false);
    
    if (recordingInterval) {
      clearInterval(recordingInterval);
      setRecordingInterval(null);
    }
    
    if (contextIsConnected) {
      (async () => {
        await WebSocketService.sendCommand('STOP');
      })();
    }
    
    saveCurrentLeadData();
    
    if (isAutoStop) {
      console.log("Auto-stop triggered: Data saved for current lead");
    }
  };
  
  // Handle navigation to next lead or results page
  const handleNext = async () => {
    if (isMeasuring) {
      setError('Please wait for the measurement to complete or stop it manually');
      return;
    }
    
    if (!dataWasSaved && dataRef.current.length > 0) {
      saveCurrentLeadData();
    }
    
    const currentLeadData = getLeadData(currentLead);
    if (currentLeadData.length === 0) {
      setError(`Please complete a recording for Lead ${getLeadName(currentLead)}`);
      return;
    }
    
    if (currentLead < 3) {
      const nextLead = currentLead + 1;
      switchLead(nextLead);
      navigate(`/electrode-position?lead=${nextLead}`);
    } else {
      if (lead1Data.length > 0) {
        if (contextIsConnected) {
          await WebSocketService.sendCommand('PROCESS');
        }
        setShowProcessingModal(true);
        setProcessingProgress(0);
        
        // Simulate processing time
        const processingInterval = setInterval(() => {
          setProcessingProgress(prev => {
            const newProgress = prev + (100 / 80);
            if (newProgress >= 100) {
              clearInterval(processingInterval);
              setTimeout(async () => {
                try {
                  const requestData = {
                    signal_lead1: lead1Data,
                    signal_lead2: lead2Data.length > 0 ? lead2Data : null,
                    signal_lead3: lead3Data.length > 0 ? lead3Data : null,
                    sampling_rate: 500 // Adjust based on your ESP32 sampling rate
                  };
                  const results = await ApiService.analyzeECG(requestData);
                  saveResults(results);
                  setShowProcessingModal(false);
                  navigate('/results');
                } catch (err) {
                  setShowProcessingModal(false);
                  setError(`Analysis failed: ${err.message}`);
                }
              }, 500);
              return 100;
            }
            return newProgress;
          });
        }, 100);
      } else {
        setError('Please measure Lead I first');
      }
    }
  };

  // Helper functions
  const getLeadData = (leadNumber) => {
    switch (leadNumber) {
      case 1: return lead1Data;
      case 2: return lead2Data;
      case 3: return lead3Data;
      default: return [];
    }
  };
  
  const getLeadName = (leadNumber) => {
    return leadNumber === 1 ? 'I' : leadNumber === 2 ? 'II' : 'III';
  };
  
  const canProceedToNext = () => !isMeasuring && getLeadData(currentLead).length > 0;
  
  const progressPercentage = (recordingTime / maxRecordingTimeSeconds) * 100;

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (recordingInterval) clearInterval(recordingInterval);
    };
  }, [recordingInterval]);

  // --- JSX & Rendering ---
  return (
    <div className="mobile-measurement-page">
      {/* Header Section */}
      <div className="status-header">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <Badge bg={contextIsConnected ? "success" : "danger"} className="me-2 px-3 py-2 fs-6">
            <span className="connection-icon me-2">●</span>
            <span className="fw-bold">{contextIsConnected ? "Connected" : "Disconnected"}</span>
          </Badge>
          {!contextIsConnected && (
            <Button variant="outline-primary" size="sm" onClick={() => setShowConnectModal(true)} className="rounded-pill">
              Connect
            </Button>
          )}
        </div>
        
        <div className="recording-status">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div className="fw-bold fs-5">
              Recording Lead {getLeadName(currentLead)}
              {isMeasuring && <span className="recording-pulse ms-2"></span>}
            </div>
            <div className="text-dark fs-6">{recordingTime}s / {maxRecordingTimeSeconds}s</div>
          </div>
          <ProgressBar variant={isMeasuring ? "danger" : "success"} now={progressPercentage} className="mb-3" animated={isMeasuring} />
          <Button
            variant={isMeasuring ? "danger" : "success"}
            className="w-100 rounded-pill py-3 fs-5 fw-bold"
            onClick={isMeasuring ? handleStopMeasurement : handleStartMeasurement}
            disabled={!contextIsConnected}
          >
            {isMeasuring ? 'Stop Recording' : (getLeadData(currentLead).length > 0 ? `Record Lead ${getLeadName(currentLead)} Again` : `Record Lead ${getLeadName(currentLead)}`)}
          </Button>
        </div>
      </div>

      {/* ECG Monitor Section */}
      <div className="ecg-section">
        <div className="section-header">
          <span className="heart-icon text-danger me-2">♥</span>
          <h4 className="mb-0 fw-bold">ECG Monitor</h4>
        </div>
        <div className="section-content">
          {[1, 2, 3].map(leadNumber => {
            const isCurrentRecording = currentLead === leadNumber && isMeasuring;
            const savedData = getLeadData(leadNumber);
            const dataToShow = isCurrentRecording ? lastReceivedData : (savedData.length > 0 ? savedData.slice(0, 500) : []);

            return (
              <div key={leadNumber} className={`lead-container mb-4 ${isCurrentRecording ? 'active-lead' : ''}`}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="mb-0">
                    Lead {getLeadName(leadNumber)}
                    {isCurrentRecording && <Badge bg="danger" pill className="ms-2">Recording</Badge>}
                  </h6>
                  <div className="text-dark fs-6">
                    {savedData.length > 0 ? <strong>{savedData.length} samples</strong> : <span className="text-warning fw-bold">No data recorded</span>}
                  </div>
                </div>
                <div className="ecg-chart-container">
                  {dataToShow.length > 0 ? (
                    <ECGChart data={dataToShow} label={`Lead ${getLeadName(leadNumber)}`} color={leadNumber === 1 ? '#ff6384' : (leadNumber === 2 ? '#36a2eb' : '#4bc0c0')} />
                  ) : (
                    <div className="empty-chart">
                      <span className="text-dark">
                        {isCurrentRecording ? "Waiting for data..." : `No data for Lead ${getLeadName(leadNumber)}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Instructions & Next Button */}
      <div className="bottom-section">
        <p className="instruction-text mb-4 py-3 bg-light rounded text-center fs-5 fw-bold">
          Please remain still and breathe normally during recording
        </p>
        <Button variant="primary" size="lg" className="next-button rounded-pill w-100 py-3 fs-5 fw-bold" onClick={handleNext} disabled={!canProceedToNext()}>
          {currentLead < 3 ? `Next Lead` : `View Results`} →
        </Button>
        {!contextIsConnected && (
          <div className="mt-3 text-danger text-center">
            <small>Please connect to a device to start measurement</small>
          </div>
        )}
      </div>

      {/* Modals and Alerts */}
      {/* (Your existing modal and alert JSX can remain here unchanged) */}
      
      {/* Your existing <style jsx> can also remain here */}
    </div>
  );
};

export default MeasurementPage;