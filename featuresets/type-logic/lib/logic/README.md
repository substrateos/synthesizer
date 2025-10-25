# A Logic Language for JavaScript

A declarative logic language for JavaScript, transpiled to high-performance, debuggable coroutines (generators).

-----

## Purpose

This language is for building rule engines, expert systems, planners, and state-management tools where declarative logic is a more natural fit than imperative code.

It performs optimizations ahead-of-time during transpilation. This approach produces clean, efficient JavaScript that's easy to debug and runs on a minimal runtime solver.

-----

## Language Features

This language is a hybrid that combines the declarative power of logic programming with the familiar lexical environment of JavaScript.

### Core Logic Programming

  * **Facts & Rules**: Define knowledge using standard JS function declarations. Rules are named function declarations. Facts are simply rules with an empty body and default values.
  * **Unification (`=`)**: Use the assignment operator for pattern matching and variable binding, both in rule heads and bodies.
  * **Backtracking**: The engine automatically explores all possible proof paths to find all solutions for a query.
  * **Recursion**: Rules can call themselves, enabling complex logic for tasks like graph traversal or list processing.

### Deep JS Syntax Integration

  * **Native Data Types**: Unification works seamlessly with JavaScript primitives (strings, numbers, booleans) and structures (arrays, objects).
  * **Destructuring**:
    * **Rule Heads (LHS):** Use standard JavaScript destructuring patterns directly in rule heads (`function rule([H,...T], {a, b: B, ...R})`). Syntax strictly follows JavaScript rules: the **rest element (`...`) must be the *last*** element/property.
    * **Rule Bodies (RHS Assignments):** Full JavaScript **spread syntax is supported** for constructing arrays and objects within assignments (`Result = [A, ...Mid, Z]`, `Result = {...Defaults, ...Overrides}`). Multiple spreads in any position are allowed.
  * **Arithmetic & Comparison**: Perform computations by wrapping expressions in `Number()` (e.g., `Sum = Number(A + B)`). Use standard JS comparison operators (`>=`, `<`, `===`) as goals.
  * **Expressions**: Use **`Logic.js()`** for arbitrary JavaScript (e.g., `FullName = Logic.js(First + " " + Last)`).

### Lexical Scoping & Higher-Order Logic

  * **Nested Rules**: Rules can be defined inside other rules to create logical namespaces.
  * **Predicate Shadowing**: A nested rule "shadows" any global rule of the same name. The engine will try the local (inner) rule first.
  * **Fallback on Backtracking**: If a local shadowed rule fails (or after it succeeds and the user requests more solutions), the engine will backtrack and try the outer (global) rule.
  * **Read-Only Closures**: A nested rule has read-only access to the variables declared in its parent's scope, allowing for implicit context.
  * **Dynamic Subgoals**: A variable can be used as a predicate name, allowing for the creation of higher-order, generic predicates (e.g., `map(List, Predicate)`).

### Control Flow & Built-ins

  * **Negation as Failure (`!`)**: The `!` operator can be used on a subgoal. The goal succeeds only if the negated sub-goal fails to find any solutions.
  * **`Logic.js()`**: Evaluate arbitrary JavaScript expressions within a rule body, resolving logic variables before execution.
  * **`Logic.is_ground`**: Succeeds if the given term contains no unbound logic variables.
  * **`Logic.findall`**: A built-in predicate to collect all solutions for a sub-goal into a single list.

### Execution Model

  * **Ahead-of-Time (AOT) Transpilation**: The `solve` tag transpiles the logic program into highly optimized JavaScript generators *once*.
  * **Coroutine-based Runtime**: A minimal, efficient "trampoline" solver executes the generated code.
  * **Pluggable Schedulers**: The search strategy is configurable at query time. The default is **Depth-First Search (DFS)**, and **Breadth-First Search (BFS)** is also available.

-----

## Example Usage

You define your program with a `solve` tagged template and can immediately query the predicates you've defined.

