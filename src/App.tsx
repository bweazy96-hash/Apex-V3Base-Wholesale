import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";

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

const fmt = (v: any) => !v || isNaN(v) ? "--" : `$${Math.round(+v).toLocaleString()}`;
const pctS = (v: any) => isNaN(v) ? "--" : `${(+v * 100).toFixed(1)}%`;
const uid = () => Math.random().toString(36).slice(2, 9);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const ago = (ts: number) => {
const s = Math.floor((Date.now() - ts) / 1000);
if (s < 60) return `${s}s`;
if (s < 3600) return `${Math.floor(s / 60)}m`;
if (s < 86400) return `${Math.floor(s / 3600)}h`;
return `${Math.floor(s / 86400)}d`;
};

function calcDeal(arv: any, price: any, repairs: any, fee = 8000, disc = 0.70) {
const a = +arv || 0, p = +price || 0, r = +repairs || 0, f = +fee || 8000;
const mao = a * disc - r - f, margin = a > 0 ? (a - p - r) / a : 0;
const spread = p - mao, buyerProfit = a - p - r;
let grade: string, gc: string, verdict: string, urgency: string;
if (margin >= 0.38) { grade = "A+"; gc = T.greenL; verdict = "FIRE DEAL"; urgency = "MOVE NOW"; }
else if (margin >= 0.28) { grade = "A"; gc = T.green; verdict = "Strong Deal"; urgency = "TODAY"; }
else if (margin >= 0.20) { grade = "B+"; gc = T.goldL; verdict = "Good Deal"; urgency = "THIS WEEK"; }
else if (margin >= 0.14) { grade = "B"; gc = T.gold; verdict = "Marginal"; urgency = "NEGOTIATE"; }
else if (margin >= 0.07) { grade = "C"; gc = T.mid; verdict = "Weak"; urgency = "LOW PRI"; }
else { grade = "D"; gc = T.red; verdict = "No Deal"; urgency = "ARCHIVE"; }
return { mao, margin, spread, buyerProfit, grade, gc, verdict, urgency, isProfitable: spread <= 0 };
}

const STAGES = ["New Lead","Attempted Contact","Warm Lead","Follow-Up Needed","Appointment Set","Under Negotiation","Under Contract","Sent To Buyers","Closed","Dead Lead"];
const STAGE_MEANING: Record<string, string> = {
"New Lead": "Not contacted", "Attempted Contact": "Outreach started",
"Warm Lead": "Interested", "Follow-Up Needed": "Future opportunity",
"Appointment Set": "Active negotiation", "Under Negotiation": "Serious lead",
"Under Contract": "Secured deal", "Sent To Buyers": "Disposition stage",
"Closed": "Assignment completed", "Dead Lead": "Not viable"
};
const STAGE_COLORS: Record<string, string> = {
"New Lead": T.blue, "Attempted Contact": T.blueL, "Warm Lead": T.teal,
"Follow-Up Needed": T.gold, "Appointment Set": T.purple,
"Under Negotiation": T.orange, "Under Contract": T.orangeL,
"Sent To Buyers": T.purpleL, "Closed": T.green, "Dead Lead": T.red
};
const SOURCES = ["Zillow","Redfin","Craigslist","Facebook","MLS/Agent","PropStream","DealMachine","D4D","Direct Mail","Cold Call","Probate","Referral"];
const AREAS = ["Midtown","Eastside","Westside","Northside","Southside","Suburbs","All Areas"];

const PARTNERS: Record<string, any> = {
acq: {
name: "Partner 1 - Acquisitions", short: "Acq", mission: "Secure opportunities.",
color: T.gold, icon: "ACQ", kpi: "Contracts Secured",
responsibilities: ["Seller calls","Lead qualification","Negotiations","Appointments","Relationship building","Contract discussions","Motivation analysis","Property walkthrough coordination","Verbal offers","Follow-up conversations"]
},
ops: {
name: "Partner 2 - Operations / CRM", short: "Ops", mission: "Build and maintain the machine.",
color: T.blueL, icon: "OPS", kpi: "Pipeline Organization + Deals Moved",
responsibilities: ["CRM management","Lead tracking","Data entry","Follow-up scheduling","Buyer list building","Comps & property analysis","MAO calculations","Investor outreach","Assignment coordination","Pipeline organization","KPI tracking","Systems / SOP refinement"]
}
};

const DAILY_PHASES = [
{ phase: "MORNING", label: "Planning Phase", time: "Both Partners", color: T.gold,
tasks: ["Review pipeline","Review follow-ups","Review hot leads","Review appointments","Identify priority properties"],
questions: ["Which sellers are hottest?","Which deals need follow-up?","Which buyers should be contacted?","Which leads are wasting time?","What is today's revenue-producing activity?"] },
{ phase: "MIDDAY", label: "Execution Phase", time: "Split Focus", color: T.orange,
acqFocus: ["Outbound calls","Inbound lead handling","Negotiations","Appointments","Relationship building"],
opsFocus: ["CRM updates","Pulling comps","Calculating MAO","Organizing buyer lists","Scheduling follow-ups","Analyzing deal viability","Investor outreach"] },
{ phase: "EVENING", label: "Review Phase", time: "Both Partners", color: T.purple,
tasks: ["Review new leads","Update statuses","Discuss problem deals","Review KPI numbers","Identify bottlenecks","Prepare next-day priorities"],
note: "Keep emotions OUT. Review data objectively." }
];

const WEEKLY_KPIS = [
{ id: "calls", label: "Calls Made", icon: "CALL", color: T.blue, target: 50, owner: "acq" },
{ id: "leads", label: "Leads Generated", icon: "LEAD", color: T.green, target: 15, owner: "ops" },
{ id: "appts", label: "Appointments Set", icon: "APPT", color: T.gold, target: 5, owner: "acq" },
{ id: "offers", label: "Offers Made", icon: "OFFR", color: T.orange, target: 5, owner: "acq" },
{ id: "contracts", label: "Contracts Secured", icon: "CNTR", color: T.goldL, target: 1, owner: "acq" },
{ id: "buyers", label: "Buyer Contacts", icon: "BUYR", color: T.purple, target: 10, owner: "ops" },
{ id: "closed", label: "Closed Deals", icon: "CLSD", color: T.greenL, target: 1, owner: "both" },
{ id: "avgfee", label: "Avg Assignment Fee", icon: "FEE", color: T.tealL, target: 7500, owner: "both", isMoney: true }
];

const IRON_LAWS = [
{ n: 1, law: "Never Exceed MAO", color: T.redL, detail: "(ARV x 0.70) - Repairs - Fee = MAX. Walk away before you overpay. Non-negotiable." },
{ n: 2, law: "Contact Within 24 Hours", color: T.goldL, detail: "Every GREEN lead gets a call within 24 hours. Every hour you wait costs you the deal." },
{ n: 3, law: "Log Everything Immediately", color: T.blueL, detail: "Every call, text, visit, offer logged same day in the CRM. If it's not logged, it doesn't exist." },
{ n: 4, law: "3 Comps Minimum", color: T.purpleL, detail: "Never calculate ARV from 1 comp. Pull 3 sold comps, 0.5 miles, last 90 days, same beds/baths." },
{ n: 5, law: "Seller Hears Number First", color: T.orangeL, detail: "Always ask what number they're thinking before giving yours. Their anchor = your starting point." },
{ n: 6, law: "Never Send Earnest to Seller", color: T.redL, detail: "Earnest money goes to TITLE COMPANY only. Never wire to seller directly - ever." },
{ n: 7, law: "'And/Or Assigns' Every Time", color: T.goldL, detail: "Every contract must include 'and/or assigns' after your name or you cannot wholesale it." },
{ n: 8, law: "Proof of Funds Before Address", color: T.greenL, detail: "No buyer gets the address until POF is received. No exceptions - this protects your position." },
{ n: 9, law: "Follow Up 5x Before Dead", color: T.blueL, detail: "Most deals close on the 3rd-5th contact. Day 1, 3, 7, 14, 21 minimum before archiving." },
{ n: 10, law: "Close in 21 Days or Less", color: T.purpleL, detail: "Speed is leverage. Open title within 48 hours of contract. Drive every deal toward closing." },
{ n: 11, law: "3 Contractor Bids Always", color: T.orangeL, detail: "Never use seller's estimate. Never guess. Get 3 real bids + 15% buffer before final offer." },
{ n: 12, law: "10+ Buyers Every Deal", color: T.greenL, detail: "Blast every deal to 10+ buyers simultaneously. Competition raises your fee and speed." }
];

