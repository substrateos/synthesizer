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
  * **Arithmetic & Comparison**: Perform computations by wrapping expressions in `Logic.js()` (e.g., `Sum = Logic.js(A + B)`). Use standard JS comparison operators (`>=`, `<`, `===`) as goals.
  * **Expressions**: Use **`Logic.js()`** for arbitrary JavaScript (e.g., `FullName = Logic.js(First + " " + Last)`).

### Lexical Scoping & Higher-Order Logic

  * **Nested Rules**: Rules can be defined inside other rules to create logical namespaces.
  * **Predicate Shadowing**: A nested rule "shadows" any global rule of the same name. The engine will try the local (inner) rule first.
  * **Fallback on Backtracking**: If a local shadowed rule fails (or after it succeeds and the user requests more solutions), the engine will backtrack and try the outer (global) rule.
  * **Read-Only Closures**: A nested rule has read-only access to the variables declared in its parent's scope, allowing for implicit context.
  * **Dynamic Subgoals**: A variable can be used as a predicate name, allowing for the creation of higher-order, generic predicates (e.g., `map(List, Predicate)`).

### Control Flow & Built-ins

  * **Negation as Failure (`!`)**: The `!` operator can be used on a subgoal. The goal succeeds only if the negated sub-goal fails to find any solutions.
  * **`Logic.js()`**: Evaluate arbitrary JavaScript expressions within a rule body, resolving logic variables before execution. In logic.solveAsync, this built-in can transparently handle expressions that return a Promise.
  * **`Logic.is_ground`**: Succeeds if the given term contains no unbound logic variables.
  * **`Logic.findall`**: A built-in predicate to collect all solutions for a sub-goal into a single list.

### Execution Model
  * **Dual Sync/Async API**:
    * `logic.solve`: For **synchronous** programs. All queries return a standard Iterator. You can collect results with `[...query]`. The engine will **throw an error** if `Logic.js()` returns a `Promise`.
    * `logic.solveAsync`: For **asynchronous** programs. This tag allows `Logic.js()` to handle `Promise` results. All queries return an `AsyncIterator`. You must use `for await...of` or a helper (like `logic.all()`) to collect results.
  * **Ahead-of-Time (AOT) Transpilation**: The `solve` or `solveAsync` tag transpiles the logic program into highly optimized JavaScript sync generators *once*.
  * **Coroutine-based Runtime**: A minimal, efficient "trampoline" solver executes the generated code, a fast sync loop (`solveSync`) and an async-capable loop (`solveAsync`).
  * **Pluggable Schedulers**: The search strategy is configurable at query time. The default is **Depth-First Search (DFS)**, and **Breadth-First Search (BFS)** is also available.

-----

## Example Usage

You define your program with a `logic.solve` tagged template. This transpiles your rules and gives you back an object of queryable predicates.

Let's define a few simple facts about students:

```javascript
// Define the program. This happens once.
let { student } = logic.solve`
    // Facts are function declarations with default values.
    function student(id=101, name='Alyssa P. Hacker') {}
    function student(id=102, name='Ben Bitdiddle') {}
    function student(id=103, name='Lem E. Tweakit') {}
`;

// --- Querying ---

// 1. Create symbolic variables for your query.
let { Name, ID } = logic.vars();

// 2. Run queries by calling the predicate functions.

// Query 1: Find a specific student by ID.
// This returns an iterator, so we use [...] to get all results.
let result = [...student(101, Name)];
console.log(result);
//> [ { Name: 'Alyssa P. Hacker' } ]

// Query 2: Find a specific student by name.
result = [...student(ID, 'Ben Bitdiddle')];
console.log(result);
//> [ { ID: 102 } ]

// Query 3: Find all students.
// The engine will backtrack to find every matching fact.
result = [...student(ID, Name)];
console.log(result);
//> [ 
//>   { ID: 101, Name: 'Alyssa P. Hacker' },
//>   { ID: 102, Name: 'Ben Bitdiddle' },
//>   { ID: 103, Name: 'Lem E. Tweakit' } 
//> ]
```

-----

## Feature Examples

All the following examples will build on a single "University" database, using classic MIT courses and students to show how features combine.

#### 1. Facts, Rules, and Recursion

First, let's define data (**facts**) and logic (**rules**). The `all_prereqs` rule is recursive, allowing it to find dependency chains of any length.

```javascript
let { prereq, all_prereqs } = logic.solve`
    // --- Facts ---
    // prereq(Course, Requires)
    function prereq(course='8.02', requires='8.01') {}
    function prereq(course='8.01', requires='18.01') {}
    function prereq(course='6.001', requires='18.01') {}

    // --- Rules ---
    // Rule 1 (Base Case): 
    // A Prereq is required if there is a direct fact.
    function all_prereqs(Course, Prereq) {
        prereq(Course, Prereq);
    }
    
    // Rule 2 (Recursive Step): 
    // A Prereq is also required if it's a prereq for another prereq.
    function all_prereqs(Course, Prereq) {
        var M; // An intermediate course
        prereq(Course, M);
        all_prereqs(M, Prereq); 
    }
