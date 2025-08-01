#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <AsyncTCP.h>
#include <SPIFFS.h>
#include <TFT_eSPI.h>

// ====== WiFi ======
const char* ssid = "iPhone";
const char* password = "nontakorn";

// ====== Server & WebSocket ======
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

// ====== Status Flags ======
bool deviceConnected = false;
bool oldDeviceConnected = false;
bool isMeasuring = false;
bool isProcessing = false;
bool isWiFiConnecting = false;
bool isResultReady = false;
String receivedCommand = "";
int currentLead = 1;

// ====== Timers ======
unsigned long lastHeartbeatTime = 0;
const unsigned long HEARTBEAT_INTERVAL = 5000;

unsigned long lastWiFiCheckTime = 0;
const unsigned long WIFI_CHECK_INTERVAL = 10000;

unsigned long processingStartTime = 0;
const unsigned long PROCESSING_DURATION = 8000;

// ====== AD8232 Pins ======
const int LO_POSITIVE = 25;
const int LO_NEGATIVE = 26;
const int OUTPUT_PIN = 34;

// ====== Data Buffering for WebSocket ======
const int DATA_BUFFER_SIZE = 50; // ส่งข้อมูลทีละ 50 จุด
int ecgDataBuffer[DATA_BUFFER_SIZE];
int bufferIndex = 0;

// ====== Display ======
TFT_eSPI tft = TFT_eSPI();
int graphX = 0;
int oldY = 160;
String currentStatusMessage = "";

// ====== Display Layout Constants ======
const int HEADER_HEIGHT = 50;
const int STATUS_HEIGHT = 30;
const int GRID_START_Y = HEADER_HEIGHT + STATUS_HEIGHT;
const int GRAPH_HEIGHT = 150;
const int FOOTER_HEIGHT = 40;

// ====== ECG Grid Parameters ======
const int GRID_SPACING = 20;
const uint16_t GRID_COLOR = 0x1863;  // Dark green
const uint16_t ECG_COLOR = TFT_GREEN;
const uint16_t HEADER_BG = 0x2945;   // Dark blue
const uint16_t STATUS_BG = 0x18E3;   // Dark cyan

// ====== Heart Rate Calculation ======
unsigned long lastPeakTime = 0;
int heartRate = 0;
int peakBuffer[5] = {0};
int peakIndex = 0;
int lastValue = 0;
bool risingEdge = false;

// ====== Medical Display Functions ======
void drawMedicalHeader() {
  tft.fillRect(0, 0, tft.width(), HEADER_HEIGHT, HEADER_BG);
  tft.setTextColor(TFT_WHITE, HEADER_BG);
  tft.setTextSize(2);
  tft.setCursor(10, 8);
  tft.println("WatJai ECG Monitor");
  tft.setTextSize(1);
  tft.setCursor(10, 30);
  tft.print("Lead: ");
  tft.setTextColor(TFT_YELLOW, HEADER_BG);
  tft.print(currentLead);
  if (heartRate > 0) {
    // tft.setTextColor(TFT_RED, HEADER_BG);
    // tft.setCursor(tft.width() - 80, 15);
    // tft.setTextSize(2);
    // tft.print(heartRate);
    // tft.setTextSize(1);
    // tft.setCursor(tft.width() - 80, 35);
    // tft.setTextColor(TFT_WHITE, HEADER_BG);
    // tft.print("BPM");
  }
  tft.setTextSize(1);
  tft.setCursor(tft.width() - 120, 8);
  if (WiFi.status() == WL_CONNECTED) {
    tft.setTextColor(TFT_GREEN, HEADER_BG);
    // tft.print("WiFi: OK");
  } else {
    tft.setTextColor(TFT_RED, HEADER_BG);
    // tft.print("WiFi: --");
  }
}

