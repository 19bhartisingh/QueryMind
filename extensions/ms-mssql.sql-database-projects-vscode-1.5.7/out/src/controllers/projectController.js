"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectsController = void 0;
const constants = require("../common/constants");
const path = require("path");
const utils = require("../common/utils");
const UUID = require("vscode-languageclient/lib/utils/uuid");
const templates = require("../templates/templates");
const vscode = require("vscode");
const fs_1 = require("fs");
const project_1 = require("../models/project");
const fileFolderTreeItem_1 = require("../models/tree/fileFolderTreeItem");
const baseTreeItem_1 = require("../models/tree/baseTreeItem");
const netcoreTool_1 = require("../tools/netcoreTool");
const buildHelper_1 = require("../tools/buildHelper");
const databaseReferencesTreeItem_1 = require("../models/tree/databaseReferencesTreeItem");
const telemetry_1 = require("../common/telemetry");
const autorestHelper_1 = require("../tools/autorestHelper");
const createProjectFromDatabaseQuickpick_1 = require("../dialogs/createProjectFromDatabaseQuickpick");
const updateProjectFromDatabaseQuickpick_1 = require("../dialogs/updateProjectFromDatabaseQuickpick");
const addDatabaseReferenceQuickpick_1 = require("../dialogs/addDatabaseReferenceQuickpick");
const projectEntry_1 = require("../models/projectEntry");
const sqlcmdVariableTreeItem_1 = require("../models/tree/sqlcmdVariableTreeItem");
const enums_1 = require("../common/enums");
/**
 * Controller for managing lifecycle of projects
 */
