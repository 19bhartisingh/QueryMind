"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSDKStyleProjectInfo = getSDKStyleProjectInfo;
const constants = require("../common/constants");
const vscode = require("vscode");
/**
 * Function created out of createProjectFromDatabaseQuickpick for testing purposes
 * @returns true for sdk style project
 * 			false for legacy style project
 * 			undefined for exiting quickpick
 */
async function getSDKStyleProjectInfo() {
    let sdkStyle;
    const sdkLearnMoreButton = {
        iconPath: new vscode.ThemeIcon("link-external"),
        tooltip: constants.learnMore,
    };
    const quickPick = vscode.window.createQuickPick();
    quickPick.items = [{ label: constants.YesRecommended }, { label: constants.noString }];
    quickPick.title = constants.sdkStyleProject;
    quickPick.ignoreFocusOut = true;
    const disposables = [];
    try {
        quickPick.buttons = [sdkLearnMoreButton];
        quickPick.placeholder = constants.SdkLearnMorePlaceholder;
        const sdkStylePromise = new Promise((resolve) => {
            disposables.push(quickPick.onDidHide(() => {
                resolve(undefined);
            }), quickPick.onDidChangeSelection((item) => {
                resolve(item[0].label === constants.YesRecommended);
            }));
            disposables.push(quickPick.onDidTriggerButton(async () => {
                await vscode.env.openExternal(vscode.Uri.parse(constants.sdkLearnMoreUrl));
            }));
        });
        quickPick.show();
        sdkStyle = await sdkStylePromise;
        quickPick.hide();
    }
    finally {
        disposables.forEach((d) => d.dispose());
    }
    return sdkStyle;
}
//# sourceMappingURL=quickpickHelper.js.map