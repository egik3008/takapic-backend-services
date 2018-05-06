const path = require('path');
const dotenv = require('dotenv');
const express = require('express');
const braintree = require('braintree');

dotenv.config({ path: path.dirname(require.main.filename) + '/.env' });

const router = express.Router();
const gateway = braintree.connect({
  environment: braintree.Environment[process.env.BT_ENVIRONMENT],
  merchantId: process.env.BT_MERCHANT_ID,
  publicKey: process.env.BT_PUBLIC_KEY,
  privateKey: process.env.BT_PRIVATE_KEY
});

router.post('/payment/create', function (request, response) {
  const configs = {
    amount: request.body.amount,
    paymentMethodNonce: request.body.paymentMethodNonce,
    options: {
      submitForSettlement: true
    }
  };

  if (request.body.paymentType === 'PayPalAccount') {
    configs.options.paypal = {
      description: 'Payment for photographer reservation #' + request.body.orderId
    };

    gateway.transaction.sale(configs, function (error, result) {
      if (result) {
        response.send(result);
      } else {
        response.status(500).send(error);
      }
    });

  } else {
    configs.orderId = request.body.orderId;

    // Create new customer
    gateway.customer.create({
      firstName: request.body.travellerDisplayName,
      lastName: request.body.travellerDisplayName
    }, function (error, result) {

      // Successfuly create new customer - then verify the credit card
      if (result.success) {
        const customerId = result.customer.id;

        gateway.paymentMethod.create({
          customerId: customerId,
          paymentMethodNonce: request.body.paymentMethodNonce,
          options: {
            verifyCard: true
          }
        }, function (errorA, resultA) {

          if (resultA.success) {
            console.log('CC verified success - Create transaction');
            // Credit card verification return success - then create the transaction
            delete configs.paymentMethodNonce;
            configs.paymentMethodToken = resultA.creditCard.token;

            gateway.transaction.sale(configs, function (errorB, resultB) {
              if (resultB) {

                // Delete the created customer
                gateway.customer.delete(customerId, function (errorCustomerDelete) {});
                response.send(resultB);

              } else {
                console.log('Create transaction failed');
                response.status(500).send(resultB);
              }
            });

          } else {
            console.log('CC not verified');
            // Delete the created customer
            gateway.customer.delete(customerId, function (errorCustomerDelete) {});
            response.status(500).send(resultA);
          }

        });

      } else {
        console.log('Failed to create customer data');
        response.status(500).send(result);
      }

    });
  }
});

module.exports = router;
