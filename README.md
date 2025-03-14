# WatJai: AI-powered Heart Disease Screening with ECG Analysis  
## ***🏆 Thailand Innovation Award 2024***

**WatJai** is an AI-powered platform designed for heart disease screening using ECG signal analysis. The system leverages deep learning models to detect anomalies in ECG waveforms, providing early diagnosis support for cardiovascular diseases.

![Overview of WatJai System](docs/Overview.png)

## Table of Contents

- [Introduction](#introduction)
- [Key Features](#key-features)
- [Model Architecture](#model-architecture)
- [Installation](#installation)
- [Usage](#usage)
- [Results](#results)
- [License](#license)

## Introduction  

WatJai integrates **ECG signal processing** with **deep learning** to provide an accessible and efficient heart disease screening tool. The goal is to assist individuals and healthcare professionals in **early detection** of potential cardiovascular diseases, reducing risks through timely intervention.

## Key Features  

- **ECG Signal Analysis**: Processes raw ECG waveforms to detect abnormal patterns.  
- **Deep Learning Classification**: Utilizes a trained neural network model for disease detection.  
- **Bluetooth Integration**: Connects seamlessly with ECG sensors via mobile applications.  
- **Real-time Risk Assessment**: Provides instant feedback on potential heart conditions.  
- **User-friendly Interface**: Designed for ease of use by both patients and healthcare professionals.  

## Model Architecture  

The AI model powering **WatJai** consists of:  

- **Preprocessing Module**: Filters and normalizes ECG signals.  
- **Deep Learning Model**: Uses Convolutional Neural Networks (CNN) for pattern recognition.  
- **Risk Assessment Engine**: Assigns probability scores to different heart disease conditions.  

### Model Performance  

| Model | Epochs | Batch | Learning Rate | Accuracy | Precision | Recall | F1-Score |
|--------|--------|------|---------------|----------|-----------|--------|----------|
| CNN (Baseline) | 50 | 16 | 0.001 | 85.4% | 83.2% | 81.5% | 82.3% |
| ResNet-18 | 100 | 32 | 0.0001 | 91.2% | 90.5% | 89.8% | 90.1% |
| Transformer-based | 150 | 64 | 0.00005 | 94.7% | 94.1% | 93.6% | 93.8% |

**Best Model**: The Transformer-based model achieved **94.7% accuracy**, demonstrating superior ECG anomaly detection.

## Installation  

To install and run **WatJai**, follow these steps:

1. Clone the repository:
    ```bash
    git clone https://github.com/Nontakorn-dev/WatJai-AI.git
    ```

2. Install the required dependencies:
    ```bash
    pip install -r requirements.txt
    ```

3. Run the application:
    ```bash
    streamlit run app.py
    ```

## Usage  

1. Connect an **ECG sensor** to your device via **Bluetooth**.  
2. Start the **WatJai Application**.  
3. Record or upload an **ECG signal**.  
4. View **real-time analysis** and risk predictions.  
5. Save and track historical ECG data.  

## Results  

### Example of ECG Signal Processing  
![ECG Signal Example](docs/ecg_signal.png)

### AI-based Classification Output  
![AI Analysis](docs/ai_output.png)

## License  

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for more details.

---

### Tags  

- ECG  
- Deep Learning  
- Cardiovascular Screening  
- Medical AI  
- Heart Disease Detection  
- Mobile Health  

---
