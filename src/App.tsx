import { useState, useEffect, useRef } from "react"; 
import { initializeApp } from "firebase/app"; 
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "fir
const firebaseConfig = { 
 apiKey: "AIzaSyCazjyRAq4Y8aQZszhT4mT18CzfSl4Sdx0", 
 authDomain: "whole-sale-74a40.firebaseapp.com", 
 projectId: "whole-sale-74a40", 
 storageBucket: "whole-sale-74a40.firebasestorage.app", 
 messagingSenderId: "662354746952", 
 appId: "1:662354746952:web:f1f033dddb04711d57427d" 
}; 
const app = initializeApp(firebaseConfig); 
const db = getFirestore(app); 
const T = { 
 bg0:"#020509", bg2:"#07101e", bg3:"#0b1628", bg4:"#0f1e34", 
 line:"#162840", line2:"#1e3a54", 
 gold:"#f0a820", goldL:"#ffc840", goldD:"#a06810", 
 green:"#16c85a", greenL:"#20f070", 
 red:"#e02838", redL:"#ff3848", 
 blue:"#10a0f0", blueL:"#30c8ff", 
 purple:"#8050e0", purpleL:"#a878ff", 
 orange:"#e87020", orangeL:"#ff9040", 
 teal:"#10b8b0", tealL:"#20e0d8", 
 dim:"#2a4060", mid:"#4a7090", 
 text:"#c0d8e8", 
 bright:"#e0eef8", 
 white:"#f0f8ff", 
}; 
const fmt = (v: any) => !v || isNaN(v) ? "--" : `$${Math.round(+v).toLocaleString()}`; const pctS = (v: any) => isNaN(v) ? "--" : `${(+v * 100).toFixed(1)}%`; const uid = () => Math.random().toString(36).slice(2, 9); 
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v)); const ago = (ts: number) => { 
 const s = Math.floor((Date.now() - ts) / 1000); 
 if (s < 60) return `${s}s`; 
 if (s < 3600) return `${Math.floor(s / 60)}m`; 
 if (s < 86400) return `${Math.floor(s / 3600)}h`; 
 return `${Math.floor(s / 86400)}d`; 
};
function calcDeal(arv: any, price: any, repairs: any, fee = 8000, disc = 0.70) {  const a = +arv || 0, p = +price || 0, r = +repairs || 0, f = +fee || 8000;  const mao = a * disc - r - f, margin = a > 0 ? (a - p - r) / a : 0; 
 const spread = p - mao, buyerProfit = a - p - r; 
 let grade: string, gc: string, verdict: string, urgency: string; 
 if (margin >= 0.38) { grade = "A+"; gc = T.greenL; verdict = "FIRE DEAL"; urgency = "MOVE  else if (margin >= 0.28) { grade = "A"; gc = T.green; verdict = "Strong Deal"; urgency = " else if (margin >= 0.20) { grade = "B+"; gc = T.goldL; verdict = "Good Deal"; urgency = "T else if (margin >= 0.14) { grade = "B"; gc = T.gold; verdict = "Marginal"; urgency = "NEGO else if (margin >= 0.07) { grade = "C"; gc = T.mid; verdict = "Weak"; urgency = "LOW PRI"; else { grade = "D"; gc = T.red; verdict = "No Deal"; urgency = "ARCHIVE"; } 
 return { mao, margin, spread, buyerProfit, grade, gc, verdict, urgency, isProfitable: spre} 
const STAGES = ["New Lead","Attempted Contact","Warm Lead","Follow-Up Needed","Appointment Sconst STAGE_MEANING: Record<string, string> = { 
 "New Lead": "Not contacted", "Attempted Contact": "Outreach started",  "Warm Lead": "Interested", "Follow-Up Needed": "Future opportunity",  "Appointment Set": "Active negotiation", "Under Negotiation": "Serious lead",  "Under Contract": "Secured deal", "Sent To Buyers": "Disposition stage",  "Closed": "Assignment completed", "Dead Lead": "Not viable" 
}; 
const STAGE_COLORS: Record<string, string> = { 
 "New Lead": T.blue, "Attempted Contact": T.blueL, "Warm Lead": T.teal,  "Follow-Up Needed": T.gold, "Appointment Set": T.purple, 
 "Under Negotiation": T.orange, "Under Contract": T.orangeL, 
 "Sent To Buyers": T.purpleL, "Closed": T.green, "Dead Lead": T.red 
}; 
const SOURCES = ["Zillow","Redfin","Craigslist","Facebook","MLS/Agent","PropStream","DealMacconst AREAS = ["Midtown","Eastside","Westside","Northside","Southside","Suburbs","All Areas"]
const PARTNERS: Record<string, any> = { 
 acq: { 
 name: "Partner 1 - Acquisitions", short: "Acq", mission: "Secure opportunities.",  color: T.gold, icon: "ACQ", kpi: "Contracts Secured", 
 responsibilities: ["Seller calls","Lead qualification","Negotiations","Appointments","Re }, 
 ops: { 
 name: "Partner 2 - Operations / CRM", short: "Ops", mission: "Build and maintain the mac color: T.blueL, icon: "OPS", kpi: "Pipeline Organization + Deals Moved",  responsibilities: ["CRM management","Lead tracking","Data entry","Follow-up scheduling", } 
}; 
const DAILY_PHASES = [ 
 { phase: "MORNING", label: "Planning Phase", time: "Both Partners", color: T.gold,  tasks: ["Review pipeline","Review follow-ups","Review hot leads","Review appointments","
 questions: ["Which sellers are hottest?","Which deals need follow-up?","Which buyers sho { phase: "MIDDAY", label: "Execution Phase", time: "Split Focus", color: T.orange,  acqFocus: ["Outbound calls","Inbound lead handling","Negotiations","Appointments","Relat opsFocus: ["CRM updates","Pulling comps","Calculating MAO","Organizing buyer lists","Sch { phase: "EVENING", label: "Review Phase", time: "Both Partners", color: T.purple,  tasks: ["Review new leads","Update statuses","Discuss problem deals","Review KPI numbers note: "Keep emotions OUT. Review data objectively." } 
]; 
const WEEKLY_KPIS = [ 
 { id: "calls", label: "Calls Made", icon: "CALL", color: T.blue, target: 50, owner: "acq" } { id: "leads", label: "Leads Generated", icon: "LEAD", color: T.green, target: 15, owner:  { id: "appts", label: "Appointments Set", icon: "APPT", color: T.gold, target: 5, owner: " { id: "offers", label: "Offers Made", icon: "OFFR", color: T.orange, target: 5, owner: "ac { id: "contracts", label: "Contracts Secured", icon: "CNTR", color: T.goldL, target: 1, ow { id: "buyers", label: "Buyer Contacts", icon: "BUYR", color: T.purple, target: 10, owner: { id: "closed", label: "Closed Deals", icon: "CLSD", color: T.greenL, target: 1, owner: "b { id: "avgfee", label: "Avg Assignment Fee", icon: "FEE", color: T.tealL, target: 7500, ow]; 
const IRON_LAWS = [ 
 { n: 1, law: "Never Exceed MAO", color: T.redL, detail: "(ARV x 0.70) - Repairs - Fee = MA { n: 2, law: "Contact Within 24 Hours", color: T.goldL, detail: "Every GREEN lead gets a c { n: 3, law: "Log Everything Immediately", color: T.blueL, detail: "Every call, text, visi { n: 4, law: "3 Comps Minimum", color: T.purpleL, detail: "Never calculate ARV from 1 comp.
 { n: 5, law: "Seller Hears Number First", color: T.orangeL, detail: "Always ask what numbe { n: 6, law: "Never Send Earnest to Seller", color: T.redL, detail: "Earnest money goes to { n: 7, law: "'And/Or Assigns' Every Time", color: T.goldL, detail: "Every contract must i { n: 8, law: "Proof of Funds Before Address", color: T.greenL, detail: "No buyer gets the  { n: 9, law: "Follow Up 5x Before Dead", color: T.blueL, detail: "Most deals close on the  { n: 10, law: "Close in 21 Days or Less", color: T.purpleL, detail: "Speed is leverage. Op { n: 11, law: "3 Contractor Bids Always", color: T.orangeL, detail: "Never use seller's es { n: 12, law: "10+ Buyers Every Deal", color: T.greenL, detail: "Blast every deal to 10+ b]; 
const ALL_SCRIPTS = [ 
 { role: "ACQ", color: T.gold, title: "Cold Call Opener", body: "Hi, is this [NAME]? My nam { role: "ACQ", color: T.gold, title: "4 Qualification Questions", body: "Ask in this exact { role: "ACQ", color: T.gold, title: "Making the Offer", body: "Based on the condition and { role: "ACQ", color: T.gold, title: "Handling I Want More", body: "I understand completel { role: "ACQ", color: T.gold, title: "Locking the Contract", body: "Perfect - I will send  { role: "OPS", color: T.blueL, title: "Buyer Blast Text", body: "NEW DEAL - [AREA], TUCSON { role: "OPS", color: T.blueL, title: "Investor Outreach", body: "Hey [NAME], I have a new { role: "OPS", color: T.blueL, title: "Follow-Up Sequence", body: "Day 1: Call (use opener { role: "TITLE", color: T.purple, title: "Title Company Intro", body: "Subject: New Invest];
const GradeChip = ({ grade, color, size = 14 }: { grade: string; color: string; size?: numbe <div style={{ width: size + 16, height: size + 16, borderRadius: 5, background: color + "2); 
const Tag = ({ color, children, sm }: { color: string; children: React.ReactNode; sm?: boole <span style={{ background: color + "20", border: `1px solid ${color}50`, color, borderRadi); 
const SecHead = ({ children, color = T.gold }: { children: React.ReactNode; color?: string }) <div style={{ fontSize: 10, letterSpacing: 2, color, textTransform: "uppercase", marginBot); 
const Panel = ({ children, glow, style = {} }: { children: React.ReactNode; glow?: string; s <div style={{ background: T.bg3, border: `1px solid ${glow ? glow + "40" : T.line}`, borde); 
const NInput = ({ label, val, onChange, prefix, type = "number", ph }: { label?: string; val: <div> 
 {label && <div style={{ fontSize: 9, color: T.text, letterSpacing: 0.5, textTransform: " <div style={{ position: "relative" }}> 
 {prefix && <span style={{ position: "absolute", left: 7, top: "50%", transform: "trans <input type={type} value={val} placeholder={ph || ""} onChange={e => onChange(e.target. style={{ width: "100%", boxSizing: "border-box", background: T.bg2, border: `1px sol </div> 
 </div> 
); 
const NSel = ({ label, val, onChange, opts }: { label?: string; val: string; onChange: (v: s <div> 
 {label && <div style={{ fontSize: 9, color: T.text, letterSpacing: 0.5, textTransform: " <select value={val} onChange={e => onChange(e.target.value)} style={{ width: "100%", bac {opts.map(o => <option key={o} value={o}>{o}</option>)} 
 </select> 
 </div> 
); 
function useToast() { 
 const [toasts, setToasts] = useState<{ id: string; msg: string; type: string }[]>([]);  const push = (msg: string, type = "info") => { 
 const id = uid(); 
 setToasts(p => [{ id, msg, type }, ...p.slice(0, 4)]); 
 setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 5000);  }; 
 return { toasts, push }; 
} 
export default function App() { 
 const [tab, setTab] = useState("command"); 
 const [deals, setDeals] = useState<any[]>([]); 
 const [buyers, setBuyers] = useState<any[]>([]); 
 const [kpiVals, setKpiVals] = useState<Record<string, number>>({}); 
 const { toasts, push } = useToast();
 const searchRef = useRef<HTMLDivElement>(null); 
 const [searchQuery, setSearchQuery] = useState(""); 
 const [searchFocused, setSearchFocused] = useState(false); 
 const [searchHighlight, setSearchHighlight] = useState<string | null>(null); 
 useEffect(() => { 
 const unsubDeals = onSnapshot(collection(db, "deals"), snap => { 
 setDeals(snap.docs.map(d => ({ ...d.data(), id: d.id }))); 
 }); 
 const unsubBuyers = onSnapshot(collection(db, "buyers"), snap => {  setBuyers(snap.docs.map(d => ({ ...d.data(), id: d.id }))); 
 }); 
 return () => { unsubDeals(); unsubBuyers(); }; 
 }, []); 
 const searchResults = searchQuery.trim().length > 1 ? (() => { 
 const q = searchQuery.toLowerCase(); 
 const dm = deals.filter(d => 
 d.address?.toLowerCase().includes(q) || 
 (d.sellerName || "").toLowerCase().includes(q) || 
 (d.sellerPhone || "").toLowerCase().includes(q) || 
 (d.notes || "").toLowerCase().includes(q) || 
 (d.leadId || "").toLowerCase().includes(q) || 
 d.stage?.toLowerCase().includes(q) 
 ).map(d => ({ ...d, _type: "deal" })); 
 const bm = buyers.filter(b => 
 b.name?.toLowerCase().includes(q) || 
 (b.phone || "").toLowerCase().includes(q) || 
 (b.area || "").toLowerCase().includes(q) 
 ).map(b => ({ ...b, _type: "buyer" })); 
 return [...dm, ...bm]; 
 })() : []; 
 function handleSearchSelect(r: any) { 
 setSearchQuery(""); setSearchFocused(false); 
 if (r._type === "deal") { setSelectedDeal(r.id); setTab("deals"); setSearchHighlight(r.i else setTab("people"); 
 } 
 useEffect(() => { 
 const h = (e: MouseEvent) => { if (searchRef.current && !searchRef.current.contains(e.ta document.addEventListener("mousedown", h); 
 return () => document.removeEventListener("mousedown", h); 
 }, []); 
 const [cArv, setCArv] = useState(185000); 
 const [cPrice, setCPrice] = useState(0);
 const [cRep, setCRep] = useState(25000); 
 const [cFee, setCFee] = useState(8000); 
 const [cDisc, setCDisc] = useState(70); 
 const NOW = Date.now(); 
 const emptyF: Record<string, any> = { leadId: `L-${String(deals.length + 1).padStart(3, "0 const [showDealForm, setShowDealForm] = useState(false); 
 const [dealForm, setDealForm] = useState<Record<string, any>>(emptyF);  const [editDealId, setEditDealId] = useState<string | null>(null); 
 const [selectedDeal, setSelectedDeal] = useState<string | null>(null); 
 const dupWarning = dealForm.address.length > 8 && !editDealId ? deals.find(d => {  const nA = dealForm.address.toLowerCase().replace(/[^a-z0-9]/g, "");  const nB = (d.address || "").toLowerCase().replace(/[^a-z0-9]/g, "");  return nA.slice(0, 14) === nB.slice(0, 14); 
 }) : null; 
 const emptyB: Record<string, any> = { name: "", phone: "", email: "", area: "Tucson Metro", const [showBuyerForm, setShowBuyerForm] = useState(false); 
 const [buyerForm, setBuyerForm] = useState<Record<string, any>>(emptyB); 
 const [dealFilter, setDealFilter] = useState("all"); 
 const [areaFilter, setAreaFilter] = useState("All Areas"); 
 const [scriptFilter, setScriptFilter] = useState("ALL"); 
 const [siteCat, setSiteCat] = useState(0); 
 const [lawOpen, setLawOpen] = useState<number | null>(null); 
 const [copiedIdx, setCopiedIdx] = useState<number | null>(null); 
 const [pulse, setPulse] = useState(false); 
 const [clock, setClock] = useState(new Date()); 
 const [buyBox] = useState({ minArv: 100000, maxPrice: 160000, maxRepairs: 50000, minMargin: const [activePhase, setActivePhase] = useState(0); 
 const [dailyChecks, setDailyChecks] = useState<Record<number, boolean>>({}); 
 useEffect(() => { const t = setInterval(() => setClock(new Date()), 1000); return () => cl useEffect(() => { const t = setInterval(() => setPulse(p => !p), 1800); return () => clear
 const alertDeals = deals.filter(d => { const g = calcDeal(d.arv, d.price, d.repairs); retu const hotDeals = deals.filter(d => ["A+", "A"].includes(calcDeal(d.arv, d.price, d.repairs) const followUpDue = deals.filter(d => d.nextFollowUp && d.nextFollowUp <= Date.now() && ![ const closedDeals = deals.filter(d => d.stage === "Closed"); 
 const totalEarned = closedDeals.reduce((s, d) => s + (+d.estimatedFee || 0), 0); 
 function submitDeal() { 
 if (!dealForm.address || !dealForm.arv || !dealForm.price) { push("Need Address, ARV, an if (dupWarning) { push("Duplicate address detected!", "error"); return; }  const g = calcDeal(dealForm.arv, dealForm.price, dealForm.repairs);  const nd = { ...dealForm, ts: Date.now(), starred: editDealId ? (deals.find(d => d.id ==
 if (editDealId) { updateDoc(doc(db, "deals", editDealId), nd); push(`Deal updated - Grad else { addDoc(collection(db, "deals"), nd); push(`Deal added - Grade ${g.grade}`); }  setShowDealForm(false); setEditDealId(null); setDealForm({ ...emptyF });  } 
 function openEditDeal(deal: any) { 
 setDealForm({ ...deal, arv: String(deal.arv), price: String(deal.price), repairs: String setEditDealId(deal.id); setShowDealForm(true); 
 } 
 function deleteDeal(id: string) { deleteDoc(doc(db, "deals", id)); setSelectedDeal(null);  function advanceStage(id: string) { 
 const deal = deals.find(d => d.id === id); if (!deal) return; 
 const i = STAGES.indexOf(deal.stage); 
 const ns = STAGES[Math.min(i + 1, STAGES.length - 1)]; 
 if (ns === "Closed") push("CLOSED! Collect your check!", "alert");  updateDoc(doc(db, "deals", id), { stage: ns }); 
 } 
 function toggleStarred(id: string, current: boolean) { updateDoc(doc(db, "deals", id), { s function addBuyer() { 
 if (!buyerForm.name) { push("Buyer name required", "error"); return; }  addDoc(collection(db, "buyers"), { ...buyerForm, pof: !!buyerForm.pof, minArv: +buyerFor setShowBuyerForm(false); setBuyerForm(emptyB); push("Buyer added");  } 
 function deleteBuyer(id: string) { deleteDoc(doc(db, "buyers", id)); push("Buyer removed"); function copyScript(txt: string, idx: number) { navigator.clipboard.writeText(txt); setCop
 const filteredDeals = deals.filter(d => { 
 const g = calcDeal(d.arv, d.price, d.repairs); 
 if (dealFilter === "alerts" && !alertDeals.find(x => x.id === d.id)) return false;  if (dealFilter === "hot" && !["A+", "A"].includes(g.grade)) return false;  if (dealFilter === "starred" && !d.starred) return false; 
 if (dealFilter === "followup" && !followUpDue.find(x => x.id === d.id)) return false;  if (areaFilter !== "All Areas" && d.area !== areaFilter) return false;  return true; 
 }); 
 const selDeal = selectedDeal ? deals.find(d => d.id === selectedDeal) : null;  const selGrade = selDeal ? calcDeal(selDeal.arv, selDeal.price, selDeal.repairs) : null; 
 const TABS = [ 
 { id: "command", label: "Command" }, { id: "team", label: "Team" },  { id: "deals", label: "Deals" }, { id: "pipeline", label: "Pipeline" },  { id: "calc", label: "Calc" }, { id: "people", label: "Buyers" }, 
 { id: "scripts", label: "Scripts" }, { id: "sop", label: "SOP" } 
 ];
 const TX: Record<string, React.CSSProperties> = { 
 h1: { fontSize: 16, fontWeight: 900, color: T.white, letterSpacing: 0.5 },  h2: { fontSize: 13, fontWeight: 800, color: T.bright }, 
 h3: { fontSize: 11, fontWeight: 700, color: T.bright }, 
 body: { fontSize: 11, fontWeight: 600, color: T.text, lineHeight: 1.6 },  label: { fontSize: 9, fontWeight: 700, color: T.text, letterSpacing: 1, textTransform: " dim: { fontSize: 9, fontWeight: 600, color: T.mid } 
 }; 
 return ( 
 <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100%", 
 {/* TOASTS */} 
 <div style={{ position: "fixed", top: 52, right: 6, zIndex: 1000, display: "flex", fle {toasts.map(t => ( 
 <div key={t.id} style={{ background: t.type === "alert" ? `${T.redL}f0` : t.type = ))} 
 </div> 
 {/* HEADER */} 
 <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 10px", heigh <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>  <div style={{ width: 8, height: 8, borderRadius: "50%", background: pulse ? T.gree <div> 
 <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: 3, color: T.gold, te <div style={{ fontSize: 7, color: T.mid, letterSpacing: 1, fontWeight: 600 }}>{c </div> 
 </div> 
 <div ref={searchRef} style={{ position: "relative", flex: 1, maxWidth: 360 }}>  <div style={{ display: "flex", alignItems: "center", background: T.bg2, border: `1. <span style={{ fontSize: 12, color: T.mid }}>S</span> 
 <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onFocu {searchQuery && <button onClick={() => { setSearchQuery(""); setSearchFocused(fa </div> 
 {searchFocused && searchQuery.trim().length > 1 && ( 
 <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,  {searchResults.length === 0 ? ( 
 <div style={{ padding: "16px 13px", textAlign: "center", fontSize: 11, color: ) : ( 
 <div style={{ maxHeight: 300, overflowY: "auto" }}> 
 {searchResults.map((r, i) => ( 
 <div key={i} onMouseDown={() => handleSearchSelect(r)} style={{ padding: <div style={{ ...TX.h3 }}>{r._type === "deal" ? r.address : r.name}</d <div style={{ ...TX.dim }}>{r._type === "deal" ? `${r.stage} - ${r.lea </div> 
 ))}
 </div> 
 )} 
 </div> 
 )} 
 </div> 
 <div style={{ display: "flex", gap: 0, flexShrink: 0 }}> 
 {[ 
 { l: "Alerts", v: alertDeals.length, c: alertDeals.length > 0 ? T.redL : T.dim },  { l: "Deals", v: deals.length, c: T.gold }, 
 { l: "Earned", v: fmt(totalEarned), c: T.greenL } 
 ].map(({ l, v, c }) => ( 
 <div key={l} style={{ textAlign: "center", padding: "1px 9px", borderLeft: `1px  <div style={{ fontSize: 14, fontWeight: 900, color: c, lineHeight: 1.3, fontFa <div style={{ fontSize: 7, color: T.mid, textTransform: "uppercase", letterSpa </div> 
 ))} 
 </div> 
 </div> 
 {/* QUICK ROW */} 
 <div style={{ display: "flex", background: T.bg4, borderBottom: `1px solid ${T.line}`, <span style={{ fontSize: 9, color: T.mid, fontWeight: 700, letterSpacing: 1, textTra {[{ id: "command", label: "Command" }, { id: "deals", label: "Deals" }, { id: "pipel <button key={t.id} onClick={() => setTab(t.id)} style={{ background: tab === t.id  ))} 
 <div style={{ flex: 1 }} /> 
 <button onClick={() => { setEditDealId(null); setDealForm({ ...emptyF }); setShowDea </div> 
 {/* CONTENT */} 
 <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: 10, paddingBot
 {/* COMMAND */} 
 {tab === "command" && ( 
 <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>  <div style={{ background: "linear-gradient(135deg,#0e0900,#1a1200)", border: `1p <div style={{ ...TX.h1, fontSize: 14, color: T.gold }}>APEX Wholesale Machine  <div style={{ ...TX.body, marginTop: 5 }}>Find - Lock - Assign - Collect - Rep <div style={{ ...TX.body, marginTop: 4, color: T.greenL, fontWeight: 800 }}>LI </div> 
 {followUpDue.length > 0 && ( 
 <Panel style={{ border: `1px solid ${T.goldL}44`, background: `${T.gold}0a` }}  <SecHead color={T.goldL}>Follow-Ups Due Today ({followUpDue.length})</SecHea {followUpDue.slice(0, 4).map(d => ( 
 <div key={d.id} onClick={() => { setSelectedDeal(d.id); setTab("deals"); }}
 <div> 
 <div style={{ ...TX.h3 }}>{d.address}</div> 
 <div style={{ ...TX.dim, marginTop: 2 }}>{d.sellerName} - {d.stage}</d </div> 
 <Tag color={T.goldL}>Follow Up</Tag> 
 </div> 
 ))} 
 </Panel> 
 )} 
 <Panel> 
 <SecHead>Live KPI Snapshot</SecHead> 
 <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 7, m {[ 
 { l: "Total Deals", v: deals.length, c: T.gold }, 
 { l: "Active", v: deals.filter(d => !["Closed", "Dead Lead"].includes(d.st { l: "Closed", v: closedDeals.length, c: T.greenL },  { l: "Hot Deals", v: hotDeals.length, c: hotDeals.length > 0 ? T.redL : T. ].map(({ l, v, c }) => ( 
 <div key={l} style={{ background: T.bg2, border: `1px solid ${T.line}`, bo <div style={{ ...TX.label, marginBottom: 3 }}>{l}</div>  <div style={{ fontSize: 18, fontWeight: 900, color: c, fontFamily: "mono </div> 
 ))} 
 </div> 
 </Panel> 
 <Panel> 
 <SecHead>Weekly KPI Tracker</SecHead> 
 {WEEKLY_KPIS.map((kpi, i) => { 
 const val = kpiVals[kpi.id] || 0; 
 const pctDone = clamp(val / kpi.target, 0, 1); 
 const done = val >= kpi.target; 
 return ( 
 <div key={i} style={{ background: done ? `${kpi.color}0d` : T.bg2, border: <div style={{ display: "flex", alignItems: "center", gap: 9 }}>  <div style={{ fontSize: 9, color: kpi.color, fontWeight: 900, width: 3 <div style={{ flex: 1 }}> 
 <div style={{ display: "flex", justifyContent: "space-between", marg <span style={{ ...TX.h3, color: done ? kpi.color : T.bright }}>{kp <span style={{ fontSize: 11, color: kpi.color, fontFamily: "monosp </div> 
 <div style={{ background: T.bg0, borderRadius: 3, height: 5, overflo <div style={{ width: `${pctDone * 100}%`, height: "100%", backgrou </div> 
 </div> 
 <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
 <button onClick={() => setKpiVals(p => ({ ...p, [kpi.id]: Math.max(0, <button onClick={() => setKpiVals(p => ({ ...p, [kpi.id]: (p[kpi.id] </div> 
 </div> 
 </div> 
 ); 
 })} 
 </Panel> 
 </div> 
 )} 
 {/* TEAM */} 
 {tab === "team" && ( 
 <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>  {Object.entries(PARTNERS).map(([key, p]) => ( 
 <Panel key={key} glow={p.color}> 
 <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom:  <div style={{ width: 40, height: 40, borderRadius: 8, background: p.color  <div> 
 <div style={{ ...TX.h1, color: p.color }}>{p.name}</div>  <div style={{ ...TX.body, marginTop: 2 }}>Mission: {p.mission}</div>  </div> 
 </div> 
 <SecHead color={p.color}>Responsibilities</SecHead> 
 <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>  {p.responsibilities.map((r: string, i: number) => ( 
 <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, bac <div style={{ width: 6, height: 6, borderRadius: "50%", background: p. <span style={{ ...TX.body, fontSize: 10 }}>{r}</span>  </div> 
 ))} 
 </div> 
 </Panel> 
 ))} 
 <Panel> 
 <SecHead>Daily Structure</SecHead> 
 <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>  {DAILY_PHASES.map((ph, i) => ( 
 <button key={i} onClick={() => setActivePhase(i)} style={{ flex: 1, backgr <div style={{ fontSize: 8, color: activePhase === i ? ph.color : T.mid,  <div style={{ fontSize: 7, color: T.mid, marginTop: 2 }}>{ph.label}</div  </button> 
 ))} 
 </div> 
 {(() => { 
 const ph = DAILY_PHASES[activePhase];
 return ( 
 <div style={{ background: `${ph.color}0a`, border: `1px solid ${ph.color}3 <div style={{ ...TX.h2, color: ph.color, marginBottom: 8 }}>{ph.phase} - {(ph as any).tasks && (ph as any).tasks.map((t: string, i: number) => (  <div key={i} style={{ display: "flex", gap: 7, marginBottom: 4 }}>  <div style={{ color: ph.color, fontWeight: 900 }}>-&gt;</div>  <div style={{ ...TX.body }}>{t}</div> 
 </div> 
 ))} 
 {(ph as any).acqFocus && ( 
 <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, <div style={{ background: `${T.gold}10`, border: `1px solid ${T.gold} <div style={{ ...TX.label, color: T.gold, marginBottom: 6 }}>Acqui {(ph as any).acqFocus.map((f: string, i: number) => <div key={i} s </div> 
 <div style={{ background: `${T.blueL}10`, border: `1px solid ${T.blu <div style={{ ...TX.label, color: T.blueL, marginBottom: 6 }}>Oper {(ph as any).opsFocus.map((f: string, i: number) => <div key={i} s </div> 
 </div> 
 )} 
 </div> 
 ); 
 })()} 
 </Panel> 
 <Panel> 
 <SecHead>Daily Checklist</SecHead> 
 {["Review pipeline together", "Review all follow-ups due today", "Identify tod const done = dailyChecks[i]; 
 return ( 
 <div key={i} onClick={() => setDailyChecks(p => ({ ...p, [i]: !p[i] }))} s <div style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, bor <div style={{ ...TX.body, color: done ? T.greenL : T.bright, textDecorat </div> 
 ); 
 })} 
 <div style={{ textAlign: "center", ...TX.dim, marginTop: 6, fontWeight: 700 }} </Panel> 
 </div> 
 )} 
 {/* DEALS */} 
 {tab === "deals" && ( 
 <div> 
 <div style={{ display: "flex", gap: 5, marginBottom: 8, flexWrap: "wrap", alignI {[{ id: "all", label: "All" }, { id: "alerts", label: `Alerts ${alertDeals.len
 <button key={f.id} onClick={() => setDealFilter(f.id)} style={{ background:  ))} 
 <select value={areaFilter} onChange={e => setAreaFilter(e.target.value)} style {AREAS.map(a => <option key={a} value={a}>{a}</option>)}  </select> 
 </div> 
 {filteredDeals.length === 0 && <div style={{ textAlign: "center", padding: "30px
 {filteredDeals.map(deal => { 
 const g = calcDeal(deal.arv, deal.price, deal.repairs); 
 const sc = STAGE_COLORS[deal.stage] || T.mid; 
 const isHighlighted = searchHighlight === deal.id; 
 return ( 
 <div key={deal.id} style={{ background: isHighlighted ? `${T.gold}12` : T.bg onClick={() => setSelectedDeal(selectedDeal === deal.id ? null : deal.id)}  <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>  <GradeChip grade={g.grade} color={g.gc} size={15} />  <div style={{ flex: 1, minWidth: 0 }}> 
 <div style={{ display: "flex", alignItems: "center", gap: 6, marginBot <span style={{ fontSize: 8, color: T.gold, fontFamily: "monospace",  <div style={{ ...TX.h3, overflow: "hidden", textOverflow: "ellipsis", </div> 
 {deal.sellerName && <div style={{ fontSize: 10, color: T.blueL, fontWe <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: <Tag color={sc}>{deal.stage}</Tag> 
 <Tag color={T.purple}>{deal.area}</Tag> 
 <Tag color={deal.staff === "Acq" ? T.gold : T.blueL}>{deal.staff}</T </div> 
 <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", g {[{ l: "ARV", v: fmt(deal.arv), c: T.blueL }, { l: "Price", v: fmt(d <div key={l} style={{ background: T.bg2, borderRadius: 5, padding: <div style={{ ...TX.dim, marginBottom: 1 }}>{l}</div> 
 <div style={{ fontSize: 10, fontWeight: 800, color: c, fontFamil </div> 
 ))} 
 </div> 
 {deal.notes && <div style={{ ...TX.body, marginTop: 5, fontStyle: "ita </div> 
 <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", g <button onClick={e => { e.stopPropagation(); toggleStarred(deal.id, de <button onClick={e => { e.stopPropagation(); advanceStage(deal.id); }} <button onClick={e => { e.stopPropagation(); openEditDeal(deal); }} st </div> 
 </div> 
 </div> 
 );
 })} 
 {selDeal && selGrade && ( 
 <Panel glow={selGrade.gc} style={{ marginTop: 9 }}> 
 <div style={{ display: "flex", justifyContent: "space-between", alignItems:  <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>  <GradeChip grade={selGrade.grade} color={selGrade.gc} size={19} />  <div> 
 <div style={{ ...TX.h2 }}>{selDeal.address}</div>  <div style={{ fontSize: 11, fontWeight: 700, color: selGrade.gc, margi </div> 
 </div> 
 <div style={{ display: "flex", gap: 5 }}> 
 <button onClick={() => openEditDeal(selDeal)} style={{ background: `${T. <button onClick={() => deleteDeal(selDeal.id)} style={{ background: `${T. <button onClick={() => setSelectedDeal(null)} style={{ background: T.bg2, </div> 
 </div> 
 <div style={{ background: "linear-gradient(135deg,#110a00,#1c1100)", border: <div style={{ ...TX.label, color: T.mid, marginBottom: 3 }}>Maximum Allowa <div style={{ fontSize: 34, fontWeight: 900, color: T.gold, fontFamily: "m </div> 
 <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 5 } {[{ l: "Asking", v: fmt(selDeal.price), c: selGrade.isProfitable ? T.green <div key={l} style={{ background: T.bg2, border: `1px solid ${T.line}`,  <div style={{ ...TX.label, marginBottom: 2 }}>{l}</div>  <div style={{ fontSize: 13, fontWeight: 900, color: c, fontFamily: "mo </div> 
 ))} 
 </div> 
 </Panel> 
 )} 
 </div> 
 )} 
 {/* PIPELINE */} 
 {tab === "pipeline" && ( 
 <div> 
 <SecHead color={T.gold}>Pipeline Status</SecHead> 
 {STAGES.map(stage => { 
 const sd = deals.filter(d => d.stage === stage); 
 const sc = STAGE_COLORS[stage] || T.mid; 
 if (sd.length === 0 && stage === "Dead Lead") return null;  return ( 
 <div key={stage} style={{ marginBottom: 11 }}> 
 <div style={{ display: "flex", alignItems: "center", justifyContent: "spac <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
 <div style={{ width: 9, height: 9, borderRadius: 2, background: sc }}  <div style={{ fontSize: 11, fontWeight: 800, color: sc, textTransform: <div style={{ fontSize: 9, color: T.mid, fontStyle: "italic" }}>- {STA </div> 
 <Tag color={sc}>{sd.length} deal{sd.length !== 1 ? "s" : ""}</Tag>  </div> 
 {sd.length === 0 ? ( 
 <div style={{ background: T.bg2, border: `1px dashed ${T.line}`, borderR ) : sd.map(deal => { 
 const g = calcDeal(deal.arv, deal.price, deal.repairs);  return ( 
 <div key={deal.id} style={{ background: T.bg3, border: `1px solid ${sc} <div style={{ display: "flex", justifyContent: "space-between", alig <div style={{ flex: 1, minWidth: 0 }}> 
 <div style={{ ...TX.h3, overflow: "hidden", textOverflow: "ellip {deal.sellerName && <div style={{ fontSize: 9, color: T.blueL, f </div> 
 <div style={{ flexShrink: 0, textAlign: "right", marginLeft: 9 }}>  <div style={{ fontSize: 12, color: T.gold, fontFamily: "monospac <div style={{ fontSize: 10, color: g.gc, fontWeight: 700 }}>{pct <button onClick={e => { e.stopPropagation(); advanceStage(deal.i </div> 
 </div> 
 </div> 
 ); 
 })} 
 </div> 
 ); 
 })} 
 </div> 
 )} 
 {/* CALCULATOR */} 
 {tab === "calc" && ( 
 <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>  <Panel glow={T.gold}> 
 <SecHead>Deal Inputs</SecHead> 
 <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, mar <NInput label="After Repair Value" val={cArv} onChange={v => setCArv(+v || 0) <NInput label="Repair Estimate" val={cRep} onChange={v => setCRep(+v || 0)}  <NInput label="Your Fee" val={cFee} onChange={v => setCFee(+v || 0)} prefix= </div> 
 <div> 
 <div style={{ display: "flex", justifyContent: "space-between", marginBottom: <span style={{ ...TX.label }}>Investor Discount</span>  <span style={{ fontSize: 12, color: T.gold, fontFamily: "monospace", fontW </div>
 <input type="range" min={55} max={85} value={cDisc} onChange={e => setCDisc( </div> 
 </Panel> 
 <div style={{ background: "linear-gradient(135deg,#110a00,#1c1200)", border: `1p <div style={{ ...TX.label, color: T.mid, marginBottom: 4 }}>Maximum Allowable  <div style={{ fontSize: 42, fontWeight: 900, color: T.gold, fontFamily: "'Cour <div style={{ ...TX.body, marginTop: 6 }}>{fmt(cArv)} x {cDisc}% - {fmt(cRep)} </div> 
 <Panel> 
 <SecHead>Enter Asking Price - Get Verdict</SecHead> 
 <NInput label="Seller's Asking Price" val={cPrice || ""} onChange={v => setCPr {cPrice > 0 && (() => { 
 const g = calcDeal(cArv, cPrice, cRep, cFee, cDisc / 100);  return ( 
 <div style={{ marginTop: 9, background: g.isProfitable ? `${T.green}15` : ` <div style={{ fontSize: 14, fontWeight: 900, color: g.isProfitable ? T.g <div style={{ ...TX.body, marginTop: 4 }}>Grade: {g.grade} - Margin: {pc </div> 
 ); 
 })()} 
 </Panel> 
 </div> 
 )} 
 {/* BUYERS */} 
 {tab === "people" && ( 
 <div> 
 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "cen <SecHead>Cash Buyer List ({buyers.length})</SecHead> 
 <button onClick={() => setShowBuyerForm(true)} style={{ background: `${T.gold} </div> 
 {buyers.map(b => ( 
 <Panel key={b.id} style={{ marginBottom: 8 }}> 
 <div style={{ display: "flex", justifyContent: "space-between", alignItems:  <div style={{ flex: 1 }}> 
 <div style={{ ...TX.h2, marginBottom: 5 }}>{b.name}</div>  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 5 <Tag color={b.pof ? T.greenL : T.orange}>{b.pof ? "POF Verified" : "PO <Tag color={T.blue}>{b.area}</Tag> 
 <Tag color={T.purple}>{b.repairTol} Rehab</Tag> 
 </div> 
 <div style={{ display: "flex", gap: 10 }}> 
 <span style={{ ...TX.body, fontSize: 10 }}>{b.phone}</span>  <span style={{ ...TX.body, fontSize: 10 }}>{b.email}</span>  </div> 
 {b.notes && <div style={{ ...TX.body, marginTop: 4, fontStyle: "italic", </div>
 <button onClick={() => deleteBuyer(b.id)} style={{ background: "none", bor </div> 
 </Panel> 
 ))} 
 {showBuyerForm && ( 
 <Panel glow={T.gold} style={{ marginTop: 9 }}> 
 <SecHead>Add Cash Buyer</SecHead> 
 <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margi <NInput label="Buyer Name" val={buyerForm.name} onChange={v => setBuyerFor <NInput label="Phone" val={buyerForm.phone} onChange={v => setBuyerForm(p  <NInput label="Email" val={buyerForm.email} onChange={v => setBuyerForm(p  <NInput label="Target Area" val={buyerForm.area} onChange={v => setBuyerFo <NInput label="Min ARV" val={buyerForm.minArv} onChange={v => setBuyerForm <NInput label="Max ARV" val={buyerForm.maxArv} onChange={v => setBuyerForm <NSel label="Repair Tolerance" val={buyerForm.repairTol} onChange={v => se <NSel label="Response Speed" val={buyerForm.responseSpeed} onChange={v =>  </div> 
 <NInput label="Notes" val={buyerForm.notes} onChange={v => setBuyerForm(p => <div style={{ display: "flex", alignItems: "center", gap: 9, margin: "11px 0 <input type="checkbox" checked={buyerForm.pof} onChange={e => setBuyerForm <span style={{ ...TX.body, fontWeight: 700 }}>Proof of Funds Verified</spa </div> 
 <div style={{ display: "flex", gap: 7 }}> 
 <button onClick={addBuyer} style={{ flex: 1, background: `linear-gradient( <button onClick={() => setShowBuyerForm(false)} style={{ background: "tran </div> 
 </Panel> 
 )} 
 </div> 
 )} 
 {/* SCRIPTS */} 
 {tab === "scripts" && ( 
 <div> 
 <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>  {["ALL", "ACQ", "OPS", "TITLE"].map(f => ( 
 <button key={f} onClick={() => setScriptFilter(f)} style={{ background: scri {f === "ALL" ? "All Scripts" : f === "ACQ" ? "Acquisition" : f === "OPS" ? </button> 
 ))} 
 </div> 
 <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>  {ALL_SCRIPTS.filter(s => scriptFilter === "ALL" || s.role === scriptFilter).ma <Panel key={i}> 
 <div style={{ display: "flex", justifyContent: "space-between", alignItems: <div style={{ display: "flex", alignItems: "center", gap: 7 }}><Tag colo <button onClick={() => copyScript(s.body, i)} style={{ background: copie
 </div> 
 <div style={{ background: T.bg2, border: `1px solid ${T.line}`, borderRadi </Panel> 
 ))} 
 </div> 
 </div> 
 )} 
 {/* SOP */} 
 {tab === "sop" && ( 
 <div> 
 <div style={{ background: "linear-gradient(135deg,#110800,#1c1100)", border: `1p <div style={{ ...TX.h1, color: T.gold }}>The 12 Iron Laws</div>  <div style={{ ...TX.body, marginTop: 5 }}>Zero Exceptions. Zero Wiggle Room. M </div> 
 {IRON_LAWS.map((law, i) => ( 
 <div key={i} style={{ background: lawOpen === i ? `${law.color}0d` : T.bg3, bo <div onClick={() => setLawOpen(lawOpen === i ? null : i)} style={{ display:  <div style={{ width: 26, height: 26, borderRadius: 6, background: law.colo <div style={{ flex: 1 }}> 
 <div style={{ ...TX.h3, fontSize: 12, color: T.white }}>{law.law}</div>  </div> 
 <div style={{ color: lawOpen === i ? law.color : T.mid, fontSize: 14, font </div> 
 {lawOpen === i && ( 
 <div style={{ padding: "0 13px 13px", borderTop: `1px solid ${law.color}25` <div style={{ background: law.color + "0d", border: `1px solid ${law.col <div style={{ ...TX.body, color: T.bright, lineHeight: 1.8 }}>{law.det </div> 
 </div> 
 )} 
 </div> 
 ))} 
 </div> 
 )} 
 </div> 
 {/* ADD DEAL MODAL */} 
 {showDealForm && ( 
 <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.94)", display:  <div style={{ background: T.bg3, border: `1px solid ${T.line2}`, borderRadius: 11, <div style={{ display: "flex", justifyContent: "space-between", alignItems: "cen <div style={{ ...TX.h2, color: T.gold }}>{editDealId ? "Edit Deal" : "Add New  <button onClick={() => { setShowDealForm(false); setEditDealId(null); }} style </div> 
 <div style={{ marginBottom: 9 }}>
 <div style={{ ...TX.label, marginBottom: 3 }}>Property Address *</div>  <input type="text" value={dealForm.address} placeholder="123 Main St, Tucson A {dupWarning && <div style={{ background: `${T.redL}15`, border: `1px solid ${T. </div> 
 <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, margi {[{ l: "ARV ($)*", k: "arv", c: T.gold }, { l: "Price ($)*", k: "price", c: T. <div key={k}> 
 <div style={{ ...TX.label, marginBottom: 3 }}>{l}</div>  <div style={{ position: "relative" }}><span style={{ position: "absolute", </div> 
 ))} 
 </div> 
 <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, margi <NSel label="Source" val={dealForm.source} onChange={v => setDealForm(p => ({ . <NSel label="Area" val={dealForm.area} onChange={v => setDealForm(p => ({ ...p, <NSel label="Stage" val={dealForm.stage} onChange={v => setDealForm(p => ({ ... </div> 
 <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, margi <NSel label="Partner" val={dealForm.staff} onChange={v => setDealForm(p => ({ . <div><div style={{ ...TX.label, marginBottom: 3 }}>Seller Name</div><input typ <div><div style={{ ...TX.label, marginBottom: 3 }}>Seller Phone</div><input ty </div> 
 <div style={{ background: `${T.gold}0a`, border: `1px solid ${T.gold}30`, border <div style={{ ...TX.label, color: T.gold, marginBottom: 8 }}>Seller Motivation <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>  <div><div style={{ ...TX.label, marginBottom: 3 }}>Motivation Level (1-10)</ <NSel label="Occupied / Vacant" val={dealForm.occupied} onChange={v => setDe <div><div style={{ ...TX.label, marginBottom: 3 }}>Reason For Selling</div>< <div><div style={{ ...TX.label, marginBottom: 3 }}>Timeline To Sell</div><in </div> 
 <div style={{ marginTop: 7 }}><div style={{ ...TX.label, marginBottom: 3 }}>Obj </div> 
 <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBot {[{ l: "Asking Price ($)", k: "askingPrice" }, { l: "Est. Assignment Fee ($)", <div key={k}><div style={{ ...TX.label, marginBottom: 3 }}>{l}</div><div sty ))} 
 </div> 
 <div style={{ marginBottom: 9 }}> 
 <div style={{ ...TX.label, marginBottom: 3 }}>Communication Notes</div>  <input type="text" value={dealForm.commNotes || ""} onChange={e => setDealForm </div>
 <div style={{ marginBottom: 12 }}> 
 <div style={{ ...TX.label, marginBottom: 3 }}>Notes / Situation Summary</div>  <input type="text" value={dealForm.notes || ""} onChange={e => setDealForm(p = </div> 
 {dealForm.arv && dealForm.price && (() => { 
 const g = calcDeal(dealForm.arv, dealForm.price, dealForm.repairs || 0);  return ( 
 <div style={{ background: `${g.gc}0d`, border: `1px solid ${g.gc}44`, border <div style={{ display: "flex", alignItems: "center", gap: 9 }}>  <GradeChip grade={g.grade} color={g.gc} size={14} />  <div> 
 <div style={{ fontSize: 11, fontWeight: 800, color: g.gc }}>{g.verdict} <div style={{ ...TX.body, marginTop: 2 }}>MAO: {fmt(g.mao)} - Margin: { </div> 
 </div> 
 </div> 
 ); 
 })()} 
 <div style={{ display: "flex", gap: 8 }}> 
 <button onClick={submitDeal} disabled={!!dupWarning && !editDealId} style={{ f {editDealId ? "Update Deal" : "Submit Deal"} 
 </button> 
 <button onClick={() => { setShowDealForm(false); setEditDealId(null); }} style </div> 
 </div> 
 </div> 
 )} 
 {/* BOTTOM NAV */} 
 <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200, background: {TABS.map(t => ( 
 <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, background: "non <div style={{ fontSize: tab === t.id ? 8 : 7, letterSpacing: 0.3, textTransform: </button> 
 ))} 
 </div> 
 </div> 
 ); 
}
