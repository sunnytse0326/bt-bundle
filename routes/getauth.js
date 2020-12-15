var express = require('express');
var router = express.Router();
var braintree = require('braintree');

router.get('/', function(req, res, next) {
  var gateway = braintree.connect({
    environment: braintree.Environment.Sandbox,
    // Use your own credentials from the sandbox Control Panel here
    merchantId: 'fgbw23g9cwm847px',
    publicKey: 'nygrcphd83kgqj6w',
    privateKey: '8d8f2a43045fa17464c24674981aadd3'
  });

  gateway.clientToken.generate({
    customerId: "test111"
  }, (err, response) => {
    res.send({token: response.clientToken});
  })
});

module.exports = router;