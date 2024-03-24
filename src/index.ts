import type MarkdownIt from "markdown-it";
import type Renderer from "markdown-it/lib/renderer";
import type StateBlock from "markdown-it/lib/rules_block/state_block";
import type StateInline from "markdown-it/lib/rules_inline/state_inline";
import type Token from "markdown-it/lib/token";


const MARKER_START = 0x7B;
const MARKER_END = 0x7D;

function parseVariableDef(state: StateBlock, startLine: number, _endLine: number, silent: boolean) {
	let start = state.bMarks[startLine] + state.tShift[startLine];
	let max = state.eMarks[startLine];

	// {{> var Test }}
	// ^^^ Require opening markers
	if (state.src.charCodeAt(start) !== MARKER_START) return false;
	if (state.src.charCodeAt(start + 1) !== MARKER_START) return false;
	if (state.src.charCodeAt(start + 2) !== 0x3E/* > */) return false;
	let pos = start + 3;

	// {{> var Test }}
	//    ^ Skip whitespace
	pos = skipWhitespace(state, pos, max);
	if (pos >= max) return false;

	// {{> var Test }}
	//     ^^^ Parse variable name
	let variableStart = pos;
	for (; pos < max; pos++) {
		let code = state.src.charCodeAt(pos);
		if (state.md.utils.isSpace(code)) break;
		if (!isAlphaNumeric(code)) return false; // Invalid variable name
	}
	let variableEnd = pos;
	if (pos >= max || variableStart == variableEnd) return false;

	// {{> var Test }}
	//        ^ Skip whitespace
	pos = skipWhitespace(state, pos, max);
	if (pos >= max) return false;

	// console.log("Variable", state.src.slice(variableStart, variableEnd));

	// {{> var Test }}
	//         ^^^^ Parse variable content
	let contentStart = pos;
	for (; pos < max; pos++) {
		let code = state.src.charCodeAt(pos);
		if (code === MARKER_END && state.src.charCodeAt(pos + 1) === MARKER_END) break;
	}
	let contentEnd = pos;
	if (pos >= max || contentStart == contentEnd) return false;

	let variableContent = state.src.slice(contentStart, contentEnd).trim();
	if (variableContent.length < 1) return false;

	// console.log("Content", state.src.slice(contentStart, contentEnd));

	pos += 2;
	let variableName = state.md.utils.unescapeAll(state.src.slice(variableStart, variableEnd));
	if (state.env.variables && state.env.variables[variableName]) return false; // Variable already defined

	if (!silent) {
		if (!state.env.variables) state.env.variables = {};

		const children: Token[] = [];
		state.md.inline.parse(variableContent, state.md, state.env, children);

		state.env.variables[variableName] = {
			tokens: children,
			refs: false
		};

		let token = new state.Token("variable_definition", "", 0);
		token.block = true;
		token.meta = { name: variableName };
		token.markup = state.md.utils.escapeHtml(state.src.slice(start, pos));
		state.tokens.push(token);
	}

	state.line = startLine + 1;
	return true;
}

function parseVariableRef(state: StateInline, silent: boolean) {
	let start = state.pos;
	let max = state.posMax;

	// {{ var }}
	// ^^ Require opening markers
	if (!state.env.variables) return false;
	if (state.src.charCodeAt(start) !== MARKER_START) return false;
	if (state.src.charCodeAt(start + 1) !== MARKER_START) return false;
	let pos = start + 2;

	// {{ var }}
	//   ^ Skip whitespace
	pos = skipWhitespace(state, pos, max);
	if (pos >= max) return false;

	// {{ var }}
	//    ^^^ Parse variable name
	let variableStart = pos;
	for (; pos < max; pos++) {
		let code = state.src.charCodeAt(pos);
		if (state.md.utils.isSpace(code)) break;
		if (code === MARKER_END && state.src.charCodeAt(pos + 1) === MARKER_END) break;
		if (!isAlphaNumeric(code)) return false; // Invalid variable name
	}
	let variableEnd = pos;
	if (pos >= max || variableStart == variableEnd) return false;

	// {{ var }}
	//       ^ Skip whitespace
	pos = skipWhitespace(state, pos, max);
	if (pos >= max) return false;

	// {{ var }}
	//        ^^ Require closing markers
	if (state.src.charCodeAt(pos) !== MARKER_END) return false;
	if (state.src.charCodeAt(pos + 1) !== MARKER_END) return false;

	let variableName = state.src.slice(variableStart, variableEnd);
	if (!state.env.variables[variableName]) return false;
	state.env.variables[variableName].refs = true;

	if (!silent) {
		let token = state.push("variable", "", 0);
		token.children = state.env.variables[variableName].tokens;
	}

	state.pos = pos + 2;
	return true;
}

function skipWhitespace(state: StateBlock | StateInline, pos: number, max: number) {
	for (; pos < max; pos++) {
		let code = state.src.charCodeAt(pos);
		if (!state.md.utils.isSpace(code)) break;
	}

	return pos;
}

function isAlphaNumeric(charCode: number) {
	return (charCode > 47 && charCode < 58) || // Numeric (0-9)
	       (charCode > 64 && charCode < 91) || // Upper alpha (A-Z)
	       (charCode > 96 && charCode < 123); // Lower alpha (a-z)
}

function renderVariable(tokens: Token[], idx: number, options: any, env: any, self: Renderer) {
	return self.renderInline(tokens[idx].children || [], options, env);
}

function renderVariableDefinition(tokens: Token[], idx: number, _options: any, env: any, _self: Renderer) {
	let token = tokens[idx];
	let variable = env.variables[token.meta.name];

	return variable && variable.refs > 0? token.content: "<p>" + token.markup + "</p>\n";
}


export default function variablePlugin(md: MarkdownIt) {
	md.renderer.rules.variable = renderVariable;
	md.renderer.rules.variable_definition = renderVariableDefinition;
	md.block.ruler.before("reference", "variables_def", parseVariableDef, { alt: ["paragraph", "reference"] });
	md.inline.ruler.after("image", "variables_ref", parseVariableRef);
};