var DEGREE_TO_RAD = Math.PI / 180;

//Order of the groups in the XML document.
var INITIALS_INDEX = 0;
var ILLUMINATION_INDEX = 1;
var LIGHTS_INDEX = 2;
var TEXTURES_INDEX = 3;
var MATERIALS_INDEX = 4;
var ANIMATIONS_INDEX = 5;
var NODES_INDEX = 6;

/**
 * MySceneGraph class, representing the scene graph.
 * @constructor
 * @param {string} filename scene's filename
 * @param {CGFScene} scene CGFScene to be used
 */
function MySceneGraph(filename, scene) {
	this.loadedOk = null ;

	// Establish bidirectional references between scene and graph.
	this.scene = scene;
	scene.graph = this;

	this.errorMsg = null; //A variable that contains the error log of each function in the parse leafs
	this.animations = []; //An array that contains all single animations

	this.comboIDs = []; //An array that contains all the id's of animations converted to combo
	this.comboAnimations = []; //An array that contains all the animations converted to combo
	this.animIdx = 0;

	this.nodes = [];

	this.idRoot = null;                    // The id of the root element.

	this.axisCoords = [];
	this.axisCoords['x'] = [1, 0, 0];
	this.axisCoords['y'] = [0, 1, 0];
	this.axisCoords['z'] = [0, 0, 1];

	// File reading
	this.reader = new CGFXMLreader();

	/*
	 * Read the contents of the xml file, and refer to this class for loading and error handlers.
	 * After the file is read, the reader calls onXMLReady on this object.
	 * If any error occurs, the reader calls onXMLError on this object, with an error message
	 */

	this.reader.open('scenes/' + filename, this);
}

/*
 * Callback to be executed after successful reading
 */
MySceneGraph.prototype.onXMLReady = function()
{
	console.log("XML Loading finished.");
	var rootElement = this.reader.xmlDoc.documentElement;

	// Here should go the calls for different functions to parse the various blocks
	var error = this.parseLSXFile(rootElement);

	if (error != null ) {
		this.onXMLError(error);
		return;
	}

	this.loadedOk = true;

	// As the graph loaded ok, signal the scene so that any additional initialization depending on the graph can take place
	this.scene.onGraphLoaded();
}

/**
 * Parses the LSX file, processing each block.
 */
MySceneGraph.prototype.parseLSXFile = function(rootElement) {
	if (rootElement.nodeName != "SCENE")
		return "root tag <SCENE> missing";

	var nodes = rootElement.children;

	// Reads the names of the nodes to an auxiliary buffer.
	var nodeNames = [];

	for (var i = 0; i < nodes.length; i++) {
		nodeNames.push(nodes[i].nodeName);
	}

	var error;

	// Processes each node, verifying errors.

	// <INITIALS>
	var index;
	if ((index = nodeNames.indexOf("INITIALS")) == -1)
		return "tag <INITIALS> missing";
	else {
		if (index != INITIALS_INDEX)
			this.onXMLMinorError("tag <INITIALS> out of order");

		if ((error = this.parseInitials(nodes[index])) != null )
			return error;
	}

	// <ILLUMINATION>
	if ((index = nodeNames.indexOf("ILLUMINATION")) == -1)
		return "tag <ILLUMINATION> missing";
	else {
		if (index != ILLUMINATION_INDEX)
			this.onXMLMinorError("tag <ILLUMINATION> out of order");

		if ((error = this.parseIllumination(nodes[index])) != null )
			return error;
	}

	// <LIGHTS>
	if ((index = nodeNames.indexOf("LIGHTS")) == -1)
		return "tag <LIGHTS> missing";
	else {
		if (index != LIGHTS_INDEX)
			this.onXMLMinorError("tag <LIGHTS> out of order");

		if ((error = this.parseLights(nodes[index])) != null )
			return error;
	}

	// <TEXTURES>
	if ((index = nodeNames.indexOf("TEXTURES")) == -1)
		return "tag <TEXTURES> missing";
	else {
		if (index != TEXTURES_INDEX)
			this.onXMLMinorError("tag <TEXTURES> out of order");

		if ((error = this.parseTextures(nodes[index])) != null )
			return error;
	}

	// <MATERIALS>
	if ((index = nodeNames.indexOf("MATERIALS")) == -1)
		return "tag <MATERIALS> missing";
	else {
		if (index != MATERIALS_INDEX)
			this.onXMLMinorError("tag <MATERIALS> out of order");

		if ((error = this.parseMaterials(nodes[index])) != null )
			return error;
	}

	// <ANIMATIONS>
	if ((index = nodeNames.indexOf("ANIMATIONS")) == -1)
		return "tag <ANIMATIONS> missing";
	else {
		if (index != ANIMATIONS_INDEX)
			this.onXMLMinorError("tag <ANIMATIONS> out of order");

		if ((error = this.parseAnimations(nodes[index])) != null )
			return error;
	}

	// <NODES>
	if ((index = nodeNames.indexOf("NODES")) == -1)
		return "tag <NODES> missing";
	else {
		if (index != NODES_INDEX)
			this.onXMLMinorError("tag <NODES> out of order");

		if ((error = this.parseNodes(nodes[index])) != null )
			return error;
	}

}

/**
 * Parses the <INITIALS> block.
 */
