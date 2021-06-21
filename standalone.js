const GcpMqtt = new require("./model/jtGcpIotMqtt");
const sleep = require('./model/jtSleep');

async function main(){
    const gcpmqtt = new GcpMqtt();
    await gcpmqtt.open();
    await gcpmqtt.publish("howdyFromStandslone.js");
    await gcpmqtt.close();
}

main();