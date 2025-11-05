export const attributes = {
    type: "example/json"
}

const X = Symbol('X')

export default [{
    description: "Logic modules can perform their own imports",
    method: "findall",
    params: [X, [X]],
    returns: [100],
}]