MySceneGraph.prototype.parseInitials = function(initialsNode) {

	var children = initialsNode.children;

	var nodeNames = [];

	for (var i = 0; i < children.length; i++)
		nodeNames.push(children[i].nodeName);

	// Frustum planes.
	this.near = 0.1;
	this.far = 500;
	var indexFrustum = nodeNames.indexOf("frustum");
	if (indexFrustum == -1) {
		this.onXMLMinorError("frustum planes missing; assuming 'near = 0.1' and 'far = 500'");
	}
	else {
		this.near = this.reader.getFloat(children[indexFrustum], 'near');
		this.far = this.reader.getFloat(children[indexFrustum], 'far');

		if (this.near == null ) {
			this.near = 0.1;
			this.onXMLMinorError("unable to parse value for near plane; assuming 'near = 0.1'");
		}
		else if (this.far == null ) {
			this.far = 500;
			this.onXMLMinorError("unable to parse value for far plane; assuming 'far = 500'");
		}
		else if (isNaN(this.near)) {
			this.near = 0.1;
			this.onXMLMinorError("non-numeric value found for near plane; assuming 'near = 0.1'");
		}
		else if (isNaN(this.far)) {
			this.far = 500;
			this.onXMLMinorError("non-numeric value found for far plane; assuming 'far = 500'");
		}
		else if (this.near <= 0) {
			this.near = 0.1;
			this.onXMLMinorError("'near' must be positive; assuming 'near = 0.1'");
		}

		if (this.near >= this.far)
			return "'near' must be smaller than 'far'";
	}

	// Checks if at most one translation, three rotations, and one scaling are defined.
	if (initialsNode.getElementsByTagName('translation').length > 1)
		return "no more than one initial translation may be defined";

	if (initialsNode.getElementsByTagName('rotation').length > 3)
		return "no more than three initial rotations may be defined";

	if (initialsNode.getElementsByTagName('scale').length > 1)
		return "no more than one scaling may be defined";

	// Initial transforms.
	this.initialTranslate = [];
	this.initialScaling = [];
	this.initialRotations = [];

	// Gets indices of each element.
	var translationIndex = nodeNames.indexOf("translation");
	var thirdRotationIndex = nodeNames.indexOf("rotation");
	var secondRotationIndex = nodeNames.indexOf("rotation", thirdRotationIndex + 1);
	var firstRotationIndex = nodeNames.lastIndexOf("rotation");
	var scalingIndex = nodeNames.indexOf("scale");

	// Checks if the indices are valid and in the expected order.
	// Translation.
	this.initialTransforms = mat4.create();
	mat4.identity(this.initialTransforms);
	if (translationIndex == -1)
		this.onXMLMinorError("initial translation undefined; assuming T = (0, 0, 0)");
	else {
		var tx = this.reader.getFloat(children[translationIndex], 'x');
		var ty = this.reader.getFloat(children[translationIndex], 'y');
		var tz = this.reader.getFloat(children[translationIndex], 'z');

		if (tx == null ) {
			tx = 0;
			this.onXMLMinorError("failed to parse x-coordinate of initial translation; assuming tx = 0");
		}
		else if (isNaN(tx)) {
			tx = 0;
			this.onXMLMinorError("found non-numeric value for x-coordinate of initial translation; assuming tx = 0");
		}

		if (ty == null ) {
			ty = 0;
			this.onXMLMinorError("failed to parse y-coordinate of initial translation; assuming ty = 0");
		}
		else if (isNaN(ty)) {
			ty = 0;
			this.onXMLMinorError("found non-numeric value for y-coordinate of initial translation; assuming ty = 0");
		}

		if (tz == null ) {
			tz = 0;
			this.onXMLMinorError("failed to parse z-coordinate of initial translation; assuming tz = 0");
		}
		else if (isNaN(tz)) {
			tz = 0;
			this.onXMLMinorError("found non-numeric value for z-coordinate of initial translation; assuming tz = 0");
		}

		if (translationIndex > thirdRotationIndex || translationIndex > scalingIndex)
			this.onXMLMinorError("initial translation out of order; result may not be as expected");

		mat4.translate(this.initialTransforms, this.initialTransforms, [tx, ty, tz]);
	}

	// Rotations.
	var initialRotations = [];
	initialRotations['x'] = 0;
	initialRotations['y'] = 0;
	initialRotations['z'] = 0;

	var rotationDefined = [];
	rotationDefined['x'] = false;
	rotationDefined['y'] = false;
	rotationDefined['z'] = false;

	var axis;
	var rotationOrder = [];

	// Third rotation (first rotation defined).
	if (thirdRotationIndex != -1) {
		axis = this.reader.getItem(children[thirdRotationIndex], 'axis', ['x', 'y', 'z']);
		if (axis != null ) {
			var angle = this.reader.getFloat(children[thirdRotationIndex], 'angle');
			if (angle != null && !isNaN(angle)) {
				initialRotations[axis] += angle;
				if (!rotationDefined[axis])
					rotationOrder.push(axis);
				rotationDefined[axis] = true;
			}
			else this.onXMLMinorError("failed to parse third initial rotation 'angle'");
		}
	}

	// Second rotation.
	if (secondRotationIndex != -1) {
		axis = this.reader.getItem(children[secondRotationIndex], 'axis', ['x', 'y', 'z']);
		if (axis != null ) {
			var angle = this.reader.getFloat(children[secondRotationIndex], 'angle');
			if (angle != null && !isNaN(angle)) {
				initialRotations[axis] += angle;
				if (!rotationDefined[axis])
					rotationOrder.push(axis);
				rotationDefined[axis] = true;
			}
			else this.onXMLMinorError("failed to parse second initial rotation 'angle'");
		}
	}

	// First rotation.
	if (firstRotationIndex != -1) {
		axis = this.reader.getItem(children[firstRotationIndex], 'axis', ['x', 'y', 'z']);
		if (axis != null ) {
			var angle = this.reader.getFloat(children[firstRotationIndex], 'angle');
			if (angle != null && !isNaN(angle)) {
				initialRotations[axis] += angle;
				if (!rotationDefined[axis])
					rotationOrder.push(axis);
				rotationDefined[axis] = true;
			}
			else this.onXMLMinorError("failed to parse first initial rotation 'angle'");
		}
	}

	// Checks for undefined rotations.
	if (!rotationDefined['x'])
		this.onXMLMinorError("rotation along the Ox axis undefined; assuming Rx = 0");
	else if (!rotationDefined['y'])
		this.onXMLMinorError("rotation along the Oy axis undefined; assuming Ry = 0");
	else if (!rotationDefined['z'])
		this.onXMLMinorError("rotation along the Oz axis undefined; assuming Rz = 0");

	// Updates transform matrix.
	for (var i = 0; i < rotationOrder.length; i++)
		mat4.rotate(this.initialTransforms, this.initialTransforms, DEGREE_TO_RAD * initialRotations[rotationOrder[i]], this.axisCoords[rotationOrder[i]]);

	// Scaling.
	if (scalingIndex == -1)
		this.onXMLMinorError("initial scaling undefined; assuming S = (1, 1, 1)");
	else {
		var sx = this.reader.getFloat(children[scalingIndex], 'sx');
		var sy = this.reader.getFloat(children[scalingIndex], 'sy');
		var sz = this.reader.getFloat(children[scalingIndex], 'sz');

		if (sx == null ) {
			sx = 1;
			this.onXMLMinorError("failed to parse x parameter of initial scaling; assuming sx = 1");
		}
		else if (isNaN(sx)) {
			sx = 1;
			this.onXMLMinorError("found non-numeric value for x parameter of initial scaling; assuming sx = 1");
		}

		if (sy == null ) {
			sy = 1;
			this.onXMLMinorError("failed to parse y parameter of initial scaling; assuming sy = 1");
		}
		else if (isNaN(sy)) {
			sy = 1;
			this.onXMLMinorError("found non-numeric value for y parameter of initial scaling; assuming sy = 1");
		}

		if (sz == null ) {
			sz = 1;
			this.onXMLMinorError("failed to parse z parameter of initial scaling; assuming sz = 1");
		}
		else if (isNaN(sz)) {
			sz = 1;
			this.onXMLMinorError("found non-numeric value for z parameter of initial scaling; assuming sz = 1");
		}

		if (scalingIndex < firstRotationIndex)
			this.onXMLMinorError("initial scaling out of order; result may not be as expected");

		mat4.scale(this.initialTransforms, this.initialTransforms, [sx, sy, sz]);
	}

	// ----------
	// Reference length.
	this.referenceLength = 1;

	var indexReference = nodeNames.indexOf("reference");
	if (indexReference == -1)
		this.onXMLMinorError("reference length undefined; assuming 'length = 1'");
	else {
		// Reads the reference length.
		var length = this.reader.getFloat(children[indexReference], 'length');

		if (length != null ) {
			if (isNaN(length))
				this.onXMLMinorError("found non-numeric value for reference length; assuming 'length = 1'");
			else if (length <= 0)
				this.onXMLMinorError("reference length must be a positive value; assuming 'length = 1'");
			else
				this.referenceLength = length;
		}
		else
			this.onXMLMinorError("unable to parse reference length; assuming 'length = 1'");

	}

	console.log("Parsed initials");

	return null ;
}

/**
 * Parses the <ILLUMINATION> block.
 */
MySceneGraph.prototype.parseIllumination = function(illuminationNode) {

	// Reads the ambient and background values.
	var children = illuminationNode.children;
	var nodeNames = [];
	for (var i = 0; i < children.length; i++)
		nodeNames.push(children[i].nodeName);

	// Retrieves the global ambient illumination.
	this.ambientIllumination = [0, 0, 0, 1];
	var ambientIndex = nodeNames.indexOf("ambient");
	if (ambientIndex != -1) {
		// R.
		var r = this.reader.getFloat(children[ambientIndex], 'r');
		if (r != null ) {
			if (isNaN(r))
				return "ambient 'r' is a non numeric value on the ILLUMINATION block";
			else if (r < 0 || r > 1)
				return "ambient 'r' must be a value between 0 and 1 on the ILLUMINATION block"
				else
					this.ambientIllumination[0] = r;
		}
		else
			this.onXMLMinorError("unable to parse R component of the ambient illumination; assuming R = 0");

		// G.
		var g = this.reader.getFloat(children[ambientIndex], 'g');
		if (g != null ) {
			if (isNaN(g))
				return "ambient 'g' is a non numeric value on the ILLUMINATION block";
			else if (g < 0 || g > 1)
				return "ambient 'g' must be a value between 0 and 1 on the ILLUMINATION block"
				else
					this.ambientIllumination[1] = g;
		}
		else
			this.onXMLMinorError("unable to parse G component of the ambient illumination; assuming G = 0");

		// B.
		var b = this.reader.getFloat(children[ambientIndex], 'b');
		if (b != null ) {
			if (isNaN(b))
				return "ambient 'b' is a non numeric value on the ILLUMINATION block";
			else if (b < 0 || b > 1)
				return "ambient 'b' must be a value between 0 and 1 on the ILLUMINATION block"
				else
					this.ambientIllumination[2] = b;
		}
		else
			this.onXMLMinorError("unable to parse B component of the ambient illumination; assuming B = 0");

		// A.
		var a = this.reader.getFloat(children[ambientIndex], 'a');
		if (a != null ) {
			if (isNaN(a))
				return "ambient 'a' is a non numeric value on the ILLUMINATION block";
			else if (a < 0 || a > 1)
				return "ambient 'a' must be a value between 0 and 1 on the ILLUMINATION block"
				else
					this.ambientIllumination[3] = a;
		}
		else
			this.onXMLMinorError("unable to parse A component of the ambient illumination; assuming A = 1");
	}
	else
		this.onXMLMinorError("global ambient illumination undefined; assuming Ia = (0, 0, 0, 1)");


	// Retrieves the background clear color.
	this.background = [0, 0, 0, 1];
	var backgroundIndex = nodeNames.indexOf("background");
	if (backgroundIndex != -1) {
		// R.
		var r = this.reader.getFloat(children[backgroundIndex], 'r');
		if (r != null ) {
			if (isNaN(r))
				return "background 'r' is a non numeric value on the ILLUMINATION block";
			else if (r < 0 || r > 1)
				return "background 'r' must be a value between 0 and 1 on the ILLUMINATION block"
				else
					this.background[0] = r;
		}
		else
			this.onXMLMinorError("unable to parse R component of the background colour; assuming R = 0");

		// G.
		var g = this.reader.getFloat(children[backgroundIndex], 'g');
		if (g != null ) {
			if (isNaN(g))
				return "background 'g' is a non numeric value on the ILLUMINATION block";
			else if (g < 0 || g > 1)
				return "background 'g' must be a value between 0 and 1 on the ILLUMINATION block"
				else
					this.background[1] = g;
		}
		else
			this.onXMLMinorError("unable to parse G component of the background colour; assuming G = 0");

		// B.
		var b = this.reader.getFloat(children[backgroundIndex], 'b');
		if (b != null ) {
			if (isNaN(b))
				return "background 'b' is a non numeric value on the ILLUMINATION block";
			else if (b < 0 || b > 1)
				return "background 'b' must be a value between 0 and 1 on the ILLUMINATION block"
				else
					this.background[2] = b;
		}
		else
			this.onXMLMinorError("unable to parse B component of the background colour; assuming B = 0");

		// A.
		var a = this.reader.getFloat(children[backgroundIndex], 'a');
		if (a != null ) {
			if (isNaN(a))
				return "background 'a' is a non numeric value on the ILLUMINATION block";
			else if (a < 0 || a > 1)
				return "background 'a' must be a value between 0 and 1 on the ILLUMINATION block"
				else
					this.background[3] = a;
		}
		else
			this.onXMLMinorError("unable to parse A component of the background colour; assuming A = 1");
	}
	else
		this.onXMLMinorError("background clear colour undefined; assuming (R, G, B, A) = (0, 0, 0, 1)");

	console.log("Parsed illumination");

	return null ;
}

