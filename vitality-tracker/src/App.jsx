import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Legend, AreaChart, Area, ReferenceLine, PieChart, Pie, Cell 
} from 'recharts';
import { 
  Activity, Droplets, Calendar, Save, TrendingDown, 
  Award, Zap, UtensilsCrossed, CheckCircle, PlusCircle, Flame, Target, Trash2, 
  Sparkles, MessageSquare, Loader2, Info, Heart, Settings, User
} from 'lucide-react';

// --- DEFAULTS ---
const APP_NAME = "Vitality";
const DEFAULT_SETTINGS = {
  name: "Vivek Pandey",
  startWeight: 98,
  goalWeight: 91,
  startDate: "2025-12-17",
  endDate: "2026-01-20",
  height: 177,
  age: 28,
  gender: 'male'
};

const apiKey = import.meta.env.VITE_GEMINI_API_KEY; // API Key injected at runtime

// Helper to get local date string YYYY-MM-DD
const getToday = () => new Date().toLocaleDateString('en-CA');

// --- GEMINI API HELPER ---
async function callGemini(prompt, systemInstruction = "") {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      responseMimeType: "application/json"
    }
  };

  let delay = 1000;
  for (let i = 0; i < 5; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        if (response.status === 429) throw new Error('Too many requests');
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return JSON.parse(text); // We expect JSON response
    } catch (error) {
      if (i === 4) throw error;
      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
    }
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notification, setNotification] = useState(null);
  
  // AI States
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [coachMessage, setCoachMessage] = useState(null);

  // --- STATE: SETTINGS ---
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('vitality_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  // --- STATE: LOGS ---
  const [logs, setLogs] = useState(() => {
    const saved = localStorage.getItem('jan20_fitness_logs');
    return saved ? JSON.parse(saved) : [{
      date: settings.startDate,
      weight: settings.startWeight,
      water: 0,
      workout: false,
      noSugar: false,
      lowSalt: false,
      vacuums: false
    }];
  });

  const [foodLogs, setFoodLogs] = useState(() => {
    const saved = localStorage.getItem('jan20_food_logs');
    return saved ? JSON.parse(saved) : {}; 
  });

  const [todayLog, setTodayLog] = useState({
    weight: '', water: 0, workout: false, noSugar: false, lowSalt: false, vacuums: false
  });

  const [newFood, setNewFood] = useState({ name: '', cals: '', protein: '' });

  // --- PRE-LOADED DIET PLAN ITEMS ---
  const quickFoods = [
    { name: "3 Boiled Eggs (1 Yolk)", cals: 155, protein: 13 },
    { name: "Jeera Water + Lemon", cals: 10, protein: 0 },
    { name: "Grilled Chicken (150g)", cals: 250, protein: 45 },
    { name: "Multigrain Roti (1)", cals: 100, protein: 3 },
    { name: "Dal (1 Bowl Thick)", cals: 140, protein: 8 },
    { name: "Almonds (10)", cals: 70, protein: 2 },
    { name: "Green Tea", cals: 2, protein: 0 },
    { name: "Clear Soup (Veg/Chicken)", cals: 60, protein: 4 },
  ];

  // --- EFFECTS ---
  useEffect(() => {
    const today = getToday();
    const existing = logs.find(l => l.date === today);
    if (existing) {
      setTodayLog(existing);
    } else {
      const lastLog = logs[logs.length - 1];
      setTodayLog({
        weight: lastLog ? lastLog.weight : settings.startWeight,
        water: 0,
        workout: false,
        noSugar: false,
        lowSalt: false,
        vacuums: false
      });
    }
  }, [logs, settings.startWeight]);

  useEffect(() => {
    localStorage.setItem('jan20_fitness_logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('jan20_food_logs', JSON.stringify(foodLogs));
  }, [foodLogs]);

  useEffect(() => {
    localStorage.setItem('vitality_settings', JSON.stringify(settings));
  }, [settings]);

  // --- ACTIONS ---
  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSaveLog = () => {
    const today = getToday();
    const newLogs = logs.filter(l => l.date !== today);
    const weightVal = parseFloat(todayLog.weight) || (newLogs.length > 0 ? newLogs[newLogs.length-1].weight : settings.startWeight);
    const newEntry = { ...todayLog, date: today, weight: weightVal };
    const sortedLogs = [...newLogs, newEntry].sort((a, b) => new Date(a.date) - new Date(b.date));
    setLogs(sortedLogs);
    showNotification("Daily log updated!");
  };

  const handleUpdateSettings = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newSettings = {
      ...settings,
      name: formData.get('name'),
      goalWeight: parseFloat(formData.get('goalWeight')),
      endDate: formData.get('endDate'),
      startWeight: parseFloat(formData.get('startWeight')),
      height: parseFloat(formData.get('height')),
      age: parseFloat(formData.get('age')),
    };
    setSettings(newSettings);
    showNotification("Settings updated!");
    setActiveTab('dashboard');
  };

  const addFood = (item) => {
    const today = getToday();
    const currentFoods = foodLogs[today] || [];
    let foodToAdd = item;
    
    if (!item) {
      if (!newFood.name || !newFood.cals) return;
      foodToAdd = { 
        id: Date.now(), 
        name: newFood.name, 
        cals: parseInt(newFood.cals), 
        protein: parseInt(newFood.protein) || 0 
      };
      setNewFood({ name: '', cals: '', protein: '' });
    } else {
      foodToAdd = { ...item, id: Date.now() };
    }

    setFoodLogs({ ...foodLogs, [today]: [...currentFoods, foodToAdd] });
    showNotification(`Added ${foodToAdd.name}`);
  };

  const removeFood = (id) => {
    const today = getToday();
    const currentFoods = foodLogs[today] || [];
    setFoodLogs({ ...foodLogs, [today]: currentFoods.filter(f => f.id !== id) });
  };

  const clearData = () => {
    if(window.confirm("Delete ALL history?")) {
      localStorage.removeItem('jan20_fitness_logs');
      localStorage.removeItem('jan20_food_logs');
      localStorage.removeItem('vitality_settings');
      window.location.reload();
    }
  };

  // --- CALCULATIONS ---
  const currentWeight = logs.length > 0 ? logs[logs.length - 1].weight : settings.startWeight;
  
  // Dynamic Calorie Calculation (Mifflin-St Jeor)
  const calculateDynamicCalories = (weight) => {
    const bmr = (10 * weight) + (6.25 * settings.height) - (5 * settings.age) + 5;
    const tdee = bmr * 1.3; 
    let goal = Math.round(tdee - 750);
    return Math.max(1500, goal);
  };

  const dailyCalorieGoal = calculateDynamicCalories(currentWeight);

  // --- GEMINI FUNCTIONS ---
  const handleAiFoodAdd = async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    try {
      const prompt = `User description: "${aiInput}". Estimate calories and protein.`;
      const systemPrompt = `You are a nutritionist. Parse the food description into a JSON object with keys: "name" (short string), "cals" (integer), "protein" (integer grams). Estimate portion sizes if not specified. Example: {"name": "Chicken Sandwich", "cals": 450, "protein": 30}. Return ONLY JSON.`;
      
      const result = await callGemini(prompt, systemPrompt);
      
      if (result && result.name) {
        addFood(result);
        setAiInput('');
      } else {
        showNotification("Could not identify food. Try again.");
      }
    } catch (error) {
      console.error(error);
      showNotification("AI Error. Check connection.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiCoach = async () => {
    setAiLoading(true);
    setCoachMessage(null);
    try {
      const today = getToday();
      const recentLogs = logs.slice(-7); // Last 7 days
      const stats = {
        currentWeight,
        daysLeft: Math.ceil((new Date(settings.endDate) - new Date()) / (1000 * 60 * 60 * 24)),
        totalLost,
        recentHabits: recentLogs.map(l => ({ date: l.date, noSugar: l.noSugar, lowSalt: l.lowSalt })),
        todayCals: todayCalories,
        targetCals: dailyCalorieGoal
      };

      const prompt = `User Stats: ${JSON.stringify(stats)}. User Goal: Lose weight by ${settings.endDate} (Target ${settings.goalWeight}kg). Current Dynamic Calorie Goal: ${dailyCalorieGoal}`;
      const systemPrompt = `You are a tough but encouraging fitness coach named Coach Gemini. Analyze the JSON data. Provide a JSON object with one field "message" containing a short, punchy, specific piece of advice (max 2 sentences). Focus on what they are neglecting (e.g. if sugar habits are bad, mention that. If weight is stalled, mention water/salt).`;

      const result = await callGemini(prompt, systemPrompt);
      setCoachMessage(result.message);
    } catch (error) {
      console.error(error);
      showNotification("Coach is offline currently.");
    } finally {
      setAiLoading(false);
    }
  };

  const totalLost = (settings.startWeight - currentWeight).toFixed(1);
  const daysRemaining = Math.ceil((new Date(settings.endDate) - new Date()) / (1000 * 60 * 60 * 24));
  
  const todayFoods = foodLogs[getToday()] || [];
  const todayCalories = todayFoods.reduce((sum, f) => sum + f.cals, 0);
  const todayProtein = todayFoods.reduce((sum, f) => sum + f.protein, 0);

  // Graph Data
  const chartData = useMemo(() => {
    const data = [];
    let currDate = new Date(settings.startDate);
    const lastDate = new Date(settings.endDate);
    
    // Prevent infinite loop if dates are invalid
    if (currDate > lastDate) return [];

    while (currDate <= lastDate) {
      const dateStr = currDate.toLocaleDateString('en-CA');
      const log = logs.find(l => l.date === dateStr);
      const foods = foodLogs[dateStr] || [];
      const cals = foods.reduce((sum, f) => sum + f.cals, 0);

      const totalDays = (lastDate - new Date(settings.startDate)) / (1000 * 60 * 60 * 24);
      const daysPassed = (currDate - new Date(settings.startDate)) / (1000 * 60 * 60 * 24);
      // Avoid division by zero
      const safeTotalDays = totalDays === 0 ? 1 : totalDays;
      const idealWeight = settings.startWeight - ((settings.startWeight - settings.goalWeight) * (daysPassed / safeTotalDays));
      
      data.push({
        date: dateStr,
        actualWeight: log ? log.weight : null,
        idealWeight: parseFloat(idealWeight.toFixed(1)),
        calories: cals,
        habitScore: log ? ((log.workout?25:0) + (log.noSugar?25:0) + (log.lowSalt?25:0) + (log.vacuums?25:0)) : 0
      });
      currDate.setDate(currDate.getDate() + 1);
    }
    return data;
  }, [logs, foodLogs, settings]);

  const calorieData = [
    { name: 'Consumed', value: todayCalories, color: '#10b981' },
    { name: 'Remaining', value: Math.max(0, dailyCalorieGoal - todayCalories), color: '#1e293b' }
  ];

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-32 md:pb-0 flex flex-col">
      
      {/* HEADER */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-20 shadow-lg">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-lg text-white shadow-emerald-500/20 shadow-lg">
              <Activity size={24} />
            </div>
            <div>
              <h1 className="font-bold text-lg md:text-xl text-white leading-tight tracking-tight">{APP_NAME}</h1>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-emerald-400 font-medium">GOAL: {settings.goalWeight}KG</span>
                <span className="text-slate-600">|</span>
                <span className="text-blue-400 font-medium">{daysRemaining} DAYS LEFT</span>
              </div>
            </div>
          </div>
          <div className="text-right">
             <div className="text-xs text-slate-400 font-medium tracking-wider">CURRENT</div>
             <div className="font-bold text-2xl text-white">{currentWeight}<span className="text-sm font-normal text-slate-500 ml-1">kg</span></div>
          </div>
        </div>
      </header>

      {/* NOTIFICATION */}
      {notification && (
        <div className="fixed top-24 right-4 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl animate-bounce z-50 flex items-center gap-2 font-medium">
          <CheckCircle size={18} /> {notification}
        </div>
      )}

      <main className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 flex-grow w-full">
        
        {/* TAB NAV */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 shadow-sm overflow-x-auto">
          {['dashboard', 'tracker', 'food', 'analytics', 'settings'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 min-w-[80px] py-2.5 px-4 rounded-lg text-xs md:text-sm font-bold uppercase tracking-wider transition-all ${
                activeTab === tab ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab === 'settings' ? <Settings size={16} className="mx-auto" /> : tab}
            </button>
          ))}
        </div>

        {/* --- DASHBOARD VIEW --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            {/* AI COACH SECTION */}
            <div className="bg-gradient-to-br from-indigo-900/50 to-slate-900 p-5 rounded-xl border border-indigo-500/30 relative overflow-hidden">
               <div className="flex items-start gap-4">
                  <div className="bg-indigo-500 p-2 rounded-lg text-white mt-1 shadow-lg shadow-indigo-500/20">
                    <Sparkles size={24} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-indigo-300 font-bold text-sm uppercase tracking-wider mb-1">Coach Gemini Insight</h2>
                    {coachMessage ? (
                      <p className="text-white font-medium leading-relaxed animate-in fade-in">{coachMessage}</p>
                    ) : (
                      <p className="text-slate-400 text-sm">Need a quick status check? Tap the button to get AI analysis of your progress.</p>
                    )}
                    
                    <button 
                      onClick={handleAiCoach}
                      disabled={aiLoading}
                      className="mt-3 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      {aiLoading ? <Loader2 className="animate-spin" size={14}/> : <MessageSquare size={14}/>}
                      {aiLoading ? "ANALYZING..." : "ASK COACH"}
                    </button>
                  </div>
               </div>
            </div>

            {/* TOP STATS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
                <TrendingDown className="absolute right-2 top-2 text-slate-800 group-hover:text-emerald-500/10 transition-colors" size={48} />
                <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Total Loss</p>
                <h3 className="text-3xl font-bold text-white mt-1">{totalLost}<span className="text-sm text-emerald-500 ml-1">kg</span></h3>
              </div>
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 relative overflow-hidden group hover:border-blue-500/50 transition-colors">
                <Flame className="absolute right-2 top-2 text-slate-800 group-hover:text-blue-500/10 transition-colors" size={48} />
                <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Calories Today</p>
                <h3 className={`text-3xl font-bold mt-1 ${todayCalories > dailyCalorieGoal ? 'text-red-500' : 'text-blue-500'}`}>{todayCalories}</h3>
              </div>
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 relative overflow-hidden">
                 <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Protein</p>
                 <h3 className="text-3xl font-bold text-amber-500 mt-1">{todayProtein}<span className="text-sm ml-1">g</span></h3>
              </div>
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 relative overflow-hidden">
                <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Daily Goal</p>
                <h3 className="text-3xl font-bold text-emerald-500 mt-1 flex items-baseline gap-1">
                  {dailyCalorieGoal}
                  <span className="text-xs font-normal text-slate-500">kcal</span>
                </h3>
              </div>
            </div>

            {/* MAIN CHART & CALORIE RING */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-slate-900 p-5 rounded-xl border border-slate-800 h-80 shadow-sm">
                <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Activity size={16} className="text-emerald-500"/> Weight Trajectory
                </h2>
                <ResponsiveContainer width="100%" height="90%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="date" hide />
                    <YAxis domain={['auto', 'auto']} hide />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="idealWeight" stroke="#475569" strokeDasharray="5 5" dot={false} strokeWidth={2}/>
                    <Area type="monotone" dataKey="actualWeight" stroke="#10b981" fillOpacity={1} fill="url(#colorWeight)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 h-80 flex flex-col items-center justify-center relative shadow-sm">
                <h2 className="absolute top-5 left-5 text-sm font-bold text-white flex items-center gap-2">
                  <Flame size={16} className="text-orange-500"/> Daily Fuel
                </h2>
                <div className="w-48 h-48 relative">
                   <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={calorieData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {calorieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-white">{todayCalories}</span>
                    <span className="text-xs text-slate-500 uppercase font-bold">of {dailyCalorieGoal} kcal</span>
                  </div>
                </div>
                <div className="w-full mt-4 px-4 text-center">
                  <p className="text-[10px] text-slate-500 bg-slate-800/50 py-1 px-2 rounded-full inline-block">
                    Goal automatically adjusts with weight
                  </p>
                </div>
              </div>
            </div>
            
            <button onClick={() => setActiveTab('tracker')} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transform active:scale-[0.99] transition-all">
              LOG WEIGHT & HABITS
            </button>
          </div>
        )}

        {/* --- TRACKER VIEW (WEIGHT & HABITS) --- */}
        {activeTab === 'tracker' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-8 shadow-sm">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                 <h2 className="text-xl font-bold text-white flex items-center gap-2"><Calendar size={20} className="text-emerald-500"/> {getToday()}</h2>
                 <span className="text-xs bg-slate-800 text-slate-400 px-3 py-1 rounded-full font-medium">Daily Log</span>
              </div>

              {/* WEIGHT INPUT */}
              <div className="space-y-2">
                <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider">Morning Weight</label>
                <div className="flex items-center gap-4">
                  <input type="number" value={todayLog.weight} onChange={(e) => setTodayLog({...todayLog, weight: e.target.value})}
                    className="bg-slate-800 text-white text-4xl font-bold p-4 rounded-xl w-40 border border-slate-700 focus:border-emerald-500 outline-none transition-all placeholder-slate-700" step="0.1" placeholder="00.0" />
                  <span className="text-slate-500 font-medium">kg</span>
                </div>
              </div>

              {/* WATER SLIDER */}
              <div className="space-y-4 bg-slate-800/30 p-4 rounded-xl border border-slate-800">
                <div className="flex justify-between items-end">
                  <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2"><Droplets size={14} className="text-blue-500"/> Water Intake</label>
                  <span className="text-2xl font-bold text-blue-400">{todayLog.water} <span className="text-sm text-slate-500">/ 3.5 L</span></span>
                </div>
                <input type="range" min="0" max="4" step="0.5" value={todayLog.water} onChange={(e) => setTodayLog({...todayLog, water: parseFloat(e.target.value)})}
                  className="w-full h-4 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                 <div className="flex justify-between text-[10px] text-slate-500 uppercase font-bold">
                    <span>Morning</span>
                    <span>Office (2L)</span>
                    <span>Evening</span>
                 </div>
              </div>

              {/* HABIT CHECKBOXES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {id: 'workout', label: 'Morning HIIT', sub: '20 mins intensity', icon: Activity},
                  {id: 'noSugar', label: 'Zero Sugar', sub: 'No sweets/soda', icon: UtensilsCrossed},
                  {id: 'lowSalt', label: 'Low Salt', sub: 'No pickles/chips', icon: Droplets},
                  {id: 'vacuums', label: 'Stomach Vacuums', sub: 'Desk core exercise', icon: Zap}
                ].map(h => (
                  <label key={h.id} className={`group flex items-center p-4 rounded-xl border cursor-pointer transition-all ${todayLog[h.id] ? 'bg-emerald-900/20 border-emerald-500/50' : 'bg-slate-800 border-slate-700 hover:border-slate-600'}`}>
                    <input type="checkbox" checked={todayLog[h.id]} onChange={(e) => setTodayLog({...todayLog, [h.id]: e.target.checked})} className="hidden" />
                    <div className={`p-3 rounded-full mr-4 transition-all ${todayLog[h.id] ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-700 text-slate-400 group-hover:bg-slate-600'}`}>
                       <h.icon size={20} />
                    </div>
                    <div>
                      <span className={`block font-bold transition-colors ${todayLog[h.id] ? 'text-white' : 'text-slate-300'}`}>{h.label}</span>
                      <span className="text-xs text-slate-500 font-medium">{h.sub}</span>
                    </div>
                    {todayLog[h.id] && <CheckCircle className="ml-auto text-emerald-500 animate-in zoom-in" size={20} />}
                  </label>
                ))}
              </div>

              <button onClick={handleSaveLog} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-emerald-900/20 active:scale-[0.99] transition-all">
                <Save size={20} /> SAVE DAILY LOG
              </button>
            </div>
          </div>
        )}

        {/* --- FOOD LOGGING VIEW (NEW) --- */}
        {activeTab === 'food' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            
            {/* Food Stats Header */}
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-center">
                  <span className="text-xs text-slate-500 font-bold uppercase flex items-center justify-center gap-1">
                    Calories Left <Info size={12} className="text-slate-600"/>
                  </span>
                  <div className={`text-2xl font-bold ${dailyCalorieGoal - todayCalories < 0 ? 'text-red-500' : 'text-white'}`}>
                    {dailyCalorieGoal - todayCalories}
                  </div>
                  <span className="text-[10px] text-slate-600">Goal: {dailyCalorieGoal}</span>
               </div>
               <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-center">
                  <span className="text-xs text-slate-500 font-bold uppercase">Protein</span>
                  <div className="text-2xl font-bold text-amber-500">{todayProtein}g</div>
               </div>
            </div>

            {/* AI MAGIC ADD SECTION */}
            <div className="bg-indigo-900/20 p-5 rounded-xl border border-indigo-500/30">
               <h3 className="text-xs text-indigo-400 font-bold uppercase mb-2 flex items-center gap-2">
                 <Sparkles size={14}/> AI Magic Food Logger
               </h3>
               <div className="flex gap-2">
                  <input 
                    placeholder="e.g. 2 eggs and a slice of toast" 
                    className="flex-1 bg-slate-900 rounded-lg px-3 py-3 text-sm text-white border border-slate-700 focus:border-indigo-500 outline-none placeholder-slate-600"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAiFoodAdd()}
                  />
                  <button 
                    onClick={handleAiFoodAdd} 
                    disabled={aiLoading}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
                  >
                    {aiLoading ? <Loader2 className="animate-spin" size={18} /> : "ADD"}
                  </button>
               </div>
               <p className="text-[10px] text-slate-500 mt-2">Gemini will estimate calories & protein automatically.</p>
            </div>

            {/* Quick Add Buttons */}
            <div className="bg-slate-900 p-5 rounded-xl border border-slate-800">
               <h3 className="text-xs text-slate-400 font-bold uppercase mb-4 flex items-center gap-2">
                 <Zap size={14} className="text-yellow-500"/> Diet Plan Shortcuts
               </h3>
               <div className="flex flex-wrap gap-2">
                  {quickFoods.map((f, i) => (
                    <button key={i} onClick={() => addFood(f)} className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium py-2 px-3 rounded-lg border border-slate-700 transition-all active:scale-95 flex items-center gap-2">
                      {f.name} <span className="text-emerald-500 text-[10px]">{f.cals}</span>
                    </button>
                  ))}
               </div>
            </div>

            {/* Manual Add Form */}
            <div className="bg-slate-900 p-5 rounded-xl border border-slate-800">
               <h3 className="text-xs text-slate-400 font-bold uppercase mb-4">Add Custom Food</h3>
               <div className="flex gap-2 mb-2">
                  <input placeholder="Food Name" className="flex-1 bg-slate-800 rounded-lg px-3 py-2 text-sm text-white border border-slate-700 focus:border-emerald-500 outline-none" 
                    value={newFood.name} onChange={e => setNewFood({...newFood, name: e.target.value})} />
                  <input placeholder="Kcal" type="number" className="w-20 bg-slate-800 rounded-lg px-3 py-2 text-sm text-white border border-slate-700 focus:border-emerald-500 outline-none" 
                    value={newFood.cals} onChange={e => setNewFood({...newFood, cals: e.target.value})} />
                  <input placeholder="Prot(g)" type="number" className="w-20 bg-slate-800 rounded-lg px-3 py-2 text-sm text-white border border-slate-700 focus:border-emerald-500 outline-none" 
                    value={newFood.protein} onChange={e => setNewFood({...newFood, protein: e.target.value})} />
               </div>
               <button onClick={() => addFood(null)} className="w-full bg-slate-800 hover:bg-slate-700 text-emerald-500 font-bold text-sm py-2 rounded-lg border border-slate-700 flex items-center justify-center gap-2">
                  <PlusCircle size={16}/> ADD FOOD
               </button>
            </div>

            {/* Today's List */}
            <div className="space-y-2">
              <h3 className="text-xs text-slate-500 font-bold uppercase pl-2">Consumed Today</h3>
              {todayFoods.length === 0 ? (
                <div className="text-center py-8 text-slate-600 text-sm">No food logged yet today.</div>
              ) : (
                todayFoods.map((f) => (
                  <div key={f.id} className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex justify-between items-center animate-in fade-in">
                     <div>
                       <div className="text-sm font-bold text-white">{f.name}</div>
                       <div className="text-xs text-slate-500">{f.cals} kcal • {f.protein}g protein</div>
                     </div>
                     <button onClick={() => removeFood(f.id)} className="text-slate-600 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* --- ANALYTICS VIEW --- */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-in fade-in zoom-in duration-300">
             
             {/* Full Weight Graph */}
             <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 h-80">
              <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2"><TrendingDown size={16} className="text-emerald-500"/> Full Weight History</h3>
              <ResponsiveContainer width="100%" height="90%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" tickFormatter={d => d.slice(5)} fontSize={12}/>
                  <YAxis domain={['dataMin - 1', 'dataMax + 1']} stroke="#94a3b8" fontSize={12} width={30}/>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }} />
                  <ReferenceLine y={settings.goalWeight} stroke="gold" strokeDasharray="3 3" label={{ position: 'right', value: 'Goal', fill: 'gold', fontSize: 10 }} />
                  <Line type="monotone" dataKey="actualWeight" stroke="#10b981" strokeWidth={3} dot={{r:4}} />
                  <Line type="monotone" dataKey="idealWeight" stroke="#64748b" strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Calorie Intake Graph */}
            <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 h-64">
              <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2"><Flame size={16} className="text-orange-500"/> Calorie Intake History</h3>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={chartData.filter(d => d.actualWeight !== null)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" tickFormatter={d => d.slice(8)} fontSize={12}/>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }} />
                  {/* Note: In a real dynamic graph, the reference line would need to be dynamic per day. For simplicity we visualize the *current* goal */}
                  <ReferenceLine y={dailyCalorieGoal} stroke="orange" strokeDasharray="3 3"/>
                  <Bar dataKey="calories" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Habits */}
            <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 h-64">
              <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2"><Award size={16} className="text-blue-500"/> Habit Consistency</h3>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={chartData.filter(d => d.actualWeight !== null)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" tickFormatter={d => d.slice(8)} fontSize={12}/>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} />
                  <Bar dataKey="habitScore" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <button onClick={clearData} className="w-full py-3 text-red-500 hover:text-red-400 text-sm font-medium border border-slate-800 rounded-lg hover:bg-slate-800 transition-colors">Reset All Data (Start Over)</button>
          </div>
        )}

        {/* --- SETTINGS VIEW --- */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-sm">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Settings size={20} className="text-emerald-500" /> Challenge Settings
              </h2>
              
              <form onSubmit={handleUpdateSettings} className="space-y-6">
                {/* Personal Info */}
                <div className="space-y-4">
                  <h3 className="text-xs text-slate-500 font-bold uppercase border-b border-slate-800 pb-2">Profile</h3>
                  <div>
                    <label className="block text-slate-400 text-xs font-bold uppercase mb-1">Your Name</label>
                    <input name="name" defaultValue={settings.name} className="w-full bg-slate-800 text-white rounded-lg p-3 border border-slate-700 focus:border-emerald-500 outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-400 text-xs font-bold uppercase mb-1">Height (cm)</label>
                      <input name="height" type="number" defaultValue={settings.height} className="w-full bg-slate-800 text-white rounded-lg p-3 border border-slate-700 focus:border-emerald-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-xs font-bold uppercase mb-1">Age</label>
                      <input name="age" type="number" defaultValue={settings.age} className="w-full bg-slate-800 text-white rounded-lg p-3 border border-slate-700 focus:border-emerald-500 outline-none" />
                    </div>
                  </div>
                </div>

                {/* Challenge Goals */}
                <div className="space-y-4">
                  <h3 className="text-xs text-slate-500 font-bold uppercase border-b border-slate-800 pb-2">Targets</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-400 text-xs font-bold uppercase mb-1">Starting Weight (Kg)</label>
                      <input name="startWeight" type="number" step="0.1" defaultValue={settings.startWeight} className="w-full bg-slate-800 text-white rounded-lg p-3 border border-slate-700 focus:border-emerald-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-emerald-400 text-xs font-bold uppercase mb-1">Goal Weight (Kg)</label>
                      <input name="goalWeight" type="number" step="0.1" defaultValue={settings.goalWeight} className="w-full bg-slate-800 text-white rounded-lg p-3 border border-emerald-500/50 focus:border-emerald-500 outline-none font-bold" />
                    </div>
                  </div>

                  <div>
                     <label className="block text-blue-400 text-xs font-bold uppercase mb-1">Deadline Date</label>
                     <input name="endDate" type="date" defaultValue={settings.endDate} className="w-full bg-slate-800 text-white rounded-lg p-3 border border-blue-500/50 focus:border-blue-500 outline-none" />
                  </div>
                </div>

                <div className="pt-4">
                  <button type="submit" className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 active:scale-[0.99] transition-all">
                    <Save size={20} /> UPDATE SETTINGS
                  </button>
                </div>
              </form>
            </div>
            
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 text-center">
              <p className="text-xs text-slate-500">
                Adjusting these settings will recalculate your daily calorie goals and update your progress trajectory graph immediately.
              </p>
            </div>
          </div>
        )}

      </main>

      {/* FOOTER - ABOUT SECTION */}
      <footer className="bg-slate-900 border-t border-slate-800 py-8 px-4 mt-auto">
         <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
                   <Heart className="text-emerald-500" size={20}/> About {APP_NAME}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                   A dedicated tracker built for the weight loss challenge. 
                   Combining daily accountability, AI-powered nutrition insights, and habit tracking 
                   to help you achieve sustainable results.
                </p>
              </div>
              <div className="flex flex-col md:items-end text-slate-500 text-sm">
                 <p className="mb-1">© 2025 {APP_NAME} Project</p>
                 <p className="flex items-center gap-1">
                   Designed & Built by <span className="text-slate-200 font-medium">{settings.name}</span>
                 </p>
              </div>
            </div>
         </div>
      </footer>

      {/* MOBILE NAV (Bottom Sticky) */}
      <nav className="fixed bottom-0 left-0 w-full bg-slate-900 border-t border-slate-800 md:hidden flex justify-around p-3 z-30 pb-safe shadow-lg">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center transition-colors ${activeTab === 'dashboard' ? 'text-emerald-500' : 'text-slate-500'}`}>
          <Activity size={20} />
          <span className="text-[10px] mt-1 font-medium">Dash</span>
        </button>
        <button onClick={() => setActiveTab('tracker')} className={`flex flex-col items-center transition-colors ${activeTab === 'tracker' ? 'text-emerald-500' : 'text-slate-500'}`}>
           <Calendar size={20} />
          <span className="text-[10px] mt-1 font-medium">Log</span>
        </button>
        <button onClick={() => setActiveTab('food')} className={`flex flex-col items-center transition-colors ${activeTab === 'food' ? 'text-emerald-500' : 'text-slate-500'}`}>
           <div className="bg-slate-800 p-3 rounded-full -mt-8 border border-slate-700 shadow-lg relative">
             <UtensilsCrossed size={20} className={activeTab === 'food' ? 'text-emerald-500' : 'text-slate-200'} />
           </div>
           <span className="text-[10px] mt-1 font-medium">Food</span>
        </button>
        <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center transition-colors ${activeTab === 'settings' ? 'text-emerald-500' : 'text-slate-500'}`}>
          <Settings size={20} />
          <span className="text-[10px] mt-1 font-medium">Config</span>
        </button>
      </nav>
    </div>
  );
}