if(!global.Profiler){
  console.log('remade profiler')
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
    { name: 'Game', val: Game },
    { name: 'Room', val: Room },
    { name: 'Spawn', val: Spawn },
    { name: 'Creep', val: Creep },
    { name: 'RoomPosition', val: RoomPosition },
    { name: 'Source', val: Source },
    { name: 'Flag', val: Flag },
    { name: 'RoomVisual', val: RoomVisual },
    { name: 'Memory', val: Memory },
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
    let removeStart = Game.cpu.getUsed()
    console.log('Removing Old Wrappers')
    var functionName = Memory.profiler.functionName
    if(!functionName){//if there is no function name, profile all prototype functions
      this.prototypes.forEach((proto) => {
        //wrapFunction(proto)
        var objectToWrap = proto.val.prototype || proto.val

        if(!objectToWrap.profiler){
          objectToWrap.profiler = {}
        }
        //console.log(Object.getOwnPropertyNames(objectToWrap))
        for(let property in objectToWrap){
          //console.log(proto.name, property)

          const descriptor = Object.getOwnPropertyDescriptor(objectToWrap, property)
          if(!descriptor){
            return
          }

          const hasAccessor = descriptor.get || descriptor.set
          if(hasAccessor){
            //bootstrap the getters and setters?
            if(!descriptor.configurable){
              return
            }
            else{
              return
            }
          }
          else if(descriptor.value === "function"){
            objectToWrap[property] = objectToWrap.profiler.originnal
          }
        }
      })
    }
    else{//else profile everything this functionName uses
      if(console.log(arguments.callee.caller ? arguments.callee.caller.name : "global") == functionName){}//if the function was called from here

    }
    console.log((Game.cpu.getUsed() - removeStart) + " to remove wrappers.")
  }







//wrapFunctions makes every function store itself under this.prototype.oldFunc, replaces it, records data, and calls oldFunc
  this.wrapFunctions = function() {
    let startWrap = Game.cpu.getUsed()
    console.log('Adding New Wrappers')
    var functionName = Memory.profiler.functionName
    if(!functionName){//if there is no function name, profile all prototype functions
      this.prototypes.forEach((proto) => {
        //wrapFunction(proto)
        let objectToWrap = proto.val.prototype || proto.val
        objectToWrap.profiler = {}
        //console.log(Object.getOwnPropertyNames(objectToWrap))
        Object.getOwnPropertyNames(objectToWrap).forEach(property => {
          //console.log(proto.name, property)
          //console.log(objectToWrap === proto.val.prototype)

          const descriptor = Object.getOwnPropertyDescriptor(objectToWrap, property)
          if(!descriptor){
            return
          }

          const hasAccessor = descriptor.get || descriptor.set//if it has custom accessors or mutators
          //console.log(typeof descriptor.value)
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
            let oldFunc = objectToWrap[property]
            //console.log(property)
            var newFunc = function(){//make b wrap a
              const start = Game.cpu.getUsed()
              //console.log(Object.getOwnPropertyNames(this))
              const result = oldFunc.apply(this, arguments)
              const end = Game.cpu.getUsed()
              if(!Memory.profiler[proto.name]){Memory.profiler[proto.name] = {}}
              if(!Memory.profiler[proto.name][property]){Memory.profiler[proto.name][property] = {}}
              Memory.profiler[proto.name][property].cpu += end-start
              Memory.profiler[proto.name][property].calls++
              Memory.profiler[proto.name][property].avg = (end-start)/Memory.profiler[proto.name][property].calls
              return result
            }

            for(let prop in oldFunc){//incase a function has a property that needs copied
              if(oldFunc.hasOwnProperty(prop)){
                newFunc[prop] = oldFunc[prop]
                //console.log(prop)
              }
            }

            objectToWrap.profiler.original = oldFunc
            objectToWrap[property] = newFunc
            
            //console.log('replaced ' + proto.name + '.' + property)
          }
        })
      })
    }
    else{//else profile everything this functionName uses
      if(console.log(arguments.callee.caller ? arguments.callee.caller.name : "global") == functionName){}//if the function was called from here

    }
    console.log((Game.cpu.getUsed() - startWrap) + " to wrap functions.")
  }
}

//Everything below here happens every tick and tells the profiler what to do (mostly based on Game.time and startTick)
if(Memory.profiler && Memory.profiler.startTick && Memory.profiler.ticks){
  if(Memory.profiler.startTick == Game.time){
    //console.log(typeof Profiler.removeWrappers())
    //global.Profiler.removeWrappers()
    global.Profiler.wrapFunctions()
  }
}

//make a recursive loop that chekcs every property of an object. if the object has a function, it wraps it, if it has a property, it recursions
//here is a function
//a = function{
//start cpu
//function.apply
//end cpu
//store
//}
//return a

//old function = a
