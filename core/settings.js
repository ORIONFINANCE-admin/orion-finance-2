const KEY = "orion_settings_v4";
const DEFAULTS = Object.freeze({ theme:"system", animations:true, hideValues:false, brandStyle:"radar-visionario" });
export function getSettings(){try{return{...DEFAULTS,...JSON.parse(localStorage.getItem(KEY)||"{}")}}catch{return{...DEFAULTS}}}
export function saveSettings(patch){const next={...getSettings(),...patch};localStorage.setItem(KEY,JSON.stringify(next));applySettings(next);return next}
export function applySettings(settings=getSettings()){
  const dark=settings.theme==="dark"||(settings.theme==="system"&&window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  const root=document.documentElement; root.dataset.theme=dark?"dark":"light"; root.dataset.animations=settings.animations?"on":"off"; root.dataset.hideValues=settings.hideValues?"on":"off"; root.dataset.brand=settings.brandStyle||"radar-visionario"; return settings;
}
export function bindSystemTheme(){const mq=window.matchMedia?.("(prefers-color-scheme: dark)");mq?.addEventListener?.("change",()=>{if(getSettings().theme==="system")applySettings()})}