/**
 * Parses the <LIGHTS> node.
 */
MySceneGraph.prototype.parseLights = function(lightsNode) {

	var children = lightsNode.children;

	this.lights = [];
	var numLights = 0;

	var grandChildren = [];
	var nodeNames = [];

	// Any number of lights.
	for (var i = 0; i < children.length; i++) {

		if (children[i].nodeName != "LIGHT") {
			this.onXMLMinorError("unknown tag <" + children[i].nodeName + ">");
			continue;
		}

		// Get id of the current light.
		var lightId = this.reader.getString(children[i], 'id');
		if (lightId == null )
			return "no ID defined for light";

		// Checks for repeated IDs.
		if (this.lights[lightId] != null )
			return "ID must be unique for each light (conflict: ID = " + lightId + ")";

		grandChildren = children[i].children;
		// Specifications for the current light.

		nodeNames = [];
		for (var j = 0; j < grandChildren.length; j++) {
			// console.log(grandChildren[j].nodeName);
			nodeNames.push(grandChildren[j].nodeName);
		}

		// Gets indices of each element.
		var enableIndex = nodeNames.indexOf("enable");
		var positionIndex = nodeNames.indexOf("position");
		var ambientIndex = nodeNames.indexOf("ambient");
		var diffuseIndex = nodeNames.indexOf("diffuse");
		var specularIndex = nodeNames.indexOf("specular");

		// Light enable/disable
		var enableLight = true;
		if (enableIndex == -1) {
			this.onXMLMinorError("enable value missing for ID = " + lightId + "; assuming 'value = 1'");
		}
		else {
			var aux = this.reader.getFloat(grandChildren[enableIndex], 'value');
			if (aux == null ) {
				this.onXMLMinorError("unable to parse value component of the 'enable light' field for ID = " + lightId + "; assuming 'value = 1'");
			}
			else if (isNaN(aux))
				return "'enable value' is a non numeric value on the LIGHTS block";
			else if (aux != 0 &&     aux != 1)
				return "'enable value' must be 0 or 1 on the LIGHTS block"
				else
					enableLight = aux == 0 ? false : true;
		}

		// Retrieves the light position.
		var positionLight = [];
		if (positionIndex != -1) {
			// x
			var x = this.reader.getFloat(grandChildren[positionIndex], 'x');
			if (x != null ) {
				if (isNaN(x))
					return "'x' is a non numeric value on the LIGHTS block";
				else
					positionLight.push(x);
			}
			else
				return "unable to parse x-coordinate of the light position for ID = " + lightId;

			// y
			var y = this.reader.getFloat(grandChildren[positionIndex], 'y');
			if (y != null ) {
				if (isNaN(y))
					return "'y' is a non numeric value on the LIGHTS block";
				else
					positionLight.push(y);
			}
			else
				return "unable to parse y-coordinate of the light position for ID = " + lightId;

			// z
			var z = this.reader.getFloat(grandChildren[positionIndex], 'z');
			if (z != null ) {
				if (isNaN(z))
					return "'z' is a non numeric value on the LIGHTS block";
				else
					positionLight.push(z);
			}
			else
				return "unable to parse z-coordinate of the light position for ID = " + lightId;

			// w
			var w = this.reader.getFloat(grandChildren[positionIndex], 'w');
			if (w != null ) {
				if (isNaN(w))
					return "'w' is a non numeric value on the LIGHTS block";
				else if (w < 0 || w > 1)
					return "'w' must be a value between 0 and 1 on the LIGHTS block"
					else
						positionLight.push(w);
			}
			else
				return "unable to parse w-coordinate of the light position for ID = " + lightId;
		}
		else
			return "light position undefined for ID = " + lightId;

		// Retrieves the ambient component.
		var ambientIllumination = [];
		if (ambientIndex != -1) {
			// R
			var r = this.reader.getFloat(grandChildren[ambientIndex], 'r');
			if (r != null ) {
				if (isNaN(r))
					return "ambient 'r' is a non numeric value on the LIGHTS block";
				else if (r < 0 || r > 1)
					return "ambient 'r' must be a value between 0 and 1 on the LIGHTS block"
					else
						ambientIllumination.push(r);
			}
			else
				return "unable to parse R component of the ambient illumination for ID = " + lightId;

			// G
			var g = this.reader.getFloat(grandChildren[ambientIndex], 'g');
			if (g != null ) {
				if (isNaN(g))
					return "ambient 'g' is a non numeric value on the LIGHTS block";
				else if (g < 0 || g > 1)
					return "ambient 'g' must be a value between 0 and 1 on the LIGHTS block"
					else
						ambientIllumination.push(g);
			}
			else
				return "unable to parse G component of the ambient illumination for ID = " + lightId;

			// B
			var b = this.reader.getFloat(grandChildren[ambientIndex], 'b');
			if (b != null ) {
				if (isNaN(b))
					return "ambient 'b' is a non numeric value on the LIGHTS block";
				else if (b < 0 || b > 1)
					return "ambient 'b' must be a value between 0 and 1 on the LIGHTS block"
					else
						ambientIllumination.push(b);
			}
			else
				return "unable to parse B component of the ambient illumination for ID = " + lightId;

			// A
			var a = this.reader.getFloat(grandChildren[ambientIndex], 'a');
			if (a != null ) {
				if (isNaN(a))
					return "ambient 'a' is a non numeric value on the LIGHTS block";
				else if (a < 0 || a > 1)
					return "ambient 'a' must be a value between 0 and 1 on the LIGHTS block"
					ambientIllumination.push(a);
			}
			else
				return "unable to parse A component of the ambient illumination for ID = " + lightId;
		}
		else
			return "ambient component undefined for ID = " + lightId;

		// Retrieves the diffuse component
		var diffuseIllumination = [];
		if (diffuseIndex != -1) {
			// R
			var r = this.reader.getFloat(grandChildren[diffuseIndex], 'r');
			if (r != null ) {
				if (isNaN(r))
					return "diffuse 'r' is a non numeric value on the LIGHTS block";
				else if (r < 0 || r > 1)
					return "diffuse 'r' must be a value between 0 and 1 on the LIGHTS block"
					else
						diffuseIllumination.push(r);
			}
			else
				return "unable to parse R component of the diffuse illumination for ID = " + lightId;

			// G
			var g = this.reader.getFloat(grandChildren[diffuseIndex], 'g');
			if (g != null ) {
				if (isNaN(g))
					return "diffuse 'g' is a non numeric value on the LIGHTS block";
				else if (g < 0 || g > 1)
					return "diffuse 'g' must be a value between 0 and 1 on the LIGHTS block"
					else
						diffuseIllumination.push(g);
			}
			else
				return "unable to parse G component of the diffuse illumination for ID = " + lightId;

			// B
			var b = this.reader.getFloat(grandChildren[diffuseIndex], 'b');
			if (b != null ) {
				if (isNaN(b))
					return "diffuse 'b' is a non numeric value on the LIGHTS block";
				else if (b < 0 || b > 1)
					return "diffuse 'b' must be a value between 0 and 1 on the LIGHTS block"
					else
						diffuseIllumination.push(b);
			}
			else
				return "unable to parse B component of the diffuse illumination for ID = " + lightId;

			// A
			var a = this.reader.getFloat(grandChildren[diffuseIndex], 'a');
			if (a != null ) {
				if (isNaN(a))
					return "diffuse 'a' is a non numeric value on the LIGHTS block";
				else if (a < 0 || a > 1)
					return "diffuse 'a' must be a value between 0 and 1 on the LIGHTS block"
					else
						diffuseIllumination.push(a);
			}
			else
				return "unable to parse A component of the diffuse illumination for ID = " + lightId;
		}
		else
			return "diffuse component undefined for ID = " + lightId;

		// Retrieves the specular component
		var specularIllumination = [];
		if (specularIndex != -1) {
			// R
			var r = this.reader.getFloat(grandChildren[specularIndex], 'r');
			if (r != null ) {
				if (isNaN(r))
					return "specular 'r' is a non numeric value on the LIGHTS block";
				else if (r < 0 || r > 1)
					return "specular 'r' must be a value between 0 and 1 on the LIGHTS block"
					else
						specularIllumination.push(r);
			}
			else
				return "unable to parse R component of the specular illumination for ID = " + lightId;

			// G
			var g = this.reader.getFloat(grandChildren[specularIndex], 'g');
			if (g != null ) {
				if (isNaN(g))
					return "specular 'g' is a non numeric value on the LIGHTS block";
				else if (g < 0 || g > 1)
					return "specular 'g' must be a value between 0 and 1 on the LIGHTS block"
					else
						specularIllumination.push(g);
			}
			else
				return "unable to parse G component of the specular illumination for ID = " + lightId;

			// B
			var b = this.reader.getFloat(grandChildren[specularIndex], 'b');
			if (b != null ) {
				if (isNaN(b))
					return "specular 'b' is a non numeric value on the LIGHTS block";
				else if (b < 0 || b > 1)
					return "specular 'b' must be a value between 0 and 1 on the LIGHTS block"
					else
						specularIllumination.push(b);
			}
			else
				return "unable to parse B component of the specular illumination for ID = " + lightId;

			// A
			var a = this.reader.getFloat(grandChildren[specularIndex], 'a');
			if (a != null ) {
				if (isNaN(a))
					return "specular 'a' is a non numeric value on the LIGHTS block";
				else if (a < 0 || a > 1)
					return "specular 'a' must be a value between 0 and 1 on the LIGHTS block"
					else
						specularIllumination.push(a);
			}
			else
				return "unable to parse A component of the specular illumination for ID = " + lightId;
		}
		else
			return "specular component undefined for ID = " + lightId;

		// Light global information.
		this.lights[lightId] = [enableLight, positionLight, ambientIllumination, diffuseIllumination, specularIllumination];
		numLights++;
	}

	if (numLights == 0)
		return "at least one light must be defined";
	else if (numLights > 8)
		this.onXMLMinorError("too many lights defined; WebGL imposes a limit of 8 lights");

	console.log("Parsed lights");

	return null ;
}

