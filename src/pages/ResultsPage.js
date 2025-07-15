import React, { useEffect, useState } from 'react';
import { Container, Button, Alert, Badge, Row, Col, Tabs, Tab } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useECG } from '../context/ECGContext';
import ECGChart from '../components/ECGChart';
import Papa from 'papaparse';

const ResultsPage = () => {
  const navigate = useNavigate();
  // แก้ไขโดยดึงเฉพาะข้อมูลที่จำเป็น ไม่ดึง setter functions
  const { 
    results, 
    measurementHistory, 
    lead1Data: contextLead1Data, 
    lead2Data: contextLead2Data,
    lead3Data: contextLead3Data 
  } = useECG();

  // State สำหรับเก็บข้อมูลทั้ง 12 leads
  const [allLeads, setAllLeads] = useState({
    I: [],
    II: [],
    III: [],
    aVR: [],
    aVL: [],
    aVF: [],
    V1: [],
    V2: [],
    V3: [],
    V4: [],
    V5: [],
    V6: []
  });

  // State สำหรับแท็บที่แสดงอยู่
  const [activeTab, setActiveTab] = useState('all');
  
  // ฟังก์ชันตัวช่วยสำหรับสร้างข้อมูล ECG ตัวอย่างหาก CSV ไม่สามารถโหลดได้
  const generateSampleECGData = () => {
    const sampleLeads = {
      I: [],
      II: [],
      III: [],
      aVR: [],
      aVL: [],
      aVF: [],
      V1: [],
      V2: [],
      V3: [],
      V4: [],
      V5: [],
      V6: []
    };
    
    // สร้างคลื่นไซน์ตัวอย่างสำหรับแต่ละ lead
    const generateSineWave = (amplitude, frequency, phaseShift, length) => {
      const data = [];
      for (let i = 0; i < length; i++) {
        data.push(amplitude * Math.sin(frequency * i + phaseShift));
      }
      return data;
    };
    
    // สร้างรูปแบบตัวอย่างที่แตกต่างกันสำหรับแต่ละ lead
    sampleLeads.I = generateSineWave(50, 0.05, 0, 400);
    sampleLeads.II = generateSineWave(80, 0.05, 0.5, 400);
    sampleLeads.III = generateSineWave(30, 0.05, 1, 400);
    sampleLeads.aVR = generateSineWave(40, 0.05, 1.5, 400);
    sampleLeads.aVL = generateSineWave(35, 0.05, 2, 400);
    sampleLeads.aVF = generateSineWave(55, 0.05, 2.5, 400);
    sampleLeads.V1 = generateSineWave(60, 0.05, 3, 400);
    sampleLeads.V2 = generateSineWave(65, 0.05, 3.5, 400);
    sampleLeads.V3 = generateSineWave(70, 0.05, 4, 400);
    sampleLeads.V4 = generateSineWave(75, 0.05, 4.5, 400);
    sampleLeads.V5 = generateSineWave(70, 0.05, 5, 400);
    sampleLeads.V6 = generateSineWave(65, 0.05, 5.5, 400);
    
    return sampleLeads;
  };
  
  // โหลดข้อมูล ECG จาก CSV
  useEffect(() => {
    const loadECGData = async () => {
      try {
        // อ่านไฟล์ CSV
        const fileContent = await window.fs.readFile('ecg_data.csv', { encoding: 'utf8' });
        
        // แปลงข้อมูล CSV
        Papa.parse(fileContent, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.data && results.data.length > 0) {
              // ดึงหัวคอลัมน์
              const headers = results.meta.fields;
              
              // เตรียมอาร์เรย์สำหรับแต่ละ lead
              const leads = {
                I: [],
                II: [],
                III: [],
                aVR: [],
                aVL: [],
                aVF: [],
                V1: [],
                V2: [],
                V3: [],
                V4: [],
                V5: [],
                V6: []
              };
              
              // เติมข้อมูลสำหรับแต่ละ lead
              results.data.forEach(row => {
                // ตรวจสอบว่าหัวคอลัมน์มีอยู่หรือไม่และเพิ่มข้อมูล
                if (row.I !== undefined) leads.I.push(row.I);
                if (row.II !== undefined) leads.II.push(row.II);
                if (row.III !== undefined) leads.III.push(row.III);
                if (row.aVR !== undefined) leads.aVR.push(row.aVR);
                if (row.aVL !== undefined) leads.aVL.push(row.aVL);
                if (row.aVF !== undefined) leads.aVF.push(row.aVF);
                if (row.V1 !== undefined) leads.V1.push(row.V1);
                if (row.V2 !== undefined) leads.V2.push(row.V2);
                if (row.V3 !== undefined) leads.V3.push(row.V3);
                if (row.V4 !== undefined) leads.V4.push(row.V4);
                if (row.V5 !== undefined) leads.V5.push(row.V5);
                if (row.V6 !== undefined) leads.V6.push(row.V6);
              });
              
              // อัปเดต state ด้วย leads ทั้งหมด
              setAllLeads(leads);
              
              console.log('โหลดข้อมูล ECG จาก CSV สำเร็จ');
            } else {
              console.error('ไม่พบข้อมูลในไฟล์ CSV');
              // ใช้ข้อมูลจาก context หรือข้อมูลตัวอย่าง
              handleFallbackData();
            }
          },
          error: (error) => {
            console.error('เกิดข้อผิดพลาดในการแปลง CSV:', error);
            handleFallbackData();
          }
        });
      } catch (error) {
        console.error('เกิดข้อผิดพลาดในการอ่านไฟล์ข้อมูล ECG:', error);
        
        // ใช้ข้อมูลจาก context หรือข้อมูลตัวอย่าง
        handleFallbackData();
      }
    };

    // ฟังก์ชันจัดการกับข้อมูลสำรอง - ไม่ใช่ React Hook แล้ว
    const handleFallbackData = () => {
      if (contextLead1Data?.length > 0 || contextLead2Data?.length > 0 || contextLead3Data?.length > 0) {
        // ถ้ามีข้อมูลจาก context ให้ใช้ข้อมูลนั้น
        const leadsFromContext = {
          I: contextLead1Data || [],
          II: contextLead2Data || [],
          III: contextLead3Data || [],
          aVR: [],
          aVL: [],
          aVF: [],
          V1: [],
          V2: [],
          V3: [],
          V4: [],
          V5: [],
          V6: []
        };

        // คำนวณ derived leads ถ้ามีข้อมูลพื้นฐานครบทั้ง 3 leads
        if (leadsFromContext.I.length > 0 && leadsFromContext.II.length > 0 && leadsFromContext.III.length > 0) {
          // ใช้ขนาดที่น้อยที่สุดเพื่อหลีกเลี่ยงข้อผิดพลาดดัชนี
          const minLength = Math.min(leadsFromContext.I.length, leadsFromContext.II.length, leadsFromContext.III.length);
          
          // คำนวณสำหรับแต่ละจุดข้อมูล
          for (let i = 0; i < minLength; i++) {
            // Goldberger's Equations for augmented leads
            // aVR = -(I + II)/2
            leadsFromContext.aVR.push(-(leadsFromContext.I[i] + leadsFromContext.II[i]) / 2);
            
            // aVL = I - II/2
            leadsFromContext.aVL.push(leadsFromContext.I[i] - leadsFromContext.II[i] / 2);
            
            // aVF = II - I/2
            leadsFromContext.aVF.push(leadsFromContext.II[i] - leadsFromContext.I[i] / 2);
            
            // คำนวณแบบประมาณค่าสำหรับ leads V1-V6
            leadsFromContext.V1.push(-0.4 * leadsFromContext.I[i] - 0.2 * leadsFromContext.II[i] + 0.1 * leadsFromContext.III[i] + 40);
            leadsFromContext.V2.push(-0.3 * leadsFromContext.I[i] - 0.05 * leadsFromContext.II[i] + 0.5 * leadsFromContext.III[i] + 30);
            leadsFromContext.V3.push(-0.2 * leadsFromContext.I[i] + 0.1 * leadsFromContext.II[i] + 0.7 * leadsFromContext.III[i] + 20);
            leadsFromContext.V4.push(-0.1 * leadsFromContext.I[i] + 0.25 * leadsFromContext.II[i] + 0.8 * leadsFromContext.III[i] + 10);
            leadsFromContext.V5.push(0.1 * leadsFromContext.I[i] + 0.5 * leadsFromContext.II[i] + 0.6 * leadsFromContext.III[i]);
            leadsFromContext.V6.push(0.3 * leadsFromContext.I[i] + 0.6 * leadsFromContext.II[i] + 0.2 * leadsFromContext.III[i] - 10);
          }
        }
        
        setAllLeads(leadsFromContext);
        console.log('ใช้ข้อมูลจาก context เนื่องจากไม่สามารถโหลด CSV ได้');
      } else {
        // หากไม่มีข้อมูลใน context ให้ใช้ข้อมูลตัวอย่าง
        const sampleData = generateSampleECGData();
        setAllLeads(sampleData);
        console.log('ใช้ข้อมูลตัวอย่างเนื่องจากไม่มีข้อมูลจาก CSV หรือ context');
      }
    };
    
    loadECGData();
  }, [contextLead1Data, contextLead2Data, contextLead3Data]);

  // ถ้าไม่มีผลการวิเคราะห์ แสดงแจ้งเตือน
  if (!results) {
    return (
      <Container>
        <Alert variant="warning">
          <Alert.Heading>ไม่มีผลการวิเคราะห์</Alert.Heading>
          <p>กรุณาวัดและวิเคราะห์ ECG</p>
          <hr />
          <div className="d-flex justify-content-between">
            <Link to="/electrode-position">
              <Button variant="primary">ไปที่การวัด ECG</Button>
            </Link>
            
            {measurementHistory.length > 0 && (
              <Link to="/history">
                <Button variant="secondary">ดูประวัติการวัด</Button>
              </Link>
            )}
          </div>
        </Alert>
      </Container>
    );
  }
  
  // รับระดับความเสี่ยงหรือให้ค่าเริ่มต้น
  const riskLevel = results.risk_level || 
    (results.prediction === 'Normal' || results.prediction === 'Normal Sinus Rhythm' ? 
      (results.confidence > 80 ? 'Low Risk' : results.confidence > 50 ? 'Medium Risk' : 'High Risk') 
      : 'High Risk');

  // การกำหนดค่าสำหรับการแสดงผล lead
  const leadConfigurations = {
    standard: [
      { data: allLeads.I, label: 'I', color: '#000000' },
      { data: allLeads.II, label: 'II', color: '#000000' },
      { data: allLeads.III, label: 'III', color: '#000000' }
    ],
    augmented: [
      { data: allLeads.aVR, label: 'aVR', color: '#0066cc' },
      { data: allLeads.aVL, label: 'aVL', color: '#0066cc' },
      { data: allLeads.aVF, label: 'aVF', color: '#0066cc' }
    ],
    precordial: [
      { data: allLeads.V1, label: 'V1', color: '#009933' },
      { data: allLeads.V2, label: 'V2', color: '#009933' },
      { data: allLeads.V3, label: 'V3', color: '#009933' },
      { data: allLeads.V4, label: 'V4', color: '#009933' },
      { data: allLeads.V5, label: 'V5', color: '#009933' },
      { data: allLeads.V6, label: 'V6', color: '#009933' }
    ],
    all: [
      { data: allLeads.I, label: 'I', color: '#000000' },
      { data: allLeads.II, label: 'II', color: '#000000' },
      { data: allLeads.III, label: 'III', color: '#000000' },
      { data: allLeads.aVR, label: 'aVR', color: '#0066cc' },
      { data: allLeads.aVL, label: 'aVL', color: '#0066cc' },
      { data: allLeads.aVF, label: 'aVF', color: '#0066cc' },
      { data: allLeads.V1, label: 'V1', color: '#009933' },
      { data: allLeads.V2, label: 'V2', color: '#009933' },
      { data: allLeads.V3, label: 'V3', color: '#009933' },
      { data: allLeads.V4, label: 'V4', color: '#009933' },
      { data: allLeads.V5, label: 'V5', color: '#009933' },
      { data: allLeads.V6, label: 'V6', color: '#009933' }
    ]
  };

  // ตรวจสอบว่าผลลัพธ์เป็นปกติหรือไม่
  const isNormalRhythm = results.prediction === 'Normal' || 
                        results.prediction === 'Normal Sinus Rhythm' || 
                        results.prediction?.toLowerCase().includes('normal');

  // ฟังก์ชันสำหรับการสร้าง PDF และดาวน์โหลด
  // แก้ไขฟังก์ชันสำหรับสร้าง PDF