void drawStatusBar() {
  tft.fillRect(0, HEADER_HEIGHT, tft.width(), STATUS_HEIGHT, STATUS_BG);
  tft.setTextSize(1);
  tft.setCursor(10, HEADER_HEIGHT + 8);
  
  if (currentStatusMessage != "") {
    tft.setTextColor(TFT_WHITE, STATUS_BG);
    tft.print("Status: ");
    tft.setTextColor(TFT_YELLOW, STATUS_BG);
    tft.print(currentStatusMessage);
  } else if (isWiFiConnecting) {
    tft.setTextColor(TFT_YELLOW, STATUS_BG);
    tft.print("Status: Connecting to WiFi...");
  } else if (isMeasuring) {
    tft.setTextColor(TFT_GREEN, STATUS_BG);
    tft.print("Status: Recording ECG Signal");
    static bool blink = false;
    if (millis() % 1000 < 500) {
      tft.fillCircle(tft.width() - 20, HEADER_HEIGHT + 15, 5, TFT_RED);
    } else {
      tft.fillCircle(tft.width() - 20, HEADER_HEIGHT + 15, 5, STATUS_BG);
    }
  } else if (isProcessing) {
    tft.setTextColor(TFT_YELLOW, STATUS_BG);
    tft.print("Status: Analyzing ECG Data");
    int progress = ((millis() - processingStartTime) * 100) / PROCESSING_DURATION;
    if (progress > 100) progress = 100;
    int barWidth = 100;
    int barX = tft.width() - barWidth - 10;
    int barY = HEADER_HEIGHT + 20;
    tft.drawRect(barX, barY, barWidth, 8, TFT_WHITE);
    tft.fillRect(barX + 1, barY + 1, (barWidth - 2) * progress / 100, 6, TFT_GREEN);
  } else if (isResultReady) {
    tft.setTextColor(TFT_GREEN, STATUS_BG);
    tft.print("Status: Analysis Complete");
  } else {
    tft.setTextColor(TFT_WHITE, STATUS_BG);
    tft.print("Status: Ready");
    if (deviceConnected) {
      tft.setTextColor(TFT_GREEN, STATUS_BG);
      tft.print(" | Connected");
    } else {
      tft.setTextColor(TFT_RED, STATUS_BG);
      tft.print(" | Disconnected");
    }
  }
}

void drawECGGrid() {
  tft.fillRect(0, GRID_START_Y, tft.width(), GRAPH_HEIGHT, TFT_BLACK);
  for (int y = GRID_START_Y; y < GRID_START_Y + GRAPH_HEIGHT; y += GRID_SPACING) {
    for (int x = 0; x < tft.width(); x += 4) {
      tft.drawPixel(x, y, GRID_COLOR);
    }
  }
  for (int x = 0; x < tft.width(); x += GRID_SPACING) {
    for (int y = GRID_START_Y; y < GRID_START_Y + GRAPH_HEIGHT; y += 4) {
      tft.drawPixel(x, y, GRID_COLOR);
    }
  }
  int centerY = GRID_START_Y + GRAPH_HEIGHT / 2;
  tft.drawFastHLine(0, centerY, tft.width(), 0x39E7);
  tft.setTextSize(1);
  tft.setTextColor(0x7BEF, TFT_BLACK);
  tft.setCursor(2, GRID_START_Y + 10);
  tft.print("+1mV");
  tft.setCursor(2, centerY - 8);
  tft.print("0V");
  tft.setCursor(2, GRID_START_Y + GRAPH_HEIGHT - 20);
  tft.print("-1mV");
}

void drawFooter() {
  int footerY = tft.height() - FOOTER_HEIGHT;
  tft.fillRect(0, footerY, tft.width(), FOOTER_HEIGHT, 0x18C3);
  tft.setTextSize(1);
  tft.setTextColor(TFT_WHITE, 0x18C3);
  tft.setCursor(10, footerY + 8);
  tft.print("Time: ");
  tft.print(millis() / 1000);
  tft.print("s");
  tft.setCursor(10, footerY + 22);
  tft.print("Speed: 25mm/s");
  tft.setCursor(tft.width() - 80, footerY + 8);
  tft.print("Gain: 10mm/mV");
  tft.setCursor(tft.width() - 80, footerY + 22);
  tft.setTextColor(TFT_GREEN, 0x18C3);
  tft.print("Filter: ON");
}

void calculateHeartRate(int currentValue) {
  if (currentValue > lastValue + 50 && !risingEdge) {
    risingEdge = true;
  }
  if (risingEdge && currentValue < lastValue - 30) {
    unsigned long currentTime = millis();
    if (lastPeakTime > 0) {
      unsigned long interval = currentTime - lastPeakTime;
      if (interval > 300 && interval < 2000) {
        peakBuffer[peakIndex] = 60000 / interval;
        peakIndex = (peakIndex + 1) % 5;
        int sum = 0;
        for (int i = 0; i < 5; i++) {
          sum += peakBuffer[i];
        }
        heartRate = sum / 5;
      }
    }
    lastPeakTime = currentTime;
    risingEdge = false;
  }
  lastValue = currentValue;
}

void updateFullDisplay() {
  drawMedicalHeader();
  drawStatusBar();
  drawECGGrid();
  drawFooter();
}

