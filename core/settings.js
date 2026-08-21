const KEY = "orion_settings_v4";
const THEMES = new Set(["system","light","dark"]);
const BRANDS = new Set(["radar-visionario","monograma-radar","visionario","minimal"]);
const DEFAULTS = Object.freeze({ theme:"system", animations:true, hideValues:false, brandStyle:"radar-visionario", grossSalary:0, reserveMonths:4, investmentSetupComplete:false, profileName:"João", plan:"free" });

function finiteNumber(value,fallback=0){
  const n=Number(value);
  return Number.isFinite(n)?n:fallback;
}
function normalizeSettings(raw={}){
  const gross=Math.max(0,Math.min(1_000_000_000,finiteNumber(raw.grossSalary,0)));
  const months=Math.min(24,Math.max(1,Math.round(finiteNumber(raw.reserveMonths,4))));
  return {
    theme:THEMES.has(raw.theme)?raw.theme:DEFAULTS.theme,
    animations:raw.animations!==false,
    hideValues:raw.hideValues===true,
    brandStyle:BRANDS.has(raw.brandStyle)?raw.brandStyle:DEFAULTS.brandStyle,
    grossSalary:gross,
    reserveMonths:months,
    investmentSetupComplete:raw.investmentSetupComplete===true && gross>0,
    profileName:String(raw.profileName||DEFAULTS.profileName).trim().slice(0,40)||DEFAULTS.profileName,
    plan:["free","premium","pro"].includes(raw.plan)?raw.plan:"free"
  };
}
export function getSettings(){
  try{return normalizeSettings({...DEFAULTS,...JSON.parse(localStorage.getItem(KEY)||"{}")});}
  catch{return{...DEFAULTS};}
}
export function saveSettings(patch){
  const next=normalizeSettings({...getSettings(),...(patch||{})});
  localStorage.setItem(KEY,JSON.stringify(next));
  applySettings(next);
  return next;
}
export function applySettings(settings=getSettings()){
  const safe=normalizeSettings(settings);
  const dark=safe.theme==="dark"||(safe.theme==="system"&&window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  const root=document.documentElement;
  root.dataset.theme=dark?"dark":"light";
  root.dataset.animations=safe.animations?"on":"off";
  root.dataset.hideValues=safe.hideValues?"on":"off";
  root.dataset.brand=safe.brandStyle;
  return safe;
}
export function bindSystemTheme(){
  const mq=window.matchMedia?.("(prefers-color-scheme: dark)");
  mq?.addEventListener?.("change",()=>{if(getSettings().theme==="system")applySettings();});
}
