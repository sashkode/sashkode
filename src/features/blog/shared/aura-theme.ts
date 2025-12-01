import type { ThemeRegistration } from "shiki";

/**
 * Aura Dark theme for Shiki syntax highlighting
 * Based on https://github.com/daltonmenezes/aura-theme
 *
 * Color palette:
 * - Background: #15141b
 * - Foreground: #edecee
 * - Purple (primary): #a277ff - keywords, constants, operators
 * - Green (secondary): #61ffca - strings, numbers, booleans
 * - Orange (tertiary): #ffca85 - functions, methods
 * - Pink (quaternary): #f694ff - JSX attributes, properties
 * - Blue (quinary): #82e2ff - types, classes
 * - Red (senary): #ff6767 - errors, deletions
 * - Gray (comments): #6d6d6d
 */
export const auraTheme: ThemeRegistration = {
  name: "aura-dark",
  type: "dark",
  colors: {
    // Editor colors
    "editor.background": "#15141b",
    "editor.foreground": "#edecee",
    "editor.selectionBackground": "#3d375e7f",
    "editor.lineHighlightBackground": "#1c1b22",
    "editorCursor.foreground": "#a277ff",
    "editorWhitespace.foreground": "#4d4d4d",

    // UI colors
    "activityBar.background": "#15141b",
    "sideBar.background": "#15141b",
    "statusBar.background": "#15141b",
  },
  tokenColors: [
    // Comments
    {
      scope: ["comment", "punctuation.definition.comment"],
      settings: {
        foreground: "#6d6d6d",
        fontStyle: "italic",
      },
    },

    // Strings
    {
      scope: ["string", "string.quoted", "string.template", "punctuation.definition.string"],
      settings: {
        foreground: "#61ffca",
      },
    },

    // Numbers, booleans, null
    {
      scope: ["constant.numeric", "constant.language.boolean", "constant.language.null", "constant.language.undefined"],
      settings: {
        foreground: "#61ffca",
      },
    },

    // Keywords
    {
      scope: ["keyword", "keyword.control", "keyword.operator.new", "keyword.operator.expression", "keyword.operator.logical", "keyword.operator.delete", "keyword.operator.typeof", "keyword.operator.instanceof", "storage.type", "storage.modifier"],
      settings: {
        foreground: "#a277ff",
      },
    },

    // Operators
    {
      scope: ["keyword.operator", "keyword.operator.assignment", "keyword.operator.arithmetic", "keyword.operator.comparison", "punctuation.separator"],
      settings: {
        foreground: "#a277ff",
      },
    },

    // Functions
    {
      scope: ["entity.name.function", "meta.function-call", "support.function", "meta.method-call"],
      settings: {
        foreground: "#ffca85",
      },
    },

    // Variables and parameters
    {
      scope: ["variable", "variable.other", "variable.parameter", "meta.definition.variable"],
      settings: {
        foreground: "#edecee",
      },
    },

    // Constants and enums
    {
      scope: ["variable.other.constant", "variable.other.enummember", "constant.other"],
      settings: {
        foreground: "#a277ff",
      },
    },

    // Types and classes
    {
      scope: ["entity.name.type", "entity.name.class", "support.type", "support.class", "entity.other.inherited-class", "meta.type.annotation"],
      settings: {
        foreground: "#82e2ff",
      },
    },

    // Interfaces
    {
      scope: ["entity.name.type.interface", "entity.name.type.alias"],
      settings: {
        foreground: "#82e2ff",
      },
    },

    // Properties and object keys
    {
      scope: ["variable.other.property", "meta.object-literal.key", "support.type.property-name", "entity.name.tag.css"],
      settings: {
        foreground: "#f694ff",
      },
    },

    // JSX/HTML tags
    {
      scope: ["entity.name.tag", "punctuation.definition.tag", "support.class.component"],
      settings: {
        foreground: "#a277ff",
      },
    },

    // JSX/HTML attributes
    {
      scope: ["entity.other.attribute-name"],
      settings: {
        foreground: "#f694ff",
      },
    },

    // JSX component tags
    {
      scope: ["support.class.component.jsx", "support.class.component.tsx"],
      settings: {
        foreground: "#ffca85",
      },
    },

    // Punctuation
    {
      scope: ["punctuation.bracket", "punctuation.definition.block", "punctuation.definition.parameters", "meta.brace"],
      settings: {
        foreground: "#edecee",
      },
    },

    // Import/export
    {
      scope: ["keyword.control.import", "keyword.control.export", "keyword.control.from", "keyword.control.as"],
      settings: {
        foreground: "#a277ff",
      },
    },

    // Regex
    {
      scope: ["string.regexp"],
      settings: {
        foreground: "#61ffca",
      },
    },

    // Markdown
    {
      scope: ["markup.heading", "entity.name.section"],
      settings: {
        foreground: "#ffca85",
        fontStyle: "bold",
      },
    },
    {
      scope: ["markup.bold"],
      settings: {
        foreground: "#edecee",
        fontStyle: "bold",
      },
    },
    {
      scope: ["markup.italic"],
      settings: {
        foreground: "#edecee",
        fontStyle: "italic",
      },
    },
    {
      scope: ["markup.inline.raw", "markup.fenced_code.block"],
      settings: {
        foreground: "#61ffca",
      },
    },
    {
      scope: ["markup.underline.link"],
      settings: {
        foreground: "#82e2ff",
      },
    },

    // JSON
    {
      scope: ["support.type.property-name.json"],
      settings: {
        foreground: "#f694ff",
      },
    },
    {
      scope: ["string.quoted.double.json"],
      settings: {
        foreground: "#61ffca",
      },
    },

    // YAML
    {
      scope: ["entity.name.tag.yaml"],
      settings: {
        foreground: "#f694ff",
      },
    },

    // CSS
    {
      scope: ["support.type.property-name.css"],
      settings: {
        foreground: "#f694ff",
      },
    },
    {
      scope: ["support.constant.property-value.css", "support.constant.color"],
      settings: {
        foreground: "#61ffca",
      },
    },
    {
      scope: ["entity.other.attribute-name.class.css"],
      settings: {
        foreground: "#82e2ff",
      },
    },
    {
      scope: ["entity.other.attribute-name.id.css"],
      settings: {
        foreground: "#ffca85",
      },
    },

    // Shell
    {
      scope: ["variable.other.normal.shell", "variable.other.special.shell"],
      settings: {
        foreground: "#edecee",
      },
    },

    // Diff
    {
      scope: ["markup.inserted", "meta.diff.header.to-file"],
      settings: {
        foreground: "#61ffca",
      },
    },
    {
      scope: ["markup.deleted", "meta.diff.header.from-file"],
      settings: {
        foreground: "#ff6767",
      },
    },
    {
      scope: ["markup.changed"],
      settings: {
        foreground: "#ffca85",
      },
    },

    // Error
    {
      scope: ["invalid", "invalid.illegal"],
      settings: {
        foreground: "#ff6767",
      },
    },
  ],
};
