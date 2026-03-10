"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseReferenceLocation = exports.SqlCmdVariableProjectEntry = exports.NugetPackageReferenceProjectEntry = exports.SqlProjectReferenceProjectEntry = exports.SystemDatabaseReferenceProjectEntry = exports.DacpacReferenceProjectEntry = exports.FileProjectEntry = exports.ProjectEntry = void 0;
const path = require("path");
const utils = require("../common/utils");
const vscode_1 = require("vscode");
/**
 * Represents an entry in a project file
 */
class ProjectEntry {
    type;
    constructor(type) {
        this.type = type;
    }
}
exports.ProjectEntry = ProjectEntry;
class FileProjectEntry extends ProjectEntry {
    /**
     * Absolute file system URI
     */
    fsUri;
    relativePath;
    sqlObjectType;
    containsCreateTableStatement;
    constructor(uri, relativePath, entryType, sqlObjectType, containsCreateTableStatement) {
        super(entryType);
        this.fsUri = uri;
        this.relativePath = relativePath;
        this.sqlObjectType = sqlObjectType;
        this.containsCreateTableStatement = containsCreateTableStatement;
    }
    toString() {
        return this.fsUri.path;
    }
    pathForSqlProj() {
        return utils.convertSlashesForSqlProj(this.fsUri.fsPath);
    }
}
exports.FileProjectEntry = FileProjectEntry;
class UserDatabaseReferenceProjectEntry extends FileProjectEntry {
    databaseSqlCmdVariableValue;
    databaseSqlCmdVariableName;
    databaseVariableLiteralValue;
    serverSqlCmdVariableName;
    serverSqlCmdVariableValue;
    suppressMissingDependenciesErrors;
    constructor(settings, uri) {
        super(uri, 
        /* relativePath doesn't get set for database references */ "", 2 /* EntryType.DatabaseReference */);
        this.suppressMissingDependenciesErrors = settings.suppressMissingDependenciesErrors;
        this.databaseVariableLiteralValue = settings.databaseVariableLiteralValue;
        this.databaseSqlCmdVariableName = settings.databaseName;
        this.databaseSqlCmdVariableValue = settings.databaseVariable;
        this.serverSqlCmdVariableName = settings.serverName;
        this.serverSqlCmdVariableValue = settings.serverVariable;
    }
}
class DacpacReferenceProjectEntry extends UserDatabaseReferenceProjectEntry {
    constructor(settings) {
        super(settings, settings.dacpacFileLocation);
    }
    /**
     * File name that gets displayed in the project tree
     */
    get referenceName() {
        return path.parse(utils.getPlatformSafeFileEntryPath(this.fsUri.fsPath)).name;
    }
    pathForSqlProj() {
        // need to remove the leading slash from path for build to work
        return utils.convertSlashesForSqlProj(this.fsUri.path.substring(1));
    }
}
exports.DacpacReferenceProjectEntry = DacpacReferenceProjectEntry;
class SystemDatabaseReferenceProjectEntry extends FileProjectEntry {
    referenceName;
    databaseVariableLiteralValue;
    suppressMissingDependenciesErrors;
    constructor(referenceName, databaseVariableLiteralValue, suppressMissingDependenciesErrors) {
        super(vscode_1.Uri.file(referenceName), referenceName, 2 /* EntryType.DatabaseReference */);
        this.referenceName = referenceName;
        this.databaseVariableLiteralValue = databaseVariableLiteralValue;
        this.suppressMissingDependenciesErrors = suppressMissingDependenciesErrors;
    }
    /**
     * Returns the name of the system database - this is used for deleting the system database reference
     */
    pathForSqlProj() {
        return this.referenceName;
    }
}
exports.SystemDatabaseReferenceProjectEntry = SystemDatabaseReferenceProjectEntry;
class SqlProjectReferenceProjectEntry extends UserDatabaseReferenceProjectEntry {
    projectName;
    projectGuid;
    constructor(settings) {
        super(settings, settings.projectRelativePath);
        this.projectName = settings.projectName;
        this.projectGuid = settings.projectGuid;
    }
    get referenceName() {
        return this.projectName;
    }
    pathForSqlProj() {
        // need to remove the leading slash from path for build to work on Windows
        return utils.convertSlashesForSqlProj(this.fsUri.path.substring(1));
    }
}
exports.SqlProjectReferenceProjectEntry = SqlProjectReferenceProjectEntry;
class NugetPackageReferenceProjectEntry extends UserDatabaseReferenceProjectEntry {
    packageName;
    constructor(settings) {
        super(settings, vscode_1.Uri.file(settings.packageName));
        this.packageName = settings.packageName;
    }
    get referenceName() {
        return this.packageName;
    }
    pathForSqlProj() {
        return this.packageName;
    }
}
exports.NugetPackageReferenceProjectEntry = NugetPackageReferenceProjectEntry;
class SqlCmdVariableProjectEntry extends ProjectEntry {
    variableName;
    defaultValue;
    constructor(variableName, defaultValue) {
        super(3 /* EntryType.SqlCmdVariable */);
        this.variableName = variableName;
        this.defaultValue = defaultValue;
    }
}
exports.SqlCmdVariableProjectEntry = SqlCmdVariableProjectEntry;
var DatabaseReferenceLocation;
(function (DatabaseReferenceLocation) {
    DatabaseReferenceLocation[DatabaseReferenceLocation["sameDatabase"] = 0] = "sameDatabase";
    DatabaseReferenceLocation[DatabaseReferenceLocation["differentDatabaseSameServer"] = 1] = "differentDatabaseSameServer";
    DatabaseReferenceLocation[DatabaseReferenceLocation["differentDatabaseDifferentServer"] = 2] = "differentDatabaseDifferentServer";
})(DatabaseReferenceLocation || (exports.DatabaseReferenceLocation = DatabaseReferenceLocation = {}));
//# sourceMappingURL=projectEntry.js.map