`;

// Query: Find all prerequisites for 8.02 (Physics II)
let { P } = logic.vars();
console.log([...all_prereqs('8.02', P)]);
//> [ { P: '8.01' }, { P: '18.01' } ]
```

#### 2. Array Destructuring

Use JavaScript's `[H, ...T]` (head/tail) syntax to write recursive rules that operate on lists. Let's define the classic `member` predicate.

```javascript
let { member } = logic.solve`
    // Rule 1 (Base Case):
    // An Item is a member of a list if it is the Head of the list.
    // See "Caveats" section for why we use H=Item.
    function member(Item, [H=Item, ..._]) {}
    
    // Rule 2 (Recursive Step):
    // An Item is a member if it's in the Rest of the list.
    function member(Item, [_    , ...Rest]) {
        member(Item, Rest); 
    }
`;

// Query: Find all members of Alyssa's course list.
let { X } = logic.vars();
let alyssas_courses = ['8.02', '18.01', '6.001'];
console.log([...member(X, alyssas_courses)]);
//> [ { X: '8.02' }, { X: '18.01' }, { X: '6.001' } ]
```

#### 3. Object Destructuring

Use object destructuring in a rule's head to match and extract properties from native JavaScript objects.

```javascript
let { get_name } = logic.solve`
    // This rule matches any object that has a 'name' property.
    // 1. {name: Name, ..._} Binds the 'name' property to `Name`.
    // 2. Result=Name Unifies the `Result` argument with `Name`.
    function get_name({name: Name, ..._}, Result=Name) {}
`;

// Query: Get the name from a JS object.
let alyssa = { id: 101, name: 'Alyssa P. Hacker', major: 'EECS' };
let { N } = logic.vars();
console.log([...get_name(alyssa, N)]);
//> [ { N: 'Alyssa P. Hacker' } ]
```

#### 4. Comparison

Use standard JavaScript comparison operators (`>=`, `<`, `===`, etc.) as logical goals. A comparison acts as a "constraint" that can either succeed or fail.

```javascript
let { course, is_high_workload } = logic.solve`
    // --- Facts ---
    // course(ID, Title, Hours)
    function course(id='6.001', title='SICP', hours=15) {}
    function course(id='8.01', title='Physics I', hours=12) {}
    function course(id='18.01', title='Calculus I', hours=10) {}

    // --- Rules ---
    // A "high workload" course is one that requires
    // 12 or more hours per week.
    function is_high_workload(CourseID) {
        var H;
        course(CourseID, _, H); // Find the hours (H) for the course
        H >= 12;                // Comparison goal succeeds or fails
    }
`;

// Query: Find all high-workload courses.
let { ID } = logic.vars();
console.log([...is_high_workload(ID)]);
//> [ { ID: '6.001' }, { ID: '8.01' } ]
```

#### 5. `Logic.js()` for Arithmetic

Perform any JavaScript calculation by wrapping it in `Logic.js()`. The engine solves for variables *first*, then executes the JS expression.

```javascript
let { course, total_hours } = logic.solve`
    // --- Facts ---
    function course(id='6.001', title='SICP', hours=15) {}
    function course(id='8.01', title='Physics I', hours=12) {}
    function course(id='18.01', title='Calculus I', hours=10) {}

    // --- Rules ---
    // Rule 1 (Base Case): Total hours for an empty schedule is 0.
    function total_hours(list=[], total=0) {}

    // Rule 2 (Recursive Step):
    function total_hours([H, ...T], Total) {
        var H_Hours; // Hours for the head course
        var T_Hours; // Hours for the tail (rest)
        
        course(H, _, H_Hours);   // 1. Find hours for the Head
        total_hours(T, T_Hours); // 2. Recursively find hours for the Tail
        
        // 3. Unify Total with the JS calculation
        Total = Logic.js(H_Hours + T_Hours);
    }
`;

// Query: Calculate total hours for Alyssa's schedule
let { H } = logic.vars();
let alyssas_schedule = ['6.001', '8.01']; // 15 + 12
console.log([...total_hours(alyssas_schedule, H)]);
//> [ { H: 27 } ]
```

#### 6. `Logic.js()` for Expressions

`Logic.js()` isn't just for math. It's for *any* JS expression, like string manipulation.

```javascript
let { get_handle } = logic.solve`
    // This rule generates a username "handle" from a full name.
    function get_handle(FullName, Handle) {
        // The engine passes the value of 'FullName'
        // into the JavaScript expression.
        Handle = Logic.js(
            FullName.split(' ')[0].toLowerCase()
        );
    }
