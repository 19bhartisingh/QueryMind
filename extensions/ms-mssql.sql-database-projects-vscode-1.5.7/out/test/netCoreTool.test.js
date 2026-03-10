"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const should = require("should/as-function");
const os = require("os");
const fs = require("fs");
const path = require("path");
const vscode = require("vscode");
const sinon = require("sinon");
const netcoreTool_1 = require("../src/tools/netcoreTool");
const utils_1 = require("../src/common/utils");
const testUtils_1 = require("./testUtils");
const testContext_1 = require("./testContext");
let testContext;
suite("NetCoreTool: Net core tests", function () {
    teardown(function () {
        sinon.restore();
    });
    setup(function () {
        testContext = (0, testContext_1.createContext)();
    });
    suiteTeardown(async function () {
        await (0, testUtils_1.deleteGeneratedTestFolder)();
    });
    test("Should override dotnet default value with settings", async function () {
        try {
            // update settings and validate
            await vscode.workspace
                .getConfiguration(netcoreTool_1.DBProjectConfigurationKey)
                .update(netcoreTool_1.DotnetInstallLocationKey, "test value path", true);
            const netcoreTool = new netcoreTool_1.NetCoreTool(testContext.outputChannel);
            sinon.stub(netcoreTool, "showInstallDialog").returns(Promise.resolve());
            should(netcoreTool.netcoreInstallLocation).equal("test value path"); // the path in settings should be taken
            should(await netcoreTool.findOrInstallNetCore()).equal(false); // dotnet can not be present at dummy path in settings
        }
        finally {
            // clean again
            await vscode.workspace
                .getConfiguration(netcoreTool_1.DBProjectConfigurationKey)
                .update(netcoreTool_1.DotnetInstallLocationKey, "", true);
        }
    });
    test("Should find right dotnet default paths", async function () {
        const netcoreTool = new netcoreTool_1.NetCoreTool(testContext.outputChannel);
        sinon.stub(netcoreTool, "showInstallDialog").returns(Promise.resolve());
        await netcoreTool.findOrInstallNetCore();
        if (os.platform() === "win32") {
            // check that path should start with c:\program files
            let result = !netcoreTool.netcoreInstallLocation ||
                netcoreTool.netcoreInstallLocation.toLowerCase().startsWith("c:\\program files");
            should(result).true("dotnet not present in programfiles by default");
        }
        if (os.platform() === "linux") {
            //check that path should start with /usr/share
            let result = !netcoreTool.netcoreInstallLocation ||
                netcoreTool.netcoreInstallLocation.toLowerCase() === "/usr/share/dotnet";
            should(result).true("dotnet not present in /usr/share");
        }
        if (os.platform() === "darwin") {
            //check that path should start with /usr/local/share
            let result = !netcoreTool.netcoreInstallLocation ||
                netcoreTool.netcoreInstallLocation.toLowerCase() === "/usr/local/share/dotnet";
            should(result).true("dotnet not present in /usr/local/share");
        }
    });
    test("should run a command successfully", async function () {
        const netcoreTool = new netcoreTool_1.NetCoreTool(testContext.outputChannel);
        const dummyFile = path.join(await (0, testUtils_1.generateTestFolderPath)(this.test), "dummy.dacpac");
        try {
            await netcoreTool.runStreamedCommand("echo test > " + (0, utils_1.getQuotedPath)(dummyFile), undefined);
            const text = await fs.promises.readFile(dummyFile);
            should(text.toString().trim()).equal("test");
        }
        finally {
            try {
                await fs.promises.unlink(dummyFile);
            }
            catch (err) {
                console.warn(`Failed to clean up ${dummyFile}`);
            }
        }
    });
});
//# sourceMappingURL=netCoreTool.test.js.map