void showLeadOffWarning() {
  tft.fillScreen(TFT_BLACK);
  tft.drawRect(10, 10, tft.width() - 20, tft.height() - 20, TFT_RED);
  tft.drawRect(11, 11, tft.width() - 22, tft.height() - 22, TFT_RED);
  int centerX = tft.width() / 2;
  int centerY = tft.height() / 2 - 20;
  tft.fillTriangle(centerX, centerY - 30, centerX - 25, centerY + 10, centerX + 25, centerY + 10, TFT_YELLOW);
  tft.setTextColor(TFT_RED, TFT_YELLOW);
  tft.setTextSize(3);
  tft.setCursor(centerX - 8, centerY - 8);
  tft.print("!");
  tft.setTextColor(TFT_RED, TFT_BLACK);
  tft.setTextSize(2);
  tft.setCursor(centerX - 80, centerY + 40);
  tft.print("LEAD OFF");
  tft.setTextSize(1);
  tft.setTextColor(TFT_YELLOW, TFT_BLACK);
  tft.setCursor(centerX - 90, centerY + 65);
  tft.print("Check electrode connection");
  tft.setCursor(centerX - 70, centerY + 80);
  tft.print("Ensure proper skin contact");
}

void showProcessingAnimation() {
  static int animFrame = 0;
  static unsigned long lastAnimTime = 0;
  if (millis() - lastAnimTime > 200) {
    int centerX = tft.width() / 2;
    int centerY = GRID_START_Y + GRAPH_HEIGHT / 2;
    tft.fillRect(centerX - 60, centerY - 30, 120, 60, TFT_BLACK);
    for (int i = 0; i < 8; i++) {
      int angle = (animFrame + i * 45) % 360;
      int x = centerX + 25 * cos(angle * PI / 180);
      int y = centerY + 25 * sin(angle * PI / 180);
      uint16_t color = (i == 0) ? TFT_WHITE : (0x4208 + i * 0x1040);
      tft.fillCircle(x, y, 3, color);
    }
    tft.setTextColor(TFT_CYAN, TFT_BLACK);
    tft.setTextSize(1);
    tft.setCursor(centerX - 35, centerY + 40);
    tft.print("ANALYZING ECG");
    animFrame = (animFrame + 45) % 360;
    lastAnimTime = millis();
  }
}

// ====== WebSocket Message Handling ======
void handleWebSocketMessage(void *arg, uint8_t *data, size_t len) {
  AwsFrameInfo *info = (AwsFrameInfo*)arg;
  if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT) {
    data[len] = 0;
    receivedCommand = (char*)data;
    receivedCommand.trim();
    Serial.println("📩 Received: " + receivedCommand);

    if (receivedCommand == "START") {
      isMeasuring = true;
      isProcessing = false;
      isResultReady = false;
      currentStatusMessage = "";
      ws.textAll("STATUS:MEASURING");
      ws.textAll("SIGNAL:DETECTED");
      updateFullDisplay();
      graphX = 0;
      oldY = GRID_START_Y + GRAPH_HEIGHT / 2;
      bufferIndex = 0; // Reset buffer index

    } else if (receivedCommand == "STOP") {
      isMeasuring = false;
      isProcessing = false;
      isResultReady = false;
      currentStatusMessage = "Saved Lead " + String(currentLead);
      ws.textAll("STATUS:READY");
      updateFullDisplay();

    } else if (receivedCommand.startsWith("LEAD:")) {
      currentLead = receivedCommand.substring(5).toInt();
      ws.textAll("LEAD:" + String(currentLead));
      updateFullDisplay();

    } else if (receivedCommand == "PING") {
      ws.textAll("PONG");

    } else if (receivedCommand == "PROCESS") {
      isMeasuring = false;
      isProcessing = true;
      isResultReady = false;
      currentStatusMessage = "";
      processingStartTime = millis();
      updateFullDisplay();
      ws.textAll("STATUS:PROCESSING");
      Serial.println("⚙️ Processing started...");

    } else if (receivedCommand == "RESULT") {
      isMeasuring = false;
      isProcessing = false;
      isResultReady = true;
      currentStatusMessage = "Analysis Complete";
      updateFullDisplay();
      Serial.println("📊 Result ready and shown on display");
    }
  }
}

// ====== WebSocket Event ======
void onWebSocketEvent(AsyncWebSocket *server, AsyncWebSocketClient *client,
                      AwsEventType type, void *arg, uint8_t *data, size_t len) {
  switch (type) {
    case WS_EVT_CONNECT:
      Serial.printf("📶 Client #%u Connected\n", client->id());
      deviceConnected = true;
      client->text("STATUS:READY");
      client->text("CONNECTED:TRUE");
      updateFullDisplay();
      break;
    case WS_EVT_DISCONNECT:
      Serial.printf("🔌 Client #%u Disconnected\n", client->id());
      deviceConnected = false;
      updateFullDisplay();
      break;
    case WS_EVT_DATA:
      handleWebSocketMessage(arg, data, len);
      break;
    case WS_EVT_ERROR:
      Serial.println("WebSocket error");
      break;
  }
}

