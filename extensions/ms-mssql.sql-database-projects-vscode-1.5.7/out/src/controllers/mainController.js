"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const templates = require("../templates/templates");
const path = require("path");
const projectController_1 = require("./projectController");
const netcoreTool_1 = require("../tools/netcoreTool");
const iconHelper_1 = require("../common/iconHelper");
const constants = require("../common/constants");
const projectProvider_1 = require("../projectProvider/projectProvider");
/**
 * The main controller class that initializes the extension
 */
class MainController {
    context;
    projectsController;
    netcoreTool;
    _outputChannel = vscode.window.createOutputChannel(constants.projectsOutputChannel);
    constructor(context) {
        this.context = context;
        this.projectsController = new projectController_1.ProjectsController(this._outputChannel);
        this.netcoreTool = new netcoreTool_1.NetCoreTool(this._outputChannel);
    }
    get extensionContext() {
        return this.context;
    }
    get projController() {
        return this.projectsController;
    }
    deactivate() { }
    async activate() {
        // upgrade path from former netCoreSDKLocation setting to dotnetSDK Location setting
        // copy old setting's value to new setting
        const oldNetCoreInstallSetting = vscode.workspace.getConfiguration(netcoreTool_1.DBProjectConfigurationKey)[netcoreTool_1.NetCoreInstallLocationKey];
        if (oldNetCoreInstallSetting &&
            !vscode.workspace.getConfiguration(netcoreTool_1.DBProjectConfigurationKey)[netcoreTool_1.DotnetInstallLocationKey]) {
            await vscode.workspace
                .getConfiguration(netcoreTool_1.DBProjectConfigurationKey)
                .update(netcoreTool_1.DotnetInstallLocationKey, oldNetCoreInstallSetting, true);
        }
        await this.initializeDatabaseProjects();
        return new projectProvider_1.SqlDatabaseProjectProvider(this.projectsController);
    }
    async initializeDatabaseProjects() {
        // init commands
        this.context.subscriptions.push(vscode.commands.registerCommand("sqlDatabaseProjects.properties", async (node) => {
            return vscode.window.showErrorMessage(`Properties not yet implemented: ${node.element.uri.path}`);
        })); // TODO
        this.context.subscriptions.push(vscode.commands.registerCommand("sqlDatabaseProjects.build", async (node) => {
            return this.projectsController.buildProject(node, false);
        }));
        this.context.subscriptions.push(vscode.commands.registerCommand("sqlDatabaseProjects.buildWithCodeAnalysis", async (node) => {
            return this.projectsController.buildProject(node, true);
        }));
        this.context.subscriptions.push(vscode.commands.registerCommand("sqlDatabaseProjects.publish", async (node) => {
            return this.projectsController.publishProject(node);
        }));
        this.context.subscriptions.push(vscode.commands.registerCommand("sqlDatabaseProjects.schemaCompare", async (node) => {
            return this.projectsController.schemaCompare(node);
        }));
        this.context.subscriptions.push(vscode.commands.registerCommand("sqlDatabaseProjects.schemaComparePublishProjectChanges", async (operationId, projectFilePath, folderStructure) => {
            return await this.projectsController.schemaComparePublishProjectChanges(operationId, projectFilePath, folderStructure);
        }));
        this.context.subscriptions.push(vscode.commands.registerCommand("sqlDatabaseProjects.updateProjectFromDatabase", async (node) => {
            await this.projectsController.updateProjectFromDatabase(node);
        }));
        this.context.subscriptions.push(vscode.commands.registerCommand("sqlDatabaseProjects.createProjectFromDatabase", async (context) => {
            return this.projectsController.createProjectFromDatabase(context);
        }));
        this.context.subscriptions.push(vscode.commands.registerCommand("sqlDatabaseProjects.generateProjectFromOpenApiSpec", async (options) => {
            return this.projectsController.generateProjectFromOpenApiSpec(options);
        }));
        this.context.subscriptions.push(vscode.commands.registerCommand("sqlDatabaseProjects.newScript", async (node) => {
            return this.projectsController.addItemPromptFromNode(node, "script" /* ItemType.script */);
        }));
        this.context.subscriptions.push(vscode.commands.registerCommand("sqlDatabaseProjects.newPreDeploymentScript", async (node) => {
            return this.projectsController.addItemPromptFromNode(node, "preDeployScript" /* ItemType.preDeployScript */);
        }));
        this.context.subscriptions.push(vscode.commands.registerCommand("sqlDatabaseProjects.newPostDeploymentScript", async (node) => {
            return this.projectsController.addItemPromptFromNode(node, "postDeployScript" /* ItemType.postDeployScript */);
        }));
        this.context.subscriptions.push(vscode.commands.registerCommand("sqlDatabaseProjects.newTable", async (node) => {
            return this.projectsController.addItemPromptFromNode(node, "table" /* ItemType.table */);
        }));
        this.context.subscriptions.push(vscode.commands.registerCommand("sqlDatabaseProjects.newView", async (node) => {
            return this.projectsController.addItemPromptFromNode(node, "view" /* ItemType.view */);
        }));
        this.context.subscriptions.push(vscode.commands.registerCommand("sqlDatabaseProjects.newStoredProcedure", async (node) => {
            return this.projectsController.addItemPromptFromNode(node, "storedProcedure" /* ItemType.storedProcedure */);
        }));
        this.context.subscriptions.push(vscode.commands.registerCommand("sqlDatabaseProjects.newItem", async (node) => {
            return this.projectsController.addItemPromptFromNode(node);
        }));
        this.context.subscriptions.push(vscode.commands.registerCommand("sqlDatabaseProjects.addExistingItem", async (node) => {
            return this.projectsController.addExistingItemPrompt(node);
        }));
        this.context.subscriptions.push(vscode.commands.registerCommand("sqlDatabaseProjects.newFolder", async (node) => {
            return this.projectsController.addFolderPrompt(node);
        }));
        this.context.subscriptions.push(vscode.commands.registerCommand("sqlDatabaseProjects.newPublishProfile", async (node) => {
            return this.projectsController.addItemPromptFromNode(node, "publishProfile" /* ItemType.publishProfile */);
        }));
        this.context.subscriptions.push(vscode.commands.registerCommand("sqlDatabaseProjects.addDatabaseReference", async (node) => {
            return this.projectsController.addDatabaseReference(node);
        }));
        this.context.subscriptions.push(vscode.commands.registerCommand("sqlDatabaseProjects.openReferencedSqlProject", async (node) => {
            return this.projectsController.openReferencedSqlProject(node);
        }));
        this.context.subscriptions.push(vscode.commands.registerCommand("sqlDatabaseProjects.openContainingFolder", async (node) => {
            return this.projectsController.openContainingFolder(node);
        }));
        this.context.subscriptions.push(vscode.commands.registerCommand("sqlDatabaseProjects.editProjectFile", async (node) => {
            return this.projectsController.editProjectFile(node);
        }));
        this.context.subscriptions.push(vscode.commands.registerCommand("sqlDatabaseProjects.delete", async (node) => {
            return this.projectsController.delete(node);
        }));
        this.context.subscriptions.push(vscode.commands.registerCommand("sqlDatabaseProjects.exclude", async (node) => {
            return this.projectsController.exclude(node);
        }));
        this.context.subscriptions.push(vscode.commands.registerCommand("sqlDatabaseProjects.rename", async (node) => {
            return this.projectsController.rename(node);
        }));
        this.context.subscriptions.push(vscode.commands.registerCommand("sqlDatabaseProjects.editSqlCmdVariable", async (node) => {
            return this.projectsController.editSqlCmdVariable(node);
        }));
        this.context.subscriptions.push(vscode.commands.registerCommand("sqlDatabaseProjects.addSqlCmdVariable", async (node) => {
            return this.projectsController.addSqlCmdVariable(node);
        }));
        this.context.subscriptions.push(vscode.commands.registerCommand("sqlDatabaseProjects.changeTargetPlatform", async (node) => {
            return this.projectsController.changeTargetPlatform(node);
        }));
        this.context.subscriptions.push(vscode.commands.registerCommand("sqlDatabaseProjects.validateExternalStreamingJob", async (node) => {
            return this.projectsController.validateExternalStreamingJob(node);
        }));
        this.context.subscriptions.push(vscode.commands.registerCommand("sqlDatabaseProjects.openFileWithWatcher", async (fileSystemUri, node) => {
            return this.projectsController.openFileWithWatcher(fileSystemUri, node);
        }));
        iconHelper_1.IconPathHelper.setExtensionContext(this.extensionContext);
        await templates.loadTemplates(path.join(this.context.extensionPath, "resources", "templates"));
    }
    dispose() {
        this.deactivate();
    }
}
exports.default = MainController;
//# sourceMappingURL=mainController.js.map