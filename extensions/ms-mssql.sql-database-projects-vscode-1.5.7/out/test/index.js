"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
require("./stubs/moduleShims");
const path = require("path");
const glob = require("fast-glob");
const Mocha = require("mocha");
let NYC;
try {
    NYC = require("nyc");
}
catch {
    // NYC is optional for local runs; coverage will be skipped if unavailable
}
const testsRoot = path.resolve(__dirname);
const repoRoot = path.resolve(__dirname, "..", "..");
function parsePattern() {
    const envPattern = process.env.TEST_PATTERN || process.env.MOCHA_GREP;
    const invert = /^true$/i.test(process.env.TEST_INVERT || process.env.MOCHA_INVERT || "");
    return { pattern: envPattern, invert };
}
async function run() {
    const baseConfig = {
        all: false,
        checkCoverage: false,
        extension: [".js"],
    };
    const nyc = NYC
        ? new NYC({
            ...baseConfig,
            cwd: repoRoot,
            reporter: ["text-summary", "lcov", "cobertura"],
            all: true,
            silent: true,
            instrument: true,
            hookRequire: true,
            hookRunInContext: true,
            hookRunInThisContext: true,
            include: ["out/src/**/*.js"],
            exclude: ["out/test/**", "**/node_modules/**"],
            tempDir: path.join(repoRoot, "coverage", ".nyc_output"),
        })
        : undefined;
    if (nyc) {
        await nyc.reset();
        await nyc.wrap();
    }
    const mocha = new Mocha({
        ui: "tdd",
        timeout: 30 * 1000,
        color: true,
        reporter: "spec",
    });
    const { pattern, invert } = parsePattern();
    if (pattern) {
        const expression = new RegExp(pattern);
        mocha.grep(expression);
        if (invert) {
            mocha.invert();
        }
    }
    const testFiles = glob.sync("**/*.test.js", { cwd: testsRoot, absolute: true });
    testFiles.forEach((file) => mocha.addFile(file));
    await new Promise((resolve, reject) => {
        mocha.run(async (failures) => {
            if (nyc) {
                try {
                    await nyc.writeCoverageFile();
                    await nyc.report();
                }
                catch (error) {
                    return reject(error instanceof Error ? error : new Error(String(error)));
                }
            }
            if (failures > 0) {
                reject(new Error(`${failures} tests failed.`));
            }
            else {
                resolve();
            }
        });
    });
}
//# sourceMappingURL=index.js.map