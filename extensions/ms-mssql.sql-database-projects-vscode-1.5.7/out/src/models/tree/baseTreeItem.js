"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseProjectTreeItem = void 0;
const path = require("path");
/**
 * Base class for an item that appears in the ADS project tree
 */
class BaseProjectTreeItem {
    relativeProjectUri;
    projectFileUri;
    /**
     * Constructor
     * @param relativeProjectUri Project-relative URI that's compatible with the project tree
     * @param projectFileUri Full URI to the .sqlproj of this project
     */
    constructor(relativeProjectUri, projectFileUri) {
        this.relativeProjectUri = relativeProjectUri;
        this.projectFileUri = projectFileUri;
    }
    entryKey;
    get friendlyName() {
        return path.parse(this.relativeProjectUri.path).base;
    }
}
exports.BaseProjectTreeItem = BaseProjectTreeItem;
//# sourceMappingURL=baseTreeItem.js.map