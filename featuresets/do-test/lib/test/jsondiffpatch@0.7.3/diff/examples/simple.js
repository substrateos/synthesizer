export const attributes = {
    type: "example/json"
}

export default {
    description: "simple delta",
    params: [{
        a: {
            state: 'Florida',
            capital: 'St. Augustine',
        },
        b: {
            name: 'Florida',
            capital: 'Tallahassee',
        },
    }],
    returns: {"state":["Florida",0,0],"capital":["St. Augustine","Tallahassee"],"name":["Florida"]}
}
