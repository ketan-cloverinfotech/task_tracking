import { useEffect, useMemo, useRef, useState } from 'react'

const STORAGE_KEY = 'task-completion-tracker-v1'
const tabs = [
  { id: 'tasks', label: 'Add Tasks' },
  { id: 'report', label: 'Report' },
  { id: 'outlook', label: 'Outlook Copy' },
]

const sampleTasks = [
  { id: 1, title: 'Create repository', weight: 20, completed: true },
  { id: 2, title: 'Add remote repo to local', weight: 10, completed: true },
  { id: 3, title: 'Commit code', weight: 20, completed: true },
  { id: 4, title: 'Push code to repo', weight: 20, completed: false },
  { id: 5, title: 'Add workflow file', weight: 10, completed: false },
  { id: 6, title: 'Add branch protection rule', weight: 20, completed: false },
]

const defaultState = {
  projectName: 'Create GitHub Repo',
  ownerName: '',
  tasks: sampleTasks,
}

function emptyTask(id) {
  return {
    id,
    title: '',
    weight: 0,
    completed: false,
  }
}

function clampWeight(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  if (number < 0) return 0
  if (number > 100) return 100
  return number
}

function formatPercent(value) {
  if (Number.isInteger(value)) return `${value}%`
  return `${value.toFixed(2)}%`
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return defaultState

    const parsed = JSON.parse(saved)
    const tasks = Array.isArray(parsed?.tasks) && parsed.tasks.length > 0 ? parsed.tasks : sampleTasks

    return {
      projectName: typeof parsed?.projectName === 'string' ? parsed.projectName : defaultState.projectName,
      ownerName: typeof parsed?.ownerName === 'string' ? parsed.ownerName : '',
      tasks: tasks.map((task, index) => ({
        id: Number.isFinite(task?.id) ? task.id : index + 1,
        title: typeof task?.title === 'string' ? task.title : '',
        weight: clampWeight(task?.weight),
        completed: Boolean(task?.completed),
      })),
    }
  } catch {
    return defaultState
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState('tasks')
  const [projectName, setProjectName] = useState(() => loadState().projectName)
  const [ownerName, setOwnerName] = useState(() => loadState().ownerName)
  const [tasks, setTasks] = useState(() => loadState().tasks)
  const [copyStatus, setCopyStatus] = useState('')
  const [importError, setImportError] = useState('')
  const importRef = useRef(null)

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        projectName,
        ownerName,
        tasks,
      }),
    )
  }, [projectName, ownerName, tasks])

  const totals = useMemo(() => {
    const totalWeight = tasks.reduce((sum, task) => sum + clampWeight(task.weight), 0)
    const completedWeight = tasks.reduce(
      (sum, task) => sum + (task.completed ? clampWeight(task.weight) : 0),
      0,
    )
    const remainingWeight = Math.max(100 - completedWeight, 0)
    const completedCount = tasks.filter((task) => task.completed).length
    const completionPercent = Math.min(completedWeight, 100)

    return {
      totalWeight,
      completedWeight,
      remainingWeight,
      completedCount,
      totalCount: tasks.length,
      completionPercent,
      isWeightValid: totalWeight === 100,
    }
  }, [tasks])

  const nextId = useMemo(() => {
    return tasks.reduce((max, task) => Math.max(max, task.id), 0) + 1
  }, [tasks])

  const updateTask = (id, changes) => {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, ...changes } : task)))
  }

  const addTask = () => {
    setTasks((current) => [...current, emptyTask(nextId)])
  }

  const removeTask = (id) => {
    setTasks((current) => {
      if (current.length === 1) return current
      return current.filter((task) => task.id !== id)
    })
  }

  const resetToSample = () => {
    setProjectName(defaultState.projectName)
    setOwnerName('')
    setTasks(sampleTasks)
    setActiveTab('tasks')
    setImportError('')
    setCopyStatus('')
  }

  const clearAll = () => {
    setProjectName('')
    setOwnerName('')
    setTasks([emptyTask(1)])
    setActiveTab('tasks')
    setImportError('')
    setCopyStatus('')
  }

  const markAll = (completed) => {
    setTasks((current) => current.map((task) => ({ ...task, completed })))
  }

  const filledTasks = useMemo(() => {
    return tasks.filter((task) => task.title.trim() || clampWeight(task.weight) > 0)
  }, [tasks])

  const plainReport = useMemo(() => {
    const lines = []
    lines.push('Hi Team,')
    lines.push('')
    lines.push(`Please find the task completion status${projectName.trim() ? ` for ${projectName.trim()}` : ''}.`)
    lines.push('')
    lines.push(`Overall Completion: ${formatPercent(totals.completionPercent)}`)
    lines.push(`Completed Tasks: ${totals.completedCount}/${totals.totalCount}`)
    lines.push(`Total Weightage Added: ${formatPercent(totals.totalWeight)}`)

    if (!totals.isWeightValid) {
      lines.push(`Note: Total weightage should be 100%. Current total is ${formatPercent(totals.totalWeight)}.`)
    }

    lines.push('')
    lines.push('Task Details:')

    filledTasks.forEach((task, index) => {
      const statusIcon = task.completed ? '✅' : '⬜'
      const statusText = task.completed ? 'Completed' : 'Pending'
      lines.push(
        `${index + 1}. ${statusIcon} ${task.title.trim() || 'Untitled task'} - ${formatPercent(
          clampWeight(task.weight),
        )} - ${statusText}`,
      )
    })

    if (ownerName.trim()) {
      lines.push('')
      lines.push(`Regards,`)
      lines.push(ownerName.trim())
    }

    return lines.join('\n')
  }, [filledTasks, ownerName, projectName, totals])

  const htmlReport = useMemo(() => {
    const warning = !totals.isWeightValid
      ? `<p style="margin:0 0 12px;color:#b45309;"><strong>Note:</strong> Total weightage should be 100%. Current total is ${formatPercent(
          totals.totalWeight,
        )}.</p>`
      : ''

    const rows = filledTasks
      .map((task, index) => {
        const statusIcon = task.completed ? '✅' : '⬜'
        const statusText = task.completed ? 'Completed' : 'Pending'
        return `<tr>
          <td style="border:1px solid #d9e2ec;padding:8px;text-align:center;">${index + 1}</td>
          <td style="border:1px solid #d9e2ec;padding:8px;">${statusIcon} ${escapeHtml(
            task.title.trim() || 'Untitled task',
          )}</td>
          <td style="border:1px solid #d9e2ec;padding:8px;text-align:center;">${formatPercent(
            clampWeight(task.weight),
          )}</td>
          <td style="border:1px solid #d9e2ec;padding:8px;text-align:center;">${statusText}</td>
        </tr>`
      })
      .join('')

    const progressWidth = Math.min(Math.max(totals.completionPercent, 0), 100)

    return `<div style="font-family:Calibri,Arial,sans-serif;font-size:14px;color:#111827;line-height:1.4;">
      <p>Hi Team,</p>
      <p>Please find the task completion status${projectName.trim() ? ` for <strong>${escapeHtml(projectName.trim())}</strong>` : ''}.</p>
      <table style="border-collapse:collapse;margin:12px 0;width:100%;max-width:680px;">
        <tr>
          <td style="border:1px solid #d9e2ec;padding:8px;background:#f8fafc;"><strong>Overall Completion</strong></td>
          <td style="border:1px solid #d9e2ec;padding:8px;"><strong>${formatPercent(totals.completionPercent)}</strong></td>
        </tr>
        <tr>
          <td style="border:1px solid #d9e2ec;padding:8px;background:#f8fafc;"><strong>Completed Tasks</strong></td>
          <td style="border:1px solid #d9e2ec;padding:8px;">${totals.completedCount}/${totals.totalCount}</td>
        </tr>
        <tr>
          <td style="border:1px solid #d9e2ec;padding:8px;background:#f8fafc;"><strong>Total Weightage Added</strong></td>
          <td style="border:1px solid #d9e2ec;padding:8px;">${formatPercent(totals.totalWeight)}</td>
        </tr>
      </table>
      <div style="width:100%;max-width:680px;background:#e5e7eb;border-radius:10px;overflow:hidden;margin:8px 0 12px;">
        <div style="width:${progressWidth}%;background:#16a34a;color:#ffffff;text-align:center;padding:6px 0;font-weight:bold;">${formatPercent(
          totals.completionPercent,
        )}</div>
      </div>
      ${warning}
      <table style="border-collapse:collapse;width:100%;max-width:680px;">
        <thead>
          <tr>
            <th style="border:1px solid #d9e2ec;padding:8px;background:#e2e8f0;text-align:center;">#</th>
            <th style="border:1px solid #d9e2ec;padding:8px;background:#e2e8f0;text-align:left;">Task</th>
            <th style="border:1px solid #d9e2ec;padding:8px;background:#e2e8f0;text-align:center;">Weightage</th>
            <th style="border:1px solid #d9e2ec;padding:8px;background:#e2e8f0;text-align:center;">Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      ${ownerName.trim() ? `<p style="margin-top:16px;">Regards,<br>${escapeHtml(ownerName.trim())}</p>` : ''}
    </div>`
  }, [filledTasks, ownerName, projectName, totals])

  const copyReport = async () => {
    try {
      if (navigator.clipboard?.write && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': new Blob([plainReport], { type: 'text/plain' }),
            'text/html': new Blob([htmlReport], { type: 'text/html' }),
          }),
        ])
      } else {
        await navigator.clipboard.writeText(plainReport)
      }
      setCopyStatus('Copied. Paste directly into Outlook mail body.')
    } catch {
      await navigator.clipboard.writeText(plainReport)
      setCopyStatus('Copied as plain text. Paste into Outlook mail body.')
    }

    window.setTimeout(() => setCopyStatus(''), 2500)
  }

  const exportJson = () => {
    const data = JSON.stringify({ projectName, ownerName, tasks }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${projectName.trim() || 'task-tracker'}-data.json`.replace(/[^a-z0-9._-]/gi, '_')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const importJson = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const parsed = JSON.parse(text)

      if (!Array.isArray(parsed?.tasks)) {
        throw new Error('Invalid task file')
      }

      setProjectName(typeof parsed.projectName === 'string' ? parsed.projectName : '')
      setOwnerName(typeof parsed.ownerName === 'string' ? parsed.ownerName : '')
      setTasks(
        parsed.tasks.map((task, index) => ({
          id: Number.isFinite(task?.id) ? task.id : index + 1,
          title: typeof task?.title === 'string' ? task.title : '',
          weight: clampWeight(task?.weight),
          completed: Boolean(task?.completed),
        })),
      )
      setImportError('')
    } catch {
      setImportError('Invalid JSON file. Please import a file exported from this app.')
    } finally {
      event.target.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 md:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">Task Completion Tracker</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Add task weightage, tick completed tasks, calculate completion automatically, and copy the report for Outlook.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-900 px-5 py-4 text-white shadow-sm">
              <p className="text-sm text-slate-300">Overall Completion</p>
              <p className="text-4xl font-bold">{formatPercent(totals.completionPercent)}</p>
            </div>
          </div>

          <div className="mt-6 h-4 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-green-600 transition-all duration-300"
              style={{ width: `${Math.min(totals.completionPercent, 100)}%` }}
              aria-label={`Completion ${formatPercent(totals.completionPercent)}`}
            />
          </div>
        </header>

        <main className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'tasks' && (
            <section className="pt-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Main task / project name</span>
                  <input
                    value={projectName}
                    onChange={(event) => setProjectName(event.target.value)}
                    placeholder="Example: Create GitHub Repo"
                    className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Your name for report footer</span>
                  <input
                    value={ownerName}
                    onChange={(event) => setOwnerName(event.target.value)}
                    placeholder="Optional"
                    className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  />
                </label>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-4">
                <SummaryCard label="Completed" value={formatPercent(totals.completedWeight)} />
                <SummaryCard label="Remaining" value={formatPercent(totals.remainingWeight)} />
                <SummaryCard label="Tasks Done" value={`${totals.completedCount}/${totals.totalCount}`} />
                <SummaryCard
                  label="Total Weightage"
                  value={formatPercent(totals.totalWeight)}
                  warning={!totals.isWeightValid}
                />
              </div>

              {!totals.isWeightValid && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Total task weightage should be exactly 100%. Current total is {formatPercent(totals.totalWeight)}.
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={addTask}
                  className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  + Add Task
                </button>
                <button
                  type="button"
                  onClick={() => markAll(true)}
                  className="rounded-2xl bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-700"
                >
                  Mark All Done
                </button>
                <button
                  type="button"
                  onClick={() => markAll(false)}
                  className="rounded-2xl bg-slate-700 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Mark All Pending
                </button>
                <button
                  type="button"
                  onClick={resetToSample}
                  className="rounded-2xl bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-300"
                >
                  Load Sample
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  className="rounded-2xl bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 hover:bg-red-100"
                >
                  Clear
                </button>
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
                <div className="hidden grid-cols-12 bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 md:grid">
                  <div className="col-span-1">Done</div>
                  <div className="col-span-7">Task name</div>
                  <div className="col-span-2">Weightage</div>
                  <div className="col-span-2 text-right">Action</div>
                </div>

                <div className="divide-y divide-slate-200">
                  {tasks.map((task, index) => (
                    <div key={task.id} className="grid gap-3 px-4 py-4 md:grid-cols-12 md:items-center">
                      <label className="flex items-center gap-3 md:col-span-1">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={(event) => updateTask(task.id, { completed: event.target.checked })}
                          className="h-5 w-5 rounded border-slate-300"
                        />
                        <span className="text-sm font-semibold text-slate-600 md:hidden">Completed</span>
                      </label>

                      <div className="md:col-span-7">
                        <input
                          value={task.title}
                          onChange={(event) => updateTask(task.id, { title: event.target.value })}
                          placeholder={`Task ${index + 1}`}
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={task.weight}
                            onChange={(event) => updateTask(task.id, { weight: clampWeight(event.target.value) })}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                          />
                          <span className="text-sm font-bold text-slate-600">%</span>
                        </div>
                      </div>

                      <div className="flex justify-end md:col-span-2">
                        <button
                          type="button"
                          onClick={() => removeTask(task.id)}
                          className="rounded-2xl px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {activeTab === 'report' && (
            <section className="pt-6">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Report</p>
                    <h2 className="mt-1 text-2xl font-bold text-slate-900">{projectName || 'Untitled Task'}</h2>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-sm text-slate-500">Completion</p>
                    <p className="text-4xl font-bold text-green-700">{formatPercent(totals.completionPercent)}</p>
                  </div>
                </div>

                <div className="mt-5 h-4 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-green-600 transition-all duration-300"
                    style={{ width: `${Math.min(totals.completionPercent, 100)}%` }}
                  />
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Task</th>
                      <th className="px-4 py-3 text-right">Weightage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filledTasks.map((task, index) => (
                      <tr key={task.id} className="bg-white">
                        <td className="px-4 py-3 text-slate-500">{index + 1}</td>
                        <td className="px-4 py-3 font-semibold">
                          {task.completed ? (
                            <span className="text-green-700">✅ Completed</span>
                          ) : (
                            <span className="text-slate-500">⬜ Pending</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-800">{task.title || 'Untitled task'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">
                          {formatPercent(clampWeight(task.weight))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === 'outlook' && (
            <section className="pt-6">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={copyReport}
                  className="rounded-2xl bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-700"
                >
                  Copy for Outlook
                </button>
                <button
                  type="button"
                  onClick={exportJson}
                  className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Export JSON
                </button>
                <button
                  type="button"
                  onClick={() => importRef.current?.click()}
                  className="rounded-2xl bg-slate-800 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-900"
                >
                  Import JSON
                </button>
                <input ref={importRef} type="file" accept="application/json" onChange={importJson} className="hidden" />
              </div>

              {copyStatus && (
                <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                  {copyStatus}
                </div>
              )}

              {importError && (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {importError}
                </div>
              )}

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="mb-3 text-lg font-bold text-slate-900">Plain Text Preview</h3>
                  <pre className="min-h-[420px] whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
                    {plainReport}
                  </pre>
                </div>
                <div>
                  <h3 className="mb-3 text-lg font-bold text-slate-900">Outlook HTML Preview</h3>
                  <div
                    className="min-h-[420px] rounded-2xl border border-slate-200 bg-white p-4 text-sm"
                    dangerouslySetInnerHTML={{ __html: htmlReport }}
                  />
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, warning = false }) {
  return (
    <div className={`rounded-2xl border p-4 ${warning ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
      <p className={`text-sm font-semibold ${warning ? 'text-amber-700' : 'text-slate-500'}`}>{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  )
}
