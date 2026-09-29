"use client"
import React, { useState, useRef } from "react"
import { diffJson } from "diff"
import useSimulationStore, { SimulationStore } from "../../store/useSimulationStore"

export interface Assertion {
  id: string
  path: string
  expectedValue: string
}

export interface SimulationStep {
  id: string
  name: string
  initialState: Record<string, any>
  finalState: Record<string, any>
  assertions: Assertion[]
}

export interface SimulationScenario {
  id: string
  name: string
  steps: SimulationStep[]
}

const mockScenario: SimulationScenario = {
  id: "scenario-1",
  name: "Agent Workflow: Token Transfer",
  steps: [
    {
      id: "step-1",
      name: "Initialize Wallet",
      initialState: { user: "alice", balance: 0 },
      finalState: { user: "alice", balance: 100 },
      assertions: [
        { id: "a1", path: "balance", expectedValue: "100" }
      ]
    },
    {
      id: "step-2",
      name: "Execute Transfer",
      initialState: { user: "alice", balance: 100 },
      finalState: { user: "alice", balance: 50, receiver: "bob" },
      assertions: [
        { id: "a2", path: "balance", expectedValue: "50" },
        { id: "a3", path: "error", expectedValue: "undefined" }
      ]
    }
  ]
}

export const SimulationRunner: React.FC<{ simulationId: string | null }> = ({ simulationId }) => {
  const [scenario, setScenario] = useState<SimulationScenario>(mockScenario)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [stepResults, setStepResults] = useState<Record<string, { success: boolean, failedAssertions: string[] }>>({})

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(scenario, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${scenario.name.replace(/\s+/g, '_')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const imported = JSON.parse(evt.target?.result as string) as SimulationScenario
        if (imported && imported.steps) {
          setScenario(imported)
          setCurrentStepIndex(-1)
          setStepResults({})
          setIsPlaying(false)
        }
      } catch (err) {
        alert("Failed to parse scenario file")
      }
    }
    reader.readAsText(file)
  }

  const evaluateStep = (step: SimulationStep) => {
    const failedAssertions: string[] = []
    step.assertions.forEach(assert => {
      const keys = assert.path.split('.')
      let val: any = step.finalState
      for (const k of keys) {
        if (val === undefined || val === null) break
        val = val[k]
      }
      
      const expected = assert.expectedValue
      const actualStr = val !== undefined ? String(val) : "undefined"
      
      if (actualStr !== expected) {
        failedAssertions.push(assert.id)
      }
    })
    
    setStepResults(prev => ({
      ...prev,
      [step.id]: { success: failedAssertions.length === 0, failedAssertions }
    }))
  }

  const stepForward = () => {
    if (currentStepIndex < scenario.steps.length - 1) {
      const nextIndex = currentStepIndex + 1
      evaluateStep(scenario.steps[nextIndex])
      setCurrentStepIndex(nextIndex)
    } else {
      setIsPlaying(false)
    }
  }

  const reset = () => {
    setCurrentStepIndex(-1)
    setStepResults({})
    setIsPlaying(false)
  }

  React.useEffect(() => {
    if (isPlaying) {
      if (currentStepIndex >= scenario.steps.length - 1) {
        setIsPlaying(false)
        return
      }
      const timer = setTimeout(() => {
        stepForward()
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [isPlaying, currentStepIndex, scenario])

  if (!simulationId) {
    return <div className="text-sm text-slate-500">Select a simulation to view details.</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h3 className="text-lg font-medium">{scenario.name}</h3>
          <p className="text-sm text-slate-500">Interactive Execution Runner</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-sm rounded transition-colors">Export Scenario</button>
          <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-sm rounded transition-colors">Import Scenario</button>
          <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={reset} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-sm rounded transition-colors">Reset</button>
        <button 
          onClick={() => setIsPlaying(!isPlaying)} 
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors disabled:opacity-50"
          disabled={currentStepIndex >= scenario.steps.length - 1}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button 
          onClick={stepForward} 
          className="px-3 py-1 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded transition-colors disabled:opacity-50"
          disabled={currentStepIndex >= scenario.steps.length - 1 || isPlaying}
        >
          Step Forward
        </button>
        <span className="text-sm ml-2 font-medium">
          Step: {currentStepIndex + 1} / {scenario.steps.length}
        </span>
      </div>

      <div className="space-y-4 mt-4">
        {scenario.steps.map((step, idx) => {
          const isCurrent = idx === currentStepIndex
          const isPast = idx <= currentStepIndex
          const result = stepResults[step.id]
          
          if (!isPast && !isCurrent) return null

          const diff = diffJson(step.initialState, step.finalState)

          return (
            <div key={step.id} className={`p-4 border rounded transition-all ${isCurrent ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-slate-200 bg-white'}`}>
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium">Step {idx + 1}: {step.name}</h4>
                {result && (
                  <span className={`text-xs px-2 py-1 rounded font-medium ${result.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {result.success ? "Passed" : "Failed Assertions"}
                  </span>
                )}
              </div>

              {result && !result.success && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  <div className="font-medium mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Failed Assertions:
                  </div>
                  <ul className="list-disc pl-5 mt-1">
                    {step.assertions.filter(a => result.failedAssertions.includes(a.id)).map(a => (
                      <li key={a.id}>Path <code className="bg-red-100 px-1 rounded">{a.path}</code> expected <code className="bg-red-100 px-1 rounded">{a.expectedValue}</code></li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2">State Mutations (Diff)</h5>
                  <div className="bg-slate-900 text-slate-100 p-3 rounded text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                    {diff.map((part, i) => (
                      <span key={i} className={part.added ? 'text-green-400 bg-green-900/30' : part.removed ? 'text-red-400 bg-red-900/30 line-through' : ''}>
                        {part.value}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2">Assertions</h5>
                  <div className="bg-slate-50 border rounded p-3 text-xs">
                    {step.assertions.length === 0 && <span className="text-slate-400 italic">No assertions defined.</span>}
                    <ul className="space-y-2">
                      {step.assertions.map(a => (
                        <li key={a.id} className="flex justify-between items-center border-b border-slate-200 pb-2 last:border-0 last:pb-0">
                          <code className="bg-slate-100 px-1 py-0.5 rounded">{a.path} === {a.expectedValue}</code>
                          {result && (
                            <span className={`font-semibold ${result.failedAssertions.includes(a.id) ? 'text-red-600' : 'text-green-600'}`}>
                              {result.failedAssertions.includes(a.id) ? 'FAIL' : 'PASS'}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default SimulationRunner