`;

// Query: Find the handle for "Alyssa P. Hacker"
let { Handle } = logic.vars();
console.log([...get_handle('Alyssa P. Hacker', Handle)]);
//> [ { Handle: 'alyssa' } ]
```

#### 7. `Logic.findall`

The `Logic.findall` built-in collects all possible solutions for a sub-goal into a single list. Its power comes from the `Template` argument (the 1st arg), which lets you format the results.

```javascript
let { course, get_course_catalog } = logic.solve`
    // --- Facts ---
    function course(id='6.001', title='SICP', hours=15) {}
    function course(id='8.01', title='Physics I', hours=12) {}
    function course(id='18.01', title='Calculus I', hours=10) {}

    // --- Rules ---
    // This rule uses findall to get all courses and
    // format them into a list of objects.
    function get_course_catalog(Catalog) {
        var ID, Title; // Template variables
        
        // Logic.findall(Template, Goal, ResultList)
        Logic.findall(
            {id: ID, title: Title},  // 1. Template: Build this object
            course(ID, Title, _),  // 2. Goal: For each course...
            Catalog                // 3. ResultList: Put them in Catalog
        );
    }
`;

// Query: Get the entire course catalog.
let { C } = logic.vars();
let [catalog] = get_course_catalog(C);
console.log(catalog.C);
//> [
//>   { id: '6.001', title: 'SICP' },
//>   { id: '8.01', title: 'Physics I' },
//>   { id: '18.01', title: 'Calculus I' }
//> ]
```

#### 8. Negation as Failure (`!`)

The `!` operator succeeds only if its goal *fails* to find any solutions. This is perfect for finding entities defined by an *absence* of a relationship.

Let's find "leaf" courses—courses that are *not* prerequisites for any other course.

```javascript
let { course, prereq, is_prereq_for_another, 
      is_leaf_course } = logic.solve`
    
    // --- Facts ---
    function course(id='6.001', title='SICP', hours=15) {}
    function course(id='8.01', title='Physics I', hours=12) {}
    function course(id='18.01', title='Calculus I', hours=10) {}
    function course(id='8.02', title='Physics II', hours=12) {}

    function prereq(course='8.02', requires='8.01') {}
    function prereq(course='8.01', requires='18.01') {}
    // Note: '6.001' and '8.02' are not required by any course

    // --- Rules ---
    // Helper rule: succeeds if `CourseID` is a prereq for *any* other course.
    function is_prereq_for_another(CourseID) {
        prereq(_, CourseID); // `_` is an anonymous "don't care" variable
    }

    // Main rule: A course is a "leaf course" if...
    function is_leaf_course(CourseID) {
        course(CourseID, _, _);           // 1. It is a course, AND
        !is_prereq_for_another(CourseID); // 2. It is *not* a prereq for another.
    }
`;

// Query: Find all leaf courses.
console.log([...is_leaf_course(ID)]);
//> [ { ID: '6.001' }, { ID: '8.02' } ]
```

#### 9. Lexical Scoping and Shadowing

You can define rules inside other rules. This creates a "local" version of a rule that *shadows* the global one for that specific query. When the shadowed rule is called, the engine tries the local rule first, then falls back to the global rule on backtracking.

```javascript
let { student, get_title, get_student_title } = logic.solve`
    // --- Facts ---
    function student(id=101, name='Alyssa P. Hacker') {}
    function student(id=102, name='Ben Bitdiddle') {}

    // --- Global Rule (The Default) ---
    // By default, every student's title is 'Student'.
    function get_title(StudentID, Title) {
        student(StudentID, _);
        Title = 'Student';
    }
    
    // --- Wrapper Rule (The "Shadow") ---
    // This rule defines a *local* version of get_title.
    function get_student_title(QueryID, Status) {
    
        // 1. This local rule shadows the global 'get_title'.
        function get_title(id=101, title='Lisp Wizard') {}
        
        // 2. This call is made *inside* the wrapper, so
        //    it sees the local rule first.
        get_title(QueryID, Status);
    }
`;

// Query 1: Get title for Alyssa (ID 101)
// Finds local rule first, then global rule on backtracking.
console.log([...get_student_title(101, S)]);
//> [ { S: 'Lisp Wizard' }, { S: 'Student' } ]

// Query 2: Get title for Ben (ID 102)
// Fails local rule, but finds global rule on backtracking.
console.log([...get_student_title(102, S)]);
//> [ { S: 'Student' } ]
```

#### 10. Dynamic Subgoals (Higher-Order Logic)

You can pass a predicate as an argument to another rule. The engine will treat the variable as a goal to be called. This allows you to create powerful, generic, higher-order rules like `map`.

