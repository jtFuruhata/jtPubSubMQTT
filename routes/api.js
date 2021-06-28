const express = require('express');
const router = express.Router();
const GcpMqtt = require('../model/jtGcpIotMqtt');
const sleep = require('../model/jtSleep');

router.post('/temperature', function(req, res, next) {
  temperatureResponser(req, res, next);
});

async function temperatureResponser(req, res, next) {
  console.log(req.body.data);
  const gcpmqtt = new GcpMqtt(); 
  await gcpmqtt.open();
  await gcpmqtt.publish(`temperature/${req.body.data}`);
  await gcpmqtt.close();

  res.send(req.body.data);
}

module.exports = router;
