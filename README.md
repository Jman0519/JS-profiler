# JS-profiler
A profiler for Screeps

Add it, require it, call Profiler.loop() inside your main loop, and call start(int) in the command line. There is also and email(int) function that will email you the results. An additional optional argument 'function' may be provided that will profile a certin function. For instance, I would type "Profiler.start(100, 'myMoveTo')" to gather statistics on myMoveTo function (this may provide errors if you have two prototypes with a myMoveTo function, so try to avoid that). Incase you missed the display, it also stores the message in your Memory and you can retreave it in a readable way by calling "Profiler.displayMessage()"

For some more advanced customization of the code, you may wish to delete the Profiler.removeWrappers() on line 246 to allow the profiler to continue gathering data (although will will display data recored after the set number of ticks still). Now at some later time, you may call "Profiler.displayResults()" to display results that have been accumulating since the last time you called "Profiler.start()".

The code now works for getters and setters, however it cannot getters and setters themselves.

Also, any suggestions on how to change the code so the function name can resemble something like Creep.myMoveTo instead of myMoveTo in order to eliminate similarly named fucntions would be appreciated.
