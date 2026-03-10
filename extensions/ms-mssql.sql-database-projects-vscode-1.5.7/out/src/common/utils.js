"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.getErrorMessage = getErrorMessage;
exports.showErrorMessageWithOutputChannel = showErrorMessageWithOutputChannel;
exports.trimUri = trimUri;
exports.trimChars = trimChars;
exports.ensureTrailingSlash = ensureTrailingSlash;
exports.exists = exists;
exports.getQuotedPath = getQuotedPath;
exports.getNonQuotedPath = getNonQuotedPath;
exports.getPlatformSafeFileEntryPath = getPlatformSafeFileEntryPath;
exports.convertSlashesForSqlProj = convertSlashesForSqlProj;
exports.systemDatabaseToString = systemDatabaseToString;
exports.getSystemDatabase = getSystemDatabase;
exports.readSqlCmdVariables = readSqlCmdVariables;
exports.removeSqlCmdVariableFormatting = removeSqlCmdVariableFormatting;
exports.formatSqlCmdVariable = formatSqlCmdVariable;
exports.validateSqlCmdVariableName = validateSqlCmdVariableName;
exports.getSqlProjectFilesInFolder = getSqlProjectFilesInFolder;
exports.getSqlProjectsInWorkspace = getSqlProjectsInWorkspace;
exports.getDataWorkspaceExtensionApi = getDataWorkspaceExtensionApi;
exports.getDacFxService = getDacFxService;
exports.getSchemaCompareService = getSchemaCompareService;
exports.getSqlProjectsService = getSqlProjectsService;
exports.getVscodeMssqlApi = getVscodeMssqlApi;
exports.defaultAzureResourceServiceFactory = defaultAzureResourceServiceFactory;
exports.defaultAzureAccountServiceFactory = defaultAzureAccountServiceFactory;
exports.getDefaultPublishDeploymentOptions = getDefaultPublishDeploymentOptions;
exports.getPackageInfo = getPackageInfo;
exports.timeConversion = timeConversion;
exports.detectCommandInstallation = detectCommandInstallation;
exports.globWithPattern = globWithPattern;
exports.getSqlFilesInFolder = getSqlFilesInFolder;
exports.getFoldersInFolder = getFoldersInFolder;
exports.getFoldersToFile = getFoldersToFile;
exports.getFoldersAlongPath = getFoldersAlongPath;
exports.getTargetPlatformFromServerVersion = getTargetPlatformFromServerVersion;
exports.isSqlDwUnifiedServer = isSqlDwUnifiedServer;
exports.isValidFilenameCharacter = isValidFilenameCharacter;
exports.sanitizeStringForFilename = sanitizeStringForFilename;
exports.isValidBasename = isValidBasename;
exports.isValidBasenameErrorMessage = isValidBasenameErrorMessage;
exports.isPublishProfile = isPublishProfile;
exports.ensureFileExists = ensureFileExists;
exports.throwIfFailed = throwIfFailed;
exports.createSqlProjectBuildTask = createSqlProjectBuildTask;
exports.createTasksJson = createTasksJson;
const vscode = require("vscode");
const os = require("os");
const constants = require("./constants");
const path = require("path");
const glob = require("fast-glob");
const fse = require("fs-extra");
const which = require("which");
const fs_1 = require("fs");
/**
 * Consolidates on the error message string
 */
function getErrorMessage(error) {
    return error instanceof Error
        ? typeof error.message === "string"
            ? error.message
            : ""
        : typeof error === "string"
            ? error
            : `${JSON.stringify(error, undefined, "\t")}`;
}
/**
 * Shows an error message with an option to view the output channel
 */
async function showErrorMessageWithOutputChannel(errorMessageFunc, error, outputChannel) {
    const result = await vscode.window.showErrorMessage(errorMessageFunc(getErrorMessage(error)), constants.checkoutOutputMessage);
    if (result === constants.checkoutOutputMessage) {
        outputChannel.show();
    }
}
/**
 * removes any leading portion shared between the two URIs from outerUri.
 * e.g. [@param innerUri: 'this\is'; @param outerUri: '\this\is\my\path'] => 'my\path' OR
 * e.g. [@param innerUri: 'this\was'; @param outerUri: '\this\is\my\path'] => '..\is\my\path'
 * @param innerUri the URI that will be cut away from the outer URI
 * @param outerUri the URI that will have any shared beginning portion removed
 */