const ALL_SCRIPTS = [
{ role: "ACQ", color: T.gold, title: "Cold Call Opener", body: "Hi, is this [NAME]? My name is [YOUR NAME] - I am a local real estate investor in Tucson.\n\nI buy houses as-is, all cash, no agents, no repairs needed on your end. I can typically close in 2-3 weeks.\n\nWould you be open to hearing a cash number on your property?" },
{ role: "ACQ", color: T.gold, title: "4 Qualification Questions", body: "Ask in this exact order:\n\n1. Why are you selling?\n Listen for urgency: divorce, probate, mortgage issues, relocating\n\n2. What condition is the property in?\n Let them describe it. Walk me through it room by room.\n\n3. What is your timeline to sell?\n ASAP or 30-60 days = motivated\n\n4. What price do you have in mind?\n ALWAYS let them say a number first" },
{ role: "ACQ", color: T.gold, title: "Making the Offer", body: "Based on the condition and what similar homes sold for nearby, I can offer [MAO] cash.\n\nClose in 14-21 days\nI cover ALL closing costs\nNo repairs, no showings, no agents\nCash wired at closing\n\nDoes [OFFER] work for you today?" },
{ role: "ACQ", color: T.gold, title: "Handling I Want More", body: "I understand completely. The repairs alone run [COST]. That is why I need to be at [MAO].\n\nWhat if we met at [MAO + small buffer]? I can still close fast and cover everything. Does that get us there?" },
{ role: "ACQ", color: T.gold, title: "Locking the Contract", body: "Perfect - I will send a one-page purchase agreement via DocuSign today.\n\nStandard contract: cash, 10-day inspection period, I cover closing costs, we close at title company.\n\nWhat is the best email for you?" },
{ role: "OPS", color: T.blueL, title: "Buyer Blast Text", body: "NEW DEAL - [AREA], TUCSON\n[BED]bd/[BATH]ba | ARV: $[X] | Repairs: $[Y] | Asking: $[Z]\nMargin: [%]% | Close by: [DATE]\nCash buyers ONLY. POF required before address.\nReply YES - first with POF gets priority." },
{ role: "OPS", color: T.blueL, title: "Investor Outreach", body: "Hey [NAME], I have a new deal in [AREA] - ARV $[X], repairs $[Y], asking $[Z].\nYou are looking at roughly [%]% margin.\n\nBefore I send the address I need proof of funds. Can you send that over today?" },
{ role: "OPS", color: T.blueL, title: "Follow-Up Sequence", body: "Day 1: Call (use opener script)\nDay 3: Call + text if no answer\nDay 7: Text + handwritten note / postcard\nDay 14: Call again - reference prior conversation\nDay 21: Final call - Last attempt before I move on\nDay 30+: Monthly automated touch\n\nWholesaling is often a follow-up business." },
{ role: "TITLE", color: T.purple, title: "Title Company Intro", body: "Subject: New Investor - Assignment + Double Close Transactions\n\nI am a real estate investor in Tucson specializing in off-market acquisitions and assignments of contract.\n\nLooking for an investor-friendly title company comfortable with:\nAssignment of contract closings\nDouble closings (transactional funding)\n14-21 day timelines\n\n[YOUR NAME] | [PHONE] | [EMAIL]" }
];

