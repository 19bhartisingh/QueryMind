"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqlCmdVariableTreeItem = exports.SqlCmdVariablesTreeItem = void 0;
const vscode = require("vscode");
const path = require("path");
const constants = require("../../common/constants");
const baseTreeItem_1 = require("./baseTreeItem");
const iconHelper_1 = require("../../common/iconHelper");
/**
 * Folder for containing SQLCMD variable nodes in the tree
 */
class SqlCmdVariablesTreeItem extends baseTreeItem_1.BaseProjectTreeItem {
    sqlcmdVariableTreeItems = [];
    /**
     * Constructor
     * @param projectNodeName Name of the project node. Used for creating the relative path of the SQLCMD Variables node to the project
     * @param sqlprojUri Full URI to the .sqlproj
     * @param sqlCmdVariables Collection of SQLCMD variables in the project
     */
    constructor(projectNodeName, sqlprojUri, sqlCmdVariables) {
        super(vscode.Uri.file(path.join(projectNodeName, constants.sqlcmdVariablesNodeName)), sqlprojUri);
        this.construct(sqlCmdVariables);
    }
    construct(sqlCmdVariables) {
        if (!sqlCmdVariables) {
            return;
        }
        for (const sqlCmdVariable of sqlCmdVariables.keys()) {
            this.sqlcmdVariableTreeItems.push(new SqlCmdVariableTreeItem(sqlCmdVariable, this.relativeProjectUri, this.projectFileUri));
        }
    }
    get children() {
        return this.sqlcmdVariableTreeItems;
    }
    get type() {
        return constants.DatabaseProjectItemType.sqlcmdVariablesRoot;
    }
    get treeItem() {
        const sqlCmdVariableFolderItem = new vscode.TreeItem(this.relativeProjectUri, vscode.TreeItemCollapsibleState.Collapsed);
        sqlCmdVariableFolderItem.contextValue = this.type;
        sqlCmdVariableFolderItem.iconPath = iconHelper_1.IconPathHelper.sqlCmdVariablesGroup;
        return sqlCmdVariableFolderItem;
    }
}
exports.SqlCmdVariablesTreeItem = SqlCmdVariablesTreeItem;
/**
 * Represents a SQLCMD variable in a .sqlproj
 */
class SqlCmdVariableTreeItem extends baseTreeItem_1.BaseProjectTreeItem {
    sqlcmdVar;
    constructor(sqlcmdVar, sqlCmdNodeRelativeProjectUri, sqlprojUri) {
        super(vscode.Uri.file(path.join(sqlCmdNodeRelativeProjectUri.fsPath, sqlcmdVar)), sqlprojUri);
        this.sqlcmdVar = sqlcmdVar;
        this.entryKey = this.friendlyName;
    }
    get children() {
        return [];
    }
    get type() {
        return constants.DatabaseProjectItemType.sqlcmdVariable;
    }
    get treeItem() {
        const sqlcmdVariableItem = new vscode.TreeItem(this.relativeProjectUri, vscode.TreeItemCollapsibleState.None);
        sqlcmdVariableItem.label = this.sqlcmdVar;
        sqlcmdVariableItem.contextValue = this.type;
        sqlcmdVariableItem.iconPath = iconHelper_1.IconPathHelper.sqlCmdVariable;
        return sqlcmdVariableItem;
    }
}
exports.SqlCmdVariableTreeItem = SqlCmdVariableTreeItem;
//# sourceMappingURL=sqlcmdVariableTreeItem.js.map