function trimUri(innerUri, outerUri) {
    let innerParts = innerUri.path.split("/");
    let outerParts = outerUri.path.split("/");
    if (path.isAbsolute(outerUri.path) &&
        innerParts.length > 0 &&
        outerParts.length > 0 &&
        innerParts[0].toLowerCase() !== outerParts[0].toLowerCase()) {
        throw new Error(constants.outsideFolderPath);
    }
    while (innerParts.length > 0 &&
        outerParts.length > 0 &&
        innerParts[0].toLocaleLowerCase() === outerParts[0].toLocaleLowerCase()) {
        innerParts = innerParts.slice(1);
        outerParts = outerParts.slice(1);
    }
    while (innerParts.length > 1) {
        outerParts.unshift(constants.RelativeOuterPath);
        innerParts = innerParts.slice(1);
    }
    return outerParts.join("/");
}
/**
 * Trims any character contained in @param chars from both the beginning and end of @param input
 */
function trimChars(input, chars) {
    let output = input;
    let i = 0;
    while (chars.includes(output[i])) {
        i++;
    }
    output = output.substr(i);
    i = 0;
    while (chars.includes(output[output.length - i - 1])) {
        i++;
    }
    output = output.substring(0, output.length - i);
    return output;
}
/**
 * Ensures that folder path terminates with the slash.
 * By default SSDT-style slash (`\`) is used.
 *
 * @param path Folder path to ensure trailing slash for.
 * @param slashCharacter Slash character to ensure is present at the end of the path.
 * @returns Path that ends with the given slash character.
 */
function ensureTrailingSlash(path, slashCharacter = constants.SqlProjPathSeparator) {
    return path.endsWith(slashCharacter) ? path : path + slashCharacter;
}
/**
 * Checks if the folder or file exists @param path path of the folder/file
 */
