# How To Make A Zelda-Like Game With Phaser 3 - Full Course

---

Welcome to the series where you'll learn how to create your very own Legend of Zelda style game using TypeScript and Phaser 3. Throughout this journey, we'll break down the process of building a rich, interactive, and fully playable top-down adventure game. We'll start with the fundamentals, creating your player character, handling movement and input, and setting up a state machine to control the player's behavior seamlessly. seamlessly. Next, we'll dive into enemy design, teaching you how to create multiple enemies, each with unique behaviors like a simple spider, an invulnerable wisp, and even a challenging boss.

You'll also learn how to implement combat, collisions, and health systems for both the players and enemies. From there, we'll explore interactable objects like pots and chest, how to pick them up, throw them, and reward the player with useful items. When it comes to level design, we'll use Tiled, a powerful level editor to create dynamic overworld and dungeon maps. You'll learn how to connect levels, manage transitions, and implement puzzles like locked doors and traps. Finally, we'll bring everything together by adding essential UI components such as a HUD to display health, a dialogue system, and a menu, and a simple menu.

We'll cap it off with a fully designed dungeon featuring challenging mechanics, traps, and a boss fight. This series is designed to be as beginner friendly as possible, but there are a few things you should know. Some familiarity with Typescript is helpful, but not required. We won't be covering the basics of TypeScript, but you should be able to follow along if you're new to it. For this series, we'll be using Phaser 3.

We also won't be going over the basics of the framework, but we'll cover concepts as we get to them in the series. For our series, we'll be using Tiled, a free level editor to create our dungeon and our overworld maps. Finally, we'll provide starter assets and utility scripts to help you focus on game development rather than asset creation. This free series covers everything you need to build a base Legend of Zelda style game. Whether you're a beginner or an experienced developer, this course will give you the tools and knowledge to create your own exciting top- down adventure game.

So, let's get started and build something amazing together. In this part, we'll make sure you have everything you need to build an amazing game using Phaser 3 and TypeScript. We'll walk through setting up your development environment, downloading your essential assets, and ensuring your project is ready to run smoothly. Let's get started. Step one, downloading a project files and assets.

We've prepared a basic project structure to kickstart your development journey. This includes some initial files to help set up Phaser and manage your game logic. You'll also need to download the game assets, which includes our sprite sheets, our maps, and all the assets we'll be using in our game. These will all be included in the assets folder as part of the basic project. So, the basic project template can be found over on GitHub on the official repository for this course.

In the description of this video, there's going to be two links. One will be to this page here, and the second one will be to a direct download to the source folder. If you go ahead and download that source folder now and extract it, you should see the following file contents. So, inside of the basic project structure, we should have everything we need to set up and run our game locally. In the public folder, this is going to have all of our assets for our game.

And so, this will be our JSON files, our custom fonts, our images, our spreadsheets, and everything else. Besides that, the rest of this is the boiler plate for our Phaser 3 uh project template. If you can go ahead and open up this project in your ID of choice for this course, I'll be using VS Code. So before we set up and run our project locally, I'm going to quickly go over the project structure. Inside the basic project template, there's going to be this VS Code folder here.

This just has some settings for VS Code. So if you're using a different IDE, you can remove that folder. Our config folder has some settings for ESLint and for VIT, which is will be our dev server, we'll be running locally uh for our project. The no modules folder will be generated after we install our project dependencies. And our public folder is going to have all of our public facing assets that we'll be using in our game.

Our source folder is going to have all of our TypeScript code that'll be used for our Phaser game. Then we have our index. html. This will be our entry point for our web application. This will point to our main.

Ts file, which will be the entry point for our game. Then we have our package JSON file. This has all of our project dependencies that we need as well as some useful scripts for starting our project locally. The tsconfig JSON and our Vconig. js file are configuration files uh for TypeScript and Vit.

Finally, we have our project task to-do list, which will list out all the steps we need to create our game. Then, in our source folder, if we open up main. ts, this is where we create our Phaser 3 game instance. First, we create our Phaser 3 game configuration. We're targeting WebGL, and we have our arcade physics enabled.

We then create our Phaser 3 game instance, and we add in our scenes that we're using for our game. In our scenes folder, our scenes keys just has the scene keys we'll be using in our project. And these are just the keys that we provide when we create our scene instance. in our preload scene file. This is where we create our preload scene.

And this will be used for loading in all the assets that we need for our game, which transitions to our game scene. And then inside our game scene, we're just creating a basic text game object and adding that to our scene. Finally, under our common folder, this will just have some common code that'll be using throughout our project. Our assets. ts file.

This will have our asset keys and our animation keys. That way, we can reference these from the same location throughout our code base. Our types. ts file will have our common types that we'll be using for our game. And then finally under utils, this will have some common utility functions uh that we'll be using in our project.

And we'll cover these once we add them in our code. Step two, setting up the development environment. To set up and run our game locally, we need to install our project dependencies. To do this, we'll navigate to our terminal. And now we need to run our command for installing our dependencies.

And so I'm going to do pnpm install. So I'll be using the pnpm uh package manager for installing my dependencies. But you can also run the same command using npm. To do that, you just want to do npm install. and that's going to go into our package.

JSON file and install our dependencies. Step three, running the project locally. Now that we've installed our dependencies, we should be able to start our local web server and verify our game's working properly. To do this, I'm going to do pmppm and I'm going to use the start script from our package. JSON.

You can also start this with npm and you can do npm run start. And that should start your local dev server. If we open up our browser and go to localhost 3000, we should see our game running in the browser. So, in your browser, you should see a black screen with the text game scene. And if we open up our developer tools and go into our console, we should see that our phaser banner is running.

And currently, we're using phaser using phaser 3. 87. And to make sure our local dev server is working properly, let's come over to our code. If we go into our source folder, let's go under scenes. Let's go into our game scene.

I'm just going to change our text to say game scene 2. And this should verify that our hot reload's working. And we should see that our scene is now updated. Next on our task list, we need to add our assets to our project. Currently, our project template has this all handled for us.

But how this works is in our preload scene, we're loading in a pack file. This pack file is a JSON file that points to all the other assets we'll be using in our game. So, if we go to our assets and we go into our data folder, we'll see we have this assets. json. Inside here, we have paths to our other folders where other assets are located.

And then under files, this will be an array of objects of our different file types will be loading in Phaser. So this object has information of what type of file it is as well as the key we'll be using to reference that asset from our cache. Then we have our URL of where the asset is located and then any other configuration that's needed to load that file type. So we'll see for our fonts we provide things like the format of our font we want to load versus if we load in a file like our image we just need to provide our key and our URL. And if we load in things a sprite sheet then we provide our frame configuration for that sprite sheet.

So, if we want to add new assets to our game, we need to add those to this assets. json file here and point it to the relevant asset under our public assets folder. As long as we do that, they'll be dynamically loaded inside our preload scene. Step four, installing Tiled. For level design, we'll be using Tiled, a flexible level editor that integrates seamlessly with Phaser.

To follow along, download and install Tiled from their official website. I've included a link in the video description to make it easy. Once you've installed Tiled, you'll be ready to create and edit game levels like a pro. For the time being, we won't be doing anything else with Tiled, and we'll get to this later in our course. Now that we finished setting up our project, it's time for us to move on to our player.

For our player game object, we will need the ability to have our player uh collide with other game objects in our scene. And we want to be able to play different animations, such as when our player's idle or it's moving around our scene, we'd have a different animation. To support this for our player game object, we'll use a phaser physics arcade sprite. This will allow us to have a physics body and allow us to play different animations. Create our player game object.

Let's go into our code. Under our source folder, let's add a new subfolder. We'll call this game objects. Then under this new folder, let's make another folder and we'll call this player. Now, we'll make a new file under player.

We'll call this player. ts. ts. Let's start off by exporting our class. We'll do export class.

We'll call this player. We're going to extend the phaser physics arcade sprite. Let's add in our constructor and then let's call super. So, in order to extend our phaser physics arcade sprite, we'll need to provide the position for our game object, our texture, and optional frame. To pass these arguments in, we'll add a new object to our constructor.

We're going to call this config. And for our type, let's just call this player config. And in this object, this is where we'll pass in all those properties. Let's come to the top of our file. Let's do export type.

We'll do our player config. First, we'll have our phaser scene. Uh, so we'll add in scene. Next, we'll need to have our X and Y position. Uh, so we'll make a new type for this.

We're just going to call this position, and we'll do position. Let's add an asset key. This will be our string. And then, we'll add an optional frame. So, for our player, we'll be using a sprite sheet.

And so, this will be made up of multiple images. And by providing our frame here, we can choose our uh starting frame for our player. Real quick, let's define our position type. Let's go into our code. We go into common.

Let's go into our types file. Let's add a new type. We'll do export type. We'll call this position. We're going to set that equal to an object.

And we'll just have two properties. We'll have x and y. So both these will be our be our numbers. We'll come back here. Let's import that in.

Let's come back down to our player class. And now we need to pass in our configuration object properties uh to this method. So instead of doing config. cene, scene config. position.

We're going to pull these properties and dstructure them from our config object here. So let's do const. We'll have our bracket and so let's do scene. We'll do position. Let's do our asset key.

And we'll do our frame. We'll set that equal to config. And now we'll do the same thing for x and y. And so we'll do x y from our position. So now down our super method, let's pass in our scene, our x or y.

We'll do our asset key. And now we'll do our frame. And then we'll do a fallback of zero if a frame is not provided. Now that we've created our game object, because we're extending our phaser class here, we need to add it to our scene since it's an existing game object. To do that, we'll do scene, we'll do add, we'll do existing, and we want to reference this instance of our player.

We'll also want to enable physics for this. Uh so we need to do a similar thing for our physics system. So we'll do scene physics. Let's do add, we'll do existing, and we'll do this. Now that we have our player, let's create an instance in our scene.

Uh so in our code let's go into our scenes. Let's go into our game scene. It's not our game scene class. Let's add in a property to keep track of our player. And so we'll have player.

We'll type this to our player class. Now come down to our create method after we create our text. We'll do this. We'll reference our player. We're set equal to new player.

Now we need to provide our Now we need to provide our configuration. So we'll have our scene. Now for our X and Y. Uh so let's do our position. And we're just going to do it in the middle of our screen.

And so we're just going to reference this code here. We're just going to copy this and we'll update this to have Y. So now we need our asset key. And now for our asset key, we're going to reference our asset keys object and then we'll reference our player. And so our assets key object here, this just has all of our keys that we'll be using for the assets that we load uh from our preload scene.

And so our asset keys is just an object with all the keys that are used when we load in our assets. So now if we jump back to our game scene, let's go ahead and add in our frame. It is optional. Let's go ahead and add in zero here. Let's go back to our player class.

We'll need to fix our import. Uh since we're extending phaser here, we need to make sure we import that into our file. And now when we save our browser should refresh and we should see our player game object appear in our scene. Next, for our player, let's add in our idle animation. To do this, we need to tell Phaser about our assets.

And we need to tell Phaser which frames of our sprite sheet we want to use for animation. How our assets are currently set up. Under our assets folder, under images, under player, we have this main green JSON and this main green PNG file. The assets for our player we're using were created in a sprite. And one of the things we can do is we can export out our player assets into a special format and we can use our tags from our frames inside that file to create our animations.

What that looks is in our main_green JSON file, this file has a reference to each of our individual frames from our player file. And then at the very bottom, we have all of these tags that are a reference to our frames that make up a specific animation. As an example for our player idle animation here, it's going to use our frames one through four from that file. And by exporting out this file into this format, we can easily tell Phaser to create our animations from this. And so that'll be the approach we'll do here instead of manually doing this through our code.

So we come over to our preload scene. Once we've loaded in our assets, this would be the time we can now create our animations. So, we want to make sure our assets are first loaded before we attempt to do this. So, in our create method, this is where we'll do that. Uh, let's add a new method to our class.

And so, we're going to call this create to call this create animations. We won't return anything from this method. And to create our animations, we can do this to reference our scene. We'll do anoms to reference our animation manager. And now, we're going to do create from a sprite.

So from this method, we can just provide our asset that we want to use and then the optional tags for the animations we want to create. If we omit our tags, Phaser will create all of the animations for the tags that are in that file. So let's reference our asset keys. And now we want to reference our player real quick. If we go into our data folder under our assets and we go to our assets JSON, if we look for our player, we're going to see that references our images folder and it's going to reference our texture URL here for our main green.

So the two files we just looked at and we'll see our type is a sprite. So as long as we load in our file type this way, we can then call our create animation like we did here and it'll create our animations. Now we just need to call our method. So we'll call that from our create method before we transition to our game scene. Now under the hood, Phaser is going to create all these animations and add them to our animation manager.

So now back in our player class, we should be able to call this play to play out our animation. So let's do this. Let's do play. Now we can provide our configuration. Now we want to provide our animation name that we want to play.

And so we're going to do player animation keys and we're going to do idle do idle down. And now we can do any other settings. Uh for animation uh for our idle, we want this just to repeat. So we'll do negative one so it repeats indefinitely. Now our player animation keys here, these are going to reference all of our various animations from that JSON file.

So instead of having to manually type these out, we can use this object here uh to reference those. So, we'll see our player idle down should match what is in our JSON file here. So, now back over in our scene when a browser refreshes, we'll see our player is now animated uh with our idle animation. Next, for our player, we're going to focus on our player input. For our player input, we're going to rely on our keyboard plugin from Phaser.

Our keyboard plugin uh is a wrapper around the native DOM keyboard events. And by relying on this plugin, we can easily do things like add event listeners for when a key is being pressed, when it's being lifted up, or when a key is being pressed down, we can check the state of it. By relying on this built-in plugin, we can easily bootstrap our player input controller and have our player moving around our scene. But before we get into our code, we want to make sure we set up our input controller in a way where it's going to reusable across our project. for our game, not only do we want to move our player around our scene, we'll want to be able to do things like support input when we have a menu uh visible to the player.

If the player's in their inventory, we'll need to listen for our keyboard input and move our cursor around our game. But we'll also want to do this in a way where our input is generic enough we can use it for other game objects. As an example, for our player, we need to have input, and this will be the form of our keyboard. for our enemy game objects in our scene. We need to have a way to have those enemies move around our scene.

And so there is a type of input there, but it won't be controlled by the keyboard. Instead, this would be a very basic AI where our enemy would have some type of state machine where they're going to move around and make different decisions. Maybe this is them chasing the player. Maybe it's a random pattern. Or maybe it's a boss where they have a set pattern that they follow.

So for our input to make this generic enough where it's reusable, we're going to rely on the component design pattern. The component design pattern allows us to create reusable code and then that way we can extend the behavior of our game objects by using composition over inheritance. We'll be using this pattern for all the components we build for our game. That way they're reusable uh for both our player and our enemies and other game objects. To make our input component reusable across our various game objects, we're going to create a base class uh for our input component, which is just going to have our base properties that we're going to expect for our types of input.

This would include things for like if the uh player or AI wants to move up, down, left or right, if they're trying to attack, and different things like that. By creating this base class, we'll be able to reuse that from our game objects, but then we can create different uh implementation types. As an example, we can create a keyboard component that would extend this input component. And now this would have our logic for our phaser keyboard plugin layered on top of our base functionality. By doing it this way, we could then in the future add in support for things like game pads and different things like that.

To start adding in our code, let's go into our source folder. Let's make a new folder. We're going to call this call this components. Let's add in another folder. We're going to call this input.

And we'll start off with our input component. So we'll make a new file. We'll call this input We'll call this input component. ts. Let's export out our class.

We'll do export class input component. So now on our input component, let's add in our properties that we'll need for our class. This is going to be the directions that our game object would want to move to. So they're going to provide input to move in that direction. And it could be things for if that game object is trying to attack, if they're trying to do some type of action, and different things that.

So for these, uh, we'll just do up, down, left, and right. And we're going to have our types be booleans to show that if that type of input is, uh, being set right now. So I'm going to copy this. I'm going to paste it a few times. So we'll have up, we'll have down, let's have left, we'll have right.

And now let's do our action. and we'll call it action key. Let's do attack key. And we'll have one more. We're going to call this select key.

And so this we like if the player presses the enter key or the select key from the SNES uh where we'd want to uh show our pause menu or possibly open our inventory depending on our keys. Now we have our properties. Let's add our constructor. We'll add in our default values. So we'll have this upup and we'll have all of our keys be in the state of false.

So we have no input at this time. Then copy this. this. We'll paste that and we'll update the property names. So, we'll have down, left, right, action, we'll have our attack, and we'll have our select key.

Now that we have our properties, we need a way to expose these to our game objects that'll have our instance of our component. Uh, so we'll add in some getters and setters for each of these values. So, we're going to have get, and we'll do is updown, and we'll have it return our boolean value. And this is going to return this and our up key. And we'll need to be able to set these if we have input being provided.

So we'll do set and we'll do is up down. We'll have our value. This will be a boolean. We'll do this upup is going to be equal to our value. Now you just need to repeat this pattern for other properties.

I'm just going to copy and paste. And so we'll have is down have is down down. And we'll have is left down. Oh, let's update our values. So we'll have this down this.

Left and we'll have is right we'll have is right down. And now we need to do our other keys. So let's copy this. We'll do is action key just down. So now for our action keys, uh we updated our naming convention uh because we want to do a different type of input handling here versus our directions.

For our player, we want our player be able to hold one of our direction buttons and have our player keep moving in that direction. But for all of our other keys, we want to check to see if the key was just pressed down. And so we only want to do the action one time and wait until our key is lifted and then they press that button again before we do our action. So we'll want to copy this pattern for our two other keys. So I'm just going to paste this twice.

Next, we'll have is attack key just down. And so we'll have our attack key. And now we'll have is select key just down. Finally, on our input component, we're just going to add in one public method that's going to allow us to reset the state of our input. So, we're going to do public.

We're going to call this reset. We'll have it return nothing. And now, we just want to reinitialize our values uh back to false. We're going to copy this here. We'll come down to reset and we'll go ahead and save.

Now, to layer in our Phaser keyboard plugin, let's make a new class. So, under our components input, we'll do a new file. We're going to call this keyboard component. Let's do export. We'll do our class.

We're going to do keyboard component. We're going to extend our input component input component class. Let's add in our constructor. And let's go ahead and call super uh so we can invoke the constructor on our parent class. Now for our keyboard component, we're going to need an instance of our keyboard plugin.

That way we can reference it in our component here. So in our constructor, we'll add in one argument. We're going to call this keyboard keyboard plugin. For our type, this is going to be a phaser input. We'll have keyboard and we'll have keyboard plugin.

Now that we have our keyboard plugin, we can tell Phaser which keys we want to keep track of our state for and which keys we want to listen for events on. To do this, we're going to reference our keyboard plugin. And we'll start off by doing create cursor keys. What create cursor keys does, this will return an object with some of the common keys that we would listen for input on in our games. This includes like our arrow keys, so up, down, left, and right, as well as our space bar and shift key.

You can listen for those input on those keys directly. But create cursor keys just as a shortcut to automatically get those bindings. Otherwise, we need to do keyboard plugin and we need to add a key that we want to listen for input on. And we can do phaser our input our keyboard. We'll do our key codes.

And so we can listen for our left this way, but by doing create cursor keys, it's going to automatically do all four for us. Besides our arrow keys, we'll also want to listen for input on specific keys of our keyboard. And so this will be tied to our action, our attack, and our select. And so we'll need to provide which key bindings we want to use. So for our attack key, we're going to listen for Z.

And I'm just going to copy this line of code here. We'll paste it a few more times. And so for our action key, we're going to do X. And then for our select key, we'll rely on shift. And so we won't need this line of code here.

And there's one other key we'll want to listen for. We want to listen for our enter key. Uh for our enter key, uh this would be for when we want to open up our menu in our game. Uh so we need to add that key actually to our input component. So let's jump back over here.

Let's add an enter key just so we have it in our base class. And I'm just going to copy this. We'll come down this. We'll come down here. And let's add in our getter and setter.

And so we'll do enter key. Enter key. And so we'll do is enter key just down. So now in our keyboard component class now that we have our bindings we need to associate those with our properties from our input component. To do that we need to store a reference to these keys on our class.

So let's add some new properties to our class. For our first property we do cursor keys. For our type it'll be phaser types input keyboard and then cursor keys. Now let's do our other keys. We'll have attack key.

This will be our phaser, our input, our keyboard, and then key. I'm going to copy this line of code here, and we'll want to paste it for our other ones as well. And so, we'll have our action key, and then we'll have our enter key. So, now down here, we'll assign those to our properties. We'll have this, our cursor have this, our cursor keys, equal to our keyboard plugin.

Next, we'll have our attack key. Then, we'll have our action key. Then, we'll have our enter key. have our enter key. So now to use our keyboard keys to check for input, what we can do is we can do things like this dot cursor keys.

Then we can reference our key. So we can do down and then we can do is down. And this is going to return a true or false value if that key is being pressed. For our keyboard plugin, we're going to want to return this value for when we want to check like when our is down key is being pressed. To do that, we're going to override our getters from our base class with these values.

So, I'm going to copy all of the getters and setters here from our base class. We'll come over to our keyboard component. Let's paste those in. And we'll go ahead and get rid of our setters since we won't need those to be overridden. And now we can just update our references.

So, when we do get is up down, let's just copy this code here. We're going to paste it. And so, we'll do cursor keys, we'll do up, and we'll do is down. Now, let's copy that. And we'll do the same thing for our other keys.

So we'll do down is down. We'll do left is left is down and we'll do is right down. Now to check to see if a key is just pressed down, we'll use a utility method from phaser. So we're going to do return phaser input keyboard. We'll do just down.

And now we provide our key. We want to check to see if it was just pressed down or not. And so we'll do for our action key, we'll do this. And we'll do our action key. Let's copy this and we'll do the same thing for these ones down down here.

Now for our attack key, we'll do this attack key. For our select key, we'll do we'll do this. We'll do our cursor keys and then shift. Now for our enter key, we'll reference our enter key. Finally, for our input component, we're going to add two more getters, and this is going to be for up and down keys.

So, currently, we have our two getters for when our keys being pressed and held down. we'll want to add in two methods to see if it was just now pressed down. And so when our player's moving around our scene, we want the player to be able to hold our arrow key and keep moving. But then when we're navigating things like our menu, we might want a different type of input where a single key press is what we're looking for. So in our input component class, let's come up to where we have our get is up down.

So let's copy our code for our getter for is up down. We'll paste it down here. We're going to do is up just down. We'll return our default value of this. up.

And we'll do the same thing for our getter for is down down. So is down just down. So now we're going to copy these two getters over to our keyboard component class. We'll paste those in. All right.

And I'm just going to move these up by our other methods. So we'll come up to here where we have up and down. We'll paste those in. And now we just need to update our references. And so let's copy our code down here where we do just down.

Paste that here. And now we just need to change this attack key. We'll do our cursor keys up. And then we'll do our cursor keys. And now we'll do down.

Let's save. To start testing our keyboard component, we'll update our player class to have an instance of our keyboard component. And as the player provides input, we'll update our player to play different animations based on the key that was pressed. To do this, let's jump over to our game scene. And we need to create an instance of our keyboard component.

Let's add a new property to our class. We're going to call this controls and we'll reference our keyboard keyboard component. And down in our create method, we'll do method, we'll do this. So be equal to a new instance of our keyboard component. We need to pass in our phaser import keyboard plugin.

So we'll do this. input and we'll do keyboard. And so to fix our intellisense issue, we just need to add a safeguard to make sure our input keyboard is actually enabled on our game. Uh, by default, this is typically enabled for your Phaser games, but you can disable it in your configuration settings. So, to add this safeguard at the top of our create method, we're just going to add a return statement if it's not available.

We'll do if not our input keyboard. so if it doesn't exist, if it's not enabled, then we'll just log a message. we'll do we'll do console. warn and we'll say our phaser keyboard plugin is not set up properly. And so, we'll add in a return statement.

All right. All right. So, when our game refreshes, oh, we need to update our references. So, if we come into our keyboard component at the top of our file, let's add in our phaser import. So, I'm going to copy this from our player class.

We'll paste that into our keyboard component. Now, we jump back over to our game scene. Now, we need to pass our controls to our player class. So, we'll add a new property to our configuration. We're just going to call it controls, and we'll pass in this and our controls instance.

We jump back over to our player class. Let's update our config. Uh, so after our frame, we're going to add in controls. For our controls, we're going to type this to be our input component. Now that we have our input component in our player class, we can now check for our keyboard presses and then update our player's animation when one of our keys is pressed.

For this check, we need to do this in our update method of our phaser scene. So with the Phaser game engine, once our scene is first started and is created, it will then start invoking our update method. And this update method is going to be invoked multiple times per second. So each tick of our game loop. And inside this loop, this is where we'll want to do things like check for our player input and check for collisions.

To do this check, let's add an update method to our player class. We'll have a return void. And now we need to reference our controls. So we'll update our player class to have a reference to our reference to our controls. And so this will be our input component.

Now we'll store our reference. Well, this controls will be equal to our config uh controls. Now down in our update method, we can check to see if one of our keys is being pressed and then do our uh animation. So let's start with our vertical movement. we'll do if our controls and is up down.

Then we'll play our animation for our idle up. So let's copy this line of code here. Let's paste that. We'll change our reference. We'll have idle, we'll have up, and we'll add in one more configuration setting.

And we'll set this to be true. So if this animation's already playing, then Phaser will not restart this animation and it'll just keep playing the animation that's already playing. So this will be nice if we're holding our up key, then we won't keep restarting our animation. So now we want to check for other directions. And we'll do else and we'll say if our controls is down.

Now we want to do idle down. Now we'll do our horizontal movement. So we're just going to copy all this code here. Let's paste it. Now we'll do is left down.

We'll do our idle. We'll do our side and we'll do the same thing for when our right is down. So now to invoke our update method, we either need to update our game scene to have the update method here and then manually call update on our player or we can register an event listener for when our scene is updated and automatically uh call this from our player class. So to do that, we'll come up to our constructor. Let's do our config.

We're going to reference our phaser scene. We'll reference our events and we'll do on and we're going to listen for our phaser, our scenes, our events, and we want to listen for our update event to our scene. So, when the phaser engine's running, it's going to emit this event anytime it's time for our scene to actually do our update. And then that's what's going to trigger our update method on our scene. By listening for this event, we can now also run this code once that event fires.

So when our update event is sent, we just want to run our update method for our player class. We'll pass in this to have the context of our player. And because we're registering our event emitter, we want to make sure we clean this up properly when our scene is shut down. So we're going to do config, we'll do scene, we'll do our events, and we'll do once. And so when we get our phaser scenes, our events, and we get our shutdown event.

So this will be emitted once our scene is shutting down. So if we transition to another scene and we stop this current scene, this would actually fire this event. And when this happens now, we want to turn off our event listener for our update method. So inside here, we'll just add in our callback. I'm going to copy this line of code here.

And so just to turn off our event, we just call off. And then we need to provide the same arguments that we provided when we turned it on. So, one thing to note is when we use the on method, this is going to allow us to listen for the event every time it's fired, once we'll add a one-time listener uh for that event. So, for our shutdown, we only care about this happening one time. And so, once this is invoked, if it was ever fired again, we would ignore that event.

So, now that our code changes, let's come back over to our game scene. And now, if we press our arrow keys, we'll see our player now rotates into that direction and it plays that animation. So, one thing we need to fix is when we do our left key, we'll see it's going to play our animation for our side. And how our player asset is set up. All of our animations for our side will always face to the right.

So, to handle when our player wants to move left, we'll need to flip our game object it faces in the correct direction. To make that quick change, we'll come over to where we do is left down and we're just going to call this, we'll do set flip X, and we'll set that to be true when we press our left key. And then if we press our right key, we're going to go ahead and flip this back and we'll set it to be false. So now if we press left, we'll see our player faces to the left and we play the same animation. Now that we have our basic input functionality working before diving into moving our player in the game, let's take a moment to set up the structure we'll use for our game components.

In our project, components will be small, reusable pieces of code that extend the functionality of built-in game object types. This modular approach will give us the flexibility to attach various components to different game objects such as the player, enemies, or items. By using this pattern, we'll be able to enhance any game object with specific behavior while keeping our code organized and scalable. However, to make this system work effectively, we need two key features. Storing references to component instances on our game objects and checking for specific component types on any given game object.

To handle this, we'll create a base component class that all components will extend. This base class will provide the shared functionality needed to register, reference, and manage our components across the game. Create our base class in our source code. Let's go into our components folder. Let's make a new folder.

We're going to call this game object. Let's make a new file. We'll call this base game object component. So, let's export out our class. We'll do export class base game object component.

For our component, we'll need a reference to our phaser scene that our game object belongs to, and we'll need a reference to that game object itself. So we'll add in two properties. We'll do protected because this is our base class. We want all of our other components to extend it. Uh so we'll make these protected.

So these properties are accessible and those classes. So we'll do scene. This will be our phaser our phaser scene. And now we'll do protected. And we'll do our game object.

We'll do our game object. And for our game object, we'll want to support multiple types like our sprite and image. For this, we're going to define a custom type that's going to list the available game objects types we support. So, we're just going to call this game object. Let's jump over to our types file real quick and we'll define that.

So, under our common folder, let's do export type. We'll do game object. We're going to set that equal to our phaser, our game objects. We'll do sprite and we'll also support images. So do phaser game objects.

We'll do image. Let's import phaser in our file. So we'll do import star as phaser from phaser. Let's copy that statement. We'll jump back over to our component class.

We'll add that in at the top. Let's import our game object type. We'll add in our constructor and we'll expect one argument. This will be our game object and we'll type it to game object. So now we can set our properties.

So we have this scene will be equal to our game object and the scene property on our game object. And then we'll have our game object equal to our game object instance. So now for our class we need a method that will allow us to provide a game object and then we'll return the instance of this component if it exists on that game object. To do this we'll need to store a reference of this component instance on our game object and then that way we can use that same method to look up if that component exists. So let's make a new method.

We're going to call this protected and we'll do assign component to object. So for this we'll expect our object and this will be a game object and we won't return anything from this method. So now store a reference to this component on our object. We're just going to add that as a property. To do that we'll reference our object.

And now we'll just add in a new field on our object. And so we're just going to reference our constructor name. So we'll do this. We'll do our do this. We'll do our constructor and name.

And then we'll set equal to this instance of our game object. So now in our constructor, we'll just call our new method. We'll pass in our game our game object. Now that we're storing a reference of our component instance on our game object, we can now add in a method that will allow us to take a game object and see if that object actually has an instance of this component. For that, we'll use our static keyword and we'll do get we'll do get component.

Now for our method, we're going to select one argument. This will be our game object. And so now we'll just want to return our game object. And then we'll use the same lookup here for that property name. So because we're using the static keyword, we can't use this constructor.

And so we want to use this name. So I'm going to copy this string here. We'll paste it. We'll remove constructor. Let's do this.

Name. And we'll save. And now we're just going to add in our type information. So when we call get component, we're going to expect the type of the component we're looking for to be provided. And then that way we can return that type and then that way our code will be typed properly.

And so by using the static keyword here, this is going to allow us to use this method uh from our class without having to create an instance of our class. Similar to our get component method here, we'll want to have a method to allow us to remove a component from a game object. So I'm going to copy this here. I'm going to paste it and we'll do remove remove component. For this, we won't need our type information.

So, we won't return anything. We'll just do void. And now, we want to do delete to remove this property from our game object. Now that we've defined our base game object component class, we're going to create our first component instance. For this, we'll make a new component called our controls component.

And the purpose of this component is to provide a input component to our game objects. Currently, our player is set up where we pass in an input component instance and we reference that directly in our code. Now, the downside of doing that is if we ever want to swap out our input component that our player's using, we'll need to add methods to our class to do so. A good example of this is if we ever want to support other input types like gamepad, if we ever had an options menu where a player can switch between the two, we would need to dynamically update our player class to use that new component instance. by placing our input into a new controls component that will extend this class here.

This will allow us to abstract that away. And as long as we can reference our controls component, we'll be able to do things like swap this out on the fly. Another good example is let's say if we have a secondary game object that might follow our player. Uh maybe this game object has a simple AI where it'll just follow along and help the player, but maybe we add in support for two-player. And so when a player joins, we'd want them to take over that game object.

And so we need a way to swap out our input component to the input that's being provided by player 2. And so by moving this logic to its own component and abstracting this away, we'll be able to support different use cases like this in the future. And it'll make our game more scalable. To do this, let's jump back over to our code. Uh under our game object folder, we'll make a new uh file.

We're going to call this controls component. It's done our class. Let's export our class. We export class. Controls component.

This is going to extend our base game object uh component. And so on our class instance, we'll need a property to keep track of our input component. So we'll add in a private property. We'll do input component. We'll add in our type to reference our input component.

We'll add in our constructor. And so we'll need our game our game object. And then we'll need our input component. And so we'll let's call super. We'll pass in our game object.

And now we'll store our reference to our input component. input component. And for the time being, let's just add in a getter and we'll do get controls and we're going to return our instance of our input of our input component. So now that we have our new controls component, let's jump over to our player class and we'll create an instance of this. So in our player class, let's update our property name.

We're going to do controls component and we'll update our type and we'll do controls component. So now down our constructor, we'll update our reference. We'll have controls component. And so instead of doing config controls, we're going to create a new instance of our component. So we'll do new controls component and we'll reference this from our game object.

And now we'll do our configuration and we'll do our controls. now we just need to update our update method. So down in our update method, let's grab a reference to our controls. And so we'll do const controls. It's going to be equal to this our controls component.

And now we'll reference our controls. And we'll update our references down here. So instead of doing this controls, we'll just do controls is up down is down down is left down and then is right down. All right. if we save and our browser refreshes, we should now be able to provide our input and our game should work the same way it did before.

I know we just added a lot of code and you might not see any immediate changes in our game's functionality, but trust me, this structure will pay off as we start adding new game objects and the game grows more complex. By setting things up this way, we gain several key benefits. Reusability. We can easily attach components to any game object and reduce our redundant code. Modularity.

We can break down our complex behaviors into smaller, manageable pieces of code, making the code easier to maintain and extend. Flexibility. We can quickly add new features as our game expands by simply creating and attaching new components. This foundation will keep our game development process smooth and scalable as we move forward. Next, for our player, we'll start moving our player to actually move around our scene.

To do this, in our player class, in our update method, when we're checking for our controls component, if one of our input keys is down, we'll want to update our physics bodies velocity in order to move our game object around our scene. To start making this change, let's add a new method to our class. We'll call this update velocity. So, we'll do private update velocity. Now, for this method, we'll want to be able to support updating both our X and Y velocity.

So, we're going to add an argument called is X. This will be a boolean and when it's set to true, we'll update our x velocity. If it's set to false, we'll update our y velocity. We'll also want to receive the velocity we want to set it to. And so if we'll add in value, and this will just be a number.

And for our method, we won't return anything. So we'll add in void. And so we'll do if is x is set to true. Then we'll want to update this our body. Then our velocity property and our x value.

We want to set equal to our value. We'll go ahead and return. And if is x is false, then we want to update our y value. So we'll copy this. We'll paste it.

Let's add that in and we'll save. All right. So we save our code. We'll see we have an issue over in our browser and with our intellisense. What's happening is when we reference this body, the type we get back from phaser is on our game object.

It's either going to be an arcade body, a static body, or null. Because our property could reference null, that means we'll have an issue if we try to call velocity uh on that object. And so to fix this, we're going to add a utility function that's going to ensure that our body on our game object is actually an arcade physics body. To do this, we're going to jump over to our utils file uh in our common folder. We're going to make a new function and we're going to call this is arcade physics body.

Let's do export function is arcade physics is arcade physics body. So now for our function, we'll have one argument. It's going to be body. And now for our types, this is going to be our phaser physics arcade body, our phaser physics arcade static body or null. And we want to return our body.

And we want to set our type is our phaser physics arcade phaser physics arcade body. So now in our function, we're going to make sure that our body is not undefined or if it's null, we want to return false from this. So we'll do if body is undefined or body is null we'll return return false otherwise we're going to return body instance of phaser body instance of phaser physics arcade body. So now if we jump back over to our player class let's add in that type guard. So we'll do if not is arcade physics body and we'll pass in this body.

Then we'll go ahead and return. And now we should be able to re remove our optional chain here. So once we save our game should refresh and we should see our player again. All right, real quick. Back in our utils file, we're going to add in one more type uh for our type guard here that we'll need later.

Uh so besides our phaser physics arcade static body, we're also going to add in our add in our matter. js. body type. So by default when we reference this body on some of our game objects because phaser supports matter, this type is also returned on some of those references. currently on our player because we're typing to an arcade physics sprite, we don't see that return when we reference this body.

And we're just going to add this type here for when we have to support other body types. So now to use our new method, let's go into our update method. And after we update our animations, we'll call our new method. So we'll do this. We'll do update velocity.

So when the up or down key is pressed, we're going to pass false for is x. And now for our value, when we press the up key, we want to do negative one. uh since we're moving up in our scene, our y value will be decreasing. We'll copy that. Let's come down here.

And now we provide a positive one for our y when we're going down. So now for our x values, we'll paste that in. But now we want to set this to be true. And so when we go left, it'll be negative - 1 and we go right it'll be positive one. All right.

So now if we save, come back to our scene, try moving. Oh, we have an error. Let's copy our import statement. Come back to utils. Since we're referencing phaser, we need to make sure our import is present on that file.

Right? So, if we refresh now, if we try moving our player, we'll see they start moving around our scene very slowly. If we stop pressing our arrow keys, uh, they keep moving. So, we'll want to add in another safeguard where if none of our inputs provided, we want to reset our velocity. So, we'll do else.

Let's copy this here. We'll paste it. And we're just going to do zero. We'll do the same thing down here. But now, we just want to set true for X.

We'll save. now if we try moving our player, they move. move. If we let go of our keyboard keys, they stop moving. So now to address the issue with our speed, we just need to update our velocity to be multiplied by some value.

Uh just for testing, we're going to multiply this value here by 80. And that way we can see if our player is actually moving around. All right, so we save. Now, if we press our arrow keys, our player will be able to move around our scene. So one thing we'll want to fix is our animations.

Uh so currently we're doing our idle animation as our player's moving around, and instead we'd want to do our walking animations. So, we come up to our code. Let's change this from idle up. We'll do walk up. And then we'll do the same thing with the rest of these.

Now, if we save, our player should be able to move around our scene. It looks much better. So, one thing we'll need to fix is if we're holding two of our keys together, like down and left and down and right, we'll see our player's animation stops playing because we're trying to play two animations at the same time. Another thing we'll have to address is our player speed. Uh, currently when they go diagonally, they're moving much faster versus if they just go up, down, or left or right.

To fix the issue with our animations, let's go into our code and we're want to check to see if our up or down key is being pressed. And if so, we won't play our animation for when we're walking on the side. To add that check, let's make a new variable. Do const. We'll do is moving moving vertically.

We're going to set equal to our controls. We'll do is down down or our controls is up down. So now we only want to play our animations if that's false. So we'll do if not is moving vertically. Oh, let's update our name here.

So here. So vertically. Now we'll move this check inside our if inside our if statement. So let's go and move that code above our is moving vertically. And now we'll do the same check down here.

And let's move this code above that. And we'll clean that up. Let's save. So now back in our scene, if we try pressing our two keys, we'll see our animation continues to play smoothly and we only show our up or down when we're pressing the two pressing the two keys. Another thing we'll want to fix is once we let go of our input, we need to go back to our idle animation.

So below our code, we'll add a check to see if our inputs not being pressed. And so we'll do if not our controls is down down and we'll check each of our values. we'll do and I'm going to copy this and we'll check our other keys. So we'll do is up down is left down and we'll do is right down. Then we'll play our idle animation.

So let's copy this. We'll just do our idle down. We'll worry about our direction for the time being. So now after that, after we move our player, if we let go of our keys, we go back to our idle animation. Nice.

So to address our issue with where our player moves faster when they're going diagonally versus when they go up or down, we need to normalize our velocity for our player. And so what that means is currently in our game when our player's moving up or down, we're upping our velocity by one. And so if we just make this very simple, let's say our player's moving one pixel per second. What that means is if we go up within 1 second, we'd move one pixel. If we go left or right, we'd move over one pixel.

Now, in our game, when this happens, we're updating our player's position by that one pixel. So if we go up, we increment by one. If we go right, we increment by one. However, when we move uh both in the same direction, what's really happening is we're moving our player by about 1. 4 pixels.

To figure this out, we can use the Pythagorean theorem. And with this theorem, we can figure out the sides of one of our triangles based on the distances of our other two sides. And so to figure this out, we just take our sides. So we have a so which would be one, b would be one. So we square those.

We have 1 + 1. And now we take the square root of that. So that's about 1. 4. And so to make our player move uh the same speed uh when we're going diagonally, we really need to have our player go to this position here where we have our blue line instead of coming all the way up here to our 1.

4. And so to fix our issue with our player speed, we really want our player to stop moving at this blue line here. This would be about one pixel uh between these two points here. So now to fix that, let's add a new method to our class. And we'll just call this normalize call this normalize velocity.

For our method, we won't return anything. And now to normalize our velocity, we can just reference our body. And so we're just going to copy this here for our type guard. And now we'll do this. We'll do our body.

We'll do our velocity. We'll do normalize. And after we call normalize, now we just need to multiply it by our speed value that we were doing up here. And so we call scale. And we will do our 80.

So since we're normalizing then scaling here, we don't actually need to multiply velocity here by our speed. We only to do it in one location. And so now to call our new method, we'll come up to our update method and let's call normalize velocity. Let's save. All right.

So now back in our game, if we move our player around, we'll see they're still able to move. But if we go diagonally, we'll see that they're a little bit slower. And so now what normalize does, if we look at our diagram, this is going to enforce that no matter which uh velocity we're updating, our player is going to move the same distance. To see an example of this, I'm just going to do console. log.

We're going to log out our body velocity and let's get rid of our normalize. If we come back to our game, if we look in our developer console, we'll see when we're not moving, it's set to zero. And now, if we are moving, our x and y are both 80 or negative 80 depending on our input. If we add back in our normalize, we'll see if we go left or right, we have our positive and negative 80. But the moment we go diagonally, we'll see now we have a much smaller value.

We have that 56 value and that's what's making sure our player only moves the amount of distance that we need to have them move. All right, so let's come back to our code and we'll remove our console log. A state machine is a powerful tool that helps us manage different behaviors for our player, enemies, and other game objects in a clean and organized way. Instead of handling all possible actions in a single messy update function, we'll break our logic into distinct states, making our code easier to manage, debug, and expand. For example, our player will have states like idle, movement, attacking, taking damage, dying, opening up chest, lifting up objects, each with its own behavior.

Our enemies will also have their own sets of states. As an example, for our spider enemy will have an idol of movement, hurt, and death state. And the states between our player and our enemies will have a lot of things in common. And by abstracting this logic into its own state, we'll be able to reuse that logic for our various game objects. And by using a state machine, we can smoothly transition between these states and ensure our game objects always behave as expected.

And for each of our states, we'll also need to manage what states we can transition to. As an example, when our players in the idle state, if they provide input for movement or attack, we'll transition to those states. If they take damage cuz an enemy runs into them, we'll go to that state. Similarly, if they die, however, they won't be able to transition from idle to idle hold or move hold. Instead, they would need to go to our lift state first to lift up a game object.

And so, trying to manage these transitions as well as the code for each state inside one location, our code become very cumbersome and very messy. And by using a state machine, we can smoothly transition between these states and ensure our game objects always behave as expected. This will allow us to keep our code clean and organized. By the end of this section, you'll have a solid understanding of how to build and use a state machine, setting up the foundation for a dynamic and responsive gameplay. Let's get started.

To start building our state machine, let's go into our code. Let's go into our components folder. We'll make a new folder. We're going to call this state this state machine. Let's make a new file.

We'll call this state call this state machine. ts. Right. So, first let's export our class. We'll do export class and we'll do state machine.

So, on our state machine, we want the ability for each of our game objects to have its own state machine instance. In that instance, we'll need to keep track of which states are available to that particular game object. As an example, our player would want to have this set of states versus one of our enemies, our spider would only have these four states here. So to help keep track of these, we're going to add an ID property to our state machine so we know which game object it belongs to. And so we're just going to make this a string.

So to keep track of our states, we're going to store this in a map. Uh so let's add in a property. We're going to call this states. Let this be a map. And so this be a map of our state name to the actual state object itself.

So, we'll have a string for our key and then our value will be state. For now, let's just go up to the top of our file. We'll do export interface and we'll do state and we'll just have this be an empty object for the time being. For our state machine, we'll need to know which state our game object is currently in. So, we'll do current state.

And so, for the type, uh, we'll do state and we'll also support undefined. So, when we create our state machine instance, we won't actually have a starting state. We'll need to tell the state machine which state we want to start for our game objects. So now for our state machine, we'll need to be able to keep track of when we're changing between our states. Then that way we can queue up any states we need to transition to.

Uh so as an example, if we come over to our state machine, we'll see that from our idle state, our player can transition to a variety of states. We can go to movement attack, but we can also transition to our hurt state uh if our player takes any damage. And so while all this is happening, we need a way to queue up our states that our player needs to transition to. So then that way we can make sure we're running any logic from that state before we transition to the next one. And to help keep track if we're in the middle of transitioning, we're going to add a flag to our class.

Uh so for this we'll call this is changing this is changing state. This will be a boolean. And then we'll also need to keep track of any states we need to transition to because while we're in the middle of changing a state, we don't want to just jump to the next one. We'll want to cue them up. So we'll call this changing state Q.

And so this changing state Q, this is going to be an array of objects. And so this object, we'll need to know our state name. And so we'll add in state. And so this will be a string. And then for our states, we want to be able to support passing arguments to them.

Uh, as an example, when we go to lift up an object, this state will need to know which game object we're trying to lift up. Same like when we're trying to throw a game object. And so by allowing us to pass in arguments, we'll need to keep track of those in our queue. So we'll have our arguments. And for this, we'll just do unknown.

And we want this to be an array of objects. So now let's add in our constructor. All right. So for our constructor, we're just going to have one argument. Uh we're going to have an optional ID.

And so this will be a string. And so in our constructor, we'll check to see if it's undefined. So if our ID is undefined, we need to generate one for this game object. So we'll do this ID. And to generate this, we're going to rely on Phaser's um utility function for creating a UID.

And so we're going to set equal to phaser. mmath. random. and we'll do UID and this will just generate a unique identifier for the state machine. Otherwise, we just want to fall back to using the one that's provided in our constructor.

So, let's add in our default values for our other properties on our class. And so, we'll have this. We'll do is changing state. We'll set equal to false. Our changing state Q will be an empty array.

We'll set our current state to be undefined until we tell our state machine to actually start. And now we want to create our states map. So have this states will equal to a new map. All right. So before we continue on our state machine class, let's go up to our interface for our state.

And we'll define this now. And so on our state, this will be the interface we need to implement for each of our various states here. So for our idle state, this is where we'd have all our logic for playing our idle animation for our player. And we'd have our checks for handling player input. Then that way we can transition to the appropriate state.

All right. So for our state classes, one of the things we'll need available to us will be our state machine. So from each of our states, we need to be able to control which state we can transition to. So once our player provides input for movement, for example, we need to call our state machine to update our state to transition to our move state. we'll add in state machine for a property.

And so for our type, this will reference our state machine class. And now for our state, we'll need to have our name. So let's add in our string. And for our states, we're going to keep these pretty bare bones. We're just going to have two functions.

One's going to be on enter and one's going to be on update. on enter will be the code we run as soon as we transition into this state. And on update, this will be our code that'll run for our update or every tick of our game loop. So currently for our player in our update function, this is where we're checking for handling our player input. That on update method, this is where we'll also do the similar check for our input.

And so we'll make both these properties optional. Uh since some of our states will not need to run any code in the update method and some states might not have any code we need to run when we first transition into them. So we'll do on enter. We'll make this optional. And now for our type we're going to have a function.

So we'll have args. This will be an unknown array. So these will be our arguments that we receive when we want to change our state. And then we'll have our function return void. And now let's do on update.

And now for our type we won't receive any arguments and we'll just do void. So now back down in our state machine class, first we're going to add in a method for allowing us to add a state to our state machine. So we'll make a new public method. We're going to call this add state. For arguments, we need to receive an instance of the state we want to add.

This function won't return anything. And so now for the state that we just received, we need to update its state machine instance to reference this instance of our state machine. So we'll do state. state machine will be equal this. And now we need to add it to our map.

So we'll do this. We'll do our states. We'll do set. Now we'll do our we'll do our state. name and we'll do the state instance.

Next, we'll add in our method for allowing us to set the state we want to transition to. So let's do public. We'll do set state. So now for this method, we'll need to receive our state name that we want to transition to. Uh for argument, we'll add a name.

This will be a string. And now for our state, we want to support passing any additional arguments. And so we'll do our args. And we'll have these be in an unknown array. For this function, we won't return anything.

First, we're going to make sure the state name we just received actually exists in our map. If it doesn't, we'll return early, and we'll log a message. We'll then check to see if that's the current state we're set to. And if it is, we won't do anything. And then if it's not, next, we're going to check to see if we're changing state.

And if we are, we're going to add it to our queue and just return early. So adding these checks, let's start off with making sure that state exists. So we'll do if not this states, and we'll do has the name that we provided. We'll go ahead and log out a message. We'll do console.

Warn. All right. So now for our log message, since we're going to have multiple instances of our state machine, we want to add some additional metadata we know which state machine is logging this message. For this, we'll use our state machine class name as well as the ID of our state machine. Uh so let's do a bracket.

We're going to log out our state machine class name. So we'll do state machine. name. Let's do dash. And we're going to reference our current ID.

And now we're going to go ahead and log out our method name. And we'll do method name. And we'll make this variable in a second. Now say tried to change to an unknown to change to an unknown state and we'll provide the name of the state we're trying to transition to and then let's return early. So now we'll define this variable.

So we'll do con. We'll do our method name will be equal to set state. All right. Next we want to check to see if that is the current state. So we'll do if we'll do this is current current state.

We'll provide our name. Then we'll go ahead and return early. Let's define this new method on our class. We'll have a private method is current state. We're going to expect our state name.

So we'll have string. Now this is going to return a boolean going to return a boolean value. So now in our check first we want to make sure we actually have a state uh since it can be undefined. So we'll do if not this. curren state that we want to return false.

And now we want to check to see if our current state name is equal to the name that was provided. So I'm just going to copy this here and we'll do return this current state. name is equal to our name that we provided. now back up in our set state. Let's add our check to see if we're changing states and we'll add this to our que.

So we'll do if this is changing state and we want to push this into our que. So now we'll pass in our state. We'll have our name and then we'll pass in our arguments that we received. And let's return early. So now if we reach this point in our code that means we received a valid state and we're not in the middle of changing state.

So now we can start that transition. So let's start off by setting is changing state to be true. And now let's update our current state. So we'll do this. We'll do our current state will be equal to our states and we'll do get and we'll do our name.

So now that we've updated our internal state on our state machine, now we need to call our on enter method for our state. And since it's optional, we want to add a check for that. So we're going to do this. If our current state has on enter has on enter defined, then we want to go ahead and call that method. So we'll do this.

We'll do our current state and we'll call on enter. And now we'll pass in our arguments. After we call on enter, we can now say we're done changing our state. So we'll do this. We'll do is changing state will be equal to false.

All right. So last thing we'll do for our set state method is we're just going to add a console log for once we start changing our state. Uh so for this we're going to add a utility method to our class. Uh, so we can follow this pattern here where we do our log line. So I'm going to copy this.

Let's come down to the bottom of our class. We'll add a new private method. We're going to call it log. We're going to expect our method name as a string. And then we'll have our message as a string.

So now let's do our console, but instead of doing a warning, we're going to do log. We'll have our state machine, our method name, and now we need to change this to be our message. We'll remove our other text from our string. So now back up here in our set state after we start our transition. Uh this is where we'll call our log line.

And so we're going to do this. We'll do log. We'll provide our method name. All right. So now for our log message, we're going to say change from our current state's name uh to the new state name we're transitioning to.

We'll do change from let's do this. We'll do our current state. And then we'll reference our name. And now we're going to add a fallback since this can be undefined. And we'll do none.

And then we'll say to the new name that was just provided. Next for our state machine. Now we need to add in an update method and this method will be responsible for calling our on update method for our current state. Now so for this we'll add a new public method. We'll do public.

We're going to call this update. We'll return nothing. So we'll do void. And now we're going to add in a check to see if our current state is defined and if it has that on update uh method and so we'll do if this current state is defined and this current state on update exist. Now we want to call that method.

Meth. We'll do this current state and we'll do on update. Besides this, in our update method, this is where we'll want to add in our logic to work through our queue of states that we need to transition to. To do that, first we'll need to grab a state from that array. And so we'll do con let's do cued con let's do cued state.

Going to set that equal to this. We'll do our changing state Q. And then we'll call shift to grab our first element. And now we'll add in our check. if it's not undefined, now we'll call set state.

So we'll do if our cued state does not equal undefined, then we call this set state and we'll pass in our cute state information. So we'll have our cute state state and then our cute state args and then we'll go ahead and return if we are working through our que. Finally, for our state machine, the last thing we'll do is we're going to add a configuration option to enable or disable our logging uh from our state machine. To do this, let's go into our code. Under our common folder, we'll make a new file.

We're going to call this this config. ts. Inside this file, let's do export const. We'll do enable logging. And we're going to set that to be true for the time being.

Let's copy that. We'll come back to our state machine. So now back in our log method, let's do a check to see if it's not enabled. So we'll do if not enable logging. Then we just want to return early.

If our logging is enabled, now we'll log our message. Now that we have our state machine in place, we can start building out our states. To get started, we're going to create a base character state, which will be our template that all of our other states will inherit from. This base character state will keep track of the game object that our state is associated with, and that way we can easily reference it. To do this, let's go into our code under our state machine folder.

Let's make a new folder. We're going to call this states. And now we'll make another subfolder. We're going to call this character. Let's make a new file and we'll call it base character state.

Let's create our class. Do export class. We'll do base character state. We're going to have this implement our state. Since we're implementing our state interface, we need to add our properties for our name and our state machine.

For our state machine, we're going to make this protected since we're going to extend this class here. And we need our state machine to be available to our child classes. So, we're going to do protected. We'll do underscore. We'll do state do state machine.

We'll do state machine for our type. Now for our state machine, we won't get this in our constructor. And we're just going to do this not null. And now let's add in our setter for setting our state machine. So we'll do set state machine.

We'll receive our state machine as our state machine as our argument. And now we'll do this. Our state machine will be equal to our state machine that we just received. Now for our name, we're just going to make that private. So we'll do name.

We'll set it to a string. And that we will inspect in our constructor. So we'll do our constructor. We'll have our name for our string. string.

We'll do this. name will equal to our name. So now we just need to add in a getter for our name. So we'll do get name. We'll return our string and we'll do return this our name.

One other property we'll add to our class is we want to keep track of our game object we're associated with. So let's do protected. We'll do game object. And for the time being, we're just going to type this to be player. Uh since we don't have a generic type for our various characters in our game, let's add that to our constructor.

And so we'll have our game object. it'll be our player. And now we'll do this. We'll do our game object will be equal to our game object. One last change we'll do to our base character state class is we want this class to be our blueprint that all of our other character states will inherit from.

We don't actually want to create any instances of this class. Instead, we want to create a separate class to represent our various states like idle and movement. To do that, we just want to make this class an abstract class. So then that way we can't create any instances of this class. Now that we have our blueprint in place, let's create our idle state class.

Under our states character folder, let's do a new file and we'll do idle file and we'll do idle state. Do export class. We'll do idle state and we're going to extend our base character state class. Let's add our constructor. Now for our constructor here, we're just going to expect our game object that will be provided.

And we'll have our game object. We'll add our type for our player for the time being. And now let's call super. And we need to provide the name of our state. for now, let's just do a string.

We'll do idle. And now we'll pass in our game object. So for our state name here, we'll be referencing this in multiple locations. And so we're just going to move this to an object and follow the pattern that we've established in our codebase. So under our states character folder, let's make a new file.

We're going to call this character states. Let's export out const. We'll do an object. So we'll do character states going to be equal to. We'll have our idle state.

And let's do our move state while we're in here. Now for our values, we'll just match our keys on our object. And then we'll do as const to lock our object. Back in our idle state, let's update our string here. And so we'll do our character states and we'll do our idle state.

So before we add any more code to our idle state class, let's jump over to our player class and we're going to create an instance of our state machine and we'll see if we can actually get into our idle state. So on our player class, let's add a new property to keep track of our state machine. So we'll add our type. we'll have our state machine. So now down here, if we play our animation, let's add in our state machine.

And so we'll do this. We'll do our state machine. This be equal to a new state machine instance. And for our ID, we're just going to pass in player. Now let's add a new state to our state machine.

So we'll do state machine add state. We'll do a new instance of our idle state. We'll pass in this for a reference of our player instance. And now we want to call set state on our state machine. So we'll do this.

We'll do our state machine. We'll do set state. And let's do our idle state. So we'll do character states idle. Now if we save, we'll see right away when our browser refreshes in our console, we're going to see that our state machine was invoked.

We called set state and we changed from no state to idle state. So now back in our idle state, if we add our on enter method, we should see that get triggered. And so we're going to do on enter and we're do enter and we're do console. log test. Back in our browser now, we should see two additional log lines.

We'll see idle state on enter was invoked. And then we can see our code is actually running. Now if we want to test our on update method, we'll do on update. We'll have our type be void for our return. Let's do our return.

Let's do console. log. We'll do test two. Come back to our player class. Now we need to call the update method on our state machine.

So down in our update method here after we call normalized velocity, we'll do this. We'll do our state machine. Let's call update. So now if we save, we'll see in our console that test two is being logged for every tick of our update loop. Now that we have our state machine working and we have our idle state working for our player, we're going to start moving our logic from our player class into our various states.

So currently in our player class, this is where we listen for our input from our controller and then we use that to play our various animations and move our character on our screen. Instead, we want to move the relevant logic to our idle and movement states. So then that way when there's no input, we'll be in our idle state and we'll listen for input. And once we have that input, we'll transition to our other state. To start making this change, let's go into our idle state.

When on enter is called, the first thing we'll do is we want to play our animation for our idle animation when we're in our idle state. if we jump back over to our player class, let's copy our code for we do our idle animation. We'll copy this here and go ahead and paste that here. Let's get rid of our console log. So, now instead of doing this play, we're going to do this.

Ame this. ame object. play. Now, we need to update our imports. So, let's add in our player animation keys and we'll save.

After we play our idle animation, now we want to reset our body's velocity. So in our idle state, we don't want our player to be moving around. And so if we jump over to our player class, let's copy our code here for we check for our arcade physics body. We'll paste that in in our idle state. Then we want to reset our velocity.

So I'm going to copy this code here for resetting our velocity. So we want to check to see if our body is an arcade physics body. So we want to get rid of our not. Instead of doing this body, we want to reference our game object. So now we'll update our code down here.

And then we want to reset this to be zero. Let's copy this line. We'll do the same thing for our y value. All right. So that's all we need to do for on enter.

Now in on update, this is where we'll check for our input. And so as long as the player's providing some type of input, we'll go to our movement state. So now in our on update method, this is where we're going to check for our player input. So we jump over to our player class. Let's come up to our update method.

Let's copy our code here for we check for our controls to see if there's any input being provided. So, I'm going to copy this here. Let's get rid of our console log. Let's paste that in. First, we'll need a reference to our controls from our game object.

So, we're do const. We'll do controls going equal to this our game object. And then our controls is now to make our controls available to us, we need to jump back to our player class. We'll want to add a getter for getting that component. And after our constructor, let's do get we'll do controls.

This will return our input component. So, now we can return this our controls component. and we'll return the controls property. Back in our idle state, we'll now have our controls. And so if there is no input, instead of playing our animation, we just want to return early.

If there is input for our directions, now we want to go to our movement state. So we're do this. We'll do our state machine. We'll do set state. Let's do our character states and we'll do move state.

All right. So if we want to test our changes back in our browser, if we try to provide some input, we'll see our character moves around and we have our warning message about trying to change to an unknown state. So now we need to create our move state. So in our character folder, let's make a new file. We're going to do move state.

I'm going to come over to my idle state. I'm going to copy all the code from here and paste into our move state. We'll update our class name. We'll do move state. Let's update our name.

And so we'll do move state. And so now we need to tell our player class about our new state. So if we go over to player, go up to our state machine. Let's create a new instance of our state. And so we'll do new move state.

Now if we save, we come back to our browser. If we provide our input, our player will start moving on our screen. And we can see our code for changing our state is working properly. So now back in our move state, now we need to update our logic here to have all of our logic from our player class that we were doing in our update method. So this is where we're going to check for our input and then we'll play our various animations and then actually move our player around our scene.

So for our move state, we don't need to do anything when on enter is called. Uh for this we'll just rely on our on update method and we'll figure out which key was being pressed and then do the relevant logic. So we'll get rid of our on enter method. Let's come back to our player class. Let's grab all of our code from our update method except for our state machine update and we'll paste that over on update.

So we'll remove that from our player class back in our move state. Let's paste all that code here. We'll get rid of our new controls line. We'll keep our old one. And now we just need to update our references.

So instead of doing this play, we'll do this our game object. Now we need to copy over our methods for update velocity and for normalize velocity. So back in our player class, let's copy those two methods. Let's paste them in our state class. And now we just need to update our references.

So let's copy this. ame object. We'll update our references. We have this game object. This game object set This game object set flip.

And so now down in our update velocity method, we want to do this game object our body. And then same thing for our other our other properties. So now back in our player class, let's get rid of those methods from our from our class. This now one last change we'll want to do is when there's no input being provided, instead of playing our idle animation, now we want to transition back to our idle state. So let's grab this code here and we're going to move this up before other checks.

So let's copy this. We come up here after we grab our controls. So now if no input is provided, now we want to go to our idle state. So, let's jump over to our idle state. I'm going to copy our code here before we change our states.

Come back to our move state. Let's get rid of this animation playing. And we want to change to our idle state. All right. So, now back in our player class, we should just now have our code in our update method for calling our state machine update.

Then we just create our new states here. Oh, let's get rid of our logic here for we play our idle animation. We want to rely on our idle state to do that for us. So, if we clean up our imports, let's save. And now come back to our browser.

We should be able to test. All right. All right. if we start moving our character around, we'll see right away that we change from our idle state to our movement state. And if we keep our key pressed, we'll see we stay in that state.

But the moment we stop providing input, we transition back from our move state to our idle state. And we call on enter. And then we can also see that our animations are now playing for our player. And so now we have our idle animation. And as soon as we start moving, now we're playing our various walking animations.

Now that we have our base states in place for our idle and movement, we're going to work on creating a few components for our animation, speed, and direction of our character game objects. currently in our idle state, when we want to go to play one of our animations for idle, we have a to-do where we need to update this to handle our player's direction. So, as an example, if I go right, our player should still face right and do our right idle animation after we let go of our input. In addition to this is we want our idle state to be reusable across our various characters. And right now we have a hard-coded animation tied to our player's animation keys.

And instead we want to add this to a component. So then that way we can grab our animation keys from that component and play the various animations. And one other change we'll do is over in our move state when we move our player and we normalize our velocity with our speed. We have a hard-coded value of 80 for our player speed. And we want this to be configurable uh per character.

And so by creating a component for that, we'll be able to support that. To start creating our new components, let's go into our source folder under our components folder under game object. Let's make a new file. We'll do speed component first. For this, I'm going to go into our controls component.

I'm just going to copy all of our code. I'm going to paste it over here. So let's update our class name. So instead of controls component, we'll do our speed component. now on our class, instead of having an input component, we'll have speed.

This is going to be a number. Let's update our references. And for our getter, we'll do speed. And then we'll update our constructor. Let's update our imports.

And so now to make use of our new component, let's jump over to our player class. We need to create a new instance of our component. So let's add a new property to our class. So we'll do speed component. After we create our controls, we'll do this.

We'll do our speed component will be equal to our new speed component. We'll do this. And now we need to provide our speed. So let's do our 80 here. And then on our player class, we'll need a way to get our speed from our player.

So let's add a new getter. So after our controls, let's do get we'll do get we'll do speed. We'll return our speed number. So now for our return value, we'll do this, our speed component, and we'll reference our speed property. So now instead of hard coding our 80 here, we're going to move this to our configuration file.

So then we have all of our configurations in one spot. So, if we go into our config file, let's export our new const. We'll do export const. We'll do player speed. We're going set that equal to 80.

Come back to our player class. Now, let's reference that new variable. We'll do speed. So, we'll do player speed. All right.

So, we saved. Let's go over to our move state and let's reference our new component. let's get rid of our speed from here. And now, let's do this. We'll do our game object and we'll grab our speed value from there.

So now back in our scene, if we move our player around, we'll see our player still moves around at the same speed. If we jump over to our config file, let's bump this down to 40. And now our player should move, and it should be much slower. All right, so let's go ahead and revert that back to 80 and we'll save. Now for our player, let's create a component to keep track of our player's direction uh when they move around our game.

So under our components game object folder, let's do a new file. Let's do direction component. Let's copy all the code from our speed component over to our direction component. We'll update our name. And so instead of speed component, we'll have direction we'll have direction component for the property on our class.

We'll do direction. And now for our type, we need to define a new direction type. So let's go into our common folder. Let's make a new file. We do common.

Ts. Let's do export const. We'll do direction is going to be equal to an object. And now we'll just have our four directions. So we'll have up, down, left, and right.

For the values in our object, let's just match our keys. And then we'll do as const for our object. And now for our direction object, let's create a type to reference our values here. And so over in our types file, we'll do export type. We'll do direction.

And this is going to be equal to our key of type of our direction. All right. Then finally, we're going to add a utility function for validating if a string is actually one of our directions. So in our utils file, let's make a new function. We'll do export function.

We're going to do is direction for this. We'll expect a string. So we'll have direction for our argument. It's going to be a string. And now for our type, we're going to do direction is direction is direction.

So then all we'll do in here is we'll just return. We'll make sure our direction object actually has this property from direction that was provided. If it doesn't equal undefined, then we know that the string that was provided is one of our valid directions. For the time being, we won't use this function uh but we'll need it later on in our code. So now with our new type, we can come back to our direction component.

Let's update our reference here. So from number, we'll do direction. It's now our constructor. Let's get rid of our speed argument and we'll just add a default value for our direction. And so we'll just default to the direction down when we create an instance of our component.

For our getter, we'll do get direction. This will return our direction type. Now let's add a setter for setting our direction. So just going to copy this here. We'll paste it.

Get rid of our return type. And now for our argument we'll do direction. We'll set our type to direction and we'll do this direction will be equal to the direction we provided. And we'll change this to be our setter. Now let's save.

So now for our direction component. So for our direction component, one other change we're going to do is we're going to add in an argument for a call back for when our direction changes. So when our direction changes in our game, we'll be able to register a call back and then do different business logic when this happens. To keep track of that, let's add a new property to our class. We'll do call back.

For our callback, we're going to receive one argument and this will be the direction of what just changed. And we'll return void. Let's add in our argument. And so we'll do on direction call back. And we want this to be optional.

And so we'll just default to an empty function that just returns undefined. So we'll add that to our property. So this callback will be equal to our on direction call back. And now when we do set direction, we'll call that call back. And then we'll provide our direction that was just set.

So now that we have our new direction component, let's jump over to our player class. And we want to create an instance of our component. So after our speed component, let's do direction component. Let's create our instance. We'll do this direction component is equal to a new direction component.

We'll pass in our player. And now we're going to want to add some getters and setters so we can easily get that value. after speed, let's do get direction. I'm just going to copy this here. We'll do direction.

This is going to return our direction and so reference our direction component and we want to reference our direction property on it. We'll also add in a setter for setting this value. So I'm going to copy this. We go ahead and paste it. We'll do set direction.

We'll have our value which will be our type of direction. We won't return anything. And now we just want to update the direction on our component to be equal to that new value that was provided. Now that we have our new direction component on our player, we can update our movement state to use this when we move our player around our scene. So, let's open up our move state file.

And in our on update method when we're handling our player input, this is where we'll set our direction. Uh to do this, we'll add a new method to our class. And so, for this method, we're going to call this update going to call this update direction. So, for this method, uh we're going to expect one argument. We'll have direction, and we won't return anything from this method.

And so we'll do this our game object. Our direction will be equal to the direction we provided. All right. So now we just need to update our code to use our new method. And so we'll come up to here where we update our velocity.

And let's do this. We'll call our new method. We'll do update direction. New direction up when the up key is pressed. Let's copy that.

We'll do down when the down key is pressed. Now down here when left is pressed, we'll pass in our direction left. And now let's do right. So now if we save, let's jump over to our idle state. And before we update our idle animation here, all we're going to do is we're going to log out our player's direction when we stop just to make sure our code's working.

So we'll do this our game object. We'll grab our direction. Let's save. And so we'll see right when our scene refreshes. We log out down.

Now, if we head to the left, we'll see our player's directions left, right, and up. Nice. So last thing we need to do is now we just need to update our animations to use our direction when we want to play our various animations. To do that, we need to create our new animation component. All right.

So for our animation component, let's go into our source folder. Let's go into our game object components. Let's do new. We'll do an animation do an animation component. Let's copy over our code for our speed component to our animation component.

We'll update our class name. We'll do animation component. All right. For our animation component, we need a way to map our players animation keys to something that's a little bit more generic. As an example, right now for our player's animation keys, this consists of player walk down, player walk up, player walk side.

And if we want our component to be reusable uh for any uh character, so as our enemies, we need a way to map these keys to a generic configuration. So then that way we can just pass in our generic configuration here in our idle state. And what we'd want to do is we want to pass in something like idle followed by our direction that we just created. And it be like left. And so in this configuration, we need to map this key to our key for our game object.

So that way we play our correct animation. Uh so as an example here, let's say if we want to do walk left for our player, for our player, this would need to map to our player walk side animation here. But then for a different object type like our spider, we just have this generic spider walk animation and that's the one we'd want to play. So in our component, we need to be able to support passing in this configuration. So we map to the correct uh animation uh for that game object.

And so to support that, we have this generic mapping here called character animations. What this mapping has is for our various animations we want to play, we have that as a prefix with the direction that we want to uh play our animation for. So what we'll do is for our player, we're going to pass in this configuration object that's going to have these keys of like idle down, idle up, idle left. That's going to map to our player's animation keys here for player walk down, player walk up, and player walk side. So to add in support for that configuration back in our animation component, let's remove our speed from our arguments.

And we're going to change this to be config. And we'll define a new type. And we're going to call this animation config. Let's copy that. We'll come up to the top of our file.

We'll do export type. We'll set equal to our animation config. And now in our object for our keys, we want our keys to map to our keys here on character animations. And we want these to be optional since not all uh characters need to do the same animations. As an example, for lifting objects up, our player needs to be able to do that, but our spider enemy will not need to do that.

So to make these optional, we'll do key in our character animations. And so we'll make this optional. And then now for our type here, this is going to be an object. For our object, we'll want to be able to pass in this configuration here that we're currently using for our animations. So we'll need to know which key we want to play if we want it to repeat.

And then we want to do ignore if playing. So back in our object here for our type, let's do our key. It's going to be a string. We'll have repeat. This is going to be a number.

And we'll do ignore if ignore if playing. And that'll be a boolean. So now let's add this property to our class. We'll get rid of speed. We'll do config.

Our type will be our animation config. Let's do this. config. We go to the config we provided uh in our constructor. And then we'll go ahead and get rid of our getter.

For our animation component, we'll want to expose three methods. One for seeing if an animation is currently playing, one to actually play an animation, and then one to get an animation key to see if it exists on our configuration. We'll start with our method to see if an animation is playing. So we'll do public. We'll do is animation animation playing.

This will return a boolean value. And we just need to return this our game object, our atoms property. Then we'll do is playing. So since our game object is currently typed to either an image or sprite game object, we're going to override our default value for our game object on this component to point to a sprite. To do that on our class, let's add protected.

We'll do declare. Now we need to override game object. Now for our game object type, we're going to do phaser game objects sprite. Next, for our method to see if an animation key exists, we'll do public. We'll do get animation key.

For this method, we'll expect one argument. We'll expect our character animation key we want to check for. And so for our type, this will be a character animation. And we'll either return a string or undefined if it doesn't exist. So now we just need to check to see if this exists on our configuration.

So we'll do if this our config and then our character animation key that was provided if it's equal to undefined. So that key doesn't exist we'll return undefined. Otherwise we'll return that value. So we'll do this our config our character animation key. And now we'll grab the key from that object.

Finally for our method for play animation let's do public. We'll do play animation. So now for this method we'll need our character animation key for which animation we want to play. So let's copy this. And one other argument we'll add is we're going to add in an optional call optional call back.

And so this callback is going to be used for once our animation is finished, then we can invoke any code that we want only when our animation is done. Uh so for this method, we won't return anything. So first we're going to make sure our animation key actually exists. We're going to copy this line of code here. If it doesn't exist, we're going to check to see if our callback was defined.

If it was, we'll call it. And then we'll just return early. If our key does exist, now we want to play our animation. So we're going to do this. We'll do our game object.

We'll do play. And now we need to provide the animation configuration that we want to use. And so we're just going to call this animation config. And we'll define that in a second. And now we want to specify if we want to ignore playing.

So we'll do this. We'll reference our config. We'll do our character animation key. And then we'll reference our ignore if playing. So now for our animation config, we'll do const.

We'll do animation config. And for our type, this is going to be a phaser types animation. And then we want to do play animation config. So for this, we'll have our key. And so this is going to reference our key uh from our object that we look up.

So let's copy this. We'll paste it. And we'll reference key. Now we'll do Now we'll do repeat. And then one other property we'll set is we're going to set our time scale.

And we're just going to have this default to one for any animation we play. One last thing we want to do is if our callback is provided, we need to register an event listener for once our animation is finished, then that way we can call our call back. So let's do if our call back is provided. And now to register our event listener, we need to go on our game object. We want to use the once method to register a one-time event listener.

And now we need to define the animation key. We'll define that in 1 second. And then in our callback for this event, we just want to call our call back we defined. So now the event we want to listen for, we're going to set that to our animation key. And this is going to be a phaser, our animations, our events, and this will be our animation complete key combined with the key of the animation we're playing.

This particular event will be fired only when this animation is done playing. Now that we have our animation component set up, let's jump over to our player class and let's create an instance of our animation component. So up on our class, let's add a new property to keep track of this. So we'll have our animation have our animation component. For our type, we'll do our animation component.

And down here, we'll do this. Our animation component is equal to a new animation component. now we'll pass in the instance of our player. And now let's define a new object. We'll do animation config.

And we'll define that up above. So we'll do const our animation config. Let's add in our our type. So now on our config, now we need to provide our keys of the animations we want to support. And so we'll have walk down.

And then this be typed to our object. And so for our key, this will be our player animation keys. And then walk down. We'll do repeat. We want this to be negative one because we want this to repeat.

And then ignore of playing. We'll set to true. So we copy this. We need to do our four directions. And so we're going to have walk down, walk up, walk left, and right.

And now on our player animation keys, we'll want to do walk up. And then we'll want to do walk side. Now, we want to do the same thing for our idle animations. So, we're going to copy all four of those. And we're just going to change this to be idle.

So, I'm just going to copy that part and we'll paste part and we'll paste it. Now, for idle animations, we'll do idle down, idle up, and then we'll do idle idle side. And we'll keep the same settings because we want our idle animation to repeat and we want to ignore if playing. Finally, in our player class, let's add a getter for returning our animation component. So we'll do get we'll do animation animation component for our type.

We'll return our animation component and we'll do return this our animation this our animation component. Now let's jump over to our states and we'll start updating those to use our new component. So now in our idle state when we go to play our animation now we should be able to reference our game object. We can reference our animation component and now we can do play animation. And so now for our animation key now we want to use our generic character animation key.

So this is going to have a prefix of idle and then we want to use our character's direction so we play the appropriate animation. So we're going to do this our game object and then our direction. So now let's remove our console log and our other animation line. We'll save. All right.

So if we save and we move our character on our scene, we'll see as soon as we let go of our keyboard, our character plays the appropriate animation for the direction we are facing. Now we just want to make that same change in our move state file. So let's copy this line of code. We'll open up move state. And now anytime we play an animation, we want to base that on our direction.

So a good spot to do this will be down in our update direction method. So let's paste our code down there. And now for our prefix, we want to do walk. And then we'll use our game objects direction to play the correct one. All right.

So now we just need to remove our code where we play our other animations. So up in our on update method, let's get rid of our two animations here for when we do up or down. But then down in our checks when we're moving left and right, we need to move our update direction call to be inside our if statements here. So, we'll do this. Let's remove this.

And then we'll do the same thing for right. And now, if we save back over in our game, we should be able to move our character. And as we move in our various directions, we play the correct animation. And so, by setting up our component this way, we made it so our states are now reusable across all of our game objects. So, currently this works with our player, but once we go to add in our enemies, like our spider and our wisp, we'll be able to play our animation with our generic name here, and our code will just work.

Later on, if we ever want to add things like NPCs, we could reuse these same components and have those characters move around our scene as well and play their animation types. Now that we built the foundation for our player, including movement, input handling, and a state machine, it's time to introduce some challenge to our game by adding enemies. Enemies will bring our world to life, giving the player obstacles to overcome, making the game play more engaging. Just like our player, our enemies will have their own unique behaviors, movement patterns, and interactions. In this section, we'll start by creating a simple enemy, implementing movement logic, and gradually expanding their functionality using the same structured approach we use for the player.

By the end of the section, we'll have two different enemy types that our player will need to react to in our game. Let's get started by creating our first enemy, the spider. To start, let's make a new file for our spider class. Under our code, under game objects, we'll make a new folder. Let's call this enemies.

We'll add a new file. We'll call it spider. And for the time being, I'm going to copy over all of our logic from our player class into our spider class. Let's update our class name. We'll do spider.

And let's update our type for our configuration. We'll do spider spider config. And then we'll update our type down in our constructor. So now for our spider class, this is going to reuse a lot of the same logic that we used in our player class. Our spider will also be an arcade physics sprite.

So we'll need things like our spider's position, which animations to use, our asset key. We'll need to enable physics. And since we have our animations, we'll need our animation configuration of what animations to play. Finally, we'll want to use similar components in a state machine so our enemy can move around our scene and have a different behavior type than our player because we want this to be controlled automatically. So, since a lot of this logic will be the same between our two classes and our other enemy that we'll add, it makes sense to abstract away this logic into a parent class that both of these classes will be able to inherit from.

So to make that change, let's go into our game objects folder. And so let's add a new subfolder. We're going to call this common. Now under here, we'll make a new file. We'll call this character game object.

So let's copy all of our code from our player class into our character game object class. Let's update our class name. And so we're going to do character game object. And now for our character game object class, we want this to be an abstract class. And that way we don't create an instance of this directly.

So now for our class, we just need to make this more generic so it's reusable between our two classes. First, we'll start with our properties. We don't want this to be private. Instead, we'll want this to be protected. So then that way we can use these in our child classes.

So reach our properties. Let's just add the protected keyword. We'll remove our prefix for remove our prefix for private. Then we're just going to add an underscore just so it's very clear that these are protected properties on our class. class.

Next, in our constructor, instead of doing player config, we're just going to call this character call this character config. Come up here. We'll update our type definition. Next, for animation configuration, we'll want to pass this in to our constructor since this is going to vary between our game objects. let's copy this.

We'll come up here. Let's add an animation config. We'll add our type for animation config. Let's remove our configuration from here. Now, for our components, we need to update our references.

And so, we'll just change our names to have our underscore Let's update our reference to our animation config. So this will come from our config argument. Now we need to do our speed. So instead of referencing our player speed, we'll pass that in as well. So we'll add a new property.

We'll do speed. This will be a number. Down here we'll just reference config. sp speed. And actually since we're destructuring our config object here, let's actually grab those from here.

So we'll have speed and then we'll have our animation config. And that way we'll keep our code consistent. Next, let's update our reference for our input component. Instead of doing controls, we're just going to call this in input component. We'll also grab that from our config when we dstructure it.

And let's update our reference here. Now for our state machine, let's update our name. And so we'll have this underscore state machine. And now we need to provide an ID for our state machine. So we'll add that as a property.

And so we'll have ID. We'll make this an optional string. And then we'll pass in our ID if it's provided. So we'll need to grab that from our config object. Now, let's remove our update logic here since we only need that in our player class.

So, now let's update our getters and our setters. And so, we're just going to update all of our references. Then, finally, in our update method, then we're just going to add the public keyword to our update method. Finally, we just need to update our states to no longer reference our player class. Instead, our type is going to refer to our character game object class.

Let's copy our class name. We'll jump over to our idle state. We'll need to go into our base character state to update it here first. And so for our type, let's change this to be character game object. We'll update our constructor.

We'll remove our import. So now back in our idle state, we can update our type reference update our type reference here. And now let's do the same thing in our move our move state. All right. So if we close our states, let's come back to our character game object class and we'll just update our imports to remove our unused imports.

And let's save. And then one last property we're going to add is we're going to add a property to keep track if this game object instance is actually our player or not. So we're going to add in a protected property and we'll do is player. We'll make that a boolean. We'll add that to our configuration.

And so we'll do is player and it'll be a boolean. Now we just want to set that value. So we'll copy is player. Then down at the bottom of our constructor, we're just going to add in a spot for general configuration. We'll do this.

Our is player is equal to is player. Finally, we're just going to add a getter to check to see if this is an enemy. And so we'll do get is enemy. This will return a boolean value and we'll return not this is we'll return not this is player. Now that we have our new base class, let's start off by updating our player to make sure our code still works.

So if we jump over to our player class, we want to update this to extend our character game object class. And so we'll do extends. We'll do our character game object class. Let's start off. We'll remove our properties since these will be on our base parent class.

So now when we call super now we need to provide our configuration. And so first I code down here. We're going to do super. Now for our object we're going to expect our scene. So let's pass in our scene.

We'll grab that from our config. cene. We'll need our position. And so we'll do position. This will be equal to our equal to our config.

Position. And now for our asset key. Instead of passing in our asset key for our player, we're just going to add that here. So let's do our asset keys. We're going to do player.

For our frame we'll do zero. Our ID. Let's do player. We'll set is player to be true. We need to pass in our animation config.

And then for our speed, we'll do our player speed. And finally, for our input component, we'll do config and we'll reference our controls. So now for our code to work properly, let's grab our animation config. And we're going to paste that up here before our super call. And then let's remove our code up here.

So now let's remove our logic here for our physics and our animation configuration. We can remove our components since these are added on our parent class. And now for our state machine, we don't need to create our state machine instance, but we do need to do our calls where we add in our various states. And so we'll add in our idle state. We'll add in our move state.

And then we'll also set our initial state. Finally, we want to keep our event for doing our auto update call uh for our class. So now let's get rid of all of our logic here for our getters and our update method. And then finally, let's update our config up here. So we won't need our asset key.

We won't need our frame. So now if we come back to our game scene, let's update our references for our player. We'll get rid of our frame and our asset key. All right, if we jump back to our player class, one change we need to make in our base class is we need to remove our lines of code where we set our states for our state machine. All we want to do is create our state machine instance and then we'll rely on the child classes to actually add the states that are appropriate for that game object.

All right, so finally, let's clean up our imports that aren't being being used. And now if we save our code, let's come over to our browser and we should be able to test. And so now if we move our player around our scene, we should see that our player's animations and our directions are still working just like before. All right, so now that we've verified our base class is working, now let's copy all of our code from our player class over to our spider class and we'll update our configuration to point to our spider. So for our config, let's do our spider config.

We'll update our class name to be spider. And so now for our spider, let's start off with our animation config. For our spider, we'll need to add this into our preload scene. let's open up that file now. And we need to copy this line of code here from our create animations.

And we want to do the same thing we did for our player. we'll do asset keys. We'll do spider. And so, just like our player, we have an a sprite file that has all of our defined animations. And we're just going to create those animations from that file.

Back in our spider class for our spider, we only have one animation. And this is going to be our movement animation that we're going to play for both walk and idle. And so to make our config a little bit more simpler, we're just make a new variable. Do const. We'll do anim We'll do anim config.

We're going to set that equal to one of our objects here. So let's copy this. Now for our reference, we want to do our spider animation keys. And we want to do walk. Now we can just update all of our other keys to point to this object here.

Next, in our super call, let's update our reference. So for our asset key, we want to use spider. So now for ID, we're going to have multiple instances of our spider game object. So we don't want to just do spider for our string. Instead, we want to add in a UU ID so it's unique per instance.

To do that, we'll just add a suffix to our spider string. And we're just going to reference our phaser, our math, our random, and we'll do a UID to make this unique per spider instance. So now for is player, we want to set this to be false. Now we need to add a variable for our enemy speed. So, if we jump over to our config file, I'm going to copy this line of code here for our player speed.

We're just going to change this to be be enemy spider speed. And now for our value, we'll just leave it at 80 for the time being. Let's save. We'll come back to our spider class. Let's update our reference.

And now we need to provide our input component. So, instead of relying on our controls from our game scene, we're going to create a new instance of our input component. And we'll pass that to our parent class. Now, finally, for our state machine, we'll have an idle and we'll have a movement state. And we want to start off in our idle state.

And then finally, let's remove our event listener for we listen for our update event. For all of our enemies, we're going to end up adding these two groups. And we'll let our phaser group later on be responsible for running our update method. So now let's just clean up our unused imports. And now what we should be able to do is if we jump over to our game scene, we should be able to create an instance of our new game object.

So after we create our player, let's do new. We'll do a new spider. Now for our configuration, I'm just going to copy our configuration from our player. Let's paste that in. Let's get rid of our controls.

And now for our position, we're just going to add 50 to our Y value so it's not on top of our player. And now we just need to fix our configuration. So if we come back to our spider class, let's remove controls from our spider config. So now we save. If we come back over to our browser, we should see that our new character game object type's been added.

And so we have our spider and we're playing our idle animation for our spider. Next, for our spider enemy, we're going to work on implementing a very basic AI where we're going to have our spider just scurry around our level. Our spider is going to choose a random direction and then move in that direction for a set number of seconds and then it'll pause and then change direction and move in that other direction. And so to add in this functionality, ship over to our spider class in our constructor. After we create our state machine, we're going to add a new phaser time event that will be triggered after a set number of milliseconds, which will be our trigger to start moving our spider around our game.

To do that, we'll reference this. We'll reference our scene that our game object is tied to. We'll reference our time for our clock plugin. And then we're going to do add event. So now for our event, we need to pass in our configuration.

And primarily for this, this is how long we want to wait before we trigger our call back. So for this, we're going to add in a delay. And for this, we want this to be a little bit random. So we're going to do phaser. mmath.

And we'll do phaser. mmath. And we'll do between. And now for our minax values, let's do 500 milliseconds. And then we'll do 1500 milliseconds.

Next, we need to provide our call back. And so for our call back, we're going to add a new method to our class. And so we're going to do this. And we'll do change direction. Next, we'll provide our callback scope.

We'll reference this for our spider instance. Now, finally, we want this to be a one-time event. So, we're going to set loop and we're going to set it to be false. So, now let's add our change direction method to our class. And so, we'll have our private method.

We'll do change direction. Now, for this method, we won't return anything. So, now when our change direction method is called, we want to wait a number of milliseconds. So then, that way our spider will pause before it starts moving in our other direction. To do that, we're going to use our scene time again.

And now, we're going to do a delay call method. Now we can provide how many milliseconds we want to wait before we do this delayed call. And so we're just going to do 200 milliseconds. And now in our callback now we want to choose a random direction to have our spider move. Let's make a new variable to keep track of that.

So we'll do const. We're going to do random direction. We're going to set equal to our phaser. We're going to do math between between again. And now we want to choose a value between zero and three.

And then these are going to refer to our directions. And so now we just need to check that value. And depending on that value, we need to set that direction for our spider. So we're going to do if we're going to do our random direction. If it's equal to zero, then we want to move in our up direction.

So to actually have our spider move in our scene, we need to use our controls component that's tied to our game object instance. So we're going to do this. We'll do is up down and we're going to set this to be true. what we're doing here is for our spider game object, we just have a generic input component. That generic input component allows us to control which direction our game objects will move by setting our values directly on our controls.

So for our player, we have our keyboard that our player is going to provide input to and move our game object around. One way to think of this is our simple AI is using a pseudo keyboard to move our enemy game objects around our scene. And we just do that by controlling our directions through our code. So now for our random value when it's zero we're just going to say hey our spider is going to move in the up direction. Now we want to do the same thing for other values.

So I'm just going to copy this logic here and we're just going to do else just going to do else if. And then finally we'll have else. And now we just want to do our other direction. So now we just want to do our values. We'll have one, we'll have two.

And then finally if it's three we go in our other direction. So now we'll do is up down. We'll do is right down. We'll do is down down. Then we'll do is left down.

So, one last change we want to do on change direction is we want to reset our controls when our callback is first called. So, we'll do this. We'll do reset. And now we'll do save. And so, if we want to test our code, we need to call our update method for our spider class.

To do that, let's jump over to our game scene. Let's add in our update method for our method for our scene. And now, we just need to store a reference to our spider so we can call our update method on our game object instance. So, let's come out to the top of our class. We'll add in of our class.

We'll add in spider. Let's store our reference. So, we're going to do this. We'll do our spider is equal to our new spider. Now, let's do this.

We'll do our spider and we'll call update. All right. So, if we save our changes, let's refresh in our browser. What we should see is eventually our spider should choose a random direction and start moving in that direction. And if we refresh, we should see another direction uh being provided.

So, now we have our base code working back in our spider class. After we do our time delayed call here, we need to add another time event to call our change direction. So then that way our spider will keep changing direction in our scene. To do that, I'm just going to copy this line of code here where we do our add event. So in our delayed call here after we update our controls, let's go and paste that in.

And now for our callback scope, we want to do this. All right. Now, if we go ahead and save. All right. So if we refresh, what we should see now is our spider should start moving.

After so many milliseconds, it pauses. It moves in another direction. And now it repeats that pattern. Nice. now we have our base code working for our spider movement pattern.

We want to update our spider game object to actually rotate in the direction that our spider's moving. Another thing we want to fix is we want to keep our spider within the bounds of our current scene. And so to make that quick change, if we go to our game scene after we create our spider, we can do this. We'll reference our spider and then we'll call set collide world bounds and we'll pass in true. All right.

Okay. So, what this method does is this makes it so that our physics body for our game object will collide with the bounds of our current game. So, now what will happen is when our spider reaches the ed edge of our game scene, it'll stop moving and won't be able to move off our screen. So, now to address the issue of having our spider game object face the direction that it's moving, we need to use our direction component. So, on our direction component, we have this callback that we can provide.

And after we change our direction, we can then listen for that call back and then rotate our spider's game object body. So unlike our player where we have different frames for facing our various directions, our spider only has one direction. It's always down. And so in our code, we're going to need to update it so we can rotate our game objects body to face in the direction that we're moving. And so now to provide this call back for our direction change, we're going to add a setter to set this call back on our component.

So let's add in set. We'll do call back. It's now for arguments. We want to provide our call back. So we'll do call back.

And then we're going to set our type to our type up up here. And now we can just do this. We'll do our call back. It's going to be equal to the call back that was provided. Now back in our spire class, now we can register a call back for when that happens.

So we can reference our direction component. We'll call back. And now we want to set this to a new callback. And so we'll have our direction, which will have our type direction. And so now when this is called, we're going to have this call a new method on our class.

We'll do this. We'll do handle direction change. And then we'll pass in our direction. So now in our class, let's add in that new method. So we're going to do handle direction change.

We'll have our argument of direction. And we won't have this method return anything. And now based on the direction we receive, we want to rotate our game object to face in that direction. To do that, let's add in our switch statement. We'll switch over our direction.

And so for our first case, we'll have direction down. And so we'll do this. We'll do set angle. And so we'll do 0 degrees for our angle. And now we'll do break.

And now we just want to do our other directions. we're going to copy this. We'll paste it three more times. And so we'll have up. Then we'll have left and right.

And now for our values. When we're facing up, we want to rotate our game object in the other direction. So we're do 180°. When we face left, we're going to do 90°. And then we'll do 270 when we face right.

Finally, let's add in our default statement. For this, we'll do our exhaustive guard and we'll do direction. now, if we save, we've come back over to our game, we should see as soon as our spider starts moving and we change our direction, our spider now faces in that direction. Much better. So now that we have our basic movement working, we're just going to move some of our values here from our class into our config file.

So then we have all that in one location. So let's open up our config. ts file. And while we're here, let's turn off our logging. Uh since while our spider's moving, we keep logging out all that information.

And now let's add in some new values for our spider. So I'm going to copy this line of code here. We'll paste it. And so we're just going to do enemy spider. And for our first variable, we'll do change direction delay direction delay min.

And so this will be our 500 milliseconds. Let's copy this. We'll paste it twice. And now we'll have delay max. And this will be our 1200 millisec.

This will be our 1500 milliseconds. And now we'll have delay. And we'll do weight. And this will be 200 milliseconds. Now back in our spider class, we can update our references.

And let's go to where we have our 500. We'll have our min value. Now we'll have our max value. And now we just want to come down to our uh change direction. And we want to update our value here.

So we save our code. Our spider should still move around our scene and everything should still be working. Now that we have our core logic in place for our spider enemy class, we're going to work on our second enemy type, our wisp. Our wisp is going to have a different AI pattern where it's going to bounce around our screen and as it collides with objects, it's going to change direction. And so for our wisp, we'll be relying on our phaser arcade physics to have our game object bounce around our screen.

For this particular enemy, we're going to make it so that this enemy is invulnerable where our player once we're able to attack, we won't be able to actually do any damage to that enemy. However, the enemy, if it collides with our player, will take damage versus our spider enemy once we can attack, we're going to have our spider enemy take damage from our player. And so, we'll be introducing a new invulnerable component to keep track of this. To get started, let's create a new class for our wisp enemy. So, under our folder, under game objects, under enemies, let's add a new file.

We're going to call this wisp. Let's go into our spider class. Let's copy our logic from here. We'll paste it into wisp. Let's remove our logic for our change direction and handle change direction.

Let's get rid of our time event and we'll get rid of our change direction uh from our component here. Let's update our class name and so this will be wisp. We'll update our configuration to also be wisp be wisp config. And so now down in our super call, we'll update our references. We'll have asset keys.

We'll have wisp. And we'll update our ID to be wisp. And now we want to update our speed. And so if we go in here, let's copy this. We'll do enemy wisp speed.

And for our value here, let's do 50. We'll copy that. We'll come back to our class and we'll update our reference. And now we need to update our animation configuration. So for this, we want to do our wisp animation keys.

And for our wisp, we just have our idle animation. And so for our wis type, we'll only have one state. And this will be our idle state. So let's remove this logic here. And now we just need to update our preload scene to create our new animation keys.

Go over to our preload scene. Let's copy this logic here. We'll paste it. And then we'll do wisp. And since we only have our idle state, let's remove our move state uh from our state machine here.

All right, so before we add any more code, let's jump over to our game scene and we're going to create an instance of our wisp. So if we go up to the top of our class, we'll add in a property to keep track of this. And so we'll have our our wisp. We'll come down here. Let's do this.

Wisp is equal to a new wisp instance. For our configuration, let's copy this and go and paste it. Now for our position, we'll do minus 50. And we'll also want to do collide world bounds. And so we'll copy that.

Let's paste reference wisp. And now we'll also want to call our update method. And so we'll paste that. All right. So if we save, we should see our new enemy type show up in our game.

Next, for our wisp enemy, we need to add in our logic to have our game object move around our scene. To do this, we're going to add a brand new state. So if we go into our code, let's go into our state machine under character. Let's make a new file. We're going to call this bounce move state.

Let's go into our idle state. I'm going to copy our logic from our idle state and we'll paste that in our bounce move state. We'll update our class name. we'll do bounce move state. Now we'll want to add this to our character states.

And so we'll have bounce move. Go back to our new class. We'll update our character state name here to be bounce move state. So for this particular state, we don't need to do anything on our on update method. So let's move that logic.

All right. So in our on enter method, the first thing we'll do is we'll play our animation for our idle animation. for our west enemy. This is just going to be the circle animation here. And now we'll want to update our game object's uh velocity uh based on our random direction.

So let's remove our code for resetting our game velocity. And first we'll get a reference to our game object speed. So do const. We'll do speed. It will be equal to this our game object and then our speed.

Now we want to choose our random direction. And so if we jump over to our spider class real quick, let's copy our logic where we chose our direction. So let's copy our logic where we choose our random direction. We come back to our bounce move state. We'll paste that in.

So now we have our random direction. Instead of updating our controls, we're just going to update our velocity on our game object like when we do when our player moves. To do that, we're going to do this. We'll do our game object and then we'll do set velocity. All right.

So now for our velocity, we're just going to pass in our speed for both our X and Y values. And so I'm just going to copy this line of code here. We're going to paste that for each of for each of these. And so now if we save, let's come back to our WHIS class. Let's update our state.

And so instead of doing our idle state, we're going to go right into our bounce move state. And so we'll set our state here. All right. So now we save. Oh, we have an issue.

Uh we need to import phaser into our file. And so I'm going to copy our import statement here. Let's add that to the top of our bounce move state. Now what should happen is our enemy game object should start moving around our screen. And eventually it should collide with one of our walls and then starts moving just down that wall.

So once our game object collides with our wall, we actually want it to bounce off and move in another direction. To do that, we just need to set our bounce property on our game object. So we'll do this. game object. We'll do set bounce and we're going to set it to be one.

And now if we save and we come back to our game, we should now see our enemy will now start bouncing off our walls. All right. So now we have our base logic working. We just need to update our code for we set our velocity based on our random direction. To do that, we just want to modify our x and y values and we want to multiply it to be negative to go in the other direction.

And so for our first value, if our direction is zero, we're just going to multiply our y-v value by negative 1. So it'll move in the other direction. If our value is one, we'll have both our x and y be positive. If it's two, we'll have our x value be negative. Then finally, if it's the last one, we'll have both of these be negative.

So we move it our other direction. All right. All right. So, if we save and refresh, we should see that our game object starts moving diagonally in one of our directions. And in all cases, once it hits our wall, it'll start bouncing around our scene.

Nice. Finally, for our wisp enemy, we're going to add in a simple animation where we're going to have our game object scale up and down. that way it looks like it's pulsating a little bit. So, in our code, what we'll do is let's add a tween. we're going to do this.

We'll do our scene that our game object is tied to. We'll reference tween. Let's do add. And now for our tween configuration, we want to target this game object. We want to target our scale X property and we'll do 1.

2. And then we'll target our scale Y property. We'll also do property. We'll also do 1. 2.

We'll want to set yo-yo to be true. it goes back and forth between 1 and 1. 2. We want this to repeat. And so we'll do negative 1.

And now for our duration, let's do 500 milliseconds. Now, if we save, we should see now when our game object moves around our screen, it starts growing a little bit and starts pulsating as it moves around. And if we bump our values up to something higher, we should really see the effect of this. And so, now we'll see our game object gets really big and then shrinks back then shrinks back down. And just to keep our code consistent, we're going to move these properties uh to our configuration file.

We jump over to our config. ts file. I'm going to copy our line of code here for our wisp. And so, we'll do enemy wisp. and we'll say pulse wisp.

And we'll say pulse animation. And so let's do our scale X first. So we'll do scale X. We'll set that equal to be 1. 2.

We'll copy that. And we'll do our Y value. And now we'll just want to do our duration. And so we're going to paste that line one more time. And we'll just do animation duration.

So now we can just copy these values. And so we go over to our WIS file. We'll update our properties. And we have our scale X, we'll have our scale Y, and then we'll have our duration. Now that we have our enemy moving around our scene, we want to add in our new component for being invulnerable.

So, our invulnerable component, this is going to be used by our game objects to know if they're able to take damage currently. For our WIS enemy, it won't be able to take any damage in our game, but we'll also be able to reuse this for both our spider and our player. So, for our spider and our player game objects, we're going to want a small window of time after they take damage where they're going to be invulnerable and then that way they can't take any additional damage. So, a good example is when our player collides with our wisp or our spider, we'll want our player to take damage, but then we'll want to wait 500 milliseconds before we allow our player to take any more damage. And then that way uh if they overlap with that game object again, they won't just be losing health uh consistently.

To make this new component, let's go into our code. Let's go under our components folder, under our game objects folder. We'll make a new file. We're going to call this invulnerable component. Let's go into our speed component.

We're going to copy our logic from here. We'll paste it over here. Let's make our new class name. And so we'll do invulnerable component. So now for our properties, we're going to do we're going to do invulnerable.

This will be a boolean. Let's update our constructor to pass this in. And so we're going to have this have a default value. And so we're going to do false. So now we'll update our properties.

So we have invulnerable will be equal to our configuration value. We'll update our getter. And so we'll have invulnerable. This will return boolean. And then we'll reference our property.

And now we'll also want to have a setter. So we can set this value. so we'll do set invulnerable. Get rid get rid of our return. And so for our val we'll do boolean.

And we'll do this. invulnerable will be equal to our value. And actually just updates to be value. One other property we'll add to our component is we'll want to keep track of that duration of how long our game object should be invulnerable for after they take damage. And so for this property, we're going to call this invulnerable after hit animation duration.

And so this will be our number. And so we want to pass this in through our constructor as well. So let's copy this. We'll paste that in. And so we'll add in a default value of zero.

And now let's set that property. And now we'll add a getter for this as well. So, I'm going to copy our getter. We'll copy our property name. Let's paste that.

And this is going to return a number. And now we can save. now that we have our new component, we'll want to add this to both our player and our enemies. And so, we're going to add this to our base class. So, let's open up our character game object class.

So, let's add a new protected. Let's add in our invulnerable component. Now, let's create our component instance. So we'll do this our invulnerable component equal to our new invulnerable component. We'll pass in our game object.

And now we need to pass in our properties for invulnerable and our invulnerable hit animation duration. up on our config we're going to make these optional. And so we'll have is invulnerable. And now we want to pass in that duration. And so I'm going to jump over to our component.

I'm going to copy our property name. We'll make this optional as well. and we'll have our type be a number. So let's add these to our gra from our config. And so we'll have our invulnerable after hit animation duration.

And then we'll also have our property for is invulnerable. now we can pass those into our instance. And so we'll pass in is invulnerable and then is vulnerable animation duration. Now we just need to update our child classes to pass this component information through. Let's start off in our player class.

All right. So on our player class we call super. Uh let's do is invulnerable. We're going to set that to be false. And now we just want to pass in our duration.

And so for this, we'll make a new property. We're going to call this player invulnerable. After hit invulnerable. After hit duration, let's add that to our config file. So we'll export const.

And we'll set that to be 1,00. So if we go back to our player class, let's update our import. And now we'll import. And now we'll save. Now we just need to make the same change in our spider and our wisp classes.

So, if we jump over to spider, let's set is invulnerable uh to be false on our super call. And so, for our spider enemy, we won't provide a delay for after they take damage. Uh for our spider enemies, we want these to be a very weak enemy type where once we attack them with our sword, we're going to push them back a little bit and then we want to be able to attack them again right away. And so, by not providing a value, we'll default to zero. And that's going to allow our player to keep attacking our enemy over and over again.

Now for our whisk class, we want to go down to our super call. And now we're going to add an is invulnerable, but we want this to be set to true. And then that way this enemy won't be able to take damage from our player. And so one quick change we're going to make is in our character game object class when we pass in our properties uh for our is invulnerable, we're just going to add a default of false here. And so if we don't provide a value, we'll always default back to false.

And so by adding this value here, if we ever change our component uh so we don't have a default value, we'll always provide a value in this case. Now that we have our new invulnerable component, we're going to work on adding collisions between our player and our enemies. When this collision takes place, we're going to check our game object to see if they're invulnerable. And if they are, we're going to have that game object take damage. To add in this logic, let's jump over to our game scene and we'll first add in our collisions uh between our player and our enemies.

And so to do this, we'll make a new phaser group and we're going to place our spider and our whisp enemies into it. And then that way we can just register collisions between all of our enemies in this group and our player at the top of our class. Let's add a new property. We're going to call this enemy group. For our type, we're going to do phaser.

We'll do game objects. We'll do group. Let's remove our wisp and our spider properties. So now down our create method after create our player. We're going to do this.

We'll do our new enemy group property. We're set equal to this. add. group. And now for our game objects, we're just going to paste in our spider and our wisp here.

So let's copy this here where we create our spider instance. Let's copy this here where we create our wisp where we create our wisp instance. And now in our group, one of the things we can provide is we can provide our group configuration. We're going to set runchild update to be true. And so by setting this here, we won't have to call our code here and our update method for our spider and our wisp.

Let's remove our logic here where we create our spider and our wisp instances. And what we should see is when our scene starts, we have our two game objects. And now we just need to add our collision between our game objects and our world bounds. So to do that, we're going to make a new method on our class. We're going to call this register register colliders.

We won't return anything from this method. And so on this method, we want to reference our enemy group. Let's do get children to grab all of our child game objects. And now we'll do for each. And so for each enemy.

And now for each of our enemy game objects. Now we just want to call set collide world bounds. And so on our enemy, if we try to call set collide world bounds, we'll see it's not showing up on our IntelliSense. And what's happening is right now our type is just set to our game object. But we know all of our enemies in this group are of our type, our character game object.

So what we can do is we can just make a new variable real quick. We're just do enemy game object. We're going to set it equal to to set it equal to enemy as our character game enemy as our character game object. So now what we should be able to do down here is if we do our enemy game object and now we call set collide world bounds, we can pass in true. Now we just need to call our new method.

And so we'll do this register colliders. Now back in our scene, we should see our game objects collide with our world bounds just like before. Now next in our method, this is where we'll want to add in our collision between our player and our other game objects. Now, for this, we'll rely on our phaser physics. We're going to do this, our physics.

We'll do add, and we're going to do an overlap instead of a collision. And so, now we want to reference our two types. And so, now we just need to provide our game objects. So, for our first object, we're going to do our player. And then we'll do our enemy group.

So, in our callback, our first argument is going to be our player. Our second argument will be our enemy. So, I'm just going to do a console log, and we'll just say hit. All right. So, we save in our browser.

When our player moves around our scene, we'll see hit is being logged multiple times. However, as soon as our game starts, we'll see our messages being invoked, but our enemies aren't actually touching our player. So, in order to debug this, let's go into our main. ts file. Under our physics configuration, let's turn on our debug for our physics.

Oh, and so we'll see as soon as our scene refreshes, we're going to see our physics body for our player is very large compared to our player sprite. And this is just due to the size of our frames and our sprite sheet. To fix this, we need to update our body size for our player. So, if we jump into our player class, right? So, to fix this in our constructor, we need to update the size of our physics body and our game object.

To do this, let's add a new getter to our class. I'm just going to call this physics body. And so, we're going to do phaser. And so, for our type, this will be our phaser, our physics arcade, and we'll do body. And we're going to do return this.

As our phaser. physics ararcade body. So now back in our constructor, we can do this. We'll do our physics body. And now we'll do set do set size.

And for our size, let's do 12 pixels by 16 pixels. And we want to center this. So we'll do true. So now we'll see our body's updated, but now we need to update it offset so it's more over our player. So let's call set offset.

Now for this we want to do our width. We're going to divide it by two. We'll subtract five pixels and now we'll do our height and we'll divide that by two as well. If we save, we should now see our physics body is now more aligned with our player. So now if we have our player's body overlap with our enemies, we can see now our message is being logged.

Now back in our game scene, once we have our overlap between our player and one of our enemies, we need to add a method to our base character game object class that we can call for both our enemy and for our player. So if we open up our character game object class, let's come down to the bottom of our file. Let's add a new public method. We're going to call this hit. And so when our game object gets hit, we want to know which direction the hit came from.

So then that way when we add in our push back, so like when our player attacks with the sword, we'll push our enemy back in the other direction. Uh similarly, when our player gets hurt, we want to have them move in a push back as well. So for our direction, we'll add in our type of direction. This method won't return anything. And now when this happens, we want to check to see if our character is actually invulnerable or not.

And so when we call our hit method, this is where we're going to do our check to see if our character is invulnerable or not. We're going to do if this we want to reference our invulnerable component. If we're invulnerable, then we don't want to do anything. If our character is not invulnerable, now we want to transition that character to the hurt state. And so we'll do this.

We'll reference our state machine. And now we want to call set state. And so let's do our character states. And we'll want to add a new state. And so we'll do hurt state.

And then we'll want to pass in our direction that we need to move our game object in. if we save, let's go into our character states. Let's add in our new state. And now we need to define that state. So if we go into our state machine, our states character folder.

Let's add a new state. We'll call this hertz state. And I'm going to go into our idle state. Just going to copy our logic from here. We'll paste that into our herz state.

And let's update our name. And so we'll have herz state for our class name. And then we want to pass in herz state when we call super. So now in our herz state, let's get rid of our on update method. All right.

So when we transition to our herz state, the first thing we'll do is we're going to reset our body's velocity. So let's get rid of our code before we play our idle animation. And after we reset our body's velocity, we now want to use our attack direction and push our game object in that direction. Uh, so as an example, if I swing my sword at our spider enemy and we're facing to the left, we're going to want to push our spider back in the left direction. So after we update our body's velocity, we're going to want to wait a small period of time before we reset our velocity back to zero.

And then that way, our character stops moving. Now, when this happens, we want to update our invulnerable property on our game object to be true to show that we just took damage. And then we want to wait that duration that's set on our vulnerable component before we reset that back to be false. And then finally, after we reset that property, we'll want to transition back to a state that we provide. And so to start making these changes, we're going to add a few properties to our hurt state class.

And at the top of our class, let's add a few private properties. We're going to do hurt push back speed. This type will be a number. Next, we're going to add a call back. So after our game object takes damage, we can run additional logic.

As an example, when our player takes damage, we're going to play our hurt animation. But we're also going to want to update the tent of our player to be white to show that they're flashing and that they're invulnerable. Uh so for this, let's add our property. We'll do a private property, and we'll do on hurt callback. For our type, this is just going to be our callback function, and it won't return anything.

And then we'll also want to provide our state that we want to transition to after we're hurt. And so we're going to have this be a string. Now, let's update our constructor to pass these properties through. And so, we'll have our hurt push back speed. This will be a number.

We'll have our her call back. Let's add in our type. And we're also going to make this optional. And so, we're going to set it equal to just an empty call back that returns undefined. And then, we're going to pass in our next state.

And we'll have this be optional as well. And we'll have next state. We'll set that equal that equal to our character states. And we're going to do our idle state. So, on our constructor, let's set these properties.

We'll do our hurt push back speed is equal to our hurt push back speed. Our hurt call hurt call back will be equal to our on hurt call back and then this our next state will be equal to our next state. So now in our on enter method, this is where we'll pass through our arguments for our direction. And so let's add in args and we're going to make this an unknown array. And at the top of our method, let's grab our attack direction.

So we'll do attack direction will be equal to our args and our first argument. We'll type this as direction. And so now we'll do our code where we set our body's velocity. We'll be referencing our game object body quite a bit. So we're going to copy this and we're going to store this in a variable.

So we're do const body will be const body will be equal to our game object body. And now we'll just update our references here. we'll just say body velocity x is equal to zero. And then our body velocity y will be equal to zero. So after we reset our velocity, now we want to update our velocity based on that attack direction.

So we're going to do switch. Let's do our attack direction. And so we'll have our various cases. We'll have our direction down. Let's add in break.

And now when this happens, we want to update our body's Y velocity. So we'll do body velocity. Y is going to be equal to this. And then our her push back speed. We're just going to copy that.

We're going to paste it three times. And so we'll have up and then left and left and right. And so when the direction's up, we'll want to multiply this by -1. So we go up. And now for left and right, we want this to be our x value.

And we go left. We also want to multiply by negative one. Finally, let's add in our default block. We'll do our exhaust of guard and we'll do our attack direction. now, after we update our body's velocity, we want to reset it back to zero.

And so we need to reference our game game object, reference our scene that our game object is in. Let's do time. We'll do delay call. And we're going to make a new config property for this. And so we'll do herturt push back delay.

And in our callback, this is where we'll reset our velocity. So let's copy this here. We'll go ahead and paste it. Let's jump over to our config file and we'll add in our new variable. So we'll do export const.

We'll have her push back delay and we're going to set this yield to 200 milliseconds. So now back in our herz state, let's update our import. Uh so then we have our new uh configuration. outside our check for our arcade physics body, now we'll want to update our invulnerable component. So, we're do this.

We're going to reference our game object. Let's grab our invulnerable component. Oh, so we're need to expose this on our class. So, if we jump back to our character game object, let's copy our code here for our getter and we'll update our reference to be our invulnerable invulnerable component. Now, if we come back to our her state, now we should be able to grab a reference to it.

And we're going to set invulnerable to be true. And now we want to call that on hurt callback if one was one was provided. And now finally we want to play our animation for our game object being hurt. And so we're going to do this our game object. We'll do our animation component.

We'll do play animation. We're do our character animations and we'll do hurt down. So anytime one of our characters are hurt, we're just going to play the hurt down animation. So then that way it's visible towards the player. So after we play our animation, once our animation is finished, now we're going to want to reset our property for invulnerable to be back to false.

So for that, we're going to make a new method on our class and we're just going to call this transition. And so let's add that new private method. And so we'll do transition. We want to have this method return anything. And before we reset this back to false, now we want to wait a brief period of time before we do so.

To do that, we're going to add a delayed call. So I'm going to copy this logic here. Let's go and paste it. So for our delayed call here, we want to reference our game object. We want to grab our invulnerable component.

And now we want to do that invulnerable after hit animation duration. So once that duration is reached, now we want to reset our property back to false. Then finally, outside of that callback, we'll reference our state machine and we want to transition to our state that we provide. So we're going to do set state and we'll do this our next state. And by doing this, this is going to allow our player to take damage and then start moving around our scene while they're they're invulnerable.

With our logic in place for our hurt state, now we need to update our player and our spider enemy to have this new state. So, we jump over to our player class. Let's update our state machine to have our new state. So, we'll do this. Machine, we'll do add state.

Let's do new hurt state. We'll provide our character uh for our game object. And now, we need to provide our pushback speed. For this, we'll make a new config variable. And so, we're just going to call this player.

We'll do hurt pushback pushback speed. And then we're going to add in a callback. And for the time being, we're just going to do console. log. And we'll say call back.

Let's jump over to our config file. We'll add in a new property. And so, we'll have our export const. We'll do our player hurt pushback speed. For this, we'll do 50.

And we'll also want to add this to our spider. So, let's copy this. I'm going to paste this down here. and we'll just do enemy spider push back speed. We'll also use 50 for that.

We jump back to our player class. Let's update our import. So, we have a new property. Now, we want to add in our animation configuration for being hurt. So, let's copy these four lines of code.

Now, we're just going to do hurt down. And then we'll do up left and right. And now for our animation, we want to do our hurt down. And then we'll do her up and side. And for this configuration, we don't want this to repeat.

And so we're going to set this to be to set this to be zero. Now that we've updated our player, let's update our spider. And so in our spider, we'll start with our animation configuration. I'm going to copy these here. Go ahead and paste it.

Let's do down up left and right. And so for our spider, we do have a different animation. So let's make a new config here. We're just going to call this hurt config. For our animation, uh, we want to do the hit animation.

And same thing, we don't want this to repeat, so we'll set to zero. And then we'll update our configuration down down here. And now we'll add in our new state. And so let's copy this. Go and paste it.

We'll do a new hertz state. Now for our speed, we'll reference our enemy spider push back speed. And we don't need to provide our callback uh since we won't do anything custom and our spider class. Finally, to bring everything together, we need to go back to our game scene. And now when there's that overlap.

Now we need to call our hit method on our two game objects. So we're going to reference this player, we're going to call hit and we'll provide our direction. And so we're do direction. down. And now we need to reference our enemy game object.

So we're going to copy this here. We'll paste it. And now we'll do our enemy game object. We can call our hit method. And now we're going to use our player's direction uh to push our enemy in the opposite direction.

So now we want to test our changes. Come back to our browser. And if we refresh, let's have our player run into our spider. We'll see that our player gets updated to show our hurt animation. And then our spider flashes to show that they're taking damage as well.

And as we keep running into our two game objects, we'll see there's a small delay before we play our animation. Likewise, we'll see in our console our call back message is being displayed for our player for our call back when we get take damage. But if we try running into our whisp enemy, we'll see our player plays our animation for taking damage, but our whisp enemy just keeps moving around since they're invulnerable at all times. Finally, the last thing we'll do is after our player takes damage, we're going to update the tent on our player to be white. So that way it really stands out that our player still invulnerable while they're moving around our scene.

And so to do this, we're going to be using a phaser animation tween for updating the tent fill on our game object. To do this as part of the project template under common there's this juice utils file here. This file has this function called flash. So what this function does is first we create a time event. So we have a small delay before we update our tent fill in our game object.

We then update our tent fill to be white. So then that way our image will be completely white when it's shown to our camera. And then we update our alpha property. So then that way our game object is a little bit transparent. We then add a secondary time event that has a very small delay.

And what that does is it resets our properties back to their initial values. by calling set tent and providing white again, this will reset our game object. So then that way it's back to the original color that it was and we reset our alpha. So we're no longer transparent. Finally, in our initial time event, we add in the repeat value.

Then that way we repeat this three times and then that way it flashes on and off a few times uh before we stop doing this effect. And so to use this function, we'll come into our player class. Let's get rid of our callback here. And we're just going to do flash. And we're going to provide in this for our game object.

And we don't need to provide a call back to our flash function. All right. To test our changes, let's have our player run into one of our enemy game objects. We'll see as soon as our player takes damage, our callbacks invoked and our player starts flashing to show that they're invulnerable. Nice.

With our new collision logic in place, we'll now work on adding a life component, which will keep track of our player and our enemy's max health as well as their current health. As we take damage, we'll update our life component. And once we eventually reach zero, we'll mark our character as destroyed. And then we'll transition to a new death state that we'll create. To get started, let's make a new life component.

So, under our components, under game object, let's make a new file. We'll do life component. Let's open up our speed component. We'll copy our logic from here. We'll paste it over here.

Let's do life component. Now for our class, we'll do max life and current life for our properties. Let's update our constructor. And so we'll pass in max life. And that'll be a number.

And then we'll have current life. And we'll make this be optional. And we'll set it by default to our max life. Now we'll update our properties. So we'll do this max life will be equal to our max life.

And then we'll do this. curren life be equal to our current life. Now we'll add our getters. And so first we'll do a get for life. So now we'll update our getter.

So we'll do get life. This will return our current life. And now we'll get our max get our max life. This will return a number. And so we'll return this domax life.

Finally, we'll want to add a public method for when we want to take damage. And so we'll do public take we'll do public take damage. For this method, we'll have one argument damage. And this will be the amount of damage that we're taking. And this will be a number.

For this method, we won't return anything. And so first we'll set a safeguard. So if our current life is already at zero, then we won't do anything and we'll just return early. Otherwise, we'll update our current life. And so we'll do this.

Life, we'll subtract the damage that we've taken. And now it's another safeguard where if we're below zero, then we'll reset our health back to to zero. Now that we have our new life component, let's add this to our game objects. So let's open up our base character class. For our character configuration, let's add in two new properties.

We'll do our max life. We'll expect this to be required. It'll be a number. And then we'll have our current life. And we'll make this optional.

Then down on our properties, let's add a new property for our new component. So we'll do protected. We'll do our life component. And now down in our configuration, let's grab those two properties. So we'll have max life and then we'll have current life.

Now let's create our new component. And so we'll do this. We'll do our life component will be equal to a new life component. Pass in our game object. We'll pass in max life and then we'll pass in current life.

So one other property we're going to add to our class is we're going to add a property to keep track of if our game object is defeated or not. So we'll add a new protected property. We'll do is defeated. This will be a boolean. And by default, we'll set this to false.

And down here in our general configuration, we'll do this is defeated. And we'll do false. So now we're going to add a getter to allow us to return that property. So we'll do get is is defeated. We'll return a boolean and we're just going to return this is defeated.

So now that we have our new component, let's update our hit method on our class. So first thing we'll do is we're going to check to see if we're already defeated. If we are, we won't do anything. So we'll do if this is defeated, we can return early for not defeated. Then we'll check it to see if we're invulnerable.

And then finally, before we do set our state here, we're going to go ahead and update our life component. So we'll do this. We'll do our life component and we'll do take damage. It's time to provide the damage we'll take. So let's make a new variable do damage.

And then we're going to pass this in through our method as an argument. So we'll do damage. This will be a number. So now after we take our damage, we're going to check to see if it's at zero. And if it is, we're going to update is devita to be true.

And then we'll switch to our new state for our death state. So if our life component if our life is currently set to zero, we'll do this is defeated set equal to true. And now we'll set our state. So let's copy this here. And then we'll go ahead and return early.

So let's go ahead and define our new state. So we'll go into character states. I'm going to copy this here. And we'll do death here. And we'll do death state.

We'll come back to our character game object. And now we'll just update our state name. So before we define our new death state, we're going to add two new methods to our class. So once our character dies in our game, we'll want to hide our game object from our game scene. We'll also want to make it not active.

And so that way we'll stop running our update method on our game object. To do this, we're going to add a new method for disabling our object. So we'll do public. We'll do disable object. So when we call this method, first we're going to disable our physics body so we stop triggering our collisions.

And so we'll do this. We'll do our body. We're going to do as phaser. physics physics, our arcade, and then our body. Now, we'll do enable, and we're going to set this equal to be false.

Now, we want to make our game object not active. And so, we'll do this. active. Set equal to false. And we also want to make our game object not visible.

One other change we'll do is if we are our player, we're going to have our player stay visible on our screen, but we won't have our game object be active. And by doing this, this will allow us to have our player be on our screen once we transition to our game over scene. And so we'll do if we are not the player, then we want to hide the game object uh once we uh disable it. So one other method we're going to add is we're going to add a method to enable our game objects. And it's going to do the inverse of this.

And so we're going to do public. We'll do enable object. We won't return anything. And so first we're going to see if our game object is defeated. And so if it is defeated, then we don't want to run any of our logic here.

If the enemy is not defeated, now we want to go ahead and enable our physics body and then make it active and visible. So, let's copy this here. We'll go ahead and paste it and we'll copy those two lines of code and then let's go ahead and do our updates. now we want to enable our body and we want to make our game object active and and visible. One last change we want to do before we do our death state is now we need to update our enemy and our player classes to pass in our new configuration for our health.

To do this, let's go into our config file first and we're going to define new properties for our health. Just want to copy this line here. We'll go and paste it. And so we'll do player and we'll do start max health and we'll start our player off at six six health. Let's copy this and then we'll add that for our wisp and for our spider.

And so for our enemy wisp, we'll set our max health to be one. And for our enemy spider, we'll start our max health off at two. So now if we open up our player class. All right. So for our player class on our player config, this is where we'll add in our new properties for our max life and current life.

So for max life, this will be a number. And then current life, this will also be a number. All right. So we're adding these properties on our player config. Instead of passing them through directly on our configuration here.

So then that way we can create our player instance, we can pass through our current health. By doing this later on, if we add in support from able to save and load our game, we'll be able to store how much health our player currently has. And then we create our player instance after we load our game. We can pass that through. So now if we jump over to our game scene, we'll update our player properties.

And so we go to our player for our config. Let's do our max life. And here we'll do our player start max health. And we'll set the same thing for our current health for the time being. now that we've passed through our information, we need to pass that through to our super call.

And so we'll do our max life. We'll grab that from our configuration. So we'll have our max life. And then we'll have our current life. And we'll do our config and our current life.

Current life. Next, let's jump over to our spider class. So now for our spider here, we'll just pass it through. Write down our super configuration. And so we'll do our max life and we're going to grab our enemy spider and then our max health.

Let's do the same thing for our wisp. All right. Now, if we jump back to our game scene, we just need to update where we call hit. And for the time being, we're just going to pass through one for the damage we're to receive. With our updates for our life component in place, let's create a new state for our death state.

So under our folder, let's go to our states and we'll make a new file. So under states character, we'll do death state. Let's go into our idle state. I'm going to copy our logic from here. We'll go into our death state.

Let's update our class name. We'll update our character state reference and we'll have our death state. Let's get rid of our on update method. All right. So for our death state, when on enter is called first, we'll reset our body's velocity.

After we do that, we're going to make our game object invulnerable so we'll stop taking damage. So let's do this. We'll do our game object. Let's grab our invulnerable component. We'll set invulnerable equal to true.

Next, we'll want to disable our body. So then that way we stop all collisions. And so let's reference our this. We'll grab our game object, our body. We'll do as our phaser physics arcade body.

We'll call enable. And now we're going to set this to be false. And after we do those updates, now we want to play our animation for our character dying. And so we'll do this. We'll do our game object.

Grab our animation component. We'll do play animation. For animation, we'll do our character animations and we'll do die down by default. So, no matter what direction our character was facing before, we'll have our animation uh player down animation. And then finally, after our animation is finished, now we'll want to disable our game object and then provide a callback to run any additional logic we need to do in our game.

Uh for this, we'll make a new method on our class. We'll do this and we'll do trigger defeated event. We'll add that new private We'll add that new private method. For this method, we won't return anything. And so now we'll reference our game object and we'll do disable object.

All right. So for our death state, we're going to add in one more property. And this is going to be an optional property for a call back to be invoked uh once our game object is defeated. This callback will allow us to run custom business logic like what we do in our herz state when we play our animation to have our player flash. To add this callback, we'll make a new private property.

We'll do on die call back for this. We'll just have a function that returns void. Now in our constructor, we'll make this optional. And so we'll do on call And so we'll do on call back. So for our type and now we'll set our default value and we'll have it return undefined.

So now we can set that property. So we'll do this on call back will be equal to our oni call back. And now we can trigger that call back down here. And now we'll save. Now that we have our new state, let's go into our player class and we'll create our new instance of our state.

So on our state machine, let's add in this. We'll do our state machine. Let's do add state. We're going to do a new death state and we'll pass in our game object for reference. And now we want to define our animations for dying.

So let's copy this logic here. Uh so we'll have our four her keys. We'll paste them. And now we'll do die down. And now we just update our references.

And so we'll have die and then we'll have up, left, and right. Now for our player animation keys, we'll have die up and we'll have die die side. For this animation, we don't want it to repeat. And then we'll keep ignore playing is set to true. Next, let's do our spider class.

So for our spider class, let's start with our animation configuration. Let's copy this here. We'll paste it. And now we'll have a special config uh for our death. And so we'll do death anim config.

And for our spider animation keys, we'll do death. We don't want this a repeat. Now let's copy our logic here for our keys. And now we'll do die down, up, left, and right. Let's update our configuration reference.

And now let's go down to our state machine and we'll add in our new state. So we'll do this our state machine. Let's do add machine. Let's do add state and we'll do a new test state and we'll pass in this for our we'll pass in this for our configuration. One last thing we need to do is now we need to create our death animation.

Uh so in our asset keys, we have a custom uh sprite sheet for our death animation that all of our enemy game objects will be able to use. So down in our create animations method, let's do this. We're going to do anoms. We'll do create. And now we're going to provide our animation provide our animation configuration.

So this is just using a standard sprite sheet. And so that's why we're using a different method here. So for our sprite sheet, first we need to provide our key of our asset. And so this is going to be our enemy death which will point to our sprite sheet. Now we need to do our frames that we want to use for our animation.

And for this we're going to use a utility method for generating our frame information. We're going to do this. We're going to do anoms to reference our animation manager. And now we're going to do generate frame numbers. Now we can provide our asset key that we want to use.

And we'll do enemy death. All right. All right. So, what this utility method is going to do is this is going to generate all of our frame numbers based on our sprite sheet we provide. And so, for our default configuration, it's going to use every single frame in our sprite sheet.

And so, by doing this, if we open up our sprite sheet real quick, so if we go into our images, if we go under enemies and enemy death, it's going to create an animation using these four frames here. So, after we provide our frames, next we need to do our frame rate. We'll set this to be six. And we don't want this to repeat, we'll do zero. And we'll won't have a delay, so we'll do zero.

So now with all of our changes, we should be able to test our code. So if we have our player run into our spider, our spider should take damage. And now when we run over our spider one more time, our spider dies. And we play our animation to have our spider disappear. And now we can still see their physics bodies around, but if we try to interact with it, we'll see that's disabled and our player's not taking damage.

So now if we go over to our configuration real quick, let's update our player's health to be one. So now if we have our player run into one of our enemies, we should see our player plays our death animation. And now our player gets disabled and we stop colliding with our player. All right, so let's revert our player's health back to six, and we'll go ahead and save. Now that we've added enemies to our game and given the player something to fight against, let's shift our focus to another important aspect of gameplay, interactable items.

Interactable items, chests and pots, add depth to our world, rewarding exploration and making the game feel more dynamic. These objects will allow players to collect useful items, break obstacles, and even uncover hidden surprises. In this section, we'll learn how to create and manage interactable objects, handle player interactions with them, and integrate them seamlessly into our game world. Let's jump in and start by creating our first interactable item. For our interactable items, we're going to focus on creating our base classes first, and then we'll work on adding in our collisions and giving our player the ability to interact with them.

To get started, let's go into our code. Under our game objects folder, let's make a new subfolder. We're going to call this objects. So, now in our objects folder, we'll make a new file, and let's call this pot. ts.

Ts. Let's export out our class. And for our class, let's extend our phaser physics arcade sprite. Now, at the top of file, let's add in our import. So, do import star as phaser from phaser.

So, let's add in our constructor. And so, for our constructor, we're going to expect a configuration. So, we'll do config and we'll call this pot config. Let's define that type at the top of our file. So do type, we'll do pot config.

For this, we're going to need our phaser scene that we're adding our game object to. So we'll have phaser. cene for our type. And now we want our position of where we want our game object to be at. So we'll add in position.

So now back down our constructor, let's first grab our scene and position from our config. So we'll do const, we'll do scene position equal to our config. And now let's do super pass in our scene. We'll do our position. x X our position.

X X our positiony. And now for our asset keys, we want to use our pot asset, and we'll do zero for default frame. So now in our game object, we're going to want to store the position of where our pot is placed in our game. And this is going to be important later because when our player breaks one of our pots and leaves a room and they go back to it, we want to regenerate that game object back in that original position. And so we'll want to reuse our existing game object and not have to recreate it.

So now after our super call, we want to add our game object to our scene. So we're going to do scene. We'll do add existing this. Let's enable our physics. So we'll do our scene physics.

Add existing this. And then finally, we'll update our origin on our game object. So we'll do this. We'll do set origin. And we're going to set this to zero and one.

And then we want to make our game object immovable. So then that way when our player runs into it, we won't move it around our around our scene. And so we'll do set that to true. And now we just need to update our position. So for our position, let's for our x value, this will be our position.

X. And for our y, this will be our position. y. So now we have our new class, let's jump over to our game scene, and we should be able to create an instance of it. So after we create our enemies, let's create our game objects.

So let's do a new pot. For our configuration, we'll pass in this scene. And now for our position, I'm just going to copy our property here from one of our enemies. We'll go ahead and paste that. Now, for our x value, we're just going to go ahead and add 90 to this.

And for our y-value, we won't add anything to that. And then finally, let's import in our class into our file. And now, if we save, come over to our browser, we should see our new game object is visible in our scene. So, currently, because we haven't added in our collisions, our players are able to move through our game object. Now that we've created our pot game object, let's move on to create our chess game object.

For our chess game object, let's go into our code. Under our objects folder, we'll make a new file. Let's do chest. ts. ts.

I'm going to go over to our pot. ts file. Let's copy our code. We're going to paste it over here. For our class name, we'll update this to be chest and we'll update our configuration to be chest to be chest config.

So now for our chest that we add to our game, we're going to add two additional properties we're going to pass through. The first one is going to be requires boss be requires boss key and we'll have that type be a boolean. And then for our second property, we're going to do chest state and we'll make this optional. And then we'll make a new type for this. So now for our chests that we're adding to our game, typically in Zelda games, there's two types of chests.

Uh there's the small chest, and these typically include items uh like rupees, uh keys, the map, the compass for the dungeon, and heart pieces, and different things like this. And in the dungeons, there's usually one big chest. And this big chest will usually have an item that'll be helpful to you in the dungeon for either overcoming traps, puzzles, or even the boss itself. And this chest itself usually requires the boss key in order to open it up uh in our game. And so that's what our requires boss key property is referring to.

And so how chest state will be used is typically when our player enters a room, there might be a chest that's immediately visible that the player can go and collect. There might be a chest that's hidden and that requires some type of puzzle to be solved or task in order for to show up in the game. And then if we open up a chest, we need to keep track of that state. So that way our player can't reopen it again. And then our state will determine which texture we're using when we render out our game object.

So to define this chest state, let's go into our code. Let's go into our common and we'll go into our common. ts file. Let's do export const. Let's do chest Let's do chest state and we'll do as const.

And now for our object, we'll have three properties. We'll have hidden, revealed, and open. Now for our object, we'll update our keys to have the same value. And so we'll have hidden we'll have hidden revealed. And now open.

Now we want to define our type. And so if we open up our common and go into our types. ts, we're going to do export type do chest state. This is going to be equal to our key of or type of chess state. So back in our chess.

Ts file. So now back in our chess class, let's update our import. So we have our chest state. So on our class, we're want to keep track of our two properties for our state and is boss key chest. So first let's do our state.

We're going to set that equal to our chest state. And now we'll have another property. We'll do is boss key chest. And this will be a boolean. So now for our asset key, we want to use our dungeon objects asset key.

So this is referring to a sprite sheet that has a variety of objects will spawn in our dungeon. So, if we go under our public assets folder, if we go into images, let's go into our levels, our common, and then if we open up our dungeon objects, PNG, we'll see the sprite sheet has images for things like our buttons, our small chest, our large chest, and then our doors, and then our pressure plates in our game. So, now for our configuration, we need to specify which frame we want to use. So, depending on if this is a boss key chest or not, we'll show our big chest or we'll show our small chest. To keep track of that, let's make a new variable.

Do const. We're going to do asset key. We're going to set that equal to our config and requires boss key. And so if that's true, we'll use our chest frame keys. And then we'll do our big chest closed.

Otherwise, we'll fall back to our small chest. So let's do our chest frame keys. And now I'll do our small chest closed. let's pass our asset key into here. And instead of doing asset key, uh let's call this frame key.

One other change we'll do is for our chest, instead of doing a sprite, we're just going to do an image uh since we won't have any animations uh for this game object. So now we just need to update our properties on our class. All right, we'll start off with our chest state. So we'll do this. We'll do our state and that's going to be equal to our config and our chest state.

And we'll have a fallback. If it's not provided, then we'll have our chest be hidden. Now we want to set our is boss key chest property. We're going to set that equal to config and requires boss key. Now that we've created our new class, let's create an instance of it in our game scene.

So, we go into our game scene. After we create our pot game object, I'm just going to copy this. We're going to go ahead and paste it. And let's update our reference. We're going to use our chest class.

Now, for our position, we'll do minus 90 for our first chest. And we'll do requires boss key. And we're going to set that equal to be false. Let's create one more instance. And we're going to set requires boss key to be true.

So, we create our big chest. And for our position, we'll just update our height and we'll do minus 80. All right. So, we save and come over to our browser. We should see our two new game objects.

So, one thing we'll want to do is we're want to update our body on our big chest. So, then that way it matches our sprite size. So, if we come back to our chest class after we update our configuration, let's update our physics body. We're going to do if this is a boss key chest, then we want to do this our body. and we'll do as phaser physics arcade body.

We'll want to call set size. And for our size, we're going to do 32 pixels by 24 pixels. And we'll want to update our offset. So we'll do set offset and we're going to do zero. And then we'll do eight.

So now if we save and come back to our browser, we'll see now our physics body has been updated to match the size of our chest here. One other thing we'll do for our chest class is we're going to add a new method to allow us to open up our chest. And then that way we can make sure we have the right frame associated with our chest when we open it. So let's do public. We'll do open for this method.

We won't return anything. And so first we're going to check our chest state. So we'll do this. If our state does not equal chest state revealed. Then we want to go ahead and return early.

So if our chest is already opened or if it's hidden, we can't actually open up our chest. And so we won't run any of our logic. First thing we'll do is we'll update our state. And we'll do our chest state and we'll set it to be open. And now we need to figure out which frame to use uh for our texture.

So let's copy this line of code here. We're going to paste it. And so if this is a boss key chest, now we want to do our big chest and we want to use our open frame. Otherwise, we'll use our small and we'll use our open frame. So now we can just call this set frame and this will update the frame we're using from our asset.

So we'll do our frame key and let's save. So what we do in our game scene is after we create our chest, let's call our open method on both of these. And once we save, what should happen is our chest should still be in the state where we show that our lid is closed. Reason for that is by default our chest state is defaulting to our hidden state. And so we need to provide a custom state if we want to be able to open our chest.

So, if we update this, we'll do our chest state. Let's do our chest state. And let's do revealed. If we save now, our small chest should be opened. And if we copy this, and we change this to hidden.

Let's paste this down here. Now, we should be able to open our big chest. And our little chest should still be closed. So, now we've tested our logic works. So, let's remove our chest state.

And we'll remove our call to the open method. Next, for our game objects, we'll want to enable collisions between our player and our game objects and our enemy and our game objects. For this, if we jump into our game scene, let's start off by creating a group to keep track of all of our game objects that will collide with the top of our class. Let's call this blocking group. We're going to do phaser.

We're do our game objects. Let's do our do our group. So now down here, we'll do this. We'll do our blocking group will be equal to this add group. And now for our children, let's add in our pot and our two chest.

So we'll grab our objects from here and let's move our code inside our our group. Now that we have our game objects in our group, let's come down to our register colliders method. And now we'll add our collisions uh between our player and our blocking group. So for that, we're just going to do this. We'll do our physics.

Let's do add. We're going to do a collider. And now we'll do this player. And we'll do this. We'll do our blocking group.

Let's add in our callback for when our collision happens. And for the time being, we won't do anything. But if we save, we come over to our browser. Now, if we move our player and we come up to our chest game object, we'll see our player is now blocked by it. We're not able to move through it.

Uh same thing for our big chest and for our pot game objects. All right. So, by using a collider instead of overlap, what this allows us to do, this allows us to rely on the built-in physics to allow these game objects to collide together, while our overlap allows the two physics bodies to overlap with each other. And so typically when we collide with our game objects, this is going to apply a force to the game object and have it move. But because we called set immovable on our chest and our pot, uh so as an example, if we come in here to our chest class, if we go to we have set a movable, if we set this to be false, now what will happen is when we collide with our game object, we're able to push it and we're able to apply our velocity to that game object and then move it off our scene.

And so it's important for when we have these objects that we don't want to move, we want to call it set immovable and set that to be true. So now that we have our collision between our player and our blocking group, we want to do the same thing for our enemies. So I'm just going to copy this. We'll paste it. And now we're going to change this to be our enemy group and then our blocking group.

And let's just add in our properties for our arguments here. So we'll have our enemy and then we'll have our game object uh that we interacted with. up here, we'll have our player and we'll also have our game object. All right, so if we save, let's come back to our browser. And what we should see is eventually our enemy game objects should run into one of our objects and we'll see that they're stopped and they're not able to move through it.

Now that our player can collide with our game objects, we need a way for our player to actually interact with them. For our chest, our player will be able to open those up and retrieve the contents. for our pots. Our players will to pick those up and carry them around and then throw them in our game. To add in this feature, we're going to add two new components to our game.

We're going to add a component to keep track of our objects our player's currently colliding with. And then we'll add a new component for allowing our player to interact with that object. To do this, let's go into our folder under components game object. Let's make a new file. We'll call this colliding object colliding object component.

Let's go into our speed component. We'll copy our content from there. Let's paste it over here. Let's update our class update our class name. So for our colliding objects component, we'll use this component to keep track of all the game objects our player's physics body is currently touching in our game.

To keep track of those, let's update our property. We're just going to call this objects. For our type, we're going to do game object. We'll make this an array. We'll remove speed from our constructor.

And now let's initialize objects. We'll have that be an empty array. And now we'll need a getter for retrieving those objects. So we'll update our getter. Let's update our return type.

And now we'll return this we'll return this objects. Now we'll add two methods to our component. We'll have one for adding game objects to our list and we'll have one for resetting our list. So let's do public. We'll do add.

We'll add in a game object. We won't have this method return anything. And so we'll just do this. We'll do our objects. We'll do push.

And we'll add in our new game object. Then we'll do public. We'll do reset. We also won't return anything from this method. and we're just going to do this objects and we're going to reinitialize it to an empty array.

Now for our next component, let's go into our components game object folder. We're going to call this our interactive object object component. And so let's copy our code from our colliding objects component. We'll update our class name. So our interactive object component, we're going to add this to our game objects in our scene.

And then this will be our trigger to allow our players to do something with that object. Either for our chest, we'll be able to open it up. For our doors, we'll be able to open them. And for our pots, we'll be able to pick those up and carry them. Later on, this component could be added to other game objects such as like boulders or NPCs that our player can lift up and carry in our game.

So, for the properties on our class, first we'll need to know what type of object our players interacting with. And so, we're just going to call this object type. For our type, we'll make a new type, and we're going to call this our interactive object object type. And so, this type, this will use for tracking what our player can do. So either lifting up an object or opening it.

For our next property, we're going to add a call back. And so after our player interacts with one of our game objects, we're going to call this call back on that object so we can do something. An example with our chest is after we interact with it, we'd want to update our frame to show that we're opening our chest. And so for our callback, we won't return anything. So we'll just do void.

Then we're just going to add one more property to a class. And we're going to call this can interact checked. interact checked. And so this will be a function uh that's going to return a boolean value. How this will be used is this is going to be a check to make sure our player can actually interact with the object before we interact with it.

A good example is our big chest. Before our player can interact and open this, we need our boss key. And so we're going to use this property to do that check before we call our interact method on our game object. now let's update our constructor. So we'll have our game object.

Now we'll do our object type. our object type. We'll do our interactive object type. Next, let's do our can interact check. For this, we're going to have this be optional.

And so, we're just going to have it return true. And we'll also do our call back. And we'll make this be optional as optional as well. So, now let's update our properties. And so, we'll have our object object type.

I'm just going to copy this. We'll paste it twice. And then we'll have our callback and our can interact check. Next, we'll add a getter for getting our object type. So let's update this.

We'll return this in our object type. Now we're going to add two public methods to our component. One will be to actually interact with our game object and the other one will be to check to see if we can actually interact with it. we'll do public. We'll do interact.

We won't need anything for our arguments. And now we'll just call this and we'll call our and we'll call our callback. And now for our second method, we're going to call this can interact with. Now this will return a boolean. And now we just want to do return.

And we can do this our can interact check. Now we just need to define our new type. Uh so let's go into our code. Let's go into our common folder. We'll go into our common ts.

We'll do export const. And we'll do interactive object interactive object type. We'll do as const. And now for our object for our keys, we're going to do auto pickup and auto pickup and open. So let's update our open.

So let's update our values. Finally, let's add in our type. going to our types file, let's do export type. Our interactive object type will be equal to our key of type of, and then our interactive object type. So for our three types here, auto will be used for any game objects our player can interact with automatically.

A good example will be our doors. So typically when there's a locked door, if our player has a small key and they go up to it, they'll automatically unlock it and then they can proceed through the door. For pickup, this will be for any game object our player can lift and carry around in our game. and then open will be used for our chest. So now back in our component, let's update our import.

We have our new type and now we just need to update this so it's not an array. And we'll go ahead and save. Now that we have our new components, we need to add these to our objects and to our player classes. Let's jump over to our pot class. In our constructor, let's add in our new interactive object component.

We'll do new interactive object component. We'll pass in this. And now for our interactive object type, this will be an object we can pick up. And we won't pass anything for our two other arguments. We'll jump over to our chest class.

We'll do new. We'll do our interactive object interactive object component. Pass in this for our instance. And now for our type. This is going to be our open.

Finally, let's jump over to our player class. Now, for our player, we want to add in our colliding objects component to keep track of our objects we can interact with. So, for this, we're going to add a new property to our class. And so, we'll do this. We'll do our colliding objects component.

We'll set that equal to our new colliding objects component. and we'll pass in our player. Let's copy this. We're going to add as a property on our class. So, we come up to the top of our class of our private property.

Add in our type. And then next, now we need to add a method. So, when our player collides with one of our game objects, we can add that object to our component. So, come down below our getter. Let's do public.

And we'll do collided with game collided with game object. So, for our argument, we'll pass in a game object. And we'll have our game object. game object. We won't return anything from this method.

And so we're just going to do this our colliding component. We'll do add and we'll do our game object. And real quick, we're going to update our property name. Uh we don't need this to be be plural. Much better.

Then finally, we just need a way to reset our game objects our player's currently colliding with. So what we'll end up doing is as part of our collision check, we're going to add those game objects to our component. And then after we run our state machine, we want to call that reset method on our component. So that way we can remove that object when our player's no longer interacting with it. for our player class, we're going to go ahead and add our update method.

And we'll do public. We'll do update. We won't return anything. Now we're going to call our update method on our parent class. So we'll do super and we'll do update.

And now we'll do this our colliding component and we'll call reset. Now that we've added our new component to our player, if we want to test our logic, we need to jump over to our game scene. So in our collider between our player and our blocking group, this is where we'll go ahead and add that game object to our component. And so let's do this. We'll reference our player.

We're going to do collided with game object. And now we'll add in that game object. And we'll do as game object. And now we'll pass in our game object. And we're just going to type this as game object since we know for our group we're only adding our game object type.

And so now we'll save. Let's jump back to our player class. And in our update method before we call reset, let's do console. log. and we're going to do this, our colliding objects component, and we're going to log out our objects that we're currently interacting with.

So, right away when our scene restarts, we should see our empty array being logged. And now, once we touch our chest game objects, we'll see that that's being logged. And when we move away, it gets reset. Same thing for our big chest. And now, if we do our pot, we'll see that that game object gets logged as well.

Nice. Now that we validate our logic's working, let's clean up our console log. And now we need to work on adding in our logic to our states. So once our player interacts with one of our game objects, we'll transition to a new state. So for our character states, we need to add four new states to our state machine.

We'll be adding in a state for when our player opens up one of our chests. We'll add in a state for when our player is lifting up an object. And then we'll have two states for when our character is actually carrying that object and moving around our scene. To add in these new states, let's go into our character states file. Let's add in our lift state.

We'll do our open chest state. state. Then we'll do idle holding state. Then we'll do move holding state. Next, we need to create our new states.

Let's go into our states, our character folder. We'll make a new file. We'll do our list state We'll do our list state first. Let's go into our idle state. We'll copy our logic.

Let's paste that into our list state. We'll update our class class name. We'll update our name. We'll update our reference. Oh, this should be lift, not life.

Life. Next, let's add in our open chest state. we'll do open chest state. We'll copy over our copy over our class. We'll update our state name.

Now, we'll do our idle holding state. Copy over our state. Copy over our class. Let's update our class name. So, we'll do idle holding state.

We'll update our state name. Finally, we'll have our move holding state. update our class name and we'll update our name and we'll update our reference. So now for the actual logic and our states, let's jump back to our lift state. When we transition to our lift state, when we call our onin enter method, we'll want to reset our velocity for our game object.

And then we'll want to play our animation for lifting up the object that we're going to be carrying. for this, let's move our animation down below after we reset our velocity. And now for our animation, we want to do our lift animation. our lift animation. And so then on our on update method, we want to wait until our animation is finished.

And then once it's finished, we'll transition to our idle holding state. So we'll add an if state. We'll do if this our game object, if our animation component, if an animation's currently playing, we just want to return early. Once that animation's done, now we'll go to our idle holding state. So next, let's jump over to our idle holding state.

When we transition to this state, we'll want to do our animation for our idle hold. So let's update our animation name. update our animation name. We'll then want to reset our velocity on our game object. So then down in our on update method, we'll want to check to see if we have any input.

And if there is input, we'll want to transition to our move holding state. One last change we'll need to add to our on update method is we need to check to see if the player tried to throw the object they're carrying. And if they did, then we want to go back to our idle state. And so we're just going to do if our controls if our action key was just down, then we want to transition to our different state. So let's copy this.

We'll paste it. And now we want to go back to our idle state. And then we want to return early so we don't do our other logic. But then we're going to add a to-do that we actually need to throw our item. Next, let's jump over to our open chest state.

So for this state, we won't need to do anything on our on update method. So let's remove that logic. All right. So for our inner method, one of the things we're going to expect when we call this method is we're going to expect our chest that our player will be interacting with. So let's add in our args.

This will be an unknown array. And we'll add in our chest. So we'll do const chest will be equal to our args our first element and we're going to type that as our chest. Now in this state we'll want to reset our body's velocity and then we want to play our animation for lifting up our game object. So we're going to move this animation to take place after we reset our velocity.

Now let's do our lift animation. And then we'll want to listen for our call back for once our animation's done. That way we can transition to our idle state. So we'll do this. We'll do our state machine.

Let's do set state. And now we'll do our character states and we want to do our idle state. Now for the time being we're going to counter log out the chest from our on enter method. Next let's jump over to our move holding state. So now for our move holding state let's get rid of our on enter method.

And so for our on update method we're going to want to copy a lot of the logic that we're currently doing in our move state. So for the time being let's copy over our private methods and copy over on update method. We'll come back to our move holding state and let's replace our on update method. All right. Okay, so for our move holding state, if we have no input from the player, instead of going to our idle state, we want to transition back to our idle holding state.

So our player will still be holding our item. Besides that, most of our other logic is going to remain the same, where if the player provides input, we'll need to move our player's game object around our scene. Besides that, we'll need to update the game object our player's currently carrying to have a new position based on where our player moved to. And then for the rest of our code, the only other change we'll need to make is in our animation for when we're doing our walk. We want to do our walk hold animation.

Now then, let's go ahead and fix our imports. And let's save. So now that we have our new states, let's jump over to our player class and we'll create our new states for our player. And we'll add in our new animations. So down where we have our state machine and we add our states.

Let's copy our line for adding our states and we'll paste it four times. We'll start off by adding in our lift state. Next, let's do our open chest state. Then we'll have our idle holding state. And now we'll have our move holding state.

Next, we'll need to add in our new animations. So, let's come up to our animation configuration. I'm going to copy our keys for our idle. Let's paste those down here. So, now we'll have idle and we'll do hold down.

I'm just going to copy hold and we want to go ahead and paste those in. Now, for animation keys, we want to do a idle hold down. I copy that. We'll paste it. Now we'll do hold up and then we'll do hold do hold side.

For this animation, we'll want it to repeat. Now I'm going to do the same thing for walk. So we'll copy our four keys. Let's paste those down here. Now we'll have walk hold down.

I'm going to copy that and we'll copy that and we'll repeat. Now for animation, we'll do walk hold hold down. Now we'll have walk hold up and then walk hold then walk hold side. We want that animation to repeat as well. Finally, we need to add in our keys for our lift state.

So, I'm going to copy these four keys again. We'll paste them. And now we'll do lift down. I'm going to copy lift. Now, we'll have lift up, lift left, and lift right.

And so, for our player animation keys, we'll have lift down, lift up, and lift lift side. And now for our lift animation, we do not want this one to repeat. And so, we're going to set that to zero. Now, if we want to test our changes, we just need to update our existing move state to allow us to transition to our new states. So, let's open up our move state.

So, now in our move state, after we do our check to see if there's been any input provided, we'll now check to see if there's any game objects our player can interact with. And if they press the key to interact with it, then we'll transition to our new state. So, for this, we're just going to add a new method to our class. And so, we're going to do if we'll say this. And so for our method name, we'll do check if object was interacted with.

And so for this method, we'll pass through our controls. And then we're going to expect this to return a boolean. And so if it returns true, then we just want to return early from our on update method. Let's copy our method name. We'll come down to the bottom of our class.

Let's paste that in. So we'll receive an argument of our controls and we expect this to return a boolean. So now in our method, first we'll want to grab our collides object component from our game object. So let's do const. We'll do collide We'll do collide component.

We're going to set that equal to our colliding objects component. We want to get component. Let's add in our type. And now we'll pass in our game object. Now we'll want to make sure we actually have that component.

So if our collide component is collide component is undefined or if there's no objects in our collides component. So we'll do our Clyde component, our Clyde component, our objects. length is equal to zero, then we can go ahead and return false. So now if there are objects our player is colliding with, we want to see if they have that interactive object component on that object. So we'll grab our first object from our array.

So we'll do our collision collision object. We're going to set that equal to our collide component, our objects. We want to grab that first element. Now we want to grab that interactive object component. So we'll do const interactive object object component.

And so I just want to copy this line here for we'll grab a component. We'll update our component name. We'll do our interactive object component. But instead of passing our game object, now we want to pass in our collision collision object. So next, if that object does not have an interactive object component, we can't interact with that object.

So we'll do if our interactive object component is component is undefined, then we want to return false. Now, at this point, our player's colliding with an object. It's an object we can interact with. And now, we want to see if our player has pressed the key for interacting with the object. So, we'll do if we'll do not our controls.

Is action key just down? That means they did not press our action key. And so, if our action key is not down, we want to return false. So, now that the player shown that they want to interact with our object, we now need to check our interactive object type and transition to the appropriate state. So we'll do if our interactive object component if our object type is our interactive object type of pickup.

We want to go to our to our lift state. And so we'll do this our state machine. We'll do set state. We'll do our character states and we'll do our lift state. We'll go ahead and return true since now we are transitioning to a new state.

We'll copy that block of code. Next we'll have our open interactive type. We want to go to our open chest open chest state. And then for our last type, we'll have auto. And when we have this type of object, we don't need to do anything.

So we want to return false and we won't transition to a new state. Finally, we're going to add in our exhaustive guard to make sure we cover all of our options. And so we'll have our interactive object type. And we'll do our object type. With our new state logic in place, we should be able to test our state transitions.

Real quick, I'm going to go into my configuration. I'm going to turn off debug. And so then that way we can see our character more clearly. Now, if we come over to our browser, let's have our player go over to our chest. If we press our action key while we're moving, we should see our player do our animation for lifting over to lift up our object.

Now, if we go over to our big chest, we should also see the same thing where our player reacts to our game object. And we'll also see our console log lines for where we expect our chest to be passed. Next, if we go over to our pot game object, if we press our action key, our player should transition to our lift state, followed by our idle hold state. And if our player moves around, we play our animation for our move hold state. Now, if we press our action key, our player should drop their hands down to show we go back to our idle state.

Nice. Now that we've tested our transitions to our new states are working properly, we're going to work on refactoring our move state and our move holding state. Currently, these two states have a lot of code in common, and we're going to create a new base class that both of these will inherit from. To do that, let's make a new state. So, under our states character folder, we'll make a new file.

We'll call this our base move state. Let's copy all of our code from our move holding state. We'll update our class name and we'll do base move state. And let's make this an abstract class. So now in this class, we want to remove anything that's specific to a particular state from this class and just keep our code that's in common.

For now, let's minimize our on update method. Let's start with our update velocity. So we'll need this for both of our classes. We're going to change this from private to be protected so we can use it in both of our classes. We can keep our logic the same.

We'll do the same thing for normalize velocity. And so right now how our code is structured, we don't have to change anything here. So then for our update direction method, if we want to reuse this method, we need a way to pass in our prefix for our animation that we need to do here. To do that, let's update our constructor. So now in our constructor, we'll add a new argument and we're going to call this move animation prefix.

Animation prefix. And for this, we're going to either expect walk or walk hold. Now, we want to store this on our class. And so, we'll do protected. We'll do our remove animation animation prefix.

Just going to copy our type here. So, now we'll do this. We'll do our move animation prefix will be equal to our argument. So, down in our update direction method, let's remove our walk hold. And we'll change this to be this and our move animation prefix.

So, real quick, since we're making this protected, let's add in our underscore. We'll just keep our code consistent. Now, let's update our method to be protected instead of private. So, now in our on update method, let's update our code references. So, we use our new method names.

And so, currently in our on update method, first we grab our controls and we check to see if there's no input. If there's no input, then we transition to a different state. So right now this logic is common between our two classes but the state we transition to is not. So one thing we can do here is we can move our check here for no input. We'll move that to a new method.

So let's do protected. We'll do is no input movement. We'll have this return a boolean value and then we'll expect our controls to be provided as an argument. We'll have our type be our input input component. Let's copy this code here.

We'll paste it and we don't need to do our if statement. Let's get rid of that. and we're just going to do and we're just going to do return if none of our controls are being pressed down. So, let's remove that code here from our on update. All right.

So, now in our on update method, all we have left is we grab a reference to our controls and we update our player's velocity based on that input. For our move holding state, we'll want to do that same logic, but we'll also want to update our game object's position to follow where our player's moving. For our move state, we want to do that same logic. We have these additional checks we want to do like checking to see if our player can interact with a game object. Since we need this logic in both places, we're going to move this from out of our on update method into a new protected method.

So let's copy our protected and we're just going to call this handle character this handle character movement. And so one last change we need to do to our base move state class is we need to add an argument for passing through our state name that we need to pass to our super method. So we'll add a new argument. We're going to call this state name. We'll just have this be a string.

And now when we call super, we're just going to pass through state name instead of having our hard-coded value. So now with our changes, we should be able to update our two states. Let's jump over to our move holding state. Let's update our base class that we extend. And so we'll have our base move state.

Now when we call super, we'll pass in our state name, our game object, and now for our prefix, we want to do walk to do walk hold. All right. So now in our on update method, first let's grab a reference to our controls. Once we have our controls, we want to see if there's been no input provided. And so we'll do if this is no input movement, we'll pass in our controls.

And so if that's true, now we want to go to our idle holding state. So we're going to copy this. We'll move that to here. We'll remove this logic here. After this, we'll now want to call our new handle character movement method.

And now that's going to do all the logic we were doing here where we update our player's velocity. So let's get rid of that code. And now we can get rid of all of our other private methods from our class. from our class. One other thing we'll want to do in our move holding state that we don't have code for currently is if our action key is pressed, we want to throw our item.

Let's open up our idle holding state. Let's copy our code for throwing our item. So, down in our on update method, let's grab our code here for throwing the item. And now, we're going to add that check uh right above our no input movement check. So, now let's update our imports to remove our unused imports.

And let's go ahead and save. Now, let's jump over to our move state. For our move state, let's update our class that we're extending. And so we'll have our base move state. Now for our prefix, we'll do walk.

Let's jump over to our move holding state. We're going to copy our code here before we transition to our idle state. Now we just want to update our state name. So remove this logic here. We'll want to keep our check to see if our object was interacted with.

And if our object was not interacted with, now we want to do our character movement. So let's copy this. We'll paste that down here. And now we can remove the rest of our logic that's tied to updating our player's velocity. player's velocity.

Let's get rid of our private methods for velocity. And let's go ahead and clean up our up our imports. And now if we save, we should be able to test our changes. Make sure everything's still working. So we have a player move around our scene.

Let's try interacting with one of our objects. If we interact with our chest, we go to the right state. And now finally, let's try picking up our pot. So we transition to our lift state, followed by idle holding. And if we try moving, we go to our move hold state.

Nice. Now that we have our new states in place, we're going to work on adding in the logic to allow our player to open up our chess game objects. To make this change, we need to go into our move state. And in our check if object was interacted with method, we need to make the call to our interactive object component to see if we can actually interact with our object. So when our player interacts with our big chest, we need to make sure we actually have our boss key before we can open it up.

After we do that check, then we need to call our interact method. So then that way we can call our open method on our chest class. To make these changes, we'll do if we'll do not our interactive object component can't interact with. And so if we can't interact with that object, we're going to return false. If we can interact with it, now we want to call our interact method.

And now back in our chest class, we need to pass in these callbacks to our method here. So for our first argument, this is where we're going to do our check to make sure we have our boss key if this is a big chest. So, we're going to do if not this is a boss key chest. So, if this is a small chest, then we can open it up. If it's not, then we'll add a to-do to make sure we have our boss key and we'll return false.

For our second argument, this is where we're going to call our open chest method. So, we'll call this open. And now down in our open method, we'll want to remove our interactive object component from our game object so we can stop interacting with it. So, we're going to refer to our interactive object component. We'll call remove move component and we'll pass in this for our game object.

So, one last change we'll want to make if we want to test our changes is currently our open method. We require our chest to be in the revealed state. By default, we're going into the hidden state. And so, let's update this to be revealed. Now, if we come over to our browser, if we have our player come to our small chest and we try to open it, we'll see our console log message is logged and our texture for our chest is open and we can no longer interact with our game object.

Now, if we go up to our big chest and we try to open it, we're not actually able to. And so, just so we can open up our big chest, we're going to come down to here to our to-do, let's update this to be true again. And if we remove our interactive object component line here, what this will end up doing is now we can interact with our chest multiple times. And we'll see our log message being logged more than once. Now, if we come into our big chest, if we try to open it up, we'll see our logic works because we have our boss key and our textures updated.

So, let's come back to our code. Let's undo our change. And let's also revert our change to our state. Next, for our chest game object, we're going to work on adding in the ability to notify the rest of our game components when our player opens up a chest. So, when a player opens up our chest, there's going to be a variety of things we might want to do in our game.

We might want to play a sound effect when the player collects an item. We might want to play a different sound effect if they collect money. Once we add in our UI components, we might want to update our UI to show that they now have more of a certain item. we'll want to update our players's AM inventory to keep track of this data. And when we're in a dungeon, when we collect things the map, we'd want to unlock our map feature and show it to our player uh when our game starts.

And so there's a variety of different things we'll want to do. And an easy way to implement this is we can emit out an event once our player opens up a chest and provide our chest contents. And then that way the various components can react and do the updates they need to do. to add in support for this. Let's go into our code.

Under our source folder, under our common folder, let's make a new file. We're going to call this event bus. And now for our event bus, we're just going to rely on Phaser's built-in event system to send out our events. For this, we'll create our own custom event emitter that we'll share across our game. And to do this, let's go into our chest class.

I'm going to copy our import for Phaser. And now in our file we'll just do export const and we'll do event bus is equal to a new phaser events event emitter. And now we're going to provide an object of our various events that we'll support. So we'll do export const. We'll do custom events.

So that equal to our object and we'll do as const. And right now the only event we'll add is we'll do opened chest. chest. So now that we have our new event emitter, we can now import our event bus into our components where we need to emit these events. For emitting our event, let's go into our open chest state.

And after we open up our chest, this is where we'll trigger our event that we're emitting. So before we transition back to our idle state, this is where we'll emit our event. And so we'll do our event bus. We'll do emit. And now we want to do our custom events.

And let's do open chest. And now we want to pass in our chest game object that we provided to our arguments here. So, one change we need to make is we need to come back to our move state and we transition to our state, we'll need to pass in our chest. And so, now we want to pass in our collision object. So now, if we come over to our scene, if we try open up our chest, we should now see our console log line is now updated to have our chest game object.

So now what we can do is in our game scene now, we can listen for this event and we can have our game do different logic. So let's open up our game scene. And so first let's add a new method for registering our event listeners. And so we'll do register custom events for this method. We don't need any arguments and we won't return anything.

And so now we'll do our event bus. We'll do on we'll do our custom events and open chest. And so now when this callback is invoked now we want to call the new method and we'll do handle open chest. We'll pass in this for our context. And now because we're listening for custom events, we'll want to make sure we shut these down when our scene is shut down.

And so we're going to do this events to reference our event matter on our scene. We'll do once. And on our phaser, our on our phaser, our scenes, we'll do our events. And now we'll do we'll do shutdown inside this callback. This is where we'll turn this off.

And so if we copy this and we provide our same arguments and let's do off. That will now turn off our event listener once our scene is shut down. So now we just need to add in our new method. So we'll add in our private method. So when this method is called, we're just going to receive our chest game object.

And so we'll have our chest. We won't have this method return anything. And we'll do console. log. And we'll say chest opened.

And then we're just going to add in a to-do. And let's save. And then finally, now we just need to call our new method. if we come up to our create method after do register colliders, let's do this. We'll do register custom events.

We'll save. Now, in our game scene, if we come over to our chest, let's try opening up our small chest. We'll see now we have our two log lines. We have our chest game object, and we'll see chest is open after we're done with our animation. Nice.

So, now that we have our new log line in our game scene, let's come over to our open chest state, and let's remove our log line uh from our on enter method here. Now that our player can open up the chest in our game, we'll work on adding the ability for our player to lift up our pots and throw them in our game. For this change, we'll need to add two new components to our game. One will be a held game object component, which will be used for keeping track of the object our player's currently carrying. And the other one's going to be a throwable object component, which will be used when our player goes to throw the object in our scene.

Besides our two new components, we'll need to make some updates to our existing states, as well as add a new throw state, so we can update our game object's position when our player throws it across the screen. To get started, we're going to work on adding in the ability for our player to actually lift up the object and then have it follow along our player as we move around our screen. For this change, we'll need to start with a new component. So, let's go into our components game object folder. We'll make a new component.

We're going to call this held game object call this held game object component. We'll copy our code for our speed speed component. So, for our class name, we'll do held game object do held game object component. And so, for our property, we're going to call this object. We'll need to keep track of our game object we're carrying.

We're carrying. And we'll also want to support undefined. Uh so after our player throws the object, we'll no longer be holding one, but we'll still want to keep this component on our game object. For constructor, we'll get rid of speed. And now for our getter, we'll get our our object.

So this will return our game object or object or undefined. And now we'll return our private property. Now we want to add a setter so we can update our object. So we'll copy this. Let's paste it.

We'll change this to set. Get rid of our return type. Now we'll have our object which will be our game object. And so we'll do this object will be equal to that object. Lastly, we're going to add new one public method.

We're going to call this drop. And so this will allow us to drop the game object we're currently carrying. And so how this will be used is when our player throws our object, we'll drop it from this component or if our player gets hurt, we'll drop our game object and we'll call that same method. Now that we have our new component, let's jump over to our player class. Let's add our component to our player.

So we'll do a new held game object component and we'll pass in this for our game object. It's now for our player to be able to actually lift up our items. We need to go into our lift state. And so after we set our velocity, we'll want to grab our new component from our game object. So we'll do con.

Let's do our held component. Set that equal to our held game object component. Pass in our game object. And now we'll add our safeguard. So if we don't have a held component, so if it's equal to undefined, then we just want to transition back to our idle state.

So we're just going to copy this here. We'll paste it and we'll transition to idle. Then we'll return early. And so long as our game object has a held component, then we'll be able to lift up our game object. So now our component now, we need to store a reference to the object we're picking up.

To do this, we'll need to add our arguments to our onenter method. And so we'll add in our args, and this will be an unknown array. We'll grab a reference to our first argument. We'll do con. We'll do game object being picked object being picked up.

We'll set that equal to our args, our first element, and we'll do as game object. Now down our held component, now we can store that reference. So we'll do our held component and we'll do object will be equal to our game object being picked up. So now for our player to actually be able to carry our item, we'll need to disable our physics body on our game object. Otherwise, our player and that game object will keep colliding.

And so we'll do if is arcade physics body and we'll provide our game obs being picked up and we'll grab the body from that game object. Then we want to do our game obs being picked up. Our body we want to call enable and we're going to set that equal to be a false. Besides updating our game object's body, we'll want to update its origin and its depth. So then that way we can center that game object over our player.

So how depth works in Phaser is by default all game objects have a depth of one. And when they get rendered to our scene, they'll be rendered in the order that were added to our scene. So we'll see our display list here because we added our chest after our player. That's why our player appears under our chest. And as an example, if we go back to our game scene, if we move our code for our player creation to take place after we create our game objects.

So if we just copy this code here and now we place it down here, what will happen is now because it was added afterwards, our player is now in front of those game objects. Another way to handle this is we can update the depth on one of our game objects. And so as an example, if we do this, we do our player, we do set depth, we set this to two. And so now what should happen is because our player has a higher depth in our rendering order, phaser is going to render that game object on top of all other game objects for that depth. And so when we pick up one of our game objects, we'll want to make sure our depth is set to two.

So then that way it appears in front of our player. And that way we can make it look like it's on our player's head when we're carrying our pot around. to make that change back in our list state, we'll grab our game object being picked up. We're going to set our depth to be two. And one other thing we'll do is we'll update the origin on our game object.

So, it'll be centered. And let's do set origin. And I'll do 0. 5 for both our X and Y. Now that we're keeping track of our game object that our player's carrying, now we can make changes to our move holding state to have that game object's position get updated as our player moves around our scene.

So, if we jump over to our move holding state after we do our updates to our player, now we want to update that game object's position. So, for this, we'll need to grab our held component so we can get a reference to that game object. What we'll do is let's copy our code here for grabbed our held component. We'll paste that down here. Let's update our imports.

So, now that we have our held game object component and we've updated our player's position, now based on our player's direction, we can update our game object positioning. To make this change, we'll do if we'll do our game object, our position, our direction is equal to direction down. Now, we can grab our hel component. We'll grab our game object. From there, we'll do set position.

Now, for our position, we want to update our X and Y value. So, we're going to reference our game objects. X position and we're going to add a little bit of an offset so that way our game object's a little bit more centered. And so we'll do this. ame object as well.

Y we'll do minus two. And so one other check we're going to do up here to our safeguard is we're going to make sure our held component actually has an object. So then we don't have our optional chain here. And so if our held component is undefined or a held component. object is undefined, then we want to go back to our idle state and we can remove this check here.

So now if we copy this code, we'll do our other directions. And so we'll do else if our direction is up. And we'll update our x value by one. But then for our y value, we'll subtract six. And then finally, we're going to do else.

And so when we're facing left or right, we'll change our position. And now we'll just do our game object. x. And we'll do our y and we'll subtract eight. And so one last change we'll do is we're just going to check to see if our flip x property is set on our game object.

And so if it's true, then we're just going to reset our x position and our held game object. So then that way it'll be centered. So we'll do our held component, our game object, and we'll do set X, and let's do with this, our game object, and our X value. And so all we're doing here is we're just updating our X and Y value on our game object. And we're adding in an offset.

So then that way our game object will be more centered depending on how our player moves around our scene because we updated our player's physics body. And this will make more sense once we actually do our testing, uh, since we'll comment it out and see what the object looks like. So now in order to test our changes, we just need to update our lift state to receive our game object that we're actually lifting up. to make that change, let's go into our move state. And when we transition into our lift state, we'll also want to pass in our collision pass in our collision object.

All right, so we want to test our changes, let's come over to our pot. If we have our player lift up our pot, we'll see right away our game object. We update our offset and we don't have it above our head because we didn't move our object as part of our lift state. But now when we go to our move hold state, we'll see our objects position is updated as our player moves around our scene. And so if we come back to our move hold state, if we just update our code to be held game object object, if we do set we do set position, we do this our game object, our X, this, our game object, and our Y.

We'll just comment this out real quick. What will happen is after we pick up our game object, we'll see that it's covering our player's head. And so by adding in that offset, we just move that game object above our player depending on our direction our player's facing. And so by tweaking those values, we can change our game object's position wherever we like it to be. Now that our player can lift up our game objects, we're going to work on giving them the ability to throw them.

To do this, we'll need to add a new component to our game. under our components folder, under game object, let's add a new component. We're going to call this throwable object component. object component. So in this class, I'm just going to copy our code from our held game object component.

We'll update our class name. We'll just do throwable object component. On our class, we won't need to keep track of our object, but we'll add a new property. We're going to call this call back. And so this will just be a callback we're to invoke after we throw our game throw our game object.

And so for our type, we'll just have a function that doesn't return anything. And now we'll update our constructor to have that argument. So we have callback. We want this to be optional. And so let's add in our default and we'll return undefined.

And now we can do this. Our call back will be equal to our call back. So now on our component, we don't need any getters or setters. And so for our component, we're just going to have two uh methods. We'll keep our drop method here.

And so when we drop our game object, we're just going to call our callback that's been registered. And then we'll add in a method for throwing our game object. So let's copy this. We'll paste it. And we'll do we'll do throw.

And now when we throw our game object, we'll need to know which direction our player was facing. And so we'll have direction. We'll add in our type. All right. So for the time being, all we're going to do is we're just going to add a to-do.

And we're going to come back to our throw method after we create our throw state. So that way we get everything wired up and working properly. So now to create our throw state, let's go into our states, our character folder. We'll make a new state. We'll call this throw state.

For this state, I'm going to copy our code from our idle state. We'll update our state name and we'll do throw state. We want to add that to our character states. So now when we enter our state, the first thing we'll do is we'll reset our body's velocity. And after we do that, we'll want to play our lift animation.

But for our lift animation, we actually want to play this in reverse. So then that way it looks like our player's throwing the object instead of picking it up. for playing our animation in reverse. We're going to add a new method to our animation component. we're going to call this method play animation in animation in reverse.

Let's open up our animation component. And now we'll add in that new method. And so, for our play animation reverse, let's just copy our logic here for our animation method. Paste this. We'll do play animation in We'll do play animation in reverse.

All right. So, for our method, we'll keep our optional call back. And first we'll check to make sure our key actually exists under configuration. If it does not, we'll do our call back. If our key does exist, we'll create our animation configuration.

So, we keep the same key. We'll use our repeat property, but then for our time scale, we want to set this to be 1. 75. And so, that way, we'll play it in reverse a little bit faster. And then finally, when we go to play our animation, we actually want to call our play reverse.

And that way, we'll play our frames in reverse order. now if we come back to our throw state. So after we play our animation, now we want to reference our held game object component and our throwable object component. And we'll want to throw our game object and drop it. For this, let's go into our lift state.

I'm going to copy our code here where we grab our held component. We'll paste that here. Let's update our import. So we have our held component. If our held components undefined or if our held component game object is undefined, then we'll just want to return early.

Next, we'll grab a reference to our throwable object component. And so, we'll grab our throwable object throwable object component. For variable name, we'll do throw object component. And so, if our throw object component is not undefined, now we want to reference our component and we'll call our throw call our throw method. And now we'll grab our game objects objects direction.

And then, finally, now we just want to reference our held component and we want to call drop. So, we can drop our game object from that component. So now down in our on update method, all we want to do is check to see if our animation's playing. And if it is, we won't do anything. And then once our animation is finished, we want to go back to our idle state.

So let's do our idle state. Now let's update our code here. And so let's do if this our game object, our animation game object, our animation component is animation playing. And so if that's true, we'll just return early. now, if we want to test our changes, we'll need to add our new class to our player.

So let's open up our player class. Let's add in our new state. So I'm going to copy this line here. Let's paste that in. We'll do our throw state and we'll pass in this for our instance.

And now we'll want to open up our pot class. We'll want to add in our new component. So we'll do our new and we'll do throwable object component. We'll pass in this for our reference. And now for our callback.

And so now once we throw in our game object, we're going to call a new method and we'll do this. Let's add that method to our class. And so we'll do public. We'll do break. we won't return anything from our method.

And so after we throw our pot game object and it's time to break it, the first thing we'll do is we're going to disable our physics body on our game object. So objects will stop colliding with it. And so we'll do this. body as our phaser physics arcade body. We'll do enable.

We're going to set that to be false. Once we disable our body, now we'll want to play our animation for actually having our pot break. Uh for that we'll need to update our game objects texture. Uh since this will be in a different asset and so we'll do this. We'll do set texture.

We're going to do our asset keys and we'll do our pop break asset keys and we'll do our first frame. And now we'll do our animation. So we'll do play. We'll do our asset keys and we do our pot break animation. Finally, once our animation's done, now we'll want to reset our texture to be back to the original texture and we'll want to hide our game object from our scene.

So we'll do this once. We'll do our once. We'll do our phaser animations, our events, and then we'll do our animation complete key event plus our asset keys, and we'll do our pot our pot break. And then in our callback, we're just going to reset our texture. So we'll do this.

We'll do set texture. We'll do our asset keys, our pot. We'll do our first frame. And now we'll want to hide our game object from our scene. And so for the time being, I'm just going to comment this out.

Let's do console. log and we'll say hide and we'll come back to this. So now if we want to test our changes, we need to update our state machine. And so if we go into our move holding state, when we do our check to see if our action key was pressed, we currently transition to our idle state. And so we'll want to change this to actually go to our throw state.

And we'll want to make the same change in our idle holding state. So we'll get rid of our to-do. And now let's do our throw state. So now we should be able to do over in our scene. All right.

So now our scene refreshes, we should be able to test. So, if we move over to our game object, let's pick it up. And if we try throwing it, looks like we have a bug. let's go into our throw state. Ah, yes.

So, when we grab our throw object component, this isn't on our game object for our player. So, the one we're moving around, this is actually on the game object that they're carrying. And so, let's update our code. We won't be this. ame object.

Instead, this will be our held component and then our object from there. So, now if we go back to our scene, we should be able to test. Let's pick up our game object. Now, when we throw it, we'll see we update our asset, but then we're missing our animation for our pot break. And so, to fix that, we just need to go into our preload scene.

We create our animations. So, now for our pot break animation, this is just another sprite sheet. And so, we need to copy our code for what we did for enemy death. And so, we'll do our pop break. We need to generate our frame numbers from our sprite sheet.

And so, our only frames are tied to this animation. So, we'll keep our default values. We'll update our asset reference. And we'll do our frame rate of six. So now we come back to our browser.

Let's pick up our pot game object. And now when we throw it, we do our animation for our pot breaks. And we see our console log message for hiding our game object is now working. And if we want to make sure our physics is working properly, let's open up our main. ts.

Let's enable our debug. So now let's grab our game object. Let's throw it. And we'll see that our game object's body is not around our pot when it breaks. And it's still disabled from when we initially disabled it.

Nice. disabled it. Nice. Now, to hide our game object after we throw it, we're going to add a new method to our class called disable object. This method is going to be responsible for disabling our physics body on our game object, as well as making our game object not active and not visible.

By doing this, our game object will no longer show up on our scene, and we'll no longer call the update method for that object when it's no longer visible. We'll be able to reuse this logic later on once we start adding in our dungeons and we want to hide game objects when our player leaves a current room. And so in addition to our disable object method, we're going to add an enable object method which is going to do the inverse where it's going to reenable our physics and then remake our game object active. So now to add those methods, we'll start with our disable object. So we'll do public disable disable object.

Let this return nothing. And now we're going to reference our physics body. So we're going to do this our body. We'll do as a phaser physics arcade body. We'll call enable.

We're going to set that to be false. Now we're do this. active active to make our game object not active and this dovisible to hide our game object. So if we copy that method, let's paste it. And now we're going to do enable going to do enable object.

And now we'll just do the inverse. So we'll set all these properties to be true. So now down in our break method in our call back for our animation, we can update our texture. Let's get rid of our console log statement. And we'll do this and we'll do disable we'll do disable object.

So now back in our scene. So now if we test, let's have our player pick up our game object. Once we throw it, we'll do our break animation. Once it's completed, we now hide our game object from our scene. So, these two new methods we just added, this is a pattern we've already used in our game for our character game object.

It's also a pattern we're going to want to use on our other game objects. So, then that way we have this in common across all of our game objects in our game. Since this is something both have in common, we're going to abstract these away to an interface and then we're going to expect our classes to implement that interface. To do that, let's go into our common types file. We'll make a new interface.

We're going do export interface. We'll do custom game We'll do custom game object. And for this interface, we'll have enable object. We'll have this return nothing. And now we'll do disable object.

We'll have this return nothing. Also, with our new interface, we're going to add a utility function for checking the type of our game object to see if it is an instance of our custom game object. This will be useful later on as we're iterating through our game objects in our game to see if it's actually one of our custom types. So let's do export. We'll do function.

We'll do is custom game object. And so we'll have our game object for our argument. And we're going to type this as our game object we've been using. And now for our return value, we'll say game object is game object. And it'll have our custom properties.

And so we'll do our custom game object. So now for our check, we're just going to return if our game object has our disable object property. property. So if it doesn't equal if it doesn't equal undefined and it has our other property. let's just copy this here.

Let's paste it. We'll do enable paste it. We'll do enable object. Now we'll save. So now back in our pot class, let's go to the top of our class and we'll do implements custom game game object.

And then let's jump over to our character game object class and we'll do the same thing. So we'll extend our phaser physics arcade sprite and we'll do implements our custom game object. Now that we have our logic for hiding our game object in place, let's switch back over to our throwable object component and we're going to focus on adding in our logic for throwing our game object across our level. So in our throw method, first we'll want to validate that our game object is actually an arcade physics body so we can update its velocity. Let's get rid of our to-do and let's start off with if not arcade physics body.

We'll do this that game object the body and if it's not, we're just going to call our call back right away. And so we're just going to wrap this inside our if statement here. And then we'll do return. If it does have an arcade physics body, we want to reset its velocity. And so we'll do const.

We'll do our body will be equal to this. Our game object our body. Now we can do our body velocity. Our x, we'll set it equal to zero. Do the same thing for thing for y.

And now depending on the direction that we threw our game object, we'll want to update the appropriate velocity. we'll add in our switch. Let's do our direction. Let's start with our direction down. So, we'll do our body.

We'll do our velocity. Let's do our y velocity. And we'll set that equal to a new variable. We're just going to call this throw speed. Now, we'll want to do break.

And let's define that new variable. And so, we're going to do const. We'll do our throw speed. And for that, we'll make a new config item. And we're going to call that throw item speed.

So, if we jump over to our config file, let's add that new property now. at the bottom of our file, we'll do export, we'll do const, we'll do our throw item speed, and we'll do 300. And while we're here, let's add in one more property. So let's copy this line. Let's paste it.

We're going to call this throw item delay before call back. So we'll do throw item delay before call back. And for that value, we're going to do 200. And how that will be used is after we throw our game object, we want to wait a small period of time before we have that object land in our game. and then would break.

So if we come back to our throwable object component, let's update our import. We'll fix our reference. And now we want to do our other direction. So let's just copy this code. We're going to paste it three times.

So now we'll do up, left, and right. So now we throw up. We just want to multiply this by negative 1 so it goes in the other direction. When we go left, we also want to do negative one, but we want to update this to be our x value. And we'll do the same thing down here.

Let's add in our default block. So we'll do default our exhaustive guard and we'll do direction. So after we throw our game object, we want to reenable our arcade physics body. So then that we'll be able to check for collisions between that object and other objects in our scene. And so to make that change, we'll do this.

We'll do game object. And now we're going to call our new method. So we'll have enable object. So now to use our new method, let's come up to the top of our throw method. When we do our safeguard check here, after we do our check for physics body, we're going to make sure it's one of our custom game objects and say or not is a custom game object and we'll pass in this game object.

So now we validated it has the properties we need to call enable object. Lastly, after we reenable our physics body, now we want to do that delay before we reset our velocity. So let's do this. We'll do our game object. Let's do our scene.

And we'll do time. and we want to do a delayed call. For our value, we'll do our throw item delay before callback. And now in our call back, we'll reset the game object's velocity. So let's copy these.

And then this is where we'll also call our call back. So we'll copy that, paste that down here. Now let's save. So we come back to our browser. Let's pick up our game object.

So after we pick it up, if we throw it, we'll see now it animates across our screen and it will break after that delay call that we added here. So now if we try throwing our game object in the various directions, we should see our game object throws in that direction. Nice. So it just looks like we have one issue and it's tied to our game object. We want to throw it in the direction down.

So we pick up our object. If we throw it down, what's happening is our physics body is getting reenabled when it's above our player and it's pushing our player down. To fix that, we're going to shift our game object to be in front of our player before we throw it. before we throw it. And to do that, we'll do this.

We'll do our game object. Let's do our Y. And we're just going to add 20 to it so it's in front of our player. So now, if we pick up our game object, let's try throwing down. Much throwing down.

Much better. Now that we reenabled our physics body for our game object when we throw it, we want to work on adding our collisions for when that game object collides with one of our enemies so we can have it break. To make it easier to test, let's go into our two enemy classes, and we're going to disable their state machine so that way they won't move around our scene. So, we'll go into our spider class. Let's just comment out where we set our state for our idle state.

Next, we'll go into our wisp class and we'll comment out our logic for we start animating our game object around our scene. We'll come into our wisp class and let's disable our set state here. Now, if we come back to our scene and so now if we pick up our game object, let's throw out our spider enemy, we'll see as soon as our game object collides with our enemy, we detect the collision, but now we're pushing our enemy back. Instead, after our object hits our enemy, we want to break our object immediately and disable our collisions and then have our enemy take damage. Likewise, if we pick up our game object and we throw it at our wisp, we don't want it to actually affect our wisp and we want to have the object just pass through it since we can't actually do any damage to our wisp game objects.

To add these changes, let's jump over to our game scene. We'll come down to where we register our collisions. So now in our collider for our collisions between our blocking group and our enemy group, this is we'll add that logic. So, we'll start off with our collision call back. We're going to check our type of game object, and if it's an instance of our pot, then we're going to see if our game object's velocity is not zero.

And if it's not, we know we threw that game object. And so, now we'll want to trigger our logic. We'll have it break and have the enemy take damage. So, let's do if we're going to reference the game object that was provided. And we'll do instance of our pot class.

And if it's an arcade physics body, so we'll do our game object body. And now we'll do and. So either our x or our y velocity is not zero. So we'll do our game object, our body, our velocity, our x does not equal zero. Or game object, our body, our velocity y does not equal zero.

Then we want our enemy to take damage. So we'll do con. Let's do our enemy game object. enemy game object. We'll set equal to our enemy as a character game object.

Then I'll do if our enemy game our enemy game object is an instance of our character game object. Then we'll have our enemy game game object. We'll call our hit method. And now we're going to pass in our player's direction. And we'll just say one for our damage.

Now for our game object, we want to call our break method so we can break our pot. So now if we come back to our browser, let's pick up our game object. If we throw out our spider, we'll see now we have our collision right away. Our enemy takes damage and because of our state machine, it now transitions to its next state. So now for the issue with our wisp and our collider, an additional argument we can provide is another call back for if we should actually process a collision between two game objects.

How this can be used is this allows us to return true or false if we actually want to have the two objects collide. So in this callback, let's pass in our two arguments. We'll have our enemy and we'll have our game object. And now in this callback, we want to check to see if our enemy is an instance of our wisp. And if it is, we want to return false.

Otherwise, we'll default to true. So let's add in our default. So we'll return true. So now we want to check the type on our enemy. So we'll do if our enemy is an instance of our wisp class and if our body on our game object is an arcade physics body.

So we'll do our game object and now we'll do our body and we'll say and now our body velocity is does not equal zero. Then we want to disable our collisions. So let's just copy this part here. We'll paste that in. And so if that's all true, we're going to return false.

So now for our game object that we're receiving as an argument, we'll see that our type can either be an arcade physics body, a tile, or it can be an arcade game object with a body. So now fix our intellisense, we just need to type our body that's being returned on our game object to have the appropriate type. So outside our if statement, let's just do cons. We'll do body. We're set equal to we'll do our game object and we're going to do as unknown and we'll do as game object.

And now we'll grab our body property from our game object. Now what we can do in our checks here is we'll just reference body instead of game object object body. All right. So if we save, let's come back to our browser. Let's pick up our game object.

And now when we throw it our wisp, we'll see our game object passes right through it. Nice. One last change we'll want to do for our collisions is we'll want to add in logic to handle when our game object collides with our other blocking game objects. So when we have our pot, if it collides with one of our chests, we want our pot to actually break. to actually break.

And to do that check, we'll need to add a new property to our class to keep track of all of our pot game objects that we create. So on our class, let's make a new private property and we'll do pot game pot game objects. And we're going to set this to be our pot class and we'll have an array of those. Now down in our create method, let's copy our logic where we create our pot. We're going to move that outside our blocking group.

Paste that here. Let's store that in a new variable. Do cons pot will be equal to a new pot. Let's initialize our pot game objects array. array.

And now after we create our pot instance, we'll do our pot game objects and we'll do push. We'll add in our new instance. And now in our blocking group, we'll replace that code with pot. So now down our register colliders method. First, we're going to check to see if our pot game objects if our list is greater than zero.

So we'll do if this our pot game objects our length is greater than zero. Now we want to add in our new collider. So we'll do this our physics. We'll do add collider. We'll pass in our pot game objects.

And now we want to do this our blocking group. And for our game object, we'll do pot. And now we're just going to do a check to make sure our pot is an instance of our pot. And so if not pot instance of our pot class, we can return if it is an instance of our pot class, we'll do pot. reak.

So now back in our browser, let's pick up our game object. we try to throw it at one of our chest. We should now see our game object now collides with our chest game with our chest game object. Our last piece of logic that we need to implement for throwing our game objects is when our player picks up one of our game objects, we need to animate that object to appear that our player's picking it up. Now, depending on our direction that our player picks up our game object from, we'll want this animation to be a little bit different that way it looks like the player is lifting it up from that position.

To create this animation, we need to create a path that our game object is going to follow. And then that way it appears that it's following our player's hands until our player's hands are above their head. To create this path, we're going to use the phaser cubic basier curve. And so how this works is we need to define a line for a path our game object will have it follow. This line will have a start and ending point.

So it's going to be a straight line. To get our curve, we have to provide two points where we want to pull on our line and kind of pull it up. So we have this control point here, this control point here, and that's what controls this curve for our line that gets created. Once we create this curve, we can then have our game object follow that curved path, and we can animate it along that path. And so to add this logic to our code, let's go over to our lift state.

So now in our state class, after we update our object's origin, let's start off by creating our four points for our line. And so we'll do const. Let's do our start point. We're going to set that equal to a new phaser. We'll do math.

We'll do a vector 2. And now we want to provide our x and y position of where our line's going to start. For that, we want to do our game object that was picked up. We want to grab our x value and we're going to increment it by eight. And now we want to do our game object being picked up.

We want to do our y value and we want to subtract eight from it. Now let's copy this line of code. We're going to paste it three times. times. And now let's do our endpoint.

And so for our endpoint, we're going to want this to be above our player's head. And we're going to reference this, our game object, our x value. We'll get rid of our eight here. And now we want to do this, our game object. And now for our y value, we want to subtract eight so it's above our player's head.

Now for our two other points, we'll do control point. 1. Copy our variable name. We'll do control point 2. And now for our control points, we'll keep our x value.

But then for our y value, we're going to subtract 24. And so we'll do the same thing for both of these points. And now after we have our points, we can create our curve game object. And so let's do const. We'll do our curve.

We're going to set that equal to a new phaser curves. We'll do a cubic basier. And now we want to provide our four points. We'll have our start point, control point one, control point 2, and now our end point. So now that we have our curve, we need to create a path for our game object to actually follow.

Let's do const. We're going to do our curve curve path. Now we'll do a new. We'll do our phaser. We'll do our curves path.

And now for our path, we need to provide our x and y value for our path is going to start at. And we want this to match our start point. So let's do our start point. x. We'll do our start point.

Y. And now that we have our new path game object, we need to call our add method to add our existing curve. And then that's going to give us the curve for our game object to follow. So now in order to be able to see our path so it be easier to debug, we're going to create a graphics game object and we're going to draw out our path. So let's do con.

We'll do G. We'll do this our game object. Let's grab our scene. We're going to do add. We'll create a graphics game object.

Now we'll do game object. Now we'll do G. Ear. G. Iline style so we can see our line.

For this, let's do four. And we'll do 0x 0 FF 0 1. Now, if we want to draw out our path, we can reference our curve path, we can call our draw method. And now, this expects the graphics game object that we want to draw to. So, we'll pass in G.

All right. So, before we test, we just want to add in our phaser import. So, I'm going to copy that from one of our classes. We'll come to the top of our file. Now, we'll save.

And now, if we test, let's come over to our scene. Let's have our player pick up our game object. And we'll see now, depending on our player's position, we have this new green path show up. And that's the path our game object is going to follow until it gets into the ending position. So now if we do a few other tests, if we pick up our game object from the top, we'll see based on our player's position, we'll have a new path that gets drawn.

And that's the path we want our game object to follow. Same thing from our other side. And then just depending on where our players at next to our game object, that path will be different each different each time. So after we have our path game object, we just need to update our game object that's being thrown to follow that path. To do that, let's make a new variable.

Do const. We're going to call this follower. Press that equal to this our game objects instance. We'll do our scene. Now, let's do add and we want to do a follower.

So, now for our follower, we need to pass in our curved path. So, our path we want to follow. And now, our X and Y position of where it should start at. For this, we want to match our start point. And so, we'll do our start point.

X and our start point. And so now we're having our game object animate along our path. We don't actually pass in an instance of our game object. Instead, we pass in its texture and then that same texture will be animated along that path. So we'll do our game object being picked up and we want to grab our texture from that object.

And now we're going to call set alpha and then that way it's going to be visible to our scene. So now after we have our follower, we want to call the start follow method to create our animation. So we're going to do our follower. We'll do our start follow. Now for our tween, we'll do our delay of zero.

We'll do our duration, do 250. Now on 250. Now on complete, we want to clean up our game object. So we're going to do follower. We'll do destroy.

We're going to destroy our graphics game object. And then finally, we want to update our game object that's being picked up to have its position be our end position. And so we'll have our game object being picked up. We'll call set position. And we'll do our follower.

X, our follower. y, Y and we'll call set alpha and we're going to set it to be one. So now if we come back over to our scene, let's try picking up our game object. And what we should see is our game object is going to be displaced. We have our new texture being rendered for our path.

And all we need to do to complete this and we just need to hide our game object while we're doing this animation. So after we create our graphics game object, we'll do our game object being picked up. We're going to set our alpha property and we're going to set it to be zero. So now if we want to test, let's go and pick up our game object. And now we have this very fluid animation of where our player picks up our game object.

Nice. The last thing we'll do in our lift state class is we're going to move some of our properties here to be part of our configuration. So we jump over to our config file. Let's do export const. We'll do lift item animation delay.

And we'll set that equal to be zero. And now let's copy that. And we'll do lift animation. And we'll do duration for that. We'll set it to 250 and we'll paste it one more time.

We'll say lift animation and we'll do enable debugging. Let's set that to be true. Now, if we jump back over to our lift state, let's grab our properties. And we'll do our for our delay, let's do our lift animation, our delay, and our lift animation lift animation duration. Now, before we create our graphics game object, we'll do a check.

We'll do if our lift item animation enable debugging. If that's set to true, now we want to create our graphics game object. And so to make it so we can destroy our graphics game object, we'll just do let G. We're going to add in our type. We'll do a phaser game objects graphics or undefined.

We'll assign G here. And so now we'll just do if G does not equal undefined, then we'll call our destroy method. So now, if we go back over to our scene, we should still able to pick up our game object, and we should see our debug line. Go into our configuration. Let's set that to be false.

Now, if we pick up our game object, it'll follow our path, but we just don't see it in our game. With most of our logic in place for carrying items, we have one more case we need to handle. So, when our players carry an item, if they take any damage or they die, our game object will stop following our player, but that game object is still associated with our components. we need to update our hurt and our death state. So, if they're carrying an item, we'll drop it.

And then that way, we can have our pot break when it hits the ground. And then we'll also clear it out from our components. To make that change, let's open up our throw state. Let's copy our logic here for our held component, our throw object component. let's copy this block of code.

We'll come back to our herd state. After we reset our body's velocity, this is what we'll add in that check. So, let's paste in our code. Let's update our imports. Now, we just need to make a few changes.

When we reference our throw object component instead of calling throw, we want to drop our game object to remove it. So let's get rid of this argument here. And then up here, instead of returning early, we just want to have a safeguard to make sure we have a held component and we actually have an object. And so we're just going to do the inverse of this. We'll make sure our held component is not undefined, and we'll make sure our object's not undefined.

And as long as that's the case, then we'll run this code here. So let's move this inside our if block. And then we want to change this to be and. All right. All right, so with that changed, let's copy this block of code here.

Let's go into our death state. Let's paste it. After we reset our body's velocity, we'll update our imports. Now, to test our changes, let's pick up our pot. And when our player runs into our enemy, we now take damage, and then our pot will break.

To test our death state, let's go into our config file. We're going to update our player starting health, and we're just going to update this to be one. So, our player should die as soon as they take damage. now we pick up our object, go into our death state, our object drops, and it breaks. Nice.

It breaks. Nice. With that last change, we now have our core logic in place and able to pick up and throw items in our game before we move on to our level design and creation section. I want to take a moment to refactor some of our code in our states. in many of our states, we're adding this block of code where we're making sure we have an arcade physics body.

And if we do, we reset that body's velocity x and y values. Since we're placing this in many of our states, it makes sense for us to add a new method to our base character state class that'll do this logic here. So, if we open up our base character state class, let's add a new method. And we'll do a protected method. And we'll do reset object velocity.

For this method, we won't return anything. And since it's protected, let's add in our underscore. All right. So now for our method, let's open up our test state. Let's copy our block of code where we reset our velocity.

Let's go into our base state. Let's paste that in. We'll update our import. And now, if we go back to our test state, we can remove this block of code here. And we can just call our new methods.

We'll do this. and we'll do reset object velocity. And now we can make that same change in our other components. So let's copy this line of code. Let's open up our herd state.

So let's paste in our line of code. We reset our body's velocity. Now down here in our check where we grab our object's body, we'll just remove our velocity check here. While we're here, let's grab our code for our held component. And we'll do that outside our RK physics body check.

And then down a little bit further, we have one more spot where we reset our velocity. So let's replace that code. Now if we save, let's go into our idle holding state. We'll replace our code there where we do a reset our body velocity. Let's jump over to our idle state.

We'll update our code there. Next, our lift state. Replace our logic there. All right. So, next we can skip the move holding state and our move state.

Let's go into our open chest state. We'll update our logic there for reset our velocity. Then, finally, in our throw state, we'll do our last change. And now, if we save, we should be able to test our game, make sure everything's still working. So, we should be able to move our character around.

If we take damage from our enemy, we should transition to our herd state. We pick up our item, we should be able to throw it. Now, we try opening up our chest. our chest. Nice.

Finally, one last change we're going to do to our codebase is when we add in our function for is custom game object, we place this function inside our types file. All of our utility functions actually belong in our utils. ts file. And so, we're going to move that function over there. So, let's copy our code.

We'll remove it from our types. ts. We'll paste that in here. Now, let's update our import so we have the appropriate types. appropriate types.

Now that we moved our function, we need to update our throwable object component. So going to our throwable object component. Let's remove that from our import. Now we'll reimpport our function. So it comes from a utils file.

Now that we've added interactable objects like chest and pots, it's time to start building out the actual world our game takes place in. To design our levels efficiently, we'll be using Tiled, a powerful and flexible level editor. With Tiled, we can visually create our maps, define object placements, and set up collision layers, and even store metadata for things like enemy spawn locations and room connections. By the end of the section, we'll have our dungeon fully designed and ready to load into our game. Let's jump in and start creating our levels.

To start building our levels in Tiled, we'll need to download the assets we'll be using for our project. In the description of this video, there'll be a link to this page here, as well as a direct download to a zip folder. This zip folder is going to have all of our assets we'll need for tiled as well as some utility scripts we'll use for parsing our level data inside our game. If you can download that zip folder now and extract it, you should see the following contents. There should be four main folders.

Assets, other scripts, and tiled assets. This just has the original asset files that were used for our project. Other has our diagrams that we've referenced in our series. Scripts. This has some utility scripts that will help us in parsing our data from tiled inside our phaser game.

We'll add these to our project later. And so tiled, this has all the assets we'll need for our tiled project, as well as the final dungeon and world maps that we'll build for our project. So now that we have our project files, let's go ahead and open up tiled. So once we've opened up tiled, let's do open file or project. And then let's choose our Zelda tiled tiled project file.

This will open up our existing project. And now if we do open file, let's open up our dungeon one and our world levels. our world levels. For our game, we'll be using Tile to create and manage the tile maps for each area of our game. As an example, we'll build a dungeon tile map and an overworld tile map to see how different areas come together.

Tiled will allow us to not only design the background and foreground images for our levels, but also define the metadata our game needs. This includes placement of objects like our chest, our pots, our buttons and our doors, positioning and types of enemies, defining rooms or areas within our dungeon and overworld and their sizes. Setting up level connections and transitions, collision boundaries for our players and for our enemies, and much more. To manage this metadata efficiently, we'll take advantage of tiles built-in tools. We'll create custom object types and place these objects into our tile map and set up layers to handle collision boundaries.

By doing this, we can export our level data as a JSON file, which Phaser can then use to dynamically generate our levels. Our JSON file will store level information for collision detection and Phaser's physics system. Object layers defining interactive game elements. How we'll build our levels and tiled. First, we'll define our level layout.

We'll start by creating two layers, one for our background and one for the foreground. Next, we'll import assets and create our tile sets. These tile sets will allow us to decorate our levels and define the playable environment. Then, we'll set up our boundaries and our rooms. We'll outline our collision areas and structure individual rooms for our dungeon.

Finally, we'll add our interactive objects. Using object layers, we'll place important game elements like our doors, our chest, and our enemies. By structuring our game this way, we keep our game logic and visuals separate, making it easier to manage. Instead of hard coding levels in Phaser, we can export images and metadata from tiled, reducing manual setup inside the game engine. Now that we understand our project structure, let's jump in and start building our levels from scratch.

To start building our level, let's do file. We'll do new. Let's do new map. For our new map, we'll leave our default settings for our orientation, our tile layer format, and our tile render order as is. All right.

So, for our map size, we'll do 64x 48 tiles. For our tile size, we want to make sure we do 16 pixels x 16 pixels. This should result in a map size of 1,024x 768. Let's hit okay. And this should create our new map.

So the first thing we'll do is let's save our new map. So we'll do file. Let's do save as. I'm going to make a new folder. I'm just going to call this levels.

And now for our file name, I'm just going to call this dungeon_1. To start building our level, first we'll need to import our tile sets we'll be using for our tile layers. To do that, we'll click on new tile set. Let's click on browse. And now under our tiles folder, let's go into assets.

We'll start off with our collision image. Let's do open. Now for our settings, we just want to leave our type based on tile set image. And we want to do embed and map. We can leave our default name that's selected.

Then for our tile width and height, we'll just want to make sure this is 16x 16 with no margin and spacing. Let's hit okay. And what this will do, this is going to add a new tile set to our project that able to choose our tile and add that to our layer here. Let's add another tile set to our project. So if we come down here, let's do new.

We'll do let's do new. We'll do browse. Let's choose our legend spider dungeon image. We'll hit open. And now for our settings, we can leave the default as is.

We'll just want to make sure our tile width and height are set to 16 and we have no margin or spacing. Let's hit okay. And now this will add another tile set. And we can toggle between them by clicking our tabs here. And now because we set our frames to be 16 x 16, our image is now split up into these individual frames where we can click on them and then add them to our tile tile layer.

To start building our level, we'll start off by adding a background image to our map that we'll be able to use for reference while building out our dungeon. So in tiled, we have a variety of different layers that we can use in our map. The most basic of our layers is our tile layer. And now this layer allows us to grab our various tiles and then paint them on to our tile map. Besides our tile layer, we can also create what's called an object layer.

And your object layers, this is how we can add our metadata or our objects to our map. And so for the objects we add, this is really just metadata we want to attach to our map. And then we can parse that in our Phaser game. Next, we have a group layer. And so a group layer is just a way for us to organize our layers together.

As an example, when we're adding in our rooms, we can create nested structure like this where all of our layers for our various objects are tied to a single room. And now we have them grouped by rooms here. And this will help keep our project organized. And finally, we have what's called an image layer. And this layer allows us to choose an image to add to our map.

This is a great way to add a background to your level or to add a guide that you want to use as reference while you're designing your level. Now that we've reviewed our various layer types, let's start off by creating an image layer for our project. We'll do a new image layer. We're going to call this guide. So now for our level, we're going to add a background image we'll use for reference while we're building out our dungeon.

All right. So to add an image, if we click on our layer over on our panel on the image property, if we click on the choose button here, we can choose an image to add to our project from our tiled folder. Let's do example and let's do our dungeon one background. What this will do is it's going to load in our image and it should match the size of our level that we've defined for our map. Now, one of the things we can do for our various layers is we can update the opacity on them.

So then that way we can see through our various layers. So if we click on our guide layer, let's update our opacity and we're going to make our layer a little bit transparent. now we can use it as a reference while we build our dungeon. So, while we're working with our layers, a few useful things to note is we can toggle the visibility of our layers while we're working with them by clicking the eye icon. And then we can also lock our layers.

So then that way we can't modify them. This will be really nice while we're working with our tile layers. So then that way as we're painting our tiles, we'll make sure we're working on our right layer and we don't paint on the wrong one by mistake. One last thing we can do is we can update the ordering of our layers. This will be important as we're working on our various layers and how we want them to be presented to us in the UI.

As an example, if we take our opacity for our guy layer, let's move it all the way up so it's no longer transparent. If we click on our tile layer, if we choose one of our tiles and try to paint it onto our layer, it doesn't look like it's working. What's happening is our guide layer is on top of our tile layer. And since it's not transparent, this is what's visible to us in the UI. And so if we take our guide layer and we move it down below our tile layer, now we'll see all those tiles that I was painting are now visible to us.

And so this is something to keep in mind as we're working with our various layers. So what I'm going to do is I'm going to delete our tile layer and then we'll save. Now that we have our guide image in place, we're going to start building our level. So for designing our level, we want to mimic the look and feel of the classic Zelda games. And how this usually works while we're in a dungeon is for a single room of our dungeon, our player will be in it and our camera for what's visible to our player will be locked to that room.

And as our player moves around our room, our camera is going to be stationary and the player won't be able to see outside the bounds of this box here. Now, as the player navigates our dungeon and transitions between our various rooms, our camera is going to move to our next room and show that view to our player. what this would look like if our player goes from this room to this room, we're going to take our level and just kind of shift it down. And then that way, this room is now visible in our camera. Now, we would repeat this pattern for each of our single rooms this until our player encounters a room that's bigger than that defined area.

How this will work is once our player enters this room, this red box represents our whole room and our camera will be bounded to that room. And so how this will work is our player navigates up. Our camera is going to follow our player until we reach the end of our room and our bounding box for our camera. And so while we're designing our level, we'll want to design our rooms in a similar fashion. And so to recreate that feeling, we'll want to make sure the size of our rooms is at least as big as our phaser game configuration.

So for our phaser game configuration, right now we're set to 256x 224 pixels. And so for our rooms, because each of our tiles is 16 pixels, that means our dungeon room needs to be at least needs to be at least 16x4. And so as long as we design our rooms to be at least that size, we'll make sure our camera stays within our room bounds. Now, we can make our rooms bigger and our camera will just follow our player when we're in that particular room. In the same approach, we'll be able to use this in our open area for our world level where our room is just one big room where our camera will follow our player.

Follow our player. And so one thing to know is by designing our levels this way and defining our visible areas in our game as these rooms, we'll be able to know what part of our tile map we actually need to paint and what parts we can leave empty. Because once we go to export this out as our image, we're going to have this missing gap like this. But for our dungeon, this will be the only visible area to our player. And we'll control that through our code when we move our camera in our game.

Camera in our game. Now that we have reviewed how we'll design our levels, we'll start building out our first map. For our map, we need to start off by creating two new layers, one for our background and one for our foreground. How these will work is each of our layers, we're going to export them out as images and then load those into our Phaser game. For our background, this is going to be our overall background for our game that we'll display to our player.

For our dungeon, that's going to be our main dungeon layout like this. and we'll use the metadata in our tiled export to populate our other game objects. Our second layer is going to be our foreground and this is going to be an image that we're going to render on top of our other game objects in our game. By doing this, it's going to allow us to have a dynamic effect where our player can move across our map and it's going to be on a different layer than our background and our foreground. By doing this, as our player navigates through our dungeon and we want to transition between our rooms, we're going to have this really nice effect where it's going to look like our player is actually moving under our roof of our dungeon here.

And so in tiled, what that will look like is we're going to have this background layer here. And this is where we're going to paint our actual map itself with our tile set. And then we'll do the same thing for our foreground. And now we'll be able to quickly choose which layer we want to export and create our image from. So to do this, let's add a new tile layer to our project.

We're going to call this going to call this background. Let's add in one more tile layer, and we're going to call this foreground. To start designing our levels, we'll begin by creating the background layer, which serves as the foundation for our environment. We'll use a reference image as a guide, ensuring that our layout aligns with our intended level design. As we build out our first level and connect everything together, this structured approach will make it easier to get started.

Once you've gone through this process, you can use the same techniques to create your own custom levels with unique layouts and designs. To start painting tiles onto our tile layer, first we need to choose our background layer from the layers panel. Next, we need to choose a tile that we want to paint onto our map. We'll want to make sure that the stamp brush is selected. And then all you have to do is you just need to click and you can drag and place your tiles where you on your map.

You can also just click and do one tile at a time. And then if you need to create a straight row, if you hold the shift key and then click and drag, you can now create a straight row of your tiles. Another useful tool is you can select more than one tile at a time. And so if you select a group of tiles, you can then paint that whole group onto your tile layer. So now for our rooms, I'm going to grab these two tiles here.

If we hold the shift key and click here, we can then click and drag across to create our first wall. Next, we'll need to do our sides. So let's grab these two tiles. We'll start here. We'll repeat that process.

Let's do our other side. Now we want to do our bottom row. So let's grab those those tiles. And now we'll want to do our corners. So for our corners, we can just grab these four tiles here.

And then we can snap those into place. Now for our first room, we just need to do our door. So in our tile set, if we scroll down, we can find our open door. Let's grab those tiles and we'll paint those paint those there. All right.

All right. So, now that we have our first room painted, let's go down to our next room and we'll repeat that process. So, just to speed things up a little bit, I'm going to zoom out and I'm going to paint some of our doors and our other tiles when we have those selected. So, I'm going to start with our door here. Next, we'll grab our other door.

And so, while you're painting, if you make any mistakes, you can choose the eraser tool and then you can erase the tiles that you added. You can also use your shortcut to do the undo. And then finally, since this is like a paint canvas, you can also just paint over your tiles. So, as an example, if I have these tiles here, I can then grab these and just draw over it. And now those tiles will take that place.

All right. I'm going to finish adding in our doors. Next, we'll come back to the top of our tile set and we'll add in the rest of our walls. So, I'm going to grab these tiles here. We'll shift and click and create most of our walls.

It's now we just need to repeat the process for the rest of our walls in our dungeon. All right, for the next part of this video, I'm going to speed this up a little bit, but feel free to pause the video and take your time painting your walls. All right. For our rooms where our walls come into our room a little bit and we have this pointed design like this, we can use this part of our tile set. So, if we grab these corner tiles, we should be able to paint those on and should match the design of our wall.

We'll do the same thing for the other part of our room. So, we'll grab those four tiles and we'll paint those on. And now we'll just need to do that to our other dungeon room. So, down here, we'll grab our four tiles. We'll paint those on.

So, now for our dungeon entrance, let's grab these four tiles here. We'll paint our one pillar. We'll grab these four tiles. We'll do our other pillar. Now, grab this tile here.

And that's going to be this part of our room. And now, we just need to do our rug. So, if we grab this tile, we'll paint those on. Now, if we grab the corner part of our rug, we'll paint that on. We'll do our other corner.

Let's do this part here. And now we have our entrance. All right. now for our dungeon, we'll want to paint this floor piece here, which is an indicator that we're on our way to our boss. So, for our dungeon, we'll have our boss located in this room here.

This will be a small challenge area before our player gets to our boss. And then our boss key will be needed to unlock this door. So, if we grab these tiles here, we can paint that in front of our door. Next, for our dungeon, we'll work on adding in our remaining tiles for our floor. So, for these tiles here, these represent areas.

We will place a pot in our dungeon. For that, we'll use this tile here. So, let's paint those onto our dungeon now. And then for our last room, and now we just need to paint our dungeon floor. for our floor.

Primarily, this will be made up of one tile, but then we'll have a few unique tiles scattered throughout our floor just to add some variance to our dungeon's floor. Instead of painstakingly creating these tiles one by one, we'll use tiles random mode to add some random tiles after we paint our initial floor. So, now to paint our floor, let's choose this tile here. And instead of painting our tiles one by one, we're going to use our shape fill tool. What that tool allows us to do is we can drag a rectangle onto our tile layer.

And it's going to fill up that rectangle with that tile we selected. So, what we can quickly do is fill in our main areas for our floor. Then we can switch back to our stamp brush and we'll fill in our missing areas. So, now to add some randomness to our floor, let's choose all of our tiles for our floor here. Now, if we click this dice block here, which enables our random mode, we'll see as we move our cursor around tile, we'll randomly select one of our tiles from that pool, and we can use that to paint some random tiles onto our floor.

Now it's going to move our mouse around and click in a few random spots just to add some variety to our floor. And so if you keep clicking, you can repaint over your existing tile and then you can get a random tile in that location. All right, so now we just need to repeat this pattern for the rest of our rooms. I'm going to speed up this part of this video, but feel free to pause the video and take your time painting your floors. Finally, for our background layer, we just need to add in the top of our dungeon.

For this, let's choose this group of tiles here. We want to make sure we enable our random mode. And then we're going to use our shape fill tool. And by enabling both our random and our shape fill tool, we can drag our rectangle. And what this will do is it's randomly going to choose one of the tiles that we had selected from our pool.

So now we can use our shape fill tool to fill in the rest of our dungeon. All right, our background layer should now be complete. So now we can move on to our foreground layer. Our foreground layer is primarily just going to be our connections between our rooms and our dungeons. So, the area our player is going to walk under as they go between our rooms and our entrance into our dungeon.

So, to create our foreground layer, we're going to copy our tiles from our background layer and paste those onto our foreground layer. All right. So, to copy our tiles, choose our background layer. We want to choose our rectangle select tool. Then, we'll drag a rectangle from the top of one of our doors down to the top of our next door.

And now we'll have this group of tiles. So we come to our menu. Let's do edit. We're going to do copy. Or you can use your shortcuts.

Now we want to choose our foreground layer. And we want to do edit. And we want to do paste in place. So now to make sure everything worked properly, if we take our background layer, if we make it not visible, we'll see now on our foreground layer, we now have those tiles that we just copied and pasted. Oh, it looks I grabbed a few extra tiles.

So I'm going to erase these tiles from our bottom row here. And so to make it a little bit easier to see what we're doing, I'm going to update our opacity and our background layer. And I'll make it pretty transparent. So now we'll want to repeat this process for other transitions. So let's come down to our room down here.

We'll grab our select tool. Grab those tiles. I'm going to copy. Choose our foreground layer. We'll do paste in place.

And now let's do this for all of our other hallways. So I'm going to copy this going to copy this here. And we'll do our door entrance. All right. So, if we hide our background and our guide layers, we should now see our foreground layer with all of our tiles.

So, now for our foreground layer, we just need to make a few adjustments. First, for our dungeon entrance, we want to remove this yellow from our entrance here. Otherwise, when our player goes to move and leave our dungeon, that floor will show on top of our player. And we only want to have this top part of our archway covering our player. So we want to choose this tile here.

And let's paint over those two tiles. Next, we'll want to do the same thing for our doors. And so we want to remove the black piece from our door entryways. So in our tile set, if we come down, we'll see we have the top part of our doors with the black removed. We'll want to grab those two tiles and then paint over those tiles.

All right, let's go ahead and save. I'm going to compare this with our original level. Oh, I just need to fix our side here. We should have one more row on our tiles. To fix that, I'm going to reenable our background layer.

I'm going to grab our select tool. I'm going to copy these tiles here. We'll paste them onto our foreground. All right, that last change. Let's save our level.

And now I'm going to lock our background or foreground layers so we don't accidentally make don't accidentally make changes. Now that we finished designing our level, we're going to work on setting up our boundaries and defining the area that our player and our enemies can move within our dungeon. To do this, we'll create two new tile layers. One for our player and one for our enemy. And on these tile layers, we're going to paint our boundary of where our player or our enemy will be able to move.

So, as an example, on this tile layer here, we're using a single tile to define all of the areas that our player can move within this level. For our enemies, we do a similar approach, but we block off the entrance into our room to keep our enemies within that room. And so how this will work, when we export out our JSON data for our map, we'll be able to reference this particular layer and then use that to do our collision detections in Phaser. To do this, let's add two new tile layers to our project. For our first one, we're going to call this collision.

We'll add in one more tile layer, and we're going to call this enemy enemy collision. We'll start with our enemy collision layer. Let's make sure we select our enemy collision layer from our inspector. Let's choose our collision tile set and then choose our red tile from that tile set. Now, for each of our rooms, we want to paint our tile set where our wall meets our floor.

And how this works is when we load our tile layer into phaser, we'll be able to create an invisible wall and have our enemy game objects collide with this red barrier that we're defining here. This will make it look like with our physics that our enemies are running into our wall, they'll stop and then move somewhere else. And so, like with our wisp enemy, our enemy will collide with our wall here and then start bouncing around inside our room. And so, now we just need to repeat this pattern for the rest of our rooms. And so, primarily where we have this tile, where our wall meets our floor, that's where we want to paint this.

All right. All right. So, once we're done, our tile layer should look this. Let's lock that layer. And I'm going to make that layer invisible.

And now, let's do our player collision layer. So, now for our player collision layer, we'll want to do the same thing we did for enemy collision layer, except when it comes to our entrances to our rooms, we'll want to leave that open so our player can navigate through our various rooms in our dungeon. We'll want to make sure we have an invisible wall here to keep our player constrained to this hallway. To do this, let's choose our collision layer. We'll choose our collision tile from our collision tile set.

And then we'll paint the walls in our our dungeon. We'll come up to our door. And now for our door, we just want to do a line down to our next door like this. So now we just need to repeat this pattern for the rest of our dungeon. And so we'll come back to our entrance layer in a second.

We'll do the rest of our dungeon. And so now for our dungeon entrance, we just want to come over one tile and come all the way down. And then we'll prevent our player from leaving our map. So now when we're done, our player collision tile layer should look like this. So now let's lock our layer and we'll make it not visible.

Now that we've finished setting up our collision layers, it's time for us to start working with our tiled objects. Our tiled objects are a way for us to add additional metadata to our level and we'll be able to import that in through our JSON file. For our first piece of metadata, we'll work on defining our room structures for our dungeon. And so what this will look like for our rooms is we're going to define a new object layer and tiled. And on that object layer, we can add a bunch of different objects.

For our rooms, we're going to create an object that represents each of our rooms in our dungeon. And then on each of these objects, we can define our properties our X and Y, our width and height, and we'll use that to set our width and height of each of our rooms. We'll then be able to use that metadata when we import our JSON data into our Phaser game. We'll be able to use that width and height to define our bounds for our camera for a particular room. We can then add additional custom properties to each of our objects.

And this allows us to assign an ID to each of our rooms. And that's how we'll be able to then transition between our rooms later on when we add in our doors. And so the main takeaway for objects is these are just a way for us to pass additional metadata in our tile map that we can use in our game. When it comes to rendering out our level, we won't actually render out this object. Instead, we're going to use it just to keep track of where our player is at in our level.

And this will make more sense once we import our JSON data into our phaser game. So now to get started with our changes, let's add a new layer. We're going to do an object layer. We're going to call this rooms. So now to create objects on our object layer, we have a few different options available to us.

We can use basic shapes to define an area for our object, which will give us things like our X and Y, our width and height. We could do things like a point which would give us just our X and Y values or we have different shapes available to us. We also have the option to insert tiles to represent our object and then we can modify those tiles dimensions. And so this will be the approach that we take for our rooms. We'll choose our insert tile tool.

Let's choose our collision tile from our collision tile set. So now for placing our object, we're going to place that down here in our bottom lefthand corner of where our room is. What this will do is this will create an object that will have the width and the height of our tile that we used to create that object. And now our tiles will be positioned at zero and 240 for our Y. Now to create the dimensions of our room, we'll want to update our width and height of our object.

And so for our width, we'll want to do 256. And then for our height, we want to do do 224. And so once we change our width and height properties, our object should be updated. And now it should cover up our whole room. And so I'm just going to update the opacity for our room layer here so we can still see our room under it.

And now we just need to repeat this process for the other rooms in our dungeon. To make this a little bit simpler, I'm going to choose our select object tool. Let's choose our room. I'm going to copy it. And now if we paste it, we should get a copy of our object.

And now we can just drag this object over our other room in our dungeon. Now I'm just going to repeat this pattern. So we create each of our rooms. And now for our last room, we just need to update our height to match the dimension of our room. So now for our height, this should be 464 pixels.

Once we finished creating our six room objects, our tile map should now look like this. For each of our objects, we now want to add in our custom property, our ID of our room. So now to add custom properties in tiled, we need to choose our object that we want to modify. Over inspector, we can then hit this plus icon to add a new property to our object. It's now in the modal that appears.

We can choose our type for our property. And so we have the built-in types for our basic variables like a boolean, an integer, object, or a string. For our ID property, we want to do an integer. And now we can add in the name of our property. So we're going to call this ID.

Once we do this, we'll have our new custom property show up. And now we can add in our value that we like to use. And so with this approach, we would need to manually add all of our custom properties one by one to each of our objects. Another option is for each of our objects, we can assign a class to that object. This class allows us to define which properties must exist on this object and then it will automatically add those for us.

As an example, if we choose one of our room objects and from our dropown, if we choose room, we should now see our ID property gets added to our object. And right now it's grayed out because it has our default value of zero. And so we can override this by clicking and adding our value. And now we'll see our custom property turns white to show we overrided that value. And so how our class types work is in tiled if we go up to our menu and we do view we do custom types editor.

This editor allows us to define custom types we want to use for our project. These custom types allow us to create classes which then will allow us to create all those properties we want on that object type. We can also do things like add custom enums that allow us to define our values we want for that enum. And now when we choose that property type, we will be restricted to those values. And so in your tiled project, if you don't see this list of custom types, I included an exported version of our types that you can now import.

So if you do import in our tiled folder, there's this property types JSON file. If you import that now, this should now add in all these custom types for our project. And so what I did is for each of our objects, I defined a class. And on that class, I added in our properties that we'll need for our game. so as an example, for our room object, the only thing we need right now is an ID for each of our rooms.

And so we have this property here. And so how classes work is if we do add class, I'm just going to call this test, we can then define our members for that class. And so if I do the plus icon here, we now get that same modal where we can choose our property type that we want to use. And so as an example, if I wanted to add an ID property, I would choose int. I'd hit okay.

And now we have a default value that will be added to all of our classes. So now if I close out of here and I come back into our inspector now in my dropdown my new class should appear test. So I'm going to change this back to room. I'm going to go back into our custom types editor. And now we can define as many properties as we want for our class.

What's really cool is when you define these custom classes and these custom enums, these become types that we can now reference. So, as an example, if I did my door type, I'm just going to call for this, I'm just going to do to do test. What this will do is this is going to reference our door type enum. And now from our drop down, we'll have our available options from our enum. And so now to create an enum, we do the same thing.

So we'll do add enum. We add a name for our enum. And now we can choose our enum type, either a string or a number. And then we just add in our values that we want to use. So I can do test one.

We could do test two and then in our classes we can add that as one of our types. And so now if I do my enum six I'm going to call this test two we'll see our enum values show up here. So I'm going to go ahead and remove those classes and those enums uh from our project. All right so for the time being we're not going to dive into each of these custom types and we'll go over these as we start creating those types of objects. Uh for the time being, our main class we want to focus on is our room since that gives us our ID property.

And now we can update those on our objects. So let's close out of our custom types editor. We'll want to make sure we choose our room for our class type. And we'll want to have our ID of our room up here to be one. And now we'll do the same thing down here.

And we'll do our room, but now we want to do two. And now we'll do three, four, five, and and six. All right. So once we're done, each of our rooms should now have our custom class type with our ID populated with the appropriate value. So now that we're done with our rooms objects, I'm going to lock that layer so we don't modify it.

And I'm going to hide that layer from our project. Now that we finished setting up our collision layers and defining the structure for each of our rooms in our dungeon, it's time for us to move on to our other interactive object types. So now we'll focus on creating our object layers to represent our elements like our doors, our chest, our traps, and our enemies and our dungeon. So now for each of our object types, we're going to create these as object layers, and we're going to group them together based on our room that those objects belong to. To do this, we're going to use our group layer to create a group for our rooms.

And then we'll have a subgroup for each of our room IDs, followed by our object layers with those relevant objects. And so by structuring our project this way, it'll make it easier while we're working with our objects in our phaser game. So to get started, let's make a new group layer. We're going to call this rooms. And so now we need to create a group layer for each of our group layer for each of our rooms.

Let's do a new a new group layer. We're going to call this group layer one. Let's drag that group into our rooms group. So now it should be a subgroup. And now I'm going to choose this duplicate layer option here.

Let's duplicate our room. So we have six rooms in total. And now I'm just going to update our ordering. So we'll put one at the top. And then we'll do two.

We'll do three, four, five, and six. Get rid of this extra one. And now for each of our group layers. Now we'll create our object layers with our various objects. All right.

So now for each of our rooms, we're going to start off by defining our door objects that exist in that room. So in our group layer for our room one, let's do a new object layer. We're going to call this to call this doors. Let's drop that. Let's drag that object layer into our group layer one.

For our tile door objects in our level, these are meant to represent areas in our level where when our player collides with it, our player can then transition to another part of our level or to another level altogether. How this looks in our existing dungeon is we're going to add a door object to each of our doors where our player can move from this room to another room. Besides moving to another room in our dungeon, we want to add our door to our dungeon entrance, which act as a trigger to move our player from our dungeon to our world level. And so now for each of our tile door objects, we're going to need properties to keep track of which door or level this door connects to. So as an example, this door's ID is two, and it currently connects to our target door ID of one inside our room 4.

So now if we come over to room four and we click this door here, we'll see our ID is one. And this matches our target door ID from this door here. By adding in this properties, it allows us to know where we need to transition our player to in our dungeon. We also add in properties which direction our player needs to head in order to move to our next door. And so for this door here, we're going to move in the direction right.

This door here, we need to move in our direction left. Finally, because these doors also represent the doors in our dungeon, we also have this door type enum here. So, if I go up to our custom types editor and we go into our door type, we'll see our various doors for our dungeon include an open door. And this is a door our player can always move through. We'll have a lock door, which requires our player to use a small key to open it up.

Our trap door will be a door that will be opened when either our player defeats all the enemies in our room or they press a button to unlock that trap. Our boss door is our door that requires our boss key to get to our boss. And then finally, our open entrance. This indicates that this is the entrance into our current level and the entrance to our dungeon. Finally, if our door is a trap door type, we add this trap door trigger property.

This trap door trigger property indicates which type of trap must be completed in order to open this door. And so for our door, it can be either opened by a switch or by all of our enemies being defeated. And so we would set this value when our door type is our trap door. Before placing objects in our dungeon rooms, we first need to finalize our level's design and mechanics. Using our guide image as a reference, we already have the dungeon layout in place.

Now, we need to determine what objects and interactive elements belong in each room. To make this easier, I've already mapped out the key elements for each space. When designing your own levels, planning these details early helps ensure a balanced and engaging experience. This includes not only room layouts, but also enemy placements, key items, traps, and of course, the dungeon boss. Before we start adding objects to our room, let's take a moment to review the overall design and see how everything connects.

For our dungeon, this is consist of six rooms. Our goal of our dungeon is our player needs to find our boss key and defeat the boss enemy in our level. As our player navigates between each of our rooms, they're going to encounter a variety of different objects and enemies that they'll be able to interact with. for our dungeon, our players going to start off in our room ID three. So, our bottom lefth hand room of our map.

When our player enters into our dungeon, they're going to see two doors. Our first door to the top will be our boss door, and this will be locked and require our boss key in order to unlock it. Our door to our right is going to be unlocked, and so our player can navigate to our room 4. When our player enters our room, this is going to trigger a trap. This trap is going to close our door that our player just entered.

And on the right hand side, we'll have a locked door that the player requires a key. Inside this room, there's going to be two enemies. These will be our wisp enemies. And so, they're going to be bouncing around our room. And our player needs to avoid them while they solve this puzzle.

And so, to solve our puzzle, there'll be four switches inside this room. And so, when our player steps on our switch, it'll do one of three things. If they step on the switches on the left, they're not going to do anything. And if they step on our bottom right hand switch, this will be our trigger to open up our trap door. So, if the player steps on the top right switch, this is going to reveal a hidden chest inside our room.

This chest will have our small key. And so, when our player opens up that chest, they'll now be able to use that key to unlock this door here. Now, our player will be able to move to our next room. And so, now when our player enters our next room, this will trigger another trap. For this trap, it's going to close both of our doors, and our player needs to hit our switch on our floor here in order to open those doors.

Inside this room, there'll be a chest that's immediately visible to our player. And there's going to be one hidden chest as well. If our player picks up one of our pots and then steps on that switch, this will reveal our other chest. So, inside this chest, our player will be able to collect our map and our compass items for our dungeon. And then when our player moves to our room ID6, now they're going to be greeted with a variety of different enemies.

So, in this room, we're going to have four of our spider enemies spawn as well as two of our wisp. And so besides our enemies, as soon as our player enters this room, this is going to trigger another trap, and that's going to close our trap door. In order to unlock this trap door, our player will need to lift up this pot and step on our floor switch. Inside this room, our player will see our boss chest, and they won't be able to open it until they find our boss key. Now, if our player defeats our four spider enemies, this is going to reveal a hidden chest in the top right hand corner, and this is going to have our boss key.

Now, our player can use that key to open up our boss chest. And so for our current level, this won't have anything inside it. But if we added in a second weapon, we can now place that inside our chest. So now with our boss key, our player can now navigate back to our room ID 3. For this, as our player re-enters our rooms, our trap's going to re-trigger.

And so our player will need to step on those switches. And so as they step on each switch, they'll open the doors until they get back to room ID 3. Once here, our player can interact with their boss door. And when they come up here, they're going to have one more challenge room before they make their way to their boss. And so when our player enters this room, this is going to trigger another trap.

And this will close both of our doors. For our room, we're going to have one wisp enemy and two spider enemies. Once our player clears our two spider enemies, that's going to unlock both of our doors here. And so how we'll set up our dungeon is when our player defeats our enemies, when they leave that room and come back, those enemies will not respawn. So if our player came back down to room three and back up to room two, our doors would no longer lock and they'll be unlocked for our player to progress to our boss room.

Finally, when we get to room ID 1, this is where our boss will be located. And so, our boss will teleport into our room, and this will start our boss fight. When our player enters this room, this is going to trigger another trap. And this trap will be tied to us defeating our boss before our player can before our player can leave. With our dungeon design fully mapped out, let's switch back to tile and start placing our and start placing our objects.

So, now we'll focus on adding all of our door objects to our dungeon. For this, we'll need to create an object layer for each of our rooms. So, we already have our doors object layer for our room ID 1. Let's add an object layer to each of our other rooms. For that, I'm just going to duplicate our layer five five times.

And now, we're just going to place a copy of our doors into each of our other our other rooms. Now, we'll just update our layer names. So, we're just going to call this doors. I'm going to copy that. So, now we'll focus on getting our objects placed, and then we'll come back and update their properties.

So now for each of our door objects, we're want to place that at the top of each of our doors. So now start placing our objects. Let's choose our door layer that's tied to our room one. Let's choose our insert tile tool. We'll grab our collision tile.

We're going to place that down here in our bottom lefth hand corner of our door. All right. Now for our object, let's update our width. We're going to do 32 pixels. And now for our height, we only want this to be half of our current size.

And so for our height, we'll make this 8 pixels. And now we just need to update our positioning. So for our object, this is currently in the bottom half of one of our tiles, but we want it to be in our top half. For that, we need to update our Y value. And so we're going to subtract 8 pixels from it.

And we'll do 232. Once we do that, our door object should be in this position. And now we should see the top of our door visible behind our object. So now for our object, let's add in our door class. And for the time being, we'll just leave our properties alone.

And let's create the rest of our objects. So now if we click on our door object, let's copy it. Let's go to our door object layer for room two. And now we'll want to paste in two instances of our object. We'll paste one at the top of our door here and then one down at the bottom.

And now we'll need to update our positioning. So we want to subtract 8 pixels from this. So we have 488. And now we want to do the same thing for our next room. So we'll go to room next.

Let's move on to room three. Let's choose our layer. We'll paste in our door. door. Now we just need to add in our door for our right-h hand door here.

So if we paste in our object, we'll need to update our width and our height. So for our height, we'll want this to be 32 pixels. And then for our width, we want this to be 8 pixels. So now if we take our object, we should be able to move it over the top of our door. Let's copy that object instance.

And now to move to our next our next room. So now for our door on our left, we just need to update our X position. we'll add 8 pixels to it. So it should be 280. Let's move to our next room.

We'll update our position. So, we'll have we'll have 536. Finally, we'll go to our last room. Then, we'll have room. Then, we'll have 792.

Now, for each of our door objects, we need to update our relevant properties. So, starting in room six for our door, our direction, we're going to move to the left. Our door type, this is going to be our trap door. Since it's our trap door, we need to set our trigger. And this is going to be a switch.

Now for our door ID, we're going to do door ID one since it's the only door in our room. And now we need to choose our target door that this door connects to. And so this will be our door ID 2. It'll be our target room. And we'll do five.

Since this door just connects to another door in our dungeon, we can leave our is level transition and target level blank. So now let's go over to room five. For our door on our left, we'll have our direction go left. Our door type, this will be a trap door. Our trigger will be our trigger will be our switch.

Our door ID will be one. Our target door ID will be target door ID will be two. And for our target room ID, this will be four. So now for our right hand door, we'll update our ID to be two. And now this is important since this door connects to this door here.

We need to make sure the ID of this door matches our target door ID that we provide here. now for our door direction, we'll go right. Our door type will be a trap. It'll be our switch. Now for our target door ID, it'll be one since that's the ID of this door here.

Now for our room ID, we'll be going to room six. Let's move over to our next room. So we'll do our door ID, we'll do one. Do a door ID of two here. Now for our direction on our lefth hand door, we'll go left.

Our door type will be our trap door. We have to do our switch. Now for our target room, this will be three. And our door ID that we target will be two. So now for our right-hand door, our direction will be right.

Our door is going to be a locked door. So since our door is locked, let's update our door trigger. We'll set it to be none. Now for our target room ID, we'll go to room five. Our door ID, our target door ID will be one.

Now let's move over to our next room. So for our top door, we're going to have this be an ID of one. Our right door will be our ID of two. And now our bottom door, this will be ID3. Starting with our top door, we'll go in the up direction.

Our door type is our boss door. We'll set our trap door trigger type to be none. Now, for our target door ID, this will be two. And our room ID will be two. For our right hand door, we'll be moving to the right.

Our door type will be open. Since our door is open, there will be no trap. Now, for our target door ID, this will be one. And our target room will be four. Finally, for our bottom door, our direction will be down.

Our door type will be our open will be our open entrance. Let's check our box for is level transition. And now for our target door ID, we'll do one. Our target room ID will be one. Finally, for our door, since this is transitioning to our world level, we need to check our box for is level transition.

And now we need to provide our target level name. For our target level name, we're just going to do world. And so how we'll use our target level is when our player collides with our object here, we're going to use this string to know which background and foreground images to load and use for our level, as well as which JSON file for our level we're loading. Uh, as an example, when we build our world level, we're going to export out our foreground and background images with our world prefix. And then for our JSON file, we'll call this world.

Json. And so inside this level when we add in our door we'll point to our door we'll point to our dungeon_1. And now for our dungeon one when we export out our foreground and background images as well as our JSON file we'll use that naming convention. Finally since it's not a trap we'll set this to be none. All right move up to room two.

Our top door we'll do our direction up. Our door type this will be our trap door ID will be one. Our target door ID will be one. Our target room ID will be one. And our trap type will be our enemies defeated.

Our bottom door will go in the direction down. Our door type will be our trap. Our ID will be two. Our target door ID will be one. Our target room will be three.

And this will be our enemies defeated for our door type. Finally, for our last room, this will be our boss room. And so for our door, our direction will be down. Now, for our door type, this will be a trap door. Our ID will be one.

Now our target door ID will be one. Our room will be two. And now we want to do enemies defeated since we don't want to leave until we defeat our boss until we defeat our boss enemy. So now that last change, we now have all of our door objects in place for our dungeon. Since we're done with our doors, we're going to lock our door object layers to make sure we don't add any additional objects to those layers.

Now that we finished adding our door objects to our dungeon, it's time for us to work on our next object type, our switches. So, for our switches, we're going to have these in three of our rooms in our dungeon. We'll have these in our room four, five, and six. And for our switches, we're going to have two primary types. We're going to have a floor switch will be like a pressure plate where when our player steps on that tile in our dungeon, it might do something.

For our second type, these are going to be buttons that are hidden under our pots in our dungeon. And so, when our player lifts up our pot, they can then step on that button to do something in our room. And so for our switches, it's going to do one of three things. It's either going to do nothing for our existing room, it's going to reveal a chest, or it might open up one of our doors. Later on, this could be extended to do things like if I press a switch, it'll drop a key into our room for our player to pick up.

And before we start adding our objects, we're going to quickly review our custom types for our class. So if we go into our custom types editor, we're going to have a class that represents our switch. And on our switch, we're going to have three main properties. We're going to have action, our target ids, and then our texture. And so our action property, this is going to keep track of what our switch can actually do.

And so this is going to be our switch action enum. And our switch can do nothing for the current room. It might open a door, it could reveal a chest or reveal a key. Now, when our switch does something, we'll need to provide the target ID of that action. So, as an example, when we press our switch in room 6, we need to provide our target door ID of one.

So, we know we need to open up this door versus when we're in room ID 5, if we press our switch here, we're targeting revealing a chest. And so, we need to provide our chest ID of which chest we want to reveal. And for one more example, in room five, when we press our green switch here, this is going to open up both of our trap doors. And so, for our target IDs, we need to provide one and two. So we can open up both of those doors.

And so for our target ID's property, this will be a string and we expect our values to be separated by a comma. Our final property texture. This is going to be our switch texture enum. And this is going to determine which texture we want to render out in our game for this game for this switch. So now to start adding our switch game objects, we need to add our new object layers to our rooms four, five, and six.

So let's make a new object layer. We're going to call this switches. We're going to copy that name. Let's drag our layer into room four. Now, let's add in two more layers.

So, let's duplicate our layer twice. We'll drag a copy into room five and then a copy into room six. And we'll update our name. So, let's start in room four. So, if we choose our switch object layer for room four, what we'll want to do is we'll want to add in four objects into these locations.

So, let's choose our insert tile. So, let's choose our insert tile tool. Let's choose our collision object. as we're going to place this three tiles over and then two tiles down. Now for our object, let's add in our switch class.

For the time being, we won't populate our properties. But now, let's choose our select object tool. Let's copy our object. We'll paste it. And now we'll place this on the other side of our dungeon.

So, two tiles down, three tiles over. Now, we want to do the same thing at the bottom of our dungeon. now we have our four objects. So now for our tile objects, our two switches on our left, these won't actually do anything. Since they're not going to do anything, we'll update our action to say nothing.

For our target IDs, we'll just do our empty string. And now for our texture, these switches are going to be on our floor. So we want to choose our floor texture. Let's do the same thing for our bottom left. And so we'll do nothing.

And we want to choose our floor texture. And now for our switch in our bottom right. This is going to open up our trap door. So if we choose our switch for our action, we want to do open door. Now for our target ID, this needs to match our door ID here since it'll be our door ID of one.

Now for our texture, this is going to be our floor switch. Now finally for our top right switch, this is going to reveal a hidden chest in our room. For our action, we want to do reveal chest. For our target ID, we'll do one. Once we add in our chest game object, we'll want to make sure we have that same ID.

So we reveal the correct chest. Let's update our texture and we'll do floor. So now we can move on to our next room. Let's copy our switch object that opens up our door. We'll move over to our next room.

And now we want to place our object right here by our door. So for this particular switch, this is going to be responsible for opening up both of our trap doors and our room ID 5. So now for our object, we want to do our action of open door. Now, for our target IDs, we want to do 1, 2, and our texture will be our floor texture. Oh, and I forgot to place that in our correct room.

So, I'm going to make a copy of that object. I'm going to delete it. Now, I'm going to choose my switches layer for room five, and we want to paste it back in that location. So, now let's make a copy of our object. We want to place it over where we're going to place our pot here.

Now for this switch, it's going to be responsible for revealing one of our chest. So, let's update our action. We're going to do reveal chest. And now for our target ID, this will be our chest one. And now for our texture, we want to do our plate texture.

Since this switch is going to be hidden under one of our pots, what we'll end up doing is we're going to render out this frame here in our game. And then once our player presses our button, we're going to show this frame here to show the button was pressed. Finally, let's move on to room six. Let's copy this object here. Now, we'll choose our object layer for room six.

Let's paste in our object. And we want to do that over our bottom left spot where we'll place our pods. So for our final switch, this is going to be responsible for unlocking our trap door and our room. So let's update our properties. We're going to do open door.

Our target ID will be our door one. And we'll want to do our plate for our texture. All right. So if we save with our new objects, our dungeon map should look like this. Since we're done with our switches, I'm going to lock those layers so we don't place any additional objects on those layers.

Now that we finished adding our switch game objects to our level, it's time for us to work on our chess game objects. For our chess game objects, these are going to be located in three of our rooms, so four, five, and six. And for our chest, we're going to have two main types. We're going to have our small chest that our players can open up at any time, and then we'll have our large chest, which will be our boss chest. And typically this would have our item that would help our player in our dungeon and they would get this item if they have their boss key.

Now for our chest, these can either be visible when our player enters our room or they might be hidden and they require the player completing some type of puzzle for them to be revealed. And so for our chest object and tiled, we'll have a custom class. So I'm going to go into our custom types editor. And so for our chest, we'll have four main properties. Our first one's going to be our ID.

So each of our chests in our rooms will have a unique ID and that way we can keep track of which chest we've opened. As well as when we need to reveal a chest, we'll use that target ID to target this ID. We're going to have a boolean value if this chest is one of our big chest and it requires our boss key to open it. And then our reveal chest trigger property. This is going to be used by our game to know if our chest is immediately visible when our player enters our room or if our player needs to do something to reveal our chest.

And so this will be pressing one of our switches or defeating all of our enemies. Our last property will be our contents and this is going to be our chest rewards enum. Well, we'll use this to keep track of what our player will get when they open up this chest. So for our current dungeon, this would be things like a small key, our boss key, our map, our compass, or in the case of our boss chest, nothing for the time being. To start adding in our objects, we need to create a new object layer.

So let's make a new object layer. We're going to call this chest. We're going to place this object layer into our room four. Let's duplicate that layer twice. We'll move one of our layers into room five.

And we'll move our final layer into room six. Let's copy the name of our layer. And we'll update our other layer names. And now let's start in room And now let's start in room four. Let's choose our insert tile tool.

Now for our tiles, we'll actually place our chest to represent where we'll have our chest in our dungeon. We'll choose our chest texture and let's place that in our top lefthand corner of our room. now for our chest object, let's choose our chest class. This is now for our properties for the chest in our room 4. Our contents is going to be our small key.

And that's how our player will be able to unlock our door here. Now for ID, we'll do ID 1. This is one of our small chests. We don't need to require our boss key. And now for our reveal chest trigger.

This is going to be when we press one of our we press one of our switches. So now let's copy our object. Let's move over to our room five. We'll select our chest object layer and we'll paste our chest object into our top right hand corner here. Now, this room, we're actually going to have two chest and we'll have one chest that's visible when our player enters our room and we'll have another chest that gets revealed when our player presses our switch under our pot.

So, for our chest on the right, we'll update our contents. This is going to have our map for our dungeon. We'll give this an ID of two for this room. And now for our reveal chest trigger, we want to set this to be none. So our chest will be visible.

For our chest on our left, we'll have an ID of one. And now for our contents, this will be our compass. And now for our reveal chest trigger, this will be our switch. And so to make sure we're connecting everything together properly, let's unlock our switch layer for room five. If we choose our switch, we'll see we're targeting ID 1 and we're revealing our chest.

And so for our chest here, we have our ID of one and we have our reveal chest trigger is tied to our switch. So let's relock our switch layer. And now we'll move on to room six. So let's copy one of our chest objects. Let's choose our chest object layer for room six.

We'll place our chest in the middle where our big chest will be. And we'll place one more chest up in our top right hand up in our top right hand corner. So now for our room six, our chest in the top right hand corner. This is going to be a hidden chest that requires to defeat all of our enemies. And then our chest in our middle, this will be our boss chest.

So for our chest in our top right hand corner, for our contents, this is going to have our boss key. We'll keep our ID of one, but for our trigger, we want to do our enemies defeated. So now for our chest down here, this is going to represent our big chest. And so we're going to update our width and height of our object. So we're make this be 32 pixels x 32.

And now for our object, our contents, we'll do nothing. For ID, we'll do ID2. And because this is our boss chest, we'll require our boss key to unlock it. Finally, we'll set our reveal chest trigger to be none since this chest will be visible when our player enters our player enters our room. So, after we finish placing our chest game objects, our map should now look like this.

And now, let's lock our object layers since we're done adding our chest. our chest. Now that we finished adding in our chess game objects, we're going to work on adding our pot game objects to our level. For our pot game objects, we're just going to place these on top of our plates that we previously added in our background layer. So, one thing that's different between our pot game objects we're going to add and our previous tiled objects, we won't have a custom class to represent our pots.

At this time, we don't need to keep track of anything on our pot game objects. So, in our game, our player will pick them up and throw them at our enemies. Later on, if we wanted to add in the ability to have something appear under our pot when our player lifts it up, like maybe money or extra arrows or bombs, then we could add in a custom class and have a property to keep track of what item should spawn under that pot. So now to add in our pot game objects, we now need to create our object layer for each of our rooms. So we'll start off in room two.

Let's add a new object layer. We're going to call this pots. Let's drag that object layer into room two. Let's duplicate that layer three times. And now we want to drag a copy into room three.

We'll drag a copy into room five. And then finally, we'll drag our last copy into room copy into room six. Now we just want to update our object layer name. So we're going to copy pots and we'll update our names. So now we'll start off in room two.

So let's select our pots object layer for room two. Let's choose our tool for inserting a tile. We'll choose our collision tile. And now we'll place our tile over our four plates where our pots are going to spawn in our dungeon. Now we'll do the same thing for room three.

So we'll choose our object layer. We'll add our two pots. We'll come over to room five. We'll choose our object layer. Let's add in our two pot game objects.

To make sure our pots are actually being added, let's hide our switch layer. And now if we hide our pots layer, we'll see we have our two objects for our pots. Finally, for room six, we'll end our four six, we'll end our four objects. We'll do the same thing. We'll hide our switches.

Let's hide our pots. And we'll see we have our four pot game objects. So now after we add in our pot game objects, our map should look like this. So now we're done adding our pot game objects. Let's lock our object layers to make sure we don't add any additional objects to those additional objects to those layers.

Finally, in our dungeon, we just need to add in our last object type, and this will be our enemies. For our dungeon, four of our rooms are going to have enemies located inside them. In our first room, we'll have our boss type enemy. In our second room, we'll have three enemies. Two of them will be our spiders and one of them will be our wisp.

In our fourth room, we'll have two wisp. And then our sixth room, we're going to have six enemies. Two of these will be our wisp. And four of them will be our spider enemies. So now for our enemy tiled objects, we'll have a custom class called enemy.

And on this class, we're going to have one property, and this is going to be called type. Our type is going to be a number property where we can provide a value of 1 2 or three. And then we'll use that value to know which type of enemy to create in our game when we're spawning our enemy types. So now to start creating our enemy game objects, we need to add a new object layer to our appropriate rooms. in room one, let's add our new object layer.

We're going to call this object layer layer enemies. Let's duplicate that layer three three times. We'll update our layer names. So now we're going to drag a copy of this to room six. of this to room six.

We'll drag a copy to room five. We'll drag a copy to room four. And now we'll drag a copy to room two. So we'll start off in room one. We'll choose our enemies object layer.

Let's choose our insert tile tool. And we'll choose our collision collision tile. So now for our boss object, we want to spawn our boss near the top of our level away from our player when we enter into our room. So for this, we're going to come five tiles over. We'll do two tiles down.

Now, for our object class, we want to choose our enemy class. And now for our enemy type, we want to do our type three. Type three, this will be our boss enemy for this level. Type two will be our wisp enemies that'll bounce around our level. And type one will be our spider enemies.

Now that we've added in our boss enemy object, let's move to our next room. So, I'm going to copy this object here. Let's choose our enemies object layer for room two. Paste in our for room two. Paste in our object.

We'll place our tile here. I'm going to copy that. We'll place two more objects into our objects into our room. And so for our enemy objects we're placing, this is going to be the spawn point for those enemies when our player enters that room. For our locations, we can place them for anywhere in our room where we like them to spawn at.

So now for enemy object at the top of our room, this is going to be our wisp. So we'll update our type to be two. For other two enemies, these will be our spider. So let's update our type to be one. Let's copy our wisp enemy.

Next, we'll do our room four. So, if we choose our enemy object layer for room four, we want to spawn a wisp near the top of our level and one near the bottom of our level. Finally, we just need to do our last room. So, we've come to room six. Let's choose that object layer.

Let's paste in two instances of our enemy, and these will be our wisp. So, for our wisp, we want to spawn those towards the top of our level above our boss chest and our pots. And so, we want to make sure our type is set to two. Now, let's copy our object. And now we want to add in our spider enemies.

So for our spider enemies, we'll want to do two of our enemies at the top of our level and then two of our enemies at the bottom of our level. So let's update our property. We'll set this to be one. Let's copy that object. We'll paste it.

We'll paste this one over here by our chest. We'll paste it again. We'll do this one at the bottom of our level. And we'll do this one at the bottom of our one at the bottom of our level. All right.

So once we're done adding in our enemy game objects, our map should now look like this. And since we're done with our enemy objects, I'm going to lock those layers so we don't add any more objects to those layers. With our enemy objects placed, our dungeon level and tile is now complete. Now that we have all the necessary metadata, it's time to export our game data, the JSON file, and the foreground and background images required for our Phaser game. So to export our required files, we'll start with our JSON file.

For our JSON file, go up to file, we're going to do export as. And now for our file type, we want to do all files and we'll want to update our file name to be dungeon_1. json. We'll want to place this in a location that we can easily find. for our tile project, I'm going to place this in our levels folder.

If we hit save, this should now create our JSON file. And now to create our foreground and background images, we'll want to disable all of our layers in our level. Now for our background image, we want to enable that layer. Now if we go up to file, we're going to do export as image. And now we need to provide our location and our file name.

So if we click browse. So now for our file name, we'll do we'll do dungeon_1. We'll do underscore and we'll do background. We're going to place that image also in our levels folder. So if we do save.

Now we want to do export and that'll create our image. Now we want to do the same thing for our foreground. So we'll enable our foreground layer. We'll do file. We'll do export as image.

We'll do browse. Now for our file name, we'll do we'll do dungeon_1. Now we'll do underscore and we'll do we'll do foreground. Let's hit save. We'll do export.

And now we should have our three main files. Once we've exported out our data, we can add it to our phaser project. So to add our files to our phaser project, we'll want to place that under our public our assets folder. Under our assets folder, we'll go into images. Then we'll go into levels.

And under our levels, we'll go to dungeon one. And now we'll have our three files. So for our file names we add, we want to make sure we follow this pattern since this is the assets we'll be looking for for our game. So our folder should be called should be called dungeon_1. And then we'll have our two images.

So our dungeon_1, our background, and our foreground images. Then we'll have our dungeon_1 JSON file. And now this will have all of the metadata we'll need for our phaser game. Since our project template already includes the finalized level files, our JSON file and images, we'll be using those versions for the rest of the series. This ensures everything is correctly exported and set up.

However, if you're creating your own dungeon level, just follow the same steps to export the required data and update your game accordingly. Our final game will include two levels, the dungeon and the main overworld. While we won't go through the entire overworld creation process in the series, a completed version is included in the tiled project files. The overworld level that's included is intentionally small, but with our structured approach, you can expand it as needed to customize your game further. The process for creating the overworld follows the same steps as our dungeon level.

You'll want to create your tile layers for foreground and background layers, and then you'll want to paint tiles onto those layers and export those out as images. You'll want to set up your player and your enemy collision layers. Finally, you'll need to add your object layers. So, you'll need to add your objects for your rooms, your doors, your enemies, and any other interactive objects that you want in your your overworld. And so, one thing that's different between our world level and our dungeon level is we have multiple layers that actually make up our background and our foreground.

So, while we're designing our levels, sometimes it can be beneficial to create multiple layers to represent our background. So in the example here, we'll see we have separate tile layers that represents the various parts that we're drawing onto our map. The main thing here is we place all of these tile layers into a group layer called background. And now when we go to export out our images, we just need to make sure our background layer is enabled. And then that way we can create our background image.

Then likewise for our foreground, we have two different layers that make up our foreground. And since we have multiple layers of trees, it makes it easier to paint our tiles and get this effect here. So when we go to export out our foreground image, because we have multiple layers, we'll want to make sure both of these are visible when we create that image. Besides this, the rest of the layout of our level should look the same as our dungeon level. We'll have our collision and our enemy collision layers.

We'll have our rooms object layer with our rooms for this current level. And then we'll have our various object layers grouped by the room where our objects exist. For the overworld level that's included, there'll be a single room with one door that allows us to connect to our dungeon level. And so to link the overworld and dungeon levels together, we need at least one door with the correct transition properties. So for our single door that we have our overworld level.

And so for our properties, we're setting our target level to level to dungeon_1. So this matches the name of our tile map that we're creating as well as our JSON and our two images that we need to load in. And then for our target door ID and our target room ID properties, we have both of these set to three. And so this will match our door that we added into our third room that has our ID of has our ID of three. If you modify the map, simply repeat the export steps for the JSON and the background or foreground layers, ensuring the file names match the required formats.

So for our world level, we want to make sure our three file names are world. json, world_eground, and world_background. for these three files. They'll need to be placed in our public, our assets, our images, our levels, and then our world subfolder. That concludes our section on using tiled to create and export game levels.

Now, let's move on to integrating them into our phaser project. Now that we've built our level data and tiled and structured everything the way we need, it's time to bring our dungeon to life inside our game. In this section, we'll take the level data we created and use it to generate our dungeon dynamically in Phaser. We'll load our tile maps, set up our collision layers, and place objects like doors, chest, and enemies exactly where we defined them in Tiled. By the end of this section, we'll have a fully functional dungeon layout ready for exploration.

So, let's jump in and start loading our first level. Before we start building out our levels in the code, we need to set up some important scripts that will help us work with our tiled map data. These scripts include utility functions and TypeScript types that will make it easier to handle things like object properties, collisions, and level transitions. We actually already downloaded these files along with our tiled map assets. So now we just need to add them to our project.

Let's get those set up so we can start bringing our levels to life. So previously when we downloaded our tiled assets, inside the folder, there was a scripts folder. This scripts folder has scripts that we'll be using in our game. So we need to copy this tile folder here, and we want to place that in our project source code. under source, under common, we'll want to place that tiled folder here.

And we should have three files. com common. ts tiled utils and then types. ts. So before we start working on our code, let's quickly review these three files.

So in our common tiled, our comment. ts file. So this file is going to have a bunch of different objects that define the various keys of elements we worked with in tiled. This will include things like our property names on our objects we created, our layer names, our tile set names, and even our enum values that we defined on our objects. And so by defining these all as objects in our file, it'll make it easier to reference these from one location in our location in our codebase.

Then under our types file, this has all of our TypeScript definitions for our various objects that we created in tiled. So we'll have this base tiled object here that has some core properties like our X and Y, our width and our height on our object. And then we have this tiled object property that defines the various properties that we use on our objects. So then we'll see below that we have a variety of object types. So like our chest, our door, our switch objects.

So all of those objects we created in tiled now we have this type script definition that represent those objects. Finally, under our tiled utils file, this has a bunch of utility functions that are going to be useful for parsing our data from tiled and from grabbing our objects from our layers and then constructing our various objects based on those types that we just reviewed. So, as an example, we have this get tiled objects from layer where we can provide a tile layer name and it's going to grab all the various objects and build those objects based on if they have the properties that we expect. And so all these utility functions, we'll be using these in our game. And we'll go into more detail on these as we get to them in our code.

Now that we finished reviewing our new scripts from Tiled, we can move on to creating our background and foreground images for a level. In order to create the correct image game objects in our game scene when our scene starts, we'll need to know which level or area our players currently in. Currently, our project is set up under our public assets folder under images under levels, we have our two main levels. We have our dungeon and then our main overworld. And for each of our levels, we're going to have three assets we'll need to utilize in our game scene.

And so we're going to have our background and foreground images. And then our JSON file has all of our metadata from tiled that we'll need to parse to create our various game objects. And so in our game scene, we'll need to know which level our player's currently in so we can reference the appropriate assets when we create our image game objects. And so in order to do this dynamically, one of the options available to us is when we start our scene in phaser, we can pass additional metadata to that scene. What this means is in our preload scene, we can tell our game scene which level our player's currently in.

And then we can update our game scene to use that information. So then we create the appropriate game objects. And so to do this, let's open up our preload scene. And now when we call our start method, one of the things we can pass is we can pass this additional data object. Now, this object can be anything we want it to be.

And what we'll do is we're going to pass in our level name of where our player's currently at. And then our game scene, we'll use that to load the appropriate asset. Uh so, as an example, if I just do level, and I'm just going to do test. And so, how this works, when our scene now starts, when Phaser calls our init method, it's going to pass that data to us. Uh so, if we jump back to our game scene, let's add an init for argument.

We're just going to add in data. We'll return nothing for our type. And I'm just going to do console. log. We'll do data.

All right. So, if we refresh our browser, we're going to see right away as soon as our scene is initialized, we now have that object with our level property available to us. And so, by using this method, now anytime we start one of our scenes, we can pass additional data to that scene. So, now that we have a way to pass our level information to our game scene, let's define a type for this. And then that way we can reference that in both of our classes.

So under our source folder, let's go into common. Let's go into our types file. Let's make a new type. We'll do export type. We'll call this level data.

And now for our type, we'll want to add three properties. The first is going to be our level. So which level we actually want to load. Then we'll want to know what room ID our player's currently in. Then we'll want to know which room ID to add our player to.

So, as an example, when we transition from our world scene into our dungeon, we'll need to know that our player is in this room here. And so, from tiled, this would be our room three. And then finally, we'll also want to keep track of which door that our player's entering in through. So then that way, we can place our player in the appropriate location. So, if we jump back to our type.

Ts file, we'll add in our level. For now, we'll just do this as a string. Now, we'll do our door ID. This will be a number. And we'll do our room ID.

Now for our level names, we'll want to define these as an object and create a type for that. Let's open up our source common and we'll go into our common file. Let's make a new object. We'll do export const. We'll call this level name.

And so for our object, we'll do as const. And now for our two levels, we'll do dungeon one and world. So we'll do do world. Now we'll do dungeon one. Now I created our types.

Let's go back to our types. ts file. do export type. We'll do level name is equal to our key of type of and we'll do our levels names. So now down for our level data.

Let's update our type to be our level name. So now let's jump back over to our preload scene. So now we'll make a new object to pass our data. So let's do cost. We'll do scene data.

Let's add in our type. So we'll do level data. So this equal to an object. Now we'll do our level. Let's do our level name.

Let's do dungeon one. For our room ID, we'll just set it to one. and door ID. We'll also set this to one. So now we'll update our call here to use our new object.

And then finally, I'm just going to add a to-do here. And so we can come back and update this later. Uh so currently our code will be hardcoded and we'll actually want to grab this from our data manager later once we add that in. So now when our scene refreshes, we should see our objects being logged to our console and we'll see our door ID, our level, and our room ID. Now, what we can do back in our game scene is we'll want to store a reference to this data we can use it down in our create method.

So, let's add a new property to our class. We'll call this level data for type. Let's do our level data. Now, down in our init method, we can add in that type. Let's add in level data.

We'll do this. Our level data will be equal to the data we received as our argument. Now that we have our level information, now we can create our foreground and our background images. So now down in our create method, after we create our controls, before we create any of our other game objects, we'll want to create our background. And then that way any game objects we create will be placed on top of it.

To create our background, we just need to add an image game object. So we're going to do this add. We'll do our image. Now we'll do 00 for our for our location. And now for our texture, let's reference our asset keys.

This is now for our property. We're going to want to do our dungeon one background. But to create the correct property, we need to reference our level data. So we'll do this our level data. Let's grab our level name and our underscore.

And now we want to do our we want to do our background. After we create our background, we want to set our frame to zero. And then finally, let's update our origin. And we're going to put this in the top lefthand corner. So we'll set our origin to be zero.

So now when we save, when our browser refreshes, we'll see our background images has been added to our game. All right. So we want to test our world level. Jump over to our preload scene. All we should need to do now is if we update our level name to be world, we'll see now when our scene refreshes, we now grab the appropriate image and we add that to our game.

Nice. All right, so now back in our code, let's update our preload scene. We're going to vert this back to our dungeon and let's jump back to our game scene. Now we want to create our foreground. So now for our foreground, we just need to add another image game object to our scene.

So let's copy this. We'll paste it. Let's update our asset key name to be foreground. And one last change we'll do is for our foreground, we need this to appear on top of all of our other game objects. And so we'll want to update our depth.

So after we call set origin, let's do set depth. And we want to change this to B2. All right. So when we save, when our browser refreshes, there should be no visible change to our game. And so if we want to test our foreground, we just need to update our objects positions.

And so let's update our background and our foreground to be at -20 for our Y value. All right. All right. So, if we refresh our changes, if we move our player down through our scene, we'll see now our player appears behind our foreground. And so, when our player goes through our door, it looks they're going under that tunnel.

Nice. So, back in our code, let's revert our change and we'll go back to position zero. Now that we have our background image in our level, we need to add in the ability to have our player to be able to actually traverse our level. Currently, we're limited by our phaser camera and what's actually visible to our player. And so how Phaser works, each scene that gets created has one main camera that gets created with it.

That camera is going to control what's actually visible on our canvas element. And by default, that camera uses our settings from our game configuration. So in our game configuration, we set up our width and height to be 256x 224 pixels. And so that is the view of our world that we're actually able to see. And so in Phaser, your world dimensions are actually infinite.

And so once you get past your 00 origin point, you'll keep moving in the positive direction or the negative direction. And for you to show more parts of your world, we need to update our camera's positioning. One of the easy ways to do this is we can have our camera follow our player. And then that way, as our player game object moves around our world, our camera is going to follow it. To make this change, if we go into our create method after we add in our images, let's do this.

We're going to reference our cameras. Reference our cameras manager for our scene. We're going to reference our main camera. And then if we call our starfall method, this allows us to provide a target game object that our camera should focus on. And it's going to follow us around our world.

And so for our game object, we want to reference our player. Since we create our player after this, let's move this line at the bottom of our create method. And that way, our player will already be created. now when we save, when our browser refreshes, we'll see now our game object is in the center of our screen. And it is the primary focal point for our camera.

Now, as our player moves around our world, we'll see our camera keeps updating to follow our player. Now that we've updated our camera to follow our player, before we move on to loading our tile JSON data, we're going to work on refactoring our crate method a little bit. Currently, we're doing a bunch of logic for creating our various game objects and adding them to our scene. And our crate method is getting very large. Instead, we want to move some of this logic to its own methods.

And then we can follow this pattern here where we have these methods be responsible for one thing. To start with, we're going to create a method for creating our level data. We'll have one for setting up our camera. We'll have one for creating our player. Then for all of our other game objects, we're going to place that in a temporary method since we'll be recreating these objects later once we start parsing our tile JSON data.

So start making these changes. Let's come to the bottom of our class. And now we'll define our new methods. So let's add a private method. We're going to call this create call this create level.

For this method, we won't return anything. I'm going to copy that block of code. We're going to paste it two more more times. And now we'll have one called setup setup camera. And then we'll do setup layer.

So now if we come back up to our create method, let's copy our code for we update our camera. We're going to place that down in our setup camera method. Next, let's grab our logic for we create our player. Let's place that inside our setup player inside our setup player method. And now if we go to where we create our images for our background and foreground, we'll place that and create level.

Level. And then finally, let's add in one more method, and we're just going to call this temp code. We're going to place all of our other logic where we create our game objects into that method. So, let's copy our logic for our blocking group, our pot game objects, and then our enemy groups, and then our game scene text, and we're going to place that down to that other method. So, now back in our update method, let's update our code to call our new methods.

So, after we create our controls, we'll do this. Let's do create level. Now, we want to set up our set up our player. And now we'll want to set up our camera. Now, for the time being, we'll call our temp code method and then we'll call our register colliders and register custom events.

So now, if we save, our scene should refresh and we should still see our game objects and our players should be able to move around our level. Nice. Finally, one last change we'll do is we're going to reenable our spider and our wisp game objects. So, if we open up those classes, let's go into our wisp. We'll update our state machine.

We go into our bounce move state. Let's open up spider and we'll do the same thing where we go into our idle state. Next, for our level, we will work on parsing our JSON data from tiled and using this in Phaser. To work with this data, Phaser has a built-in object called a tile map. And this is a container that allows us to parse the tile JSON, CSV, or 2D array of data.

And it's going to give us a bunch of utility methods for working with our various tile sets and tile maps to do things create our collision layers, create our objects from our layers, and much more. This built-in object makes it very easy to work with this data. So, to start loading in our data, let's go over to our game scene and we're going to go to our create level method. After we create our background or foreground, we want to create this new tile map object. Let's make a new variable.

We'll call this map. We're going to set equal to this. We'll do make. And now we want to do tile map. Now to create our tile map, we need to provide our configuration.

And this is just going to be the key of our asset that we previously loaded. So for our asset name, let's copy our string here. We'll paste that in. Now, instead of doing foreground, we want to do underscore level. And so now this asset key, this is going to refer to our JSON file that's associated with our current level.

For our dungeon, it'll be our dungeon JSON file. So after we have our tile map, let's just do a console log and we'll take a look at it in our console. So when our scene refreshes, we'll see our new tile map object. This object has all of our tile level data. we'll see key things like how big our tile size is, like our tile width and height, how many tiles are our width and height of the level, our overall pixel size, and then we'll see key things like our layers and our object layers, which is what we will need to parse in order to add these objects to our game.

So, as we start parsing our various layers and creating objects for our scene from our layer data and tiled, we'll need a location to store all this data. So, when we set up our level and tiled, we stored everything by a room. As an example, when we add a chest to our room, that chest will have a unique ID for that room ID. We also when we created things like our doors, we associate that door with a room and which door it'll transition to in the next room. So, in order to look up and keep track of all of our objects by our room, we'll want to group them by their room ID.

So, to add a property to keep track of all this, let's come to the top of our scene and we'll make a property. We're going to call this objects by room ID. And now for this object, our key is going to be our room ID. And so, our key will be of type number. And now this will be an object.

And now this object's going to have properties for all the various objects we need to create. And for our first two properties, we're going to add two maps to keep track of our chest and our doors so we can look them up by their ID. So we'll do chest map. This will be another object. Our key here will also be a key here will also be a number.

And then for our type, this will be a chest. Let's copy this line here. We're going to paste this and we'll call this door map. Now for our type, we don't have this defined yet. And so we're just going to call this unknown.

Now we want to create a few arrays to keep track of all of our game objects. And so we'll have doors. This will be an unknown array. We'll have our switches and our and our pots. So we'll do pots.

So we'll do unknown. Now for our pots, we'll type that to our pot class. We'll have an array of those. Same thing for our chest. For our next property, we're going to call this enemy group.

And this is going to be a phaser group to keep track of all of our enemies in a particular room. So we'll do our phaser. Let's do our game objects. And then we'll do group. Finally, we'll add in room.

And this will be our tiled room object. So this tiled room object is just going to refer to our custom class and tile we created for our rooms. So on that custom class, we'll just have our key properties like our X and Y, the width and our height of our room. And then finally, our ID of our room. So it'll be unique for each object.

So now that we have our new property on our class, we can start parsing our JSON data and populating this object. So let's come back down to our create level method. We'll get rid of our console log. First, let's initialize our object. we'll do this.

We'll do our objects by room ID. We'll set equal to our empty object. So, now to create our rooms, we'll make a new method to have this logic. So, let's do this. We're going to call this create rooms.

And for this method, we're going to pass in two arguments. First will be our tile map. And next will be our layers that we want to parse. So, we're going to do our tile. We'll do our layer names.

And we want to do rooms. Let's define that new method. So, come down to the bottom of our class. We'll do create rooms. for our two arguments, we'll have map, this will be our phaser, our tile maps, and then our tile map.

Then we'll have our layer name, and we'll have this be a string. We'll do void for our return type. All right. So now to create our room objects, we need to parse our tiled object, and we want to look for an object layer that has a particular name. on our object, we have this objects array here, and we want to find our object layer where our name is set to rooms.

And so that'll be our layer name we provided here. To do this, we're going to use some of those utility functions that we added to our project. let's do con. We're going to do valid tiled tiled objects. We're going to set this equal to get tiled room objects for map for this function.

We need to pass in our map. And then we want to pass in our layer name. And now we're going to do a console log. And let's do our valid tiled objects. And then let's also log out our tile map.

So we'll do console. log. And we'll do our map. So now when our browser refreshes, we're going to have a new array of six objects. These six objects refer to our six tiled room objects that we created in our tile map data.

And so where this data is coming from, if we open up our tile map, if we go into our objects, and if we go into our layer where our layer name is called rooms, we'll see we have this objects property here that has six objects on it. Now these objects have all of our metadata from our JSON file. And so we just parsed this to pull out the properties that we care about. And that's how we created these rooms here. we'll have things like our width and our height, our X and Y.

But then we also have this ID. And this ID is coming from this properties array here. So those custom properties we added for each of our objects, we're parsing that and then adding that to our object here. That way we only have the fields we care about. And so if we go into our tiled room objects from map function.

So our get tiled objects from layer. This goes through our objects array here and it finds our object layer that has the name we provided which was rooms and then it grabs all of the objects from that layer and it just makes sure we have those base properties that we need. If for some reason these are not defined then we won't return that object. Once we have those base objects we just iterate through them and create our representation of the objects we're trying to parse. And in this case this is going to be our room.

And so for our room, we just want those base properties and then our ID that we parse from our data. So back in our game scene, we'll clean up our console logs. So now for our array, we just want to iterate through our array and we're going to use that data to populate our objects by room ID object. So let's take our valiled objects. We'll call the for each method to iterate through our array.

Then we'll have our tiled Then we'll have our tiled object. And now for each tiled object, we'll do this. We'll do our objects by room ID. We'll reference our titled object. We're going to use the ID property to create a new property on our object and we'll set equal to our object.

And so now for our object, we just need to add our various properties and initialize them to their default values. So we have switches. This will be our empty array. Let's copy this. We'll paste it.

And so after switches, we'll have our pots. We'll have our doors. We'll have our doors. We'll have our chest. Now we'll have our room.

For our room, we're going to set that to our tiled object. tiled object. Now we'll have our chest map and our door door map. Now these will be map. Now these will be objects.

Now if we save, let's come back up to our create level method. After we create our room, let's log out our new property. And so we'll do property. And so we'll do console. log.

And we'll do this. We'll do our objects by room ID. So now our scene refreshes. We'll have our new object with our six rooms. And we've initialized it with our initial properties.

Now that we've parsed our tile data to find all of our custom room objects, we need to do the same thing for our other object types. So, as an example, our pots, our doors, our enemies, our chest, and different things that. To find that data on our tile map, we need to go through our objects layer. And on our objects layer, we need to find all of our layers that end with a particular name. Uh, as an example, if I want to create all the enemies for my various rooms, I want to find all of my layer names where we end with slash enemies.

So, we need to parse this room/6/eneemies room/6/eneemies layer. We'd also want to parse this room/4 enemies layer in order to create all those objects of that given type. And so, to get started, first we're going to parse to our object layer and we're going to find all of our layers for our objects where we have our rooms/room ID pattern. To do this, let's make a new variable. do con, we'll do rooms.

We're going to set that equal to get all layer names with a prefix. So, we provide our tile map and then we do our tile layer names and we want to do rooms. What this function will do is we provide that prefix and now we're going to go through our object layer names and we're going to filter them to have just that prefix. We'll then split out our data. So then that way we make sure it's in our pattern of our rooms.

So, it's going to be rooms slash our ID, then slash whatever object we're creating. And so, by splitting by our slash here, we'll make sure we're grabbing our correct layers. So, now if we come back to our game scene, now that we have our array of our various layers, we want to iterate through them. And so, we'll do map. And so, now we're going to have our layer name, and this will be a string.

We're going to return a new object. And this object is going to have just our name. So, we'll refer to our layer name. And then we'll have our room ID. And to get our room ID, we're going to do parse int.

We need to use our layer name. We want to split it by our slash. And now we want to grab the second element in our array, which will be our room ID. And now let's log out our rooms. We'll make sure our logic's working.

So now in our console, we should see an array of 20 objects. And these are going to be our various layer names that have rooms in it with their appropriate room IDs. Now that we have our array of layer names that we need to parse for each of our layers, we can follow the pattern of what we did for create rooms where we take a given layer name and then we can parse our objects from our tile data. So to do this, we'll make a method for each of our object types. Let's copy our method here for create rooms.

In our method, we're going to call this create doors and we'll add in one additional argument. So besides our map, our layer name, we're also going to pass in our room ID that we're currently processing. And so we'll use our room ID for populating our objects by room ID object here. For the time being, I'm just going to do a console. log.

We're going to do our layer name and then our room ID. And now we'll do this for all of our other object types. So let's copy this. We'll paste it a few times. So after create doors, we'll have create buttons.

These will be our switches from our JSON data. Now we'll have create pots. We'll have create chest. And now we'll have create enemies. And we get rid of this last method here.

Now back up on our create level, we can call our various methods. So now for each of our layers, we want to filter these layers to only have our layer names that end with our particular object type. So let's get over our console log here. Make a new variable. Do const.

We'll call this switch layer switch layer names. We'll set that equal to our rooms. We want to filter and we're going to filter our array by the layer. And so we'll do our layer name. We'll do ends with and so it's going to be our slash.

And now we can reference our tile layer names. And we want to do names. And we want to do switches. So we just do a quick console log. We'll do our switch layer names.

So in our browser, we'll have an array of three objects. And now we just have our layer names that are associated with our switches. switches. Now we just need to do the same thing for our other objects. So let's just copy this.

We'll paste it a few times. So now we'll have our pot layer names. Then we'll have our door layer names. We'll have our chest layer names. And then our enemy layer names.

Now we just need to update our references for our layer name. And so we'll have pots, doors, chest, and then enemies. Now that we have all of our layer names, we just need to iterate through these arrays and then create our various objects. So let's do our door layer names. We'll do for each do our layer.

For each of our layers, we want to call this create doors. Now we'll pass in our map, our layer. name, and then our room then our room ID. So now we'll copy this. We're going to do it for all of our various layers.

So now we'll do our switch layer names, our pot layer names, our chest layer names, and finally our enemy layer names. Let's update our methods we're calling. And so we'll do create buttons, create create pots, create pots, create chest, and then create enemies. Now, if we save, we should see now in our browser. So now if we save over in our browser, we should now see a bunch of log lines where we're calling our methods for each of our object layer names with the appropriate room ID.

One quick change we need to make to our code is when we created our tile map for our key, we referenced our string directly instead of going through our asset keys. Anytime we reference one of our assets, we want to make sure we go through this object here so we're using the correct string. So, let's copy our asset keys here. We'll add in our bracket so we reference our property. And now, we want to get rid of two uppercase.

And now we'll be referencing our string from our asset keys object. now for each of our methods we added, we want to create our various tiled objects from our layer data. For this, we'll be doing what we did in our create rooms method. We're going to call a utility function provided our map and our layer name. And then we'll rely on that utility function to get our base object data.

So let's copy this line of code. Let's place that below all of our console log lines in each of our methods. Then we'll start on our crate doors method. So for our create doors, we want to call get tiled door objects from from map. For this function, we'll pass in our map and our layer name.

Next, for create buttons, we'll call our get tiled switch objects from switch objects from map. For create pots, we'll do our get tiled pot game objects for map. Create chest. Do get tiled chest game objects for map. Finally, for our enemies, we'll do get tiled enemy objects for map.

And now for each of these, just for the time being, we're just going to log out our valid tiled objects. I'm going to copy this out of code and paste in our other methods. Now, if we save, our browser should refresh, and we'll see after we parse each of our layers, we should now have an array of objects that has our various properties that make up that object. So, for our doors, we'll have our door properties that we added to our custom class, as well as our key data for our X, Y, our width, and height. Take a look at our switches.

We should see that we have our texture, our action type. Then for our chest, we should see things like the contents. If it's a boss key chest, it's trigger. And then finally, for our enemies, we should see our enemy type here. So now for each of these methods, all we're doing is we're just grabbing our tile object space from our layer, similar to what we did for our doors.

And then we're going through that properties array, and we're finding all of the properties that should exist on our game object. example for our door, we're grabbing our door ID, our target door ID, our direction or door type, our trap door type. So, all of those custom properties we added in our custom class and tiled. We just want to make sure all those properties exist on our objects before we create our custom door object and push it in the array that we're returning. And then we just follow that same pattern for all the additional objects that we create.

Uh so we won't dive deeply into each of these functions. Um but that's what they do at a high level. Now that we've added our base logic for parsing our tile JSON file and grabbing our objects from our tile map and phaser, we're going to pause working with our objects and start working on updating our game to have things like our collision and being able to have our player move through our rooms. We'll come back to our objects in our next section where we actually add the objects to each of our rooms. So first we'll focus on our collision layer.

So let's come back to our game scene. Let's come up to our create level method. So now to add a collision layer to our game, we need to use our tile JSON data. in our tile map that we create in Phaser, so far we've been working with our object layers. And we want to do a similar thing for our layers array where we find our layer for our collisions by its name.

And then we use that layer to create what's called a tile map layer. The tile map layer is an object that gets added to our game that has all of the tiles that exist on that layer. And then we can use that to check for collisions between that layer and our other game objects. And so to add that code after we create our map, let's make a new variable. We're going to call this collision collision layer.

We're going to set that equal to our map. We'll do create our map. We'll do create layer. So now when we create this layer, we need to provide our ID or our name of our layer. And so we'll do our tiled layer names and we want to do collision.

Next, we need to provide an array of our tile sets that was used when we created this layer. By providing these tile sets, it allows us to render out that layer into our game. For now, we're just going to do an empty array. Then next, we need to provide our X and Y position of where we want to create this layer in our game. For this, we're going to use our origin so it's placed in the same location of where we have our background images starting in our game.

So after we create our layer, we're just going to add in a safeguard to make sure this was actually created. when you call create layer, if you provide an invalid layer name that's not found, this method is going to return null. And so we're going to do if our collision layer is equal to null, we're going to log a message. And so we're just going to do console. log.

We'll say encountered error while creating collision layer. using data from tiled and then we'll just add a return statement so we don't process the rest of our method. So now to test our changes, let's do console. log and we're going to log out our collision layer. Now if we save, if we come back into our browser, we should now see a new object being logged and it's going to be our tile map layer.

It's going to have all of our properties for this layer. Now that we have our collision layer, we can register a collider between our player's physics body and this tile map layer. And then that way our player won't be able to leave our room. To do this, we'll need to store our collision layer as a property on our class. And so we'll do this.

Let's do our collision layer. We'll set it equal to our collision layer. Let's add this property to our class. Let's go to the top of our class. We'll add in our collision layer.

Now for our type, this is going to be a phaser, a tile maps tile layer. Now down in our create method, after we call create level, we're also going to add a safeguard here to make sure this is defined. So we'll do if this. colision layer is equal to layer is equal to undefined. Then we want to do a warning message to our console.

So we do console. warn and we'll do missing required collision layers for game. And then we'll return early. And similar to what we do for our input, this is key for our game functioning properly. And so, returning early is fine since our game will be in a broken state.

Now that we have our collision layer, we can add a new collider to have our player collide with our level. So, let's come down to our register colliders method at the bottom of our method. Let's add in a new collider. So, after we do our pots, we'll do this. We'll do add.

Let's do a collider. And now we'll do this player. And we'll do our collision layer. So, if we save and refresh our browser, if we try having our player move through our level, we'll see that our collisions aren't working properly. And so, to help debug this, we're going to add in our tile set that was used to create our collision layer, we'll be able to see it in our game.

To do this, let's come back down to our create level method. Before we create our collision layer, instead of passing in an empty array, we need to pass in our tile set that was used to create this layer and tiled. To do that, we'll make a new variable. We're going to call this collision tiles. this collision tiles.

We're going to reference our map and we'll do add tile set image. For this, we provide the name of our tile set that was used in tiled. And so this will be our tiled tile set names collision. Now we need to provide our asset key of that same asset. And so this will be our asset keys and it's going to be our collisions collisions asset.

We'll also add in a safe check here. And so let's just copy this code here. We'll paste it. And so when we call add tile set image, this will also return null. And so we'll do collision tiles if it's set to null.

And for our console log, we'll say encountered error while creating our collision tiles from tiled. Now that we have our collision tiles, we'll update our array to pass that in. So now when our scene refreshes, we should see our red box that represents our collision tiles for our player in this room. So now for our collisions to work properly, we need to tell Phaser for our tile map which of these tiles we want to check for collisions with. To do that, we can use the ID of our texture for the tile and pass that to phaser.

And then it's going to enable collisions for that tile type and our game object we provided. And so for our collision layers, if we use a variety of tile types, we need the ID of all of those tiles in order for this to work properly. And so to see a reference of what I'm referring to, if we open up our dungeon_1 JSON file, at the bottom of our JSON file, we have this tile sets array. This tile sets array has an array of tile sets that make up our tile level. This is going to refer to the tile set images or sprite sheets that we used and it's going to assign a unique identifier for where the tile starts when we process that data in tiled.

It's going to be called this first GD. And so when we load in the sprite sheet, it's going to assign a unique identifier to each of those frames of that sprite sheet when we load it in tiled. And so if this sprite sheet had multiple images, it would start at 1432, then go to 1433, 1434, and so on. Similarly, for our tile set here, for our dungeon assets, we start at one, and then for each of our frames, we go up by one. And we 1 2 3 4 5 and we'd see all of these tile set frames referenced in our JSON file here.

And so since we only used a single frame for our collision layer, we just need to provide this single ID to phaser. If we used multiple frames, we would need to provide all of those ids to phaser. So now to pass that information, let's go up to where we created our collisions. And before we add in our collider, this is where we'll call that code. So we'll do this.

We do our collision layer. We're going to do set collision. And now when we call set collision, we can provide an array of our tile indexes that we want to use. And so for this array, we'll just do this. We do our collision layer.

We'll do our tile set. And we're going to grab our first element from that object. And we'll call our first GD. So before we do this, let's log out our collision layer. And now in our browser, we should see our tile map layer being logged.

And if we go down to our tile set property, we'll see this is an array of tile sets that are used for this layer. Since we only use the one tile set, we just have our collision. And we can rely just on that first G. And so how this first G is used, if we go into our called tiles array, we'll see this is an array of all our tiles that make up our tile map layer. And for each of these tiles, there's going to be an index.

This index refers to that first GD. And for all of our tiles that are created here, we'll see it has that same index. And so if we looked at a different layer that had multiple tiles being used, we would see that each of their indexes would be different. All right. So back in our code, now that we've called set collision and we've provided an array of those IDs.

Now in our game, we should be able to have our player move. And once it collides with our tile map layer, we'll see our player is not actually able to move through it. But now if we come down to our door where our red tiles are missing, we'll see that our player can transition to our next room. Nice. So, one last thing we'll do for our collision layer is we're going to modify some of our properties on our object.

We're going to update our depth property. So, this object will appear on top of all of our other game objects. after we assign our collision layer to our property, we'll do this. We'll do our collision layer. Let's call set depth.

And we're going to set this to be two. So now when we create our game objects in our scene, our collision layer should always appear on top of them. Next, we're going to make our alpha configurable on our object. So then that way we can hide this in our final game. To do that, we're going to call set alpha.

And now we'll make a new config property. And we're going to call this we're going to call this debug collision collision alpha. So now if we open up our config file, let's add that at the top of our file. So we'll do export. We'll do const debug collision alpha.

We're going to set that to be one. Now, if we come back to our game scene, let's update to have our import. All right. So, after we save, when our browser refreshes, we'll see since we updated our alpha to be one, our layer is much more visible to our player. While our testing, let's change this to Z be change this to Z be 0.

6. So now when we save, it'll be a little more transparent like it was before. And now when we don't want to see it while we're testing, if we set it to zero, it'll be hidden to our player. now that we've created our collision layer for our player, we want to do the same thing for our enemies. That way, our enemies will stay within our room.

After we create our collision layer, let's make a new object. We're going to call this enemy collision call this enemy collision layer. For that, we'll do map. We'll do create create layer. We'll reference our tile layer names.

We'll do our enemy collision layer. We'll pass in our collision tiles. And we'll also do 00 for position. Now, we'll do the same thing. We'll make sure that this isn't null.

So let's paste in that code. We'll update our reference. And now for our log line, we're going to say creating enemy collision layer. So now after we create our enemy collision layer, we'll want to store that in a property on our class. let's copy these two lines of code here.

We'll paste them. And so we'll do enemy collision enemy collision layer. Let's add that property to our class. So we'll come up to the top of our file. Let's do enemy collision layer.

For our type, we'll do a phaser tile maps tile map layer. And so while we're up here, let's update our create method. And so we'll just update our safeguard. We'll say if our enemy collision layer is undefined. Then we'll log out our warning message.

Let's come back down to our code. So then for enemy collision layer, instead of calling set alpha, we're just going to do set visible. And we're going to set this to be true. So we make sure it renders. Now if we save, let's go over to our config.

Let's update our collision alpha to be zero for our player. zero for our player. So now when we save, when our browser refreshes, we'll see we have this red rectangle box. And this is our enemy collision layer to keep our enemies within our room. So I'm going to revert the change to our alpha.

We'll come back to our game scene. Since we made sure our collision layer is showing where we want it to be, let's set this to be false. Now we need to create a collider between our enemies and this collision layer. So now if we come to our register colliders method, let's copy these two lines of code here. We'll do the same thing for our enemies.

So now we'll do our enemy collision layer. We'll want to reference our enemy collision layer. We'll grab that tile set and we'll do our first G. Now for our collider, we want to register this between our enemies. And so we'll do this our enemy group and our enemy collision layer.

So now when we refresh, we should see right away that our wisp is now bouncing around our room and it's colliding with our enemy collision layer. The same thing should happen for our spider once it encounters our wall. Nice. Now that we have our collision logic in place, we'll start working on making some updates to our camera. Currently, our camera set up to follow our player everywhere throughout our level.

And so, as our player gets closer to one of our walls, we prevent them from leaving. But our camera shows us what's outside of our dungeon. Instead, we want to lock our camera so it only shows us our current room that our player is in. Once our player leaves that room, we want to have our camera transition to follow our player and then show the new room and then be bounded to that size. To start making these changes, we'll come back over to our game scene.

Let's go to our method where we created our camera. So, before we start having our camera follow our player, we want to define the area that our camera is allowed to move to and show in our game world. To do that, we can use the set bounce method on the camera to set the width and the height and the X and Y positioning of where our camera is allowed to move to. For those values, we're going to use our room objects that we created in tiled to get the size of our room that our player's currently in. So, let's do con.

We'll do room size. We'll set that equal to our this our objects by room ID. Now, we want to use our level data and we want to grab our current room that the player's in. Then, we grab our room object. Now we can do this.

We'll do our cameras. We want to grab our main camera. We'll call set bounds. Our set bounds method expects us to provide a rectangle shape of where our camera can scroll to. So we'll need to provide our x and y.

So our starting values for that rectangle and then our width and our height of that rectangle. So for our x position, this will be our room size. x. For our y, we need to use our room size y value. And then we'll need to subtract the height of our room size since our y position will be the bottom of our game object.

Now we need to do our width and height. And so we can just rely on our room sizewidth and our room size. From our object we created in tiled. Oh, one quick fix. We want this to be room to be room size.

Height. Y again. Now when we save and refresh, we'll see that our camera is now bounded to our original room object that we created in tiled. and our camera no longer follows our player around since we're within that bounds. As our player gets close to the edges of our wall, our camera doesn't move and show us outside our show us outside our room.

Next, for our cameras, we want to add in logic. So, once our player enters one of our doors, we'll have our camera transition from this current room view to our next room in our dungeon. To do this, we'll need to create a new game object type to represent our door from the doors we created in Tiled. Once our player collides with our door, our trigger for our door will then update our camera's position to follow our player and we'll have our player animate from our current position to our next room. To start making these changes, let's go into our code under our source folder under our game objects.

Under objects, let's make a new object type and we'll call this door. Right, let's export out our class. We'll do export class. We'll do door. We're going to have this implement our custom game object.

Object. So for our door class, we're not going to extend one of our built-in phaser game object types. Our door is actually going to consist of two. We're going to create a zone. So when our player overlaps with this zone game object, that will be our trigger to transition to our next room.

And then we'll have an image game object that actually represents our door. So when our door is locked or it's shut from a trap or it's our boss door, we'll show a different texture depending on our door type. So now for our door class, we want to pass in our tiled object data. since this will have all the information for where we're going to create our game object in our level. So, let's add in our constructor.

For a constructor, we'll need our phaser need our phaser scene. Next, we'll expect our configuration object from tiled. So, we'll call this config. For our type, we'll do our tiled door we'll do our tiled door object. And then, we'll want to know the ID of our room where this game object is located at.

Now, we'll define the properties on our door. These properties are going to align with our properties from our tile door object that we created in tiled. So we'll start with our phaser scene. Then we'll want to know our room ID that this door belongs to. And then for our door, we'll need to know which door this actually connects to and what room this connects to.

So we'll do our target door ID. This will also be a also be a number. Then we'll have our target room ID. We'll need our X and Y position where we're going to position this at in our game. our game.

Then if our door transitions to a new level, we want to know the target level. This will be a string. Finally, we'll need a property to keep track of our zone game object, which will be our trigger for our door. For this, we'll call this door transition zone. For our type, this will be a phaser, our game objects, and a zone game object.

Finally, we'll add in one more property. We'll call this debug door transition zone. door transition zone. for this type. This will be a we have phaser our game objects and it'll be a rectangle game rectangle game object or it can be undefined.

Now that we have our properties, let's update these in our constructor. So for our scene, this will be equal to our scene. We'll have our room ID will be equal to the room that was provided. Now for our other properties, we want to grab this from our config. So we'll do our target door ID.

This will be our config. Our target door ID. Our target room ID will be our config. target room ID. Let's do our target level be our config target level.

Now for X and Y. Now that we have our initial properties in our class, we need to create a game object that our player will be able to interact with. So when they collide with it, we'll transition to our next room. For this, we don't want this game object to be visible in our scene, but we still want our player's body to be able to overlap with it. For this, we'll be making use of the phaser zone game object.

And this is basically our rectangle that we can add to our game that won't be visible. So now add in that game object. We'll do this. We'll do our door transition zone. We'll do this our scene.

We want to do add. We'll do a zone game object. Since it's a rectangle, we need our X and Y and then our width and height. So we'll grab those from our config. So we have our config.

X, our config. x, config. y, config width, and then config height. For our game object, we want to update our zone. So we'll do set origin and we'll do zero and one.

And now we're going to set the name property on our zone game object. So we'll do our config our ID. We want to do this to string. So for our zone game object, we're setting our name property equal to our door ID. The reason we're doing that is we need a way to associate this game object with our parent game object here for our door.

And so when we go to add our collisions, we'll want to be able to check for collisions between our player and this transition zone. Our main door class won't actually have a physics body. And so we won't be able to check for collisions between our player and this door. And so once our player collides with that game object, we can then use that name property to find our door from our game scene. And so now that we have our zone game object, in order to help us debug this, we're going to add another rectangle to our scene since our zone game object is not visible.

For this, we're going to use that debug door transition zone property, and we're going to set equal to our scene. We want to do add. We want to add a rectangle. And now for our rectangle, we want to use the same width and height and the same positioning as our door transition zone. So, we'll just reference our door transition zone.

And we'll grab our X, our Y, and then our width and our height. And to make sure it's in the same position, we want to set the same origin and do set origin. and we'll do 01. Oh, and then for our rectangle, we actually need our color. So, we'll do 0 x FF FF 0.

And we'll do 0. 6 for our alpha. And so, to keep our code consistent, let's update our scene reference, we'll do this, and we'll reference our scene. Finally, for our zone game object, in order for our player to actually be able to collide with it, we need to enable physics for it and give it a body. So, after we create our door transition zone, we want to do this.

We'll reference our scene. We'll grab physics. We'll do world. We'll do enable. And now we want to provide our game object.

And now this will give it an arcade physics body based on our size that we set here. Now that we created our two game objects, next for our class, we're going to add some getters to retrieve our properties that we defined up here. And since we're implementing our custom game object, we need to add our two methods for enabling and disabling our object. For these, let's open up our pot class. I'm going to copy our two methods for disable object enable object.

Paste those public methods onto our door class. So for our disable object method, we just want to disable our physics body on our door transition zone. So we'll do this. We'll do our door transition zone. We want to grab our physics body.

So we're going to do as our phaser, our physics, our arcade, our body for our type. And now we'll do enable and we'll set this to be false. And now we want to make our game object not active. And so we'll do our door transition zone. We'll set active.

And we'll set that to be false. Now, for enabling our object, we just want to do the inverse. So, let's paste that. We'll set enable to be true and we'll set active to be true. Now, for our getters, we just want to add a getter for each of these properties here.

So, let's do get X. This will return a number. So, return this and then our X property. Let's copy that. We'll paste it a few times.

So, now we'll get our Y property. We'll get our room ID. Then we'll get our target room ID. We'll get our target door ID. And now we want to be able to return a door transition zone game object.

So I'm just going to copy our property name. Let's paste that. Our return type will be our phaser, our game object, our zone. And then for our last getter, we want to grab our target level. And so we'll do our target level.

Now this will be a string. until we return this and our target level. All right. And then for our door class, we just need to add in one more property. One of the properties we didn't bring in from our config is the direction that we set up in tiled.

For that, let's add in our direction property uh to our class. This will be type to our direction. Now, after we set our x and y, we'll just do this. We'll do our direction. We're going to set that equal to our config and then our direction.

Now, let's just add in a getter to get that value. We'll paste that in. So, we'll get in our direction. Then, we'll return our direction property. And let's add in our type.

Now that we have our base logic in place for our door class, we can start creating instances of our door and our game scene. Let's jump back over to our game scene. And we'll start by adding a few new properties to our class. First, we want to add a property to keep track of our current room ID. So, as our player is navigating through our level, we'll know which room the player's currently in.

So, for that, we'll add a private property. We're going to call this current room this current room ID. This will be a number. Next, we'll need to create a phaser group to keep track of all of our transition door game objects. That way, we'll be able to add in our collision between our player and these game objects.

For that, we'll call that a door transition that a door transition group. So, we'll do a phaser, our game objects, and then our group. So, next, let's go down to our init method. Let's start off by setting our current room ID equal to our data and the room ID that's provided. Next, for our objects by room ID, let's update our property for our doors.

And we'll do our door class type. We'll also do the same thing for our door map. Now, let's jump down to our create doors create doors method. So, for our create doors method, let's get rid of our council log. And after we have our valid game objects, now we want to loop through those and create our door instances.

So, do our valid tiled objects. We'll do for each. Now, for each of our tiled objects, we want to create an instance of our door. So, we're going to do const. We'll do door will be equal to a new door instance.

We want to pass in our scene, our tiled object, and then our current room ID we're processing. Now, we want to store reference to this door in our objects by room ID map and our doors array. So, we'll do this. We'll do our objects by room ID. We use the provided room ID for our doors array.

Let's do array. Let's do push and we'll push in our door instance. Now I'm going to copy this. We'll paste it. But instead of doing doors, we want to do our door map.

And now for our door map. For our object, we want to do our tiled object and then our ID for our door. And instead of calling push, we'll just set it equal to our door instance. Lastly, we just want to add that door transition game object to our group. So we'll do this.

We'll do our door transition group. Let's do add and we want to do our door and it'll do our door transition zone. All right. So if we save it looks like we have an issue. Ah yes, we actually need to create an instance of our phaser group to assign to our property.

Let's go up to our create level method. So down where we initialize our objects. We'll do this. We'll do our door transition group. We're set equal to this.

We'll do add. And now we want to do group. And we can pass in an empty array for our initial game objects. All right. So when we save and refresh, we should now see this new yellow rectangle show up in our scene.

And so that rectangle represents our zone game object for our player to interact with. So now that our game objects are available in our scene, now we just need to add in our collisions between our player and this game object. now to add in that collider, let's go up to our register colliders method. We'll come to our logic where we add in our colliders between our player and our other game objects. And now let's add in our new collision.

So we'll do this. We'll do our physics. Let's do add. For this, we want to do an overlap instead of a collider. And we're going to reference our player.

And now we want to do our door transition do our door transition group. So now for our callback, we'll want our player object. And then we want our door our door object. So now we'll call a new method and we'll call this handle room transition. And then when we call this method, we'll pass in our door object.

Now, for our door object, we'll add in our type. So, we're going to do as our phaser, our types, our physics, and now we'll do our arcade physics, and we'll do our game object with body. Now, we just need to define this new method on our class. So, let's come down to the bottom of our file. We'll add in our new private method.

So, now for our argument, we're going to call this door trigger. We'll want to do the same type that we defined above. And so we'll have our phaser, our types, our physics arcade, and then our game object with body. And for our method, we won't return anything. And right now, we'll just do console.

Log. And we want to log out our door out our door trigger. We'll do our door trigger. We'll do our door trigger. name.

All right. So, we save. We come back to our game. Now, if we have our player overlap with our yellow rectangle, we'll see right away we start logging a message about which door ID our player is currently overlapping with. Nice.

Now for our handle room transition method, once our player collides with our zone game object, we'll want to start off by disabling our arcade physics body on our door. We'll then want to grab a reference to the target door that this door is connected to and then do the same thing for that arcade physics body. This way, once our player triggers our call back method one time, we'll stop invoking it until our player's in the next room and safely away from the door that we just exited from. Now, based on our player's current position and then the target door we want to move our player two, we'll need to figure out how far to move our player into our next room and in which direction. Uh, so, as an example, when we're exiting from room one down to room two, we know when we go through this door, our other door is going to be at the top of our screen.

And so we need to update our player's Yvalue and we need to keep increasing it until our player's through our door. Now, in our other rooms, if we try to go to the right and we're exiting through the right, we know our door will be on the other side. And we'll need to update our X value. once we figure out which position we need to move our player to, we'll need to animate our player to that position. At the same time, we'll want to update our camera to follow our player and then update our camera's bounds to be in the new position of the new room.

Once we finish with all this animations and we get our player into the new room, we can reenable our trigger on our door game objects. That way, our player will be able to go back and forth. To get started with our changes, first let's grab a reference to our door and our target door based on our door name that was provided here. So, let's do const. We'll do door.

We're going to set this equal to our objects by room ID. We want to grab our current room ID, our door map, and now we'll do our door trigger and our name property. and our name property. We'll type this as door. And now for our target target door.

This will be equal to our objects by room ID. We want to use the door that we found. And we want to do the target room room ID. Now I'll do our door map again. And now we want to do our door and then our target door ID.

Now that we have our references to our two doors, we can disable our game objects. So we'll do our door. We'll do disable object. And we'll do the same thing for our target door. door.

So now to figure out where we need to animate our player two, we need to figure out which direction our target door is from our current door. And so if our target door is down from our current door, we know we need to update our y-value and increase it versus if it was up, we'd want to decrease it. And then left and right, we want to update our x value. Now to figure out the direction of our current door compared to our target door, we're going to make a new utility function. So let's go into our utils file.

We'll do export function and for our function name we're going to call this get direction of object from another object. So now for our function we need to compare our x and y coordinates of our two game objects and then return a direction based on those values. Now we want this to be generic. So for our object we're just going to type this to be of type position. Then that way as long as our game object has an x and y we can pass it in.

And so now we'll do our target our target object. We'll also want our type to be position. And now we're going to return a direction from our function. So we'll just compare our x and y value. So if our object at y is less than our target objecty, then we know the direction is down.

Next we'll check to see if it's greater than, then the direction will be up. Now we'll check our x value. And so if our X is less than our target X, then we know the direction of the target door is right. And then finally, if that's not true, then our direction must be left. Now that we have our new function, we'll jump back to our game scene.

So let's make a new variable to store this new value. So we'll do const, we'll do target we'll do target direction. Set that equal to our get direction from object. And now we'll do our door. And we want to do our target door.

Now that we have our target direction, we need to figure out how far we actually need to move our player from this room into our next room. For this animation, we're going to do it in two steps. First, we're going to update our player's position to disappear into our hallway, so halfway between our two doors. And then, we're going to animate our player into our next room. By breaking this up, it's going to help us create a transition for our camera.

And then we get a nice smooth transition as our player moves between our rooms. So now to calculate that position, let's make a new object. We'll do const. We'll do door do door distance. We're going to set it equal to an object.

For our X and Y values, we want to compare our X and Y position of our door transition zone and our target door transition zone. And since we only want to move our player halfway between here and their target location, we'll want to divide it by two. While working with both of these properties, we're going to use the absolute value so we make sure they're positive. And so we'll do math. We'll do do math.

We'll do absolute. And now let's take our door. We want to do our door transition zone, our x value. We want to subtract our target door, our door transition zone, our x value. And now we want to divide it by two.

Now we want to do the same thing for our y value. And so for our property, we'll do y. But now we'll use our y values from both these game objects. And so since both of these are positive now we need to check our target direction and then multiply by -1 if we need to decrease our player's value. So we'll do if our target direction is equal to our direction up then we want to take our door distance our y property and we want to multiply this by -1.

And we'll want to do the same thing if our direction's left and then we'll do our x value. do our x value. Now that we have our distance we need to move, we can create a tween to update our player's position. So, first we'll make a variable to store our target position we want to move our player to. And so we're going to call this player target target position.

Set that equal to an object. now for our player's target position, for our x value, we want to take our door's x value and we want to put our player in the middle. So we'll add in our width and then divide it by two. We'll then want to add on our door distance that our player needs to travel. So then that way our player will be somewhere in our hallway here.

For our y value, we'll want to do something similar where we take our y position and then subtract our height. So then that way we'll be in the center. And then we'll also want to increase our height. We'll also want to increase our y-val so our player moves down. So to do that, let's take our door.

We'll do our x. We're going to add our door, our door transition zone. We'll divide it by two. Now we'll add in our door distance. And we'll do our x value.

And then we'll do our door, our door transition zone, and we want our width. Let's copy this. And we'll do our Y value. And so for our Y, we'll do our door Y, our door transition height, and then we'll add in our Y position. And then we actually want to subtract our height.

So then that way we put us in the middle of our door. Now that we have our target position, we can create our tween to animate our player. we'll do this. We'll do our tween. So let's do add.

So now for our tween, we want to target our want to target our player. For our Y value, this is going to be our player target position. And then our Y property. Now for X, same thing, but with our X thing, but with our X property. Now for our duration, let's do 750 milliseconds.

And we'll do a small delay. And we'll do 250 milliseconds. All right. So if we refresh, we can test our changes. Let's have our player come down to our door.

As soon as they overlap with our door trigger, we start our animation for moving our player down between our two doors. For our next part of our animation, we want to start updating our camera to move from our current room to our next room. For this to work, we have to reset our camera's bounds. Otherwise, we won't be able to have our camera scroll from this room to our next. So, we'll start off by doing this.

We'll do our cameras. We'll do main. We're going to call set bounds. Now for our bounds, we just want to reference our world's X, Y, and width properties. So then that way we can have our camera move in any direction we need it to move.

So we'll do this. We'll do our cameras. Let's do our main. We'll do our world view. We'll do our X value.

I'm going to copy this. We'll paste it three three times. Now we want to do our Y. And now we want to do our width and our height. After we reset our camera's bounds, now we want to create a tween animation to move our camera.

For our animation, we don't want to target our camera directly. Instead, we'll want to update our camera's bounds. By updating our camera's bounds instead of our X and Y properties directly, it's going to allow us to shift our camera in the direction we need it to go without it leaving our currently defined space for our rooms. And so to create this type of animation, we need to have a property we can animate. And so to do that, let's make a new variable.

Do const. We'll do bounds. We're going to set equal to this our cameras, our main camera. And now I'm going to call get bounds. Now this method is going to return a copy of our bounding rectangle.

So we can modify it without affecting our camera. Once we have this rectangle, now we can update it as part of our tween configuration and then we'll use that to reset our camera's bounds. So let's do this. We'll do our twins. Let's do add our configuration.

We want to target that bounding rectangle. And now we want to target its X and Y values. For these, we want to grab our X and Y values and base these off of our target room. So, very similar to what we did when we updated our camera initially for our bounding area. So, we want to grab our target room and then we can update our X and Y values.

Very similar to what we did here. So, I'm going to copy this line of code from setup camera. We'll come back down here. And so we'll just add that code before our tween configuration. So instead of targeting our current room ID, we want to use our target door and then grab our room ID from that object.

Down in our tween configuration, we can do our room size. x. For our Y, we'll do our room size. y and we'll subtract our room size height. And now for our duration and our delay, we'll do 1,00 milliseconds for our milliseconds for our duration.

And we'll do 500 for our delay. delay. And so now to reset our camera's bounding box while this is happening, we want to use our on update want to use our on update property. And so what on update does, this allows us to provide a callback function that can be invoked between every step of our tween animation. When this runs, we'll reset our camera's bounds.

And we want to set it to our bounds rectangle here. So I'm going to copy this here. We'll paste it. But now we want to update our reference. And so we'll do our we'll do our bounds.

X. And we want to do the same thing for our X, our Y, and our width and our and our height. Finally, for our camera animation, the last thing we'll do is before we start our tween animation, we want to have our camera stop following our player. We do this. We'll do our cameras, we'll do main, we'll do stop follow.

And once we get our player into our next room, we'll reset our camera to follow our player. Right. So, we want to test our changes. Let's come into our browser. If we have our player interact with our door, we now have this very nice smooth transition where our camera is going to move from our previous room to our new room.

So, just to recap what we did here, we started off by resetting our bounds for our camera. So, after we reset our bounds on our camera, we now want to update it to be the bounding box of our next room. That way, our player will be able to navigate around that room without our camera leaving it. However, we don't want to set this right away. Otherwise, what would happen is our camera is going to snap to that next location and we won't have this nice transition.

And so to see an example of this, let's come up to where we set up our camera. Let's copy our line of code here where we set our bounds on our camera. Let's come back down to our method. We'll paste it outside our tween and let's comment out our tween. So now what we're doing is after we have our camera stop following our player, we reset our bounds on our camera to be equal to the new bounds on the new room we're moving to.

Now, what should happen is after our player transitions to our door, we immediately snap to that new view. And it's really jarring for the player. And so to avoid that jarring experience, we can use a tween. With the tween, we can tween between our bounding boxes current x and y values and animate them to our target position we want to move to. So that's what we did here.

First, we grabbed our x and y value from our current bounding box. And then for our target, we provided our updated X and Y based on our bounds of our target room we want to move to. And so then now by adding in that tween, we get this nice smooth animation where our camera now moves down to our next room. The last thing we need to add for our room transition animation is while we're updating our camera's bounds, so we transition to our next room, we also need to update our player's position. After our player enters our room, we're going to use that as our trigger to reenable our collision check between our player and our door trigger.

We'll also use that to update our camera to start having it follow our player again. To add in this tween configuration, we first need to calculate how far our player needs to move from our offscreen position here into our room. To figure that out, let's make a new variable. We'll do const. We'll do player distance to move into to move into room.

We're set that equal to an object. And then we'll have our x and y values. we're going to take our door distance variable. We'll take our x property. We're going to multiply by two.

And we'll do the same thing for our y-value. So, for the distance our player needs to move into our room. We want to make sure that this value is enough to make sure we always clear our door entrance. Otherwise, what could happen is if this value is small enough, our player could end their position while still standing on our door trigger. What this would do is it would then trigger our player to now go back into our other room and we don't want that.

And so to make sure we always move at least this minimum distance, we're going to use math. max. So first we're going to check our target direction. So we'll do our target direction. And so if our target direction is equal to direction up or it's down, then we know we need to modify our y value.

So we'll take our player distance to move into room. We'll take the y property. We're going to set equal to our math. We're going to do max. And now we're going to do our absolute value to make sure we working with positive numbers.

So we'll do absolute value and we'll do our player distance in the room y. And now we're going to compare this to 32. And so by doing this, whatever this value is, we'll make sure it's always positive. And whichever of these two is greater, we're going to take that value. So if this is 16, we'll make sure we at least move 32 pixels.

If this is 64, we would move 64 pixels. Now, if we're moving our upwards direction, we want to make sure our y value is going to be negative. So, we're just going to take this and we're going to multiply it by -1. And so, we'll just do if our target direction is equal to direction up, then we just want to multiply this by -1. And now we just want to do the similar logic for other direction.

So, I'm just going to copy this logic here. We'll do our else block. And now we just want to do our x property. And now if our player is moving left, we want to multiply our x value by -1. Now that we've calculated our distance we want to move, now we can create our tween to finish animating our player.

So we're going to do this. We'll do our tween. Let's do add. Now for our configuration, let's target our player. Now for our x and y value, we're going to use our player target position.

X. Now for our properties, let's do our y property. So, we're going to take our player target position and our y-value. And now we're going to increment it by our player distance to move into room, our y-value. We'll copy that.

We're going to do the same thing for our x for our x value. So now for our duration, let's do 1,000 milliseconds. And for our delay, we'll do 1,200 we'll do 1,200 milliseconds. Next, we'll add in our onmplete call back. onmplete call back.

So now in our callback, we want to reenable our target door so we can trigger our collision. So we'll do our target door. Let's do enable object. Now we want to update our current room our player is in. So we'll do this.

Our current room ID will be equal to our target door and the room that that door belongs to. We want to update our camera. So we'll do this cameras. main. Start to follow.

And we want to follow our player again. All right. So now if we save, let's come back over to our browser. All right. Guys, if we test our changes now, we should be able to have our player come down into our room.

After our player enters our room, we should be able to go back up and our camera should follow our player back into that player back into that room. All right, so with our changes, our player should be able to navigate our dungeon through our various rooms. All right, so we'll do one more quick test. We're going to come to our last dungeon room, which is larger than our other rooms, and we want to make sure our transitions working properly. Oh, so it looks like we have an issue.

After our player enters this room, our camera transitions to the top of the room instead of focusing on our player. Now to fix our bug with our last room transition, let's come up to our logic for our tween where we update our camera's bounds. Oh, so when we do call set bounds, we don't want to call our bounce. width and our bounce. We want to reset this to be our room size and use that within that within height.

Right. So now if we save, let's come back to our browser. Let's navigate to our last room. All right. All right.

So, now we enter our last dungeon room. Now, our camera bound should match where our player enters through our door, and it should follow our player as we move up through our level. through our level. Nice. So, one other thing we'll want to do when our player's transitioning through our rooms is after we start our transition, we want to lock our player input.

Otherwise, what can happen is our player's transitioning, they can keep pressing our arrow keys, and it's going to move our player around. Instead, we want our player to stay facing the direction until they get into the next room, and then we'll give control back to our player. To add support for this, we're going to enhance our input component, and we're going to add a new property to indicate if our movement should be locked for our player. To do this, at the top of our class, let's add a new property. We're going to call this is movement locked.

We'll make this a boolean. Now, for our default value, we're going to set it equal to false. set it equal to false. Let's update our reset method to also reset our property. And now let's add in our getter and setter uh for this property.

So we'll do get is movement locked. This will return our boolean. So we'll return this and then our private property. I'm going to copy this. We'll do our setter.

So we'll do set. We won't have a return type. And now we'll have our value. And this will be our boolean. Now we'll just set our private property to that value.

So now back over in our game scene. So now in our handle room transition method, let's lock our input. So we're going to do this. We'll do our controls. We'll do is movement locked.

We'll set it equal to be true. Let's copy that line of code. Let's come down to the bottom of our method. And after we reset our camera, let's reenable our input. So our player should be able to move around.

Finally, we just need to update our state for our player movement. So we won't allow movement when our input's locked. To do that, let's go into our base move state class and our is no input movement method. All right. So in our method, if any of these are true or if our movement is locked, then we don't want to allow movement.

So now we're going to do or. we'll do our controls and we'll do is movement movement locked. So we save. Let's come back to our browser. Let's try testing.

Try having our player move through our room. Oh, looks like we can still provide input. So now let's take a look at our move state class. So in our move state class after we do our check for is no improvement. Ah yes, we just need to add in our return statement.

So we don't process the rest of our code inside our method here. So now if we come back to our scene, let's try having our player move. Now we'll see we can't provide our input. And then once our player's back in the room, we give them control over their player again. Much better.

And just to double check, let's open up our move holding state. And oh, we also need to add in our return statement there. Now let's save. Now let's save. So now for our room transition logic, the last thing we'll do is we're going to move our properties here for our duration and delay for our various twins into our config file.

So let's go into our config file. All right, so let's make a new variable. Do export const. And for our variable name, we're going to do room to do room transition and we'll do player into hall duration. We'll set that equal to our 750 milliseconds.

Let's copy that. Now we'll do our we'll do our delay for that. They'll be 250 milliseconds. Now let's copy both of those. We'll paste them.

Now we're going to do our room transition player into next next room. So I'm just going to copy that part of our string. We'll replace hall. Now for our values, we'll do 1,00 and then our 1200. Finally, we just need to add our two properties for our camera.

Let's copy that. We'll paste it. Now we'll do our room transition and we'll do our camera animation do our camera animation duration. I'm going to copy that and then we'll do our then we'll do our delay. So now we'll have our th00and milliseconds and then our 500.

All right. So now we just need to update our game scene. Let's come up to our imports and we're just going to import our whole object from our config file. So we're going to do import as our config. Now we'll need to update our references in our code.

So we'll have our config and then our debug. We'll have our config, then our player then our player health. And now, if we come down to our handle room transition, we can update to use our new properties. So, we'll have our config. We'll have our room transition player into next room duration.

I'm just going to copy that. Now, we want this to be our delay. Let's go to our other player tween. We'll replace our duration. So, now we'll do our room transition, our player into hall duration.

I'm going to copy that. Now we'll do our delay. And now for our camera. Get rid of our duration. And so we'll do our room transition camera animation duration.

Now we'll do our duration. Now we'll do our delay. All right. So let's save. We'll do a quick test.

Let's have our player come down to our door. As soon as they interact with it, our camera and our player should be updated and transition to our next room. Now that we have our logic in place for allowing our player to transition between our various rooms in our dungeon, next we'll focus on our level transitions. For this, once our player's body overlaps with our door trigger for the front of our dungeon, we're going to see if our door object has a target level defined. If it does, we're going to restart our phaser scene.

We're going to load in the data for that level and then transition our player to that starting position. To start adding this changes, let's go into our game scene. We'll go into our handle room transition method. After we get a reference to our door game object, we want to check our target level property on our door. And if it's one of our levels, then we want to restart our scene.

And so to do this, let's do if and we'll say if our door, our target level, if it doesn't equal empty string, then we want to do the same logic that we did in our preload scene where we build out our level data object and we call scene. st start and pass that to our scene. So, let's copy that logic. Come back to our game scene. We'll paste that in.

But now for our properties for our level, this is going to be our door and then our target level. Now for our room ID, we'll do our door and we'll do our target room ID. And now we'll do our door and our target and then our target door ID. So now to fix our issue with our target level, currently we're expecting one of our level names as our string. But the data we're getting from tiled just parses our target level as a string.

So, we're going to add a utility function to make sure our target level property is actually one of our level names. To do that, let's jump over to our utils file. Let's copy our function for is direction. And now we're going to do the same thing for making sure our string is one of our level names. So, for our function name, we're going to do is level name.

For our argument, we're just going to call this level name. And now for our return type, we'll say our level name is our level name type. Now, we just want to check on the correct object. We'll have level name. We'll pass in our level name for our property.

And you just want to make sure it's not undefined. Now, back in our game scene, we're going to replace this logic with our utility function. So, we'll do is level name, and then we'll pass our door and our target level as our argument. before we can test our level transition, we need to address a bug that was included as part of the original project template. In the original project template, we included our two JSON files, one for our dungeon and one for our world, which is our JSON files we exported out from tiled.

Now, in our dungeon_1 JSON file, we have one of our target properties called target level where we set our value to be world. Now, this is our door object where we want to transition to our world scene. When we created our levels in tiled, we expected these values to all be capitalized. So, in the original version of the project template, this value is all lowercase. This has been fixed in the project repo.

So there's a possibility you don't need to fix this here. So we need to change this string to be all capitalized. And the reason for that is back in our game scene when we do our check for is level name, we're expecting that property to exist on our object. Since our string is all lowercase, this is going to cause an issue where we won't be able to find our level name. So, as an example, if I turn this back to lowercase, and if we have our player try to leave our dungeon, what will happen is we're going to have this weird teleporting effect where our player is going to come back up to the top of our map.

And so, if we change this to all be uppercase and we refresh our browser, if we have our player leave our dungeon, our level should now transition to our world scene like we expect. Besides fixing our code in our JSON file, we're also going to add some code to our game scene to handle this case in case it happens again. Now, in our code, let's do const. We're going to make a new variable and call this modified level modified level name. We're going to set that equal to our door, our target level.

Now, we're just going to call two just going to call two uppercase. And now we just need to pass our variable to our is level name check. And then we'll pass it down here for our level data as well. All right. If we want to test, let's come back to our browser.

Let's have our player navigate down to our dungeon entrance. All right. And as soon as our player's body overlaps with our door trigger, we'll see our scene restarts. And now we loaded in our assets that are tied to our world level. All right.

And one thing we'll need to fix is after our scene starts, we need to update our player starting position. We'll need to base this on the target room and the target door ID that our player just entered through. To update our player starting position, let's go to our setup player method. So now to calculate our player's position, we need to get a reference to our door that our player just exited through or when we first launch our game where our player starting at. To do that, let's make a new variable to const.

We're going to do starting door. We're going to set that equal to this. We'll do our objects by room ID. Now we're going to use our level data. We want to use our room that our player's currently in.

Now reference our door map. And now we'll do this, our level data, and now our door ID. Once we have our starting door object, we can now calculate our player starting position based on that door's x and y values. For that, let's make a new object. We'll do con.

We're going to call this player start call this player start position. Set that equal to an object. Now, for x, we'll do our starting door x value. And we'll do plus. We want to do our starting door, our door transition zone.

We want to grab our width. We want to divide that by two. Now for our Y value, we'll do our starting door Y and we want to decrement our starting door, our door transition zone, and we'll divide that by two. So now that we have our initial properties, we want to check the direction of our door and then update our X and Y values accordingly. similar to what we did when we did our room transition where we update our player's X and Y values based on the door and the direction, that's what we'll do here.

So let's do a switch statement and we'll do our starting door. Let's do our direction. Now we'll have our various cases. We'll have case, we'll have our direction we'll have our direction up. And so when our door is facing up, we want to increase our y value.

So we'll do our player start position, our y value. We want to increment it and we'll do 40. Then we'll do break. Now let's copy those lines of code. We'll do our other cases.

Our other cases. So after up, we're going to have down. And now we'll decrement by 40. Then we'll have left and then we'll have left and then right. And so for our left and right, we want to modify our X property.

When we go left, we want to decrement. And we go right, we want to increment our X value. Finally, we'll add in our exhaustive guard. So let's do our starting door. And we'll do our direction.

Oh, and then up here. So after our door transition zone, we want to grab our height. And then this should be a default. So now that we have our player start position, we can update our positioning down here to use those values. So for our object, we'll have our X will be equal to our player start position.

X. We'll have our Y. We'll set that equal to our player start position. Then our Y value. All right.

So if we save and when our browser refreshes, we'll see our player starts right next to the door that's specified in our level data from our preload scene. So as an example, if we jump over to our preload scene, let's update our scene data. So, let's go to room two. And now when our browser refreshes, we'll see now our camera is now focused on our second room and our players next to that door. Now, if we update our door ID to be door ID 2, our players going to spawn down by our second door.

So, now what we should be able to do is if we change our room ID to any of the IDs of our rooms in our dungeon, we should be able to test our logic for our various doors and our room combinations. Oh, so it looks we have an issue tied to our X position. Let's come back to our code in our game scene. Oh, so when we're going to our direction left, we actually want to increment our X value. And we're going right, we want to decrement our X value.

So now if we come back to our preload scene, let's test our various combinations. So let's do our room ID 3. We'll do door one. Now if we do door two, we'll see our player spawns next to our door. And now they're right next to where they just exited from.

And now if we do room four, we should see our player spawns in the correct location. All right. So with these changes, what we should now be able to do is if we update our level name, we do our world scene. Now our player should spawn outside the entrance to our dungeon. So now if we revert that back to our dungeon level, let's start off in room ID three.

And we'll update our door ID to be three. All right. So if we save our changes, if we have our player leave our dungeon, we should now spawn in our world level. And now if our player comes back to our door, oh, looks like we have an issue. Let's jump over to our game scene.

Ah, yes. So after we restart our scene, we want to have a return statement so we don't run the rest of our code. All right. So if we save our changes, let's have our player go through our door. We go to our world level.

And now we have our player try to come back into our dungeon. We now have our player appear in the correct room and at the correct door. Nice. Now that we've built our dungeon level, it's time to bring it to life by adding interactive objects. Using the data from our tiled map, we'll dynamically create important elements pots, chests, doors, and even enemies.

This will allow us to define our level layouts visually in tiled while keeping our game code flexible and scalable. Let's dive in and start placing objects into our placing objects into our world. So, previously in our game scene, we added in logic to parse our object layers from tiled, and we created a bunch of methods as placeholders for creating our various game object types. We're going to now focus on adding in our logic to actually create our game objects from that tiled object data. So, similar to what we did for our create doors method, we're going to take our tiled objects.

We're going to iterate through them and then create instances of the game object that's tied to it. And so, we're going to start off with our pots. And so, for our pot class, we need to grab all of our valid tiled objects. And now, we want to iterate through them. So, I'm going to copy this logic here.

Let's come down here. We'll get rid of our console log. Let's get rid of our to-do and our console log here. And now instead of creating a door, we want to create a pot game object. Now we'll do an instance of our pot.

And currently our pot class is set up. So we pass in a config object which will have our scene and our position. We want to change this to follow the pattern that we started in our door class where we have our phaser scene and then our config is going to point to our tiled object for that game object. So if we jump over to our pot class, let's make that change. So for our constructor, first we'll do our phaser scene.

So for our type, we'll have phaser scene. Now for our config, instead of pot config, we're going to do our tiled pot object. Let's get rid of our pot config type here. So we'll get rid of this line of code here. And now we'll have our scene.

And now we want to do our config. x and then our config. y. And then keep track of our position. We'll do the same change there.

So now we made that change here. Let's come back to our game scene. Now when we create our pot instance, we want to pass in our instance of our scene, our tiled object. But now when we store our reference to our pot, we want to do this on our pots array and we'll push in our pot instance. So after we add that to our array, we want to add that to our blocking group.

So we'll collide with that game object. So we'll do this. We'll do our blocking group. Let's do add. We'll add in our pot game object.

Now we'll get rid of these two lines of code here. All right. So let's go into our temporary code. Let's comment out our code here where we create our pod instance and we add it to our pot game objects array. And then let's comment out our code here where we create our blocking group and we add our chess game objects to that.

So now that changed now we need to create our blocking group when we set up our level. So let's go to our create level method. We'll come down to where we create our door transition group. I'm just going to copy that line of code. We'll paste it.

And now we're just going to do our blocking group. Now, if we save and we come back to our game, we should see right away that two new pot game objects have been added to room three in our dungeon. So, now our player should be able to go ahead and collide with those game objects. And now, if we come up to room two, we should see that our pot game objects have spawned in this room as well. Now that we have our logic in place for creating our pot game objects from our data and tiled before we move on to our other game objects, I want to go ahead and clean up our temporary code that we initially added where we created our various enemies, our chess game objects, and our pots.

Instead, we're going to rely on our data from tile to create those objects. And so, as part of that cleanup, we'll need to refactor our collision logic to no longer rely on those groups and use the groups from our objects by our room ID object. So to clean up this code, let's go into our temp code method. Let's remove that whole block of code here. Next, we'll want to remove our two properties that were tied to that temporary code.

Our first will be our enemy group. And so our enemy group, that's going to be stored down here on our objects by room ID where we have our room ID and our object here. We'll do the same thing for our pot game objects array here since that data will be stored down here as well. So now down in our create method, let's get rid of our to-do here and our temp code call. Now down at our register colliders.

Now we want to get rid of our references to that temporary code. All right. So for our method here to get started with our refactor. First let's bring up our code where we check for our player's collision between our player and our collision layer. So we'll grab this logic here.

Bring that to the top of our method. So next for our player, let's grab our overlap check between our player and our door transition group. We'll bring that to the top of our method. And then we'll grab our logic for our collider between our player and our blocking our blocking group. So now for the rest of our collision logic, we now need to iterate through our objects by room ID object.

And for each of our rooms, we want to grab that enemy group and create a collider to add in those collision checks. To get started this change, we'll just do our object. Let's do our keys. Let's do this. Our objects by room ID.

And now for each of our keys as now for each of those keys, we'll get a reference to our room ID. So we'll do const. Let's do our room ID. We'll set it equal to parse int. And we'll do our we'll do our key.

So once we have a room ID, we just want to make sure that exists on our object. So we're just going to add a safeguard. So we do if safeguard. So we do if this our objects by room ID. If that room ID is undefined, we'll return then we'll return early.

And so then if it's not undefined, now we want to see if that room has a group of enemies that we need to have collisions with. We're going to do if this our objects by room ID, our room ID, and our enemy group. So if our enemy group does not equal undefined. And so now if our enemy group does exist, now we want to add in our colliders and our overlap checks between that enemy group and all the logic that we did here. To start with, let's grab our logic for we add in our collision check between our enemy group and our collision layer.

So we'll grab this logic logic here. So we'll come back to our if statements, paste our code in here. Instead of doing this enemy group, we want to grab reference to our enemy group here. So we'll copy and paste that in. One other change we'll do is we're going to remove this logic here where we set our collision.

We only need to do that one time for our collision layer. we're going to bring that up here to the top of our class. Let's paste that in here. Now, if we come back down to our code, next, we'll want to add in our collision check between our player and that enemy group. So, let's copy this logic here.

We'll come up back up here. Let's paste that Let's paste that in. So, now for our check, we'll grab a reference to our enemy reference to our enemy group. Next, we'll remove our logic where we register collisions between our enemies and our world bounds. Now that we have our collision layer in place, we shouldn't need that logic.

Finally, we'll want to add in our collider between our enemies and our various blocking game objects. So, let's copy this code here. We'll come back up to our if statement. We'll paste that in. now we just want to update our reference to our enemy group.

So, we'll copy this. Let's paste that in down here. All right. So, that should take care of our logic for our enemy group. Now, we need to handle our pot game objects for that particular room.

For this, let's copy our code here. Let's drag that up below our if statement. And now, we're just going to modify our safeguard here. So instead of doing this, our pot game objects, we want to reference this our objects by room ID, our room our room ID. And then we'll want to check for our pots array on that room.

So now we'll just update our references. So instead of doing this, our pot game objects, we'll paste that here. We'll keep our blocking group. All right. So now if we save and when our browser refreshes, our player should still be able to collide with our collision layer that we set up.

And our player should be able to collide with our pot game objects just like before. Once we get to the part where we add in our logic for our enemies, we'll verify that our collision logic for our enemies and our player is still working properly. And so now one last change we're going to add for our collision logic is for our pot game objects. We want to make sure these game objects actually collide with our collision layer. So right now our player is able to actually throw our pot outside of our dungeon room and instead once it hits our wall here, we want our pot to break.

And so to add in that check, let's copy our logic here for where we have our collider between our pots array and our blocking group. And now we just want to update our reference to be this and then our collision layer. So now if we save, we should be able to come back to our game. If we grab one of our pots, if we move our player over by our wall and we throw it, our pot should break right away once it collides with that layer. Next, for our level objects, we'll focus on dynamically creating our chess game objects from our data ent.

For this, we'll need to enhance our chest class to have some new properties to match some of the properties from our tile map data. And we'll want to update our configuration to be more in line with what we did for our pot game object where we just pass in our tiled object that represents our chest. And then we'll grab our properties from there. To start making our changes, let's go into our chest class. Let's get rid of our chest config type here.

So now in our constructor, first let's add in our phaser scene. So for our type, we'll have phaser. We'll have scene. Now we want to do our config. This is going to be our tiled, our chest object.

Now we want to pass in our chest state. And so we're going to make this optional and we'll do our chest state and we'll do hidden. All right. Now for our code updates, let's get rid of our first line of code where we destructure our scene and our position. Now when we call super, we want to reference our config.

We'll grab our X and Y values from there. It's now for our chest state. We'll want to grab that from our constructor. And so we'll just set this equal to chest state. Next, we'll need to add a few new properties to our class to match our data from tiled.

This will be things like our chest ID, what our chest contents are, and what the reveal trigger is if it's a trap type chest. at the top of our class, we'll add an ID first. So, we'll make this a number for a type. Now, we'll do our reveal reveal trigger for our type. This will be our trap type.

Now, we want to do our contents, and this will be our chest and our reward. So now down our constructor, we'll want to initialize these properties. So we'll do our ID is going to be equal to our config. Our ID, our reveal trigger is going to be equal to our config. Our reveal chest trigger, and now our contents will be equal to our config, and then our our config, and then our contents.

Now that we've added our new properties to our class, let's add in some getters so we can easily retrieve those properties. So after our constructor, we'll do get, we'll do our reveal reveal trigger. This will return our trap type. we'll do return this, our real trigger. Let's copy that block of code.

We're going to do two more getters. We want to do our chest ID. So our type will be our number. Let's return our ID. And now we want to do the contents on our chest.

So now this will be our chest reward. And we'll return this. And then our our contents. Next, for our chess class, we want to have the ability to enable and disable our game objects based on our room, our players entering or leaving. And so, this will be similar to what we did for our pot game object class where we have that class implement our custom game object and then we add in our enable and our disable object methods.

To do that, let's come over to our chess class. After we extend our phaser physics arcade image, let's do implements. And now we'll do our custom. And now we'll do our custom game object interface. And now we need to add in our two methods.

So if we go into our pot class, let's copy our two methods from there. We'll come to the bottom of our chest game object. Let's paste those in. Then for our disable object method, we don't need to make any changes. But for our enable object method, we'll want to check our chest state.

So if our chest is actually hidden, we don't need to enable our physics body or make our game object visible until we want to reveal it. So we just need to add in a safeguard to if this if our state is equal to our chest state and if it's hidden then we can just return early. Now that we have our two methods the last change we need to make for our chest class is we just need to add some logic tied to our chest state. Currently for our chest our chest game object can be in one of three states. It can be hidden, revealed or opened.

By default when we create our game object we're setting our chest state to be hidden. So when we created our chess game objects in tiled, we set up our chess game objects to have a trap type and we set it to either be none, enemies defeated or switch. So now when we create our chest game objects, we want to check our trap type. If our trap type is set to none, that means our chest should be visible to our player at all times. And if our trap type is one of the other two, it needs to be hidden by default until the player meets that condition to reveal our chest.

To layer in this logic, we'll start in our constructor. And so we want to update our default chest state if our trap type is none. So at the bottom of our constructor after we add in our components, we'll do if we'll do this if our reveal trigger is equal to our trap equal to our trap type. none. And now we want to check our chest state.

And so if it's hidden by default, now we want to make it revealed. So we're going to do if we'll do our state is equal to our chest statehidden. Now we'll update our state. we'll do this. We'll do our state and we'll say equal to chess state revealed.

Now that we've updated our chest state, we'll want to either show or hide our game object based on our reveal trigger. So when we create an instance of our chest, if our track type is set to none, then we want to update our state to have it be revealed and we'll want to have our game object visible to our player when they enter into our room. If our chest is tied to one of our two trap types, we don't want it to be visible to the player until they meet those conditions. To add in that change inside our if statement here, we're just going to add in a return statement. And now, if our chest is either tied to our enemies being defeated or stepping on a button, we'll want to disable our game want to disable our game object.

Finally, for our chest class, we just need to add in one more public method, and this is tied to revealing our chest to our player. So, as an example, when our player is in one of our rooms, if there's a hidden chest and our player presses a button to reveal that chest, we'll need to have a method that will update our chest state and then enable that game object and our scene. That way, our player will be able to collide with it and interact with it. for that change, let's come down to the bottom of our chest class. We'll add in a public method.

We're going to call this this reveal. We won't return anything from this method. First, we're going to check our chest state. And if our chest state is not hidden, we'll return early. So I'm going to copy this block of code here from enable object.

We'll just change this to not. Now if our chest A is hidden, now we want to update our state. So we'll do this. Our state will be equal to chest state. And we want to reveal our chest.

And now we want to enable our enable our object. So now that we have our reveal method, after our player reveals our chest, they should be able to interact with it and they should be able to open it up using our open method on our class. class. Now that we finished updating our chess class, let's jump back over to our game scene. And in our create chess method, now we need to create our chess game objects from our tiled objects.

For this, let's go into our create pots method. I'm going to copy our block of code here where we iterate through our tiled objects and we create our pots. Let's paste that in our create chest method. Let's get rid of our to-do and our council log. So now when we're iterating through our tiled objects, let's update our variable name.

We'll change this to be chest. We'll update our class name. So we'll do chest. We'll pass in this for our scene, our tiled object. Soon after we create our game object, we'll want to add that to our chest array for our objects by room ID.

We'll pass in the instance of our chest. We'll also want to add this to our chest map. So I'm going to copy this line of code. Let's paste it. So now we'll do our chest map.

On our map, we want to use our chest ID for our key. Instead of calling push, we just want to set it equal to our chest game object. And then we'll want to add this object to our blocking group. So now if we want to test our changes, come back over to our browser. We'll have our player navigate to our next dungeon room.

We shouldn't see any chests by default in this room since our current chest should be hidden by default. If we move over one more room, we should have one chest that's visible and one that's hidden. And now if we come to our last room, we should see our boss chest is now visible to our player. player. And then finally, if we want to test being able to reveal one of our chest, let's come down to the bottom of our class.

When we have our tween for after our player enters into one of our rooms, we're just going to add in code to manually reveal one of our chest. So once we finish updating our player, we're going to do this. Let's do our objects by room ID. We're going to get a reference to our current room. Let's grab our chest map.

We're going to grab our first chest and we're going to call reveal. So now this is going to simulate that our player revealed the chest in our first room. And so now we enter our room. Our chest game object should now appear to our player. And if we come up to it, our player should be able to open our chest.

And we should see our console log line of chest being opened. All right. So now that we've tested our change, let's remove that line of code. And we'll save. Now that we finished dynamically creating our chest, it's time to move on to our enemies.

Let's jump over to our game scene. Let's find our create enemies method. and our method. Let's clean up our to-do and our two console log two console log statements. Now, we'll want to iterate through our array of our tiled objects.

Let's do four. We'll do const tiled object of our valid tiled objects. And now, for each of our objects, we'll want to check our type property on our enemy object. And depending on that type value, we'll create our different enemy types. So, first we'll add a safeguard to make sure it's one of our known types.

So we'll do if our child object type does not equal one. And if our type doesn't equal two or three. So let's just copy this here. We'll paste it. So we'll do two.

And if it doesn't equal three, then it's a type we're not aware of in our code. So we're just going to do continue to move to our next iteration of our loop. And as long as it's one of those values, we can create our various enemy types. So we'll start off with type one. So this will be our spider.

So we'll do if our child object type is equal to one. Now we want to create our spider. So we'll do con spider be equal to a new spider instance. Now for our configuration we want to pass in scene. So we'll pass in this.

Now for our position and now in our position we'll have our x. This will be our tiled object our x property. And we'll do the same thing for y. And after we create our spider enemy we want to add this to our enemy group for our existing room. So we'll do this.

We'll do our objects by room ID. We'll do our room ID that we passed in. Now we reference our enemy group. Now we want to do add and we want to do our spider. So after we create our enemy, we can continue to our next iteration on our loop.

Now we want to do the same thing for our other enemy types. So let's just copy this here. We're going to paste it. If we have type two, that's going to be our going to be our wisp. And we'll just update our variable name.

And we'll paste our code one more time. So let's copy this here. And so if our type is three, this is going to be our boss enemy. And for the time being, we're just going to add a to-do. And we'll have our continue to go to our next iteration.

So we'll do to-do. We'll say create boss enemy. So one last change we need to make to our code is we need to make sure our enemy group is actually defined. So we're adding our game object to the correct group. By default, our group is optional since not all of our rooms will have enemies in our game.

And so to add that check, we'll come outside our for loop. And so we're just going to do if our objects by room ID if our current room ID that we provided if that enemy group is undefined. Now we want to create that enemy group. So we're going to do this our objects by room ID. The room ID we'll reference our enemy group property.

We'll set that equal to this add. group. Pass an empty array for our children. Now for configuration we want to do run child update. We want to set that to be true.

So now down in our for loop, we can remove our optional chain since our game object group will exist. now if we save, let's come back to our browser. We should be able to test. Let's move up one room. We should see our two spider enemies and our wisp enemies being created.

If we go up to our boss room, there should be no enemy since we're not handling that type. Now, if we refresh, let's go to the right and we should see our two wisp enemies. If we go over one more room, we should have no enemies. And then for our final room, we should have our two wisp and our four spiders. So we have 1, two, three, four.

Nice. Now that we're dynamically creating our enemies and adding them to our various rooms, it's time for us to move on to creating our doors. So previously we've added in logic to parse our data from tile to create our various door objects. And we use that right now for allowing our player to transition between our various rooms and our dungeon. Now, we need to enhance that object with more properties from our tile data object.

We'll need to do this in order to support our different door types. So, for our door object, we have a variety of types, and they can be in a variety of states. For our doors, they can be open, which just allows our player to move to our next room. They could be a locked door, which will require a small key in order to open, or it could be a trap door, which requires the player to complete some type of objective before the door opens to the next room. To add support for this, let's go into our door class.

We'll start off by adding some new private properties to our class that will align with our properties from our tiled object. First, we'll do our ID for our door. This will be our number. We'll need our ID in order to know which trap is tied to which door. Next, for our locked doors, we need to know if our door is currently unlocked.

And so, we'll do is unlocked. This will be a boolean. Now, for our trap door and our lock doors, we'll need to add a game object that will allow our player to collide with our door so they can actually transition to our next area. we'll need to add a new phaser game object for that. So, we're going to add in a property.

We're going to call this door object. This will be our phaser, our types, our physics, our arcade, and it'll be an image with dynamic body. Or it can be undefined since not all of our doors will be locked. Next, if our door is a trap door, we need to know what that trigger is. So we'll do trap door trigger.

This will be our trap type. And now we just need to know our door type. Now if we come down to our constructor, let's set up our properties. So we'll do this. We'll do our ID will be equal to our config.

Our ID. Now for our door ID. Now for our door type, this will equal to our config. Our door type. Now is unlocked will be our config.

Is config. Is unlocked. And now our trap unlocked. And now our trap door. Next, let's add some new getters to retrieve some of our new properties.

We come down to the bottom of our class. Let's copy get direction. We'll paste that. Let's do our door object. So, now for our type, let's come up to the top of our class.

We'll copy our type from our type from here. Now, let's return this and then our door our door object. Next, we'll add in a getter for our ID. Our return type will be our number and we'll return this and our ID. Now we'll do our trap door trigger.

So our return type will be our trap type and then we'll return our property. Now let's do our door type. Our type will be our door type. Now it's save. We'll come back up to our constructor.

So now back up in our constructor. Now, we need to create our door object. For our door object, we only want to create this if our door is not actually open to our next room. For this object, we're going to use a physics image. That way, we can have our player collide with that game object, and we'll need to choose our frame from our asset based on our door type.

To add in this logic, let's go to the bottom of our constructor. So, first we'll do our check for our door type. If our door type is open or it's the entrance to our dungeon, we don't want to show our game object in that location. So we'll do if this our door type if it does not equal our door type our door type open and our door type does not equal our door type our our door type our entrance. Now we want to create our game object.

So let's make a new variable. Do const. We'll do door. We're going to set equal to this our scene our physics and we'll do add. And now we want to do our image game object.

Image game object. So now we want to use our X and our Y for our current door for our current door position. Now we want to do our asset keys and we want to do our dungeon objects. And then we'll need to provide the frame name of the door we want to create. So we're just going to make a new variable for this.

So we'll do frame name. So now for this object when our player collides with it, we don't want it to be movable. So we need to call set immovable. We want it to be true. And then finally, we're going to call set name.

And for our name, we're going to use the ID of our door. So we're going to do our config, our ID, and we'll do two two string. Now it's safe. And now we just need to make a variable for our frame name. So we'll do const, we'll do frame name.

We're going to set that equal to we want to do our door, our frame keys. And now from our frame keys, we want to reference our door reference our door type. Then we'll do an underscore. And now the direction of our door. for our door game object, the reason we're setting our name to the ID of our door is we want to do logic similar to what we did for our door transition zone.

So, for our locked doors, if our player has any keys in their inventory, we want to be able to automatically unlock that door and open it up. And so, when our player's body collides with that game object, that's when we'll do that check and then open up our door. Over in our browser, we'll see our new door game object is being added to our level, but our position is not quite right. To fix this, we'll need to update the origin on our door. To fix this, we'll need to update the origin on our door.

And so for our origin, this is going to be different depending on which direction our door is currently facing in our game. To add in that change, let's add in our switch statement. So we'll switch on the direction of our door. Now we want to add in our various cases. So we'll have case.

So we'll have direction direction up. So now we want to do our door. We want to call set origin. For our origin, we'll do zero for our X and then 0. 5 for our Y.

Then we'll do our break. So now if we save, we'll see our door has been updated to be in the correct location. now we just need to do our other direction. So let's copy this. We'll paste it three paste it three times.

We'll have our direction down. Our X value, we'll do zero. We'll do 0. 75 for our Y. Now for left, we want to do 0.

25 for our X. And we want to do one for our for our Y. Now for right, we want to do 0. 5 for our X and we want to do one for our Y. Finally, let's just add in our default statement and we'll do our exhaustive guard and we'll do this our direction.

Now, inside our switch statement, we just need to update our door object property on our class to be assigned to our door. So, we're going to do this. Our door object will be equal to our door. to our door. So, real quick, the reason we need to update our door's origin to be different based on our direction was due to how we created our game objects in tiled.

So, when we add in our objects in tiled, when we have our X and Y value, that's going to be our bottom lefthand corner of our rectangle here. So, now depending on our door's direction, that corner is going to be at different spots on our door. When we go to add in our game object in Phaser, the default origin for our game object is the center. So when we added our game object to the top, that's why our door was over here to the side. Uh so as an example, if we comment out our code here, we'll see the center of our game object lines up with the bottom of our door game object here.

So to fix it, we need to update our X origin to be zero. So that way it's all the way to the far left of our frame. And then for our Y, we want to keep at 0. 5 since it's in the right position. Now for our other direction, left and right, I'm going to comment those out real quick.

And if we move over one room in our game, we'll see for our left and right door, our door game object is being placed based on that bottom lefthand corner of that game object. So if we look at our frames, we'll see for our doors that are facing to our left, our our positioning is going to be in the center. And so we have our center of our door matching that corner. So in order to fix that, we need to update our X and Y value to get our door in the correct location. Next, for our class, we need to enhance our disable enable object methods for our door class.

Since this consists of multiple phaser game objects, we want to make sure we disable both of those or enable both of those when these methods are called. So, we'll start in our disable object method. After we disable our door transition, we'll add in a check to see if our door object is defined. So, we'll do if this our door object does not equal object does not equal undefined, we'll want to disable that game object. So, we're going to do this our door object.

We'll do our body. We'll do enable. We're set equal to false. And now we just want to update our active and visible properties. And I'm just going to copy this here.

We'll paste it. Let's get rid of body. Now, we'll do active. We're set to false. And copy that.

We'll paste it. And now we want to do visible. We'll set that to false. Now, down in our enable object method, now we just want to do the inverse. So, let's copy this code here.

Let's paste it. So, we'll want to enable our physics body, make our game object active, and make it visible. One last change we'll need to make to our enable object method is if our door is one of our door types where it's locked, once we unlock that door, we won't want to show this game object again to our player. So, we're just going to add a safeguard here where if our door is unlocked, we'll return early. So, we'll do if this is unlocked, then we'll return.

Finally, for our door class, now we just need to add a method that will allow us to open up our doors in our dungeon. So, either our player uses a key on the door or if we complete one of our traps, this will allow our door to open. Let's add a new public method. We're going to call this open. We won't return anything from our method.

So now in our method, we're going to want to check our door type. And if it's a locked door or our boss door, then we want to update our is unlocked property to be true. So we never lock that door again. So we're going to do if this our door type is equal to our door type lock or our door type is equal to our boss door. Now we'll update our door.

Now we'll update our property. And if it's not one of those doors, now we just want to reenable our object. Finally, now we just need to disable our door object and make it not visible to our player. For that, we're going to reuse our disable object method, but we want to skip where we disable our door transition. That way, our player can move to our next room.

To add in that support, we'll add in a new argument. We're going to call this disable door trigger. So, we're going to call this disable door call this disable door trigger. And we'll add in a default value. And we'll set it to be true.

And now we're going to wrap this. And we'll say if disabled door trigger, if it's set to true, then we'll do our logic here. So now down in our open method, we can call this. We'll do disable object. And now we'll pass in false for our disabled door our disabled door trigger.

With that last change, that wraps up our code for our door class. Let's jump back over to our game scene. now when we create our door, in order to allow our player to collide with our new game object, we need to add that to our blocking group. So to end that change, let's do if we'll do our door our door object. If it's equal to undefined, we'll return early.

If our door object is not undefined, now we'll add it to our blocking group. So we'll do this. We'll do our blocking group. We'll do add, and we'll do our door, and we'll do our door object. All right.

So if we save, when our browser refreshes, if we go up to our boss door, our player can no longer move through it. If we move to our next room in our dungeon now, after our trap door shows up, our player shouldn't be able to move through it. And when our player goes up to our locked door, they can't move through that one either. The last change we'll make for our doors is we're going to add a new group to keep track of all of our locked doors. For our locked doors, we want to be able to have a special collision check.

So, once our player collides with that door, we'll check to see if our player has the appropriate key, and if they do, we'll open up that door. By adding this to its own group, we'll be able to have that custom collision check and run that separately from our collision check when our player collides with our blocking group. To add in that change, let's go to the top of our class. After our current room ID, we'll add a new property. We'll do lock door group.

For our type, we'll do our phaser, our game objects, and then our group. So, now we'll go down to our create level create level method. After we create our blocking group, we'll do this. We'll do our lock door group. We're going to set that equal to this add.

G groupoup. We'll pass in an empty array. Now let's come back down to our create doors method. And after our check to see if our door object is undefined, now we'll check our door type. And if it's one of our locked doors, we'll add that game object to that group.

So we're going to do if our door if our door door if our door type is equal to our door type lock or if it's our boss door. Now we'll add that game object to our group. So we'll do this. We'll do our lock door group. We'll do add.

And we'll do our door and our door object. And then finally, we'll return early from our loop. And so the reason we're returning early is for our door object, we only want to add this to one of our two groups. For both of these groups, we're going to have a collision check to prevent our player from moving through it. But for our locking door group, that's where we'll have our additional check to see if we can unlock that door.

For our trap door type, we don't need to do that check for unlocking our door. And so, we can just rely on our blocking group to prevent our player from moving through it. And for the time being, we're not going to add in that collision check. And we'll add in that logic once we get into our dungeon mechanics. And we want to be able to unlock our door.

Now that we finished dynamically creating our doors, it's time for us to move on to our buttons or our switches for our game. for our dungeon, we're going to have two different button types. One is going to be a switch that will be hidden under our pots. and when the player steps on them, this will either trigger revealing a chest in our room or opening one of our locked doors. Our second type will be a floor pressure plate where when our player steps on that tile, that will do the same thing where it might reveal a chest or open a door.

To get started these changes, we need to make a new class. So, if we go into our source folder, if we go into our game objects under objects, we'll make a new file. We'll call this We'll call this button. ts. And now for our class, let's open up our pot class.

We'll copy all of our logic from here. We'll paste that over to button. We'll update our class name. We're going to call this button. Now for our class, we won't extend the arcade sprite.

Instead, we're just going to do an image game object since we won't have any animations tied to our button. So now for the properties on our class, we'll need to know our target ids of our switch. So when we unlock a door or reveal a chest, we'll need to know the ID of that object. Uh so we'll call this switch target this switch target ids. This will be a number array.

Then for our second property, we'll need to know what our buttons doing. And so this is going to be the action it's going to take. So we're going to call this switch this switch action. Now for our type, this will be our switch action. So now down in our constructor, we'll update our configuration.

So this won't be our tiled pot game object. This will be our tiled switch object. Now for our assets, we'll want to use our dungeon objects. And now for our frame, depending on our switch type, we'll have a different frame. So for that, let's replace our zero.

We'll make a new variable. We're going to call this frame. Now, we'll do con frame. We're going to set it equal to our config. And then our texture.

And if our texture equals our switch texture, our texture, our floor, then we'll want to use our button frame keys, we'll want to use our floor switch. Otherwise, we'll do our button frame keys, and we'll do our plate switch. So, now for our game object, we'll want to enable physics so we can check for collisions between our player and our game object. We don't want it to be movable. We won't need to keep track of the original position.

So, we can remove that code. And now we can get rid of our custom components that we added. Now, we just need to update the properties in our class. So, we'll do this. We'll do our switch target ids.

We're set equal to our config. Our target ids. Now, we'll do our switch action will be equal to our config and then our then our action. So, for our class, we'll want to implement our custom game object. So, we'll have our disable and enable object methods.

So, we'll have our disable and our enable object methods. For those, we don't need to make any code changes. And then we can get rid of our public break method from our class. Finally, for our class, now we just need to add in a method for when our player presses one of our buttons. So, we'll make this a public method.

We'll call this press. And then for our return type, we need to return an object that has our action that our button is doing, either revealing our chest or opening a door, and the target IDs of those objects we're targeting. For this, we'll make a new type. We're going to call this button pressed button pressed event. So we'll return an object.

Our first property will be our action. So this will be our switch action. And now we'll do our target we'll do our target ids. And we'll do this and our switch target ids. Let's define that type at the top of our class.

And so we'll do type our button pressed event. And so for our action, this this will be our switch action. Then we'll have our target ids. And then our target IDs will be a number be a number array. Finally, when we press our button, we'll want to disable our object.

So, we hide it from our scene. we're going to call this and we'll do disable object. Now that we have our new button class, we can update our game scene to use it. So, we come over to our game scene. Let's go down to our create buttons method.

So, in our method, let's get rid of our console log statements and our to-do. Then, we'll come down to our pot class. Let's copy our loop for our for each. We'll paste that here. We'll update our variable name.

We'll call this button. Let's reference our button class. And now for our objects by room ID. We want to reference our switches. And we'll push in our button instance.

And then we don't want to add this game object to our blocking group. Instead, we want to have our player overlap with that game object. And then we'll press our button. For this change, we'll add a new group to our class. So let's come up to the top of our game scene.

Let's copy our logic here for our locked door group. Now for our property name, we'll call this switch group. And this will be our phaser game objects group. Let's go to our create level method. Let's copy our line here for our lock door group.

And then we'll do our switch group. Now, if we come back down to where we create our switches, we want to reference our switch group. And we'll add in an instance of our button. All right. So, we save, come back over to our browser, we should be able to test our changes.

If we move into our next room, we'll see we have four new image game objects added to our level. So these are our floor plate. So these are our floor switches that we need to have our player overlap with to press. To add in that logic, we'll need to add in a new overlap check between our player and those game objects. So if we go into our register colliders method, let's copy our logic where we do our overlap between our player and our door transition group.

Let's paste that in. Now we want to do our switch group. And now we'll want to call a new method on our class. We're going to call this handle button press. handle button press.

Instead of doing our door object, we'll do our switch object. And we'll pass that as an argument to our method. And now let's just update our type. And this will be our button. Let's copy our method name.

We'll come down to the bottom of our class. Let's paste that in. We'll add in our argument. So we'll have our have our button. We won't return anything from our method.

And for the time being, we should do console. log. And we'll do our button. So now if we save, let's come back to our browser. We have our player go into our room.

Now, if our player steps on one of our switches, we'll see right away we start logging our information about our button. And if we want to test our other button types, let's go into our preload scene. We'll update our starting room ID. So, let's start off in room five. We'll want to update our door ID to be one.

So, now when our browser refreshes, our player should be in our fifth room. We should see our button for our floor. And now, if we come over to our pot, if we pick it up, we should see our other button type for revealing our chest. All right, so back in our preload scene, let's revert our change. And we'll go back to our starting room of three.

Now that we've set up our various level objects like pots, chests, doors, and enemies using our tile data, it's time to take our dungeon to the next level. In this section, we'll be focusing on dungeon mechanics. Things traps, inventory management, locked doors, and how chests interact with our players progress. These mechanics will add depth to our gameplay, making the dungeon feel more interactive and engaging. Let's jump in and start bringing our dungeon to life.

For our dungeon mechanics, we'll start off with our traps. For our traps, we have two main types. One is tied to our buttons or our switches. So, when our player presses one of these, this could reveal a chest or unlock one of our trap doors. The second is tied to us defeating all the enemies in a room.

So, when we defeat all the enemies in the room, this could also reveal a chest or open a door. To get us started, we'll focus on our buttons and continue from where we left off when we added our buttons to our game scene. So, let's jump over to our game scene. To start, first we're going to update our property for our switches on our objects by room ID field on our class. Currently, we have this set to unknown.

And now that we have our button class, let's add in our type for our button. Now, if we come down to the bottom of our class, we have our method for handling when you press one of our buttons. So, when we call our handle button press method, first we'll want to call our press method on our button. And the results we get back, we'll want to take a look at the action type. And depending on that, we'll do different things in our code.

And the results we get back, we'll want to take a look at our action. If our action is to open a door, we'll need to find that door by its ID and open it. And if it's reveal a chest, we'll need to find our chest by its ID and then reveal it. To add these changes, let's get rid of our console log. First, we'll call our button press method.

And we want to store this in a variable. So, we'll do const. We'll do button press data. button press data. We're going to set that equal to our button and we'll call the press method.

All right. So once we have our button press data first, we're going to make sure we actually have a target ID for the action. And if we don't have any IDs, we won't do anything. And we'll also check our action type. So for our switches, we have some floor switches in our dungeon that won't actually do anything.

And our player needs to figure out what switch they actually need to press. So if our type is set to nothing, we don't need to do anything else in our code. So let's do if our button press data if our target ids if our length of our list is equal to zero we don't want to do anything or if our button press data if our action is equal to our switch action nothing we can return early. So if we don't return early now we want to check our action type. So let's do let's do switch.

We'll have our button press data. We'll have our action. Now we'll add in our cases. So let's do our switch action type. We'll do open door for now.

We'll just do break. Let's copy this and we'll do our other we'll do our other types. So now we'll do reveal chest. Then we'll do reveal key. And then we'll have our default statement.

So let's just replace this with default. And for our default statement, we'll call our exhaustive guard. So we'll pass in our button press data and then our action. So now in our switch statement, let's start off by handling our open door case. We'll want to take our button press data.

We'll want to grab our target IDs. And for each of our IDs, we'll want to find the relevant door and open that door open that door up. So, we need to reference our objects by room ID. We want to grab the room ID we're currently in. Now, we want to reference our door map.

Then, we want to use our ID from our target ID's array. And then, we want to call open on that door. Now, for revealing our chest, we'll want to take a similar approach, but now we want to reference our chest map and call reveal. So, we want to copy this line of code. Let's paste it.

Now, we want to grab our chest map. Instead of calling open, we want to reveal our chest. So, now if we want to test our changes, let's come back over to our browser. Let's go into our next dungeon room. Now, we'll have our player step on our various switches.

So, if we do the bottom left, there should be nothing that happens. If we do our top right, that should reveal our chest in our room. Our top left should do nothing. And then our bottom right should open up our door that was our trap door. And just to make sure everything's working properly, we're going to test out another room.

So if we go into our preload scene, let's update our room ID. We'll go into room ID 5. We'll update our door ID to be one. So now when our browser refreshes, if we have our player step on our switch, it should open up both of our doors. Now if we come down to our pot game object, we'll see we have an issue where once our player overlaps with our trigger, we're revealing our chest.

But we actually don't want to do that until we step on our pressure plate. So to fix that, we'll need to update our register collision logic in our game scene. So if we go to our register colliders method, we'll want to move our code for where we check to see if our player overlaps with one of our button presses. And we want to do that after we do our collision check between our player and our blocking group. So now if we make that change, if we have a player come down to our pot, we'll see now our chest no longer shows up.

But if we pick up our pot game object, we'll see now we have our button. And if our player overlaps with it, now our chest is revealed. Nice. All right. So, back in our preload scene, let's reset our change for our room ID and our door room ID and our door ID.

For our trap dungeon mechanic, we'll next focus on our traps that are tied to when our enemies are defeated in our room. To support this, we'll emit an event every time we defeat an enemy in one of our rooms. And then in our game scene, we can listen for this event. When we get this event, we'll grab our enemy group tied to the room our player's currently in, and we'll make sure all the enemies are defeated for that room. And so, we'll want to structure our code in a way where we can reuse the same method for when our player enters into one of our rooms.

And as an example, we currently have our trap type of revealing our doors once we defeat all of our enemies in our room. for our dungeon. After our player defeats all of the relevant enemies in our room, we don't want to respawn them until our player dies or we leave our dungeon. Due to that, once our player enters in one of our rooms, if our door should already be opened, we'll want to trigger that from our reveal logic. To get started with our changes, let's open up our event bus.

Currently, we have our custom event for when we open up one of our chests. We're going to extend this object to have two new events. one for when our player's defeated and one for every time we destroy an enemy. So we'll add an enemy add an enemy destroyed and then we'll do player defeated. So now to emit these events, we'll want to do this from our death state.

So if we jump over to our death state, let's come down to our trigger defeated event method. So once our player or enemy takes enough damage, we'll play our animation for having that game object be destroyed and we'll disable it from our scene. And this will also be our spot where we emit these events. So after we disable our game object, before we call our call back, let's send out our event. So we're just going to check our game object type if it's an enemy or if it's our player.

And we'll emit the relevant event. So we'll do if this if our game object is our enemy, we'll do our event bus. We'll do our emit. And we want to do our custom events. And we'll do our enemy destroyed.

If it's not our enemy, then it's our player. Now we can submit the other event that we other event that we created. So we'll do player defeated. Now that we're sending out our event, we need to update our game scene to listen for this event. To listen for our events, let's go to our register custom events events method and our method.

We'll listen for our new event. So let's copy our line of code here. We'll update our event we want to listen for. We'll have our enemy destroyed. And now we'll tie this to a new method.

And we'll call this check for all enemies are defeated. And so now we want to turn off our event listener if our scene shuts down. So let's copy that line. We'll paste it. We're going to change this to off.

Let's copy our method name. We want to add that to our class. So let's come down to the bottom of our file. Add in our new private method. And now for our method, we won't receive any arguments.

And now we'll want to grab the relevant enemy group tied to the room our player's currently in. So we'll store that in a variable. So const. We'll do our enemy group. It's going be equal to this.

Our objects by room ID, our current room ID, now we want to grab our enemy group. So then once we have our enemy group, now we want to iterate through all of our child game objects. And we'll want to make sure either that object is one of our wisp enemies or if it's another enemy type, we want to make sure they're no longer active. As long as all of our child game objects meet that criteria, then we'll know all of our enemies for our current room are defeated. So to do that check, first we'll add a safeguard to make sure our enemy group is defined.

So we'll do if our enemy group if it's undefined we can just return early otherwise we'll make a new var we'll do const we'll do all required enemies defeated for this we'll set equal to our enemy group we'll do get enemy group we'll do get children and we call every and now we have our child game have our child game object first we'll check to see if our child's not active so if our child game object so we'll do if not our child game object is active then we can return true. If the child game object is active now we'll check its type. So we'll do if our child is an instance of our wisp class then we can return true. And then finally if neither of those are true we'll return false. So now with our logic here we'll make sure all of our child enemy game objects for our current room are either not active or they're wisp enemies.

As long as it's all true, now we can do our check to see if we need to reveal our trap doors or our trap chest. So for that, let's do an if statement. We'll do if all of our required enemies are defeated. If all of our enemies are defeated, now we'll call a new method to do that logic for revealing our chest and our doors. And for this new method, we're going to call it handle all enemies defeated.

So we'll do this handle all enemies do this handle all enemies defeated. Let's copy that method name. And we'll add that method below this one. for our method. We won't have any arguments and we won't return anything.

Now we'll want to grab all of our chest game objects for our current room. And if our reveal trigger is our trap type of enemies defeated, we'll reveal our chests. And we'll do the same thing for our doors. So to grab those objects, we'll do this. We'll do our objects by room ID.

We want to grab our current room ID. Now we want to grab our chest. We'll do for each. Now we'll have our chest game chest game object. Now we'll check our types.

We'll do if our chest, our reveal trigger is equal to our trap type of enemies defeated. Now we want to reveal our chest. So we'll do chest. We'll do reveal. Let's copy this block of code.

We'll do the same thing for our doors. now we'll have our doors array for each of our door game each of our door game objects. We want to reference our trap door trigger. And if it's our trap type enemies defeated, now we want to do door and we want to call our open method. Finally, for our enemies defeated logic, we also want to invoke our method where we do our check when our player enters into one of our rooms.

So let's come up to our handle room transition method and in our onmplete handler once we animate our player back into our room after we update our current room ID, this is where we'll do our check. So we'll do this. We'll do check for all enemies are defeated and let's save. So now if we want to test our changes, we'll want to update our player's position to be in a room with one of our trap types. So let's open up our preload scene.

Let's update our room ID. Let's go to room six. We'll update our door ID to be one. And let's open up our config and let's update our enemy's health and we're going to set it to one. And to make sure our player doesn't die, let's bump up our player's health.

So let's do our player's max health. We're going to set this to 20. So now if we want to test our changes, let's refresh our browser. in this particular room, we have a chest that should be revealed once all of our enemies are defeated. So, if we have our player come up to the top of our scene, we should see our chest body, but our chest should not be visible.

Let's have our player run into our other remaining remaining spiders. So, now if we come up to the top of our scene, we should see our chess game object has now been revealed and our player can interact with it. And now to do our test for our door, if we come back to our preload scene, let's update our room ID. We want to go to room two and we'll go to our door ID of one. All right.

So now in this room, once all of our enemies are defeated, we should open up both of our trap doors. Nice. All right. So let's revert our changes to our preload scene. So let's go back to our room ID of three, our door ID of three, come back to our config.

We'll reset our player's health, and we'll reset our spider's health. For our next dungeon mechanic, we'll focus on our inventory manager. Our inventory manager is going to be responsible for keeping track of all of the items our player has collected in our game. So, this will include things our general items and weapons, like our sword, and it'll have details about each of our areas that our player is in and which items they have collected. As an example, for our dungeon our player is currently in, we'll want to keep track of our items our players collected for that dungeon.

So, as our player navigates our dungeon, opens up our chest, they'll be able to collect things our boss key, our map, our compass, and even small keys that we'll use for unlocking our doors. So, for our inventory manager class, we're going to need to have methods to retrieve our inventory for particular area. And we'll need to have a way to update that data as our player collects these items. We'll then be able to take our inventory manager class and tie it to our other classes in our game. So, we can do things like in our chest class, before we can open up our boss chest, we want to make sure our player has that boss key.

Same thing when our player goes to interact with our locked doors or our boss door, we can make sure they have the required item in their inventory. Later on, this could be extended to populate a game scene to show off our inventory that our player actually has. To start building out our inventory manager, let's go into our code. We'll go into our source folder. Under our components, we'll make a new folder.

We're going to call this inventory. Let's make a new file. We're going to call this inventory call this inventory manager. Let's export out our class. So, we'll export class.

We'll do inventory manager. So, for inventory manager class, we'll want this to be a singleton. What this means is we just only want to create one instance of our inventory manager. And anytime we try to get a reference to it, we want to return that instance of it. For our game, we only need one instance of our inventory manager since it's keeping track of all of our information for all of our game objects.

This is different than our game objects for like our enemies where we want to create multiple instances of those game objects. And for our inventory manager, we'll want to be able to reference this from multiple locations in our code. Uh, as an example, we need to reference this class from our game scene, from our chest class, and from our door. And then later on when we add in our UI elements, they'll also need to reference our inventory manager. And so to support our class being a singleton, one of the ways we can do this is we can add a static method to our class.

And anytime we want to get an instance of our class, we need to call this static method. And that static method will keep track of our class to see if it's already been created. And if it has, we'll return that instance. And if it's not been created, then we'll create that instance at that time. And for this to work, we want to make sure our constructor is not public.

That way, we won't be able to create new instances of our inventory manager from outside our class. So to add in this logic, we'll need to keep track of the instance that we create. So we'll use the static keyword to keep this consistent across all of our inventory managers. And so now we're going to call this instance. For our type, we want this to be our inventory manager.

Now we'll add our constructor. we'll want to make this private. For the time being, we won't add any code. And now for this to work as our singleton, we need to add in that static method for getting our instance. So let's do public.

We'll do static. Let's do get. And we want to do instance. This will return our inventory manager. And now inside here, this is will do our check where if we don't have our instance, we need to create an instance of our inventory manager.

So we're going do if not our inventory manager. Our instance. So if it doesn't exist now, we want to do inventory manager. Our instance is going to be equal to a new instance of our inventory manager. And now inside that block, we'll return that instance.

So we return our inventory manager and we'll return our instance. now see an example of how this will work. Let's add a console log line to our constructor and we'll just say created created inventory. Now we need to grab a reference to our inventory manager. So let's go over to our game scene.

We'll go into our init method and at the bottom let's reference our inventory manager. And now to get an instance, we want to reference our instance property. And I'm just going to do a console. log. And now if we copy this line of code and now let's open up our chest class.

And so from our chest class, let's go to the bottom of our constructor and our chest class. We'll paste it. Let's update our import to have our inventory manager. So once we save and our browser refreshes, we'll see we're only creating our inventory manager one time, even though we're referencing our instance in multiple locations. So for each of our chess game objects that gets created, we're referencing our inventory manager.

But because we already created our instance, we skip our constructor and we return that same instance of our class. So right now this doesn't look like much, but once we add in our properties to keep track of our inventory and we start using this, we'll see how powerful this is. So, for the time being, I'm just going to clean up our console log statements from our game scene and our chest class. We'll jump back over to our inventory manager and let's get rid of our console log statement from our constructor. Now, in our inventory manager class, let's start off by defining our types that'll represent our inventory.

So, we'll do export type. We'll do we'll call this inventory data. We're going to set that equal to an object. And on this object, we're going to have two properties. One will be tied to our general inventory.

So for things like our sword or our money or our heart pieces that our player can collect. And our second one will be tied to our area specific items. So like when we're in a dungeon and we collect the boss key for that dungeon, we'll want to know we collected that for dungeon one but not dungeon two. So we'll add in two properties. First we're going to call this general.

For this we'll add a new type. We're going to call it item inventory. And now for our second property we're going to call this area. And this is going to be an object. And on this object, our key is going to be one of our level names.

We'll do key in our level name type. And for our value, we're going to make a new type. We're going to call this area going to call this area inventory. So now we'll add in these two types. So let's do type.

We'll do our area inventory. This is going to be an object. Now for our area inventory, this will be tied to like our dungeon. And so this will have things like our map, our compass, and for each of our types, we're going to make this a boolean to show if we collect that item or not. We'll add in map.

This will be a boolean. Let's do our compass and our boss boss key. Then finally, we'll add in keys. And for this type, we'll have this be a number. And it'll keep track of all the little keys we collect.

Now, for our second type, we'll have our item inventory. This will be an object. And this will be an object of our various items we can collect and we want to keep track of. And so, we'll have our sword and we'll have this be a boolean. Now that we have our new types, we'll add these as properties on our class.

So after we have our static instance, we'll do a private property. We'll call this general We'll call this general inventory. For our type, this will be our item inventory. And now we'll have our area our area inventory. And for our type, let's copy our type up here from our inventory data.

And now down our constructor, let's assign our properties. And so we'll start off with our general inventory. We'll set that equal to our object. All right, let's add in our sword property. And we'll set this to be true by default.

Uh, so for our game, we'll have our player start with our sword and their inventory so they'll be able to attack our enemies in our dungeon. Now, let's do our area inventory. For this, we'll want to add in our properties for our dungeon in our world. And so, we'll do our dungeon one. This will be an object.

And we'll want to set our map, our boss key, and our compass to be false since we've not collected these yet. Finally, we'll have our keys, and we'll set that to be zero. Let's copy that object for dungeon one. We'll paste it. And now we'll update this to be our world.

And now let's save. Now that we've added our properties to our class, we can work on adding our getters and setters and methods to allow us to retrieve and modify our properties. So at the bottom of our class, let's start with our getter. And so we do get, we'll do data. For our data, we'll return our inventory data.

So now we want to return for general, we'll return a copy of our properties. So we'll do this our general inventory. We want to do our area. We'll do the same thing. So we'll copy this our area inventory.

So then we want to do our setter. So we'll do set data. We'll have our argument will be data for our type. This will be our inventory data. And now we'll do this.

Our area inventory will be equal to a copy of our data and our area. Now we'll do the same thing for our general inventory. And we'll just copy our data. and then general. So now for our public methods, we'll need a way to update our inventory and add items to it as we collect them or as we use our keys.

We want to remove those keys from our inventory. We'll also add in a public method to easily retrieve our area inventory for a given level. To add these methods, we'll start with our method for adding an item to our inventory. And so we're going to do public. We'll do add dungeon item.

For arguments, we'll need to know which level we're currently in. And so we'll have our level name. Then we'll need to know which item we want to add to our inventory. So we'll call this dungeon item. And we'll make a new type for this.

We'll call this dungeon item. For our return type, we'll do void. All right. So now we need to define our dungeon item type. So let's go into our common file.

The bottom of the file. We'll make a new object. So I'm going to copy our level name here. We're going to paste this. We'll update our object.

We're going to call this dungeon item. dungeon item. So now on our object, this will be our items we can collect in our dungeon. So now on this object, this is going to be the items we can collect in our dungeon. first we'll have our small key, then we'll have our boss we'll have our boss key, and then we'll have our map, and then finally our then finally our compass.

So now we'll want to define a type for this. So if we go into our common, and then our types. ts file, let's copy our export type here for our level name. I'm going to call this dungeon item. And now we'll do key of type of our dungeon item.

So if we jump back to our inventory manager, let's update our import to have our dungeon item. So now in our method, we can add a switch statement to go over our various dungeon item types. And then we'll update our area inventory for the area that was provided. And we'll set the relevant property. So we're going to do switch.

We'll have our dungeon item. We'll have our case. We'll do our dungeon item. We'll start off with our map. map.

Let's add in our return statement. And now we'll do our other types. So let's copy this. We're going to paste it three more times. So now we'll have our compass, our boss key, and then we'll have our small keys.

Finally, we'll have our default block and we'll do our exhaustive guard, and we'll do our dungeon item. So now, when we collect our dungeon map, we'll reference our area inventory. We want to pass in our area that was provided. And now for our map, we'd set that to be true. Let's copy that line of code and we'll do the same thing for our compass and our boss key.

So we'll update our reference. We'll have compass, we'll have boss key. Now for our small keys, we'll use our keys property and then we're going to increment this by one since we collected a new a new key. Next, we'll add in our method for getting our area inventory. So we're going to do public.

We'll do get area inventory. Now in this method, we'll provide our area, which will be one of our level names. And now we'll return our area inventory. So now we'll do return and we want to copy our area inventory and then the area we provided. Finally, we'll add in our public method for using one of our small keys.

And so do public. We'll do use area small key. So we'll need to know which area we're using our key from. So we'll have our level name. We won't return anything from our method.

And now we'll just do a check to make sure we have more than one key. So we'll do if our area inventory our area we provided our keys property if it's greater than zero now we can decrement it by one just want to copy this here paste it we'll do minus equals 1 with that last change that now wraps up our inventory manager and now we can start connecting this to our game scene and our chest class to keep track of our items that we're collecting. Now, to start using our inventory manager in our game, we're going to make some updates to our game scene. Currently, in our game scene and our handled open chest method, all we're doing is we're logging a message to our console. Once our player interacts with one of our chest, we'll want to check what type of reward our player just got, and we'll add that item type to our inventory manager.

For our game, we're also going to show an image game object representing the item the player just received from our chest. Later on, we'll be able to connect this to our UI, and we'll be able to show a message about the item our player just received. To start making our changes, first we'll create an image game object to represent our reward that we're going to show to our player. For this image game object, we're going to make it reusable. So, let's go to the top of our class, and we'll create a new property to keep track of this object.

After our switch group, we'll add a new property. We're going to call this reward item. This will be our phaser, our game objects, and it's going to be an image game object. game object. Now down our constructor after we set up our camera, let's create our game object.

So we're going to do this. We're going to do our reward going to do our reward item. Now to create our game object, we'll do this. We'll do add. We'll do an image.

And now for our arguments, for our position, we're going to do 00. And then we're going to use a default texture. We'll do our asset keys. Let's do our UI icons. And we'll do zero for our frame.

And now since we're creating our game object right when our scene first starts, we'll want to hide it by default. And so we'll do set visible. Let's do false. And finally, we're going to update our origin. And so do set origin.

And we'll do zero and then one. Now that we have our new reward item, let's come down to our handle open chest method. Let's get rid of our console log and our and our to-do. So in our method, first we'll start off by showing our reward to our player. So we're going to do this.

We're going to reference our reward item. We'll do set frame. Now for our frame, we're going to use our chest reward to texture frame. Then we want to do our chest and then our chest and then our contents. Now we want to make our game object visible.

So we'll do set visible. We're going to set this to be true. Now we want to update our position. And so we're going to use our chest X and Y value to set our X and Y on our game object. And so our chest reward to texture frame.

This is just an object that is a map between our chest rewards to our frame of our sprite sheet we'll be using to show our items uh to our player. Uh, so as an example, if our chest contents, if our reward is our boss key, we're going to use frame 121 from our sprite sheet to show that image to our to our player. All right, so now if we want to test our changes, let's go over one room in our dungeon. Let's trigger our trap to spawn our chest. And now, if we come over to our chest, let's try opening it up.

And we'll see now our new image game object shows up with our key. So now, if we go over one more room, we have two other chests. Let's spawn our second chest. and we'll try opening both of them. So now if we open our far right chest, we should see our map.

And now if we open up our next one, we should see our compass. So we can see our logic for reusing our game object is working. And now we just want to update our game object to hide after so many milliseconds. All right, so we can see our logic for reusing our game object is working. Now we just need to update our code to hide our game object after a few seconds.

And now we also want to add our item to our inventory. So now to add our item to our inventory before we show our reward item game object, let's do our inventory manager. We're going to do our instance. We're going to do add dungeon item. Now we want to reference our level data.

We want to grab our current level. Now we want to pass in our chest contents. Right. So currently for our chest, one of our reward types is nothing. And when our chest has nothing inside it, we don't actually need to update our inventory manager.

So we're just going to wrap this in an if statement. So, we're going to do if our chest our contents does not equal chest reward, then nothing, then we'll run this logic here. Finally, now we just want to hide our game object after we show it to our player. For this, we're going to use a tween, and we're going to have our game object appear in our chest and then animate upwards like our player's lifting it up. To do this, after we show our reward item, let's do this.

We're going to do a tween. Let's do add. And now for our configuration for our target, we'll do our reward our reward item. And so for our property, let's do our Y property. We're going to increment our Y-value.

And so we'll do our reward item, our Y value, and we'll do minus 16 to move it up in our scene. Our duration, we'll do 500 milliseconds. And we'll do onmplete. So once our tween animation is done, this is where we'd want to show our UI with our information about the item our player just got. For the time being, we're going to assimulate this with a delayed call where we'll wait a second before we have our item disappear.

So we're going to do this. We'll do our time. Let's do our delayed call. We're going to do 1 second. And now in our call back from our delayed call, now in our call back for our delayed call, we're going to reference our reward item.

Let's do set visible. We're going to set it to be false. And just to make sure our inventory is being updated properly, we're going to add in a console log. We'll do a console log. We'll do console.

Log. Let's do our inventory manager. Let's do our instance. We want to get our area inventory. And let's do our level.

We want to do our dungeon one. So, back over in our browser. Let's move over one room. Let's spawn our chest. So, after we spawn our chest, let's try to open our chest.

We'll see now our game object shows up. It animates upwards and then disappears. And then we'll see in our inventory, we've updated our keys to show we have one key. Finally, for our inventory manager, our last change we'll make is in our chest class. Currently, in our callback where we check to see if our player can open up one of our chest for our boss chest, we just default to returning false.

We're going to hook this up to our inventory manager so we can grab our area inventory for our current level. And if we have our boss key, then our player will be able to open it. So now to add in that logic, let's jump over to our game scene. We're going to copy our logic here where we grab our inventory manager from our console log statement back in our chest class. Let's do if and we'll say not our inventory manager, our instance.

We'll get our area inventory. We'll grab our level name dungeon one. And if we don't have our boss key now, we want to return false. Otherwise, we'd want to return true. For the time being, we're going to hardcode this to our dungeon one level.

But once we add in our data manager, we actually want to grab our area information from there. That way, this is dynamic. So, we're just going to update our to-do. And so, we'll do to-do. We'll do update to use area information from data manager.

To test our change, let's open up our preload scene. Let's update our room ID. We'll go to room six. We'll update our door ID to be one. On our browser, let's go to our boss chest.

We try to open it up. We're not able to open it. Now come over to our inventory manager. Let's update our default value for our boss key. Let's set this to be true.

All right. So now when our browser refreshes, if our player goes up to our big chest, we should be able to open it. All right. Since we verify our change, let's revert our inventory manager to have our boss key be false. We'll come back to our preload scene and we'll go back to our default starting room.

Now that we've connected our inventory manager to our chest game object, we'll want to do the same thing for our doors. So, for our locked doors, when our player collides with either our boss door or one of our small locked doors, we'll want to check our inventory manager if our player has the appropriate key. And if our player has one of our small keys, we'll unlock our small door. And if they have the boss key, will unlock the boss door. To add in this logic, we're going to add a new collider.

So, when our player collides with our locked door group, we'll do that check. To start adding our code, let's go over to our game scene. Let's go to our register colliders method. And after our logic where we check for our overlap between our player and our switch group, we'll add in this check. let's do this.

We'll do our physics. Let's do add. We'll do a collider. And we'll reference our player. Let's do our lock door group.

And now we'll have for our arguments in our callback, we'll have our player. And we'll have the game object that is our door. object that is our door. And in our callback, we'll need to take our game object our player collided with and we'll need to use that to find our door instance and our objects by room ID from our door map. So currently when our player collides with our door game object, that's not an instance of our door.

Instead, this is a separate game object that our player can collide with. When we created that game object in our door class, one of the things we did is we use the set name property to set the name on our door to the ID of our actual door instance. So, we'll need to take that ID and use that to do our lookup. now back in our game scene, first we'll do const. Let's do our door object.

We're going to set this to our type that we're expecting. And so, we'll do our game object. And we'll do as our phaser, our types, our physics, our arcade. And now do our game object with body. And now that we've typed our door object, we can grab a reference to our door.

So, we'll do con store. We're going to set that equal to this. Our objects by room ID. We're do our current room ID. Now we want to do our door map.

And now we can pass in our door object and we'll use our name property. And now we'll do as door. Now that we have our door instance, we can check our type on our door. And if it's not one of our lock door types, then we can return early. So we'll do if our door our door type does not equal our door type of lock and our door our door type doesn't equal our boss equal our boss door.

Then we want to turn early from our collision check. Otherwise we'll need to check our area inventory to see if we have the appropriate key. So let's do cons. We'll do our area inventory. We're going to set that equal to our inventory manager.

Let's do our instance and we want to do get area inventory. We'll pass in our level data and we'll do our level. So now we'll check our door type and so if our door our door type is equal to our lock type. Now we want to make sure we actually have a small key. And if we do have a small key, we'll want to use it and then open our door.

So now we'll just do if our area inventory if our keys is greater than zero. Now we want to use our key. So we'll go into our inventory manager. We'll do our instance. Let's do use area small key.

We want to pass in our level so we update the right data. And now we'll do our door and we'll call open to open up our door. And then we can return early from our check. If our door type is not our lock type, then it must be our boss door. And so we'll want to check to see if we have our boss key.

And if we don't have our boss key, we can return early. we'll do if not our area inventory our boss key. If we don't have that we'll return. Otherwise we'll call our door and we'll call our open method. All right.

So if we save our changes, we should be able to test our code. Let's come into our boss door. We just want to make sure when we overlap with it, we don't actually open our door. Now if we go over one room, let's try colliding with our locked door. And we'll see our door isn't open.

Now, let's spawn our chest and let's collect our small key from our chest. So, now if we come over to our small lock door, we'll see now it opens up without any issues. Nice. So, now we'll want to do the same thing with our boss key. So, if we jump over to our inventory manager, let's update our default value for our boss key.

We're going to set this to be true. Now, if we come back to our dungeon, let's go up to our boss door. If we collide with it, our boss door now unlocks. Nice. So, now we verified our changes.

Let's revert our change for our boss key and our inventory manager. And let's save. Now that we've wrapped up our inventory manager and we've connected this to our game, our next feature we'll focus on for our dungeon mechanics is being able to respawn certain game objects in our dungeon and then being able to dynamically show or hide our game objects. So, currently in our level, when our player breaks one of our pot game objects, we want to be able to respawn that game object when our player re-enters our room. This is different than like if we defeat an enemy in a different room.

We want that enemy to stay defeated until we leave our dungeon or if our player dies. Besides this, one other change we'll do is we're going to add in logic to dynamically show and hide our game objects when our player enters and leaves a room. By default, when we create our level, we're dynamically creating all of our enemies and our game objects and we're populating our phaser world. Even though we can only see this room of our level, we have our other objects visible and we have our physics running for our enemies. Instead of having those run in the background when our player is not in that room, we're going to make those game objects inactive.

And then only when our player goes to enter that room will we reactivate them. This will help improve the performance for our game as we make our levels larger. To get started with our changes, first we're going to go to all of our various game objects and we're going to disable them by default. To start with our changes, we'll start with our game objects. So, let's open up our pot class.

If we go down to the bottom of our constructor after we add in our components, let's disable our game object by default. We'll do this. We'll do disable object. And now, we'll want to make the same change to all of our other game objects. So, I'm just going to copy this line of code.

We'll go into our door class. Let's add in our code there. Let's go into our chest class. We'll make sure the same thing's there. Go into our button class.

We'll reenable our disable object. And now we'll want to do the same thing to our character game objects. So let's go into our character game object class. We'll go up to our constructor where we have our general configuration. And now we're just going to do a check if we're not the player.

Then we'll disable our game object. So we'll do if not this is player. Then we'll do this. We'll do disable disable object. Finally, one last change will be in our spider class.

In our constructor, we're currently creating a time event. and we're using that to trigger when our spider should start moving. Instead, we'll only want to trigger this timer once our game object is enabled. And so to make that change, we're just going to move this to our enable object method on our spider class. So to do that, we're going to override our method.

So let's do public. We're going to do enable object first. We'll do super. And now we'll do enable object so we can run our logic on our parent class. Now let's copy this logic here.

And then we'll paste it below our enable object. And then one last change we'll do is down in our method for change direction, we're going to have a check to make sure our game object is actually active. So we're going do if not this. If our game object is not active, then we want to return early. So what we're doing here is by default when our spider spawns, we trigger our time event to start having our spider start moving right away.

Instead, we want our game object to be disabled and so not doing anything until our player enters our room. Once our player enters our room, that's going to trigger our enable object method, which will make our game object visible and active in our scene. Once our game object is active, and that's going to trigger our time event just like it did before. And so once we call change direction and so we added the safeguard here. So then that way if our player left our room before our delayed call was invoked, now we'll terminate early and not trigger another time event.

And then when our player comes back into our room, we'll rely on our enable object method to trigger our new call back. We'll rely on our enable object method to trigger our new time event. All right. So if we save our changes, if we come over to our browser, we should see right away that our game objects are no longer visible in our scene. So, in our first room, we no longer see our locked door game object or our pots for our player to interact with.

And if we try moving to one of our other rooms, because we disabled all of our game objects, we're no longer able to do our transition. So, now in our game scene, we'll want to add in logic. So, when our player enters into one of our rooms, we'll want to reenable those game objects so we'll be able to interact with them. So, to add in that logic, let's go to our game scene. We'll come down to the bottom of our class and we're going to add in two methods.

We're going to add in a method to allow us to show all of our game objects by a room ID. And we'll add in a method to hide all of our game objects in a room by its room ID. So we go to the bottom of our class. For our first method, we'll do show objects in room by ID. For our argument, we'll need our room ID.

So this will be a number. We won't return anything from our method. Now I'm going to copy this and we'll make another method. And now this will just be hide objects and room by ID. now in our method, we'll just want to loop through our array of each of our game objects and then call our enable object on that method.

So we'll start with our show objects in room by ID. We'll do this. We'll do our objects by room room ID. We'll use our room ID we passed in. we'll start with our doors.

And now we'll do for each. And so for each of our doors, we just want to call door. And we're going to call enable object. Let's copy this line of code. And now we'll do our switches and our pots and our chest.

And so we'll have our switches. Now for our object, we're just going to call this our button. We'll do our button enable our button enable object. Now we'll do our pots. And so we'll have our pot game object.

We'll do pot enable pot enable object. And now we want to do our chest. So we'll have our chest game object. And we'll do chest enable object. And so now we'll want to do the same thing for our enemies in our room.

And so first we're going to check to make sure we actually have an enemy group for our room. So we'll do if this our objects by room ID. Our room ID we passed in. We'll do our enemy group. If it's it's undefined, then we can return early.

If it's undefined, we'll return early. If it's not undefined, now we want to iterate through our children and then enable those objects. So we'll do four. We'll do con child of this our objects by room ID. We'll do our room ID.

We'll reference our enemy group. And now we'll do get children. So now inside our loop, we'll just do our child. We'll do as our character game character game object. And then we'll do enable object.

So now for our hide objects in room by ID, we just want to do the inverse of this where we just disable our objects. So let's copy all of our logic here. We'll come down here. Let's paste it. Now let's do disable object.

Let's copy that. and we'll just update our our references. And that's save. Now, we just need to update our game scene to use our new methods. We'll start off when our player spawns into our level.

We'll want to show our game objects for our room our player's going to spawn in. let's go up to our create method. Before we call setup player, we'll do this. We'll do show objects in room by ID. Reference this.

We'll do our level data. And now, we want to do our room ID our player's currently in. Now, if we save, we should see when our player spawns, our door object is back in place, and we can see our pot game objects. Now, we'll want to do the same thing when our player goes to transition to a new room, we'll want to despawn our current game objects and then spawn our game objects in our other room. So, if we go to our handle room transition method, so in our method, before we start our transition, we'll want to show our game objects in our next room.

That way, they'll be ready by the time our player transitions into that room. And after our player completes our transition, we'll hide our objects from our previous room. So after we disable our door game object, we'll do this. We'll do show objects in room by ID. We'll do our target door and we'll grab our room ID of that where that door is located.

So now we'll come down to where we complete our we complete our transition. And after we reenable our door game object, now we'll disable our game objects in our previous room. So we'll do this. We'll do our hide objects and room by ID. And we want to use our original door.

And we want to do the room ID of that door. All right. So, if we save, we should be able to test. If we have our player go into our next room, we should see that our enemy game objects are spawned and our doors are spawned. So, now our player is blocked when they try to leave.

If we open up our door and go back through it, we should see that our game objects are still present in our previous room. All right. Finally, for our last change, now we just want to add in logic we can respawn our pot game objects after we break them. So, in our game, if we pick up one of our pod game objects and we break it and we transition to our next room, when we respawn and show our game objects in that room, if we come back to our previous room, we'll see that our pot game object has now respawned in the position of where it broke at instead of being respawned at its original location. To fix that, we're going to add a new method to our pot class that allow us to reset our X and Y value for our game object.

So, at the bottom of our class, let's make a new method. We'll do public. We'll do reset reset position for our method. We won't return anything. And then all we want to do in this method is we just want to update our game object's position.

And then we want to reenable our game object. We'll do this. We'll do set do this. We'll do set position. And now we're going to reference our stored position that we have in our game object.

So we'll do this. position. x and then this. position. x and then this.

Position. y. And now we'll just call enable object to reenable our game object. And now back in our game scene, let's come down to our logic for our show and hiding our game objects in our room. And for our pot, instead of calling enable object, we're just going to call reset to call reset position.

All right, so if we save, we should be able to test our changes. Let's grab our pot game object. If we break it, let's go into our next room. Let's go ahead and come back to our previous room. Now, when we enter our room, our pot respawns, but it starts breaking right away.

And to fix our issue, we'll need to update our origin and our game object. So when our player picks up our game object, we update it origin so we can position our game object above our head. So we're just going to call set origin. And now we want to reset it back to what we had previously. And so we'll do zero for our X and one for our Y.

All right. So if we save, let's grab our game object. Let's break it. We'll move over to our next room. Let's reopen our door.

If we go back into our room, we should see now our game object respawns, but it's not in the right location. So, what's happening here is when we go to spawn our game object, since our two physics bodies are touching, we have our collider. This is updating our positioning on our game object when we try to position in our scene. To avoid this, we could either update our physics body on our game object to be a little bit smaller or space our objects further apart. Or we can just add in a small delay when we go to spawn our game object, which will allow us to avoid our collision check until our next update of our physics loop.

By doing this, it'll allow us to get our game object respawned in the original location. To end that change, we just do this. We'll do our scene. Let's do time. We'll do a delay call.

We'll do 1 millisecond. And now inside our callback, this is where we'll do our logic. So we'll grab these lines of code. Let's paste it in here. We'll save.

Now if we grab our game object, let's break it. We'll go into our next room. Go back to our room. Now our game object should respawn. We no longer have our collision.

And so it goes back in its original location. Nice. All right. Hey, so one last change we'll do for our code is currently we have a bug where if our player is carrying one of our game objects, if they try to go to our next room in our dungeon, what happens is our game object starts colliding with our boundary around our room, our player stays in our state where we're carrying our item. To fix this, once we start a transition to go to our next room, we'll want to drop our item our player's carrying and transition our player back to our idle state.

So to add in this change, let's go into our idle state. After a reset our player's velocity, we'll check to see if our player's currently holding an item. And if they are, we'll go ahead and drop that item. And so this will be the same logic we do in our hurt state. let's jump over there.

Let's grab our block of code where we check to see if we're carrying our item. We'll come back to our idle to our idle state. Let's paste in our code. Let's update our imports. And so now after reset our velocity, we'll see if we're carrying an object.

And if we are, then we'll drop it. So now we just need to update our logic in our game scene to transition our player to our idle state to trigger this logic. And so to do that, we'll need to be able to get a reference to our state machine for our player. To do that, we'll come into our game object class. Let's add a new getter to allow us to retrieve our state machine.

So we'll do get state machine. We'll return our state machine instance. we'll do return this our state machine. Now, if we come to our game scene, let's go to our handle room transition transition method. And then after our checks where we disable our game objects, now we'll want to set our state to our idle state.

We'll do this. We'll do our player. Let's do our state machine. Let's do set state. And we'll do our character states.

Now, we'll do idle. All right. we save, we should test our changes. if we pick up our pot game object, if we try to go to our next room, we'll see right away we drop our game object and break it. And when our player enters our next room, they're now in the right state.

Now that we've built out our core dungeon mechanics like traps, inventory management, and locked doors, it's time to give our players some offensive power. In this section, we'll dive into attacking and weapons, creating a simple combat system that allows our player to strike enemies and interact with the world in new ways. We'll start by implementing a basic attack, introducing a new state for our player, creating components for our weapons, and ensuring everything feels responsive and satisfying. Let's jump in and bring some action to our adventure. To add support to allow our players to attack our enemies, and later on for our boss enemy to attack our player, we'll need to create a new state, and this will be our attack state.

To get to this state for our player, we'll need to add a check in our idle and movement states, where if our player presses our attack key, we'll want to transition to our new state. Once we get to our attack state, we'll need to check which weapon or item our player currently has equipped. And then we'll want to attack with that weapon. And so for each of our weapons our player can equip, they'll have different properties that we'll need to keep track of. We'll create a base interface for our weapons that each weapon will implement.

This is going to keep track of things like the damage that weapon can do, uh, which animations are tied to that weapon, and the physics body that makes up that weapons as they come in different shapes. As an example, our player's sword will swing in front of our player versus something like an arrow, our physics body needs to move across our screen once we shoot our arrow. Since our player can equip a variety of weapons, we'll create a new weapon component that'll be responsible for returning that weapon instance. This component will also return things like our physics body for our weapon, how much damage that weapon can do, and it's also going to be responsible for calling our update method on our weapon instance. That way we don't have to keep track of all these weapons uh from our player player class.

To get started with our changes, first we'll start with our new state. So let's go into our source code under our components, our state machine. Our state's our character. Let's make a new state. We'll call this our attack state.

Let's go into our idle state. We'll copy our code from our idle state over to our attack state. We'll update our class name. So we'll have a tax state. Let's update our state name.

Let's jump over to our character states. We'll add that states. We'll add that in. So now for our code in our on enter method, let's get rid of our animation first. We'll reset our game object's velocity.

And now for the time being, we're just going to transition right back to our idle state. And once we create a new component for our weapon component, we'll come back and update this. So I'm just going to comment this code out. We'll paste in our code for our state machine. Let's go to our idle state.

Now down in our on update method, we'll get rid of our code for our controls. And let's just comment out our code here where we transition to our next state. So now we'll need to update our idle and our movement states to allow us to transition to the state. So let's go into our idle state. So after we grab a reference to our controls, we'll want to check to see if our attack key was pressed.

If it was, we'll go to our new state. So we'll do if our controls is our attack key just down. Then we want to transition to our attack state. So let's copy this. We'll update our reference.

And then we'll return early. And then if our attack key is not pressed, we'll check to see if we have our other input and go to our movement state. So let's copy this block of code here. Let's go into our move state. Now for our move state, we'll do the same check.

And now finally, we just need to update our player class to have our new state. So let's open up our player class. We'll go to where we add our states. I'm going to copy this here. Let's add in our new attack state.

And now if we want to test, let's go to our attack state. In our on enter method, I'm just going to do a console log. I'm just going to say test. Now in our browser, if we press our attack key, we should see our console log message being logged when we try to attack. Now, if we start moving around and press our attack key, we should see the same thing.

Before we create our weapon component, let's define our interface that each of our weapons will need to implement. For that, under our game objects folder, we'll make a new folder. We're going to call this weapons. We'll make a new file. We'll call this our base base weapon.

Now, in here, we'll do export interface, and we'll call this weapon. for each of the weapons that we create in our game, we'll need a property to keep track of what is the base damage that this weapon can do. As an example, when we attack with our sword, that might do one damage to an enemy versus if we attack with our boomerang, it might do zero damage, but paralyze the enemy. We'll need a property to keep track if we're currently attacking with our weapon. So, when we go to swing with our sword, we'll want to set this to be true, and then only after our animation is finished, we'd set this to be false.

Versus if we attack with something like our boomerang, once we throw our weapon, we would set that to be true. We would need to wait for our weapon to get back to our player and we set it back to false. These properties, let's do base damage. We're going to set that to be a number. And then we'll have is attacking.

That'll be a boolean. And now for each of our instances, we'll need some methods to allow us to attack in our various directions. And then that way we can play our various animations and then update our physics body to be in that location for our weapon. So we'll do attack up and then we'll do each of our directions. And so this will return void.

So I'm going to copy this and paste it three more and paste it three more times. So then we'll have attack down and then we'll have attack right and attack attack left. Next, we'll add in our update method. And so this will be used by our weapon component to call our update method on our weapons. This will be used by our projectile weapon types.

So, as an example, when our boss throws his dagger at our player, we'll need to call our update method to update our game object. Finally, we'll add in one more method, and this is going to be on collision call back. Now, this method will be used for allowing our weapon game objects to collide with our world. And then we can call this call back once that collision happens. That way we can disable our game object and remove our sprite from our game.

Now that we have our new weapon interface, let's create our weapon component. So under our components, our game object, let's add a new file. We'll do weapon component. Let's go into our speed component. Let's copy our code from here.

We'll paste it. We'll update our class name. So we'll have our weapon component. So now our component, we'll need two properties. Our first will be our weapon instance that our player currently has equipped.

And so for our type, this is going to be our weapon interface that we just defined, or it can be undefined if our player does not have anything equipped have anything equipped currently. Next, we'll need a property to keep track of our weapon's physics body. And so we're going to do weapon physics body. For this, this will be our phaser, our physics, our arcade, and our body. So, how we'll use our weapon's physics body is instead of creating a physics body for each of our weapon types in our game and needing to manage all of the collision checks between that particular weapon and our various enemies, we'll just simplify this by having one physics body that we attach to our weapon component.

Then, for our collision checks, we only need to worry about checking for collisions between our weapon components physics body and our enemy game objects. Now, when we don't have a weapon equipped, our physics body and our weapon component will be disabled. But when we do have a weapon attached, when we go to attack with that weapon, then we'll update our physics body's shape to match the shape of the weapon we're attacking with. By doing this, it'll simplify our collision logic between our player's weapon and our enemies. Next, in our constructor, let's remove our speed argument.

Let's get rid of our code for our speed. And now, we need to define our property. So, we'll do our physics bodies. We'll do this our weapon physics body. We need to reference our game object, our scene, our game object belongs to.

Let's do our physics. We'll do add. We'll do a body. And now we just want to define a placeholder for where we want to position our body at. So we'll do our game objects X and Y game objects X and Y value.

And then for our width and height, we'll just do 1 pixel x 1 pixel. And so by doing this, this will create our physics body. So it's ready. And now we need to disable it. And so we'll do this our weapons physics body.

We'll do enable and we're going to set that to be false. And so by creating our physics body here, now it's ready to be used. And so once we create our sword game object and we go to attack with it, that's when we'll update our positioning of where our body should be, as well as our width and our height depending on the direction we're attacking with our sword. Finally, one last thing we'll do is we'll want to assign this component to our weapons physics body. So we're do this.

We'll do assign component to object, and we'll do this. and our weapons physics body. And so the reason we're adding our component to our physics body is once we go to add in our collision checks between our enemies weapons and our player, what our collision check is really doing is it's going to use our weapons physics body from our enemy's weapon component and then check for a collision between that and our player. And when that happens, we'll get a reference to our weapons physics body that our collision happened with and our player. from that body, we'll need to know which weapon component it belongs to.

So then that way we can stop our animation and stop updating our weapon. So as an example, when our boss throws our dagger, if it collides with our player, we immediately want to disable our body and then remove that game object from our scene instead of having that object continue to animate and move through our player. And by assigning our weapon component to our physics body, we'll be able to do that lookup. And so to support this change, we need to go into our base object component. We need to update our assign component to object, our type here.

So instead of just game object, we'll also want to support our phaser, our physics, our arcade, and then our body. And now if we come back to our weapon component, now we'll want to add in our getters and setters. First, we'll add in our getter and setter for our weapon. And so we'll have get weapon. This will return our weapon instance or undefined.

And we'll return this weapon. And now we'll do a setter for our weapon. We'll do set weapon for this. We'll get a weapon. Now for our type, this can be a weapon or it can be undefined.

And so we'll do this our weapon. We'll set equal to our weapon. And now we're going to add a getter for getting our physics body. And so we'll do get do get body. This will be our phaser, our physics, our arcade, our body.

So we return this our weapons physics body. And now we'll add in a getter for our weapon damage. And so we'll do get weapon damage. weapon damage. this will be a number and so we'll do if this weapon is this weapon is undefined we'll return undefined we'll return zero otherwise we want to return this our weapon and then our base damage finally we'll add in our update method that'll allow us to call our update method on our weapon so we're going to do public we'll do do public we'll do update we'll return nothing and we'll do if this our weapon if it's undefined we don't need to do anything so we'll return.

Otherwise, we'll do this our weapon and we'll call update. Oh, we just need to update our references here. we want to reference our private property. And now we get rid of this. And the same thing here.

Now that we have our new weapon component, we can update our attack state to use our component. So, let's jump over to our attack state in our on enter method. After we reset our game object's velocity, we'll want to try to grab a reference to our weapon component. If it exists and we have a weapon equipped, then we'll want to attack with our weapon. If we don't have a weapon equipped, we'll go back to our idle state.

So, I'm going to uncomment our code here for our held component. We'll update our references. And so, we'll have our weapon have our weapon component. For our variable name, we'll do weapon component. And then we'll update our check here.

So, if our weapon component is undefined or our weapon component, our weapon is undefined, then we want to go back to our idle state. I'm going to copy this line of code here. Let's add it into here. Let's clean up this code here before we throw our item. And so, after we go to our idle state, we'll return early.

And so, now if we do have a weapon, now we'll want to attack with it. So, we'll get a reference to our weapon. So, do const weapon. We're going to set it equal to our weapon component, our weapon. And now we need to check our game object's direction and then attack in that direction.

So we'll do switch. Let's do this. Our game object our direction. And now if our case is if our direction is up, we'll want to do our weapon. And we'll do attack up.

And we'll go ahead and return this. Now we'll copy that block of code. We'll paste it our three times. And so now we'll have down, left, and right. now we'll have attack down, attack left, and then attack left, and then attack right.

Finally, we'll add in our default case. We'll just do our exhaustive guard. So we'll do this our game object, our direction. So then we can remove our code here for going to our idle state. now down in our on update method, we want to get a reference to our weapon component.

And we'll do the same check. We'll make sure that's defined and we have a weapon equipped. And if we don't, we'll go to our idle state. So, let's copy this block of code here. Let's paste it here at the top of our method.

And so, now if we do have a weapon, now we want to wait until we're done attacking with that weapon before we go to our idle state. So, to do that check, we'll grab a reference to our weapon. Now, we'll do if our weapon if it's is attacking, then we'll return. If we're done attacking with our weapon, now we want to go back to our idle state. Now that we have our attack state and our weapon component in place, it's time for us to move on to creating our first weapon, our sword.

So, for the weapons we create in our game, we're going to create a base class that all of our other weapon game objects will extend. This will be similar to our base character class, where our base weapon class will have all of the core functionality that'll be in common between our various weapons. And so our base weapon class will have a lot of our core logic tied to things like our sprite game object, if our weapon's currently attacking, as well as our animation configuration for which animations need to play when we attack with our weapon. To start working on our code, let's open up our base weapon file that we created previously. And currently, we have our interface that our weapons need to implement.

And now we'll add our base class that all of our weapons will extend. So let's do export. We'll do our abstract class. Let's do a base weapon for our name and then we'll do implements do implements weapon. Since we're implementing our weapon interface, we'll need to add these methods and properties to our class.

To get us started, first we'll define our protected properties on our class. So, let's add in protected. First, we're going to add a reference to our weapon component that this weapon is associated with. And so, we'll do our weapon component. And so, for our type, that'll be our weapon component.

Next, we'll do protected. And we'll do attacking. This will be our boolean. And then we'll want to do our protected. Let's do our base damage.

This will be our damage. This will be our number. Now we just need to add two more properties. Our first one is going to be our sprite game object that will represent our weapon in our game. So this will be our phaser, our game objects, and then our sprite.

And then for our second property, this will be our attack animation our attack animation config. And for this, we'll make a new type. And we're going to call this our weapon attack animation animation config. And so our attack animation configuration, this is just going to be a map between our directions and which animation we want to play when we attack in that direction. So let's define that type real quick.

So let's do export type. We'll do our weapon attack animation config. This is going to be an object. And now for our keys on our object, this will be our key and direction. direction.

And then for our type, it'll be a string. And so this will just be a map between our various directions. So up, down, left, and right, and our animation key we want to play. So now that we have our properties, let's add in our constructor. So for our constructor, first we'll need our sprite game object that represents our weapon.

And so this will be our phaser, our game objects, our sprite. Next, we'll need the weapon component that's associated with this weapon. Then we'll need our animation config. config. So we'll have our weapon attack animation config for our type and then we'll have our base damage and this will be a number.

So now our constructor we can update our properties. So our sprite will be equal to our sprite. Our weapon component will be equal to our weapon component. Our animation config will be equal to our animation config. And then our base damage will be equal to our base damage.

Then finally we'll add in a default value for is attacking. And so we'll set that to be false. now that we've updated our properties, we need to add in getters for our base damage and is attacking. So let's do get. We'll do is attacking.

This will return our boolean. And so this will return this this will return this attacking. Now we'll do get. Let's do our base our base damage. This will return our number.

And return this our base damage. Next. Now we need to add in our methods that we'll need for our weapon interface. So I'm going to copy these here. Let's come down to our code.

Let's paste those in. now for our attack up, down, left, and right methods. We don't actually want to implement these on our base weapon class. And instead, we want to force our child classes to implement these. To do that, we can make these methods public.

And then we can use abstract. And now we have these defined on our parent class. And we'll need our child class to actually implement these to have the logic that we need. Uh, so as an example, when we create our sword and we do our attack up, this is where we'll play our animation for our sword swinging in front of our player and we'll update our weapons physics body at that time. So now we'll do the same thing for our other attack methods.

It's now for our update and our on collision callback methods. We'll want these to be optional on our child game objects. So we're going to define those methods on our class here, but we won't have them do anything. And if they need to be overridden, we'll do that in our weapon implementation. And to do that, we'll just make these methods public.

And now let's add in our method. And for now, we're just going to add a comment about not comment about not implemented. And now we'll do the same thing for our other thing for our other method. And now we'll save. Now that we have our base logic in place for our base weapon, let's create our sword class.

So under our weapons folder, let's make a new file. We're going to call this call this sword. So now let's export our class. we'll export class sword and we're going to extend our base weapon class. So, now in our class, we'll need to implement our four methods for when we want to attack.

So, I'm going to jump over to our base weapon class. I'm going to copy these methods from here, paste them into our class. We'll get rid of our abstract methods. All right. So, let's start with our attack up method.

So when we go to attack with our weapon, the first thing we'll do is we need to set our property to show that we're currently attacking. And we want to set that to be true. So after we set attacking to be true, now we need to play our animation for actually attacking. So we'll reference our sprite game object that's associated with our weapon. And now we want to call play.

And now for our animation configuration, we'll have our key. And now for our key, we want to grab this from our attack animation configuration here. And so we'll do this. We'll do our tack animation configuration. And now we want to do our up direction.

And then we'll set a repeat. We'll set that to be zero. And then after our configuration, we want to set ignore of playing to be true. So once we start our animation, now we'll want to enable our physics body on our game object. And so we'll reference our weapon component.

We want to grab our body. We want to do enable. And we're going to set that to be true. Once we start our animation, now we need to wait for it to finish. And once it's finished, then we'll want to set is attacking be false and then disable our physics body on our weapon component.

To do that, we're going to do this. sprite. We want to use the once for our event listener. And now for the event we want to listen for. This is going to be our phaser, our phaser, our animations, our events, our animation complete key, and now we need to add on our suffix for the animation that we just played.

And so that's going to be the same key that we're using here. So what we'll do is we're going to store this in a variable so we can represent in the same spot. So let's copy this here. Make our new variable. Do const.

We'll do our tac animation key. And we're going to set equal to this. Our attack animation config. And then up. Now we'll replace that here.

And then we'll paste that here. And then in our callback now we just want to set our attacking. We're going to set to be false. And now we'll disable our body. And so I'm just going to copy this code here.

We'll paste it. and let's set this to be false. So now if we want to test the logic we have so far, let's jump over to our player class and we'll create an instance of our weapon component and our sword. We'll need to keep track of our weapon component. Let's come up to the top of our class.

We'll add a new property. We'll do our weapon component. For this, we'll set it to our weapon component type. Now we'll come down to where we add in our components. We'll do this.

We'll do our weapon weapon component. It's going to be equal to a new weapon component instance. and we'll pass in this for our game object. So now we'll want to create an instance of our sword game object and assign that to our weapon component. So we'll do this.

We'll do our weapon component. We'll do our weapon. We're going to set that equal to be a new instance of our sword game object. So now for our sword, we want to pass in this for the sprite game object we'll be using. And now we need to pass in our weapon component.

And now we just need to do our animation configuration. So for this we need to provide our attack directions. And so we'll have down. And now this will be our player animation keys. And this will be our sword one and then our attack down.

Now I'm going to copy this. And we just need to do our three other directions. So we'll have up, left, and then then right. And now for our animation keys, this will be our sword one attack up, and then our sword one attack side. And then finally, we just need to pass in our base damage.

And for the time being, we'll do one. Finally, we'll need to go down to our update method. And now we want to call this our weapon component. And we'll want to call our update method on our component. All right.

Finally, for our player, let's add a getter for returning our weapon component. And so, let's do get. We'll return our weapon return our weapon component. For our type will be our weapon component, and I'll return this and our weapon and our weapon component. One last change we'll do is when we create an instance of our sword, let's remove our hard-coded one here.

We're going to grab this from our config file. So, we open up our config file. Let's copy this line of code here. We'll paste it. And now we'll have our player and we'll have attack and we'll have attack damage.

We'll have a base value of one. Come back to our player class. Let's remove our one here. Now, let's reference our new variable. And so, we'll have our player attack damage.

All right. So, now if we come over to our browser, we should be able to test our changes. If we have our player face down, left or right, and we try attacking, nothing should happen. But if we face up, oh, looks like we have an issue. Let's jump over to our sword class.

Ah, yes, we referencing phaser. we just need to import that. So, we'll do import as phaser from phaser. All right. So now if we come back to our browser, if we try again, if we do left, right, or down, nothing should happen.

But when we attack up, we should see that our player plays our animation for attacking with our sword. All right. So, one thing to note is when we created our sword instance in our player class, we passed in a reference to our player sprite. The reason we did that is our sprite sheet for our player, our weapons are currently baked in to our player. And so, when our player goes to attack, our weapon is there with our player.

Uh, as an example, if we go under our assets folder, our images, if we go into our player and open up our main greenpng, we'll see when we attack with our sword, our sword is in our player's hand, and it's all one animation. This is important to know, uh, since we'll need to update our player sprite game object to play that correct animation. If these were broken up, we need to handle this differently. And another good example is once we go to do our dagger for our boss enemy, we'll see our sprite sheet is just our game object itself and it's not attached to our boss. What this means is with our weapon game objects we create, we'll need to be able to dynamically pass in whichever sprite game object represents our weapon or the animation we need to or the animation we need to play.

Now that we verified our animation for attacking in the up direction is working, we want to do the same thing for other directions. For the time being, let's just copy this block of code here and we'll paste it in our various methods. Then we'll just want to update our animation configuration key. And so when we attack left, we'll do left. We'll do right.

And let's do down. So now if we save and come over to our browser, if we have our player try attacking in our various directions, we now play the appropriate animation for that attack. And then our player will go back to our idle animation once that's done. Now that we verified our logic for playing our various animations based on our attack direction is working, we're going to work on refactori code. Since a lot of this code is the same between all of our various attacks, since we're repeating this pattern, it makes sense to move this logic to our base weapon class.

And then that way we can reuse this for all of our various weapon implementations. So let's jump over to our base weapon class. We'll add in a new protected method and we'll call this attack. So let's do protected. We'll do attack.

And for this method, we won't return anything. Let's jump over to our sword class. Let's copy our logic for our attack animation. We'll paste that. And so to make this dynamic, we'll want to pass in our direction of our attack.

We'll add an argument. We'll call this direction. And now we'll do direction for our type. And now for animation config, we'll reference that key. So we'll pass in our direction.

And now the rest of our code should stay the same. But one thing we'll do is our callback here, we're going to move this logic to its own method. And then that way we'll be able to reuse that as well. let's add in one more method. We'll do protected and we'll do attack animation complete handler.

For this method, we won't return anything. Let's grab these two lines of code. Let's paste it. And now we'll call our new method. So we'll do this.

And now we'll do our attack animation complete handler. So now if we jump back to our sword class, let's update our attack methods. So for attack up, we're just going to call this attack. And now we'll pass in our direction. So we'll do direction and we'll do up.

Now if we copy that line of code, let's update our other methods. Now we just need to update our direction. And so we'll have left, we'll do right, and then we'll do down. And then let's grab our import for phaser and we'll move that over to our base weapon weapon class. Now let's save.

And we come back to our browser. And now when we try attacking, we should still play our animations for attacking in our various directions. directions. Now that we have our logic working for playing our various attack animations, now we need to layer in our logic for updating our weapon's physics body. So, when our player attacks in the upward direction, we'll want to move our physics body in front of our player.

And we'll want to have a horizontal rectangle box for our sword's attack versus when we attack on our side, we'll want to have our physics body next to our player, and we'll want to have a vertical rectangle representing the path of our sword. So to add in those changes, let's start in our attack up method. First, we'll want to update the size of our physics body. And so we'll do this. We'll reference our weapon component.

We want to grab our body from it. And now we want to call set size. For the size, we're going to do 30 pixels for our width. And we'll do 18 pixels for our height. And now we'll want to update our position to be in front of our player.

So let's reference our weapon component, our body. We'll reference our position property. And now we want to call set. And now we'll need to reference our sprite game object that's associated with our weapon. So we'll do this our sprite.

We'll grab our x value. And then we'll need to do our y-value. So we'll do this. Sprite. And now let's do our y value.

All right. So if we save, we come back to our browser, we should see a little pink dot on our square. And this is representing our physics body of our weapon component. Right now it's disabled. And when we attack in our upwards direction, it should now disappear and reappear at the position we specified.

And so now we can see we have this large rectangle box at the position here where our player is. And we'll need to update our x and y values to have it be placed in front of our player. So first for our y value, let's subtract 22. Now if we have our player attack in the upwards direction, we have our box in front of our player, but we need to shift it over a little bit since our sword animation kind of starts here and moves all the way to over here. So now for our x value, we'll subtract 16.

Now, if we attack in our upwards direction, our physics body is now more aligned with where we're playing our attack animation. And so, if we move around our scene and keep attacking in the upwards direction, we should see that our position gets updated. So, now we'll want to do the same thing for our other directions. Let's copy these two lines of code. We'll paste them in our various methods.

And we'll start with our attack down. So, for our attack down, we'll keep the same size, but now for our positioning, we'll want to update our Y value. We'll want to increment this. as we'll increase this by 10. Now, if we save, we come back to our browser.

If we have our player attack down, we'll see our box is pretty close, but let's update our positioning and we'll subtract 20 from our X. All right, if we save, let's have our player try attacking down. So, it looks like we need to update our X position a little bit. But if we move over to the left and then face down, now we'll see our box works for our position. And if we move to the right, now we have that same issue where we just attack down.

So what's happening is when we move left and right, we're updating our flip X property on our sprite. And so when we do that, we'll need to account for that when we set our X position. To account for that change, we'll just do if we'll do this our sprite. If our flip X is set to true, then we'll do this line of code here. Otherwise, let's copy this.

We'll use a different X value. And so for our X value, we're going to subtract 10. So now when our scene refreshes, if we attack down, we'll see our box should match the direction of our sword. If we move to our left, now it matches when we have our flip X property set to true. Now if we move to our right, it goes back to how it was before.

Nice. All right. So now we just need to do our left and right directions. So for our left and right directions, we need to have our game object to the left or the right of our player. So, for our position, for our X, when we're attacking to our right, we'll want to add 10.

When we are facing to the left, we'll want to subtract 30. And now, for our position, we only want to subtract 10 for a Y. So, now if we attack to our left or right, we get our game object in the right position, but we just need to update our size. And so, now for our size, we'll want to flip these values. And so, we'll do 18, and then we'll do 30.

All right. All right. So now if we move around, we should see when we attack, our physics body gets updated to be in the position that we need it to be in. Now that we've added in our logic for having our player be able to attack and play our animation and update our physics body, now we just need to bring everything together by adding in our collision check between our player's weapon and our enemies. To do this, let's jump over to our game scene.

Let's come down to our register colliders method. So in our register colliders method, let's come down to our logic where we have our collisions between our player and our various enemies. The first thing we'll do is in our overlap between our player and our various enemy groups. We currently have our enemies take damage when our player collides with them. And we originally added that to allow us to test our health component and having our enemies die.

So let's remove that logic. We want to keep our logic where our player will take damage. And now we'll update our callbacks since we don't need these arguments. Next, we'll want to add in our collision check between our player's weapon and our enemy group. So, down in our if statement at the bottom, let's do this.

We'll reference our physics. Let's do add, and we're going to do an overlap. And so, now for our overlap, we want to do our enemy group. And so, we'll do our objects by room ID. We'll do this room ID, and it'll reference our enemy group.

Now we'll need to reference our player, our weapon component, and then our physics body on our weapon component. Now, we need our callback. So, in our callback, we'll have our enemy game object as our argument. Now, we'll just need to call the hit method on that enemy. And so, we'll do our enemy.

We're going to do as our character game object. We'll call our hit method. And now, we need to pass in the direction our player was facing. And so, we'll do this our player, our direction. And now we need to grab the amount of damage from our weapon.

And so we'll do this. We'll do our player. We'll do our weapon component. And now we'll do our weapon damage. Now that we've added in our overlap between our player's weapon and our various enemy groups, now we need to do the inverse.

We need to grab a reference to all of our enemies that have a weapon component. And for each of those enemies, we'll want to have a collision check between their weapons and our player. So, for the time being, none of our enemies actually have any weapons, but once we get to our boss character, we'll need this logic so our boss can do damage to our player. And to add in that check, we're going to need to get a reference to all of our enemy weapons. And so, let's do const.

We'll make a new variable, and we'll do enemy enemy weapons. So now, to get a reference to all these, we need to reference our objects by room ID, our current room. Now we want to grab our enemy group. And now we want to call the get children method to grab all of our child game objects. And so once we have all of our child game objects, now we want to check to see if that game object has a weapon component.

And if it does, return that body of our weapon component. To do that, we're going to use a flat map. And this is going to allow us to iterate through our array of our children. And then we can return a different object instead of returning our enemy game object. So in our flat map, in our iteration, we'll have our enemy.

And now inside our loop here, we'll do const. Let's do our weapon component. We're going to set it equal to our weapon component. We're going to do get component. We'll pass in our type.

And now we want to do our enemy as our game object. So now we're going to check to see if our weapon component is not undefined. So if our weapon component does not equal does not equal undefined, then we want to return that. when we return and we'll do an array. We'll do our weapon component body.

Otherwise, we just want to return an empty array. So how flatmap works is it's going to flatten our results we provide through our iterations into a new array. What this means is in our iteration, we need to return an array of the objects that we want to add to our overall array when we're done. So, as we're iterating through our enemy game objects, if our enemy has a weapon component, we're going to return that physics body in our array here. And then our resulting enemy weapons array will have that physics body.

If our enemy doesn't have that component, then by returning an empty array, no new elements will be added to our main array here on our enemy weapons. So, now that we have all of our enemy weapons, we can just check to see if our length is greater than zero. And if it is, we'll add in our new overlap. And so we'll do our enemy weapons. Let's do our length if it's greater than zero.

Now we just want to do our overlap. So I'm just going to copy this block of code here. And now we'll just update our properties. So instead of doing our enemy group, we want to reference our enemy enemy weapons. So we have that array.

Then we'll reference our player instead of our player's weapon. So now in our callback, instead of having our enemy game object, this is going to be our enemy's weapon body. And so we'll do enemy weapon enemy weapon body. All right. So in our call back here, now we'll need to get a reference to our weapon component that's associated with our enemy's weapons physics body.

So when we created our weapon component, one of the things we did is we did our assign component to object and we assigned it to that physics body associated with that weapon. And so by doing that here, now in our collision check, we can use this physics body and get a reference to that weapon component. And so to do that, I'm going to copy this block of code here. We get a reference to our weapon component, but now we're going to update our reference. So instead of doing our enemy as our game object, we'll do our enemy weapon body as our game object.

And now we'll do our And now we'll do our check. And so we'll do if our weapon component is component is undefined, then we just want to return early. Otherwise, we'll want to have our player take damage. And so we'll reference our player. We'll call hit.

Now we'll do our direction. down. And then for our damage, we'll reference that weapon component. and we'll grab our weapon our weapon damage. One last change we need to add is when our weapon collides with our player, we'll want to call our method for our on collision call back here.

So we can do any cleanup like hiding our projectiles and disabling our collisions. And so to add in that check, we'll need to make sure our weapon component has a weapon. And so we'll do or our weapon component our weapon is equal to undefined. We'll return early. And then that way outside here we can do our weapon component.

We can reference our weapon and we'll call and we'll do our on collision call back. Now that we have our collision logic in place, we should be able to test having our player attack our enemies. Let's jump over to our payload scene. We're going to update our starting room. We'll go to room six.

We'll do our door ID of one. All right, if we save, let's come back to our browser. Go to one of our spider enemies and swing our sword. We should see when our physics body overlaps with our enemy, they take damage and they go into the appropriate state. Now, if we attack our spider enemy again, they should die.

And now if we try attacking our wisp enemy, we should see that we're not able to actually damage them with our physics body. All right, we come back to our preload scene. Let's revert our change and we'll go back to our starting room. All right, so with that last change, that actually wraps up our section on our attacking and adding a simple combat system to our game. So with the system we've built here, we can easily extend this later on to add new weapon types to our game, and we'll be able to support those with our weapon component.

We've also built out the support that we'll need for our boss and being able to have our boss attack our player. Later on, this could be extended by adding a new enemy types that are able to throw weapons or attack our player as well. So, now that we've wrapped up our section on attacking, we're going to transition over to our data data manager. That's it for this part of the series. If you found this helpful, be sure to hit the like button.

It really helps out the channel. And if you're following along, make sure to subscribe and turn on notifications so you don't miss the next video. If you have any questions or want to share your progress, drop a comment below. I'd love to hear from you. All right, thanks for watching and I'll see you in the next one.

In the last section, we build out our combat system, allowing the player to attack our enemies. With that in place, we now need a way to manage key gameplay data, like our player's health, our player's current location, and our dungeon progress. In this section, we'll introduce a data manager to track and store important game data, making it easier to manage things like our health, our location, and our world state. Later on, our data manager could be extended to allow us to save our game state. All right, let's dive in and start building our data manager.

To start creating our data manager, let's go into our source code under our source folder under common, let's make a new file. We're going to call this data going to call this data manager. Let's export out our class. We'll call this data manager. for our data manager class, this is going to be responsible for keeping track of our overall game state.

This is going to be different than our inventory manager that is solely responsible for keeping track of our items our player has collected. Our data manager will keep track of things like our player's current health, what their max health is, where our player is currently at in our game, and then it's going to keep track of our state of our various areas. as our player starts navigating our dungeon and doing things like opening up our chest, unlocking doors, we'll need to keep track of that state. That way, if our player leaves our dungeon and comes back or if they die and respawn, we'll be able to update our dungeon state to match what our players already done. Later on, we could then take this information and do things like save it to our local storage.

That way, we could allow our player to save their game and come back and pick up from where they left off. So for our data manager, this is going to be similar to our inventory manager where we'll want this to be a singleton, and we'll only ever want one instance of this class running for our game. To start adding our code, first we'll make our class a singleton. So let's jump over to our inventory manager. Let's copy our public static getit instance, our constructor, and then our class properties, and then we'll remove what we don't need.

So now for our instance, we'll want to set this up as our data manager. Let's get rid of our two properties. Now for our constructor, we'll leave this empty. Now for where we get our instance, let's update our class. Now for our class, we need to define our data that we want to keep track of.

For this, we'll add a new private property. We'll call this data. And for our type, we're going to call this player data. And now we'll define that type at the top of our class. And we'll do export type.

We'll do player data. So in our constructor, we'll want to initialize our objects. We'll do this data will be equal to our empty object. now for our player data, we'll want to keep track of our player's current health and their max health. So let's add those in.

Both of these will be numbers for our numbers for our type. Next, we'll need to keep track of our player's current location. For this, we're going to call this current area. We're going to make this an object. And now we'll need to know which level our players currently in.

So are they in our dungeon or in or are they in the main overworld? So for our type, we'll do level name. Next, we'll need to keep track of our room ID and our door ID. So now for our room ID and our door ID, we want to keep track of where our player needs to start at for this current area. typically in Zelda games, when you die in the dungeon, you don't respawn right back where you were at.

You would actually respawn back at the beginning of the dungeon. To keep track of that, we'll need to know what that door and room ID is. So then we can spawn our player at that location. So we'll add in start room ID. This will be a number and we'll do our start door ID and that'll also be a number.

Now, we'll need to keep track of what we have accomplished in our areas. So, for our dungeon, this would be keeping track of things of which chest we've opened, which chest we've revealed, if a door was locked, have we used a key to unlock it, and if we actually beat the boss for this current dungeon. To keep track of the information, we're adding a property. We're going to call this area details. This is going to be an object.

And now this object, we'll want our key to match our keys from our level name. So for this, we're going to do our key in level name. And now this will allow us to have an object where our key will match our level name. And so we'll have values our world or dungeon one to keep track of those stats. So now for our area object, we'll want to keep track of our chest and our doors based on which room they're tied to.

So for that, we'll add in a property. We're going to do our key and this is going to be a number which will be our room ID. And now for this object, we'll have our chest. And then we'll have our then we'll have our doors. So now for both of these objects, we'll want our key to be our ID of that chest or that door.

And so for our key, we'll make this a string. And now for our type, this will be an object. And now for our chest, we want to keep track of we've actually revealed it. And so this will be a boolean. And then we'll keep track if we've opened our chest.

And so this will be a boolean. Now, for our doors, let's copy our object from our chest. But the only property we need to keep track of is if we actually unlock one of our doors. And so, we'll do unlocked, and that'll be a boolean. Finally, for our area details, we'll want to keep track if there was a boss and if we actually defeated that boss.

And so, we're going to do boss defeated. So, we're going to make this optional, and this will be a boolean. And so, for some of the areas in our game, we might not have a boss. And so, that's why we made this optional. Now that we've defined our player data type, we need to update our instance inside our constructor.

Let's start with our player health. So we'll have our current health. For this, we'll want to reference our player start max health from our config. And so we'll do our player. We'll do our start max health.

Now for our max health, we'll set it to the same the same variable. Now we'll do our current area. for our current area, we'll want to match this to our data that we're currently setting in our preload scene. for our name, let's do our level name, we'll do our dungeon one. Our start room ID, we'll do three.

And our start door ID, we'll set that to be three. Now, we need to add in our area details. Now, this will be an object. We'll add in our dungeon one first. For this, we'll do our boss defeated.

We'll set that to be false. And now, let's add in our world. And for our world, we'll do our empty object. do our empty object. So, when we initialize our area details, we don't need to populate each of our room IDs that we already have.

Instead, when our player takes action in our game, like revealing or opening a chest, we're going to add methods to our data manager class that will allow us to add those objects when we need them. So, now that we've initialized our player data, next for our class, let's add our getter and setter for getting our data. Now that we've initialized our player data, next for our class, let's add in our getter and setter for our data property. first we'll do our getter. So we'll do get we'll do data.

For our return type, this will be our player data. And for this we're going to return a copy of our data. So we can't modify it. And so we're going to do this and we'll do our data. Now for our setter, we're going to do set data.

For our argument, we'll have data. And this will be our player data. And now we'll set this our data. It'll be equal to a copy of that data. Finally, for our class, we just need to expose some methods that will allow us to update our data in our data manager.

For this, we're going to add in methods that allow us to update our area data, update our chest, and our door data. And then finally, to reset our player's health when our player dies. So, for our first method, we'll call this update area data. So, we'll do public update area data. Now, for our arguments, we'll need to know the area that we're adding.

And so, this will be our level name. Then, we'll need our room and our door ID. And so we'll have our start room ID. This will be our number. And we'll have our start door our start door ID.

For our method, we won't return anything. Now we just need to update our current area. So we're going to do this our data, our current area. This will be equal to an object. For our name, we'll do our area that we passed in.

We'll have our start door ID and our start room ID. Next, we'll add in a method for updating our chest. So we'll do public. We'll do update chest data. We'll do update chest data.

Now, for this method, we'll need to know which room our chest was in. So, we'll have our room ID. This will be our number. We'll need to know our chest ID, which will be a number. And then we'll need to know the state of our chest.

And we'll do revealed. Make this a boolean. And then we'll do opened. And we'll make that a we'll make that a boolean. We'll return nothing from this method.

So, now when we call this method, first we'll want to make sure we actually have that room ID as part of our area details for our current area. If we don't, we'll need to add that to our object. And so we'll do if this, our data, our area details, we'll get a reference to where we're currently at. So we'll do this, our data, our current area, and then our level name. And if our room ID on that object is equal to undefined, that means we've not done anything inside that room yet.

Now, we need to add that room to our object. I'm going to copy this line of code here. Let's paste it. And now we'll set equal to an object and we'll have our chest. This will be an empty object.

And then we'll have our doors and that'll be empty object. So after our check, now we can update our area details. So we'll do this. We'll do our data, our area details. We'll grab our current area.

We'll grab our level name and we'll use the room ID that was provided. And then we'll reference our chest objects. And now we'll use that chest ID we provided. and we'll set our state equal to our state that was provided. So we'll have revealed and then we'll have opened.

Now we'll want to do the same thing for our doors. So I'm going to copy this block of code here. We'll paste it and we'll update our method name and we'll do update door update door data. So we'll need our room ID. We'll need our door ID.

And then we'll just need to know if our door is unlocked. So we'll update our property here. Let's get rid of open. get rid of open. And so we'll want to do a similar check where we populate our area details for the room that was provided if it doesn't exist on our object.

Finally, we'll update our property. And so instead of doing our chest, we want to do our doors. And now we want to do our door ID. And then we'll just set unlocked. Now, since we're doing the same set of logic in both of our methods, we'll move this to a new private method.

And so we're just going to do private and we'll do populate default room default room data. For this we'll need our room ID and this will be our number. We won't return anything for our method. Then we'll grab this block of code. Let's paste it here.

And now we just call our new method. And so we'll do this. We'll do our populate default room data and we'll pass in our room ID. Let's copy that line of code and we'll update our other method. Finally, we just need to add a method to allow us to reset our player's health.

So typically in Zelda games when your player dies, they don't actually restart back at their max health. Instead, they would restart at a minimum threshold. And so this would typically be like three hearts. And so to add in that method, we'll do public. We'll do reset player health to men.

We won't return anything. We'll just do this our data. We'll do our current health. We're going to set it equal to our player, our start max health. Now that we have our new data manager class, we need to start connecting it to our game.

To start with, let's go into our payload scene. And instead of hard- coding our starting level and our room and door ID, we're going to grab this from our data manager. So, we'll get rid of our to-do here. Let's update our level. We'll do our data our data manager.

We want to grab our instance. Then, we'll grab our data. Let's grab our current area. And we'll grab our name. Let's copy that line of code.

We'll update our room ID and our door ID. So now if we do our starting room ID and then our starting door ID. All right. So we save and our game refreshes. Our player should still spawn inside our dungeon and our room three at our door three.

And if we leave our dungeon and come back in, everything should still be should still be working. Now that we've updated our preload scene to use our data manager, we need to do the same thing for our game scene. So in our game scene, we have a few spots where we'll need to integrate our data manager. Our first is when we go to spawn our door and our chest game objects by parsing our data from tiled, we'll want to grab our data manager and check to see if we previously already revealed a chest or opened it and if we've already unlocked a door. If we have, we'll want to update the state of those objects to reflect that.

And that way, our player doesn't need to repeat those actions. Next, as our player interacts with these objects, we'll need to update our data manager state. So, as an example, when our player when we collide with our boss door, if we had our boss key and unlocked it, we'd want to update our state so then it reflects that. So, to start with our changes, let's go to our register colliders method. Let's come down to our collider where we check for our collision between our player and our doors that can be unlocked.

So, let's start with our small doors. So, after we use our small key and we open up our door, now we want to update our data manager. And so, we'll do our data manager and grab our instance. Let's call our update door data method. And now we need to provide our current room ID and then the door ID that we just interacted with.

So we'll do our door, our ID that we want to set to be true since we unlock that door. Let's grab our comment for our data manager. This should actually be inside our if statement. And then we'll remove our to-do from our comment. Now we want to do the same thing for our boss doors.

And if we open up our boss door, we'll pass in our current room ID, the door ID of that door, and we want to set to be true. So, we'll update our comment. And now we'll want to do the same thing when we open up one of our chest. So, let's go to our handle open chest go to our handle open chest method. So, in our method, let's get rid of our to-do.

We'll paste in our line of code for our data manager. Let's update our method name. We'll do update our chest data. So, we'll want to pass in our current room ID. Now, we'll want to pass in our chest, our ID.

We'll want to say true because our chest should be revealed if we're opening it. And we'll do true when we open up our chest. Next, we'll need to update our data manager for when we reveal one of our chest. For this, we have two different actions. One is when we defeat all of our enemies.

The second one is when we press a switch to reveal our chest. So, let's go to our handle button press method. So, after we reveal our chest, let's update our data manager. Do our data manager, our instance, we'll do our update chest data. Now, we'll grab our current room ID.

We'll do the ID of our chest. And now, we want to do revealed. We'll set to be true. and we'll do false for if our chest is open. So now before we update our data in our data manager, we're going to want to check to see if we already have existing data for our chest data.

The reason for this is we can press our buttons multiple times in our game. And so when our player enters into our next room, when we press our switch to reveal our chest, that's when we want to update our data manager. Now, after we reveal our chest, our player could leave our room and come back in. And if they do, our chest is already revealed. But if we open our chest and then we press our button to reveal our chest again, we're going to override that state.

And now we'd say we didn't actually open up our chest. And so to handle that case, we'll first want to grab our data. And if our chest has already been revealed, we won't bother setting this information. Let's make a new variable. Do const.

We'll do existing chest data. existing chest data. For this, we'll set equal to our data manager, our manager, our instance. We'll do our data. We'll use our area details.

Now, we're going to grab our current area name. So, we'll do our data manager, our instance, our data, our current area, and now our name. And now we'll reference this current room ID. And since our room might not exist in our data yet, we'll do our optional chain. And now we'll do our chest.

And from here, we want to grab the ID of our chest. So now if we don't have our existing data or our existing data if it's not been revealed now we'll update our data manager. Now we just need to add in the same logic when we handle when all of our enemies are defeated for one of our rooms. So let's copy this block of code here. Let's go to our handle all enemies defeated method.

So under our to-do, we'll paste in our code. Now we just need to update our references. So, we'll just do our chest and then an ID of our chest. And then same thing here. Finally, when we're creating our door and our chest game objects, we'll want to grab our data from our data manager and then update the state of our game objects.

All right. So, now in our create doors method after our check where we see if we have our door object, we'll want to see if we have existing data for this door. And if we do, if our door is unlocked, then we want to open up our door and we can return early. Then that way we don't create our and then that way we don't add our door object to our locked door group. So to add in that code, let's paste in our code for our existing chest data.

We're update our variable name. We'll do existing door data. And now for our reference, instead of doing our chest, we want to do our doors. We'll pass in our child object. And then we'll pass in our ID.

Our ID. So now in our if statement we'll do if our existing door data does not equal undefined and our existing door data if our door is unlocked if that's true. Now we want to open up our door and so we'll do our door and we'll call our open method and we don't need to update our data manager but we can return early and then that way we don't add our door object to our two groups. now let's copy that block of code and now we'll do the same thing when we create our chest. So we come down to our create chest method.

After we add our chest to our blocking group, we'll paste in our code. And then we'll do our existing chest data. We'll update our reference. So instead of our doors, we're going to do our we're going to do our chest. It's now in our check.

We're'll do if our existing chest data does not equal undefined. Let's get rid of this part of our code here. And so if our existing chest data is not undefined, now want to see if our chest has been revealed and if it's been opened. And so if our existing chest data, if it's been revealed, we'll call revealed method. So we'll do chest reveal.

And now we'll see if our chest has been opened previously. we'll do our existing chest data. We'll do opened. And now we'll do chest. And we'll do open.

We can get rid of our return statement. And then let's save. Oh, one change we need to do to our create chest and create doors methods is when we grab our existing data, we don't want to use our current room ID. We want to use the room ID that's associated with the room where we're creating our objects at. So if we come back up to create doors, let's update our reference there as well.

And so we'll do our room ID. And now let's save. All right. So if we save our code, we should be able to test our changes. And so now for testing our data manager, we want to test that we're actually persisting our data when we restart our phaser scene.

To do that, we'll want to update our data manager and then leave our dungeon and come back in. And then that way when we recreate our objects, we can verify that we're using the estate from our data manager. now when we come into our second room, we should expect our chest not to be visible. And just to do a quick test, if we leave and come back in, our chest should still be visible to our player. now, if we open up our trap door, let's leave.

If we leave our dungeon and come back come back in, ideally our chest should still be revealed to our player. If we come back into our next room, we'll see our chest is revealed to our player. We don't need to press our switch to actually reveal it. So now, let's test opening up our chest. So now, if we leave our room, let's leave our dungeon.

If we come back in, our chest should be in our open state. And now, if we go over to our locked door, let's do a test with that. if we open up our locked door, let's leave our dungeon. And so, now we come back into our dungeon, we should see that our chest is open. And our locked door is still open.

Still open. Nice. Finally, for our data manager, we have two other updates we need to make. Our first one's going to be in our chest class. So, in our callback, when we're checking to see if we can actually open up our chest or not, we're checking to see if our player has our boss key from our inventory manager.

For this, we hardcoded this to use our dungeon one. And instead, we want to use our area information from our data manager. So, for this, we'll want to do our data manager. We want to grab our instance, our data. We use our our current area, and then we want to grab our name for our level name.

And then that way, we're referencing where we're at currently in our game. So, let's remove our to-do. And then finally, we'll just need to update our player's health after our player takes damage. So, currently in our data manager, we have a method for resetting our player health back to its minimum value. And so, I just need to add a method to update our player's current health.

And so, we're going to do public. Let's do update player current health. We won't return anything from our method. And now for our method, we'll need one argument. And we'll do health and this will be a number.

And now we can do this our data, our current health. And we'll set it equal to our health argument that we passed in. So now with our new method, now we just need to update our data manager when our player takes damage. For this, let's go into our character game object class. Let's go into our hit method.

And so now after we update our life component to take damage, now we'll need to update our data manager. And so we'll do if this if it is our player, now we'll update our data manager. And so we'll do our data manager, our instance. Let's do update player current health. And now we'll just pass in our health from our life component.

So we'll do this our life component. And now we'll pass in our current life value. our current life value. Finally, for our data manager, our last test we'll want to do is when our player dies, if we respawn our player, our dungeon state should be the same as it was before. So, to add in this change, we'll need to add in logic to actually restart our phaser scene once our player dies.

To do that, we'll need to listen for our player defeated event. So, if we come up to our register custom events method, let's add in a new listener. So, let's copy this line of code here. We're going to paste it. Let's do player defeated and we'll make a new method and we're going to call this handle player defeated defeated event.

Let's copy this line of code. We want to make sure we turn off that event listener when our scene shuts down. And we'll do off. Now let's copy our method name. Let's come down to the bottom of our class.

We'll add that new private method. Now for this method, we won't return anything. And so now what we'll do is we'll fade out our camera and then we'll restart our phaser scene. To do that, we'll need to listen for our fade out event. So, let's reference our main camera.

So, we'll do this, our cameras, our main camera. We'll do the once method. And now, we want to do our phaser, our cameras, our scene 2D, our events, and now our fade out complete event. And now, in our callback, we'll do this. We'll do our scene.

Let's do restart. And now we need to fade out our camera. So, we'll do this. Our camera is our main. We'll do fade out.

And for our duration, let's do 1 second. we'll do a th00and milliseconds. And we want to do black. So we'll do zero zero zero for red, green, and blue. And to quickly test our changes, let's go into our config.

Let's update our player start max health. We're going to set this to be three. Now if we come back to our game, let's try revealing our chest. So now, if we have our player die in our in our room, once our camera fades out, we should be back at the beginning of our dungeon. And if we have our player go into our room, we should see that our chest is still revealed.

Nice. All right, so now we verify our changes. Let's reset our starting max health back to to six. All right, so with that last change, that actually wraps up our data manager. So in our next video, we'll start working on our UI components for our game.

Now that we've built our data manager to track important game data, it's time to bring that information to the player with a UI system. In this next section, we'll focus on creating essential UI components, including a health bar to display our players remaining health, a game over screen for when their adventure ends, a simple dialogue system to deliver messages and interactions. With these additions, we'll make our game feel more polished and immersive. Let's dive in and start building our UI. For our first UI component, we're going to focus on our player's health and adding this as part of our HUD.

For our player's health. As our player takes damage or heals, we'd want to update our HUD to reflect that change in our player's health. Now, for our game, we'll want our HUD to always be visible to our player when we're playing our game. And currently, how our game scene is set up, our world scene is quite bigger than what we currently show on our camera. And as we move our player around our level, we're updating our camera's position.

And for our HUD, we're going to want this to be in the same location no matter where our player's at in our world. Instead of creating a component where we need to constantly update its position relative where our cameras at in our scene, we're going to create a new phaser scene to display our HUD. By creating a new phaser scene, we can run both of our scenes in parallel. And what this allows us to do is we can keep running our game scene, and then we can layer our UI scene on top of this where we'll display that HUD. By doing this, we don't have to worry about updating our camera in our UI scene.

We can leave that in a constant location and then that way our HUD information will always be visible. And so with Phaser, we have the ability to run multiple scenes at the same time. And we're going to rely on that functionality to create our UI. So to do this, we need to make a new scene in our game. So let's go into our scene keys.

Let's copy our line of code for our game scene. And we're going to call this new key UI scene. Let's update our value. Now, let's make a new file under our scenes folder, and we're going to call this UI scene. I'm going to go into our preload scene.

I'm going to copy our code from there. I'm going to paste that into our UI scene. Let's remove our code for create for create animations. And let's remove our code from our create from our create method. We won't need our preload method.

Now, we just need to update our class name. And so, we're going to UI scene. And after our scene keys, let's do our UI scene. So, now we created our new scene. We need to update our phaser game configuration to be aware of the scene.

So if we go into our main. ts file, let's copy our line of code where we add in our game scene. Let's update our reference. So we have our UI scene. And now let's reference our new class.

And so now for the time being in our UI scene in our create method, I'm just going to do console. log and we'll say scene is running. So now when our game refreshes, we should notice no change in our game play. What's currently happening is when we create our phaser game configuration, we're starting our preload scene and after we load in our assets, we're jumping right over to our game scene. Even though Phaser's aware of our UI scene, we've not actually started this scene uh from our game.

So, what we'll want to do is in our game scene, after we finish setting up our level, we'll want to launch our UI scene and then that way we can start adding in our HUD. To do that, let's go into our game scene. Let's go to the bottom of our create method. our create method. After we do our register custom events, now we want to start our UI scene without stopping our game scene.

To do that, we'll use the launch method on our scene manager, which allows us to run another scene in parallel to this scene. we'll do this. Let's reference our scene manager. We'll use our launch method. And now we need to use the key of our scene we want to launch.

So, let's do our scene keys. We'll do our UI scene. And now, if we save, our game should refresh. we should still be able to navigate around our dungeon. And now we'll see in our console log, our UI scene is up and running.

And so to see an example of where we're going to render out our game object and see both of our scenes at the same time, we're just going to add a quick shape. So let's do this add. We're going to do a rectangle. Let's do 50 for our X and Y. Let's do 100 for our width and our height.

And for our color, let's do 0x 0 FF 0. So we're going to add in a green rectangle. And for alpha, let's do one. now if we save over in our browser, we're going to see right away now we have this new object appearing in our game. So what's happening is we're running both of our scenes at the same time.

But because we started our UI scene after our game scene, it's going to be higher in our render list, which means it's going to display on top of our game scene. So, what's happening is our player can still navigate around our dungeon, but because that game object's in a completely different scene, it's going to display on top of our current level. So, as an example, if we update our alpha, let's change this to be 0. 6. And so, we'll see right away we're rendering out both of our scenes.

And because our game object is transparent, we can see through this scene to our scene that's under it, which is our game scene. scene. So, now that we have our UI scene up and running, let's clean up our rectangle game object, and we're going to work on adding in our HUD to display our player's health uh in our game. So, now for our player's health, we need to take our health information from our data manager and convert this into a number of hearts we want to display in our screen. So, currently for our game, we have this asset under our assets folder, images, HUD.

We have this heart and HUD numbers uh PNG file. And this is a spreadsheet that has our hearts that are going to represent our health. Now, typically in Zelda games, you'll have a full heart when your player has taken no damage. And once they get hit one time, we would update our heart to show half a heart. And when they get hit a second time, we would then show an empty heart this.

And so, how this will work for our game is we're going to take our player's current health, and so it's set to six, and we're going to divide that by two to figure out how many hearts we need to display in our HUD. And so every two points of health our player has, we're going to display a heart inside our HUD. To start adding our game objects, first we're going to create a container that's going to house all of our game objects that we add to our scene. By placing all of our game objects in a container, now we can control where they're positioned by just updating the position of our container game object. And by adding all of our game objects to a container, it's also going to allow us to hide our game objects when we need to.

So later on if we add in a UI scene to represent our inventory, typically we would hide our HUD information while we display our inventory screen to our player. To keep track of our HUD, we'll add a new property to our class. So we're going to call this HUD container. This is going to be a phaser, our game objects, and then our container game object. So for our player's health, because we'll be updating our hearts based on our player's health when we take damage, we need to keep track of those game objects.

So let's add a new property. We're going to call this hearts. Now, this is going to be a phaser, our game objects, and this is going to be our sprite. And we want to do an array of these sprites. So, now down in our create method, let's create our container.

So, we'll do this and do our HUD container. It'll be equal to this add container. For our position, let's do 0 0. And we'll do an empty array for our children. Next, let's initialize our hearts array.

And we'll set it equal to an empty array. Next, we need to work on creating our heart game objects and adding these to our HUD container. So, typically in Zelda games, when you first start your game, your player is going to have three hearts. As our player progresses through the game, they can eventually reach a max capacity of 20 hearts. And our player can earn hearts by defeating bosses in our dungeon, which would give them a full heart.

Or they can find heart pieces. And when they collect four of these heart pieces, this would equal a new heart that gets added to their health bar. And so for our HUD, we'll want to make sure we can display this number of hearts uh to our player. And so to get started, let's do a for loop. So we're do four.

We're going to do let I equal zero if I is less than 20 since that'll be the max number of hearts we can have. Then we'll increment I. And now inside our loop, we'll want to create our heart game object and dynamically calculate our X and Y position of where we want to place this in our HUD. So first, let's make a variable for our X value. So for x, we're going to set this equal to 157 + 8 * i.

And now for our y value, we're going to set this equal to 25. And now we'll do if i is greater than or equal to 10, then we'll update our x and y values. So now our x value is going to be equal to 157 + 8 * i - 10 and y will be equal to 33. be equal to 33. So, in classic Zelda games, typically when we display our hearts in our HUD, we're going to have 10 hearts in one row, and then we'd have a row below it that would have another 10 hearts.

And that's what we're doing with our code here for our X and Y position. If our index of our heart is greater than or equal to 10, we know our heart's going to be on our second row. And so, we need to reset our X position by subtracting 10 from our I. And then, we're updating our Y position to have a lower value than our first row. So now that we have our X and Y position, we can create our heart game object and add it to our hearts array.

So we'll do this. We'll do our hearts. Let's do push. Now in our array, we want to do this. We're going to do add.

We're going to do a sprite game object. We'll add in our X and Y value. Now for our asset keys, we're going to do our HUD numbers. And so now we need to do our frame. And for our frame, let's do our heart texture frame.

And we're going to do a full heart for the time being. Now we want to update our origin. So let's do set origin. We're doing in the top lefth hand corner. So we'll do zero for our X and Y.

And after we create our heart game objects, now we want to add these to our container. So we're going to do this our HUD container. We're going to do add and we'll do our hearts array. So now we save and our game refreshes. We should now see our 20 hearts added to our UI scene.

Now that we have our heart game object showing up in our HUD, we now need to connect this to our player's health from our data manager. For this, we'll need to take our player's max health and use that to calculate how many hearts should be showing up in our game. And then from there, figure out how many hearts should be filled in versus empty or if one of our hearts should be a half a heart. To add in this change outside our for loop, first let's calculate how many hearts we should actually have in our game. So do const.

We're going to do number of hearts. We're going to set this equal to math. We're going to do floor. Now, let's take our data manager. We're grab our instance.

We'll grab our data. And now, let's take our max health and we divide it by two. So, for our player's health, we want two points of our health to equal one full heart. So, when we calculate our number of hearts, we want to make sure we round to our next integer so we show the correct number of hearts. So now that we know the total number of hearts we need to display in our HUD, we can use that to figure out which frame we want to show in our heart game object.

So for our heart game objects, we have four different frames, none, full, empty, and half. Our full heart is what we're displaying right now. When we display a half heart, that's going to show our full heart, but it's going to be halfway filled in. And when we show empty, this is just going to be an empty heart with no red inside it. Now, for our total number of hearts, we're going to want to use our none frame, which will cause our game object to appear not to render.

And so, we're going to need to take our number of hearts and compare that to our I index to know if our frame should be set to none or not. To keep track of this change, let's make a new variable for our frame. And so, for our type, this will be a string. By default, we'll set it to our heart texture frame, and we'll do none. And now we want to check our IE index, compare that to our number of hearts.

And if it's less than our number of hearts, we know we need to show a heart in its spot. So what we'll do is we'll update our frame. And we're going to set it to be equal to our heart texture frame. And we'll do our full heart. So now when we create our game object, let's update this to use our frame variable.

Let's save. And now we should see right away we now have three hearts in our HUD. And so if we want to verify our logic's working, let's jump over to our config file. Let's update our player starting max health. If we set it to 10, this should now give us five hearts.

If we set it to 20, we should have our 10 hearts. And now, if we set it to like 24, we should have our 12 hearts. And so, if we set this to a number that's in between, like seven, we should only render out our full number of hearts and not have our half a heart. All right. So, it's going to reset our player's health back to six.

And let's come back to our UI scene. Next, now we need to calculate how many of our hearts should actually be filled in. For this, we need to take our player's current health to know if our heart should be a full heart or empty heart. For that, we'll make a new variable. Do const.

We'll do number of full We'll do number of full hearts. For this, we're going to do the same type of logic, but instead of referencing our max health, we want to reference our current reference our current health. So, now that we know our number of hearts that need to be filled in, we can update our logic down here for our frame. So, when we set our frame to our full heart, we'll actually want to use our number of full hearts variable. And now we can do else if if I is less than our number of hearts then we can use our empty frame.

So let's copy this line of code here. Let's paste it. Let's update this to be empty. And now we'll save. And so if we want to test our changes, let's go into our data manager.

So in our data manager when we're setting up our initial values for our health, let's update our max health. We're going to set this to be 20. And let's update our player's current health. We'll set that to be 20. All right.

So after we save, we should see our 10 hearts. If we update our current health to be 10, what this should do is this should give us five full hearts and then five empty hearts. And if we update to be four, this should give us two full hearts and the rest of our hearts should be empty. And if we update this to be something three, what we would expect is we need to have one full heart and one half a heart. So now we'll need to update our code to account for that.

So if we come over to our UI scene to figure out if we should have half a heart or not, we just want to take our current health and divide it by two and then see if we have a remainder. And so to do that, let's make a new variable. Do cons. We'll do has half a heart. We're going to set this equal to our data manager, our instance, our data, our current health.

And so now see if we'll have a remainder. We'll use percent and we'll do two. And if this equals one, then we know we have our remainder. So now down here when we update our frame. So we'll do do if half heart and I equals our number of full hearts.

Then we want to update our frame for that last heart to have half our heart. So let's copy this. We'll paste it and we'll do our half heart frame. So now when we save and our browser refreshes, we should see we have one full heart and we should have half a heart here. So, we jump over to our data manager.

If we update this to be nine, we should have our four full hearts and one half heart. And if we do 19, we should have our nine full hearts and then our half a heart. And just to make sure our logic's working for both of our rows, let's add in 40 for our max health. We'll see. We add in our other hearts.

Let's make this 24. Should have our two full hearts down here. Now, if we make it 25, we should have our two full hearts and our half a heart. Nice. now we've verified our changes, we'll want to update our data manager to refer to our configuration for our max health.

Now that we have our HUD displaying our player's current health, we need to add a way for our UI to react to when our data manager when our player's health there changes. For this, once our player takes damage and we update our data manager, we're going to emit out an event that our health has changed. This will allow us to do different things in our game, like play a sound effect when our player heals or they take damage. It'll allow us to listen in our UI. So now we can update our hearts to reflect our player's current health.

So to add in this event, let's go into our event bus. So let's add a new event type. We'll call this player health player health updated. Let's copy our key. We'll make that our value.

And so when we go to emit this event, we'll want to know what our player's current health is and what our health is changing to. We'll also want to know if it's an increase or decrease. And then that way from our UI, we can have our animation for our hearts being taken away or our hearts being added if we're healing. To keep track of that, we'll add a new type. So let's do export type.

We're going to call this player health updated. Set this equal to an object. And so we'll have our current health. This will be a number. We'll have our previous previous health.

And now we'll need to know if it's an increase or a decrease. And so we'll just do type. And we'll make a new type for this. So let's do player health update update type. Let's add that type to our code.

We'll do export type our player health update type. And for this we'll make a new object. So let's do key of type of and we'll do player health update update type. Let's make that object. So we'll copy this.

We'll do export const. Our player health update type we'll set equal to our object. We'll do as const. And now for our keys and values we'll do increase and decrease. Now that we have our new event, we'll want to emit this from our data manager.

Let's jump over there. We'll go into our update player current health method. And so, now before we update our current health, we're going to see if our new value is greater than or less than our current value. And then we'll emit out our new event. So, first, let's just check to see if our health is the same.

And if it is, we won't change anything. if our health is equal to our data, our current our current health, then we'll return early from our method. To keep track of it's an increase or decrease, let's make a new variable. We'll do health update type. We'll add our type.

So we'll do health update type and we'll set it to default to be default to be decrease. And now we'll do our checks. We'll do if our health is greater than our data, our current health, then we know it's an increase. So we'll update our health update our health update type. Now that we know our type, we can emit out our event.

So let's create our object for our data we want to pass. And we'll do const data to we'll do const data to pass. For our type, we'll do our player health updated. We'll set equal to our object. So now we'll have our previous health.

So we'll do this our data our current health. Now we'll do our new current health. We're going to set it equal to our health that was passed in. And now we'll have our health update type. And now we can emit our event.

Let's reference our event bus. Let's do emit. Do our custom events. Let's do our player health updated. And now our data that we want to pass.

Now that we're emitting our new event, we need to listen for this in our UI scene. So, let's jump back over there. At the bottom of our create method, let's add in our event listener. we'll do our event bus. We'll do on.

Let's do our custom events. We'll do our player health updated event. And now for our listener, we'll make a new method. And so, we'll do this. And we'll do update health and update health and HUD.

Pass in this. And now we'll want to listen for when our scene's destroyed. we can clean up our event. So, we'll do this. Our events we'll do once.

So we'll do our phaser, our scene, our events, and we'll do shut down. So now in our callback, we'll want to turn off our event listener. So let's copy this. We'll paste it. Let's do off.

And now we want to add that method to our class. So let's do public. I'm going to copy our method name. Let's paste it. now for our method, we'll get one argument.

This will be our data. And now this will be our player health updated object. For our method, we won't return anything. So we'll do void. now inside our method for the time being, let's just do a council log and we'll log out data.

So now if we want to test our changes, we'll need to have our player take damage. So if we move over to our next room, let's have our player collide with one of our wisp. And once they do, we should see our new event get logged with our previous health, our current health, and which type it was. And as we keep taking damage, we'll see our event keeps getting logged. Now that we verified our event is working, we can now use our data in our event to update our HUD to show the damage that our player just received.

To do this, we'll need to use our previous health value to figure out which index we need to start out in our hearts array and then from there update our hearts to have the relevant frame. With how our health is currently set up, when our player takes one point of damage, they're going to lose one half of their heart. If they take two points of damage, they would lose a whole heart. And so now this would become an empty heart. So to add in this logic, first let's add in our animations that we'll need.

So let's open up our preload scene. Now down in our create animations method to add our animations, these were created from a sprite. So let's copy our line of code here where we create our player animations and we'll update this to be our asset keys and we want to do our HUD and then our numbers. So now that we added our animations, let's jump back to our UI scene. In our method, let's get rid of our console log.

So now in our method, the first thing we'll do is we need to check which type of health change this is. If it's an increase, we'd want to do an animation where our hearts get filled up. And if it's a decrease, we'd want to do an animation where our hearts start to empty. For our current game logic, we don't have a way to have our player heal. And so, for the time being, we'll just return early from our method.

So, let's do if we'll do our data. Let's do our type. We're going to set this equal to our player, our health update type. If it's an increase, let's return early. And so if it's a decrease, now we need to figure out how many hearts we need to remove from our UI.

To do that, we need to calculate our health difference. So let's do const. We're going to do health going to do health difference. We're going to set that equal to our data, our previous health. We're going to subtract our data, and then our current health.

So now that we have our health difference, we can figure out how many hearts we need to update in our UI. So if we take one point of damage, we need to grab this last heart here, and we'll play an animation for the sprite. So that way we animate down to half a heart. If we took two points of damage, we need to grab that same object, but then instead of doing just our animation to half a heart, we want to do our animation to lose a whole heart. Now, if our player took more than two points of damage, so if they took three, we actually need to grab both of these sprite game objects.

And we need to play an animation to have this heart go to empty, and then this one go to half a heart. And likewise, if our player took four points of damage, we need to grab both of these and then update both of them to do the animation to be an empty heart. So now adding these changes, we're going to need to create a loop in order to create all those animations. So let's do four. We're going to do let I equals zero.

If I is less than our health difference, then we know we need to update one of our hearts. And now we'll increment i by one. So now in our loop, we need to figure out which index we need to start our animation at. Now, as we're losing our hearts, this index is going to be updated. And so, we'll need a way to keep track of where our health is currently at.

So, let's make a new variable outside our loop, and we'll do let health, and we'll set it equal to our data, and then our previous health. where we're currently at before we do our animations. And now, inside our loop, to grab that index, we'll do const. We're going to do our heart index. We're going to set this equal to math.

Round. Now, we want to take that health value. We're going to divide it by two and let's subtract one. All right. So, what we're doing here is we're taking our current health and right now it's set to six.

And so, if we lost a point of damage, our previous health would be set to six. And so, this will give us our calculation of three. And then from our array to find this index, we need to subtract one since we start at zero cuz we have 0 1 2. So, now that we know our index, now we need to know if we're currently at half a heart or not. And if we are, we'll play an animation for losing our last half of our heart.

If we have a full heart, we'll do a different animation. So let's do cons. We'll do is half heart. We're going to set that equal to our health. We're going to see if we have a remainder when we divide it by two.

And if that's equal to one, then we know it's a half heart. Now we can figure our animation name. So let's do let we'll do our animation name. We're going to set this equal to our heart animations and we'll do lose last half of our heart. And now if it's not a half heart, then we want to do our other animation.

And we'll set this equal to our heart animations that we want to do lose our first half our first half our heart. So now that we know the index of our game object that we need to play our animation for, and we know our animation name, we can play our animation. So now we can reference our hearts array. We'll use our heart index that we grabbed. Now we'll use our play method to play our animation.

And now we'll pass in our animation name. And after we play our animation, now we just need to update our health value. And so we'll decrement it by one. So now if we want to test our changes, let's go to our next room. If we have our player collide with one of our wisp, we should see that our heart gets updated to have half a heart.

And if we take a second point of damage, it's now empty. Nice. Now that we verified our logic's working and we take one point of damage, we'll want to test if we take more than one point. So, if we jump over to our game scene, if we come down to our register colliders, when we have our collision between our player and our enemy group, we have our player take one point of damage. Let's update this to have our player take two points of damage.

Now, if we come back to our browser, let's have our player go into our room with her wisp. If we have our player cl with our wisp, we'll see now we're doing our animation where we lose our full heart when we take two points of damage. So, let's update our logic. We're going to have our player lose three points of damage. So, now if we have our player come back to our room with our wisp, if we have our player collide, we'll see we take our three points of damage.

And so, now we have this animation where all of our hearts are playing at one time. Instead of doing that, we'll want to update our animations. So, we'll play them one at a time, and then that way we have this very nice, smooth animation. To do that, we'll need to go into our UI scene and we'll need to wait until our animation is done before we move to our next iteration on our loop. And so to have our code wait until our next iteration, we're going to update our code here to use a promise.

By adding in a promise, we can wait for that promise to resolve before we update our health and then go to our next iteration. To allow us to wait for our promise to finish, we'll update our method to be async. We'll update our return type. So now we want to do a promise and we want to do a promise void. So now down here in our code, we can do a wait.

Let's do a new promise. Now for our new promise, we want to do a want to do a resolve. Now inside here, this is where we'll do our we'll do our animation. So now after we play our animation, now we can wait for animation to finish. So I'm just going to copy our line of code.

We'll paste it one more time. And so once we have our game object, now we're going to use our once method to allow us to add an event listener. And we'll do our phaser. Let's do our animations. We'll do our events.

We'll do our animation complete key event. And now we want to listen for our animation name that we're playing. And now in our callback now we'll resolve our promise. And so we can just resolve undefined. And so now if we come back to our game, let's go into our room with our wisp.

And now when our player collides with our wisp, now we play this nice smooth animation where we update our hearts one at a our hearts one at a time. So now we're done testing. Let's jump back to our game scene and we'll reset our damage that our player takes when we play with our enemies. Now that we've wrapped up our UI component for our HUD and our player health, we're going to start working on updating our game over state. Currently in our game, when our player dies, we play our death animation for our player and then we fade our camera out to black and we restart our existing scene.

Instead of just restarting our existing scene, we're going to add a new phaser scene that we'll transition to. And here we'll display a message that says the game is over. And we'll give the player the option to continue their game which will then transition back to our game scene or they could quit. Then later on this could be connected to like a main menu or a title screen. So to start working on this component first we need to create our new phaser scene.

So let's go into our scenes folder. Let's make a new file. We're going to call this game over over scene. For this I'm going to go into our UI scene. I'm going to copy our code from here.

I'm going to paste that into our game over scene. Let's get rid of our method for updating our health. And then let's get rid of all of our code inside our create method. Let's remove our properties from our class. Now we'll update our class name.

So we'll do our game over scene. Now we need to add this to our scene keys. So going to our scene keys. Let's do game over keys. Let's do game over scene.

We'll jump back to our new class. We'll update our scene key We'll update our scene key reference. And now we need to add this to our phaser game configuration. So if we go into our main. ts TS file.

Let's add our new scene. So, I'm going to copy this line of code here. We'll paste it. Let's reference our game over scene. Now, update our scene key to be game over scene.

Now that we've added our scene to our configuration, we can update our game scene to transition to our new scene. Let's remove our code here where we restart our existing scene. And we'll do this. We'll do our scene manager and we'll do start. And now, we want to do our scene keys and we want to do our game over scene.

So now if we want to verify our logic's working, let's jump over to our config file. Let's update our player starting health. We'll update to be one. So now if we go to our next room, let's have our player collide with one of our wisp. Now our player should die.

We should do our animation. And now we should transition to our next scene. All right. So now we verified our scene transitions working properly. We're going to update our preload scene to transition to our game over scene while we're working on it.

So then that would be easier to test our changes. So if we go to our create method, let's update our start method here and we're going to point to our game over scene. So now when our scene refreshes, we should just see our black screen. So now for our game over scene, we're going to display a menu to the player that's going to allow them to choose to either continue their existing game or they could quit. When they choose continue, we'll use this as our trigger to go back to our game scene.

So our player can continue playing the game. And if they do quit, this would be the trigger to allow us to save our game data and quit back to our main menu. For our game, since we're not saving our game data, we're going to do a hard reload of our browser, which will simulate that we're erasing our existing data for our current session. And so now to create this menu, we're just going to use some basic text game objects. And we're going to add in an icon that'll be our cursor.

And we'll need to listen for our keyboard input. So then that way we can navigate our cursor up and down in our menu. So to get started with our changes, first we'll add a text game object that just says game over to our scene. So for this, let's do this. We'll do add.

We'll do text. And now for our text, we want to center it. So we'll do this. We're going to reference our scale manager. Let's do our width.

We'll divide it by two. And now we'll do 100 for our Y value. And now for our text, we just want to say game over. And now we want to do our text we want to do our text configuration. So now for our text, we'll want to align our text in the center.

Center. For our font family, we'll want to do our asset keys. Our font, our press start 2P. So, our custom font we're using for our game. Now, for our font size, we're going to do eight pixels.

We're going to enable word wrap. And so, for our word wrap, we're going to set this to be our width. We'll do 170 for our pixels. And now, for our color, we're going to do white. So, we'll do color.

Now, for our string, we'll do fff fff. Finally, for our text, we'll want to update our origin. So, we'll be in the center. Then that way our text will be centered in our screen. So now for the menu we'll want to add we're going to need to add three game objects.

One will be our icon for our cursor and then the other two will be our text game objects. So our text for continue and quit. In order to keep our objects aligned, we'll place these inside a container. So at the top of our class, let's add a new property to keep track of that. And so we're going to do menu container.

This will be our phaser, our game game objects, then our container. While we're here, let's add in a few additional properties. And so, we're going to need to keep track of our cursor game object. that way we can update our position as we provide our keyboard input. So, let's do our cursor game let's do our cursor game object.

For this, we're going to use an image game object. So, we'll do our phaser, our game objects, phaser, our game objects, image. Next, we'll need to handle our input. So, for our input, we'll be using our keyboard component. So, let's add in controls.

Controls. So now for our type, we'll do our keyboard component. Then finally for our menu, we'll need to keep track of which menu option selected. And so we'll add a new property. And we'll call this selected menu option selected menu option index.

And this will be a number. All right. So now we have our new properties. Let's create a new container. And we'll add in our game objects for our menu.

So after we create our title text, let's reference our menu container. We're going to set that equal to this. We'll do add. We'll do a container. So now for our position, we'll do 32 for X.

We'll do 142 for our Y. And now let's add in our array of our game objects. So now for our container, we'll want to add in our two text game objects. So we'll do this add text. Now for our text, let's do 32 for X position.

We'll do 16 for our Y. And we'll do continue for our text. And now for our text style. For now, let's just do an empty object. And now let's call set origin.

We're going to make sure we place this in our top lefthand corner. Let's copy that line of code. And now we'll do our quit text. So we'll do the same X position. For our Y, we'll do 32.

Now for our text string, we're going to do quit. And now when we save, we should see our new container has been added with our text. So now for our text, we'll want to use the same styling that we're doing for our game over text. So let's copy our font styling object here. We're going to move this to a new variable so we can reuse it.

So let's do const. We'll do menu text style. For our type, we're going to do our phaser, our types. We'll do our game objects, our text, and now we want to do our text style. So now we'll set that equal to our object.

So now we can copy that variable. Let's update our game over text game object to use that. And we'll do the same thing down here for our continue and our quit our continue and our quit text. So now we have our two text game objects. We're going to add in a border around our menu.

And so that way it'll stand out. So inside our menu container, let's do this. We'll do add. Let's do an image. Now for our position, we'll do 0 0.

Now for our asset, we want to do our asset keys. And let's do our UI dialogue asset. We'll do zero for our default frame. Let's do set origin and place this in the top lefthand corner. Now, if we save, we have this nice border around our text.

Now, let's create our game object for our cursor. So, outside our menu container, we're going to do this. We're going to reference our cursor game object. We're going to set this equal to this add. We'll do an image game object for position.

Let's do 20. We'll do 14 for our Y. Now do our asset keys. We want to do our UI cursor. Do frame zero.

Now let's update our origin. We'll set it to be zero. So it's top left corner. And now we want to add this to our container. So we'll do this.

We'll do our menu container. Let's do add. Let's do our cursor game object. Now that we have our new cursor, now we need to listen for our input so we can update its position. For this we'll need to create a new keyboard component.

So let's do this. We'll do our controls. We're going to set equal to a new keyboard component instance. And now we need to grab a reference to our keyboard plugin. So we're going to do this our input.

And let's do our keyboard. And now we'll add our safeguard to our create method to make sure this actually exists. And so we'll do if not this our input, our keyboard. Then we want to return early. Finally, we need to add our initial value for our selected menu option index.

So for this, we'll do our selected menu option index and we'll set it to be zero. Now that we have our keyboard component, we need to add in our code to check to see if one of our keys is being pressed. And if it is, we'll update the position for our game object. For this, we'll add in our update method. So we'll do public.

Let's do update. For our method, we won't do any arguments. We won't return anything. So now in our update method, we're going to want to listen for our keyboard input for up and down keys. When our up or down key is pressed, we're going to want to update our selected menu option index.

This index is going to keep track of which text game object we're currently selecting. By default, our index is zero. So our continue option here. And so if we press our down key, we'd want to update our index to be one. And then that way our quit option would be selected.

If we press the up key after quit is selected, we'd update it to be zero and come back to continue. Finally, we'll add a safeguard to make sure we stay within the bounds of our available menu options. And so if we already have our continue option selected, if we press our up key, we'll keep our index set to zero. So now to add in that logic, let's do if we'll reference our controls. And now we're going to check to see if our up key was pressed.

So is up key is up just down. When our up key is pressed, we'll do our selected menu option index. Let's decrement it by one. Now we'll add in that safeguard. So if our selected menu option index is less than zero, we're going to reset it back to zero.

Now we'll want to add in a similar check for if our down key is pressed. Let's copy this block of code. We'll do else. We'll do else if this control is down just down. Now we want to increment our our index.

And now if it's greater than one, we want to reset it back to one. Then finally, if neither our up or down key was pressed, we just want to return early. So after we've updated our index, we can now use our index to update our Y position for our cursor game object. So let's do this. We'll do our cursor game object.

We're going to do set Y. And now we're going to set it equal to 14 plus this our selected menu option index. And we're going to multiply it by 16. All right. So now if we save, we should test our changes.

So now if we press our up key, we'll continue selected. Nothing happens. If we press our down key, we move down to quit. If we press down, nothing happens. And now we can navigate back and forth between our options.

Finally, for our game over menu, now we just need to add in logic to handle when our player chooses one of our options. for this, at the top of our update method, we're just going to check to see if our player presses our action, our attack, or our enter key. If they press any of those, then we know they chose one of our options. So we'll do if let's reference our controls. We'll do is action key just down or this our controls is attack key just down or this controls is enter key just down then we know we selected one of our options and we can return early from our method and then inside here we'll just want to check which menu option was selected and then based on that we'll go back to our game scene or we'll refresh our browser.

Let's do if our selected menu option index was index was one. And so if our selected menu option is one, that means they chose our quit option. And so this would be our point where we want to save our game and then take our player back to our main menu. for our game, since we don't have our title screen, we're just going to reload our browser, which would have the player restart our game. And so we're going to do window.

We'll do our location. Let's do location. Let's do reload. And then we can return early. And if they didn't choose option one, then they chose option zero.

And that means they want to continue the game. And so now we want to go back to our game scene. So for this, we'll do this. We'll do our scene. Let's do start.

And now we just want to choose our game scene. And so let's do our scene keys. And we'll do our game scene. All right. now we want to test our changes.

Let's choose our quit option. If we press our attack key, our action key, or enter key, our browser should refresh. All right. All right. Now, if we choose our continue option, we'll see we start our game scene.

However, we have an error because we're not passing in our data to our init method. And so, if we want to test our continue logic, let's go into our preload scene. Let's update our scene to go back to our game scene. now back in our browser, let's have our player go over to our next room. Let's collide with one of our wisp.

We'll have our player We'll have our player die. Now, we'll come to our game over scene. Let's choose continue. We'll restart our game scene. Nice.

All right. after our player dies and we choose to continue our game, we'll see once we get back to our game scene, we're no longer displaying our player's health. What's happening is when our player died, our health was at zero. And after we got to our game over scene and we restarted, we never reset our player's health back to its minimum value. To fix this, let's go into our game over scene.

At the bottom of our create method, let's reference our data manager. We'll do our instance. And now let's do our reset player health to men method. Let's save. Now let's test our logic for continue our game.

So now if we have our player go up to one of our wisp, we should die. Our health is at zero. So now we transition to our game over scene. And now if we choose our continue option, we'll see once our game scene starts, our health is now reset back to our minimum value and is set to one since that's what we have for our config. All right.

So now that we're done testing our changes, let's come back into our configuration. Let's update our player starting max health back to six. Now that we finished creating our UI component for our game over state, we're going to work on adding a new component to our game. And this is going to be our dialogue component. Our dialogue component is going to be used for displaying messages to our player.

And how we're going to use it is when our player collects an item from our chest, we're going to show our dialogue modal and we're going to display information about the item our player just collected. This component we build will be reusable for our game. And then that way we can do other things like use this component when our player talks to an NPC or if there's a story event, we can use it for displaying what's happening in the game. And so now for this component, when we display it to our player, we're going to want to pause our current scene. So then that way our player can't move around our scene and our enemies won't be able to hurt our player while they're reading this message.

And so for this dialogue component, we're going to add this to our UI scene. And then that way we can display it in our UI and it'll always be displayed in the same location to our player. To start building our new component, let's jump over to our UI scene. For our new component, this will consist of a couple different game objects. The first will be our text game object with the message we want to display to our player.

And our second one will be a border or a background that will display behind our text game object. So that way we can easily read our text. To keep track of these game objects, we'll need to add a container to our class. So let's add a new property. And we're going to call this dialog dialog container.

So for our type, we'll have our phaser, our game objects, our container, and now we want to add one more property, and this will be for our dialog container text. So for our text, we'll want to be able to reuse that text game object and update the text string we want to display to our player. And so we'll need to keep track of that. So let's do dialogue container and we'll do our text for our type. We'll do our phaser, our game objects.

Now let's do our text game object. So now for create our game objects, let's come down to our create method. So after we create our HUD container, let's create a new dialog container. So we're going to do this. We're put our dialog container.

We're going to set equal to going to set equal to this. add. container. Now for our position, we're going to do 32 for our X. We'll do 142 for our Y.

And now for our child game objects, let's add in our background first. So we're going to do this. We'll do add. We'll do our image. Now for our position, we'll do 0 0.

We'll do our asset keys. And let's do our UI and our our UI and our dialogue. Do a default frame of zero. And let's do set origin. And we'll do zero.

So after we create our container, now we want to add in our text game object. So we'll do this. We'll do our dialog container text will be equal to this. add. ext.

And for our position, let's do 14 for our x, 14 for our y. And we're just going to write test for our initial string. And now we want to provide our font configuration. For now we'll do an empty object. And let's do set origin.

And let's do zero. After we create our text game object, now we want to add it to our container. So we'll do this our dialog container. Let's do add. And we'll add in our new And we'll add in our new text.

So after we save, we should see our new component show up in our game. And now we just need to update the styling on our text game object. All right. Okay, so for the text styling on our game object, we're going to want to use the same styling that we added to our text in our game over scene. So if we jump over to our game over scene, since we want to use that same styling across multiple scenes in our game, let's place this in our common folder.

If we go into our source or common, our our common. ts. All right, so let's paste in our text style. We're going to update our variable name and we're just going to say default UI text to say default UI text style. Let's do export const.

Let's update our imports to have our asset keys. Now, if we come back to our game over scene, let's copy our phaser import. We'll paste at the top of our common file. So, now back in our gameover scene, let's remove our menu text style. We'll update our imports in here.

And so, we'll have our default UI text style. Let's copy that. We'll update our references. So, now if we come back to our UI scene, let's update our text game object here to use that same style. Much better.

So now for our new component, we're going to want to hide this by default. So let's do this. We'll do our dialog container. We'll do visible. We're set equal to be false.

And now we just need a way to show our component to our player once our player collects one of our items from our chest. For this, we'll add a new event to our event bus that we can emit from our game scene. So let's jump over to our event bus. Let's add in our new custom event. We're going to call this show show dialogue.

And then while we're here, let's add in one more event. So once our player has read our dialogue, we'll need a way to actually close it. And so we'll emit an event from our UI when we close our dialogue so we can listen for that in our game scene. So let's do dialogue closed. Now if we come back to our UI scene, let's listen for our new event.

Let's copy this line of code here. Now for our event, we're going to call this show dialogue. We'll add in a new method for this. We're going to call this show dialogue. Let's copy this line of code so we can turn off our event listener.

We'll change this to be off. Let's copy our name. Let's come down to the bottom of our class. Now, let's do public. We'll do our show dialogue.

Now, when we call this method, we're going to expect our message that we want to display to our player. So, we'll add that as an argument. For our type, this will be a string. For our method, we won't return anything. And now, when we call this method, now we want to make our container visible.

So, we'll do this. We'll do our dialog container, our visible, we'll set it to be true. And now we want to update our text game object with that text. So we'll do this. We'll do our dialog container text.

Let's do set text. We'll set it to be our our message. So back up in our create method, let's update our text game object. We'll set our initial value to be an empty string. So now if we want to test our changes, let's go over to our game scene.

Let's go to our handle open chest method down in our twing configuration in our onmplate handler. Instead of having a time delay and then hiding our item, now we want to emit our event for showing our dialogue. So let's do our event bus. Let's do emit. Let's do our custom events.

We want to do show dialogue. And now we want to show a message about the item we just got. So let's do our chest. We'll do our contents. And then let's remove our logic here where we do our delay call and we hide our item.

So now if we want to quickly test our changes, let's go into our data manager. Let's update our starting room ID to be five and our starting door ID to be two. So now when our browser refreshes, let's open up our chest. Now our item will show up to our player. And now we show our dialogue component with our new component with our new text.

So now we just need to update our game scene so it'll be paused so our player can't move around. And then we'll need to listen for our event for closing our dialogue. So, we jump back to our game scene after we emit our event. Let's do this. We'll do our scene.

Let's do pause. So, we'll pause our existing scene. And now we'll want to listen for our dialog closed event. So, if we go to our method where we register our custom events, let's copy our line of code. Let's paste this.

And now we'll do our custom events. Let's do our dialogue closed. Let's make a new method. We're going to call this handle dialogue closed. closed.

Let's copy that line of code. Let's add it to our shutdown event and we'll change this to be off. Let's copy our method name. We'll come down to the bottom of our class. Let's add in that new new method.

So now this method, we won't return anything. So now in our method, we'll just want to hide our reward item. And then we want to resume our current scene. So let's do this. We'll do our reward item.

Let's do set visible. We'll do false. Now we'll do this our scene. We'll call the resume method. now before we test, we need to update our UI scene to emit out our new event.

Inside our show dialog method, let's do this. We're do our time. Let's do a delayed call. Let's do 3,000 milliseconds. Now in our callback, we'll hide our dialog container.

So we'll do visible. We're going to set it to be false. And now let's do our event bus. Let's do emit. And we'll do our custom events.

And we'll do our dialog closed. All right. So now we save. Let's come back to our browser. Let's open up our chest.

We'll see our game pauses. We display our message. After our 3 seconds, we hide our item and our dialogue modal. Nice. Now that we have our dialog modal working, we're going to update our text that we're displaying to our player.

Right now, we're just displaying our reward contents. And so, that's not very helpful. Instead, we want to display something like if you find a small key, we'd say, "Hey, you found a small key. You can use this to open a locked door. " Or if you get the map, you'll say, "Hey, you got the map.

You can use this to see your current position and the rest of the dungeon. And so to add in these custom messages, we're going to want to have a map of our reward contents to the custom message we want to display. So for that, if we come into our common file, let's copy our code for our dungeon item. We'll paste it. Let's update our object name.

And we'll call this chest reward to dialog map. And now for each of our rewards, we'll want to display our custom message. So, I'm going to paste over our messages we want to display. So, for our small key, we'll say, "You found a small key. You can use this to open locked doors.

" For our boss key, we'll say, "You got the big key. " This is the master key of the dungeon. It can open many locks that small keys cannot. For our map, we'll say, "You got the map. You can use it to see your current position and the rest of the dungeon with the key the player should press.

" And then for our compass, we'll say, "You found the compass. Now you can pinpoint the layer of the dungeon's evil master. " And now for our map, now we just need to add in when there's nothing inside our chest. And so we'll add in nothing. And now for this text, we'll just do dot dot dot and we'll say the chest was chest was empty.

So now that we have our new map of the text we want to display, let's jump back over to our game scene. So now let's go into our handle open chest method. Inside our method, instead of passing our chest contents, we'll want to reference our new variable. And so we'll do our chest reward to dialog map. And now for our key, we'll pass in our chest contents.

And now if we save, come back to our browser. If we open up our chest, we'll see now we have our map with our custom message. And if we try opening up our other opening up our other chest, we should see our new custom message for our compass show up. Nice. Finally, for our dialog component, there's one more change we need to make.

Once our player opens up our chest, they're still able to actually move around our map until we pause our scene. Instead, we want to lock our players input and keep them in our open chest state until we close our dialogue and then we want to go back to our idle state. To make that change, let's go into our open chest state. So now in our state, after we emit our event for where we open up our chest, instead of transitioning right to our idle state, we'll want to listen for our event for when our dialogue is closed and then transition our player back to our idle state. To do that, we'll do our event bus.

We'll do the once method. And now we want to listen for our custom events. And we'll do dialogue closed. And now in our callback, this is where we'll do our transition to our idle state. So let's copy that line of code.

We'll place it in here. Let's get rid of our to-do. So now back in our browser, if we have our player open up our chest, we'll see now our player stays in that state and they're not able to move around until after we close our dialogue. And now they can start moving again. Nice.

Now we're done testing our changes. Let's come back to our data manager and let's reset our starting room ID and our starting door starting door ID. With that last change, we've wrapped up our UI component section. In this part, we built the foundation for our HUD, dialogue system, and gameover screen. These components provide a solid base that we can extend later with new functionality such as displaying collected items in the HUD, allowing players to save and quit after dying, adding NPC interactions for conversations and quest, triggering storying events to enhance the game's narrative.

Now that we have a functional UI, it's time to introduce the ultimate challenge, our dungeon's boss enemy. Now that we wrapped up our UI section, it's time to move on to one of the most exciting parts of our dungeon level, the dungeon boss. This boss will be a unique and challenging enemy design to test the player skills and strategy. In typical Zelda games, dungeon bosses stand out with their own attack patterns, requiring players to learn and adapt in order to defeat them. Not only will this boss have more health than the regular enemies in the dungeon, but taking it down will signal the completion of the dungeon.

So, before we start building our new enemy class, let's go over our enemy states. For our boss enemy, when our player first enters into our boss room, our boss won't be immediately visible to our player. We'll start off in our hide state and after a small delay, we're going to transition to this teleport state. In the teleport state, the boss is going to appear to the player and then start teleporting around the room into one of three locations. And our boss will repeat this pattern for a small period of time before we transition to our pre-attack state.

In our pre-attack state, our boss is going to choose one of those three locations and then appear in that location and get ready to attack our player. We'll have a small delay. So, our player has a chance to react to our boss appearing before our enemy transitions to our attack state. In our attack state, our boss will attack our player by throwing daggers at our player in the dungeon. For our boss's attack, we're going to throw three daggers at our player, and our player needs to dodge those.

After our attack state, our boss will then transition to our idle state, where our boss will stand still and give our player a chance to attack them. After a period of time, our boss will transition back to our teleport state. And then we'll repeat this pattern. Now, during the fight, once our player actually damages our enemy, we're going to transition to our hurt state. And so, we'll have our enemy flash to show we took damage.

And then we'll transition back to our teleport state so our enemy can start attacking our player again. Finally, after our boss takes enough damage, we transition to our death state, and this will play a unique animation, and this would signal that our player's completed the dungeon. So, now that we've finished reviewing our enemy states, let's jump back over to our code and we'll start adding in our new class. So, now back over in our code, let's create our new boss enemy class. For this, let's go into our game objects folder.

We'll go under enemies. Let's add a new subfolder. We're going to call this boss. And then inside here, we'll add in our boss enemy, and we'll call this our DRO. All right, for our new class, let's copy our code from our WISP class.

We'll paste it in. We'll start off by updating our class name. And so, we'll call this DRO. Let's update our configs. So, we'll do drill config.

All right. Now, we'll need to update our imports. Uh, for this, I'm going to remove all of my imports except for the phaser import. I'm going to come down to one of our arguments, and I'm going to let my editor add those in. So, we're going to do add all missing imports.

And now we can update our class. So, for our class, let's start with our config. So, we're want to reference our draw config. And now for animation configuration, we're going to have three main animations. We'll have one for walk, hurt, and idle.

So, I'm going to copy this code here. I'm going to paste it twice. So, first let's do our walk. So, we'll have walk down. Then we'll have walk up, left, right.

So, I'm going to copy this. So, after walk, we'll have hurt. we'll have hurt down, up, left, and right. And then we'll have our idle animation. So now for our walking animation, let's copy our animation configuration here.

Let's paste this. And now for animation, we're going to do our draw animation keys. And now we want to do walk down and then walk up left and right. We'll want to do repeat to negative one. And we'll do ignore of playing.

Let's copy that object. And now we'll update our configuration for our walk. And now we'll have walk up. We'll have walk left and then walk right. Now for our her animation, we'll use our configuration up here.

So let's do our hurt config. Now for our reference, we want to do our draw animation keys. Now we want to do our hit animation. We don't want this one to repeat. And we'll do ignore of playing.

We'll update our references here. Now, we just need to do our idle animation. Uh for this, we'll have unique keys for each direction. So, let's copy our object. Let's update this.

Now, for animation keys, we're going to have idle down, and then we'll have idle up and idle have idle up and idle side. And for this animation, we'll want it to repeat, and we'll have ignore playing. We'll set to true. So, now down in our super call, we want to update our asset keys. So, we don't want to do our wisp.

We'll want to do our draw. We'll have frame zero. Let's update our ID. we'll do draw. And then our unique ID is player will be false.

Then we'll set is invulnerable. We want this to be false. And now we need to add in our config options for things like our speed and our max health. So, if we jump over to our config file. So, let's copy our settings for our wisp.

We'll paste those in. Now, for our variable names, we're going to do our enemy. We'll do boss. Let's do dr. We'll have our speed.

For our speed, we'll set this to be 80. Next, let's do our max health. So, let's copy our boss row here. We'll update our name. We'll have our max health.

For this, we'll set to be six. Now, for other properties, let's get rid of our scale X and scale Y. And now, we'll just update this property here. And so, we're going to need a property for our death animation and our duration. So, we'll update our name.

We'll do enemy boss row, and we'll do our death animation duration. For this, we're going to set it to 3,000 milliseconds. I'm just going to move that to the bottom below our health. Finally, for our enemy, we'll add in one more configuration option. And for our boss, we're going to have a custom push back for when our boss takes damage from our player.

Since our boss is much larger than our other enemies, we're going to have our boss only be pushed back a little bit further. And so, we're going to update this to be 50. And so, we're going to call this our boss hurt push back delay. So, let's jump back over to our class. And we can update our references.

So now we'll have our enemy, our boss draw speed, and then we'll have our enemy, and we'll have our boss draw max health. Now for our boss enemy, we'll want to add in our weapon component. So let's do this. We'll do our weapon component. We'll set that equal to a new a new weapon component.

We'll pass in our boss game object. Let's add this property to our class. Now, we'll want to add in our custom states for our boss enemy. So first, let's do our idle state. Let's copy that line of code.

We'll want to add in our hurt state and then our death state. Let's do our hurt state. So we'll pass in this. And now we'll do our boss hurt push back delay. Now we do our death state.

So we'll pass in our boss game object. And now we want to do our on die call back. And for this we're going to use this to do a custom animation for when our boss dies just what we do with our player. So first we want to make sure our game object is visible. So we'll do this.

We'll do visible. We'll set it to be true. Now we can use our flash function. For this, we'll pass in our game object. we'll do we'll do this.

So, once our flash animation is finished, we're going to have our boss disappear from our screen. And for this, we're going to use one of our special effects that are built into our Phaser game objects. So, for our Phaser games, if we're targeting WebGL, our game objects are going to have a bunch of utility functions for using our special effects. One of these is this wipe function here. And what allows us to do is we'll have this nice effect here where we can have our game object disappear from our screen with this wipe effect.

And so to use those effects in our code, we just need to make sure we're targeting WebGL, which we are for our game. So now to add in this special effect, let's do con. We're going to do FX. We're set equal to this. Reference our game object.

We're going to do our post FX. And now from our post FX, we're going to do add wipe. going to do add wipe. And now in our method now we can provide options to customize the effect that we're going to do. Uh this will be things for like our wipe width, the direction of our wipe.

So if we want to be up, down, and which axis we want it to be on. For our width, we're going to do 0. 1. We'll do zero for our direction. And then we're going to do one for our axis.

So now this will add our special effect to our game object. And if we want to create this nice smooth animation here, we need to use a tween to update that property. So now that we have our special effect, we're going to do this. We're going to do our scene. Let's do add.

We'll do our tween. Now for our tween configuration for our targets, we want to do our special effect. We want to set our progress to be one. And so we're going to start off at zero. And so our game object be fully visible.

And now we're going to tween it to one where our game object is completely wiped away. Now for our duration, we're reference our enemy boss row, our death animation duration. And now we'll do our onmplete. And so in our onmplete call back. Now we'll hide our game object.

And so we'll use that visible. We'll set it to be false. So now that we have our three states, now we want to update our starting state. And so we're going to start off in our idle state. And let's remove our custom logic here for our custom animation.

So now before we create an instance of our boss enemy, first we need to go into our preload scene and we'll want to add in our new animations for our boss. So now for our boss animations, these were created in a sprite. And so let's copy our line of code here. We're going to paste it. Now we'll do our asset keys and let's reference DRO.

And now we just need to jump over to our game scene. And now we can create an instance of our boss enemy. So let's go to our method where we create our where we create our enemies. And currently we have a to-do for when our tiled object type is set to three for we create our boss enemy. Let's get rid of our to-do.

Now we can do const. Let's do our draw. We set it equal to a new a new draw instance. And now for our configuration. First we'll have our scene.

So we'll reference this. And now we'll have our position and this will be an object. So we'll have our X property. This will be our tiled object. Our X.

We'll have our Y. And that'll be our tiled object and then our Y. Now that we have our new boss enemy, we just want to add it to our enemy group. So I'm going to copy this line of code here. Let's paste it.

And now we'll add in our boss enemy. And now let's save. now if we want to verify if our boss is showing up, let's go into our data manager. In our data manager, let's update our starting room ID to be one and our starting door ID to be one. And now when our player appears in our boss room, we'll see our new boss enemy is invisible on our screen.

So now for our boss enemy, there's a few things we'll want to change. First, we'll want to update our physics body to be more aligned with the actual body of our game object, similar to what we did for our player. And secondly, our boss enemy is supposed to be big and opposing. And we're going to scale up our game object a little bit. So, if we jump back over to our draw class, let's come down to the bottom of our constructor.

First, we're going to scale up our enemy. So, we're going to do this. We'll do set scale. And now, for our scale factor, we're going to do we're going to do 1. 25.

And now, we'll want to update our physics body. And so, I'm going to jump over to our player class. And I'm going to copy our getter for where we grab our physics body. So, let's copy that here. Come back to our drill.

We'll paste that in. So, now we can do this. We'll do our physics body. Let's do set size. We'll want to do 12 for our width.

We'll do 24 for our height. And for center, we'll set to be true. And now let's do set offset. And now for our offset, we're going to reference our display width. We're divided that by four.

For our Y, we're going to reference our display height. We're going to divide that by four. And then we'll just subtract three. And now when we save, our boss will reappear. It's going to be larger than our player.

And now our physics body more accurately represents our boss. Finally, for our boss class, since we have our weapon component, we're going to want to add in our update method so we can call the update method on our weapon component. So, I'm going to jump over to our player class. I'm going to copy our block of code here for our update. Let's paste that down here.

Let's remove our colliding objects component. And now, let's save. Now that we have our boss character, we can work on building out our states for our boss fight. Currently, we set up our boss with our idol, our hurt, and our death states. Now, we'll need to add in the rest.

So, we'll focus on our hide and our teleport states first. So, when our player enters into our boss room, we'll update our state machine for our boss to start off in our hide state. Once we transition to this state, we're going to wait a small period of time before we transition to our teleport state. In our teleport state, our boss is going to start teleporting around to three different locations. He's going to do this for a set period of time uh before we transition to our pre-attack state.

To start creating our states, let's jump back over to our code. Let's go into our components, our state machine, our states folder. I'm going to make a new subfolder under character. We're going to call this boss. We'll make another subfolder.

We'll do draw. And now add a new file. We'll do boss draw our hidden state. So now let's open up one of our other state files. I'm going to grab the bounce move state.

I'm going to copy the code from there. We'll paste it over to our boss dro hidden state. I'm going to remove our code from our on enter method. I'm going to remove our imports. Let's update our class name.

So we're going to call this our boss dro hidden state. Let's fix our imports. So, I'm going to do add all missing imports. Now, for our state name, we'll call this hidden state. Let's copy that string.

Let's jump over to our character states. We'll add that in. While we're here, we'll add in our other states we'll need. And so, let's do teleport state and we'll do prepare attack state. All right, let's jump back over to our boss throw hidden state class.

All right, so when we trigger on enter method, first we'll want to hide our boss character. So, we're going to do this. We'll do our game object. Let's do disable game object. Now, we'll want to wait a brief period of time before we reenable our boss character and then transition to our teleport state.

So, let's reference our game object. We're going to do our scene. We'll do time. Let's do our delayed call. So, now we just need to do our duration.

Uh, for this we'll add to our config file, and we'll call this our enemy boss hidden state duration. Now, in our callback, we'll want to reenable our object. So I'm going to copy this code. We'll paste it. Let's do enable object.

And now we want to transition to our next state. So we'll do this our state machine. Let's do set state. And we want to do our character states. And we want to do our teleport state.

So now let's jump over to our config file. Let's copy our new config. Come to our enemy boss. We'll paste that in. For our hidden state duration, let's do 1,00 milliseconds.

While we're here, let's add a few more properties for our boss. We'll need for other states. So, I'm going to copy and paste that in. We're going to need a duration for our idle state before we transition back to our teleport state. we'll do our enemy boss idle state duration.

For this one, we're going to do our 3,000 milliseconds. Let's paste our line of code two more times. We'll need two more configuration options we'll use in our teleport state. So, we'll update our variable name. And so, we'll do our teleport state.

And this will be our initial delay. I'm going to copy this. We'll paste it. And now, we want our finished delay. want our finished delay.

So we'll do 150 milliseconds for our initial and we'll do 500 for our finished. And so we'll cover these once we get to our teleport state. So let's jump back over to our class. Let's update our imports and then let's save. Next, let's create our teleport state.

Under our boss drove folder, let's make a new file. We're going to call this our boss drow teleport state. I'm going to copy the code from our hidden state. Let's paste that in. now for our class name, we're going to do our boss dro and then we'll do teleport state.

Teleport state. We'll update our state name. And so we'll do our teleport state. So now when our boss enters our teleport state, we're going to have a list of locations where our boss can teleport to. We'll then have our boss start teleporting between those various locations for our set period of time before we transition to our next state.

To keep track of those locations, set a property to our class. We're going to call this our possible teleport possible teleport locations. For our type, this will be our phaser, our math, our vector 2, and we'll do an array. So now down our constructor, we're going to do this, our possible teleport locations. We're going to pass this in as an argument.

So let's copy this. We'll paste it. Let's add our argument. Now this will be the same type. So I'm just going to copy this from here.

So now when we enter on enter method, first we're going to make our boss enemy uh invulnerable so they can't take damage while they're in the state. let's do this our game object. We're going to grab our invulnerable component and we'll set invulnerable to be true. And now to start having our boss teleport between those various locations, we're going to use a timer event. So let's do const.

We'll do time event. We're going to set it equal to this. Our game object, our scene, our game object is in reference our time plugin. And now let's do add event. So now for our time event, first let's add in our delay.

So this will be the number of milliseconds we wait before we start triggering this event. And so this will be our configuration we added for our teleport state. So let's do our enemy boss. We'll do our teleport state initial delay. Let's add in our call back.

For the time being, we won't add anything. We'll add in the rest of our properties first. So, let's do our call back scope. Let's do this. And now, we'll do we'll do repeat.

And now, we want to repeat this event based on the number of possible teleport locations that we have. And so, we'll do this. We'll do our possible teleport locations. We'll grab our length of our array. We're going to multiply it by three.

So, we can repeat that. And then we'll need to subtract one since our repeat will be in addition to the initial call uh when our timer event fires. So now in our callback event, we'll want to check to see if we're finished with our timer event. And if we are, then we'll want to transition to our next state. To add that check, we'll do if our time event, we'll get our overall progress.

And so if our overall progress is equal to one, then we know we're finished with our event. And for that, we'll call a new method on our state. And so we'll do this. and we'll do handle teleport we'll do handle teleport finished. Let's add in that method.

So, we'll have our private method. We won't have this return anything. For now, we won't do anything. Then, we'll return early from our callback. If our timer event is not finished, now we want to update our game object's position to be based on one of our possible teleport locations.

So, for that, we're going to make a new variable. Do const. We'll do location. We're going to set that equal to this, our possible teleport locations. So now to choose a location, we're going to base that on the number of times that our callback has been invoked to keep track of that.

We can use our time event and we can grab our repeat count value. So now for our repeat count, because we're doing our length and we're multiplying it by three, that means we'll be out of the index for our array. So we'll want to divide this by three and get the remainder to know our index. Uh so we'll take our percent and now we'll do this, our possible teleport locations, and we'll grab our length. So now that we have our location, we can do this our game object.

We'll do set position. And then we'll reference our location. x and our our location. Not save. So real quick for our location, what we're doing here is we're taking our repeat count.

And this is going to be based on the number of times our time event has repeated. And on the first time we call our call back, our repeat count will be set to zero. Our next time will be 1 2 3 and four until we're finally finished. So what we're doing is we're taking the length of our possible teleport locations array. And for example, if we have three locations on the first time our callback's invoked, we'd have a repeat count of zero.

We'll divide it by three. So we have a remainder of zero. We'll use our first index. Then we'd have one. We'd have a remainder of one.

We'll grab that first index. Then two, we grab the second index. And then once we hit three, we'll have a remainder of zero. So we'll loop back to the beginning of our array. And we'll be back at index zero.

And so by doing this, it makes sure that our index stays within the actual bounds of our array. now down in our handle teleport finish method, once our boss is finished teleporting around our room, we'll want to hide our boss game object and wait a brief period of time. And then we'll want to choose a random location and have our boss appear in that spot. Then we'll transition to our prepare attack state. So let's do this.

We'll do our game object. Let's do visible. We'll set this to be false. Now we want to do our delayed call. So, we'll do our game object.

Let's do our scene. We'll do our time. Let's do delayed call. For our delay, we're going to do our enemy boss teleport state finish delay. So, now in our callback, first we need to choose where we want our boss to teleport to.

Let's make a new variable. Do con. We're going to do random location. We're going to set this equal to our phaser, our utils, our array. We'll do get random.

And now we're going to use our possible teleport locations array to get one of our values back. And now we can update our game object's position. And so we'll do set position. We'll do our random location X, our random location Y. And now we can make our boss visible.

And so we'll do this. Our game object visible be true. And now we want to make our boss vulnerable again. And so we're going to copy this line of code here. We'll set this to be false.

And now we just need to update our state. And so we'll do this our state machine. Let's do set state. And we'll do our character states. and let's do our prepare attack state.

So now we finished our teleport state. Let's add in our prepare attack state. So in our code, let's do our boss drow prepare attack state. I'm going to copy the code from our hidden state. Let's paste that in.

Now for our class name, we'll do our boss drow prepare attack state. We'll update our state name. And so we'll do prepare tax state. Now let's remove our code from on enter method. So now before we add in our code for our prepare attack state, we're going to work on testing our existing classes to make sure everything's working as we expect.

To test our logic, let's come back to our boss class. Let's go to our state machine. We'll want to add in our new states. So let's copy the code here for our idle state. We'll paste it three times.

First, let's do our hidden state. we'll do our boss, our drow, our hidden state. Now we'll do our prepare attack state. So we'll have our boss, our drow, our prepare attack state, and our teleport state. So we have our boss draw and then our teleport state.

So now for our locations, we're going to have our boss teleport between the center of our screen up here and then our two bottom corners down here. On those locations, let's do new a phaser, our math. Let's do vector 2. So let's do this our scene. Let's grab our scale manager.

We'll grab our width. We'll divide it by two. And we'll do 80 for our Y. I'm going to copy that line of code. Paste it twice.

And now for our other locations, let's do 64 for our X. We'll do 180 for our Y. And now for our other location. And now for our other corner, we'll do 192 for our X and we'll do 180 for a Y. Finally, to test our logic, we need to update our boss to be in our hidden state.

For this, we're going to use our enable object method, and we're going to extend this so that way when our player enters into our room, when we call our enable object method to show our boss, we'll set our state at that time. Let's come down to the bottom of our class. Let's add in public. We'll do enable object first. We'll call our enable object on our parent class.

Let's do super enable object. And now we need to set our state. So I'm going to copy our line of code here. Let's paste it. And now we want to go into our hidden state.

Now let's save. And now when our browser refreshes, our boss is invisible. And then we transition to our teleport state. Oh, so it looks like we have an issue. So in our teleport state, we're referencing phaser.

So let's add in that import. do import star as phaser from phaser. So now we save, our boss will be hidden. He'll start teleporting around our room until finally we choose one of our possible locations and we go to our prepare attack state. So now if we refresh, our boss should randomly choose one of those three locations.

Nice. So now in our prepare attack state, the purpose of this state is to allow us to do any setup we need before we have our boss actually attack our player. So, after a boss finishes teleporting around our room, we want our boss to attack our enemy with a new weapon type, and this is going to be a dagger. For our dagger, our boss is going to throw it at our player. For this to work properly, we'll want to have our boss face our player game object and then line up our boss to be on the same horizontal or vertical line as our player.

And so now to figure out which direction our boss actually needs to face. So we're facing our player, we're going to use our boss's position and compare that to our player's position. Now to do this, we're going to draw a vector between our boss game object and our player game object. And then based on that angle or the degrees of that vector, we'll know which direction our boss needs to face. So, as an example, how this will work is from our boss game object, we're going to have that be position 0, and we're going to draw a arrow or a vector from our boss to our player game object.

Now, depending on the angle of this vector, we'll know which direction our boss needs to face. So, as an example, let's say our player is to the right and down a little bit of our boss. So, when our player's in this position here, we'll want our boss to face to the right. So then we're looking at our player. If our player's position was over here, we actually want our boss to face down when we go to throw our dagger.

Likewise, if our player was up over here in this area, we'd want our boss to face up when we go to attack. And then if over here, we'd want our boss to face to our left. And so based on that, we can use our boss's position and compare it to our players to create that arrow or our vector to know which quadrant or angle we need to look at. And so to do that, we can draw this arrow between our boss and our player game object or our vector. And so once we have our vector, we can now calculate our angle of that vector to know which quadrant our player is actually in.

Uh so as an example, in our current vector right here, our angle is going to be less than 45° since that's what this line is here. Now, if we moved our player over here, our vector would be updated and now it's going to be greater than 45 but less than 90. than 90. So now, no matter where our player's at in our dungeon, we can calculate that vector between our boss and our player to get that angle. So what we can do with that information is if the angle of our vector is greater than or equal to 45 and less than 135, we know our boss needs to face down.

If it's greater than or equal to 135 and less than 225, we face to the left. Greater than equal to 225, less than 315, we need to face up. And then for any other value, we'd want to face to the right. So now to start adding in our logic, first we need to get a reference to our player game object. To do this, let's jump over to our game scene.

We're going to add a new getter that's going to allow us to get our player game object. So after our constructor, let's do get. We'll do our player. For our type, let's do our player. And we're going to return this and then our player instance.

So now back in our prepare attack state. First, let's get a reference to our player. So let's do con. We're going to do target enemy. enemy.

We're going to set that equal to this our game object. We want to grab our scene. And now I want to do as our game scene. Now we're do player. So now that we have a reference to our player game object, we can now create our vector.

So let's do const. We'll do vec is going to be equal to a new phaser, our math, our vector 2. And now we want to take our target enemy. We want to grab our x value. We're going to subtract our game object's current x value.

And then we'll do our target enemy. we'll do our y value and we're going to subtract our game object's y position. So now we have our vector 2. We can grab our angle uh from our vector. And so when we grab our angle from our vector, this is actually going to be in radians.

And so if we want to use our degrees, we'll need to convert our radians to our degrees or we need to update our logic here to use radians. For the time being, we're just going to use degrees. And so let's do const. We'll do radians. We'll set this equal to our vector, our angle.

Now to get our degrees, we're going to set that equal to phaser, our math, our radians to degrees. And now we can pass in our radians. And now that we know our total number of degrees, we can update our game objects position. So we'll do if our degrees is greater than or equal to 45 and our degrees is less than 135, then we need to face down. So we'll do this our game object.

We'll do our direction. We'll set equal to direction. Let's copy this block of code. Now we'll do else if. And so now we'll do if it's greater than or equal to 135 and less than 225.

Then we need to face to the left. Else if. Now if it's greater than or equal to 225 and less than 315, now we want to face up. Finally, we'll just face to the face to the right. All right.

Since we're referencing our phaser utility functions, we'll want to add our phaser import. I'm going to copy that from our teleport state. We'll add this the top of our attack state. And now after we set our direction, we can now transition to our attack state. So let's do this.

We'll do our state machine. Let's do set state. We'll do our character states. And let's do attack. Finally, to test our changes, we just need to add our attack state to our boss class.

Let's go into our drill class. Let's go to where we add our states. Let's copy one of our lines of code. We'll paste it in. And now we want to add in a tax state.

All right. Hey, so now if we save back over in our browser, our boss should teleport around our room and now it should face our player depending on our player's position and where our boss lands. Oh, it looks like we have an issue. Ah, yes. We'll need to update our boss's flip X property since when we have our boss face to the left or right, we're reusing the same sprite.

So, if we come back to our prepare text state, let's run our game object. We'll do set flip X. Let's do false. Now, let's copy that line of code. And when we go to have our boss face to the left, we're going to set flip X to be true.

So now if we save, let's have our player move around our room a little bit. Now when our boss appears and we face to our left, we're facing in the right direction. So now if we try to move our player over to the right, our boss should face to the right. And let's see if we can get our boss to face boss to face up. Nice.

Now that we have our boss facing our player, we just need to add in our logic to update our boss's position. So we'll be directly across from our player. How this will work is if our boss is facing up or down, we're going to update our x value. That way it'll be vertically across from our player. If our boss is facing left or right, we're going to update our y value.

So we'll be horizontally across from our player. So add those changes after we update our direction. Let's do if our game object if our direction is equal to our direction down or our direction up, then we'll update our x values. So, we'll do this our game object. We'll do set X and we're going to set it equal to our target enemy or our player, our X position.

Otherwise, we want to do our Y position. Let's copy this line of code. We'll paste it. We'll do set Y. And we'll do our target enemy, our Y position.

So, now if we save, our boss should now appear. And now it should be vertically or horizontally across from our our player. Nice. Now that we have our logic in place for our prepare attack state, we need to fix an issue with our boss where after we transition to our attack state, our boss doesn't do anything. So, what's currently happening is we're transitioning to our attack state and our boss doesn't have a weapon.

So, we're transitioning right back to our idle state. Now, our idle state is set up. So, we're expecting some type of input before we transition that character to the next state. for our boss. We're not going to have any type of input like we do with our spider.

Instead, we'll want to wait a small period of time before we transition from our idle state into our teleport state. Since this logic is going to be custom to our boss, we're going to create a new custom idle state for our boss enemy. And we'll use that instead of our common idle state we have right now. So, to add in this new state, let's go into our boss, our dro folder. Let's do boss dro idle idle state.

I'm going to go into our hidden state. Let's copy our code from here. Let's paste that into our new idle state. Let's update our class name. So we'll do our boss row idle state.

Now for our state name, we'll want to do our idle state. So now we transition into our state. We'll want to play our idle animation, wait a brief period of time, and then transition into our teleport state. So add in that logic, I'm going to go into our idle state. I'm going to copy our logic before we play our animation.

Let's remove our disabled object line, and we'll paste this here. now we're going to play our idle animation. And now for our delay call. For our delay, we'll want to reference our enemy boss idle state our enemy boss idle state duration. All right.

So after our small delay, now we'll want to transition to our teleport state. One last thing we'll do is in our delayed call, we're going to add a safeguard to make sure we're in our idle state before we transition to our teleport state. Since this is a delayed call, there's a possibility we might not be in the state anymore when we go to run this code. So, as an example, if we transition to our idle state and then our player attacks our boss, we're now going to transition to our hurt state. For our hurt state, we'll be doing our animation and then transitioning back to our teleport state.

And so, we don't need to run this code here. We'd actually want this to be based off our hurt state. Likewise, if our boss now dies when we take that hit, we wouldn't want to go to our teleport state. We'd want to do our death animation and have our boss disappear. by adding in that safeguard, it'll make sure we don't transition uh to our teleport state if we're not supposed to.

Let's do if this we're going to reference our state machine. We're going to grab our current state name. So, if our current state name is equal to our character states, our idle state, that means we're still in our idle state. And now we can do our logic for now we can do our logic for transitioning to our teleport state. So, now we have our new custom idle state for our boss.

Let's go to our boss class and we're going to update our state machine to use that state. So instead of doing our idle state, we're going to do our boss row idle state. Then one last thing we'll do is let's remove our logic where we set our state to our idle state by default. And we'll wait until our object gets enabled before we set our first state. All right.

So if we save, we should be able to test our changes. After our boss attacks, we should go to our new idle state. Wait a brief period of time and then we'll repeat our pattern to have our boss keep attacking our player. Nice. Next, let's try attacking our enemy.

So after we attack our boss enemy, they'll transition to our idle state and then go right to our teleport state. However, after our boss teleports, now we have a very small window to attack our boss. What's happening is by default, after our boss takes damage in our hurt state, we transition back to our idle state right away. This is causing us to register a call back twice for where we transition to our teleport state. To fix this, we'll want to update our hurt state.

So instead of going to our idle state, we'll want to go right into our teleport state. So we'll pass in undefined for unhe hurt call back. Now, let's do our character states. And now, let's do our teleport state. Let's save.

Let's try attacking our boss attacking our boss again. So, after our boss takes damage, it should teleport around, try to attack us, and then go right to idle so we have a chance to attack them. Much better. One other bug we'll want to fix is after our boss changes our direction, he'll keep facing that direction as he teleports around. So, we're going to update our boss's direction to go back to our default state and then have it face our player.

So, let's go into our teleport state. So, right before we calculate our location, we're going to update our boss's animation. So, let's do this. We're going to do our game object. Let's do our direction.

We'll have our boss face down. Place teleporting. Now, we'll do our animation. So, we'll do our game object. Let's grab our animation component.

Let's do play animation. Now, we want to do our idle animation followed by our suffix for our direction. And so, we'll do this our game object our direction. All right. So, now if we save our changes to show the test, let's move our player around.

After our boss teleports, they should face our player. Once he goes back into our teleport state, it'll be facing down. And if we move our player around our room, our boss should continue to update and face our player. Nice. Now that we have our logic in place for our boss states, it's time for us to give our boss our weapon so we can attack our player.

So, for our boss, we'll be creating a new weapon type, a dagger, which our boss will throw at our player after he finishes teleporting. We start with our changes. First, we need to create our animations for when we throw our dagger. So, let's jump over to our preload scene. For our dagger, we'll be using a sprite sheet.

So, let's copy this logic here. We'll paste it. Now, for our asset keys, let's do our dagger. We'll update a reference here. And now, for our frame rate, we're going to do 16.

And we want this to repeat. So, let's do negative one. Now that we have our animation, let's create a new dagger class. So, if we go into our weapons folder, let's make a new weapon. Let's make a new file.

We're going to call this dagger. Let's go into our sword class. I'm going to copy our logic from here. Let's paste it into our dagger class. We'll update our class name.

So, we'll do dagger. We'll have it extend our base weapon. Now, for our dagger class, we'll need to set this up a little bit different than what we did for our sword class. For our player sword, our animation is baked into our player sprite sheet. So, when our player attacks, we're actually updating our player game object.

For our dagger game object, we're be creating a new game object to represent our dagger that we're going to throw across our screen. What we'll need to do is we'll need to have our boss play the attack animation when he attacks. And we'll need to play our animation for animating our dagger across our screen. So to do this, we'll want to add a new game object to represent that sprite. So on our class, let's add in a new property.

We're going to do weapon sprite. This is going to be a phaser, our game objects, and then our sprite. And while we're here, let's add in one more property. We're going to add in our weapon speed. And so this will be the speed that we're going to throw our dagger across our screen.

Dagger across our screen. for this. This will be a number. So now to create our weapon sprite, we'll need to add in our constructor. So let's open up our base weapon class real quick.

I'm going to copy our logic here for our constructor. We'll come back to our dagger. Let's paste that in. Now let's add in our imports. So we'll have our weapon component.

We'll have our weapon attack animation configuration. We'll have our base damage. And then we'll also want to add an argument for our weapon weapon speed. Now we can call our super method. And let's pass in those properties.

So, we'll pass in our sprite, our weapon component, our animation config, and then our damage. And now we can create our weapon sprite game object. So, let's move this code here. Let's do our weapon sprite. We're going to set that equal to our sprite, our scene.

Let's do add. We'll do a sprite. Now, for our position, we'll do 0 0. Let's do our asset keys. And we want to do our dagger.

Do set visible. Let's set it to be false by default. Let's add in our origin. So, we're going to do 01. And now we want to play our animation.

And we're going to do our asset keys and then our dagger. After we create our game object, now let's update our weapon speed. So we're going to do our weapon speed. We're going to set equal to our weapon speed we provide as an argument. now for our dagger, since we're have a separate game object we're throwing across our screen, we'll want to update our physics body that's tied to our weapon component to match the size of our sprite that we're adding to our game.

To do that, I'm going to copy this line of code here from our attack up. And so now we'll call set size. And now we're just going to reference our weapon sprite. We're going to grab our width. And now we want to grab our height.

So before we update our attack methods, let's update our boss class to have an instance of our new weapon. So if we go to our draw class, let's go to create our weapon component. Now we want to assign our weapon. So we're going to do this our weapon component. Let's do our weapon.

We're going to set it equal to a new instance of our to a new instance of our dagger. So now for our configuration, we'll pass in our game object. Let's do our weapon component. Now we'll need our animation animation configuration. So for this we'll have our down key.

This will be our drone animation keys. And we'll do attack down. Let's copy that line of code and do our other do our other directions. So we'll have our up and then our left and then our left and right. Now we'll have our attack up and then we'll have our attack then we'll have our attack side.

After our animation configuration, now we want to pass in our boss's attack damage and our attack speed. For these, we'll add new properties to our configuration. So, let's do our enemy boss. Let's do our attack damage, and then we'll do our enemy boss, and we'll do our attack do our attack speed. So, let's copy one of those.

Let's open up our config file. We'll go to our boss enemy. Let's do export cons. We'll paste that in. So, now for our attack damage, let's do one and jump back over here.

Let's copy our attack speed. For that, we'll do 160. Let's save. We'll come back to our boss class. Let's update our imports.

So, after we save and our browser refreshes, we should see after our boss teleports, we now play our attack animation since our boss actually has our weapon. So, to make it a little bit easier to test attacking in our various directions, we're going to update our boss's teleport logic to go to one location. let's go into our teleport state. Let's add a new variable to con. We're going to do our random location, and we're just going to set equal to this, our possible locations.

And now, we're just going to reference our first element in our array. And then we're going to temporarily comment out this line of code. So what this will do is after our boss teleports, he should always teleport to the top of our room. now that we have our boss attacking, we can start updating our logic here in our weapon class. So let's start in our attack down method.

So when we attack with our weapon, we no longer need to update the size on our physics body. Instead, we'll want this to match our weapon sprite width and height at all times. So after we attack with our dagger, we'll want to make our game object visible and then update its position to match where our weapon component is on our boss. So let's remove these lines of code here. Let's reference our weapon sprite first.

Let's do set position. Now let's do this. We're going to do our weapon component. Let's grab our body. Let's grab our position.

We'll grab our x value. Now we'll do the same thing for our yalue. That's called set visible. We're going to make it to be true. So that's save.

So after our boss attacks, our game object will be now be visible in our screen. So now we'll need to update the properties in our game object to actually have it face and be thrown at our player. All right. So to do that, first we'll want to update the origin of our game object. So let's do set origin.

We're going to do one one. Now we want to update our angle. So we'll do set angle. We'll do 180 to rotate our game object fully around. Now let's do set flip Y.

And we're going to set this to be false. be false. So now after our boss attacks, our game object will be visible and we'll see our dagger is now aimed at our player. Now we just want to update our game object's velocity. So then that way it flies towards our player.

So let's do this. Reference our weapon component. We want to grab our body. And now we want to update our Y velocity. Do set velocity Y.

And now we want to match our weapon speed. All right. So now we save. After our boss attacks our player, we'll see now our physics body for our dagger moves across our screen. And once it collides with our player, we take damage.

Now, we just need to fix our bug where our game object sprite isn't matching our physics body. To do that, we'll need to add in our update method we can update our position. So, let's do public. We'll do update for a method. We won't return anything.

Now, we just want to update our weapon sprite. And we want to update our position. So, we'll do our weapon sprite set position. And now, we want to grab our physics body's X and Y value. So, let's do this.

Our weapon component, our body. We'll grab our position. Let's do X. I'm going to copy that. And then we'll do our Y value.

So now we save. Our boss should attack. And now our game object should be thrown at our player. And our sprite matches our physics body. And so now after our boss goes to attack a second time, our game object is going to continue moving from where it was at previously.

To fix that, we'll need to reset our physics body position on our weapon component. So let's come back up to our attack down method. I'm going to copy this line of code here where we update our positioning. Let's paste that. And so now when we attack down, we want to reference our sprite, our X value.

We're going to subtract seven. And now for our Y value, we want to add 20. So it's in front of our boss. Now if we save, boss should spawn our weapon. It should get thrown at our player.

And now our boss should teleport again. And now our dagger will respawn back in front of our boss. Nice. Now that we have our logic working for respawning our boss's game object when he attacks a second time. Now we just need a handle once our animation is finished.

We want to hide our game object. For that, we'll want to use our attack animation complete handler. And once this is invoked, we'll want to hide our game object. To do that, let's copy this block of code here. We're going to come to our dagger class and we're going to want to override it.

So let's add in our method first. Let's do super. We're going to do our attack animation complete handler so we can call our parent class. That's going to allow us to remove these two lines of code. And now we want to hide our game object.

So we're going to reference our weapon sprite. Let's do set sprite. Let's do set visible. We'll set it to be false. And now we'll want to reset our velocity on our physics body on our weapon component.

So let's do this. We'll do our weapon component. We'll reference our body. And now we're going to do set velocity X. Let's do zero.

Let's copy that line of code. And now we'll do the same thing for our Y value. Let's save. now when our boss attacks, we should throw our dagger. Once our animation's finished, it now disappears from our screen.

One other enhancement we want to do is after our dagger hits our player or collides with one of our walls, we'll want to hide our game object at that time. To do that, we can use our on collision callback method that we have in our base weapon class. So let's copy our block of code here. Let's come into our dagger class. We'll paste that in.

Now in our parent class, since we don't do anything, we don't need to call super. So now in our method, all we want to do is hide our game object and reset our velocity. So what we'll do is let's copy this. We're just going to call that method. All right.

So now if we save, if we have our boss or our dagger at our player, it should now disappear after it collides. Nice. All right. So now we just need to add in the rest of our logic for having our boss attack in our other directions. So let's start with our attack up method.

Let's copy our logic from attack down. We're going to paste that into attack up. So now for our physics body's position, we want to update our x value. So we're going to subtract eight. For our y value, we'll want to decrement this and we're going to do 25.

Now, for our weapon, since we're throwing this in the upwards direction, we're going to want to multiply our weapon speed by -1 so we move it in the correct direction. So, now for our weapon sprite, we'll update our origin. Let's do 0 our origin. Let's do 0 0. We'll update our angle.

Want to do zero. Flip Y will set to false. And now, we want to do our direction. And we'll do our direction up. We'll copy that.

Let's go to attack, right? We'll paste it. So now we attack in the right direction. For our x value, we want to increment this by 10. For our y value, we want to subtract five.

Because we're attacking to the right, we don't need to multiply by -1 for our speed. Now for origin, we'll do zero for our x. We'll do one for our y. For our angle, let's do 90. And now we want to do our direction, right?

Finally, for attacking to the left. Paste this in. Now for our direction, we want to subtract 25 from our x. For our Y, we'll subtract five. Now, for our velocity, since we're throwing it to the left, we'll want to multiply this by negative 1.

And we need to make sure this is set to our X. We'll come back up to attack, right? Let's do set velocity X. So now down here, let's update our origin. We're going to do 01.

We'll do 90 for our angle. And now we want to set flip Y. We're going to set this to be true. So what we're doing here is we're just mirroring the same values that we're setting for attack, right? But then we're flipping our game object on our Yaxis.

And then that way it'll be in the other direction. Finally, for our attack direction, let's do left. All right. So now if we want to test our changes, let's jump over to our teleport state. We're going to update our random location.

We're going to use our first index. So our boss should be over on the left. All right. So now if we save, our boss should teleport over to the left. So if we move to the right hand side, our boss should do our right attack.

Now if we move towards the top of our dungeon, our boss should appear below us and attack in the upwards direction. Now let's update our location. Let's do our next index. Now our boss should appear on our right and he'll attack to the left. Nice.

So now we've tested. Let's get rid of this logic here. We'll reenable our random location. And now we should be able to have our boss teleport to our room and choose a random spot to attack us. All right.

So after our boss finishes teleporting, he attacks us immediately. And so we're going to add in a small delay to give our player a chance to try to dodge the weapon. To add that delay, let's go into our prepare attack state. instead of going straight to our attack state, let's add in a delayed call. So we do this.

Let's do our game object. Let's grab our object. Let's grab our scene. We're going to do a time delayed call. For this, we'll want to add in a new delay value to our configuration.

Let's jump over to our config file. I'm going to copy this line of code here for our teleport state finish delay. We'll update our name. So, we'll do enemy boss prepare attack state finish delay. For that, we'll do 500 milliseconds.

Let's copy our variable name. We'll come back to our prepare attack state. We'll paste that in. So now in our call back now we'll want to transition to our attack state. All right.

So when our browser refreshes, we'll see now we have a brief window to dodge our boss after he finishes teleporting. However, since we have that delay, now our boss is facing the wrong direction before he goes to attack us. To fix that, we'll go ahead and play our idle animation. So I'm going to jump over to our teleport state. Let's copy our line of club where we play our animation.

We'll come back to our prepare attack state. We'll paste that. Now let's save. So after our boss teleports, he should face the right direction and then attempt to attack our player. Finally, for our boss enemy, now we just need to add in logic to handle once we defeat our boss.

So for our boss enemies, these are unique enemies in our dungeon where we only want to spawn them one time. Once our player defeats our boss, we want to keep track of that in our data manager. That way, if our player ever comes back into our dungeon, we don't respawn that enemy. To add in this logic, we'll need to emit an event once we defeat our boss enemy. So then that way we can update our data manager.

Now to add in our logic, let's go into our event bus. Let's make a new event. So after our dialogue closed, let's do our boss let's do our boss defeated. Copy that. We'll make that our value.

So now that we have our new event, we need to emit this once our boss is defeated. So let's go into our drill class. So in our death state, in our callback, once we make our boss no longer visible, now we'll want to emit our event. So let's do our event bus. We'll do emit.

Let's do our custom events. And we want to do our boss defeated. Now that we're emitting out our new event, we want to update our game scene to listen for this. So, let's jump over there. Let's go into our register custom events method.

Copy our line of code for our dialogue closed. We'll paste that. Let's do boss defeated. And now we'll do handle boss defeated. Let's copy that line of code.

Paste it here. Change this to be off. Let's copy that method name. We'll come down to the bottom of our class. Let's add that in.

For our method, we won't return anything. And now we want to update our data manager. So if we open up our data manager class, we need to update our boss defeated property inside our area details. To do that, we'll add a new method to our data manager. So let's come down to the bottom of our class.

Let's add a new public method and we're going to call this defeated current area current area boss. This method, we won't return anything. Now we'll do this our data. Let's do our area details. We're going to grab our current area name.

And now we're going to set boss defeated. We'll set it to be true. So now back in our game scene, we can call that new method. We're going to do our data manager. We're going to grab our We're going to grab our instance.

We'll say we defeated our current area boss. Now that we've updated our data manager to keep track of when our boss is defeated, when we go to create our enemies, we'll want to check to see if we've already defeated our boss. So let's go to our create enemies method. So now we do our type check here for if our type is three. Now we're going to check to see if we've defeated our boss.

So we'll do and not our data our data manager, our instance. We'll do our data, our area details. We'll reference our current area name. If our boss is not defeated, then we want to create our drone enemy. All right.

So now if we want to test our logic, let's go into our config. We're going to update our boss's health. We're going to drop it down to be one. now after our boss spawns, we'll have our boss attack our player. Let's attack our boss.

And now we'll see right away our door opens up. And now we play our animation for having our boss be defeated. Nice. So now for our boss defeated logic, there's a few other changes we'll need to make in our code. let's have our player leave our room after we defeat our boss.

Let's defeat our enemies in our next room real quick. now, if we have our player go back up to our boss room, what should happen is after our player enters our room, we'll see our boss still plays our attack animation and we throw our dagger at our player. So to fix this in our boss class, we'll need to add some custom logic to our enable object method. We'll want to check to see if our boss is already defeated. And if so, then we don't want to do our logic where we update our state.

So let's go into our boss class. Let's come down to our enable object method. we need to update our method here to also check to see if our boss is defeated. So currently in our parent class, this is where we have that check. So let's grab that line of code.

We'll paste it down here. And now we should only go into our state if our boss is not defeated. And so one other change we'll do is we're just going to wrap this in a safeguard to make sure we only run this one time. To do that, we're just going to do if we're going to reference our state machine. We're going to do our current state name.

If it's undefined, that means we've not set our state yet. and we'll want to do that. Now, besides this, we're also going to add in a small delay so that way when our player enters our room, our boss doesn't immediately spawn. Instead, we want to wait a second before he appears. to add that logic, first we're going to make our game object not visible.

Let's set that to be false. And now, we're going to do our delayed call. So, we're going to do this our scene. Let's do our time. Let's do our delayed call.

And for this, let's do 1 second. We'll do our call back. And now in our call back now we want to transition to our state. Let's copy our visible code. Want to make our game object visible.

So now if we save once our player spawns in our room we should now wait a second before our boss appears and starts getting ready to attack our player. One small change we'll do is let's move this to our config. So let's open up our config. Let's copy our line of code here for our delay and we're just going to do our enemy boss and we'll say start initial delay. delay.

We'll set that to 1,00 milliseconds. Let's copy that. Come back to our boss class. We'll paste that in. And now it's save.

All right. So, one other change we'll need to handle when our boss is defeated is if our boss was attacking our player and our weapon still on our screen, once our boss is defeated, our game object will remain visible. And so to fix this, we just need to enhance our logic tied to our disable object method. let's open up our character game object base class. So now in our disable object method, we'll want to add in a check to see if we have a weapon component for this character.

And if we do, if that weapon is visible and we're attacking, we'll want to disable that object right away. First, let's grab our weapons to our weapon component. So we're going to do const weapon component will be equal to our weapon component. Let's do get component. This will be our weapon component instance.

And now we're going to pass in this for our game object. our game object. Now we'll check to see if our weapon component does not equal component does not equal undefined and our weapon component has a current current weapon. And then finally, if we're attacking with our weapon. So we'll do our weapon component, our our weapon component, our weapon.

We'll do is attacking. Now we'll want to call our call back. So let's do our weapon component. Let's do our weapon. And we're going to do our on collision call back.

All right. So now if we save, we should be able to test our changes. We need to wait for the boss to go to attack our player. Now, if we defeat our boss while our weapons visible on our screen, we'll hide it right away. right away.

Nice. Finally, for our boss defeated logic, one last change we'll make will be tied to when we open up our door. Currently, we have it set up so once we defeat our boss, we're emitting our enemy is defeated event. And when we do our check for if all of our enemies are defeated in our room, our door opens immediately. Instead, we want to change this so our door will open only when we emit our boss defeated event.

To do this, we'll need to update our data ent. for our doors, we currently have our trap door trigger, and our available values are none, enemies defeated, and switch. We'll want to extend this with a new value that'll be tied to what our boss is actually defeated. So, we can tie that to our boss defeated event we're emitting in our game. To add this support in tiled, we'll want to go to our custom types editor.

Under our trap trigger, our enum, we want to add a new value. For our new value, let's do boss defeated. defeated. Now, if we choose our door and our boss room, let's update our trap door trigger type, and we'll want to do boss defeated. Now, we've updated our map data, we'll need to export out our JSON file so we can import it into phaser.

Let's do file. We're going to do export as. So, now for our export, we want to update our name. So, this will be our dungeon_1. json.

So, now we have our new JSON file. We'll come back to our game. And now we'll need to import that file into our workspace. So, now to our public folder under assets, we'll want to go into our images. We'll go into our levels, our dungeon_1, and we'll want to replace our dungeon_1 JSON file.

So, after we replace our JSON file, we should be able to do a search for our boss's defeated value. And we should see that's tied to our trapdoor trigger. So, now we've added a new value to our trapdoor trigger type. We'll need to update our enum and our tile data. So, under our source folder, if we go under common tiled, let's go into our common.

Ts file for our cons. For our trap type, we'll add in our new value. I'm going to jump over to our JSON file. I'm going to copy our boss defeated. Let's paste that in.

We'll have our value be the same. Now that we have our new trap type, we'll need to update our logic in our game scene. So, we'll be able to open up our boss door once our boss is defeated. To do this, we're going to update our logic for when we listen for our event for when our boss is defeated to have it call our handle all enemies defeated method. In this method, we're going to enhance our logic where we loop through our doors and check our trap door trigger type.

If our trap door trigger type is our boss defeated, we'll then check our data manager. And as long as our boss is defeated, we'll open up our door. So to add that check, let's come down to the bottom of our class and our handle boss defeated method. After we update our data manager, let's call our method. So we'll do handle all enemies defeated.

Now in our method, when we're looping through our doors, let's copy this block of code. We'll paste it. And now I'll say if our trap type is our boss defeated and if our data manager, our instance, our data, our area details, now our current area. So we'll do our data manager, our data manager, our instance, our data, our current area name. If our boss is defeated, then we'll want to open up our door.

So now, if we want to test our changes, let's come back to our browser. Let's attack our enemy. We'll see right away our door no longer opens. But once our enemy vanishes and we emit our boss defeated event, our door will now open up. Nice.

All right, so with that last change, that actually wraps up all of our logic tied to our boss. So now in our dungeon, we now have a challenging boss fight for our player once they reach the end of our dungeon. So now we're done testing our logic. We need to revert some of our changes uh in our data manager. So we go back to our initial starting room.

So let's update our starting room ID and our starting door ID to be three. Let's come back into our config file and we'll want to update our boss's max health and we're going to revert this back to six. So, now we wrapped up our section on our challenging boss fight. There's just a few things we want to address in our game before we wrap up. There's a few existing bugs in our code that we'll want to address, and we'll want to update our game's configuration so we hide our debug information.

So, the first bug we're going to take a look at is when our player goes to open up one of our chest, if we're in the middle of opening up one of our chests, when we take damage, our player never actually gets the item. So, what's happening is once we go open up our chest, we're transitioning into our open chest state. Once we get into this state, we play our animation and now we emit our event and we're waiting for our dialogue to close to show that we received our item. Because we take damage, we immediately transition to our hurt state and so our logic doesn't actually run. To fix this, once we enter this state, we're going to make our player invulnerable.

So then that way if we take any damage, it won't affect our current state. Once we actually get our item and we close our dialogue, then we'll make our player vulnerable again. So then that way we'll be able to take damage. To make these changes, we'll go into our open chest state. Before we reset our body's velocity, let's update our invulnerable component.

So we're going to do this, our game object, and reference our invulnerable component. We're set invulnerable. We're going to set it to be true. And we're going to copy that line of code. Let's come down to our event listener for when our dialogue closes before we go back to our idle state.

Now we want to make our player vulnerable again. So now if we save, we should be able to should be able to test. So now when we open up our chest, when our enemy collides with our player, we don't actually take damage since we're invulnerable. For our next bug, when our player goes to move through one of our doors, currently we're checking our input to make sure our player can actually change their direction. However, our player can still use their items and attack with their sword.

To address this, we'll need to update our idle state. And if our lock is enabled on our controls, we won't want to process any of our input. To make this change, let's go into our idle state. Let's go down to our on update method. Once we get a reference to our controls, let's do if let's reference our controls.

And we'll check to see if our movement is locked. And if it is, we just want to return early from our method. So now back in our browser, if we try moving through one of our doors, if we try pressing our attack key, we'll see now we no longer process our input and we don't go to our attack state. Much better. So now that we've addressed our two bugs, now we want to update our game configuration to hide our debug zones.

To do this, let's go into our config file. At the top of our file, let's update our alpha for our collision area to be zero. Now to hide our physics bodies, we'll need to update our phaser game configuration. So if we go into our main. ts ts file in our game config.

We'll want to go to our arcade physics and we'll set debug to be false. And then finally, we just need to add in logic to hide our debug zones for our door triggers. To do that, we're going to add a new flag to our configuration. And then when it's set to true, we'll enable our debugging. And if it's set to false, we won't create that game object.

Let's go into our config file. Let's copy our line of code for enable our logging. We'll update our variable name. We're going to do enable debug zone area. area.

Let's set this to be true. All right. So now we just need to update our door class. So in our door class in our constructor before we create our game object for our debug door transition zone, this is where we'll add a check for that new flag. So we'll do if we'll do our enable debug zone do our enable debug zone area.

And only if that flag is set to true will we create our game object. So once we save, when our browser refreshes, we should still see our game object in our scene. Now, if we come back to our config file, let's set this to be false. And now, our game object should not be created. should not be created.

Nice. And that's a wrap. We've come a long way together, starting from a project template all the way to building a fully playable Zelda Spider dungeon adventure in Phaser 3. Along the way, we've tackled core gameplay systems like movement, combat, item collection, enemy AI, puzzles, a boss battle, UI components, and even connected it all with tile data. Whether you followed every single part or just jumped in for the pieces you needed, thank you so much for watching and building alongside me, I hope this series helped level up your phaser skills and gave you the confidence to start creating your own action adventure games.

If you enjoyed the series, don't forget to like, subscribe, and share with other devs who might find it helpful. If you want to support my work or follow future projects, you can find all the links in the description below. Thanks again for being part of this journey. And as always, happy coding and keep making awesome games.