const GradeChip = ({ grade, color, size = 14 }: { grade: string; color: string; size?: number }) => (
<div style={{ width: size + 16, height: size + 16, borderRadius: 5, background: color + "20", border: `2px solid ${color}60`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size, fontWeight: 900, color, fontFamily: "'Courier New',monospace", flexShrink: 0 }}>{grade}</div>
);
const Tag = ({ color, children, sm }: { color: string; children: React.ReactNode; sm?: boolean }) => (
<span style={{ background: color + "20", border: `1px solid ${color}50`, color, borderRadius: 20, padding: sm ? "2px 6px" : "2px 9px", fontSize: sm ? 8 : 9, letterSpacing: 0.5, fontWeight: 800, textTransform: "uppercase", whiteSpace: "nowrap" }}>{children}</span>
);
const SecHead = ({ children, color = T.gold }: { children: React.ReactNode; color?: string }) => (
<div style={{ fontSize: 10, letterSpacing: 2, color, textTransform: "uppercase", marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${T.line}`, fontWeight: 900 }}>{children}</div>
);
const Panel = ({ children, glow, style = {} }: { children: React.ReactNode; glow?: string; style?: React.CSSProperties }) => (
<div style={{ background: T.bg3, border: `1px solid ${glow ? glow + "40" : T.line}`, borderRadius: 9, padding: 13, boxShadow: glow ? `0 0 20px ${glow}12` : "none", ...style }}>{children}</div>
);
const NInput = ({ label, val, onChange, prefix, type = "number", ph }: { label?: string; val: any; onChange: (v: string) => void; prefix?: string; type?: string; ph?: string }) => (
<div>
{label && <div style={{ fontSize: 9, color: T.text, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 3, fontWeight: 700 }}>{label}</div>}
<div style={{ position: "relative" }}>
{prefix && <span style={{ position: "absolute", left: 7, top: "50%", transform: "translateY(-50%)", color: T.gold, fontSize: 11, pointerEvents: "none", fontWeight: 700 }}>{prefix}</span>}
<input type={type} value={val} placeholder={ph || ""} onChange={e => onChange(e.target.value)}
style={{ width: "100%", boxSizing: "border-box", background: T.bg2, border: `1px solid ${T.line2}`, borderRadius: 6, padding: `7px ${prefix ? "7px" : "9px"} 7px ${prefix ? "20px" : "9px"}`, color: T.white, fontSize: 12, fontFamily: "'Courier New',monospace", outline: "none", fontWeight: 600 }} />
</div>
</div>
);
const NSel = ({ label, val, onChange, opts }: { label?: string; val: string; onChange: (v: string) => void; opts: string[] }) => (
<div>
{label && <div style={{ fontSize: 9, color: T.text, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 3, fontWeight: 700 }}>{label}</div>}
<select value={val} onChange={e => onChange(e.target.value)} style={{ width: "100%", background: T.bg2, border: `1px solid ${T.line2}`, borderRadius: 6, padding: "7px 9px", color: T.white, fontSize: 12, fontFamily: "inherit", outline: "none", fontWeight: 600 }}>
{opts.map(o => <option key={o} value={o}>{o}</option>)}
</select>
</div>
);

function useToast() {
const [toasts, setToasts] = useState<{ id: string; msg: string; type: string }[]>([]);
const push = (msg: string, type = "info") => {
const id = uid();
setToasts(p => [{ id, msg, type }, ...p.slice(0, 4)]);
setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 5000);
};
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
const unsubBuyers = onSnapshot(collection(db, "buyers"), snap => {
setBuyers(snap.docs.map(d => ({ ...d.data(), id: d.id })));
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
if (r._type === "deal") { setSelectedDeal(r.id); setTab("deals"); setSearchHighlight(r.id); setTimeout(() => setSearchHighlight(null), 3500); }
else setTab("people");
}

useEffect(() => {
const h = (e: MouseEvent) => { if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchFocused(false); };
document.addEventListener("mousedown", h);
return () => document.removeEventListener("mousedown", h);
}, []);

const [cArv, setCArv] = useState(185000);
const [cPrice, setCPrice] = useState(0);
const [cRep, setCRep] = useState(25000);
const [cFee, setCFee] = useState(8000);
const [cDisc, setCDisc] = useState(70);

const NOW = Date.now();
const emptyF: Record<string, any> = { leadId: `L-${String(deals.length + 1).padStart(3, "0")}`, address: "", source: "D4D", staff: "Acq", arv: "", price: "", repairs: "", sqft: "", beds: "3", baths: "2", dom: "", area: "Midtown", notes: "", sellerName: "", sellerPhone: "", sellerEmail: "", stage: "New Lead", motivationLevel: "5", reasonSelling: "", timelineToSell: "", occupied: "Vacant", askingPrice: "", estimatedFee: "", investorInterest: "Medium", commNotes: "", objections: "", emotionalTone: "Neutral", pricingFlexibility: "Medium", dateEntered: NOW };
const [showDealForm, setShowDealForm] = useState(false);
const [dealForm, setDealForm] = useState<Record<string, any>>(emptyF);
const [editDealId, setEditDealId] = useState<string | null>(null);
const [selectedDeal, setSelectedDeal] = useState<string | null>(null);

const dupWarning = dealForm.address.length > 8 && !editDealId ? deals.find(d => {
const nA = dealForm.address.toLowerCase().replace(/[^a-z0-9]/g, "");
const nB = (d.address || "").toLowerCase().replace(/[^a-z0-9]/g, "");
return nA.slice(0, 14) === nB.slice(0, 14);
}) : null;

const emptyB: Record<string, any> = { name: "", phone: "", email: "", area: "Tucson Metro", minArv: "", maxArv: "", repairTol: "Medium", types: "SFR", pof: false, avgBuyPrice: "", responseSpeed: "Medium", closingReliability: "Good", notes: "" };
const [showBuyerForm, setShowBuyerForm] = useState(false);
const [buyerForm, setBuyerForm] = useState<Record<string, any>>(emptyB);

const [dealFilter, setDealFilter] = useState("all");
const [areaFilter, setAreaFilter] = useState("All Areas");
const [scriptFilter, setScriptFilter] = useState("ALL");
const [siteCat, setSiteCat] = useState(0);
const [lawOpen, setLawOpen] = useState<number | null>(null);
const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
const [pulse, setPulse] = useState(false);
const [clock, setClock] = useState(new Date());
const [buyBox] = useState({ minArv: 100000, maxPrice: 160000, maxRepairs: 50000, minMargin: 0.20, minBeds: 2, maxDom: 90 });
const [activePhase, setActivePhase] = useState(0);
const [dailyChecks, setDailyChecks] = useState<Record<number, boolean>>({});

useEffect(() => { const t = setInterval(() => setClock(new Date()), 1000); return () => clearInterval(t); }, []);
useEffect(() => { const t = setInterval(() => setPulse(p => !p), 1800); return () => clearInterval(t); }, []);

const alertDeals = deals.filter(d => { const g = calcDeal(d.arv, d.price, d.repairs); return d.arv >= buyBox.minArv && d.price <= buyBox.maxPrice && (d.repairs || 0) <= buyBox.maxRepairs && g.margin >= buyBox.minMargin && !["Closed", "Dead Lead"].includes(d.stage); });
const hotDeals = deals.filter(d => ["A+", "A"].includes(calcDeal(d.arv, d.price, d.repairs).grade) && !["Closed", "Dead Lead"].includes(d.stage));
const followUpDue = deals.filter(d => d.nextFollowUp && d.nextFollowUp <= Date.now() && !["Closed", "Dead Lead"].includes(d.stage));
const closedDeals = deals.filter(d => d.stage === "Closed");
const totalEarned = closedDeals.reduce((s, d) => s + (+d.estimatedFee || 0), 0);

function submitDeal() {
if (!dealForm.address || !dealForm.arv || !dealForm.price) { push("Need Address, ARV, and Price", "error"); return; }
if (dupWarning) { push("Duplicate address detected!", "error"); return; }
const g = calcDeal(dealForm.arv, dealForm.price, dealForm.repairs);
const nd = { ...dealForm, ts: Date.now(), starred: editDealId ? (deals.find(d => d.id === editDealId)?.starred || false) : false, arv: +dealForm.arv, price: +dealForm.price, repairs: +dealForm.repairs || 0, sqft: +dealForm.sqft || 0, beds: +dealForm.beds || 3, baths: +dealForm.baths || 1, dom: +dealForm.dom || 0, askingPrice: +dealForm.askingPrice || 0, estimatedFee: +dealForm.estimatedFee || 0, motivationLevel: +dealForm.motivationLevel || 5, dateEntered: dealForm.dateEntered || Date.now() };
if (editDealId) { updateDoc(doc(db, "deals", editDealId), nd); push(`Deal updated - Grade ${g.grade}`); }
else { addDoc(collection(db, "deals"), nd); push(`Deal added - Grade ${g.grade}`); }
setShowDealForm(false); setEditDealId(null); setDealForm({ ...emptyF });
}

function openEditDeal(deal: any) {
setDealForm({ ...deal, arv: String(deal.arv), price: String(deal.price), repairs: String(deal.repairs), sqft: String(deal.sqft || ""), beds: String(deal.beds || "3"), baths: String(deal.baths || "2"), dom: String(deal.dom || ""), askingPrice: String(deal.askingPrice || ""), estimatedFee: String(deal.estimatedFee || ""), motivationLevel: String(deal.motivationLevel || 5) });
setEditDealId(deal.id); setShowDealForm(true);
}

function deleteDeal(id: string) { deleteDoc(doc(db, "deals", id)); setSelectedDeal(null); push("Deal removed"); }
function advanceStage(id: string) {
const deal = deals.find(d => d.id === id); if (!deal) return;
const i = STAGES.indexOf(deal.stage);
const ns = STAGES[Math.min(i + 1, STAGES.length - 1)];
if (ns === "Closed") push("CLOSED! Collect your check!", "alert");
updateDoc(doc(db, "deals", id), { stage: ns });
}
function toggleStarred(id: string, current: boolean) { updateDoc(doc(db, "deals", id), { starred: !current }); }
function addBuyer() {
if (!buyerForm.name) { push("Buyer name required", "error"); return; }
addDoc(collection(db, "buyers"), { ...buyerForm, pof: !!buyerForm.pof, minArv: +buyerForm.minArv || 0, maxArv: +buyerForm.maxArv || 999999, avgBuyPrice: +buyerForm.avgBuyPrice || 0, lastContact: Date.now() });
setShowBuyerForm(false); setBuyerForm(emptyB); push("Buyer added");
}
function deleteBuyer(id: string) { deleteDoc(doc(db, "buyers", id)); push("Buyer removed"); }
function copyScript(txt: string, idx: number) { navigator.clipboard.writeText(txt); setCopiedIdx(idx); setTimeout(() => setCopiedIdx(null), 2000); }

const filteredDeals = deals.filter(d => {
const g = calcDeal(d.arv, d.price, d.repairs);
if (dealFilter === "alerts" && !alertDeals.find(x => x.id === d.id)) return false;
if (dealFilter === "hot" && !["A+", "A"].includes(g.grade)) return false;
if (dealFilter === "starred" && !d.starred) return false;
if (dealFilter === "followup" && !followUpDue.find(x => x.id === d.id)) return false;
if (areaFilter !== "All Areas" && d.area !== areaFilter) return false;
return true;
});

const selDeal = selectedDeal ? deals.find(d => d.id === selectedDeal) : null;
const selGrade = selDeal ? calcDeal(selDeal.arv, selDeal.price, selDeal.repairs) : null;

const TABS = [
{ id: "command", label: "Command" }, { id: "team", label: "Team" },
{ id: "deals", label: "Deals" }, { id: "pipeline", label: "Pipeline" },
{ id: "calc", label: "Calc" }, { id: "people", label: "Buyers" },
{ id: "scripts", label: "Scripts" }, { id: "sop", label: "SOP" }
];

const TX: Record<string, React.CSSProperties> = {
h1: { fontSize: 16, fontWeight: 900, color: T.white, letterSpacing: 0.5 },
h2: { fontSize: 13, fontWeight: 800, color: T.bright },
h3: { fontSize: 11, fontWeight: 700, color: T.bright },
body: { fontSize: 11, fontWeight: 600, color: T.text, lineHeight: 1.6 },
label: { fontSize: 9, fontWeight: 700, color: T.text, letterSpacing: 1, textTransform: "uppercase" },
dim: { fontSize: 9, fontWeight: 600, color: T.mid }
};

return (
<div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100%", background: T.bg0, color: T.text, fontFamily: "'Trebuchet MS',sans-serif", overflow: "hidden", boxSizing: "border-box" }}>

{/* TOASTS */}
<div style={{ position: "fixed", top: 52, right: 6, zIndex: 1000, display: "flex", flexDirection: "column", gap: 5, pointerEvents: "none" }}>
{toasts.map(t => (
<div key={t.id} style={{ background: t.type === "alert" ? `${T.redL}f0` : t.type === "error" ? `${T.orange}f0` : `${T.bg4}f0`, border: `1px solid ${t.type === "alert" ? T.redL : t.type === "error" ? T.orange : T.line2}`, borderRadius: 8, padding: "9px 14px", fontSize: 11, fontWeight: 700, color: T.white, maxWidth: 280 }}>{t.msg}</div>
))}
</div>

{/* HEADER */}
<div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 10px", height: 48, background: T.bg3, borderBottom: `2px solid ${T.line}`, flexShrink: 0 }}>
<div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
<div style={{ width: 8, height: 8, borderRadius: "50%", background: pulse ? T.greenL : "transparent", border: `2px solid ${T.greenL}`, transition: "all 0.6s" }} />
<div>
<div style={{ fontSize: 13, fontWeight: 900, letterSpacing: 3, color: T.gold, textTransform: "uppercase", lineHeight: 1, fontFamily: "'Courier New',monospace" }}>APEX</div>
<div style={{ fontSize: 7, color: T.mid, letterSpacing: 1, fontWeight: 600 }}>{clock.toLocaleTimeString()}</div>
</div>
</div>

<div ref={searchRef} style={{ position: "relative", flex: 1, maxWidth: 360 }}>
<div style={{ display: "flex", alignItems: "center", background: T.bg2, border: `1.5px solid ${searchFocused ? T.gold : T.line2}`, borderRadius: 22, padding: "0 12px", gap: 7 }}>
<span style={{ fontSize: 12, color: T.mid }}>S</span>
<input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onFocus={() => setSearchFocused(true)} placeholder="Search address, seller, phone, Lead ID..." style={{ flex: 1, background: "none", border: "none", outline: "none", color: T.white, fontSize: 11, fontFamily: "inherit", padding: "6px 0", fontWeight: 600 }} />
{searchQuery && <button onClick={() => { setSearchQuery(""); setSearchFocused(false); }} style={{ background: "none", border: "none", color: T.mid, cursor: "pointer", fontSize: 13, padding: 0 }}>x</button>}
</div>
{searchFocused && searchQuery.trim().length > 1 && (
<div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: T.bg4, border: `1.5px solid ${T.gold}50`, borderRadius: 10, zIndex: 500, overflow: "hidden" }}>
{searchResults.length === 0 ? (
<div style={{ padding: "16px 13px", textAlign: "center", fontSize: 11, color: T.mid }}>No matches found</div>
) : (
<div style={{ maxHeight: 300, overflowY: "auto" }}>
{searchResults.map((r, i) => (
<div key={i} onMouseDown={() => handleSearchSelect(r)} style={{ padding: "9px 13px", borderBottom: `1px solid ${T.line}`, cursor: "pointer" }}>
<div style={{ ...TX.h3 }}>{r._type === "deal" ? r.address : r.name}</div>
<div style={{ ...TX.dim }}>{r._type === "deal" ? `${r.stage} - ${r.leadId}` : r.phone}</div>
</div>
))}
</div>
)}
</div>
)}
</div>

<div style={{ display: "flex", gap: 0, flexShrink: 0 }}>
{[
{ l: "Alerts", v: alertDeals.length, c: alertDeals.length > 0 ? T.redL : T.dim },
{ l: "Deals", v: deals.length, c: T.gold },
{ l: "Earned", v: fmt(totalEarned), c: T.greenL }
].map(({ l, v, c }) => (
<div key={l} style={{ textAlign: "center", padding: "1px 9px", borderLeft: `1px solid ${T.line}` }}>
<div style={{ fontSize: 14, fontWeight: 900, color: c, lineHeight: 1.3, fontFamily: "monospace" }}>{v}</div>
<div style={{ fontSize: 7, color: T.mid, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>{l}</div>
</div>
))}
</div>
</div>

{/* QUICK ROW */}
<div style={{ display: "flex", background: T.bg4, borderBottom: `1px solid ${T.line}`, flexShrink: 0, padding: "0 8px", gap: 6, alignItems: "center", height: 34 }}>
<span style={{ fontSize: 9, color: T.mid, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", flexShrink: 0 }}>Quick:</span>
{[{ id: "command", label: "Command" }, { id: "deals", label: "Deals" }, { id: "pipeline", label: "Pipeline" }, { id: "team", label: "Team" }].map(t => (
<button key={t.id} onClick={() => setTab(t.id)} style={{ background: tab === t.id ? `${T.gold}22` : T.bg3, border: `1px solid ${tab === t.id ? T.gold : T.line}`, borderRadius: 14, padding: "3px 10px", cursor: "pointer", color: tab === t.id ? T.gold : T.text, fontSize: 9, fontFamily: "inherit", fontWeight: 800, whiteSpace: "nowrap", flexShrink: 0 }}>{t.label}</button>
))}
<div style={{ flex: 1 }} />
<button onClick={() => { setEditDealId(null); setDealForm({ ...emptyF }); setShowDealForm(true); }} style={{ background: `linear-gradient(135deg,${T.gold},${T.goldD})`, border: "none", borderRadius: 14, padding: "3px 12px", cursor: "pointer", color: "#020509", fontSize: 9, fontFamily: "inherit", fontWeight: 900, whiteSpace: "nowrap", flexShrink: 0 }}>+ Add Deal</button>
</div>

{/* CONTENT */}
<div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: 10, paddingBottom: 70 }}>

{/* COMMAND */}
{tab === "command" && (
<div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
<div style={{ background: "linear-gradient(135deg,#0e0900,#1a1200)", border: `1px solid ${T.gold}44`, borderRadius: 9, padding: "14px 16px", textAlign: "center" }}>
<div style={{ ...TX.h1, fontSize: 14, color: T.gold }}>APEX Wholesale Machine - Tucson AZ</div>
<div style={{ ...TX.body, marginTop: 5 }}>Find - Lock - Assign - Collect - Repeat</div>
<div style={{ ...TX.body, marginTop: 4, color: T.greenL, fontWeight: 800 }}>LIVE - Firebase Real-Time Sync Active</div>
</div>

{followUpDue.length > 0 && (
<Panel style={{ border: `1px solid ${T.goldL}44`, background: `${T.gold}0a` }}>
<SecHead color={T.goldL}>Follow-Ups Due Today ({followUpDue.length})</SecHead>
{followUpDue.slice(0, 4).map(d => (
<div key={d.id} onClick={() => { setSelectedDeal(d.id); setTab("deals"); }} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: T.bg2, border: `1px solid ${T.gold}33`, borderRadius: 6, padding: "8px 11px", marginBottom: 5, cursor: "pointer" }}>
<div>
<div style={{ ...TX.h3 }}>{d.address}</div>
<div style={{ ...TX.dim, marginTop: 2 }}>{d.sellerName} - {d.stage}</div>
</div>
<Tag color={T.goldL}>Follow Up</Tag>
</div>
))}
</Panel>
)}

<Panel>
<SecHead>Live KPI Snapshot</SecHead>
<div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 7, marginBottom: 7 }}>
{[
{ l: "Total Deals", v: deals.length, c: T.gold },
{ l: "Active", v: deals.filter(d => !["Closed", "Dead Lead"].includes(d.stage)).length, c: T.blueL },
{ l: "Closed", v: closedDeals.length, c: T.greenL },
{ l: "Hot Deals", v: hotDeals.length, c: hotDeals.length > 0 ? T.redL : T.dim }
].map(({ l, v, c }) => (
<div key={l} style={{ background: T.bg2, border: `1px solid ${T.line}`, borderRadius: 7, padding: "9px 7px", textAlign: "center" }}>
<div style={{ ...TX.label, marginBottom: 3 }}>{l}</div>
<div style={{ fontSize: 18, fontWeight: 900, color: c, fontFamily: "monospace" }}>{v}</div>
</div>
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
<div key={i} style={{ background: done ? `${kpi.color}0d` : T.bg2, border: `1px solid ${done ? kpi.color : T.line}`, borderRadius: 7, padding: "9px 11px", marginBottom: 6 }}>
<div style={{ display: "flex", alignItems: "center", gap: 9 }}>
<div style={{ fontSize: 9, color: kpi.color, fontWeight: 900, width: 32, flexShrink: 0 }}>{kpi.icon}</div>
<div style={{ flex: 1 }}>
<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
<span style={{ ...TX.h3, color: done ? kpi.color : T.bright }}>{kpi.label}</span>
<span style={{ fontSize: 11, color: kpi.color, fontFamily: "monospace", fontWeight: 800 }}>{(kpi as any).isMoney ? fmt(val) : val} / {(kpi as any).isMoney ? fmt(kpi.target) : kpi.target}</span>
</div>
<div style={{ background: T.bg0, borderRadius: 3, height: 5, overflow: "hidden" }}>
<div style={{ width: `${pctDone * 100}%`, height: "100%", background: kpi.color }} />
</div>
</div>
<div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
<button onClick={() => setKpiVals(p => ({ ...p, [kpi.id]: Math.max(0, (p[kpi.id] || 0) - ((kpi as any).isMoney ? 500 : 1)) }))} style={{ background: T.bg0, border: `1px solid ${T.line}`, borderRadius: 5, color: T.text, width: 22, height: 22, cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>-</button>
<button onClick={() => setKpiVals(p => ({ ...p, [kpi.id]: (p[kpi.id] || 0) + ((kpi as any).isMoney ? 500 : 1) }))} style={{ background: `${kpi.color}25`, border: `1px solid ${kpi.color}60`, borderRadius: 5, color: kpi.color, width: 22, height: 22, cursor: "pointer", fontFamily: "inherit", fontWeight: 900 }}>+</button>
</div>
</div>
</div>
);
})}
</Panel>
</div>
)}

{/* TEAM */}
{tab === "team" && (
<div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
{Object.entries(PARTNERS).map(([key, p]) => (
<Panel key={key} glow={p.color}>
<div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
<div style={{ width: 40, height: 40, borderRadius: 8, background: p.color + "30", border: `2px solid ${p.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: p.color }}>{p.icon}</div>
<div>
<div style={{ ...TX.h1, color: p.color }}>{p.name}</div>
<div style={{ ...TX.body, marginTop: 2 }}>Mission: {p.mission}</div>
</div>
</div>
<SecHead color={p.color}>Responsibilities</SecHead>
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
{p.responsibilities.map((r: string, i: number) => (
<div key={i} style={{ display: "flex", alignItems: "center", gap: 7, background: T.bg2, borderRadius: 6, padding: "7px 9px", border: `1px solid ${T.line}` }}>
<div style={{ width: 6, height: 6, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
<span style={{ ...TX.body, fontSize: 10 }}>{r}</span>
</div>
))}
</div>
</Panel>
))}

<Panel>
<SecHead>Daily Structure</SecHead>
<div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
{DAILY_PHASES.map((ph, i) => (
<button key={i} onClick={() => setActivePhase(i)} style={{ flex: 1, background: activePhase === i ? `${ph.color}20` : T.bg2, border: `1px solid ${activePhase === i ? ph.color : T.line}`, borderRadius: 7, padding: "8px 4px", cursor: "pointer", fontFamily: "inherit", textAlign: "center" }}>
<div style={{ fontSize: 8, color: activePhase === i ? ph.color : T.mid, fontWeight: 800 }}>{ph.phase}</div>
<div style={{ fontSize: 7, color: T.mid, marginTop: 2 }}>{ph.label}</div>
</button>
))}
</div>
{(() => {
const ph = DAILY_PHASES[activePhase];
return (
<div style={{ background: `${ph.color}0a`, border: `1px solid ${ph.color}30`, borderRadius: 8, padding: 12 }}>
<div style={{ ...TX.h2, color: ph.color, marginBottom: 8 }}>{ph.phase} - {ph.label}</div>
{(ph as any).tasks && (ph as any).tasks.map((t: string, i: number) => (
<div key={i} style={{ display: "flex", gap: 7, marginBottom: 4 }}>
<div style={{ color: ph.color, fontWeight: 900 }}>-&gt;</div>
<div style={{ ...TX.body }}>{t}</div>
</div>
))}
{(ph as any).acqFocus && (
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 6 }}>
<div style={{ background: `${T.gold}10`, border: `1px solid ${T.gold}30`, borderRadius: 7, padding: 10 }}>
<div style={{ ...TX.label, color: T.gold, marginBottom: 6 }}>Acquisition Partner</div>
{(ph as any).acqFocus.map((f: string, i: number) => <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4 }}><span style={{ color: T.gold, fontWeight: 900 }}>-&gt;</span><span style={{ ...TX.body, fontSize: 10 }}>{f}</span></div>)}
</div>
<div style={{ background: `${T.blueL}10`, border: `1px solid ${T.blueL}30`, borderRadius: 7, padding: 10 }}>
<div style={{ ...TX.label, color: T.blueL, marginBottom: 6 }}>Operations Partner</div>
{(ph as any).opsFocus.map((f: string, i: number) => <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4 }}><span style={{ color: T.blueL, fontWeight: 900 }}>-&gt;</span><span style={{ ...TX.body, fontSize: 10 }}>{f}</span></div>)}
</div>
</div>
)}
</div>
);
})()}
</Panel>

