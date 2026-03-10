"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const should = require("should/as-function");
const path = require("path");
const sinon = require("sinon");
const vscode = require("vscode");
const constants = require("../src/common/constants");
const utils = require("../src/common/utils");
const quickpickHelper = require("../src/dialogs/quickpickHelper");
const createProjectFromDatabaseQuickpick = require("../src/dialogs/createProjectFromDatabaseQuickpick");
const newProjectTool = require("../src/tools/newProjectTool");
const dialogTestUtils_1 = require("./dialogTestUtils");
const fs_1 = require("fs");
const testUtils_1 = require("./testUtils");
let testUtils;
const projectFilePath = "test";
const dbList = constants.systemDbs.concat([
    "OtherDatabase",
    "Database",
    "OtherDatabase2",
]);
suite("Create Project From Database Quickpick", () => {
    setup(function () {
        testUtils = (0, dialogTestUtils_1.createTestUtils)();
        sinon.stub(utils, "getVscodeMssqlApi").resolves(testUtils.vscodeMssqlIExtension.object); //set vscode mssql extension api
        sinon.stub(newProjectTool, "defaultProjectSaveLocation").returns(undefined);
        sinon
            .stub(newProjectTool, "defaultProjectNameFromDb")
            .returns("DatabaseProjectTestProject");
        sinon.stub(utils, "sanitizeStringForFilename").returns("TestProject");
    });
    teardown(async function () {
        sinon.restore();
        await (0, testUtils_1.deleteGeneratedTestFolder)();
    });
    test("Should prompt for connection and exit when connection is not selected", async function () {
        //promptForConnection spy to verify test
        const promptForConnectionSpy = sinon
            .stub(testUtils.vscodeMssqlIExtension.object, "promptForConnection")
            .withArgs(sinon.match.any)
            .resolves(undefined);
        //createProjectFromDatabaseQuickpick spy to verify test
        const createProjectFromDatabaseCallbackSpy = sinon.stub().resolves();
        await createProjectFromDatabaseQuickpick.createNewProjectFromDatabaseWithQuickpick(undefined, createProjectFromDatabaseCallbackSpy);
        //verify that prompt for connection was called
        should(promptForConnectionSpy.calledOnce).be.true("promptForConnection should have been called");
        //verify create project callback was not called, since promptForConnection was set to cancel (resolves to undefined)
        should(createProjectFromDatabaseCallbackSpy.notCalled).be.true("createProjectFromDatabaseCallback should not have been called");
    });
    test("Should not prompt for connection when connectionInfo is provided and exit when db is not selected", async function () {
        //promptForConnection spy to verify test
        const promptForConnectionSpy = sinon
            .stub(testUtils.vscodeMssqlIExtension.object, "promptForConnection")
            .withArgs(sinon.match.any)
            .resolves(undefined);
        //createProjectFromDatabaseQuickpick spy to verify test
        const createProjectFromDatabaseCallbackSpy = sinon.stub().resolves();
        //user chooses connection
        sinon.stub(testUtils.vscodeMssqlIExtension.object, "connect").resolves("testConnectionURI");
        sinon
            .stub(testUtils.vscodeMssqlIExtension.object, "listDatabases")
            .withArgs(sinon.match.any)
            .resolves(dbList);
        // user chooses to cancel when prompted for database
        sinon.stub(vscode.window, "showQuickPick").resolves(undefined);
        await createProjectFromDatabaseQuickpick.createNewProjectFromDatabaseWithQuickpick(dialogTestUtils_1.mockConnectionInfo, createProjectFromDatabaseCallbackSpy);
        //verify connection prompt wasn't presented, since connectionInfo was passed during the call
        should(promptForConnectionSpy.notCalled).be.true("promptForConnection should not be called when connectionInfo is provided");
        //verify create project callback was not called, since database wasn't selected (resolved to undefined)
        should(createProjectFromDatabaseCallbackSpy.notCalled).be.true("createProjectFromDatabaseCallback should not have been called");
    });
    test("Should exit when project name is not selected", async function () {
        //createProjectFromDatabaseQuickpick spy to verify test
        const createProjectFromDatabaseCallbackSpy = sinon.stub().resolves();
        //user chooses connection and database
        sinon.stub(testUtils.vscodeMssqlIExtension.object, "connect").resolves("testConnectionURI");
        sinon
            .stub(testUtils.vscodeMssqlIExtension.object, "listDatabases")
            .withArgs(sinon.match.any)
            .resolves(dbList);
        sinon.stub(vscode.window, "showQuickPick").resolves("Database");
        // user chooses to provide empty project name when prompted
        let inputBoxStub = sinon.stub(vscode.window, "showInputBox").resolves("");
        // user chooses to cancel when prompted to enter project name
        inputBoxStub.onSecondCall().resolves(undefined);
        await createProjectFromDatabaseQuickpick.createNewProjectFromDatabaseWithQuickpick(dialogTestUtils_1.mockConnectionInfo, createProjectFromDatabaseCallbackSpy);
        //verify create project callback was not called, since project name wasn't selected (resolved to undefined)
        should(createProjectFromDatabaseCallbackSpy.notCalled).be.true("createProjectFromDatabaseCallback should not have been called");
    });
    test("Should exit when project location is not selected", async function () {
        //createProjectFromDatabaseQuickpick spy to verify test
        const createProjectFromDatabaseCallbackSpy = sinon.stub().resolves();
        //user chooses connection and database
        sinon.stub(testUtils.vscodeMssqlIExtension.object, "connect").resolves("testConnectionURI");
        sinon
            .stub(testUtils.vscodeMssqlIExtension.object, "listDatabases")
            .withArgs(sinon.match.any)
            .resolves(dbList);
        let quickPickStub = sinon.stub(vscode.window, "showQuickPick").resolves("Database");
        //user chooses project name
        sinon.stub(vscode.window, "showInputBox").resolves("TestProject");
        //user chooses to exit
        quickPickStub.onSecondCall().resolves(undefined);
        await createProjectFromDatabaseQuickpick.createNewProjectFromDatabaseWithQuickpick(dialogTestUtils_1.mockConnectionInfo, createProjectFromDatabaseCallbackSpy);
        //verify create project callback was not called, since project location wasn't selected (resolved to undefined)
        should(createProjectFromDatabaseCallbackSpy.notCalled).be.true("createProjectFromDatabaseCallback should not have been called");
    });
    test("Should exit when project location is not selected (test repeatedness for project location)", async function () {
        //createProjectFromDatabaseQuickpick spy to verify test
        const createProjectFromDatabaseCallbackSpy = sinon.stub().resolves();
        //user chooses connection and database
        sinon.stub(testUtils.vscodeMssqlIExtension.object, "connect").resolves("testConnectionURI");
        sinon
            .stub(testUtils.vscodeMssqlIExtension.object, "listDatabases")
            .withArgs(sinon.match.any)
            .resolves(dbList);
        let quickPickStub = sinon.stub(vscode.window, "showQuickPick").resolves("Database");
        //user chooses project name
        sinon.stub(vscode.window, "showInputBox").resolves("TestProject");
        // user chooses to browse for folder
        quickPickStub.onSecondCall().resolves(constants.browseEllipsisWithIcon);
        // user doesn't choose any folder when prompted and exits the showOpenDialog
        let openDialogStub = sinon
            .stub(vscode.window, "showOpenDialog")
            .withArgs(sinon.match.any)
            .resolves(undefined);
        // user chooses to browse for folder
        quickPickStub.onThirdCall().resolves(constants.browseEllipsisWithIcon);
        // user doesn't choose any folder when prompted and exits the showOpenDialog
        openDialogStub.onSecondCall().resolves(undefined);
        // user chooses to browse for folder
        quickPickStub.onCall(3).resolves(constants.browseEllipsisWithIcon);
        // user doesn't choose any folder when prompted and exits the showOpenDialog
        openDialogStub.onSecondCall().resolves(undefined);
        //user chooses to exit
        quickPickStub.onCall(4).resolves(undefined);
        await createProjectFromDatabaseQuickpick.createNewProjectFromDatabaseWithQuickpick(dialogTestUtils_1.mockConnectionInfo, createProjectFromDatabaseCallbackSpy);
        //verify create project callback was not called, since project location wasn't selected (resolved to undefined)
        should(createProjectFromDatabaseCallbackSpy.notCalled).be.true("createProjectFromDatabaseCallback should not have been called");
    });
    test("Should exit when folder structure is not selected and folder is selected through browsing (test repeatedness for project location)", async function () {
        //createProjectFromDatabaseQuickpick spy to verify test
        const createProjectFromDatabaseCallbackSpy = sinon.stub().resolves();
        //user chooses connection and database
        sinon.stub(testUtils.vscodeMssqlIExtension.object, "connect").resolves("testConnectionURI");
        sinon
            .stub(testUtils.vscodeMssqlIExtension.object, "listDatabases")
            .withArgs(sinon.match.any)
            .resolves(dbList);
        let quickPickStub = sinon.stub(vscode.window, "showQuickPick").resolves("Database");
        //user chooses project name
        sinon.stub(vscode.window, "showInputBox").resolves("TestProject");
        // user chooses to browse for folder
        quickPickStub.onSecondCall().resolves(constants.browseEllipsisWithIcon);
        // user doesn't choose any folder when prompted and exits the showOpenDialog
        let openDialogStub = sinon
            .stub(vscode.window, "showOpenDialog")
            .withArgs(sinon.match.any)
            .resolves(undefined);
        // user chooses to browse for folder again
        quickPickStub.onThirdCall().resolves(constants.browseEllipsisWithIcon);
        // user chooses folder- stub out folder to be chosen (showOpenDialog)
        openDialogStub.onSecondCall().resolves([vscode.Uri.file(projectFilePath)]);
        //user chooses to exit when prompted for folder structure
        quickPickStub.onCall(3).resolves(undefined);
        await createProjectFromDatabaseQuickpick.createNewProjectFromDatabaseWithQuickpick(dialogTestUtils_1.mockConnectionInfo, createProjectFromDatabaseCallbackSpy);
        //verify create project callback was not called, since folder structure wasn't selected (resolved to undefined)
        should(createProjectFromDatabaseCallbackSpy.notCalled).be.true("createProjectFromDatabaseCallback should not have been called");
    });
    test("Should exit when folder structure is not selected and existing folder/file location is selected", async function () {
        //createProjectFromDatabaseQuickpick spy to verify test
        const createProjectFromDatabaseCallbackSpy = sinon.stub().resolves();
        //create folder and project file
        const projectFileName = "TestProject";
        const testProjectFilePath = await (0, testUtils_1.generateTestFolderPath)(this.test);
        await fs_1.promises.rm(testProjectFilePath, { force: true, recursive: true }); //clean up if it already exists
        await (0, testUtils_1.createTestFile)(this.test, "", `${projectFileName}.sqlproj`, testProjectFilePath);
        //user chooses connection and database
        sinon.stub(testUtils.vscodeMssqlIExtension.object, "connect").resolves("testConnectionURI");
        sinon
            .stub(testUtils.vscodeMssqlIExtension.object, "listDatabases")
            .withArgs(sinon.match.any)
            .resolves(dbList);
        let quickPickStub = sinon.stub(vscode.window, "showQuickPick").resolves("Database");
        //user chooses project name
        sinon.stub(vscode.window, "showInputBox").resolves(projectFileName);
        // user chooses a folder/file combination that already exists
        quickPickStub.onSecondCall().resolves(testProjectFilePath);
        //user chooses another folder when prompted again
        quickPickStub.onThirdCall().resolves(path.join(projectFilePath, "test"));
        //user chooses to exit when prompted for folder structure
        quickPickStub.onCall(3).resolves(undefined);
        await createProjectFromDatabaseQuickpick.createNewProjectFromDatabaseWithQuickpick(dialogTestUtils_1.mockConnectionInfo, createProjectFromDatabaseCallbackSpy);
        await (0, testUtils_1.deleteGeneratedTestFolder)();
        //verify create project callback was not called, since folder structure wasn't selected (resolved to undefined)
        should(createProjectFromDatabaseCallbackSpy.notCalled).be.true("createProjectFromDatabaseCallback should not have been called");
    });
    test("Should exit when include permissions is not selected", async function () {
        //createProjectFromDatabaseQuickpick spy to verify test
        const createProjectFromDatabaseCallbackSpy = sinon.stub().resolves();
        //user chooses connection and database
        sinon.stub(testUtils.vscodeMssqlIExtension.object, "connect").resolves("testConnectionURI");
        sinon
            .stub(testUtils.vscodeMssqlIExtension.object, "listDatabases")
            .withArgs(sinon.match.any)
            .resolves(dbList);
        let quickPickStub = sinon.stub(vscode.window, "showQuickPick").resolves("Database");
        //user chooses project name
        sinon.stub(vscode.window, "showInputBox").resolves("TestProject");
        // user chooses a folder
        quickPickStub.onSecondCall().resolves(projectFilePath);
        //user chooses Object type when prompted for folder structure
        quickPickStub.onThirdCall().resolves(constants.objectType);
        //user chooses to exit when prompted for include permissions
        quickPickStub.onCall(3).resolves(undefined);
        await createProjectFromDatabaseQuickpick.createNewProjectFromDatabaseWithQuickpick(dialogTestUtils_1.mockConnectionInfo, createProjectFromDatabaseCallbackSpy);
        //verify create project callback was not called, since include permissions wasn't selected (resolved to undefined)
        should(createProjectFromDatabaseCallbackSpy.notCalled).be.true("createProjectFromDatabaseCallback should not have been called");
    });
    test("Should exit when sdk style project is not selected", async function () {
        //createProjectFromDatabaseQuickpick spy to verify test
        const createProjectFromDatabaseCallbackSpy = sinon.stub().resolves();
        //user chooses connection and database
        sinon.stub(testUtils.vscodeMssqlIExtension.object, "connect").resolves("testConnectionURI");
        sinon
            .stub(testUtils.vscodeMssqlIExtension.object, "listDatabases")
            .withArgs(sinon.match.any)
            .resolves(dbList);
        let quickPickStub = sinon.stub(vscode.window, "showQuickPick").resolves("Database");
        //user chooses project name
        sinon.stub(vscode.window, "showInputBox").resolves("TestProject");
        // user chooses a folder
        quickPickStub.onSecondCall().resolves(projectFilePath);
        //user chooses Object type when prompted for folder structure
        quickPickStub.onThirdCall().resolves(constants.objectType);
        //user chooses No when prompted for include permissions
        quickPickStub.onCall(3).resolves(constants.noStringDefault);
        //user chooses to exit when prompted for sdk style project
        sinon.stub(quickpickHelper, "getSDKStyleProjectInfo").resolves(undefined);
        await createProjectFromDatabaseQuickpick.createNewProjectFromDatabaseWithQuickpick(dialogTestUtils_1.mockConnectionInfo, createProjectFromDatabaseCallbackSpy);
        //verify create project callback was not called, since sdk style project wasn't selected (resolved to undefined)
        should(createProjectFromDatabaseCallbackSpy.notCalled).be.true("createProjectFromDatabaseCallback should not have been called");
    });
    test("Should create project when all the information is provided", async function () {
        //createProjectFromDatabaseQuickpick spy to verify test
        const createProjectFromDatabaseCallbackSpy = sinon.stub().resolves();
        //user chooses connection and database
        sinon.stub(testUtils.vscodeMssqlIExtension.object, "connect").resolves("testConnectionURI");
        sinon
            .stub(testUtils.vscodeMssqlIExtension.object, "listDatabases")
            .withArgs(sinon.match.any)
            .resolves(dbList);
        let quickPickStub = sinon.stub(vscode.window, "showQuickPick").resolves("Database");
        //user chooses project name
        sinon.stub(vscode.window, "showInputBox").resolves("TestProject");
        // user chooses a folder
        quickPickStub.onSecondCall().resolves(projectFilePath);
        //user chooses Object type when prompted for folder structure
        quickPickStub.onThirdCall().resolves(constants.objectType);
        //user chooses No when prompted for include permissions
        quickPickStub.onCall(3).resolves(constants.noStringDefault);
        //user chooses sdk style project to be true
        sinon.stub(quickpickHelper, "getSDKStyleProjectInfo").resolves(true);
        await createProjectFromDatabaseQuickpick.createNewProjectFromDatabaseWithQuickpick(dialogTestUtils_1.mockConnectionInfo, createProjectFromDatabaseCallbackSpy);
        const expectedImportDataModel = {
            connectionUri: "testConnectionURI",
            database: "Database",
            projName: "TestProject",
            filePath: projectFilePath,
            version: "1.0.0.0",
            extractTarget: 3 /* mssql.ExtractTarget.objectType */,
            sdkStyle: true,
            includePermissions: false,
        };
        //verify create project callback was called with the correct model
        should(createProjectFromDatabaseCallbackSpy.calledOnce).be.true("createProjectFromDatabaseCallback should have been called");
        should(createProjectFromDatabaseCallbackSpy.calledWithMatch(expectedImportDataModel)).be.true("createProjectFromDatabaseCallback should have been called with the correct model");
    });
});
//# sourceMappingURL=createProjectFromDatabaseQuickpick.test.js.map