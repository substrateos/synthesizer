export const attributes = {
  type: "example/json"
}

export default [{
    "description": "Tests that captured lexical scope is from the definition site, not the call site.",
    "params": [{
        "source": `
        // Rule 1: Defines a local predicate 'local_add' and assigns it to P.
        // 'local_add' closes over its parent's 'A', which is 10.
        function definer(P) {
            var A = 10;
        
            function local_add(X, Y) {
                Y = Number(X + A); // This 'A' must be 10.
            }
            
            // Assign the predicate to the output variable P.
            // This should capture the scope { A: 10 }.
            P = local_add;
        }
        
        // Rule 2: Receives a predicate P and calls it.
        // This rule defines its *own* 'A' (A = 99) to act as a decoy.
        // This 'A' must be ignored by P.
        function caller(P, Out) {
            var A = 99; // Decoy 'A'.
            P(5, Out);
        }
        
        // Rule 3: The main test entry point.
        // It gets P from 'definer' and passes it to 'caller'.
        function test_nested_lexical_call(FinalOut) {
            var Predicate;
            
            definer(Predicate);
            caller(Predicate, FinalOut);
        }
        `,
        "queries": {
            "Should use definition-site scope, not call-site scope": {
                "test_nested_lexical_call": [{
                    "$var": "Result"
                }]
            }
        }
    }],
    "debugKeys": ["generatedSource", "traces"],
    "returns": {
        "solutions": {
            "Should use definition-site scope, not call-site scope": [{
                "Result": 15
            }]
        }
    }
}]