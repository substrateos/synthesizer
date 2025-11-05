import jsonpointer from "@/lib/openapi/jsonpointer.js"

export default ({
    schema,
    operationSchema,
    bodyInput,
    requestType,
    demandStatus,

    responseType,
    outputsFromResponse,
}) => {
    const resolve = s => s?.["$ref"] ? jsonpointer.get(schema, s["$ref"]) : s
    const propertiesOf = o => {
        o = resolve(o)
        if (o.type !== 'object') {
            return []
        }
        const { allOf, oneOf } = o
        return Array.isArray(allOf)
            ? allOf.flatMap(o2 => propertiesOf(o2))
            : Array.isArray(oneOf)
                ? propertiesOf(oneOf.items.map(item => resolve(item))[0]) // HACK pick the first option and just use that
                : Object.entries(o.properties || {}).map(([name, property]) => [name, resolve(property), { required: o.required?.includes(name) }])
    }

    const fieldsForSchema = (...o) => {
        const v = fieldsForSchema0(...o)
        return v
    }
    const fieldsForSchemaProperties = (schema, { prefix } = {}) => (
        schema?.type === 'object'
            ? propertiesOf(schema).flatMap(
                ([fieldName, fieldSchema, { required }]) => fieldsForSchema(fieldSchema, {
                    name: prefix ? `${prefix}.${fieldName}` : fieldName,
                    required,
                }))
            : schema?.type === 'array'
                ? fieldsForSchema(resolve(schema.items), {
                    name: prefix ? `${prefix}[]` : '[]',
                })
                : []
    )
    const fieldsForSchema0 = (schema, { name, description, required } = {}) => [
        {
            name,
            description: description ?? schema.description,
            isOptional: !required,
            type: {
                name: (schema?.type === 'string' && schema?.format === 'binary')
                    ? 'blob'
                    : schema?.type,
            },
        },
        ...fieldsForSchemaProperties(schema, { prefix: name })
    ]


    const outputFieldsFromRef = (name, responseSchema, ref) => {
        const compiled = jsonpointer.compile(ref)
        const refSchema = compiled.compiled.slice(1).reduce(
            (acc, key) => resolve(acc.properties?.[key]), responseSchema)
        return fieldsForSchema(refSchema, {
            name,
            description,
        })
    }
    const outputFieldsFromContentSchema = (responseContentSchema) =>
        propertiesOf(responseContentSchema).flatMap(
            ([name, prop, { required }]) => fieldsForSchema(prop, { name, description: prop.description, required })
        )

    const description = [
        operationSchema.summary,
        operationSchema.description,
    ].filter(_ => _).join("\n")

    const signature = {
        description,
        inputs: [],
        outputs: [],
    }

    let responseSchema = resolve(operationSchema?.responses?.[String(demandStatus)])
    const unresolvedResponseContentSchema = responseSchema.content?.[responseType]?.schema
    if (!unresolvedResponseContentSchema) {
        throw new Error(`no response content schema for type ${responseType}`)
    }
    const responseContentSchema = resolve(unresolvedResponseContentSchema)

    if (outputsFromResponse) {
        const responseSchemaForOutputs = {
            ...responseSchema,
            properties: {
                body: responseContentSchema,
            },
        }

        for (const [outputKey, responseRef] of Object.entries(outputsFromResponse)) {
            signature.outputs.push(...outputFieldsFromRef(outputKey, responseSchemaForOutputs, responseRef))
        }
    } else {
        signature.outputs.push(...outputFieldsFromContentSchema(responseContentSchema))
    }

    if (operationSchema.parameters) {
        for (const parameter of operationSchema.parameters) {
            signature.inputs.push(...fieldsForSchema(parameter.schema, parameter))
        }
    }

    if (operationSchema.requestBody) {
        const requestBody = resolve(operationSchema.requestBody)
        const requestBodyContent = requestBody.content[requestType]
        const requestSchema = resolve(requestBodyContent?.schema)

        if (!requestSchema) {
            throw new Error(`no request body content schema for type ${requestType}`)
        }

        if (bodyInput === '') {
            signature.inputs.push(...fieldsForSchemaProperties(requestSchema, { prefix: '' }))
        } else {
            signature.inputs.push(...fieldsForSchema(requestSchema, {
                name: bodyInput,
                description: requestBodyContent.description,
                required: requestBodyContent.required,
            }))
        }
    }

    return signature
}
