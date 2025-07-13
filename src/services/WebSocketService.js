// src/services/WebSocketService.js
class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.onDataReceived = null;
    this.onConnectionChanged = null;
    this.onError = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.connectionUrl = null;
    this.pingInterval = null;
    this.reconnectTimeout = null;
    this.lastPongTime = Date.now();
    this.connectionCheckInterval = null;
  }

  async connect(ip = null) {
    try {
      // Clear any existing intervals or timeouts
      this.clearTimers();
      
      // If IP address not provided
      if (!ip) {
        // Use prompt to get IP from user
        ip = prompt("Please enter the IP Address of your Test1 device:", "192.168.1."); 
        if (!ip) {
          this.handleError("IP Address not received");
          return false;
        }
      }

      // Validate IP format
      if (!this.validateIpAddress(ip)) {
        this.handleError("Invalid IP Address");
        return false;
      }

      // Cancel existing connection if any
      if (this.socket) {
        this.disconnect();
      }

      console.log("Connecting to:", ip);
      this.connectionUrl = `ws://${ip}/ws`;
      
      // Create WebSocket connection
      this.socket = new WebSocket(this.connectionUrl);

      // Set event handlers
      this.socket.onopen = () => {
        console.log("WebSocket connection successful");
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Start sending pings to keep connection alive
        this.startPingInterval();
        
        // Start connection monitoring
        this.startConnectionCheck();
        
        if (this.onConnectionChanged) {
          this.onConnectionChanged(true);
        }
      };

      this.socket.onmessage = (event) => {
        const data = event.data;
        console.log("Received data:", data);
        
        // Update lastPongTime when we receive a PONG or HEARTBEAT
        if (data === "PONG" || data.startsWith("HEARTBEAT:")) {
          this.lastPongTime = Date.now();
        }
        
        if (this.onDataReceived) {
          this.onDataReceived(data);
        }
      };

      this.socket.onclose = (event) => {
        console.log("WebSocket closed:", event.code, event.reason);
        this.isConnected = false;
        this.clearTimers();
        
        if (this.onConnectionChanged) {
          this.onConnectionChanged(false);
        }
        
        // Try to reconnect (if within attempt limit)
        if (this.reconnectAttempts < this.maxReconnectAttempts && this.connectionUrl) {
          console.log(`Attempting to reconnect (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})...`);
          this.reconnectAttempts++;
          
          // Exponential backoff for reconnection attempts (1s, 2s, 4s, 8s, 16s)
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 16000);
          
          this.reconnectTimeout = setTimeout(() => this.connect(ip), delay);
        }
      };

      this.socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.handleError("Error connecting to WebSocket");
      };

      // Wait for connection to complete
      return new Promise((resolve) => {
        const connectionTimeout = setTimeout(() => {
          if (this.socket.readyState !== WebSocket.OPEN) {
            console.log("Connection timeout");
            if (this.socket.readyState !== WebSocket.CLOSING && this.socket.readyState !== WebSocket.CLOSED) {
              this.socket.close();
            }
            resolve(false);
          }
        }, 10000); // 10 second timeout
        
        const checkConnection = () => {
          if (this.socket.readyState === WebSocket.OPEN) {
            clearTimeout(connectionTimeout);
            resolve(true);
          } else if (this.socket.readyState === WebSocket.CLOSED || this.socket.readyState === WebSocket.CLOSING) {
            clearTimeout(connectionTimeout);
            resolve(false);
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      });

    } catch (error) {
      this.handleError(`Connection error: ${error.message}`);
      console.error("Error details:", error);
      return false;
    }
  }

  async disconnect() {
    if (this.socket) {
      console.log("Disconnecting WebSocket...");
      
      // Clear all timers and intervals
      this.clearTimers();
      
      // Set not to attempt reconnection
      this.reconnectAttempts = this.maxReconnectAttempts;
      
      try {
        this.socket.close();
      } catch (error) {
        console.error("Error closing WebSocket:", error);
      }
      
      this.socket = null;
      this.isConnected = false;
      this.connectionUrl = null;
      
      if (this.onConnectionChanged) {
        this.onConnectionChanged(false);
      }
      
      console.log("Disconnected successfully");
    }
    
    return true;
  }

  async sendCommand(command) {
    if (!this.isConnected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.handleError("Not connected to device");
      return false;
    }
    
    try {
      console.log("Sending command:", command);
      this.socket.send(command);
      console.log("Command sent successfully");
      return true;
    } catch (error) {
      this.handleError(`Command failed: ${error.message}`);
      console.error("Command error details:", error);
      return false;
    }
  }
  
  // Start sending periodic pings to keep connection alive
  startPingInterval() {
    this.pingInterval = setInterval(() => {
      if (this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send("PING");
        console.log("Sent PING to server");
      }
    }, 10000); // Send ping every 10 seconds
  }
  
  // Start connection checking to detect stale connections
  startConnectionCheck() {
    this.connectionCheckInterval = setInterval(() => {
      const now = Date.now();
      // If no pong received for 30 seconds, connection is likely stale
      if (now - this.lastPongTime > 30000) {
        console.log("Connection appears to be stale (no PONG received). Reconnecting...");
        this.reconnect();
      }
    }, 10000); // Check every 10 seconds
  }
  
  // Clear all timers and intervals
  clearTimers() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
  }
  
  // Force reconnection
  reconnect() {
    if (this.connectionUrl) {
      const url = this.connectionUrl.replace('ws://', '').replace('/ws', '');
      
      if (this.socket) {
        // Don't trigger onConnectionChanged yet, as we're immediately reconnecting
        const oldOnConnectionChanged = this.onConnectionChanged;
        this.onConnectionChanged = null;
        
        // Close the current connection
        try {
          this.socket.close();
        } catch (e) {
          console.error("Error closing socket during reconnect:", e);
        }
        
        // Restore the callback
        this.onConnectionChanged = oldOnConnectionChanged;
      }
      
      // Start reconnection
      this.connect(url);
    }
  }

  validateIpAddress(ip) {
    // Validate IP address format
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  }

  handleError(message) {
    console.error(message);
    if (this.onError) {
      this.onError(message);
    }
  }
}

export default new WebSocketService();