async function exists(path) {
    try {
        await fs_1.promises.access(path);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * get quoted path to be used in any commandline argument
 * @param filePath
 */
function getQuotedPath(filePath) {
    return os.platform() === "win32"
        ? '"' + getNonQuotedWindowsPath(filePath) + '"'
        : '"' + getNonQuotedNonWindowsPath(filePath) + '"';
}
/**
 * get non quoted path to be used in any commandline argument
 * @param filePath
 */
function getNonQuotedPath(filePath) {
    return os.platform() === "win32"
        ? getNonQuotedWindowsPath(filePath)
        : getNonQuotedNonWindowsPath(filePath);
}
/**
 * ensure that path with spaces are handles correctly (return non quoted path)
 */
function getNonQuotedWindowsPath(filePath) {
    return filePath.split("\\").join("\\\\").split('"').join("");
}
/**
 * ensure that path with spaces are handles correctly (return non quoted path)
 */
function getNonQuotedNonWindowsPath(filePath) {
    return filePath.split("\\").join("/").split('"').join("");
}
/**
 * Get safe relative path for Windows and non-Windows Platform
 * This is needed to read sqlproj entried created on SSDT and opened in MAC
 * '/' in tree is recognized all platforms but "\\" only by windows
 *
 * @param filePath Path to the file or folder.
 */
function getPlatformSafeFileEntryPath(filePath) {
    return filePath.includes("\\") ? filePath.split("\\").join("/") : filePath;
}
/**
 * Standardizes slashes to be "\" for consistency between platforms and compatibility with SSDT
 *
 * @param filePath Path to the file of folder.
 */
function convertSlashesForSqlProj(filePath) {
    return filePath.includes("/")
        ? filePath.split("/").join(constants.SqlProjPathSeparator)
        : filePath;
}
/**
 * Converts a SystemDatabase enum to its string value
 * @param systemDb
 * @returns
 */
function systemDatabaseToString(systemDb) {
    if (systemDb === 0 /* vscodeMssql.SystemDatabase.Master */) {
        return constants.master;
    }
    else {
        return constants.msdb;
    }
}
function getSystemDatabase(name) {
    return name === constants.master
        ? 0 /* vscodeMssql.SystemDatabase.Master */
        : 1 /* vscodeMssql.SystemDatabase.MSDB */;
}
/**
 * Read SQLCMD variables from xmlDoc and return them
 * @param xmlDoc xml doc to read SQLCMD variables from. Format must be the same that sqlproj and publish profiles use
 * @param publishProfile true if reading from publish profile
 */
function readSqlCmdVariables(xmlDoc, publishProfile) {
    let sqlCmdVariables = new Map();
    for (let i = 0; i < xmlDoc.documentElement.getElementsByTagName(constants.SqlCmdVariable)?.length; i++) {
        const sqlCmdVar = xmlDoc.documentElement.getElementsByTagName(constants.SqlCmdVariable)[i];
        const varName = sqlCmdVar.getAttribute(constants.Include);
        // Publish profiles only support Value, so don't use DefaultValue even if it's there
        // SSDT uses the Value (like <Value>$(SqlCmdVar__1)</Value>) where there
        // are local variable values you can set in VS in the properties. Since we don't support that in ADS, only DefaultValue is supported for sqlproj.
        if (!publishProfile &&
            sqlCmdVar.getElementsByTagName(constants.DefaultValue)[0] !== undefined) {
            // project file path
            sqlCmdVariables.set(varName, sqlCmdVar.getElementsByTagName(constants.DefaultValue)[0].childNodes[0].nodeValue);
        }
        else {
            // profile path
            sqlCmdVariables.set(varName, sqlCmdVar.getElementsByTagName(constants.Value)[0].childNodes[0].nodeValue);
        }
    }
    return sqlCmdVariables;
}
/**
 * 	Removes $() around a sqlcmd variable
 * @param name
 */
function removeSqlCmdVariableFormatting(name) {
    if (!name || name === "") {
        return "";
    }
    if (name.length > 3) {
        // Trim in case we get "  $(x)"
        name = name.trim();
        let indexStart = name.startsWith("$(") ? 2 : 0;
        let indexEnd = name.endsWith(")") ? 1 : 0;
        if (indexStart > 0 || indexEnd > 0) {
            name = name.substr(indexStart, name.length - indexEnd - indexStart);
        }
    }
    // Trim in case the customer types "  $(x   )"
    return name.trim();
}
/**
 * 	Format as sqlcmd variable by adding $() if necessary
 * if the variable already starts with $(, then add )
 * @param name
 */
function formatSqlCmdVariable(name) {
    if (!name || name === "") {
        return name;
    }
    // Trim in case we get "  $(x)"
    name = name.trim();
    if (!name.startsWith("$(") && !name.endsWith(")")) {
        name = `$(${name})`;
    }
    else if (name.startsWith("$(") && !name.endsWith(")")) {
        // add missing end parenthesis, same behavior as SSDT
        name = `${name})`;
    }
    return name;
}
/**
 * Checks if it's a valid sqlcmd variable name
 * https://docs.microsoft.com/en-us/sql/ssms/scripting/sqlcmd-use-with-scripting-variables?redirectedfrom=MSDN&view=sql-server-ver15#guidelines-for-scripting-variable-names-and-values
 * @param name variable name to validate
 * @returns null if valid, otherwise an error message describing why input is invalid
 */
function validateSqlCmdVariableName(name) {
    // remove $() around named if it's there
    const cleanedName = removeSqlCmdVariableFormatting(name);
    // can't contain whitespace
    if (!cleanedName || cleanedName.trim() === "" || cleanedName.includes(" ")) {
        return constants.sqlcmdVariableNameCannotContainWhitespace(name ?? "");
    }
    // can't contain these characters
    if (constants.illegalSqlCmdChars.some((c) => cleanedName?.includes(c))) {
        return constants.sqlcmdVariableNameCannotContainIllegalChars(name ?? "");
    }
    // TODO: tsql parsing to check if it's a reserved keyword or invalid tsql https://github.com/microsoft/azuredatastudio/issues/12204
    return null;
}
/**
 * Recursively gets all the sqlproj files at any depth in a folder
 * @param folderPath
 */
async function getSqlProjectFilesInFolder(folderPath) {
    // path needs to use forward slashes for glob to work
    const escapedPath = glob.escapePath(folderPath.replace(/\\/g, "/"));
    const sqlprojFilter = path.posix.join(escapedPath, "**", "*.sqlproj");
    const results = await glob(sqlprojFilter);
    return results;
}
/**
 * Get all the projects in the workspace that are sqlproj
 */
function getSqlProjectsInWorkspace() {
    const api = getDataWorkspaceExtensionApi();
    return api.getProjectsInWorkspace(constants.sqlprojExtension);
}
function getDataWorkspaceExtensionApi() {
    const extension = vscode.extensions.getExtension("ms-mssql.data-workspace-vscode" /* dataworkspace.extension.vscodeName */);
    return extension.exports;
}
async function getDacFxService() {
    const api = await getVscodeMssqlApi();
    return api.dacFx;
}
async function getSchemaCompareService() {
    const api = await getVscodeMssqlApi();
    return api.schemaCompare;
}
async function getSqlProjectsService() {
    const api = await getVscodeMssqlApi();
    return api.sqlProjects;
}
async function getVscodeMssqlApi() {
    const ext = vscode.extensions.getExtension("ms-mssql.mssql" /* vscodeMssql.extension.name */);
    return ext.activate();
}
async function defaultAzureResourceServiceFactory() {
    const vscodeMssqlApi = await getVscodeMssqlApi();
    return vscodeMssqlApi.azureResourceService;
}
async function defaultAzureAccountServiceFactory() {
    const vscodeMssqlApi = await getVscodeMssqlApi();
    return vscodeMssqlApi.azureAccountService;
}
/*
 * Returns the default deployment options from DacFx, filtered to appropriate options for the given project.
 */
async function getDefaultPublishDeploymentOptions(project) {
    const dacFxService = await getDacFxService();
    const result = await dacFxService.getDeploymentOptions(0 /* DeploymentScenario.Deployment */);
    // this option needs to be true for same database references validation to work
    if (project.databaseReferences.length > 0) {
        result.defaultDeploymentOptions.booleanOptionsDictionary.includeCompositeObjects.value = true;
    }
    return result.defaultDeploymentOptions;
}
const extensionRootCandidates = Array.from(new Set([path.resolve(__dirname, "..", ".."), path.resolve(__dirname, "..", "..", "..")]));
function readJsonFromExtensionRoot(relativePath) {
    for (const candidateRoot of extensionRootCandidates) {
        const candidate = path.join(candidateRoot, relativePath);
        if (fse.pathExistsSync(candidate)) {
            try {
                return fse.readJSONSync(candidate);
            }
            catch {
                // ignore and continue to next candidate
            }
        }
    }
    return undefined;
}
function getPackageInfo(packageJson) {
    if (!packageJson) {
        packageJson = readJsonFromExtensionRoot("package.json");
    }
    if (!packageJson) {
        return undefined;
    }
    return {
        name: packageJson.name,
        version: packageJson.version,
        aiKey: packageJson.aiKey,
    };
}
/**
 * Converts time in milliseconds to hr, min, sec
 * @param duration time in milliseconds
 * @returns string in "hr, min, sec" or "msec" format
 */
function timeConversion(duration) {
    const portions = [];
    const msInHour = 1000 * 60 * 60;
    const hours = Math.trunc(duration / msInHour);
    if (hours > 0) {
        portions.push(`${hours} ${constants.hr}`);
        duration = duration - hours * msInHour;
    }
    const msInMinute = 1000 * 60;
    const minutes = Math.trunc(duration / msInMinute);
    if (minutes > 0) {
        portions.push(`${minutes} ${constants.min}`);
        duration = duration - minutes * msInMinute;
    }
    const seconds = Math.trunc(duration / 1000);
    if (seconds > 0) {
        portions.push(`${seconds} ${constants.sec}`);
    }
    if (hours === 0 && minutes === 0 && seconds === 0) {
        portions.push(`${duration} ${constants.msec}`);
    }
    return portions.join(", ");
}
/**
 * Detects whether the specified command-line command is available on the current machine
 */
async function detectCommandInstallation(command) {
    try {
        const found = await which(command);
        if (found) {
            return true;
        }
    }
    catch (err) {
        console.log(getErrorMessage(err));
    }
    return false;
}
/**
 * Returns the results of the glob pattern
 * @param pattern Glob pattern to search for
 */
async function globWithPattern(pattern) {
    const forwardSlashPattern = pattern.replace(/\\/g, "/");
    return await glob(forwardSlashPattern);
}
/**
 * Recursively gets all the sql files at any depth in a folder
 * @param folderPath
 * @param ignoreBinObj ignore sql files in bin and obj folders
 */
async function getSqlFilesInFolder(folderPath, ignoreBinObj) {
    // path needs to use forward slashes for glob to work
    folderPath = folderPath.replace(/\\/g, "/");
    const sqlFilter = path.posix.join(folderPath, "**", "*.sql");
    if (ignoreBinObj) {
        // don't add files in bin and obj folders
        const binIgnore = path.posix.join(folderPath, "bin", "**", "*.sql");
        const objIgnore = path.posix.join(folderPath, "obj", "**", "*.sql");
        return await glob(sqlFilter, { ignore: [binIgnore, objIgnore] });
    }
    else {
        return await glob(sqlFilter);
    }
}
/**
 * Recursively gets all the folders at any depth in the given folder
 * @param folderPath
 * @param ignoreBinObj ignore bin and obj folders
 */
async function getFoldersInFolder(folderPath, ignoreBinObj) {
    // path needs to use forward slashes for glob to work
    const escapedPath = glob.escapePath(folderPath.replace(/\\/g, "/"));
    const folderFilter = path.posix.join(escapedPath, "/**");
    if (ignoreBinObj) {
        // don't add bin and obj folders
        const binIgnore = path.posix.join(escapedPath, "bin");
        const objIgnore = path.posix.join(escapedPath, "obj");
        return await glob(folderFilter, { onlyDirectories: true, ignore: [binIgnore, objIgnore] });
    }
    else {
        return await glob(folderFilter, { onlyDirectories: true });
    }
}
/**
 * Gets the folders between the startFolder to the file
 * @param startFolder
 * @param endFile
 * @returns array of folders between startFolder and endFile
 */
function getFoldersToFile(startFolder, endFile) {
    let folders = [];
    const endFolderPath = path.dirname(endFile);
    const relativePath = convertSlashesForSqlProj(endFolderPath.substring(startFolder.length));
    const pathSegments = trimChars(relativePath, " \\").split(constants.SqlProjPathSeparator);
    let folderPath = convertSlashesForSqlProj(startFolder) + constants.SqlProjPathSeparator;
    for (let segment of pathSegments) {
        if (segment) {
            folderPath += segment + constants.SqlProjPathSeparator;
            folders.push(getPlatformSafeFileEntryPath(folderPath));
        }
    }
    return folders;
}
/**
 * Gets the folders between the startFolder and endFolder
 * @param startFolder
 * @param endFolder
 * @returns array of folders between startFolder and endFolder
 */
function getFoldersAlongPath(startFolder, endFolder) {
    let folders = [];
    const relativePath = convertSlashesForSqlProj(endFolder.substring(startFolder.length));
    const pathSegments = trimChars(relativePath, " \\").split(constants.SqlProjPathSeparator);
    let folderPath = convertSlashesForSqlProj(startFolder) + constants.SqlProjPathSeparator;
    for (let segment of pathSegments) {
        if (segment) {
            folderPath += segment + constants.SqlProjPathSeparator;
            folders.push(getPlatformSafeFileEntryPath(folderPath));
        }
    }
    return folders;
}
/**
 * Gets target platform based on the server edition/version
 * @param serverInfo server information
 * @param serverUrl optional server URL, only used to check if it's a known domain for Microsoft Fabric DW
 * @returns target platform for the database project
 */
async function getTargetPlatformFromServerVersion(serverInfo, serverUrl) {
    const isCloud = serverInfo.isCloud;
    let targetPlatform;
    if (isCloud) {
        const engineEdition = serverInfo.engineEditionId;
        if (isSqlDwUnifiedServer(serverUrl)) {
            targetPlatform = "Synapse Data Warehouse in Microsoft Fabric" /* SqlTargetPlatform.sqlDwUnified */;
        }
        else if (engineEdition === 11 /* vscodeMssql.DatabaseEngineEdition.SqlOnDemand */) {
            targetPlatform = "Azure Synapse Serverless SQL Pool" /* SqlTargetPlatform.sqlDwServerless */;
        }
        else if (engineEdition === 12 /* vscodeMssql.DatabaseEngineEdition.SqlDbFabric */) {
            targetPlatform = "SQL database in Fabric (preview)" /* SqlTargetPlatform.sqlDbFabric */;
        }
        else if (engineEdition === 6 /* vscodeMssql.DatabaseEngineEdition.SqlDataWarehouse */) {
            targetPlatform = "Azure Synapse SQL Pool" /* SqlTargetPlatform.sqlDW */;
        }
        else {
            targetPlatform = "Azure SQL Database" /* SqlTargetPlatform.sqlAzure */;
        }
    }
    else if (serverInfo.engineEditionId === 12 /* vscodeMssql.DatabaseEngineEdition.SqlDbFabric */) {
        // Temporary workaround for https://github.com/microsoft/azuredatastudio/issues/26260
        // SqlDbFabric is not grouped into isCloud properly, remove this condition when it is fixed in SqlToolsService
        targetPlatform = "SQL database in Fabric (preview)" /* SqlTargetPlatform.sqlDbFabric */;
    }
    else {
        const serverMajorVersion = serverInfo.serverMajorVersion;
        targetPlatform = serverMajorVersion
            ? constants.onPremServerVersionToTargetPlatform.get(serverMajorVersion)
            : undefined;
    }
    return targetPlatform;
}
/**
 * Determines if a server name is a known domain for Microsoft Fabric DW. This is required because the engine edition for Fabric DW is the same as Serverless.
 * @param server The server name to check
 * @returns True if the server name matches a known domain for Microsoft Fabric DW, otherwise false
 */
function isSqlDwUnifiedServer(server) {
    const serverLowerCase = server?.toLowerCase();
    return (serverLowerCase?.includes("datawarehouse.pbidedicated.windows.net") ||
        serverLowerCase?.includes("datawarehouse.fabric.microsoft.com"));
}
/**
 * Determines if a given character is a valid filename character
 * @param c Character to validate
 */
function isValidFilenameCharacter(c) {
    return getDataWorkspaceExtensionApi().isValidFilenameCharacter(c);
}
/**
 * Replaces invalid filename characters in a string with underscores
 * @param s The string to be sanitized for a filename
 */
function sanitizeStringForFilename(s) {
    return getDataWorkspaceExtensionApi().sanitizeStringForFilename(s);
}
/**
 * Returns true if the string is a valid filename
 * @param name filename to check
 */
function isValidBasename(name) {
    return getDataWorkspaceExtensionApi().isValidBasename(name);
}
/**
 * Returns specific error message if file name is invalid
 * @param name filename to check
 */
function isValidBasenameErrorMessage(name) {
    return getDataWorkspaceExtensionApi().isValidBasenameErrorMessage(name);
}
/**
 * Checks if the provided file is a publish profile
 * @param fileName filename to check
 * @returns True if it is a publish profile, otherwise false
 */
function isPublishProfile(fileName) {
    const hasPublishExtension = fileName
        .trim()
        .toLowerCase()
        .endsWith(constants.publishProfileExtension);
    return hasPublishExtension;
}
/**
 * Checks to see if a file exists at absoluteFilePath, and writes contents if it doesn't.
 * If either the file already exists and contents is specified or the file doesn't exist and contents is blank,
 * then an exception is thrown.
 * @param absoluteFilePath
 * @param contents
 */
async function ensureFileExists(absoluteFilePath, contents) {
    if (contents) {
        // Create the file if contents were passed in and file does not exist yet
        await fs_1.promises.mkdir(path.dirname(absoluteFilePath), { recursive: true });
        try {
            await fs_1.promises.writeFile(absoluteFilePath, contents, { flag: "wx" });
        }
        catch (error) {
            if (error.code === "EEXIST") {
                // Throw specialized error, if file already exists
                throw new Error(constants.fileAlreadyExists(path.parse(absoluteFilePath).name));
            }
            throw error;
        }
    }
    else {
        // If no contents were provided, then check that file already exists
        if (!(await exists(absoluteFilePath))) {
            throw new Error(constants.noFileExist(absoluteFilePath));
        }
    }
}
function throwIfFailed(result) {
    if (!result.success) {
        throw new Error(constants.errorPrefix(result.errorMessage));
    }
}
/**
 * Creates a SQL project build task definition for tasks.json
 */
function createSqlProjectBuildTask(options) {
    return {
        label: constants.getSqlProjectBuildTaskLabel(options.projectName),
        type: constants.processTaskType,
        command: constants.dotnet,
        args: options.buildArgs,
        problemMatcher: constants.problemMatcher,
        isBackground: true,
        group: {
            kind: constants.build,
            isDefault: options.isDefault,
        },
        detail: constants.getSqlProjectBuildTaskDetail(options.projectName),
    };
}
/**
 * Creates a new tasks.json structure with the given tasks
 */
function createTasksJson(tasks) {
    return {
        version: constants.tasksJsonVersion,
        tasks: tasks,
    };
}
//#endregion
//# sourceMappingURL=utils.js.map