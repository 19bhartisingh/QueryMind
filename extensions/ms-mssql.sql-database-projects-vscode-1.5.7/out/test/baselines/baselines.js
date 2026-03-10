"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseReferencesReadBaseline = exports.sqlProjPropertyReadBaseline = exports.openSdkStyleSqlProjectWithGlobsSpecifiedBaseline = exports.openSdkStyleSqlProjectWithFilesSpecifiedBaseline = exports.openSdkStyleSqlProjectBaseline = exports.newStyleProjectSdkImportAttributeBaseline = exports.newSdkStyleProjectSdkProjectAttributeBaseline = exports.newSdkStyleProjectSdkNodeBaseline = exports.sqlProjectInvalidCollationBaseline = exports.sqlProjectCustomCollationBaseline = exports.sqlProjectInvalidVersionBaseline = exports.sqlProjectMissingVersionBaseline = exports.openSqlProjectWithPrePostDeploymentError = exports.openProjectWithProjectReferencesBaseline = exports.publishProfileDefaultValueBaseline = exports.publishProfileSqlLoginBaseline = exports.publishProfileIntegratedSecurityBaseline = exports.SSDTProjectBaselineWithBeforeBuildTarget = exports.SSDTUpdatedProjectBaseline = exports.SSDTProjectFileBaseline = exports.openDataSourcesBaseline = exports.openProjectFileBaseline = exports.newProjectFileWithScriptBaseline = exports.newProjectFileBaseline = void 0;
exports.loadBaselines = loadBaselines;
const path = require("path");
const fs_1 = require("fs");
const baselineFolderPath = path.join(__dirname, "..", "..", "..", "test", "baselines");
async function loadBaselines() {
    exports.newProjectFileBaseline = await loadBaseline(baselineFolderPath, "newSqlProjectBaseline.xml");
    exports.newProjectFileWithScriptBaseline = await loadBaseline(baselineFolderPath, "newSqlProjectWithScriptBaseline.xml");
    exports.openProjectFileBaseline = await loadBaseline(baselineFolderPath, "openSqlProjectBaseline.xml");
    exports.openDataSourcesBaseline = await loadBaseline(baselineFolderPath, "openDataSourcesBaseline.json");
    exports.SSDTProjectFileBaseline = await loadBaseline(baselineFolderPath, "SSDTProjectBaseline.xml");
    exports.SSDTUpdatedProjectBaseline = await loadBaseline(baselineFolderPath, "SSDTUpdatedProjectBaseline.xml");
    exports.SSDTProjectBaselineWithBeforeBuildTarget = await loadBaseline(baselineFolderPath, "SSDTProjectBaselineWithBeforeBuildTarget.xml");
    exports.publishProfileIntegratedSecurityBaseline = await loadBaseline(baselineFolderPath, "publishProfileIntegratedSecurityBaseline.publish.xml");
    exports.publishProfileSqlLoginBaseline = await loadBaseline(baselineFolderPath, "publishProfileSqlLoginBaseline.publish.xml");
    exports.publishProfileDefaultValueBaseline = await loadBaseline(baselineFolderPath, "publishProfileDefaultValueBaseline.publish.xml");
    exports.openProjectWithProjectReferencesBaseline = await loadBaseline(baselineFolderPath, "openSqlProjectWithProjectReferenceBaseline.xml");
    exports.openSqlProjectWithPrePostDeploymentError = await loadBaseline(baselineFolderPath, "openSqlProjectWithPrePostDeploymentError.xml");
    exports.sqlProjectMissingVersionBaseline = await loadBaseline(baselineFolderPath, "sqlProjectMissingVersionBaseline.xml");
    exports.sqlProjectInvalidVersionBaseline = await loadBaseline(baselineFolderPath, "sqlProjectInvalidVersionBaseline.xml");
    exports.sqlProjectCustomCollationBaseline = await loadBaseline(baselineFolderPath, "sqlProjectCustomCollationBaseline.xml");
    exports.sqlProjectInvalidCollationBaseline = await loadBaseline(baselineFolderPath, "sqlProjectInvalidCollationBaseline.xml");
    exports.newSdkStyleProjectSdkNodeBaseline = await loadBaseline(baselineFolderPath, "newSdkStyleSqlProjectSdkNodeBaseline.xml");
    exports.newSdkStyleProjectSdkProjectAttributeBaseline = await loadBaseline(baselineFolderPath, "newSdkStyleSqlProjectSdkProjectAttributeBaseline.xml");
    exports.newStyleProjectSdkImportAttributeBaseline = await loadBaseline(baselineFolderPath, "newSdkStyleSqlProjectSdkImportAttributeBaseline.xml");
    exports.openSdkStyleSqlProjectBaseline = await loadBaseline(baselineFolderPath, "openSdkStyleSqlProjectBaseline.xml");
    exports.openSdkStyleSqlProjectWithFilesSpecifiedBaseline = await loadBaseline(baselineFolderPath, "openSdkStyleSqlProjectWithFilesSpecifiedBaseline.xml");
    exports.openSdkStyleSqlProjectWithGlobsSpecifiedBaseline = await loadBaseline(baselineFolderPath, "openSdkStyleSqlProjectWithGlobsSpecifiedBaseline.xml");
    exports.sqlProjPropertyReadBaseline = await loadBaseline(baselineFolderPath, "sqlProjPropertyRead.xml");
    exports.databaseReferencesReadBaseline = await loadBaseline(baselineFolderPath, "databaseReferencesReadBaseline.xml");
}
async function loadBaseline(baselineFolderPath, fileName) {
    return (await fs_1.promises.readFile(path.join(baselineFolderPath, fileName))).toString();
}
//# sourceMappingURL=baselines.js.map