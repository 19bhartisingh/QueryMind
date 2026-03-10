"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.IconPathHelper = void 0;
const vscode = require("vscode");
// export interface IconPath {
// 	dark: string;
// 	light: string;
// }
class IconPathHelper {
    static extensionContext;
    static databaseProject;
    static colorfulSqlProject;
    static sqlEdgeProject;
    static azureSqlDbProject;
    static dataSourceGroup;
    static dataSourceSql;
    static referenceGroup;
    static referenceDatabase;
    static sqlCmdVariablesGroup;
    static sqlCmdVariable;
    static refresh;
    static folder_blue;
    static selectConnection;
    static connect;
    static folder;
    static add;
    static build;
    static publish;
    static schemaCompare;
    static targetPlatform;
    static success;
    static error;
    static inProgress;
    static setExtensionContext(extensionContext) {
        IconPathHelper.extensionContext = extensionContext;
        IconPathHelper.databaseProject = IconPathHelper.makeIcon("databaseProject");
        IconPathHelper.colorfulSqlProject = IconPathHelper.makeIcon("colorfulSqlProject", true);
        IconPathHelper.sqlEdgeProject = IconPathHelper.makeIcon("sqlEdgeProject", true);
        IconPathHelper.azureSqlDbProject = IconPathHelper.makeIcon("azure", true);
        IconPathHelper.dataSourceGroup = IconPathHelper.makeIcon("dataSourceGroup");
        IconPathHelper.dataSourceSql = IconPathHelper.makeIcon("dataSource-sql");
        IconPathHelper.referenceGroup = IconPathHelper.makeIcon("referenceGroup");
        IconPathHelper.referenceDatabase = IconPathHelper.makeIcon("reference-database");
        IconPathHelper.sqlCmdVariablesGroup = IconPathHelper.makeIcon("symbol-string");
        IconPathHelper.sqlCmdVariable = IconPathHelper.makeIcon("symbol-variable");
        IconPathHelper.refresh = IconPathHelper.makeIcon("refresh", true);
        IconPathHelper.folder_blue = IconPathHelper.makeIcon("folder_blue", true);
        IconPathHelper.selectConnection = IconPathHelper.makeIcon("selectConnection", true);
        IconPathHelper.connect = IconPathHelper.makeIcon("connect", true);
        IconPathHelper.folder = IconPathHelper.makeIcon("folder");
        IconPathHelper.add = IconPathHelper.makeIcon("add", true);
        IconPathHelper.build = IconPathHelper.makeIcon("build", true);
        IconPathHelper.publish = IconPathHelper.makeIcon("publish", true);
        IconPathHelper.schemaCompare = IconPathHelper.makeIcon("schemaCompare", true);
        IconPathHelper.targetPlatform = IconPathHelper.makeIcon("targetPlatform", true);
        IconPathHelper.success = IconPathHelper.makeIcon("success", true);
        IconPathHelper.error = IconPathHelper.makeIcon("error", true);
        IconPathHelper.inProgress = IconPathHelper.makeIcon("inProgress", true);
    }
    static makeIcon(name, sameIcon = false) {
        const folder = "images";
        const toIconUri = (relativePath) => vscode.Uri.file(IconPathHelper.extensionContext.asAbsolutePath(relativePath));
        if (sameIcon) {
            const iconPath = `${folder}/${name}.svg`;
            return {
                dark: toIconUri(iconPath),
                light: toIconUri(iconPath),
            };
        }
        return {
            dark: toIconUri(`${folder}/dark/${name}.svg`),
            light: toIconUri(`${folder}/light/${name}.svg`),
        };
    }
}
exports.IconPathHelper = IconPathHelper;
//# sourceMappingURL=iconHelper.js.map