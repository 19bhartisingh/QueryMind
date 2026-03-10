"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublishProfileNode = exports.NoneNode = exports.PostDeployNode = exports.PreDeployNode = exports.TableFileNode = exports.ExternalStreamingJobFileNode = exports.SqlObjectFileNode = exports.FileNode = exports.FolderNode = void 0;
exports.sortFileFolderNodes = sortFileFolderNodes;
const vscode = require("vscode");
const path = require("path");
const utils = require("../../common/utils");
const baseTreeItem_1 = require("./baseTreeItem");
const constants_1 = require("../../common/constants");
const iconHelper_1 = require("../../common/iconHelper");
/**
 * Node representing a folder in a project
 */
class FolderNode extends baseTreeItem_1.BaseProjectTreeItem {
    fileChildren = {};
    fileSystemUri;
    entryKey = "";
    constructor(folderPath, sqlprojUri, entryKey) {
        super(fsPathToProjectUri(folderPath, sqlprojUri), sqlprojUri);
        this.fileSystemUri = folderPath;
        this.entryKey = entryKey;
    }
    get children() {
        return Object.values(this.fileChildren).sort(sortFileFolderNodes);
    }
    get type() {
        return constants_1.DatabaseProjectItemType.folder;
    }
    get treeItem() {
        const folderItem = new vscode.TreeItem(this.fileSystemUri, vscode.TreeItemCollapsibleState.Collapsed);
        folderItem.contextValue = this.type;
        folderItem.iconPath = iconHelper_1.IconPathHelper.folder;
        return folderItem;
    }
}
exports.FolderNode = FolderNode;
/**
 * Node representing a file in a project
 */
class FileNode extends baseTreeItem_1.BaseProjectTreeItem {
    fileSystemUri;
    entryKey = "";
    constructor(filePath, sqlprojUri, entryKey) {
        super(fsPathToProjectUri(filePath, sqlprojUri, true), sqlprojUri);
        this.fileSystemUri = filePath;
        this.entryKey = entryKey;
    }
    get children() {
        return [];
    }
    get treeItem() {
        const treeItem = new vscode.TreeItem(this.fileSystemUri, vscode.TreeItemCollapsibleState.None);
        treeItem.command = {
            title: "Open file with file watcher",
            command: "sqlDatabaseProjects.openFileWithWatcher",
            arguments: [this.fileSystemUri, this],
        };
        treeItem.contextValue = constants_1.DatabaseProjectItemType.file;
        return treeItem;
    }
}
exports.FileNode = FileNode;
class SqlObjectFileNode extends FileNode {
    get treeItem() {
        const treeItem = super.treeItem;
        treeItem.contextValue = this.type;
        return treeItem;
    }
    get type() {
        return constants_1.DatabaseProjectItemType.sqlObjectScript;
    }
}
exports.SqlObjectFileNode = SqlObjectFileNode;
class ExternalStreamingJobFileNode extends SqlObjectFileNode {
    get treeItem() {
        const treeItem = super.treeItem;
        treeItem.contextValue = this.type;
        return treeItem;
    }
    get type() {
        return constants_1.DatabaseProjectItemType.externalStreamingJob;
    }
}
exports.ExternalStreamingJobFileNode = ExternalStreamingJobFileNode;
class TableFileNode extends SqlObjectFileNode {
    get treeItem() {
        const treeItem = super.treeItem;
        treeItem.contextValue = this.type;
        return treeItem;
    }
    get type() {
        return constants_1.DatabaseProjectItemType.table;
    }
}
exports.TableFileNode = TableFileNode;
class PreDeployNode extends FileNode {
    get treeItem() {
        const treeItem = super.treeItem;
        treeItem.contextValue = this.type;
        return treeItem;
    }
    get type() {
        return constants_1.DatabaseProjectItemType.preDeploymentScript;
    }
}
exports.PreDeployNode = PreDeployNode;
class PostDeployNode extends FileNode {
    get treeItem() {
        const treeItem = super.treeItem;
        treeItem.contextValue = this.type;
        return treeItem;
    }
    get type() {
        return constants_1.DatabaseProjectItemType.postDeploymentScript;
    }
}
exports.PostDeployNode = PostDeployNode;
class NoneNode extends FileNode {
    get treeItem() {
        const treeItem = super.treeItem;
        treeItem.contextValue = this.type;
        return treeItem;
    }
    get type() {
        return constants_1.DatabaseProjectItemType.noneFile;
    }
}
exports.NoneNode = NoneNode;
class PublishProfileNode extends FileNode {
    get treeItem() {
        const treeItem = super.treeItem;
        treeItem.contextValue = this.type;
        return treeItem;
    }
    get type() {
        return constants_1.DatabaseProjectItemType.publishProfile;
    }
}
exports.PublishProfileNode = PublishProfileNode;
/**
 * Compares two folder/file tree nodes so that folders come before files, then alphabetically
 * @param a a folder or file tree node
 * @param b another folder or file tree node
 */
function sortFileFolderNodes(a, b) {
    if (a instanceof FolderNode && !(b instanceof FolderNode)) {
        return -1;
    }
    else if (!(a instanceof FolderNode) && b instanceof FolderNode) {
        return 1;
    }
    else {
        return a.relativeProjectUri.fsPath.localeCompare(b.relativeProjectUri.fsPath);
    }
}
/**
 * Converts a full filesystem URI to a project-relative URI that's compatible with the project tree
 */
function fsPathToProjectUri(fileSystemUri, sqlprojUri, isFile) {
    const projBaseDir = path.dirname(sqlprojUri.fsPath);
    const projectFolderName = path.basename(sqlprojUri.fsPath, constants_1.sqlprojExtension);
    let localUri = "";
    if (fileSystemUri.fsPath.startsWith(projBaseDir)) {
        localUri = fileSystemUri.fsPath.substring(projBaseDir.length);
    }
    else if (isFile) {
        // if file is outside the folder add add at top level in tree
        // this is not true for folders otherwise the outside files will not be directly inside the top level
        const parts = utils.getPlatformSafeFileEntryPath(fileSystemUri.fsPath).split("/");
        localUri = parts[parts.length - 1];
    }
    return vscode.Uri.file(path.join(projectFolderName, localUri));
}
//# sourceMappingURL=fileFolderTreeItem.js.map