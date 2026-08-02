const PY_BLOCKS = [
    {
        type: "py_when_run",
        message0: "when Run Python clicked",
        nextStatement: null,
        style: "event_blocks",
        tooltip: "Python starts here.",
    },
    {
        type: "py_input",
        message0: "input ( %1 )",
        args0: [{ type: "input_value", name: "PROMPT" }],
        output: null,
        style: "input_blocks",
    },
    {
        type: "py_comment",
        message0: "# %1",
        args0: [{ type: "field_input", name: "COMMENT", text: "comment" }],
        previousStatement: null,
        nextStatement: null,
        style: "misc_blocks",
    },
    {
        type: "py_import",
        message0: "import %1 as %2",
        args0: [
            { type: "field_input", name: "MODULE", text: "module" },
            { type: "field_input", name: "ALIAS", text: "" },
        ],
        previousStatement: null,
        nextStatement: null,
        style: "misc_blocks",
    },
    {
        type: "py_from_import",
        message0: "from %1 import %2 as %3",
        args0: [
            { type: "field_input", name: "MODULE", text: "module" },
            { type: "field_input", name: "MEMBER", text: "name" },
            { type: "field_input", name: "ALIAS", text: "" },
        ],
        previousStatement: null,
        nextStatement: null,
        style: "misc_blocks",
    },
    {
        type: "py_assign",
        message0: "%1 = %2",
        args0: [
            { type: "field_variable", name: "VAR", variable: "item" },
            { type: "input_value", name: "VALUE" },
        ],
        previousStatement: null,
        nextStatement: null,
        style: "variable_blocks",
    },
    {
        type: "py_aug_assign",
        message0: "%1 %2= %3",
        args0: [
            { type: "field_variable", name: "VAR", variable: "item" },
            {
                type: "field_dropdown",
                name: "OP",
                options: [
                    ["+", "+"],
                    ["-", "-"],
                    ["*", "*"],
                    ["/", "/"],
                    ["//", "//"],
                    ["%", "%"],
                    ["**", "**"],
                ],
            },
            { type: "input_value", name: "VALUE" },
        ],
        previousStatement: null,
        nextStatement: null,
        style: "variable_blocks",
    },
    {
        type: "py_variable",
        message0: "%1",
        args0: [{ type: "field_variable", name: "VAR", variable: "item" }],
        output: null,
        style: "variable_blocks",
    },
    {
        type: "py_delete",
        message0: "del %1",
        args0: [{ type: "field_variable", name: "VAR", variable: "item" }],
        previousStatement: null,
        nextStatement: null,
        style: "variable_blocks",
    },
    {
        type: "py_if",
        message0: "if %1 : %2",
        args0: [
            { type: "input_value", name: "COND" },
            { type: "input_statement", name: "DO" },
        ],
        previousStatement: null,
        nextStatement: null,
        style: "logic_blocks",
    },
    {
        type: "py_if_else",
        message0: "if %1 : %2 else : %3",
        args0: [
            { type: "input_value", name: "COND" },
            { type: "input_statement", name: "DO" },
            { type: "input_statement", name: "ELSE" },
        ],
        previousStatement: null,
        nextStatement: null,
        style: "logic_blocks",
    },
    {
        type: "py_compare",
        message0: "%1 %2 %3",
        args0: [
            { type: "input_value", name: "A" },
            {
                type: "field_dropdown",
                name: "OP",
                options: [
                    ["==", "=="],
                    ["!=", "!="],
                    ["<", "<"],
                    ["<=", "<="],
                    [">", ">"],
                    [">=", ">="],
                    ["is", "is"],
                    ["is not", "is not"],
                ],
            },
            { type: "input_value", name: "B" },
        ],
        output: "Boolean",
        style: "logic_blocks",
    },
    {
        type: "py_compare_chain",
        message0: "%1 %2 %3 %4 %5",
        args0: [
            { type: "input_value", name: "A" },
            {
                type: "field_dropdown",
                name: "OP1",
                options: [
                    ["<", "<"],
                    ["<=", "<="],
                    [">", ">"],
                    [">=", ">="],
                    ["==", "=="],
                    ["!=", "!="],
                ],
            },
            { type: "input_value", name: "B" },
            {
                type: "field_dropdown",
                name: "OP2",
                options: [
                    ["<", "<"],
                    ["<=", "<="],
                    [">", ">"],
                    [">=", ">="],
                    ["==", "=="],
                    ["!=", "!="],
                ],
            },
            { type: "input_value", name: "C" },
        ],
        output: "Boolean",
        style: "logic_blocks",
    },
    {
        type: "py_boolean_op",
        message0: "%1 %2 %3",
        args0: [
            { type: "input_value", name: "A" },
            {
                type: "field_dropdown",
                name: "OP",
                options: [
                    ["and", "and"],
                    ["or", "or"],
                ],
            },
            { type: "input_value", name: "B" },
        ],
        output: "Boolean",
        style: "logic_blocks",
    },
    {
        type: "py_not",
        message0: "not %1",
        args0: [{ type: "input_value", name: "VALUE" }],
        output: "Boolean",
        style: "logic_blocks",
    },
    {
        type: "py_boolean",
        message0: "%1",
        args0: [
            {
                type: "field_dropdown",
                name: "VALUE",
                options: [
                    ["True", "True"],
                    ["False", "False"],
                ],
            },
        ],
        output: "Boolean",
        style: "logic_blocks",
    },
    { type: "py_none", message0: "None", output: null, style: "logic_blocks" },
    {
        type: "py_ternary",
        message0: "%1 if %2 else %3",
        args0: [
            { type: "input_value", name: "YES" },
            { type: "input_value", name: "COND" },
            { type: "input_value", name: "NO" },
        ],
        output: null,
        style: "logic_blocks",
    },
    {
        type: "py_for_range",
        message0: "for %1 in range ( %2 , %3 , %4 ) : %5",
        args0: [
            { type: "field_variable", name: "VAR", variable: "i" },
            { type: "input_value", name: "START" },
            { type: "input_value", name: "STOP" },
            { type: "input_value", name: "STEP" },
            { type: "input_statement", name: "DO" },
        ],
        previousStatement: null,
        nextStatement: null,
        style: "loop_blocks",
    },
    {
        type: "py_for_each",
        message0: "for %1 in %2 : %3",
        args0: [
            { type: "field_variable", name: "VAR", variable: "item" },
            { type: "input_value", name: "ITERABLE" },
            { type: "input_statement", name: "DO" },
        ],
        previousStatement: null,
        nextStatement: null,
        style: "loop_blocks",
    },
    {
        type: "py_range",
        message0: "range form %1 ( %2 , %3 , %4 )",
        args0: [
            {
                type: "field_dropdown",
                name: "FORM",
                options: [
                    ["stop", "1"],
                    ["start, stop", "2"],
                    ["start, stop, step", "3"],
                ],
            },
            { type: "input_value", name: "A" },
            { type: "input_value", name: "B" },
            { type: "input_value", name: "C" },
        ],
        output: null,
        style: "loop_blocks",
    },
    {
        type: "py_while",
        message0: "while %1 : %2",
        args0: [
            { type: "input_value", name: "COND" },
            { type: "input_statement", name: "DO" },
        ],
        previousStatement: null,
        nextStatement: null,
        style: "loop_blocks",
    },
    {
        type: "py_break",
        message0: "break",
        previousStatement: null,
        nextStatement: null,
        style: "loop_blocks",
    },
    {
        type: "py_continue",
        message0: "continue",
        previousStatement: null,
        nextStatement: null,
        style: "loop_blocks",
    },
    {
        type: "py_number",
        message0: "%1",
        args0: [{ type: "field_number", name: "NUM", value: 0 }],
        output: "Number",
        style: "math_blocks",
    },
    {
        type: "py_arithmetic",
        message0: "%1 %2 %3",
        args0: [
            { type: "input_value", name: "A" },
            {
                type: "field_dropdown",
                name: "OP",
                options: [
                    ["+", "+"],
                    ["-", "-"],
                    ["*", "*"],
                    ["/", "/"],
                    ["//", "//"],
                    ["%", "%"],
                    ["**", "**"],
                ],
            },
            { type: "input_value", name: "B" },
        ],
        output: "Number",
        style: "math_blocks",
    },
    {
        type: "py_builtin_math",
        message0: "%1 ( %2 )",
        args0: [
            {
                type: "field_dropdown",
                name: "FN",
                options: [
                    ["abs", "abs"],
                    ["round", "round"],
                    ["int", "int"],
                    ["float", "float"],
                    ["min", "min"],
                    ["max", "max"],
                    ["sum", "sum"],
                ],
            },
            { type: "input_value", name: "VALUE" },
        ],
        output: null,
        style: "math_blocks",
    },
    {
        type: "py_round",
        message0: "round ( %1 , ndigits %2 )",
        args0: [
            { type: "input_value", name: "VALUE" },
            { type: "input_value", name: "NDIGITS" },
        ],
        output: "Number",
        style: "math_blocks",
    },
    {
        type: "py_math_function",
        message0: "math . %1 ( %2 )",
        args0: [
            {
                type: "field_dropdown",
                name: "FN",
                options: [
                    ["sqrt", "sqrt"],
                    ["floor", "floor"],
                    ["ceil", "ceil"],
                    ["sin", "sin"],
                    ["cos", "cos"],
                    ["tan", "tan"],
                    ["log", "log"],
                    ["factorial", "factorial"],
                ],
            },
            { type: "input_value", name: "VALUE" },
        ],
        output: "Number",
        style: "math_blocks",
    },
    {
        type: "py_random_int",
        message0: "random . randint ( %1 , %2 )",
        args0: [
            { type: "input_value", name: "A" },
            { type: "input_value", name: "B" },
        ],
        output: "Number",
        style: "math_blocks",
    },
    {
        type: "py_random_choice",
        message0: "random . choice ( %1 )",
        args0: [{ type: "input_value", name: "VALUE" }],
        output: null,
        style: "math_blocks",
    },
    {
        type: "py_string",
        message0: '"%1"',
        args0: [{ type: "field_input", name: "TEXT", text: "text" }],
        output: "String",
        style: "text_blocks",
    },
    {
        type: "py_fstring",
        message0: 'f"%1"',
        args0: [
            { type: "field_input", name: "TEXT", text: "value = {variable}" },
        ],
        output: "String",
        style: "text_blocks",
    },
    {
        type: "py_string_concat",
        message0: "%1 + %2",
        args0: [
            { type: "input_value", name: "A" },
            { type: "input_value", name: "B" },
        ],
        output: "String",
        style: "text_blocks",
    },
    {
        type: "py_len",
        message0: "len ( %1 )",
        args0: [{ type: "input_value", name: "VALUE" }],
        output: "Number",
        style: "text_blocks",
    },
    {
        type: "py_string_method",
        message0: "%1 . %2 ( )",
        args0: [
            { type: "input_value", name: "VALUE" },
            {
                type: "field_dropdown",
                name: "METHOD",
                options: [
                    ["upper", "upper"],
                    ["lower", "lower"],
                    ["title", "title"],
                    ["strip", "strip"],
                    ["split", "split"],
                ],
            },
        ],
        output: null,
        style: "text_blocks",
    },
    {
        type: "py_replace",
        message0: "%1 . replace ( %2 , %3 )",
        args0: [
            { type: "input_value", name: "VALUE" },
            { type: "input_value", name: "OLD" },
            { type: "input_value", name: "NEW" },
        ],
        output: "String",
        style: "text_blocks",
    },
    {
        type: "py_subscript",
        message0: "%1 [ %2 : %3 : %4 ]",
        args0: [
            { type: "input_value", name: "VALUE" },
            { type: "input_value", name: "START" },
            { type: "input_value", name: "STOP" },
            { type: "input_value", name: "STEP" },
        ],
        output: null,
        style: "text_blocks",
    },
    {
        type: "py_list",
        message0: "[ %1 , %2 , %3 ]",
        args0: [
            { type: "input_value", name: "A" },
            { type: "input_value", name: "B" },
            { type: "input_value", name: "C" },
        ],
        output: "Array",
        style: "list_blocks",
        tooltip:
            "Legacy three-item list. New lists use the dynamic list block.",
    },
    {
        type: "py_list_get",
        message0: "%1 [ %2 ]",
        args0: [
            { type: "input_value", name: "LIST" },
            { type: "input_value", name: "INDEX" },
        ],
        output: null,
        style: "list_blocks",
    },
    {
        type: "py_list_set",
        message0: "%1 [ %2 ] = %3",
        args0: [
            { type: "input_value", name: "LIST" },
            { type: "input_value", name: "INDEX" },
            { type: "input_value", name: "VALUE" },
        ],
        previousStatement: null,
        nextStatement: null,
        style: "list_blocks",
    },
    {
        type: "py_list_append",
        message0: "%1 . append ( %2 )",
        args0: [
            { type: "input_value", name: "LIST" },
            { type: "input_value", name: "VALUE" },
        ],
        previousStatement: null,
        nextStatement: null,
        style: "list_blocks",
    },
    {
        type: "py_list_remove",
        message0: "%1 . remove ( %2 )",
        args0: [
            { type: "input_value", name: "LIST" },
            { type: "input_value", name: "VALUE" },
        ],
        previousStatement: null,
        nextStatement: null,
        style: "list_blocks",
    },
    {
        type: "py_list_method",
        message0: "%1 . %2 ( )",
        args0: [
            { type: "input_value", name: "LIST" },
            {
                type: "field_dropdown",
                name: "METHOD",
                options: [
                    ["sort", "sort"],
                    ["reverse", "reverse"],
                    ["clear", "clear"],
                ],
            },
        ],
        previousStatement: null,
        nextStatement: null,
        style: "list_blocks",
    },
    {
        type: "py_list_copy",
        message0: "%1 . copy ( )",
        args0: [{ type: "input_value", name: "LIST" }],
        output: "Array",
        style: "list_blocks",
    },
    {
        type: "py_in",
        message0: "%1 %2 %3",
        args0: [
            { type: "input_value", name: "VALUE" },
            {
                type: "field_dropdown",
                name: "OP",
                options: [
                    ["in", "in"],
                    ["not in", "not in"],
                ],
            },
            { type: "input_value", name: "COLLECTION" },
        ],
        output: "Boolean",
        style: "list_blocks",
    },
    {
        type: "py_return",
        message0: "return %1",
        args0: [{ type: "input_value", name: "VALUE" }],
        previousStatement: null,
        nextStatement: null,
        style: "procedure_blocks",
    },
    {
        type: "py_keyword_arg",
        message0: "%1 = %2",
        args0: [
            { type: "field_input", name: "NAME", text: "name" },
            { type: "input_value", name: "VALUE" },
        ],
        output: null,
        style: "procedure_blocks",
    },
    {
        type: "py_raw_code",
        message0: "imported Python %1",
        args0: [{ type: "field_input", name: "SUMMARY", text: "1 line" }],
        previousStatement: null,
        nextStatement: null,
        style: "output_blocks",
    },
];

