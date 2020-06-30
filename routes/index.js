const jwtDecode = require('jwt-decode');
const security = require('./security');
const sfmcHelper = require('./sfmchelper');
const sfmc = require('./sfmc');

exports.login = (req, res) => {

    try {
        let stateParam = '&state=journey';
        if (req.query.state !== undefined) {
            stateParam = `&state=${req.query.state}`;
        }
        if (req.query.code === undefined) {
            const redirectUri = `${process.env.baseAuth}/v2/authorize?response_type=code&client_id=${process.env.sfmcClientId}&redirect_uri=${process.env.redirectURI}${stateParam}`;
            res.redirect(redirectUri);

        } else {

            const state = stateParam.split('=')[1];
            const tssd = req.query.tssd === undefined ? process.env.tssd : req.query.tssd;
            const request = {
                body: {
                    code: req.query.code,
                    tssd,
                },
            };

            var token = security.parseTojwtEncripted(request);
            sfmcHelper.authorize(request, (e, r) => {
                if (e) {
                    res.status(400).end(e);
                    return;
                }
                console.log(r);
                const Request2 = {
                    body: {
                        refresh_token: r.refreshToken,
                        eid: r.bussinessUnitInfo.enterprise_id,
                        mid: r.bussinessUnitInfo.member_id,
                    },

                };

                const mid = r.bussinessUnitInfo.member_id;
                console.log(mid);
                // eslint-disable-next-line consistent-return
                sfmcHelper.getCompletedCampaigns(Request2, (error, response) => {
                    if (!error) {
                        console.log(response.OverallStatus);
                        if (response.OverallStatus !== 'OK') {
                            sfmc.createDataExtensions(Request2)
                                .then((resp) => {
                                    console.log(resp);

                                    const encryptedToken = security.parseTojwtEncripted(resp);
                                    res.cookie('stoken', encryptedToken, { maxAge: 900000, httpOnly: false });
                                    let view = `/Home`;
                                    res.setheader('stoken', encryptedToken);
                                    return res.redirect(view);
                                })
                                .catch((err) => { console.log(err); });
                        } else {
                            console.log(Request2);

                            console.log(response);
                            // crear las dataextensions
                            let view = `/marketingapp/?eid=${Request2.body.eid}&rt=${response.refresh_token}&mid=${Request2.body.mid}`;



                            return res.redirect(view);
                        }
                    }
                });
                console.log(r);
            });
        }




    } catch (err) {
        return res.status(500).send(err);
    }

};

exports.logout = (req) => {
    req.session.token = '';
};