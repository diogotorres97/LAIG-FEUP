/**
 * MyInterface class, creating a GUI interface.
 * @constructor
 */
function MyInterface() {
	//call CGFinterface constructor
	CGFinterface.call(this);
};

MyInterface.prototype = Object.create(CGFinterface.prototype);
MyInterface.prototype.constructor = MyInterface;

/**
 * Initializes the interface.
 * @param {CGFapplication} application
 */
MyInterface.prototype.init = function(application) {
	// call CGFinterface init
	CGFinterface.prototype.init.call(this, application);

	// init GUI. For more information on the methods, check:
	//  http://workshop.chromeexperiments.com/examples/gui

	this.gui = new dat.GUI();

	// add a group of controls (and open/expand by defult)

	return true;
};

/**
 * Adds a folder containing the IDs of the lights passed as parameter.
 */
MyInterface.prototype.addLightsGroup = function(lights) {

	var group = this.gui.addFolder("Lights");
	//group.open();
	group.close();
	// add two check boxes to the group. The identifiers must be members variables of the scene initialized in scene.init as boolean
	// e.g. this.option1=true; this.option2=false;

	for (var key in lights) {
		if (lights.hasOwnProperty(key)) {
			this.scene.lightValues[key] = lights[key][0];
			group.add(this.scene.lightValues, key);
		}
	}

	obj=this;
	this.gui.add(this.scene, 'animationLoop').onChange(function(v)
			{ obj.scene.updateAnimationLoop(v)	});

	this.gui.add(this.scene, 'flagTFactor');
}

MyInterface.prototype.addSelectableNodesGroup = function(){
	let selectablesList = {};
	let i=0;

	for(let id in this.scene.graph.nodes){
		if(this.scene.graph.nodes[id].getSelectable()){
			selectablesList[id]=id;
			i++;
		}
	}
	selectablesList['none']=null;


	this.gui.add(this.scene, 'selectedSelectableNode', selectablesList).name('Selectable List');
}

MyInterface.prototype.addShadersGroup = function(){

	this.gui.add(this.scene, 'selectedExampleShader', {
		'Flat Shading': 0,
		'Passing a scale as uniform': 1,
		'Passing a varying parameter from VS -> FS': 2,
		'Sepia': 6,
		'Convolution': 7

	}).name('Shader examples');


	obj=this;
	this.gui.add(this.scene, 'scaleFactor',-50,50).onChange(function(v)
			{
		obj.scene.updateScaleFactor(v);
			});

}

MyInterface.prototype.addColoursGroup = function(){
	obj=this;

	this.gui.add(this.scene, 'selectedColourShader', {
		'Default(Blue)': 0,
		'Red': 1,
		'Green': 2,
		'Yellow': 3,
	}).name('Colour Shader').onChange(function(v){ obj.scene.updateColourShader(v)});

}
