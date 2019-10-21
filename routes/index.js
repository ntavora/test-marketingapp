const jwtDecode = require('jwt-decode');
exports.login = (req, res) => {

  try {
    console.log(req);
    res.redirect('https://mc2h-lnx9y6g8mb6fw8vdx6d5cn8.auth.marketingcloudapis.com/v2/authorize?response_type=code&client_id=jdw30r1q35v34m7x1iyqwerx&redirect_uri=https://appsflyer-mc-app-dev.herokuapp.com/home&scope=email_read%20email_write%20email_send&state=mystate');
  } catch (err) {
    return res.send(200, err);
  }
  
};

exports.logout = (req) => {
  req.session.token = '';
};
