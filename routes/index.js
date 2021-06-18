const express = require('express');
const router = express.Router();
const GcpMqtt = require('../model/jtGcpMqtt');

/* GET home page. */
router.get('/', function(req, res, next) {
  indexRenderer(req, res, next);
});

function indexRenderer(req, res, next) {
  const gcpmqtt = new GcpMqtt();  

  res.render('index', { title: gcpmqtt.args.registryId });  
}

module.exports = router;
