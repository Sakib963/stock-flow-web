"use strict";(self.webpackChunkstock_flow_web=self.webpackChunkstock_flow_web||[]).push([[91],{3091:(x,f,o)=>{o.r(f),o.d(f,{InventoryOverviewListComponent:()=>L});var c=o(177),s=o(4341),t=o(7705),h=o(3887),d=o(765),m=o(5286),u=o(5088),p=o(6505);function v(n,l){if(1&n&&t.nrm(0,"app-loader",2),2&n){const e=t.XpG();t.Y8G("isVisible",e.loading)}}function C(n,l){if(1&n&&t.nrm(0,"img",31),2&n){const e=t.XpG().$implicit;t.Y8G("src",e.photo,t.B4B)}}function w(n,l){if(1&n&&(t.j41(0,"div",32)(1,"p",33),t.EFF(2),t.k0s()()),2&n){const e=t.XpG().$implicit,i=t.XpG(3);t.R7$(2),t.JRh(i.getFirstLetter(null==e?null:e.product_name))}}function y(n,l){1&n&&(t.j41(0,"div",34),t.nrm(1,"svg-icon",35),t.j41(2,"span",36),t.EFF(3,"Low-Stock"),t.k0s()())}function E(n,l){if(1&n){const e=t.RV6();t.qex(0),t.j41(1,"li",12)(2,"div",13),t.DNE(3,C,1,1,"img",14),t.DNE(4,w,3,1,"div",15),t.j41(5,"div",16)(6,"p",17),t.EFF(7,"Product Name: "),t.j41(8,"span",18),t.EFF(9),t.k0s()(),t.j41(10,"p",19),t.EFF(11,"Total Available Quantity: "),t.j41(12,"span",20),t.EFF(13),t.k0s()(),t.DNE(14,y,4,0,"div",21),t.k0s()(),t.j41(15,"div",22)(16,"div")(17,"p",23),t.EFF(18,"Total Batches: "),t.j41(19,"span",18),t.EFF(20),t.k0s()(),t.j41(21,"p",23),t.EFF(22,"Restock Quantity: "),t.j41(23,"span",18),t.EFF(24),t.k0s()()()(),t.j41(25,"div",24)(26,"div",25)(27,"div",26)(28,"button",27),t.bIt("click",function(){const r=t.eBV(e).$implicit,g=t.XpG(3);return t.Njj(g.handleAction("view",r))}),t.qSk(),t.j41(29,"svg",28),t.nrm(30,"path",29)(31,"path",30),t.k0s()()()()()(),t.bVm()}if(2&n){const e=l.$implicit,i=t.XpG(3);t.R7$(3),t.Y8G("ngIf",null==e?null:e.photo),t.R7$(1),t.Y8G("ngIf",!(null!=e&&e.photo)),t.R7$(5),t.JRh(null==e?null:e.product_name),t.R7$(3),t.Y8G("ngClass",i.getRestockThresholdStatus(e)?"text-[#DF1463]":"text-[#5EB248]"),t.R7$(1),t.JRh(null==e?null:e.total_available_quantity),t.R7$(1),t.Y8G("ngIf",i.getRestockThresholdStatus(e)),t.R7$(6),t.JRh(null==e?null:e.total_batches),t.R7$(4),t.JRh(null==e?null:e.restock_threshold)}}function b(n,l){if(1&n&&(t.j41(0,"ul",10),t.DNE(1,E,32,8,"ng-container",11),t.k0s()),2&n){const e=t.XpG(2);t.R7$(1),t.Y8G("ngForOf",e.data)}}function z(n,l){1&n&&(t.j41(0,"div",37),t.nrm(1,"img",38),t.j41(2,"h2",39),t.EFF(3,"No Data Found"),t.k0s(),t.j41(4,"p",40),t.EFF(5,"Try refining your search."),t.k0s()())}function j(n,l){if(1&n&&t.EFF(0),2&n){const e=l.range;t.E5c(" ",e[0]," - ",e[1]," of ",l.$implicit," items ")}}function F(n,l){if(1&n){const e=t.RV6();t.j41(0,"div",3),t.DNE(1,b,2,1,"ul",4),t.DNE(2,z,6,0,"div",5),t.j41(3,"div",6)(4,"div",7)(5,"nz-pagination",8),t.bIt("nzPageIndexChange",function(a){t.eBV(e);const r=t.XpG();return t.Njj(r.currentIndex=a)})("nzPageSizeChange",function(a){t.eBV(e);const r=t.XpG();return t.Njj(r.pageSize=a)})("nzPageIndexChange",function(a){t.eBV(e);const r=t.XpG();return t.Njj(r.onPageIndexChange(a))})("nzPageSizeChange",function(a){t.eBV(e);const r=t.XpG();return t.Njj(r.onPageSizeChange(a))}),t.k0s(),t.DNE(6,j,1,3,"ng-template",null,9,t.C5r),t.k0s()()()}if(2&n){const e=t.sdS(7),i=t.XpG();t.R7$(1),t.Y8G("ngIf",i.data.length),t.R7$(1),t.Y8G("ngIf",!i.data.length),t.R7$(3),t.Y8G("nzPageIndex",i.currentIndex)("nzPageSize",i.pageSize)("nzShowSizeChanger",!0)("nzShowTotal",e)("nzTotal",i.totalCount)}}let O=(()=>{class n{constructor(){this.data=[],this.actionEmitter=new t.bkB,this.paginationEvent=new t.bkB,this.loading=!1,this.totalCount=0,this.currentIndex=1,this.offset=0,this.pageSize=h.YM.PAGE_SIZE}onPageIndexChange(e){this.currentIndex=e,this.offset=(e-1)*this.pageSize,this.paginationEvent.emit({offset:this.offset,limit:this.pageSize})}onPageSizeChange(e){this.pageSize=e,this.currentIndex=1,this.offset=0,this.paginationEvent.emit({offset:this.offset,limit:this.pageSize})}handleAction(e,i){this.actionEmitter.emit({action:e,value:i})}getFirstLetter(e){return e[0]}getRestockThresholdStatus(e){return e?.total_available_quantity<e?.restock_threshold}static{this.\u0275fac=function(i){return new(i||n)}}static{this.\u0275cmp=t.VBU({type:n,selectors:[["app-view-overview-list"]],inputs:{data:"data",loading:"loading",totalCount:"totalCount"},outputs:{actionEmitter:"actionEmitter",paginationEvent:"paginationEvent"},standalone:!0,features:[t.aNF],decls:2,vars:2,consts:[[3,"isVisible",4,"ngIf"],["class","p-4 border rounded-md shadow-md",4,"ngIf"],[3,"isVisible"],[1,"p-4","border","rounded-md","shadow-md"],["class","divide-y divide-gray-100",4,"ngIf"],["class","flex flex-col items-center justify-center h-full text-center bg-gray-50 p-8 rounded-md space-y-4",4,"ngIf"],[1,"bg-white","grid","grid-cols-1","h-16"],[1,"flex","items-center","justify-end","mr-6"],[3,"nzPageIndex","nzPageSize","nzShowSizeChanger","nzShowTotal","nzTotal","nzPageIndexChange","nzPageSizeChange"],["rangeTemplate",""],[1,"divide-y","divide-gray-100"],[4,"ngFor","ngForOf"],[1,"grid","md:grid-cols-3","gap-x-6","py-5"],[1,"flex","min-w-0","gap-x-4"],["class","size-12 flex-none rounded-full bg-gray-50","alt","Picture Of User",3,"src",4,"ngIf"],["class","size-12 flex-none rounded-full bg-gray-50 flex items-center justify-center",4,"ngIf"],[1,"min-w-0","flex-auto"],[1,"text-sm/6","text-[#180B26]","font-semibold"],[1,"font-normal"],[1,"mt-1","text-xs/5","text-[#180B26]","font-semibold"],[1,"font-normal",3,"ngClass"],["class","mt-1 bg-[#DF1463] inline-flex justify-center items-center h-5 px-1 rounded gap-2",4,"ngIf"],[1,"flex","md:justify-center","items-center"],[1,"mt-1","truncate","text-xs/5","text-gray-500","font-semibold"],[1,"flex","justify-end"],[1,"shrink-0","sm:flex","sm:flex-col","sm:items-center"],[1,"mt-1","text-xs/5","text-black","flex","justify-center","items-center","gap-4"],[3,"click"],["xmlns","http://www.w3.org/2000/svg","fill","none","viewBox","0 0 24 24","stroke-width","1.5","stroke","currentColor",1,"size-6"],["stroke-linecap","round","stroke-linejoin","round","d","M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"],["stroke-linecap","round","stroke-linejoin","round","d","M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"],["alt","Picture Of User",1,"size-12","flex-none","rounded-full","bg-gray-50",3,"src"],[1,"size-12","flex-none","rounded-full","bg-gray-50","flex","items-center","justify-center"],[1,"text-xl"],[1,"mt-1","bg-[#DF1463]","inline-flex","justify-center","items-center","h-5","px-1","rounded","gap-2"],["src","/assets/icons/warning.svg",1,"transition-transform","duration-150","ease-in-out"],[1,"text-xs","font-normal","text-white"],[1,"flex","flex-col","items-center","justify-center","h-full","text-center","bg-gray-50","p-8","rounded-md","space-y-4"],["src","/assets/icons/no_data.svg","alt","No Data Found"],[1,"text-lg","font-semibold","text-black"],[1,"text-black"]],template:function(i,a){1&i&&(t.DNE(0,v,1,1,"app-loader",0),t.DNE(1,F,8,7,"div",1)),2&i&&(t.Y8G("ngIf",a.loading),t.R7$(1),t.Y8G("ngIf",!a.loading))},dependencies:[c.MD,c.YU,c.Sq,c.bT,m.Z,p.ae,d.V,u.iu,u.DM]})}}return n})();var I=o(9079),P=o(4774),T=o(980),V=o(5816),k=o(6504),_=o(4710);let L=(()=>{class n{constructor(e,i,a,r,g){this._httpService=e,this._destroyRef=i,this._notificationService=a,this._router=r,this._activatedRoute=g,this.data=[],this.totalCount=0,this.loading=!1,this.payload={offset:0,limit:h.YM.PAGE_SIZE,search_text:"",status:""},this.isFilter=!1,this.searchControl=new s.MJ("")}ngOnInit(){this.loadList(),this.searchControl.valueChanges.subscribe(e=>{this.onSearchChange(e)})}onSearchChange(e){this.payload.search_text=e,this.isFilter=!0,this.loadList()}handlePaginationEvent(e){this.payload={...this.payload,offset:e.offset,limit:e.limit},this.loadList()}loadList(){this.isFilter||(this.loading=!0),this._httpService.get(P.A.GET_PRODUCT_LIST_FOR_OVERVIEW,this.payload).pipe((0,I.pQ)(this._destroyRef),(0,T.j)(()=>this.loading=!1)).subscribe({next:e=>{200===e.status&&(this.data=[],e.body?.data?.length?(this.data=e.body.data,this.totalCount=e.body.total):this.data=[])},error:e=>{console.log(e),this._notificationService.error("Error!",e?.error?.message)}})}handleListActions(e){"view"===e.action&&this.handleView(e.value.product_oid)}handleView(e){this._router.navigate([`view-product/${e}`],{relativeTo:this._activatedRoute,state:{edit:!1}})}static{this.\u0275fac=function(i){return new(i||n)(t.rXU(V.k),t.rXU(t.abz),t.rXU(k.xY),t.rXU(_.Ix),t.rXU(_.nX))}}static{this.\u0275cmp=t.VBU({type:n,selectors:[["app-inventory-overview-list"]],standalone:!0,features:[t.aNF],decls:11,vars:4,consts:[[1,"p-4","space-y-3"],[1,"text-2xl","font-medium","mb-4","animate-text"],[1,"md:flex","justify-between","items-center","mb-4"],[1,"md:w-2/3","grid","lg:grid-cols-3"],[1,"relative"],["id","searchControl","type","text","placeholder"," ",1,"peer","block","h-10","custom-input",3,"formControl"],["for","searchControl",1,"absolute","top-2","left-1","origin-[0]","-translate-y-4","scale-95","transform","bg-white","px-2","text-gray-500","duration-300","peer-placeholder-shown:top-1/2","peer-placeholder-shown:-translate-y-1/2","peer-placeholder-shown:scale-100","peer-focus:top-2","peer-focus:-translate-y-4","peer-focus:scale-95","peer-focus:px-2","peer-focus:text-primary-500","dark:bg-night-700"],[3,"loading","data","totalCount","actionEmitter","paginationEvent"]],template:function(i,a){1&i&&(t.j41(0,"div",0)(1,"h2",1),t.EFF(2,"Inventory Overview"),t.k0s(),t.j41(3,"div")(4,"div",2)(5,"div",3)(6,"div",4),t.nrm(7,"input",5),t.j41(8,"label",6),t.EFF(9," Enter Search Text Here "),t.k0s()()()(),t.j41(10,"app-view-overview-list",7),t.bIt("actionEmitter",function(g){return a.handleListActions(g)})("paginationEvent",function(g){return a.handlePaginationEvent(g)}),t.k0s()()()),2&i&&(t.R7$(7),t.Y8G("formControl",a.searchControl),t.R7$(3),t.Y8G("loading",a.loading)("data",a.data)("totalCount",a.totalCount))},dependencies:[c.MD,m.Z,s.X1,s.me,s.BC,s.l_,O]})}}return n})()},765:(x,f,o)=>{o.d(f,{V:()=>h});var c=o(177),s=o(7705);function t(d,m){1&d&&(s.j41(0,"div",1),s.nrm(1,"span")(2,"span")(3,"span")(4,"span")(5,"span"),s.k0s())}let h=(()=>{class d{constructor(){this.isVisible=!1,this.showLoader=!1}ngOnInit(){this.isVisible&&(this.showLoader=!0,setTimeout(()=>{this.showLoader=!1},500))}static{this.\u0275fac=function(p){return new(p||d)}}static{this.\u0275cmp=s.VBU({type:d,selectors:[["app-loader"]],inputs:{isVisible:"isVisible"},standalone:!0,features:[s.aNF],decls:1,vars:1,consts:[["class","loading",4,"ngIf"],[1,"loading"]],template:function(p,v){1&p&&s.DNE(0,t,6,0,"div",0),2&p&&s.Y8G("ngIf",v.isVisible)},dependencies:[c.MD,c.bT],styles:[".loading[_ngcontent-%COMP%]{--speed-of-animation: .9s;--gap: 6px;--first-color: #4c86f9;--second-color: #49a84c;--third-color: #f6bb02;--fourth-color: #f6bb02;--fifth-color: #2196f3;display:flex;justify-content:center;align-items:center;gap:6px}.loading[_ngcontent-%COMP%]   span[_ngcontent-%COMP%]{width:4px;height:50px;background:var(--first-color);animation:_ngcontent-%COMP%_scale var(--speed-of-animation) ease-in-out infinite}.loading[_ngcontent-%COMP%]   span[_ngcontent-%COMP%]:nth-child(2){background:var(--second-color);animation-delay:-.8s}.loading[_ngcontent-%COMP%]   span[_ngcontent-%COMP%]:nth-child(3){background:var(--third-color);animation-delay:-.7s}.loading[_ngcontent-%COMP%]   span[_ngcontent-%COMP%]:nth-child(4){background:var(--fourth-color);animation-delay:-.6s}.loading[_ngcontent-%COMP%]   span[_ngcontent-%COMP%]:nth-child(5){background:var(--fifth-color);animation-delay:-.5s}@keyframes _ngcontent-%COMP%_scale{0%,40%,to{transform:scaleY(.05)}20%{transform:scaleY(1)}}"]})}}return d})()}}]);