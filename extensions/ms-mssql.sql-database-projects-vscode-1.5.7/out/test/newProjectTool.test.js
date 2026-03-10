"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const should = require("should/as-function");
const TypeMoq = require("typemoq");
const sinon = require("sinon");
const newProjectTool = require("../src/tools/newProjectTool");
const testUtils_1 = require("./testUtils");
let testFolderPath;
suite("NewProjectTool: New project tool tests", function () {
    setup(async function () {
        testFolderPath = await (0, testUtils_1.generateTestFolderPath)(this.test);
        const dataWorkspaceMock = TypeMoq.Mock.ofType();
        dataWorkspaceMock
            .setup((x) => x.defaultProjectSaveLocation)
            .returns(() => vscode.Uri.file(testFolderPath));
        sinon
            .stub(vscode.extensions, "getExtension")
            .returns({ exports: dataWorkspaceMock.object });
    });
    suiteTeardown(async function () {
        await (0, testUtils_1.deleteGeneratedTestFolder)();
    });
    teardown(async function () {
        sinon.restore();
    });
    test("Should generate correct default project names", async function () {
        should(newProjectTool.defaultProjectNameNewProj()).equal("DatabaseProject1");
        should(newProjectTool.defaultProjectNameFromDb("master")).equal("DatabaseProjectmaster");
    });
    test("Should auto-increment default project names for new projects", async function () {
        should(newProjectTool.defaultProjectNameNewProj()).equal("DatabaseProject1");
        await (0, testUtils_1.createTestFile)(this.test, "", "DatabaseProject1", testFolderPath);
        should(newProjectTool.defaultProjectNameNewProj()).equal("DatabaseProject2");
        await (0, testUtils_1.createTestFile)(this.test, "", "DatabaseProject2", testFolderPath);
        should(newProjectTool.defaultProjectNameNewProj()).equal("DatabaseProject3");
    });
    test("Should auto-increment default project names for create project for database", async function () {
        should(newProjectTool.defaultProjectNameFromDb("master")).equal("DatabaseProjectmaster");
        await (0, testUtils_1.createTestFile)(this.test, "", "DatabaseProjectmaster", testFolderPath);
        should(newProjectTool.defaultProjectNameFromDb("master")).equal("DatabaseProjectmaster2");
        await (0, testUtils_1.createTestFile)(this.test, "", "DatabaseProjectmaster2", testFolderPath);
        should(newProjectTool.defaultProjectNameFromDb("master")).equal("DatabaseProjectmaster3");
    });
    test("Should not return a project name if undefined is passed in ", async function () {
        should(newProjectTool.defaultProjectNameFromDb(undefined)).equal("");
        should(newProjectTool.defaultProjectNameFromDb("")).equal("");
        should(newProjectTool.defaultProjectNameFromDb("test")).equal("DatabaseProjecttest");
    });
});
//# sourceMappingURL=newProjectTool.test.js.map