/**
 * Parses the <TEXTURES> block.
 */
MySceneGraph.prototype.parseTextures = function(texturesNode) {

	this.textures = [];

	var eachTexture = texturesNode.children;
	// Each texture.

	var oneTextureDefined = false;

	for (var i = 0; i < eachTexture.length; i++) {
		var nodeName = eachTexture[i].nodeName;
		if (nodeName == "TEXTURE") {
			// Retrieves texture ID.
			var textureID = this.reader.getString(eachTexture[i], 'id');
			if (textureID == null )
				return "failed to parse texture ID";
			// Checks if ID is valid.
			if (this.textures[textureID] != null )
				return "texture ID must unique (conflict with ID = " + textureID + ")";

			var texSpecs = eachTexture[i].children;
			var filepath = null ;
			var amplifFactorS = null ;
			var amplifFactorT = null ;
			// Retrieves texture specifications.
			for (var j = 0; j < texSpecs.length; j++) {
				var name = texSpecs[j].nodeName;
				if (name == "file") {
					if (filepath != null )
						return "duplicate file paths in texture with ID = " + textureID;

					filepath = this.reader.getString(texSpecs[j], 'path');
					if (filepath == null )
						return "unable to parse texture file path for ID = " + textureID;
				}
				else if (name == "amplif_factor") {
					if (amplifFactorS != null  || amplifFactorT != null )
						return "duplicate amplification factors in texture with ID = " + textureID;

					amplifFactorS = this.reader.getFloat(texSpecs[j], 's');
					amplifFactorT = this.reader.getFloat(texSpecs[j], 't');

					if (amplifFactorS == null  || amplifFactorT == null )
						return "unable to parse texture amplification factors for ID = " + textureID;
					else if (isNaN(amplifFactorS))
						return "'amplifFactorS' is a non numeric value";
					else if (isNaN(amplifFactorT))
						return "'amplifFactorT' is a non numeric value";
					else if (amplifFactorS <= 0 || amplifFactorT <= 0)
						return "value for amplifFactor must be positive";
				}
				else
					this.onXMLMinorError("unknown tag name <" + name + ">");
			}

			if (filepath == null )
				return "file path undefined for texture with ID = " + textureID;
			else if (amplifFactorS == null )
				return "s amplification factor undefined for texture with ID = " + textureID;
			else if (amplifFactorT == null )
				return "t amplification factor undefined for texture with ID = " + textureID;

			var texture = new CGFtexture(this.scene,"./scenes/" + filepath);

			this.textures[textureID] = [texture, amplifFactorS, amplifFactorT];
			oneTextureDefined = true;
		}
		else
			this.onXMLMinorError("unknown tag name <" + nodeName + ">");
	}

	if (!oneTextureDefined)
		return "at least one texture must be defined in the TEXTURES block";

	console.log("Parsed textures");
}

/**
 * Parses the <MATERIALS> node.
 */
