"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqlDatabaseProjectProvider = void 0;
const vscode = require("vscode");
const constants = require("../common/constants");
const iconHelper_1 = require("../common/iconHelper");
const utils_1 = require("../common/utils");
const databaseProjectTreeViewProvider_1 = require("../controllers/databaseProjectTreeViewProvider");
const project_1 = require("../models/project");
class SqlDatabaseProjectProvider {
    projectController;
    constructor(projectController) {
        this.projectController = projectController;
    }
    supportsDragAndDrop = true;
    /**
     * Move a file in the project tree
     * @param projectUri
     * @param source
     * @param target
     */
    async moveFile(projectUri, source, target) {
        return this.projectController.moveFile(projectUri, source, target);
    }
    /**
     * Gets the project tree data provider
     * @param projectFilePath The project file Uri
     */
    async getProjectTreeDataProvider(projectFilePath) {
        const provider = new databaseProjectTreeViewProvider_1.SqlDatabaseProjectTreeViewProvider();
        const project = await project_1.Project.openProject(projectFilePath.fsPath, true, true);
        // open project in STS
        const sqlProjectsService = await (0, utils_1.getSqlProjectsService)();
        await sqlProjectsService.openProject(projectFilePath.fsPath);
        provider.load([project]);
        return provider;
    }
    /**
     * Gets the supported project types
     */
    get supportedProjectTypes() {
        return [
            {
                id: constants.emptyAzureDbSqlDatabaseProjectTypeId,
                projectFileExtension: constants.sqlprojExtension.replace(/\./g, ""),
                displayName: constants.emptyAzureDbProjectTypeDisplayName,
                description: constants.emptyAzureDbProjectTypeDescription,
                targetPlatforms: Array.from(constants.targetPlatformToVersion.keys()),
                defaultTargetPlatform: "Azure SQL Database" /* sqldbproj.SqlTargetPlatform.sqlAzure */,
                icon: iconHelper_1.IconPathHelper.azureSqlDbProject,
                sdkStyleOption: true,
                sdkStyleLearnMoreUrl: constants.sdkLearnMoreUrl,
                learnMoreUrl: constants.azureDevOpsLink,
            },
            {
                id: constants.emptySqlDatabaseProjectTypeId,
                projectFileExtension: constants.sqlprojExtension.replace(/\./g, ""),
                displayName: constants.emptyProjectTypeDisplayName,
                description: constants.emptyProjectTypeDescription,
                icon: iconHelper_1.IconPathHelper.colorfulSqlProject,
                targetPlatforms: Array.from(constants.targetPlatformToVersion.keys()),
                defaultTargetPlatform: constants.defaultTargetPlatform,
                sdkStyleOption: true,
                sdkStyleLearnMoreUrl: constants.sdkLearnMoreUrl,
            },
        ];
    }
    /**
     * Create a project
     * @param name name of the project
     * @param location the parent directory
     * @param projectTypeId the ID of the project/template
     * @param targetPlatform the target platform of the project
     * @param sdkStyle whether project is sdk-style. Default is false
     * @param configureDefaultBuild whether to configure default build. Default is false
     * @returns Uri of the newly created project file
     */
    async createProject(name, location, projectTypeId, targetPlatform, sdkStyle = false, configureDefaultBuild = false) {
        if (!targetPlatform) {
            const projectType = this.supportedProjectTypes.find((x) => x.id === projectTypeId);
            if (projectType && projectType.defaultTargetPlatform) {
                targetPlatform = projectType.defaultTargetPlatform;
            }
        }
        const projectFile = await this.projectController.createNewProject({
            newProjName: name,
            folderUri: location,
            projectTypeId: projectTypeId,
            configureDefaultBuild: configureDefaultBuild,
            targetPlatform: targetPlatform,
            sdkStyle: sdkStyle,
        });
        return vscode.Uri.file(projectFile);
    }
    /**
     * Opens and loads a .sqlproj file
     */
    openProject(projectFilePath) {
        return project_1.Project.openProject(projectFilePath, true, true);
    }
    addItemPrompt(project, relativeFilePath, options) {
        return this.projectController.addItemPrompt(project, relativeFilePath, options);
    }
    /**
     * Gets the project actions to be placed on the dashboard toolbar
     */
    get projectToolbarActions() {
        const addItemAction = {
            id: constants.addItemAction,
            icon: iconHelper_1.IconPathHelper.add,
            run: (treeItem) => this.projectController.addItemPromptFromNode(treeItem),
        };
        const schemaCompareAction = {
            id: constants.schemaCompareAction,
            icon: iconHelper_1.IconPathHelper.schemaCompare,
            run: (treeItem) => this.projectController.schemaCompare(treeItem),
        };
        const buildAction = {
            id: constants.buildAction,
            icon: iconHelper_1.IconPathHelper.build,
            run: (treeItem) => this.projectController.buildProject(treeItem),
        };
        const publishAction = {
            id: constants.publishAction,
            icon: iconHelper_1.IconPathHelper.publish,
            run: (treeItem) => this.projectController.publishProject(treeItem),
        };
        const changeTargetPlatformAction = {
            id: constants.changeTargetPlatformAction,
            icon: iconHelper_1.IconPathHelper.targetPlatform,
            run: (treeItem) => this.projectController.changeTargetPlatform(treeItem),
        };
        let group = {
            actions: [addItemAction, schemaCompareAction, buildAction, publishAction],
        };
        return [group, changeTargetPlatformAction];
    }
    /**
     * Gets the data to be displayed in the project dashboard.
     * Dashboard is not used in VS Code, so this returns empty.
     */
    getDashboardComponents(_projectFile) {
        return [];
    }
    openSqlNewProjectDialog(allowedTargetPlatforms) {
        let targetPlatforms = Array.from(constants.targetPlatformToVersion.keys());
        if (allowedTargetPlatforms) {
            targetPlatforms = targetPlatforms.filter((p) => allowedTargetPlatforms.toString().includes(p));
        }
        const projectUri = (0, utils_1.getDataWorkspaceExtensionApi)().openSpecificProjectNewProjectDialog();
        return projectUri;
    }
    /**
     * Gets the list of .sql scripts contained in a project
     * @param projectFilePath
     */
    getProjectScriptFiles(projectFilePath) {
        return this.projectController.getProjectScriptFiles(projectFilePath);
    }
    /**
     * Gets the Database Schema Provider version for a SQL project
     */
    getProjectDatabaseSchemaProvider(projectFilePath) {
        return this.projectController.getProjectDatabaseSchemaProvider(projectFilePath);
    }
    generateProjectFromOpenApiSpec(options) {
        return this.projectController.generateProjectFromOpenApiSpec(options);
    }
}
exports.SqlDatabaseProjectProvider = SqlDatabaseProjectProvider;
//# sourceMappingURL=projectProvider.js.map