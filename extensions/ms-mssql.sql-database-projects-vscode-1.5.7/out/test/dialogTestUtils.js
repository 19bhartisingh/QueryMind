"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockConnectionInfo = exports.MockVscodeMssqlIExtension = void 0;
exports.createTestUtils = createTestUtils;
const TypeMoq = require("typemoq");
class MockVscodeMssqlIExtension {
    sqlToolsServicePath = "";
    dacFx;
    sqlProjects;
    schemaCompare;
    azureAccountService;
    azureResourceService;
    constructor() {
        this.dacFx = TypeMoq.Mock.ofType().object;
        this.sqlProjects = TypeMoq.Mock.ofType().object;
        this.schemaCompare = TypeMoq.Mock.ofType().object;
        this.azureAccountService = TypeMoq.Mock.ofType().object;
        this.azureResourceService = TypeMoq.Mock.ofType().object;
    }
    promptForFirewallRule(_, __) {
        throw new Error("Method not implemented.");
    }
    sendRequest(_, __) {
        throw new Error("Method not implemented.");
    }
    promptForConnection(_) {
        throw new Error("Method not implemented.");
    }
    connect(_, __) {
        throw new Error("Method not implemented.");
    }
    listDatabases(_) {
        throw new Error("Method not implemented.");
    }
    getDatabaseNameFromTreeNode(_) {
        throw new Error("Method not implemented.");
    }
    getConnectionString(_, ___, _____) {
        throw new Error("Method not implemented.");
    }
    createConnectionDetails(_) {
        throw new Error("Method not implemented.");
    }
    getServerInfo(_) {
        throw new Error("Method not implemented.");
    }
}
exports.MockVscodeMssqlIExtension = MockVscodeMssqlIExtension;
function createTestUtils() {
    return {
        vscodeMssqlIExtension: TypeMoq.Mock.ofType(MockVscodeMssqlIExtension),
    };
}
// Mock test data
exports.mockConnectionInfo = {
    server: "Server",
    database: "Database",
    user: "User",
    password: "Placeholder",
    email: "test-email",
    accountId: "test-account-id",
    tenantId: "test-tenant-id",
    port: 1234,
    authenticationType: "SqlLogin" /* vscodeMssql.AuthenticationType.SqlLogin */,
    azureAccountToken: "",
    expiresOn: 0,
    encrypt: false,
    trustServerCertificate: false,
    hostNameInCertificate: "",
    persistSecurityInfo: false,
    connectTimeout: 15,
    connectRetryCount: 0,
    connectRetryInterval: 0,
    applicationName: "vscode-mssql",
    workstationId: "test",
    applicationIntent: "",
    currentLanguage: "",
    pooling: true,
    maxPoolSize: 15,
    minPoolSize: 0,
    loadBalanceTimeout: 0,
    replication: false,
    attachDbFilename: "",
    failoverPartner: "",
    multiSubnetFailover: false,
    multipleActiveResultSets: false,
    packetSize: 8192,
    typeSystemVersion: "Latest",
    connectionString: "",
    commandTimeout: undefined,
};
//# sourceMappingURL=dialogTestUtils.js.map