MySceneGraph.prototype.parseMaterials = function(materialsNode) {

	var children = materialsNode.children;
	// Each material.

	this.materials = [];

	var oneMaterialDefined = false;

	for (var i = 0; i < children.length; i++) {
		if (children[i].nodeName != "MATERIAL") {
			this.onXMLMinorError("unknown tag name <" + children[i].nodeName + ">");
			continue;
		}

		var materialID = this.reader.getString(children[i], 'id');
		if (materialID == null )
			return "no ID defined for material";

		if (this.materials[materialID] != null )
			return "ID must be unique for each material (conflict: ID = " + materialID + ")";

		var materialSpecs = children[i].children;

		var nodeNames = [];

		for (var j = 0; j < materialSpecs.length; j++)
			nodeNames.push(materialSpecs[j].nodeName);

		// Determines the values for each field.
		// Shininess.
		var shininessIndex = nodeNames.indexOf("shininess");
		if (shininessIndex == -1)
			return "no shininess value defined for material with ID = " + materialID;
		var shininess = this.reader.getFloat(materialSpecs[shininessIndex], 'value');
		if (shininess == null )
			return "unable to parse shininess value for material with ID = " + materialID;
		else if (isNaN(shininess))
			return "'shininess' is a non numeric value";
		else if (shininess <= 0)
			return "'shininess' must be positive";

		// Specular component.
		var specularIndex = nodeNames.indexOf("specular");
		if (specularIndex == -1)
			return "no specular component defined for material with ID = " + materialID;
		var specularComponent = [];
		// R.
		var r = this.reader.getFloat(materialSpecs[specularIndex], 'r');
		if (r == null )
			return "unable to parse R component of specular reflection for material with ID = " + materialID;
		else if (isNaN(r))
			return "specular 'r' is a non numeric value on the MATERIALS block";
		else if (r < 0 || r > 1)
			return "specular 'r' must be a value between 0 and 1 on the MATERIALS block"
			specularComponent.push(r);
		// G.
		var g = this.reader.getFloat(materialSpecs[specularIndex], 'g');
		if (g == null )
			return "unable to parse G component of specular reflection for material with ID = " + materialID;
		else if (isNaN(g))
			return "specular 'g' is a non numeric value on the MATERIALS block";
		else if (g < 0 || g > 1)
			return "specular 'g' must be a value between 0 and 1 on the MATERIALS block";
		specularComponent.push(g);
		// B.
		var b = this.reader.getFloat(materialSpecs[specularIndex], 'b');
		if (b == null )
			return "unable to parse B component of specular reflection for material with ID = " + materialID;
		else if (isNaN(b))
			return "specular 'b' is a non numeric value on the MATERIALS block";
		else if (b < 0 || b > 1)
			return "specular 'b' must be a value between 0 and 1 on the MATERIALS block";
		specularComponent.push(b);
		// A.
		var a = this.reader.getFloat(materialSpecs[specularIndex], 'a');
		if (a == null )
			return "unable to parse A component of specular reflection for material with ID = " + materialID;
		else if (isNaN(a))
			return "specular 'a' is a non numeric value on the MATERIALS block";
		else if (a < 0 || a > 1)
			return "specular 'a' must be a value between 0 and 1 on the MATERIALS block";
		specularComponent.push(a);

		// Diffuse component.
		var diffuseIndex = nodeNames.indexOf("diffuse");
		if (diffuseIndex == -1)
			return "no diffuse component defined for material with ID = " + materialID;
		var diffuseComponent = [];
		// R.
		r = this.reader.getFloat(materialSpecs[diffuseIndex], 'r');
		if (r == null )
			return "unable to parse R component of diffuse reflection for material with ID = " + materialID;
		else if (isNaN(r))
			return "diffuse 'r' is a non numeric value on the MATERIALS block";
		else if (r < 0 || r > 1)
			return "diffuse 'r' must be a value between 0 and 1 on the MATERIALS block";
		diffuseComponent.push(r);
		// G.
		g = this.reader.getFloat(materialSpecs[diffuseIndex], 'g');
		if (g == null )
			return "unable to parse G component of diffuse reflection for material with ID = " + materialID;
		else if (isNaN(g))
			return "diffuse 'g' is a non numeric value on the MATERIALS block";
		else if (g < 0 || g > 1)
			return "diffuse 'g' must be a value between 0 and 1 on the MATERIALS block";
		diffuseComponent.push(g);
		// B.
		b = this.reader.getFloat(materialSpecs[diffuseIndex], 'b');
		if (b == null )
			return "unable to parse B component of diffuse reflection for material with ID = " + materialID;
		else if (isNaN(b))
			return "diffuse 'b' is a non numeric value on the MATERIALS block";
		else if (b < 0 || b > 1)
			return "diffuse 'b' must be a value between 0 and 1 on the MATERIALS block";
		diffuseComponent.push(b);
		// A.
		a = this.reader.getFloat(materialSpecs[diffuseIndex], 'a');
		if (a == null )
			return "unable to parse A component of diffuse reflection for material with ID = " + materialID;
		else if (isNaN(a))
			return "diffuse 'a' is a non numeric value on the MATERIALS block";
		else if (a < 0 || a > 1)
			return "diffuse 'a' must be a value between 0 and 1 on the MATERIALS block";
		diffuseComponent.push(a);

		// Ambient component.
		var ambientIndex = nodeNames.indexOf("ambient");
		if (ambientIndex == -1)
			return "no ambient component defined for material with ID = " + materialID;
		var ambientComponent = [];
		// R.
		r = this.reader.getFloat(materialSpecs[ambientIndex], 'r');
		if (r == null )
			return "unable to parse R component of ambient reflection for material with ID = " + materialID;
		else if (isNaN(r))
			return "ambient 'r' is a non numeric value on the MATERIALS block";
		else if (r < 0 || r > 1)
			return "ambient 'r' must be a value between 0 and 1 on the MATERIALS block";
		ambientComponent.push(r);
		// G.
		g = this.reader.getFloat(materialSpecs[ambientIndex], 'g');
		if (g == null )
			return "unable to parse G component of ambient reflection for material with ID = " + materialID;
		else if (isNaN(g))
			return "ambient 'g' is a non numeric value on the MATERIALS block";
		else if (g < 0 || g > 1)
			return "ambient 'g' must be a value between 0 and 1 on the MATERIALS block";
		ambientComponent.push(g);
		// B.
		b = this.reader.getFloat(materialSpecs[ambientIndex], 'b');
		if (b == null )
			return "unable to parse B component of ambient reflection for material with ID = " + materialID;
		else if (isNaN(b))
			return "ambient 'b' is a non numeric value on the MATERIALS block";
		else if (b < 0 || b > 1)
			return "ambient 'b' must be a value between 0 and 1 on the MATERIALS block";
		ambientComponent.push(b);
		// A.
		a = this.reader.getFloat(materialSpecs[ambientIndex], 'a');
		if (a == null )
			return "unable to parse A component of ambient reflection for material with ID = " + materialID;
		else if (isNaN(a))
			return "ambient 'a' is a non numeric value on the MATERIALS block";
		else if (a < 0 || a > 1)
			return "ambient 'a' must be a value between 0 and 1 on the MATERIALS block";
		ambientComponent.push(a);

		// Emission component.
		var emissionIndex = nodeNames.indexOf("emission");
		if (emissionIndex == -1)
			return "no emission component defined for material with ID = " + materialID;
		var emissionComponent = [];
		// R.
		r = this.reader.getFloat(materialSpecs[emissionIndex], 'r');
		if (r == null )
			return "unable to parse R component of emission for material with ID = " + materialID;
		else if (isNaN(r))
			return "emisson 'r' is a non numeric value on the MATERIALS block";
		else if (r < 0 || r > 1)
			return "emisson 'r' must be a value between 0 and 1 on the MATERIALS block";
		emissionComponent.push(r);
		// G.
		g = this.reader.getFloat(materialSpecs[emissionIndex], 'g');
		if (g == null )
			return "unable to parse G component of emission for material with ID = " + materialID;
		if (isNaN(g))
			return "emisson 'g' is a non numeric value on the MATERIALS block";
		else if (g < 0 || g > 1)
			return "emisson 'g' must be a value between 0 and 1 on the MATERIALS block";
		emissionComponent.push(g);
		// B.
		b = this.reader.getFloat(materialSpecs[emissionIndex], 'b');
		if (b == null )
			return "unable to parse B component of emission for material with ID = " + materialID;
		else if (isNaN(b))
			return "emisson 'b' is a non numeric value on the MATERIALS block";
		else if (b < 0 || b > 1)
			return "emisson 'b' must be a value between 0 and 1 on the MATERIALS block";
		emissionComponent.push(b);
		// A.
		a = this.reader.getFloat(materialSpecs[emissionIndex], 'a');
		if (a == null )
			return "unable to parse A component of emission for material with ID = " + materialID;
		else if (isNaN(a))
			return "emisson 'a' is a non numeric value on the MATERIALS block";
		else if (a < 0 || a > 1)
			return "emisson 'a' must be a value between 0 and 1 on the MATERIALS block";
		emissionComponent.push(a);

		// Creates material with the specified characteristics.
		var newMaterial = new CGFappearance(this.scene);
		newMaterial.setShininess(shininess);
		newMaterial.setAmbient(ambientComponent[0], ambientComponent[1], ambientComponent[2], ambientComponent[3]);
		newMaterial.setDiffuse(diffuseComponent[0], diffuseComponent[1], diffuseComponent[2], diffuseComponent[3]);
		newMaterial.setSpecular(specularComponent[0], specularComponent[1], specularComponent[2], specularComponent[3]);
		newMaterial.setEmission(emissionComponent[0], emissionComponent[1], emissionComponent[2], emissionComponent[3]);
		this.materials[materialID] = newMaterial;
		oneMaterialDefined = true;
	}

	if (!oneMaterialDefined)
		return "at least one material must be defined on the MATERIALS block";

	// Generates a default material.
	this.generateDefaultMaterial();

	console.log("Parsed materials");
}

/**
 * Parses the <ANIMATIONS> block.
 */