```javascript

// Define the program. The transpilation happens only once.
const { planet, gas_giant } = logic.solve`
    // Facts are function declarations with default parameters and an empty body.
    function planet(name='mercury', type='rocky') {}
    function planet(name='venus', type='rocky') {}
    function planet(name='jupiter', type='gas') {}
    function planet(name='saturn', type='gas') {}

    // Rules are standard JavaScript function declarations.
    // A planet X is a gas_giant if it is a planet of type 'gas'.
    function gas_giant(X) {
        planet(X, 'gas');
    }
`;


// Create symbolic variables for use in queries.
const { P } = logic.vars();

// Run queries by calling the destructured functions.
const allGasGiants = [...gas_giant(P)];

console.log(allGasGiants);
//> [ { P: 'jupiter' }, { P: 'saturn' } ]

// The Query object is also an iterator.
console.log('Rocky planets:');
for (const solution of planet(P, 'rocky')) {
    console.log(solution);
}
//> Rocky planets:
//> { P: 'mercury' }
//> { P: 'venus' }
```

-----

## Feature Examples

Each example below is a small, complete program. You can run them individually to see how each feature works.

### Facts, Rules, and Recursion

This example shows how to define simple data (facts) and combine them with rules. The `path` rule is recursive, which allows it to find paths of any length.

```javascript
const { path } = logic.solve`
    // Facts: Define a simple graph using function declarations
    function edge(from='a', to='b') {}
    function edge(from='b', to='c') {}
    function edge(from='a', to='d') {}

    // Rule 1 (Base Case): A path exists if there is a direct edge.
    function path(X, Y) {
        edge(X, Y);
    }
    // Rule 2 (Recursive Step): A path exists from X to Z
    // if there is an edge from X to Y, and a path from Y to Z.
    function path(X, Z) {
        var Y;
        edge(X, Y);
        path(Y, Z);
    }
`;

// Query: Find all nodes reachable from 'a'
const { X } = logic.vars();
const results = [...path('a', X)];

console.log(results);
//> [ { X: 'b' }, { X: 'd' }, { X: 'c' } ]
```

-----

### Array Destructuring

This shows how to use JavaScript's array destructuring syntax in a rule's head for powerful and immediate pattern matching. The `Head=H` syntax is transpiled into a unification goal.

```javascript
const { list_head } = logic.solve`
    // Array destructuring: Binds H to the first element
    // and unifies the 'Head' parameter with H.
    function list_head([H, ..._], Head=H) {}
`;

const { H } = logic.vars();

// Query: Get the head of a list
console.log([...list_head([10, 20, 30], H)]);
//> [ { H: 10 } ]
```

-----

### Object Destructuring

This demonstrates using object destructuring in a rule's head to match and extract properties from a JavaScript object. The `Result=Name` syntax is transpiled into a unification goal.

```javascript
const { person_name } = logic.solve`
    // 'name: Name' aliases the property to an internal variable 'Name'.
    // 'Result=Name' is transpiled into a unification goal.
    function person_name({name: Name, age: _}, Result=Name) {}
`;

const { X } = logic.vars();

// Query: Get the 'name' from an object
const person = { name: 'alice', age: 30, location: 'UK' };
console.log([...person_name(person, X)]);
//> [ { X: 'alice' } ]
```

-----

### Arithmetic

This demonstrates how to perform calculations. Arithmetic expressions are wrapped in the `Number()` function to signal the engine to compute the result and unify it.

```javascript
const { add } = logic.solve`
    // Wrap arithmetic in Number() to unify the result
    function add(A, B, Sum) {
        Sum = Number(A + B);
    }
`;

const { Sum } = logic.vars();

// Query: Calculate a sum
console.log([...add(5, 4, Sum)]);
//> [ { Sum: 9 } ]
```

-----

### Comparison

This shows how standard JavaScript comparison operators (`>=`, `<`, `===`, etc.) can be used as goals. A comparison acts as a rule that can either succeed or fail.

