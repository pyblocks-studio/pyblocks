"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Blockly = require("blockly");
require("blockly/blocks");
const python = require("blockly/python");
global.window = global;
global.Blockly = Blockly;
global.python = python;
require("../js/blocks.js");

function workspace() {
    return new Blockly.Workspace();
}
function block(ws, type, fields = {}) {
    const result = ws.newBlock(type);
    for (const [name, value] of Object.entries(fields))
        result.setFieldValue(String(value), name);
    return result;
}
function connect(parent, input, child) {
    parent.getInput(input).connection.connect(child.outputConnection);
}
function expression(ws, result) {
    python.pythonGenerator.init(ws);
    try {
        return python.pythonGenerator.blockToCode(result)[0];
    } finally {
        python.pythonGenerator.nameDB_?.reset();
    }
}

test("arithmetic generation preserves multiplication precedence", () => {
    const ws = workspace();
    const add = block(ws, "py_arithmetic", { OP: "+" });
    const multiply = block(ws, "py_arithmetic", { OP: "*" });
    connect(add, "A", block(ws, "py_number", { NUM: 2 }));
    connect(multiply, "A", block(ws, "py_number", { NUM: 3 }));
    connect(multiply, "B", block(ws, "py_number", { NUM: 4 }));
    connect(add, "B", multiply);
    assert.equal(expression(ws, add), "2 + 3 * 4");
});

test("arithmetic generation adds parentheses when a sum is multiplied", () => {
    const ws = workspace();
    const multiply = block(ws, "py_arithmetic", { OP: "*" });
    const add = block(ws, "py_arithmetic", { OP: "+" });
    connect(add, "A", block(ws, "py_number", { NUM: 2 }));
    connect(add, "B", block(ws, "py_number", { NUM: 3 }));
    connect(multiply, "A", add);
    connect(multiply, "B", block(ws, "py_number", { NUM: 4 }));
    assert.equal(expression(ws, multiply), "(2 + 3) * 4");
});

test("legacy list does not insert None for unused sockets", () => {
    const ws = workspace();
    const list = block(ws, "py_list");
    connect(list, "A", block(ws, "py_number", { NUM: 1 }));
    assert.equal(expression(ws, list), "[1]");
});

test("slice supports omitted start and stop with a step", () => {
    const ws = workspace();
    const slice = block(ws, "py_subscript");
    connect(slice, "VALUE", block(ws, "py_variable"));
    connect(slice, "STEP", block(ws, "py_number", { NUM: 2 }));
    assert.match(expression(ws, slice), /^item\[::2\]$/);
});

test("every custom block generator has deterministic disconnected output", () => {
    const expected = {
        py_when_run: "# When Run Python clicked\n",
        py_print: "print()\n",
        py_input: "input('')",
        py_comment: "# comment\n",
        py_import: "import module\n",
        py_from_import: "from module import name\n",
        py_assign: "item = None\n",
        py_aug_assign: "item += 0\n",
        py_variable: "item",
        py_delete: "del item\n",
        py_if: "if False:\n  pass\n",
        py_if_else: "if False:\n  pass\nelse:\n  pass\n",
        py_compare: "None == None",
        py_compare_chain: "None < None < None",
        py_boolean_op: "False and False",
        py_not: "not False",
        py_boolean: "True",
        py_none: "None",
        py_ternary: "None if False else None",
        py_for_range: "for i in range(0, 10, 1):\n  pass\n",
        py_for_each: "for item in []:\n  pass\n",
        py_range: "range(10)",
        py_while: "while False:\n  pass\n",
        py_break: "break\n",
        py_continue: "continue\n",
        py_number: "0",
        py_arithmetic: "0 + 0",
        py_builtin_math: "abs(0)",
        py_round: "round(0)",
        py_minmax: "min([])",
        py_math_function: "math.sqrt(0)",
        py_random_int: "random.randint(1, 10)",
        py_random_choice: "random.choice([])",
        py_string: '"text"',
        py_fstring: 'f"value = {variable}"',
        py_string_concat: "'' + ''",
        py_len: "len('')",
        py_string_method: "''.upper()",
        py_replace: "''.replace('', '')",
        py_subscript: "''[::]",
        py_list: "[]",
        py_list_get: "[][0]",
        py_list_set: "items[0] = None\n",
        py_list_append: "items.append(None)\n",
        py_list_remove: "items.remove(None)\n",
        py_list_method: "items.sort()\n",
        py_list_copy: "items.copy()",
        py_in: "None in []",
        py_function_hat: "def function_name(parameter):\n  pass\n",
        py_return: "return None\n",
        py_function_call: "function_name()",
        py_function_call_statement: "function_name()\n",
        py_keyword_arg: "name=None",
        py_library_call: "module.function()",
        py_library_call_statement: "module.function()\n",
        py_raw_code: "",
    };
    const actual = {};
    for (const type of Object.keys(expected)) {
        const ws = workspace();
        const candidate = block(ws, type);
        python.pythonGenerator.init(ws);
        try {
            const generated = python.pythonGenerator.blockToCode(candidate);
            actual[type] = Array.isArray(generated) ? generated[0] : generated;
        } finally {
            python.pythonGenerator.nameDB_?.reset();
        }
    }
    assert.deepEqual(actual, expected);
});

