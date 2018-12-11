const path = require('path')
const dotenv = require('dotenv')
const express = require('express');
const router = express.Router();
const firebaseAdmin = require('../../commons/firebaseAdmin');
const moment = require('moment-timezone');

dotenv.config({ path: path.dirname(require.main.filename) + '/.env' });

const VOUCHERS = require('../../constants/vouchersConstants');
const TZ = 'Asia/Jakarta';

router.post('/apply', function (request, response) {
    const {
        code, uid, tz, dest
    } = request.body;

    const db = firebaseAdmin.database();
    db.ref(VOUCHERS.NODE_VOUCHER)
    .orderByChild('code')
        .equalTo(code)
        .once('value')
        .then(snap => {
            const result = snap.val();
            if (result) {
                db.ref(VOUCHERS.NODE_REDEEM)
                .child(code)
                .once('value')
                .then(res => {
                    redeemData = res.val();
                    let redeemList = [];
                    if (redeemData) {
                        Object.keys(redeemData).forEach(key => {
                            let redem = redeemData[key];
                            redem.id = key;
                            redeemList.push(redem);
                        })
                    }

                    let voucherObj = result[Object.keys(result)[0]];
                    let status = true;
                    let messageTitle = "";
                    let message = "";
                    let voucher = {
                        code: voucherObj.code,
                        amountIDR: voucherObj.amountIDR,
                        amountUSD: voucherObj.amountUSD,
                        type: voucherObj.type
                    };

                    
                    // check user valid date
                    const serverDate = moment().tz(TZ);
                    const validStart = moment(voucherObj.validStart, 'M/D/Y', TZ);
                    const validEnd = moment(voucherObj.validEnd, 'M/D/Y', TZ).add(1, 'days')
                    
                    if (!((serverDate.isAfter(validStart)) && (serverDate.isBefore(validEnd)))) {
                        status = false;
                        voucher = null;
                        messageTitle = "Voucher code outdate";
                        message = "Your voucher code has been outdate";
                    }


                    // check destination rules
                    if (status && voucherObj.destinations) {
                        let notIcludeDest = true;
                        voucherObj.destinations.forEach(destination => {
                            if (dest.toLowerCase().includes(destination.toLowerCase())) {
                                notIcludeDest = false;
                                return;
                            }
                        });
                        if (notIcludeDest) {
                            status = false;
                            voucher = null;
                            messageTitle = "Voucher Invalid";
                            message = "The destination not included in code voucher";
                        }
                    }
                    
                    
                    // check voucher usage limit per user
                    if (status && voucherObj.usageLimitUser && redeemData) {
                        const usage = redeemList.filter((usage) => {
                            return usage.travellerId === uid
                        });

                        if (usage.length >= Number(voucherObj.usageLimitUser)) {
                            status = false;
                            voucher = null;
                            messageTitle = "Voucher code overly used";
                            message = "this code has reach his limit";
                        }
                    }

                    // check voucher usage limit per coupon
                    if (status && voucherObj.usageLimitVoucher && redeemData) {
                        if (redeemList.length >= Number(voucherObj.usageLimitVoucher)) {
                            status = false;
                            voucher = null;
                            messageTitle = "Voucher code overly used";
                            message = "this code has reach his limit";
                        }
                    }

                    // send voucher response
                    response.status(200).json({
                        status,
                        voucher,
                        messageTitle,
                        message,
                    })
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