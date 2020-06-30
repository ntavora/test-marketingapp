const jwtDecode = require('jwt-decode');
const security = require('./security');
exports.login = (req, res) => {

    try {
        let stateParam = '&state=journey';
        if (req.query.state !== undefined) {
            stateParam = `&state=${req.query.state}`;
        }
        if (req.query.code === undefined) {
            res.redirect(`https://mc2h-lnx9y6g8mb6fw8vdx6d5cn8.auth.marketingcloudapis.com/v2/authorize?response_type=code&client_id=5cwinm5nfzk8mz6cmu16j1fh&redirect_uri=https://test-marketingapp.herokuapp.com/login${stateParam}`);
        } else {

            const { state } = req.query;
            const tenantSubdomain = req.query.tssd === undefined ? process.env.tssd : req.query.tssd;

            const request = {
                body: {
                    code: req.query.code,
                    tssd: tenantSubdomain,
                },
            };
            var token = security.parseTojwtEncripted(request);
            console.log("decoded " + security.getDecyptedObject(token));
            res.cookie('cookiename', token, { maxAge: 900000, httpOnly: true });
            if (state == "automation") {
                res.redirect('/home');
            }

            if (state == "journey") {
                res.redirect('/home');
            }
        }




    } catch (err) {
        return res.status(500).send(err);
    }

};

exports.logout = (req) => {
    req.session.token = '';
};