# -*- coding: utf-8 -*-

# === Imports ===
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import wfdb
import tensorflow as tf
import os

# === Global Variables & App Initialization ===
app = Flask(__name__)
CORS(app)  # อนุญาตการเข้าถึงจากโดเมนอื่น (เช่น React App ของคุณ)

# ตัวแปรสำหรับเก็บโมเดล GAN ที่โหลดแล้ว
gan_generator_model = None

# === GAN Model Functions ===
def load_gan_model(model_path='generator_model.h5'):
    """
    โหลดโมเดล Keras (.h5) เข้ามาในหน่วยความจำ
    จะถูกเรียกแค่ครั้งเดียวตอนเซิร์ฟเวอร์เริ่มทำงาน
    """
    global gan_generator_model
    # ตรวจสอบว่าไฟล์โมเดลมีอยู่จริงหรือไม่
    if not os.path.exists(model_path):
        print(f"✗ คำเตือน: ไม่พบไฟล์โมเดลที่ '{model_path}'. จะไม่สามารถสร้าง V1-V6 ได้")
        gan_generator_model = None
        return

    try:
        gan_generator_model = tf.keras.models.load_model(model_path)
        print(f"✓ โมเดล GAN '{model_path}' โหลดสำเร็จแล้ว")
    except Exception as e:
        print(f"✗ เกิดข้อผิดพลาดในการโหลดโมเดล GAN: {e}")
        gan_generator_model = None

def generate_v1_to_v6_leads(lead1_data, lead2_data):
    """
    ใช้โมเดล GAN ที่โหลดไว้เพื่อสร้างสัญญาณ V1-V6 จาก Lead I และ II
    """
    if gan_generator_model is None:
        print("คำเตือน: ไม่สามารถสร้าง V1-V6 ได้ เนื่องจากโมเดล GAN ไม่ได้ถูกโหลด")
        return {}

    try:
        min_length = min(len(lead1_data), len(lead2_data))
        lead1 = np.array(lead1_data[:min_length])
        lead2 = np.array(lead2_data[:min_length])

        # Preprocessing: ปรับ shape ของ input ให้ตรงกับที่โมเดลต้องการ (1, length, 2)
        gan_input = np.stack([lead1, lead2], axis=-1)
        gan_input = np.expand_dims(gan_input, axis=0)

        # ใช้โมเดล GAN ทำการ predict
        generated_signals = gan_generator_model.predict(gan_input)
        
        # Post-processing: แปลงผลลัพธ์กลับเป็น Dictionary
        v_leads = {}
        lead_names = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6']
        for i, name in enumerate(lead_names):
            v_leads[name] = generated_signals[0, :, i].tolist()
        
        print("✓ สร้างสัญญาณ V1-V6 ด้วย GAN สำเร็จ")
        return v_leads
    except Exception as e:
        print(f"✗ เกิดข้อผิดพลาดระหว่างการสร้างสัญญาณด้วย GAN: {e}")
        return {}

# === ECG Calculation & Analysis Functions ===
def calculate_ecg_leads(lead1_data, lead2_data):
    """
    คำนวณ Lead III, aVR, aVL, aVF จาก Lead I และ II
    """
    try:
        min_length = min(len(lead1_data), len(lead2_data))
        i = np.array(lead1_data[:min_length])
        ii = np.array(lead2_data[:min_length])
        iii = ii - i
        avr = - (i + ii) / 2
        avl = i - (ii / 2)
        avf = ii - (i / 2)
        return {'I': i.tolist(), 'II': ii.tolist(), 'III': iii.tolist(), 'aVR': avr.tolist(), 'aVL': avl.tolist(), 'aVF': avf.tolist()}
    except Exception as e:
        print(f"เกิดข้อผิดพลาดในการคำนวณ Limb Leads: {e}")
        return None

