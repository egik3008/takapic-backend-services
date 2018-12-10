const path = require('path')
const dotenv = require('dotenv')
const express = require('express');
const router = express.Router();
const firebase = require('firebase');
const firebaseAdmin = require('../../commons/firebaseAdmin');

dotenv.config({ path: path.dirname(require.main.filename) + '/.env' });

const VOUCHERS = require('../../constants/vouchersConstants');

router.post('/apply', function (request, response) {
    const {
        code, uid, tz
    } = request.body;

    const db = firebaseAdmin.database();
    db.ref(VOUCHERS.NODE_VOUCHER)
    .orderByChild('code')
        .equalTo(code)
        .once('value')
        .then(snap => {
            const result = snap.val();
            if (result) {
                let voucherObj = result[Object.keys(result)[0]];
                let messageTitle = "";
                let message = "";
                let status = true;
                let voucher = {
                    code: voucherObj.code,
                    amountIDR: voucherObj.amountIDR,
                    amountUSD: voucherObj.amountUSD,
                    type: voucherObj.type
                };
                // const validStart
                // cek user valid date
                
                // cek voucher usage limit per user
                if (voucher.usageLimitUser) {
                    
                }


                // voucher valid
                response.status(200).json({
                    status,
                    voucher,
                    messageTitle,
                    message,
                })
            } else {
                // voucher not found
                response.status(200).json({
                    status: false,
                    messageTitle: "Voucher Code didn't work",
                    message: 'Pleas re-enter your voucher code'
                })
            }
        }).catch(error => {
            response.status(500).json({
                status: false,
                message: error.message
            })
        })
})


module.exports = router;