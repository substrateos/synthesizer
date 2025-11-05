import jsonpointer from "@/lib/openapi/jsonpointer.js"

export const openapiGenerator = ({ schema, path, method, status, bodyInput, requestType, responseType, outputsFromResponse, errorsFromResponse }) => {
  const pathSchema = schema.paths[path]
  if (!pathSchema) {
    throw new Error(`path not present in schema: ${path}; valid paths are: ${JSON.stringify(Object.keys(schema.paths))}`)
  }

  const operationSchema = pathSchema[method]
  if (!operationSchema) {
    throw new Error(`method not present in schema: ${method}; valid methods are: ${JSON.stringify(Object.keys(pathSchema))}`)
  }

  const resolve = s => s?.["$ref"] ? jsonpointer.get(schema, s["$ref"]) : s

  const server = schema.servers[0]
  if (!server) {
    throw new Error(`server not present in schema`)
  }

  const url = `${server.url}${path}`

  if (status === undefined) {
    // default to the first status
    status = Object.keys(operationSchema?.responses || {})[0]
  }

  if (responseType === undefined) {
    responseType = "application/json"
  }

  let responseSchema = resolve(operationSchema?.responses?.[status])
  const unresolvedResponseContentSchema = responseSchema?.content?.[responseType]?.schema
  if (!unresolvedResponseContentSchema) {
    throw new Error(`no response content schema for type ${responseType}`)
  }
  const responseContentSchema = resolve(unresolvedResponseContentSchema)

  if (!outputsFromResponse && responseContentSchema.type !== 'object') {
    outputsFromResponse = {
      'content': '#/body',
    }
  }

  const pathInputs = []
  const queryInputs = []
  const baseRequest = {
    method,
    headers: {},
    url,
    query: {},
    path: {},
    body: undefined,
  }

  if (operationSchema.parameters) {
    for (const parameter of operationSchema.parameters) {
      const enumValue = parameter?.schema?.enum
      const staticValue = enumValue?.length === 1 ? enumValue[0] : undefined
      const defaultValue = parameter?.schema?.default ?? staticValue
      switch (parameter.in) {
        case 'path':
          if (defaultValue !== undefined) {
            baseRequest.path[parameter.name] = defaultValue
          }
          if (staticValue !== undefined) {
            continue
          }
          pathInputs.push(parameter.name)
          break
        case 'query':
          if (defaultValue !== undefined) {
            baseRequest.query[parameter.name] = defaultValue
          }
          if (staticValue !== undefined) {
            continue
          }
          queryInputs.push(parameter.name)
          break
        default:
          throw new Error(`unsupported .in value for parameter ${parameter.name}: ${parameter.in}; ${JSON.stringify(parameter)}`)
      }
    }
  }

  if (operationSchema.requestBody) {
    const requestBody = resolve(operationSchema.requestBody)
    // requestBody.required
    if (requestType === undefined) {
      requestType = Object.keys(requestBody.content)[0]
    }
    if (bodyInput === undefined) {
      bodyInput = (pathInputs.length > 0 || queryInputs > 0) ? 'payload' : ''
    }

    const requestBodyContent = requestBody.content[requestType]
    const requestSchema = resolve(requestBodyContent?.schema)

    if (!requestSchema) {
      throw new Error(`no request body content schema for type ${requestType}`)
    }
  }

return {
    baseRequest,
    pathInputs,
    queryInputs,
    bodyInput,
    requestType,
    demandStatus: status !== undefined ? +status : undefined,
    outputsFromResponse,
    errorsFromResponse,

    responseType,
    status,
    operationSchema,
    schema,
  }
}

const enumerateServiceOperations = function* (schema) {
  for (const path in schema.paths) {
    const pathSchema = schema.paths[path]
    for (const method in pathSchema) {
      const operationSchema = pathSchema[method]
      const operationID = operationSchema.operationId

      yield {
        operationID,
        path,
        method,
        operationSchema,
        schema,
      }
    }
  }
}

const functionFromOpenAPIOperation = ({ operation, outputsFromResponse, errorsFromResponse }) => {
  const { schema, operationID, path, method, operationSchema } = operation
  const status = Object.keys(operationSchema?.responses || {})[0]
  const statusSchema = operationSchema?.responses?.[status]
  const responseType = Object.keys(statusSchema?.content || {})[0]
  const responseContentSchema = statusSchema?.content?.[responseType]?.schema

  if (outputsFromResponse == null && responseContentSchema?.type === 'object') {
    const topLevelProperties = Object.keys(responseContentSchema?.properties)
    if (topLevelProperties.length === 1) {
      const topLevelPropertyName = topLevelProperties[0]
      const topLevelPropertyValue = responseContentSchema?.properties[topLevelPropertyName]
      if (topLevelPropertyValue.type === 'object') {
        outputsFromResponse = {}
        const path = `#/body/${topLevelPropertyName}`
        for (const k in topLevelPropertyValue.properties) {
          outputsFromResponse[k] = `${path}/${k}`
        }
      }
    }
  }

  const gen = openapiGenerator({ schema, path, method, responseType, outputsFromResponse, errorsFromResponse })
  return {
    source: JSON.stringify(gen),
    type: 'openapi-operation',
    internalName: operationID,
    // note that this might be a url template. so ... that's not great? maybe make url a function which accepts inputs?
    url: schema.servers[0].url + operation.path,
  }
}

export const enumerateServiceFunctions = (schema, operationSpecificOptions, operationIDPattern = /./) =>
  enumerateServiceOperations(schema).flatMap((operation) => {
    if (operationIDPattern.test(operation.operationID)) {
      try {
        const fn = functionFromOpenAPIOperation({
          operation,
          ...(operationSpecificOptions?.[operation.operationID] || {}),
        })
        return [fn]
      } catch (err) {
        console.warn(`could not create function from OpenAPI operation: "${operation.operationID}"`, err, {operation, schema})
      }
    }

    return []
  })