def perform_mock_analysis(ecg_data):
    """
    ฟังก์ชันตัวอย่างสำหรับวิเคราะห์ผลเบื้องต้น
    """
    try:
        if 'II' not in ecg_data or not ecg_data['II']:
            return {"heart_rate": 0, "rhythm_type": "Unknown", "interpretation": "Lead II data not available for analysis."}

        lead_ii = np.array(ecg_data['II'])
        # ตัวอย่างการหา Heart Rate (ควรใช้วิธีที่ซับซ้อนกว่านี้ในงานจริง)
        peaks = np.where(lead_ii > (np.max(lead_ii) * 0.7))[0]
        if len(peaks) > 1:
            avg_interval_samples = np.mean(np.diff(peaks))
            sampling_rate = 500  # Hz (ปรับค่านี้ให้ตรงกับ ESP32 ของคุณ)
            heart_rate = (sampling_rate / avg_interval_samples) * 60
        else:
            heart_rate = 0

        return {
            "heart_rate": round(heart_rate),
            "rhythm_type": "Normal Sinus Rhythm (Mock)",
            "interpretation": "ECG is within normal limits. (Mock result)"
        }
    except Exception as e:
        print(f"เกิดข้อผิดพลาดในการวิเคราะห์: {e}")
        return {"heart_rate": 0, "rhythm_type": "Analysis Failed", "interpretation": str(e)}

def load_ecg_record(record_path):
    """
    อ่านไฟล์ .dat และ .hea และดึงข้อมูล Leads ที่ต้องการ
    """
    try:
        record = wfdb.rdrecord(record_path)
        signals = record.p_signal
        lead_names = record.sig_name
        print(f"ไฟล์ '{record_path}' อ่านสำเร็จแล้ว | Leads: {lead_names}")
        extracted_leads = {}
        desired_leads = ['aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6']
        for i, name in enumerate(lead_names):
            clean_name = name.strip()
            if clean_name in desired_leads:
                extracted_leads[clean_name] = signals[:, i].tolist()
        return extracted_leads if extracted_leads else None
    except Exception as e:
        print(f"เกิดข้อผิดพลาดในการอ่านไฟล์ Record: {e}")
        return None

# === API Endpoints ===
@app.route('/analyze', methods=['POST'])
def analyze_endpoint():
    """
    Endpoint หลักสำหรับรับข้อมูลจาก ESP32, คำนวณ และใช้ GAN
    """
    print("ได้รับคำขอที่ /analyze")
    data = request.get_json()
    if not data or 'signal_lead1' not in data or 'signal_lead2' not in data:
        return jsonify({"error": "Missing signal_lead1 or signal_lead2"}), 400

    lead1 = data['signal_lead1']
    lead2 = data['signal_lead2']

    # 1. คำนวณ Limb Leads (I, II, III, aVR, aVL, aVF)
    limb_leads = calculate_ecg_leads(lead1, lead2)
    if not limb_leads:
        return jsonify({"error": "Failed to calculate limb leads."}), 500

    # 2. สร้าง Precordial Leads (V1-V6) ด้วย GAN
    precordial_leads = generate_v1_to_v6_leads(lead1, lead2)

    # 3. รวบรวมข้อมูลทั้งหมด (ครบ 12 Leads ถ้า GAN ทำงาน)
    all_leads_data = {**limb_leads, **precordial_leads}
    
    # 4. วิเคราะห์ผล (ถ้าต้องการ)
    analysis_results = perform_mock_analysis(all_leads_data)

    response_data = {
        "status": "success",
        "analysis_results": analysis_results,
        "ecg_data": all_leads_data
    }
    
    print("วิเคราะห์ข้อมูลเสร็จสิ้น ส่งผลลัพธ์กลับ")
    return jsonify(response_data)

@app.route('/get-record/<record_name>', methods=['GET'])
def get_record_endpoint(record_name):
    """
    Endpoint สำหรับดึงข้อมูลจากไฟล์ .dat/.hea โดยตรง
    """
    print(f"ได้รับคำขอสำหรับไฟล์ record: {record_name}")
    ecg_data = load_ecg_record(record_name)
    
    if ecg_data:
        return jsonify({"status": "success", "record_name": record_name, "leads_data": ecg_data})
    else:
        return jsonify({"status": "error", "message": f"Could not read or find desired leads in record: {record_name}"}), 404

# === Main Execution ===
if __name__ == '__main__':
    # โหลดโมเดล GAN ตอนเริ่มทำงาน
    load_gan_model()
    # รัน Flask App
    app.run(host='0.0.0.0', port=5001, debug=True)