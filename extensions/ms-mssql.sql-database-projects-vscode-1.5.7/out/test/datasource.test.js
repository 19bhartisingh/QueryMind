"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const should = require("should/as-function");
const baselines = require("./baselines/baselines");
const testUtils = require("./testUtils");
const sql = require("../src/models/dataSources/sqlConnectionStringSource");
const dataSources = require("../src/models/dataSources/dataSources");
suite("Data Sources: DataSource operations", function () {
    suiteSetup(async function () {
        await baselines.loadBaselines();
    });
    suiteTeardown(async function () {
        await testUtils.deleteGeneratedTestFolder();
    });
    test.skip("Should read DataSources from datasource.json", async function () {
        const dataSourcePath = await testUtils.createTestDataSources(this.test, baselines.openDataSourcesBaseline);
        const dataSourceList = await dataSources.load(dataSourcePath);
        should(dataSourceList.length).equal(3);
        should(dataSourceList[0].name).equal("Test Data Source 1");
        should(dataSourceList[0].type).equal(sql.SqlConnectionDataSource.type);
        should(dataSourceList[0].database).equal("testDb");
        should(dataSourceList[1].name).equal("My Other Data Source");
        should(dataSourceList[1].integratedSecurity).equal(false);
        should(dataSourceList[2].name).equal("AAD Interactive Data Source");
        should(dataSourceList[2].integratedSecurity).equal(false);
        should(dataSourceList[2].azureMFA).equal(true);
    });
    test("Should be able to create sql data source from connection strings with and without ending semicolon", function () {
        should.doesNotThrow(() => new sql.SqlConnectionDataSource("no ending semicolon", "Data Source=(LOCAL);Initial Catalog=testdb;User id=sa;Password=PLACEHOLDER"));
        should.doesNotThrow(() => new sql.SqlConnectionDataSource("ending in semicolon", "Data Source=(LOCAL);Initial Catalog=testdb;User id=sa;Password=PLACEHOLDER;"));
        should.throws(() => new sql.SqlConnectionDataSource("invalid extra equals sign", "Data Source=(LOCAL);Initial Catalog=testdb=extra;User id=sa;Password=PLACEHOLDER"));
    });
});
//# sourceMappingURL=datasource.test.js.map