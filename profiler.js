global.Profiler = new Profiler()//initilize a profiler instance

//This profiler tries to be as simple as possible to let you customize it and work with its data
//incase you want to customize it.
//All relevant data is stored under Memory.profiler for you to easily access. If you would like
//to slightly improve preformance, you may change this to store the data under itself (heap).
//This profiler can give you an overview by calling start with the amount of ticks you would like
//to sample, or with the option of a function name (such as myMoveTo) where it will profile that
//function and all functions called from it to tell you what is chuggin your code.
//If looking at specific functions, make sure to name the functions. It will not pick up
//on the property name of the function, only the function declaired name (no anonymous functions).
function Profiler (){
  
  //If a global reset happens, I can compair this to memory to start/re-wrap so a global reset
  //does not ruin a test.
  this.running = false;
  //Let the profiler know all of the things with functions that you want wrapped by default.
  //For instance, most people would want Creep and RoomPosition to see how expensive pathfinding
  //is. But very few people have anything in, or cares about anything in the Source prototype.
  //If you do not care about a certin global object, take it out. If you want data on your own
  //custom object, put it in.
  this.prototypes =
  [
    { name: 'Game', val: Game },
    { name: 'Room', val: Room },
    { name: 'Spawn', val: Spawn },
    { name: 'Creep', val: Creep },
    { name: 'RoomPosition', val: RoomPosition },
    { name: '_', val: _, noProto: true },//put in a noProto: true if this is a persistant object such as lodash (or this profiler). One that gets made at the start of a global reset and no longer depends on its prototype.
    { name: 'Source', val: Source },
    { name: 'Flag', val: Flag },
    { name: 'RoomVisual', val: RoomVisual },
    { name: 'Memory', val: Memory },
    { name: 'RoomObject', val: RoomObject },
    { name: 'StructureController', val: StructureController },
  ]
  
  //this makes the profiler start fresh when you call it, and begin next tick
  this.start = function start(ticks, functionName){
    Memory.profiler = {};
    Memory.profiler.startTick = Game.time+1;
    Memory.profiler.ticks = ticks+1;
    Memory.profiler.functionName = functionName || null;
    Memory.profiler.running = true;
    Memory.profiler.shouldEmail = false;
    return 'Profiler is set up and will begin next tick';
  };
  
  this.email = function email(ticks, functionName){
    Memory.profiler = {};
    Memory.profiler.startTick = Game.time+1;
    Memory.profiler.ticks = ticks+1;
    Memory.profiler.functionName = functionName || null;
    Memory.profiler.running = true;
    Memory.profiler.shouldEmail = true;
    return 'Profiler is set up and will begin next tick';
  };
  //removeWrappers is called before adding wrappers every time so nothing gets wrapped twice (that would be bad for data)
  this.removeWrappers = function() {
    let startWrap = Game.cpu.getUsed();
    console.log('Removing Old Wrappers');
    var functionName = Memory.profiler.functionName;
    this.prototypes.forEach((proto) => {
      let objectToWrap = proto.val.prototype || proto.val;
      if(proto.noProto){
          objectToWrap = proto.val;
      }
      if(!objectToWrap.profiler){
        return;
      }
      Object.getOwnPropertyNames(objectToWrap).forEach(property => {
        const descriptor = Object.getOwnPropertyDescriptor(objectToWrap, property);
        if(!descriptor){
          return;
        }
        
        const hasAccessor = descriptor.get || descriptor.set;//if it has custom accessors or mutators
        if(hasAccessor){
          if(!descriptor.configurable){
            return;
          }
          
          else{
            let profilerDescriptor = {};
            profilerDescriptor.configurable = true;
            if(descriptor.get){
                profilerDescriptor.get = objectToWrap.profiler[property].get;
            }
            
            if(descriptor.set){
                profilerDescriptor.set = objectToWrap.profiler[property].set;
            }
            Object.defineProperty(objectToWrap, property, profilerDescriptor);
          }
        }
        
        else if(typeof descriptor.value == "function"){
          if(objectToWrap.profiler && objectToWrap.profiler[property] != objectToWrap[property]){
            objectToWrap[property] = objectToWrap.profiler[property];
          }
        }
      })
      objectToWrap.profiler = null;
    })
    console.log((Game.cpu.getUsed() - startWrap) + " CPU to remove wrappers.");
  }
  
  //wrapFunctions makes every function store itself under this.prototype.oldFunc, replaces it, records data, and calls oldFunc
  this.wrapFunctions = function() {
    let startWrap = Game.cpu.getUsed();
    console.log('Adding New Wrappers');
    var functionName = Memory.profiler.functionName;
    this.prototypes.forEach((proto) => {
      let objectToWrap = proto.val.prototype || proto.val;
        if(proto.noProto){
          objectToWrap = proto.val;
      }
      objectToWrap.profiler = {};
      Object.getOwnPropertyNames(objectToWrap).forEach(property => {
        const descriptor = Object.getOwnPropertyDescriptor(objectToWrap, property);
        if(!descriptor){
          return;
        }
        objectToWrap.profiler[property] = {};
        const hasAccessor = descriptor.get || descriptor.set;//if it has custom accessors or mutators
        if(hasAccessor){
          if(!descriptor.configurable){
            return;
          }
          
          else{
            let profilerDescriptor = {};
            profilerDescriptor.configurable = true;
            if(descriptor.get){
                objectToWrap.profiler[property].get = descriptor.get;
                profilerDescriptor.get = function(){
                    const start = Game.cpu.getUsed();
                    let result = descriptor.get.apply(this, arguments);
                    const end = Game.cpu.getUsed();
                    if(!Memory.profiler[proto.name]){
                        Memory.profiler[proto.name] = {};
                        Memory.profiler[proto.name][property+' get'] = {};
                    }
                    else if(!Memory.profiler[proto.name][property+' get']){
                        Memory.profiler[proto.name][property+' get'] = {};
                    }
                    
                    Memory.profiler[proto.name][property+' get'].cpu += end-start;
                    Memory.profiler[proto.name][property+' get'].calls++;
                    return result;
                }
            }
            
            if(descriptor.set){
                objectToWrap.profiler[property].set = descriptor.set;
                    profilerDescriptor.set = function(){
                    const start = Game.cpu.getUsed();
                    let result = descriptor.get.apply(this, arguments);
                    const end = Game.cpu.getUsed();
                    if(!Memory.profiler[proto.name]){
                        Memory.profiler[proto.name] = {};
                        Memory.profiler[proto.name][property+' set'] = {};
                    }
                    else if(!Memory.profiler[proto.name][property+' set']){
                        Memory.profiler[proto.name][property+' set'] = {};
                    }
                    
                    Memory.profiler[proto.name][property+' set'].cpu += end-start;
                    Memory.profiler[proto.name][property+' set'].calls++;
                    return result;
                }
            }
            profilerDescriptor.configurable 
            Object.defineProperty(objectToWrap, property, profilerDescriptor);
          }
        }
        
        else if(typeof descriptor.value == "function"){
          let oldFunc = objectToWrap[property];
          objectToWrap[property] = function(){//make newFunc wrap oldFunc
            let caller = "";
            if(arguments.callee.caller){
              caller = arguments.callee.caller.name
            }
            if(!functionName || functionName == caller || functionName == property){
              const start = Game.cpu.getUsed();
              const result = oldFunc.apply(this, arguments);
              const end = Game.cpu.getUsed();
              
              if(!Memory.profiler[proto.name]){//record the data
                Memory.profiler[proto.name] = {};
                Memory.profiler[proto.name][property] = {};
              }
              else if(!Memory.profiler[proto.name][property]){
                Memory.profiler[proto.name][property] = {};
              }
              
              Memory.profiler[proto.name][property].cpu += end-start;
              Memory.profiler[proto.name][property].calls++;
              return result;//return the result of oldFunc
            }
            else{
              return oldFunc.apply(this, arguments);
            }
          }
          
          //for(let prop in oldFunc){//incase a function has a property that needs copied
            //if(oldFunc.hasOwnProperty(prop)){
              //objectToWrap[property][prop] = oldFunc[prop];
            //}
          //}
          objectToWrap.profiler[property] = oldFunc;
        }
      })
    })
    //}
    
    //else{//else profile everything this functionName uses
    //  if(console.log(arguments.callee.caller ? arguments.callee.caller.name : "global") == functionName){}//if the function was called from here
    //
    //}
    console.log((Game.cpu.getUsed() - startWrap) + " CPU to wrap functions.");
  }
  
  this.displayMessage = function displayMessage(){
    if(Memory.profiler.message){
      return Memory.profiler.message;
    }
    else{
      return 'no message';
    }
  }
  
  //do some basic calculations on the stored results
  this.displayResults = function(){
    let HOW_MANY = 10;//how many of the top consuming functions do you want to display
    this.results = {};
    for(let objName in Memory.profiler){
      let object = Memory.profiler[objName];
      for(let funcName in object){
        let funcResults = object[funcName];
        this.results[`${objName}${funcName}`] = funcResults;
        this.results[`${objName}${funcName}`].name = `${objName}.${funcName}`;
      }
    }
    let sortedList = _.sortBy(this.results, (funcResults) => {
      if(funcResults && funcResults.cpu){
        return -1*funcResults.cpu;
      }
      else{
        return 0;
      }
    })
    let lines = [];
    lines[0] = ["Function Name", "Total CPU", "Number of Calls"];
    let vLines = [];
    let firstLen = 0;
    for(let i = 0; i < HOW_MANY; i++){
      if(sortedList[i] && sortedList[i].cpu && sortedList[i].calls && sortedList[i].name){
        lines[i+1] = [];
        lines[i+1][0] = sortedList[i].name;
        lines[i+1][1] = sortedList[i].cpu.toPrecision(7);
        lines[i+1][2] = sortedList[i].calls;
        
        firstLen = firstLen < sortedList[i].name.length ? sortedList[i].name.length : firstLen;
      }
    }
    for(const lineIndex in lines){
      let line = lines[lineIndex];
      while(line[0].length < firstLen){
        line[0] = line[0] + ` `;
      }
    }
    Memory.profiler.proMessage = [];
    for(let i = 0; i < HOW_MANY+1 && i < lines.length; i++){
      lines[i] = lines[i].join('\t');
    }
    let message = lines.join('\n');
    Memory.profiler.proMessage = message;
    console.log(message);
    if(Memory.profiler.shouldEmail == true){
      Game.notify(message);
    }
  }

this.loop = function loop(){
  //Everything below here happens every tick and tells the profiler what to do (mostly based on Game.time and startTick)
  if(Memory.profiler && !Memory.profiler.running){
    Memory.profiler.running = false;
  }
  if(Memory.profiler && Memory.profiler.startTick && Memory.profiler.ticks){
    if(Memory.profiler.startTick == Game.time || global.Profiler.running != Memory.profiler.running){
      global.Profiler.removeWrappers();//remove any wrappers that might be stale (looking for the wrong caller)
      global.Profiler.wrapFunctions();//wrap functions
      global.Profiler.running = true;
    }
    else if(Memory.profiler.startTick + Memory.profiler.ticks == Game.time){
      global.Profiler.displayResults();//show the results, should be easy to strap to memory or an email
      global.Profiler.removeWrappers();//optional this should slightly improve code speed and force the profiler to stop recording
      let message = Memory.profiler.proMessage;
      Memory.profiler = {};//free up your memory
      Memory.profiler.proMessgae = message;//copys the results
    }
  }
}
}
