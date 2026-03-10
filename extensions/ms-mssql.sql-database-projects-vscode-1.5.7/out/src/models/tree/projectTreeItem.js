"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectRootTreeItem = void 0;
const vscode = require("vscode");
const path = require("path");
const baseTreeItem_1 = require("./baseTreeItem");
const fileTree = require("./fileFolderTreeItem");
const utils = require("../../common/utils");
const databaseReferencesTreeItem_1 = require("./databaseReferencesTreeItem");
const constants_1 = require("../../common/constants");
const iconHelper_1 = require("../../common/iconHelper");
const netcoreTool_1 = require("../../tools/netcoreTool");
const sqlcmdVariableTreeItem_1 = require("./sqlcmdVariableTreeItem");
/**
 * TreeNode root that represents an entire project
 */
class ProjectRootTreeItem extends baseTreeItem_1.BaseProjectTreeItem {
    databaseReferencesNode;
    sqlCmdVariablesNode;
    fileChildren = {};
    project;
    fileSystemUri;
    projectNodeName;
    constructor(project) {
        super(vscode.Uri.parse(path.basename(project.projectFilePath, constants_1.sqlprojExtension)), vscode.Uri.file(project.projectFilePath));
        this.project = project;
        this.fileSystemUri = vscode.Uri.file(project.projectFilePath);
        this.projectNodeName = path.basename(project.projectFilePath, constants_1.sqlprojExtension);
        this.databaseReferencesNode = new databaseReferencesTreeItem_1.DatabaseReferencesTreeItem(this.projectNodeName, this.projectFileUri, project.databaseReferences);
        this.sqlCmdVariablesNode = new sqlcmdVariableTreeItem_1.SqlCmdVariablesTreeItem(this.projectNodeName, this.projectFileUri, project.sqlCmdVariables);
        this.construct();
    }
    get children() {
        const output = [];
        output.push(this.databaseReferencesNode);
        output.push(this.sqlCmdVariablesNode);
        return output.concat(Object.values(this.fileChildren).sort(fileTree.sortFileFolderNodes));
    }
    get treeItem() {
        const collapsibleState = vscode.workspace.getConfiguration(netcoreTool_1.DBProjectConfigurationKey)[constants_1.CollapseProjectNodesKey]
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.Expanded;
        const projectItem = new vscode.TreeItem(this.fileSystemUri, collapsibleState);
        projectItem.contextValue = this.type;
        projectItem.iconPath = iconHelper_1.IconPathHelper.databaseProject;
        projectItem.label = this.projectNodeName;
        return projectItem;
    }
    get type() {
        const projectType = this.project.sqlProjStyle === 0 /* vscodeMssql.ProjectType.SdkStyle */
            ? constants_1.DatabaseProjectItemType.project
            : constants_1.DatabaseProjectItemType.legacyProject;
        return projectType;
    }
    /**
     * Processes the list of files in a project file to constructs the tree
     */
    construct() {
        // folders
        // Note: folders must be sorted to ensure that parent folders come before their children
        for (const folder of this.project.folders.sort((a, b) => a.relativePath < b.relativePath ? -1 : a.relativePath > b.relativePath ? 1 : 0)) {
            const newNode = new fileTree.FolderNode(folder.fsUri, this.projectFileUri, folder.relativePath);
            this.addNode(newNode, folder);
        }
        // pre deploy scripts
        for (const preDeployEntry of this.project.preDeployScripts) {
            const newNode = new fileTree.PreDeployNode(preDeployEntry.fsUri, this.projectFileUri, preDeployEntry.relativePath);
            this.addNode(newNode, preDeployEntry);
        }
        // post deploy scripts
        for (const postDeployEntry of this.project.postDeployScripts) {
            const newNode = new fileTree.PostDeployNode(postDeployEntry.fsUri, this.projectFileUri, postDeployEntry.relativePath);
            this.addNode(newNode, postDeployEntry);
        }
        // none scripts
        for (const noneEntry of this.project.noneDeployScripts) {
            const newNode = new fileTree.NoneNode(noneEntry.fsUri, this.projectFileUri, noneEntry.relativePath);
            this.addNode(newNode, noneEntry);
        }
        // publish profiles
        for (const publishProfile of this.project.publishProfiles) {
            const newNode = new fileTree.PublishProfileNode(publishProfile.fsUri, this.projectFileUri, publishProfile.relativePath);
            this.addNode(newNode, publishProfile);
        }
        // sql object scripts
        for (const entry of this.project.sqlObjectScripts) {
            let newNode;
            if (entry.sqlObjectType === constants_1.ExternalStreamingJob) {
                newNode = new fileTree.ExternalStreamingJobFileNode(entry.fsUri, this.projectFileUri, entry.relativePath);
            }
            else if (entry.containsCreateTableStatement) {
                newNode = new fileTree.TableFileNode(entry.fsUri, this.projectFileUri, entry.relativePath);
            }
            else {
                newNode = new fileTree.SqlObjectFileNode(entry.fsUri, this.projectFileUri, entry.relativePath);
            }
            this.addNode(newNode, entry);
        }
    }
    addNode(newNode, entry) {
        // Don't add external folders
        if (entry.type !== 0 /* EntryType.File */ && entry.relativePath.startsWith(constants_1.RelativeOuterPath)) {
            return;
        }
        const parentNode = this.getEntryParentNode(entry);
        if (Object.keys(parentNode.fileChildren).includes(path.basename(entry.fsUri.path))) {
            return; // ignore duplicate entries
        }
        parentNode.fileChildren[path.basename(entry.fsUri.path)] = newNode;
    }
    /**
     * Gets the immediate parent tree node for an entry in a project file
     */
    getEntryParentNode(entry) {
        const relativePathParts = utils
            .trimChars(utils.trimUri(this.projectFileUri, entry.fsUri), "/")
            .split("/")
            .slice(0, -1); // remove the last part because we only care about the parent
        if (relativePathParts.length === 0) {
            return this; // if nothing left after trimming the entry itself, must been root
        }
        if (relativePathParts[0] === constants_1.RelativeOuterPath) {
            // scripts external to the project folder are always parented by the project root node because external folders aren't supported
            return this;
        }
        let current = this; // start with the Project root node
        for (const part of relativePathParts) {
            // iterate from the project root, down the path to the entry in question
            if (current.fileChildren[part] === undefined) {
                // DacFx.Projects populates the list of folders with those implicitly included via parentage.
                // e.g. <Folder Include="MySchema\Tables"> and <Build Include="MySchema\SomeScript.sql"> both result in the "MySchema" folder being automatically added,
                // even if there's no <Folder Include="MySchema"> entry.
                // Project tree unit tests need to explicitly include parent folders because they bypass DacFx's logic, or they'll hit this error.
                throw new Error((0, constants_1.errorPrefix)(`All parent nodes for ${relativePathParts} should have already been added.`));
            }
            if (current.fileChildren[part] instanceof fileTree.FileNode) {
                return current; // if we've made it to the node in question, we're done
            }
            else {
                current = current.fileChildren[part]; // otherwise, shift the current node down, and repeat
            }
        }
        return current;
    }
}
exports.ProjectRootTreeItem = ProjectRootTreeItem;
//# sourceMappingURL=projectTreeItem.js.map