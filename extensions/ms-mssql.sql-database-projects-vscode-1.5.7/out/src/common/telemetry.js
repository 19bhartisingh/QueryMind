"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelemetryActions = exports.TelemetryViews = exports.TelemetryReporter = void 0;
const ads_extension_telemetry_1 = require("@microsoft/ads-extension-telemetry");
const utils_1 = require("./utils");
const packageInfo = (0, utils_1.getPackageInfo)();
exports.TelemetryReporter = new ads_extension_telemetry_1.default(packageInfo.name, packageInfo.version, packageInfo.aiKey);
var TelemetryViews;
(function (TelemetryViews) {
    TelemetryViews["ProjectController"] = "ProjectController";
    TelemetryViews["SqlProjectPublishDialog"] = "SqlProjectPublishDialog";
    TelemetryViews["ProjectTree"] = "ProjectTree";
    TelemetryViews["PublishOptionsDialog"] = "PublishOptionsDialog";
})(TelemetryViews || (exports.TelemetryViews = TelemetryViews = {}));
var TelemetryActions;
(function (TelemetryActions) {
    TelemetryActions["createNewProject"] = "createNewProject";
    TelemetryActions["addDatabaseReference"] = "addDatabaseReference";
    TelemetryActions["runStreamingJobValidation"] = "runStreamingJobValidation";
    TelemetryActions["generateScriptClicked"] = "generateScriptClicked";
    TelemetryActions["deleteObjectFromProject"] = "deleteObjectFromProject";
    TelemetryActions["editProjectFile"] = "editProjectFile";
    TelemetryActions["addItemFromTree"] = "addItemFromTree";
    TelemetryActions["addExistingItem"] = "addExistingItem";
    TelemetryActions["excludeFromProject"] = "excludeFromProject";
    TelemetryActions["projectSchemaCompareCommandInvoked"] = "projectSchemaCompareCommandInvoked";
    TelemetryActions["publishProject"] = "publishProject";
    TelemetryActions["build"] = "build";
    TelemetryActions["updateProjectForRoundtrip"] = "updateProjectForRoundtrip";
    TelemetryActions["changePlatformType"] = "changePlatformType";
    TelemetryActions["createProjectFromDatabase"] = "createProjectFromDatabase";
    TelemetryActions["updateProjectFromDatabase"] = "updateProjectFromDatabase";
    TelemetryActions["publishToContainer"] = "publishToContainer";
    TelemetryActions["publishToNewAzureServer"] = "publishToNewAzureServer";
    TelemetryActions["generateProjectFromOpenApiSpec"] = "generateProjectFromOpenApiSpec";
    TelemetryActions["publishOptionsOpened"] = "publishOptionsOpened";
    TelemetryActions["resetOptions"] = "resetOptions";
    TelemetryActions["optionsChanged"] = "optionsChanged";
    TelemetryActions["profileLoaded"] = "profileLoaded";
    TelemetryActions["profileSaved"] = "profileSaved";
    TelemetryActions["SchemaComparisonFinished"] = "SchemaComparisonFinished";
    TelemetryActions["SchemaComparisonStarted"] = "SchemaComparisonStarted";
    TelemetryActions["rename"] = "rename";
    TelemetryActions["move"] = "move";
    TelemetryActions["tasksJsonError"] = "tasksJsonError";
})(TelemetryActions || (exports.TelemetryActions = TelemetryActions = {}));
//# sourceMappingURL=telemetry.js.map