```javascript
const { is_adult } = logic.solve`
    // This rule succeeds only if the comparison is true
    function is_adult(Age) {
        Age >= 18;
    }
`;

// Query 1: Succeeds, returning one (empty) solution
console.log([...is_adult(20)]);
//> [ {} ]

// Query 2: Fails, returning zero solutions
console.log([...is_adult(10)]);
//> []
```

-----

This shows how to use Logic.js() to run any JavaScript expression. The engine resolves logic variables (like First and Last) to their values before executing the expression.

```javascript
const { full_name } = logic.solve`
    // Logic.js() resolves logic vars, then runs the JS expression
    function full_name(First, Last, Full) {
        Full = Logic.js(First + " " + Last);
    }
`;

const { F } = logic.vars();

// Query: Compute a full name
console.log([...full_name('John', 'Doe', F)]);
//> [ { F: 'John Doe' } ]
```

-----

### Lexical Scoping and Shadowing

This example shows how nested rules work. The inner `status` rule "shadows" the outer one. The engine tries the local rule first, then backtracks to find the global rule.

```javascript
const { test_shadowing } = logic.solve`
    // The global 'status' rule
    function status(S) {
        S = 'global';
    }
    
    function test_shadowing(S) {
        // This local 'status' rule shadows the global one
        function status(S) {
            S = 'local';
        }
        
        // This call will find the 'local' rule first.
        // On backtracking, it will find the 'global' rule.
        status(S);
    }
`;

const { S } = logic.vars();

// Query: Find all solutions for 'status(S)'
console.log([...test_shadowing(S)]);
//> [ { S: 'local' }, { S: 'global' } ]
```

-----

### Dynamic Subgoals (Higher-Order Logic)
This demonstrates passing a predicate as a variable (P). This allows you to create generic, higher-order rules like map that apply an operation to a list.

```javascript
const { map, increment } = logic.solve`
    // A simple operation we want to apply
    function increment(N, R) {
        R = Number(N + 1);
    }
    
    // A generic 'map' rule
    // 'P' is a variable that will hold a predicate
    function map(inp=[], out=[], p=_) {}
    function map([H_in, ...T_in], [H_out, ...T_out], P) {
        P(H_in, H_out); // Call the dynamic predicate
        map(T_in, T_out, P);
    }
`;

const { List } = logic.vars();

// Query: Pass the 'increment' predicate as an argument
results = [...map([10, 20], List, increment)]
console.log(results);
//> [ { List: [11, 21] } ]
```

------

### Negation as Failure (`!`)

This shows how to use the `!` operator to negate a goal. The `can_vote(Age)` goal will only succeed if the `is_minor(Age)` sub-goal *fails*.

```javascript
const { can_vote } = logic.solve`
    // Fact: 15 is a minor
    function is_minor(age=15) {}
    
    function can_vote(Age) {
        !is_minor(Age); // Negation: "is not minor"
    }
`;

// Query 1: Fails, because is_minor(15) succeeds
console.log([...can_vote(15)]);
//> []

// Query 2: Succeeds, because is_minor(20) fails
console.log([...can_vote(20)]);
//> [ {} ]
```

-----

### `Logic.findall`

This shows how to use `Logic.findall` to collect all possible solutions for a sub-goal into a single list.

```javascript
const { get_all_items } = logic.solve`
    // Facts: Items in different groups
    function item(group='a', id=1) {}
    function item(group='a', id=2) {}
    function item(group='b', id=3) {}

    // Rule: Get all items for a group
    function get_all_items(Group, List) {
        var I;
        // Logic.findall(Template, Goal, ResultList)
        Logic.findall(I, item(Group, I), List);
    }
`;

const { List } = logic.vars();

// Query: Find all items in group 'a'
console.log([...get_all_items('a', List)]);
//> [ { List: [1, 2] } ]
```