<Panel>
<SecHead>Daily Checklist</SecHead>
{["Review pipeline together", "Review all follow-ups due today", "Identify today's 3 hottest leads", "Confirm appointments", "Update all deal statuses in CRM", "Log all calls and contacts", "Send buyer blasts on active deals", "Pull comps on new leads", "Calculate MAO on qualified leads", "Review KPI numbers at day end"].map((item, i) => {
const done = dailyChecks[i];
return (
<div key={i} onClick={() => setDailyChecks(p => ({ ...p, [i]: !p[i] }))} style={{ display: "flex", alignItems: "center", gap: 10, background: done ? `${T.green}0d` : T.bg2, border: `1px solid ${done ? T.green : T.line}`, borderRadius: 6, padding: "9px 11px", marginBottom: 5, cursor: "pointer" }}>
<div style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, border: `2px solid ${done ? T.green : "#2a4060"}`, background: done ? T.green : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: T.bg0, fontWeight: 900 }}>{done ? "V" : ""}</div>
<div style={{ ...TX.body, color: done ? T.greenL : T.bright, textDecoration: done ? "line-through" : "none" }}>{item}</div>
</div>
);
})}
<div style={{ textAlign: "center", ...TX.dim, marginTop: 6, fontWeight: 700 }}>{Object.values(dailyChecks).filter(Boolean).length} / 10 complete</div>
</Panel>
</div>
)}