test("structured function parameters are sanitized and deduplicated", () => {
    const ws = workspace();
    const definition = block(ws, "py_function_hat");
    definition.parameterNames_ = ["class", "value", "value"];
    definition.updateFunctionShape_();
    definition.setFieldValue("123 bad-name", "NAME");
    python.pythonGenerator.init(ws);
    try {
        assert.equal(
            python.pythonGenerator.blockToCode(definition),
            "def _123_bad_name(class_, value):\n  pass\n",
        );
    } finally {
        python.pythonGenerator.nameDB_?.reset();
    }
});

test("Blockly variable model keeps one identifier across reads and writes", () => {
    const ws = workspace();
    const model = ws.getVariableMap().createVariable("class");
    const assignment = block(ws, "py_assign");
    assignment.setFieldValue(model.getId(), "VAR");
    const read = block(ws, "py_variable");
    read.setFieldValue(model.getId(), "VAR");
    python.pythonGenerator.init(ws);
    try {
        assert.equal(
            python.pythonGenerator.blockToCode(assignment),
            "class_ = None\n",
        );
        assert.equal(python.pythonGenerator.blockToCode(read)[0], "class_");
    } finally {
        python.pythonGenerator.nameDB_?.reset();
    }
});

test("dynamic print supports multiple values, sep, and end", () => {
    const ws = workspace();
    const print = block(ws, "py_print");
    print.argumentCount_ = 2;
    print.updateArgumentShape_();
    connect(print, "ARG0", block(ws, "py_string", { TEXT: "a" }));
    connect(print, "ARG1", block(ws, "py_string", { TEXT: "b" }));
    connect(print, "SEP", block(ws, "py_string", { TEXT: "-" }));
    connect(print, "END", block(ws, "py_string", { TEXT: "!" }));
    python.pythonGenerator.init(ws);
    try {
        assert.equal(
            python.pythonGenerator.blockToCode(print),
            'print("a", "b", sep="-", end="!")\n',
        );
    } finally {
        python.pythonGenerator.nameDB_?.reset();
    }
});

test("range supports one, two, and three argument forms", () => {
    const ws = workspace();
    const range = block(ws, "py_range", { FORM: 3 });
    connect(range, "A", block(ws, "py_number", { NUM: 1 }));
    connect(range, "B", block(ws, "py_number", { NUM: 9 }));
    connect(range, "C", block(ws, "py_number", { NUM: 2 }));
    assert.equal(expression(ws, range), "range(1, 9, 2)");
    range.setFieldValue("2", "FORM");
    assert.equal(expression(ws, range), "range(1, 9)");
    range.setFieldValue("1", "FORM");
    assert.equal(expression(ws, range), "range(1)");
});
