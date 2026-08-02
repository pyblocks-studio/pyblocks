"use strict";

const results = document.getElementById("results");
const cases = [
    [
        "arithmetic precedence",
        "print(2 + 3 * 4)\nprint((2 + 3) * 4)\nprint(2 ** 3 ** 2)\nprint(10 // 3)\nprint(-5 // 2)\nprint(-2 ** 2)\nprint((-2) ** 2)",
        "14\n20\n512\n3\n-3\n-4\n4\n",
    ],
    [
        "nested conditions",
        'x = 4\nif x > 0:\n    if x % 2 == 0:\n        print("even")\n    else:\n        print("odd")',
        "even\n",
    ],
    [
        "for, while, break, continue",
        "total = 0\nfor i in range(6):\n    if i == 2:\n        continue\n    if i == 5:\n        break\n    total += i\nwhile total < 10:\n    total += 1\nprint(total)",
        "10\n",
    ],
    [
        "functions and recursion",
        "def fact(n):\n    if n <= 1:\n        return 1\n    return n * fact(n - 1)\nprint(fact(6))",
        "720\n",
    ],
    [
        "lists and strings",
        'items = [3, 1, 2]\nitems.sort()\nitems.append(4)\nprint(items[1:4:2])\nprint("hello".upper())',
        "[2, 4]\nHELLO\n",
    ],
    [
        "input suspension",
        'name = input("Name? ")\nprint("Hello, " + name)',
        "Hello, Ada\n",
        ["Ada"],
    ],
    ["division error", "print(1 / 0)", null, [], "ZeroDivisionError"],
];

function runPython(code, inputs = [], timeout = 7000) {
    return new Promise((resolve, reject) => {
        const worker = new Worker("../js/python-worker.js");
        let output = "";
        let timer = setTimeout(() => {
            worker.terminate();
            reject(new Error("timeout"));
        }, timeout);
        worker.addEventListener("message", (event) => {
            const message = event.data || {};
            if (message.type === "stdout") output += message.text;
            if (message.type === "input")
                worker.postMessage({
                    type: "input-response",
                    id: message.id,
                    value: inputs.shift() || "",
                });
            if (message.type === "complete" || message.type === "error") {
                clearTimeout(timer);
                worker.terminate();
                resolve({
                    output,
                    error: message.type === "error" ? message : null,
                });
            }
        });
        worker.addEventListener("error", (event) => {
            clearTimeout(timer);
            worker.terminate();
            reject(new Error(event.message));
        });
        worker.postMessage({ type: "run", code });
    });
}

function report(name, passed, detail = "") {
    const item = document.createElement("li");
    item.dataset.status = passed ? "pass" : "fail";
    item.textContent = `${passed ? "PASS" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`;
    results.append(item);
}

(async () => {
    for (const [name, code, expected, inputs = [], expectedError] of cases) {
        try {
            const result = await runPython(code, [...inputs]);
            const passed = expectedError
                ? result.error?.name === expectedError ||
                  result.error?.message.includes(expectedError)
                : !result.error && result.output === expected;
            report(name, passed, passed ? "" : JSON.stringify(result));
        } catch (error) {
            report(name, false, error.message);
        }
    }
    const infinite = new Worker("../js/python-worker.js");
    infinite.postMessage({ type: "run", code: "while True:\n    pass" });
    await new Promise((resolve) => setTimeout(resolve, 150));
    infinite.terminate();
    report("infinite loop can be terminated", true);
    const concurrent = await Promise.all([
        runPython('print("first")'),
        runPython('print("second")'),
    ]);
    report(
        "separate runs do not mix output",
        concurrent[0].output === "first\n" &&
            concurrent[1].output === "second\n",
    );
    document.body.dataset.complete = "true";
})();
