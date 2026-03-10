"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const should = require("should/as-function");
const path = require("path");
const os = require("os");
const constants = require("../src/common/constants");
const utils = require("../src/common/utils");
const testUtils_1 = require("./testUtils");
const vscode_1 = require("vscode");
suite("Tests to verify utils functions", function () {
    test("Should determine existence of files/folders", async () => {
        let testFolderPath = await (0, testUtils_1.createDummyFileStructure)(undefined);
        should(await utils.exists(testFolderPath)).equal(true);
        should(await utils.exists(path.join(testFolderPath, "file1.sql"))).equal(true);
        should(await utils.exists(path.join(testFolderPath, "folder2"))).equal(true);
        should(await utils.exists(path.join(testFolderPath, "folder4"))).equal(false);
        should(await utils.exists(path.join(testFolderPath, "folder2", "file4.sql"))).equal(true);
        should(await utils.exists(path.join(testFolderPath, "folder4", "file2.sql"))).equal(false);
        await (0, testUtils_1.deleteGeneratedTestFolder)();
    });
    test("Should get correct relative paths of files/folders", async () => {
        const root = os.platform() === "win32" ? "Z:\\" : "/";
        let projectUri = vscode_1.Uri.file(path.join(root, "project", "folder", "project.sqlproj"));
        let fileUri = vscode_1.Uri.file(path.join(root, "project", "folder", "file.sql"));
        should(utils.trimUri(projectUri, fileUri)).equal("file.sql");
        fileUri = vscode_1.Uri.file(path.join(root, "project", "file.sql"));
        let urifile = utils.trimUri(projectUri, fileUri);
        should(urifile).equal("../file.sql");
        fileUri = vscode_1.Uri.file(path.join(root, "project", "forked", "file.sql"));
        should(utils.trimUri(projectUri, fileUri)).equal("../forked/file.sql");
        fileUri = vscode_1.Uri.file(path.join(root, "forked", "from", "top", "file.sql"));
        should(utils.trimUri(projectUri, fileUri)).equal("../../forked/from/top/file.sql");
    });
    test("Should remove $() from sqlcmd variables", () => {
        should(utils.removeSqlCmdVariableFormatting("$(test)")).equal("test", "$() surrounding the variable should have been removed");
        should(utils.removeSqlCmdVariableFormatting("$(test")).equal("test", "$( at the beginning of the variable should have been removed");
        should(utils.removeSqlCmdVariableFormatting("test")).equal("test", "string should not have been changed because it is not in sqlcmd variable format");
    });
    test("Should make variable be in sqlcmd variable format with $()", () => {
        should(utils.formatSqlCmdVariable("$(test)")).equal("$(test)", "string should not have been changed because it was already in the correct format");
        should(utils.formatSqlCmdVariable("test")).equal("$(test)", "string should have been changed to be in sqlcmd variable format");
        should(utils.formatSqlCmdVariable("$(test")).equal("$(test)", "string should have been changed to be in sqlcmd variable format");
        should(utils.formatSqlCmdVariable("")).equal("", "should not do anything to an empty string");
    });
    test("Should determine invalid sqlcmd variable names", () => {
        // valid names
        should(utils.validateSqlCmdVariableName("$(test)")).equal(null);
        should(utils.validateSqlCmdVariableName("$(test    )")).equal(null, "trailing spaces should be valid because they will be trimmed");
        should(utils.validateSqlCmdVariableName("test")).equal(null);
        should(utils.validateSqlCmdVariableName("test  ")).equal(null, "trailing spaces should be valid because they will be trimmed");
        should(utils.validateSqlCmdVariableName("$(test")).equal(null);
        should(utils.validateSqlCmdVariableName("$(test    ")).equal(null, "trailing spaces should be valid because they will be trimmed");
        // whitespace
        should(utils.validateSqlCmdVariableName("")).equal(constants.sqlcmdVariableNameCannotContainWhitespace(""));
        should(utils.validateSqlCmdVariableName(" ")).equal(constants.sqlcmdVariableNameCannotContainWhitespace(" "));
        should(utils.validateSqlCmdVariableName("     ")).equal(constants.sqlcmdVariableNameCannotContainWhitespace("     "));
        should(utils.validateSqlCmdVariableName("test abc")).equal(constants.sqlcmdVariableNameCannotContainWhitespace("test abc"));
        should(utils.validateSqlCmdVariableName("	")).equal(constants.sqlcmdVariableNameCannotContainWhitespace("	"));
        // invalid characters
        should(utils.validateSqlCmdVariableName("$($test")).equal(constants.sqlcmdVariableNameCannotContainIllegalChars("$($test"));
        should(utils.validateSqlCmdVariableName("$test")).equal(constants.sqlcmdVariableNameCannotContainIllegalChars("$test"));
        should(utils.validateSqlCmdVariableName("test@")).equal(constants.sqlcmdVariableNameCannotContainIllegalChars("test@"));
        should(utils.validateSqlCmdVariableName("test#")).equal(constants.sqlcmdVariableNameCannotContainIllegalChars("test#"));
        should(utils.validateSqlCmdVariableName('test"')).equal(constants.sqlcmdVariableNameCannotContainIllegalChars('test"'));
        should(utils.validateSqlCmdVariableName("test'")).equal(constants.sqlcmdVariableNameCannotContainIllegalChars("test'"));
        should(utils.validateSqlCmdVariableName("test-1")).equal(constants.sqlcmdVariableNameCannotContainIllegalChars("test-1"));
    });
    test("Should convert from milliseconds to hr min sec correctly", () => {
        should(utils.timeConversion(60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000)).equal("1 hr, 59 min, 59 sec");
        should(utils.timeConversion(60 * 60 * 1000 + 59 * 60 * 1000)).equal("1 hr, 59 min");
        should(utils.timeConversion(60 * 60 * 1000)).equal("1 hr");
        should(utils.timeConversion(60 * 60 * 1000 + 59 * 1000)).equal("1 hr, 59 sec");
        should(utils.timeConversion(59 * 60 * 1000 + 59 * 1000)).equal("59 min, 59 sec");
        should(utils.timeConversion(59 * 1000)).equal("59 sec");
        should(utils.timeConversion(59)).equal("59 msec");
    });
    test("Should correctly detect present commands", async () => {
        should(await utils.detectCommandInstallation("node")).equal(true, '"node" should have been detected.');
        should(await utils.detectCommandInstallation("bogusFakeCommand")).equal(false, '"bogusFakeCommand" should have been detected.');
    });
});
//# sourceMappingURL=utils.test.js.map