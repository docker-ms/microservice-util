'use strict';

const CommonImport = require('../../util/CommonImport');

class GenerateCsvTplImpl {

  static generateCsvTpl(call, callback) {

    const companyId = call.request[call.request.extraParams].companyId;

    const basePath = 'CsvTpl.' + call.request.tplId;

    const lang = call.request.lang;

    switch (call.request.tplId) {

      case 'UserBatchRegist':
        const _prepareCsvItems = () => {
          return {
            title: CommonImport.i18n.i18nInternal.__({phrase: `${basePath}.title`, locale: lang}, {}),

            forCompanyTitle: CommonImport.i18n.i18nInternal.__({phrase: `${basePath}.forCompany.title`, locale: lang}, {}),

            instructionTitle: CommonImport.i18n.i18nInternal.__({phrase: `${basePath}.instruction.title`, locale: lang}, {}),
            instructionItems: CommonImport.i18n.i18nInternal.__({phrase: `${basePath}.instruction.items`, locale: lang}, {}).join(',\n'),

            feedbackInLang: CommonImport.i18n.i18nInternal.__({phrase: `${basePath}.feedbackInLang`, locale: lang}, {
              FEEDBACK_IN_LANG: CommonImport.i18n.maps[lang]
            }),

            warning: CommonImport.i18n.i18nInternal.__({phrase: `${basePath}.warning`, locale: lang}, {}),

            items: CommonImport.i18n.i18nInternal.__({phrase: `${basePath}.items`, locale: lang}, {}).join(',')
          };
        };

        const dbPool = CommonImport.utils.pickRandomly(global.DB_POOLS);
        const companiesCollection = dbPool.collection(global.RELATED_MONGODB_COLLECTIONS.companiesCollectionName);

        CommonImport.Promise.join(
          companiesCollection.findOne({companyId: companyId}, {
            fields: {
              companyName: 1,
              email: 1
            }
          }),
          _prepareCsvItems(),
          (companyInfo, csvItems) => {
            const forCompanyCompanyId = CommonImport.i18n.i18nInternal.__({phrase: `${basePath}.forCompany.id`, locale: lang}, {
              COMPANY_ID: companyId
            });
            const forCompanyCompanyName = CommonImport.i18n.i18nInternal.__({phrase: `${basePath}.forCompany.name`, locale: lang}, {
              COMPANY_NAME: companyInfo.companyName
            });
            const {title, forCompanyTitle, instructionTitle, instructionItems, feedbackInLang, warning, items} = csvItems;
            callback(null, {
              csvStr: `${title}\n${forCompanyTitle}\n${forCompanyCompanyId}\n${forCompanyCompanyName}\n${instructionTitle}\n,${instructionItems}\n${feedbackInLang}\n\n${warning}\n\n${items}`,
              filename: CommonImport.i18n.i18nInternal.__({phrase: `${basePath}.filename`, locale: lang}, {})
            });
          }
        ).catch((err) => {
          // TODO: apply retry strategy here?
          callback({
            code: 1,
            details: (new CommonImport.errors.UnknownError()).errCode
          });
        });

        break;

      default:
        callback({
          code: 1,
          details: (new CommonImport.errors.InvalidField.InvalidCsvTplId()).errCode
        });

    }

  }

}

module.exports = GenerateCsvTplImpl;


