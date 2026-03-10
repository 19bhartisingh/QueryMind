"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqlProjectReferenceTreeItem = exports.DatabaseReferenceTreeItem = exports.DatabaseReferencesTreeItem = void 0;
const vscode = require("vscode");
const path = require("path");
const constants = require("../../common/constants");
const baseTreeItem_1 = require("./baseTreeItem");
const iconHelper_1 = require("../../common/iconHelper");
const projectEntry_1 = require("../projectEntry");
/**
 * Folder for containing references nodes in the tree
 */
class DatabaseReferencesTreeItem extends baseTreeItem_1.BaseProjectTreeItem {
    references = [];
    /**
     * Constructor
     * @param projectNodeName Name of the project node. Used for creating the relative path of the Database References node to the project
     * @param sqlprojUri Full URI to the .sqlproj
     * @param databaseReferences Array of database references in the project
     */
    constructor(projectNodeName, sqlprojUri, databaseReferences) {
        super(vscode.Uri.file(path.join(projectNodeName, constants.databaseReferencesNodeName)), sqlprojUri);
        this.construct(databaseReferences);
    }
    construct(databaseReferences) {
        if (!databaseReferences) {
            return;
        }
        for (const reference of databaseReferences) {
            this.references.push(reference instanceof projectEntry_1.SqlProjectReferenceProjectEntry
                ? new SqlProjectReferenceTreeItem(reference, this.relativeProjectUri, this.projectFileUri)
                : new DatabaseReferenceTreeItem(reference, this.relativeProjectUri, this.projectFileUri));
        }
    }
    get children() {
        return this.references;
    }
    get type() {
        return constants.DatabaseProjectItemType.referencesRoot;
    }
    get treeItem() {
        const refFolderItem = new vscode.TreeItem(this.relativeProjectUri, vscode.TreeItemCollapsibleState.Collapsed);
        refFolderItem.contextValue = this.type;
        refFolderItem.iconPath = iconHelper_1.IconPathHelper.referenceGroup;
        return refFolderItem;
    }
}
exports.DatabaseReferencesTreeItem = DatabaseReferencesTreeItem;
class DatabaseReferenceTreeItem extends baseTreeItem_1.BaseProjectTreeItem {
    reference;
    constructor(reference, referencesNodeRelativeProjectUri, sqlprojUri) {
        super(vscode.Uri.file(path.join(referencesNodeRelativeProjectUri.fsPath, reference.referenceName)), sqlprojUri);
        this.reference = reference;
        this.entryKey = this.friendlyName;
    }
    get children() {
        return [];
    }
    get type() {
        return constants.DatabaseProjectItemType.reference;
    }
    get treeItem() {
        const refItem = new vscode.TreeItem(this.relativeProjectUri, vscode.TreeItemCollapsibleState.None);
        refItem.label = this.reference.referenceName;
        refItem.contextValue = this.type;
        refItem.iconPath = iconHelper_1.IconPathHelper.referenceDatabase;
        return refItem;
    }
}
exports.DatabaseReferenceTreeItem = DatabaseReferenceTreeItem;
class SqlProjectReferenceTreeItem extends DatabaseReferenceTreeItem {
    get type() {
        return constants.DatabaseProjectItemType.sqlProjectReference;
    }
}
exports.SqlProjectReferenceTreeItem = SqlProjectReferenceTreeItem;
//# sourceMappingURL=databaseReferencesTreeItem.js.map