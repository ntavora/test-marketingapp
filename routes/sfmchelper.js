/* eslint-disable prefer-promise-reject-errors */
/* eslint-disable consistent-return */
/* eslint-disable prefer-destructuring */
/* eslint-disable no-plusplus */

'use strict';

const request = require('request');
const soap = require('soap');
const parser = require('xml2js');
const { stripPrefix } = require('xml2js').processors;

function xmlToArray(rawResponse) {
  let data;
  parser.parseString(
    rawResponse,
    {
      tagNameProcessors: [stripPrefix],
    },
    (err, result) => {
      if (
        result.Envelope.Body[0].RetrieveResponseMsg[0].Results !== undefined
      ) {
        const rows = result.Envelope.Body[0].RetrieveResponseMsg[0].Results;

        if (rows.length >= 0) {
          const element = [];
          let index;
          for (index = 0; index < rows.length; index++) {
            const aux = rows[index].Properties[0].Property;

            const obj = {
              RowKey: '',
              JourneyID: '',
              JourneyName: '',
              Completed: '',
            };

            for (let j = 0; j < aux.length; j++) {
              const row = aux[j];

              if (row.Name[0] === 'RowKey') {
                obj.RowKey = row.Value[0];
              }

              if (row.Name[0] === 'JourneyID') {
                obj.JourneyID = row.Value[0];
              }

              if (row.Name[0] === 'JourneyName') {
                obj.JourneyName = row.Value[0];
              }

              if (row.Name[0] === 'Completed') {
                obj.Completed = row.Value[0];
              }
            }
            element.push(obj);
          }
          console.log(element);
          data = element;
        }
      } // processed data
    }
  );
  return data;
}

function parseUpsertResponse(rawResponse) {
  let data;
  parser.parseString(
    rawResponse,
    {
      tagNameProcessors: [stripPrefix],
    },
    (err, result) => {
      console.log(result);
      if (result.Envelope.Body[0].UpdateResponse[0].Results !== undefined) {
        const rows = result.Envelope.Body[0].UpdateResponse[0].Results;
        data = rows[0];
        console.log(data);
      } // processed data
    }
  );
  return data;
}
exports.getAccessToken = (code) =>
  new Promise((resolve, reject) => {
    request(
      {
        url: process.env.authEndpoint,
        method: 'Post',
        json: {
          grant_type: 'authorization_code',
          code,
          client_id: process.env.sfmcClientId,
          client_secret: process.env.sfmcClientSecret,
          redirect_uri: process.env.redirectURI,
        },
      },
      (err, response, body) => {
        if (err) {
          return reject(JSON.stringify(err));
        }

        if (body.error !== undefined) {
          return reject(JSON.stringify(body));
        }

        return resolve(body);
      }
    );
  });

// eslint-disable-next-line camelcase
exports.refreshToken = (refresh_token) =>
  new Promise((resolve, reject) => {
    console.log(process.env.sfmcClientId);
    console.log(process.env.sfmcClientSecret);
    request(
      {
        url: process.env.authEndpoint,
        method: 'Post',
        json: {
          grant_type: 'refresh_token',
          client_id: process.env.sfmcClientId,
          client_secret: process.env.sfmcClientSecret,
          refresh_token: refresh_token,
        },
      },
      (err, response, body) => {
        if (err) {
          return reject(JSON.stringify(err));
        }

        if (body.error) {
          return reject(JSON.stringify(body.error));
        }

        return resolve(body);
      }
    );
  });

exports.authorize = async (req, res) => {
  await Promise.all([
    this.getAccessToken(req.body.code)
      .then((accessTokenbody) => {
        this.refreshToken(accessTokenbody.refresh_token)

          .then((refreshTokenbody) => {
            this.getUserInfo(refreshTokenbody.access_token)
              .then((getUserInfoBody) => {
                const getUserInfoResponse = JSON.parse(getUserInfoBody);
                const customResponse = {
                  bussinessUnitInfo: getUserInfoResponse.organization,
                  apiEndpoints: getUserInfoResponse.rest,
                  refreshToken: refreshTokenbody.refresh_token,
                };
                const response = customResponse;

                return res(null, response);
              })
              .catch((err2) => {
                console.log(err2);
                return res(err2, null);
              });
          })
          .catch((err1) => {
            console.log(err1);
            return res(err1, null);
          });
      })
      .catch((err) => {
        console.log(err);
        return res(err, null);
      }),
  ]);
};

exports.getUserInfo = (accessToken) =>
  new Promise((resolve, reject) => {
    request(
      {
        url: process.env.userInfo,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      },
      (err, response, body) => {
        if (err) return reject(err);
        resolve(body);
      }
    );
  });