{/* DEALS */}
{tab === "deals" && (
<div>
<div style={{ display: "flex", gap: 5, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
{[{ id: "all", label: "All" }, { id: "alerts", label: `Alerts ${alertDeals.length}` }, { id: "hot", label: `Hot ${hotDeals.length}` }, { id: "starred", label: "Starred" }, { id: "followup", label: `Follow-Up ${followUpDue.length}` }].map(f => (
<button key={f.id} onClick={() => setDealFilter(f.id)} style={{ background: dealFilter === f.id ? `${T.gold}25` : T.bg3, border: `1px solid ${dealFilter === f.id ? T.gold : T.line}`, borderRadius: 20, padding: "4px 11px", cursor: "pointer", color: dealFilter === f.id ? T.gold : T.text, fontSize: 9, fontFamily: "inherit", fontWeight: 800 }}>{f.label}</button>
))}
<select value={areaFilter} onChange={e => setAreaFilter(e.target.value)} style={{ background: T.bg3, border: `1px solid ${T.line}`, borderRadius: 20, padding: "4px 9px", color: T.text, fontSize: 9, fontFamily: "inherit", outline: "none", marginLeft: "auto", fontWeight: 700 }}>
{AREAS.map(a => <option key={a} value={a}>{a}</option>)}
</select>
</div>

{filteredDeals.length === 0 && <div style={{ textAlign: "center", padding: "30px", ...TX.body, color: T.mid }}>No deals match filter. Hit Add Deal to get started.</div>}

{filteredDeals.map(deal => {
const g = calcDeal(deal.arv, deal.price, deal.repairs);
const sc = STAGE_COLORS[deal.stage] || T.mid;
const isHighlighted = searchHighlight === deal.id;
return (
<div key={deal.id} style={{ background: isHighlighted ? `${T.gold}12` : T.bg3, border: `1px solid ${isHighlighted ? T.gold : T.line}`, borderRadius: 9, padding: 10, marginBottom: 7, cursor: "pointer" }}
onClick={() => setSelectedDeal(selectedDeal === deal.id ? null : deal.id)}>
<div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
<GradeChip grade={g.grade} color={g.gc} size={15} />
<div style={{ flex: 1, minWidth: 0 }}>
<div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
<span style={{ fontSize: 8, color: T.gold, fontFamily: "monospace", fontWeight: 800 }}>{deal.leadId}</span>
<div style={{ ...TX.h3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{deal.address}</div>
</div>
{deal.sellerName && <div style={{ fontSize: 10, color: T.blueL, fontWeight: 700, marginBottom: 4 }}>Seller: {deal.sellerName} {deal.sellerPhone && `- ${deal.sellerPhone}`}</div>}
<div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
<Tag color={sc}>{deal.stage}</Tag>
<Tag color={T.purple}>{deal.area}</Tag>
<Tag color={deal.staff === "Acq" ? T.gold : T.blueL}>{deal.staff}</Tag>
</div>
<div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4 }}>
{[{ l: "ARV", v: fmt(deal.arv), c: T.blueL }, { l: "Price", v: fmt(deal.price), c: g.isProfitable ? T.greenL : T.redL }, { l: "Repairs", v: fmt(deal.repairs), c: T.text }, { l: "Margin", v: pctS(g.margin), c: g.gc }].map(({ l, v, c }) => (
<div key={l} style={{ background: T.bg2, borderRadius: 5, padding: "4px 6px", textAlign: "center", border: `1px solid ${T.line}` }}>
<div style={{ ...TX.dim, marginBottom: 1 }}>{l}</div>
<div style={{ fontSize: 10, fontWeight: 800, color: c, fontFamily: "monospace" }}>{v}</div>
</div>
))}
</div>
{deal.notes && <div style={{ ...TX.body, marginTop: 5, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{deal.notes}</div>}
</div>
<div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
<button onClick={e => { e.stopPropagation(); toggleStarred(deal.id, deal.starred); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: deal.starred ? T.gold : T.dim, padding: 1 }}>*</button>
<button onClick={e => { e.stopPropagation(); advanceStage(deal.id); }} style={{ background: `${sc}20`, border: `1px solid ${sc}50`, borderRadius: 5, color: sc, padding: "3px 6px", fontSize: 8, cursor: "pointer", fontFamily: "inherit", fontWeight: 800 }}>-&gt;</button>
<button onClick={e => { e.stopPropagation(); openEditDeal(deal); }} style={{ background: T.bg2, border: `1px solid ${T.line}`, borderRadius: 5, color: T.text, padding: "3px 6px", fontSize: 8, cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>Edit</button>
</div>
</div>
</div>
);
})}

{selDeal && selGrade && (
<Panel glow={selGrade.gc} style={{ marginTop: 9 }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
<div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
<GradeChip grade={selGrade.grade} color={selGrade.gc} size={19} />
<div>
<div style={{ ...TX.h2 }}>{selDeal.address}</div>
<div style={{ fontSize: 11, fontWeight: 700, color: selGrade.gc, marginTop: 2 }}>{selGrade.verdict} - {selGrade.urgency}</div>
</div>
</div>
<div style={{ display: "flex", gap: 5 }}>
<button onClick={() => openEditDeal(selDeal)} style={{ background: `${T.gold}20`, border: `1px solid ${T.gold}44`, borderRadius: 6, color: T.gold, padding: "5px 9px", fontSize: 9, cursor: "pointer", fontFamily: "inherit", fontWeight: 800 }}>Edit</button>
<button onClick={() => deleteDeal(selDeal.id)} style={{ background: `${T.red}20`, border: `1px solid ${T.red}44`, borderRadius: 6, color: T.redL, padding: "5px 9px", fontSize: 9, cursor: "pointer", fontFamily: "inherit", fontWeight: 800 }}>Remove</button>
<button onClick={() => setSelectedDeal(null)} style={{ background: T.bg2, border: `1px solid ${T.line}`, borderRadius: 6, color: T.text, padding: "5px 9px", fontSize: 9, cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>X</button>
</div>
</div>
<div style={{ background: "linear-gradient(135deg,#110a00,#1c1100)", border: `1px solid ${T.gold}44`, borderRadius: 8, padding: 12, textAlign: "center", marginBottom: 9 }}>
<div style={{ ...TX.label, color: T.mid, marginBottom: 3 }}>Maximum Allowable Offer</div>
<div style={{ fontSize: 34, fontWeight: 900, color: T.gold, fontFamily: "monospace" }}>{fmt(selGrade.mao)}</div>
</div>
<div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 5 }}>
{[{ l: "Asking", v: fmt(selDeal.price), c: selGrade.isProfitable ? T.greenL : T.redL }, { l: "Spread", v: fmt(Math.abs(selGrade.spread || 0)), c: selGrade.spread <= 0 ? T.greenL : T.redL }, { l: "Buyer Profit", v: fmt(selGrade.buyerProfit), c: selGrade.gc }, { l: "Margin", v: pctS(selGrade.margin), c: selGrade.gc }].map(({ l, v, c }) => (
<div key={l} style={{ background: T.bg2, border: `1px solid ${T.line}`, borderRadius: 6, padding: "8px 7px", textAlign: "center" }}>
<div style={{ ...TX.label, marginBottom: 2 }}>{l}</div>
<div style={{ fontSize: 13, fontWeight: 900, color: c, fontFamily: "monospace" }}>{v}</div>
</div>
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
if (sd.length === 0 && stage === "Dead Lead") return null;
return (
<div key={stage} style={{ marginBottom: 11 }}>
<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
<div style={{ display: "flex", alignItems: "center", gap: 7 }}>
<div style={{ width: 9, height: 9, borderRadius: 2, background: sc }} />
<div style={{ fontSize: 11, fontWeight: 800, color: sc, textTransform: "uppercase" }}>{stage}</div>
<div style={{ fontSize: 9, color: T.mid, fontStyle: "italic" }}>- {STAGE_MEANING[stage]}</div>
</div>
<Tag color={sc}>{sd.length} deal{sd.length !== 1 ? "s" : ""}</Tag>
</div>
{sd.length === 0 ? (
<div style={{ background: T.bg2, border: `1px dashed ${T.line}`, borderRadius: 7, padding: "11px", textAlign: "center", ...TX.body, color: T.mid }}>Empty</div>
) : sd.map(deal => {
const g = calcDeal(deal.arv, deal.price, deal.repairs);
return (
<div key={deal.id} style={{ background: T.bg3, border: `1px solid ${sc}33`, borderRadius: 7, padding: "9px 11px", marginBottom: 5, cursor: "pointer" }} onClick={() => { setSelectedDeal(deal.id); setTab("deals"); }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
<div style={{ flex: 1, minWidth: 0 }}>
<div style={{ ...TX.h3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{deal.address}</div>
{deal.sellerName && <div style={{ fontSize: 9, color: T.blueL, fontWeight: 700 }}>{deal.sellerName}</div>}
</div>
<div style={{ flexShrink: 0, textAlign: "right", marginLeft: 9 }}>
<div style={{ fontSize: 12, color: T.gold, fontFamily: "monospace", fontWeight: 800 }}>{fmt(deal.price)}</div>
<div style={{ fontSize: 10, color: g.gc, fontWeight: 700 }}>{pctS(g.margin)}</div>
<button onClick={e => { e.stopPropagation(); advanceStage(deal.id); }} style={{ marginTop: 4, background: `${sc}20`, border: `1px solid ${sc}50`, borderRadius: 4, color: sc, padding: "2px 7px", fontSize: 8, cursor: "pointer", fontFamily: "inherit", fontWeight: 800 }}>Advance</button>
</div>
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
<div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
<Panel glow={T.gold}>
<SecHead>Deal Inputs</SecHead>
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 11 }}>
<NInput label="After Repair Value" val={cArv} onChange={v => setCArv(+v || 0)} prefix="$" />
<NInput label="Repair Estimate" val={cRep} onChange={v => setCRep(+v || 0)} prefix="$" />
<NInput label="Your Fee" val={cFee} onChange={v => setCFee(+v || 0)} prefix="$" />
</div>
<div>
<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
<span style={{ ...TX.label }}>Investor Discount</span>
<span style={{ fontSize: 12, color: T.gold, fontFamily: "monospace", fontWeight: 900 }}>{cDisc}%</span>
</div>
<input type="range" min={55} max={85} value={cDisc} onChange={e => setCDisc(+e.target.value)} style={{ width: "100%", accentColor: T.gold, cursor: "pointer" }} />
</div>
</Panel>
<div style={{ background: "linear-gradient(135deg,#110a00,#1c1200)", border: `1px solid ${T.gold}55`, borderRadius: 9, padding: 16, textAlign: "center" }}>
<div style={{ ...TX.label, color: T.mid, marginBottom: 4 }}>Maximum Allowable Offer</div>
<div style={{ fontSize: 42, fontWeight: 900, color: T.gold, fontFamily: "'Courier New',monospace", lineHeight: 1 }}>{fmt(cArv * (cDisc / 100) - cRep - cFee)}</div>
<div style={{ ...TX.body, marginTop: 6 }}>{fmt(cArv)} x {cDisc}% - {fmt(cRep)} repairs - {fmt(cFee)} fee</div>
</div>
<Panel>
<SecHead>Enter Asking Price - Get Verdict</SecHead>
<NInput label="Seller's Asking Price" val={cPrice || ""} onChange={v => setCPrice(+v || 0)} prefix="$" ph="0" />
{cPrice > 0 && (() => {
const g = calcDeal(cArv, cPrice, cRep, cFee, cDisc / 100);
return (
<div style={{ marginTop: 9, background: g.isProfitable ? `${T.green}15` : `${T.red}15`, border: `1px solid ${g.isProfitable ? T.green : T.red}`, borderRadius: 7, padding: "12px 14px", textAlign: "center" }}>
<div style={{ fontSize: 14, fontWeight: 900, color: g.isProfitable ? T.greenL : T.redL }}>{g.isProfitable ? "DEAL" : "NO DEAL"} - {g.verdict}</div>
<div style={{ ...TX.body, marginTop: 4 }}>Grade: {g.grade} - Margin: {pctS(g.margin)} - MAO: {fmt(g.mao)}</div>
</div>
);
})()}
</Panel>
</div>
)}

{/* BUYERS */}
{tab === "people" && (
<div>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
<SecHead>Cash Buyer List ({buyers.length})</SecHead>
<button onClick={() => setShowBuyerForm(true)} style={{ background: `${T.gold}20`, border: `1px solid ${T.gold}55`, borderRadius: 6, color: T.gold, padding: "5px 11px", fontSize: 10, cursor: "pointer", fontFamily: "inherit", fontWeight: 800 }}>+ Add Buyer</button>
</div>
{buyers.map(b => (
<Panel key={b.id} style={{ marginBottom: 8 }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
<div style={{ flex: 1 }}>
<div style={{ ...TX.h2, marginBottom: 5 }}>{b.name}</div>
<div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 5 }}>
<Tag color={b.pof ? T.greenL : T.orange}>{b.pof ? "POF Verified" : "POF Needed"}</Tag>
<Tag color={T.blue}>{b.area}</Tag>
<Tag color={T.purple}>{b.repairTol} Rehab</Tag>
</div>
<div style={{ display: "flex", gap: 10 }}>
<span style={{ ...TX.body, fontSize: 10 }}>{b.phone}</span>
<span style={{ ...TX.body, fontSize: 10 }}>{b.email}</span>
</div>
{b.notes && <div style={{ ...TX.body, marginTop: 4, fontStyle: "italic", fontSize: 10 }}>{b.notes}</div>}
</div>
<button onClick={() => deleteBuyer(b.id)} style={{ background: "none", border: "none", color: T.mid, fontSize: 14, cursor: "pointer", padding: 2, fontWeight: 700 }}>X</button>
</div>
</Panel>
))}
{showBuyerForm && (
<Panel glow={T.gold} style={{ marginTop: 9 }}>
<SecHead>Add Cash Buyer</SecHead>
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
<NInput label="Buyer Name" val={buyerForm.name} onChange={v => setBuyerForm(p => ({ ...p, name: v }))} type="text" />
<NInput label="Phone" val={buyerForm.phone} onChange={v => setBuyerForm(p => ({ ...p, phone: v }))} type="text" />
<NInput label="Email" val={buyerForm.email} onChange={v => setBuyerForm(p => ({ ...p, email: v }))} type="text" />
<NInput label="Target Area" val={buyerForm.area} onChange={v => setBuyerForm(p => ({ ...p, area: v }))} type="text" />
<NInput label="Min ARV" val={buyerForm.minArv} onChange={v => setBuyerForm(p => ({ ...p, minArv: v }))} prefix="$" />
<NInput label="Max ARV" val={buyerForm.maxArv} onChange={v => setBuyerForm(p => ({ ...p, maxArv: v }))} prefix="$" />
<NSel label="Repair Tolerance" val={buyerForm.repairTol} onChange={v => setBuyerForm(p => ({ ...p, repairTol: v }))} opts={["Light", "Medium", "Heavy", "Any"]} />
<NSel label="Response Speed" val={buyerForm.responseSpeed} onChange={v => setBuyerForm(p => ({ ...p, responseSpeed: v }))} opts={["Fast", "Medium", "Slow"]} />
</div>
<NInput label="Notes" val={buyerForm.notes} onChange={v => setBuyerForm(p => ({ ...p, notes: v }))} type="text" ph="Preferences, closing speed..." />
<div style={{ display: "flex", alignItems: "center", gap: 9, margin: "11px 0" }}>
<input type="checkbox" checked={buyerForm.pof} onChange={e => setBuyerForm(p => ({ ...p, pof: e.target.checked }))} style={{ accentColor: T.gold, width: 16, height: 16 }} />
<span style={{ ...TX.body, fontWeight: 700 }}>Proof of Funds Verified</span>
</div>
<div style={{ display: "flex", gap: 7 }}>
<button onClick={addBuyer} style={{ flex: 1, background: `linear-gradient(135deg,${T.gold},${T.goldD})`, border: "none", borderRadius: 6, color: "#030608", padding: "10px", fontSize: 12, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}>Add to List</button>
<button onClick={() => setShowBuyerForm(false)} style={{ background: "transparent", border: `1px solid ${T.line}`, borderRadius: 6, color: T.text, padding: "10px 14px", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>Cancel</button>
</div>
</Panel>
)}
</div>
)}

{/* SCRIPTS */}
{tab === "scripts" && (
<div>
<div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
{["ALL", "ACQ", "OPS", "TITLE"].map(f => (
<button key={f} onClick={() => setScriptFilter(f)} style={{ background: scriptFilter === f ? `${T.gold}25` : T.bg3, border: `1px solid ${scriptFilter === f ? T.gold : T.line}`, borderRadius: 20, padding: "4px 11px", cursor: "pointer", color: scriptFilter === f ? T.gold : T.text, fontSize: 10, fontFamily: "inherit", fontWeight: 800 }}>
{f === "ALL" ? "All Scripts" : f === "ACQ" ? "Acquisition" : f === "OPS" ? "Operations" : "Title/Legal"}
</button>
))}
</div>
<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
{ALL_SCRIPTS.filter(s => scriptFilter === "ALL" || s.role === scriptFilter).map((s, i) => (
<Panel key={i}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
<div style={{ display: "flex", alignItems: "center", gap: 7 }}><Tag color={s.color}>{s.role}</Tag><span style={{ ...TX.h3 }}>{s.title}</span></div>
<button onClick={() => copyScript(s.body, i)} style={{ background: copiedIdx === i ? `${T.greenL}20` : `${T.gold}15`, border: `1px solid ${copiedIdx === i ? T.greenL : T.gold}`, color: copiedIdx === i ? T.greenL : T.gold, borderRadius: 5, padding: "3px 9px", fontSize: 9, cursor: "pointer", fontFamily: "inherit", fontWeight: 800 }}>{copiedIdx === i ? "Copied!" : "Copy"}</button>
</div>
<div style={{ background: T.bg2, border: `1px solid ${T.line}`, borderRadius: 6, padding: "10px 12px", fontSize: 11, color: T.bright, lineHeight: 1.8, whiteSpace: "pre-wrap", fontFamily: "'Courier New',monospace", maxHeight: 210, overflowY: "auto", fontWeight: 600 }}>{s.body}</div>
</Panel>
))}
</div>
</div>
)}

{/* SOP */}
{tab === "sop" && (
<div>
<div style={{ background: "linear-gradient(135deg,#110800,#1c1100)", border: `1px solid ${T.gold}44`, borderRadius: 9, padding: "13px 15px", textAlign: "center", marginBottom: 10 }}>
<div style={{ ...TX.h1, color: T.gold }}>The 12 Iron Laws</div>
<div style={{ ...TX.body, marginTop: 5 }}>Zero Exceptions. Zero Wiggle Room. Maximum Output.</div>
</div>
{IRON_LAWS.map((law, i) => (
<div key={i} style={{ background: lawOpen === i ? `${law.color}0d` : T.bg3, border: `1px solid ${lawOpen === i ? law.color + "55" : T.line}`, borderRadius: 9, marginBottom: 7, overflow: "hidden" }}>
<div onClick={() => setLawOpen(lawOpen === i ? null : i)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", cursor: "pointer" }}>
<div style={{ width: 26, height: 26, borderRadius: 6, background: law.color + "20", border: `1px solid ${law.color}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: law.color, flexShrink: 0 }}>{law.n}</div>
<div style={{ flex: 1 }}>
<div style={{ ...TX.h3, fontSize: 12, color: T.white }}>{law.law}</div>
</div>
<div style={{ color: lawOpen === i ? law.color : T.mid, fontSize: 14, fontWeight: 700 }}>{lawOpen === i ? "^" : "v"}</div>
</div>
{lawOpen === i && (
<div style={{ padding: "0 13px 13px", borderTop: `1px solid ${law.color}25` }}>
<div style={{ background: law.color + "0d", border: `1px solid ${law.color}25`, borderRadius: 7, padding: "10px 12px", marginTop: 9 }}>
<div style={{ ...TX.body, color: T.bright, lineHeight: 1.8 }}>{law.detail}</div>
</div>
</div>
)}
</div>
))}
</div>
)}
</div>

{/* ADD DEAL MODAL */}
{showDealForm && (
<div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.94)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 10 }} onClick={e => e.target === e.currentTarget && setShowDealForm(false)}>
<div style={{ background: T.bg3, border: `1px solid ${T.line2}`, borderRadius: 11, padding: 17, width: "100%", maxWidth: 460, maxHeight: "94vh", overflowY: "auto" }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
<div style={{ ...TX.h2, color: T.gold }}>{editDealId ? "Edit Deal" : "Add New Deal"}</div>
<button onClick={() => { setShowDealForm(false); setEditDealId(null); }} style={{ background: "none", border: "none", color: T.mid, fontSize: 18, cursor: "pointer", fontWeight: 700 }}>X</button>
</div>

<div style={{ marginBottom: 9 }}>
<div style={{ ...TX.label, marginBottom: 3 }}>Property Address *</div>
<input type="text" value={dealForm.address} placeholder="123 Main St, Tucson AZ 85705" onChange={e => setDealForm(p => ({ ...p, address: e.target.value }))} style={{ width: "100%", boxSizing: "border-box", background: T.bg2, border: `1.5px solid ${dupWarning ? T.redL : T.line2}`, borderRadius: 6, padding: "8px 10px", color: T.white, fontSize: 12, fontFamily: "inherit", outline: "none", fontWeight: 600 }} />
{dupWarning && <div style={{ background: `${T.redL}15`, border: `1px solid ${T.redL}44`, borderRadius: 6, padding: "7px 10px", marginTop: 5 }}><div style={{ fontSize: 10, fontWeight: 800, color: T.redL }}>Duplicate address detected!</div></div>}
</div>

<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 9 }}>
{[{ l: "ARV ($)*", k: "arv", c: T.gold }, { l: "Price ($)*", k: "price", c: T.blueL }, { l: "Repairs ($)", k: "repairs", c: T.text }].map(({ l, k, c }) => (
<div key={k}>
<div style={{ ...TX.label, marginBottom: 3 }}>{l}</div>
<div style={{ position: "relative" }}><span style={{ position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)", color: c, fontSize: 11, pointerEvents: "none", fontWeight: 700 }}>$</span><input type="number" value={dealForm[k]} onChange={e => setDealForm(p => ({ ...p, [k]: e.target.value }))} style={{ width: "100%", boxSizing: "border-box", background: T.bg2, border: `1px solid ${T.line2}`, borderRadius: 6, padding: "6px 6px 6px 16px", color: c, fontSize: 11, fontFamily: "monospace", outline: "none", fontWeight: 700 }} /></div>
</div>
))}
</div>

<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 9 }}>
<NSel label="Source" val={dealForm.source} onChange={v => setDealForm(p => ({ ...p, source: v }))} opts={SOURCES} />
<NSel label="Area" val={dealForm.area} onChange={v => setDealForm(p => ({ ...p, area: v }))} opts={AREAS.filter(a => a !== "All Areas")} />
<NSel label="Stage" val={dealForm.stage} onChange={v => setDealForm(p => ({ ...p, stage: v }))} opts={STAGES} />
</div>

<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 9 }}>
<NSel label="Partner" val={dealForm.staff} onChange={v => setDealForm(p => ({ ...p, staff: v }))} opts={["Acq", "Ops", "Both"]} />
<div><div style={{ ...TX.label, marginBottom: 3 }}>Seller Name</div><input type="text" value={dealForm.sellerName || ""} onChange={e => setDealForm(p => ({ ...p, sellerName: e.target.value }))} style={{ width: "100%", boxSizing: "border-box", background: T.bg2, border: `1px solid ${T.line2}`, borderRadius: 6, padding: "6px 8px", color: T.white, fontSize: 11, fontFamily: "inherit", outline: "none", fontWeight: 600 }} /></div>
<div><div style={{ ...TX.label, marginBottom: 3 }}>Seller Phone</div><input type="text" value={dealForm.sellerPhone || ""} onChange={e => setDealForm(p => ({ ...p, sellerPhone: e.target.value }))} style={{ width: "100%", boxSizing: "border-box", background: T.bg2, border: `1px solid ${T.line2}`, borderRadius: 6, padding: "6px 8px", color: T.white, fontSize: 11, fontFamily: "inherit", outline: "none", fontWeight: 600 }} /></div>
</div>

<div style={{ background: `${T.gold}0a`, border: `1px solid ${T.gold}30`, borderRadius: 8, padding: 11, marginBottom: 9 }}>
<div style={{ ...TX.label, color: T.gold, marginBottom: 8 }}>Seller Motivation</div>
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
<div><div style={{ ...TX.label, marginBottom: 3 }}>Motivation Level (1-10)</div><input type="number" min="1" max="10" value={dealForm.motivationLevel} onChange={e => setDealForm(p => ({ ...p, motivationLevel: e.target.value }))} style={{ width: "100%", boxSizing: "border-box", background: T.bg2, border: `1px solid ${T.line2}`, borderRadius: 6, padding: "6px 8px", color: T.gold, fontSize: 12, fontFamily: "monospace", outline: "none", fontWeight: 800 }} /></div>
<NSel label="Occupied / Vacant" val={dealForm.occupied} onChange={v => setDealForm(p => ({ ...p, occupied: v }))} opts={["Vacant", "Occupied", "Unknown"]} />
<div><div style={{ ...TX.label, marginBottom: 3 }}>Reason For Selling</div><input type="text" value={dealForm.reasonSelling || ""} onChange={e => setDealForm(p => ({ ...p, reasonSelling: e.target.value }))} placeholder="Divorce, probate..." style={{ width: "100%", boxSizing: "border-box", background: T.bg2, border: `1px solid ${T.line2}`, borderRadius: 6, padding: "6px 8px", color: T.white, fontSize: 11, fontFamily: "inherit", outline: "none", fontWeight: 600 }} /></div>
<div><div style={{ ...TX.label, marginBottom: 3 }}>Timeline To Sell</div><input type="text" value={dealForm.timelineToSell || ""} onChange={e => setDealForm(p => ({ ...p, timelineToSell: e.target.value }))} placeholder="ASAP, 30 days..." style={{ width: "100%", boxSizing: "border-box", background: T.bg2, border: `1px solid ${T.line2}`, borderRadius: 6, padding: "6px 8px", color: T.white, fontSize: 11, fontFamily: "inherit", outline: "none", fontWeight: 600 }} /></div>
</div>
<div style={{ marginTop: 7 }}><div style={{ ...TX.label, marginBottom: 3 }}>Objections</div><input type="text" value={dealForm.objections || ""} onChange={e => setDealForm(p => ({ ...p, objections: e.target.value }))} placeholder="Wants full price, needs time..." style={{ width: "100%", boxSizing: "border-box", background: T.bg2, border: `1px solid ${T.line2}`, borderRadius: 6, padding: "6px 8px", color: T.white, fontSize: 11, fontFamily: "inherit", outline: "none", fontWeight: 600 }} /></div>
</div>

<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 9 }}>
{[{ l: "Asking Price ($)", k: "askingPrice" }, { l: "Est. Assignment Fee ($)", k: "estimatedFee" }].map(({ l, k }) => (
<div key={k}><div style={{ ...TX.label, marginBottom: 3 }}>{l}</div><div style={{ position: "relative" }}><span style={{ position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)", color: T.greenL, fontSize: 11, pointerEvents: "none", fontWeight: 700 }}>$</span><input type="number" value={dealForm[k] || ""} onChange={e => setDealForm(p => ({ ...p, [k]: e.target.value }))} style={{ width: "100%", boxSizing: "border-box", background: T.bg2, border: `1px solid ${T.line2}`, borderRadius: 6, padding: "6px 6px 6px 16px", color: T.greenL, fontSize: 11, fontFamily: "monospace", outline: "none", fontWeight: 700 }} /></div></div>
))}
</div>

<div style={{ marginBottom: 9 }}>
<div style={{ ...TX.label, marginBottom: 3 }}>Communication Notes</div>
<input type="text" value={dealForm.commNotes || ""} onChange={e => setDealForm(p => ({ ...p, commNotes: e.target.value }))} placeholder="What was said, seller mood..." style={{ width: "100%", boxSizing: "border-box", background: T.bg2, border: `1px solid ${T.line2}`, borderRadius: 6, padding: "7px 9px", color: T.white, fontSize: 11, fontFamily: "inherit", outline: "none", fontWeight: 600 }} />
</div>

<div style={{ marginBottom: 12 }}>
<div style={{ ...TX.label, marginBottom: 3 }}>Notes / Situation Summary</div>
<input type="text" value={dealForm.notes || ""} onChange={e => setDealForm(p => ({ ...p, notes: e.target.value }))} placeholder="Divorce, probate, vacant..." style={{ width: "100%", boxSizing: "border-box", background: T.bg2, border: `1px solid ${T.line2}`, borderRadius: 6, padding: "7px 9px", color: T.white, fontSize: 11, fontFamily: "inherit", outline: "none", fontWeight: 600 }} />
</div>

{dealForm.arv && dealForm.price && (() => {
const g = calcDeal(dealForm.arv, dealForm.price, dealForm.repairs || 0);
return (
<div style={{ background: `${g.gc}0d`, border: `1px solid ${g.gc}44`, borderRadius: 7, padding: "9px 12px", marginBottom: 12 }}>
<div style={{ display: "flex", alignItems: "center", gap: 9 }}>
<GradeChip grade={g.grade} color={g.gc} size={14} />
<div>
<div style={{ fontSize: 11, fontWeight: 800, color: g.gc }}>{g.verdict} - {g.urgency}</div>
<div style={{ ...TX.body, marginTop: 2 }}>MAO: {fmt(g.mao)} - Margin: {pctS(g.margin)}</div>
</div>
</div>
</div>
);
})()}

<div style={{ display: "flex", gap: 8 }}>
<button onClick={submitDeal} disabled={!!dupWarning && !editDealId} style={{ flex: 1, background: dupWarning && !editDealId ? T.dim : `linear-gradient(135deg,${T.gold},${T.goldD})`, border: "none", borderRadius: 7, color: "#020509", padding: "11px", fontSize: 13, fontWeight: 900, cursor: dupWarning && !editDealId ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
{editDealId ? "Update Deal" : "Submit Deal"}
</button>
<button onClick={() => { setShowDealForm(false); setEditDealId(null); }} style={{ background: "transparent", border: `1px solid ${T.line}`, borderRadius: 7, color: T.text, padding: "11px 15px", fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>Cancel</button>
</div>
</div>
</div>
)}

{/* BOTTOM NAV */}
<div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200, background: T.bg3, borderTop: `2px solid ${T.line}`, display: "flex", height: 58 }}>
{TABS.map(t => (
<button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, background: "none", border: "none", borderTop: `2px solid ${tab === t.id ? T.gold : "transparent"}`, padding: "6px 2px 4px", cursor: "pointer", color: tab === t.id ? T.gold : T.mid, fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
<div style={{ fontSize: tab === t.id ? 8 : 7, letterSpacing: 0.3, textTransform: "uppercase", fontWeight: tab === t.id ? 900 : 700, whiteSpace: "nowrap" }}>{t.label}</div>
</button>
))}
</div>
</div>
);
}
