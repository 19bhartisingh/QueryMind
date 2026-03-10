"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapExtractTargetEnum = mapExtractTargetEnum;
exports.populateResultWithVars = populateResultWithVars;
exports.ensureSetOrDefined = ensureSetOrDefined;
const constants = require("../common/constants");
const utils_1 = require("../common/utils");
/**
 * Function to map folder structure string to enum
 * @param inputTarget folder structure in string
 * @returns folder structure in enum format
 */
function mapExtractTargetEnum(inputTarget) {
    if (inputTarget) {
        switch (inputTarget) {
            case constants.file:
                return 1 /* vscodeMssql.ExtractTarget.file */;
            case constants.flat:
                return 2 /* vscodeMssql.ExtractTarget.flat */;
            case constants.objectType:
                return 3 /* vscodeMssql.ExtractTarget.objectType */;
            case constants.schema:
                return 4 /* vscodeMssql.ExtractTarget.schema */;
            case constants.schemaObjectType:
                return 5 /* vscodeMssql.ExtractTarget.schemaObjectType */;
            default:
                throw new Error(constants.invalidInput(inputTarget));
        }
    }
    else {
        throw new Error(constants.extractTargetRequired);
    }
}
function populateResultWithVars(referenceSettings, dbServerValues) {
    if (dbServerValues.dbVariable) {
        referenceSettings.databaseName = ensureSetOrDefined(dbServerValues.dbName);
        referenceSettings.databaseVariable = ensureSetOrDefined((0, utils_1.removeSqlCmdVariableFormatting)(dbServerValues.dbVariable));
        referenceSettings.serverName = ensureSetOrDefined(dbServerValues.serverName);
        referenceSettings.serverVariable = ensureSetOrDefined((0, utils_1.removeSqlCmdVariableFormatting)(dbServerValues.serverVariable));
    }
    else {
        referenceSettings.databaseVariableLiteralValue = ensureSetOrDefined(dbServerValues.dbName);
    }
}
/**
 * Returns undefined for settings that are an empty string, meaning they are unset
 * @param setting
 */
function ensureSetOrDefined(setting) {
    if (!setting || setting.trim().length === 0) {
        return undefined;
    }
    return setting;
}
//# sourceMappingURL=utils.js.map