"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectScriptType = exports.itemTypeToFolderMap = exports.newSdkSqlProjectTemplate = exports.newSqlProjectTemplate = void 0;
exports.get = get;
exports.projectScriptTypes = projectScriptTypes;
exports.loadTemplates = loadTemplates;
exports.macroExpansion = macroExpansion;
exports.reset = reset;
const path = require("path");
const constants = require("../common/constants");
const fs_1 = require("fs");
/**
 * Maps item types to their default folder locations and schema dependency.
 * Following SSDT conventions for folder structure (ObjectType and SchemaObjectType).
 * Add new mappings here when adding item types that should be placed in specific folders.
 */
exports.itemTypeToFolderMap = new Map([
    ["schema" /* ItemType.schema */, { folderName: constants.securityFolderName, schemaDependent: false }],
    [
        "tableValuedFunction" /* ItemType.tableValuedFunction */,
        { folderName: constants.functionsFolderName, schemaDependent: true },
    ],
    [
        "databaseTrigger" /* ItemType.databaseTrigger */,
        { folderName: constants.databaseTriggersFolderName, schemaDependent: false },
    ],
    ["sequence" /* ItemType.sequence */, { folderName: constants.sequencesFolderName, schemaDependent: true }],
]);
// Object maps
let scriptTypeMap = new Map();
function get(key) {
    if (scriptTypeMap.size === 0) {
        throw new Error("Templates must be loaded from file before attempting to use.");
    }
    return scriptTypeMap.get(key.toLocaleLowerCase());
}
let scriptTypes = [];
function projectScriptTypes() {
    if (scriptTypes.length === 0) {
        throw new Error("Templates must be loaded from file before attempting to use.");
    }
    return scriptTypes;
}
async function loadTemplates(templateFolderPath) {
    reset();
    await Promise.all([
        Promise.resolve((exports.newSqlProjectTemplate = await loadTemplate(templateFolderPath, "newSqlProjectTemplate.xml"))),
        Promise.resolve((exports.newSdkSqlProjectTemplate = await loadTemplate(templateFolderPath, "newSdkSqlProjectTemplate.xml"))),
        loadObjectTypeInfo("script" /* ItemType.script */, constants.scriptFriendlyName, templateFolderPath, "newTsqlScriptTemplate.sql"),
        loadObjectTypeInfo("table" /* ItemType.table */, constants.tableFriendlyName, templateFolderPath, "newTsqlTableTemplate.sql"),
        loadObjectTypeInfo("view" /* ItemType.view */, constants.viewFriendlyName, templateFolderPath, "newTsqlViewTemplate.sql"),
        loadObjectTypeInfo("storedProcedure" /* ItemType.storedProcedure */, constants.storedProcedureFriendlyName, templateFolderPath, "newTsqlStoredProcedureTemplate.sql"),
        loadObjectTypeInfo("tableValuedFunction" /* ItemType.tableValuedFunction */, constants.tableValuedFunctionFriendlyName, templateFolderPath, "newTsqlTableValuedFunctionTemplate.sql"),
        loadObjectTypeInfo("schema" /* ItemType.schema */, constants.schemaFriendlyName, templateFolderPath, "newTsqlSchemaTemplate.sql"),
        loadObjectTypeInfo("preDeployScript" /* ItemType.preDeployScript */, constants.preDeployScriptFriendlyName, templateFolderPath, "newTsqlPreDeployScriptTemplate.sql"),
        loadObjectTypeInfo("postDeployScript" /* ItemType.postDeployScript */, constants.postDeployScriptFriendlyName, templateFolderPath, "newTsqlPostDeployScriptTemplate.sql"),
        loadObjectTypeInfo("dataSource" /* ItemType.dataSource */, constants.dataSourceFriendlyName, templateFolderPath, "newTsqlDataSourceTemplate.sql"),
        loadObjectTypeInfo("fileFormat" /* ItemType.fileFormat */, constants.fileFormatFriendlyName, templateFolderPath, "newTsqlFileFormatTemplate.sql"),
        loadObjectTypeInfo("externalStream" /* ItemType.externalStream */, constants.externalStreamFriendlyName, templateFolderPath, "newTsqlExternalStreamTemplate.sql"),
        loadObjectTypeInfo("externalStreamingJob" /* ItemType.externalStreamingJob */, constants.externalStreamingJobFriendlyName, templateFolderPath, "newTsqlExternalStreamingJobTemplate.sql"),
        loadObjectTypeInfo("publishProfile" /* ItemType.publishProfile */, constants.publishProfileFriendlyName, templateFolderPath, "newPublishProfileTemplate.publish.xml"),
        loadObjectTypeInfo("trigger" /* ItemType.trigger */, constants.triggerFriendlyName, templateFolderPath, "newTsqlTriggerTemplate.sql"),
        loadObjectTypeInfo("databaseTrigger" /* ItemType.databaseTrigger */, constants.databaseTriggerFriendlyName, templateFolderPath, "newTsqlDatabaseTriggerTemplate.sql"),
        loadObjectTypeInfo("sequence" /* ItemType.sequence */, constants.sequenceFriendlyName, templateFolderPath, "newTsqlSequenceTemplate.sql"),
    ]);
    for (const scriptType of scriptTypes) {
        if (scriptTypeMap.has(scriptType.type.toLocaleLowerCase()) ||
            scriptTypeMap.has(scriptType.friendlyName.toLocaleLowerCase())) {
            throw new Error(`Script type map already contains ${scriptType.type} or its friendlyName.`);
        }
        scriptTypeMap.set(scriptType.type.toLocaleLowerCase(), scriptType);
        scriptTypeMap.set(scriptType.friendlyName.toLocaleLowerCase(), scriptType);
    }
}
function macroExpansion(template, macroDict) {
    const macroIndicator = "@@";
    let output = template;
    for (const macro of macroDict.keys()) {
        // check if value contains the macroIndicator, which could break expansion for successive macros
        if (macroDict.get(macro).includes(macroIndicator)) {
            throw new Error(`Macro value ${macroDict.get(macro)} is invalid because it contains ${macroIndicator}`);
        }
        output = output.replace(new RegExp(macroIndicator + macro + macroIndicator, "g"), macroDict.get(macro));
    }
    return output;
}
async function loadObjectTypeInfo(key, friendlyName, templateFolderPath, fileName) {
    const template = await loadTemplate(templateFolderPath, fileName);
    scriptTypes.push(new ProjectScriptType(key, friendlyName, template));
    return key;
}
async function loadTemplate(templateFolderPath, fileName) {
    return (await fs_1.promises.readFile(path.join(templateFolderPath, fileName))).toString();
}
class ProjectScriptType {
    type;
    friendlyName;
    templateScript;
    constructor(type, friendlyName, templateScript) {
        this.type = type;
        this.friendlyName = friendlyName;
        this.templateScript = templateScript;
    }
}
exports.ProjectScriptType = ProjectScriptType;
/**
 * For testing purposes only
 */
function reset() {
    scriptTypeMap = new Map();
    scriptTypes = [];
}
//# sourceMappingURL=templates.js.map