const fs = require('fs');
const jwt = require('jsonwebtoken');
const mqtt = require('mqtt');

class GcpMqtt {
  static MINIMUM_BACKOFF_TIME = 1;
  static MAXIMUM_BACKOFF_TIME = 32;
  static TOKEN_EXP_MINS = 20

  constructor() {
    this.mqttBridgeHostname = `mqtt.googleapis.com`;
    this.mqttBridgePort = 443;
    this.messageType = `events`;
//    this.messageType = `state`;

    this.shouldBackoff = false;
    this.backoffTime = 1;
    this.publishChainInProgress = false;
    
    this.settings = 'cert/settings.json';
    this.args = {
      "projectId": "PROJECT_ID",
      "cloudRegion": "REGION",
      "registryId": "my-registry",
      "deviceId": "my-device",
      "privateKeyFile": "rsa_private.pem",
      "serverCertFile": "roots.pem",
      "algorithm": "RS256"
    }
    if (!fs.existsSync(this.settings)) {
      this.settings = './settings.json';
    }
    if (!fs.existsSync(this.settings)) {
      console.log("WARNING: settings.json is not found.");
    } else {
      this.args=JSON.parse(fs.readFileSync(this.settings, 'UTF-8'));
    }
    
    this.privateKey = fs.readFileSync(`cert/${this.args.privateKeyFile}`);
    this.serverCert = fs.readFileSync(`cert/${this.args.serverCertFile}`);
    
    this.mqttClientId = `projects/${this.args.projectId}/locations/${this.args.cloudRegion}/registries/${this.args.registryId}/devices/${this.args.deviceId}`;

    this.connectionArgs = {
      host: this.mqttBridgeHostname,
      port: this.mqttBridgePort,
      clientId: this.mqttClientId,
      username: 'unused',
      password: this.createJwt(),
      protocol: 'mqtts',
      secureProtocol: 'TLSv1_2_method',
      ca: [ this.serverCert ]
    };
    this.iatTime = parseInt(Date.now() / 1000);
    this.client = mqtt.connect(this.connectionArgs);
  
    this.client.subscribe(`/devices/${this.args.deviceId}/config`, {qos: 1});
    this.client.subscribe(`/devices/${this.args.deviceId}/commands/#`, {qos: 0});
    this.mqttTopic = `/devices/${this.args.deviceId}/${this.messageType}`;  
  
    this.client.on('connect', success => {
      console.log('connect');
      if (!success) {
        console.log('Client not connected...');
      } else if (!this.publishChainInProgress) {
        this.publish(this.mqttTopic, this.client, this.iatTime, 1, 10, this.connectionArgs);
      }
    });
    
    this.client.on('close', () => {
      console.log('close');
      this.shouldBackoff = true;
    });
    
    this.client.on('error', err => {
      console.log('error', err);
    });
    
    this.client.on('message', (topic, message) => {
      let messageStr = `Message received:  ${message}`;
      if (topic === `/devices/${this.args.deviceId}/config`) {
        messageStr = `Config message received: ${message}`;
      } else if (this.topic.startsWith(`/devices/${this.args.deviceId}/commands`)) {
        messageStr = `Command message received: ${message}`;
      }
    
      messageStr += Buffer.from(message, 'base64').toString('ascii');
      console.log(messageStr);
    });
    
    this.client.on('packetsend', () => {});
  
  }

  createJwt() {
    const token = {
      iat: parseInt(Date.now() / 1000),
      exp: parseInt(Date.now() / 1000) + GcpMqtt.TOKEN_EXP_MINS * 60,
      aud: this.args.projectId,
    };
    return jwt.sign(token, this.privateKey, {algorithm: this.args.algorithm});
  }
  
  async publish(mqttTopic, client, iatTime, messagesSent, numMessages, connectionArgs) {
    if (messagesSent > numMessages || this.backoffTime >= GcpMqtt.MAXIMUM_BACKOFF_TIME) {
      if (this.backoffTime >= GcpMqtt.MAXIMUM_BACKOFF_TIME) {
        console.log('Backoff time is too high. Giving up.');
      }
      console.log('Closing connection to MQTT. Goodbye!');
      client.end();
      this.publishChainInProgress = false;
      return;
    }
  
    // Publish and schedule the next publish.
    this.publishChainInProgress = true;
    let publishDelayMs = 0;
    if (this.shouldBackoff) {
      publishDelayMs = 1000 * (this.backoffTime + Math.random());
      this.backoffTime *= 2;
      console.log(`Backing off for ${publishDelayMs}ms before publishing.`);
    }
  
    setTimeout(() => {
      const payload = `${this.args.registryId}/${this.args.deviceId}-payload-${messagesSent}`;
  
      // Publish "payload" to the MQTT topic. qos=1 means at least once delivery.
      // Cloud IoT Core also supports qos=0 for at most once delivery.
      console.log('Publishing message:', payload);
      client.publish(mqttTopic, payload, {qos: 1}, err => {
        if (!err) {
          this.shouldBackoff = false;
          this.backoffTime = GcpMqtt.MINIMUM_BACKOFF_TIME;
        }
      });
  
      const schedulePublishDelayMs = this.messageType === 'events' ? 1000 : 2000;
      setTimeout(() => {
        // [START iot_mqtt_jwt_refresh]
        const secsFromIssue = parseInt(Date.now() / 1000) - iatTime;
        if (secsFromIssue > GcpMqtt.TOKEN_EXP_MINS * 60) {
          iatTime = parseInt(Date.now() / 1000);
          console.log(`\tRefreshing token after ${secsFromIssue} seconds.`);
  
          client.end();
          connectionArgs.password = this.createJwt();
          connectionArgs.protocolId = 'MQTT';
          connectionArgs.protocolVersion = 4;
          connectionArgs.clean = true;
          client = mqtt.connect(connectionArgs);
          // [END iot_mqtt_jwt_refresh]
  
          client.on('connect', success => {
            console.log('connect');
            if (!success) {
              console.log('Client not connected...');
            } else if (!publishChainInProgress) {
              publish(
                mqttTopic,
                client,
                iatTime,
                messagesSent,
                numMessages,
                connectionArgs
              );
            }
          });
  
          client.on('close', () => {
            console.log('close');
            this.shouldBackoff = true;
          });
  
          client.on('error', err => {
            console.log('error', err);
          });
  
          client.on('message', (topic, message) => {
            console.log(
              'message received: ',
              Buffer.from(message, 'base64').toString('ascii')
            );
          });
  
          client.on('packetsend', () => {
            // Note: logging packet send is very verbose
          });
        }
        this.publish(
          mqttTopic,
          client,
          iatTime,
          messagesSent + 1,
          numMessages,
          connectionArgs
        );
      }, schedulePublishDelayMs);
    }, publishDelayMs);
  };
}

// Usage:
//   gcpmqtt = new GcpMqtt();

module.exports = GcpMqtt;