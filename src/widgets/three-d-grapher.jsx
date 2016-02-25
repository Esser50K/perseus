/* eslint-disable */
var React = require("react");
var _ = require("underscore");


var ApiOptions = require("../perseus-api.jsx").Options;
var Changeable   = require("../mixins/changeable.jsx");
var EditorJsonify = require("../mixins/editor-jsonify.jsx");
var Editor = require("../editor.jsx");
var Renderer = require("../renderer.jsx");
var MathInput = require("../components/math-input.jsx");

var ThreeDGrapher = React.createClass({
    mixins: [Changeable],

    // propTypes: {
    //     //TODO
    // },

    // getDefaultProps: function() {
    //     return {
    //         //TODO
    //     };
    // },

    initializeThreeState: function(){
        //TODO, automatic width and height changes
        var width = 600;
        var height = 400;
        var aspectRatio = width/height;

        var renderer = this.getRenderer(width, height);
        var camera = this.getCamera(aspectRatio);
        var controls = this.getControls(camera, renderer.domElement); 
        var scene = this.getScene();

        this.setState({
            renderer,
            camera,
            controls,
            scene
        });
    },

    getScene: function(){
        var scene = new THREE.Scene();
        this.addLight(scene);
        scene.add(this.getGraphMesh());
        scene.add(this.getXZPlane());        
        scene.add(this.getAxes());
        return scene;
    },

    getCamera: function(aspectRatio){
        var fov = 10;
        var near = 1;
        var far = 500;
        [x, y, z] = [-10, 20, 50];

        var camera = new THREE.PerspectiveCamera(
            fov, aspectRatio, near, far
        );
        camera.position.set(x, y, z);
        return camera;
    },

    getRenderer: function(width, height){
        var renderer = new THREE.WebGLRenderer();        
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(width, height);
        this.refs.container.appendChild(renderer.domElement);
        return renderer;
    },

    addLight: function(scene){
        var ambientLightColor = 0xaaaaaa;
        var lightSourceColor = 0xdddddd;
        var lightSourceIntensity = 0.5;
        var lightSourcePositions = [
            [-1, 1, 1],
            [-1, -1, 1]
        ];

        scene.add(new THREE.AmbientLight(ambientLightColor));
        lightSourcePositions.forEach(function(position){
            light = new THREE.DirectionalLight(
                lightSourceColor, lightSourceIntensity
            );
            var [x, y, z] = position;
            light.position.set(x, y, z);
            scene.add(light);
        });
    },

    getControls: function(camera, domElement){
        var controls = new THREE.OrbitControls(camera, domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 1.0;
        controls.enableZoom = false;
        return controls
    },

    getGraphMesh: function(){
        bounds = this.props.bounds
        var u_range = bounds.u_max - bounds.u_min;
        var v_range = bounds.v_max - bounds.v_min;
        
        functions = {}
        for (variable in this.props.functionStrings){
            funcString = this.props.functionStrings[variable]
            functions[variable] = new Function(
                ["u", "v"],
                "return " + funcString
            )
        }

        var meshFunction = function(u, v){
            var scaled_u = u_range*u + bounds.u_min;
            var scaled_v = v_range*v + bounds.v_min;
            //return in order x, z, y to accomidate
            //orbital controls
            return new THREE.Vector3(
                functions.x(scaled_u, scaled_v),
                functions.z(scaled_u, scaled_v),
                functions.y(scaled_u, scaled_v)                 
            );
        };
        var geometry = new THREE.ParametricGeometry(
            meshFunction, 100, 100
        )
        var material = new THREE.MeshPhongMaterial({
            color : 0x2194ce,
            specular: 0x009900,
            shininess: 10,
            shading: THREE.SmoothShading, 
            side: THREE.DoubleSide,
            transparent : true,
            opacity : 1,
        });
        return new THREE.Mesh(geometry, material);
    },

    getAxes: function(){
        var axisRadius = 5;
        var step = 1;
        var tickSize = 0.1;

        var material = new THREE.LineBasicMaterial({
            color : 0xdddddd
        });
        var xAxisGeometry = new THREE.Geometry();
        xAxisGeometry.vertices.push(
            new THREE.Vector3(-axisRadius, 0, 0),
            new THREE.Vector3(axisRadius, 0, 0)
        );

        for (var i = -axisRadius; i <= axisRadius; i += step){
            xAxisGeometry.vertices.push(
                new THREE.Vector3(i, -tickSize, 0),
                new THREE.Vector3(i, tickSize, 0)
            );
        }
        xAxis = new THREE.LineSegments(xAxisGeometry, material);

        var yAxis = xAxis.clone();
        yAxis.rotation.set(0, 0, Math.PI/2);
        var zAxis = xAxis.clone();
        zAxis.rotation.set(0, Math.PI/2, 0);

        var group = new THREE.Object3D();
        group.add(xAxis, yAxis, zAxis);

        return group;
    },

    getXZPlane: function() {
        var axisRadius = 5;
        var step = 1;

        /* Draw xz plane  instead of xy plane 
        to accomiate orbital controls. */
        var material = new THREE.LineBasicMaterial({
            color: 0x303030,
            linewidth : 1
        });
        var  xz_plane = new THREE.Geometry();
        for (var i = -axisRadius; i <= axisRadius; i += step){
            xz_plane.vertices.push(
                new THREE.Vector3(-axisRadius, 0, i),
                new THREE.Vector3(axisRadius, 0, i)
            );
            xz_plane.vertices.push(
                new THREE.Vector3(i, 0, -axisRadius),
                new THREE.Vector3(i, 0, axisRadius)
            );
        }
        return new THREE.LineSegments(xz_plane, material);
    },

    updateThreeJS: function() {
        // queue the next update
        requestAnimationFrame(() => this.updateThreeJS());

        if (this.state) {
            const {controls, renderer, scene, camera} = this.state;
            controls.update();
            renderer.render(scene, camera);
        }
    },

    componentDidMount: function() {
        this.forceUpdate();
        this.initializeThreeState();
        this.updateThreeJS();
    },

    componentWillReceiveProps: function(){
        //Redraw graph when receiving new props
        this.setState({
            scene: this.getScene()
        })
    },

    render: function() {
        return <div
            className="perseus-3d-grapher" 
            ref="container"
         />; //
    },
});

var EntryComponent = React.createClass({
    handleChange: function(){
        this.props.onUserInput(
            this.props.keyProp,
            this.refs.input.value
        );
    },

    render: function(){
        return (
            <div>
            {this.props.prompt}
            <input
                type="text"
                placeholder={this.props.placeholder}
                value={this.props.value}
                ref="input"
                onChange={this.handleChange} />
            </div>
        );
    }
});

var ThreeDGrapherEditor = React.createClass({
    mixins: [Changeable, EditorJsonify],

    getDefaultProps: function() {
        return {
            functionStrings: {
                x : "u",
                y : "v",
                z : "u*u + v*v"
            }, 
            bounds: {
                u_min : -5,
                u_max : 5,
                v_min : -5,
                v_max : 5
            }
        };
    },

    handleChange: function(object, key, value){
        object[key] = value;
        this.forceUpdate();
        this.change(this.props);
    },

    handleFunctionChange: function(variable, newFuncString) {
        this.handleChange(
            this.props.functionStrings,
            variable,
            newFuncString
        );
    },

    handleBoundChange: function(bound, value) {
        //TODO, Can't type minus first, or 0
        this.handleChange(
            this.props.bounds, bound, parseInt(value)
        );
    },

    render: function() {
        var equationEntries = [];
        for (var variable in this.props.functionStrings){
            equationEntries.push(
                <EntryComponent 
                    key={variable}
                    keyProp={variable}//I want access to this
                    prompt={variable+"(u, v) = "}
                    placeholder="Equation with u and v"
                    value={this.props.functionStrings[variable] || ""}
                    onUserInput={this.handleFunctionChange}
                 /> //
            )
        }

        var boundEntries = [];
        for (var boundName in this.props.bounds){
            boundEntries.push(
                <EntryComponent
                    key={boundName}
                    keyProp={boundName}
                    prompt={boundName+ ": "}
                    placeholder="Numerical bound"
                    value={this.props.bounds[boundName] || ""}
                    onUserInput={this.handleBoundChange}
                /> //
            )
        }

        return (
            <div className="perseus-three-d-grapher-editor">
                <form>{equationEntries}</form>
                <form>{boundEntries}</form>
            </div>
        );
    }
});


module.exports = {
    name: "three-d-grapher",
    displayName: "Three-dimensional grapher",
    widget: ThreeDGrapher,
    editor: ThreeDGrapherEditor,
    hidden: false,
};

