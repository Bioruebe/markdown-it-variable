# markdown-it-variable

[![npm](https://img.shields.io/npm/v/markdown-it-variable)](https://www.npmjs.com/package/markdown-it-variable) ![Tests](https://github.com/Bioruebe/markdown-it-variable/actions/workflows/node.js.yml/badge.svg) ![markdown-it](https://img.shields.io/npm/dependency-version/markdown-it-variable/peer/markdown-it)

> A markdown-it plugin, which allows defining variables, which can then be referenced in the document and are auto-replaced with the specified content

## Usage

### Install

```bash
npm install markdown-it-variable
```

### Enable

```js
// ESM
import MarkdownIt from "markdown-it";
import MarkdownItVariable from "markdown-it-variable";
const md = new MarkdownIt().use(MarkdownItVariable, options);

// CommonJS
const markdownIt = require("markdown-it");
const markdownItVariable = require("markdown-it-variable");
const md = markdownIt().use(markdownItVariable);
```

### Syntax

You can define variables at any position of the document:

```md
{{> variableName variableContent }}
{{> anotherVariable moreContent }}
```

Then, reference it anywhere:

```md
This will be replaced: {{ variableName }}
```

will be rendered as

```html
This will be replaced: variableContent
```

#### Variable definition

- Each variable must be on its **own line**.

- The variable name must not contain any spaces or special characters, **only alphanumeric characters** are allowed.

- The **definitions will not be rendered** to keep your document clean. However, if a variable is not referenced, the definition will be visible to make you aware of this fact.

- Definitions can be **placed anywhere** in the document.

#### Variable content

- Formatting via Markdown is possible:
  
  ```md
  {{> title *Markdown-it* **Variables** plugin }}
  ```

- Variables can only span **a single line**, you cannot reference whole paragraphes or complex markup such as lists.

- Variable content can contain markup handled by other plugins.

- Spaces around the brackets are optional:
  
  ```md
  This is the {{title}}
  ```
