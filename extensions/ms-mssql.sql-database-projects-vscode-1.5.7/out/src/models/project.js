"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.Project = void 0;
const path = require("path");
const constants = require("../common/constants");
const utils = require("../common/utils");
const vscode = require("vscode");
const fs_1 = require("fs");
const vscode_1 = require("vscode");
const telemetry_1 = require("../common/telemetry");
const projectEntry_1 = require("./projectEntry");
const fileFolderTreeItem_1 = require("./tree/fileFolderTreeItem");
/**
 * Represents the configuration based on the Configuration property in the sqlproj
 */
var Configuration;
(function (Configuration) {
    Configuration["Debug"] = "Debug";
    Configuration["Release"] = "Release";
    Configuration["Output"] = "Output";
})(Configuration || (Configuration = {}));
/**
 * Class representing a Project, and providing functions for operating on it
 */
class Project {
    sqlProjService;
    _projectFilePath;
    _projectFileName;
    _projectGuid;
    _sqlObjectScripts = [];
    _folders = [];
    _dataSources = [];
    _databaseReferences = [];
    _sqlCmdVariables = new Map();
    _preDeployScripts = [];
    _postDeployScripts = [];
    _noneDeployScripts = [];
    _sqlProjStyle;
    _isCrossPlatformCompatible = false;
    _outputPath = "";
    _configuration = Configuration.Debug;
    _databaseSource = "";
    _publishProfiles = [];
    _defaultCollation = "";
    _databaseSchemaProvider = "";
    //#endregion
    //#region Public Properties
    get dacpacOutputPath() {
        return path.join(this.outputPath, `${this._projectFileName}.dacpac`);
    }
    get projectFolderPath() {
        return vscode_1.Uri.file(path.dirname(this._projectFilePath)).fsPath;
    }
    get projectFilePath() {
        return this._projectFilePath;
    }
    get projectFileName() {
        return this._projectFileName;
    }
    get projectGuid() {
        return this._projectGuid;
    }
    get sqlObjectScripts() {
        return this._sqlObjectScripts;
    }
    get folders() {
        return this._folders;
    }
    get dataSources() {
        return this._dataSources;
    }
    get databaseReferences() {
        return this._databaseReferences;
    }
    get sqlCmdVariables() {
        return this._sqlCmdVariables;
    }
    get preDeployScripts() {
        return this._preDeployScripts;
    }
    get postDeployScripts() {
        return this._postDeployScripts;
    }
    get noneDeployScripts() {
        return this._noneDeployScripts;
    }
    get sqlProjStyle() {
        return this._sqlProjStyle;
    }
    get sqlProjStyleName() {
        return this.sqlProjStyle === 0 /* vscodeMssql.ProjectType.SdkStyle */
            ? constants.sdkStyleProjectStyleName
            : constants.legacyStyleProjectStyleName;
    }
    get isCrossPlatformCompatible() {
        return this._isCrossPlatformCompatible;
    }
    get outputPath() {
        return this._outputPath;
    }
    get configuration() {
        return this._configuration;
    }
    get publishProfiles() {
        return this._publishProfiles;
    }
    //#endregion
    constructor(projectFilePath) {
        this._projectFilePath = projectFilePath;
        this._projectFileName = path.basename(projectFilePath, ".sqlproj");
        this._sqlProjStyle = 0 /* vscodeMssql.ProjectType.SdkStyle */;
    }
    /**
     * Open and load a .sqlproj file
     * @param projectFilePath
     * @param promptIfNeedsUpdating whether or not to prompt the user if the project needs to be updated
     * @param reload whether to reload the project from the project file
     * @returns
     */
    static async openProject(projectFilePath, promptIfNeedsUpdating = false, reload = false) {
        const proj = new Project(projectFilePath);
        proj.sqlProjService = await utils.getSqlProjectsService();
        if (reload) {
            // close the project in STS so that it will reload the project from the .sqlproj, rather than using the cached Project in STS
            await proj.sqlProjService.closeProject(projectFilePath);
        }
        await proj.readProjFile();
        if (promptIfNeedsUpdating) {
            await this.checkPromptCrossPlatStatus(proj, false /* don't block the thread until the  prompt*/);
        }
        return proj;
    }
    /**
     * If project does not support cross-plat building, prompts the user for whether to update and updates if accepted
     * @param project
     * @param blockingPrompt whether to block the thread until the user updates, or to fire and forget
     * @returns true if the project is updated after return, false if the user rejected the prompt
     */
    static async checkPromptCrossPlatStatus(project, blockingPrompt) {
        if (project.isCrossPlatformCompatible) {
            return true;
        }
        if (blockingPrompt) {
            const result = await vscode_1.window.showWarningMessage(constants.updateProjectForCrossPlatform(project.projectFileName), { modal: true }, constants.yesString, constants.noString);
            if (result === constants.yesString) {
                await project.updateProjectForCrossPlatform();
            }
        }
        else {
            // use "void" with a .then() to not block the UI thread while prompting the user
            void vscode_1.window
                .showErrorMessage(constants.updateProjectForCrossPlatform(project.projectFileName), constants.yesString, constants.noString)
                .then(async (result) => {
                if (result === constants.yesString) {
                    try {
                        await project.updateProjectForCrossPlatform();
                    }
                    catch (error) {
                        void vscode_1.window.showErrorMessage(utils.getErrorMessage(utils.getErrorMessage(error)));
                    }
                }
            });
        }
        return project.isCrossPlatformCompatible;
    }
    /**
     * Reads the project setting and contents from the file
     */
    async readProjFile() {
        this.resetProject();
        await this.readProjectProperties();
        await this.readSqlCmdVariables();
        await this.readDatabaseReferences();
        // get pre and post deploy scripts specified in the sqlproj
        await this.readPreDeployScripts(true);
        await this.readPostDeployScripts(true);
        await this.readNoneItems(); // also populates list of publish profiles, determined by file extension
        await this.readSqlObjectScripts(); // get SQL object scripts
        await this.readFolders(); // get folders
    }
    //#region Reader helpers
    async readProjectProperties() {
        const sqlProjService = this.sqlProjService;
        const result = await sqlProjService.getProjectProperties(this.projectFilePath);
        utils.throwIfFailed(result);
        this._projectGuid = result.projectGuid;
        switch (result.configuration.toLowerCase()) {
            case Configuration.Debug.toString().toLowerCase():
                this._configuration = Configuration.Debug;
                break;
            case Configuration.Release.toString().toLowerCase():
                this._configuration = Configuration.Release;
                break;
            default:
                this._configuration = Configuration.Output; // if the configuration doesn't match release or debug, the dacpac will get created in ./bin/Output
        }
        this._outputPath = path.isAbsolute(result.outputPath)
            ? result.outputPath
            : path.join(this.projectFolderPath, utils.getPlatformSafeFileEntryPath(result.outputPath));
        this._databaseSource = result.databaseSource ?? "";
        this._defaultCollation = result.defaultCollation;
        this._databaseSchemaProvider = result.databaseSchemaProvider;
        this._sqlProjStyle = result.projectStyle;
        await this.readCrossPlatformCompatibility();
    }
    async readCrossPlatformCompatibility() {
        const result = await this.sqlProjService.getCrossPlatformCompatibility(this.projectFilePath);
        utils.throwIfFailed(result);
        this._isCrossPlatformCompatible = result.isCrossPlatformCompatible;
    }
    async readSqlCmdVariables() {
        const sqlcmdVariablesResult = await this.sqlProjService.getSqlCmdVariables(this.projectFilePath);
        if (!sqlcmdVariablesResult.success && sqlcmdVariablesResult.errorMessage) {
            throw new Error(constants.errorReadingProject(constants.sqlCmdVariables, this.projectFilePath, sqlcmdVariablesResult.errorMessage));
        }
        this._sqlCmdVariables = new Map();
        for (const variable of sqlcmdVariablesResult.sqlCmdVariables) {
            this._sqlCmdVariables.set(variable.varName, variable.defaultValue); // store the default value that's specified in the .sqlproj
        }
    }
    /**
     * Gets all the files specified by <Build Inlude="..."> and removes all the files specified by <Build Remove="...">
     * and all files included by the default glob of the folder of the sqlproj if it's an sdk style project
     */
    async readSqlObjectScripts() {
        const filesSet = new Set();
        var result = await this.sqlProjService.getSqlObjectScripts(this.projectFilePath);
        utils.throwIfFailed(result);
        if (result.scripts?.length > 0) {
            // empty array from SqlToolsService is deserialized as null
            for (var script of result.scripts) {
                filesSet.add(script);
            }
        }
        // create a FileProjectEntry for each file
        const sqlObjectScriptEntries = [];
        for (let f of Array.from(filesSet.values())) {
            const containsCreateTableStatement = await this.checkForCreateTableStatement(f);
            sqlObjectScriptEntries.push(this.createFileProjectEntry(f, 0 /* EntryType.File */, undefined, containsCreateTableStatement));
        }
        this._sqlObjectScripts = sqlObjectScriptEntries;
    }
    /**
     * Checks if a SQL script file contains a CREATE TABLE statement
     * @param relativePath Relative path to the script file
     * @returns true if the file contains a CREATE TABLE statement, false otherwise
     */
    async checkForCreateTableStatement(relativePath) {
        const fullPath = path.join(utils.getPlatformSafeFileEntryPath(this.projectFolderPath), utils.getPlatformSafeFileEntryPath(relativePath));
        if (!(await utils.exists(fullPath))) {
            return false;
        }
        try {
            const dacFxService = await utils.getDacFxService();
            const parseResult = await dacFxService.parseTSqlScript(fullPath, this._databaseSchemaProvider);
            return parseResult.containsCreateTableStatement;
        }
        catch {
            // If parsing fails, silently default to false
            return false;
        }
    }
    async readFolders() {
        var result = await this.sqlProjService.getFolders(this.projectFilePath);
        utils.throwIfFailed(result);
        const folderEntries = [];
        if (result.folders?.length > 0) {
            // empty array from SqlToolsService is deserialized as null
            for (var folderPath of result.folders) {
                // Don't include folders that aren't supported:
                // 1. Don't add Properties folder since it isn't supported in ADS.In SSDT, it isn't a physical folder, but it's specified in legacy sql projects
                // to display the Properties node in the project tree.
                // 2. Don't add external folders (relative path starts with "..")
                if (folderPath === constants.Properties ||
                    folderPath.startsWith(constants.RelativeOuterPath)) {
                    continue;
                }
                folderEntries.push(this.createFileProjectEntry(folderPath, 1 /* EntryType.Folder */));
            }
        }
        this._folders = folderEntries;
    }
    async readPreDeployScripts(warnIfMultiple = false) {
        var result = await this.sqlProjService.getPreDeploymentScripts(this.projectFilePath);
        utils.throwIfFailed(result);
        const preDeploymentScriptEntries = [];
        if (result.scripts?.length > 0) {
            // empty array from SqlToolsService is deserialized as null
            for (var scriptPath of result.scripts) {
                preDeploymentScriptEntries.push(this.createFileProjectEntry(scriptPath, 0 /* EntryType.File */));
            }
        }
        if (preDeploymentScriptEntries.length > 1 && warnIfMultiple) {
            void vscode_1.window.showWarningMessage(constants.prePostDeployCount, constants.okString);
        }
        this._preDeployScripts = preDeploymentScriptEntries;
    }
    async readPostDeployScripts(warnIfMultiple = false) {
        var result = await this.sqlProjService.getPostDeploymentScripts(this.projectFilePath);
        utils.throwIfFailed(result);
        const postDeploymentScriptEntries = [];
        if (result.scripts?.length > 0) {
            // empty array from SqlToolsService is deserialized as null
            for (var scriptPath of result.scripts) {
                postDeploymentScriptEntries.push(this.createFileProjectEntry(scriptPath, 0 /* EntryType.File */));
            }
        }
        if (postDeploymentScriptEntries.length > 1 && warnIfMultiple) {
            void vscode_1.window.showWarningMessage(constants.prePostDeployCount, constants.okString);
        }
        this._postDeployScripts = postDeploymentScriptEntries;
    }
    async readNoneItems() {
        const sqlProjService = (await utils.getSqlProjectsService());
        var result = await sqlProjService.getNoneItems(this.projectFilePath);
        utils.throwIfFailed(result);
        const noneItemEntries = [];
        if (result.scripts?.length > 0) {
            // empty array from SqlToolsService is deserialized as null
            for (var path of result.scripts) {
                // Skip glob patterns - they should be expanded by the backend
                // MSBuild globs can include: *, **, ?, [abc], [a-z], [!abc]
                if (path.includes("*") || path.includes("?") || path.includes("[")) {
                    continue;
                }
                noneItemEntries.push(this.createFileProjectEntry(path, 0 /* EntryType.File */));
            }
        }
        this._noneDeployScripts = [];
        this._publishProfiles = [];
        for (const entry of noneItemEntries) {
            if (utils.isPublishProfile(entry.relativePath)) {
                this._publishProfiles.push(entry);
            }
            else {
                this._noneDeployScripts.push(entry);
            }
        }
    }
    async readDatabaseReferences() {
        this._databaseReferences = [];
        const databaseReferencesResult = await this.sqlProjService.getDatabaseReferences(this.projectFilePath);
        for (const dacpacReference of databaseReferencesResult.dacpacReferences) {
            this._databaseReferences.push(new projectEntry_1.DacpacReferenceProjectEntry({
                dacpacFileLocation: vscode_1.Uri.file(dacpacReference.dacpacPath),
                suppressMissingDependenciesErrors: dacpacReference.suppressMissingDependencies,
                databaseVariableLiteralValue: dacpacReference.databaseVariableLiteralName,
                databaseName: dacpacReference.databaseVariable?.varName,
                databaseVariable: dacpacReference.databaseVariable?.value,
                serverName: dacpacReference.serverVariable?.varName,
                serverVariable: dacpacReference.serverVariable?.value,
            }));
        }
        for (const projectReference of databaseReferencesResult.sqlProjectReferences) {
            this._databaseReferences.push(new projectEntry_1.SqlProjectReferenceProjectEntry({
                projectName: path.basename(utils.getPlatformSafeFileEntryPath(projectReference.projectPath), constants.sqlprojExtension),
                projectGuid: projectReference.projectGuid ?? "",
                suppressMissingDependenciesErrors: projectReference.suppressMissingDependencies,
                projectRelativePath: vscode_1.Uri.file(utils.getPlatformSafeFileEntryPath(projectReference.projectPath)),
                databaseVariableLiteralValue: projectReference.databaseVariableLiteralName,
                databaseName: projectReference.databaseVariable?.varName,
                databaseVariable: projectReference.databaseVariable?.value,
                serverName: projectReference.serverVariable?.varName,
                serverVariable: projectReference.serverVariable?.value,
            }));
        }
        for (const systemDbReference of databaseReferencesResult.systemDatabaseReferences) {
            const systemDb = systemDbReference.systemDb === 0 /* vscodeMssql.SystemDatabase.Master */
                ? constants.master
                : constants.msdb;
            this._databaseReferences.push(new projectEntry_1.SystemDatabaseReferenceProjectEntry(systemDb, systemDbReference.databaseVariableLiteralName, systemDbReference.suppressMissingDependencies));
        }
        for (const nupkgReference of databaseReferencesResult.nugetPackageReferences) {
            this._databaseReferences.push(new projectEntry_1.NugetPackageReferenceProjectEntry({
                packageName: nupkgReference.packageName,
                packageVersion: nupkgReference.packageVersion,
                suppressMissingDependenciesErrors: nupkgReference.suppressMissingDependencies,
                databaseVariableLiteralValue: nupkgReference.databaseVariableLiteralName,
                databaseName: nupkgReference.databaseVariable?.varName,
                databaseVariable: nupkgReference.databaseVariable?.value,
                serverName: nupkgReference.serverVariable?.varName,
                serverVariable: nupkgReference.serverVariable?.value,
            }));
        }
    }
    //#endregion
    resetProject() {
        this._sqlObjectScripts = [];
        this._databaseReferences = [];
        this._sqlCmdVariables = new Map();
        this._preDeployScripts = [];
        this._postDeployScripts = [];
        this._noneDeployScripts = [];
        this._outputPath = "";
        this._configuration = Configuration.Debug;
        this._publishProfiles = [];
    }
    async updateProjectForCrossPlatform() {
        if (this.isCrossPlatformCompatible) {
            return;
        }
        telemetry_1.TelemetryReporter.sendActionEvent(telemetry_1.TelemetryViews.ProjectController, telemetry_1.TelemetryActions.updateProjectForRoundtrip);
        // due to bug in DacFx.Projects, if a backup file already exists this will fail
        // workaround is to rename the existing backup
        if (await utils.exists(this.projectFilePath + "_backup")) {
            let counter = 2;
            while (await utils.exists(this.projectFilePath + "_backup" + counter)) {
                counter++;
            }
            await fs_1.promises.rename(this.projectFilePath + "_backup", this.projectFilePath + "_backup" + counter);
        }
        const result = await this.sqlProjService.updateProjectForCrossPlatform(this.projectFilePath);
        utils.throwIfFailed(result);
        await this.readCrossPlatformCompatibility();
    }
    //#region Add/Delete/Exclude functions
    //#region Folders
    /**
     * Adds a folder to the project, and saves the project file
     * @param relativeFolderPath Relative path of the folder
     */
    async addFolder(relativeFolderPath) {
        if (relativeFolderPath.endsWith("\\")) {
            relativeFolderPath = relativeFolderPath.slice(0, -1);
        }
        const result = await this.sqlProjService.addFolder(this.projectFilePath, relativeFolderPath);
        utils.throwIfFailed(result);
        // Note: adding a folder does not mean adding the contents of the folder.
        // SDK projects may still need to adjust their include/exclude globs, and Legacy projects must still include each file
        // in order for the contents of the folders to be added.
        await this.readFolders();
    }
    async deleteFolder(relativeFolderPath) {
        const result = await this.sqlProjService.deleteFolder(this.projectFilePath, relativeFolderPath);
        utils.throwIfFailed(result);
        await this.readSqlObjectScripts();
        await this.readPreDeployScripts();
        await this.readPostDeployScripts();
        await this.readNoneItems();
        await this.readFolders();
    }
    async excludeFolder(relativeFolderPath) {
        const result = await this.sqlProjService.excludeFolder(this.projectFilePath, relativeFolderPath);
        utils.throwIfFailed(result);
        await this.readSqlObjectScripts();
        await this.readPreDeployScripts();
        await this.readPostDeployScripts();
        await this.readNoneItems();
        await this.readFolders();
    }
    async moveFolder(relativeSourcePath, relativeDestinationPath) {
        const result = await this.sqlProjService.moveFolder(this.projectFilePath, relativeSourcePath, relativeDestinationPath);
        utils.throwIfFailed(result);
        await this.readSqlObjectScripts();
        await this.readPreDeployScripts();
        await this.readPostDeployScripts();
        await this.readNoneItems();
        await this.readFolders();
    }
    //#endregion
    //#region SQL object scripts
    async addSqlObjectScript(relativePath, reloadAfter = true) {
        const result = await this.sqlProjService.addSqlObjectScript(this.projectFilePath, relativePath);
        utils.throwIfFailed(result);
        if (reloadAfter) {
            await this.readSqlObjectScripts();
            await this.readFolders();
        }
    }
    async addSqlObjectScripts(relativePaths) {
        for (const path of relativePaths) {
            await this.addSqlObjectScript(path, false /* reloadAfter */);
        }
        await this.readSqlObjectScripts();
        await this.readFolders();
    }
    async deleteSqlObjectScript(relativePath) {
        const result = await this.sqlProjService.deleteSqlObjectScript(this.projectFilePath, relativePath);
        utils.throwIfFailed(result);
        await this.readSqlObjectScripts();
        await this.readFolders();
    }
    async excludeSqlObjectScript(relativePath) {
        const result = await this.sqlProjService.excludeSqlObjectScript(this.projectFilePath, relativePath);
        utils.throwIfFailed(result);
        await this.readSqlObjectScripts();
        await this.readFolders();
    }
    //#endregion
    //#region Pre-deployment scripts
    async addPreDeploymentScript(relativePath) {
        if (this.preDeployScripts.length > 0) {
            void vscode.window.showInformationMessage(constants.deployScriptExists(constants.PreDeploy));
        }
        const result = await this.sqlProjService.addPreDeploymentScript(this.projectFilePath, relativePath);
        utils.throwIfFailed(result);
        await this.readPreDeployScripts();
        await this.readNoneItems();
        await this.readFolders();
    }
    async deletePreDeploymentScript(relativePath) {
        const result = await this.sqlProjService.deletePreDeploymentScript(this.projectFilePath, relativePath);
        utils.throwIfFailed(result);
        await this.readPreDeployScripts();
        await this.readFolders();
    }
    async excludePreDeploymentScript(relativePath) {
        const result = await this.sqlProjService.excludePreDeploymentScript(this.projectFilePath, relativePath);
        utils.throwIfFailed(result);
        await this.readPreDeployScripts();
        await this.readFolders();
    }
    //#endregion
    //#region Post-deployment scripts
    async addPostDeploymentScript(relativePath) {
        if (this.postDeployScripts.length > 0) {
            void vscode.window.showInformationMessage(constants.deployScriptExists(constants.PostDeploy));
        }
        const result = await this.sqlProjService.addPostDeploymentScript(this.projectFilePath, relativePath);
        utils.throwIfFailed(result);
        await this.readPostDeployScripts();
        await this.readNoneItems();
        await this.readFolders();
    }
    async deletePostDeploymentScript(relativePath) {
        const result = await this.sqlProjService.deletePostDeploymentScript(this.projectFilePath, relativePath);
        utils.throwIfFailed(result);
        await this.readPostDeployScripts();
        await this.readFolders();
    }
    async excludePostDeploymentScript(relativePath) {
        const result = await this.sqlProjService.excludePostDeploymentScript(this.projectFilePath, relativePath);
        utils.throwIfFailed(result);
        await this.readPostDeployScripts();
        await this.readFolders();
    }
    //#endregion
    //#region None items
    async addNoneItem(relativePath) {
        const result = await this.sqlProjService.addNoneItem(this.projectFilePath, relativePath);
        utils.throwIfFailed(result);
        await this.readNoneItems();
        await this.readFolders();
    }
    async deleteNoneItem(relativePath) {
        const result = await this.sqlProjService.deleteNoneItem(this.projectFilePath, relativePath);
        utils.throwIfFailed(result);
        await this.readNoneItems();
        await this.readFolders();
    }
    async excludeNoneItem(relativePath) {
        const result = await this.sqlProjService.excludeNoneItem(this.projectFilePath, relativePath);
        utils.throwIfFailed(result);
        await this.readNoneItems();
        await this.readFolders();
    }
    //#endregion
    //#endregion
    /**
     * Writes a file to disk if contents are provided, adds that file to the project, and writes it to disk
     *
     * @param relativeFilePath Relative path of the file
     * @param contents Contents to be written to the new file
     * @param itemType Type of the project entry to add. This maps to the build action for the item.
     */
    async addScriptItem(relativeFilePath, contents, itemType) {
        // Check if file already has been added to sqlproj
        const normalizedRelativeFilePath = utils.convertSlashesForSqlProj(relativeFilePath);
        const existingEntry = this.sqlObjectScripts.find((f) => f.relativePath.toUpperCase() === normalizedRelativeFilePath.toUpperCase());
        if (existingEntry) {
            return existingEntry;
        }
        // Ensure the file exists // TODO: can be pushed down to DacFx
        const absoluteFilePath = path.join(this.projectFolderPath, relativeFilePath);
        await utils.ensureFileExists(absoluteFilePath, contents);
        switch (itemType) {
            case "preDeployScript" /* ItemType.preDeployScript */:
                await this.addPreDeploymentScript(relativeFilePath);
                break;
            case "postDeployScript" /* ItemType.postDeployScript */:
                await this.addPostDeploymentScript(relativeFilePath);
                break;
            default:
                await this.addSqlObjectScript(relativeFilePath);
                break;
        }
        return this.createFileProjectEntry(normalizedRelativeFilePath, 0 /* EntryType.File */);
    }
    /**
     * Adds a file to the project, and saves the project file
     *
     * @param filePath Absolute path of the file
     */
    async addExistingItem(filePath) {
        const exists = await utils.exists(filePath);
        if (!exists) {
            throw new Error(constants.noFileExist(filePath));
        }
        const normalizedRelativeFilePath = utils.convertSlashesForSqlProj(path.relative(this.projectFolderPath, filePath));
        let result;
        if (path.extname(filePath) === constants.sqlFileExtension) {
            result = await this.sqlProjService.addSqlObjectScript(this.projectFilePath, normalizedRelativeFilePath);
            await this.readSqlObjectScripts();
        }
        else {
            result = await this.sqlProjService.addNoneItem(this.projectFilePath, normalizedRelativeFilePath);
            await this.readNoneItems();
        }
        utils.throwIfFailed(result);
        await this.readFolders();
        return this.createFileProjectEntry(normalizedRelativeFilePath, 0 /* EntryType.File */);
    }
    /**
     * Set the target platform of the project
     * @param compatLevel compat level of project
     */
    async changeTargetPlatform(compatLevel) {
        if (this.getProjectTargetVersion() === compatLevel) {
            return;
        }
        telemetry_1.TelemetryReporter.createActionEvent(telemetry_1.TelemetryViews.ProjectTree, telemetry_1.TelemetryActions.changePlatformType)
            .withAdditionalProperties({
            from: this.getProjectTargetVersion(),
            to: compatLevel,
        })
            .send();
        this._databaseSchemaProvider = `${constants.MicrosoftDatatoolsSchemaSqlSql}${compatLevel}${constants.databaseSchemaProvider}`;
        const result = await this.sqlProjService.setDatabaseSchemaProvider(this.projectFilePath, this._databaseSchemaProvider);
        utils.throwIfFailed(result);
    }
    /**
     * Gets the project target version specified in the DSP property in the sqlproj
     */
    getProjectTargetVersion() {
        // Get version from dsp, which is a string like "Microsoft.Data.Tools.Schema.Sql.Sql130DatabaseSchemaProvider"
        // Remove prefix and suffix to only get the actual version number/name. For the example above, the result should be just '130'.
        const version = this._databaseSchemaProvider.substring(constants.MicrosoftDatatoolsSchemaSqlSql.length, this._databaseSchemaProvider.length - constants.databaseSchemaProvider.length);
        // make sure version is valid
        if (!Array.from(constants.targetPlatformToVersion.values()).includes(version)) {
            throw new Error(constants.invalidDataSchemaProvider);
        }
        return version;
    }
    /**
     * Gets the default database collation set in the project.
     *
     * @returns Default collation for the database set in the project.
     */
    getDatabaseDefaultCollation() {
        return this._defaultCollation;
    }
    //#region Database References
    /**
     * Adds reference to the appropriate system database dacpac to the project
     */
    async addSystemDatabaseReference(settings) {
        // check if reference to this database already exists
        if (this.databaseReferences.find((r) => r.referenceName === settings.databaseVariableLiteralValue)) {
            throw new Error(constants.databaseReferenceAlreadyExists);
        }
        let result, sqlProjService;
        const systemDb = settings.systemDb;
        const referenceType = settings.systemDbReferenceType;
        sqlProjService = this.sqlProjService;
        result = await sqlProjService.addSystemDatabaseReference(this.projectFilePath, systemDb, settings.suppressMissingDependenciesErrors, referenceType, settings.databaseVariableLiteralValue);
        if (!result.success && result.errorMessage) {
            throw new Error(constants.errorAddingDatabaseReference(utils.systemDatabaseToString(settings.systemDb), result.errorMessage));
        }
        await this.readDatabaseReferences();
    }
    /**
     * Adds reference to a dacpac to the project
     */
    async addDatabaseReference(settings) {
        const databaseReferenceEntry = new projectEntry_1.DacpacReferenceProjectEntry(settings);
        await this.addUserDatabaseReference(settings, databaseReferenceEntry);
    }
    /**
     * Adds reference to a another project in the workspace
     */
    async addProjectReference(settings) {
        const projectReferenceEntry = new projectEntry_1.SqlProjectReferenceProjectEntry(settings);
        await this.addUserDatabaseReference(settings, projectReferenceEntry);
    }
    async addNugetPackageReference(settings) {
        const nupkgReferenceEntry = new projectEntry_1.NugetPackageReferenceProjectEntry(settings);
        await this.addUserDatabaseReference(settings, nupkgReferenceEntry);
    }
    async addUserDatabaseReference(settings, reference) {
        // check if reference to this database already exists
        if (this.databaseReferenceExists(reference)) {
            throw new Error(constants.databaseReferenceAlreadyExists);
        }
        // create database variable
        if (settings.databaseVariable && settings.databaseName) {
            await this.sqlProjService.addSqlCmdVariable(this.projectFilePath, settings.databaseVariable, settings.databaseName);
            // create server variable - only can be set when there's also a database variable (reference to different database on different server)
            if (settings.serverVariable && settings.serverName) {
                await this.sqlProjService.addSqlCmdVariable(this.projectFilePath, settings.serverVariable, settings.serverName);
            }
            await this.readSqlCmdVariables();
        }
        const databaseLiteral = settings.databaseVariable ? undefined : settings.databaseName;
        let result, referenceName;
        if (reference instanceof projectEntry_1.SqlProjectReferenceProjectEntry) {
            referenceName = settings.projectName;
            result = await this.sqlProjService.addSqlProjectReference(this.projectFilePath, reference.pathForSqlProj(), reference.projectGuid, settings.suppressMissingDependenciesErrors, settings.databaseVariable, settings.serverVariable, databaseLiteral);
        }
        else if (reference instanceof projectEntry_1.DacpacReferenceProjectEntry) {
            referenceName = settings.dacpacFileLocation.fsPath;
            result = await this.sqlProjService.addDacpacReference(this.projectFilePath, reference.pathForSqlProj(), settings.suppressMissingDependenciesErrors, settings.databaseVariable, settings.serverVariable, databaseLiteral);
        }
        else {
            // nupkg reference
            referenceName = settings.packageName;
            result = await this.sqlProjService.addNugetPackageReference(this.projectFilePath, reference.packageName, settings.packageVersion, settings.suppressMissingDependenciesErrors, settings.databaseVariable, settings.serverVariable, databaseLiteral);
        }
        if (!result.success && result.errorMessage) {
            throw new Error(constants.errorAddingDatabaseReference(referenceName, result.errorMessage));
        }
        await this.readDatabaseReferences();
    }
    databaseReferenceExists(entry) {
        const found = this._databaseReferences.find((reference) => reference.pathForSqlProj() === entry.pathForSqlProj()) !== undefined;
        return found;
    }
    async deleteDatabaseReferenceByEntry(entry) {
        await this.deleteDatabaseReference(entry.pathForSqlProj());
    }
    async deleteDatabaseReference(name) {
        const result = await this.sqlProjService.deleteDatabaseReference(this.projectFilePath, name);
        utils.throwIfFailed(result);
        await this.readDatabaseReferences();
    }
    //#endregion
    //#region SQLCMD Variables
    /**
     * Adds a SQLCMD variable to the project
     * @param name name of the variable
     * @param defaultValue
     */
    async addSqlCmdVariable(name, defaultValue) {
        const result = await this.sqlProjService.addSqlCmdVariable(this.projectFilePath, name, defaultValue);
        utils.throwIfFailed(result);
        await this.readSqlCmdVariables();
    }
    /**
     * Updates a SQLCMD variable in the project
     * @param name name of the variable
     * @param defaultValue
     */
    async updateSqlCmdVariable(name, defaultValue) {
        const result = await this.sqlProjService.updateSqlCmdVariable(this.projectFilePath, name, defaultValue);
        utils.throwIfFailed(result);
        await this.readSqlCmdVariables();
    }
    async deleteSqlCmdVariable(variableName) {
        const result = await this.sqlProjService.deleteSqlCmdVariable(this.projectFilePath, variableName);
        utils.throwIfFailed(result);
        await this.readSqlCmdVariables();
    }
    //#endregion
    /**
     * Appends given database source to the DatabaseSource property element.
     * If property element does not exist, then new one will be created.
     *
     * @param databaseSource Source of the database to add
     */
    async addDatabaseSource(databaseSource) {
        if (databaseSource.includes(";")) {
            throw Error(constants.invalidProjectPropertyValueProvided(";"));
        }
        const sources = this.getDatabaseSourceValues();
        const index = sources.findIndex((x) => x === databaseSource);
        if (index !== -1) {
            return;
        }
        sources.push(databaseSource);
        const result = await this.sqlProjService.setDatabaseSource(this.projectFilePath, sources.join(";"));
        utils.throwIfFailed(result);
        await this.readProjectProperties();
    }
    /**
     * Removes database source from the DatabaseSource property element.
     * If no sources remain, then property element will be removed from the project file.
     *
     * @param databaseSource Source of the database to remove
     */
    async removeDatabaseSource(databaseSource) {
        if (databaseSource.includes(";")) {
            throw Error(constants.invalidProjectPropertyValueProvided(";"));
        }
        const sources = this.getDatabaseSourceValues();
        const index = sources.findIndex((x) => x === databaseSource);
        if (index === -1) {
            return;
        }
        sources.splice(index, 1);
        const result = await this.sqlProjService.setDatabaseSource(this.projectFilePath, sources.join(";"));
        utils.throwIfFailed(result);
        await this.readProjectProperties();
    }
    /**
     * Gets an array of all database sources specified in the project.
     *
     * @returns Array of all database sources
     */
    getDatabaseSourceValues() {
        return this._databaseSource.trim() === "" ? [] : this._databaseSource.split(";");
    }
    createFileProjectEntry(relativePath, entryType, sqlObjectType, containsCreateTableStatement) {
        let platformSafeRelativePath = utils.getPlatformSafeFileEntryPath(relativePath);
        return new projectEntry_1.FileProjectEntry(vscode_1.Uri.file(path.join(this.projectFolderPath, platformSafeRelativePath)), utils.convertSlashesForSqlProj(relativePath), entryType, sqlObjectType, containsCreateTableStatement);
    }
    /**
     * Moves a file to a different location
     * @param node Node being moved
     * @param destinationRelativePath path of the destination, relative to .sqlproj
     */
    async move(node, destinationRelativePath) {
        // trim off the project folder at the beginning of the relative path stored in the tree
        const projectRelativeUri = vscode.Uri.file(path.basename(this.projectFilePath, constants.sqlprojExtension));
        const originalRelativePath = utils.trimUri(projectRelativeUri, node.relativeProjectUri);
        destinationRelativePath = utils.trimUri(projectRelativeUri, vscode.Uri.file(destinationRelativePath));
        if (originalRelativePath === destinationRelativePath) {
            return { success: true, errorMessage: "" };
        }
        let result;
        if (node instanceof fileFolderTreeItem_1.SqlObjectFileNode) {
            result = await this.sqlProjService.moveSqlObjectScript(this.projectFilePath, originalRelativePath, destinationRelativePath);
        }
        else if (node instanceof fileFolderTreeItem_1.PreDeployNode) {
            result = await this.sqlProjService.movePreDeploymentScript(this.projectFilePath, originalRelativePath, destinationRelativePath);
        }
        else if (node instanceof fileFolderTreeItem_1.PostDeployNode) {
            result = await this.sqlProjService.movePostDeploymentScript(this.projectFilePath, originalRelativePath, destinationRelativePath);
        }
        else if (node instanceof fileFolderTreeItem_1.NoneNode || node instanceof fileFolderTreeItem_1.PublishProfileNode) {
            result = await this.sqlProjService.moveNoneItem(this.projectFilePath, originalRelativePath, destinationRelativePath);
        }
        else if (node instanceof fileFolderTreeItem_1.FolderNode) {
            result = await this.sqlProjService.moveFolder(this.projectFilePath, originalRelativePath, destinationRelativePath);
        }
        else {
            result = { success: false, errorMessage: constants.unhandledMoveNode };
        }
        return result;
    }
}
exports.Project = Project;
//# sourceMappingURL=project.js.map