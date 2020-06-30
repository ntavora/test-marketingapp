const jwtDecode = require('jwt-decode');
var jwt = require('jsonwebtoken');
var bcrypt = require('bcryptjs');
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
            var sign = 'v-7JCVJsWAFbQZqIeE2BOW9oXU2NjZTU9kWn5QnxvasiS7W-JRt7XwEbPOH0vJ2wzx33_aPGWKcsxMRGijg9L2Uf425soBc1_iYzCmPYYpmdkhnKQY3SUuJjsaSwki64hEIOEYNSWDqyRJJ15GnOJcW_HhMn-Jhwgynz7aNlaK_nlb9phBU0C0GRabjfcQyifovxbhmaVzc_vR7pVX-lV5-V98Ijldp4GiCKbL_W6OrGGor_GgsuGYnCysWykg2'
            var token = jwt.sign(JSON.parse(request), sign);
            console.log("decoded " + jwt.decode(token, sign));
            console.log(token);
            const hashedPassword = bcrypt.hashSync(token, 'kamicASE');
            console.log("encrypted value " + hashedPassword);
            res.cookie('cookiename', hashedPassword, { maxAge: 900000, httpOnly: true });
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