class ProjectsController {
    _outputChannel;
    netCoreTool;
    buildHelper;
    autorestHelper;
    projFileWatchers = new Map();
    fileWatchers = new Map();
    constructor(_outputChannel) {
        this._outputChannel = _outputChannel;
        this.netCoreTool = new netcoreTool_1.NetCoreTool(this._outputChannel);
        this.buildHelper = new buildHelper_1.BuildHelper();
        this.autorestHelper = new autorestHelper_1.AutorestHelper(this._outputChannel);
    }
    //#region Create new project
    /**
     * Creates a new folder with the project name in the specified location, and places the new .sqlproj inside it
     * @param creationParams
     */
    async createNewProject(creationParams) {
        telemetry_1.TelemetryReporter.createActionEvent(telemetry_1.TelemetryViews.ProjectController, telemetry_1.TelemetryActions.createNewProject)
            .withAdditionalProperties({
            template: creationParams.projectTypeId,
            sdkStyle: creationParams.sdkStyle.toString(),
            targetPlatform: creationParams.targetPlatform?.toString() ?? "",
        })
            .send();
        if (creationParams.projectGuid && !UUID.isUUID(creationParams.projectGuid)) {
            throw new Error(constants.invalidGuid(creationParams.projectGuid));
        }
        if (creationParams.targetPlatform &&
            !constants.targetPlatformToVersion.get(creationParams.targetPlatform)) {
            throw new Error(constants.invalidTargetPlatform(creationParams.targetPlatform, Array.from(constants.targetPlatformToVersion.keys())));
        }
        let targetPlatform = creationParams.targetPlatform
            ? constants.targetPlatformToVersion.get(creationParams.targetPlatform)
            : constants.defaultDSP;
        targetPlatform =
            constants.MicrosoftDatatoolsSchemaSqlSql +
                targetPlatform +
                constants.databaseSchemaProvider;
        let newProjFileName = creationParams.newProjName;
        if (!newProjFileName.toLowerCase().endsWith(constants.sqlprojExtension)) {
            newProjFileName += constants.sqlprojExtension;
        }
        const newProjFilePath = path.join(creationParams.folderUri.fsPath, path.parse(newProjFileName).name, newProjFileName);
        if (await utils.exists(newProjFilePath)) {
            throw new Error(constants.projectAlreadyExists(newProjFileName, path.parse(newProjFilePath).dir));
        }
        const sqlProjectsService = await utils.getSqlProjectsService();
        // default version of Microsoft.Build.Sql for SDK style projects, update in README when updating this, and buildHelper.cs for legacy projects SDK support
        const microsoftBuildSqlSDKStyleDefaultVersion = "2.0.0";
        const projectStyle = creationParams.sdkStyle
            ? 0 /* mssqlVscode.ProjectType.SdkStyle */
            : 1 /* mssqlVscode.ProjectType.LegacyStyle */;
        const result = await sqlProjectsService.createProject(newProjFilePath, projectStyle, targetPlatform, microsoftBuildSqlSDKStyleDefaultVersion);
        utils.throwIfFailed(result);
        await this.addTemplateFiles(newProjFilePath, creationParams.projectTypeId, creationParams.configureDefaultBuild ?? false);
        return newProjFilePath;
    }
    /**
     * Adds the template files for the provided project type
     * @param newProjFilePath path to project to add template files to
     * @param projectTypeId project type id
     * @param configureDefaultBuild whether to configure the default build task in tasks.json
     *
     */
    async addTemplateFiles(newProjFilePath, projectTypeId, configureDefaultBuild) {
        const project = await project_1.Project.openProject(newProjFilePath);
        if (projectTypeId === constants.emptySqlDatabaseProjectTypeId || newProjFilePath === "") {
            await this.addTasksJsonFile(project, configureDefaultBuild);
            return;
        }
        if (projectTypeId === constants.edgeSqlDatabaseProjectTypeId) {
            await this.addFileToProjectFromTemplate(project, templates.get("table" /* ItemType.table */), "DataTable.sql", new Map([["OBJECT_NAME", "DataTable"]]));
            await this.addFileToProjectFromTemplate(project, templates.get("dataSource" /* ItemType.dataSource */), "EdgeHubInputDataSource.sql", new Map([
                ["OBJECT_NAME", "EdgeHubInputDataSource"],
                ["LOCATION", "edgehub://"],
            ]));
            await this.addFileToProjectFromTemplate(project, templates.get("dataSource" /* ItemType.dataSource */), "SqlOutputDataSource.sql", new Map([
                ["OBJECT_NAME", "SqlOutputDataSource"],
                ["LOCATION", "sqlserver://tcp:.,1433"],
            ]));
            await this.addFileToProjectFromTemplate(project, templates.get("fileFormat" /* ItemType.fileFormat */), "StreamFileFormat.sql", new Map([["OBJECT_NAME", "StreamFileFormat"]]));
            await this.addFileToProjectFromTemplate(project, templates.get("externalStream" /* ItemType.externalStream */), "EdgeHubInputStream.sql", new Map([
                ["OBJECT_NAME", "EdgeHubInputStream"],
                ["DATA_SOURCE_NAME", "EdgeHubInputDataSource"],
                ["LOCATION", "input"],
                ["OPTIONS", ",\n\tFILE_FORMAT = StreamFileFormat"],
            ]));
            await this.addFileToProjectFromTemplate(project, templates.get("externalStream" /* ItemType.externalStream */), "SqlOutputStream.sql", new Map([
                ["OBJECT_NAME", "SqlOutputStream"],
                ["DATA_SOURCE_NAME", "SqlOutputDataSource"],
                ["LOCATION", "TSQLStreaming.dbo.DataTable"],
                ["OPTIONS", ""],
            ]));
            await this.addFileToProjectFromTemplate(project, templates.get("externalStreamingJob" /* ItemType.externalStreamingJob */), "EdgeStreamingJob.sql", new Map([["OBJECT_NAME", "EdgeStreamingJob"]]));
        }
        await this.addTasksJsonFile(project, configureDefaultBuild);
    }
    /**
     * Adds or updates a tasks.json file at the workspace level (not inside the project folder).
     * If the workspace already has a tasks.json, the SQL project build task is merged into it.
     * If no workspace folder is found, falls back to creating tasks.json inside the project folder.
     * @param project project to add the tasks.json file for
     * @param configureDefaultBuild whether to configure the default build task in tasks.json
     */
    async addTasksJsonFile(project, configureDefaultBuild) {
        // Find the workspace folder that contains the project
        const projectUri = vscode.Uri.file(project.projectFilePath);
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(projectUri);
        // Determine the target folder: workspace root if available, otherwise project folder
        const targetFolder = workspaceFolder
            ? workspaceFolder.uri.fsPath
            : project.projectFolderPath;
        const vscodeFolder = path.join(targetFolder, constants.vscodeFolderName);
        const tasksJsonPath = path.join(vscodeFolder, constants.tasksJsonFileName);
        const projectName = path.basename(project.projectFilePath, constants.sqlprojExtension);
        // Check if tasks.json already exists at workspace level
        if (await utils.exists(tasksJsonPath)) {
            // Read and parse existing tasks.json
            try {
                const existingContent = await fs_1.promises.readFile(tasksJsonPath, "utf8");
                const existingTasksJson = JSON.parse(existingContent);
                if (existingTasksJson.tasks !== undefined &&
                    !Array.isArray(existingTasksJson.tasks)) {
                    // This error is caught below — project creation still succeeds, only the tasks.json update is skipped
                    throw new Error(constants.tasksJsonInvalidTasksArrayError);
                }
                // Initialize tasks array if it doesn't exist yet
                if (!existingTasksJson.tasks) {
                    existingTasksJson.tasks = [];
                }
                // Check if a build task for this specific project already exists
                const taskLabel = constants.getSqlProjectBuildTaskLabel(projectName);
                const sqlBuildTaskExists = existingTasksJson.tasks.some((task) => task.label === taskLabel);
                if (!sqlBuildTaskExists) {
                    // Only create the task when we need to add it
                    const newTask = this.createBuildTaskForProject(project, projectName, configureDefaultBuild);
                    // Merge the new task into existing tasks
                    existingTasksJson.tasks.push(newTask);
                    // Write back the merged tasks.json
                    await fs_1.promises.writeFile(tasksJsonPath, JSON.stringify(existingTasksJson, null, "\t"), "utf8");
                    // Show notification to user
                    void vscode.window.showInformationMessage(constants.updatingExistingTasksJson);
                }
            }
            catch (error) {
                // If parsing fails, log error and notify user with option to view output
                const errorMessage = utils.getErrorMessage(error);
                this._outputChannel.appendLine(constants.tasksJsonUpdateError(errorMessage));
                telemetry_1.TelemetryReporter.createErrorEvent2(telemetry_1.TelemetryViews.ProjectController, telemetry_1.TelemetryActions.tasksJsonError, error)
                    .withAdditionalProperties({
                    hasWorkspaceFolder: (workspaceFolder !== undefined).toString(),
                    errorMessage: errorMessage,
                })
                    .send();
                void utils.showErrorMessageWithOutputChannel(constants.tasksJsonUpdateError, errorMessage, this._outputChannel);
            }
        }
        else {
            // Create new tasks.json - only create the task when needed
            const newTask = this.createBuildTaskForProject(project, projectName, configureDefaultBuild);
            const newTasksJson = utils.createTasksJson([newTask]);
            await fs_1.promises.mkdir(vscodeFolder, { recursive: true });
            await fs_1.promises.writeFile(tasksJsonPath, JSON.stringify(newTasksJson, null, "\t"), "utf8");
            // If created inside the project folder (no workspace), add to project's None items
            if (!workspaceFolder) {
                await project.addNoneItem(utils.convertSlashesForSqlProj(`${constants.vscodeFolderName}/${constants.tasksJsonFileName}`));
            }
        }
    }
    /**
     * Creates a build task object for the given project
     */
    createBuildTaskForProject(project, projectName, configureDefaultBuild) {
        // Use forward slashes for cross-platform compatibility (dotnet accepts both)
        const projectFilePathNormalized = utils.getPlatformSafeFileEntryPath(project.projectFilePath);
        // Build args array for process execution (avoids shell escaping issues)
        const buildArgs = [constants.build, projectFilePathNormalized];
        if (project.sqlProjStyleName !== constants.sdkStyleProjectStyleName) {
            // Legacy projects need additional build arguments
            // No quotes needed - process execution handles paths with spaces correctly
            const buildDirPath = utils.getPlatformSafeFileEntryPath(this.buildHelper.extensionBuildDirPath);
            buildArgs.push(constants.netCoreBuildArg, `${constants.netCoreTargetsPathArgPrefix}${buildDirPath}`, `${constants.systemDacpacsLocationArgPrefix}${buildDirPath}`);
        }
        return utils.createSqlProjectBuildTask({
            projectName,
            buildArgs,
            isDefault: configureDefaultBuild,
        });
    }
    async addFileToProjectFromTemplate(project, itemType, relativePath, expansionMacros) {
        const newFileText = templates.macroExpansion(itemType.templateScript, expansionMacros);
        const absolutePath = path.join(project.projectFolderPath, relativePath);
        await utils.ensureFileExists(absolutePath, newFileText);
        switch (itemType.type) {
            case "preDeployScript" /* ItemType.preDeployScript */:
                await project.addPreDeploymentScript(relativePath);
                break;
            case "postDeployScript" /* ItemType.postDeployScript */:
                await project.addPostDeploymentScript(relativePath);
                break;
            case "publishProfile" /* ItemType.publishProfile */:
                await project.addNoneItem(relativePath);
                break;
            default: // a normal SQL object script
                await project.addSqlObjectScript(relativePath);
                break;
        }
        return absolutePath;
    }
    async buildProject(context, codeAnalysis = false) {
        const project = await this.getProjectFromContext(context);
        const startTime = new Date();
        // get dlls and targets file needed for building for legacy style projects
        if (project.sqlProjStyle === 1 /* mssqlVscode.ProjectType.LegacyStyle */) {
            const result = await this.buildHelper.createBuildDirFolder(this._outputChannel);
            if (!result) {
                void vscode.window.showErrorMessage(constants.errorRetrievingBuildFiles);
                return "";
            }
        }
        // Get the build arguments from buildhelper method and create a new vscode.task
        const buildArgs = this.buildHelper.constructBuildArguments(this.buildHelper.extensionBuildDirPath, project.sqlProjStyle);
        const vscodeTask = await this.createVsCodeTask(project, codeAnalysis, buildArgs);
        try {
            const crossPlatCompatible = await project_1.Project.checkPromptCrossPlatStatus(project, true /* blocking prompt */);
            if (!crossPlatCompatible) {
                // user rejected updating for cross-plat
                void vscode.window.showErrorMessage(constants.projectNeedsUpdatingForCrossPlat(project.projectFileName));
                return "";
            }
        }
        catch (error) {
            void vscode.window.showErrorMessage(utils.getErrorMessage(error));
            return "";
        }
        try {
            // Check if the dotnet core is installed and if not, prompt the user to install it
            // If the user does not have .NET Core installed, we will throw an error and stops building the project
            await this.netCoreTool.verifyNetCoreInstallation();
            // Execute the task and wait for it to complete
            const execution = await vscode.tasks.executeTask(vscodeTask);
            // Wait until the build task instance is finishes.
            // `onDidEndTaskProcess` fires for every task in the workspace, so Filtering events to the exact TaskExecution
            // object we kicked off (`e.execution === execution`), ensuring we don't resolve because some other task ended.
            await new Promise((resolve) => {
                const disposable = vscode.tasks.onDidEndTaskProcess((e) => {
                    if (e.execution === execution) {
                        // Once we get the matching event, dispose the listener to avoid leaks and resolve the promise.
                        disposable.dispose();
                        resolve();
                    }
                });
            });
            // If the build was successful, we will get the path to the built dacpac
            const timeToBuild = new Date().getTime() - startTime.getTime();
            telemetry_1.TelemetryReporter.createActionEvent(telemetry_1.TelemetryViews.ProjectController, telemetry_1.TelemetryActions.build)
                .withAdditionalMeasurements({ duration: timeToBuild })
                .withAdditionalProperties({
                databaseSource: project.getDatabaseSourceValues().join(";"),
            })
                .send();
            return project.dacpacOutputPath;
        }
        catch (err) {
            const timeToFailureBuild = new Date().getTime() - startTime.getTime();
            telemetry_1.TelemetryReporter.createErrorEvent2(telemetry_1.TelemetryViews.ProjectController, telemetry_1.TelemetryActions.build, err)
                .withAdditionalMeasurements({ duration: timeToFailureBuild })
                .withAdditionalProperties({
                databaseSource: project.getDatabaseSourceValues().join(";"),
            })
                .send();
            const message = utils.getErrorMessage(err);
            if (err instanceof netcoreTool_1.DotNetError) {
                // DotNetErrors already get shown by the netCoreTool so just show this one in the console
                console.error(message);
            }
            else {
                void vscode.window.showErrorMessage(constants.projBuildFailed(message));
            }
            return "";
        }
    }
    /**
     * Creates a VS Code task for building the project
     * @param project Project to be built
     * @param codeAnalysis Whether to run code analysis
     * @param buildArguments Arguments to pass to the build command
     * @returns A VS Code task for building the project
     * */
    async createVsCodeTask(project, codeAnalysis, buildArguments) {
        let vscodeTask = undefined;
        const label = codeAnalysis
            ? constants.buildWithCodeAnalysisTaskName
            : constants.buildTaskName;
        // Create an array of arguments instead of a single command string
        const args = [constants.build, utils.getNonQuotedPath(project.projectFilePath)];
        if (codeAnalysis) {
            args.push(constants.runCodeAnalysisParam);
        }
        // Adding build arguments to the args
        args.push(...buildArguments);
        // Task definition with required args
        const taskDefinition = {
            type: constants.sqlProjTaskType,
            label: label,
            command: constants.dotnet,
            args: args,
            problemMatcher: constants.problemMatcher,
        };
        // Create a new task with the definition and process executable
        vscodeTask = new vscode.Task(taskDefinition, vscode.TaskScope.Workspace, taskDefinition.label, taskDefinition.type, new vscode.ProcessExecution(taskDefinition.command, args, {
            cwd: project.projectFolderPath,
        }), taskDefinition.problemMatcher);
        return vscodeTask;
    }
    async publishProject(context) {
        const project = await this.getProjectFromContext(context);
        // Use the new publish dialog flow
        return await vscode.commands.executeCommand(constants.mssqlPublishProjectCommand, project.projectFilePath);
    }
    //#endregion
    /**
     * Launches the schema compare extension with the source and target
     * @param source source for schema compare - a project node
     * @param targetParam target for schema compare
     */
    async schemaCompare(source, targetParam = undefined) {
        try {
            // check if schema compare service is available
            const service = await utils.getSchemaCompareService();
            if (service) {
                const sourceParam = (await this.getProjectFromContext(source)).projectFilePath;
                try {
                    telemetry_1.TelemetryReporter.sendActionEvent(telemetry_1.TelemetryViews.ProjectController, telemetry_1.TelemetryActions.projectSchemaCompareCommandInvoked);
                    await vscode.commands.executeCommand(constants.mssqlSchemaCompareCommand, sourceParam, undefined, undefined);
                }
                catch (e) {
                    throw new Error(constants.buildFailedCannotStartSchemaCompare);
                }
            }
            else {
                throw new Error(constants.schemaCompareNotInstalled);
            }
        }
        catch (err) {
            const props = {};
            const message = utils.getErrorMessage(err);
            if (message === constants.buildFailedCannotStartSchemaCompare ||
                message === constants.schemaCompareNotInstalled) {
                props.errorMessage = message;
            }
            telemetry_1.TelemetryReporter.createErrorEvent2(telemetry_1.TelemetryViews.ProjectController, telemetry_1.TelemetryActions.projectSchemaCompareCommandInvoked, err)
                .withAdditionalProperties(props)
                .send();
            void vscode.window.showErrorMessage(utils.getErrorMessage(err));
        }
    }
    //#region Add/Exclude/Delete Item
    async addFolderPrompt(treeNode) {
        const project = await this.getProjectFromContext(treeNode);
        const projectRelativeUri = vscode.Uri.file(path.basename(treeNode.element.projectFileUri.fsPath, constants.sqlprojExtension));
        const relativePathToParent = this.getRelativePath(projectRelativeUri, treeNode.element);
        const absolutePathToParent = path.join(project.projectFolderPath, relativePathToParent);
        const newFolderName = await this.promptForNewObjectName(new templates.ProjectScriptType("folder" /* ItemType.folder */, constants.folderFriendlyName, ""), project, absolutePathToParent);
        if (!newFolderName) {
            return; // user cancelled
        }
        const relativeFolderPath = path.join(relativePathToParent, newFolderName);
        try {
            // check if folder already exists or is a reserved folder
            const absoluteFolderPath = path.join(absolutePathToParent, newFolderName);
            const folderExists = await utils.exists(absoluteFolderPath);
            if (folderExists ||
                this.isReservedFolder(absoluteFolderPath, project.projectFolderPath)) {
                throw new Error(constants.folderAlreadyExists(path.parse(absoluteFolderPath).name));
            }
            await project.addFolder(relativeFolderPath);
            this.refreshProjectsTree(treeNode);
        }
        catch (err) {
            void vscode.window.showErrorMessage(utils.getErrorMessage(err));
        }
    }
    async promptForNewObjectName(itemType, _project, folderPath, fileExtension, defaultName) {
        const suggestedName = utils.sanitizeStringForFilename(defaultName ?? itemType.friendlyName.replace(/\s+/g, ""));
        let counter = 0;
        do {
            counter++;
        } while (counter < Number.MAX_SAFE_INTEGER &&
            (await utils.exists(path.join(folderPath, `${suggestedName}${counter}${fileExtension ?? ""}`))));
        const itemObjectName = await vscode.window.showInputBox({
            prompt: constants.newObjectNamePrompt(itemType.friendlyName),
            value: `${suggestedName}${counter}`,
            validateInput: (value) => {
                return utils.isValidBasenameErrorMessage(value);
            },
            ignoreFocusOut: true,
        });
        return itemObjectName;
    }
    isReservedFolder(absoluteFolderPath, projectFolderPath) {
        const sameName = constants.reservedProjectFolders.find((f) => f === path.parse(absoluteFolderPath).name) !== undefined;
        const sameLocation = path.parse(absoluteFolderPath).dir === projectFolderPath;
        return sameName && sameLocation;
    }
    /**
     * Parses a schema-qualified object name (e.g., "sales.MyFunction") into schema and object name parts.
     * If no schema is specified, returns 'dbo' as the default schema.
     * @param input The user-provided object name, optionally schema-qualified
     * @returns An object containing the schema name and object name
     */
    parseSchemaAndObjectName(input) {
        const dotIndex = input.indexOf(".");
        if (dotIndex > 0 && dotIndex < input.length - 1) {
            // Format: schema.objectName
            return {
                schemaName: input.substring(0, dotIndex),
                objectName: input.substring(dotIndex + 1),
            };
        }
        // No schema specified, use default schema
        return {
            schemaName: constants.defaultSchemaName,
            objectName: input,
        };
    }
    /**
     * Gets the default folder path for a given item type when creating at project root.
     * For schema-dependent items: Checks Schema/ObjectType/ (e.g., Sales/Functions/)
     * For non-schema items (like Database Trigger): Checks root-level ObjectType folder (e.g., DatabaseTriggers/)
     * @param itemType The type of item being created
     * @param project The project to check for existing folders
     * @param schemaName Optional schema name to look for schema-named folders
     * @returns The default folder path if it exists, or empty string otherwise
     */
    getDefaultFolderForItemType(itemType, project, schemaName) {
        let relativePath = "";
        // Get the folder config for this item type (defaults to schema-dependent if not in map)
        const folderConfig = templates.itemTypeToFolderMap.get(itemType);
        const isSchemaDependent = folderConfig?.schemaDependent ?? true;
        const folderName = folderConfig?.folderName;
        // Non-schema-dependent items - check root-level folder only
        if (!isSchemaDependent && folderName) {
            const rootFolder = project.folders.find((f) => f.relativePath.toLowerCase() === folderName.toLowerCase());
            if (rootFolder) {
                relativePath = rootFolder.relativePath;
            }
            return relativePath;
        }
        // Case for Sequence: Check root-level Sequences folder first
        if (itemType === "sequence" /* ItemType.sequence */ && folderName) {
            const rootObjectFolder = project.folders.find((f) => f.relativePath.toLowerCase() === folderName.toLowerCase());
            if (rootObjectFolder) {
                return rootObjectFolder.relativePath;
            }
        }
        // For schema-dependent items, check schema folders
        if (schemaName) {
            // Case 1: Check for schema folder (e.g., "Sales", "dbo") - case-insensitive
            const schemaFolder = project.folders.find((f) => f.relativePath.toLowerCase() === schemaName.toLowerCase());
            if (schemaFolder) {
                relativePath = schemaFolder.relativePath;
                // Case 2: Check for nested object type folder (e.g., "Sales/Functions")
                if (folderName) {
                    const nestedPath = path.join(schemaFolder.relativePath, folderName);
                    const nestedFolder = project.folders.find((f) => f.relativePath.toLowerCase() === nestedPath.toLowerCase());
                    if (nestedFolder) {
                        relativePath = nestedFolder.relativePath;
                    }
                }
            }
        }
        // Case 3: If no schema folder found, return empty string (place at root)
        return relativePath;
    }
    async addItemPromptFromNode(treeNode, itemTypeName) {
        const projectRelativeUri = vscode.Uri.file(path.basename(treeNode.element.projectFileUri.fsPath, constants.sqlprojExtension));
        await this.addItemPrompt(await this.getProjectFromContext(treeNode), this.getRelativePath(projectRelativeUri, treeNode.element), { itemType: itemTypeName }, treeNode.treeDataProvider);
    }
    async addItemPrompt(project, relativePath, options, treeDataProvider) {
        let itemTypeName = options?.itemType;
        if (!itemTypeName) {
            const items = [];
            for (const itemType of templates.projectScriptTypes()) {
                items.push({ label: itemType.friendlyName });
            }
            itemTypeName = (await vscode.window.showQuickPick(items, {
                canPickMany: false,
            }))?.label;
            if (!itemTypeName) {
                return; // user cancelled
            }
        }
        const itemType = templates.get(itemTypeName);
        const absolutePathToParent = path.join(project.projectFolderPath, relativePath);
        const isItemTypePublishProfile = itemTypeName === constants.publishProfileFriendlyName ||
            itemTypeName === "publishProfile" /* ItemType.publishProfile */;
        const fileExtension = isItemTypePublishProfile
            ? constants.publishProfileExtension
            : constants.sqlFileExtension;
        const defaultName = isItemTypePublishProfile
            ? `${project.projectFileName}_`
            : options?.defaultName;
        let itemObjectName = await this.promptForNewObjectName(itemType, project, absolutePathToParent, fileExtension, defaultName);
        itemObjectName = itemObjectName?.trim();
        if (!itemObjectName) {
            return; // user cancelled
        }
        // Check if itemObjectName contains the file extension, remove the last occurrence
        if (itemObjectName.toLowerCase().endsWith(fileExtension.toLowerCase())) {
            itemObjectName = itemObjectName?.slice(0, -fileExtension.length).trim();
        }
        // Parse schema and object name from input (e.g., "sales.MyFunction" -> schema="sales", objectName="MyFunction")
        const { schemaName, objectName } = this.parseSchemaAndObjectName(itemObjectName);
        // Determine the folder for this item when creating at project root
        // Checks: Schema folder -> Schema/ObjectType folder -> root
        if (relativePath === "") {
            relativePath = this.getDefaultFolderForItemType(itemType.type, project, schemaName);
        }
        const relativeFilePath = path.join(relativePath, objectName + fileExtension);
        const telemetryProps = { itemType: itemType.type };
        const telemetryMeasurements = {};
        if (itemType.type === "preDeployScript" /* ItemType.preDeployScript */) {
            telemetryMeasurements.numPredeployScripts = project.preDeployScripts.length;
        }
        else if (itemType.type === "postDeployScript" /* ItemType.postDeployScript */) {
            telemetryMeasurements.numPostdeployScripts = project.postDeployScripts.length;
        }
        try {
            const absolutePath = await this.addFileToProjectFromTemplate(project, itemType, relativeFilePath, new Map([
                ["OBJECT_NAME", objectName],
                ["SCHEMA_NAME", schemaName],
                ["PROJECT_NAME", project.projectFileName],
            ]));
            telemetry_1.TelemetryReporter.createActionEvent(telemetry_1.TelemetryViews.ProjectTree, telemetry_1.TelemetryActions.addItemFromTree)
                .withAdditionalProperties(telemetryProps)
                .withAdditionalMeasurements(telemetryMeasurements)
                .send();
            await vscode.commands.executeCommand(constants.vscodeOpenCommand, vscode.Uri.file(absolutePath));
            treeDataProvider?.notifyTreeDataChanged();
        }
        catch (err) {
            void vscode.window.showErrorMessage(utils.getErrorMessage(err));
            telemetry_1.TelemetryReporter.createErrorEvent2(telemetry_1.TelemetryViews.ProjectTree, telemetry_1.TelemetryActions.addItemFromTree, err)
                .withAdditionalProperties(telemetryProps)
                .withAdditionalMeasurements(telemetryMeasurements)
                .send();
        }
    }
    async addExistingItemPrompt(treeNode) {
        const project = await this.getProjectFromContext(treeNode);
        const uris = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            openLabel: constants.selectString,
            title: constants.selectFileString,
        });
        if (!uris) {
            return; // user cancelled
        }
        try {
            telemetry_1.TelemetryReporter.sendActionEvent(telemetry_1.TelemetryViews.ProjectTree, telemetry_1.TelemetryActions.addExistingItem);
            await project.addExistingItem(uris[0].fsPath);
            this.refreshProjectsTree(treeNode);
        }
        catch (err) {
            void vscode.window.showErrorMessage(utils.getErrorMessage(err));
            telemetry_1.TelemetryReporter.sendErrorEvent2(telemetry_1.TelemetryViews.ProjectTree, telemetry_1.TelemetryActions.addExistingItem, err);
        }
    }
    async exclude(context) {
        const node = context.element;
        const project = await this.getProjectFromContext(node);
        if (node.entryKey) {
            telemetry_1.TelemetryReporter.sendActionEvent(telemetry_1.TelemetryViews.ProjectTree, telemetry_1.TelemetryActions.excludeFromProject);
            switch (node.type) {
                case constants.DatabaseProjectItemType.sqlObjectScript:
                case constants.DatabaseProjectItemType.table:
                case constants.DatabaseProjectItemType.externalStreamingJob:
                    await project.excludeSqlObjectScript(node.entryKey);
                    break;
                case constants.DatabaseProjectItemType.folder:
                    await project.excludeFolder(node.entryKey);
                    break;
                case constants.DatabaseProjectItemType.preDeploymentScript:
                    await project.excludePreDeploymentScript(node.entryKey);
                    break;
                case constants.DatabaseProjectItemType.postDeploymentScript:
                    await project.excludePostDeploymentScript(node.entryKey);
                    break;
                case constants.DatabaseProjectItemType.noneFile:
                case constants.DatabaseProjectItemType.publishProfile:
                    await project.excludeNoneItem(node.entryKey);
                    break;
                default:
                    throw new Error(constants.unhandledExcludeType(node.type));
            }
        }
        else {
            telemetry_1.TelemetryReporter.sendErrorEvent2(telemetry_1.TelemetryViews.ProjectTree, telemetry_1.TelemetryActions.excludeFromProject);
            void vscode.window.showErrorMessage(constants.unableToPerformAction(constants.excludeAction, node.relativeProjectUri.path));
        }
        this.refreshProjectsTree(context);
    }
    async delete(context) {
        const node = context.element;
        const project = await this.getProjectFromContext(node);
        let confirmationPrompt;
        if (node instanceof databaseReferencesTreeItem_1.DatabaseReferenceTreeItem) {
            confirmationPrompt = constants.deleteReferenceConfirmation(node.friendlyName);
        }
        else if (node instanceof sqlcmdVariableTreeItem_1.SqlCmdVariableTreeItem) {
            confirmationPrompt = constants.deleteSqlCmdVariableConfirmation(node.friendlyName);
        }
        else if (node instanceof fileFolderTreeItem_1.FolderNode) {
            confirmationPrompt = constants.deleteConfirmationContents(node.friendlyName);
        }
        else {
            confirmationPrompt = constants.deleteConfirmation(node.friendlyName);
        }
        const response = await vscode.window.showWarningMessage(confirmationPrompt, { modal: true }, constants.yesString);
        if (response !== constants.yesString) {
            return;
        }
        try {
            if (node instanceof databaseReferencesTreeItem_1.DatabaseReferenceTreeItem) {
                const databaseReference = this.getDatabaseReference(project, node);
                if (databaseReference) {
                    await project.deleteDatabaseReferenceByEntry(databaseReference);
                }
            }
            else if (node instanceof sqlcmdVariableTreeItem_1.SqlCmdVariableTreeItem) {
                await project.deleteSqlCmdVariable(node.friendlyName);
            }
            else if (node instanceof fileFolderTreeItem_1.FolderNode) {
                await project.deleteFolder(node.entryKey);
            }
            else if (node instanceof fileFolderTreeItem_1.FileNode) {
                switch (node.type) {
                    case constants.DatabaseProjectItemType.sqlObjectScript:
                    case constants.DatabaseProjectItemType.table:
                    case constants.DatabaseProjectItemType.externalStreamingJob:
                        await project.deleteSqlObjectScript(node.entryKey);
                        break;
                    case constants.DatabaseProjectItemType.preDeploymentScript:
                        await project.deletePreDeploymentScript(node.entryKey);
                        break;
                    case constants.DatabaseProjectItemType.postDeploymentScript:
                        await project.deletePostDeploymentScript(node.entryKey);
                        break;
                    case constants.DatabaseProjectItemType.noneFile:
                    case constants.DatabaseProjectItemType.publishProfile:
                        await project.deleteNoneItem(node.entryKey);
                        break;
                    default:
                        throw new Error(constants.unhandledDeleteType(node.type));
                }
            }
            telemetry_1.TelemetryReporter.createActionEvent(telemetry_1.TelemetryViews.ProjectTree, telemetry_1.TelemetryActions.deleteObjectFromProject)
                .withAdditionalProperties({ objectType: node.constructor.name })
                .send();
            this.refreshProjectsTree(context);
        }
        catch (err) {
            telemetry_1.TelemetryReporter.createErrorEvent2(telemetry_1.TelemetryViews.ProjectTree, telemetry_1.TelemetryActions.deleteObjectFromProject)
                .withAdditionalProperties({ objectType: node.constructor.name })
                .send();
            void vscode.window.showErrorMessage(constants.unableToPerformAction(constants.deleteAction, node.relativeProjectUri.path, utils.getErrorMessage(err)));
        }
    }
    async rename(context) {
        const node = context.element;
        const project = await this.getProjectFromContext(node);
        const originalAbsolutePath = utils.getPlatformSafeFileEntryPath(node.projectFileUri.fsPath);
        const originalName = path.basename(node.friendlyName);
        const originalExt = path.extname(node.friendlyName);
        // need to use quickpick because input box isn't supported in treeviews
        // https://github.com/microsoft/vscode/issues/117502 and https://github.com/microsoft/vscode/issues/97190
        const newFileName = await vscode.window.showInputBox({
            title: constants.enterNewName,
            value: originalName,
            valueSelection: [0, path.basename(originalName, originalExt).length],
            ignoreFocusOut: true,
            validateInput: async (newName) => {
                return (await this.fileAlreadyExists(newName, originalAbsolutePath))
                    ? constants.fileAlreadyExists(newName)
                    : undefined;
            },
        });
        if (!newFileName) {
            return;
        }
        const newFilePath = path.join(path.dirname(utils.getPlatformSafeFileEntryPath(node.relativeProjectUri.fsPath)), newFileName);
        const result = await project.move(node, newFilePath);
        if (result?.success) {
            telemetry_1.TelemetryReporter.sendActionEvent(telemetry_1.TelemetryViews.ProjectTree, telemetry_1.TelemetryActions.rename);
        }
        else {
            telemetry_1.TelemetryReporter.sendErrorEvent2(telemetry_1.TelemetryViews.ProjectTree, telemetry_1.TelemetryActions.rename);
            void vscode.window.showErrorMessage(constants.errorRenamingFile(node.entryKey, newFilePath, result?.errorMessage));
        }
        this.refreshProjectsTree(context);
    }
    fileAlreadyExists(newFileName, previousFilePath) {
        return utils.exists(path.join(path.dirname(previousFilePath), newFileName));
    }
    /**
     * Opens a quickpick to edit the value of the SQLCMD variable launched from
     * @param context
     */
    async editSqlCmdVariable(context) {
        const node = context.element;
        const project = await this.getProjectFromContext(node);
        const variableName = node.friendlyName;
        const originalValue = project.sqlCmdVariables.get(variableName);
        const newValue = await vscode.window.showInputBox({
            title: constants.enterNewValueForVar(variableName),
            value: originalValue,
            ignoreFocusOut: true,
        });
        if (!newValue) {
            return;
        }
        await project.updateSqlCmdVariable(variableName, newValue);
        this.refreshProjectsTree(context);
    }
    /**
     * Opens a quickpick to add a new SQLCMD variable to the project
     * @param context
     */
    async addSqlCmdVariable(context) {
        const project = await this.getProjectFromContext(context);
        const variableName = await vscode.window.showInputBox({
            title: constants.enterNewSqlCmdVariableName,
            ignoreFocusOut: true,
            validateInput: (value) => {
                return project.sqlCmdVariables.has(value)
                    ? constants.sqlcmdVariableAlreadyExists
                    : undefined;
            },
        });
        if (!variableName) {
            return;
        }
        let defaultValue = await vscode.window.showInputBox({
            title: constants.enterNewSqlCmdVariableDefaultValue(variableName),
            ignoreFocusOut: true,
        });
        if (!defaultValue) {
            // prompt asking if they want to add to add a sqlcmd variable without a default value
            const result = await vscode.window.showInformationMessage(constants.addSqlCmdVariableWithoutDefaultValue(variableName), constants.yesString, constants.noString);
            if (result === constants.noString) {
                return;
            }
            else {
                defaultValue = "";
            }
        }
        await project.addSqlCmdVariable(variableName, defaultValue);
        this.refreshProjectsTree(context);
    }
    getDatabaseReference(project, context) {
        const databaseReference = context;
        if (databaseReference) {
            return project.databaseReferences.find((r) => r.referenceName === databaseReference.treeItem.label);
        }
        return undefined;
    }
    //#endregion
    /**
     * Opens the folder containing the project
     * @param context a treeItem in a project's hierarchy, to be used to obtain a Project
     */
    async openContainingFolder(context) {
        const project = await this.getProjectFromContext(context);
        await vscode.commands.executeCommand(constants.revealFileInOsCommand, vscode.Uri.file(project.projectFilePath));
    }
    /**
     * Open the project indicated by `context` in the workspace
     * @param context a SqlProjectReferenceTreeItem in the project's tree
     */
    async openReferencedSqlProject(context) {
        const node = context.element;
        const project = await this.getProjectFromContext(node);
        if (!(node instanceof databaseReferencesTreeItem_1.SqlProjectReferenceTreeItem)) {
            return;
        }
        const absolutePath = path.normalize(path.join(project.projectFolderPath, node.reference.fsUri.fsPath));
        await this.openProjectInWorkspace(absolutePath);
    }
    /**
     * Opens the .sqlproj file for the given project. Upon update of file, prompts user to
     * reload their project.
     * @param context a treeItem in a project's hierarchy, to be used to obtain a Project
     */
    async editProjectFile(context) {
        const project = await this.getProjectFromContext(context);
        try {
            await vscode.commands.executeCommand(constants.vscodeOpenCommand, vscode.Uri.file(project.projectFilePath));
            telemetry_1.TelemetryReporter.sendActionEvent(telemetry_1.TelemetryViews.ProjectTree, telemetry_1.TelemetryActions.editProjectFile);
            const projFileWatcher = vscode.workspace.createFileSystemWatcher(project.projectFilePath);
            this.projFileWatchers.set(project.projectFilePath, projFileWatcher);
            projFileWatcher.onDidChange(async () => {
                const result = await vscode.window.showInformationMessage(constants.reloadProject, constants.yesString, constants.noString);
                if (result === constants.yesString) {
                    return this.reloadProject(context);
                }
            });
            // stop watching for changes to the sqlproj after it's closed
            const closeSqlproj = vscode.workspace.onDidCloseTextDocument((d) => {
                if (this.projFileWatchers.has(d.uri.fsPath)) {
                    this.projFileWatchers.get(d.uri.fsPath).dispose();
                    this.projFileWatchers.delete(d.uri.fsPath);
                    closeSqlproj.dispose();
                }
            });
        }
        catch (err) {
            void vscode.window.showErrorMessage(utils.getErrorMessage(err));
        }
    }
    /**
     * Opens a file in the editor and adds a file watcher to check if a create table statement has been added
     * @param fileSystemUri uri of file
     * @param node node of file in the tree
     */
    async openFileWithWatcher(fileSystemUri, _node) {
        await vscode.commands.executeCommand(constants.vscodeOpenCommand, fileSystemUri);
        const fileWatcher = vscode.workspace.createFileSystemWatcher(fileSystemUri.fsPath);
        this.fileWatchers.set(fileSystemUri.fsPath, { fileWatcher: fileWatcher });
        // stop watching for changes to the file after it's closed
        const closeSqlproj = vscode.workspace.onDidCloseTextDocument((d) => {
            if (this.fileWatchers.has(d.uri.fsPath)) {
                this.fileWatchers.get(d.uri.fsPath)?.fileWatcher.dispose();
                this.fileWatchers.delete(d.uri.fsPath);
                closeSqlproj.dispose();
            }
        });
    }
    /**
     * Reloads the given project. Throws an error if given project is not a valid open project.
     * @param context
     */
    async reloadProject(context) {
        const project = await this.getProjectFromContext(context);
        if (project) {
            // won't open any newly referenced projects, but otherwise matches the behavior of reopening the project
            await project.readProjFile();
            this.refreshProjectsTree(context);
        }
        else {
            throw new Error(constants.invalidProjectReload);
        }
    }
    /**
     * Changes the project's DSP to the selected target platform
     * @param context a treeItem in a project's hierarchy, to be used to obtain a Project
     */
    async changeTargetPlatform(context) {
        const project = await this.getProjectFromContext(context);
        const selectedTargetPlatform = (await vscode.window.showQuickPick(Array.from(constants.targetPlatformToVersion.keys()).map((version) => {
            return { label: version };
        }), {
            canPickMany: false,
            placeHolder: constants.selectTargetPlatform(constants.getTargetPlatformFromVersion(project.getProjectTargetVersion())),
        }))?.label;
        if (selectedTargetPlatform) {
            await project.changeTargetPlatform(constants.targetPlatformToVersion.get(selectedTargetPlatform));
            void vscode.window.showInformationMessage(constants.currentTargetPlatform(project.projectFileName, constants.getTargetPlatformFromVersion(project.getProjectTargetVersion())));
        }
    }
    //#region database references
    /**
     * Adds a database reference to the project
     * @param context a treeItem in a project's hierarchy, to be used to obtain a Project
     */
    async addDatabaseReference(context) {
        const project = await this.getProjectFromContext(context);
        const settings = await (0, addDatabaseReferenceQuickpick_1.addDatabaseReferenceQuickpick)(project);
        if (settings) {
            await this.addDatabaseReferenceCallback(project, settings, context);
        }
    }
    /**
     * Adds a database reference to a project, after selections have been made in the dialog
     * @param project project to which to add the database reference
     * @param settings settings for the database reference
     * @param context a treeItem in a project's hierarchy, to be used to obtain a Project
     */
    async addDatabaseReferenceCallback(project, settings, context) {
        try {
            if (settings.projectName !== undefined) {
                // get project path and guid
                const projectReferenceSettings = settings;
                const workspaceProjects = await utils.getSqlProjectsInWorkspace();
                const referencedProject = await project_1.Project.openProject(workspaceProjects.filter((p) => path.parse(p.fsPath).name === projectReferenceSettings.projectName)[0].fsPath);
                const relativePath = path.relative(project.projectFolderPath, referencedProject?.projectFilePath);
                projectReferenceSettings.projectRelativePath = vscode.Uri.file(relativePath);
                projectReferenceSettings.projectGuid = referencedProject?.projectGuid;
                const projectReferences = referencedProject?.databaseReferences.filter((r) => r instanceof projectEntry_1.SqlProjectReferenceProjectEntry) ?? [];
                // check for cirular dependency
                for (let r of projectReferences) {
                    if (r.projectName === project.projectFileName) {
                        void vscode.window.showErrorMessage(constants.cantAddCircularProjectReference(referencedProject?.projectFileName));
                        return;
                    }
                }
                await project.addProjectReference(projectReferenceSettings);
            }
            else if (settings.systemDb !== undefined) {
                await project.addSystemDatabaseReference(settings);
            }
            else if (settings.dacpacFileLocation !== undefined) {
                // update dacpacFileLocation to relative path to project file
                const dacpacRefSettings = settings;
                dacpacRefSettings.dacpacFileLocation = vscode.Uri.file(path.relative(project.projectFolderPath, dacpacRefSettings.dacpacFileLocation.fsPath));
                await project.addDatabaseReference(dacpacRefSettings);
            }
            else {
                await project.addNugetPackageReference(settings);
            }
            this.refreshProjectsTree(context);
        }
        catch (err) {
            void vscode.window.showErrorMessage(utils.getErrorMessage(err));
        }
    }
    //#endregion
    /**
     * Validates the contents of an external streaming job's query against the last-built dacpac.
     * If no dacpac exists at the output path, one will be built first.
     * @param node a treeItem in a project's hierarchy, to be used to obtain a Project
     */
    async validateExternalStreamingJob(node) {
        const project = await this.getProjectFromContext(node);
        let dacpacPath = project.dacpacOutputPath;
        const preExistingDacpac = await utils.exists(dacpacPath);
        const telemetryProps = {
            preExistingDacpac: preExistingDacpac.toString(),
        };
        if (!preExistingDacpac) {
            dacpacPath = await this.buildProject(project);
        }
        const streamingJobDefinition = (await fs_1.promises.readFile(node.element.fileSystemUri.fsPath)).toString();
        const dacFxService = await utils.getDacFxService();
        const actionStartTime = new Date().getTime();
        const result = await dacFxService.validateStreamingJob(dacpacPath, streamingJobDefinition);
        const duration = new Date().getTime() - actionStartTime;
        telemetryProps.success = result.success.toString();
        if (result.success) {
            void vscode.window.showInformationMessage(constants.externalStreamingJobValidationPassed);
        }
        else {
            void vscode.window.showErrorMessage(result.errorMessage);
        }
        telemetry_1.TelemetryReporter.createActionEvent(telemetry_1.TelemetryViews.ProjectTree, telemetry_1.TelemetryActions.runStreamingJobValidation)
            .withAdditionalProperties(telemetryProps)
            .withAdditionalMeasurements({ duration: duration })
            .send();
        return result;
    }
    //#region AutoRest
    async selectAutorestSpecFile() {
        let quickpickSelection = await vscode.window.showQuickPick([constants.browseEllipsisWithIcon], { title: constants.selectSpecFile, ignoreFocusOut: true });
        if (!quickpickSelection) {
            return;
        }
        const filters = {};
        filters[constants.specSelectionText] = constants.openApiSpecFileExtensions;
        let uris = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            openLabel: constants.selectString,
            filters: filters,
            title: constants.selectSpecFile,
        });
        if (!uris) {
            return;
        }
        return uris[0].fsPath;
    }
    /**
     * @returns \{ newProjectFolder: 'C:\Source\MyProject',
     * 			outputFolder: 'C:\Source',
     * 			projectName: 'MyProject'}
     */
    async selectAutorestProjectLocation(projectName, defaultOutputLocation) {
        let newProjectFolder = defaultOutputLocation
            ? path.join(defaultOutputLocation.fsPath, projectName)
            : "";
        let outputFolder = defaultOutputLocation?.fsPath || "";
        while (true) {
            let quickPickTitle = "";
            if (newProjectFolder && (await utils.exists(newProjectFolder))) {
                // Folder already exists at target location, prompt for new location
                quickPickTitle = constants.folderAlreadyExistsChooseNewLocation(newProjectFolder);
            }
            else if (!newProjectFolder) {
                // No target location yet
                quickPickTitle = constants.selectProjectLocation;
            }
            else {
                // Folder doesn't exist at target location so we're done
                break;
            }
            const quickpickSelection = await vscode.window.showQuickPick([constants.browseEllipsisWithIcon], { title: quickPickTitle, ignoreFocusOut: true });
            if (!quickpickSelection) {
                return;
            }
            const folders = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: constants.selectString,
                defaultUri: defaultOutputLocation ?? vscode.workspace.workspaceFolders?.[0]?.uri,
                title: constants.selectProjectLocation,
            });
            if (!folders) {
                return;
            }
            outputFolder = folders[0].fsPath;
            newProjectFolder = path.join(outputFolder, projectName);
        }
        return { newProjectFolder, outputFolder, projectName };
    }
    async generateAutorestFiles(specPath, newProjectFolder) {
        await fs_1.promises.mkdir(newProjectFolder, { recursive: true });
        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: constants.generatingProjectFromAutorest(path.basename(specPath)),
            cancellable: false,
        }, async (_progress, _token) => {
            return this.autorestHelper.generateAutorestFiles(specPath, newProjectFolder);
        });
    }
    /**
     * Adds the provided project in the workspace, opening it in the projects viewlet
     * @param projectFilePath
     */
    async openProjectInWorkspace(projectFilePath) {
        const workspaceApi = utils.getDataWorkspaceExtensionApi();
        await workspaceApi.validateWorkspace();
        await workspaceApi.addProjectsToWorkspace([vscode.Uri.file(projectFilePath)]);
        workspaceApi.showProjectsView();
    }
    async promptForAutorestProjectName(defaultName) {
        let name = await vscode.window.showInputBox({
            ignoreFocusOut: true,
            prompt: constants.autorestProjectName,
            value: defaultName,
            validateInput: (value) => {
                return utils.isValidBasenameErrorMessage(value);
            },
        });
        if (name === undefined) {
            return; // cancelled by user
        }
        name = name.trim();
        return name;
    }
    /**
     * Prompts the user with vscode quickpicks to select an OpenApi or Swagger spec to generate sql project from
     * @param options optional options to pass in instead of using quickpicks to prompt
     * @returns created sql project
     */
    async generateProjectFromOpenApiSpec(options) {
        try {
            telemetry_1.TelemetryReporter.sendActionEvent(telemetry_1.TelemetryViews.ProjectController, telemetry_1.TelemetryActions.generateProjectFromOpenApiSpec);
            // 1. select spec file
            const specPath = options?.openApiSpecFile?.fsPath || (await this.selectAutorestSpecFile());
            if (!specPath) {
                return;
            }
            // 2. prompt for project name
            const projectName = await this.promptForAutorestProjectName(options?.defaultProjectName || path.basename(specPath, path.extname(specPath)));
            if (!projectName) {
                return;
            }
            // 3. select location, make new folder
            const projectInfo = await this.selectAutorestProjectLocation(projectName, options?.defaultOutputLocation);
            if (!projectInfo) {
                return;
            }
            // 4. run AutoRest to generate .sql files
            const result = await this.generateAutorestFiles(specPath, projectInfo.newProjectFolder);
            if (!result) {
                // user canceled operation when choosing how to run autorest
                return;
            }
            const scriptList = await this.getSqlFileList(projectInfo.newProjectFolder);
            if (!scriptList || scriptList.length === 0) {
                void vscode.window.showInformationMessage(constants.noSqlFilesGenerated);
                this._outputChannel.show();
                return;
            }
            // 5. create new SQL project
            const newProjFilePath = await this.createNewProject({
                newProjName: projectInfo.projectName,
                folderUri: vscode.Uri.file(projectInfo.outputFolder),
                projectTypeId: constants.emptySqlDatabaseProjectTypeId,
                sdkStyle: !!options?.isSDKStyle,
                configureDefaultBuild: true,
            });
            const project = await project_1.Project.openProject(newProjFilePath);
            // 6. add generated files to SQL project
            const uriList = scriptList.filter((f) => !f.fsPath.endsWith(constants.autorestPostDeploymentScriptName));
            const relativePaths = uriList.map((f) => path.relative(project.projectFolderPath, f.fsPath));
            await project.addSqlObjectScripts(relativePaths); // Add generated file structure to the project
            const postDeploymentScript = this.findPostDeploymentScript(scriptList);
            if (postDeploymentScript) {
                await project.addPostDeploymentScript(path.relative(project.projectFolderPath, postDeploymentScript.fsPath));
            }
            if (options?.doNotOpenInWorkspace !== true) {
                // 7. add project to workspace and open
                await this.openProjectInWorkspace(newProjFilePath);
            }
            return project;
        }
        catch (err) {
            void vscode.window.showErrorMessage(constants.generatingProjectFailed(utils.getErrorMessage(err)));
            telemetry_1.TelemetryReporter.sendErrorEvent2(telemetry_1.TelemetryViews.ProjectController, telemetry_1.TelemetryActions.generateProjectFromOpenApiSpec, err);
            this._outputChannel.show();
            return;
        }
    }
    findPostDeploymentScript(files) {
        // Locate the post-deployment script generated by autorest, if one exists.
        // It's only generated if enums are present in spec, b/c the enum values need to be inserted into the generated table.
        // Because autorest is executed via command rather than API, we can't easily "receive" the name of the script,
        // so we're stuck just matching on a file name.
        const results = files.filter((f) => f.fsPath.endsWith(constants.autorestPostDeploymentScriptName));
        switch (results.length) {
            case 0:
                return undefined;
            case 1:
                return results[0];
            default:
                throw new Error(constants.multipleMostDeploymentScripts(results.length));
        }
    }
    async getSqlFileList(folder) {
        if (!(await utils.exists(folder))) {
            return undefined;
        }
        const entries = await fs_1.promises.readdir(folder, { withFileTypes: true });
        const folders = entries
            .filter((dir) => dir.isDirectory())
            .map((dir) => path.join(folder, dir.name));
        const files = entries
            .filter((file) => !file.isDirectory() && path.extname(file.name) === constants.sqlFileExtension)
            .map((file) => vscode.Uri.file(path.join(folder, file.name)));
        for (const folder of folders) {
            files.push(...((await this.getSqlFileList(folder)) ?? []));
        }
        return files;
    }
    //#endregion
    //#region Helper methods
    async getProjectFromContext(context) {
        if ("element" in context) {
            context = context.element;
        }
        if (context instanceof project_1.Project) {
            return context;
        }
        if (context instanceof baseTreeItem_1.BaseProjectTreeItem) {
            return project_1.Project.openProject(context.projectFileUri.fsPath);
        }
        else {
            throw new Error(constants.unexpectedProjectContext(JSON.stringify(context)));
        }
    }
    getRelativePath(rootProjectUri, treeNode) {
        return treeNode instanceof fileFolderTreeItem_1.FolderNode
            ? utils.trimUri(rootProjectUri, treeNode.relativeProjectUri)
            : "";
    }
    getConnectionProfileFromContext(context) {
        if (!context) {
            return undefined;
        }
        // depending on where import new project is launched from, the connection profile could be passed as just
        // the profile or it could be wrapped in another object
        return (context?.connectionProfile ??
            context.connectionInfo ??
            context);
    }
    refreshProjectsTree(workspaceTreeItem) {
        workspaceTreeItem.treeDataProvider.notifyTreeDataChanged();
    }
    //#endregion
    //#region Create project from database
    /**
     * Creates a new SQL database project from the existing database,
     * prompting the user for a name, file path location and extract target
     */
    async createProjectFromDatabase(context) {
        const profile = this.getConnectionProfileFromContext(context);
        if (context) {
            // The profile we get from VS Code is for the overall server connection and isn't updated based on the database node
            // the command was launched from like it is in ADS. So get the actual database name from the MSSQL extension and
            // update the connection info here.
            const treeNodeContext = context;
            const databaseName = (await utils.getVscodeMssqlApi()).getDatabaseNameFromTreeNode(treeNodeContext);
            profile.database = databaseName;
        }
        await (0, createProjectFromDatabaseQuickpick_1.createNewProjectFromDatabaseWithQuickpick)(profile, (model, connectionInfo, serverName) => this.createProjectFromDatabaseCallback(model, connectionInfo, serverName));
    }
    async createProjectFromDatabaseCallback(model, connectionInfo, serverName) {
        try {
            const newProjFolderUri = model.filePath;
            let targetPlatform;
            let serverInfo;
            if (connectionInfo) {
                if (typeof connectionInfo === "string") {
                    throw new Error("Connection ID string is not supported in VS Code");
                }
                else {
                    serverInfo = (await utils.getVscodeMssqlApi()).getServerInfo(connectionInfo);
                }
            }
            if (serverInfo) {
                targetPlatform = await utils.getTargetPlatformFromServerVersion(serverInfo, serverName);
            }
            const newProjFilePath = await this.createNewProject({
                newProjName: model.projName,
                folderUri: vscode.Uri.file(newProjFolderUri),
                projectTypeId: model.sdkStyle
                    ? constants.emptySqlDatabaseSdkProjectTypeId
                    : constants.emptySqlDatabaseProjectTypeId,
                sdkStyle: model.sdkStyle,
                targetPlatform: targetPlatform,
                configureDefaultBuild: true,
            });
            model.filePath = path.dirname(newProjFilePath);
            this.setFilePath(model);
            const project = await project_1.Project.openProject(newProjFilePath);
            const startTime = new Date();
            await this.createProjectFromDatabaseApiCall(model); // Call ExtractAPI in DacFx Service
            const timeToExtract = new Date().getTime() - startTime.getTime();
            telemetry_1.TelemetryReporter.createActionEvent(telemetry_1.TelemetryViews.ProjectController, telemetry_1.TelemetryActions.createProjectFromDatabase)
                .withAdditionalMeasurements({ durationMs: timeToExtract })
                .send();
            const scriptList = model.extractTarget === 1 /* mssqlVscode.ExtractTarget.file */
                ? [vscode.Uri.file(model.filePath)]
                : await this.generateScriptList(model.filePath); // Create a list of all the files to be added to project
            const relativePaths = scriptList.map((f) => path.relative(project.projectFolderPath, f.fsPath));
            if (!model.sdkStyle) {
                await project.addSqlObjectScripts(relativePaths); // Add generated file structure to the project
            }
            // add project to workspace
            const workspaceApi = utils.getDataWorkspaceExtensionApi();
            workspaceApi.showProjectsView();
            await workspaceApi.addProjectsToWorkspace([vscode.Uri.file(newProjFilePath)]);
        }
        catch (err) {
            void vscode.window.showErrorMessage(utils.getErrorMessage(err));
            telemetry_1.TelemetryReporter.sendErrorEvent2(telemetry_1.TelemetryViews.ProjectController, telemetry_1.TelemetryActions.createProjectFromDatabase, err);
        }
    }
    async createProjectFromDatabaseApiCall(model) {
        const service = await utils.getDacFxService();
        await service.createProjectFromDatabase(model.database, model.filePath, model.projName, model.version, model.connectionUri, model.extractTarget, enums_1.TaskExecutionMode.execute, model.includePermissions);
        // TODO: Check for success; throw error
    }
    setFilePath(model) {
        if (model.extractTarget === 1 /* mssqlVscode.ExtractTarget.file */) {
            model.filePath = path.join(model.filePath, `${model.projName}.sql`); // File extractTarget specifies the exact file rather than the containing folder
        }
    }
    /**
     * Generate a flat list of all scripts under a folder.
     * @param absolutePath absolute path to folder to generate the list of files from
     * @returns array of uris of files under the provided folder
     */
    async generateScriptList(absolutePath) {
        let fileList = [];
        if (!(await utils.exists(absolutePath))) {
            if (await utils.exists(absolutePath + constants.sqlFileExtension)) {
                absolutePath += constants.sqlFileExtension;
            }
            else {
                void vscode.window.showErrorMessage(constants.cannotResolvePath(absolutePath));
                return fileList;
            }
        }
        const files = [absolutePath];
        do {
            const filepath = files.pop();
            if (filepath) {
                const stat = await fs_1.promises.stat(filepath);
                if (stat.isDirectory()) {
                    (await fs_1.promises.readdir(filepath)).forEach((f) => files.push(path.join(filepath, f)));
                }
                else if (stat.isFile() && path.extname(filepath) === constants.sqlFileExtension) {
                    fileList.push(vscode.Uri.file(filepath));
                }
            }
        } while (files.length !== 0);
        return fileList;
    }
    //#endregion
    //#region Update project from database
    /**
     * Display dialog for user to configure existing SQL Project with the changes/differences from a database
     */
    async updateProjectFromDatabase(context) {
        let connection;
        try {
            if ("connectionProfile" in context) {
                connection = this.getConnectionProfileFromContext(context);
            }
        }
        catch { }
        let projectFilePath;
        if (context) {
            // VS Code's connection/profile may only represent the server-level connection and won't reflect
            // the database selected in the MSSQL tree node that the user invoked the command from.
            // In ADS the context can include the database info, but in VS Code we need to ask the MSSQL
            // extension for the actual database name for this tree node and then update the connection object.
            if (connection !== undefined) {
                const treeNodeContext = context;
                const databaseName = (await utils.getVscodeMssqlApi()).getDatabaseNameFromTreeNode(treeNodeContext);
                connection.database = databaseName;
            }
            else {
                // Check if it's a WorkspaceTreeItem by checking for the expected properties
                const workspaceItem = context;
                if (workspaceItem.element && workspaceItem.treeDataProvider) {
                    const project = await this.getProjectFromContext(workspaceItem);
                    projectFilePath = project.projectFilePath;
                }
            }
        }
        await (0, updateProjectFromDatabaseQuickpick_1.UpdateProjectFromDatabaseWithQuickpick)(connection, projectFilePath, (model) => this.updateProjectFromDatabaseCallback(model));
    }
    async updateProjectFromDatabaseCallback(model) {
        try {
            const startTime = new Date();
            await this.updateProjectFromDatabaseApiCall(model);
            const timeToUpdate = new Date().getTime() - startTime.getTime();
            telemetry_1.TelemetryReporter.createActionEvent(telemetry_1.TelemetryViews.ProjectController, telemetry_1.TelemetryActions.updateProjectFromDatabase)
                .withAdditionalMeasurements({ durationMs: timeToUpdate })
                .send();
        }
        catch (err) {
            void vscode.window.showErrorMessage(utils.getErrorMessage(err));
            telemetry_1.TelemetryReporter.sendErrorEvent2(telemetry_1.TelemetryViews.ProjectController, telemetry_1.TelemetryActions.updateProjectFromDatabase, err);
        }
    }
    /**
     * Uses the DacFx service to update an existing SQL Project with the changes/differences from a database
     */
    async updateProjectFromDatabaseApiCall(model) {
        if (model.action === 0 /* UpdateProjectAction.Compare */) {
            await vscode.commands.executeCommand(constants.mssqlSchemaCompareCommand, model.sourceEndpointInfo, model.targetEndpointInfo, true, undefined);
        }
        else if (model.action === 1 /* UpdateProjectAction.Update */) {
            await vscode.window
                .showWarningMessage(constants.applyConfirmation, { modal: true }, constants.yesString)
                .then(async (result) => {
                if (result === constants.yesString) {
                    await vscode.window.withProgress({
                        location: vscode.ProgressLocation.Notification,
                        title: constants.updatingProjectFromDatabase(path.basename(model.targetEndpointInfo.projectFilePath), model.sourceEndpointInfo.databaseName),
                        cancellable: false,
                    }, async (_progress, _token) => {
                        return this.schemaCompareAndUpdateProject(model.sourceEndpointInfo, model.targetEndpointInfo);
                    });
                    void vscode.commands.executeCommand(constants.refreshDataWorkspaceCommand);
                    utils.getDataWorkspaceExtensionApi().showProjectsView();
                }
            });
        }
        else {
            throw new Error(`Unknown UpdateProjectAction: ${model.action}`);
        }
        return;
    }
    /**
     * Performs a schema compare of the source and target and updates the project with the results
     * @param source source for schema comparison
     * @param target target sql project for schema comparison to update
     */
    async schemaCompareAndUpdateProject(source, target) {
        // Run schema comparison - use the schema compare service
        const service = await utils.getSchemaCompareService();
        const dacFxService = await utils.getDacFxService();
        const operationId = UUID.generateUuid();
        target.targetScripts = await this.getProjectScriptFiles(target.projectFilePath);
        target.dataSchemaProvider = await this.getProjectDatabaseSchemaProvider(target.projectFilePath);
        telemetry_1.TelemetryReporter.sendActionEvent(telemetry_1.TelemetryViews.ProjectController, telemetry_1.TelemetryActions.SchemaComparisonStarted);
        const deploymentOptions = await dacFxService.getDeploymentOptions(1 /* DeploymentScenario.SchemaCompare */);
        // Perform schema comparison
        const comparisonResult = await service.compare(operationId, source, target, 0 /* mssqlVscode.TaskExecutionMode.execute */, deploymentOptions.defaultDeploymentOptions);
        if (!comparisonResult || !comparisonResult.success) {
            telemetry_1.TelemetryReporter.createErrorEvent2(telemetry_1.TelemetryViews.ProjectController, "SchemaComparisonFailed")
                .withAdditionalProperties({
                operationId: comparisonResult.operationId,
            })
                .send();
            await vscode.window.showErrorMessage(constants.compareErrorMessage(comparisonResult?.errorMessage));
            return;
        }
        telemetry_1.TelemetryReporter.createActionEvent(telemetry_1.TelemetryViews.ProjectController, telemetry_1.TelemetryActions.SchemaComparisonFinished)
            .withAdditionalProperties({
            endTime: Date.now().toString(),
            operationId: comparisonResult.operationId,
        })
            .send();
        if (comparisonResult.areEqual) {
            void vscode.window.showInformationMessage(constants.equalComparison);
            return;
        }
        if (comparisonResult.areEqual) {
            void vscode.window.showInformationMessage(constants.equalComparison);
            return;
        }
        // Publish the changes (retrieved from the cache by operationId)
        const publishResult = await this.schemaComparePublishProjectChanges(operationId, target.projectFilePath, target.extractTarget);
        if (publishResult.success) {
            void vscode.window.showInformationMessage(constants.applySuccess);
        }
        else {
            void vscode.window.showErrorMessage(constants.applyError(publishResult.errorMessage));
        }
    }
    async getProjectScriptFiles(projectFilePath) {
        const project = await project_1.Project.openProject(projectFilePath);
        return project.sqlObjectScripts
            .filter((f) => f.fsUri.fsPath.endsWith(constants.sqlFileExtension))
            .map((f) => f.fsUri.fsPath);
    }
    async getProjectDatabaseSchemaProvider(projectFilePath) {
        const project = await project_1.Project.openProject(projectFilePath);
        return project.getProjectTargetVersion();
    }
    /**
     * Updates the provided project with the results of the schema compare
     * @param operationId id of the schema comparison to update the project with
     * @param projectFilePath path to sql project to update
     * @param folderStructure folder structure to use when updating the target project
     * @returns
     */
    async schemaComparePublishProjectChanges(operationId, projectFilePath, folderStructure) {
        const service = await utils.getSchemaCompareService();
        const projectPath = path.dirname(projectFilePath);
        // Perform schema compare publish
        const result = await service.publishProjectChanges(operationId, projectPath, folderStructure, 0 /* mssqlVscode.TaskExecutionMode.execute */);
        if (!result.errorMessage) {
            const project = await project_1.Project.openProject(projectFilePath);
            let toAdd = [];
            result.addedFiles.forEach((f) => toAdd.push(vscode.Uri.file(f)));
            const relativePaths = toAdd.map((f) => path.relative(project.projectFolderPath, f.fsPath));
            await project.addSqlObjectScripts(relativePaths);
            let toRemove = [];
            result.deletedFiles.forEach((f) => toRemove.push(vscode.Uri.file(f)));
            let toRemoveEntries = [];
            toRemove.forEach((f) => toRemoveEntries.push(new projectEntry_1.FileProjectEntry(f, f.fsPath.replace(projectPath + "\\", ""), 0 /* EntryType.File */)));
            toRemoveEntries.forEach(async (f) => await project.excludeSqlObjectScript(f.fsUri.fsPath));
            await this.buildProject(project);
        }
        return result;
    }
    //#endregion
    /**
     * Move a file or folder in the project tree
     * @param projectUri URI of the project
     * @param source
     * @param target
     */
    async moveFile(projectUri, source, target) {
        const sourceFileNode = source;
        const project = await this.getProjectFromContext(sourceFileNode);
        // only moving files and folders are supported
        if (!sourceFileNode ||
            !(sourceFileNode instanceof fileFolderTreeItem_1.FileNode || sourceFileNode instanceof fileFolderTreeItem_1.FolderNode)) {
            void vscode.window.showErrorMessage(constants.onlyMoveFilesFoldersSupported);
            return;
        }
        // Moving files/folders to the SQLCMD variables and Database references folders isn't allowed
        if (!target.element.fileSystemUri) {
            return;
        }
        // TODO: handle moving between different projects
        if (projectUri.fsPath !== target.element.projectFileUri.fsPath) {
            void vscode.window.showErrorMessage(constants.movingFilesBetweenProjectsNotSupported);
            return;
        }
        // Calculate the new file path
        let folderPath;
        // target is the root of project, which is the .sqlproj
        if (target.element.projectFileUri.fsPath === target.element.fileSystemUri.fsPath) {
            // Get the project name from .sqlproj file path, not the folder name
            folderPath = path.basename(target.element.projectFileUri.fsPath, constants.sqlprojExtension);
        }
        else {
            // target is another file or folder
            folderPath = target.element.relativeProjectUri.fsPath.endsWith(constants.sqlFileExtension)
                ? path.dirname(target.element.relativeProjectUri.fsPath)
                : target.element.relativeProjectUri.fsPath;
        }
        const newPath = path.join(folderPath, sourceFileNode.friendlyName);
        // don't do anything if the path is the same
        if (newPath === sourceFileNode.relativeProjectUri.fsPath) {
            return;
        }
        const result = await vscode.window.showWarningMessage(constants.moveConfirmationPrompt(path.basename(sourceFileNode.fileSystemUri.fsPath), path.basename(folderPath)), { modal: true }, constants.move);
        if (result !== constants.move) {
            return;
        }
        // Move the file/folder
        const moveResult = await project.move(sourceFileNode, newPath);
        if (moveResult?.success) {
            telemetry_1.TelemetryReporter.sendActionEvent(telemetry_1.TelemetryViews.ProjectTree, telemetry_1.TelemetryActions.move);
        }
        else {
            telemetry_1.TelemetryReporter.sendErrorEvent2(telemetry_1.TelemetryViews.ProjectTree, telemetry_1.TelemetryActions.move);
            void vscode.window.showErrorMessage(constants.errorMovingFile(sourceFileNode.fileSystemUri.fsPath, newPath, utils.getErrorMessage(moveResult?.errorMessage)));
        }
    }
}
exports.ProjectsController = ProjectsController;
//# sourceMappingURL=projectController.js.map