exports.simpleFilter = (property, operator, value) => {
  const filter = {
    attributes: {
      'xsi:type': 'SimpleFilterPart',
    },
    Property: property,
    SimpleOperator: operator,
    Value: value,
  };

  return filter;
};
exports.retrieveRequest = (client, requestObject) =>
  new Promise((resolve, reject) => {
    if (client === undefined) {
      console.error('invalid soap client');
      return reject('client is required');
    }

    if (requestObject === undefined) {
      console.error('invalid requestObject');
      return reject('requestObject is required');
    }

    client.Retrieve(requestObject, (err, res, rawResponse) => {
      if (err) {
        console.error('ERROR DETAILS: ', err);
        return reject(err);
      }
      const data = xmlToArray(rawResponse);
      resolve(data);
    });
  });
exports.createSoapClient = (refreshToken, callback) => {
  if (refreshToken === undefined) {
    console.error('invalid refresh_token');
    callback('refresh_token is required', null);
  }

  this.refreshToken(refreshToken)
    .then((response) => {
      soap.createClient(
        `${response.soap_instance_url}etframework.wsdl`,
        {},
        (err, client) => {
          if (err) {
            callback(err, null);
          } else {
            client.addSoapHeader({
              fueloauth: response.access_token,
            });

            const customResponse = {
              client,
              refresh_token: response.refresh_token,
              eid: '',
            };
            return callback(null, customResponse);
          }
        }
      );
    })
    .catch((err1) => {
      callback(err1, null);
    });
};

exports.UpdateRequestObject = (customerkey, keys, Properties) => {
  const UpdateRequest = {
    Options: {
      SaveOptions: {
        SaveOption: {
          PropertyName: 'DataExtensionObject',
          SaveAction: 'UpdateAdd',
        },
      },
    },
    Objects: [
      {
        attributes: {
          'xsi:type': 'DataExtensionObject',
        },
        CustomerKey: customerkey,
        Keys: {
          Key: keys,
        },
        Properties: {
          Property: Properties,
        },
      },
    ],
  };
  return UpdateRequest;
};

exports.upsertDataextensionRow = (client, UpdateRequest) =>
  new Promise((resolve, reject) => {
    if (client === undefined) {
      console.error('invalid soap client');
      return reject('client is required');
    }

    if (UpdateRequest === undefined) {
      console.error('invalid UpdateRequest');
      return reject('UpdateRequest is required');
    }

    client.Update(UpdateRequest, (err, res, rawResponse) => {
      if (err) {
        console.error('ERROR DETAILS: ', err);
        return reject(err);
      }
      resolve(parseUpsertResponse(rawResponse));
    });
  });

exports.createDataExtension = (client, CreateRequest) =>
  new Promise((resolve, reject) => {
    client.Create(CreateRequest, (e, r) => {
      if (e) {
        return reject(JSON.stringify(e));
      }

      return resolve(r);
    });
  });

function buildRetrieveRequestObject(enterpriseId, ObjectType, props, filter) {
  const requestObject = {
    RetrieveRequest: {
      ClientIDs: {
        ClientID: enterpriseId,
      },
      ObjectType,
      Properties: props,
      Filter: filter,
    },
  };

  return requestObject;
}
const ComplexFilter = (
  lProperty,
  lSimpleOperator,
  lvalue,
  logicalOperator,
  rProperty,
  rSimpleOperator,
  rvalue
) => {
  const filter = {
    attributes: {
      'xsi:type': 'par:ComplexFilterPart',
      'xmlns:par': 'http://exacttarget.com/wsdl/partnerAPI',
    },
    LeftOperand: {
      attributes: {
        'xsi:type': 'par:SimpleFilterPart',
      },
      Property: lProperty,
      SimpleOperator: lSimpleOperator,
      Value: lvalue,
    },
    LogicalOperator: logicalOperator,
    RightOperand: {
      attributes: {
        'xsi:type': 'par:SimpleFilterPart',
      },
      Property: rProperty,
      SimpleOperator: rSimpleOperator,
      Value: rvalue,
    },
  };
  return filter;
};

exports.retrieveFolder = (enterpriceId, name, client) =>
  new Promise((resolve, reject) => {
    const requestObject = buildRetrieveRequestObject(
      enterpriceId,
      'DataFolder',
      ['ID'],
      ComplexFilter(
        'Name',
        'equals',
        name,
        'AND',
        'ContentType',
        'equals',
        'shared_dataextension'
      )
    );

    client.Retrieve(requestObject, (e, r) => {
      if (e) {
        return reject(JSON.stringify(e));
      }

      return resolve(r);
    });
  });

