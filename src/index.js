import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration'; // <-- 1. เพิ่มบรรทัดนี้
import MockDataService from './services/MockDataService';

// เริ่มต้นด้วยการรีเซ็ตข้อมูลเป็นรายการเดียว
// ถ้าต้องการใช้ข้อมูลเดิม ให้ comment บรรทัดนี้แล้วเปิด initializeSampleData แทน
MockDataService.resetToSingleSample();

// initializeSampleData จะสร้างข้อมูลใหม่ก็ต่อเมื่อยังไม่มีข้อมูล
// MockDataService.initializeSampleData();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
serviceWorkerRegistration.register(); // <-- 2. แก้ไขบรรทัดนี้