/* eslint-disable consistent-return */
/* eslint-disable prefer-promise-reject-errors */
/* eslint-disable max-len */
const sfmcHelper = require('./sfmchelper');
const request = require('request');
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

const ComplexFilter = (lProperty,
    lSimpleOperator,
    lvalue,
    logicalOperator,
    rProperty,
    rSimpleOperator,
    rvalue) => {
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
const CreateRequestDE = (enterpriceId,
    deName,
    categoryID,
    isSendable,
    fields) => {
    const CreateRequest = {
        Options: {
            SaveOptions: {},
            Client: {
                ID: enterpriceId,
            },
        },
        Objects: {
            attributes: {
                'xmlns:ns1': 'http://exacttarget.com/wsdl/partnerAPI',
                'xsi:type': 'ns1:DataExtension',
            },
            Client: {
                ID: enterpriceId,
            },

            Name: deName,
            CustomerKey: deName,
            CategoryID: categoryID,
            IsSendable: isSendable,
            IsTestable: false,
            Fields: fields,
        },
    };
    return CreateRequest;
};

const CreateRequestFolder = (name, parentId) => {
    const CreateRequest = {
        Options: {
            SaveOptions: {},
        },
        Objects: {
            attributes: {
                'xsi:type': 'DataFolder',
                'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
            },
            Name: name,
            ContentType: 'dataextension',
            Description: name,
            AllowChildren: true,
            AllowChildrenSpecified: true,
            IsEditable: true,
            IsEditableSpecified: true,
            ParentFolder: {
                ID: parentId,
                IDSpecified: true,
            },
        },
    };
    return CreateRequest;
};

const retrieveFolder = (enterpriceId, name, client) => new Promise(((resolve, reject) => {
    const requestObject = buildRetrieveRequestObject(
        enterpriceId,
        'DataFolder',
        ['ID'],
        ComplexFilter('Name', 'equals', name, 'AND', 'ContentType', 'equals', 'dataextension'),
    );
    console.log(requestObject);
    client.Retrieve(requestObject, (err, response) => {
        if (err) { return reject(JSON.stringify(err)); }

        console.log(response);
        return resolve(response);
    });
}));

const GetFolderID = (enterpriseId, client) => new Promise(((resolve, reject) => {
    if (client === undefined) {
        return reject('Invalid Client');
    }

    retrieveFolder(enterpriseId, 'EALink', client)
        .then((r) => {
            let response;
            if (r.Results !== undefined) {
                response = {
                    categoryID: r.Results[0].ID,
                };
                return resolve(response);
            }
            retrieveFolder(enterpriseId, 'Data Extensions', client)
                .then((result) => {
                    if (result.Results !== undefined) {
                        const parentId = result.Results[0].ID;
                        client.Create(CreateRequestFolder('EALink', parentId), (err, res) => {
                            if (err) {
                                return reject(err);
                            }

                            if (res.Results !== undefined) {
                                response = {
                                    categoryID: res.Results[0].NewID,
                                };
                            }
                            resolve(response);
                        });
                    } else {
                        return reject("Error: can't retrieve  Data Extensions");
                    }
                })
                .catch((err1) => reject(err1));
        })
        .catch((e) => reject(e));
}));

exports.createDataExtensions = async (req) => new Promise(((resolve, reject) => {
    sfmcHelper.createSoapClient(req.body.refresh_token, (e, response) => {
        if (!e) {
            response.eid = req.body.eid;
            GetFolderID(req.body.eid, response.client)
                .then((r1) => {
                    console.log(r1);
                    const CreateFeederDEObj = CreateRequestDE(req.body.eid, 'Feeder Campaigns', r1.categoryID, false, {
                        Field: [
                            {
                                Name: 'RowKey',
                                Description: 'RowKey',
                                IsPrimaryKey: true,
                                MaxLength: 100,
                                FieldType: 'Text',
                                IsRequired: true,
                            },
                            {
                                Name: 'JourneyID',
                                Description: 'JourneyID',
                                IsPrimaryKey: false,
                                FieldType: 'Text',
                                MaxLength: 100,
                                IsRequired: false,
                            },
                            {
                                Name: 'JourneyName',
                                Description: 'JourneyName',
                                IsPrimaryKey: false,
                                FieldType: 'Text',
                                MaxLength: 100,
                                IsRequired: false,
                            },
                            {
                                Name: 'Completed',
                                Description: 'Completed',
                                IsPrimaryKey: false,
                                FieldType: 'Boolean',
                                IsRequired: true,
                                DefaultValue: false,
                            }
                        ],
                    });
                    const CreateJourneyActivityObj = CreateRequestDE(req.body.eid, 'Journey Activity', r1.categoryID, false, {
                        Field: [
                            {
                                Name: 'RowKey',
                                Description: 'RowKey',
                                IsPrimaryKey: true,
                                MaxLength: 100,
                                FieldType: 'Text',
                                IsRequired: true,
                            },
                            {
                                Name: 'JourneyID',
                                Description: 'JourneyID',
                                IsPrimaryKey: false,
                                FieldType: 'Text',
                                MaxLength: 100,
                                IsRequired: false,
                            },
                            {
                                Name: 'Completed',
                                Description: 'Completed',
                                IsPrimaryKey: false,
                                FieldType: 'Boolean',
                                IsRequired: true,
                                DefaultValue: false,
                            }
                        ],
                    });

                    sfmcHelper.createDataExtension(response.client, CreateFeederDEObj)
                        .then((r2) => {
                            if (r2.Results[0].StatusCode === 'OK') {
                                return sfmcHelper.createDataExtension(response.client, CreateJourneyActivityObj);
                            }
                        })
                        .then((r3) => {
                            if (r3.Results[0].StatusCode === 'OK') {
                                return resolve(response);
                            }
                        })
                        .catch((err) => reject(err));
                })
                .catch((err) => {
                    console.log(err);
                });
        } else {
            return reject(e);
        }
    });
}));


exports.TokenContext = (req,resp)=>{
    console.log(req.body);
    if(req.body == undefined){
        return resp.status(401).send("Bad request");
    }

    var options = {
      'method': 'GET',
      'url': req.body.endpoint,
      'headers': {
        'Authorization': req.body.auth
      }
    };
    request(options, function (error, response) { 
      if (error) return resp.status(200).send(error);
      
      return resp.status(200).send(response.body);
    });
}

exports.UpsertCampaignRow = (req, resp) => {
    console.log('upsert row console log');
    sfmcHelper.createSoapClient(req.body.refresh_token, (e, response) => {
        if (e) { return resp.status(500).end(e); }
        const Properties = [ {
            Name: 'Completed',
            Value: false,
        }];
        const UpdateRequest = sfmcHelper.UpdateRequestObject('Feeder Campaigns', [{
            Name: 'RowKey',
            Value: req.body.id
        }], Properties);
        console.log(UpdateRequest);
        sfmcHelper.upsertDataextensionRow(response.client, UpdateRequest)
            .then((body) => {
                if (body.StatusCode !== undefined) {
                    const r1 = {
                        refresh_token: response.refresh_token,
                        Status: body.StatusCode[0],
                    };
                    return resp.send(200, r1);
                }
                return resp.send(200, body);
            }).catch((err) => resp.send(400, err));
    });
};


exports.UpsertDecisionRow = (req, resp) => {
    console.log('upsert row console log');
    sfmcHelper.createSoapClient(req.body.refresh_token, (e, response) => {
        if (e) { return resp.status(500).end(e); }
        const Properties = [ {
            Name: 'Completed',
            Value: false,
        }];
        const UpdateRequest = sfmcHelper.UpdateRequestObject('Journey Activity', [{
            Name: 'RowKey',
            Value: req.body.id
        }], Properties);
        console.log(UpdateRequest);
        sfmcHelper.upsertDataextensionRow(response.client, UpdateRequest)
            .then((body) => {
                if (body.StatusCode !== undefined) {
                    const r1 = {
                        refresh_token: response.refresh_token,
                        Status: body.StatusCode[0],
                    };
                    return resp.send(200, r1);
                }
                return resp.send(200, body);
            }).catch((err) => resp.send(400, err));
    });
};