Blockly.defineBlocksWithJsonArray(PY_BLOCKS);

Blockly.defineBlocksWithJsonArray([
    {
        type: "py_function_mutator_container",
        message0: "function parameters %1 %2",
        args0: [
            { type: "input_dummy" },
            { type: "input_statement", name: "STACK" },
        ],
        colour: "#f7768e",
        enableContextMenu: false,
    },
    {
        type: "py_function_mutator_parameter",
        message0: "parameter %1",
        args0: [{ type: "field_input", name: "NAME", text: "parameter" }],
        previousStatement: null,
        nextStatement: null,
        colour: "#f7768e",
        enableContextMenu: false,
    },
]);

const functionMutatorMixin = {
    parameterNames_: ["parameter"],
    updateFunctionShape_() {
        const body = this.getInputTargetBlock("DO");
        for (const input of [...this.inputList])
            this.removeInput(input.name, true);
        this.appendDummyInput("HEADER")
            .appendField("def")
            .appendField(
                new Blockly.FieldTextInput(
                    this.functionName_ || "function_name",
                ),
                "NAME",
            )
            .appendField("(");
        this.parameterNames_.forEach((parameter, index) =>
            this.appendDummyInput(`PARAM${index}`)
                .appendField(index ? "," : "")
                .appendField(
                    new Blockly.FieldTextInput(parameter),
                    `PARAM_NAME${index}`,
                ),
        );
        this.appendDummyInput("CLOSE").appendField("):");
        this.appendStatementInput("DO");
        if (body?.previousConnection)
            this.getInput("DO").connection.connect(body.previousConnection);
    },
    decompose(workspace) {
        const container = workspace.newBlock("py_function_mutator_container");
        container.initSvg?.();
        let connection = container.getInput("STACK").connection;
        this.getParameterNames_().forEach((parameter) => {
            const item = workspace.newBlock("py_function_mutator_parameter");
            item.setFieldValue(parameter, "NAME");
            item.initSvg?.();
            connection.connect(item.previousConnection);
            connection = item.nextConnection;
        });
        return container;
    },
    compose(container) {
        const names = [];
        let item = container.getInputTargetBlock("STACK");
        while (item) {
            names.push(item.getFieldValue("NAME") || "parameter");
            item = item.nextConnection?.targetBlock();
        }
        this.functionName_ = this.getFieldValue("NAME") || "function_name";
        this.parameterNames_ = names;
        this.updateFunctionShape_();
    },
    getParameterNames_() {
        return this.parameterNames_.map(
            (fallback, index) =>
                this.getFieldValue(`PARAM_NAME${index}`) || fallback,
        );
    },
    saveExtraState() {
        return {
            name: this.getFieldValue("NAME") || this.functionName_,
            parameters: this.getParameterNames_(),
        };
    },
    loadExtraState(state) {
        this.functionName_ = state?.name || "function_name";
        this.parameterNames_ = Array.isArray(state?.parameters)
            ? state.parameters
            : ["parameter"];
        this.updateFunctionShape_();
    },
    mutationToDom() {
        const mutation = Blockly.utils.xml.createElement("mutation");
        mutation.setAttribute(
            "name",
            this.getFieldValue("NAME") || this.functionName_,
        );
        mutation.setAttribute("params", this.getParameterNames_().join(","));
        return mutation;
    },
    domToMutation(xml) {
        this.functionName_ = xml.getAttribute("name") || "function_name";
        this.parameterNames_ = (xml.getAttribute("params") || "")
            .split(",")
            .filter(Boolean);
        this.updateFunctionShape_();
    },
};
Blockly.Extensions.registerMutator(
    "py_function_mutator",
    functionMutatorMixin,
    null,
    ["py_function_mutator_parameter"],
);
Blockly.Blocks.py_function_hat = {
    init() {
        this.functionName_ = "function_name";
        this.setStyle("procedure_blocks");
        this.setTooltip("Define a function with structured parameters.");
        Blockly.Extensions.apply("py_function_mutator", this, true);
        this.parameterNames_ = ["parameter"];
        this.updateFunctionShape_();
    },
};

