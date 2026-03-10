"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateProjectFromDatabaseWithQuickpick = UpdateProjectFromDatabaseWithQuickpick;
const vscode = require("vscode");
const constants = require("../common/constants");
const utils_1 = require("../common/utils");
const project_1 = require("../models/project");
/**
 * Create flow for update Project from existing database using only VS Code-native APIs such as QuickPick
 *
 * This helper drives a small, synchronous UX flow that:
 *  1) Prompts (or reuses) a connection
 *  2) Prompts for a database (if needed)
 *  3) Lets the user select an existing .sqlproj in the workspace (or browse to one) if needed
 *  4) Asks whether the user wants to Compare or Update the project
 *  5) Constructs an UpdateProjectDataModel and passes it to the optional callback
 *
 * @param connectionInfo Optional connection info to use instead of prompting the user for a connection
 * @param projectFilePath Optional project file path to use instead of prompting the user to select one
 * @param updateProjectFromDatabaseCallback Optional callback function to update the project from the user inputs
 */
async function UpdateProjectFromDatabaseWithQuickpick(connectionInfo, projectFilePath, updateProjectFromDatabaseCallback) {
    const vscodeMssqlApi = await (0, utils_1.getVscodeMssqlApi)();
    // Prompt 1a. Select connection (if not provided)
    // If connectionInfo was passed in, reuse it; otherwise show the native mssql connection picker.
    let connectionProfile = connectionInfo ?? (await vscodeMssqlApi.promptForConnection(true));
    if (!connectionProfile) {
        // User cancelled
        return undefined;
    }
    let connectionUri = "";
    let dbs = undefined;
    // Prompt 1b. Select database (if not already specified in connection profile)
    let selectedDatabase;
    if (connectionProfile.database && connectionProfile.database !== constants.master) {
        selectedDatabase = connectionProfile.database;
        connectionUri = await vscodeMssqlApi.connect(connectionProfile);
    }
    else {
        // Need to get list of databases from the server and prompt the user
        connectionUri = await vscodeMssqlApi.connect(connectionProfile);
        dbs = (await vscodeMssqlApi.listDatabases(connectionUri)).filter((db) => !constants.systemDbs.includes(db));
        const dbSelection = await vscode.window.showQuickPick(dbs, {
            title: constants.selectDatabase,
            ignoreFocusOut: true,
        });
        if (!dbSelection) {
            // User cancelled
            return undefined;
        }
        selectedDatabase = dbSelection;
    }
    // Prompt 2. Browse and Select existing project file, when projectFilePath is not available
    if (!projectFilePath) {
        // Get workspace projects
        const workspaceProjects = await (0, utils_1.getSqlProjectsInWorkspace)();
        const projectOptions = [constants.browseEllipsisWithIcon];
        // Add workspace projects to the list
        workspaceProjects.forEach((projectUri) => {
            projectOptions.push(projectUri.fsPath);
        });
        const projectSelection = await vscode.window.showQuickPick(projectOptions, {
            title: constants.selectProjectFile,
            ignoreFocusOut: true,
        });
        if (!projectSelection) {
            // User cancelled
            return undefined;
        }
        if (projectSelection === constants.browseEllipsisWithIcon) {
            // Show file browser
            const projectFileUri = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: constants.selectString,
                title: constants.selectProjectFile,
                filters: {
                    "SQL Projects": ["sqlproj"],
                },
            });
            if (!projectFileUri || projectFileUri.length === 0) {
                // User cancelled
                return undefined;
            }
            projectFilePath = projectFileUri[0].fsPath;
        }
        else {
            // User selected a workspace project
            projectFilePath = projectSelection;
        }
    }
    const project = await project_1.Project.openProject(projectFilePath);
    //Prompt 3: Select the action
    const actionSelection = await vscode.window.showQuickPick([constants.compareActionRadioButtonLabel, constants.updateActionRadioButtonLabel], {
        title: constants.actionLabel,
        ignoreFocusOut: true,
    });
    if (!actionSelection) {
        // User cancelled
        return undefined;
    }
    // Map the selected action to the enum
    const selectedAction = actionSelection === constants.compareActionRadioButtonLabel
        ? 0 /* UpdateProjectAction.Compare */
        : 1 /* UpdateProjectAction.Update */;
    // Build the connectionDetails object expected by the schema-compare endpoints.
    // This is a lightweight mapping that mirrors the shape used by the mssql/vscode-mssql APIs.
    const connectionDetails = {
        id: connectionProfile.id,
        userName: connectionProfile.user,
        password: connectionProfile.password,
        serverName: connectionProfile.server,
        databaseName: selectedDatabase,
        connectionName: connectionProfile.server,
        providerName: "MSSQL",
        authenticationType: connectionProfile.authenticationType,
        options: {},
    };
    // Construct the source endpoint (the database)
    const sourceEndpointInfo = {
        endpointType: 0 /* mssqlVscode.SchemaCompareEndpointType.Database */,
        databaseName: selectedDatabase,
        serverDisplayName: connectionProfile.server,
        serverName: connectionProfile.server,
        connectionDetails: connectionDetails,
        ownerUri: connectionUri,
        projectFilePath: "",
        extractTarget: 5 /* mssqlVscode.ExtractTarget.schemaObjectType */,
        targetScripts: [],
        dataSchemaProvider: "",
        packageFilePath: "",
        connectionName: connectionProfile.server,
    };
    // Construct the target endpoint (the selected project)
    const targetEndpointInfo = {
        endpointType: 2 /* mssqlVscode.SchemaCompareEndpointType.Project */,
        projectFilePath: projectFilePath,
        extractTarget: 5 /* mssqlVscode.ExtractTarget.schemaObjectType */,
        targetScripts: [],
        dataSchemaProvider: project.getProjectTargetVersion(),
        connectionDetails: connectionDetails,
        databaseName: "",
        serverDisplayName: "",
        serverName: "",
        ownerUri: "",
        packageFilePath: "",
    };
    const model = {
        sourceEndpointInfo: sourceEndpointInfo,
        targetEndpointInfo: targetEndpointInfo,
        action: selectedAction,
    };
    // Invoke the caller-provided callback with the collected model. The callback is responsible
    //  for running the compare or update operation; this function only collects and returns inputs.
    if (updateProjectFromDatabaseCallback) {
        await updateProjectFromDatabaseCallback(model);
    }
}
//# sourceMappingURL=updateProjectFromDatabaseQuickpick.js.map