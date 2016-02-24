/* eslint-disable */
var React = require("react");
var _ = require("underscore");

var ApiOptions = require("../perseus-api.jsx").Options;
var Changeable   = require("../mixins/changeable.jsx");
var Editor = require("../editor.jsx");
var Renderer = require("../renderer.jsx");

var ThreeDGrapher = React.createClass({
    mixins: [Changeable],

    propTypes: {
        //TODO
    },

    getDefaultProps: function() {
        return {
            //TODO
        };
    },

    initializeThreeState: function(){
        //TODO, automatic width and height changes
        var width = 600;
        var height = 400;
        var aspect_ratio = width/height;

        var scene = new THREE.Scene();
        var camera = this.getCamera(aspect_ratio);
        var renderer = this.getRenderer(renderer, width, height);
        var controls = this.getControls(camera, renderer.domElement);

        this.addLight(scene);
        scene.add(this.getGraphMesh());
        scene.add(this.getAxes());
        renderer.render(scene, camera);        

        this.setState({
            renderer,
            controls,
            scene,
            camera,
        });
    },

    getCamera: function(aspect_ratio){
        var fov = 10;
        var near = 1;
        var far = 500;
        [x, y, z] = [-10, 20, 50];

        var camera = new THREE.PerspectiveCamera(
            fov, aspect_ratio, near, far
        );
        camera.position.set(x, y, z);
        return camera;
    },

    getRenderer: function(renderer, width, height){
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
        var u_min = -5;
        var u_max = 5;
        var v_min = -5;
        var v_max = 5;

        var u_range = u_max - u_min;
        var v_range = v_max - v_min;

        var meshFunction = function(u, v){
            var x = u_range*u + u_min;
            var y = v_range*v + v_min;
            var z = Math.sin(x)*Math.sin(y)
            //return in order x, z, y to accomidate
            //orbital controls
            return new THREE.Vector3(x, z, y);
        };
        var geometry = new THREE.ParametricGeometry(
            meshFunction, 100, 100, true
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
        var axis_radius = 5;
        var step = 1;
        var tickSize = 0.1;

        var group = new THREE.Group();

        var material = new THREE.LineBasicMaterial({
            color: 0x303030,
            linewidth : 1
        });

        /* Draw xz plane and y axis instead of 
         xy plane and z axis to accomiate orbital
         controls. */

        // xz plane
        var  xz_plane = new THREE.Geometry();


        for (var i = -axis_radius; i <= axis_radius; i += step){
            xz_plane.vertices.push(
                new THREE.Vector3(-axis_radius, 0, i),
                new THREE.Vector3(axis_radius, 0, i)
            );
            xz_plane.vertices.push(
                new THREE.Vector3(i, 0, -axis_radius),
                new THREE.Vector3(i, 0, axis_radius)
            );
        }
        group.add(new THREE.LineSegments(xz_plane, material));

        // y-axis
        var y_material = new THREE.LineBasicMaterial({
            color : 0xdddddd
        });
        var y_axis = new THREE.Geometry();
        y_axis.vertices.push(
            new THREE.Vector3(0, -axis_radius, 0),
            new THREE.Vector3(0, axis_radius, 0)
        );
        for (var i = -axis_radius; i <= axis_radius; i += step){
            y_axis.vertices.push(
                new THREE.Vector3(-tickSize, i, 0),
                new THREE.Vector3(tickSize, i, 0)
            );
        }
        group.add(new THREE.LineSegments(y_axis, y_material));

        return group;
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

    render: function() {
        return <div className="perseus-3d-grapher" ref="container">
        </div>;
    },
});

var ThreeDGrapherEditor = React.createClass({
    mixins: [Changeable],

    propTypes: {
        //TODO
        apiOptions: ApiOptions.propTypes,
    },

    getDefaultProps: function() {
        return {
            //TODO
        };
    },

    render: function() {
        return <div className="perseus-three-d-grapher-editor">
            <Editor
                ref="editor"
                // widgets={this.props.widgets}
                // apiOptions={this.props.apiOptions}
                // images={this.props.images}
                // widgetEnabled={true}
                // immutableWidgets={false}
                onChange={this.props.onChange} />
        </div>;
    },

    getSaveWarnings: function() {
        return this.refs.editor.getSaveWarnings();
    },

    serialize: function() {
        return _.extend({}, this.refs.editor.serialize(), {
            metadata: this.props.metadata
        });
    },
});


module.exports = {
    name: "three-d-grapher",
    displayName: "Three-dimensional grapher",
    widget: ThreeDGrapher,
    editor: ThreeDGrapherEditor,
    hidden: false,
};