Blockly.Blocks.py_function_call = {
    init() {
        this.functionName_ = "function_name";
        this.definitionId_ = "";
        this.parameters_ = [];
        this.setStyle("procedure_blocks");
        this.setOutput(true);
        this.setTooltip("Call a function defined by a function hat.");
        this.updateShape_();
    },
    updateShape_() {
        const targets = this.parameters_.map((_, index) =>
            this.getInputTargetBlock(`ARG${index}`),
        );
        for (const input of [...this.inputList])
            this.removeInput(input.name, true);
        this.appendDummyInput("OPEN").appendField(`${this.functionName_} (`);
        this.parameters_.forEach((parameter, index) => {
            const input = this.appendValueInput(`ARG${index}`);
            input.appendField(index === 0 ? parameter : `, ${parameter}`);
        });
        this.appendDummyInput("CLOSE").appendField(")");
        targets.forEach((target, index) => {
            if (target?.outputConnection && this.getInput(`ARG${index}`)) {
                this.getInput(`ARG${index}`).connection.connect(
                    target.outputConnection,
                );
            }
        });
    },
    mutationToDom() {
        const mutation = Blockly.utils.xml.createElement("mutation");
        mutation.setAttribute("name", this.functionName_);
        mutation.setAttribute("params", this.parameters_.join(","));
        mutation.setAttribute("definition", this.definitionId_);
        return mutation;
    },
    domToMutation(xmlElement) {
        this.functionName_ = xmlElement.getAttribute("name") || "function_name";
        this.definitionId_ = xmlElement.getAttribute("definition") || "";
        this.parameters_ = (xmlElement.getAttribute("params") || "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
        this.updateShape_();
    },
    saveExtraState() {
        return {
            name: this.functionName_,
            parameters: this.parameters_,
            definitionId: this.definitionId_,
        };
    },
    loadExtraState(state) {
        this.functionName_ = state.name || "function_name";
        this.parameters_ = state.parameters || [];
        this.definitionId_ = state.definitionId || "";
        this.updateShape_();
    },
    syncFromDefinition(definition) {
        this.functionName_ = safeIdentifier(definition.getFieldValue("NAME"));
        this.parameters_ = functionParameters(definition);
        this.updateShape_();
    },
};

Blockly.Blocks.py_function_call_statement = {
    ...Blockly.Blocks.py_function_call,
    init() {
        this.functionName_ = "function_name";
        this.definitionId_ = "";
        this.parameters_ = [];
        this.setStyle("procedure_blocks");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setTooltip("Call a function for its side effects.");
        this.updateShape_();
    },
};

function dynamicArgumentMethods(
    renderHeader,
    { optionalPrintControls = false } = {},
) {
    return {
        argumentCount_: 1,
        updateArgumentShape_() {
            const targets = Array.from(
                { length: this.argumentCount_ },
                (_, index) => this.getInputTargetBlock(`ARG${index}`),
            );
            const sep = this.getInputTargetBlock("SEP");
            const end = this.getInputTargetBlock("END");
            const fieldState = {
                module: this.getFieldValue("MODULE"),
                functionName: this.getFieldValue("FUNCTION"),
                fn: this.getFieldValue("FN"),
            };
            for (const input of [...this.inputList])
                this.removeInput(input.name, true);
            renderHeader(this, fieldState);
            for (let index = 0; index < this.argumentCount_; index += 1) {
                this.appendValueInput(`ARG${index}`).appendField(
                    index === 0 ? "" : ",",
                );
            }
            if (optionalPrintControls) {
                this.appendValueInput("SEP").appendField("sep =");
                this.appendValueInput("END").appendField("end =");
            }
            this.appendDummyInput("CLOSE").appendField(")");
            targets.forEach((target, index) => {
                if (target?.outputConnection)
                    this.getInput(`ARG${index}`)?.connection.connect(
                        target.outputConnection,
                    );
            });
            if (sep?.outputConnection)
                this.getInput("SEP")?.connection.connect(sep.outputConnection);
            if (end?.outputConnection)
                this.getInput("END")?.connection.connect(end.outputConnection);
        },
        saveExtraState() {
            return { argumentCount: this.argumentCount_ };
        },
        loadExtraState(state) {
            this.argumentCount_ = Math.max(
                0,
                Number(state?.argumentCount) || 0,
            );
            this.updateArgumentShape_();
        },
        mutationToDom() {
            const mutation = Blockly.utils.xml.createElement("mutation");
            mutation.setAttribute("arguments", this.argumentCount_);
            return mutation;
        },
        domToMutation(xml) {
            this.argumentCount_ = Math.max(
                0,
                Number(xml.getAttribute("arguments")) || 0,
            );
            this.updateArgumentShape_();
        },
        customContextMenu(options) {
            options.push({
                text: "Add argument",
                enabled: true,
                callback: () => {
                    this.argumentCount_ += 1;
                    this.updateArgumentShape_();
                },
            });
            options.push({
                text: "Remove last argument",
                enabled: this.argumentCount_ > 0,
                callback: () => {
                    this.argumentCount_ = Math.max(0, this.argumentCount_ - 1);
                    this.updateArgumentShape_();
                },
            });
        },
    };
}

Blockly.Blocks.py_print = {
    init() {
        Object.assign(
            this,
            dynamicArgumentMethods(
                (block) =>
                    block.appendDummyInput("OPEN").appendField("print ("),
                { optionalPrintControls: true },
            ),
        );
        this.argumentCount_ = 1;
        this.setStyle("output_blocks");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setTooltip(
            "Print any number of values. Use the context menu to add or remove arguments.",
        );
        this.updateArgumentShape_();
    },
};

Blockly.Blocks.py_minmax = {
    init() {
        Object.assign(
            this,
            dynamicArgumentMethods((block, state) => {
                block
                    .appendDummyInput("OPEN")
                    .appendField(
                        new Blockly.FieldDropdown([
                            ["min", "min"],
                            ["max", "max"],
                        ]),
                        "FN",
                    )
                    .appendField("(");
                if (state.fn) block.setFieldValue(state.fn, "FN");
            }),
        );
        this.argumentCount_ = 1;
        this.setStyle("math_blocks");
        this.setOutput(true);
        this.setTooltip(
            "Use one iterable or add multiple arguments from the context menu.",
        );
        this.updateArgumentShape_();
    },
};

Blockly.Blocks.py_library_call = {
    init() {
        Object.assign(
            this,
            dynamicArgumentMethods((block, state) => {
                block
                    .appendDummyInput("OPEN")
                    .appendField(
                        new Blockly.FieldTextInput(state.module || "module"),
                        "MODULE",
                    )
                    .appendField(".")
                    .appendField(
                        new Blockly.FieldTextInput(
                            state.functionName || "function",
                        ),
                        "FUNCTION",
                    )
                    .appendField("(");
            }),
        );
        this.argumentCount_ = 1;
        this.setStyle("procedure_blocks");
        this.setOutput(true);
        this.setTooltip(
            "Call an enabled library with positional or keyword arguments.",
        );
        this.updateArgumentShape_();
    },
};

Blockly.Blocks.py_library_call_statement = {
    init() {
        Object.assign(
            this,
            dynamicArgumentMethods((block, state) => {
                block
                    .appendDummyInput("OPEN")
                    .appendField(
                        new Blockly.FieldTextInput(state.module || "module"),
                        "MODULE",
                    )
                    .appendField(".")
                    .appendField(
                        new Blockly.FieldTextInput(
                            state.functionName || "function",
                        ),
                        "FUNCTION",
                    )
                    .appendField("(");
            }),
        );
        this.argumentCount_ = 1;
        this.setStyle("procedure_blocks");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setTooltip("Call an enabled library for its side effects.");
        this.updateArgumentShape_();
    },
};

const py = window.python.pythonGenerator;
const O = window.python.Order;
const value = (g, b, n, f = "None", order = O.NONE) =>
    g.valueToCode(b, n, order) || f;
const suite = (g, b, n) => g.statementToCode(b, n) || `${g.INDENT}pass\n`;
const keywords = new Set(
    "False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield".split(
        " ",
    ),
);
const safeIdentifier = (raw) => {
    let result = String(raw || "item")
        .normalize("NFKC")
        .replace(/[^\p{L}\p{N}_]/gu, "_")
        .replace(/^(\p{N})/u, "_$1");
    if (!result) result = "item";
    if (keywords.has(result)) result += "_";
    return result;
};
const variableName = (b) => {
    const model = b.workspace
        ?.getVariableMap?.()
        .getVariableById(b.getFieldValue("VAR"));
    return safeIdentifier(model?.name || "item");
};
const name = (b, n = "NAME") => safeIdentifier(b.getFieldValue(n));
const dottedName = (b, n = "MODULE") =>
    String(b.getFieldValue(n) || "module")
        .split(".")
        .map(safeIdentifier)
        .join(".");
const functionParameters = (b) => {
    const seen = new Set();
    const raw = b.getParameterNames_
        ? b.getParameterNames_()
        : String(b.getFieldValue("PARAMS") || "").split(",");
    return raw.map(safeIdentifier).filter((parameter) => {
        if (seen.has(parameter)) return false;
        seen.add(parameter);
        return true;
    });
};
const quoted = (text) =>
    `"${String(text)
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/\r/g, "\\r")
        .replace(/\n/g, "\\n")
        .replace(/\t/g, "\\t")
        .replace(/\f/g, "\\f")
        .replace(/\u0008/g, "\\b")}"`;
const expr = (code, order = O.ATOMIC) => [code, order];

py.forBlock.py_when_run = () => "# When Run Python clicked\n";
py.forBlock.py_print = (b, g) => {
    const args = Array.from(
        { length: b.argumentCount_ },
        (_, index) => `ARG${index}`,
    )
        .filter((key) => b.getInputTargetBlock(key))
        .map((key) => value(g, b, key));
    if (b.getInputTargetBlock("SEP"))
        args.push(`sep=${value(g, b, "SEP", "''")}`);
    if (b.getInputTargetBlock("END"))
        args.push(`end=${value(g, b, "END", "''")}`);
    return `print(${args.join(", ")})\n`;
};
py.forBlock.py_input = (b, g) =>
    expr(`input(${value(g, b, "PROMPT", "''")})`, O.FUNCTION_CALL);
py.forBlock.py_comment = (b) =>
    String(b.getFieldValue("COMMENT") || "")
        .split(/\r?\n/)
        .map((line) => `# ${line}`)
        .join("\n") + "\n";
py.forBlock.py_import = (b) =>
    `import ${dottedName(b)}${b.getFieldValue("ALIAS")?.trim() ? ` as ${name(b, "ALIAS")}` : ""}\n`;
py.forBlock.py_from_import = (b) =>
    `from ${dottedName(b)} import ${name(b, "MEMBER")}${b.getFieldValue("ALIAS")?.trim() ? ` as ${name(b, "ALIAS")}` : ""}\n`;
py.forBlock.py_assign = (b, g) =>
    `${variableName(b)} = ${value(g, b, "VALUE")}\n`;
py.forBlock.py_aug_assign = (b, g) =>
    `${variableName(b)} ${b.getFieldValue("OP")}= ${value(g, b, "VALUE", "0")}\n`;
py.forBlock.py_variable = (b) => expr(variableName(b), O.ATOMIC);
py.forBlock.py_delete = (b) => `del ${variableName(b)}\n`;
py.forBlock.py_if = (b, g) =>
    `if ${value(g, b, "COND", "False")}:\n${suite(g, b, "DO")}`;
py.forBlock.py_if_else = (b, g) =>
    `if ${value(g, b, "COND", "False")}:\n${suite(g, b, "DO")}else:\n${suite(g, b, "ELSE")}`;
py.forBlock.py_compare = (b, g) =>
    expr(
        `${value(g, b, "A", "None", O.RELATIONAL)} ${b.getFieldValue("OP")} ${value(g, b, "B", "None", O.RELATIONAL)}`,
        O.RELATIONAL,
    );
py.forBlock.py_compare_chain = (b, g) =>
    expr(
        `${value(g, b, "A", "None", O.RELATIONAL)} ${b.getFieldValue("OP1")} ${value(g, b, "B", "None", O.RELATIONAL)} ${b.getFieldValue("OP2")} ${value(g, b, "C", "None", O.RELATIONAL)}`,
        O.RELATIONAL,
    );
py.forBlock.py_boolean_op = (b, g) => {
    const order =
        b.getFieldValue("OP") === "and" ? O.LOGICAL_AND : O.LOGICAL_OR;
    return expr(
        `${value(g, b, "A", "False", order)} ${b.getFieldValue("OP")} ${value(g, b, "B", "False", order)}`,
        order,
    );
};
py.forBlock.py_not = (b, g) =>
    expr(`not ${value(g, b, "VALUE", "False", O.LOGICAL_NOT)}`, O.LOGICAL_NOT);
py.forBlock.py_boolean = (b) => expr(b.getFieldValue("VALUE"), O.ATOMIC);
py.forBlock.py_none = () => expr("None", O.ATOMIC);
py.forBlock.py_ternary = (b, g) =>
    expr(
        `${value(g, b, "YES", "None", O.CONDITIONAL)} if ${value(g, b, "COND", "False", O.CONDITIONAL)} else ${value(g, b, "NO", "None", O.CONDITIONAL)}`,
        O.CONDITIONAL,
    );
py.forBlock.py_for_range = (b, g) =>
    `for ${variableName(b)} in range(${value(g, b, "START", "0")}, ${value(g, b, "STOP", "10")}, ${value(g, b, "STEP", "1")}):\n${suite(g, b, "DO")}`;
py.forBlock.py_for_each = (b, g) =>
    `for ${variableName(b)} in ${value(g, b, "ITERABLE", "[]")}:\n${suite(g, b, "DO")}`;
py.forBlock.py_range = (b, g) => {
    const form = Number(b.getFieldValue("FORM"));
    const args =
        form === 1
            ? [value(g, b, "A", "10")]
            : form === 2
              ? [value(g, b, "A", "0"), value(g, b, "B", "10")]
              : [
                    value(g, b, "A", "0"),
                    value(g, b, "B", "10"),
                    value(g, b, "C", "1"),
                ];
    return expr(`range(${args.join(", ")})`, O.FUNCTION_CALL);
};
py.forBlock.py_while = (b, g) =>
    `while ${value(g, b, "COND", "False")}:\n${suite(g, b, "DO")}`;
py.forBlock.py_break = () => "break\n";
py.forBlock.py_continue = () => "continue\n";
py.forBlock.py_number = (b) => expr(String(b.getFieldValue("NUM")), O.ATOMIC);
py.forBlock.py_arithmetic = (b, g) => {
    const operator = b.getFieldValue("OP");
    const order =
        operator === "**"
            ? O.EXPONENTIATION
            : ["*", "/", "//", "%"].includes(operator)
              ? O.MULTIPLICATIVE
              : O.ADDITIVE;
    return expr(
        `${value(g, b, "A", "0", order)} ${operator} ${value(g, b, "B", "0", order)}`,
        order,
    );
};
py.forBlock.py_builtin_math = (b, g) =>
    expr(
        `${b.getFieldValue("FN")}(${value(g, b, "VALUE", "0")})`,
        O.FUNCTION_CALL,
    );
py.forBlock.py_round = (b, g) =>
    expr(
        `round(${value(g, b, "VALUE", "0")}${b.getInputTargetBlock("NDIGITS") ? `, ${value(g, b, "NDIGITS", "0")}` : ""})`,
        O.FUNCTION_CALL,
    );
py.forBlock.py_minmax = (b, g) =>
    expr(
        `${b.getFieldValue("FN")}(${
            Array.from(
                { length: b.argumentCount_ },
                (_, index) => `ARG${index}`,
            )
                .filter((key) => b.getInputTargetBlock(key))
                .map((key) => value(g, b, key))
                .join(", ") || "[]"
        })`,
        O.FUNCTION_CALL,
    );
py.forBlock.py_math_function = (b, g) =>
    expr(
        `math.${b.getFieldValue("FN")}(${value(g, b, "VALUE", "0")})`,
        O.FUNCTION_CALL,
    );
py.forBlock.py_random_int = (b, g) =>
    expr(
        `random.randint(${value(g, b, "A", "1")}, ${value(g, b, "B", "10")})`,
        O.FUNCTION_CALL,
    );
py.forBlock.py_random_choice = (b, g) =>
    expr(`random.choice(${value(g, b, "VALUE", "[]")})`, O.FUNCTION_CALL);
py.forBlock.py_string = (b) => expr(quoted(b.getFieldValue("TEXT")), O.ATOMIC);
py.forBlock.py_fstring = (b) =>
    expr(`f${quoted(b.getFieldValue("TEXT"))}`, O.ATOMIC);
py.forBlock.py_string_concat = (b, g) =>
    expr(
        `${value(g, b, "A", "''", O.ADDITIVE)} + ${value(g, b, "B", "''", O.ADDITIVE)}`,
        O.ADDITIVE,
    );
py.forBlock.py_len = (b, g) =>
    expr(`len(${value(g, b, "VALUE", "''")})`, O.FUNCTION_CALL);
py.forBlock.py_string_method = (b, g) =>
    expr(
        `${value(g, b, "VALUE", "''")}.${b.getFieldValue("METHOD")}()`,
        O.FUNCTION_CALL,
    );
py.forBlock.py_replace = (b, g) =>
    expr(
        `${value(g, b, "VALUE", "''")}.replace(${value(g, b, "OLD", "''")}, ${value(g, b, "NEW", "''")})`,
        O.FUNCTION_CALL,
    );
py.forBlock.py_subscript = (b, g) =>
    expr(
        `${value(g, b, "VALUE", "''")}[${value(g, b, "START", "")}:${value(g, b, "STOP", "")}:${value(g, b, "STEP", "")}]`,
        O.MEMBER,
    );
py.forBlock.py_list = (b, g) =>
    expr(
        `[${["A", "B", "C"]
            .filter((key) => b.getInputTargetBlock(key))
            .map((key) => value(g, b, key))
            .join(", ")}]`,
        O.ATOMIC,
    );
py.forBlock.py_list_get = (b, g) =>
    expr(
        `${value(g, b, "LIST", "[]")}[${value(g, b, "INDEX", "0")}]`,
        O.MEMBER,
    );
py.forBlock.py_list_set = (b, g) =>
    `${value(g, b, "LIST", "items")}[${value(g, b, "INDEX", "0")}] = ${value(g, b, "VALUE")}\n`;
py.forBlock.py_list_append = (b, g) =>
    `${value(g, b, "LIST", "items")}.append(${value(g, b, "VALUE")})\n`;
py.forBlock.py_list_remove = (b, g) =>
    `${value(g, b, "LIST", "items")}.remove(${value(g, b, "VALUE")})\n`;
py.forBlock.py_list_method = (b, g) =>
    `${value(g, b, "LIST", "items")}.${b.getFieldValue("METHOD")}()\n`;
py.forBlock.py_list_copy = (b, g) =>
    expr(`${value(g, b, "LIST", "items")}.copy()`, O.FUNCTION_CALL);
py.forBlock.py_in = (b, g) =>
    expr(
        `${value(g, b, "VALUE", "None", O.RELATIONAL)} ${b.getFieldValue("OP")} ${value(g, b, "COLLECTION", "[]", O.RELATIONAL)}`,
        O.RELATIONAL,
    );
py.forBlock.py_function_hat = (b, g) =>
    `def ${name(b)}(${functionParameters(b).join(", ")}):\n${suite(g, b, "DO")}`;
py.forBlock.py_return = (b, g) => `return ${value(g, b, "VALUE")}\n`;
py.forBlock.py_function_call = (b, g) => {
    const args = b.parameters_.map((parameter, index) =>
        value(g, b, `ARG${index}`, "None"),
    );
    return expr(`${b.functionName_}(${args.join(", ")})`, O.FUNCTION_CALL);
};
py.forBlock.py_function_call_statement = (b, g) => {
    const args = b.parameters_.map((parameter, index) =>
        value(g, b, `ARG${index}`, "None"),
    );
    return `${b.functionName_}(${args.join(", ")})\n`;
};
py.forBlock.py_keyword_arg = (b, g) =>
    expr(`${name(b)}=${value(g, b, "VALUE")}`, O.NONE);
py.forBlock.py_library_call = (b, g) =>
    expr(
        `${dottedName(b)}.${name(b, "FUNCTION")}(${Array.from(
            { length: b.argumentCount_ },
            (_, index) => `ARG${index}`,
        )
            .filter((key) => b.getInputTargetBlock(key))
            .map((key) => value(g, b, key))
            .join(", ")})`,
        O.FUNCTION_CALL,
    );
py.forBlock.py_library_call_statement = (b, g) => {
    const args = Array.from(
        { length: b.argumentCount_ },
        (_, index) => `ARG${index}`,
    )
        .filter((key) => b.getInputTargetBlock(key))
        .map((key) => value(g, b, key));
    return `${dottedName(b)}.${name(b, "FUNCTION")}(${args.join(", ")})\n`;
};
py.forBlock.py_raw_code = (b) =>
    b.data
        ? `${String(b.data).replace(/\r\n/g, "\n")}${String(b.data).endsWith("\n") ? "" : "\n"}`
        : "";

window.PyBlocksBlocks = {
    enforceSingleRunEvent(workspace, createdIds) {
        const events = workspace
            .getBlocksByType("py_when_run", false)
            .filter((b) => !b.isInsertionMarker());
        if (events.length <= 1) return;
        const created = createdIds
            .map((id) => workspace.getBlockById(id))
            .find((b) => b?.type === "py_when_run");
        if (created) {
            Blockly.Events.disable();
            try {
                created.dispose(false);
            } finally {
                Blockly.Events.enable();
            }
        }
        window.PythonEngine?.showNotice(
            "Only one “when Run Python clicked” event can exist.",
        );
    },
};
