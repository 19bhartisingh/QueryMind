"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const templates = require("../src/templates/templates");
const testUtils_1 = require("./testUtils");
const templatesPath = (0, testUtils_1.getTemplatesRootPath)();
suite("Templates", function () {
    setup(async () => {
        templates.reset();
        await templates.loadTemplates(templatesPath);
    });
    test("Should throw error when attempting to use templates before loaded from file", async function () {
        templates.reset();
        await (0, testUtils_1.shouldThrowSpecificError)(() => templates.get("foobar"), "Templates must be loaded from file before attempting to use.");
        await (0, testUtils_1.shouldThrowSpecificError)(() => templates.get("foobar"), "Templates must be loaded from file before attempting to use.");
    });
    test("Should load all templates from files", async function () {
        // check expected counts
        const numScriptObjectTypes = 16;
        (0, chai_1.expect)(templates.projectScriptTypes().length).to.equal(numScriptObjectTypes, `Expected ${numScriptObjectTypes} script object types to be loaded`);
        (0, chai_1.expect)(Object.keys(templates.projectScriptTypes()).length).to.equal(numScriptObjectTypes, `Expected ${numScriptObjectTypes} keys in script object types`);
        // check everything has a value
        (0, chai_1.expect)(templates.newSqlProjectTemplate).to.not.be.undefined;
        for (const obj of templates.projectScriptTypes()) {
            (0, chai_1.expect)(obj.templateScript).to.not.be.undefined;
        }
    });
    test("Should have Schema item template", async function () {
        const schemaTemplate = templates.get("schema" /* ItemType.schema */);
        (0, chai_1.expect)(schemaTemplate, "Schema template should be defined").to.not.be.undefined;
        (0, chai_1.expect)(schemaTemplate.type, "Schema template type should match").to.equal("schema" /* ItemType.schema */);
        (0, chai_1.expect)(schemaTemplate.friendlyName, 'Schema template friendly name should be "Schema"').to.equal("Schema");
        (0, chai_1.expect)(schemaTemplate.templateScript, "Schema template should contain CREATE SCHEMA").to.include("CREATE SCHEMA");
        (0, chai_1.expect)(schemaTemplate.templateScript, "Schema template should contain @@OBJECT_NAME@@ placeholder").to.include("@@OBJECT_NAME@@");
    });
    test("Should have Table item template", async function () {
        const tableTemplate = templates.get("table" /* ItemType.table */);
        (0, chai_1.expect)(tableTemplate, "Table template should be defined").to.not.be.undefined;
        (0, chai_1.expect)(tableTemplate.type, "Table template type should match").to.equal("table" /* ItemType.table */);
        (0, chai_1.expect)(tableTemplate.templateScript, "Table template should contain CREATE TABLE").to.include("CREATE TABLE");
    });
    test("Should have View item template", async function () {
        const viewTemplate = templates.get("view" /* ItemType.view */);
        (0, chai_1.expect)(viewTemplate, "View template should be defined").to.not.be.undefined;
        (0, chai_1.expect)(viewTemplate.type, "View template type should match").to.equal("view" /* ItemType.view */);
        (0, chai_1.expect)(viewTemplate.templateScript, "View template should contain CREATE VIEW").to.include("CREATE VIEW");
    });
    test("Should have Stored Procedure item template", async function () {
        const spTemplate = templates.get("storedProcedure" /* ItemType.storedProcedure */);
        (0, chai_1.expect)(spTemplate, "Stored Procedure template should be defined").to.not.be.undefined;
        (0, chai_1.expect)(spTemplate.type, "Stored Procedure template type should match").to.equal("storedProcedure" /* ItemType.storedProcedure */);
        (0, chai_1.expect)(spTemplate.templateScript, "Stored Procedure template should contain CREATE PROCEDURE").to.include("CREATE PROCEDURE");
    });
    test("Should have Script item template", async function () {
        const scriptTemplate = templates.get("script" /* ItemType.script */);
        (0, chai_1.expect)(scriptTemplate, "Script template should be defined").to.not.be.undefined;
        (0, chai_1.expect)(scriptTemplate.type, "Script template type should match").to.equal("script" /* ItemType.script */);
    });
    test("Should have Data Source item template", async function () {
        const dataSourceTemplate = templates.get("dataSource" /* ItemType.dataSource */);
        (0, chai_1.expect)(dataSourceTemplate, "Data Source template should be defined").to.not.be.undefined;
        (0, chai_1.expect)(dataSourceTemplate.type, "Data Source template type should match").to.equal("dataSource" /* ItemType.dataSource */);
        (0, chai_1.expect)(dataSourceTemplate.templateScript, "Data Source template should contain CREATE EXTERNAL DATA SOURCE").to.include("CREATE EXTERNAL DATA SOURCE");
    });
    test("Should have File Format item template", async function () {
        const fileFormatTemplate = templates.get("fileFormat" /* ItemType.fileFormat */);
        (0, chai_1.expect)(fileFormatTemplate, "File Format template should be defined").to.not.be.undefined;
        (0, chai_1.expect)(fileFormatTemplate.type, "File Format template type should match").to.equal("fileFormat" /* ItemType.fileFormat */);
        (0, chai_1.expect)(fileFormatTemplate.templateScript, "File Format template should contain CREATE EXTERNAL FILE FORMAT").to.include("CREATE EXTERNAL FILE FORMAT");
    });
    test("Should have External Stream item template", async function () {
        const externalStreamTemplate = templates.get("externalStream" /* ItemType.externalStream */);
        (0, chai_1.expect)(externalStreamTemplate, "External Stream template should be defined").to.not.be
            .undefined;
        (0, chai_1.expect)(externalStreamTemplate.type, "External Stream template type should match").to.equal("externalStream" /* ItemType.externalStream */);
        (0, chai_1.expect)(externalStreamTemplate.templateScript, "External Stream template should contain CREATE EXTERNAL STREAM").to.include("CREATE EXTERNAL STREAM");
    });
    test("Should have External Streaming Job item template", async function () {
        const externalStreamingJobTemplate = templates.get("externalStreamingJob" /* ItemType.externalStreamingJob */);
        (0, chai_1.expect)(externalStreamingJobTemplate, "External Streaming Job template should be defined").to
            .not.be.undefined;
        (0, chai_1.expect)(externalStreamingJobTemplate.type, "External Streaming Job template type should match").to.equal("externalStreamingJob" /* ItemType.externalStreamingJob */);
        (0, chai_1.expect)(externalStreamingJobTemplate.templateScript, "External Streaming Job template should contain sp_create_streaming_job").to.include("sp_create_streaming_job");
    });
    test("Should have Pre-Deployment Script item template", async function () {
        const preDeployTemplate = templates.get("preDeployScript" /* ItemType.preDeployScript */);
        (0, chai_1.expect)(preDeployTemplate, "Pre-Deployment Script template should be defined").to.not.be
            .undefined;
        (0, chai_1.expect)(preDeployTemplate.type, "Pre-Deployment Script template type should match").to.equal("preDeployScript" /* ItemType.preDeployScript */);
    });
    test("Should have Post-Deployment Script item template", async function () {
        const postDeployTemplate = templates.get("postDeployScript" /* ItemType.postDeployScript */);
        (0, chai_1.expect)(postDeployTemplate, "Post-Deployment Script template should be defined").to.not.be
            .undefined;
        (0, chai_1.expect)(postDeployTemplate.type, "Post-Deployment Script template type should match").to.equal("postDeployScript" /* ItemType.postDeployScript */);
    });
    test("Should have Publish Profile item template", async function () {
        const publishProfileTemplate = templates.get("publishProfile" /* ItemType.publishProfile */);
        (0, chai_1.expect)(publishProfileTemplate, "Publish Profile template should be defined").to.not.be
            .undefined;
        (0, chai_1.expect)(publishProfileTemplate.type, "Publish Profile template type should match").to.equal("publishProfile" /* ItemType.publishProfile */);
        (0, chai_1.expect)(publishProfileTemplate.templateScript, "Publish Profile template should contain Project").to.include("Project");
    });
    test("Should have Table-Valued Function item template", async function () {
        const tvfTemplate = templates.get("tableValuedFunction" /* ItemType.tableValuedFunction */);
        (0, chai_1.expect)(tvfTemplate, "Table-Valued Function template should be defined").to.not.be.undefined;
        (0, chai_1.expect)(tvfTemplate.type, "Table-Valued Function template type should match").to.equal("tableValuedFunction" /* ItemType.tableValuedFunction */);
        (0, chai_1.expect)(tvfTemplate.templateScript, "Table-Valued Function template should contain CREATE FUNCTION").to.include("CREATE FUNCTION");
        (0, chai_1.expect)(tvfTemplate.templateScript, "Table-Valued Function template should contain RETURNS @returntable TABLE").to.include("RETURNS @returntable TABLE");
        (0, chai_1.expect)(tvfTemplate.templateScript, "Table-Valued Function template should contain @@SCHEMA_NAME@@ placeholder").to.include("@@SCHEMA_NAME@@");
        (0, chai_1.expect)(tvfTemplate.templateScript, "Table-Valued Function template should contain @@OBJECT_NAME@@ placeholder").to.include("@@OBJECT_NAME@@");
    });
    test("Should have Trigger item template", async function () {
        const triggerTemplate = templates.get("trigger" /* ItemType.trigger */);
        (0, chai_1.expect)(triggerTemplate, "Trigger template should be defined").to.not.be.undefined;
        (0, chai_1.expect)(triggerTemplate.type, "Trigger template type should match").to.equal("trigger" /* ItemType.trigger */);
        (0, chai_1.expect)(triggerTemplate.friendlyName, 'Trigger template friendly name should be "Trigger"').to.equal("Trigger");
        (0, chai_1.expect)(triggerTemplate.templateScript, "Trigger template should contain CREATE TRIGGER").to.include("CREATE TRIGGER");
        (0, chai_1.expect)(triggerTemplate.templateScript, "Trigger template should contain @@SCHEMA_NAME@@ placeholder").to.include("@@SCHEMA_NAME@@");
        (0, chai_1.expect)(triggerTemplate.templateScript, "Trigger template should contain @@OBJECT_NAME@@ placeholder").to.include("@@OBJECT_NAME@@");
    });
    test("Should have Database Trigger item template", async function () {
        const dbTriggerTemplate = templates.get("databaseTrigger" /* ItemType.databaseTrigger */);
        (0, chai_1.expect)(dbTriggerTemplate, "Database Trigger template should be defined").to.not.be
            .undefined;
        (0, chai_1.expect)(dbTriggerTemplate.type, "Database Trigger template type should match").to.equal("databaseTrigger" /* ItemType.databaseTrigger */);
        (0, chai_1.expect)(dbTriggerTemplate.friendlyName, 'Database Trigger template friendly name should be "Database Trigger"').to.equal("Database Trigger");
        (0, chai_1.expect)(dbTriggerTemplate.templateScript, "Database Trigger template should contain CREATE TRIGGER").to.include("CREATE TRIGGER");
        (0, chai_1.expect)(dbTriggerTemplate.templateScript, "Database Trigger template should contain ON DATABASE").to.include("ON DATABASE");
        (0, chai_1.expect)(dbTriggerTemplate.templateScript, "Database Trigger template should contain @@OBJECT_NAME@@ placeholder").to.include("@@OBJECT_NAME@@");
    });
    test("Should have Sequence item template", async function () {
        const sequenceTemplate = templates.get("sequence" /* ItemType.sequence */);
        (0, chai_1.expect)(sequenceTemplate, "Sequence template should be defined").to.not.be.undefined;
        (0, chai_1.expect)(sequenceTemplate.type, "Sequence template type should match").to.equal("sequence" /* ItemType.sequence */);
        (0, chai_1.expect)(sequenceTemplate.friendlyName, 'Sequence template friendly name should be "Sequence"').to.equal("Sequence");
        (0, chai_1.expect)(sequenceTemplate.templateScript, "Sequence template should contain CREATE SEQUENCE").to.include("CREATE SEQUENCE");
        (0, chai_1.expect)(sequenceTemplate.templateScript, "Sequence template should contain @@SCHEMA_NAME@@ placeholder").to.include("@@SCHEMA_NAME@@");
        (0, chai_1.expect)(sequenceTemplate.templateScript, "Sequence template should contain @@OBJECT_NAME@@ placeholder").to.include("@@OBJECT_NAME@@");
        (0, chai_1.expect)(sequenceTemplate.templateScript, "Sequence template should contain AS BIGINT").to.include("AS BIGINT");
        (0, chai_1.expect)(sequenceTemplate.templateScript, "Sequence template should contain START WITH").to.include("START WITH");
        (0, chai_1.expect)(sequenceTemplate.templateScript, "Sequence template should contain INCREMENT BY").to.include("INCREMENT BY");
    });
});
//# sourceMappingURL=templates.test.js.map