exports.getCompletedCampaigns = (req, resp) => {
  this.createSoapClient(req.body.refresh_token, (e, response) => {
    if (e) {
      return resp.status(500).end(e);
    }

    const requestObject = {
      RetrieveRequest: {
        ClientIDs: {
          ClientID: req.body.eid,
        },
        ObjectType: 'DataExtensionObject[Feeder Campaigns]',
        Properties: ['JourneyName', 'JourneyID', 'RowKey'],
        Filter: {
          attributes: {
            'xsi:type': 'SimpleFilterPart',
          },
          Property: 'Completed',
          SimpleOperator: 'equals',
          Value: true,
        },
      },
    };

    response.client.Retrieve(requestObject, (err, res, rawResponse, rawrequest, body) => {
      if (err) {
        console.error('ERROR DETAILS: ', err);
        return resp.send(400, err);
      }

      console.log('rawResponse: ' + rawResponse);
      console.log('rawRequest: ' + rawrequest.toString());
      console.log('body: ' + body);
      const r1 = {
        OverallStatus: res.OverallStatus,
        length: res.Results !== undefined ? res.Results.length : 0,
        refresh_token: response.refresh_token,
        enterpriseId: req.body.enterpriseId,
      };
      return resp(null, r1);
    });
  });
};

exports.CompletedCampaigns = (req, resp) => {
  this.createSoapClient(req.body.refresh_token, (e, response) => {
    if (e) {
      return resp.status(401).end(e);
    }

    const requestObject = {
      RetrieveRequest: {
        ClientIDs: {
          ClientID: req.body.eid,
        },
        ObjectType: 'DataExtensionObject[Feeder Campaigns]',
        Properties: ['JourneyName', 'JourneyID', 'RowKey'],
        Filter: {
          attributes: {
            'xsi:type': 'SimpleFilterPart',
          },
          Property: 'Completed',
          SimpleOperator: 'equals',
          Value: true,
        },
      },
    };

    response.client.Retrieve(requestObject, (err, res) => {
      if (err) {
        console.error('ERROR DETAILS: ', err);
        return resp.send(401, err);
      }
      const r1 = {
        OverallStatus: res.OverallStatus,
        length: res.Results !== undefined ? res.Results.length : 0,
        body: res.Results,
        refresh_token: response.refresh_token,
        enterpriseId: req.body.enterpriseId,
      };
      return resp.send(200, r1);
    });
  });
};

exports.CompletedJourneys = (req, resp) => {
  this.createSoapClient(req.body.refresh_token, (e, response) => {
    if (e) {
      return resp.status(401).end(e);
    }

    const requestObject = {
      RetrieveRequest: {
        ClientIDs: {
          ClientID: req.body.eid,
        },
        ObjectType: 'DataExtensionObject[Journey Activity]',
        Properties: ['JourneyID', 'RowKey'],
        Filter: {
          attributes: {
            'xsi:type': 'SimpleFilterPart',
          },
          Property: 'Completed',
          SimpleOperator: 'equals',
          Value: true,
        },
      },
    };

    response.client.Retrieve(requestObject, (err, res) => {
      if (err) {
        console.error('ERROR DETAILS: ', err);
        return resp.send(401, err);
      }
      const r1 = {
        OverallStatus: res.OverallStatus,
        length: res.Results !== undefined ? res.Results.length : 0,
        body: res.Results,
        refresh_token: response.refresh_token,
        enterpriseId: req.body.enterpriseId,
      };
      return resp.send(200, r1);
    });
  });
};

exports.ContactSynced = (req, resp) => {
  this.refreshToken(req.body.refresh_token)
    .then((response) => {
      var tenantSubdomain =
        req.body.tssd === undefined ? process.env.tssd : req.body.tssd;
      var endpoint = `https://${tenantSubdomain}.rest.marketingcloudapis.com/contacts/v1/addresses/count/?$pageSize=25&$page=1&$orderBy=contactKey%20ASC\n`;
      console.log('ContactSynced endpoint: ' + endpoint);
      request(
        {
          method: 'POST',
          url: endpoint,
          headers: {
            Authorization: `Bearer ${response.access_token}`,
          },
        },
        function (error, response) {
          if (error) return resp.send(401, error);
          console.log(response.body);
          return resp.send(200, response.body);
        }
      );
    })
    .catch((err1) => {
      callback(err1, null);
    });
};

exports.getFeederCampaignRowByJourneyID = (req, resp) => {

  var endpoint = req.body.endpoint + 'data/v1/customobjectdata/key/Feeder%20Campaigns/rowset?$filter=JourneyID%20eq%20\'' + req.body.id + '\'';
  var token = 'Bearer ' + req.body.token;
  var options = {
    'method': 'GET',
    'url': endpoint,
    'headers': {
      'Authorization': token,
      'Content-Type': 'application/json'
    }
  };
  request(options, function (error, response) {
    if (error) throw new Error(error);
    console.log(response.body);
    return resp.send(200, response.body);
  });

};

