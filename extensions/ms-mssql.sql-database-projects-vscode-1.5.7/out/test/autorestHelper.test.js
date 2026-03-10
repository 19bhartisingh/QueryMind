"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const should = require("should/as-function");
const sinon = require("sinon");
const testUtils = require("./testUtils");
const utils = require("../src/common/utils");
const path = require("path");
const testContext_1 = require("./testContext");
const autorestHelper_1 = require("../src/tools/autorestHelper");
const fs_1 = require("fs");
const vscode_1 = require("vscode");
const constants_1 = require("../src/common/constants");
let testContext;
suite("Autorest tests", function () {
    setup(function () {
        testContext = (0, testContext_1.createContext)();
    });
    teardown(function () {
        sinon.restore();
    });
    suiteTeardown(async function () {
        await testUtils.deleteGeneratedTestFolder();
    });
    test("Should detect autorest", async function () {
        sinon.stub(vscode_1.window, "showInformationMessage").returns(Promise.resolve(constants_1.runViaNpx)); // stub a selection in case test runner doesn't have autorest installed
        const autorestHelper = new autorestHelper_1.AutorestHelper(testContext.outputChannel);
        const executable = await autorestHelper.detectInstallation();
        should(executable === "autorest" || executable === "npx autorest").equal(true, "autorest command should be found in default path during unit tests");
    });
    test.skip("Should run an autorest command successfully", async function () {
        sinon.stub(vscode_1.window, "showInformationMessage").returns(Promise.resolve(constants_1.runViaNpx)); // stub a selection in case test runner doesn't have autorest installed
        const autorestHelper = new autorestHelper_1.AutorestHelper(testContext.outputChannel);
        const dummyFile = path.join(await testUtils.generateTestFolderPath(this.test), "testoutput.log");
        sinon
            .stub(autorestHelper, "constructAutorestCommand")
            .returns(`${await autorestHelper.detectInstallation()} --version > ${dummyFile}`);
        try {
            await autorestHelper.generateAutorestFiles("fakespec.yaml", "fakePath");
            const text = (await fs_1.promises.readFile(dummyFile)).toString().trim();
            const expected = "AutoRest code generation utility";
            should(text.includes(expected)).equal(true, `Substring not found.  Expected "${expected}" in "${text}"`);
        }
        finally {
            if (await utils.exists(dummyFile)) {
                await fs_1.promises.unlink(dummyFile);
            }
        }
    });
    test("Should construct a correct autorest command for project generation", async function () {
        const autorestHelper = new autorestHelper_1.AutorestHelper(testContext.outputChannel);
        sinon.stub(vscode_1.window, "showInformationMessage").returns(Promise.resolve(constants_1.runViaNpx)); // stub a selection in case test runner doesn't have autorest installed
        sinon.stub(autorestHelper, "detectInstallation").returns(Promise.resolve("autorest"));
        const expectedOutput = 'autorest --use:autorest-sql-testing@latest --input-file="/some/path/test.yaml" --output-folder="/some/output/path" --clear-output-folder --verbose';
        const constructedCommand = autorestHelper.constructAutorestCommand((await autorestHelper.detectInstallation()), "/some/path/test.yaml", "/some/output/path");
        // depending on whether the machine running the test has autorest installed or just node, the expected output may differ by just the prefix, hence matching against two options
        should(constructedCommand === expectedOutput).equal(true, `Constructed autorest command not formatting as expected:\nActual:\n\t${constructedCommand}\nExpected:\n\t${expectedOutput}`);
    });
    test("Should prompt user for action when autorest not found", async function () {
        const promptStub = sinon
            .stub(vscode_1.window, "showInformationMessage")
            .returns(Promise.resolve());
        const detectStub = sinon.stub(utils, "detectCommandInstallation");
        detectStub.withArgs("autorest").returns(Promise.resolve(false));
        detectStub.withArgs("npx").returns(Promise.resolve(true));
        const autorestHelper = new autorestHelper_1.AutorestHelper(testContext.outputChannel);
        await autorestHelper.detectInstallation();
        should(promptStub.calledOnce).be.true("User should have been prompted for how to run autorest because it wasn't found.");
    });
});
//# sourceMappingURL=autorestHelper.test.js.map