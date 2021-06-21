const express = require('express');
const router = express.Router();
const GcpMqtt = require('../model/jtGcpIotMqtt');
const sleep = require('../model/jtSleep');

/* GET home page. */
router.get('/', function(req, res, next) {
  indexRenderer(req, res, next);
});

async function indexRenderer(req, res, next) {
  const gcpmqtt = new GcpMqtt(); 
  await gcpmqtt.open();
  await gcpmqtt.publish("howdyFromIndex.js");
  await gcpmqtt.close();

  res.render('index', { title: gcpmqtt.args.registryId });  
}

module.exports = router;