// ====== WiFi Auto-Reconnect ======
void reconnectWiFi() {
  if (millis() - lastWiFiCheckTime > WIFI_CHECK_INTERVAL) {
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("🔄 WiFi lost. Reconnecting...");
      WiFi.disconnect();
      WiFi.begin(ssid, password);
      int attempts = 0;
      while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print(".");
        attempts++;
      }
      if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n✓ WiFi Reconnected");
        updateFullDisplay();
      } else {
        Serial.println("\n❌ WiFi Reconnect Failed");
      }
    }
    lastWiFiCheckTime = millis();
  }
}

// ====== Heartbeat ======
void sendHeartbeat() {
  if (deviceConnected && millis() - lastHeartbeatTime > HEARTBEAT_INTERVAL) {
    ws.textAll("HEARTBEAT:" + String(millis() / 1000));
    if (isMeasuring) ws.textAll("SIGNAL:DETECTED");
    lastHeartbeatTime = millis();
  }
}

// ====== Setup ======
void setup() {
  Serial.begin(115200);
  Serial.println("=== WatJai ECG Medical Monitor ===");

  pinMode(LO_POSITIVE, INPUT);
  pinMode(LO_NEGATIVE, INPUT);
  pinMode(OUTPUT_PIN, INPUT);
  analogReadResolution(12);

  tft.init();
  tft.setRotation(1);
  tft.fillScreen(TFT_BLACK);

  isWiFiConnecting = true;
  updateFullDisplay();

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.print("Connecting");
  unsigned long startTime = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startTime < 20000) {
    delay(500);
    Serial.print(".");
  }
  isWiFiConnecting = false;
  Serial.println();
  updateFullDisplay();

  if (!SPIFFS.begin(true)) {
    Serial.println("❌ SPIFFS mount failed");
  }

  ws.onEvent(onWebSocketEvent);
  server.addHandler(&ws);
  server.serveStatic("/", SPIFFS, "/").setDefaultFile("index.html");
  server.begin();
  Serial.println("✓ Medical ECG Web Server Ready");
  Serial.println("✓ Display Interface Initialized");
}

// ====== Main Loop ======
void loop() {
  ws.cleanupClients();
  sendHeartbeat();
  reconnectWiFi();

  static unsigned long lastStatusUpdate = 0;
  if (millis() - lastStatusUpdate > 1000) {
    drawStatusBar();
    drawMedicalHeader();
    lastStatusUpdate = millis();
  }

  if (isProcessing) {
    showProcessingAnimation();
    unsigned long elapsed = millis() - processingStartTime;
    if (elapsed >= PROCESSING_DURATION) {
      isProcessing = false;
      isResultReady = true;
      currentStatusMessage = "Analysis Complete";
      ws.textAll("STATUS:READY");
      Serial.println("✅ Processing complete");
      updateFullDisplay();
    }
    return;
  }
  
  // *** START: MODIFIED ECG DATA HANDLING ***
  if (deviceConnected && isMeasuring) {
    // Check for lead connection issues
    if (digitalRead(LO_POSITIVE) || digitalRead(LO_NEGATIVE)) {
      ws.textAll("LEADS:OFF");
      showLeadOffWarning();
      isMeasuring = false; 
      currentStatusMessage = "";
      delay(2000);
      updateFullDisplay();
      return;
    }

    // Read ECG signal
    int raw = analogRead(OUTPUT_PIN);

    // Add data to buffer
    ecgDataBuffer[bufferIndex] = raw;
    bufferIndex++;

    // If buffer is full, send data over WebSocket
    if (bufferIndex >= DATA_BUFFER_SIZE) {
      String dataPacket = "DATA:";
      for (int i = 0; i < DATA_BUFFER_SIZE; i++) {
        dataPacket += String(ecgDataBuffer[i]);
        if (i < DATA_BUFFER_SIZE - 1) {
          dataPacket += ",";
        }
      }
      ws.textAll(dataPacket);
      bufferIndex = 0; // Reset buffer
    }

    // --- The rest is for the local TFT display ---
    calculateHeartRate(raw);
    int y = map(raw, 0, 4095, GRID_START_Y + GRAPH_HEIGHT - 10, GRID_START_Y + 10);
    if (graphX > 0) {
      tft.drawLine(graphX - 1, oldY, graphX, y, ECG_COLOR);
    }
    oldY = y;
    graphX++;
    if (graphX >= tft.width()) {
      graphX = 0;
      drawECGGrid();
    }
    delay(2); // Small delay to match ~360-500Hz sampling
  }
  // *** END: MODIFIED ECG DATA HANDLING ***


  if (!deviceConnected && oldDeviceConnected) {
    delay(500);
    oldDeviceConnected = false;
    Serial.println("🔌 Client Disconnected");
    updateFullDisplay();
  }
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = true;
    Serial.println("✅ Connection Established");
    updateFullDisplay();
  }
}