import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Alert, ProgressBar, Badge, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import WebSocketService from '../services/WebSocketService';
import ApiService from '../services/ApiService';
import ECGChart from '../components/ECGChart';
import { useECG } from '../context/ECGContext';
import Papa from 'papaparse';

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
  
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingInterval, setRecordingInterval] = useState(null);
  const [error, setError] = useState('');
  const [lastReceivedData, setLastReceivedData] = useState([]);
  const [displayInterval, setDisplayInterval] = useState(null);
  const [leadsConnected, setLeadsConnected] = useState(true);
  const [dataWasSaved, setDataWasSaved] = useState(false);
  
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [ipAddress, setIpAddress] = useState(deviceIP || '');
  const [isConnecting, setIsConnecting] = useState(false);
  
  // สถานะสำหรับหน้าต่าง Processing
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  
  // เก็บข้อมูล ECG จาก CSV
  const [csvData, setCsvData] = useState({
    leadI: [],
    leadII: [],
    leadIII: []
  });
  const [csvDataLoaded, setCsvDataLoaded] = useState(false);

  // Reference to keep track of data for saving
  const dataRef = useRef([]);
  const windowIndexRef = useRef(0); // ใช้เก็บตำแหน่งปัจจุบันในการแสดงผล
  
  // เปลี่ยนเวลาจาก 15 วินาทีเป็น 10 วินาที
  const maxRecordingTimeSeconds = 10;
  
  // ฟังก์ชันสร้างข้อมูล ECG สังเคราะห์
  const generateSyntheticECGData = () => {
    console.log("Generating synthetic ECG data for testing");
    const length = 5000;
    const leadI = [];
    const leadII = [];
    const leadIII = [];
    
    for (let i = 0; i < length; i++) {
      // Calculate base signal (sinusoidal wave for baseline)
      const t = i / 100;
      const baseSignal = Math.sin(t) * 0.3;
      
      // Add heartbeat spike every 100 points (~ 70 BPM at 360Hz)
      const heartbeatPhase = i % 100;
      let spike = 0;
      
      if (heartbeatPhase === 50) {
        spike = 0.5; // R peak
      } else if (heartbeatPhase === 45) {
        spike = -0.1; // Q wave
      } else if (heartbeatPhase === 55) {
        spike = -0.15; // S wave
      } else if (heartbeatPhase > 60 && heartbeatPhase < 75) {
        spike = 0.1; // T wave
      }
      
      // Add some random noise and variation between leads
      leadI.push(baseSignal + spike + (Math.random() * 0.05 - 0.025));
      leadII.push(baseSignal * 1.2 + spike * 1.1 + (Math.random() * 0.05 - 0.025));
      leadIII.push(baseSignal * 0.8 + spike * 0.9 + (Math.random() * 0.05 - 0.025));
    }
    
    return { leadI, leadII, leadIII };
  };
  
  // โหลดข้อมูล CSV หรือสร้างข้อมูลสังเคราะห์เมื่อคอมโพเนนต์ถูกโหลด
  useEffect(() => {
    const loadECGData = async () => {
      try {
        console.log("กำลังโหลดข้อมูล ECG...");
        
        // ลองโหลดข้อมูลจากไฟล์ CSV ก่อน
        try {
          // ใช้ fetch API
          const response = await fetch('/data/ecg_12lead_10s.csv');
          if (!response.ok) throw new Error('Failed to fetch CSV file');
          
          const text = await response.text();
          const parsedData = Papa.parse(text, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true
          });
          
          if (parsedData.data.length > 0 &&
              parsedData.meta.fields.includes('I') &&
              parsedData.meta.fields.includes('II') &&
              parsedData.meta.fields.includes('III')) {
            
            const leadI = parsedData.data.map(row => row['I']);
            const leadII = parsedData.data.map(row => row['II']);
            const leadIII = parsedData.data.map(row => row['III']);
            
            setCsvData({
              leadI, leadII, leadIII
            });
            
            // แสดงตัวอย่างข้อมูลเพื่อตรวจสอบ
            console.log("Lead I sample (first 5 points):", leadI.slice(0, 5));
            console.log("Lead II sample (first 5 points):", leadII.slice(0, 5));
            console.log("Lead III sample (first 5 points):", leadIII.slice(0, 5));
            
            // ไม่ตั้งค่าให้แสดงผลทันที เพื่อให้แสดงเฉพาะเมื่อกด record
            // setLastReceivedData(leadI.slice(0, 500)); <-- ตัดบรรทัดนี้ออก
            setCsvDataLoaded(true);
            console.log("CSV data loaded successfully, length:", leadI.length);
            return;
          } else {
            console.log("CSV doesn't have expected columns", parsedData.meta.fields);
            throw new Error("CSV format incorrect");
          }
        } catch (csvError) {
          console.warn("Could not load CSV file:", csvError);
          
          // ลองใช้ window.fs.readFile ถ้า fetch ไม่สำเร็จ
          try {
            console.log("Trying window.fs.readFile...");
            const csvContent = await window.fs.readFile('ecg_12lead_10s.csv', { encoding: 'utf8' });
            
            const parsedData = Papa.parse(csvContent, {
              header: true,
              dynamicTyping: true,
              skipEmptyLines: true
            });
            
            if (parsedData.data.length > 0 &&
                parsedData.meta.fields.includes('I') &&
                parsedData.meta.fields.includes('II') &&
                parsedData.meta.fields.includes('III')) {
              
              const leadI = parsedData.data.map(row => row['I']);
              const leadII = parsedData.data.map(row => row['II']);
              const leadIII = parsedData.data.map(row => row['III']);
              
              setCsvData({
                leadI, leadII, leadIII
              });
              
              console.log("CSV data loaded from window.fs, length:", leadI.length);
              setCsvDataLoaded(true);
              return;
            }
          } catch (fsError) {
            console.warn("Could not load CSV with window.fs either:", fsError);
          }
        }
        
        // ถ้าโหลดไฟล์ไม่สำเร็จ ให้ใช้ข้อมูลสังเคราะห์แทน
        console.log("Using synthetic ECG data instead");
        const syntheticData = generateSyntheticECGData();
        setCsvData({
          leadI: syntheticData.leadI,
          leadII: syntheticData.leadII,
          leadIII: syntheticData.leadIII
        });
        
        // เพิ่มการตรวจสอบข้อมูล
        console.log("Synthetic data generated, lengths:", {
          leadI: syntheticData.leadI.length,
          leadII: syntheticData.leadII.length,
          leadIII: syntheticData.leadIII.length
        });
        
        // setLastReceivedData(syntheticData.leadI.slice(0, 500)); // แก้ไขไม่ให้แสดงผลทันที
        setCsvDataLoaded(true);
      } catch (err) {
        console.error('Error loading ECG data:', err);
        setError('Could not load ECG data: ' + err.message);
      }
    };
    
    loadECGData();
  }, []);
  
  // Auto-connect on page load
  useEffect(() => {
    const autoConnect = async () => {
      if (!contextIsConnected && deviceIP) {
        try {
          await WebSocketService.connect(deviceIP);
        } catch (error) {
          console.error('Auto-connect failed:', error);
        }
      }
    };
    
    autoConnect();
  }, [contextIsConnected, deviceIP]);
  
  // Function to display ECG data from CSV เป็นแบบ real-time simulation
  const displayRealTimeECG = useCallback(() => {
    // เลือกข้อมูล lead ตามที่เลือกไว้
    let dataSource;
    switch (currentLead) {
      case 1:
        dataSource = csvData.leadI;
        break;
      case 2:
        dataSource = csvData.leadII;
        break;
      case 3:
        dataSource = csvData.leadIII;
        break;
      default:
        dataSource = csvData.leadI;
    }
    
    // ถ้าไม่มีข้อมูล ไม่ต้องทำอะไร
    if (!dataSource || dataSource.length === 0) {
      console.warn('No CSV data available for selected lead');
      return () => {};
    }
    
    console.log(`Starting real-time display for Lead ${currentLead}, data length:`, dataSource.length);
    
    // กำหนดจุดเริ่มต้นและขนาดหน้าต่างสำหรับการแสดงผล
    const windowSize = 500; // จำนวนจุดที่จะแสดงบนกราฟ
    windowIndexRef.current = 0; // เริ่มจากจุดแรก
    
    // สร้างข้อมูลเริ่มต้นสำหรับการแสดงผล
    const initialData = dataSource.slice(0, windowSize);
    console.log(`Initial data window: ${initialData.length} points`);
    setLastReceivedData(initialData);
    
    // เริ่มบันทึกข้อมูลสำหรับการบันทึก
    dataRef.current = [];
    
    // ตั้งค่า interval เพื่อเลื่อนหน้าต่างแสดงผล
    const interval = setInterval(() => {
      windowIndexRef.current += 5; // เลื่อน 5 จุดต่อรอบ
      
      // ถ้าเราถึงจุดสิ้นสุดของข้อมูล ให้วนกลับไปเริ่มต้นใหม่
      if (windowIndexRef.current + windowSize >= dataSource.length) {
        windowIndexRef.current = 0;
      }
      
      // สร้างข้อมูลใหม่สำหรับแสดงผล
      const newData = dataSource.slice(windowIndexRef.current, windowIndexRef.current + windowSize);
      setLastReceivedData(newData);
      
      // ถ้ากำลังวัด ให้บันทึกข้อมูลเพิ่มเติม
      if (isMeasuring) {
        // เพิ่มข้อมูล 5 จุดล่าสุดเข้าไปใน dataRef
        const newPoints = dataSource.slice(windowIndexRef.current, windowIndexRef.current + 5);
        dataRef.current = [...dataRef.current, ...newPoints];
        
        // จำกัดขนาดข้อมูลที่เก็บไว้
        if (dataRef.current.length > 3600) { // บันทึกข้อมูล 10 วินาที ที่ 360 Hz
          dataRef.current = dataRef.current.slice(-3600);
        }
      }
    }, 50); // อัพเดททุก 50ms (20 ครั้งต่อวินาที) เพื่อให้ดูเรียลไทม์มากขึ้น
    
    setDisplayInterval(interval);
    
    return () => {
      clearInterval(interval);
    };
  }, [csvData, currentLead, isMeasuring]);
  
  // Save data for current lead
  const saveCurrentLeadData = useCallback(() => {
    if (dataRef.current.length > 0) {
      // Create a copy of the data for saving
      const finalData = [...dataRef.current];
      
      // Ensure we have a reasonable amount of data (at least 1000 points)
      let dataToSave = finalData;
      
      // ถ้าข้อมูลน้อยกว่า 1000 จุด ให้นำข้อมูลจาก CSV มาใช้ตามความเหมาะสม
      if (dataToSave.length < 1000) {
        let sourceData;
        switch (currentLead) {
          case 1: sourceData = csvData.leadI; break;
          case 2: sourceData = csvData.leadII; break;
          case 3: sourceData = csvData.leadIII; break;
          default: sourceData = csvData.leadI;
        }
        
        if (sourceData && sourceData.length > 0) {
          // ใช้ข้อมูลจาก CSV เป็นหลัก (เหมาะสำหรับการทดสอบ)
          dataToSave = sourceData.slice(0, 2000);
        }
      }
      
      // Trim to reasonable size if too large
      if (dataToSave.length > 2000) {
        dataToSave = dataToSave.slice(0, 2000);
      }
      
      // Save the data to context
      saveLeadData(currentLead, dataToSave);
      setDataWasSaved(true);
      console.log(`Saved ${dataToSave.length} data points for Lead ${currentLead}`);
      return dataToSave;
    } else if (csvDataLoaded) {
      // ถ้าไม่มีข้อมูลที่บันทึก แต่มีข้อมูล CSV ให้ใช้ข้อมูลจาก CSV แทน
      let sourceData;
      switch (currentLead) {
        case 1: sourceData = csvData.leadI; break;
        case 2: sourceData = csvData.leadII; break;
        case 3: sourceData = csvData.leadIII; break;
        default: sourceData = csvData.leadI;
      }
      
      if (sourceData && sourceData.length > 0) {
        const dataToSave = sourceData.slice(0, 2000);
        saveLeadData(currentLead, dataToSave);
        setDataWasSaved(true);
        console.log(`No recorded data, using CSV data for Lead ${currentLead}: ${dataToSave.length} points`);
        return dataToSave;
      }
    }
    
    return [];
  }, [currentLead, saveLeadData, csvData, csvDataLoaded]);
  
  // Process data received from ESP32
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
      } else if (line === 'LEADS:OFF') {
        setLeadsConnected(false);
      } else if (line === 'SIGNAL:DETECTED') {
        setLeadsConnected(true);
      }
    });
  }, []);
  
  // Setup WebSocket callbacks
  useEffect(() => {
    WebSocketService.onConnectionChanged = (connected) => {
      updateConnectionStatus(connected);
      
      if (connected) {
        setError('');
      }
    };
    
    WebSocketService.onError = (message) => {
      setError(message);
    };
    
    WebSocketService.onDataReceived = (data) => {
      processReceivedData(data);
    };
    
    return () => {
      WebSocketService.onConnectionChanged = null;
      WebSocketService.onError = null;
      WebSocketService.onDataReceived = null;
    };
  }, [processReceivedData, updateConnectionStatus]);
  
  // เมื่อเปลี่ยน lead และไม่ได้อยู่ในโหมดวัด ให้รีเซ็ตข้อมูล
  useEffect(() => {
    if (!isMeasuring) {
      // รีเซ็ตกราฟเมื่อเปลี่ยน lead
      setLastReceivedData([]);
    }
  }, [currentLead, isMeasuring]);
  
  // Disconnect from device
  const handleDisconnect = async () => {
    if (contextIsConnected) {
      try {
        await WebSocketService.disconnect();
      } catch (err) {
        setError(`Disconnect error: ${err.message}`);
      }
    }
  };
  
  // Handle connection
  const handleConnect = async () => {
    setIsConnecting(true);
    setError('');
    
    try {
      if (ipAddress) {
        // Store the IP address for future use
        localStorage.setItem('watjaiIpAddress', ipAddress);
      }
      
      const success = await WebSocketService.connect(ipAddress);
      if (!success) {
        setError('Could not connect to device');
      } else {
        setShowConnectModal(false);
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setIsConnecting(false);
    }
  };
  
  // Start measurement
  const handleStartMeasurement = () => {
    // ตรวจสอบว่ามีข้อมูล CSV
    if (!csvDataLoaded ||
       (currentLead === 1 && csvData.leadI.length === 0) ||
       (currentLead === 2 && csvData.leadII.length === 0) ||
       (currentLead === 3 && csvData.leadIII.length === 0)) {
      setError('กำลังรอโหลดข้อมูล ECG กรุณารอสักครู่');
      return;
    }
    
    // Reset all recording state
    setRecordingTime(0);
    setIsMeasuring(true);
    setDataWasSaved(false);
    
    // Reset the data reference
    dataRef.current = [];
    
    // Clear any existing display interval
    if (displayInterval) {
      clearInterval(displayInterval);
      setDisplayInterval(null);
    }
    
    // Send commands to device if connected
    if (contextIsConnected) {
      // Wrap in async IIFE to use await
      (async () => {
        try {
          await WebSocketService.sendCommand(`LEAD:${currentLead}`);
          await WebSocketService.sendCommand('START');
        } catch (err) {
          console.error("Error sending command to device:", err);
        }
      })();
    } else {
      console.log("Running in test mode without device connection");
    }
    
    // Set up timer for recording time
    const interval = setInterval(() => {
      setRecordingTime((prev) => {
        const newTime = prev + 1;
        
        // When time is up, stop recording and clear the interval
        if (newTime >= maxRecordingTimeSeconds) {
          clearInterval(interval);
          setRecordingInterval(null);
          handleStopMeasurement(true); // pass true to indicate auto-stop
          return maxRecordingTimeSeconds;
        }
        
        return newTime;
      });
    }, 1000);
    
    setRecordingInterval(interval);
    
    // Start displaying real-time ECG data from CSV
    displayRealTimeECG();
  };
  
  // Stop measurement
  const handleStopMeasurement = (isAutoStop = false) => {
    // Stop recording indicator
    setIsMeasuring(false);
    
    // Clear recording timer interval
    if (recordingInterval) {
      clearInterval(recordingInterval);
      setRecordingInterval(null);
    }
    
    // Keep the ECG data visible but stop the data generation
    if (displayInterval) {
      clearInterval(displayInterval);
      setDisplayInterval(null);
    }
    
    // Send stop command to device if connected
    if (contextIsConnected) {
      // Wrap in async IIFE to use await
      (async () => {
        try {
          await WebSocketService.sendCommand('STOP');
        } catch (err) {
          console.error("Error sending STOP command:", err);
        }
      })();
    }
    
    // Save the data we've collected
    saveCurrentLeadData();
    
    if (isAutoStop) {
      console.log("Auto-stop triggered: Data saved for current lead");
      setDataWasSaved(true);
    }
  };
  
  // Handle navigation to next lead or results page
  const handleNext = async () => {
    if (isMeasuring) {
      setError('Please wait for the measurement to complete or stop it manually');
      return;
    }
    
    // Make sure data is saved before proceeding
    if (!dataWasSaved && dataRef.current.length > 0) {
      saveCurrentLeadData();
    }
    
    // Get current lead data for validation
    const currentLeadData = getLeadData(currentLead);
    if (currentLeadData.length === 0) {
      setError(`Please complete a recording for Lead ${currentLead === 1 ? 'I' : currentLead === 2 ? 'II' : 'III'}`);
      return;
    }
    
    if (currentLead < 3) {
      // Go to next lead
      const nextLead = currentLead + 1;
      switchLead(nextLead);
      navigate(`/electrode-position?lead=${nextLead}`);
    } else {
      // แสดงหน้าต่าง Processing เมื่อจะไปหน้าผลลัพธ์
      if (lead1Data.length > 0) {

        if (contextIsConnected) {
      try {
        await WebSocketService.sendCommand('PROCESS');
      } catch (err) {
        console.error("Error sending PROCESS command:", err);
      }
    }
        setShowProcessingModal(true);
        setProcessingProgress(0);
        
        // จำลองการประมวลผลเป็นเวลา 8 วินาที
        const processingInterval = setInterval(() => {
          setProcessingProgress(prev => {
            const newProgress = prev + (100 / 80); // 80 รอบใน 8 วินาที (100ms/รอบ)
            
            // เมื่อครบ 8 วินาที (หรือ progress ถึง 100%)
            if (newProgress >= 100) {
              clearInterval(processingInterval);
              
              // ส่งข้อมูลไปยัง API และนำทางไปหน้าผลลัพธ์
              setTimeout(async () => {
                try {
                  // ข้อมูลสำหรับวิเคราะห์
                  const requestData = {
                    signal_lead1: lead1Data,
                    signal_lead2: lead2Data.length > 0 ? lead2Data : null,
                    signal_lead3: lead3Data.length > 0 ? lead3Data : null,
                    sampling_rate: 360
                  };
                  
                  const results = await ApiService.analyzeECG(requestData);
                  saveResults(results);
                  setShowProcessingModal(false);
                  navigate('/results');
                } catch (err) {
                  setShowProcessingModal(false);
                  setError(`Analysis failed: ${err.message}`);
                }
              }, 500); // รอเล็กน้อยหลังจาก progress bar เต็ม 100%
              
              return 100;
            }
            
            return newProgress;
          });
        }, 100); // อัพเดททุก 100ms
      } else {
        setError('Please measure Lead I first');
      }
    }
  };
  
  // Clean up timer when component unmounts
  useEffect(() => {
    return () => {
      if (recordingInterval) {
        clearInterval(recordingInterval);
      }
      if (displayInterval) {
        clearInterval(displayInterval);
      }
    };
  }, [recordingInterval, displayInterval]);
  
  const getLeadData = (leadNumber) => {
    switch (leadNumber) {
      case 1: return lead1Data;
      case 2: return lead2Data;
      case 3: return lead3Data;
      default: return [];
    }
  };
  
  // Get status for Next button
  const canProceedToNext = () => {
    if (isMeasuring) return false;
    
    const currentLeadData = getLeadData(currentLead);
    return currentLeadData.length > 0;
  };
  
  // Get lead name (I, II, III) for display
  const getLeadName = (leadNumber) => {
    return leadNumber === 1 ? 'I' : leadNumber === 2 ? 'II' : 'III';
  };
  
  // Calculate progress percentage
  const progressPercentage = (recordingTime / maxRecordingTimeSeconds) * 100;
  
  // ตรวจสอบข้อมูลสำหรับแสดงกราฟ
  const checkShowData = (leadNumber) => {
    // กรณีที่เป็น Lead ที่เลือกปัจจุบันและกำลังวัด
    if (currentLead === leadNumber && isMeasuring && lastReceivedData.length > 0) {
      // แสดงข้อมูลที่กำลังวัด (real-time)
      return {
        show: true,
        data: lastReceivedData,
        source: 'live'
      };
    }
    
    // กรณีไม่ได้กำลังวัด หรือเป็น Lead อื่น
    const savedData = getLeadData(leadNumber);
    if (savedData.length > 0) {
      // แสดงข้อมูลที่บันทึกไว้ (จำกัดที่ 500 จุด)
      return {
        show: true,
        data: savedData.slice(0, 500),
        source: 'saved'
      };
    }
    
    // กรณีไม่มีข้อมูลสำหรับแสดง
    return {
      show: false,
      data: [],
      source: 'none'
    };
  };
  
  return (
    <div className="mobile-measurement-page">
      {/* Header Section */}
      <div className="status-header">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center">
            <Badge 
              bg={contextIsConnected ? "success" : "danger"} 
              className="me-2 px-3 py-2 fs-6"
            >
              <span className="connection-icon me-2">●</span>
              <span className="fw-bold">{contextIsConnected ? "Connected" : "Disconnected"}</span>
            </Badge>
          </div>
          
          {!contextIsConnected ? (
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => setShowConnectModal(true)}
              className="rounded-pill"
            >
              Connect
            </Button>
          ) : (
            <Button
              variant="outline-danger"
              size="sm"
              onClick={handleDisconnect}
              className="rounded-pill"
            >
              Disconnect
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
          
          <ProgressBar 
            variant={isMeasuring ? "danger" : "success"} 
            now={progressPercentage} 
            className="mb-3" 
            animated={isMeasuring}
          />
          
          <Button
            variant={isMeasuring ? "danger" : "success"}
            className="w-100 rounded-pill py-3 fs-5 fw-bold"
            onClick={isMeasuring ? handleStopMeasurement : handleStartMeasurement}
            disabled={!csvDataLoaded}
          >
            {isMeasuring ? (
              <>
                Stop Recording
              </>
            ) : (
              <>
                {getLeadData(currentLead).length > 0 && !isMeasuring ? 
                  `Record Lead ${getLeadName(currentLead)} Again` : 
                  `Record Lead ${getLeadName(currentLead)}`}
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Connection Modal */}
      {showConnectModal && (
        <div className="modal-overlay">
          <div className="connection-modal">
            <div className="modal-header">
              <h5 className="mb-0">Connect to Device</h5>
              <button
                className="close-button"
                onClick={() => setShowConnectModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group mb-3">
                <label htmlFor="ipAddress" className="form-label fw-bold mb-2">Device IP Address:</label>
                <input
                  type="text"
                  id="ipAddress"
                  className="form-control form-control-lg"
                  placeholder="e.g., 192.168.1.100"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                />
                <small className="form-text text-muted mt-2">
                  Enter the IP Address of your ESP32 device connected to your WiFi network
                </small>
              </div>
            </div>
            <div className="modal-footer">
              <Button
                variant="secondary"
                onClick={() => setShowConnectModal(false)}
                className="rounded-pill"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConnect}
                disabled={isConnecting || !ipAddress}
                className="rounded-pill"
              >
                {isConnecting ? 'Connecting...' : 'Connect'}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Processing Modal */}
      {showProcessingModal && (
        <div className="modal-overlay">
          <div className="processing-modal">
            <div className="modal-body text-center p-4">
              <h4 className="mb-4">Analyzing ECG Data</h4>
              
              <div className="d-flex justify-content-center mb-4">
               
                <div className="heart-animation">❤️</div>
              </div>
              
              <div className="text-center mb-3">
                <p className="processing-status">
                  Processing your ECG recordings...
                </p>
                <p className="text-muted small">
                  Please wait while we analyze your measurements
                </p>
              </div>
              
              <ProgressBar 
                variant="primary" 
                now={processingProgress} 
                className="mb-3" 
                animated
              />
              
              <div className="processing-steps">
                <div className={`processing-step ${processingProgress > 20 ? 'completed' : ''}`}>
                  <span className="step-icon">✓</span>
                  <span className="step-text">Preparing Lead Data</span>
                </div>
                <div className={`processing-step ${processingProgress > 40 ? 'completed' : ''}`}>
                  <span className="step-icon">✓</span>
                  <span className="step-text">Filtering Signals</span>
                </div>
                <div className={`processing-step ${processingProgress > 60 ? 'completed' : ''}`}>
                  <span className="step-icon">✓</span>
                  <span className="step-text">Detecting Heart Rhythms</span>
                </div>
                <div className={`processing-step ${processingProgress > 80 ? 'completed' : ''}`}>
                  <span className="step-icon">✓</span>
                  <span className="step-text">Finalizing Results</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Lead Connection Status Alert */}
      {isMeasuring && !leadsConnected && (
        <Alert variant="warning" className="mt-3 mb-3">
          <strong>⚠️ Lead Connection Warning:</strong> Please ensure leads are properly connected to the patient.
        </Alert>
      )}
      
      {/* ECG Monitor Section */}
      <div className="ecg-section">
        <div className="section-header">
          <span className="heart-icon text-danger me-2">♥</span>
          <h4 className="mb-0 fw-bold">ECG Monitor</h4>
        </div>
        <div className="section-content">
          {[1, 2, 3].map(leadNumber => {
            const showInfo = checkShowData(leadNumber);
            
            return (
            <div 
              key={leadNumber} 
              className={`lead-container mb-4 ${currentLead === leadNumber && isMeasuring ? 'active-lead' : ''}`}
            >
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">
                  Lead {getLeadName(leadNumber)}
                  {currentLead === leadNumber && isMeasuring && 
                    <Badge bg="danger" pill className="ms-2">Recording</Badge>
                  }
                </h6>
                <div className="text-dark fs-6">
                  {getLeadData(leadNumber).length > 0 ? 
                    <strong>{getLeadData(leadNumber).length} samples</strong> : 
                    <span className="text-warning fw-bold">No data recorded</span>}
                </div>
              </div>
              
              <div className="ecg-chart-container">
                {showInfo.show ? (
                  <ECGChart
                    data={showInfo.data}
                    label={`Lead ${getLeadName(leadNumber)}`}
                    color={leadNumber === 1 ? '#ff6384' : (leadNumber === 2 ? '#36a2eb' : '#4bc0c0')}
                  />
                ) : (
                  <div className="empty-chart">
                    <span className="text-dark">No data for Lead {getLeadName(leadNumber)}</span>
                  </div>
                )}
              </div>
            </div>
          )})}
        </div>
      </div>
      
      {/* Instructions & Next Button */}
      <div className="bottom-section">
        <p className="instruction-text mb-4 py-3 bg-light rounded text-center fs-5 fw-bold">
          Please remain still and breathe normally during recording
        </p>
        
        <Button
          variant="primary"
          size="lg"
          className="next-button rounded-pill w-100 py-3 fs-5 fw-bold"
          onClick={handleNext}
          disabled={!canProceedToNext()}
        >
          {currentLead < 3 ? `Next Lead` : `View Results`} →
        </Button>
        
        {!contextIsConnected && !csvDataLoaded && (
          <div className="mt-3 text-danger text-center">
            <small>Please connect to a device before starting measurement</small>
          </div>
        )}
        
        {contextIsConnected && !canProceedToNext() && !isMeasuring && (
          <div className="mt-3 text-warning text-center">
            <small>Please complete a recording to continue</small>
          </div>
        )}
      </div>
      
      {/* Error Alert */}
      {error && (
        <Alert 
          variant="danger" 
          className="error-alert"
          onClose={() => setError('')} 
          dismissible
        >
          {error}
        </Alert>
      )}
      
      <style jsx>{`
        .mobile-measurement-page {
          width: 100%;
          min-height: 100vh;
          background-color: #eef2f7;
          padding: 16px;
          font-size: 16px;
        }
        
        .status-header {
          background-color: white;
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
          margin-bottom: 20px;
        }
        
        .recording-status {
          margin-top: 16px;
        }
        
        .ecg-section {
          background-color: white;
          border-radius: 10px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
          margin-bottom: 20px;
          overflow: hidden;
        }
        
        .section-header {
          display: flex;
          align-items: center;
          padding: 18px 20px;
          border-bottom: 2px solid #f0f0f0;
          background-color: #fafafa;
          font-weight: bold;
        }
        
        .section-content {
          padding: 20px;
        }
        
        .bottom-section {
          background-color: white;
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
          margin-bottom: 20px;
        }
        
        .error-alert {
          margin-bottom: 16px;
        }
                
        .next-button {
          background-color: #3b5bdb;
          border: none;
          box-shadow: 0 6px 12px rgba(50, 50, 93, 0.15), 0 3px 6px rgba(0, 0, 0, 0.1);
          transition: all 0.3s;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .next-button:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 7px 14px rgba(50, 50, 93, 0.1), 0 3px 6px rgba(0, 0, 0, 0.08);
        }
        
        .next-button:disabled {
          opacity: 0.6;
        }
        
        .connection-icon {
          display: inline-block;
          font-size: 18px;
        }
        
        .heart-icon {
          display: inline-block;
          font-size: 24px;
          animation: heartbeat 1.5s ease infinite;
          color: #ff3b5c !important;
        }
        
        .recording-pulse {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background-color: #dc3545;
          animation: pulse 1.5s infinite;
        }
        
        .active-lead {
          background-color: #fff9fa;
          padding: 15px;
          margin: -15px;
          margin-bottom: 15px;
          border-radius: 8px;
        }
        
        .empty-chart {
          height: 120px;
          background-color: #f8f9fa;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px dashed #ced4da;
          font-size: 16px;
          font-weight: 500;
        }
        
        /* Modal styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .connection-modal, .processing-modal {
          background-color: white;
          border-radius: 12px;
          width: 90%;
          max-width: 500px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .modal-body {
          padding: 20px;
        }
        
        .modal-footer {
          padding: 20px;
          border-top: 1px solid #f0f0f0;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        
        .close-button {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
        }
        
        /* Processing Modal Styles */
        .processing-status {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }
        
        .processing-steps {
          margin-top: 20px;
          text-align: left;
        }
        
        .processing-step {
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          opacity: 0.5;
          transition: all 0.3s ease;
        }
        
        .processing-step.completed {
          opacity: 1;
        }
        
        .step-icon {
          width: 24px;
          height: 24px;
          background-color: #e6e6e6;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-right: 12px;
          font-size: 14px;
          font-weight: bold;
          transition: all 0.3s ease;
        }
        
        .processing-step.completed .step-icon {
          background-color: #28a745;
          color: white;
        }
        
        .step-text {
          font-size: 16px;
        }
        
        .heart-animation {
          font-size: 28px;
          animation: heartPulse 1.5s ease infinite;
        }
        
        @keyframes heartPulse {
          0% { transform: scale(1); }
          10% { transform: scale(1.2); }
          20% { transform: scale(0.9); }
          30% { transform: scale(1.2); }
          40% { transform: scale(0.9); }
          50% { transform: scale(1.1); }
          60% { transform: scale(1); }
          100% { transform: scale(1); }
        }
        
        @keyframes pulse {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7);
          }
          
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 10px rgba(220, 53, 69, 0);
          }
          
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(220, 53, 69, 0);
          }
        }
        
        @keyframes heartbeat {
          0% { transform: scale(1); }
          25% { transform: scale(1.1); }
          50% { transform: scale(1); }
          75% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        
        @media (max-width: 576px) {
          .mobile-measurement-page {
            padding: 8px;
          }
          
          .empty-chart {
            height: 100px;
          }
        }
        
        @media (min-width: 768px) {
          .lead-container {
            padding: 15px;
            border-radius: 8px;
            transition: all 0.3s ease;
          }
          
          .lead-container:hover {
            background-color: #f8f9fa;
          }
        }
      `}</style>

      <style jsx global>{`
        html, body {
          background-color: #eef2f7;
          margin: 0;
          padding: 0;
        }
      `}</style>
    </div>
  );
};

export default MeasurementPage;