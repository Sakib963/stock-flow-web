"use strict";(self.webpackChunkstock_flow_web=self.webpackChunkstock_flow_web||[]).push([[36],{5816:(F,O,d)=>{d.d(O,{k:()=>R});var f=d(1626),m=d(5312),C=d(7705),E=d(6504);let R=(()=>{class h{constructor(l,u){this._httpClient=l,this._notification=u,this._headers=new f.Lr({accept:"application/json"})}get(l,u){return this._httpClient.get(`${m.c.baseUrl}${l}`,{params:u,headers:this._headers,observe:"response"})}post(l,u){return this._httpClient.post(`${m.c.baseUrl}${l}`,u,{headers:this._headers,observe:"response"})}put(l,u){return this._httpClient.put(`${m.c.baseUrl}${l}`,u,{headers:this._headers,observe:"response"})}getList(l,u){let s=new f.Nl;for(const p in u)u.hasOwnProperty(p)&&(u[p]?s=s.set(p,u[p]):s.has(p)&&(s=s.delete(p)));return this._httpClient.get(`${l}`,{params:s})}static{this.\u0275fac=function(u){return new(u||h)(C.KVO(f.Qq),C.KVO(E.xY))}}static{this.\u0275prov=C.jDH({token:h,factory:h.\u0275fac,providedIn:"root"})}}return h})()},9079:(F,O,d)=>{d.d(O,{pQ:()=>E});var f=d(7705),m=d(1985),C=d(6977);function E(e){e||((0,f.Af3)(E),e=(0,f.WQX)(f.abz));const r=new m.c(t=>e.onDestroy(t.next.bind(t)));return t=>t.pipe((0,C.Q)(r))}Error}}]);