MySceneGraph.prototype.parseAnimations = function(animationsNode) {

	// Traverses nodes.
	var children = animationsNode.children;

	for (let i = 0; i < children.length; i++) {
		var animationName;
		if ((animationName = children[i].nodeName) == "ANIMATION") {
			// Retrieves animation ID.
			var animationID = this.reader.getString(children[i], 'id');
			if (animationID == null )
				return "failed to retrieve animation ID";
			// Checks if ID is valid.
			if (this.animations[animationID] != null )
				return "animation ID must be unique (conflict: ID = " + animationID + ")";

			// console.log("Processing animation "+animationID);

			var type = this.reader.getItem(children[i], 'type', ['linear', 'circular', 'bezier', 'combo']);

			if (type == null)
				this.onXMLMinorError("Error in animation type");

			let speed = null;
			if(type != 'combo'){
				speed = this.reader.getFloat(children[i], 'speed');
				if (speed == null ) {
					this.onXMLMinorError("Unable to parse speed of animation; discarding animation");
					break;
				}
			}

			this.parseAnimation(children[i], animationID, speed, type);

			if(this.errorMsg != null){
				this.onXMLMinorError(this.errorMsg);
				this.errorMsg = null;
			}

		} else
		{this.onXMLMinorError("unknown tag name <" + nodeName);}

	}
	//Check if a combo animation contain a combo animation
	for(let cID in this.comboIDs) {
		for(let aID in this.comboIDs[cID]){
			if(this.comboIDs[this.comboIDs[cID][aID]]!=null){
				return ("A combo cannot contain another combo; Please correct this on combo ID: "+cID+ " with ID: "+ (this.comboIDs[cID][aID]));
			}
		}
	}

	console.log("Parsed animations");
	return null ;
}

/**
 * Parses the Animation.
 * @param  {array} children with rest of args to parse
 * @param  {float} speed with speed of animation
 * @param  {string} type with type of animation
 */
MySceneGraph.prototype.parseAnimation = function(children, animationID, speed, type) {

	// Creates animation.
	switch(type){
	case 'linear':{
		let controlPointBlock = children.getElementsByTagName('controlpoint');
		if(controlPointBlock == null){
			this.errorMsg= "No Control point found at animation block with id " + animationID;
			return;
		}
		let nrChild = controlPointBlock.length;
		let controlPoints = [];
		if(nrChild < 2) {
			this.errorMsg="Wrong Number of controlPoints";
			return;
		}

		for(let controlPoint of controlPointBlock) {
			// Retrieves coordinate parameters.
			let coordinates = ['x','y','z'];
			let temp_array = [];

			for(let coor = 0; coor < coordinates.length; coor++){
				let temp_coord = this.reader.getFloat(controlPoint, coordinates[coor]+coordinates[coor]);
				if(this.errorMsg == null)
					this.errorMsg = this.checkValuesNullorNan(temp_coord,coordinates[coor]+" on Animation ID: "+ animationID);
				temp_array.push(temp_coord);
			}

			controlPoints.push(temp_array);
		}

		let linearAnimation = new MyLinearAnimation(animationID, speed, controlPoints);
		this.animations[animationID]=linearAnimation;
		break;
	}
	case 'circular':{
		let center = [];
		let coordinates = ['x','y','z'];

		for(let coor = 0; coor < coordinates.length; coor++){
			let temp_coord = this.reader.getFloat(children, 'center' + coordinates[coor]);
			if(this.errorMsg == null)
				this.errorMsg = this.checkValuesNullorNan(temp_coord,"Center"+coordinates[coor]+" on Animation ID: "+ animationID);
			center[coordinates[coor]]=temp_coord;
		}

		let radius = this.reader.getFloat(children, 'radius');
		this.errorMsg = this.checkValuesNullorNan(radius, 'Radius' + " on Animation ID: "+ animationID);

		let startAngle = this.reader.getFloat(children, 'startang');
		this.errorMsg = this.checkValuesNullorNan(startAngle, 'Start Angle' +" on Animation ID: "+ animationID);

		var rotAngle = this.reader.getFloat(children, 'rotang');
		this.errorMsg = this.checkValuesNullorNan(rotAngle, 'Angle of Rotation'+" on Animation ID: "+ animationID);

		let circularAnimation = new MyCircularAnimation(animationID, speed, center, radius, startAngle, rotAngle);
		this.animations[animationID]=circularAnimation;
		break;
	}
	case 'bezier':{
		let controlPointBlock = children.getElementsByTagName('controlpoint');
		if(controlPointBlock == null){
			this.errorMsg= "No Control point found at animation block with id " + animationID;
			return;
		}

		let nrChild = controlPointBlock.length;
		let controlPoints = [];
		if(nrChild != 4) {
			this.errorMsg="Wrong Number of controlPoints";
			return;
		}

		for(let controlPoint of controlPointBlock) {
			// Retrieves coordinate parameters.
			let coordinates = ['x','y','z'];
			let temp_array = [];

			for(let coor = 0; coor < coordinates.length; coor++){
				let temp_coord = this.reader.getFloat(controlPoint, coordinates[coor]+coordinates[coor]);
				if(this.errorMsg == null)
					this.errorMsg = this.checkValuesNullorNan(temp_coord,coordinates[coor]+" on Animation ID: "+ animationID);
				temp_array.push(temp_coord);
			}

			controlPoints.push(temp_array);
		}

		let bezierAnimation = new MyBezierAnimation(animationID, speed, controlPoints);
		this.animations[animationID]=bezierAnimation;
		break;
	}
	case 'combo':{
		let spanRefBlock = children.getElementsByTagName('SPANREF');
		if(spanRefBlock == null){
			this.errorMsg= "No animation found at combo animation block with id " + animationID;
			return;
		}

		let nrChild = spanRefBlock.length;
		let animationBlockIDs = [];
		for(let spanRef of spanRefBlock) {
			let spanRefID = this.reader.getString(spanRef, 'id');
			// if(this.comboIDs[spanRefID] != null){
			// 	this.errorMsg= "A combo animation cannot contain another combo animation; discarding combo";
			// 	continue;
			// }
			animationBlockIDs.push(spanRefID);
		}
		this.comboIDs[animationID] = animationBlockIDs;
	}
	default:
		break;
	}

	return;
}

/**
 * Parses the <NODES> block.
 */
