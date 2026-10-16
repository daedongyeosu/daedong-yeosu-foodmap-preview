export class StudioTestBucket{
  objects=new Map();sequence=0;
  async get(key){const value=this.objects.get(key);return value?{etag:value.etag,json:async()=>JSON.parse(value.body)}:null;}
  async put(key,body,options){const previous=this.objects.get(key),condition=options.onlyIf;if(condition.etagMatches&&condition.etagMatches!==previous?.etag||condition.etagDoesNotMatch==='*'&&previous)return null;const value={etag:String(++this.sequence),body};this.objects.set(key,value);return{etag:value.etag};}
}
