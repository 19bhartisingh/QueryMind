"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqlDatabaseProjectTreeViewProvider = void 0;
const vscode = require("vscode");
const projectTreeItem_1 = require("../models/tree/projectTreeItem");
/**
 * Tree view for database projects
 */
class SqlDatabaseProjectTreeViewProvider {
    _onDidChangeTreeData = new vscode.EventEmitter();
    treeView;
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    roots = [];
    constructor() {
        this.initialize();
    }
    initialize() {
        this.roots = [];
    }
    notifyTreeDataChanged() {
        this._onDidChangeTreeData.fire(undefined);
    }
    getTreeItem(element) {
        return element.treeItem;
    }
    getChildren(element) {
        if (element === undefined) {
            return this.roots;
        }
        return element.children;
    }
    /**
     * Constructs a new set of root nodes from a list of Projects
     * @param projects List of Projects
     */
    load(projects) {
        let newRoots = [];
        for (const proj of projects) {
            newRoots.push(new projectTreeItem_1.ProjectRootTreeItem(proj));
        }
        this.roots = newRoots;
        this._onDidChangeTreeData.fire(undefined);
    }
    setTreeView(value) {
        if (this.treeView) {
            throw new Error("TreeView should not be set multiple times.");
        }
        this.treeView = value;
    }
}
exports.SqlDatabaseProjectTreeViewProvider = SqlDatabaseProjectTreeViewProvider;
//# sourceMappingURL=databaseProjectTreeViewProvider.js.map