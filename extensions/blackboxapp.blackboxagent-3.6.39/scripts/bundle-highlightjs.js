const fs = require("fs")
const path = require("path")
const esbuild = require("esbuild")

/**
 * Bundle highlight.js for the webview.
 * Falls back to a no-op stub when highlight.js is missing.
 */

const OUTPUT_PATH = path.join(__dirname, "..", "assets", "webview", "highlight.min.js")

const languages = [
	"javascript",
	"typescript",
	"python",
	"java",
	"cpp",
	"c",
	"csharp",
	"go",
	"rust",
	"php",
	"ruby",
	"swift",
	"css",
	"json",
	"yaml",
	"sql",
	"bash",
	"powershell",
	"dockerfile",
	"markdown",
	"xml",
	"diff",
	"plaintext",
]

const toIdentifier = (language) => language.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())

const buildEntryFile = () => {
	const importStatements = languages
		.map((language) => `import ${toIdentifier(language)} from 'highlight.js/lib/languages/${language}';`)
		.join("\n")

	const registerStatements = languages
		.map((language) => `core.registerLanguage('${language}', ${toIdentifier(language)});`)
		.join("\n")

	return [
		"import core from 'highlight.js/lib/core';",
		importStatements,
		"",
		registerStatements,
		"",
		"const api = core?.default ?? core;",
		"",
		"if (typeof globalThis !== 'undefined') {",
		"	globalThis.hljs = api;",
		"}",
		"if (typeof window !== 'undefined') {",
		"	window.hljs = api;",
		"}",
		"if (typeof self !== 'undefined') {",
		"	self.hljs = api;",
		"}",
		"",
		"export default api;",
	].join("\n")
}

const createBundle = () => {
	try {
		const entryContents = buildEntryFile()

		fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })

		esbuild.buildSync({
			stdin: {
				contents: entryContents,
				resolveDir: process.cwd(),
				sourcefile: "highlight-bundle-entry.js",
			},
			bundle: true,
			minify: true,
			format: "iife",
			platform: "browser",
			target: ["es2018"],
			outfile: OUTPUT_PATH,
			legalComments: "none",
		})

	} catch (error) {
		console.warn(
			"Failed to create highlight.js bundle. Falling back to stub implementation. Run `npm install` to restore full highlighting.",
			error
		)

		try {
			const fallbackContent = [
				"// Fallback highlight.js stub",
				"(function() {",
				"	if (typeof window !== 'undefined') {",
				"		window.hljs = {",
				"			highlightElement(element) {",
				"				return element;",
				"			},",
				"			highlight(code) {",
				"				return { value: code };",
				"			},",
				"			versionString: 'fallback',",
				"		};",
				"	}",
				"})();",
			].join("\n")
			fs.writeFileSync(OUTPUT_PATH, `${fallbackContent}\n`)
		} catch (fallbackError) {
			console.error("Failed to create fallback highlight.js file:", fallbackError.message)
		}
	}
}

createBundle()