const generatePDF = () => {
  try {
    // สร้างหน้าต่างใหม่สำหรับเนื้อหา PDF
    const pdfWindow = window.open('', '_blank', 'height=800,width=800');
    
    if (!pdfWindow) {
      alert('โปรดอนุญาตให้เปิดหน้าต่างป๊อปอัพเพื่อสร้าง PDF');
      return;
    }
    
    // สร้าง HTML สำหรับ PDF
    pdfWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>รายงานผลการวิเคราะห์ ECG - WatJai</title>
          <style>
            body {
              font-family: 'Sarabun', 'THSarabunNew', Arial, sans-serif;
              margin: 0;
              padding: 20px;
              background-color: white;
              color: #333;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #e0e0e0;
              padding-bottom: 10px;
            }
            .header h1 {
              font-size: 24px;
              margin-bottom: 5px;
            }
            .header p {
              color: #666;
              margin-top: 0;
            }
            .section {
              margin-bottom: 20px;
              page-break-inside: avoid;
            }
            .section-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 10px;
              border-bottom: 1px solid #ddd;
              padding-bottom: 5px;
            }
            .result-item {
              margin-bottom: 8px;
            }
            .label {
              font-weight: bold;
              display: inline-block;
              width: 140px;
            }
            .ecg-container {
              margin: 15px 0;
              border: 1px solid #ddd;
              background-color: #f9f9f9;
              padding: 10px;
            }
            .leads-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin-top: 15px;
            }
            .lead-item {
              border: 1px solid #ddd;
              padding: 5px;
              background-color: #fff;
            }
            .lead-title {
              font-weight: bold;
              margin-bottom: 5px;
              text-align: center;
            }
            .recommendations {
              background-color: #f0f7ff;
              padding: 15px;
              border-radius: 5px;
            }
            .recommendations ul {
              margin-top: 10px;
              padding-left: 25px;
            }
            .recommendations li {
              margin-bottom: 8px;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 12px;
              color: #666;
              border-top: 1px solid #ddd;
              padding-top: 10px;
            }
            .buttons {
              display: flex;
              justify-content: center;
              gap: 10px;
              margin: 20px 0;
            }
            .btn {
              padding: 10px 20px;
              background-color: #4285f4;
              color: white;
              border: none;
              border-radius: 5px;
              cursor: pointer;
              font-size: 14px;
            }
            .btn-secondary {
              background-color: #757575;
            }
            
            @media print {
              .no-print {
                display: none;
              }
              body {
                padding: 0;
                margin: 0;
              }
              .container {
                width: 100%;
                max-width: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>รายงานผลการวิเคราะห์คลื่นไฟฟ้าหัวใจ</h1>
              <p>วันที่ออกรายงาน: ${new Date().toLocaleDateString()}</p>
            </div>
            
            <div class="section">
              <div class="section-title">ข้อมูลการตรวจ</div>
              <div class="result-item">
                <span class="label">รหัสการตรวจ:</span>
                <span>WJ-${Date.now().toString().slice(-6)}</span>
              </div>
              <div class="result-item">
                <span class="label">วันที่ตรวจ:</span>
                <span>${new Date().toLocaleDateString()}</span>
              </div>
              <div class="result-item">
                <span class="label">เวลา:</span>
                <span>${new Date().toLocaleTimeString()}</span>
              </div>
            </div>
            
            <div class="section">
              <div class="section-title">ผลการวิเคราะห์</div>
              <div class="result-item">
                <span class="label">การวินิจฉัย:</span>
                <span>${results.prediction || 'Normal Sinus Rhythm'}</span>
              </div>
              <div class="result-item">
                <span class="label">ความมั่นใจในผล:</span>
                <span>${results.confidence ? results.confidence.toFixed(1) : 95}%</span>
              </div>
              <div class="result-item">
                <span class="label">ระดับความเสี่ยง:</span>
                <span>${riskLevel}</span>
              </div>
            </div>
            
            <div class="section">
              <div class="section-title">กราฟคลื่นไฟฟ้าหัวใจ Lead I</div>
              <div class="ecg-container">
                <canvas id="ecg-lead1" width="700" height="200"></canvas>
              </div>
            </div>
            
            <div class="section">
              <div class="section-title">12-Lead ECG</div>
              <div class="leads-grid">
                <div class="lead-item">
                  <div class="lead-title">Lead II</div>
                  <canvas id="ecg-lead2" width="320" height="150"></canvas>
                </div>
                <div class="lead-item">
                  <div class="lead-title">Lead III</div>
                  <canvas id="ecg-lead3" width="320" height="150"></canvas>
                </div>
                <div class="lead-item">
                  <div class="lead-title">aVR</div>
                  <canvas id="ecg-avr" width="320" height="150"></canvas>
                </div>
                <div class="lead-item">
                  <div class="lead-title">aVL</div>
                  <canvas id="ecg-avl" width="320" height="150"></canvas>
                </div>
                <div class="lead-item">
                  <div class="lead-title">aVF</div>
                  <canvas id="ecg-avf" width="320" height="150"></canvas>
                </div>
                <div class="lead-item">
                  <div class="lead-title">V1</div>
                  <canvas id="ecg-v1" width="320" height="150"></canvas>
                </div>
              </div>
            </div>
            
            <div class="section">
              <div class="section-title">คำแนะนำ</div>
              <div class="recommendations">
                ${isNormalRhythm ?
                  `<p>จากผลการตรวจวิเคราะห์ คลื่นไฟฟ้าหัวใจของคุณอยู่ในเกณฑ์ปกติ แต่เพื่อสุขภาพหัวใจที่ดีอย่างต่อเนื่อง ควรปฏิบัติดังนี้</p>
                  <ul>
                    <li>ควรตรวจสุขภาพประจำปีอย่างสม่ำเสมอ</li>
                    <li>รักษาน้ำหนักให้เหมาะสม</li>
                    <li>ออกกำลังกายสม่ำเสมออย่างน้อยสัปดาห์ละ 150 นาที</li>
                    <li>รับประทานอาหารที่มีประโยชน์ ลดอาหารที่มีไขมันและโซเดียมสูง</li>
                    <li>หลีกเลี่ยงการสูบบุหรี่และการดื่มแอลกอฮอล์เกินขนาด</li>
                    <li>ฝึกการจัดการความเครียด</li>
                  </ul>` :
                  `<p>จากผลการตรวจวิเคราะห์ พบความผิดปกติในคลื่นไฟฟ้าหัวใจ ควรปฏิบัติดังนี้</p>
                  <ul>
                    <li>ควรปรึกษาแพทย์เพื่อประเมินอาการเพิ่มเติม</li>
                    <li>ทำการตรวจวินิจฉัยเพิ่มเติมตามที่แพทย์แนะนำ</li>
                    <li>ติดตามการเปลี่ยนแปลงของอาการอย่างสม่ำเสมอ</li>
                    <li>ใช้ยาตามที่แพทย์สั่งอย่างเคร่งครัด</li>
                    <li>หลีกเลี่ยงการออกกำลังกายหนักจนกว่าจะได้รับการประเมินจากแพทย์</li>
                  </ul>`
                }
              </div>
            </div>
            
            <div class="footer">
              <p>รายงานนี้เป็นการวิเคราะห์ด้วยระบบอัตโนมัติ ควรได้รับการตรวจสอบโดยแพทย์ผู้เชี่ยวชาญ</p>
              <p>© WatJai ECG Analysis Platform</p>
            </div>
            
            <div class="buttons no-print">
              <button class="btn" onclick="window.print()">พิมพ์รายงาน</button>
              <button class="btn btn-secondary" onclick="window.close()">ปิด</button>
            </div>
          </div>
          
          <script>
            // ฟังก์ชันช่วยสำหรับหาค่า min-max
            function findMinMax(data) {
              if (!data || data.length === 0) return { min: -1, max: 1 };
              
              let min = Number.MAX_VALUE;
              let max = Number.MIN_VALUE;
              
              for (let i = 0; i < data.length; i++) {
                const value = data[i];
                if (value !== null && value !== undefined && !isNaN(value)) {
                  min = Math.min(min, value);
                  max = Math.max(max, value);
                }
              }
              
              // หากค่าที่ได้ไม่สมเหตุสมผล ให้ใช้ค่าเริ่มต้น
              if (min === Number.MAX_VALUE || max === Number.MIN_VALUE || min === max) {
                return { min: -1, max: 1 };
              }
              
              // เพิ่มขอบเขตให้กราฟมีพื้นที่ว่างบนและล่าง
              const padding = (max - min) * 0.2;
              return { 
                min: min - padding, 
                max: max + padding
              };
            }
            
            // ฟังก์ชันวาดกราฟที่ปรับปรุงแล้ว
            function drawECG(canvasId, data, color = '#000000') {
              console.log("Drawing " + canvasId + " with " + (data ? data.length : 0) + " points");
              
              const canvas = document.getElementById(canvasId);
              if (!canvas) {
                console.error("Canvas element not found: " + canvasId);
                return;
              }
              
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                console.error("Cannot get 2D context for canvas: " + canvasId);
                return;
              }
              
              // ล้างแคนวาส
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              
              // วาดพื้นหลัง
              ctx.fillStyle = '#f9f9f9';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              
              // วาดเส้นกริด
              ctx.beginPath();
              ctx.strokeStyle = 'rgba(255, 0, 0, 0.1)';
              ctx.lineWidth = 0.5;
              
              // เส้นแนวตั้ง
              for (let x = 0; x <= canvas.width; x += 20) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
              }
              
              // เส้นแนวนอน
              for (let y = 0; y <= canvas.height; y += 20) {
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
              }
              
              ctx.stroke();
              
              // วาดเส้นแนวกลาง (baseline)
              ctx.beginPath();
              ctx.strokeStyle = '#999999';
              ctx.lineWidth = 1;
              ctx.moveTo(0, canvas.height / 2);
              ctx.lineTo(canvas.width, canvas.height / 2);
              ctx.stroke();
              
              // ตรวจสอบข้อมูล
              if (!data || data.length === 0) {
                ctx.font = '14px Arial';
                ctx.fillStyle = '#666666';
                ctx.textAlign = 'center';
                ctx.fillText('ไม่มีข้อมูล ECG', canvas.width / 2, canvas.height / 2);
                return;
              }
              
              // หาค่าสูงสุดและต่ำสุดของข้อมูล
              const { min, max } = findMinMax(data);
              console.log(canvasId + " min: " + min + ", max: " + max);
              
              // วาดเส้น ECG
              ctx.beginPath();
              ctx.strokeStyle = color;
              ctx.lineWidth = 1.5;
              
              // กำหนดจำนวนข้อมูลที่จะวาด
              const dataLength = Math.min(data.length, canvas.width * 2);
              
              // คำนวณ scale
              const xScale = canvas.width / dataLength;
              const yRange = Math.max(Math.abs(max - min), 0.1); // ป้องกันการหารด้วย 0
              const yScale = (canvas.height * 0.8) / yRange;
              const yOffset = canvas.height / 2;
              
              // จุดแรก
              let firstValue = data[0];
              if (firstValue !== null && firstValue !== undefined && !isNaN(firstValue)) {
                const y = yOffset - (firstValue - ((max + min) / 2)) * yScale;
                ctx.moveTo(0, y);
              } else {
                ctx.moveTo(0, yOffset);
              }
              
              // วาดเส้นแบบดัชนีถี่ขึ้น
              for (let i = 1; i < dataLength; i++) {
                const value = data[i];
                if (value !== null && value !== undefined && !isNaN(value)) {
                  const x = i * xScale;
                  const y = yOffset - (value - ((max + min) / 2)) * yScale;
                  ctx.lineTo(x, y);
                }
              }
              
              ctx.stroke();
              
              // เพิ่มข้อความเพื่อตรวจสอบ
              ctx.font = '10px Arial';
              ctx.fillStyle = '#999999';
              ctx.textAlign = 'left';
              ctx.fillText("Points: " + data.length, 5, 10);
            }
            
            // วาดกราฟ ECG เมื่อโหลดหน้าเสร็จ
            window.onload = function() {
              console.log("Window loaded, rendering ECG charts...");
              
              // แปลงข้อมูลให้เป็นตัวเลขและกรองค่าที่ไม่ใช่ตัวเลขออก
              function prepareData(data) {
                if (!data || !Array.isArray(data)) return [];
                return data.map(val => typeof val === 'number' ? val : parseFloat(val))
                          .filter(val => !isNaN(val));
              }
              
              // ประมวลผลข้อมูล ECG
              const lead1Data = prepareData(${JSON.stringify(allLeads.I || [])});
              const lead2Data = prepareData(${JSON.stringify(allLeads.II || [])});
              const lead3Data = prepareData(${JSON.stringify(allLeads.III || [])});
              const avrData = prepareData(${JSON.stringify(allLeads.aVR || [])});
              const avlData = prepareData(${JSON.stringify(allLeads.aVL || [])});
              const avfData = prepareData(${JSON.stringify(allLeads.aVF || [])});
              const v1Data = prepareData(${JSON.stringify(allLeads.V1 || [])});
              
              console.log("Data lengths: I=" + lead1Data.length + ", II=" + lead2Data.length + ", III=" + lead3Data.length);
              
              // เพิ่มการหน่วงเวลาเล็กน้อยเพื่อให้แน่ใจว่า Canvas พร้อมใช้งาน
              setTimeout(() => {
                // วาด ECG ทั้งหมด
                drawECG('ecg-lead1', lead1Data, '#000000');
                drawECG('ecg-lead2', lead2Data, '#000000');
                drawECG('ecg-lead3', lead3Data, '#000000');
                drawECG('ecg-avr', avrData, '#0066cc');
                drawECG('ecg-avl', avlData, '#0066cc');
                drawECG('ecg-avf', avfData, '#0066cc');
                drawECG('ecg-v1', v1Data, '#009933');
                console.log("All ECG charts rendered");
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    
    pdfWindow.document.close();
    
    // รอเวลาสักครู่ให้หน้าโหลดเสร็จก่อนแสดง
    setTimeout(() => {
      pdfWindow.focus();
    }, 1000);
    
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการสร้าง PDF:', error);
    alert('เกิดข้อผิดพลาดในการสร้าง PDF กรุณาลองใหม่อีกครั้ง');
  }
};

  // ฟังก์ชันสำหรับการพิมพ์โดยตรง
  const handlePrint = () => {
    try {
      // เริ่มกระบวนการพิมพ์โดยตรง
      window.print();
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการพิมพ์:', error);
      alert('เกิดข้อผิดพลาดในการพิมพ์ กรุณาลองใหม่อีกครั้ง');
    }
  };

  return (
    <div className="results-page">
      
      <Container className="mt-3">
        <h1 className="result-title">Result ECG</h1>
        
        {/* 12-Lead ECG Display with Tabs */}
        <div className="ecg-grid-card">
          <Tabs
            id="ecg-tabs"
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="mb-3 ecg-tabs"
          >
            <Tab eventKey="standard" title="Standard">
              <div className="ecg-grid standard-leads-grid">
                {leadConfigurations.standard.map((lead, index) => (
                  <div key={index} className="ecg-lead-container">
                    <div className="lead-label">{lead.label}</div>
                    <ECGChart 
                      data={lead.data.slice(0, 400)} 
                      label={`Lead ${lead.label}`} 
                      color={lead.color}
                      height={100}
                    />
                  </div>
                ))}
              </div>
            </Tab>
            <Tab eventKey="augmented" title="Augmented">
              <div className="ecg-grid augmented-leads-grid">
                {leadConfigurations.augmented.map((lead, index) => (
                  <div key={index} className="ecg-lead-container">
                    <div className="lead-label">{lead.label}</div>
                    <ECGChart 
                      data={lead.data.slice(0, 400)} 
                      label={`Lead ${lead.label}`} 
                      color={lead.color}
                      height={100}
                    />
                  </div>
                ))}
              </div>
            </Tab>
            <Tab eventKey="precordial" title="Precordial">
              <div className="ecg-grid precordial-leads-grid">
                {leadConfigurations.precordial.map((lead, index) => (
                  <div key={index} className="ecg-lead-container">
                    <div className="lead-label">{lead.label}</div>
                    <ECGChart 
                      data={lead.data.slice(0, 400)} 
                      label={`Lead ${lead.label}`} 
                      color={lead.color}
                      height={80}
                    />
                  </div>
                ))}
              </div>
            </Tab>
            <Tab eventKey="all" title="All 12 Leads">
              <div className="ecg-grid ecg-grid-all">
                {leadConfigurations.all.map((lead, index) => (
                  <div key={index} className="ecg-lead-container ecg-lead-small">
                    <div className="lead-label">{lead.label}</div>
                    <ECGChart 
                      data={lead.data.slice(0, 400)} 
                      label={`Lead ${lead.label}`} 
                      color={lead.color}
                      height={70}
                    />
                  </div>
                ))}
              </div>
            </Tab>
          </Tabs>
          
        </div>
        
        {/* Enhanced Prediction Display with Confidence */}
        <div className="prediction-card">
          <div className="prediction-header">
            <h2 className="prediction-title">{results.prediction}</h2>
            <div className="prediction-subtitle">Rhythm</div>
          </div>
          
          <div className="confidence-section">
            <div className="confidence-label">
              <span>ความมั่นใจในการวิเคราะห์:</span>
              <span className="confidence-value">{results.confidence?.toFixed(1) || "95.0"}%</span>
            </div>
            <div className="confidence-bar">
              <div 
                className="confidence-fill" 
                style={{ width: `${results.confidence || 95}%` }}
              ></div>
            </div>
          </div>

          <div className="signal-section">
            <div className={`signal-badge ${isNormalRhythm ? 'normal' : 'abnormal'}`}>
              {isNormalRhythm ? 'สัญญาณปกติ' : 'สัญญาณผิดปกติ'}
            </div>
          </div>

          {isNormalRhythm && (
            <div className="recommendation-section">
              <h3 className="recommendation-title">คำแนะนำ</h3>
              <div className="recommendation-content">
                <p>จากผลการตรวจวิเคราะห์ คลื่นไฟฟ้าหัวใจของคุณอยู่ในเกณฑ์ปกติ แต่เพื่อสุขภาพหัวใจที่ดีอย่างต่อเนื่อง ควรปฏิบัติดังนี้</p>
                <ul>
                  <li>ควรตรวจสุขภาพประจำปีอย่างสม่ำเสมอ</li>
                  <li>รักษาน้ำหนักให้เหมาะสม</li>
                  <li>ออกกำลังกายสม่ำเสมออย่างน้อยสัปดาห์ละ 150 นาที</li>
                  <li>รับประทานอาหารที่มีประโยชน์ ลดอาหารที่มีไขมันและโซเดียมสูง</li>
                  <li>หลีกเลี่ยงการสูบบุหรี่และการดื่มแอลกอฮอล์เกินขนาด</li>
                  <li>ฝึกการจัดการความเครียด</li>
                </ul>
              </div>
            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        <Row className="mb-4">
          <Col xs={12}>
            <Button 
              variant="primary" 
              size="lg" 
              className="action-button"
              onClick={() => alert('Sent to Telecardiology')}
            >
              Send to Telecardiology
            </Button>
          </Col>
        </Row>
        
        <div className="reports-count">Reports left: 6</div>
        
        <div className="action-buttons-secondary">
          <Button 
            variant="light" 
            className="secondary-button"
            onClick={generatePDF}
          >
            <span className="icon">📄</span> PDF
          </Button>
          <Button 
            variant="light" 
            className="secondary-button"
            onClick={handlePrint}
          >
            <span className="icon">🖨️</span> Print
          </Button>
        </div>
        
        <Button 
          variant="outline-danger" 
          className="delete-button mb-4"
          onClick={() => navigate('/measure')}
        >
          <span className="icon">🗑️</span> Delete exam
        </Button>
        
      </Container>
      
      <style jsx>{`
        .ecg-tabs {
          display: flex;
          width: 100%;
          overflow-x: auto;
          flex-wrap: nowrap;
          margin-bottom: 20px;
          border-bottom: 1px solid #dee2e6;
          padding-bottom: 1px;
          -webkit-overflow-scrolling: touch;
        }
        
        .ecg-tabs .nav-item {
          flex: 1;
          min-width: auto;
          text-align: center;
          white-space: nowrap;
        }
        
        .ecg-tabs .nav-link {
          padding: 12px 15px;
          font-weight: 600;
          color: #555;
          border-radius: 8px 8px 0 0;
          transition: all 0.2s ease;
          margin-right: 2px;
          border: none;
          position: relative;
          width: 100%;
          text-align: center;
        }
        
        .ecg-tabs .nav-link.active {
          color: #4285f4;
          background-color: rgba(66, 133, 244, 0.1);
          border: none;
        }
        
        .ecg-tabs .nav-link.active:after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 3px;
          background-color: #4285f4;
        }
        
        .ecg-tabs .nav-link:hover:not(.active) {
          background-color: rgba(0, 0, 0, 0.03);
          color: #333;
        }
        
        /* สำหรับหน้าจอขนาดเล็กมาก */
        @media (max-width: 480px) {
          .ecg-tabs {
            justify-content: flex-start;
          }
          
          .ecg-tabs .nav-item {
            flex: 0 0 auto;
          }
          
          .ecg-tabs .nav-link {
            padding: 10px;
            font-size: 14px;
          }
        }
        
        
        .results-page {
          background-color: #f8f9fa;
          min-height: 100vh;
          padding-bottom: 40px;
        }
        
        .result-title {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 24px;
          color: #333;
          position: relative;
          padding-bottom: 12px;
        }
        
        .result-title:after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 60px;
          height: 3px;
          background-color: #4285f4;
        }
        
        .ecg-grid-card {
          border-radius: 16px;
          overflow: hidden;
          background-color: white;
          margin-bottom: 25px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
          padding: 20px;
          transition: all 0.3s ease;
        }
        
        .ecg-grid-card:hover {
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
          transform: translateY(-2px);
        }
        
        .ecg-tabs {
          margin-bottom: 20px;
        }
        
        .ecg-tabs .nav-link {
          padding: 12px 18px;
          font-weight: 600;
          color: #555;
          border-radius: 8px 8px 0 0;
          transition: all 0.2s ease;
          margin-right: 5px;
          border: none;
          position: relative;
        }
        
        .ecg-tabs .nav-link.active {
          color: #4285f4;
          background-color: rgba(66, 133, 244, 0.1);
          border: none;
        }
        
        .ecg-tabs .nav-link.active:after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 3px;
          background-color: #4285f4;
        }
        
        .ecg-tabs .nav-link:hover:not(.active) {
          background-color: rgba(0, 0, 0, 0.03);
          color: #333;
        }
        
        .ecg-grid {
          padding: 10px 0;
          position: relative;
        }
        
        .standard-leads-grid,
        .augmented-leads-grid,
        .precordial-leads-grid {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        
        .ecg-grid-all {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
        }
        
        .ecg-lead-container {
          position: relative;
          margin-bottom: 8px;
          padding: 10px;
          border-radius: 8px;
          background-color: #ffeeee; /* Light pink background */
          background-image: linear-gradient(rgba(255, 0, 0, 0.03) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255, 0, 0, 0.03) 1px, transparent 1px);
          background-size: 20px 20px;
          overflow: hidden;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .ecg-lead-container:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
        }
        
        .ecg-lead-small {
          margin-bottom: 0;
        }
        
        .lead-label {
          position: absolute;
          top: 8px;
          left: 8px;
          font-weight: 700;
          font-size: 16px;
          z-index: 10;
          background-color: rgba(255, 255, 255, 0.85);
          padding: 3px 10px;
          border-radius: 5px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        /* Enhanced Prediction Display */
        .prediction-card {
          background-color: white;
          border-radius: 16px;
          padding: 28px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
          margin-bottom: 25px;
          transition: all 0.3s ease;
        }
        
        .prediction-card:hover {
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
        }
        
        .prediction-header {
          text-align: center;
          margin-bottom: 25px;
          padding-bottom: 20px;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .prediction-title {
          font-size: 32px;
          font-weight: 700;
          margin: 0 0 8px 0;
          color: #333;
        }
        
        .prediction-subtitle {
          font-size: 18px;
          color: #666;
          font-weight: 500;
        }
        
        .confidence-section {
          margin-bottom: 24px;
        }
        
        .confidence-label {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          font-size: 16px;
          font-weight: 500;
        }
        
        .confidence-value {
          font-weight: 700;
          color: #2c70e0;
        }
        
        .confidence-bar {
          height: 12px;
          background-color: #e9ecef;
          border-radius: 6px;
          overflow: hidden;
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .confidence-fill {
          height: 100%;
          background-color: #2c70e0;
          background-image: linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent);
          background-size: 1rem 1rem;
          border-radius: 6px;
          transition: width 1s ease;
          animation: progress-bar-stripes 1s linear infinite;
        }
        
        @keyframes progress-bar-stripes {
          from { background-position: 1rem 0; }
          to { background-position: 0 0; }
        }
        
        .signal-section {
          display: flex;
          justify-content: center;
          margin: 30px 0;
        }
        
        .signal-badge {
          display: inline-block;
          padding: 12px 30px;
          border-radius: 30px;
          font-weight: 700;
          font-size: 18px;
          text-align: center;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
        }
        
        .signal-badge:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }
        
        .signal-badge.normal {
          background-color: #e6f7ec;
          color: #0d904f;
          border: 1px solid #0d904f;
        }
        
        .signal-badge.abnormal {
          background-color: #feeaea;
          color: #d32f2f;
          border: 1px solid #d32f2f;
        }
        
        .recommendation-section {
          background-color: #f9f9f9;
          border-radius: 12px;
          padding: 20px;
          margin-top: 24px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
          transition: all 0.3s ease;
        }
        
        .recommendation-section:hover {
          background-color: #f2f7ff;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
        }
        
        .recommendation-title {
          font-size: 25px;
          font-weight: 1000;
          margin-top: 0;
          margin-bottom: 15px;
          color: #333;
          position: relative;
          padding-bottom: 8px;
        }
        
        .recommendation-title:after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 40px;
          height: 3px;
          background-color: #0d904f;
        }
        
        .recommendation-content {
          font-weight: 1000;
          font-size: 17px;
          line-height: 1.7;
          color: #444;
        }
        
        .recommendation-content ul {
          padding-left: 25px;
        }
        
        .recommendation-content li {
          margin-bottom: 10px;
          position: relative;
          padding-left: 5px;
        }
        
        .recommendation-content li::marker {
          color: #0d904f;
          font-weight: bold;
        }
        
        .risk-assessment {
          margin-bottom: 25px;
          background-color: white;
          padding: 24px;
          border-radius: 16px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
        }
        
        .risk-assessment:hover {
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
        }
        
        .risk-assessment h3 {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 18px;
          color: #333;
          position: relative;
          padding-bottom: 10px;
        }
        
        .risk-assessment h3:after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 40px;
          height: 3px;
          background-color: #4285f4;
        }
        
        .risk-meter-container {
          margin-bottom: 10px;
        }
        
        .risk-meter {
          height: 16px;
          background-color: #e9ecef;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .risk-indicator {
          height: 100%;
          border-radius: 8px;
          transition: width 1s ease-in-out;
        }
        
        .risk-indicator.low-risk {
          background-color: #4285f4;
          background-image: linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent);
          background-size: 1rem 1rem;
        }
        
        .risk-indicator.medium-risk {
          background-color: #fbbc05;
          background-image: linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent);
          background-size: 1rem 1rem;
        }
        
        .risk-indicator.high-risk {
          background-color: #ea4335;
          background-image: linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent);
          background-size: 1rem 1rem;
        }
        
        .risk-labels {
          display: flex;
          justify-content: space-between;
          margin-top: 8px;
        }
        
        .risk-label {
          color: #555;
          font-size: 15px;
          font-weight: 500;
        }
        
        .action-button {
          width: 100%;
          padding: 16px;
          font-size: 18px;
          font-weight: 700;
          background-color: #4285f4;
          border: none;
          border-radius: 12px;
          margin-bottom: 18px;
          box-shadow: 0 4px 10px rgba(66, 133, 244, 0.3);
          transition: all 0.3s ease;
          letter-spacing: 0.5px;
        }
        
        .action-button:hover {
          background-color: #3367d6;
          transform: translateY(-2px);
          box-shadow: 0 6px 15px rgba(66, 133, 244, 0.4);
        }
        
        .reports-count {
          text-align: center;
          color: #666;
          margin-bottom: 18px;
          font-weight: 500;
          font-size: 15px;
        }
        
        .action-buttons-secondary {
          display: flex;
          gap: 15px;
          margin-bottom: 18px;
        }
        
        .secondary-button {
          flex: 1;
          background-color: white;
          border: 1px solid #ddd;
          border-radius: 12px;
          padding: 14px;
          font-weight: 600;
          transition: all 0.3s ease;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
          color: #555;
        }
        
        .secondary-button:hover {
          background-color: #f8f9fa;
          border-color: #aaa;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        
        .delete-button {
          width: 100%;
          color: #ea4335;
          border-color: #ea4335;
          border-radius: 12px;
          padding: 14px;
          font-weight: 600;
          transition: all 0.3s ease;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
        }
        
        .delete-button:hover {
          background-color: rgba(234, 67, 53, 0.05);
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(234, 67, 53, 0.15);
        }
        
        .icon {
          margin-right: 8px;
        }
        
        @media (max-width: 768px) {
          .ecg-grid-all {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .prediction-title {
            font-size: 28px;
          }
          
          .action-button {
            padding: 14px;
          }
        }
        
        @media (max-width: 576px) {
          .ecg-grid-all {
            grid-template-columns: 1fr;
          }
          
          .action-buttons-secondary {
            flex-direction: column;
            gap: 10px;
          }
          
          .prediction-title {
            font-size: 24px;
          }
          
          .signal-badge {
            padding: 10px 20px;
            font-size: 16px;
          }
        }
        
        @media print {
          .results-page {
            background-color: white;
          }
          .action-button,
          .action-buttons-secondary,
          .delete-button,
          .reports-count {
            display: none;
          }
          
          .prediction-card,
          .ecg-grid-card,
          .risk-assessment {
            box-shadow: none;
            border: 1px solid #ddd;
          }
        }
      `}</style>

      <style jsx global>{`
        html, body {
          background-color: #f8f9fa;
          margin: 0;
          padding: 0;
        }
      `}</style>
    </div>
  );
};

export default ResultsPage;