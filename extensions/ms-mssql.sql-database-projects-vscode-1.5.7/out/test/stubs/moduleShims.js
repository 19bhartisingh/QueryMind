"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.installModuleShims = installModuleShims;
const globalShimFlag = "__sqlprojModuleShimsInstalled";
function createEnumProxy() {
    return new Proxy({}, {
        get: (_target, prop) => prop.toString(),
        set: () => true,
    });
}
function createProxyModule(name) {
    const cache = {};
    const proxy = new Proxy(function () {
        return undefined;
    }, {
        get: (_target, prop) => {
            if (!(prop in cache)) {
                cache[prop] = createProxyModule(`${name}.${String(prop)}`);
            }
            return cache[prop];
        },
        set: (_target, prop, value) => {
            cache[prop] = value;
            return true;
        },
        apply: () => undefined,
        construct: () => ({}),
    });
    return proxy;
}
function createDataWorkspaceShim() {
    const shim = createProxyModule("dataworkspace");
    shim.WorkspaceTreeItem = class WorkspaceTreeItem {
        element;
        constructor(element) {
            this.element = element;
        }
    };
    shim.TreeItemType = createEnumProxy();
    shim.IconPath = class IconPath {
        light;
        dark;
        constructor(light, dark) {
            this.light = light;
            this.dark = dark;
        }
    };
    shim.IconCellValue = class IconCellValue {
        icon;
        text;
        constructor(icon, text) {
            this.icon = icon;
            this.text = text;
        }
    };
    shim.getDataWorkspaceExtensionApi = async () => ({
        get projects() {
            return [];
        },
        treeDataProvider: {
            refresh: () => undefined,
        },
    });
    return shim;
}
function createSqlToolsShim(name) {
    const shim = createProxyModule(name);
    shim.SchemaCompareEndpointType = createEnumProxy();
    shim.ProjectType = createEnumProxy();
    shim.ExtractTarget = createEnumProxy();
    shim.TaskExecutionMode = { execute: "execute", script: "script" };
    shim.ExtractTarget = createEnumProxy();
    shim.DacFxService = class {
    };
    return shim;
}
function createAzdataShim() {
    const azdata = require("@microsoft/azdata-test/out/stubs/azdata");
    azdata.TaskExecutionMode = azdata.TaskExecutionMode ?? { execute: "execute", script: "script" };
    azdata.TaskStatus = azdata.TaskStatus ?? createEnumProxy();
    azdata.connection = azdata.connection ?? {};
    azdata.connection.AuthenticationType =
        azdata.connection.AuthenticationType ?? createEnumProxy();
    azdata.connection.ConnectionOptionSpecialType =
        azdata.connection.ConnectionOptionSpecialType ?? createEnumProxy();
    azdata.connection.getConnections = azdata.connection.getConnections ?? (async () => []);
    azdata.connection.connect =
        azdata.connection.connect ??
            (async () => ({ connected: true, connectionId: "mock-connection" }));
    azdata.connection.getUriForConnection =
        azdata.connection.getUriForConnection ?? (async () => "mock-uri");
    azdata.connection.listDatabases = azdata.connection.listDatabases ?? (async () => []);
    return azdata;
}
function createModuleOverrides() {
    return {
        azdata: createAzdataShim(),
        dataworkspace: createDataWorkspaceShim(),
        mssql: createSqlToolsShim("mssql"),
        "vscode-mssql": createSqlToolsShim("vscode-mssql"),
    };
}
function installModuleShims() {
    const mod = require("module");
    if (globalThis[globalShimFlag]) {
        return;
    }
    const overrides = createModuleOverrides();
    const originalLoad = mod._load;
    mod._load = function patchedLoad(request, parent, isMain) {
        if (request in overrides) {
            return overrides[request];
        }
        return originalLoad.call(this, request, parent, isMain);
    };
    globalThis[globalShimFlag] = true;
}
installModuleShims();
//# sourceMappingURL=moduleShims.js.map