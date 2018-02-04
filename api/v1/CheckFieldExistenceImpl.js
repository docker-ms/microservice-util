'use strict';

const CommonImport = require('../../util/CommonImport');

class CheckFieldExistenceImpl {

  static checkFieldExistence(call, callback) {

    const dbPool = CommonImport.utils.pickRandomly(global.DB_POOLS);
    const usersCollection = dbPool.collection(global.RELATED_MONGODB_COLLECTIONS.usersCollectionName);

    let query;

    switch (call.request.field) {
      case 'mobilePhone':
        query = {
          'mobilePhone.mobilePhoneNoWithCountryCallingCode': call.request.mobilePhone.mobilePhoneNoWithCountryCallingCode
        };
        break;
      default:
        query = {
          [`${call.request.field}`]: call.request[call.request.field]
        };
    }

    CommonImport.utils.bluebirdRetryExecutor(() => {
      return usersCollection.count(query, {
        limit: 1
      });
    }, {}).then((res) => {
      if (res) {
        return CommonImport.Promise.reject(new CommonImport.errors.UniqueRestriction.DuplicateVal4UniqueField());
      } else {
        callback(null, {res: false});
      }
    }).catch((err) => {
      CommonImport.utils.apiImplCommonErrorHandler(err, CommonImport.errors, callback);
    });

  }

}

module.exports = CheckFieldExistenceImpl;


