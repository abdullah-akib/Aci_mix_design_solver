
import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { 
  MixInputs, MixResult, ConcreteType, ExposureCondition 
} from './types';
import { calculateMix } from './services/aciEngine';
import { getAIEngineeringExplanation } from './services/aiService';
import { MAX_AGG_SIZES } from './constants';

const App: React.FC = () => {
  const [inputs, setInputs] = useState<MixInputs>({
    strength: 4000,
    concreteType: ConcreteType.NON_AIR_ENTRAINED,
    exposure: ExposureCondition.MILD,
    slumpMin: 1,
    slumpMax: 4,
    maxAggSize: 0.75,
    cementSG: 3.15,
    caSG: 2.68,
    caAbsorption: 0.5,
    caDRUW: 100,
    caMoisture: 2.0,
    faSG: 2.64,
    faAbsorption: 0.7,
    faFM: 2.8,
    faMoisture: 5.0,
    batchVolume: 1
  });

  const [results, setResults] = useState<MixResult | null>(null);
  const [activeStepExplanations, setActiveStepExplanations] = useState<Record<number, string>>({});
  const [loadingExplanations, setLoadingExplanations] = useState<Record<number, boolean>>({});
  const [aiMode, setAiMode] = useState(true);

  const handleCalculate = () => {
    const res = calculateMix(inputs);
    setResults(res);
  };

  const toggleExplanation = async (stepId: number) => {
    if (!results) return;
    if (activeStepExplanations[stepId]) {
      const newExp = { ...activeStepExplanations };
      delete newExp[stepId];
      setActiveStepExplanations(newExp);
      return;
    }

    setLoadingExplanations(prev => ({ ...prev, [stepId]: true }));
    const step = results.steps.find(s => s.id === stepId);
    if (step) {
      const explanation = await getAIEngineeringExplanation(step, inputs);
      setActiveStepExplanations(prev => ({ ...prev, [stepId]: explanation }));
    }
    setLoadingExplanations(prev => ({ ...prev, [stepId]: false }));
  };

  const exportPDF = () => {
    if (!results) return;
    
    const doc = new jsPDF();
    const margin = 20;
    let y = 20;

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("ACI 211.1 Mix Design Report", margin, y);
    y += 10;

    // Subtitle
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Generated on ${new Date().toLocaleDateString()} | ACI 211.1 Standards`, margin, y);
    y += 15;

    // Input Parameters Section
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("Design Parameters", margin, y);
    y += 8;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const paramLines = [
      `Target Strength: ${inputs.strength} psi`,
      `Concrete Type: ${inputs.concreteType}`,
      `Exposure: ${inputs.exposure}`,
      `Slump Range: ${inputs.slumpMin}-${inputs.slumpMax} in`,
      `Max Aggregate Size: ${inputs.maxAggSize} in`
    ];
    paramLines.forEach(line => {
      doc.text(line, margin + 5, y);
      y += 6;
    });
    y += 10;

    // Summary Table
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Final Mix Proportions (per yd³)", margin, y);
    y += 8;

    const summary = [
      ["Material", "Batch Weight (lb)"],
      ["Water (Adjusted)", results.water.toFixed(1)],
      ["Cement", results.cement.toFixed(1)],
      ["Coarse Aggregate (Wet)", results.coarseAgg.toFixed(1)],
      ["Fine Aggregate (Wet)", results.fineAgg.toFixed(1)],
      ["Total Unit Weight", results.unitWeight.toFixed(1) + " lb/ft³"]
    ];

    doc.setFontSize(10);
    summary.forEach((row, i) => {
      if (i === 0) doc.setFont("helvetica", "bold");
      else doc.setFont("helvetica", "normal");
      doc.text(row[0], margin + 5, y);
      doc.text(row[1], margin + 80, y);
      y += 7;
    });
    y += 15;

    // Detailed Steps
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Step-by-Step Calculations", margin, y);
    y += 10;

    results.steps.forEach(step => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`Step ${step.id}: ${step.title}`, margin + 5, y);
      y += 6;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 80, 200);
      doc.text(`Value: ${step.value}`, margin + 10, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80);
      const calcLines = doc.splitTextToSize(step.calculation, 160);
      doc.text(calcLines, margin + 10, y);
      y += (calcLines.length * 5) + 8;
    });

    // Footer
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(150);
    const footerY = 285;
    doc.text("Developed by Abdullah Al Mamun Akib | CEE, SUST", 105, footerY, { align: "center" });

    doc.save(`ACI_211_1_Mix_Design_${inputs.strength}psi.pdf`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 text-white py-6 px-8 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">ACI 211.1 Mix Pro</h1>
            <p className="text-slate-400 text-sm">Professional Concrete Mix Design Solver</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm bg-slate-800 p-2 rounded-lg border border-slate-700">
              <span className="font-medium text-slate-300">AI Insights:</span>
              <button 
                onClick={() => setAiMode(!aiMode)}
                className={`px-3 py-1 rounded transition font-bold ${aiMode ? 'bg-blue-600 text-white' : 'bg-slate-600 text-slate-300'}`}
              >
                {aiMode ? 'ON' : 'OFF'}
              </button>
            </div>
            <button 
              onClick={handleCalculate}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2 rounded-lg transition shadow-lg"
            >
              Run Solver
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto mt-8 px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
        
        {/* Input Panel */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Project Requirements
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Target Strength (psi)</label>
                <input 
                  type="number" 
                  value={inputs.strength} 
                  onChange={e => setInputs({...inputs, strength: Number(e.target.value)})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Type</label>
                  <select 
                    value={inputs.concreteType}
                    onChange={e => setInputs({...inputs, concreteType: e.target.value as ConcreteType})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                  >
                    <option value={ConcreteType.NON_AIR_ENTRAINED}>Non-AE</option>
                    <option value={ConcreteType.AIR_ENTRAINED}>Air-Entrained</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Exposure</label>
                  <select 
                    value={inputs.exposure}
                    onChange={e => setInputs({...inputs, exposure: e.target.value as ExposureCondition})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                  >
                    {Object.values(ExposureCondition).map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Slump Max (in)</label>
                  <input type="number" value={inputs.slumpMax} onChange={e => setInputs({...inputs, slumpMax: Number(e.target.value)})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Agg Size (in)</label>
                  <select 
                    value={inputs.maxAggSize} 
                    onChange={e => setInputs({...inputs, maxAggSize: Number(e.target.value)})} 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                  >
                    {MAX_AGG_SIZES.map(s => <option key={s} value={s}>{s}"</option>)}
                  </select>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
              Material Properties
            </h2>
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs font-bold text-slate-400 mb-2 tracking-widest uppercase">Cement</p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-sm text-slate-600">SG:</label>
                  <input type="number" step="0.01" value={inputs.cementSG} onChange={e => setInputs({...inputs, cementSG: Number(e.target.value)})} className="bg-white px-2 py-1 rounded border border-slate-200 outline-none text-right" />
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs font-bold text-slate-400 mb-2 tracking-widest uppercase">Coarse Aggregate</p>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                    <span>SG (SSD):</span>
                    <input type="number" step="0.01" value={inputs.caSG} onChange={e => setInputs({...inputs, caSG: Number(e.target.value)})} className="bg-white px-2 py-1 rounded border border-slate-200 outline-none text-right" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                    <span>Absorption (%):</span>
                    <input type="number" step="0.1" value={inputs.caAbsorption} onChange={e => setInputs({...inputs, caAbsorption: Number(e.target.value)})} className="bg-white px-2 py-1 rounded border border-slate-200 outline-none text-right" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                    <span>DRUW (pcf):</span>
                    <input type="number" value={inputs.caDRUW} onChange={e => setInputs({...inputs, caDRUW: Number(e.target.value)})} className="bg-white px-2 py-1 rounded border border-slate-200 outline-none text-right" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                    <span>Moisture (%):</span>
                    <input type="number" step="0.1" value={inputs.caMoisture} onChange={e => setInputs({...inputs, caMoisture: Number(e.target.value)})} className="bg-white px-2 py-1 rounded border border-slate-200 outline-none text-right" />
                  </div>
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs font-bold text-slate-400 mb-2 tracking-widest uppercase">Fine Aggregate</p>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                    <span>SG (SSD):</span>
                    <input type="number" step="0.01" value={inputs.faSG} onChange={e => setInputs({...inputs, faSG: Number(e.target.value)})} className="bg-white px-2 py-1 rounded border border-slate-200 outline-none text-right" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                    <span>Absorption (%):</span>
                    <input type="number" step="0.1" value={inputs.faAbsorption} onChange={e => setInputs({...inputs, faAbsorption: Number(e.target.value)})} className="bg-white px-2 py-1 rounded border border-slate-200 outline-none text-right" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                    <span>F. Modulus:</span>
                    <input type="number" step="0.1" value={inputs.faFM} onChange={e => setInputs({...inputs, faFM: Number(e.target.value)})} className="bg-white px-2 py-1 rounded border border-slate-200 outline-none text-right" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                    <span>Moisture (%):</span>
                    <input type="number" step="0.1" value={inputs.faMoisture} onChange={e => setInputs({...inputs, faMoisture: Number(e.target.value)})} className="bg-white px-2 py-1 rounded border border-slate-200 outline-none text-right" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-8 space-y-6">
          {!results ? (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-white rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
              <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
              <p className="text-lg font-medium text-slate-600">Define parameters and run the solver</p>
              <p className="text-sm">ACI 211.1 standard procedures will be applied step-by-step.</p>
            </div>
          ) : (
            <>
              {/* Summary Dashboard */}
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Mix Summary</h3>
                <button 
                  onClick={exportPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition text-xs font-bold shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  Export PDF Report
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SummaryCard label="Cement" value={`${results.cement.toFixed(0)} lb`} sub="Batch Weight" color="blue" />
                <SummaryCard label="Water" value={`${results.water.toFixed(0)} lb`} sub="Adjusted Water" color="cyan" />
                <SummaryCard label="Coarse Agg" value={`${results.coarseAgg.toFixed(0)} lb`} sub="Stockpile Weight" color="amber" />
                <SummaryCard label="Fine Agg" value={`${results.fineAgg.toFixed(0)} lb`} sub="Stockpile Weight" color="emerald" />
              </div>

              {/* Step-by-Step Details */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                  <h3 className="font-bold tracking-tight">ACI 211.1 Calculation Protocol</h3>
                  <span className="text-[10px] bg-slate-700 px-2 py-1 rounded uppercase tracking-[0.2em] font-bold">Standard Logic</span>
                </div>
                <div className="p-6 space-y-8">
                  {results.steps.map((step) => (
                    <div key={step.id} className="relative pl-8 border-l-2 border-slate-100">
                      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500 border-4 border-white"></div>
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex-grow">
                          <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Step {step.id}</span>
                          <h4 className="text-md font-bold text-slate-800">{step.title}</h4>
                          <div className="mt-2 bg-slate-50 p-4 rounded-lg border border-slate-100 shadow-inner">
                            <p className="text-xl font-mono font-bold text-slate-900">{step.value}</p>
                            <p className="text-xs font-medium text-slate-500 mt-1 italic whitespace-pre-wrap leading-relaxed">{step.calculation}</p>
                          </div>
                        </div>
                        {aiMode && (
                          <div className="md:w-1/3 flex flex-col gap-2">
                             <button 
                                onClick={() => toggleExplanation(step.id)}
                                className="text-xs flex items-center gap-1.5 font-bold text-blue-600 hover:text-blue-700 transition"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"></path></svg>
                                {activeStepExplanations[step.id] ? "Hide AI Reasoning" : "Explain This Step"}
                              </button>
                              {loadingExplanations[step.id] && (
                                <div className="text-xs text-slate-400 animate-pulse flex items-center gap-2">
                                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                                  Analyzing ACI 211.1 guidelines...
                                </div>
                              )}
                              {activeStepExplanations[step.id] && (
                                <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg text-sm text-blue-900 animate-in fade-in slide-in-from-left-2 duration-300">
                                  <p className="font-medium leading-relaxed italic">
                                    "{activeStepExplanations[step.id]}"
                                  </p>
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Final Mix Proportions Card */}
              <div className="bg-slate-900 p-8 rounded-xl text-white shadow-xl">
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Final Mix Design</h2>
                    <p className="text-slate-400">Values per cubic yard (yd³)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Total Unit Weight</p>
                    <p className="text-2xl font-mono text-slate-100">{results.unitWeight.toFixed(1)} <span className="text-sm font-sans text-slate-400">lb/ft³</span></p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-slate-800 pt-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Water</span>
                    <span className="text-3xl font-mono text-cyan-400">{results.water.toFixed(1)} <small className="text-sm font-sans text-cyan-700">lb</small></span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Cement</span>
                    <span className="text-3xl font-mono text-blue-400">{results.cement.toFixed(1)} <small className="text-sm font-sans text-blue-700">lb</small></span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Coarse Agg (Wet)</span>
                    <span className="text-3xl font-mono text-amber-400">{results.coarseAgg.toFixed(1)} <small className="text-sm font-sans text-amber-700">lb</small></span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Fine Agg (Wet)</span>
                    <span className="text-3xl font-mono text-emerald-400">{results.fineAgg.toFixed(1)} <small className="text-sm font-sans text-emerald-700">lb</small></span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 pb-12 text-center">
        <div className="max-w-7xl mx-auto px-4">
          <div className="h-px bg-slate-200 mb-8 max-w-lg mx-auto"></div>
          
          {/* Developer Credit Line */}
          <div className="mb-6">
            <p className="text-slate-500 text-sm font-medium tracking-tight">
              Developed by <span className="text-slate-800 font-bold">Abdullah Al Mamun Akib</span>
              <span className="mx-2 text-slate-300">|</span>
              <span className="text-blue-600 font-bold tracking-wide">CEE, SUST</span>
            </p>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <p className="text-slate-400 text-xs font-medium">
              © 2024 Concrete Mix Pro <span className="mx-1">•</span> Following ACI 211.1 Recommended Practice
            </p>
            <p className="text-slate-400 text-[9px] uppercase tracking-[0.3em] font-extrabold">
              Professional Engineering Suite
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

const SummaryCard: React.FC<{ label: string; value: string; sub: string; color: 'blue' | 'amber' | 'emerald' | 'cyan' }> = ({ label, value, sub, color }) => {
  const colorClasses = {
    blue: 'border-blue-200 text-blue-600',
    amber: 'border-amber-200 text-amber-600',
    emerald: 'border-emerald-200 text-emerald-600',
    cyan: 'border-cyan-200 text-cyan-600',
  };

  return (
    <div className={`bg-white p-4 rounded-xl border-b-4 ${colorClasses[color]} shadow-sm hover:shadow-md transition-shadow`}>
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">{label}</p>
      <p className="text-xl font-bold text-slate-800 mt-1">{value}</p>
      <p className="text-[10px] font-medium text-slate-500">{sub}</p>
    </div>
  );
};

export default App;
