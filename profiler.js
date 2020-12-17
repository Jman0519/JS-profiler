if(!global.Profiler){
  console.log('Remade Profiler')
  global.Profiler = new Profiler()//initilize a profiler instance
}

//This profiler tries to be as simple as possible to let you customize it and work with its data
//incase you want to customize it.
//All relevant data is stored under Memory.profiler for you to easily access. If you would like
//to slightly improve preformance, you may change this to store the data under itself (heap).
//This profiler can give you an overview by calling start with the amount of ticks you would like
//to sample, or with the option of a function name (such as myMoveTo) where it will profile that
//function and all functions called from it to tell you what is chuggin your code.
//IMPORTANT NOTE: The profiler is not guarenteed to work through a global code update, so
//do not push your code while you are collecting data from it.
function Profiler (){
  
  //Let the profiler know all of the things with functions that you want wrapped by default.
  //For instance, most people would want Creep and RoomPosition to see how expensive pathfinding
  //is. But very few people have anything in, or cares about anything in the Source prototype.
  //If you do not care about a certin global object, take it out. If you want data on your own
  //custom object, put it in.
  this.prototypes =
  [
    //{ name: 'Game', val: Game },
    { name: 'Room', val: Room },
    { name: 'Spawn', val: Spawn },
    { name: 'Creep', val: Creep },
    { name: 'RoomPosition', val: RoomPosition },
    //{ name: 'Source', val: Source },
    //{ name: 'Flag', val: Flag },
    //{ name: 'RoomVisual', val: RoomVisual },
    //{ name: 'Memory', val: Memory },
    //{ name: 'RoomObject', val: RoomObject },
  ]
  
  //this makes the profiler start fresh when you call it, and begin next tick
  this.start = function(ticks, functionName){
    Memory.profiler = {}
    Memory.profiler.startTick = Game.time+1
    Memory.profiler.ticks = ticks
    Memory.profiler.functionName = functionName || null
    return 'Profiler is set up and will begin next tick'
  }
  
  //removeWrappers is called before adding wrappers every time so nothing gets wrapped twice (that would be bad for data)
  this.removeWrappers = function() {
    let startWrap = Game.cpu.getUsed()
    console.log('Removing Old Wrappers')
    var functionName = Memory.profiler.functionName
    if(!functionName){//if there is no function name, profile all prototype functions
      this.prototypes.forEach((proto) => {
        let objectToWrap = proto.val.prototype || proto.val
        if(!objectToWrap.profiler){
          return
        }
        Object.getOwnPropertyNames(objectToWrap).forEach(property => {
          const descriptor = Object.getOwnPropertyDescriptor(objectToWrap, property)
          if(!descriptor){
            return
          }
          
          const hasAccessor = descriptor.get || descriptor.set//if it has custom accessors or mutators
          if(hasAccessor){
            //bootstrap the getters and setters?
            if(!descriptor.configurable){
              return
            }
            
            else{
              return//profile the accessors and mutators
            }
          }
          
          else if(typeof descriptor.value == "function"){
            if(objectToWrap.profiler && objectToWrap.profiler.original != objectToWrap[property]){
              objectToWrap[property] = objectToWrap.profiler.original
              console.log(objectToWrap[property])
            }
          }
        })
      })
    }
    else{//else profile everything this functionName uses
      if(console.log(arguments.callee.caller ? arguments.callee.caller.name : "global") == functionName){}//if the function was called from here
      
    }
    console.log((Game.cpu.getUsed() - startWrap) + " CPU to remove wrappers.")
  }
  
  //wrapFunctions makes every function store itself under this.prototype.oldFunc, replaces it, records data, and calls oldFunc
  this.wrapFunctions = function() {
    let startWrap = Game.cpu.getUsed()
    console.log('Adding New Wrappers')
    var functionName = Memory.profiler.functionName
    if(!functionName){//if there is no function name, profile all prototype functions
      this.prototypes.forEach((proto) => {
        let objectToWrap = proto.val.prototype || proto.val
        if(!objectToWrap.profiler){
          objectToWrap.profiler = {}
        }
        else{
          return
        }
        Object.getOwnPropertyNames(objectToWrap).forEach(property => {
          
          const descriptor = Object.getOwnPropertyDescriptor(objectToWrap, property)
          if(!descriptor){
            return
          }
          
          const hasAccessor = descriptor.get || descriptor.set//if it has custom accessors or mutators
          if(hasAccessor){
            if(!descriptor.configurable){
              return
            }
            
            else{
              return//profile the accessors and mutators
            }
          }
          
          else if(typeof descriptor.value == "function"){
            let oldFunc = objectToWrap[property]
            var newFunc = function(){//make newFunc wrap oldFunc
              
              const start = Game.cpu.getUsed()
              const result = oldFunc.apply(this, arguments)
              const end = Game.cpu.getUsed()
              
              if(!Memory.profiler[proto.name]){//record the data
                Memory.profiler[proto.name] = {}
                Memory.profiler[proto.name][property] = {}
              }
              else if(!Memory.profiler[proto.name][property]){
                Memory.profiler[proto.name][property] = {}
              }
              
              Memory.profiler[proto.name][property].cpu += end-start
              Memory.profiler[proto.name][property].calls++
              return result//return the result of oldFunc
            }
            
            for(let prop in oldFunc){//incase a function has a property that needs copied
              if(oldFunc.hasOwnProperty(prop)){
                newFunc[prop] = oldFunc[prop]
              }
            }
            objectToWrap.profiler.original = oldFunc
            objectToWrap[property] = newFunc
          }
        })
      })
    }
    
    else{//else profile everything this functionName uses
      if(console.log(arguments.callee.caller ? arguments.callee.caller.name : "global") == functionName){}//if the function was called from here
      
    }
    console.log((Game.cpu.getUsed() - startWrap) + " CPU to wrap functions.")
  }
  
  //do some basic calculations on the stored results
  this.displayResults = function(){
    let HOW_MANY = 10//how many of the top consuming functions do you want to display
    this.results = {}
    for(let objName in Memory.profiler){
      let object = Memory.profiler[objName]
      for(let funcName in object){
        let funcResults = object[funcName]
        this.results[`${objName}${funcName}`] = funcResults
        this.results[`${objName}${funcName}`].name = `${objName}.${funcName}`
      }
    }
    let sortedList = _.sortBy(this.results, (funcResults) => {
      if(funcResults && funcResults.cpu){
        return -1*funcResults.cpu
      }
      else{
        return 0
      }
    })
    let lines = [];
    lines[0] = ["Function Name", "Total CPU", "Number of Calls"]
    let vLines = [];
    let firstLen = 0;
    for(let i = 0; i < HOW_MANY; i++){
      if(sortedList[i] && sortedList[i].cpu && sortedList[i].calls && sortedList[i].name){
        lines[i+1] = []
        lines[i+1][0] = sortedList[i].name;
        lines[i+1][1] = sortedList[i].cpu.toFixed(7);
        lines[i+1][2] = sortedList[i].calls;
        
        firstLen = firstLen < sortedList[i].name.length ? sortedList[i].name.length : firstLen
      }
    }
    for(const lineIndex in lines){
      let line = lines[lineIndex]
      while(line[0].length < firstLen+2){
        line[0] = line[0] + ` `
      }
    }
    for(let i = 0; i < HOW_MANY && i < lines.length; i++){
      console.log(lines[i].join('\t'))
    }
  }
}

//Everything below here happens every tick and tells the profiler what to do (mostly based on Game.time and startTick)
if(Memory.profiler && Memory.profiler.startTick && Memory.profiler.ticks){
  if(Memory.profiler.startTick == Game.time){
    //global.Profiler.removeWrappers()
    global.Profiler.wrapFunctions()
  }
  else if(Memory.profiler.startTick + Memory.profiler.ticks == Game.time){
    global.Profiler.displayResults()
    //global.Profiler.removeWrappers()//optional this should slightly improve code speed and force the profiler to stop recording
    //Memory.profiler = null//should be fine, but errors do happen
  }
}
