# Unification Engine

This folder contains the "heart" of the logic engine: the unification algorithm and its extensions for deep JavaScript integration.

The unification algorithm is the mechanism responsible for all pattern matching, variable binding, and value resolution within the language. Its goal is to **make any two terms equal** by binding unbound logic variables.

The core function `unify(term1, term2, bindings)` attempts this. It either **succeeds** (returning a new set of bindings) or **fails** (returning `null`).

---

## Expected Unification Outcomes

Here is a summary of the expected behavior of the `unify` function.

### 1. Core Principles

* **Value vs. Value:** Unifying two identical, concrete values (e.g., `unify(10, 10)`) **succeeds**. Unifying two different concrete values (e.g., `unify(10, 20)`) **fails**.
* **Variable vs. Value:** Unifying an unbound variable (a `Symbol`) with any value (e.g., `unify(X, 10)`) **succeeds**. `X` is now bound to that value.
* **Variable vs. Variable:** Unifying two unbound variables (e.g., `unify(X, Y)`) **succeeds**. They are linked; binding one will now bind the other.
* **Bound Variable vs. Value:** Unifying a bound variable is the same as unifying its underlying value.
    * If `X` is bound to `10`, `unify(X, 10)` **succeeds**.
    * If `X` is bound to `10`, `unify(X, 20)` **fails**.

### 2. Unifying Standard Structures (Strict)

Standard unification on plain JavaScript objects and arrays is **strict**. It does *not* provide flexible matching; that is the role of Pattern Classes.

* **Arrays:** Must have the **exact same length**.
    * `unify([X, 2], [1, Y])` **succeeds**, binding `X = 1` and `Y = 2`.
    * `unify([X], [1, 2])` **fails** (length mismatch).
    * `unify([X, Value.required(vars.A, 10)], [1])` **fails** (length mismatch).

* **Objects (Subset Matching):** This is a "one-way" match. The *first* argument is the "pattern" and the *second* is the "value."
    * `unify({a: X}, {a: 1, b: 2})` **succeeds**, binding `X = 1`. The extra key `b` is ignored.
    * `unify({a: X, c: 3}, {a: 1, b: 2})` **fails**. The key `c` is required by the pattern but is missing from the value.

### 3. Unifying with Pattern Classes (Flexible)

This subsystem includes special classes (`ArrayPattern`, `ObjectPattern`, `Value`) that provide flexible, non-standard matching logic. They are responsible for handling structural differences, such as missing keys or different lengths.

* **`ArrayPattern` (Flexible Arrays):**
    * `unify(new ArrayPattern([H], T), [1, 2, 3])` **succeeds**: `H = 1`, `T = [2, 3]`.
    * `unify(new ArrayPattern([H], T), [1])` **succeeds**: `H = 1`, `T = []`.
    * `unify(new ArrayPattern(Start, [Z]), [1, 2, 3])` **succeeds**: `Start = [1, 2]`, `Z = 3`.
    * **With `Value` (Optional):** `ArrayPattern` handles padding.
        * `unify(new ArrayPattern([[A, Value.optional(vars.B, 99)], T]), [1])` **succeeds**. The pattern pads the value to `[1, undefined]`, then `Value` is unified with `undefined` (an optional success), and `T` is bound to `[]`.

* **`ObjectPattern` (Flexible Objects):**
    * `unify(new ObjectPattern([{a: X}, Rest]), {a: 1, b: 2})` **succeeds**: `X = 1`, `Rest = {b: 2}`.
    * **With `Value` (Optional):** `ObjectPattern` handles missing keys if they have a default.
        * `unify(new ObjectPattern([ {a: X, c: Value.optional(vars.C, 10)} ]), {a: 1})` **succeeds**. The pattern sees `c` is missing, but it's an optional `Value`, so it unifies the `Value` with `undefined` (a success) and `X` is bound to `1`.

### 4. Special Cases: `Value` Class and Failures

* **`Value` Class (Required/Optional Defaults):** This class implements the logic for *all* default values. Its behavior depends on the `isOptional` flag.
    * **`isOptional: false` (Required, e.g., `A = 10`)**
        * `unify(Value.required(vars.X, 10), undefined)` -> **FAILS** (Required, but missing).
        * `unify(Value.required(vars.X, 10), 20)` -> **FAILS** (Required, mismatch).
        * `unify(Value.required(vars.X, 10), 10)` -> **SUCCEEDS** (Required, match) -> `X = 10`.
    * **`isOptional: true` (Optional, e.g., `A = Logic.optional(10)`)**
        * `unify(Value.optional(vars.X, 10), undefined)` -> **SUCCEEDS** (Optional, missing) -> `X = 10`.
        * `unify(Value.optional(vars.X, 10), 20)` -> **SUCCEEDS** (Optional, mismatch) -> `X = 20`.
        * `unify(Value.optional(vars.X, 10), 10)` -> **SUCCEEDS** (Optional, match) -> `X = 10`.

* **Occurs Check (Infinite Loop Prevention):** Unification **fails** if it attempts to bind a variable to a structure that contains that same variable.
    * `unify(X, [X])` **fails**.
    * `unify(Y, {a: X, b: Y})` **fails**.

---

## Key Components

* **`unify.js`**: Implements the core `unify(a, b, bindings)` algorithm and its helpers.
    * `unify.resolve`: Finds the underlying value of a (potentially) bound variable.
    * `unify.ground`: Rebuilds a data structure, replacing all variables with their bound values.
    * `unify.isGround`: Checks if a term contains any unbound variables.
    * `unify.symbols`: Finds all unique variables within a term.

* **`ArrayPattern.js`**: A custom class that implements logic for **flexible** array matching, including support for `...spread` and handling length mismatches when `Value` is present.

* **`ObjectPattern.js`**: A custom class that implements logic for **flexible** object matching, including support for `...spread` and handling missing keys when `Value` is present.

* **`Value.js`**: A wrapper class that implements the "soft" (optional) and "hard" (required) default value semantics for destructuring.