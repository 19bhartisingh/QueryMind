"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const os = require("os");
const fs = require("fs");
const vscode = require("vscode");
const path = require("path");
const buildHelper_1 = require("../src/tools/buildHelper");
const testContext_1 = require("./testContext");
const constants = require("../src/common/constants");
const utils = require("../src/common/utils");
suite("BuildHelper: Build Helper tests", function () {
    test("Should get correct build arguments for legacy-style projects", function () {
        // update settings and validate
        const buildHelper = new buildHelper_1.BuildHelper();
        const resultArgs = buildHelper.constructBuildArguments("dummy\\dll path", 1 /* ProjectType.LegacyStyle */);
        // Check that it returns an array
        (0, chai_1.expect)(resultArgs).to.be.an("array");
        (0, chai_1.expect)(resultArgs.length).to.equal(3); // 3 arguments for legacy projects
        // Check individual arguments
        (0, chai_1.expect)(resultArgs[0]).to.equal("/p:NetCoreBuild=true");
        if (os.platform() === "win32") {
            (0, chai_1.expect)(resultArgs[1]).to.equal('/p:SystemDacpacsLocation="dummy\\\\dll path"');
            (0, chai_1.expect)(resultArgs[2]).to.equal('/p:NETCoreTargetsPath="dummy\\\\dll path"');
        }
        else {
            (0, chai_1.expect)(resultArgs[1]).to.equal('/p:SystemDacpacsLocation="dummy/dll path"');
            (0, chai_1.expect)(resultArgs[2]).to.equal('/p:NETCoreTargetsPath="dummy/dll path"');
        }
    });
    test("Should get correct build arguments for SDK-style projects", function () {
        // update settings and validate
        const buildHelper = new buildHelper_1.BuildHelper();
        const resultArgs = buildHelper.constructBuildArguments("dummy\\dll path", 0 /* ProjectType.SdkStyle */);
        // Check that it returns an array
        (0, chai_1.expect)(resultArgs).to.be.an("array");
        (0, chai_1.expect)(resultArgs.length).to.equal(2); // 2 arguments for SDK projects (no NETCoreTargetsPath)
        // Check individual arguments
        (0, chai_1.expect)(resultArgs[0]).to.equal("/p:NetCoreBuild=true");
        if (os.platform() === "win32") {
            (0, chai_1.expect)(resultArgs[1]).to.equal('/p:SystemDacpacsLocation="dummy\\\\dll path"');
        }
        else {
            (0, chai_1.expect)(resultArgs[1]).to.equal('/p:SystemDacpacsLocation="dummy/dll path"');
        }
    });
    test("Should get correct build folder", async function () {
        const testContext = (0, testContext_1.createContext)();
        const buildHelper = new buildHelper_1.BuildHelper();
        await buildHelper.createBuildDirFolder(testContext.outputChannel);
        // get expected path for build
        const extensionPath = vscode.extensions.getExtension("ms-mssql.sql-database-projects-vscode" /* sqldbproj.extension.vsCodeName */)?.extensionPath ?? "";
        (0, chai_1.expect)(buildHelper.extensionBuildDirPath).to.equal(path.join(extensionPath, "BuildDirectory"));
    });
    test("Should have all required SystemDacpacs files for supported target platforms", async function () {
        // Get the extension's build directory path
        const extensionPath = vscode.extensions.getExtension("ms-mssql.sql-database-projects-vscode" /* sqldbproj.extension.vsCodeName */)?.extensionPath ?? "";
        const systemDacpacsPath = path.join(extensionPath, "BuildDirectory", "SystemDacpacs");
        // Verify SystemDacpacs folder exists
        (0, chai_1.expect)(fs.existsSync(systemDacpacsPath), `SystemDacpacs folder should exist at ${systemDacpacsPath}`).to.be.true;
        // Verify all target platforms from targetPlatformToVersion have required dacpacs
        for (const [platform, version] of constants.targetPlatformToVersion) {
            // Handle Dw -> AzureDw folder name mapping
            const folderName = version === "Dw" ? constants.AzureDwFolder : version;
            const folderPath = path.join(systemDacpacsPath, folderName);
            (0, chai_1.expect)(fs.existsSync(folderPath), `Folder ${folderName} for platform '${platform}' should exist in SystemDacpacs`).to.be.true;
            (0, chai_1.expect)(fs.existsSync(path.join(folderPath, "master.dacpac")), `master.dacpac should exist in ${folderName}`).to.be.true;
            // On-prem SQL Server versions (numeric like 110, 120, etc.) also need msdb.dacpac
            const isOnPrem = /^\d+$/.test(version);
            if (isOnPrem) {
                (0, chai_1.expect)(fs.existsSync(path.join(folderPath, "msdb.dacpac")), `msdb.dacpac should exist in ${folderName}`).to.be.true;
            }
        }
    });
    test("Should have all required DLLs in build directory", async function () {
        const testContext = (0, testContext_1.createContext)();
        const buildHelper = new buildHelper_1.BuildHelper();
        const success = await buildHelper.createBuildDirFolder(testContext.outputChannel);
        // Verify that the build directory was created successfully
        (0, chai_1.expect)(success, "Build directory creation should succeed").to.be.true;
        const buildDirPath = buildHelper.extensionBuildDirPath;
        // List of required DLLs from Microsoft.Build.Sql package
        const requiredDacFxFiles = [
            "Microsoft.Build.Sql.dll",
            "Microsoft.Data.SqlClient.dll",
            "Microsoft.Data.Tools.Schema.Sql.dll",
            "Microsoft.Data.Tools.Schema.Tasks.Sql.dll",
            "Microsoft.Data.Tools.Utilities.dll",
            "Microsoft.SqlServer.Dac.dll",
            "Microsoft.SqlServer.Dac.Extensions.dll",
            "Microsoft.SqlServer.Types.dll",
            "System.ComponentModel.Composition.dll",
            "System.IO.Packaging.dll",
            "Microsoft.Data.Tools.Schema.SqlTasks.targets",
            "Microsoft.SqlServer.Server.dll",
        ];
        // List of required DLLs from ScriptDom package
        const requiredScriptDomFiles = ["Microsoft.SqlServer.TransactSql.ScriptDom.dll"];
        // Combine all required files
        const allRequiredFiles = [...requiredDacFxFiles, ...requiredScriptDomFiles];
        // Verify each required file exists in the build directory
        for (const fileName of allRequiredFiles) {
            const filePath = path.join(buildDirPath, fileName);
            const exists = await utils.exists(filePath);
            (0, chai_1.expect)(exists, `Required file '${fileName}' should exist in build directory at ${filePath}`).to.be.true;
        }
    });
});
//# sourceMappingURL=buildHelper.test.js.map