MySceneGraph.prototype.parseNodes = function(nodesNode) {

	// Traverses nodes.
	var children = nodesNode.children;

	for (var i = 0; i < children.length; i++) {
		var nodeName;
		if ((nodeName = children[i].nodeName) == "ROOT") {
			// Retrieves root node.
			if (this.idRoot != null )
				return "there can only be one root node";
			else {
				var root = this.reader.getString(children[i], 'id');
				if (root == null )
					return "failed to retrieve root node ID";
				this.idRoot = root;
			}
		}
		else if (nodeName == "NODE") {
			// Retrieves node ID.
			var nodeID = this.reader.getString(children[i], 'id');
			if (nodeID == null )
				return "failed to retrieve node ID";
			// Checks if ID is valid.
			if (this.nodes[nodeID] != null )
				return "node ID must be unique (conflict: ID = " + nodeID + ")";

			// console.log("Processing node "+nodeID);

			// Creates node.
			this.nodes[nodeID] = new MyGraphNode(this,nodeID);

			//Read Selectable Property
			let selectable = this.reader.getString(children[i], 'selectable', false);

			if (selectable == "true"){
				selectable = true;
			} else if(selectable=="false"){
				selectable = false;
			}

			this.nodes[nodeID].setSelectable(selectable);

			//Read Visible Property
			let visible = this.reader.getString(children[i], 'visible', false);

			if(visible){
				if (visible == "true"){
					visible = true;
				} else if(visible=="false"){
					visible = false;
				}

				this.nodes[nodeID].setVisible(visible);
			}


			// Gathers child nodes.
			var nodeSpecs = children[i].children;
			var specsNames = [];
			var possibleValues = ["MATERIAL", "TEXTURE", "TRANSLATION", "ROTATION", "SCALE", "ANIMATIONREFS", "DESCENDANTS"];
			for (var j = 0; j < nodeSpecs.length; j++) {
				var name = nodeSpecs[j].nodeName;
				specsNames.push(nodeSpecs[j].nodeName);

				// Warns against possible invalid tag names.
				if (possibleValues.indexOf(name) == -1)
					this.onXMLMinorError("unknown tag <" + name + ">");
			}

			// Retrieves material ID.
			var materialIndex = specsNames.indexOf("MATERIAL");
			if (materialIndex == -1)
				return "material must be defined (node ID = " + nodeID + ")";
			var materialID = this.reader.getString(nodeSpecs[materialIndex], 'id');
			if (materialID == null )
				return "unable to parse material ID (node ID = " + nodeID + ")";
			if (materialID != "null" && this.materials[materialID] == null )
				return "ID does not correspond to a valid material (node ID = " + nodeID + ")";

			this.nodes[nodeID].materialID = materialID;

			// Retrieves texture ID.
			var textureIndex = specsNames.indexOf("TEXTURE");
			if (textureIndex == -1)
				return "texture must be defined (node ID = " + nodeID + ")";
			var textureID = this.reader.getString(nodeSpecs[textureIndex], 'id');
			if (textureID == null )
				return "unable to parse texture ID (node ID = " + nodeID + ")";
			if (textureID != "null" && textureID != "clear" && this.textures[textureID] == null )
				return "ID does not correspond to a valid texture (node ID = " + nodeID + ")";

			this.nodes[nodeID].textureID = textureID;

			// Retrieves possible transformations.
			for (var j = 0; j < nodeSpecs.length; j++) {
				switch (nodeSpecs[j].nodeName) {
				case "TRANSLATION":
					// Retrieves translation parameters.
					var x = this.reader.getFloat(nodeSpecs[j], 'x');
					if (x == null ) {
						this.onXMLMinorError("unable to parse x-coordinate of translation; discarding transform");
						break;
					}
					else if (isNaN(x))
						return "non-numeric value for x-coordinate of translation (node ID = " + nodeID + ")";

					var y = this.reader.getFloat(nodeSpecs[j], 'y');
					if (y == null ) {
						this.onXMLMinorError("unable to parse y-coordinate of translation; discarding transform");
						break;
					}
					else if (isNaN(y))
						return "non-numeric value for y-coordinate of translation (node ID = " + nodeID + ")";

					var z = this.reader.getFloat(nodeSpecs[j], 'z');
					if (z == null ) {
						this.onXMLMinorError("unable to parse z-coordinate of translation; discarding transform");
						break;
					}
					else if (isNaN(z))
						return "non-numeric value for z-coordinate of translation (node ID = " + nodeID + ")";

					mat4.translate(this.nodes[nodeID].transformMatrix, this.nodes[nodeID].transformMatrix, [x, y, z]);
					break;
				case "ROTATION":
					// Retrieves rotation parameters.
					var axis = this.reader.getItem(nodeSpecs[j], 'axis', ['x', 'y', 'z']);
					if (axis == null ) {
						this.onXMLMinorError("unable to parse rotation axis; discarding transform");
						break;
					}
					var angle = this.reader.getFloat(nodeSpecs[j], 'angle');
					if (angle == null ) {
						this.onXMLMinorError("unable to parse rotation angle; discarding transform");
						break;
					}
					else if (isNaN(angle))
						return "non-numeric value for rotation angle (node ID = " + nodeID + ")";

					mat4.rotate(this.nodes[nodeID].transformMatrix, this.nodes[nodeID].transformMatrix, angle * DEGREE_TO_RAD, this.axisCoords[axis]);
					break;
				case "SCALE":
					// Retrieves scale parameters.
					var sx = this.reader.getFloat(nodeSpecs[j], 'sx');
					if (sx == null ) {
						this.onXMLMinorError("unable to parse x component of scaling; discarding transform");
						break;
					}
					else if (isNaN(sx))
						return "non-numeric value for x component of scaling (node ID = " + nodeID + ")";

					var sy = this.reader.getFloat(nodeSpecs[j], 'sy');
					if (sy == null ) {
						this.onXMLMinorError("unable to parse y component of scaling; discarding transform");
						break;
					}
					else if (isNaN(sy))
						return "non-numeric value for y component of scaling (node ID = " + nodeID + ")";

					var sz = this.reader.getFloat(nodeSpecs[j], 'sz');
					if (sz == null ) {
						this.onXMLMinorError("unable to parse z component of scaling; discarding transform");
						break;
					}
					else if (isNaN(sz))
						return "non-numeric value for z component of scaling (node ID = " + nodeID + ")";

					mat4.scale(this.nodes[nodeID].transformMatrix, this.nodes[nodeID].transformMatrix, [sx, sy, sz]);
					break;
				default:
					break;
				}
			}

			// Retrieves information about animations.
			// <ANIMATIONS>
			let animationIndex = specsNames.indexOf("ANIMATIONREFS");
			if (animationIndex != -1) {
				let animationRefBlock = (nodeSpecs[animationIndex]).getElementsByTagName('ANIMATIONREF');
				if(animationRefBlock == null){
					this.errorMsg= "No animation found at animationRefs animation block with id " + nodeID;
					break;
				}
				else {
					let comboAnimation = new MyComboAnimation(this.animIdx);

					let nrChild = animationRefBlock.length;
					let totalAnimationNodeIDs = [];
					for(let animationRef of animationRefBlock) {
						let animationRefID = this.reader.getString(animationRef, 'id');

						if(this.comboIDs[animationRefID] != null)
							totalAnimationNodeIDs.push.apply(totalAnimationNodeIDs,this.comboIDs[animationRefID]);
						else
							totalAnimationNodeIDs.push(animationRefID);

					}

					for(let k = 0; k < totalAnimationNodeIDs.length; k++)
						comboAnimation.addAnimation(this.animations[totalAnimationNodeIDs[k]]);

					this.comboAnimations[this.animIdx] = comboAnimation;

					this.nodes[nodeID].addAnimation(this.animIdx);
					this.animIdx++;
				}
			}


			// Retrieves information about children.
			var descendantsIndex = specsNames.indexOf("DESCENDANTS");
			if (descendantsIndex == -1)
				return "an intermediate node must have descendants";

			var descendants = nodeSpecs[descendantsIndex].children;
			var sizeChildren = 0;
			for (var j = 0; j < descendants.length; j++) {
				if (descendants[j].nodeName == "NODEREF")
				{
					var curId = this.reader.getString(descendants[j], 'id');
					// console.log("   Descendant: "+curId);

					if (curId == null )
						this.onXMLMinorError("unable to parse descendant id");
					else if (curId == nodeID)
						return "a node may not be a child of its own";
					else {
						this.nodes[nodeID].addChild(curId);
						sizeChildren++;
					}
				}
				else
					if (descendants[j].nodeName == "LEAF")
					{
						var type=this.reader.getItem(descendants[j], 'type', ['rectangle', 'circle', 'cylinder', 'sphere', 'triangle', 'patch']);

						if (type == null)
							this.onXMLMinorError("Error in leaf type");

						var args=this.reader.getString(descendants[j],'args');

						if(args == null)
							this.onXMLMinorError("Error in leaf args");

						var argsVal = this.parseArgsPrimitives(args,type);

						if(type == 'patch'){
							argsVal =this.parsePatch(argsVal,descendants[j].children);
						}

						//if a leaf gives an error in parsing args, this is returned here
						if(this.errorMsg != null){
							this.onXMLMinorError(this.errorMsg);
							this.errorMsg = null;
							sizeChildren++;
							continue;
						}

						this.nodes[nodeID].addLeaf(new MyGraphLeaf(this,type,argsVal));

						sizeChildren++;
					}
					else
						this.onXMLMinorError("unknown tag <" + descendants[j].nodeName + ">");

			}
			if (sizeChildren == 0)
				return "at least one descendant must be defined for each intermediate node";
		}
		else
			this.onXMLMinorError("unknown tag name <" + nodeName);
	}

	console.log("Parsed nodes");
	return null ;
}

/**
 * Parses the Patches.
 * @param  {array} args with values of primitive info
 * @param  {array} descendants with cplines and cpoints of patch
 */
MySceneGraph.prototype.parsePatch = function(args, descendants) {
	var controlVertexes=[];

	let uDegree=0;
	let vDegree=0;

	for (var i = 0; i < descendants.length; i++) {
		if (descendants[i].nodeName == "CPLINE"){
			uDegree=descendants.length;
			var children = descendants[i].children;

			var cplines = [];
			for (var j = 0; j < children.length; j++){

				if (children[j].nodeName == "CPOINT"){
					vDegree=children.length;
					// Retrieves coordinate parameters.
					let coordinates = ['x','y','z','w'];
					let temp_array = [];
					for(let coor = 0; coor < coordinates.length; coor++){
						let temp_coord = this.reader.getFloat(children[j], coordinates[coor]+coordinates[coor]);
						if(this.errorMsg == null)
							this.errorMsg = this.checkValuesNullorNan(temp_coord,coordinates[coor]+"on patches");
						temp_array.push(temp_coord);
					}

					cplines.push(temp_array);
				}
				else{
					this.onXMLMinorError("unknown tag name <" + children[j].nodeName + ">");
				}

			}

			controlVertexes.push(cplines);
		}
		else{
			this.onXMLMinorError("unknown tag name <" + descendants[i].nodeName + ">");
		}
	}
	args.push(uDegree-1); //because Degree= Order-1, and order is equal a number of points
	args.push(vDegree-1);
	args.push(controlVertexes);

	console.log("Parsed patches");
	return args;
}

