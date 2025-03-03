import { StringOrRegExp } from '@cucumber/cucumber-expressions'

import { Language, TreeSitterSyntaxNode } from './types.js'

export const pythonLanguage: Language = {
  toParameterTypeName(node: TreeSitterSyntaxNode) {
    switch (node.type) {
      case 'string': {
        return stringLiteral(node)
      }
      case 'concatednated_string': {
        return stringLiteral(node)
      }
      case 'identifier': {
        return node.text
      }
      default: {
        throw new Error(`Unsupported node type ${node.type}`)
      }
    }
  },
  toParameterTypeRegExps(node: TreeSitterSyntaxNode) {
    return RegExp(cleanRegex(stringLiteral(node)))
  },
  toStepDefinitionExpression(node: TreeSitterSyntaxNode): StringOrRegExp {
    // this removes the head and tail apostrophes
    // remove python named capture groups.
    // TODO: This should be temporary. Python supports
    // a wider array of regex features than javascript
    // a singular way of communicating regex consistent
    // across languages is necessary
    return isRegex(node.text.slice(1, -1))
      ? RegExp(cleanRegex(node.text.slice(1, -1).split('?P').join('')))
      : node.text.slice(1, -1)
  },
  defineParameterTypeQueries: [
    `(call
      arguments: (argument_list
        (keyword_argument
          name: (identifier) @name-key
          value: (string) @name
          (#eq? @name-key "name")
        )?
        (keyword_argument
          name: (identifier) @regexp-key
          value: (string) @expression
          (#eq? @regexp-key "regexp")
        )?
        (keyword_argument
          name: (identifier) @regexp-key
          value: (concatenated_string) @expression
          (#eq? @regexp-key "regexp")
        )?
     ))@root`,
  ],
  defineStepDefinitionQueries: [
    `
    (decorated_definition
        (decorator
            (call
                function: (identifier) @method
                arguments: (argument_list (string) @expression)
            )
        )
        (#match? @method "(given|when|then)")
    ) @root
`,
  ],
  snippetParameters: {
    int: { type: 'int' },
    float: { type: 'float' },
    word: { type: 'str' },
    string: { type: 'str' },
    double: { type: 'double' },
    bigdecimal: { type: 'decimal' },
    byte: { type: 'byte' },
    short: { type: 'short' },
    long: { type: 'long' },
    biginteger: { type: 'int' },
    '': { type: 'Object', name: 'arg' },
  },
  defaultSnippetTemplate: `
  @{{ #lowercase }}{{ keyword }}{{ /lowercase }}('{{ expression }}')
  def step_{{ #lowercase }}{{ keyword }}{{ /lowercase }}(context, {{ #parameters }}{{ #seenParameter }}, {{ /seenParameter }}{{ name }}{{ /parameters }}) :
      # This was autogenerated using cucumber syntax.
      # Please convert to use regular expressions, as Behave does not currently support Cucumber Expressions`,
}

function cleanRegex(regexString: string) {
  const startsWith = regexString[0]
  switch (startsWith) {
    case '/':
      return regexString.slice(1, -1)
    default:
      return regexString
  }
}

function stringLiteral(node: TreeSitterSyntaxNode) {
  const isFString = node.text.startsWith('f')
  const cleanWord = isFString ? node.text.slice(1).slice(1, -1) : node.text.slice(1, -1)
  return cleanWord
}

function isRegex(cleanWord: string) {
  const startsWithSlash = cleanWord.startsWith('/')
  const namedGroupMatch = /\?P/
  const containsNamedGroups = namedGroupMatch.test(cleanWord)
  return startsWithSlash || containsNamedGroups
}
