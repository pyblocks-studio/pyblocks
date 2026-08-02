"use strict";

window.PyBlocksPythonImporter = {
    parse(code) {
        return new Promise((resolve, reject) => {
            const worker = new Worker("js/python-worker.js");
            worker.onmessage = ({ data }) => {
                if (data.type === "parsed") {
                    worker.terminate();
                    resolve(data.ast);
                } else if (data.type === "parse-error") {
                    worker.terminate();
                    const where = data.line
                        ? ` at line ${data.line}${data.column ? `, column ${data.column}` : ""}`
                        : "";
                    reject(new Error(`${data.name}${where}: ${data.message}`));
                }
            };
            worker.onerror = (event) => {
                worker.terminate();
                reject(new Error(event.message || "Python parser failed"));
            };
            worker.postMessage({ type: "parse", code });
        });
    },

    async convert(code, workspace) {
        const ast = await this.parse(code);
        const stats = { converted: 0, unknown: 0 };
        const event = workspace.newBlock("py_when_run");
        this.prepare(event, 70, 60);
        let tail = event;
        for (const node of ast.body || []) {
            const block = this.statement(node, workspace, stats);
            tail.nextConnection.connect(block.previousConnection);
            tail = block;
        }
        return stats;
    },

    prepare(block, x, y) {
        block.initSvg();
        block.render();
        if (Number.isFinite(x)) block.moveBy(x, y);
        return block;
    },

    variableId(workspace, name) {
        const map = workspace.getVariableMap();
        return (
            map.getVariable(name)?.getId() || map.createVariable(name).getId()
        );
    },

    unknown(workspace, stats) {
        stats.unknown += 1;
        const block = workspace.newBlock("py_comment");
        block.setFieldValue("Unknown Syntax", "COMMENT");
        this.prepare(block);
        return block;
    },

    statement(node, workspace, stats) {
        const make = (type) => this.prepare(workspace.newBlock(type));
        let block;
        if (
            node.type === "Assign" &&
            node.targets?.length === 1 &&
            node.targets[0]?.type === "Name"
        ) {
            const value = this.expression(node.value, workspace);
            if (!value) return this.unknown(workspace, stats);
            block = make("py_assign");
            block
                .getField("VAR")
                .setValue(this.variableId(workspace, node.targets[0].id));
            block.getInput("VALUE").connection.connect(value.outputConnection);
        } else if (node.type === "AugAssign" && node.target?.type === "Name") {
            const value = this.expression(node.value, workspace);
            const op = this.operator(node.op);
            if (!value || !op) return this.unknown(workspace, stats);
            block = make("py_aug_assign");
            block
                .getField("VAR")
                .setValue(this.variableId(workspace, node.target.id));
            block.setFieldValue(op, "OP");
            block.getInput("VALUE").connection.connect(value.outputConnection);
        } else if (
            node.type === "Expr" &&
            node.value?.type === "Call" &&
            node.value.func?.type === "Name" &&
            node.value.func.id === "print"
        ) {
            block = make("py_print");
            const value = this.expression(node.value.args?.[0], workspace);
            if (value)
                block
                    .getInput("VALUE")
                    ?.connection.connect(value.outputConnection);
        } else if (node.type === "Return") {
            const value = this.expression(node.value, workspace);
            if (node.value && !value) return this.unknown(workspace, stats);
            block = make("py_return");
            if (value)
                block
                    .getInput("VALUE")
                    .connection.connect(value.outputConnection);
        } else if (node.type === "Break") block = make("py_break");
        else if (node.type === "Continue") block = make("py_continue");
        else if (node.type === "While") {
            const condition = this.expression(node.test, workspace);
            if (!condition || node.orelse?.length)
                return this.unknown(workspace, stats);
            block = make("py_while");
            block
                .getInput("COND")
                .connection.connect(condition.outputConnection);
            this.connectStatements(block, "DO", node.body, workspace, stats);
        } else if (node.type === "If" && !node.orelse?.length) {
            const condition = this.expression(node.test, workspace);
            if (!condition) return this.unknown(workspace, stats);
            block = make("py_if");
            block
                .getInput("COND")
                .connection.connect(condition.outputConnection);
            this.connectStatements(block, "DO", node.body, workspace, stats);
        } else if (node.type === "If" && node.orelse?.length) {
            const condition = this.expression(node.test, workspace);
            if (!condition) return this.unknown(workspace, stats);
            block = make("py_if_else");
            block
                .getInput("COND")
                .connection.connect(condition.outputConnection);
            this.connectStatements(block, "DO", node.body, workspace, stats);
            this.connectStatements(
                block,
                "ELSE",
                node.orelse,
                workspace,
                stats,
            );
        } else if (node.type === "For" && node.target?.type === "Name") {
            const iterable = this.expression(node.iter, workspace);
            if (!iterable || node.orelse?.length)
                return this.unknown(workspace, stats);
            block = make("py_for_each");
            block
                .getField("VAR")
                .setValue(this.variableId(workspace, node.target.id));
            block
                .getInput("ITERABLE")
                .connection.connect(iterable.outputConnection);
            this.connectStatements(block, "DO", node.body, workspace, stats);
        } else if (node.type === "Import" && node.names?.length === 1) {
            block = make("py_import");
            block.setFieldValue(node.names[0].name, "MODULE");
            block.setFieldValue(node.names[0].asname || "", "ALIAS");
        } else {
            return this.unknown(workspace, stats);
        }
        stats.converted += 1;
        return block;
    },

    connectStatements(parent, inputName, nodes, workspace, stats) {
        let connection = parent.getInput(inputName).connection;
        for (const node of nodes || []) {
            const child = this.statement(node, workspace, stats);
            connection.connect(child.previousConnection);
            connection = child.nextConnection;
        }
    },

    expression(node, workspace) {
        if (!node) return null;
        const make = (type) => this.prepare(workspace.newBlock(type));
        let block;
        if (node.type === "Name") {
            block = make("py_variable");
            block.getField("VAR").setValue(this.variableId(workspace, node.id));
        } else if (
            node.type === "Num" ||
            (node.type === "Constant" && typeof node.value === "number")
        ) {
            block = make("py_number");
            block.setFieldValue(String(node.n ?? node.value), "NUM");
        } else if (
            node.type === "Str" ||
            (node.type === "Constant" && typeof node.value === "string")
        ) {
            block = make("py_string");
            block.setFieldValue(node.s ?? node.value, "TEXT");
        } else if (node.type === "NameConstant" || node.type === "Constant") {
            const value = node.value ?? node.value;
            if (value === null || value === "None") block = make("py_none");
            else if (
                value === true ||
                value === false ||
                value === "True" ||
                value === "False"
            ) {
                block = make("py_boolean");
                block.setFieldValue(
                    value === true || value === "True" ? "True" : "False",
                    "VALUE",
                );
            } else return null;
        } else if (node.type === "BinOp") {
            const left = this.expression(node.left, workspace);
            const right = this.expression(node.right, workspace);
            const op = this.operator(node.op);
            if (!left || !right || !op) return null;
            block = make("py_arithmetic");
            block.setFieldValue(op, "OP");
            block.getInput("A").connection.connect(left.outputConnection);
            block.getInput("B").connection.connect(right.outputConnection);
        } else if (node.type === "Compare" && node.ops?.length === 1) {
            const left = this.expression(node.left, workspace);
            const right = this.expression(node.comparators?.[0], workspace);
            const op = this.operator(node.ops[0]);
            if (!left || !right || !op) return null;
            const inOp = op === "in" || op === "not in";
            block = make(inOp ? "py_in" : "py_compare");
            block.setFieldValue(op, "OP");
            block
                .getInput(inOp ? "VALUE" : "A")
                .connection.connect(left.outputConnection);
            block
                .getInput(inOp ? "COLLECTION" : "B")
                .connection.connect(right.outputConnection);
        } else if (
            node.type === "Call" &&
            node.func?.type === "Name" &&
            node.func.id === "input"
        ) {
            block = make("py_input");
            const prompt = this.expression(node.args?.[0], workspace);
            if (prompt)
                block
                    .getInput("PROMPT")
                    .connection.connect(prompt.outputConnection);
        } else if (
            node.type === "Call" &&
            node.func?.type === "Name" &&
            node.func.id === "len" &&
            node.args?.length === 1
        ) {
            const value = this.expression(node.args[0], workspace);
            if (!value) return null;
            block = make("py_len");
            block.getInput("VALUE").connection.connect(value.outputConnection);
        } else if (node.type === "List" && node.elts?.length <= 3) {
            block = make("py_list");
            for (const [index, element] of node.elts.entries()) {
                const value = this.expression(element, workspace);
                if (!value) return null;
                block
                    .getInput(["A", "B", "C"][index])
                    .connection.connect(value.outputConnection);
            }
        } else return null;
        return block;
    },

    operator(node) {
        const type = typeof node === "string" ? node : node?.type;
        return (
            {
                Add: "+",
                Sub: "-",
                Mult: "*",
                Div: "/",
                FloorDiv: "//",
                Mod: "%",
                Pow: "**",
                Eq: "==",
                NotEq: "!=",
                Lt: "<",
                LtE: "<=",
                Gt: ">",
                GtE: ">=",
                Is: "is",
                IsNot: "is not",
                In: "in",
                NotIn: "not in",
            }[type] || null
        );
    },
};