/**
 * Parse the arguments of primitives and check if exists errors
 * @param  {array} values with arguments of primitive
 * @param  {string} type with type of primitive
 */
MySceneGraph.prototype.parseArgsPrimitives = function(values, type) {
	var vals = [];
	var valuesS = values.split(" ");

	switch(type){
	case 'rectangle':{
		if(valuesS.length != 4)
			this.errorMsg = "RECTANGLE: Wrong number of arguments for leaf type";
		else{
			for(var i=0;i<4;i++){
				vals.push(parseFloat(valuesS[i]));
			}
			this.errorMsg = this.checkArgsRectangle(vals);
		}

		break;
	}
	case 'triangle':{
		if(valuesS.length != 9)
			this.errorMsg = "TRIANGLE: Wrong number of arguments for leaf type";
		else{
			for(var i=0;i<9;i++){
				vals.push(parseFloat(valuesS[i]));
			}
			this.errorMsg = this.checkArgsTriangle(vals);
		}
		break;

	}
	case 'circle':{
		if(valuesS.length != 1)
			this.errorMsg = "CIRCLE: Wrong number of arguments for leaf type";
		else{
			vals.push(parseInt(valuesS[0]));
		}
		break;
	}
	case 'cylinder':{
		if(valuesS.length != 7)
			this.errorMsg = " CYLINDER: Wrong number of arguments for leaf type";
		else{
			for(var i=0;i<3;i++){
				vals.push(parseFloat(valuesS[i]));
			}
			for(var j=3;j<7;j++){
				vals.push(parseInt(valuesS[j]));
			}
			this.errorMsg = this.checkArgsCylinder(vals);
		}
		break;
	}
	case 'sphere':{
		if(valuesS.length != 3)
			this.errorMsg = "SPHERE: Wrong number of arguments for leaf type";
		else{
			vals.push(parseFloat(valuesS[0]));
			vals.push(parseInt(valuesS[1]));
			vals.push(parseInt(valuesS[2]));
			this.errorMsg = this.checkArgsSphere(vals);
		}
		break;
	}
	case 'patch':
		if(valuesS.length != 2)
			this.errorMsg = "PATCH: Wrong number of arguments for leaf type";
		else{
			for(var i=0;i<2;i++){
				let temp = parseFloat(valuesS[i]);
				vals.push(temp);
				if(this.errorMsg == null)
					this.errorMsg = this.checkArgsNotNullNan(temp, 'patch');
			}
		}
		break;

	default:
		break;
	}

	return vals;
}

/**
 * Check if a array of arguments contains null or non numeric values
 * In case of error Returns a string with detailed error
 * @param  {array} values with arguments of primitive
 * @param  {string} type with type of primitive
 */
MySceneGraph.prototype.checkArgsNotNullNan = function(args, type){
	var index;
	for(index = 0; index < args.length; index++){
		if (args[index] == null ) {
			return type.toUpperCase() + ": Unable to parse arg nr " + index;
		}
		else if (isNaN(args[index])){
			return type.toUpperCase() + ": Non-numeric value for arg nr " + index;
		}
	}
}

/**
 * Check arguments of rectangle primitive
 * In case of error Returns a string with detailed error
 * @param  {array} args with arguments of primitive
 */
MySceneGraph.prototype.checkArgsRectangle = function(args){
	var errorMsg;
	if(errorMsg = this.checkArgsNotNullNan(args, 'rectangle'))
		return errorMsg;

	if(args[0] >= args[2] || args[1] <= args[3])
		return "RECTANGLE: Invalid Arguments - Left Top and Bottom right with incorrect cordinates";
}

/**
 * Check arguments of triangle primitive
 * In case of error Returns a string with detailed error
 * @param  {array} args with arguments of primitive
 */
MySceneGraph.prototype.checkArgsTriangle = function(args){
	var errorMsg
	if(errorMsg = this.checkArgsNotNullNan(args, 'triangle'))
		return errorMsg;

	let p1 = [args[0], args[1], args[2]];
	let p2 = [args[3], args[4], args[5]];
	let p3 = [args[6], args[7], args[8]];

	if(p1.toString() == p2.toString() || p1.toString() == p3.toString() || p2.toString() == p3.toString())
		return "TRIANGLE: Invalid Arguments - one or more points are the same";
}

/**
 * Check arguments of cylinder primitive
 * In case of error Returns a string with detailed error
 * @param  {array} args with arguments of primitive
 */
MySceneGraph.prototype.checkArgsCylinder = function(args){
	var errorMsg;
	if(errorMsg = this.checkArgsNotNullNan(args, 'cylinder'))
		return errorMsg;

	if(args[0] <= 0)
		return "CYLINDER: Invalid Arguments - height";
	if(args[1] < 0)
		return "CYLINDER: Invalid Arguments - bottom radius";
	if(args[2] < 0)
		return "CYLINDER: Invalid Arguments - top radius";
	if(args[3] < 1)
		return "CYLINDER: Invalid Arguments - stacks";
	if(args[4] < 3)
		return "CYLINDER: Invalid Arguments - slices";
	if((args[5] != true && args[5] != false) || (args[6] != true && args[6] != false))
		return "CYLINDER: Invalid Arguments - top cap or bottom cap";
}

/**
 * Check arguments of sphere primitive
 * In case of error Returns a string with detailed error
 * @param  {array} args with arguments of primitive
 */
MySceneGraph.prototype.checkArgsSphere = function(args){
	var errorMsg;
	if(errorMsg = this.checkArgsNotNullNan(args,'sphere'))
		return errorMsg;

	if(args[0] <= 0)
		return "SPHERE: Invalid Arguments - radius";
	if(args[1] < 2)
		return "SPHERE: Invalid Arguments - stacks";
	if(args[2] < 3)
		return "SPHERE: Invalid Arguments - slices";
}

/**
 * Check values if are null or NaN
 * In case of error Returns a string with detailed error
 * @param  {array} value with a float or integer value
 * @param  {string} info with information about where value is tested
 */
MySceneGraph.prototype.checkValuesNullorNan = function(value, info){
	if (value == null )
		return "unable to parse" + info;

	if (isNaN(value))
		return "non-numeric value for " + info;

	return null;
}

/*
 * Callback to be executed on any read error
 */
MySceneGraph.prototype.onXMLError = function(message) {
	console.error("XML Loading Error: " + message);
	this.loadedOk = false;
}

/**
 * Callback to be executed on any minor error, showing a warning on the console.
 */
MySceneGraph.prototype.onXMLMinorError = function(message) {
	console.warn("Warning: " + message);
}

/**
 * Callback to be executed on any log, showing a message on the console.
 */
MySceneGraph.prototype.log = function(message) {
	console.log("   " + message);
}

/**
 * Generates a default material, with a random name. This material will be passed onto the root node, which
 * may override it.
 */
MySceneGraph.prototype.generateDefaultMaterial = function() {
	var materialDefault = new CGFappearance(this.scene);
	materialDefault.setShininess(1);
	materialDefault.setSpecular(0, 0, 0, 1);
	materialDefault.setDiffuse(0.4, 0.4, 0.4, 1);
	materialDefault.setAmbient(0.4, 0.4, 0.4, 1);
	materialDefault.setEmission(0, 0, 0, 1);

	// Generates random material ID not currently in use.
	this.defaultMaterialID = null;
	do this.defaultMaterialID = MySceneGraph.generateRandomString(5);
	while (this.materials[this.defaultMaterialID] != null);

	this.materials[this.defaultMaterialID] = materialDefault;
}


/**
 * Generates a random string of the specified length.
 */
MySceneGraph.generateRandomString = function(length) {
	// Generates an array of random integer ASCII codes of the specified length
	// and returns a string of the specified length.
	var numbers = [];
	for (var i = 0; i < length; i++)
		numbers.push(Math.floor(Math.random() * 256));          // Random ASCII code.

	return String.fromCharCode.apply(null, numbers);
}

/**
 * Displays the scene, processing each node, starting in the root node.
 */

MySceneGraph.prototype.displayScene = function() {
	// entry point for graph rendering
	this.nodes[this.idRoot].display(null, this.defaultMaterialID,false);
}
