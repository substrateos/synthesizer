export default new Proxy({}, {
    get(_, prop) {
        return (strings, ...values) => {
            let source = strings[0];
            for (let i = 0; i < values.length; i++) {
                source += values[i] + strings[i + 1];
            }

            return { type: String(prop), source };
        }
    }
});
