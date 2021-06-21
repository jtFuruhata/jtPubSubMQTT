/**
 * @file Google Cloud IoT Core over MQTT module
 *      jtGcpIotMqtt.js
 * @module ./jtGcpIotMqtt
 * @version 0.12.210620a
 * @author TANAHASHI, Jiro (aka jtFuruhata) <jt@do-johodai.ac.jp>
 * @license MIT (see 'LICENSE' file)
 * @copyright (C) 2021 jtLab, Hokkaido Information University
 */
const fs = require('fs');
const jwt = require('jsonwebtoken');
const mqtt = require('mqtt');
const sleep = require('./jtSleep');

class GcpMqtt {
  constructor() {
    this.mqttBridgeHostname = `mqtt.googleapis.com`;
    this.mqttBridgePort = 443;
    this.messageType = `events`;
//    this.messageType = `state`;
    
    this.settings = 'cert/settings.json';
    this.args = {
      "projectId": "PROJECT_ID",
      "cloudRegion": "REGION",
      "registryId": "my-registry",
      "subscriptionId": "my-subscription",
      "deviceId": "my-device",
      "serviceAccount": "my-account",
      "clientId": "iam-unique-id",
      "privateKeyId": "iam-service-account-key",
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

    this.mqttTopic = `/devices/${this.args.deviceId}/${this.messageType}`;
    this.client = {};
  }

  async open(tokenExpireMins = 20, callback = this.messageHandler) {
    const connectionArgs = {
      host: this.mqttBridgeHostname,
      port: this.mqttBridgePort,
      clientId: this.mqttClientId,
      username: 'unused',
      password: this.createJwt(tokenExpireMins),
      protocol: 'mqtts',
      secureProtocol: 'TLSv1_2_method',
      ca: [ this.serverCert ]
    };
    this.client = mqtt.connect(connectionArgs);
  
    this.client.subscribe(`/devices/${this.args.deviceId}/config`, {qos: 1});
    this.client.subscribe(`/devices/${this.args.deviceId}/commands/#`, {qos: 0});
  
    this.client.on('connect', success => {
      console.log('connect to Google Cloud IoT Core with MQTT over TLS');
      if (!success) {
        console.log('Client not connected...');
      }
    });
    
    this.client.on('close', () => {
      console.log('MQTT client is closed');
    });
    
    this.client.on('error', err => {
      console.log('error', err);
    });
    
    this.client.on('message', (topic, message) => callback);
    
    this.client.on('packetsend', () => {});

    await sleep.wait(0, 100,
      async () => {
        return this.client.connected;
      }
    );
    return;
  }
    
  messageHandler(topic, message) {
    let messageStr = `Message received:  ${message}`;
    if (topic === `/devices/${this.args.deviceId}/config`) {
      messageStr = `Config message received: ${message}`;
    } else if (this.topic.startsWith(`/devices/${this.args.deviceId}/commands`)) {
      messageStr = `Command message received: ${message}`;
    }
  
    messageStr += Buffer.from(message, 'base64').toString('ascii');
    console.log(messageStr);
  }

  createJwt(tokenExpireMins = 20) {
    const token = {
      iat: parseInt(Date.now() / 1000),
      exp: parseInt(Date.now() / 1000) + tokenExpireMins * 60,
      aud: this.args.projectId,
    };
    return jwt.sign(token, this.privateKey, {algorithm: this.args.algorithm});
  }
  
  async close() {
    console.log('Closing connection to MQTT. Goodbye!');
    this.client.on("message", () => {});
    await this.client.end();
  }

  async publish(message, qos = 1) {
      let published = false;
      const payload = `${this.args.deviceId}/${message}`;
      console.log('Publishing message:', payload);
      this.client.publish(this.mqttTopic, payload, {qos: qos}, err => {
        if (err) {
          console.log(err);
        }
        published = true;
      });
      await sleep.wait(0, 100, async () => {return published});
      console.log("published.");
      return;
  };
}

// Usage:
//   gcpmqtt = new GcpMqtt();

module.exports = GcpMqtt;