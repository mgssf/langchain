"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MozillaReadabilityTransformer = void 0;
const readability_1 = require("@mozilla/readability");
const jsdom_1 = require("jsdom");
const document_js_1 = require("../document.cjs");
const document_js_2 = require("../schema/document.cjs");
/**
 * A transformer that uses the Mozilla Readability library to extract the
 * main content from a web page.
 * @example
 * ```typescript
 * const loader = new CheerioWebBaseLoader("https://example.com/article");
 * const docs = await loader.load();
 *
 * const splitter = new RecursiveCharacterTextSplitter({
 *  maxCharacterCount: 5000,
 * });
 * const transformer = new MozillaReadabilityTransformer();
 *
 * // The sequence processes the loaded documents through the splitter and then the transformer.
 * const sequence = splitter.pipe(transformer);
 *
 * // Invoke the sequence to transform the documents into a more readable format.
 * const newDocuments = await sequence.invoke(docs);
 *
 * console.log(newDocuments);
 * ```
 */
class MozillaReadabilityTransformer extends document_js_2.MappingDocumentTransformer {
    static lc_name() {
        return "MozillaReadabilityTransformer";
    }
    constructor(options = {}) {
        super(options);
        Object.defineProperty(this, "options", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: options
        });
    }
    async _transformDocument(document) {
        const doc = new jsdom_1.JSDOM(document.pageContent);
        const readability = new readability_1.Readability(doc.window.document, this.options);
        const result = readability.parse();
        return new document_js_1.Document({
            pageContent: result?.textContent ?? "",
            metadata: {
                ...document.metadata,
            },
        });
    }
}
exports.MozillaReadabilityTransformer = MozillaReadabilityTransformer;
