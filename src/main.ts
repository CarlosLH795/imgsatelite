import { bootstrapApplication } from '@angular/platform-browser';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BORDER_PATHS } from './geo-paths';

type Mode = 'sat' | 'rain' | 'temp';
type Sample = {lat:number; lon:number; values:number[]};
@Component({selector:'app-root',standalone:true,imports:[CommonModule,FormsModule],template:`
<div class="shell">
<header><div><div class="eyebrow">OBSERVACIÓN Y PRONÓSTICO · NOAA / NESDIS</div><h1>GOES <span>·</span> México</h1><p>Satélite GOES-19 y pronóstico GFS de lluvia y temperatura</p></div><div class="status"><span class="dot"></span> SATÉLITE: ACTUALIZACIÓN CADA 10 MIN</div></header>
<nav class="tabs"><button [class.active]="mode==='sat'" (click)="mode='sat'">🛰 Satélite</button><button [class.active]="mode==='rain'" (click)="selectForecast('rain')">🌧 Pronóstico de lluvia</button><button [class.active]="mode==='temp'" (click)="selectForecast('temp')">🌡 Pronóstico de temperatura</button></nav>
<ng-container *ngIf="mode==='sat'">
<div class="toolbar"><label>Región <select [(ngModel)]="region" (ngModelChange)="reload()"><option value="mex">México</option><option value="gm">Golfo de México</option><option value="car">Caribe</option><option value="cam">Centroamérica</option></select></label><label>Resolución <select [(ngModel)]="resolution" (ngModelChange)="reload()"><option value="1000x1000">1000 × 1000</option><option value="2000x2000">2000 × 2000</option><option value="500x500">500 × 500</option></select></label><button (click)="reload()">↻ Actualizar ahora</button><a [href]="officialUrl" target="_blank" rel="noopener noreferrer">Abrir en NOAA ↗</a></div>
<div class="layout"><section class="viewer"><div class="viewer-top"><div><span class="dot"></span> IMAGEN SATELITAL <span class="muted">· GOES-19 / GEOCOLOR</span></div><div class="muted">Imagen más reciente publicada</div></div><div class="image-wrap"><img [src]="imageUrl" alt="Imagen satelital NOAA GeoColor" (load)="loaded()" (error)="failed()" [style.transform]="'scale('+zoom+')'"/><div *ngIf="loading" class="overlay">Cargando imagen de NOAA…</div><div *ngIf="error" class="overlay error">No se pudo cargar la imagen. Comprueba la conexión o abre la fuente oficial.</div></div><div class="image-bottom"><span>NOAA / CIRA · Imagen informativa</span><div><button (click)="changeZoom(-0.2)">−</button><span>{{(zoom*100).toFixed(0)}}%</span><button (click)="changeZoom(0.2)">+</button><button (click)="zoom=1">Restablecer</button></div></div></section>
<aside><div class="panel"><div class="eyebrow">ESTADO DEL VISOR</div><h2>{{error?'Error de carga':loading?'Cargando…':'Imagen disponible'}}</h2><p>Última consulta local</p><strong>{{lastChecked ? (lastChecked | date:'dd/MM/yyyy HH:mm:ss') : 'Pendiente'}}</strong><p>Próxima consulta automática</p><strong>{{nextRefresh ? (nextRefresh | date:'HH:mm:ss') : 'Pendiente'}}</strong><small>Estos horarios no son la hora de captura satelital.</small></div><div class="panel"><div class="eyebrow">FUENTE DE DATOS</div><h2>NOAA GOES-19</h2><p>GeoColor: color aproximado de día e infrarrojo multiespectral de noche.</p><a [href]="imageUrl" target="_blank" rel="noopener noreferrer">Ver JPG original ↗</a></div></aside></div>
</ng-container>
<ng-container *ngIf="mode!=='sat'">
<div class="toolbar">
<label>Hora del pronóstico (UTC) <select [(ngModel)]="frame" (ngModelChange)="updateSurface()"><option *ngFor="let t of frameLabels; let i=index" [ngValue]="i">{{t}}</option></select></label>
<button (click)="step(-1)" [disabled]="frame===0">◀ Anterior</button><button (click)="togglePlay()">{{playing?'⏸ Pausar':'▶ Animar'}}</button><button (click)="step(1)" [disabled]="frame>=frameLabels.length-1">Siguiente ▶</button>
<button (click)="loadForecast()">↻ Actualizar datos</button><a href="https://www.ncei.noaa.gov/products/weather-climate-models/global-forecast" target="_blank" rel="noopener noreferrer">Modelo GFS ↗</a></div>
<div class="layout"><section class="viewer"><div class="viewer-top"><strong>{{mode==='rain'?'LLUVIA PREVISTA EN 3 HORAS (mm)':'TEMPERATURA A 2 m (°C)'}}</strong><span class="muted">{{frameLabels[frame] || 'Esperando datos'}} · UTC</span></div>
<div class="map-area"><svg viewBox="0 0 1000 600" role="img" aria-label="Mapa interpolado del pronóstico GFS sobre México con costas y fronteras geográficas" preserveAspectRatio="xMidYMid meet">
<rect width="1000" height="600" fill="#10283a"/><g><rect *ngFor="let cell of surface" [attr.x]="cell.x" [attr.y]="cell.y" [attr.width]="cell.w+0.5" [attr.height]="cell.h+0.5" [attr.fill]="cell.color"/></g>
<g fill="none" stroke="#f0f8ff" stroke-opacity=".75" stroke-width="1.65" stroke-linejoin="round"><path *ngFor="let path of borderPaths" [attr.d]="path"/></g>
<g stroke="#d8e8f3" stroke-opacity=".14" stroke-width="1"><path *ngFor="let x of gridX" [attr.d]="'M'+x+',0 V600'"/><path *ngFor="let y of gridY" [attr.d]="'M0,'+y+' H1000'"/></g>
<g fill="#fff" font-size="20" font-weight="700" style="paint-order:stroke;stroke:#13263c;stroke-width:4"><text x="420" y="300">MÉXICO</text><text x="720" y="180" font-size="16">Golfo de México</text><text x="120" y="530" font-size="16">Océano Pacífico</text></g></svg>
<div *ngIf="forecastLoading" class="overlay">Descargando pronóstico GFS…</div><div *ngIf="forecastError" class="overlay error">{{forecastError}} <button (click)="loadForecast()">Reintentar</button></div></div>
<div class="legend"><span *ngFor="let item of legend" class="legend-item"><i [style.background]="item.color"></i>{{item.label}}</span></div><div class="image-bottom">Mapa interpolado a partir de {{samples.length}} puntos GFS. Las costas y fronteras son geográficas; los colores son estimaciones entre puntos y no equivalen a la resolución nativa del modelo.</div></section>
<aside><div class="panel"><div class="eyebrow">PRONÓSTICO NUMÉRICO</div><h2>NOAA GFS</h2><p>{{mode==='rain'?'Precipitación prevista acumulada en intervalos de 3 horas.':'Temperatura prevista a 2 metros, instantánea cada 3 horas.'}}</p><p>Fuente del modelo: NOAA/NCEP. Datos a través de Open-Meteo.</p><small>Mapa interpolado (distancia inversa). Puede suavizar o exagerar patrones; no sustituye avisos oficiales ni mapas de alta resolución.</small></div><div class="panel"><div class="eyebrow">DATOS</div><p>Puntos: <strong>{{samples.length}}</strong></p><p>Intervalos: <strong>{{frameLabels.length}}</strong></p><p>Consultado: {{forecastChecked ? (forecastChecked | date:'dd/MM/yyyy HH:mm') : 'Pendiente'}}</p><a href="https://open-meteo.com/en/docs/gfs-api" target="_blank" rel="noopener noreferrer">API GFS ↗</a></div></aside></div>
</ng-container>
<footer>Proyecto Angular local · Fuentes: NOAA / NESDIS / NCEP, Open-Meteo · No utilizar para decisiones de emergencia</footer>
</div>`})
export class AppComponent implements OnInit,OnDestroy {
 mode:Mode='sat';region='mex';resolution='1000x1000';imageUrl='';loading=true;error=false;zoom=1;
 lastChecked:Date|null=null;nextRefresh:Date|null=null;private timer?:ReturnType<typeof setInterval>;
 frame=0;frameLabels:string[]=[];samples:Sample[]=[];surface:{x:number;y:number;w:number;h:number;color:string}[]=[];
 forecastLoading=false;forecastError='';forecastChecked:Date|null=null;playing=false;private playTimer?:ReturnType<typeof setInterval>;
 gridX=[125,250,375,500,625,750,875];gridY=[100,200,300,400,500];borderPaths=BORDER_PATHS;
 private forecastRain:number[][]=[];private forecastTemp:number[][]=[];
 get officialUrl(){return `https://www.star.nesdis.noaa.gov/GOES/sector_band.php?sat=G19&sector=${this.region}&band=GEOCOLOR&length=12`;}
 get legend(){return this.mode==='rain'?[{label:'0–1 mm',color:'#d5e8f3'},{label:'1–5',color:'#74b5ee'},{label:'5–15',color:'#2780e4'},{label:'15–30',color:'#36b879'},{label:'30–60',color:'#e9bd39'},{label:'60+',color:'#df5955'}]:[{label:'< 10 °C',color:'#4165d5'},{label:'10–20',color:'#4ea6e9'},{label:'20–25',color:'#42c3aa'},{label:'25–30',color:'#e7c34e'},{label:'30–35',color:'#e98743'},{label:'35+',color:'#e04c55'}];}
 ngOnInit(){this.reload();this.timer=setInterval(()=>this.reload(),600000);}
 ngOnDestroy(){if(this.timer)clearInterval(this.timer);this.stopPlay();}
 reload(){this.loading=true;this.error=false;this.zoom=1;this.lastChecked=new Date();this.nextRefresh=new Date(Date.now()+600000);this.imageUrl=`https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/${this.region}/GEOCOLOR/${this.resolution}.jpg?t=${Date.now()}`;}
 loaded(){this.loading=false;this.error=false;}failed(){this.loading=false;this.error=true;}
 changeZoom(delta:number){this.zoom=Math.max(1,Math.min(3,Math.round((this.zoom+delta)*10)/10));}
 mapX(lon:number){return (lon+118)/32*1000;}mapY(lat:number){return (33-lat)/19*600;}
 colorFor(v:number){if(this.mode==='rain')return v<1?'#d5e8f3':v<5?'#74b5ee':v<15?'#2780e4':v<30?'#36b879':v<60?'#e9bd39':'#df5955';return v<10?'#4165d5':v<20?'#4ea6e9':v<25?'#42c3aa':v<30?'#e7c34e':v<35?'#e98743':'#e04c55';}
 selectForecast(m:Mode){this.mode=m;this.stopPlay();if(!this.frameLabels.length&&!this.forecastLoading)this.loadForecast();else this.updateSurface();}
 step(delta:number){this.frame=Math.max(0,Math.min(this.frameLabels.length-1,this.frame+delta));this.updateSurface();if(this.frame===this.frameLabels.length-1)this.stopPlay();}
 stopPlay(){if(this.playTimer)clearInterval(this.playTimer);this.playTimer=undefined;this.playing=false;}
 togglePlay(){if(this.playing){this.stopPlay();return;}if(!this.frameLabels.length)return;if(this.frame>=this.frameLabels.length-1)this.frame=0;this.playing=true;this.playTimer=setInterval(()=>this.step(1),800);}
 updateSurface(){
  if(!this.samples.length||!this.frameLabels.length)return;
  const data=this.mode==='rain'?this.forecastRain:this.forecastTemp;
  const pts=this.samples.map((p,i)=>({x:this.mapX(p.lon),y:this.mapY(p.lat),v:data[i]?.[this.frame]})).filter(p=>Number.isFinite(p.v));
  const cols=64,rows=39,w=1000/cols,h=600/rows;const result:typeof this.surface=[];
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
   const x=(i+.5)*w,y=(j+.5)*h;let sum=0,weights=0,exact:number|undefined;
   for(const p of pts){const d2=(p.x-x)**2+(p.y-y)**2;if(d2<.001){exact=p.v;break;}const weight=1/(d2+100);sum+=p.v*weight;weights+=weight;}
   const v=exact??(weights?sum/weights:0);result.push({x:i*w,y:j*h,w,h,color:this.colorFor(v)});
  }
  this.surface=result;
 }
 async loadForecast(){
  this.stopPlay();this.forecastLoading=true;this.forecastError='';
  const coords:{lat:number;lon:number}[]=[];
  for(let lat=15;lat<=32;lat+=2.5)for(let lon=-116;lon<=-87;lon+=3.5)coords.push({lat:+lat.toFixed(2),lon:+lon.toFixed(2)});
  const url=`https://api.open-meteo.com/v1/gfs?latitude=${coords.map(c=>c.lat).join(',')}&longitude=${coords.map(c=>c.lon).join(',')}&hourly=precipitation,temperature_2m&forecast_days=4&timezone=UTC`;
  try{
   const response=await fetch(url);if(!response.ok)throw new Error(`HTTP ${response.status}`);
   const json=await response.json();const records=Array.isArray(json)?json:[json];
   if(records.length!==coords.length)throw new Error(`Respuesta incompleta: ${records.length} puntos`);
   const times:string[]=records[0].hourly.time;
   const indices=times.map((_,i)=>i).filter(i=>i%3===0&&i+2<times.length);
   this.frameLabels=indices.map(i=>times[i].replace('T',' ')+'–'+times[i+2].slice(11,16));
   this.forecastRain=records.map((r:any)=>indices.map(i=>[0,1,2].reduce((a,k)=>a+(Number(r.hourly.precipitation[i+k])||0),0)));
   this.forecastTemp=records.map((r:any)=>indices.map(i=>Number(r.hourly.temperature_2m[i])||0));
   this.samples=coords.map(c=>({...c,values:[]}));this.frame=0;this.forecastChecked=new Date();this.updateSurface();
  }catch(e){this.forecastError=`No se pudieron descargar los datos GFS (${e instanceof Error?e.message:'error desconocido'}).`;}finally{this.forecastLoading=false;}
 }
}
bootstrapApplication(AppComponent).catch(err=>console.error(err));
