"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqlConnectionDataSource = void 0;
const dataSources_1 = require("./dataSources");
const constants = require("../../common/constants");
/**
 * Contains information about a SQL connection string data source`
 */
class SqlConnectionDataSource extends dataSources_1.DataSource {
    connectionString;
    connectionStringComponents = {};
    static get type() {
        return "sql_connection_string";
    }
    get type() {
        return SqlConnectionDataSource.type;
    }
    get typeFriendlyName() {
        return constants.sqlConnectionStringFriendly;
    }
    get server() {
        return this.getSetting(constants.dataSourceSetting);
    }
    get database() {
        return this.getSetting(constants.initialCatalogSetting);
    }
    get integratedSecurity() {
        return this.getSetting(constants.integratedSecuritySetting)?.toLowerCase() === "true";
    }
    get azureMFA() {
        return this.getSetting(constants.authenticationSetting)
            ?.toLowerCase()
            .includes(constants.activeDirectoryInteractive);
    }
    get authType() {
        if (this.azureMFA) {
            return "AzureMFA" /* vscodeMssql.AuthenticationType.AzureMFA */;
        }
        else if (this.integratedSecurity) {
            return "Integrated" /* vscodeMssql.AuthenticationType.Integrated */;
        }
        else {
            return "SqlAuth";
        }
    }
    get username() {
        return this.getSetting(constants.userIdSetting);
    }
    get password() {
        // TODO: secure password storage; https://github.com/microsoft/azuredatastudio/issues/10561
        return this.getSetting(constants.passwordSetting);
    }
    get encrypt() {
        return this.getSetting(constants.encryptSetting);
    }
    get trustServerCertificate() {
        return this.getSetting(constants.trustServerCertificateSetting);
    }
    get hostnameInCertificate() {
        return this.getSetting(constants.hostnameInCertificateSetting);
    }
    constructor(name, connectionString) {
        super(name);
        // TODO: do we have a common construct for connection strings?
        this.connectionString = connectionString;
        const components = this.connectionString.split(";").filter((c) => c !== "");
        for (const component of components) {
            const split = component.split("=");
            if (split.length !== 2) {
                throw new Error(constants.invalidSqlConnectionString);
            }
            this.connectionStringComponents[split[0].toLocaleLowerCase()] = split[1];
        }
    }
    getSetting(settingName) {
        return this.connectionStringComponents[settingName.toLocaleLowerCase()];
    }
    static fromJson(json) {
        return new SqlConnectionDataSource(json.name, json.data.connectionString);
    }
}
exports.SqlConnectionDataSource = SqlConnectionDataSource;
//# sourceMappingURL=sqlConnectionStringSource.js.map