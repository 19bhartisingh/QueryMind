"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const should = require("should/as-function");
const sinon = require("sinon");
const baselines = require("./baselines/baselines");
const templates = require("../src/templates/templates");
const testContext_1 = require("./testContext");
const mainController_1 = require("../src/controllers/mainController");
const testUtils_1 = require("./testUtils");
let testContext;
const templatesPath = (0, testUtils_1.getTemplatesRootPath)();
suite("MainController: main controller operations", function () {
    suiteSetup(async function () {
        testContext = (0, testContext_1.createContext)();
        await templates.loadTemplates(templatesPath);
        await baselines.loadBaselines();
    });
    teardown(function () {
        sinon.restore();
    });
    test("Should create new instance without error", async function () {
        should.doesNotThrow(() => new mainController_1.default(testContext.context), "Creating controller should not throw an error");
    });
    test("Should activate and deactivate without error", async function () {
        let controller = new mainController_1.default(testContext.context);
        should.notEqual(controller.extensionContext, undefined);
        should.doesNotThrow(() => controller.activate(), "activate() should not throw an error");
        should.doesNotThrow(() => controller.dispose(), "dispose() should not throw an error");
    });
});
//# sourceMappingURL=mainController.test.js.map