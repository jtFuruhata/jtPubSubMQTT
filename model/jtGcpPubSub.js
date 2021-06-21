/**
 * @file Google Cloud Pub/Sub module
 *      jtGcpPubSub.js
 * @module ./jtGcpPubSub
 * @version 0.01.210619a
 * @author TANAHASHI, Jiro (aka jtFuruhata) <jt@do-johodai.ac.jp>
 * @license MIT (see 'LICENSE' file)
 * @copyright (C) 2021 jtLab, Hokkaido Information University
 */
const sleep = require("./jtSleep");
const fs = require('fs');
const {PubSub} = require('@google-cloud/pubsub');

class GcpPubSub{
  constructor() {
    this.pubSubClient = new PubSub();
    
    this.cert = 'cert';
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
    if (!fs.existsSync(`${this.cert}/settings.json`)) {
      this.settings = '.';
    }
    if (!fs.existsSync(`${this.cert}/settings.json`)) {
      console.log("ERROR: settings.json is not found.");
      this.serviceAccountKeyFile = '';
      this.serviceAccountKey = undefined;
    } else {
      this.args=JSON.parse(fs.readFileSync(`${this.cert}/settings.json`, 'UTF-8'));
      this.subscriptionName = `projects/${this.args.projectId}/subscriptions/${this.args.subscriptionId}`;
      this.subscription = {};
      this.serviceAccountKeyFile = `${this.cert}/${this.args.serviceAccount}.json`;

      if (fs.existsSync(this.serviceAccountKeyFile)) {
        console.log(`service account key: ${this.args.serviceAccount}.json`);
      } else {
        console.log(`create service account key ${this.args.serviceAccount}.json`);
        let privateKey = fs.readFileSync(`cert/${this.args.privateKeyFile}`).toString();

        const serviceAccountKey = {
          "type": "service_account",
          "project_id": this.args.projectId,
          "private_key_id": this.args.privateKeyId,
          "private_key": privateKey,
          "client_email": `${this.args.serviceAccount}@${this.args.projectId}.iam.gserviceaccount.com`,
          "client_id": this.args.clientId,
          "auth_uri": "https://accounts.google.com/o/oauth2/auth",
          "token_uri": "https://oauth2.googleapis.com/token",
          "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
          "client_x509_cert_url": `https://www.googleapis.com/robot/v1/metadata/x509/${this.args.serviceAccount}%40${this.args.projectId}.iam.gserviceaccount.com`
        };
        fs.writeFileSync(this.serviceAccountKeyFile, JSON.stringify(serviceAccountKey,null,2));
      }

      process.env.GOOGLE_APPLICATION_CREDENTIALS = this.serviceAccountKeyFile;
    }
  }

  subscribe(messageCallback = this.messageHandler) {
    this.subscription = this.pubSubClient.subscription(this.subscriptionName);
    this.subscription.on('message', messageCallback);
  }

  unsubscribe(messageCallback = this.messageHandler){
    this.subscription.removeListener('message', messageCallback);
  }

  messageHandler(message) {
    console.log(`Received message ${message.id}:`);
    console.log(`\tData: ${message.data}`);
    console.log(`\tAttributes: ${message.attributes}`);
    message.ack();
  }
}

async function main(){
  const pubsub = new GcpPubSub();
  pubsub.subscribe()
  await sleep(10 * 1000);
  pubsub.unsubscribe()
}

main()

module.exports = GcpPubSub;