exports.searchRow = (req, resp) => {

  var endpoint = req.body.endpoint + 'data/v1/customobjectdata/key/Journey%20Activity/rowset?$filter=RowKey%20eq%20\'' + req.body.id + '\'';
  var token = 'Bearer ' + req.body.token;
  var options = {
    'method': 'GET',
    'url': endpoint,
    'headers': {
      'Authorization': token,
      'Content-Type': 'application/json'
    }
  };
  request(options, function (error, response) {
    if (error) throw new Error(error);
    console.log(response.body);
    return resp.send(200, response.body);
  });

};

exports.completedWizard = (req, resp) => {
  this.createSoapClient(req.body.refresh_token, (e, response) => {
    if (e) {
      return resp.status(401).end(e);
    }
    console.log("completedWizard");
    console.log(req.body);
    const requestObject = {
      RetrieveRequest: {
        ClientIDs: {
          ClientID: req.body.eid,
        },
        ObjectType: 'DataExtensionObject[Feeder Campaigns]',
        Properties: ['JourneyID', 'Completed', 'JourneyName'],
        Filter: {
          attributes: {
            'xsi:type': 'SimpleFilterPart',
          },
          Property: 'RowKey',
          SimpleOperator: 'equals',
          Value: req.body.id,
        },
      },
    };
console.log(requestObject);
    response.client.Retrieve(requestObject, (err, res) => {
      if (err) {
        console.error('ERROR DETAILS: ', err);
        return resp.send(401, err);
      }
      const r1 = {
        OverallStatus: res.OverallStatus,
        length: res.Results !== undefined ? res.Results.length : 0,
        body: res.Results,
        refresh_token: response.refresh_token,
        enterpriseId: req.body.enterpriseId,
      };
      return resp.send(200, r1);
    });
  });
}

exports.rrDataExtensionForSplitData = (req, resp) => {
  var endpoint = `${req.body.endpoint}data/v1/customobjectdata/key/${req.body.deName}/rowset?$Page=${req.body.page}`;
  var token = 'Bearer ' + req.body.token;
  var options = {
    'method': 'GET',
    'url': endpoint,
    'headers': {
      'Authorization': token,
      'Content-Type': 'application/json'
    }
  };
  request(options, function (error, response) {
    if (error) throw new Error(error);
    console.log(response.body);
    return resp.send(200, response.body);
  });
};

exports.rrDataExtensionForSplitDataByCity = (req, resp) => {
  var endpoint = `${req.body.endpoint}data/v1/customobjectdata/key/${req.body.deName}/rowset?$filter=${req.body.fieldName}%20eq%20${req.body.fieldvalue}`;
  var token = 'Bearer ' + req.body.token;
  var options = {
    'method': 'GET',
    'url': endpoint,
    'headers': {
      'Authorization': token,
      'Content-Type': 'application/json'
    }
  };
  request(options, function (error, response) {
    if (error) throw new Error(error);
    console.log(response.body);
    return resp.send(200, response.body);
  });
}; 

exports.searchByEmail = (req, resp) => {
  var endpoint = `${req.body.endpoint}data/v1/customobjectdata/key/${req.body.deName}/rowset?$filter=C_EmailAddress%20eq%20'`;
  endpoint += req.body.email + "\'";
  console.log(endpoint);
  var token = 'Bearer ' + req.body.token;
  var options = {
    'method': 'GET',
    'url': endpoint,
    'headers': {
      'Authorization': token,
      'Content-Type': 'application/json'
    }
  };
  request(options, function (error, response) {
    if (error) throw new Error(error);
    console.log(response.body);
    return resp.send(200, response.body);
  });
};

exports.insertRowSet = (req, resp) => {
  console.log(req.body);
  //var endpoint = req.body.endpoint + 'hub/v1/dataevents/key:Journey%20Activity/rowset';
  var token = 'Bearer ' + req.body.token;
  var bodyRequest = JSON.stringify([{
    "keys": {
      "RowKey": `${req.body.feederData.id}`
    },
    "values": {
      "JourneyID": `${req.body.feederData.journeyID}`,
      "Completed": false
    }
  }])
 
  request({
    'method': 'POST',
    'url': `${req.body.endpoint}hub/v1/dataevents/key:${req.body.deName}/rowset`,
    'headers': {
      'Authorization': token,
      'Content-Type': 'application/json'
    },
    body: bodyRequest
  }, function (error, response) {
    if (error) throw new Error(error);
    console.log(response.body);

    return resp.send(200, response.body);
  });
};

exports.upsertDecisionData = (req, resp) => {
  console.log("upsertDecisionData body request: " + req.body);
  request({
    'method': 'POST',
    'url': `${req.body.endpoint}hub/v1/dataevents/key:${req.body.deName}/rowset`,
    'headers': {
      'Authorization': `Bearer ${req.body.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(req.body.body)
  }, function (error, response) {
    if (error) throw new Error(error);
    console.log(response.body);
    return resp.send(200, response.body);
  });
}