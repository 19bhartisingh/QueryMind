"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskExecutionMode = void 0;
/**
 * Specifies the mode in which a task should be executed.
 */
var TaskExecutionMode;
(function (TaskExecutionMode) {
    TaskExecutionMode[TaskExecutionMode["execute"] = 0] = "execute";
    TaskExecutionMode[TaskExecutionMode["script"] = 1] = "script";
    TaskExecutionMode[TaskExecutionMode["executeAndScript"] = 2] = "executeAndScript";
})(TaskExecutionMode || (exports.TaskExecutionMode = TaskExecutionMode = {}));
//# sourceMappingURL=enums.js.map