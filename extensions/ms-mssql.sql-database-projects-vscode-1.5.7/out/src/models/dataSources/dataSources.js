"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoDataSourcesFileError = exports.DataSource = void 0;
exports.load = load;
const fs_1 = require("fs");
const constants = require("../../common/constants");
/**
 * Abstract class for a datasource in a project
 */
class DataSource {
    name;
    constructor(name) {
        this.name = name;
    }
}
exports.DataSource = DataSource;
class NoDataSourcesFileError extends Error {
    constructor(message) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = NoDataSourcesFileError.name;
    }
}
exports.NoDataSourcesFileError = NoDataSourcesFileError;
/**
 * parses the specified file to load DataSource objects
 */
async function load(dataSourcesFilePath) {
    let fileContents;
    try {
        fileContents = await fs_1.promises.readFile(dataSourcesFilePath);
    }
    catch (err) {
        // TODO: differentiate between file not existing and other types of failures; need to know whether to prompt to create new
        throw new NoDataSourcesFileError(constants.noDataSourcesFile);
    }
    const rawJsonContents = JSON.parse(fileContents.toString());
    if (rawJsonContents.version === undefined) {
        throw new Error(constants.missingVersion);
    }
    const output = [];
    // TODO: do we have a construct for parsing version numbers?
    switch (rawJsonContents.version) {
        case "0.0.0":
            // const dataSources: DataSourceFileJson = rawJsonContents as DataSourceFileJson;
            // for (const source of dataSources.datasources) {
            // 	output.push(createDataSource(source));
            // }
            break;
        default:
            throw new Error(constants.unrecognizedDataSourcesVersion + rawJsonContents.version);
    }
    return output;
}
/**
 * Creates DataSource object from JSON
 */
// Commenting this out because circular dependency with SqlConnectionDataSource was causing extension to not activate
// function createDataSource(json: DataSourceJson): DataSource {
// 	switch (json.type) {
// 		case SqlConnectionDataSource.type:
// 			return SqlConnectionDataSource.fromJson(json);
// 		default:
// 			throw new Error(constants.unknownDataSourceType + json.type);
// 	}
// }
//# sourceMappingURL=dataSources.js.map