```javascript
let { double, map } = logic.solve`
    // --- "Operation" Rule ---
    function double(In, Out) {
        Out = Logic.js(In * 2);
    }
    
    // --- Dynamic Rule (map) ---
    // Base Case: Mapping an empty list is an empty list.
    function map(list=[], operation=_, result=[]) {}
    
    // Recursive Step: Apply 'Operation' to the Head
    // and recursively 'map' the Rest.
    function map([H_In, ...T_In], Operation, [H_Out, ...T_Out]) {
        // This is the dynamic subgoal.
        Operation(H_In, H_Out); // Call the predicate in 'Operation'
        map(T_In, Operation, T_Out);
    }
`;

// Query: Apply the 'double' operation to the list.
let { R } = logic.vars();
console.log([...map([10, 20, 30], double, R)]);
//> [ { R: [ 20, 40, 60 ] } ]
```

#### 11. `Logic.is_ground`

This built-in goal succeeds if a term is "ground" (i.e., it contains no unbound logic variables).

```javascript
let { validate } = logic.solve`
    // This rule only succeeds if 'Term' is fully bound.
    function validate(Term) {
        Logic.is_ground(Term);
    }
`;

let { X } = logic.vars();

// Query 1: Term is ground (a concrete string).
console.log([...validate('6.001')]);
//> [ {} ] (Succeeds)

// Query 2: Term is an unbound variable.
console.log([...validate(X)]);
//> [] (Fails)
```

#### 12. `logic.solveAsync` (Asynchronous)

Use `logic.solveAsync` when you need to perform I/O or handle `Promise`-returning functions. The engine will transparently `await` any `Promise` returned from `Logic.js()`.

```javascript
// A mock async function in our JavaScript code
async function mock_api_call(name) {
    return new Promise(resolve => {
        setTimeout(() => {
            if (name === 'Alyssa P. Hacker') {
                resolve({ id: 101, gpa: 3.9 });
            } else {
                resolve({ id: 0, gpa: 0.0 });
            }
        }, 50);
    });
}

// Note: We use `logic.solveAsync` here
let { fetch_student_info } = logic.solveAsync`
    
    function fetch_student_info(Name, Info) {
        // The engine will 'await' the promise
        // returned by 'mock_api_call(Name)'.
        Info = Logic.js( mock_api_call(Name) );
    }
`;

// Query: Fetch Alyssa's info.
// We must use `await` or `for await...of` to get results.
let { Info } = logic.vars();
console.log(await logic.all( fetch_student_info('Alyssa P. Hacker', Info) ));
//> [ { Info: { id: 101, gpa: 3.9 } } ]
```

-----

### Prolog Syntax vs. JS Logic Syntax

For those familiar with Prolog, here is a quick comparison of the syntax:

| Concept | Prolog Syntax | JS Logic Syntax |
| :--- | :--- | :--- |
| **Rule** | `head :- body.` | `function head() { body; }` |
| **Fact** | `fact(a, b).` | `function fact(a='a', b='b') {}` |
| **Conjunction (AND)** | `goal1, goal2.` | `goal1; goal2;` |
| **Disjunction (OR)** | `goal1 ; goal2.` | (multiple functions) |
| **List Destructuring** | `[H\|T]` | `[H, ...T]` |
| **Negation** | `\+ goal.` | `!goal;` |
| **Arithmetic** | `X is Y + Z.` | `X = Logic.js(Y + Z);` |
| **Comparison** | `X > Y.` | `X > Y;` |
| **Unification** | `X = Y.` | `X = Y;` |
| **Anonymous Var** | `_` | `_` (as a variable) |
| **Find All** | `findall(T, G, L).` | `Logic.findall(T, G, L);` |

-----

## Caveats

### A Note on Unification in Rule Heads

Because this language is a direct superset of JavaScript, you must follow JavaScript's syntax rules for function parameters: all variable names in a parameter list must be unique.

**The Problem: Invalid JavaScript Syntax**

You cannot use the same variable name twice in a function signature. This means a pattern common in other logic languages is invalid JavaScript:

```javascript
// This is NOT valid JavaScript
// It will throw a "SyntaxError: Argument name clash"
function member(Item, [Item, ..._]) {
    // ...
}
```


**The Solution: Unify with Default Values**

The most concise and idiomatic solution is to use JavaScript's default value syntax. This performs the unification directly in the rule's head.

```javascript
// This is the correct and recommended pattern
function member(Item, [H=Item, ..._]) {
    // The body is empty!
}

function member(Item, [_  , ...Rest]) {
    member(Item, Rest);
}
```

This works because:

1.  The syntax `[H=Item, ..._]` is valid JavaScript. `H` is a new, unique variable.
2.  The default value assignment (`H=Item`) is automatically compiled into a unification goal: `H = Item`.
