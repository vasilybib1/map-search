# map search demo

a interactive website which displays a map on which you can see streets and roads. it will have a sleak modern minimal design ideally dark colorway. on the website the user could select a city that they want to use as the example for the map (new york, vancouver, toronto) after which they can select their search algorithm (a-star, depth first search, breadth first search). lastly they can select two points (source and goal) after which they can run the algorithm and it will visually display the path being searched and traced (a highlight on the map showing which roads have been taken)

# goals 
- google map esque view but only showing the map 
- shows the roads and building names when zoomed in enough
- only shows the map selected (new york, vancouver, toronto)
- has a minimal selector of the algorithm to choose (a-star, bfs, dfs)
- has a minimal selector of the map to use  
- the map doesn't need to have any interactvity other than selection point a and b (this means not showing store description or review or anything else that google maps has)
- the user can put a point A but only one (origin)
- the user can put a point B but only one (source)

# user & flow
- the user will select a map they like 
- then they will select an algorithm to use 
- select a point a and point b 
- could press start simulating and it will show the paths that the algorithm is currently exploring on the map 
- algorithm can't run if theres either point a or b not selected
- algorithm can't run if points are not on the map

# tech constraints 
- this is a web app ideally all frontend where the algorithm is ran on their device in the browser
- the map will be loaded from the backend
- the backend will only store maps that are available to be loaded 
- stylistically this will be almost exactly the same as https://www.mapbox.com/maps/dark
- dark map with clean ui elements but the entire web application should just be the app with a small hovering ui element that allows you to select map and algorithm and a button to start tracing 
- stylistically the entire map is muted grey/black colorscheme like mapbox dark mode
- the tracing lines will be vibrant colors like blue showing which roads the algorithm explored 
- use typescript with strict typechecking 

# non goals
- auth
- mobile support 
