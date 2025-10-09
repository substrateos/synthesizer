export default async function() {
    const {unit: {source}, workspace} = this
    const exante = workspace.save()

    let todo = workspace.has('chat/plan/todo') ? await workspace.get('chat/plan/todo') : []

    if (workspace.has('chat/plan/paused')) {
        const wasPaused = await workspace.get('chat/plan/paused')
        if (wasPaused) {
            await workspace.write({'chat/plan/paused': {source: 'false', type: 'json'}})
        }
    }

    // push plan
    let now = JSON.parse(source || "{}")
    if (now?.steps?.length) {
        todo = [...now.steps, ...todo]
        await workspace.write({'chat/plan/todo': {source: JSON.stringify(todo), type: 'json'}})
    }

    if (todo.length === 0) {
        return
    }

    const step = todo[0]
    todo = todo.slice(1)
    await workspace.write({
        'chat/plan/todo': {source: JSON.stringify(todo), type: 'json'},
        // (...should workspace always make the running source available?)
        'chat/plan/step': {source: JSON.stringify(step), type: 'json'},
    })

    let returned, caught
    try {
        console.log({step})
        returned = await workspace.eval(step)
    } catch (err) {
        caught = err
    }

    let past = workspace.has('chat/plan/past') ? await workspace.get('chat/plan/past') : []
    past = [...past, {step, returned, caught, exante, expost: workspace.save()}]
    await workspace.write({
        // (...should all runs be logged in plan/past?)
        'chat/plan/past': {source: JSON.stringify(past), type: 'json'},
    })

    if (caught) {
        throw caught
    }

    const nextTodo = workspace.has('chat/plan/todo') ? await workspace.get('chat/plan/todo') : []
    console.log({nextTodo})
    if (nextTodo.length === 0) {
        return returned
    }

    const shouldPause = workspace.has('chat/plan/paused') ? await workspace.get('chat/plan/paused') : false
    console.log({shouldPause})
    if (shouldPause) {
        return shouldPause
    }

    const continuedPlan = await workspace.eval({type: 'chat/plan/json', source: ``})
    console.log({continuedPlan})
    return continuedPlan
}
